import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { authorizeCompanyMembership } from "../_shared/company-authorization.ts";

const BUCKET = "company-documents";
const SIGNED_URL_TTL_SECONDS = 60;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AccessMode =
  | "preview"
  | "download"
  | "delete"
  | "prepare_upload"
  | "register_upload"
  | "cleanup_upload";

interface DocumentRow {
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

const sha256Hex = async (bytes: ArrayBuffer) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return "image/jpeg";
  }
  return null;
}

function isValidStoragePath(companyId: string, path: string): boolean {
  return (
    /^[0-9a-f-]{36}$/i.test(companyId) &&
    new RegExp("^" + companyId + "/[A-Za-z0-9._-]+/[0-9]+_[A-Za-z0-9._-]+$").test(path)
  );
}

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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const mode = body.mode as AccessMode;

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

    const authorize = (companyId: string, organizationId: string) =>
      authorizeCompanyMembership(admin, {
        profileId: profile.id,
        companyId,
        organizationId,
        organizationMemberships: memberships ?? [],
      });

    const completeIntent = async (intentId: string, documentId?: string) => {
      const update: Record<string, unknown> = {
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      };
      if (documentId) update.document_id = documentId;
      const { error } = await admin
        .from("vault_storage_cleanup")
        .update(update)
        .eq("id", intentId)
        .eq("status", "pending");
      if (error) throw error;
    };

    const recordCleanupFailure = async (intentId: string, error: unknown) => {
      const { data: current, error: readError } = await admin
        .from("vault_storage_cleanup")
        .select("attempts")
        .eq("id", intentId)
        .eq("status", "pending")
        .maybeSingle();
      if (readError) {
        console.error("Could not read cleanup retry state", readError);
        return;
      }
      if (!current) return;
      const { error: updateError } = await admin
        .from("vault_storage_cleanup")
        .update({
          attempts: current.attempts + 1,
          last_error:
            error instanceof Error ? error.message.slice(0, 500) : "Storage cleanup failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intentId)
        .eq("status", "pending");
      if (updateError) console.error("Could not update cleanup retry state", updateError);
    };

    if (mode === "prepare_upload") {
      const companyId = String(body.company_id ?? "");
      const storagePath = String(body.storage_path ?? "");
      if (!isValidStoragePath(companyId, storagePath)) {
        return json({ error: "Invalid company storage path." }, 400);
      }

      const { data: company, error: companyError } = await admin
        .from("companies")
        .select("id,organization_id")
        .eq("id", companyId)
        .eq("is_active", true)
        .maybeSingle();
      if (companyError) throw companyError;
      if (!company || !(await authorize(companyId, company.organization_id))) {
        return json({ error: "Company not found or not accessible." }, 404);
      }

      // Reconcile abandoned uploads for this profile before accepting another.
      const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: staleIntents, error: staleError } = await admin
        .from("vault_storage_cleanup")
        .select("id,storage_path,company_id,organization_id")
        .eq("profile_id", profile.id)
        .eq("action", "upload")
        .eq("status", "pending")
        .lt("created_at", staleBefore)
        .limit(25);
      if (staleError) throw staleError;

      for (const intent of staleIntents ?? []) {
        if (!(await authorize(intent.company_id, intent.organization_id))) continue;

        const { data: registered, error: registeredError } = await admin
          .from("company_documents")
          .select("id")
          .eq("storage_path", intent.storage_path)
          .maybeSingle();
        if (registeredError) throw registeredError;
        if (registered) {
          await completeIntent(intent.id, registered.id);
          continue;
        }

        const { error: removeError } = await admin.storage
          .from(BUCKET)
          .remove([intent.storage_path]);
        if (!removeError) {
          await completeIntent(intent.id);
        } else {
          await recordCleanupFailure(intent.id, removeError);
        }
      }

      const { data: intent, error: intentError } = await admin
        .from("vault_storage_cleanup")
        .insert({
          bucket_id: BUCKET,
          storage_path: storagePath,
          organization_id: company.organization_id,
          company_id: companyId,
          profile_id: profile.id,
          action: "upload",
          status: "pending",
        })
        .select("id")
        .single();
      if (intentError) throw intentError;
      return json({ intent_id: intent.id });
    }

    if (mode === "register_upload") {
      const intentId = String(body.intent_id ?? "");
      const companyId = String(body.company_id ?? "");
      const storagePath = String(body.storage_path ?? "");
      const { data: intent, error: intentError } = await admin
        .from("vault_storage_cleanup")
        .select("id,organization_id")
        .eq("id", intentId)
        .eq("profile_id", profile.id)
        .eq("company_id", companyId)
        .eq("storage_path", storagePath)
        .eq("action", "upload")
        .eq("status", "pending")
        .maybeSingle();
      if (intentError) throw intentError;
      if (!intent || !(await authorize(companyId, intent.organization_id))) {
        return json({ error: "Upload intent not found or not accessible." }, 404);
      }

      const { data: object, error: downloadError } = await admin.storage
        .from(BUCKET)
        .download(storagePath);
      if (downloadError || !object) {
        throw downloadError ?? new Error("Uploaded object not found.");
      }
      if (object.size < 1 || object.size > MAX_FILE_SIZE) {
        throw new Error("File size must be between 1 byte and 20 MB.");
      }

      const bytes = await object.arrayBuffer();
      const mimeType = detectMime(new Uint8Array(bytes));
      if (!mimeType) {
        throw new Error("File content is not a supported PDF, PNG or JPEG.");
      }
      const trustedHash = await sha256Hex(bytes);

      const { data: documentId, error: registerError } = await admin.rpc(
        "register_document_upload",
        {
          p_company_id: companyId,
          p_category: String(body.category ?? ""),
          p_document_type: String(body.document_type ?? ""),
          p_document_name: String(body.document_name ?? ""),
          p_original_filename: String(body.original_filename ?? ""),
          p_storage_path: storagePath,
          p_mime_type: mimeType,
          p_file_size: object.size,
          p_sha256_hash: trustedHash,
          p_expiry_date: body.expiry_date ? String(body.expiry_date) : null,
          p_uploaded_by: profile.id,
        },
      );

      if (registerError) {
        const { error: cleanupError } = await admin.storage
          .from(BUCKET)
          .remove([storagePath]);
        if (!cleanupError) {
          await completeIntent(intent.id);
        } else {
          await recordCleanupFailure(intent.id, cleanupError);
        }
        if (registerError.code === "23505") {
          return json(
            { error: "A document with the same content already exists in this company." },
            409,
          );
        }
        throw registerError;
      }
      return json({ document_id: documentId });
    }

    if (mode === "cleanup_upload") {
      const intentId = String(body.intent_id ?? "");
      const { data: intent, error: intentError } = await admin
        .from("vault_storage_cleanup")
        .select("id,company_id,organization_id,storage_path")
        .eq("id", intentId)
        .eq("profile_id", profile.id)
        .eq("action", "upload")
        .eq("status", "pending")
        .maybeSingle();
      if (intentError) throw intentError;
      if (!intent || !(await authorize(intent.company_id, intent.organization_id))) {
        return json({ error: "Upload intent not found or not accessible." }, 404);
      }

      const { data: registered, error: registeredError } = await admin
        .from("company_documents")
        .select("id")
        .eq("storage_path", intent.storage_path)
        .maybeSingle();
      if (registeredError) throw registeredError;
      if (registered) {
        await completeIntent(intent.id, registered.id);
        return json({ cleaned: false, registered: true });
      }

      const { error: removeError } = await admin.storage
        .from(BUCKET)
        .remove([intent.storage_path]);
      if (removeError) {
        await recordCleanupFailure(intent.id, removeError);
        return json({ error: "Cleanup remains queued for retry." }, 202);
      }
      await completeIntent(intent.id);
      return json({ cleaned: true });
    }

    if (mode !== "preview" && mode !== "download" && mode !== "delete") {
      return json({ error: "Unsupported document access mode." }, 400);
    }

    const documentId = String(body.document_id ?? "");
    if (!documentId) return json({ error: "A document_id is required." }, 400);

    const documentQuery = user
      .from("company_documents")
      .select("id,organization_id,company_id,document_name,storage_path,deleted_at")
      .eq("id", documentId);
    const { data: document, error: documentError } =
      mode === "delete"
        ? await documentQuery.not("deleted_at", "is", null).maybeSingle()
        : await documentQuery.is("deleted_at", null).maybeSingle();
    if (documentError) throw documentError;
    if (!document) return json({ error: "Document not found or not accessible." }, 404);

    const doc = document as DocumentRow;
    if (!(await authorize(doc.company_id, doc.organization_id))) {
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
      description: action.replaceAll("_", " ") + ": " + doc.document_name,
      metadata: { mode, document_name: doc.document_name },
    });
    if (auditError) throw auditError;

    if (mode === "delete") {
      let intentId: string | null = null;
      if (doc.storage_path) {
        const { data: existingIntent, error: lookupError } = await admin
          .from("vault_storage_cleanup")
          .select("id")
          .eq("storage_path", doc.storage_path)
          .eq("action", "delete")
          .eq("status", "pending")
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existingIntent) {
          intentId = existingIntent.id;
        } else {
          const { data: created, error: createError } = await admin
            .from("vault_storage_cleanup")
            .insert({
              bucket_id: BUCKET,
              storage_path: doc.storage_path,
              organization_id: doc.organization_id,
              company_id: doc.company_id,
              profile_id: profile.id,
              action: "delete",
              document_id: doc.id,
              status: "pending",
            })
            .select("id")
            .single();
          if (createError) throw createError;
          intentId = created.id;
        }

        if (!intentId) throw new Error("Delete cleanup intent was not created.");
        const { error: removeError } = await admin.storage
          .from(BUCKET)
          .remove([doc.storage_path]);
        if (removeError) {
          await recordCleanupFailure(intentId, removeError);
          return json(
            {
              deleted: false,
              storage_deleted: false,
              cleanup_error: "File removal failed. The document remains in the Bin for retry.",
            },
            502,
          );
        }
      }

      const { data: deleted, error: deleteError } = await admin
        .from("company_documents")
        .delete()
        .eq("id", doc.id)
        .eq("company_id", doc.company_id)
        .select("id")
        .maybeSingle();
      if (deleteError) throw deleteError;
      if (!deleted) {
        return json(
          {
            deleted: false,
            storage_deleted: false,
            cleanup_error: "Metadata remains in the Bin; retry is safe.",
          },
          409,
        );
      }
      if (intentId) await completeIntent(intentId);
      return json({ deleted: true, storage_deleted: true });
    }

    if (!doc.storage_path) return json({ error: "Document has no stored file." }, 404);
    const { data: signed, error: signedError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(
        doc.storage_path,
        SIGNED_URL_TTL_SECONDS,
        mode === "download" ? { download: true } : undefined,
      );
    if (signedError || !signed?.signedUrl) {
      return json({ error: "Could not create a secure document link." }, 502);
    }
    return json({ signed_url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  } catch (error) {
    console.error("document-access failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Document access failed." },
      500,
    );
  }
});
