import { getDocumentValidity } from "@/lib/document-validity";
import type { CompanyDocument } from "@/lib/vault";

export type VaultDocumentFilter =
  | "all"
  | "active"
  | "verified"
  | "needs_review"
  | "processing"
  | "failed"
  | "expired"
  | "expiring_soon"
  | "no_expiry"
  | "superseded"
  | "archived";

type FilterableDocument = Pick<
  CompanyDocument,
  "document_status" | "expiry_date" | "analysis_status"
>;

const FILTERS: readonly VaultDocumentFilter[] = [
  "all",
  "active",
  "verified",
  "needs_review",
  "processing",
  "failed",
  "expired",
  "expiring_soon",
  "no_expiry",
  "superseded",
  "archived",
];

export function isVaultDocumentFilter(value: unknown): value is VaultDocumentFilter {
  return typeof value === "string" && FILTERS.includes(value as VaultDocumentFilter);
}

export function matchesVaultDocumentFilter(
  document: FilterableDocument,
  filter: VaultDocumentFilter,
  asOf = new Date(),
): boolean {
  const validity = getDocumentValidity(document.expiry_date, asOf);

  switch (filter) {
    case "all":
      return true;
    case "active":
      return document.document_status === "active" && validity !== "expired";
    case "verified":
      return document.analysis_status === "verified";
    case "needs_review":
      return document.analysis_status === "requires_review";
    case "processing":
      return document.analysis_status === "pending" || document.analysis_status === "processing";
    case "failed":
      return document.analysis_status === "failed";
    case "expired":
      return document.document_status === "expired" || validity === "expired";
    case "expiring_soon":
      return validity === "expiring_soon";
    case "no_expiry":
      return document.expiry_date === null;
    case "superseded":
      return document.document_status === "superseded";
    case "archived":
      return document.document_status === "archived";
  }
}
