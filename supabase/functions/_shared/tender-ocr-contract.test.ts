import {
  isScannedTenderPdfAnalysisError,
  TENDER_OCR_LIMITS,
  validateTenderOcrFileSize,
  validateTenderOcrPageCount,
  validateTenderOcrTranscript,
} from "./tender-ocr-contract.ts";

Deno.test("OCR file-size limits accept a non-empty PDF up to 25MB", () => {
  if (validateTenderOcrFileSize(1) !== null) throw new Error("A non-empty PDF should be accepted.");
  if (validateTenderOcrFileSize(TENDER_OCR_LIMITS.maxFileBytes) !== null) {
    throw new Error("The exact 25MB boundary should be accepted.");
  }
});

Deno.test("OCR file-size limits reject empty and oversized PDFs", () => {
  if (!validateTenderOcrFileSize(0)) throw new Error("An empty PDF must be rejected.");
  if (!validateTenderOcrFileSize(TENDER_OCR_LIMITS.maxFileBytes + 1)) {
    throw new Error("A PDF larger than 25MB must be rejected.");
  }
});

Deno.test("OCR page limits accept 1 through 40 pages", () => {
  if (validateTenderOcrPageCount(1) !== null) throw new Error("One page should be accepted.");
  if (validateTenderOcrPageCount(40) !== null) throw new Error("Forty pages should be accepted.");
});

Deno.test("OCR page limits reject invalid and oversized page counts", () => {
  for (const value of [0, -1, 1.5, 41, Number.NaN]) {
    if (!validateTenderOcrPageCount(value)) {
      throw new Error("Expected page count to be rejected: " + value);
    }
  }
});

Deno.test("OCR transcript accepts the exact minimum length and trims whitespace", () => {
  const source = " " + "x".repeat(200) + " ";
  const result = validateTenderOcrTranscript(source, 1);
  if (!result.ok || result.text.length !== 200 || result.pageCount !== 1) {
    throw new Error("A valid transcript should be normalized and accepted.");
  }
});

Deno.test("OCR transcript accepts the exact 120,000-character maximum", () => {
  const result = validateTenderOcrTranscript("x".repeat(120000), 40);
  if (!result.ok || result.text.length !== 120000 || result.pageCount !== 40) {
    throw new Error("The exact transcript and page-count maxima should be accepted.");
  }
});

Deno.test("OCR transcript rejects short, non-string, oversized and invalid page metadata", () => {
  const validText = "x".repeat(200);
  for (const [text, pages] of [
    ["x".repeat(199), 1],
    [null, 1],
    ["x".repeat(120001), 1],
    [validText, 0],
    [validText, 41],
    [validText, 1.25],
    [validText, "2"],
  ] as const) {
    const result = validateTenderOcrTranscript(text, pages);
    if (result.ok) throw new Error("Expected OCR payload rejection.");
  }
});

Deno.test("only the expected 422 scanned-PDF errors activate browser OCR fallback", () => {
  if (!isScannedTenderPdfAnalysisError(422, "The tender PDF has no readable text.")) {
    throw new Error("No-readable-text response should activate OCR.");
  }
  if (!isScannedTenderPdfAnalysisError(422, "Could not read text from the tender PDF.")) {
    throw new Error("Could-not-read-text response should activate OCR.");
  }
  if (isScannedTenderPdfAnalysisError(500, "The tender PDF has no readable text.")) {
    throw new Error("A server error must not activate OCR fallback.");
  }
  if (isScannedTenderPdfAnalysisError(422, "Company membership is invalid.")) {
    throw new Error("An authorization error must not activate OCR fallback.");
  }
});
