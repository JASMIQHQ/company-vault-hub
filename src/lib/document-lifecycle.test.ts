import { describe, expect, test } from "bun:test";
import { isCurrentEvidenceStatus } from "./document-lifecycle";

describe("isCurrentEvidenceStatus", () => {
  test("accepts active evidence only", () => {
    expect(isCurrentEvidenceStatus("active")).toBe(true);
  });

  test("excludes superseded, archived, expired, and null lifecycle statuses", () => {
    expect(isCurrentEvidenceStatus("superseded")).toBe(false);
    expect(isCurrentEvidenceStatus("archived")).toBe(false);
    expect(isCurrentEvidenceStatus("expired")).toBe(false);
    expect(isCurrentEvidenceStatus(null)).toBe(false);
  });
});
