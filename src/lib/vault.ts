import type { Database } from "@/integrations/supabase/types";

export type CompanyDocument = Database["public"]["Tables"]["company_documents"]["Row"];
export type AnalysisStatus = Database["public"]["Enums"]["document_analysis_status"];

export const BUCKET = "company-documents";
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
] as const;

export const ACCEPT_ATTRIBUTE = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg";

export const VAULT_CATEGORIES = [
  "Company Profile",
  "Certifications",
  "Experience",
  "Financial",
  "Other",
] as const;

export const DOCUMENT_TYPES_BY_CATEGORY: Record<string, readonly string[]> = {
  "Company Profile": ["Company Profile", "Company Registration", "Other Profile Evidence"],
  Certifications: ["Tax Clearance", "CAC Certificate", "Professional Certification", "Other Certification"],
  Experience: ["Contract Agreement", "Completion Certificate", "Purchase Order", "Other Experience Evidence"],
  Financial: ["Bank Reference", "Audited Accounts", "Financial Statement", "Other Financial Evidence"],
  Other: ["Other Document"],
};

export function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const allowedExtensions = [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"];
  const extOk = allowedExtensions.some((ext) => name.endsWith(ext));
  const mimeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);

  if (!extOk && !mimeOk) {
    return "Only PDF, DOCX, XLSX, PNG, JPG and JPEG files are supported.";
  }
  if (file.size > MAX_FILE_SIZE) return "File is larger than the 25MB limit.";
  return null;
}

export async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildStoragePath(organizationId: string, category: string, filename: string) {
  return `${organizationId}/${category}/${Date.now()}_${sanitizeFilename(filename)}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes < 1) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}
