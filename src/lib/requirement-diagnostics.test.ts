import { describe, expect, test } from "bun:test";
import { deriveRequirementGuidance } from "./requirement-diagnostics";

describe("deriveRequirementGuidance", () => {
  test("handles matched requirements", () => {
    expect(
      deriveRequirementGuidance("matched", "The official certificate was verified."),
    ).toEqual({
      headline: "Verified Requirement",
      explanation: "The official certificate was verified.",
      action: null,
    });
  });

  test("maps verified fact missing", () => {
    expect(
      deriveRequirementGuidance("missing", "Failure reason: VERIFIED_FACT_MISSING"),
    ).toEqual({
      headline: "No verified document on file",
      explanation:
        "No document of this type has been verified in Company Vault. Document metadata alone is not accepted as proof.",
      action: "Upload and verify this document in Company Vault",
    });
  });

  test("maps PDF evidence not found", () => {
    expect(
      deriveRequirementGuidance("manual_review", "Failure reason: PDF_EVIDENCE_NOT_FOUND"),
    ).toEqual({
      headline: "Verified document exists, exact clause unconfirmed",
      explanation:
        "A verified document of this type is on file, but specific requirement text could not be pinpointed automatically.",
      action: "Review this document manually",
    });
  });

  test("maps PDF text extraction failure", () => {
    expect(
      deriveRequirementGuidance("manual_review", "Failure reason: PDF_TEXT_EXTRACTION_FAILED"),
    ).toEqual({
      headline: "Unreadable or scanned document",
      explanation:
        "A candidate document was identified, but text inside the file could not be read automatically (e.g., scanned image or protected PDF).",
      action: "Upload a searchable PDF or review the document manually",
    });
  });

  test("maps no candidate document", () => {
    expect(
      deriveRequirementGuidance("missing", "Failure reason: NO_CANDIDATE_DOCUMENT"),
    ).toEqual({
      headline: "No matching document found",
      explanation: "No document in the Company Vault appears to relate to this requirement.",
      action: "Upload a relevant document",
    });
  });

  test("maps expired fact", () => {
    expect(
      deriveRequirementGuidance("expired", "Failure reason: EXPIRED_FACT"),
    ).toEqual({
      headline: "Verified document has expired",
      explanation:
        "A matching document was found, but it is past its validity date for this tender.",
      action: "Upload a current, valid document",
    });
  });

  test("maps low confidence", () => {
    expect(
      deriveRequirementGuidance("manual_review", "Failure reason: CONFIDENCE_TOO_LOW"),
    ).toEqual({
      headline: "Match confidence too low",
      explanation: "A candidate document was found but did not meet the required threshold.",
      action: "Review this document manually",
    });
  });

  test("maps conflicting evidence", () => {
    expect(
      deriveRequirementGuidance("manual_review", "Failure reason: CONFLICTING_EVIDENCE"),
    ).toEqual({
      headline: "Conflicting evidence found",
      explanation: "Multiple documents produced contradictory evidence for this requirement.",
      action: "Review manually and resolve the conflict",
    });
  });

  test("uses safe fallback for unknown reason", () => {
    expect(
      deriveRequirementGuidance("missing", "Failure reason: UNKNOWN_INTERNAL_REASON"),
    ).toEqual({
      headline: "Missing Evidence",
      explanation: "This requirement has not yet been verified.",
      action: "Review manually",
    });
  });

  test("uses safe fallback for empty explanation", () => {
    expect(deriveRequirementGuidance("manual_review", null)).toEqual({
      headline: "Needs Review",
      explanation: "This requirement has not yet been verified.",
      action: "Review manually",
    });
  });
});
