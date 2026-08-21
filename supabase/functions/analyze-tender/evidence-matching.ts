import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import {
  detectHistoricalRegulator,
  normalizeRegulatoryText,
  resolveRegulatoryConcept,
} from "../_shared/regulatory-ontology.ts";

type Candidate = {
  doc: any;
  concept: ReturnType<typeof resolveRegulatoryConcept>;
  score: number;
  matchType: "EXACT_TYPE" | "REGULATORY_IDENTITY" | "NAME_REVIEW";
  historicalIssuer: string | null;
  identityConflict: boolean;
};

function normalize(value: string | null | undefined) {
  return normalizeRegulatoryText(value);
}

function jsonText(value: unknown) {
  try { return JSON.stringify(value ?? ""); } catch { return ""; }
}

function tokens(value: string) {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 2));
}

function tokenSimilarity(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / Math.max(left.size, right.size);
}

function documentIdentity(doc: any) {
  const analysis = doc.analysis_json ?? {};
  const text = jsonText(analysis);
  return {
    companyName: String(
      analysis.extracted_company_name ??
      analysis.company_name ??
      analysis.legal_name ??
      analysis.entity_name ??
      "",
    ),
    registrationNumber: String(
      analysis.rc_number ??
      analysis.registration_number ??
      analysis.rc_no ??
      "",
    ),
    text,
  };
}

function identityConflict(doc: any, company: any) {
  const identity = documentIdentity(doc);
  if (!identity.companyName && !identity.registrationNumber) return false;

  if (identity.registrationNumber && company.registration_number) {
    const left = normalize(identity.registrationNumber).replace(/ /g, "");
    const right = normalize(company.registration_number).replace(/ /g, "");
    if (left && right && left !== right) return true;
  }

  if (identity.companyName) {
    const similarity = tokenSimilarity(identity.companyName, company.legal_name);
    const left = normalize(identity.companyName);
    const right = normalize(company.legal_name);
    if (left && right && !left.includes(right) && !right.includes(left) && similarity < 0.45) return true;
  }

  return false;
}

function documentUsable(doc: any) {
  if (doc.deleted_at) return false;
  if (doc.document_status && doc.document_status !== "active") return false;
  return true;
}

function explicitRequiredYear(requirement: any, deadline: string | null) {
  const source = normalize(`${requirement.requirement_name ?? ""} ${requirement.requirement_text ?? ""}`);
  const explicit = /\b(20\d{2})\b/.exec(source)?.[1];
  if (explicit) return Number(explicit);
  if (/\b(current|latest|renewed|valid|up to date)\b/.test(source) && /\b(year|version|document|certificate)\b/.test(source)) {
    return deadline ? new Date(deadline).getUTCFullYear() : new Date().getUTCFullYear();
  }
  return null;
}

function assessmentYears(doc: any) {
  const analysis = doc.analysis_json ?? {};
  const values = [analysis.assessment_years, analysis.tax_years, analysis.coverage_years, analysis.years_covered]
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => Number(String(value).replace(/[^0-9]/g, "")))
    .filter((year) => year >= 2000 && year <= 2100);
  return [...new Set(values)];
}

function candidateFor(requirement: any, doc: any, company: any): Candidate | null {
  const requirementText = `${requirement.requirement_name ?? ""} ${requirement.requirement_text ?? ""}`;
  const concept = resolveRegulatoryConcept(requirementText);
  const docText = `${doc.document_type ?? ""} ${doc.document_name ?? ""} ${doc.original_filename ?? ""} ${jsonText(doc.analysis_json)}`;
  const docConcept = resolveRegulatoryConcept(docText);
  const conflict = identityConflict(doc, company);

  if (conflict) return null;

  const historicalIssuer = concept ? detectHistoricalRegulator(docText, concept) : null;
  const exactType = Boolean(concept && normalize(doc.document_type) === normalize(concept.canonicalId));
  const regulatoryIdentity = Boolean(concept && docConcept?.canonicalId === concept.canonicalId);
  const nameSimilarity = tokenSimilarity(requirementText, docText);

  if (!exactType && !regulatoryIdentity && nameSimilarity < 0.35) return null;

  const typeScore = exactType ? 1 : regulatoryIdentity ? 0.92 : 0.55;
  const textScore = Math.min(nameSimilarity * 1.35, 1);
  const dateScore = doc.issue_date ? 1 : 0.65;
  const score = 0.55 * typeScore + 0.20 * textScore + 0.15 * dateScore + 0.10;

  return {
    doc,
    concept,
    score,
    matchType: exactType ? "EXACT_TYPE" : regulatoryIdentity ? "REGULATORY_IDENTITY" : "NAME_REVIEW",
    historicalIssuer,
    identityConflict: false,
  };
}

