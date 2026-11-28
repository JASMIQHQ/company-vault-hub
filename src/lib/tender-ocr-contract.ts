export {
  isScannedTenderPdfAnalysisError,
  TENDER_OCR_LIMITS,
  validateTenderOcrFileSize,
  validateTenderOcrPageCount,
  validateTenderOcrTranscript,
} from "../../supabase/functions/_shared/tender-ocr-contract.ts";
export type { TenderOcrTranscriptValidation } from "../../supabase/functions/_shared/tender-ocr-contract.ts";
