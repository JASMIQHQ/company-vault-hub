// analyze-document: extracts structured intelligence from a company vault document.
// Contract: POST { document_id: uuid } with the caller's Supabase JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SCHEMA_PROMPT = `You analyse Nigerian corporate/compliance documents (e.g. CAC certificates,
Tax Clearance Certificates, PENCOM/ITF/NSITF compliance certificates, BPP registration,
bank references, affidavits, ISO certifications, professional registrations).
Return ONLY JSON matching:
{
  "document_type": string|null,
  "company_name": string|null,
  "registration_number": string|null,
  "issuing_authority": string|null,
  "issue_date": string|null,
  "expiry_date": string|null,
  "status": string|null,
  "evidence": [string],
  "compliance_items": [
    {
      "type": string,
      "status": string,
      "evidence": string
    }
  ]
}
Never invent values. Use null when the document does not state something.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiKey = Deno.env.get("LOVABLE_API_KEY");

  const adminFetch: typeof fetch = (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (!serviceKey.includes(".") && headers.get("Authorization") === `Bearer ${serviceKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", serviceKey);
    return fetch(input, { ...init, headers });
  };

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: adminFetch },
  });

  let documentId: string | null = null;

  const fail = async (message: string) => {
    if (documentId) {
      await admin.rpc("fail_document", { p_document: documentId });
    }
    return json({ error: message }, 500);
  };

  try {
    const body = await req.json().catch(() => ({}));
    const id = (body as { document_id?: string }).document_id;
    if (!id || !UUID_RE.test(id)) return json({ error: "A valid document_id is required." }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, auth_user_id")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("profile lookup failed", profileError);
      return json({ error: "Could not resolve your profile." }, 500);
    }
    if (!profile) return json({ error: "No profile found for this user." }, 403);

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id, is_owner")
      .eq("profile_id", profile.id);
    const orgIds = (memberships ?? []).map((m) => m.organization_id);
    if (orgIds.length === 0) return json({ error: "No organization found for this user." }, 403);

    const { data: doc, error: docError } = await admin
      .from("company_documents")
      .select("id, organization_id, company_id, storage_path, mime_type, document_type, expiry_date")
      .eq("id", id)
      .maybeSingle();
    if (docError) return json({ error: "Could not load the document." }, 500);
    if (!doc) return json({ error: "Document not found." }, 404);
    if (!orgIds.includes(doc.organization_id)) {
      return json({ error: "You are not allowed to analyze this document." }, 403);
    }
    if (!doc.company_id) return json({ error: "Document not found." }, 404);
    const { data: companyMembership } = await admin
      .from("company_members")
      .select("company_id, membership_source")
      .eq("company_id", doc.company_id)
      .eq("profile_id", profile.id)
      .maybeSingle();
    const companyAuthorized = companyMembership?.membership_source === "explicit" ||
      (companyMembership?.membership_source === "owner" &&
        (memberships ?? []).some((m) => m.organization_id === doc.organization_id && m.is_owner === true));
    if (!companyAuthorized) return json({ error: "Document not found." }, 404);

    documentId = doc.id;

    if (!aiKey) return await fail("AI provider is not configured.");
    if (!doc.storage_path) return await fail("No file was found for this document.");
    const isPdf =
      (doc.mime_type ?? "").toLowerCase() === "application/pdf" ||
      doc.storage_path.toLowerCase().endsWith(".pdf");
    if (!isPdf) return await fail("Only PDF documents can currently be analyzed.");

    await admin
      .from("company_documents")
      .update({ analysis_status: "processing" })
      .eq("id", doc.id)
      .eq("organization_id", doc.organization_id)
      .eq("company_id", doc.company_id);

    const { data: blob, error: downloadError } = await admin.storage
      .from("company-documents")
      .download(doc.storage_path);
    if (downloadError || !blob) return await fail("Could not download the document.");

    let text = "";
    try {
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const pdf = await getDocumentProxy(buffer);
      const extracted = await extractText(pdf, { mergePages: true });
      text = String(extracted.text ?? "").replace(/\s+/g, " ").trim();
    } catch {
      return await fail("Could not read text from the document PDF.");
    }
    if (text.length < 50) {
      return await fail("The document PDF has no readable text (it may be a scanned image).");
    }
    const clipped = text.slice(0, 120000);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEMA_PROMPT },
          { role: "user", content: `Document text:\n\n${clipped}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error("AI gateway error", status, await aiResponse.text());
      if (status === 429) return await fail("AI rate limit reached. Please try again shortly.");
      if (status === 402) return await fail("AI credits exhausted. Please top up the workspace.");
      return await fail("The AI analysis service failed.");
    }

    const aiJson = await aiResponse.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(typeof content === "string" ? content.replace(/^```json|```$/g, "").trim() : "");
    } catch {
      return await fail("The AI returned an unreadable response.");
    }

    const str = (key: string) => {
      const value = parsed[key];
      return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
    };
    const date = (key: string) => {
      const raw = str(key);
      if (!raw) return null;
      const parsedDate = new Date(raw);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().slice(0, 10);
    };

    const updatePayload: Record<string, unknown> = {
      analysis_status: "analyzed",
      analysis_json: parsed,
      updated_at: new Date().toISOString(),
    };
    const aiExpiry = date("expiry_date");
    if (!doc.expiry_date && aiExpiry) updatePayload.expiry_date = aiExpiry;
    const aiDocType = str("document_type");
    if ((!doc.document_type || doc.document_type === "unspecified") && aiDocType) {
      updatePayload.document_type = aiDocType;
    }

    const { error: updateError } = await admin
      .from("company_documents")
      .update(updatePayload)
      .eq("id", doc.id);
    if (updateError) {
      console.error("company_documents update failed", updateError);
      return await fail("Could not save the analysis results.");
    }

    return json({ document_id: doc.id, analysis_status: "analyzed" });
  } catch (error) {
    console.error("analyze-document unexpected error", error);
    return await fail("Unexpected error during document analysis.");
  }
});