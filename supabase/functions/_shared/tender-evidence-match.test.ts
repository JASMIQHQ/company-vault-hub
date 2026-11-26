import { decideEvidenceMatch, type EvidenceDocument } from "./tender-evidence-match.ts";
const doc: EvidenceDocument = { id: "tcc-1", document_name: "Tax Clearance Certificate", original_filename: "tcc.pdf", document_type: "TCC", category: "STATUTORY_COMPLIANCE", expiry_date: "2027-12-31", verified_doc_type: "TAX_CLEARANCE_CERTIFICATE", created_at: "2026-01-01T00:00:00Z" };
const aliases = ["tcc", "tax clearance", "tax clearance certificate", "firs"];
Deno.test("procedural requirements never link Vault evidence", () => {
  const r = decideEvidenceMatch({ disposition: "procedural", aliases, documents: [doc], trustedDocumentIds: new Set([doc.id]), asOf: "2026-11-26" });
  if (r.status !== "manual_review" || r.candidate !== null || r.matchBasis !== "PROCEDURAL_DECLARATION") throw new Error("Procedural requirements must remain unlinked");
});
Deno.test("metadata-only candidate is not satisfied", () => {
  const r = decideEvidenceMatch({ disposition: "evidence", aliases, documents: [doc], trustedDocumentIds: new Set(), asOf: "2026-11-26" });
  if (r.status !== "manual_review" || r.candidate?.id !== doc.id || r.confidence !== 0.65) throw new Error("Metadata-only candidate must require review");
});
Deno.test("high-confidence verified fact can satisfy evidence", () => {
  const r = decideEvidenceMatch({ disposition: "evidence", aliases, documents: [doc], trustedDocumentIds: new Set([doc.id]), asOf: "2026-11-26" });
  if (r.status !== "matched" || r.matchBasis !== "VERIFIED_FACT" || r.confidence !== 0.99) throw new Error("Verified fact should satisfy requirement");
});
Deno.test("expired verified evidence is linked but not satisfied", () => {
  const r = decideEvidenceMatch({ disposition: "eligibility", aliases, documents: [{ ...doc, expiry_date: "2026-01-01" }], trustedDocumentIds: new Set([doc.id]), asOf: "2026-11-26" });
  if (r.status !== "expired" || r.candidate?.id !== doc.id) throw new Error("Expired verified evidence must be reported");
});
Deno.test("unmapped evidence remains unlinked for review", () => {
  const r = decideEvidenceMatch({ disposition: "evidence", aliases: [], documents: [doc], trustedDocumentIds: new Set([doc.id]), asOf: "2026-11-26" });
  if (r.status !== "manual_review" || r.candidate !== null) throw new Error("Unmapped evidence must not use text fallback");
});