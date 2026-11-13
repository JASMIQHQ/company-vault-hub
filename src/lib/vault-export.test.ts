import { describe, expect, test } from "bun:test";
import { buildVaultRegisterCsv } from "./vault-export";
import type { ExportableDocument } from "./vault-export";

const documentFixture: ExportableDocument = {
  company_id: "company-1",
  document_name: "CAC Certificate",
  original_filename: "cac, certificate.pdf",
  document_type: "CAC",
  category: "corporate",
  document_status: "active",
  analysis_status: "verified",
  expiry_date: null,
  created_at: "2026-11-13T10:00:00.000Z",
  version: 2,
  file_size: 1024,
};

describe("buildVaultRegisterCsv", () => {
  test("exports the selected document register fields and company name", () => {
    const csv = buildVaultRegisterCsv(
      [documentFixture],
      new Map([["company-1", "Bosah Innovations Ltd"]]),
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Company","Document name","Original filename"');
    expect(csv).toContain('"Bosah Innovations Ltd"');
    expect(csv).toContain('"cac, certificate.pdf"');
    expect(csv).toContain('"active","verified"');
    expect(csv).toContain('"1024"');
  });

  test("escapes quotes and preserves commas and line breaks inside cells", () => {
    const csv = buildVaultRegisterCsv(
      [{ ...documentFixture, document_name: 'CAC "Original", renewed\n2026' }],
      new Map([["company-1", "Bosah Innovations Ltd"]]),
    );

    expect(csv).toContain('"CAC ""Original"", renewed\n2026"');
  });

  test("neutralizes spreadsheet formula injection", () => {
    const csv = buildVaultRegisterCsv(
      [{ ...documentFixture, document_name: "=HYPERLINK(\"https://bad.example\")" }],
      new Map([["company-1", "Bosah Innovations Ltd"]]),
    );

    expect(csv).toContain('"'=HYPERLINK(""https://bad.example"")"');
  });

  test("does not expose storage paths or signed URLs", () => {
    const csv = buildVaultRegisterCsv(
      [documentFixture],
      new Map([["company-1", "Bosah Innovations Ltd"]]),
    );

    expect(csv).not.toContain("storage_path");
    expect(csv).not.toContain("signedUrl");
    expect(csv).not.toContain("company-documents/");
  });

  test("uses a safe fallback when a company name is unavailable", () => {
    const csv = buildVaultRegisterCsv([documentFixture], new Map());

    expect(csv).toContain('"Unknown company"');
  });
});
