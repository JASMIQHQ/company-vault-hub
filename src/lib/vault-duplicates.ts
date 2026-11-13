import type { CompanyDocument } from "@/lib/vault";

export type DuplicateCandidate = Pick<
  CompanyDocument,
  "company_id" | "sha256_hash" | "deleted_at" | "document_status" | "document_name"
>;

export function findCompanyDuplicate(
  documents: DuplicateCandidate[],
  companyId: string,
  sha256Hash: string,
): DuplicateCandidate | null {
  const normalizedHash = sha256Hash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) return null;

  return (
    documents.find(
      (document) =>
        document.company_id === companyId &&
        document.sha256_hash.toLowerCase() === normalizedHash &&
        document.deleted_at === null &&
        document.document_status !== "superseded" &&
        document.document_status !== "archived",
    ) ?? null
  );
}
