import { describe, expect, test } from "bun:test";
import { resolveSupabaseConfig } from "./resolve-config";

describe("resolveSupabaseConfig", () => {
  test("staging-required mode uses only dedicated staging credentials", () => {
    expect(
      resolveSupabaseConfig({
        stagingRequired: "true",
        stagingUrl: "https://staging-project.supabase.co",
        stagingPublishableKey: "sb_publishable_staging",
        url: "https://production-project.supabase.co",
        anonKey: "production-anon-key",
        serverUrl: "https://server-production-project.supabase.co",
        serverAnonKey: "server-production-anon-key",
      }),
    ).toEqual({
      url: "https://staging-project.supabase.co",
      publishableKey: "sb_publishable_staging",
    });
  });

  test("staging-required mode throws rather than falling back when staging URL is missing", () => {
    expect(() =>
      resolveSupabaseConfig({
        stagingRequired: "true",
        stagingPublishableKey: "sb_publishable_staging",
        url: "https://production-project.supabase.co",
        anonKey: "production-anon-key",
      }),
    ).toThrow("Refusing to connect to any fallback project");
  });

  test("staging-required mode throws rather than falling back when staging key is missing", () => {
    expect(() =>
      resolveSupabaseConfig({
        stagingRequired: "true",
        stagingUrl: "https://staging-project.supabase.co",
        url: "https://production-project.supabase.co",
        anonKey: "production-anon-key",
      }),
    ).toThrow("Refusing to connect to any fallback project");
  });

  test("normal mode preserves the existing generic environment fallback", () => {
    expect(
      resolveSupabaseConfig({
        url: "https://production-project.supabase.co",
        anonKey: "production-anon-key",
      }),
    ).toEqual({
      url: "https://production-project.supabase.co",
      publishableKey: "production-anon-key",
    });
  });
});
