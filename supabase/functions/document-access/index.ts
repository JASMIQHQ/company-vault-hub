import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { authorizeCompanyMembership } from "../_shared/company-authorization.ts";

const BUCKET = "company-documents";
const SIGNED_URL_TTL_SECONDS = 60;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AccessMode = "preview" | "download" | "delete";

interface CompanyDocumentAccessRow {
  id: string;
  organization_id: string;
  company_id: string;
  document_name: string;
  storage_path: string | null;
  deleted_at: string | null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !serviceKey || !publicKey) {
    return json({ error: "Document access service configuration is missing." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  const token = (authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!authorization || !token) {
    return json({ error: "Not authenticated." }, 401);
  }

  const user = createClient(url, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authResult, error: authError } = await user.auth.getUser(token);
    if (authError || !authResult.user) {
      return json({ error: "Not authenticated." }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as {
      document_id?: string;
      mode?: string;
    };
    const documentId = body.document_id;
    const mode = body.mode as AccessMode;

    if (!documentId) {
      return json({ error: "A document_id is required." }, 400);
    }
    if (mode !== "preview" && mode !== "download" && mode !== "delete") {
      return json({ error: "Unsupported document access mode." }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authResult.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return json({ error: "No profile found for this user." }, 403);

    const { data: memberships, error: membershipsError } = await admin
      .from("organization_members")
      .select("organization_id,is_owner")
      .eq("profile_id", profile.id);

    if (membershipsError) throw membershipsError;

    const documentQuery = user
      .from("company_documents")
      .select("id,organization_id,company_id,document_name,storage_path,deleted_at")
      .eq("id", documentId);

    const { data: document, error: documentError } =
      mode === "delete"
        ? await documentQuery.not("deleted_at", "is", null).maybeSingle()
        : await documentQuery.is("deleted_at", null).maybeSingle();

    if (documentError) throw documentError;
    if (!document) {
      return json({ error: "Document not found or not accessible." }, 404);
    }

    const doc = document as CompanyDocumentAccessRow;
    const authorized = await authorizeCompanyMembership(admin, {
      profileId: profile.id,
      companyId: doc.company_id,
      organizationId: doc.organization_id,
      organizationMemberships: memberships ?? [],
    });

    if (!authorized) {
      return json({ error: "Document not found or not accessible." }, 404);
    }

    const action =
      mode === "preview"
        ? "document_preview"
        : mode === "download"
          ? "document_download"
          : "document_permanent_delete";

    const { error: auditError } = await admin.from("audit_logs").insert({
      organization_id: doc.organization_id,
      profile_id: profile.id,
      action,
      entity_type: "company_document",
      entity_id: doc.id,
      description: `${action.replaceAll("_", " ")}: ${doc.document_name}`,
      metadata: { mode, document_name: doc.document_name },
    });

    if (auditError) {
      console.error("Document access audit insert failed", auditError);
      return json({ error: "Unable to record document access audit." }, 500);
    }

    if (mode === "delete") {
      const { data: deleted, error: deleteError } = await admin
        .from("company_documents")
        .delete()
        .eq("id", doc.id)
        .eq("company_id", doc.company_id)
        .select("id")
        .maybeSingle();

      if (deleteError) throw deleteError;
      if (!deleted) return json({ error: "Document could not be deleted." }, 409);

      if (!doc.storage_path) {
        return json({ deleted: true, storage_deleted: true });
      }

      const { error: storageError } = await admin.storage.from(BUCKET).remove([doc.storage_path]);

      if (storageError) {
        console.error("Permanent document storage cleanup failed", storageError);
        return json({
          deleted: true,
          storage_deleted: false,
          cleanup_error: "The database record was deleted, but the stored file needs cleanup.",
        });
      }

      return json({ deleted: true, storage_deleted: true });
    }

    if (!doc.storage_path) {
      return json({ error: "Document has no stored file." }, 404);
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(
        doc.storage_path,
        SIGNED_URL_TTL_SECONDS,
        mode === "download" ? { download: true } : undefined,
      );

    if (signedError || !signed?.signedUrl) {
      console.error("Signed document URL creation failed", signedError);
      return json({ error: "Could not create a secure document link." }, 502);
    }

    return json({
      signed_url: signed.signedUrl,
      expires_in: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error("document-access failed", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Document access failed.",
      },
      500,
    );
  }
});
