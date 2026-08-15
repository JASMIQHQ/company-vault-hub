import type { Database } from "@/integrations/supabase/types";

export type CompanyDocument = Database["public"]["Tables"]["company_documents"]["Row"];
export type AnalysisStatus = Database["public"]["Enums"]["document_analysis_status"];

export const BUCKET = "company-documents";
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const ACCEPT_ATTRIBUTE = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";

export function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = [".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"].some((ext) => name.endsWith(ext));
  const mimeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
  if (!extOk && !mimeOk) return "Only PDF, DOCX, XLSX, JPG, JPEG and PNG files are supported.";
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
  return `${organizationId}/${category}/${Date.now()}_${crypto.randomUUID()}_${sanitizeFilename(filename)}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
