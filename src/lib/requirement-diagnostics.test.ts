import { expect, test } from "bun:test";
import { deriveRequirementGuidance } from "./requirement-diagnostics";

test("handles matched state without exposing diagnostics", () => {
  const result = deriveRequirementGuidance("matched", "Document verified via registry.");
  expect(result.headline).toBe("Verified Requirement");
  expect(result.action).toBeNull();
});

test("maps VERIFIED_FACT_MISSING", () => {
  const result = deriveRequirementGuidance("missing", "Failure reason: VERIFIED_FACT_MISSING");
  expect(result.headline).toBe("No verified document on file");
});

test("maps PDF_EVIDENCE_NOT_FOUND", () => {
  const result = deriveRequirementGuidance("manual_review", "Failure reason: PDF_EVIDENCE_NOT_FOUND");
  expect(result.headline).toContain("exact clause unconfirmed");
});

test("maps production PDF_TEXT_EXTRACTION_FAILED", () => {
  const result = deriveRequirementGuidance(
    "manual_review",
    "Failure reason: PDF_TEXT_EXTRACTION_FAILED\nDiagnostics: {\"stage\":\"semantic_candidate_pdf\"}",
  );
  expect(result.headline).toBe("Unreadable or scanned document");
  expect(result.explanation).not.toContain("semantic_candidate_pdf");
});

test("maps NO_CANDIDATE_DOCUMENT", () => {
  const result = deriveRequirementGuidance("missing", "Failure reason: NO_CANDIDATE_DOCUMENT");
  expect(result.action).toBe("Upload a relevant document");
});

test("maps EXPIRED_FACT", () => {
  const result = deriveRequirementGuidance("expired", "Failure reason: EXPIRED_FACT");
  expect(result.headline).toBe("Verified document has expired");
});

test("maps CONFIDENCE_TOO_LOW", () => {
  const result = deriveRequirementGuidance("manual_review", "Failure reason: CONFIDENCE_TOO_LOW");
  expect(result.headline).toBe("Match confidence too low");
});

test("maps CONFLICTING_EVIDENCE", () => {
  const result = deriveRequirementGuidance("manual_review", "Failure reason: CONFLICTING_EVIDENCE");
  expect(result.headline).toBe("Conflicting evidence found");
});

test("unknown reason gets safe customer fallback", () => {
  const result = deriveRequirementGuidance("missing", "Failure reason: UNSEEN_FUTURE_ENUM");
  expect(result.headline).toBe("Missing Evidence");
  expect(result.action).toBe("Review manually");
});

test("null explanation gets safe fallback", () => {
  const result = deriveRequirementGuidance("manual_review", null);
  expect(result.headline).toBe("Needs Review");
  expect(result.action).toBe("Review manually");
});
