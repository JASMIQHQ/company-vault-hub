const buildEnv = import.meta.env as ImportMetaEnv & { VERCEL_ENV?: string };

export const featureFlags = {
  tenderDetailsEditor: import.meta.env.DEV || buildEnv.VERCEL_ENV === "preview",
} as const;
