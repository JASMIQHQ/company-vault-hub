export type VerificationOutcome = "verified" | "mismatch" | "failed";

export interface VerificationPersistenceAdapter {
  recordAttempt(outcome: VerificationOutcome, extra: Record<string, unknown>): Promise<string>;
  updateCurrentStatus(patch: Record<string, unknown>): Promise<void>;
  insertVerifiedFacts(facts: Record<string, unknown>): Promise<void>;
}

/**
 * Persists the three independent verification layers in order:
 * 1. append the attempt,
 * 2. update the document's current status,
 * 3. append facts only for a successful verification.
 *
 * Facts are versioned history, not a single mutable row. Failed and mismatched
 * attempts must never delete or replace the last successful fact row.
 */
export async function persistVerificationOutcome(
  outcome: VerificationOutcome,
  attemptExtra: Record<string, unknown>,
  statusPatch: Record<string, unknown>,
  facts: Record<string, unknown> | undefined,
  adapter: VerificationPersistenceAdapter,
): Promise<string> {
  if (outcome === "verified" && !facts) {
    throw new Error("Successful verification requires verified facts.");
  }
  if (outcome !== "verified" && facts) {
    throw new Error("Only successful verification may append verified facts.");
  }

  const attemptId = await adapter.recordAttempt(outcome, attemptExtra);
  await adapter.updateCurrentStatus(statusPatch);

  if (outcome === "verified") {
    await adapter.insertVerifiedFacts({
      ...facts!,
      verification_attempt_id: attemptId,
    });
  }

  return attemptId;
}
