export const TENDER_OCR_LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxPages: 40,
  minTextCharacters: 200,
  maxTextCharacters: 120000,
} as const;

export type TenderOcrTranscriptValidation =
  | { ok: true; text: string; pageCount: number }
  | { ok: false; error: string };

export function validateTenderOcrFileSize(size: number): string | null {
  if (!Number.isFinite(size) || size <= 0) return "The tender PDF is empty.";
  if (size > TENDER_OCR_LIMITS.maxFileBytes) {
    return "The tender PDF exceeds the 25MB local OCR limit.";
  }
  return null;
}

export function validateTenderOcrPageCount(pageCount: number): string | null {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return "The PDF page count is invalid.";
  }
  if (pageCount > TENDER_OCR_LIMITS.maxPages) {
    return "This PDF has " + pageCount +
      " pages. Local OCR currently supports up to " +
      TENDER_OCR_LIMITS.maxPages +
      " pages per run; split the document and upload the relevant section.";
  }
  return null;
}

export function validateTenderOcrTranscript(
  text: unknown,
  pageCount: unknown,
): TenderOcrTranscriptValidation {
  if (
    typeof text !== "string" ||
    text.trim().length < TENDER_OCR_LIMITS.minTextCharacters ||
    text.length > TENDER_OCR_LIMITS.maxTextCharacters
  ) {
    return {
      ok: false,
      error: "OCR text must contain at least 200 readable characters and no more than 120,000 characters.",
    };
  }
  if (
    typeof pageCount !== "number" ||
    !Number.isInteger(pageCount) ||
    pageCount < 1 ||
    pageCount > TENDER_OCR_LIMITS.maxPages
  ) {
    return {
      ok: false,
      error: "OCR page-count metadata must be a whole number between 1 and 40.",
    };
  }
  return { ok: true, text: text.trim(), pageCount };
}

export function isScannedTenderPdfAnalysisError(status: number, message: string): boolean {
  return status === 422 && /no readable text|could not read text/i.test(message);
}
