const PRODUCTION_SUPABASE_REF = "itqepknvdiedldcyunig";

export type VerificationConfidence = "high" | "low";
export type VerificationOutcome = "verified" | "mismatch";

export function resolveVerificationOutcome(args: {
  declaredType: string | null;
  detectedType: string;
  confidence: VerificationConfidence;
}): VerificationOutcome {
  if (args.detectedType === "OTHER" || args.confidence !== "high") {
    return "mismatch";
  }

  if (
    args.declaredType &&
    args.declaredType !== "OTHER" &&
    args.declaredType !== args.detectedType
  ) {
    return "mismatch";
  }

  return "verified";
}

/** AI stub responses are allowed only outside the production Supabase project. */
export function canUseAiStub(supabaseUrl: string): boolean {
  return !supabaseUrl.includes(PRODUCTION_SUPABASE_REF);
}
