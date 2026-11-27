import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  BUCKET,
  buildStoragePath,
  getFileMimeType,
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
    mutationFn: async ({file,documentName,documentType,category,companyId,expiryDate}: UploadInput) => {
      const invalid=validateFile(file);if(invalid)throw new Error(invalid);
      const mimeType=getFileMimeType(file),storagePath=buildStoragePath(companyId,category,file.name);
      const {data:prepared,error:prepareError}=await supabase.functions.invoke("document-access",{
        body:{mode:"prepare_upload",company_id:companyId,storage_path:storagePath},
      });
      if(prepareError)throw prepareError;
      if(typeof prepared?.intent_id!=="string")throw new Error("The upload service did not create a cleanup intent.");
      const intentId=prepared.intent_id as string;
      const {error:uploadError}=await supabase.storage.from(BUCKET).upload(storagePath,file,{contentType:mimeType,upsert:false});
      if(uploadError){
        const {error:cleanupError}=await supabase.functions.invoke("document-access",{body:{mode:"cleanup_upload",intent_id:intentId}});
        if(cleanupError)console.error("Upload cleanup remains queued for retry",cleanupError);
        throw uploadError;
      }
      const {data,error}=await supabase.functions.invoke("document-access",{
        body:{mode:"register_upload",intent_id:intentId,company_id:companyId,storage_path:storagePath,
          category,document_type:documentType,document_name:documentName,original_filename:file.name,expiry_date:expiryDate},
      });
      if(error)throw error;
      if(typeof data?.document_id!=="string")throw new Error("The upload service did not confirm document registration.");
      return data.document_id as string;
    },
    onSuccess:()=>queryClient.invalidateQueries({queryKey:["company-documents"]}),
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
