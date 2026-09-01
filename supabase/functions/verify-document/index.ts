import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { DOCUMENT_TYPES, type VerifiedDocType } from "../_shared/document-classifier.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MAX_RAW_PDF_BYTES = 20 * 1024 * 1024;

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { return null; }
}

function validType(value: unknown): value is VerifiedDocType {
  return typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const model = "claude-sonnet-4-6";
    if (!url || !serviceKey) return json({ error: "Supabase service configuration is missing." }, 500);
    if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY is not configured." }, 500);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const body = await req.json().catch(() => ({})) as { document_id?: string };
    if (!body.document_id) return json({ error: "A document_id is required." }, 400);

    const { data: profile } = await admin.from("profiles").select("id").eq("auth_user_id", userData.user.id).maybeSingle();
    if (!profile) return json({ error: "No profile found for this user." }, 403);
    const { data: memberships } = await admin.from("organization_members").select("organization_id").eq("profile_id", profile.id);
    const orgIds = (memberships ?? []).map((row) => row.organization_id).filter(Boolean);

    const { data: doc, error: docError } = await admin.from("company_documents")
      .select("id, organization_id, company_id, document_name, original_filename, document_type, category, storage_path, mime_type")
      .eq("id", body.document_id).maybeSingle();
    if (docError) throw docError;
    if (!doc || !orgIds.includes(doc.organization_id)) return json({ error: "Document not found or not accessible." }, 404);

    const { data: blob, error: downloadError } = await admin.storage.from("company-documents").download(doc.storage_path);
    if (downloadError || !blob) {
      await admin.from("company_documents").update({ verification_status: "failed", verified_at: new Date().toISOString() }).eq("id", doc.id).eq("organization_id", doc.organization_id);
      return json({ error: "Could not download document for verification." }, 502);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const rawBytes = bytes.byteLength;
    console.log("verify-document preflight", { document_id: doc.id, filename: doc.original_filename ?? doc.document_name ?? null, mime_type: doc.mime_type ?? blob.type ?? null, raw_bytes: rawBytes, model });
    if (rawBytes > MAX_RAW_PDF_BYTES) {
      console.warn("verify-document PDF_TOO_LARGE", { document_id: doc.id, raw_bytes: rawBytes, max_raw_bytes: MAX_RAW_PDF_BYTES, model });
      await admin.from("company_documents").update({ verification_status: "failed", verified_at: new Date().toISOString() }).eq("id", doc.id).eq("organization_id", doc.organization_id);
      return json({ error: "PDF_TOO_LARGE", document_id: doc.id, raw_bytes: rawBytes, max_raw_bytes: MAX_RAW_PDF_BYTES }, 413);
    }

    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const base64 = btoa(binary);
    console.log("verify-document anthropic payload", { document_id: doc.id, model, max_tokens: 300, message_count: 1, content_types: ["document", "text"], document_source_type: "base64", document_media_type: "application/pdf", base64_bytes: base64.length, has_data_uri_prefix: base64.startsWith("data:"), prompt_present: true });

    const prompt = `You are JASMIQ's document verification engine for Nigerian procurement compliance. Inspect the supplied PDF itself. Classify it conservatively using ONLY this enum: ${DOCUMENT_TYPES.join(", ")}. Extract the document year when explicitly present, otherwise null. Extract an explicit expiry date as YYYY-MM-DD when present, otherwise null. Return JSON only with exactly: {"doc_type":"ENUM","year":integer|null,"expiry_date":"YYYY-MM-DD"|null,"confidence":"high"|"low"}. Do not infer a year from today's date or filename alone. If the PDF is ambiguous or unrelated, use OTHER and low confidence.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: prompt,
        messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: `Filename: ${doc.original_filename ?? doc.document_name ?? "unknown"}` },
        ] }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      let parsed: any = null;
      try { parsed = JSON.parse(detail); } catch {}
      console.error("verify-document Anthropic error", { document_id: doc.id, model, http_status: response.status, full_body: detail, anthropic_error_type: parsed?.error?.type ?? null, anthropic_error_message: parsed?.error?.message ?? null, anthropic_request_id: parsed?.request_id ?? response.headers.get("request-id") ?? null, raw_pdf_bytes: rawBytes, base64_bytes: base64.length });
      await admin.from("company_documents").update({ verification_status: "failed", verified_at: new Date().toISOString() }).eq("id", doc.id).eq("organization_id", doc.organization_id);
      return json({ error: "Claude verification failed.", diagnostics: { http_status: response.status, error_type: parsed?.error?.type ?? null, error_message: parsed?.error?.message ?? null, request_id: parsed?.request_id ?? response.headers.get("request-id") ?? null, model } }, 502);
    }

    const payload = await response.json();
    const text = (payload?.content ?? []).filter((item: any) => item?.type === "text").map((item: any) => item.text).join("\n");
    const result = parseJson(text);
    if (!result || !validType(result.doc_type)) {
      console.error("verify-document invalid Claude payload", { document_id: doc.id, model, content_types: payload?.content?.map((item: any) => item?.type) ?? null });
      await admin.from("company_documents").update({ verification_status: "failed", verified_at: new Date().toISOString() }).eq("id", doc.id).eq("organization_id", doc.organization_id);
      return json({ error: "Claude returned an invalid verification payload." }, 502);
    }

    const year = typeof result.year === "number" && Number.isInteger(result.year) && result.year >= 1900 && result.year <= 2100 ? result.year : null;
    const expiryDate = typeof result.expiry_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(result.expiry_date) ? result.expiry_date : null;
    const confidence = result.confidence === "high" ? "high" : "low";
    const filenameType = String(doc.original_filename ?? doc.document_name ?? "").toLowerCase();
    const existingType = String(doc.document_type ?? "").toLowerCase();
    const mismatch = validType(result.doc_type) && existingType && existingType !== "unspecified" && existingType !== String(result.doc_type).toLowerCase() && !existingType.includes(String(result.doc_type).toLowerCase().replaceAll("_", " ")) && !filenameType.includes(String(result.doc_type).toLowerCase().split("_")[0]);
    const status = result.doc_type === "OTHER" ? "mismatch" : mismatch && confidence === "high" ? "mismatch" : "verified";

    const { error: updateError } = await admin.from("company_documents").update({
      verified_doc_type: result.doc_type,
      verified_year: year,
      verified_expiry_date: expiryDate,
      verification_status: status,
      verified_at: new Date().toISOString(),
    }).eq("id", doc.id).eq("organization_id", doc.organization_id).eq("company_id", doc.company_id);
    if (updateError) throw updateError;

    return json({ document_id: doc.id, verified_doc_type: result.doc_type, verified_year: year, verified_expiry_date: expiryDate, verification_status: status, confidence, model });
  } catch (error) {
    console.error("verify-document failed", error);
    return json({ error: error instanceof Error ? error.message : "Document verification failed." }, 500);
  }
});
