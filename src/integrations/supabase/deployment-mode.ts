export interface DeploymentEnvironment {
  vercelEnv?: string;
  netlifyContext?: string;
}

/**
 * Preview deployments must never inherit generic production Supabase credentials.
 * Vercel and Netlify expose their deployment context to the build process.
 */
export function isPreviewDeployment(env: DeploymentEnvironment): boolean {
  return env.vercelEnv === "preview" || env.netlifyContext === "deploy-preview";
}