function validateCandidate(candidate: Candidate, requirement: any, tender: any, company: any) {
  const { doc, concept, historicalIssuer } = candidate;
  const deadline = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
  const requiredYear = explicitRequiredYear(requirement, tender.submission_deadline);

  if (doc.analysis_status === "failed" || (doc.analysis_json != null && (typeof doc.analysis_json !== "object" || Array.isArray(doc.analysis_json)))) {
    return {
      status: "manual_review",
      confidence: Math.min(candidate.score, 0.79),
      explanation: `${doc.document_name} is a potentially relevant Vault document, but its analysis data could not be reliably read. Manual review is required.`,
    };
  }

  if (deadline && doc.expiry_date && new Date(doc.expiry_date) < deadline) {
    return {
      status: "expired",
      confidence: Math.min(candidate.score, 0.99),
      explanation: `${doc.document_name} matches ${requirement.requirement_name ?? "the requirement"}, but it expires before the tender deadline.`,
    };
  }

  if (concept?.canonicalId === "OGISP" && historicalIssuer) {
    return {
      status: "manual_review",
      confidence: Math.min(candidate.score, 0.79),
      explanation: `${doc.document_name} is recognised as ${concept.canonicalName}, but it carries legacy ${historicalIssuer} identity. Confirm current NUPRC validity before relying on it.`,
    };
  }

  if (concept?.canonicalId === "TCC" && requiredYear) {
    const covered = assessmentYears(doc);
    const requiredAssessmentYears = [requiredYear - 3, requiredYear - 2, requiredYear - 1];
    const coverageKnown = requiredAssessmentYears.every((year) => covered.includes(year));
    const issueYear = doc.issue_date ? new Date(doc.issue_date).getUTCFullYear() : null;

    if (covered.length && !coverageKnown) {
      return {
        status: "manual_review",
        confidence: 0.68,
        explanation: `${doc.document_name} is a valid TCC identity match, but its assessment-year coverage does not clearly show ${requiredAssessmentYears.join(", ")}.`,
      };
    }
    if (!covered.length && issueYear !== requiredYear) {
      return {
        status: "manual_review",
        confidence: 0.68,
        explanation: `${doc.document_name} matches the TCC requirement, but JASMIQ could not verify the ${requiredYear} certificate/assessment context from its metadata.`,
      };
    }
  } else if (requiredYear) {
    const issueYear = doc.issue_date ? new Date(doc.issue_date).getUTCFullYear() : null;
    if (!issueYear) {
      return {
        status: "manual_review",
        confidence: 0.65,
        explanation: `${doc.document_name} appears relevant, but its issue year is not recorded. Confirm that it is the required ${requiredYear} version.`,
      };
    }
    if (issueYear !== requiredYear) {
      return {
        status: "manual_review",
        confidence: 0.55,
        explanation: `${doc.document_name} matches the requirement, but the recorded issue year is ${issueYear}, not ${requiredYear}.`,
      };
    }
  }

  return {
    status: candidate.score >= 0.82 ? "matched" : "manual_review",
    confidence: candidate.score,
    explanation: candidate.score >= 0.82
      ? `Satisfied by ${company.legal_name} — ${doc.document_name}. JASMIQ matched the regulatory identity and passed the available validity checks.`
      : `${doc.document_name} is a plausible match for ${requirement.requirement_name ?? "the requirement"}, but the evidence needs human confirmation.`,
  };
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
    .select("id, legal_name, registration_number, organization_id")
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
    .select("id, company_id, organization_id, document_name, original_filename, document_type, document_status, analysis_status, behavior, analysis_json, issue_date, expiry_date, deleted_at")
    .eq("company_id", tender.company_id)
    .eq("organization_id", tender.organization_id)
    .is("deleted_at", null);
  if (docsError) throw docsError;

  const usableDocs = (docs ?? []).filter(documentUsable);
  const results: Array<{ id: string; status: string; documentId: string | null; confidence: number; explanation: string }> = [];

  for (const requirement of requirements ?? []) {
    const candidates = usableDocs
      .map((doc) => candidateFor(requirement, doc, company))
      .filter(Boolean) as Candidate[];
    candidates.sort((a, b) => b.score - a.score);

    let status = "missing";
    let documentId: string | null = null;
    let confidence = 0;
    let explanation = `No matching evidence was found in the ${company.legal_name} company vault.`;

    if (candidates.length) {
      const best = candidates[0];
      const validation = validateCandidate(best, requirement, tender, company);
      status = validation.status;
      documentId = best.doc.id;
      confidence = validation.confidence;
      explanation = validation.explanation;

      if (candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) < 0.05 && status === "matched") {
        status = "manual_review";
        confidence = 0.72;
        explanation = `Multiple plausible documents were found for ${requirement.requirement_name ?? "this requirement"}. JASMIQ needs confirmation of the correct evidence.`;
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

  const { data: existingMatches, error: existingMatchesError } = await admin
    .from("compliance_matches")
    .select("id, requirement")
    .eq("tender_id", tender.id)
    .eq("organization_id", tender.organization_id);
  if (existingMatchesError) throw existingMatchesError;

  const activeMatchIds: string[] = [];
  for (const result of results) {
    const req = requirements?.find((item) => item.id === result.id);
    const requirementLabel = req?.requirement_name ?? req?.requirement_text ?? "Requirement";
    const existing = (existingMatches ?? []).find((row) => row.requirement === requirementLabel);
    const payload = {
      tender_id: tender.id,
      organization_id: tender.organization_id,
      requirement: requirementLabel,
      requirement_type: req?.category ?? null,
      document_id: result.documentId,
      confidence: result.confidence,
      status: result.status,
      notes: result.explanation,
    };

    if (existing?.id) {
      const { error } = await admin.from("compliance_matches").update(payload).eq("id", existing.id).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
      if (error) throw error;
      activeMatchIds.push(existing.id);
    } else {
      const { data: inserted, error } = await admin.from("compliance_matches").insert(payload).select("id").maybeSingle();
      if (error) throw error;
      if (inserted?.id) activeMatchIds.push(inserted.id);
    }
  }

  const staleIds = (existingMatches ?? []).map((row) => row.id).filter((id) => !activeMatchIds.includes(id));
  if (staleIds.length) {
    const { error } = await admin.from("compliance_matches").delete().in("id", staleIds).eq("tender_id", tender.id).eq("organization_id", tender.organization_id);
    if (error) throw error;
  }

  const satisfied = results.filter((r) => r.status === "matched").length;
  const needsReview = results.filter((r) => r.status === "manual_review").length;
  const expired = results.filter((r) => r.status === "expired").length;
  const missing = results.filter((r) => r.status === "missing").length;
  const total = results.length;
  const readiness = total ? ((satisfied + needsReview * 0.5) / total) * 100 : 0;
  const mandatoryBlocked = results.some((result) => {
    const req = requirements?.find((item) => item.id === result.id);
    return req?.category === "mandatory" && result.status !== "matched";
  });

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

  return { total, satisfied, needsReview, missing, expired, readiness, mandatoryBlocked };
}