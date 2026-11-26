import { canUseAiStub, resolveVerificationOutcome } from "./verification-decision.ts";

Deno.test("high-confidence matching document type can be verified", () => {
  if (
    resolveVerificationOutcome({
      declaredType: "TAX_CLEARANCE_CERTIFICATE",
      detectedType: "TAX_CLEARANCE_CERTIFICATE",
      confidence: "high",
    }) !== "verified"
  ) {
    throw new Error("matching high-confidence document should verify");
  }
});

Deno.test("type mismatch always requires review", () => {
  if (
    resolveVerificationOutcome({
      declaredType: "TAX_CLEARANCE_CERTIFICATE",
      detectedType: "CAC_CERTIFICATE",
      confidence: "high",
    }) !== "mismatch"
  ) {
    throw new Error("type mismatch must not verify");
  }
});

Deno.test("low-confidence result always requires review", () => {
  if (
    resolveVerificationOutcome({
      declaredType: "TAX_CLEARANCE_CERTIFICATE",
      detectedType: "TAX_CLEARANCE_CERTIFICATE",
      confidence: "low",
    }) !== "mismatch"
  ) {
    throw new Error("low-confidence result must not verify");
  }
});

Deno.test("OTHER classification always requires review", () => {
  if (
    resolveVerificationOutcome({
      declaredType: null,
      detectedType: "OTHER",
      confidence: "high",
    }) !== "mismatch"
  ) {
    throw new Error("OTHER classification must not verify");
  }
});

Deno.test("unknown declared type does not block high-confidence detection", () => {
  if (
    resolveVerificationOutcome({
      declaredType: "OTHER",
      detectedType: "CAC_CERTIFICATE",
      confidence: "high",
    }) !== "verified"
  ) {
    throw new Error("high-confidence result with unknown declared type should verify");
  }
});

Deno.test("AI stub is forbidden for production Supabase URL", () => {
  if (canUseAiStub("https://itqepknvdiedldcyunig.supabase.co")) {
    throw new Error("production Supabase URL accepted AI stub");
  }
});

Deno.test("AI stub is allowed for staging Supabase URL", () => {
  if (!canUseAiStub("https://rmtoaaxnuwsecmajhwjx.supabase.co")) {
    throw new Error("staging Supabase URL rejected AI stub");
  }
});
