// match-tender-evidence: conservatively matches tender requirements to evidence in the same organization's Company Vault.
// Contract: POST { tender_id: uuid } with the caller's Supabase JWT.
// v1 intentionally supports PDF evidence only. Image-only/unreadable documents become needs_review.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STOP_WORDS = new Set(["a","an","and","are","as","at","be","by","for","from","in","is","of","on","or","that","the","this","to","with","must","shall","provide","submit","submission","valid","required","requirement"]);
const MAX_CANDIDATES = 5;
const MAX_DOCUMENT_TEXT = 30000;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (value: string) => [...new Set(normalize(value).split(" ").filter((token) => token.length >= 3 && !STOP_WORDS.has(token)))];
const candidateScore = (requirement: string, document: Record<string, unknown>) => {
  const requirementTokens = tokens(requirement);
  const metadata = [document.document_name, document.original_filename, document.document_type, document.category, document.notes].filter((v): v is string => typeof v === "string").join(" ");
  const metadataTokens = new Set(tokens(metadata));
  if (requirementTokens.length === 0) return 0;
  return requirementTokens.reduce((score, token) => score + (metadataTokens.has(token) ? 1 : 0), 0);
};
const extractPdfText = async (blob: Blob) => {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const extracted = await extractText(pdf, { mergePages: true });
  return String(extracted.text ?? "").replace(/\s+/g, " ").trim();
};
const containsEvidenceSnippet = (documentText: string, snippet: string) => {
  const needle = normalize(snippet);
  return needle.length >= 12 && normalize(documentText).includes(needle);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!url || !serviceKey) return json({ error: "Supabase service configuration is missing." }, 500);
  if (!aiKey) return json({ error: "AI provider is not configured." }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const tenderId = (body as { tender_id?: string }).tender_id;
    if (!tenderId || !UUID_RE.test(tenderId)) return json({ error: "A valid tender_id is required." }, 400);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const { data: profile, error: profileError } = await admin.from("profiles").select("id, auth_user_id").eq("auth_user_id", userData.user.id).maybeSingle();
    if (profileError) return json({ error: "Could not resolve your profile.", diagnostics: { code: profileError.code, message: profileError.message, details: profileError.details, hint: profileError.hint } }, 500);
    if (!profile || profile.auth_user_id !== userData.user.id) return json({ error: "No profile found for this user." }, 403);

    const { data: memberships, error: membershipError } = await admin.from("organization_members").select("organization_id").eq("profile_id", profile.id);
    if (membershipError) return json({ error: "Could not resolve your organization.", diagnostics: { code: membershipError.code, message: membershipError.message, details: membershipError.details, hint: membershipError.hint } }, 500);
    const orgIds = (memberships ?? []).map((row) => row.organization_id as string);
    if (orgIds.length === 0) return json({ error: "No organization found for this user." }, 403);

    const { data: tender, error: tenderError } = await admin.from("tenders").select("id, organization_id").eq("id", tenderId).maybeSingle();
    if (tenderError) return json({ error: "Could not load the tender.", diagnostics: { code: tenderError.code, message: tenderError.message, details: tenderError.details, hint: tenderError.hint } }, 500);
    if (!tender) return json({ error: "Tender not found." }, 404);
    if (!orgIds.includes(tender.organization_id)) return json({ error: "You are not allowed to match this tender." }, 403);

    const { data: requirements, error: requirementsError } = await admin.from("tender_requirements").select("id, category, requirement_name, requirement_text, status, matched_document_id, explanation, display_order").eq("tender_id", tender.id).eq("organization_id", tender.organization_id).order("display_order", { ascending: true, nullsFirst: false });
    if (requirementsError) {
      console.error("tender_requirements query failed", { code: requirementsError.code, message: requirementsError.message, details: requirementsError.details, hint: requirementsError.hint, tender_id: tender.id, organization_id: tender.organization_id });
      return json({ error: "Could not load tender requirements.", diagnostics: { code: requirementsError.code, message: requirementsError.message, details: requirementsError.details, hint: requirementsError.hint } }, 500);
    }
    if (!requirements?.length) return json({ tender_id: tender.id, matched: 0, results: [] });

    const { data: documents, error: documentsError } = await admin.from("company_documents").select("id, organization_id, document_name, original_filename, document_type, category, notes, storage_path, mime_type, analysis_status, document_status, deleted_at").eq("organization_id", tender.organization_id).is("deleted_at", null).order("created_at", { ascending: false });
    if (documentsError) return json({ error: "Could not load Company Vault documents.", diagnostics: { code: documentsError.code, message: documentsError.message, details: documentsError.details, hint: documentsError.hint } }, 500);

    const results: Array<Record<string, unknown>> = [];
    for (const requirement of requirements) {
      const requirementText = [requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(". ").trim();
      const ranked = (documents ?? []).map((document) => ({ document, score: candidateScore(requirementText, document) })).filter(({ document }) => typeof document.storage_path === "string" && document.storage_path.trim() !== "").sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);

      if (ranked.length === 0 || ranked.every((item) => item.score === 0)) {
        const explanation = "No credible Company Vault document was identified for this requirement.";
        const { error } = await admin.from("tender_requirements").update({ status: "missing", matched_document_id: null, explanation }).eq("id", requirement.id).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
        if (error) return json({ error: "Could not save a requirement result.", diagnostics: { code: error.code, message: error.message, details: error.details, hint: error.hint } }, 500);
        results.push({ requirement_id: requirement.id, status: "missing", matched_document_id: null, explanation });
        continue;
      }

      const candidatePayload: Array<Record<string, unknown>> = [];
      let extractionIssue = false;
      for (const { document } of ranked) {
        const mime = typeof document.mime_type === "string" ? document.mime_type.toLowerCase() : "";
        const path = String(document.storage_path);
        if (mime && mime !== "application/pdf" && !path.toLowerCase().endsWith(".pdf")) { extractionIssue = true; continue; }
        const { data: blob, error: downloadError } = await admin.storage.from("company-documents").download(path);
        if (downloadError || !blob) { extractionIssue = true; continue; }
        try {
          const text = await extractPdfText(blob);
          if (text.length < 80) { extractionIssue = true; continue; }
          candidatePayload.push({ id: document.id, name: document.document_name, type: document.document_type, category: document.category, text: text.slice(0, MAX_DOCUMENT_TEXT) });
        } catch { extractionIssue = true; }
      }

      if (candidatePayload.length === 0) {
        const explanation = extractionIssue ? "A potentially relevant Vault document exists, but its contents could not be reliably read. Manual review is required." : "No readable evidence document was available for this requirement.";
        const status = extractionIssue ? "manual_review" : "missing";
        const { error } = await admin.from("tender_requirements").update({ status, matched_document_id: null, explanation }).eq("id", requirement.id).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
        if (error) return json({ error: "Could not save a requirement result.", diagnostics: { code: error.code, message: error.message, details: error.details, hint: error.hint } }, 500);
        results.push({ requirement_id: requirement.id, status, matched_document_id: null, explanation });
        continue;
      }

      const evaluatorPrompt = `You are a conservative procurement evidence reviewer. Evaluate whether the supplied Company Vault document content actually satisfies the tender requirement. Do not infer facts that are not present. Return ONLY JSON: {"decision":"found"|"needs_review"|"missing","document_id":string|null,"evidence_snippet":string|null,"explanation":string}. found requires clear text evidence; needs_review means relevant but a material condition cannot be established; missing means candidates do not provide credible evidence. For found, evidence_snippet MUST be an exact short phrase copied from the selected document text (at least 12 characters). Keep explanation short and factual.`;
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3.6-flash", response_format: { type: "json_object" }, messages: [{ role: "system", content: evaluatorPrompt }, { role: "user", content: JSON.stringify({ requirement: requirementText, candidates: candidatePayload }) }] }) });
      if (!aiResponse.ok) {
        const explanation = "Evidence evaluation could not be completed. Manual review is required.";
        const { error } = await admin.from("tender_requirements").update({ status: "manual_review", matched_document_id: null, explanation }).eq("id", requirement.id).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
        if (error) return json({ error: "Could not save a requirement result.", diagnostics: { code: error.code, message: error.message, details: error.details, hint: error.hint } }, 500);
        results.push({ requirement_id: requirement.id, status: "manual_review", matched_document_id: null, explanation });
        continue;
      }

      const aiJson = await aiResponse.json();
      const content = aiJson?.choices?.[0]?.message?.content ?? "";
      let evaluation: Record<string, unknown>;
      try { evaluation = JSON.parse(typeof content === "string" ? content.replace(/^```json|```$/g, "").trim() : ""); } catch { evaluation = { decision: "needs_review", document_id: null, evidence_snippet: null, explanation: "Evidence evaluation returned an unreadable result. Manual review is required." }; }
      let decision = String(evaluation.decision ?? "needs_review").toLowerCase();
      if (!["found", "needs_review", "missing"].includes(decision)) decision = "needs_review";
      const selectedId = typeof evaluation.document_id === "string" ? evaluation.document_id : null;
      const snippet = typeof evaluation.evidence_snippet === "string" ? evaluation.evidence_snippet : null;
      const selectedCandidate = candidatePayload.find((candidate) => candidate.id === selectedId);
      if (decision === "found" && (!selectedCandidate || !snippet || !containsEvidenceSnippet(String(selectedCandidate.text), snippet))) decision = "needs_review";

      const explanation = typeof evaluation.explanation === "string" && evaluation.explanation.trim() ? evaluation.explanation.trim().slice(0, 500) : decision === "found" ? "The document contains clear evidence supporting this requirement." : decision === "needs_review" ? "A potentially relevant document exists, but the evidence is not sufficient for an automatic match." : "No credible evidence was found in the shortlisted Vault documents.";
      const matchedDocumentId = decision === "found" && selectedCandidate ? selectedId : null;

      // Map evaluator decisions to the live Postgres requirement_status enum.
      // DB enum: pending | matched | missing | expired | manual_review.
      const persistedStatus = decision === "found" ? "matched" : decision === "needs_review" ? "manual_review" : "missing";
      const { error } = await admin.from("tender_requirements").update({ status: persistedStatus, matched_document_id: matchedDocumentId, explanation }).eq("id", requirement.id).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
      if (error) return json({ error: "Could not save a requirement result.", diagnostics: { code: error.code, message: error.message, details: error.details, hint: error.hint } }, 500);
      results.push({ requirement_id: requirement.id, status: persistedStatus, matched_document_id: matchedDocumentId, explanation, evidence_snippet: decision === "found" ? snippet : null });
    }
    return json({ tender_id: tender.id, matched: results.length, results });
  } catch (error) {
    console.error("match-tender-evidence unexpected error", error);
    return json({ error: "Unexpected error during evidence matching.", diagnostics: { message: error instanceof Error ? error.message : String(error) } }, 500);
  }
});