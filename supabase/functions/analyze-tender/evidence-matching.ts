import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const REGULATORY_MAP: Record<string, string[]> = {
  CAC_CERT: ["cac", "corporate affairs commission", "cac registration", "cac certificate"],
  TCC: ["tcc", "tax clearance", "tax clearance certificate", "firs tax clearance"],
  PENCOM: ["pencom", "pension compliance", "national pension commission"],
  ITF: ["itf", "industrial training fund"],
  NSITF: ["nsitf", "nigeria social insurance trust fund"],
  BPP: ["bpp", "bureau of public procurement", "irr", "bpp certificate"],
  OGISP: ["ogisp", "oil and gas industry standard", "oil and gas industry permit"],
  CPN: ["cpn", "computer professionals of nigeria"],
  NEMSA: ["nemsa", "nigerian electricity management services agency"],
  SCUML: ["scuml", "special control unit against money laundering"],
};

function normalize(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function regulatoryType(value: string | null | undefined) {
  const normalized = normalize(value);
  if (!normalized) return null;
  for (const [type, aliases] of Object.entries(REGULATORY_MAP)) {
    if (aliases.some((alias) => normalized === normalize(alias) || normalized.includes(normalize(alias)))) return type;
  }
  return null;
}

function requiredType(requirementName: string | null | undefined, requirementText: string) {
  return regulatoryType(`${requirementName ?? ""} ${requirementText}`);
}

function requiredYear(requirementName: string | null | undefined, requirementText: string, deadline: string | null) {
  const source = normalize(`${requirementName ?? ""} ${requirementText}`);
  const explicit = /\b(20\d{2})\b/.exec(source)?.[1];
  if (explicit) return Number(explicit);
  if (/\b(current|latest|renewed|valid)\b/.test(source) && /\b(year|version|certificate|document)\b/.test(source)) {
    return deadline ? new Date(deadline).getUTCFullYear() : new Date().getUTCFullYear();
  }
  return null;
}

function documentUsable(doc: any) {
  if (doc.deleted_at) return false;
  if (doc.document_status && doc.document_status !== "active") return false;
  if (doc.analysis_status === "failed") return false;
  return true;
}

function findMatch(requirement: any, docs: any[]) {
  const wantedType = requiredType(requirement.requirement_name, requirement.requirement_text);
  const requirementText = normalize(`${requirement.requirement_name ?? ""} ${requirement.requirement_text}`);

  if (wantedType) {
    const exact = docs.find((doc) => regulatoryType(doc.document_type) === wantedType);
    if (exact) return { doc: exact, confidence: 0.98, matchType: "EXACT_TAG" };
  }

  const normalizedDocs = docs.map((doc) => ({
    doc,
    value: normalize(`${doc.document_type ?? ""} ${doc.document_name} ${doc.original_filename ?? ""}`),
  }));
  const direct = normalizedDocs.find((item) => item.value.includes(requirementText) || requirementText.includes(item.value));
  if (direct) return { doc: direct.doc, confidence: 0.94, matchType: "NORMALIZED_NAME" };

  if (wantedType) {
    const synonym = docs.find((doc) => regulatoryType(`${doc.document_type ?? ""} ${doc.document_name}`) === wantedType);
    if (synonym) return { doc: synonym, confidence: 0.91, matchType: "REGULATORY_SYNONYM" };
  }
  return null;
}

export async function runEvidenceMatching(admin: SupabaseClient, tenderId: string) {
  const { data: tender, error: tenderError } = await admin
    .from("tenders")
    .select("id, company_id, organization_id, submission_deadline")
    .eq("id", tenderId)
    .maybeSingle();
  if (tenderError || !tender) throw tenderError ?? new Error("Tender not found for evidence matching.");

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, legal_name, organization_id")
    .eq("id", tender.company_id)
    .eq("organization_id", tender.organization_id)
    .maybeSingle();
  if (companyError || !company) throw companyError ?? new Error("Tender company could not be resolved.");

  const { data: requirements, error: requirementsError } = await admin
    .from("tender_requirements")
    .select("id, category, requirement_name, requirement_text, display_order")
    .eq("tender_id", tender.id)
    .eq("organization_id", tender.organization_id)
    .order("display_order", { ascending: true });
  if (requirementsError) throw requirementsError;

  const { data: docs, error: docsError } = await admin
    .from("company_documents")
    .select("id, company_id, organization_id, document_name, original_filename, document_type, document_status, analysis_status, issue_date, expiry_date, deleted_at")
    .eq("company_id", tender.company_id)
    .eq("organization_id", tender.organization_id)
    .is("deleted_at", null);
  if (docsError) throw docsError;

  const usableDocs = (docs ?? []).filter(documentUsable);
  const deadline = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
  const results: Array<{ id: string; status: string; documentId: string | null; confidence: number; explanation: string }> = [];

  for (const requirement of requirements ?? []) {
    const match = findMatch(requirement, usableDocs);
    let status = "missing";
    let documentId: string | null = null;
    let confidence = 0;
    let explanation = `No matching evidence was found in the ${company.legal_name} company vault.`;

    if (match) {
      documentId = match.doc.id;
      confidence = match.confidence;
      const year = requiredYear(requirement.requirement_name, requirement.requirement_text, tender.submission_deadline);
      const issueYear = match.doc.issue_date ? new Date(match.doc.issue_date).getUTCFullYear() : null;
      const expired = Boolean(deadline && match.doc.expiry_date && new Date(match.doc.expiry_date) < deadline);
      const yearInvalid = Boolean(year && (!issueYear || issueYear !== year));

      if (expired) {
        status = "expired";
        explanation = `Matching evidence was found in ${company.legal_name}, but ${match.doc.document_name} expires before the tender submission deadline.`;
      } else if (yearInvalid) {
        status = "manual_review";
        confidence = 0.5;
        explanation = `Matching evidence was found in ${company.legal_name}, but ${match.doc.document_name} does not satisfy the explicit ${year} current-year requirement.`;
      } else if (match.confidence >= 0.9) {
        status = "matched";
        explanation = `Satisfied by ${company.legal_name} — ${match.doc.document_name}. Deterministic ${match.matchType.toLowerCase().replace("_", " ")} match passed the available validity checks.`;
      } else {
        status = "manual_review";
        confidence = 0.5;
        explanation = `Potential evidence found in ${company.legal_name} — ${match.doc.document_name}. Human verification is required before treating the requirement as satisfied.`;
      }
    }

    const { error: updateError } = await admin
      .from("tender_requirements")
      .update({ matched_document_id: documentId, confidence_score: confidence, status, explanation })
      .eq("id", requirement.id)
      .eq("tender_id", tender.id)
      .eq("organization_id", tender.organization_id);
    if (updateError) throw updateError;
    results.push({ id: requirement.id, status, documentId, confidence, explanation });
  }

  const { error: deleteMatchesError } = await admin
    .from("compliance_matches")
    .delete()
    .eq("tender_id", tender.id)
    .eq("organization_id", tender.organization_id);
  if (deleteMatchesError) throw deleteMatchesError;

  if (results.length) {
    const rows = results.map((result) => {
      const req = requirements?.find((item) => item.id === result.id);
      return {
        tender_id: tender.id,
        organization_id: tender.organization_id,
        requirement: req?.requirement_name ?? req?.requirement_text ?? "Requirement",
        requirement_type: req?.category ?? null,
        document_id: result.documentId,
        confidence: result.confidence,
        status: result.status,
        notes: result.explanation,
      };
    });
    const { error: matchError } = await admin.from("compliance_matches").insert(rows);
    if (matchError) throw matchError;
  }

  const satisfied = results.filter((r) => r.status === "matched").length;
  const needsReview = results.filter((r) => r.status === "manual_review").length;
  const expired = results.filter((r) => r.status === "expired").length;
  const missing = results.filter((r) => r.status === "missing").length;
  const total = results.length;
  const readiness = total ? ((satisfied + needsReview * 0.5) / total) * 100 : 0;

  const { data: existingEligibility, error: eligibilityReadError } = await admin
    .from("tender_eligibility")
    .select("id")
    .eq("tender_id", tender.id)
    .eq("organization_id", tender.organization_id)
    .maybeSingle();
  if (eligibilityReadError) throw eligibilityReadError;

  const eligibilityPayload = {
    eligibility_score: readiness,
    matched: satisfied,
    missing,
    expired,
    generated_at: new Date().toISOString(),
    organization_id: tender.organization_id,
    tender_id: tender.id,
  };
  if (existingEligibility?.id) {
    const { error } = await admin.from("tender_eligibility").update(eligibilityPayload).eq("id", existingEligibility.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("tender_eligibility").insert(eligibilityPayload);
    if (error) throw error;
  }

  const { error: tenderUpdateError } = await admin
    .from("tenders")
    .update({ compliance_percentage: readiness })
    .eq("id", tender.id)
    .eq("organization_id", tender.organization_id);
  if (tenderUpdateError) throw tenderUpdateError;

  return { total, satisfied, needsReview, missing, expired, readiness };
}
