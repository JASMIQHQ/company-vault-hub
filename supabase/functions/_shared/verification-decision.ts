const STAGING_SUPABASE_REF = "rmtoaaxnuwsecmajhwjx";

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

/** The deterministic AI stub is allowed only on the known staging project. */
export function canUseAiStub(supabaseUrl: string): boolean {
  try {
    return new URL(supabaseUrl).hostname === `${STAGING_SUPABASE_REF}.supabase.co`;
  } catch {
    return false;
  }
}
