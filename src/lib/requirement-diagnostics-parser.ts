export interface ExtractedDiagnostics {
  cleanExplanation: string;
  failureReason: string | null;
}

export function parseRequirementExplanation(
  rawExplanation: string | null | undefined,
): ExtractedDiagnostics {
  if (!rawExplanation) return { cleanExplanation: "", failureReason: null };

  const failureReasonMatch = rawExplanation.match(/Failure reason:\s*([A-Z0-9_]+)/i);
  let failureReason = failureReasonMatch?.[1]?.toUpperCase() ?? null;

  if (!failureReason) {
    const jsonMatch = rawExplanation.match(/Diagnostics:\s*(\{[\s\S]*\})/i);
    if (jsonMatch?.[1]) {
      try {
        const parsed: unknown = JSON.parse(jsonMatch[1]);
        if (parsed && typeof parsed === "object" && "failure_reason" in parsed) {
          const value = (parsed as { failure_reason?: unknown }).failure_reason;
          if (typeof value === "string" && /^[A-Z0-9_]+$/i.test(value)) {
            failureReason = value.toUpperCase();
          }
        }
      } catch {
        // Malformed diagnostic JSON is intentionally ignored.
      }
    }
  }

  const cleanExplanation = rawExplanation
    .replace(/Diagnostics:\s*\{[\s\S]*\}/gi, "")
    .replace(/Failure reason:\s*[A-Z0-9_]+/gi, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "")
    .trim();

  return { cleanExplanation, failureReason };
}
