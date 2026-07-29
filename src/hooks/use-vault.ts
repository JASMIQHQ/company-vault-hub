import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BUCKET,
  buildStoragePath,
  sha256Hex,
  type CompanyDocument,
} from "@/lib/vault";

export function useOrganizationId() {
  return useQuery({
    queryKey: ["organization-id"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_organization_id");
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

export function useDocuments(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["company-documents", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<CompanyDocument[]> => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface UploadInput {
  file: File;
  documentName: string;
  documentType: string;
  category: string;
  organizationId: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      documentName,
      documentType,
      category,
      organizationId,
    }: UploadInput) => {
      const hash = await sha256Hex(file);
      const storagePath = buildStoragePath(organizationId, category, file.name);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.rpc("register_document_upload", {
        p_category: category,
        p_document_type: documentType,
        p_document_name: documentName,
        p_original_filename: file.name,
        p_storage_path: storagePath,
        p_mime_type: file.type,
        p_file_size: file.size,
        p_sha256_hash: hash,
      });

      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }

      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
    },
  });
}

export async function createSignedUrl(storagePath: string, download = false) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
