import { describe, expect, test } from "bun:test";
import { isPreviewDeployment } from "./deployment-mode";
import { resolveSupabaseConfig } from "./resolve-config";

describe("preview deployment isolation", () => {
  test("forces staging mode for Vercel Preview deployments", () => {
    expect(isPreviewDeployment({ vercelEnv: "preview" })).toBe(true);
  });

  test("forces staging mode for Netlify Deploy Previews", () => {
    expect(isPreviewDeployment({ netlifyContext: "deploy-preview" })).toBe(true);
  });

  test("does not classify Vercel production as a preview", () => {
    expect(isPreviewDeployment({ vercelEnv: "production" })).toBe(false);
  });

  test("does not classify Netlify production as a preview", () => {
    expect(isPreviewDeployment({ netlifyContext: "production" })).toBe(false);
  });
});

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
