import { describe, expect, test } from "bun:test";
import { parseRequirementExplanation } from "./requirement-diagnostics-parser";

describe("parseRequirementExplanation", () => {
  test("extracts production-shaped failure reason and strips diagnostics", () => {
    const result = parseRequirementExplanation(
      "Failure reason: PDF_TEXT_EXTRACTION_FAILED\nDiagnostics: {\"stage\":\"semantic_candidate_pdf\",\"failure_reason\":\"PDF_TEXT_EXTRACTION_FAILED\",\"candidate_count\":1}",
    );

    expect(result.failureReason).toBe("PDF_TEXT_EXTRACTION_FAILED");
    expect(result.cleanExplanation).toBe("");
    expect(result.cleanExplanation).not.toContain("candidate_count");
  });

  test("falls back to embedded diagnostic JSON", () => {
    const result = parseRequirementExplanation(
      "A candidate was considered.\nDiagnostics: {\"stage\":\"candidate_search\",\"failure_reason\":\"NO_CANDIDATE_DOCUMENT\"}",
    );

    expect(result.failureReason).toBe("NO_CANDIDATE_DOCUMENT");
    expect(result.cleanExplanation).toBe("A candidate was considered.");
  });

  test("preserves clean explanatory text", () => {
    const result = parseRequirementExplanation(
      "The document appears relevant. Failure reason: PDF_EVIDENCE_NOT_FOUND",
    );

    expect(result.failureReason).toBe("PDF_EVIDENCE_NOT_FOUND");
    expect(result.cleanExplanation).toBe("The document appears relevant.");
  });

  test("removes internal UUIDs from customer-facing explanation", () => {
    const result = parseRequirementExplanation(
      "Candidate document 6bd230a5-1514-4189-8525-715c22dd924b requires review.",
    );

    expect(result.cleanExplanation).toBe("Candidate document  requires review.");
    expect(result.cleanExplanation).not.toContain("6bd230a5-1514-4189-8525-715c22dd924b");
  });

  test("ignores malformed diagnostic JSON without throwing", () => {
    const result = parseRequirementExplanation(
      "Review this document. Diagnostics: {not valid json}",
    );

    expect(result.failureReason).toBeNull();
    expect(result.cleanExplanation).toBe("Review this document.");
  });
});
