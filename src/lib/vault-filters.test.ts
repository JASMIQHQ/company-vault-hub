import { describe, expect, test } from "bun:test";
import {
  isVaultDocumentFilter,
  matchesVaultDocumentFilter,
  type VaultDocumentFilter,
} from "./vault-filters";

const asOf = new Date(2026, 10, 13, 12);
type FilterableDocument = Parameters<typeof matchesVaultDocumentFilter>[0];
const matches = (document: FilterableDocument, filter: VaultDocumentFilter) =>
  matchesVaultDocumentFilter(document, filter, asOf);

const base = {
  document_status: "active" as const,
  expiry_date: "2027-06-30",
  analysis_status: "analyzed" as const,
};

describe("matchesVaultDocumentFilter", () => {
  test("includes all documents in the all filter", () => {
    expect(matches(base, "all")).toBe(true);
  });

  test("includes active, non-expired documents", () => {
    expect(matches(base, "active")).toBe(true);
  });

  test("excludes expired documents from active even when stored status is stale", () => {
    expect(matches({ ...base, expiry_date: "2026-11-12" }, "active")).toBe(false);
  });

  test("recognizes expired documents from their expiry date", () => {
    expect(matches({ ...base, expiry_date: "2026-11-12" }, "expired")).toBe(true);
  });

  test("recognizes the stored expired lifecycle status", () => {
    expect(matches({ ...base, document_status: "expired" }, "expired")).toBe(true);
  });

  test("identifies documents expiring within 30 days", () => {
    expect(matches({ ...base, expiry_date: "2026-12-01" }, "expiring_soon")).toBe(true);
  });

  test("identifies documents without an expiry date", () => {
    expect(matches({ ...base, expiry_date: null }, "no_expiry")).toBe(true);
  });

  test("filters verified analysis status", () => {
    expect(matches({ ...base, analysis_status: "verified" }, "verified")).toBe(true);
  });

  test("filters human review status", () => {
    expect(matches({ ...base, analysis_status: "requires_review" }, "needs_review")).toBe(true);
  });

  test("filters pending and processing analysis states", () => {
    expect(matches({ ...base, analysis_status: "pending" }, "processing")).toBe(true);
    expect(matches({ ...base, analysis_status: "processing" }, "processing")).toBe(true);
  });

  test("filters failed analysis status", () => {
    expect(matches({ ...base, analysis_status: "failed" }, "failed")).toBe(true);
  });

  test("filters superseded and archived lifecycle states", () => {
    expect(matches({ ...base, document_status: "superseded" }, "superseded")).toBe(true);
    expect(matches({ ...base, document_status: "archived" }, "archived")).toBe(true);
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
