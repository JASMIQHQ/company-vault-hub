import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  TENDER_BUCKET,
  buildTenderStoragePath,
  type TenderListItem,
} from "@/lib/tenders";
import { sha256Hex } from "@/lib/vault";

export function useTenders(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["tenders", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<TenderListItem[]> => {
      const { data, error } = await supabase
        .from("tenders")
        .select("id, title, created_at, tender_files(storage_path, created_at)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((tender) => ({
        id: tender.id,
        title: tender.title,
        created_at: tender.created_at,
        storage_path: tender.tender_files?.[0]?.storage_path ?? null,
      }));
    },
  });
}

export interface UploadTenderInput {
  file: File;
  title: string;
  organizationId: string;
}

export function useUploadTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, organizationId }: UploadTenderInput) => {
      const hash = await sha256Hex(file);
      const storagePath = buildTenderStoragePath(organizationId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(TENDER_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: tender, error: tenderError } = await supabase
        .from("tenders")
        .insert({ organization_id: organizationId, title })
        .select("id")
        .single();

      if (tenderError || !tender) {
        await supabase.storage.from(TENDER_BUCKET).remove([storagePath]);
        throw tenderError ?? new Error("Could not create the tender.");
      }

      const { error: fileError } = await supabase.from("tender_files").insert({
        tender_id: tender.id,
        organization_id: organizationId,
        file_name: file.name,
        file_type: "tender_document",
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        sha256_hash: hash,
      });

      if (fileError) {
        await supabase.storage.from(TENDER_BUCKET).remove([storagePath]);
        await supabase.from("tenders").delete().eq("id", tender.id);
        throw fileError;
      }

      return tender.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
  });
}

export async function createTenderSignedUrl(storagePath: string, download = false) {
  const { data, error } = await supabase.storage
    .from(TENDER_BUCKET)
    .createSignedUrl(storagePath, 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
