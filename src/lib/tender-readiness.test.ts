import { describe, expect, test } from "bun:test";
import {
  deriveTenderReadiness,
  type TenderReadiness,
} from "./tender-readiness";

interface TestCase {
  name: string;
  statuses: Array<string | null | undefined>;
  expected: TenderReadiness;
}

const cases: TestCase[] = [
  {
    name: "all matched",
    statuses: ["matched", "matched", "matched"],
    expected: "READY",
  },
  {
    name: "manual review only",
    statuses: ["manual_review", "manual_review"],
    expected: "REVIEW_REQUIRED",
  },
  {
    name: "missing requirement",
    statuses: ["matched", "missing", "matched"],
    expected: "NOT_READY",
  },
  {
    name: "expired requirement",
    statuses: ["matched", "expired", "matched"],
    expected: "NOT_READY",
  },
  {
    name: "manual review plus missing",
    statuses: ["manual_review", "missing", "matched"],
    expected: "NOT_READY",
  },
  {
    name: "manual review plus expired",
    statuses: ["manual_review", "expired", "matched"],
    expected: "NOT_READY",
  },
  {
    name: "empty requirement set",
    statuses: [],
    expected: "NOT_READY",
  },
  {
    name: "null status",
    statuses: ["matched", null, "matched"],
    expected: "NOT_READY",
  },
  {
    name: "unknown status",
    statuses: ["matched", "unexpected_state", "matched"],
    expected: "NOT_READY",
  },
  {
    name: "undefined status",
    statuses: ["matched", undefined, "matched"],
    expected: "NOT_READY",
  },
];

describe("deriveTenderReadiness", () => {
  for (const testCase of cases) {
    test(testCase.name, () => {
      const requirements = testCase.statuses.map((status) => ({ status }));
      expect(deriveTenderReadiness(requirements)).toBe(testCase.expected);
    });
  }
});
