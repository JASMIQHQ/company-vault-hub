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

type TenderRow = TenderListItem & {
  tender_files?: Array<{ storage_path: string | null }> | null;
};

const TENDER_LIST_PROJECTION =
  "id, title, created_at, analysis_status, analysis_error, procuring_entity, submission_deadline, compliance_percentage, requires_bid_security, requires_bank_reference, requires_affidavit, opening_date, reference_number, procurement_method, tender_type, industry, lot_number, lot_description, tender_files(storage_path, created_at)";
const TENDER_DETAIL_PROJECTION = `${TENDER_LIST_PROJECTION}, analysis_json`;

function mapTender(tender: TenderRow): TenderListItem {
  return { ...tender, storage_path: tender.tender_files?.[0]?.storage_path ?? null };
}

export function useTenders(session: Session | null, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenders", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<TenderListItem[]> => {
      const { data, error } = await supabase
        .from("tenders")
        .select(TENDER_LIST_PROJECTION)
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapTender(row as TenderRow));
    },
  });
}

export function useTender(
  session: Session | null,
  organizationId: string | null | undefined,
  tenderId: string | undefined,
) {
  return useQuery({
    queryKey: ["tender", organizationId, tenderId],
    enabled: Boolean(session) && Boolean(organizationId) && Boolean(tenderId),
    queryFn: async (): Promise<TenderListItem | null> => {
      const { data, error } = await supabase
        .from("tenders")
        .select(TENDER_DETAIL_PROJECTION)
        .eq("organization_id", organizationId!)
        .eq("id", tenderId!)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTender(data as TenderRow) : null;
    },
  });
}

export function useDashboardTenders(session: Session | null, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["tenders", "dashboard", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<TenderListItem[]> => {
      const { data, error } = await supabase
        .from("tenders")
        .select(TENDER_LIST_PROJECTION)
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapTender(row as TenderRow));
    },
  });
}

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
      return (data ?? []).map((row) => ({ ...row, status: row.status as string | null }));
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
      queryClient.invalidateQueries({ queryKey: ["tender"] });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenders"] }),
  });
}

export async function createTenderSignedUrl(storagePath: string, download = false) {
  const { data, error } = await supabase.storage
    .from(TENDER_BUCKET)
    .createSignedUrl(storagePath, 60, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
