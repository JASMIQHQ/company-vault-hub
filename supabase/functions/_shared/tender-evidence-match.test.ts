import { decideEvidenceMatch, type EvidenceDocument } from "./tender-evidence-match.ts";

const document: EvidenceDocument = {
  id: "tcc-1",
  document_name: "Tax Clearance Certificate",
  original_filename: "tcc.pdf",
  document_type: "TCC",
  category: "STATUTORY_COMPLIANCE",
  expiry_date: "2027-12-31",
  verified_doc_type: "TAX_CLEARANCE_CERTIFICATE",
  created_at: "2026-01-01T00:00:00Z",
};

const aliases = ["tcc", "tax clearance", "tax clearance certificate", "firs"];

Deno.test("procedural requirements never link Vault evidence", () => {
  const result = decideEvidenceMatch({
    disposition: "procedural",
    aliases,
    documents: [document],
    trustedDocumentIds: new Set([document.id]),
    asOf: "2026-11-26",
  });

  if (
    result.status !== "manual_review" ||
    result.candidate !== null ||
    result.matchBasis !== "PROCEDURAL_DECLARATION"
  ) {
    throw new Error("Procedural requirements must remain unlinked");
  }
});

Deno.test("metadata-only candidate is not satisfied", () => {
  const result = decideEvidenceMatch({
    disposition: "evidence",
    aliases,
    documents: [document],
    trustedDocumentIds: new Set(),
    asOf: "2026-11-26",
  });

  if (
    result.status !== "manual_review" ||
    result.candidate?.id !== document.id ||
    result.confidence !== 0.65
  ) {
    throw new Error("Metadata-only candidate must require review");
  }
});

Deno.test("high-confidence verified fact can satisfy evidence", () => {
  const result = decideEvidenceMatch({
    disposition: "evidence",
    aliases,
    documents: [document],
    trustedDocumentIds: new Set([document.id]),
    asOf: "2026-11-26",
  });

  if (
    result.status !== "matched" ||
    result.matchBasis !== "VERIFIED_FACT" ||
    result.confidence !== 0.99
  ) {
    throw new Error("Verified fact should satisfy requirement");
  }
});

Deno.test("expired verified evidence is linked but not satisfied", () => {
  const result = decideEvidenceMatch({
    disposition: "eligibility",
    aliases,
    documents: [
      {
        ...document,
        expiry_date: "2026-01-01",
        document_status: "expired",
      },
    ],
    trustedDocumentIds: new Set([document.id]),
    asOf: "2026-11-26",
  });

  if (result.status !== "expired" || result.candidate?.id !== document.id) {
    throw new Error("Expired verified evidence must be reported");
  }
});

Deno.test("unmapped evidence remains unlinked for review", () => {
  const result = decideEvidenceMatch({
    disposition: "evidence",
    aliases: [],
    documents: [document],
    trustedDocumentIds: new Set([document.id]),
    asOf: "2026-11-26",
  });

  if (result.status !== "manual_review" || result.candidate !== null) {
    throw new Error("Unmapped evidence must not use text fallback");
  }
});
