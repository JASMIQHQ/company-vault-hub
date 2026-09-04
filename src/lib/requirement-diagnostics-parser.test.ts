import { expect, test } from "bun:test";
import { parseRequirementExplanation } from "./requirement-diagnostics-parser";

test("parses PDF_TEXT_EXTRACTION_FAILED from production-shaped diagnostics", () => {
  const raw = `Failure reason: PDF_TEXT_EXTRACTION_FAILED\nDiagnostics:\n{\n  "stage": "semantic_candidate_pdf",\n  "failure_reason": "PDF_TEXT_EXTRACTION_FAILED",\n  "candidate_count": 1\n}`;
  const result = parseRequirementExplanation(raw);

  expect(result.failureReason).toBe("PDF_TEXT_EXTRACTION_FAILED");
  expect(result.cleanExplanation).toBe("");
  expect(result.cleanExplanation).not.toContain("Diagnostics");
  expect(result.cleanExplanation).not.toContain("semantic_candidate_pdf");
});

test("falls back to failure_reason inside valid diagnostics JSON", () => {
  const raw = `Candidate review required.\nDiagnostics: {"failure_reason":"NO_CANDIDATE_DOCUMENT","candidate_count":0}`;
  const result = parseRequirementExplanation(raw);

  expect(result.failureReason).toBe("NO_CANDIDATE_DOCUMENT");
  expect(result.cleanExplanation).toBe("Candidate review required.");
});

test("handles clean explanations without diagnostics", () => {
  const result = parseRequirementExplanation("Document verified via tax registry.");

  expect(result.failureReason).toBeNull();
  expect(result.cleanExplanation).toBe("Document verified via tax registry.");
});

test("removes UUIDs from customer-facing explanation", () => {
  const result = parseRequirementExplanation("Selected document 6bd230a5-1514-4189-8525-715c22dd924b requires review.");

  expect(result.cleanExplanation).toBe("Selected document  requires review.");
  expect(result.cleanExplanation).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27}/i);
});

test("handles malformed diagnostics without leaking the block", () => {
  const result = parseRequirementExplanation("Failure reason: UNKNOWN_REASON\nDiagnostics: {broken-json");

  expect(result.failureReason).toBe("UNKNOWN_REASON");
  expect(result.cleanExplanation).not.toContain("Diagnostics");
  expect(result.cleanExplanation).not.toContain("broken-json");
});
