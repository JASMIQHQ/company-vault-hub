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
  const url = stagingRequired
    ? env.stagingUrl
    : env.stagingUrl || env.url || env.serverUrl;
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
        ? [
            stagingRequired
              ? "VITE_SUPABASE_STAGING_PUBLISHABLE_KEY"
              : "SUPABASE_PUBLISHABLE_KEY",
          ]
        : []),
    ];
    const message = stagingRequired
      ? `Staging isolation is enabled but required variable(s) are missing: ${missing.join(", ")}. Refusing to connect to any fallback project.`
      : `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
    throw new Error(message);
  }

  return { url, publishableKey };
}
