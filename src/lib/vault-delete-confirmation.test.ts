import { describe, expect, test } from "bun:test";
import { canPermanentlyDeleteDocument } from "./vault-delete-confirmation";

describe("canPermanentlyDeleteDocument", () => {
  test("accepts the exact document name", () => {
    expect(canPermanentlyDeleteDocument("CAC Certificate.pdf", "CAC Certificate.pdf")).toBe(true);
  });

  test("ignores accidental surrounding whitespace", () => {
    expect(canPermanentlyDeleteDocument("CAC Certificate.pdf", "  CAC Certificate.pdf  ")).toBe(
      true,
    );
  });

  test("rejects partial, different-case, and empty confirmations", () => {
    expect(canPermanentlyDeleteDocument("CAC Certificate.pdf", "CAC Certificate")).toBe(false);
    expect(canPermanentlyDeleteDocument("CAC Certificate.pdf", "cac certificate.pdf")).toBe(false);
    expect(canPermanentlyDeleteDocument("   ", "   ")).toBe(false);
  });
});
