import { describe, expect, test } from "bun:test";

import { deriveCompanyReadiness } from "./company-readiness";

const required = [
  { type: "CAC" },
  { type: "TCC" },
  { type: "PENCOM" },
];

const allPresent = [
  { id: "cac-2026", document_type: "CAC", expiry_date: "2027-01-01" },
  { id: "tcc-2026", document_type: "TCC", expiry_date: "2027-01-01" },
  { id: "pencom-2026", document_type: "PENCOM", expiry_date: "2027-01-01" },
];

describe("deriveCompanyReadiness", () => {
  test("returns 100 when all required evidence is present", () => {
    expect(
      deriveCompanyReadiness({
        required,
        documents: allPresent,
        asOf: "2026-09-11",
      }),
    ).toEqual({
      present: ["CAC", "TCC", "PENCOM"],
      missing: [],
      expired: [],
      score: 100,
      total: 3,
    });
  });

  test("marks a missing requirement and scores 67 for two of three present", () => {
    expect(
      deriveCompanyReadiness({
        required,
        documents: allPresent.filter((document) => document.document_type !== "TCC"),
        asOf: "2026-09-11",
      }),
    ).toEqual({
      present: ["CAC", "PENCOM"],
      missing: ["TCC"],
      expired: [],
      score: 67,
      total: 3,
    });
  });

  test("counts expired evidence as not present", () => {
    expect(
      deriveCompanyReadiness({
        required,
        documents: allPresent.map((document) =>
          document.document_type === "TCC"
            ? { ...document, expiry_date: "2026-09-10" }
            : document,
        ),
        asOf: "2026-09-11",
      }),
    ).toEqual({
      present: ["CAC", "PENCOM"],
      missing: [],
      expired: ["TCC"],
      score: 67,
      total: 3,
    });
  });

  test("treats evidence expiring on or after the as-of date as present", () => {
    expect(
      deriveCompanyReadiness({
        required,
        documents: allPresent.map((document) =>
          document.document_type === "TCC"
            ? { ...document, expiry_date: "2026-09-11" }
            : document,
        ),
        asOf: "2026-09-11",
      }),
    ).toEqual({
      present: ["CAC", "TCC", "PENCOM"],
      missing: [],
      expired: [],
      score: 100,
      total: 3,
    });
  });

  test("returns zero for an empty required set", () => {
    expect(
      deriveCompanyReadiness({
        required: [],
        documents: allPresent,
        asOf: "2026-09-11",
      }),
    ).toEqual({
      present: [],
      missing: [],
      expired: [],
      score: 0,
      total: 0,
    });
  });
});
