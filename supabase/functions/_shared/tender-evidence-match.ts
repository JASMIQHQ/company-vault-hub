import { normalizeDocumentType, type VerifiedDocType } from "./document-classifier.ts";
import type { RequirementDisposition } from "./requirement-classification.ts";

export type EvidenceMatchStatus = "matched" | "manual_review" | "missing" | "expired";

export interface EvidenceDocument {
  id: string;
  document_name: string | null;
  original_filename: string | null;
  document_type: string | null;
  category: string | null;
  expiry_date: string | null;
  verified_doc_type: string | null;
  document_status?: string | null;
  created_at?: string | null;
}

export interface EvidenceMatchDecision {
  status: EvidenceMatchStatus;
  candidate: EvidenceDocument | null;
  confidence: number;
  matchBasis: "VERIFIED_FACT" | "METADATA" | "PROCEDURAL_DECLARATION" | null;
  explanation: string;
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataCandidateScore(document: EvidenceDocument, aliases: string[]): number {
  const wanted = aliases.map(norm).filter(Boolean);
  const type = norm(document.document_type ?? "");
  const name = norm([document.document_name, document.original_filename].filter(Boolean).join(" "));
  const category = norm(document.category ?? "");
  let score = 0;

  if (wanted.some((alias) => type === alias || type.includes(alias))) {
    score += 100;
  }
  if (wanted.some((alias) => name.includes(alias))) {
    score += 50;
  }
  if (wanted.some((alias) => category.includes(alias))) {
    score += 10;
  }

  return score;
}

/** Only a current high-confidence verified fact can satisfy a requirement. */
export function decideEvidenceMatch(input: {
  disposition: RequirementDisposition;
  aliases: string[];
  documents: EvidenceDocument[];
  trustedDocumentIds: ReadonlySet<string>;
  asOf: string;
}): EvidenceMatchDecision {
  const { disposition, aliases, documents, trustedDocumentIds, asOf } = input;

  if (disposition === "procedural") {
    return {
      status: "manual_review",
      candidate: null,
      confidence: 0,
      matchBasis: "PROCEDURAL_DECLARATION",
      explanation:
        "Submission instruction: complete this step in the bid package. It is not company Vault evidence.",
    };
  }

  if (disposition === "general") {
    return {
      status: "manual_review",
      candidate: null,
      confidence: 0,
      matchBasis: null,
      explanation:
        "This requirement needs human classification. No automatic Company Vault match was attempted.",
    };
  }

  const expectedTypes = [
    ...new Set(
      aliases
        .map(normalizeDocumentType)
        .filter((value): value is VerifiedDocType => value !== null),
    ),
  ];

  if (expectedTypes.length === 0) {
    return {
      status: "manual_review",
      candidate: null,
      confidence: 0,
      matchBasis: null,
      explanation:
        "This evidence or eligibility requirement is not covered by the current deterministic document taxonomy. Map it to an approved evidence type before matching.",
    };
  }

  const verified = documents
    .filter(
      (document) =>
        trustedDocumentIds.has(document.id) &&
        expectedTypes.includes(document.verified_doc_type as VerifiedDocType),
    )
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];

  if (verified) {
    const expired =
      verified.document_status === "expired" ||
      (verified.expiry_date !== null && verified.expiry_date < asOf);
    const expiryText = verified.expiry_date
      ? `Recorded expiry: ${verified.expiry_date}.`
      : "No expiry date recorded; treated as non-expiring under the current Vault rule.";

    return {
      status: expired ? "expired" : "matched",
      candidate: verified,
      confidence: 0.99,
      matchBasis: "VERIFIED_FACT",
      explanation: `${expired ? "Verified evidence found, but it is expired." : "Matched using a successful high-confidence verified document fact."} ${verified.document_name ?? verified.original_filename ?? "Company Vault document"}. ${expiryText}`,
    };
  }

  const metadataCandidate =
    documents
      .map((document) => ({
        document,
        score: metadataCandidateScore(document, aliases),
      }))
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.document.created_at ?? "").localeCompare(a.document.created_at ?? ""),
      )[0]?.document ?? null;

  if (metadataCandidate) {
    return {
      status: "manual_review",
      candidate: metadataCandidate,
      confidence: 0.65,
      matchBasis: "METADATA",
      explanation:
        "A potential Vault document matches declared metadata, but no current high-confidence verification fact supports it. It is a candidate only and is not counted as satisfied.",
    };
  }

  return {
    status: "missing",
    candidate: null,
    confidence: 0,
    matchBasis: "METADATA",
    explanation:
      "No suitable active, verified Company Vault document matched this evidence requirement for the tender company.",
  };
}
