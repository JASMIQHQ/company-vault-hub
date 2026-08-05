import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  BUCKET,
  buildStoragePath,
  sha256Hex,
  type CompanyDocument,
} from "@/lib/vault";

/**
 * Tracks the Supabase session client-side so queries only run once a session
 * (and therefore a valid JWT for RLS) actually exists.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}

export function useOrganizationId(session: Session | null) {
  return useQuery({
    queryKey: ["organization-id", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_organization_id");
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

export function useDocuments(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["company-documents", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<CompanyDocument[]> => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("organization_id", organizationId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Soft-deleted documents (the Bin). */
export function useDeletedDocuments(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["company-documents-deleted", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<CompanyDocument[]> => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("organization_id", organizationId!)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDocumentMutation<TInput>(mutationFn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      queryClient.invalidateQueries({ queryKey: ["company-documents-deleted"] });
    },
  });
}

/** Renames a document only — file, storage_path and metadata are untouched. */
export function useRenameDocument() {
  return useDocumentMutation<{ id: string; documentName: string }>(async ({ id, documentName }) => {
    const name = documentName.trim();
    if (!name) throw new Error("Document name cannot be empty.");
    const { error } = await supabase
      .from("company_documents")
      .update({ document_name: name })
      .eq("id", id);
    if (error) throw error;
  });
}

/** Moves a document to the Bin (recoverable). */
export function useSoftDeleteDocument() {
  return useDocumentMutation<{ id: string }>(async ({ id }) => {
    const { error } = await supabase
      .from("company_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

/** Restores a document from the Bin. */
export function useRestoreDocument() {
  return useDocumentMutation<{ id: string }>(async ({ id }) => {
    const { error } = await supabase
      .from("company_documents")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) throw error;
  });
}

/**
 * Permanent deletion: removes the storage object using the same bucket helper
 * the upload flow already uses, then deletes the row.
 */
export function usePermanentDeleteDocument() {
  return useDocumentMutation<{ id: string; storagePath: string }>(
    async ({ id, storagePath }) => {
      const { error } = await supabase.from("company_documents").delete().eq("id", id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([storagePath]);
    },
  );
}



export interface UploadInput {
  file: File;
  documentName: string;
  documentType: string;
  category: string;
  organizationId: string;
  companyId: string;
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
      companyId,
    }: UploadInput) => {
      const hash = await sha256Hex(file);
      const storagePath = buildStoragePath(organizationId, category, file.name);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      // register_document_upload() does not accept company_id (and company_id is
      // NOT NULL), so the row is created through the existing authenticated
      // client with the same columns the RPC writes, plus the selected company.
      const { data: profileId } = await supabase.rpc("current_profile_id");

      const { data, error } = await supabase
        .from("company_documents")
        .insert({
          organization_id: organizationId,
          company_id: companyId,
          uploaded_by: (profileId as string | null) ?? null,
          category,
          document_type: documentType,
          document_name: documentName,
          original_filename: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          sha256_hash: hash,
          analysis_status: "pending",
          document_status: "active",
          version: 1,
        })
        .select("id")
        .single();

      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }

      return data.id as string;
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
