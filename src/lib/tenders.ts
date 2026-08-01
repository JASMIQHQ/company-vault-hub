import { sanitizeFilename } from "@/lib/vault";

export const TENDER_BUCKET = "tender-files";
export const MAX_TENDER_FILE_SIZE = 25 * 1024 * 1024;
export const TENDER_ACCEPT_ATTRIBUTE = ".pdf";

export interface TenderListItem {
  id: string;
  title: string;
  created_at: string | null;
  storage_path: string | null;
  analysis_status: string | null;
  analysis_error: string | null;
  procuring_entity: string | null;
  submission_deadline: string | null;
  compliance_percentage: number | null;
  requires_bid_security: boolean | null;
  requires_bank_reference: boolean | null;
  requires_affidavit: boolean | null;
}

export interface TenderRequirementItem {
  id: string;
  category: string;
  requirement_name: string | null;
  requirement_text: string;
  display_order: number | null;
  status: string | null;
  confidence_score: number | null;
  explanation: string | null;
  matched_document_id: string | null;
}


export function validateTenderFile(file: File): string | null {
  const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  if (!isPdf) return "Only PDF files are supported.";
  if (file.size > MAX_TENDER_FILE_SIZE) return "File is larger than the 25MB limit.";
  return null;
}

export function buildTenderStoragePath(organizationId: string, filename: string) {
  return `${organizationId}/tenders/${Date.now()}_${sanitizeFilename(filename)}`;
}
