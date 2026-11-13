import { describe, expect, test } from "bun:test";
import { findCompanyDuplicate, type DuplicateCandidate } from "./vault-duplicates";

const hash = "a".repeat(64);
const existing: DuplicateCandidate = {
  company_id: "company-1",
  sha256_hash: hash,
  deleted_at: null,
  document_status: "active",
  document_name: "CAC Certificate",
};

describe("findCompanyDuplicate", () => {
  test("finds an identical active document within the same company", () => {
    expect(findCompanyDuplicate([existing], "company-1", hash)?.document_name).toBe(
      "CAC Certificate",
    );
  });

  test("does not report a document belonging to another company", () => {
    expect(findCompanyDuplicate([existing], "company-2", hash)).toBeNull();
  });

  test("does not report documents already in the Bin", () => {
    expect(
      findCompanyDuplicate(
        [{ ...existing, deleted_at: "2026-11-12T10:00:00.000Z" }],
        "company-1",
        hash,
      ),
    ).toBeNull();
  });

  test("ignores superseded and archived versions", () => {
    expect(
      findCompanyDuplicate(
        [{ ...existing, document_status: "superseded" }],
        "company-1",
        hash,
      ),
    ).toBeNull();
    expect(
      findCompanyDuplicate(
        [{ ...existing, document_status: "archived" }],
        "company-1",
        hash,
      ),
    ).toBeNull();
  });

  test("compares hashes without case sensitivity", () => {
    expect(
      findCompanyDuplicate(
        [{ ...existing, sha256_hash: hash.toUpperCase() }],
        "company-1",
        hash,
      ),
    ).not.toBeNull();
  });

  test("rejects malformed hashes", () => {
    expect(findCompanyDuplicate([existing], "company-1", "not-a-hash")).toBeNull();
  });
});
