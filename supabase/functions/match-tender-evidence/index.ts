import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Status = "matched" | "manual_review" | "missing" | "expired";
interface Tender { id: string; company_id: string; organization_id: string; }
interface Requirement { id: string; category: string | null; requirement_name: string | null; requirement_text: string | null; display_order: number | null; }
interface Document { id: string; company_id: string; organization_id: string; document_name: string | null; original_filename: string | null; document_type: string | null; category: string | null; expiry_date: string | null; document_status: string | null; deleted_at: string | null; }
interface Candidate { document: Document; score: number; basis: string[]; }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const today = () => new Date().toISOString().slice(0, 10);

const aliases: Array<[RegExp, string[]]> = [
  [/\b(cac|corporate affairs commission|certificate of incorporation)\b/i, ["cac", "corporate affairs commission", "certificate of incorporation"]],
  [/\b(tcc|tax clearance|tax clearance certificate|firs)\b/i, ["tcc", "tax clearance", "tax clearance certificate", "firs"]],
  [/\b(pencom|pension commission|pension compliance)\b/i, ["pencom", "pension commission", "pension compliance"]],
  [/\b(itf|industrial training fund)\b/i, ["itf", "industrial training fund"]],
  [/\b(nsitf|social insurance trust fund)\b/i, ["nsitf", "social insurance trust fund"]],
  [/\b(bpp|bureau of public procurement)\b/i, ["bpp", "bureau of public procurement"]],
  [/\b(ogisp|oil and gas industry permit)\b/i, ["ogisp", "oil and gas industry permit"]],
  [/\b(cpn|computer professionals of nigeria)\b/i, ["cpn", "computer professionals of nigeria"]],
  [/\b(nemsa|nigerian electricity management services agency)\b/i, ["nemsa", "nigerian electricity management services agency"]],
  [/\b(audited accounts|audited financial statements|financial statements)\b/i, ["audited accounts", "audited financial statements", "financial statements"]],
];

