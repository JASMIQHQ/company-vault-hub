import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  TENDER_BUCKET,
  buildTenderStoragePath,
  type TenderListItem,
  type TenderRequirementItem,
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
        .select(
          "id, title, created_at, analysis_status, analysis_error, procuring_entity, submission_deadline, compliance_percentage, requires_bid_security, requires_bank_reference, requires_affidavit, tender_files(storage_path, created_at)",
        )
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []).map((tender) => ({
        id: tender.id,
        title: tender.title,
        created_at: tender.created_at,
        analysis_status: tender.analysis_status,
        analysis_error: tender.analysis_error,
        procuring_entity: tender.procuring_entity,
        submission_deadline: tender.submission_deadline,
        compliance_percentage: tender.compliance_percentage,
        requires_bid_security: tender.requires_bid_security,
        requires_bank_reference: tender.requires_bank_reference,
        requires_affidavit: tender.requires_affidavit,
        storage_path: tender.tender_files?.[0]?.storage_path ?? null,
      }));
    },
  });
}

/**
 * Requirement statuses across the whole organization — powers the Command Center
 * missions without duplicating per-tender queries.
 */
export function useOrganizationRequirements(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["tender_requirements", "organization", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_requirements")
        .select("tender_id, status")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        tender_id: row.tender_id,
        status: row.status as string | null,
      }));
    },
  });
}

export function useTenderRequirements(
  session: Session | null,
  tenderId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["tender_requirements", tenderId],
    enabled: Boolean(session) && Boolean(tenderId) && enabled,
    queryFn: async (): Promise<TenderRequirementItem[]> => {
      const { data, error } = await supabase
        .from("tender_requirements")
        .select(
          "id, category, requirement_name, requirement_text, display_order, status, confidence_score, explanation, matched_document_id",
        )
        .eq("tender_id", tenderId!)
        .order("display_order", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        category: row.category,
        requirement_name: row.requirement_name,
        requirement_text: row.requirement_text,
        display_order: row.display_order,
        status: row.status as string | null,
        confidence_score: row.confidence_score,
        explanation: row.explanation,
        matched_document_id: row.matched_document_id,
      }));
    },
  });
}


export function useAnalyzeTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenderId: string) => {
      const { data, error } = await supabase.functions.invoke("analyze-tender", {
        body: { tender_id: tenderId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      queryClient.invalidateQueries({ queryKey: ["tender_requirements"] });
    },
  });
}

export interface UploadTenderInput {
  file: File;
  title: string;
  organizationId: string;
  companyId: string;
}

export function useUploadTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, title, organizationId, companyId }: UploadTenderInput) => {
      const hash = await sha256Hex(file);
      const storagePath = buildTenderStoragePath(organizationId, file.name);

      const { error: uploadError } = await supabase.storage
        .from(TENDER_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: tender, error: tenderError } = await supabase
        .from("tenders")
        .insert({ organization_id: organizationId, company_id: companyId, title })
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
