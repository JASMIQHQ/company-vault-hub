import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const C = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DocType =
  | "TAX_CLEARANCE_CERTIFICATE"
  | "PENCOM_CERTIFICATE"
  | "ITF_CERTIFICATE"
  | "NSITF_CERTIFICATE"
  | "BPP_CERTIFICATE"
  | "CAC_CERTIFICATE"
  | "OGISP_CERTIFICATE"
  | "CPN_CERTIFICATE"
  | "NEMSA_CERTIFICATE"
  | "AUDITED_ACCOUNTS"
  | "OTHER";
type MatchStatus = "matched" | "missing" | "manual_review" | "expired";
type MatchBasis = "VERIFIED_FACT" | "VERIFIED_FACT+PDF_EVIDENCE" | "CONTENT";
type FailureReason =
  | "VERIFIED_FACT_MISSING"
  | "REQUIRED_YEAR_MISSING"
  | "DOCUMENT_EXPIRED"
  | "PDF_DOWNLOAD_FAILED"
  | "PDF_TEXT_EXTRACTION_FAILED"
  | "PDF_EVIDENCE_NOT_FOUND"
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_RESPONSE_INVALID"
  | "AI_DECISION_REJECTED"
  | "NO_CANDIDATE_DOCUMENT";

interface VerifiedFactRow {
  id: string;
  document_id: string;
  organization_id: string;
  company_id: string;
  doc_type: DocType;
  doc_year: number | null;
  expiry_date: string | null;
  verified_at: string;
  confidence: number | null;
}
interface CompanyDocumentRow {
  id: string;
  company_id: string;
  organization_id: string;
  document_name: string | null;
  original_filename: string | null;
  document_type: string | null;
  category: string | null;
  notes: string | null;
  storage_path: string | null;
  document_status: string | null;
  deleted_at: string | null;
}
interface VerifiedCandidate {
  fact: VerifiedFactRow;
  document: CompanyDocumentRow;
}
interface TenderRow {
  id: string;
  company_id: string | null;
  organization_id: string;
  submission_deadline: string | null;
}
interface TenderRequirementRow {
  id: string;
  category: string | null;
  requirement_name: string | null;
  requirement_text: string | null;
  display_order: number | null;
}
interface MatcherDiagnostics {
  stage: string;
  failure_reason?: FailureReason;
  provider?: "lovable_ai_gateway";
  model?: string;
  http_status?: number;
  latency_ms?: number;
  candidate_count?: number;
  selected_document_id?: string | null;
}
interface MatchResult {
  status: MatchStatus;
  matched_document_id: string | null;
  verified_fact_ids: string[];
  verified_doc_type: DocType | null;
  verified_years: number[];
  verified_expiry_dates: (string | null)[];
  evidence_snippets: string[];
  match_basis: MatchBasis;
  confidence: number;
  explanation: string;
  failure_reason?: FailureReason;
  diagnostics?: MatcherDiagnostics;
}
interface LovableDecision {
  decision: "found" | "needs_review" | "missing";
  document_id: string | null;
  evidence_snippet: string | null;
  explanation: string;
}
interface LovableCandidatePayload {
  id: string;
  verified_fact_id: string;
  verified_doc_type: DocType;
  verified_year: number | null;
  verified_expiry_date: string | null;
  text: string;
}

