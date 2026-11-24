import { describe, expect, test } from "bun:test";
import { summarizeVaultHealth } from "./vault-health";

const asOf = new Date(2026, 10, 13, 12);
const base = {
  document_status: "active" as const,
  expiry_date: "2027-06-30",
  analysis_status: "analyzed" as const,
};

describe("summarizeVaultHealth", () => {
  test("counts active evidence expiring within 30 days", () => {
    const result = summarizeVaultHealth(
      [
        { ...base, expiry_date: "2026-12-01" },
        { ...base, expiry_date: "2027-06-30" },
      ],
      asOf,
    );
    expect(result.expiringSoon).toBe(1);
  });

  test("counts expired lifecycle and date-expired active evidence once each", () => {
    const result = summarizeVaultHealth(
      [
        { ...base, document_status: "expired", expiry_date: "2027-06-30" },
        { ...base, expiry_date: "2026-11-12" },
      ],
      asOf,
    );
    expect(result.expired).toBe(2);
  });

  test("counts human review and failed analysis independently", () => {
    const result = summarizeVaultHealth(
      [
        { ...base, analysis_status: "requires_review" },
        { ...base, analysis_status: "failed" },
      ],
      asOf,
    );
    expect(result.needsReview).toBe(1);
    expect(result.failed).toBe(1);
  });

  test("does not count superseded or archived records in health totals", () => {
    const result = summarizeVaultHealth(
      [
        {
          ...base,
          document_status: "superseded",
          expiry_date: "2026-12-01",
          analysis_status: "requires_review",
        },
        {
          ...base,
          document_status: "archived",
          expiry_date: "2026-11-12",
          analysis_status: "failed",
        },
      ],
      asOf,
    );
    expect(result).toEqual({ expiringSoon: 0, expired: 0, needsReview: 0, failed: 0 });
  });

  test("returns zero counts for an empty vault", () => {
    expect(summarizeVaultHealth([], asOf)).toEqual({
      expiringSoon: 0,
      expired: 0,
      needsReview: 0,
      failed: 0,
    });
  });
});
