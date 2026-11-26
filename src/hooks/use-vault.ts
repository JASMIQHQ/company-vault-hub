import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  BUCKET,
  buildStoragePath,
  getFileMimeType,
  sha256Hex,
  validateFile,
  type CompanyDocument,
} from "@/lib/vault";

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

export function useDocuments(session: Session | null, organizationId: string | null | undefined) {
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

export function useDashboardDocuments(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["company-documents", "dashboard", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("id, document_name, document_status, expiry_date")
        .eq("organization_id", organizationId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

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

export function useUpdateDocumentValidity() {
  return useDocumentMutation<{ id: string; expiryDate: string | null }>(
    async ({ id, expiryDate }) => {
      const { error } = await supabase
        .from("company_documents")
        .update({ expiry_date: expiryDate })
        .eq("id", id);
      if (error) throw error;
    },
  );
}

export function useSoftDeleteDocument() {
  return useDocumentMutation<{ id: string }>(async ({ id }) => {
    const { error } = await supabase
      .from("company_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

export function useRestoreDocument() {
  return useDocumentMutation<{ id: string }>(async ({ id }) => {
    const { data, error } = await supabase
      .from("company_documents")
      .update({ deleted_at: null })
      .eq("id", id)
      .not("deleted_at", "is", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This document is no longer in the Bin.");
  });
}

export interface PermanentDeleteResult {
  storageDeleted: boolean;
  cleanupError?: string;
}

/**
 * Permanently remove only soft-deleted rows. The storage path is read from the
 * deleted row rather than accepted from the browser, and storage cleanup
 * failures are returned explicitly because the database delete has completed.
 */
export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<PermanentDeleteResult> => {
      const { data, error } = await supabase.functions.invoke("document-access", {
        body: { document_id: id, mode: "delete" },
      });
      if (error) throw error;
      if (!data?.deleted)
        throw new Error("Only documents already in the Bin can be permanently deleted.");
      return {
        storageDeleted: data.storage_deleted === true,
        cleanupError: typeof data.cleanup_error === "string" ? data.cleanup_error : undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      queryClient.invalidateQueries({ queryKey: ["company-documents-deleted"] });
    },
  });
}

export interface UploadInput {
  file: File;
  documentName: string;
  documentType: string;
  category: string;
  organizationId: string;
  companyId: string;
  expiryDate: string | null;
  sha256Hash?: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      documentName,
      documentType,
      category,
      companyId,
      expiryDate,
      sha256Hash,
    }: UploadInput) => {
      const validationError = validateFile(file);
      if (validationError) throw new Error(validationError);
      const hash = sha256Hash ?? (await sha256Hex(file));
      const mimeType = getFileMimeType(file);
      const storagePath = buildStoragePath(companyId, category, file.name);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.rpc("register_document_upload", {
        p_company_id: companyId,
        p_category: category,
        p_document_type: documentType,
        p_document_name: documentName,
        p_original_filename: file.name,
        p_storage_path: storagePath,
        p_mime_type: mimeType,
        p_file_size: file.size,
        p_sha256_hash: hash,
        p_expiry_date: expiryDate,
      });

      if (error) {
        const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath]);
        if (cleanupError) {
          console.error("Upload rollback cleanup failed", cleanupError);
        }
        if (error.code === "23505") {
          throw new Error("A document with the same content already exists in this company.");
        }
        throw error;
      }

      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-documents"] }),
  });
}

export async function createSignedUrl(documentId: string, download = false) {
  const { data, error } = await supabase.functions.invoke("document-access", {
    body: { document_id: documentId, mode: download ? "download" : "preview" },
  });
  if (error) throw error;
  if (typeof data?.signed_url !== "string") {
    throw new Error("The document access service did not return a signed URL.");
  }
  return data.signed_url;
}
