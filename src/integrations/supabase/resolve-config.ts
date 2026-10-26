export interface SupabaseEnvironment {
  stagingRequired?: string;
  stagingUrl?: string;
  stagingPublishableKey?: string;
  url?: string;
  publishableKey?: string;
  anonKey?: string;
  serverUrl?: string;
  serverPublishableKey?: string;
  serverAnonKey?: string;
}

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export function resolveSupabaseConfig(env: SupabaseEnvironment): SupabaseConfig {
  const stagingRequired = env.stagingRequired === "true";
  const url = stagingRequired ? env.stagingUrl : env.stagingUrl || env.url || env.serverUrl;
  const publishableKey = stagingRequired
    ? env.stagingPublishableKey
    : env.stagingPublishableKey ||
      env.publishableKey ||
      env.anonKey ||
      env.serverPublishableKey ||
      env.serverAnonKey;

  if (!url || !publishableKey) {
    const missing = [
      ...(!url ? [stagingRequired ? "VITE_SUPABASE_STAGING_URL" : "SUPABASE_URL"] : []),
      ...(!publishableKey
        ? [stagingRequired ? "VITE_SUPABASE_STAGING_PUBLISHABLE_KEY" : "SUPABASE_PUBLISHABLE_KEY"]
        : []),
    ];
    const message = stagingRequired
      ? `Staging isolation is enabled but required variable(s) are missing: ${missing.join(", ")}. Refusing to connect to any fallback project.`
      : `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
    throw new Error(message);
  }

  // This resolver is used by the browser client. Supabase secret keys must
  // never be shipped to or accepted by frontend code; use a publishable key
  // (or a legacy public anon key) here instead.
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error(
      "A Supabase secret key cannot be used by the browser client. Configure a publishable key or legacy public anon key.",
    );
  }

  return { url, publishableKey };
}
