import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { isPreviewDeployment } from "./src/integrations/supabase/deployment-mode";

const previewBuild = isPreviewDeployment({
  vercelEnv: process.env["VERCEL_ENV"],
  netlifyContext: process.env["CONTEXT"],
});

export default defineConfig({
  vite: previewBuild
    ? {
        define: {
          "import.meta.env.VITE_SUPABASE_STAGING_REQUIRED": '"true"',
        },
      }
    : {},
  tanstackStart: {
    server: { entry: "server" },
  },
});
