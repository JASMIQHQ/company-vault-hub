import type { Database } from "@/integrations/supabase/types";

export type DocumentLifecycleStatus = Database["public"]["Enums"]["document_status"] | null;

/** Only active evidence may contribute to company readiness. */
export function isCurrentEvidenceStatus(status: DocumentLifecycleStatus): boolean {
  return status === "active";
}