const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "of",
  "on", "or", "that", "the", "this", "to", "with", "must", "shall", "provide", "submit",
  "submission", "valid", "required", "requirement",
]);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...C, "Content-Type": "application/json" } });
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const toks = (v: string) => [...new Set(norm(v).split(" ").filter((x) => x.length >= 3 && !STOP.has(x)))];
const needles: Record<DocType, string[]> = {
  TAX_CLEARANCE_CERTIFICATE: ["tax clearance certificate", "tax clearance", "tcc"],
  PENCOM_CERTIFICATE: ["pencom", "pension commission", "pension compliance"],
  ITF_CERTIFICATE: ["industrial training fund", "itf certificate", "itf"],
  NSITF_CERTIFICATE: ["nsitf", "social insurance trust fund"],
  BPP_CERTIFICATE: ["bureau of public procurement", "bpp"],
  CAC_CERTIFICATE: ["corporate affairs commission", "certificate of incorporation", "cac"],
  OGISP_CERTIFICATE: ["ogisp", "upstream regulatory commission", "nigerian petroleum"],
  CPN_CERTIFICATE: ["computer professionals of nigeria", "cpn"],
  NEMSA_CERTIFICATE: ["nigerian electricity management services agency", "nemsa"],
  AUDITED_ACCOUNTS: ["audited financial statements", "audited accounts", "financial statements", "annual accounts"],
  OTHER: [],
};
const typeOf = (s: string): DocType | null => {
  const n = norm(s);
  const tests: [DocType, RegExp[]][] = [
    ["TAX_CLEARANCE_CERTIFICATE", [/\btcc\b/i, /tax\s*clearance/i]],
    ["PENCOM_CERTIFICATE", [/\bpencom\b/i, /pension\s*compliance/i]],
    ["ITF_CERTIFICATE", [/\bitf\b/i, /industrial\s*training\s*fund/i]],
    ["NSITF_CERTIFICATE", [/\bnsitf\b/i, /social\s*insurance\s*trust\s*fund/i]],
    ["BPP_CERTIFICATE", [/\bbpp\b/i, /bureau\s*of\s*public\s*procurement/i]],
    ["CAC_CERTIFICATE", [/\bcac\b/i, /corporate\s*affairs\s*commission/i, /certificate\s*of\s*incorporation/i]],
    ["OGISP_CERTIFICATE", [/\bogisp\b/i, /upstream\s*regulatory/i, /nigerian\s*petroleum/i]],
    ["CPN_CERTIFICATE", [/\bcpn\b/i, /computer\s*professionals\s*of\s*nigeria/i]],
    ["NEMSA_CERTIFICATE", [/\bnemsa\b/i, /nigerian\s*electricity\s*management/i]],
    ["AUDITED_ACCOUNTS", [/audited\s*(financial\s*)?(accounts|statements)/i, /financial\s*statement/i, /annual\s*accounts/i]],
  ];
  for (const [t, p] of tests) if (p.some((x) => x.test(n))) return t;
  return null;
};
const years = (s: string) => [...new Set((s.match(/\b20\d{2}\b/g) ?? []).map(Number))].sort((a, b) => a - b);
const valid = (expiry: string | null, deadline: string | null) => !expiry || !deadline || new Date(expiry) >= new Date(deadline);
const evidence = (text: string, type: DocType, year: number | null) => {
  const n = norm(text);
  for (const needle of needles[type]) {
    const i = n.indexOf(norm(needle));
    if (i >= 0) {
      const s = n.slice(Math.max(0, i - 90), Math.min(n.length, i + Math.max(needle.length, 24) + 140)).trim();
      if ((!year || s.includes(String(year))) && s.length >= 12) return s;
    }
  }
  if (year) {
    const i = n.indexOf(String(year));
    if (i >= 0) return n.slice(Math.max(0, i - 90), Math.min(n.length, i + 110)).trim();
  }
  return null;
};
const pdfText = async (b: Blob) => {
  const p = await getDocumentProxy(new Uint8Array(await b.arrayBuffer()));
  const x = await extractText(p, { mergePages: true });
  return String(x.text ?? "").replace(/\s+/g, " ").trim();
};
const score = (r: string, d: CompanyDocumentRow) => {
  const rt = toks(r);
  const mt = new Set(toks([d.document_name, d.original_filename, d.document_type, d.category, d.notes].filter((x): x is string => typeof x === "string").join(" ")));
  return rt.reduce((s, t) => s + (mt.has(t) ? 1 : 0), 0);
};
const errText = (e: unknown) => e instanceof Error ? e.message : String(e);
const diagnosticText = (d: MatcherDiagnostics) => JSON.stringify(d);
const resultWithFailure = (
  base: Omit<MatchResult, "failure_reason" | "diagnostics">,
  failure_reason: FailureReason,
  diagnostics: MatcherDiagnostics,
): MatchResult => ({
  ...base,
  failure_reason,
  diagnostics,
  explanation: `${base.explanation} Failure reason: ${failure_reason}. Diagnostics: ${diagnosticText(diagnostics)}`,
});

