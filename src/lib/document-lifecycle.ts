import type { Database } from "@/integrations/supabase/types";

export type DocumentLifecycleStatus = Database["public"]["Enums"]["document_status"] | null;

/** Only active evidence is current; expired evidence remains visible as an expired gap. */
export function isCurrentEvidenceStatus(status: DocumentLifecycleStatus): boolean {
  return status === "active";
}

/** Active and explicitly expired records may be assessed; superseded/archived records may not. */
export function isReadinessEvidenceStatus(status: DocumentLifecycleStatus): boolean {
  return status === "active" || status === "expired";
}
