import { parseRequirementExplanation } from "./requirement-diagnostics-parser";

export type RequirementStatus = "matched" | "manual_review" | "missing" | "expired" | string;

export interface RequirementGuidance {
  headline: string;
  explanation: string;
  action: string | null;
}

export function deriveRequirementGuidance(
  status: RequirementStatus,
  rawExplanation: string | null | undefined,
): RequirementGuidance {
  const { cleanExplanation, failureReason } = parseRequirementExplanation(rawExplanation);

  if (status === "matched") {
    return {
      headline: "Verified Requirement",
      explanation: cleanExplanation || "An official document matching all criteria was successfully verified.",
      action: null,
    };
  }

  switch (failureReason) {
    case "PDF_TEXT_EXTRACTION_FAILED":
      return {
        headline: "Unreadable or scanned document",
        explanation: "A candidate document was identified, but text inside the file could not be read automatically (e.g., scanned image or protected PDF).",
        action: "Upload a searchable PDF or review the document manually",
      };
    case "VERIFIED_FACT_MISSING":
      return {
        headline: "No verified document on file",
        explanation: "No document of this type has been verified in the Company Vault. Metadata alone is not accepted as proof.",
        action: "Upload and verify this document in Company Vault",
      };
    case "PDF_EVIDENCE_NOT_FOUND":
      return {
        headline: "Verified document exists, exact clause unconfirmed",
        explanation: "A verified document of this type is on file, but specific requirement text could not be pinpointed automatically.",
        action: "Review this document manually",
      };
    case "NO_CANDIDATE_DOCUMENT":
      return {
        headline: "No matching document found",
        explanation: "No document in the Company Vault appears to relate to this requirement.",
        action: "Upload a relevant document",
      };
    case "EXPIRED_FACT":
      return {
        headline: "Verified document has expired",
        explanation: "A matching document was found, but it is past its validity date for this tender.",
        action: "Upload a current, valid document",
      };
    case "CONFIDENCE_TOO_LOW":
      return {
        headline: "Match confidence too low",
        explanation: "A candidate document was found but did not meet the required threshold.",
        action: "Review this document manually",
      };
    case "CONFLICTING_EVIDENCE":
      return {
        headline: "Conflicting evidence found",
        explanation: "Multiple documents produced contradictory evidence for this requirement.",
        action: "Review manually and resolve the conflict",
      };
    default:
      return {
        headline: status === "missing" ? "Missing Evidence" : "Needs Review",
        explanation: cleanExplanation || "This requirement has not yet been verified.",
        action: "Review manually",
      };
  }
}