async function updateReq(admin: ReturnType<typeof createClient>, t: TenderRow, r: TenderRequirementRow, x: MatchResult) {
  const { error } = await admin.from("tender_requirements").update({
    status: x.status,
    matched_document_id: x.matched_document_id,
    confidence_score: x.confidence,
    explanation: x.explanation,
    match_basis: x.match_basis,
  }).eq("id", r.id).eq("tender_id", t.id).eq("organization_id", t.organization_id);
  if (error) throw error;
}
async function writeMatch(admin: ReturnType<typeof createClient>, t: TenderRow, r: TenderRequirementRow, x: MatchResult) {
  const requirement = [r.requirement_name, r.requirement_text].filter(Boolean).join(". ");
  const notes = JSON.stringify({
    verified_fact_ids: x.verified_fact_ids,
    match_basis: x.match_basis,
    evidence_snippets: x.evidence_snippets,
    verified_doc_type: x.verified_doc_type,
    verified_years: x.verified_years,
    verified_expiry_dates: x.verified_expiry_dates,
    explanation: x.explanation,
    failure_reason: x.failure_reason ?? null,
    diagnostics: x.diagnostics ?? null,
  });
  const { error } = await admin.from("compliance_matches").upsert({
    organization_id: t.organization_id,
    tender_id: t.id,
    document_id: x.matched_document_id,
    requirement,
    requirement_type: x.verified_doc_type ?? r.category ?? "OTHER",
    status: x.status,
    confidence: x.confidence,
    notes,
  }, { onConflict: "tender_id,document_id,requirement" });
  if (error) throw error;
}
async function readPdf(
  admin: ReturnType<typeof createClient>,
  document: CompanyDocumentRow,
  context: MatcherDiagnostics,
): Promise<{ ok: true; text: string } | { ok: false; failure_reason: FailureReason; diagnostics: MatcherDiagnostics }> {
  if (!document.storage_path) {
    return { ok: false, failure_reason: "PDF_DOWNLOAD_FAILED", diagnostics: { ...context, stage: "pdf_download", failure_reason: "PDF_DOWNLOAD_FAILED" } };
  }
  try {
    const { data, error } = await admin.storage.from("company-documents").download(String(document.storage_path));
    if (error || !data) {
      const diagnostics = { ...context, stage: "pdf_download", failure_reason: "PDF_DOWNLOAD_FAILED" as FailureReason };
      console.error("Matcher PDF download failed", { ...diagnostics, error: error?.message ?? "No blob returned" });
      return { ok: false, failure_reason: "PDF_DOWNLOAD_FAILED", diagnostics };
    }
    try {
      return { ok: true, text: await pdfText(data) };
    } catch (e) {
      const diagnostics = { ...context, stage: "pdf_text_extraction", failure_reason: "PDF_TEXT_EXTRACTION_FAILED" as FailureReason };
      console.error("Matcher PDF text extraction failed", { ...diagnostics, error: errText(e) });
      return { ok: false, failure_reason: "PDF_TEXT_EXTRACTION_FAILED", diagnostics };
    }
  } catch (e) {
    const diagnostics = { ...context, stage: "pdf_download", failure_reason: "PDF_DOWNLOAD_FAILED" as FailureReason };
    console.error("Matcher PDF download threw", { ...diagnostics, error: errText(e) });
    return { ok: false, failure_reason: "PDF_DOWNLOAD_FAILED", diagnostics };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: C });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ai = Deno.env.get("LOVABLE_API_KEY");
  if (!url || !key) return json({ error: "Supabase configuration is missing." }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    let body: { tender_id?: unknown } = {};
    try {
      body = await req.json() as { tender_id?: unknown };
    } catch (e) {
      console.error("Matcher request JSON parsing failed", { stage: "request_parse", error: errText(e) });
    }
    const tenderId = body.tender_id;
    if (!UUID.test(typeof tenderId === "string" ? tenderId : "")) return json({ error: "A valid tender_id is required." }, 400);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: u, error: ue } = await admin.auth.getUser(token);
    if (ue || !u.user) return json({ error: "Not authenticated." }, 401);
    const { data: p } = await admin.from("profiles").select("id").eq("auth_user_id", u.user.id).maybeSingle();
    if (!p) return json({ error: "No profile found for this user." }, 403);
    const { data: members } = await admin.from("organization_members").select("organization_id").eq("profile_id", p.id);
    const orgs = (members ?? []).map((x) => x.organization_id).filter((x): x is string => Boolean(x));
    const { data: t, error: te } = await admin.from("tenders").select("id,company_id,organization_id,submission_deadline").eq("id", tenderId).maybeSingle();
    if (te) throw te;
    const tender = t as TenderRow | null;
    if (!tender || !orgs.includes(tender.organization_id) || !tender.company_id) return json({ error: "Tender is not accessible or is not associated with a company." }, 403);
    const { data: company, error: ce } = await admin.from("companies").select("id").eq("id", tender.company_id).eq("organization_id", tender.organization_id).maybeSingle();
    if (ce) throw ce;
    if (!company) return json({ error: "Tender company could not be resolved." }, 422);
    const { data: reqs, error: re } = await admin.from("tender_requirements").select("id,category,requirement_name,requirement_text,display_order").eq("tender_id", tender.id).eq("organization_id", tender.organization_id).order("display_order", { ascending: true, nullsFirst: false });
    if (re) throw re;
    const requirements = (reqs ?? []) as TenderRequirementRow[];
    const { data: facts, error: fe } = await admin.from("document_verified_facts").select("id,document_id,organization_id,company_id,doc_type,doc_year,expiry_date,verified_at,confidence").eq("organization_id", tender.organization_id).eq("company_id", tender.company_id).order("verified_at", { ascending: false });
    if (fe) throw fe;
    const { data: docs, error: de } = await admin.from("company_documents").select("id,company_id,organization_id,document_name,original_filename,document_type,category,notes,storage_path,document_status,deleted_at").eq("organization_id", tender.organization_id).eq("company_id", tender.company_id).is("deleted_at", null);
    if (de) throw de;
    const factRows = (facts ?? []) as VerifiedFactRow[];
    const docRows = (docs ?? []) as CompanyDocumentRow[];
    const dm = new Map<string, CompanyDocumentRow>(docRows.filter((d) => !d.document_status || d.document_status === "active").map((d) => [d.id, d]));
    const latest = new Map<string, VerifiedCandidate>();
    for (const f of factRows) if (!latest.has(f.document_id) && dm.has(f.document_id)) latest.set(f.document_id, { fact: f, document: dm.get(f.document_id) as CompanyDocumentRow });
    const verified: VerifiedCandidate[] = [...latest.values()];
    const { error: del } = await admin.from("compliance_matches").delete().eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
    if (del) throw del;
    const results: Array<MatchResult & { requirement_id: string; missing_years?: number[] }> = [];

    for (const r of requirements) {
      const text = [r.requirement_name, r.requirement_text].filter(Boolean).join(". ").trim();
      const type = typeOf(text);
      const targetYears = years(text);
      let candidates = verified.filter((x) => !type || x.fact.doc_type === type);
      if (type && candidates.length === 0) {
        const x: MatchResult = resultWithFailure({ status: "missing", matched_document_id: null, verified_fact_ids: [], verified_doc_type: type, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "VERIFIED_FACT", confidence: 0, explanation: `No successful verified fact of type ${type} exists for this company. Filename metadata is not accepted as evidence.` }, "VERIFIED_FACT_MISSING", { stage: "verified_fact_lookup", failure_reason: "VERIFIED_FACT_MISSING" });
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      if (type && targetYears.length > 1) {
        const byYear = new Map<number, VerifiedCandidate>();
        for (const x of candidates) if (x.fact.doc_year && !byYear.has(x.fact.doc_year)) byYear.set(x.fact.doc_year, x);
        const hits = targetYears.map((y) => byYear.get(y));
        const missing = targetYears.filter((y) => !byYear.has(y));
        if (missing.length) {
          const present = hits.filter((x): x is VerifiedCandidate => Boolean(x));
          const x: MatchResult = resultWithFailure({ status: "manual_review", matched_document_id: present[0]?.document.id ?? null, verified_fact_ids: present.map((v) => v.fact.id), verified_doc_type: type, verified_years: present.map((v) => v.fact.doc_year).filter((v): v is number => v !== null), verified_expiry_dates: present.map((v) => v.fact.expiry_date), evidence_snippets: [], match_basis: "VERIFIED_FACT", confidence: .65, explanation: `Verified ${type} coverage is incomplete; missing required years: ${missing.join(", ")}.` }, "REQUIRED_YEAR_MISSING", { stage: "multi_year_coverage", failure_reason: "REQUIRED_YEAR_MISSING" });
          await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x, missing_years: missing }); continue;
        }
        let ok = true;
        let failure: { reason: FailureReason; diagnostics: MatcherDiagnostics } | null = null;
        const snippets: string[] = [];
        for (const v of hits as VerifiedCandidate[]) {
          if (!valid(v.fact.expiry_date, tender.submission_deadline)) { ok = false; failure ??= { reason: "DOCUMENT_EXPIRED", diagnostics: { stage: "expiry_validation", failure_reason: "DOCUMENT_EXPIRED" } }; continue; }
          const pdf = await readPdf(admin, v.document, { stage: "pdf_evidence", candidate_count: 1, selected_document_id: v.document.id });
          if (!pdf.ok) { ok = false; failure ??= { reason: pdf.failure_reason, diagnostics: pdf.diagnostics }; continue; }
          const s = evidence(pdf.text, type, v.fact.doc_year);
          if (s) snippets.push(s); else { ok = false; failure ??= { reason: "PDF_EVIDENCE_NOT_FOUND", diagnostics: { stage: "pdf_evidence_search", failure_reason: "PDF_EVIDENCE_NOT_FOUND", selected_document_id: v.document.id } }; }
        }
        const base: MatchResult = { status: ok ? "matched" : "manual_review", matched_document_id: (hits[0] as VerifiedCandidate).document.id, verified_fact_ids: (hits as VerifiedCandidate[]).map((v) => v.fact.id), verified_doc_type: type, verified_years: (hits as VerifiedCandidate[]).map((v) => v.fact.doc_year).filter((v): v is number => v !== null), verified_expiry_dates: (hits as VerifiedCandidate[]).map((v) => v.fact.expiry_date), evidence_snippets: snippets, match_basis: ok ? "VERIFIED_FACT+PDF_EVIDENCE" : "VERIFIED_FACT", confidence: ok ? .98 : .65, explanation: ok ? `Complete verified coverage for required years ${targetYears.join(", ")} with PDF evidence for each year.` : `Verified facts cover the required years, but PDF evidence or validity could not be established for every year.` };
        const x = failure ? resultWithFailure(base, failure.reason, failure.diagnostics) : base;
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x, missing_years: [] }); continue;
      }
      if (type) {
        candidates = candidates.filter((x) => !x.fact.doc_year || !targetYears.length || targetYears.includes(x.fact.doc_year)).sort((a, b) => new Date(b.fact.verified_at).getTime() - new Date(a.fact.verified_at).getTime());
        if (!candidates.length) {
          const x: MatchResult = resultWithFailure({ status: "manual_review", matched_document_id: null, verified_fact_ids: [], verified_doc_type: type, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "VERIFIED_FACT", confidence: .65, explanation: `Successful verified ${type} facts exist, but none satisfy the required year.` }, "REQUIRED_YEAR_MISSING", { stage: "year_filter", failure_reason: "REQUIRED_YEAR_MISSING" });
          await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
        }
        const v = candidates[0];
        if (!valid(v.fact.expiry_date, tender.submission_deadline)) {
          const x: MatchResult = resultWithFailure({ status: "expired", matched_document_id: v.document.id, verified_fact_ids: [v.fact.id], verified_doc_type: v.fact.doc_type, verified_years: v.fact.doc_year === null ? [] : [v.fact.doc_year], verified_expiry_dates: [v.fact.expiry_date], evidence_snippets: [], match_basis: "VERIFIED_FACT", confidence: .98, explanation: `Verified evidence expires on ${v.fact.expiry_date}, before the tender deadline.` }, "DOCUMENT_EXPIRED", { stage: "expiry_validation", failure_reason: "DOCUMENT_EXPIRED", selected_document_id: v.document.id });
          await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
        }
        const pdf = await readPdf(admin, v.document, { stage: "pdf_evidence", candidate_count: 1, selected_document_id: v.document.id });
        let ev: string | null = null;
        let failure: { reason: FailureReason; diagnostics: MatcherDiagnostics } | null = null;
        if (pdf.ok) ev = evidence(pdf.text, type, v.fact.doc_year); else failure = { reason: pdf.failure_reason, diagnostics: pdf.diagnostics };
        if (!ev && !failure) failure = { reason: "PDF_EVIDENCE_NOT_FOUND", diagnostics: { stage: "pdf_evidence_search", failure_reason: "PDF_EVIDENCE_NOT_FOUND", selected_document_id: v.document.id } };
        const base: MatchResult = { status: ev ? "matched" : "manual_review", matched_document_id: v.document.id, verified_fact_ids: [v.fact.id], verified_doc_type: v.fact.doc_type, verified_years: v.fact.doc_year === null ? [] : [v.fact.doc_year], verified_expiry_dates: [v.fact.expiry_date], evidence_snippets: ev ? [ev] : [], match_basis: ev ? "VERIFIED_FACT+PDF_EVIDENCE" : "VERIFIED_FACT", confidence: ev ? .98 : .65, explanation: ev ? `Covered by successful verified fact ${v.fact.id} and exact PDF evidence.` : `Successful verified fact ${v.fact.id} exists, but exact PDF evidence could not be established.` };
        const x = failure ? resultWithFailure(base, failure.reason, failure.diagnostics) : base;
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const ranked = verified.map((x) => ({ x, s: score(text, x.document) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
      if (!ranked.length) {
        const x: MatchResult = resultWithFailure({ status: "missing", matched_document_id: null, verified_fact_ids: [], verified_doc_type: null, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "CONTENT", confidence: 0, explanation: "No successful verified document fact was identified for this requirement." }, "NO_CANDIDATE_DOCUMENT", { stage: "candidate_ranking", failure_reason: "NO_CANDIDATE_DOCUMENT", candidate_count: 0 });
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const payload: LovableCandidatePayload[] = [];
      let payloadFailure: { reason: FailureReason; diagnostics: MatcherDiagnostics } | null = null;
      for (const { x: v } of ranked) {
        const pdf = await readPdf(admin, v.document, { stage: "semantic_candidate_pdf", candidate_count: ranked.length, selected_document_id: v.document.id });
        if (!pdf.ok) { payloadFailure ??= { reason: pdf.failure_reason, diagnostics: pdf.diagnostics }; continue; }
        if (pdf.text.length >= 80) payload.push({ id: v.document.id, verified_fact_id: v.fact.id, verified_doc_type: v.fact.doc_type, verified_year: v.fact.doc_year, verified_expiry_date: v.fact.expiry_date, text: pdf.text.slice(0, 30000) });
      }
      if (!payload.length) {
        const v = ranked[0].x;
        const base: MatchResult = { status: "manual_review", matched_document_id: v.document.id, verified_fact_ids: [v.fact.id], verified_doc_type: v.fact.doc_type, verified_years: v.fact.doc_year === null ? [] : [v.fact.doc_year], verified_expiry_dates: [v.fact.expiry_date], evidence_snippets: [], match_basis: "CONTENT", confidence: .55, explanation: "Successful verified evidence exists, but PDF content could not be reliably read. Manual review is required." };
        const x = payloadFailure ? resultWithFailure(base, payloadFailure.reason, payloadFailure.diagnostics) : resultWithFailure(base, "PDF_TEXT_EXTRACTION_FAILED", { stage: "semantic_candidate_pdf", failure_reason: "PDF_TEXT_EXTRACTION_FAILED", candidate_count: ranked.length });
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      if (!ai) {
        const x = resultWithFailure({ status: "manual_review", matched_document_id: null, verified_fact_ids: [], verified_doc_type: null, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "CONTENT", confidence: .5, explanation: "Content evaluation provider is not configured. Manual review is required." }, "AI_PROVIDER_NOT_CONFIGURED", { stage: "lovable_request", failure_reason: "AI_PROVIDER_NOT_CONFIGURED", provider: "lovable_ai_gateway", model: "google/gemini-3.6-flash", candidate_count: payload.length, selected_document_id: null });
        console.warn("Matcher Lovable provider not configured", x.diagnostics);
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const model = "google/gemini-3.6-flash";
      const started = Date.now();
      let ar: Response;
      try {
        ar = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${ai}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Use ONLY supplied successful verified facts and PDF text. Never use filename metadata as evidence. Return JSON {decision:found|needs_review|missing,document_id:string|null,evidence_snippet:string|null,explanation:string}. found requires exact PDF evidence snippet >=12 chars." }, { role: "user", content: JSON.stringify({ requirement: text, candidates: payload }) }] }) });
      } catch (e) {
        const diagnostics: MatcherDiagnostics = { stage: "lovable_request", failure_reason: "AI_PROVIDER_UNAVAILABLE", provider: "lovable_ai_gateway", model, latency_ms: Date.now() - started, candidate_count: payload.length, selected_document_id: null };
        console.error("Matcher Lovable request failed", { ...diagnostics, error: errText(e) });
        const x = resultWithFailure({ status: "manual_review", matched_document_id: null, verified_fact_ids: [], verified_doc_type: null, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "CONTENT", confidence: .5, explanation: "Evidence evaluation could not be completed. Manual review is required." }, "AI_PROVIDER_UNAVAILABLE", diagnostics);
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const latency = Date.now() - started;
      if (!ar.ok) {
        const diagnostics: MatcherDiagnostics = { stage: "lovable_response", failure_reason: "AI_PROVIDER_UNAVAILABLE", provider: "lovable_ai_gateway", model, http_status: ar.status, latency_ms: latency, candidate_count: payload.length, selected_document_id: null };
        console.error("Matcher Lovable provider returned non-2xx", diagnostics);
        const x = resultWithFailure({ status: "manual_review", matched_document_id: null, verified_fact_ids: [], verified_doc_type: null, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "CONTENT", confidence: .5, explanation: "Evidence evaluation could not be completed. Manual review is required." }, "AI_PROVIDER_UNAVAILABLE", diagnostics);
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      let ev: LovableDecision;
      try {
        const raw = (await ar.json())?.choices?.[0]?.message?.content ?? "";
        const parsed: unknown = JSON.parse(String(raw).replace(/^```json|```$/g, "").trim());
        if (!parsed || typeof parsed !== "object") throw new Error("AI response was not an object");
        const candidate = parsed as Record<string, unknown>;
        const decision = candidate.decision;
        if ((decision !== "found" && decision !== "needs_review" && decision !== "missing") || (candidate.document_id !== null && typeof candidate.document_id !== "string") || (candidate.evidence_snippet !== null && typeof candidate.evidence_snippet !== "string") || typeof candidate.explanation !== "string") throw new Error("AI response schema is invalid");
        ev = { decision, document_id: candidate.document_id as string | null, evidence_snippet: candidate.evidence_snippet as string | null, explanation: candidate.explanation };
      } catch (e) {
        const diagnostics: MatcherDiagnostics = { stage: "lovable_response_parse", failure_reason: "AI_RESPONSE_INVALID", provider: "lovable_ai_gateway", model, http_status: ar.status, latency_ms: latency, candidate_count: payload.length, selected_document_id: null };
        console.error("Matcher Lovable response invalid", { ...diagnostics, error: errText(e) });
        const x = resultWithFailure({ status: "manual_review", matched_document_id: null, verified_fact_ids: [], verified_doc_type: null, verified_years: [], verified_expiry_dates: [], evidence_snippets: [], match_basis: "CONTENT", confidence: .5, explanation: "Evidence evaluation returned an invalid structured response. Manual review is required." }, "AI_RESPONSE_INVALID", diagnostics);
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const selected = payload.find((x) => x.id === ev.document_id);
      const sn = ev.evidence_snippet;
      if (ev.decision === "found" && (!selected || !sn || norm(sn).length < 12 || !norm(selected.text).includes(norm(sn)))) {
        const diagnostics: MatcherDiagnostics = { stage: "lovable_decision_validation", failure_reason: "AI_DECISION_REJECTED", provider: "lovable_ai_gateway", model, http_status: ar.status, latency_ms: latency, candidate_count: payload.length, selected_document_id: selected?.id ?? null };
        console.warn("Matcher Lovable found decision rejected by evidence validation", diagnostics);
        const base: MatchResult = { status: "manual_review", matched_document_id: selected?.id ?? null, verified_fact_ids: selected ? [selected.verified_fact_id] : [], verified_doc_type: selected?.verified_doc_type ?? null, verified_years: selected?.verified_year !== null && selected?.verified_year !== undefined ? [selected.verified_year] : [], verified_expiry_dates: selected ? [selected.verified_expiry_date] : [], evidence_snippets: [], match_basis: "CONTENT", confidence: .6, explanation: ev.explanation.trim().slice(0, 500) || "AI evidence decision was rejected by exact PDF evidence validation." };
        const x = resultWithFailure(base, "AI_DECISION_REJECTED", diagnostics);
        await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x }); continue;
      }
      const st: MatchStatus = ev.decision === "found" ? "matched" : ev.decision === "missing" ? "missing" : "manual_review";
      const diagnostics: MatcherDiagnostics = { stage: "lovable_decision", provider: "lovable_ai_gateway", model, http_status: ar.status, latency_ms: latency, candidate_count: payload.length, selected_document_id: selected?.id ?? null };
      const x: MatchResult = { status: st, matched_document_id: selected?.id ?? null, verified_fact_ids: selected ? [selected.verified_fact_id] : [], verified_doc_type: selected?.verified_doc_type ?? null, verified_years: selected?.verified_year !== null && selected?.verified_year !== undefined ? [selected.verified_year] : [], verified_expiry_dates: selected ? [selected.verified_expiry_date] : [], evidence_snippets: st === "matched" && sn ? [sn] : [], match_basis: "CONTENT", confidence: st === "matched" ? .9 : st === "manual_review" ? .6 : 0, explanation: ev.explanation.trim().slice(0, 500) || "Evidence evaluation completed.", diagnostics };
      await updateReq(admin, tender, r, x); await writeMatch(admin, tender, r, x); results.push({ requirement_id: r.id, ...x });
    }
    const summary = { processed: results.length, matched: results.filter((x) => x.status === "matched").length, manual_review: results.filter((x) => x.status === "manual_review").length, missing: results.filter((x) => x.status === "missing").length, expired: results.filter((x) => x.status === "expired").length };
    return json({ tender_id: tender.id, company_id: tender.company_id, summary, results });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
