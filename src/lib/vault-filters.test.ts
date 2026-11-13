import { describe, expect, test } from "bun:test";
import { matchesVaultDocumentFilter, isVaultDocumentFilter } from "./vault-filters";

const asOf = new Date(2026, 10, 13, 12);
const base = {
  document_status: "active" as const,
  expiry_date: "2027-06-30",
  analysis_status: "analyzed" as const,
};

describe("matchesVaultDocumentFilter", () => {
  test("includes all documents in the all filter", () => {
    expect(matchesVaultDocumentFilter(base, "all", asOf)).toBe(true);
  });

  test("includes active, non-expired documents", () => {
    expect(matchesVaultDocumentFilter(base, "active", asOf)).toBe(true);
  });

  test("excludes expired documents from active filter even when stored status is stale", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, expiry_date: "2026-11-12" },
        "active",
        asOf,
      ),
    ).toBe(false);
  });

  test("recognizes expired documents from the date even when stored status is active", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, expiry_date: "2026-11-12" },
        "expired",
        asOf,
      ),
    ).toBe(true);
  });

  test("recognizes stored expired status", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, document_status: "expired" },
        "expired",
        asOf,
      ),
    ).toBe(true);
  });

  test("identifies documents expiring within 30 days", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, expiry_date: "2026-12-01" },
        "expiring_soon",
        asOf,
      ),
    ).toBe(true);
  });

  test("identifies documents without an expiry date", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, expiry_date: null },
        "no_expiry",
        asOf,
      ),
    ).toBe(true);
  });

  test("filters verified analysis status", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, analysis_status: "verified" },
        "verified",
        asOf,
      ),
    ).toBe(true);
  });

  test("filters human review status", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, analysis_status: "requires_review" },
        "needs_review",
        asOf,
      ),
    ).toBe(true);
  });

  test("filters pending and processing analysis states", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, analysis_status: "pending" },
        "processing",
        asOf,
      ),
    ).toBe(true);
    expect(
      matchesVaultDocumentFilter(
        { ...base, analysis_status: "processing" },
        "processing",
        asOf,
      ),
    ).toBe(true);
  });

  test("filters failed analysis status", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, analysis_status: "failed" },
        "failed",
        asOf,
      ),
    ).toBe(true);
  });

  test("filters superseded and archived lifecycle states", () => {
    expect(
      matchesVaultDocumentFilter(
        { ...base, document_status: "superseded" },
        "superseded",
        asOf,
      ),
    ).toBe(true);
    expect(
      matchesVaultDocumentFilter(
        { ...base, document_status: "archived" },
        "archived",
        asOf,
      ),
    ).toBe(true);
  });
});

describe("isVaultDocumentFilter", () => {
  test("accepts known filter values", () => {
    expect(isVaultDocumentFilter("expiring_soon")).toBe(true);
  });

  test("rejects unknown query parameter values", () => {
    expect(isVaultDocumentFilter("admin")).toBe(false);
    expect(isVaultDocumentFilter(null)).toBe(false);
  });
});
