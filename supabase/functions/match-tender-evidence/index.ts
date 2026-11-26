import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authorizeCompanyMembership } from "../_shared/company-authorization.ts";
import { classifyRequirement } from "../_shared/requirement-classification.ts";
import { decideEvidenceMatch, type EvidenceDocument } from "../_shared/tender-evidence-match.ts";
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
interface Document extends EvidenceDocument { company_id: string; organization_id: string; document_status: string | null; deleted_at: string | null; verification_status: string | null; }

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
    const { data: memberships, error: membershipError } = await admin
      .from("organization_members")
      .select("organization_id, is_owner")
      .eq("profile_id", profile.id);
    if (membershipError) throw membershipError;
    const organizationIds = (memberships ?? []).map((row) => row.organization_id).filter(Boolean);

    const { data: tender, error: tenderError } = await admin.from("tenders").select("id, company_id, organization_id").eq("id", tenderId).maybeSingle();
    if (tenderError) throw tenderError;
    const tenderRow = tender as Tender | null;
    if (!tenderRow || !organizationIds.includes(tenderRow.organization_id) || !tenderRow.company_id) return json({ error: "Tender not found." }, 404);
    const companyAuthorized = await authorizeCompanyMembership(admin, {
      profileId: profile.id,
      companyId: tenderRow.company_id,
      organizationId: tenderRow.organization_id,
      organizationMemberships: memberships ?? [],
    });
    if (!companyAuthorized) return json({ error: "Tender not found." }, 404);

    const { data: requirements, error: requirementsError } = await admin.from("tender_requirements").select("id, category, requirement_name, requirement_text, display_order").eq("tender_id", tenderRow.id).eq("organization_id", tenderRow.organization_id).order("display_order", { ascending: true, nullsFirst: false });
    if (requirementsError) throw requirementsError;
    const { data: documents, error: documentsError } = await admin
      .from("company_documents")
      .select("id, company_id, organization_id, document_name, original_filename, document_type, category, expiry_date, document_status, deleted_at, verification_status, verified_doc_type, created_at")
      .eq("organization_id", tenderRow.organization_id)
      .eq("company_id", tenderRow.company_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (documentsError) throw documentsError;

    const { data: facts, error: factsError } = await admin
      .from("document_verified_facts")
      .select("document_id, doc_type, confidence, verification_attempt_id")
      .eq("organization_id", tenderRow.organization_id)
      .eq("company_id", tenderRow.company_id)
      .eq("confidence", "high")
      .not("verification_attempt_id", "is", null);
    if (factsError) throw factsError;

    const activeDocs = ((documents ?? []) as Document[]).filter((doc) => !doc.document_status || doc.document_status === "active" || doc.document_status === "expired");
    const trustedDocumentIds = new Set(
      (facts ?? [])
        .filter((fact) => fact.doc_type && fact.doc_type !== "OTHER")
        .filter((fact) => activeDocs.some((doc) => doc.id === fact.document_id && doc.verification_status === "verified" && doc.verified_doc_type === fact.doc_type))
        .map((fact) => fact.document_id),
    );

    await admin.from("compliance_matches").delete().eq("tender_id", tenderRow.id).eq("organization_id", tenderRow.organization_id);

    const results: Array<{ requirement_id: string; status: Status; matched_document_id: string | null; confidence: number; explanation: string; match_basis: string | null }> = [];
    for (const requirement of (requirements ?? []) as Requirement[]) {
      const aliasesForRequirement = requirementAliases(requirement);
      const disposition = classifyRequirement({ category: requirement.category, name: requirement.requirement_name, text: requirement.requirement_text });
      const decision = decideEvidenceMatch({ disposition, aliases: aliasesForRequirement, documents: activeDocs, trustedDocumentIds, asOf: today() });
      const matchedDocumentId = decision.candidate?.id ?? null;
      const row = {
        organization_id: tenderRow.organization_id,
        tender_id: tenderRow.id,
        document_id: matchedDocumentId,
        requirement: [requirement.requirement_name, requirement.requirement_text].filter(Boolean).join(". "),
        requirement_type: requirement.category ?? "general",
        status: decision.status,
        confidence: decision.confidence,
        notes: JSON.stringify({ match_basis: decision.matchBasis, candidate_document_id: matchedDocumentId, verification_required: decision.status === "manual_review" && matchedDocumentId !== null }),
      };
      const { error: matchError } = await admin.from("compliance_matches").insert(row);
      if (matchError) throw matchError;
      const { error: requirementError } = await admin
        .from("tender_requirements")
        .update({ status: decision.status, matched_document_id: matchedDocumentId, confidence_score: decision.confidence, explanation: decision.explanation, match_basis: decision.matchBasis })
        .eq("id", requirement.id)
        .eq("tender_id", tenderRow.id)
        .eq("organization_id", tenderRow.organization_id);
      if (requirementError) throw requirementError;
      results.push({ requirement_id: requirement.id, status: decision.status, matched_document_id: matchedDocumentId, confidence: decision.confidence, explanation: decision.explanation, match_basis: decision.matchBasis });
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
