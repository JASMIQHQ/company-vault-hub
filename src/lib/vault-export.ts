import type { CompanyDocument } from "@/lib/vault";

export type ExportableDocument = Pick<
  CompanyDocument,
  | "company_id"
  | "document_name"
  | "original_filename"
  | "document_type"
  | "category"
  | "document_status"
  | "analysis_status"
  | "expiry_date"
  | "created_at"
  | "version"
  | "file_size"
>;

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildVaultRegisterCsv(
  documents: ExportableDocument[],
  companyNames: ReadonlyMap<string, string>,
): string {
  const headers = [
    "Company",
    "Document name",
    "Original filename",
    "Document type",
    "Category",
    "Document status",
    "Analysis status",
    "Expiry date",
    "Uploaded at",
    "Version",
    "File size (bytes)",
  ];

  const rows = documents.map((document) => [
    companyNames.get(document.company_id) ?? "Unknown company",
    document.document_name,
    document.original_filename,
    document.document_type,
    document.category,
    document.document_status,
    document.analysis_status,
    document.expiry_date,
    document.created_at,
    document.version,
    document.file_size,
  ]);

  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadVaultRegisterCsv(
  documents: ExportableDocument[],
  companyNames: ReadonlyMap<string, string>,
  asOf = new Date(),
): void {
  const csv = buildVaultRegisterCsv(documents, companyNames);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `jasmiq-vault-register-${asOf.toISOString().slice(0, 10)}.csv`;
  link.style.display = "none";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
