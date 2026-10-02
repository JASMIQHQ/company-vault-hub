import { applyVerifiedEvidence, candidateScore, latestVerifiedFacts, type Candidate, type Document, type Requirement, type VerifiedFact } from "./matcher-core.ts";

const requirement: Requirement = {
  id: "req-1",
  category: "registration",
  requirement_name: "CAC Certificate",
  requirement_text: "Valid CAC certificate",
  display_order: 1,
};

const document = (overrides: Partial<Document> = {}): Document => ({
  id: "doc-1",
  company_id: "company-a",
  organization_id: "org-a",
  document_name: "CAC Certificate 2025",
  original_filename: "CAC.pdf",
  document_type: "CAC_CERTIFICATE",
  category: "registration",
  expiry_date: null,
  document_status: "active",
  deleted_at: null,
  ...overrides,
});

const candidate = (overrides: Partial<Document> = {}): Candidate => ({
  document: document(overrides),
  score: 100,
  basis: ["document_type"],
});

const fact = (overrides: Partial<VerifiedFact> = {}): VerifiedFact => ({
  id: "fact-1",
  document_id: "doc-1",
  doc_type: "CAC_CERTIFICATE",
  doc_year: 2025,
  expiry_date: null,
  confidence: "high",
  verification_attempt_id: null,
  verified_at: "2026-09-01T10:00:00.000Z",
  ...overrides,
});

Deno.test("golden: no verified fact falls back to metadata", () => {
  const result = applyVerifiedEvidence(requirement, candidate(), ["cac", "certificate of incorporation"], undefined);
  if (result.matchBasis !== "METADATA" || result.verified) throw new Error("expected metadata fallback");
});

Deno.test("golden: qualifying verified fact agrees and qualifies", () => {
  const result = applyVerifiedEvidence(requirement, candidate(), ["cac", "certificate of incorporation"], fact());
  if (result.status !== "matched" || result.matchBasis !== "VERIFIED" || !result.verified) throw new Error("expected VERIFIED matched");
});

Deno.test("golden: verified type conflict short-circuits to manual review", () => {
  const result = applyVerifiedEvidence(requirement, candidate(), ["cac", "certificate of incorporation"], fact({ doc_type: "TCC" }));
  if (result.status !== "manual_review" || result.reason !== "verified_doc_type_conflict") throw new Error("expected verified type conflict");
});

Deno.test("golden: metadata versus verified type conflict is manual review", () => {
  const result = applyVerifiedEvidence(requirement, candidate({ document_type: "TCC" }), ["cac"], fact());
  if (result.status !== "manual_review" || result.reason !== "metadata_verified_doc_type_conflict") throw new Error("expected metadata/type conflict");
});

Deno.test("golden: year conflict is manual review", () => {
  const result = applyVerifiedEvidence(requirement, candidate({ document_name: "CAC Certificate 2025" }), ["cac"], fact({ doc_year: 2024 }));
  if (result.status !== "manual_review" || result.reason !== "metadata_verified_year_conflict") throw new Error("expected year conflict");
});

Deno.test("golden: expiry conflict is manual review", () => {
  const result = applyVerifiedEvidence(requirement, candidate({ expiry_date: "2027-01-01" }), ["cac"], fact({ expiry_date: "2026-12-31" }));
  if (result.status !== "manual_review" || result.reason !== "metadata_verified_expiry_conflict") throw new Error("expected expiry conflict");
});

Deno.test("golden: verified expiry can make an otherwise valid match expired", () => {
  const result = applyVerifiedEvidence(requirement, candidate(), ["cac"], fact({ expiry_date: "2020-01-01" }));
  if (result.status !== "expired" || result.matchBasis !== "VERIFIED") throw new Error("expected verified expired");
});

Deno.test("golden: unsupported confidence falls back to metadata", () => {
  const result = applyVerifiedEvidence(requirement, candidate(), ["cac"], fact({ confidence: "medium" }));
  if (result.matchBasis !== "METADATA" || result.verified) throw new Error("expected unsupported confidence fallback");
});

Deno.test("golden: missing verified expiry falls back to metadata expiry", () => {
  const result = applyVerifiedEvidence(requirement, candidate({ expiry_date: "2027-01-01" }), ["cac"], fact({ expiry_date: null }));
  if (result.status !== "matched" || result.expiryDate !== "2027-01-01" || result.matchBasis !== "VERIFIED") throw new Error("expected metadata expiry fallback");
});

Deno.test("golden: newest verified_at wins deterministically", () => {
  const rows = [
    fact({ id: "fact-old", doc_year: 2020, verified_at: "2026-08-01T10:00:00.000Z" }),
    fact({ id: "fact-new", doc_year: 2025, verified_at: "2026-09-01T10:00:00.000Z" }),
  ];
  const latest = latestVerifiedFacts(rows).get("doc-1");
  if (!latest || latest.id !== "fact-new") throw new Error("expected newest fact");
});

Deno.test("golden: equal verified_at uses id as deterministic tie-break", () => {
  const rows = [
    fact({ id: "fact-a", verified_at: "2026-09-01T10:00:00.000Z" }),
    fact({ id: "fact-b", verified_at: "2026-09-01T10:00:00.000Z" }),
  ];
  const latest = latestVerifiedFacts(rows).get("doc-1");
  if (!latest || latest.id !== "fact-b") throw new Error("expected deterministic id tie-break");
});

Deno.test("golden: candidate ranking remains metadata-driven", () => {
  const exact = candidateScore(requirement, document({ id: "exact", document_type: "CAC_CERTIFICATE" }), ["cac"]);
  const nameOnly = candidateScore(requirement, document({ id: "name", document_type: "general", document_name: "CAC Certificate 2025" }), ["cac"]);
  if (!exact || !nameOnly || exact.score <= nameOnly.score) throw new Error("verification must not change candidate ranking");
});
