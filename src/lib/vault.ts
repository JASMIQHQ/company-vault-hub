import type { Database } from "@/integrations/supabase/types";

export type CompanyDocument = Database["public"]["Tables"]["company_documents"]["Row"];
export type AnalysisStatus = Database["public"]["Enums"]["document_analysis_status"];

export const BUCKET = "company-documents";
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ACCEPT_ATTRIBUTE = ".pdf,.png,.jpg,.jpeg";

const MIME_BY_EXTENSION: Record<string, (typeof ACCEPTED_MIME_TYPES)[number]> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export function getFileMimeType(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type || MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

export function validateFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expectedMime = MIME_BY_EXTENSION[extension];

  if (!expectedMime || !ACCEPTED_MIME_TYPES.includes(expectedMime)) {
    return "Only PDF, PNG, JPG and JPEG files are supported.";
  }

  if (file.type && file.type !== expectedMime) {
    return "The file extension and MIME type do not match.";
  }

  if (file.size < 1) return "The file is empty.";
  if (file.size > MAX_FILE_SIZE) return "File is larger than the 20MB limit.";
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
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return sanitized || "document";
}

/** New objects are company-prefixed so Storage RLS can enforce tenant boundaries. */
export function buildStoragePath(companyId: string, category: string, filename: string) {
  const safeCategory = sanitizeFilename(category).slice(0, 64);
  return `${companyId}/${safeCategory}/${Date.now()}_${sanitizeFilename(filename)}`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
