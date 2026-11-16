import { describe, expect, test } from "bun:test";

import { isCurrentEvidenceStatus, isReadinessEvidenceStatus } from "./document-lifecycle";

describe("document lifecycle readiness eligibility", () => {
  test("only active records are current evidence", () => {
    expect(isCurrentEvidenceStatus("active")).toBe(true);
    expect(isCurrentEvidenceStatus("expired")).toBe(false);
    expect(isCurrentEvidenceStatus("superseded")).toBe(false);
    expect(isCurrentEvidenceStatus("archived")).toBe(false);
    expect(isCurrentEvidenceStatus(null)).toBe(false);
  });

  test("expired records remain visible as gaps, but superseded and archived records are excluded", () => {
    expect(isReadinessEvidenceStatus("active")).toBe(true);
    expect(isReadinessEvidenceStatus("expired")).toBe(true);
    expect(isReadinessEvidenceStatus("superseded")).toBe(false);
    expect(isReadinessEvidenceStatus("archived")).toBe(false);
    expect(isReadinessEvidenceStatus(null)).toBe(false);
  });
});
