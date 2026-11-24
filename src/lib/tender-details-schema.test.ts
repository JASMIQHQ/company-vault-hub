import { describe, expect, test } from "bun:test";
import { TenderDetailsPatchSchema, TenderDetailsSchema } from "./tender-details-schema";

const validDetails = {
  title: "Supply of ICT equipment",
  procuring_entity: "Agency",
  reference_number: null,
  procurement_method: "Open",
  tender_type: "Goods",
  industry: "ICT",
  submission_deadline: "2026-12-10T12:00:00.000Z",
  opening_date: "2026-12-11T12:00:00.000Z",
  requires_bid_security: true,
  requires_bank_reference: false,
  requires_affidavit: false,
};

describe("TenderDetailsSchema", () => {
  test("accepts a valid tender details payload", () => {
    expect(TenderDetailsSchema.safeParse(validDetails).success).toBe(true);
  });

  test("rejects an opening date earlier than the submission deadline", () => {
    const result = TenderDetailsSchema.safeParse({
      ...validDetails,
      opening_date: "2026-12-09T12:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "opening_date")).toBe(true);
    }
  });

  test("allows clearing a nullable deadline", () => {
    expect(
      TenderDetailsSchema.safeParse({ ...validDetails, submission_deadline: null }).success,
    ).toBe(true);
  });

  test("accepts a patch that explicitly clears a deadline", () => {
    expect(TenderDetailsPatchSchema.safeParse({ submission_deadline: null }).success).toBe(true);
  });

  test("rejects unsupported patch field types", () => {
    expect(TenderDetailsPatchSchema.safeParse({ requires_affidavit: "yes" }).success).toBe(false);
  });

  test("rejects a blank title", () => {
    expect(TenderDetailsSchema.safeParse({ ...validDetails, title: "  " }).success).toBe(false);
  });
});
