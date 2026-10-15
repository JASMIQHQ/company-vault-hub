import { assertEquals, assertRejects } from "jsr:@std/assert";
import { persistVerificationOutcome, type VerificationOutcome } from "./verification-integrity.ts";

const originalFacts = {
  document_id: "e2c59dd9-1f20-4a45-99e7-b99035ca07e0",
  organization_id: "org-fixture",
  company_id: "company-fixture",
  doc_type: "NSITF_CERTIFICATE",
  doc_year: 2026,
  expiry_date: "2026-12-31",
  confidence: "high",
  verification_attempt_id: "attempt-success-1",
  verified_at: "2026-09-01T10:00:00.000Z",
};

function makeStore() {
  const attempts: Array<{
    id: string;
    outcome: VerificationOutcome;
    extra: Record<string, unknown>;
  }> = [];
  const facts: Array<Record<string, unknown>> = [];
  let currentStatus: Record<string, unknown> = {};
  let nextId = 1;
  const adapter = {
    async recordAttempt(outcome: VerificationOutcome, extra: Record<string, unknown>) {
      const id = `attempt-${nextId++}`;
      attempts.push({ id, outcome, extra: structuredClone(extra) });
      return id;
    },
    async updateCurrentStatus(patch: Record<string, unknown>) {
      currentStatus = { ...currentStatus, ...structuredClone(patch) };
    },
    async insertVerifiedFacts(row: Record<string, unknown>) {
      facts.push(structuredClone(row));
    },
  };
  return {
    attempts,
    facts,
    get currentStatus() {
      return currentStatus;
    },
    adapter,
  };
}

Deno.test(
  "Gemini 503 appends a failed attempt and preserves the last successful NSITF facts",
  async () => {
    const store = makeStore();
    store.facts.push(structuredClone(originalFacts));

    await persistVerificationOutcome(
      "failed",
      { error_stage: "AI_UPSTREAM_HTTP", diagnostics: { http_status: 503 } },
      { verification_status: "failed", verified_at: "2026-09-02T10:00:00.000Z" },
      undefined,
      store.adapter,
    );

    assertEquals(store.facts, [originalFacts]);
    assertEquals(store.attempts.length, 1);
    assertEquals(store.attempts[0].outcome, "failed");
    assertEquals(store.attempts[0].extra.error_stage, "AI_UPSTREAM_HTTP");
    assertEquals((store.attempts[0].extra.diagnostics as { http_status: number }).http_status, 503);
    assertEquals(store.currentStatus.verification_status, "failed");
  },
);

Deno.test("a mismatch is auditable and cannot overwrite successful facts", async () => {
  const store = makeStore();
  store.facts.push(structuredClone(originalFacts));

  await persistVerificationOutcome(
    "mismatch",
    { doc_type: "OTHER", confidence: "low" },
    { verification_status: "mismatch", verified_doc_type: "OTHER" },
    undefined,
    store.adapter,
  );

  assertEquals(store.facts, [originalFacts]);
  assertEquals(store.attempts.map((attempt) => attempt.outcome), ["mismatch"]);
  assertEquals(store.currentStatus.verification_status, "mismatch");
});

Deno.test(
  "a later success appends a new fact version without deleting attempt history",
  async () => {
    const store = makeStore();
    store.facts.push(structuredClone(originalFacts));
    store.attempts.push({ id: "attempt-success-1", outcome: "verified", extra: {} });
    store.attempts.push({ id: "attempt-failed-2", outcome: "failed", extra: { http_status: 503 } });

    const newFact = {
      document_id: originalFacts.document_id,
      organization_id: originalFacts.organization_id,
      company_id: originalFacts.company_id,
      doc_type: "NSITF_CERTIFICATE",
      doc_year: 2026,
      expiry_date: "2027-12-31",
      confidence: "high",
      verified_at: "2026-09-03T10:00:00.000Z",
    };

    const attemptId = await persistVerificationOutcome(
      "verified",
      { doc_type: newFact.doc_type, year: newFact.doc_year, expiry_date: newFact.expiry_date, confidence: newFact.confidence },
      { verification_status: "verified", verified_doc_type: newFact.doc_type, verified_at: newFact.verified_at },
      newFact,
      store.adapter,
    );

    assertEquals(attemptId, "attempt-1");
    assertEquals(store.facts.length, 2);
    assertEquals(store.facts[0], originalFacts);
    assertEquals(store.facts[1].expiry_date, "2027-12-31");
    assertEquals(store.facts[1].verification_attempt_id, attemptId);
    assertEquals(store.attempts.length, 3);
    assertEquals(store.currentStatus.verification_status, "verified");
  },
);

Deno.test(
  "invalid fact/outcome combinations fail before writing anything",
  async () => {
    const store = makeStore();
    await assertRejects(() =>
      persistVerificationOutcome("verified", {}, {}, undefined, store.adapter),
    );
    await assertRejects(() =>
      persistVerificationOutcome("failed", {}, {}, originalFacts, store.adapter),
    );
    assertEquals(store.attempts.length, 0);
    assertEquals(store.facts.length, 0);
  },
);
