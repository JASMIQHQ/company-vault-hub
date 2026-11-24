import { getDocumentValidity } from "@/lib/document-validity";
import type { CompanyDocument } from "@/lib/vault";

type HealthDocument = Pick<CompanyDocument, "document_status" | "expiry_date" | "analysis_status">;

export interface VaultHealthSummary {
  expiringSoon: number;
  expired: number;
  needsReview: number;
  failed: number;
}

/** Summarize actionable document health without counting archived or superseded evidence. */
export function summarizeVaultHealth(
  documents: readonly HealthDocument[],
  asOf = new Date(),
): VaultHealthSummary {
  const summary: VaultHealthSummary = {
    expiringSoon: 0,
    expired: 0,
    needsReview: 0,
    failed: 0,
  };

  for (const document of documents) {
    const status = document.document_status;
    if (status === "superseded" || status === "archived") continue;

    const validity = getDocumentValidity(document.expiry_date, asOf);
    if (status === "expired" || (status === "active" && validity === "expired")) {
      summary.expired += 1;
    }
    if (status === "active" && validity === "expiring_soon") {
      summary.expiringSoon += 1;
    }
    if (document.analysis_status === "requires_review") {
      summary.needsReview += 1;
    }
    if (document.analysis_status === "failed") {
      summary.failed += 1;
    }
  }

  return summary;
}