function requirementAliases(requirement: Requirement): string[] {
  const text = norm([requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(" "));
  for (const [pattern, values] of aliases) if (pattern.test(text)) return values;
  return [];
}

function documentText(document: Document): string {
  return norm([document.document_name, document.original_filename, document.document_type, document.category].filter(Boolean).join(" "));
}

function candidateScore(requirement: Requirement, document: Document, wanted: string[]): Candidate | null {
  const text = documentText(document);
  const type = norm(document.document_type ?? "");
  const name = norm([document.document_name, document.original_filename].filter(Boolean).join(" "));
  const category = norm(document.category ?? "");
  const basis: string[] = [];
  let score = 0;

  if (wanted.length > 0) {
    const exactType = wanted.some((alias) => type === norm(alias) || type.includes(norm(alias)));
    const nameHit = wanted.some((alias) => name.includes(norm(alias)));
    const categoryHit = wanted.some((alias) => category.includes(norm(alias)));
    if (exactType) { score += 100; basis.push("document_type"); }
    if (nameHit) { score += 50; basis.push("document_name"); }
    if (categoryHit) { score += 10; basis.push("category"); }
    if (score === 0) return null;
  } else {
    const requirementTokens = new Set(norm([requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(" ")).split(" ").filter((token) => token.length >= 4));
    const hits = [...requirementTokens].filter((token) => text.includes(token));
    if (hits.length === 0) return null;
    score = hits.length;
    basis.push("document_name/category");
  }

  return { document, score, basis };
}

function classifyExpiry(expiry: string | null): "valid" | "expired" {
  return expiry !== null && expiry < today() ? "expired" : "valid";
}

function explanation(status: Status, candidate: Candidate | null): string {
  if (status === "missing") return "No suitable active Company Vault document matched this requirement for the tender company.";
  if (!candidate) return "The requirement could not be matched to a Company Vault document.";
  if (status === "expired") return `Matched ${candidate.document.document_name ?? candidate.document.original_filename ?? "document"}, but its expiry date ${candidate.document.expiry_date} is before today.`;
  if (status === "manual_review") return `A Company Vault document matched, but the metadata match is ambiguous or weak and requires review.`;
  const expiry = candidate.document.expiry_date ? `Expiry ${candidate.document.expiry_date}.` : "No expiry date recorded; treated as non-expiring.";
  return `Matched ${candidate.document.document_name ?? candidate.document.original_filename ?? "document"} using ${candidate.basis.join(" + ")}. ${expiry}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Supabase configuration is missing." }, 500);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json().catch(() => ({}));
    const tenderId = body?.tender_id;
    if (typeof tenderId !== "string" || !UUID.test(tenderId)) return json({ error: "A valid tender_id is required." }, 400);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not authenticated." }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated." }, 401);

    const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("auth_user_id", userData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "No profile found for this user." }, 403);
    const { data: memberships, error: membershipError } = await admin.from("organization_members").select("organization_id").eq("profile_id", profile.id);
    if (membershipError) throw membershipError;
    const organizationIds = (memberships ?? []).map((row) => row.organization_id).filter(Boolean);

    const { data: tender, error: tenderError } = await admin.from("tenders").select("id, company_id, organization_id").eq("id", tenderId).maybeSingle();
    if (tenderError) throw tenderError;
    const tenderRow = tender as Tender | null;
    if (!tenderRow || !organizationIds.includes(tenderRow.organization_id) || !tenderRow.company_id) return json({ error: "Tender is not accessible or is not associated with a company." }, 403);

    const { data: requirements, error: requirementsError } = await admin.from("tender_requirements").select("id, category, requirement_name, requirement_text, display_order").eq("tender_id", tenderRow.id).eq("organization_id", tenderRow.organization_id).order("display_order", { ascending: true, nullsFirst: false });
    if (requirementsError) throw requirementsError;
    const { data: documents, error: documentsError } = await admin.from("company_documents").select("id, company_id, organization_id, document_name, original_filename, document_type, category, expiry_date, document_status, deleted_at").eq("organization_id", tenderRow.organization_id).eq("company_id", tenderRow.company_id).is("deleted_at", null);
    if (documentsError) throw documentsError;

    const docs = (documents ?? []).filter((doc) => !doc.document_status || doc.document_status === "active") as Document[];
    await admin.from("compliance_matches").delete().eq("tender_id", tenderRow.id).eq("organization_id", tenderRow.organization_id);

    const results: Array<{ requirement_id: string; status: Status; matched_document_id: string | null; confidence: number; explanation: string; match_basis: string }> = [];
    for (const requirement of (requirements ?? []) as Requirement[]) {
      const wanted = requirementAliases(requirement);
      const ranked = docs.map((doc) => candidateScore(requirement, doc, wanted)).filter((candidate): candidate is Candidate => candidate !== null).sort((a, b) => b.score - a.score);
      const best = ranked[0] ?? null;
      const tied = best ? ranked.filter((candidate) => candidate.score === best.score) : [];
      let status: Status;
      let confidence: number;
      let matchBasis = "METADATA";

      if (!best) {
        status = "missing";
        confidence = 0;
      } else if (tied.length > 1 && best.score < 100) {
        status = "manual_review";
        confidence = 0.65;
      } else if (classifyExpiry(best.document.expiry_date) === "expired") {
        status = "expired";
        confidence = Math.min(0.99, best.score >= 100 ? 0.99 : 0.9);
      } else {
        status = best.score >= 100 ? "matched" : "manual_review";
        confidence = status === "matched" ? 0.99 : 0.65;
      }

      const row = {
        organization_id: tenderRow.organization_id,
        tender_id: tenderRow.id,
        document_id: best?.document.id ?? null,
        requirement: [requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(". "),
        requirement_type: requirement.category ?? "general",
        status,
        confidence,
        notes: JSON.stringify({ match_basis: matchBasis, document_expiry_date: best?.document.expiry_date ?? null, candidate_count: ranked.length, candidate_basis: best?.basis ?? [] }),
      };
      const { error: matchError } = await admin.from("compliance_matches").insert(row);
      if (matchError) throw matchError;
      const { error: requirementError } = await admin.from("tender_requirements").update({ status, matched_document_id: best?.document.id ?? null, confidence_score: confidence, explanation: explanation(status, best), match_basis: matchBasis }).eq("id", requirement.id).eq("tender_id", tenderRow.id).eq("organization_id", tenderRow.organization_id);
      if (requirementError) throw requirementError;
      results.push({ requirement_id: requirement.id, status, matched_document_id: best?.document.id ?? null, confidence, explanation: explanation(status, best), match_basis: matchBasis });
    }

    const total = results.length;
    const satisfied = results.filter((result) => result.status === "matched").length;
    const needsReview = results.filter((result) => result.status === "manual_review").length;
    const missing = results.filter((result) => result.status === "missing").length;
    const expired = results.filter((result) => result.status === "expired").length;
    const compliancePercentage = total === 0 ? 0 : Math.round((satisfied / total) * 100);
    const finalMatchingStatus = needsReview > 0 ? "MATCHING_REVIEW" : "MATCHED";

    const { error: tenderUpdateError } = await admin.from("tenders").update({ compliance_percentage: compliancePercentage, matching_status: finalMatchingStatus }).eq("id", tenderRow.id).eq("organization_id", tenderRow.organization_id).eq("company_id", tenderRow.company_id);
    if (tenderUpdateError) throw tenderUpdateError;

    return json({ tender_id: tenderRow.id, company_id: tenderRow.company_id, summary: { total, satisfied, needs_review: needsReview, missing, expired, compliance_percentage: compliancePercentage }, results });
  } catch (error) {
    console.error("match-tender-evidence failed", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
