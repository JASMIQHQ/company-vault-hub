import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, buildStoragePath, sha256Hex, type CompanyDocument } from "@/lib/vault";

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

export function useDashboardDocuments(session: Session | null, organizationId: string | null | undefined) {
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

export function useDeletedDocuments(session: Session | null, organizationId: string | null | undefined) {
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
    const { error } = await supabase.from("company_documents").update({ document_name: name }).eq("id", id);
    if (error) throw error;
  });
}

export function useUpdateDocumentValidity() {
  return useDocumentMutation<{ id: string; expiryDate: string | null }>(async ({ id, expiryDate }) => {
    const { error } = await supabase.from("company_documents").update({ expiry_date: expiryDate }).eq("id", id);
    if (error) throw error;
  });
}

export function useSoftDeleteDocument() {
  return useDocumentMutation<{ id: string }>(async ({ id }) => {
    const { error } = await supabase.from("company_documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
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
      const { data, error } = await supabase
        .from("company_documents")
        .delete()
        .eq("id", id)
        .not("deleted_at", "is", null)
        .select("storage_path")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Only documents already in the Bin can be permanently deleted.");

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([data.storage_path]);

      if (storageError) {
        return { storageDeleted: false, cleanupError: storageError.message };
      }
      return { storageDeleted: true };
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
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, documentName, documentType, category, organizationId, companyId, expiryDate }: UploadInput) => {
      const hash = await sha256Hex(file);
      const storagePath = buildStoragePath(organizationId, category, file.name);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: profileId } = await supabase.rpc("current_profile_id");
      const { data, error } = await supabase.from("company_documents").insert({
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
        expiry_date: expiryDate,
        analysis_status: "pending",
        document_status: "active",
        version: 1,
      }).select("id").single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-documents"] }),
  });
}

export async function createSignedUrl(storagePath: string, download = false) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
