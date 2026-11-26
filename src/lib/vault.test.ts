import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE,
  buildStoragePath,
  getFileMimeType,
  sanitizeFilename,
  validateFile,
} from "./vault";

describe("Vault upload validation", () => {
  it("accepts supported PDF, PNG and JPEG files", () => {
    expect(validateFile({ name: "tcc.pdf", type: "application/pdf", size: 100 } as File)).toBeNull();
    expect(validateFile({ name: "logo.png", type: "image/png", size: 100 } as File)).toBeNull();
    expect(validateFile({ name: "photo.jpeg", type: "image/jpeg", size: 100 } as File)).toBeNull();
  });

  it("rejects unsupported extensions and mismatched MIME types", () => {
    expect(validateFile({ name: "payload.exe", type: "application/pdf", size: 100 } as File)).toContain("Only PDF");
    expect(validateFile({ name: "fake.pdf", type: "image/png", size: 100 } as File)).toContain("do not match");
  });

  it("enforces the 20 MB limit and rejects empty files", () => {
    expect(validateFile({ name: "empty.pdf", type: "application/pdf", size: 0 } as File)).toContain("empty");
    expect(validateFile({ name: "large.pdf", type: "application/pdf", size: MAX_FILE_SIZE + 1 } as File)).toContain("20MB");
  });

  it("infers a MIME type only when the browser omits it", () => {
    expect(getFileMimeType({ name: "scan.pdf", type: "" } as File)).toBe("application/pdf");
  });

  it("sanitizes names and prefixes new storage paths with company ID", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const path = buildStoragePath(companyId, "Tax & Compliance", "../TCC 2026.pdf");
    const parts = path.split("/");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(companyId);
    expect(parts[1]).toBe("Tax___Compliance");
    expect(parts[2]).toMatch(/^\d+_TCC_2026\.pdf$/);
    expect(sanitizeFilename("../TCC 2026.pdf")).toBe("TCC_2026.pdf");
  });
});
