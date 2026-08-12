import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BankReferenceListItem, BankReferenceMetadata } from "@/lib/bank-references";

const SELECT_COLUMNS =
  "id, bank_name, status, request_date, expected_date, received_date, expiry_date, notes, created_at, is_template, company_id, tender_id, request_metadata, companies(legal_name), tenders(title, reference_number)";

type Row = {
  id: string;
  bank_name: string | null;
  status: string | null;
  request_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string | null;
  is_template: boolean;
  company_id: string | null;
  tender_id: string | null;
  request_metadata: unknown;
  companies: { legal_name: string | null } | null;
  tenders: { title: string | null; reference_number: string | null } | null;
};

export interface TenderOption {
  id: string;
  title: string;
}

export type CreateBankReferenceInput = {
  organizationId: string;
  companyId: string;
  bankName: string;
  tenderId: string | null;
  requestDate: string | null;
  expectedDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  requestMetadata: BankReferenceMetadata;
  isTemplate: boolean;
};

function mapRow(row: Row): BankReferenceListItem {
  const tenderLabel = row.tenders
    ? (row.tenders.title ?? row.tenders.reference_number ?? null)
    : null;
  return {
    id: row.id,
    bank_name: row.bank_name,
    status: row.status,
    request_date: row.request_date,
    expected_date: row.expected_date,
    received_date: row.received_date,
    expiry_date: row.expiry_date,
    notes: row.notes,
    created_at: row.created_at,
    is_template: row.is_template,
    company_id: row.company_id,
    company_name: row.companies?.legal_name ?? null,
    tender_id: row.tender_id,
    tender_title: tenderLabel,
    request_metadata: (row.request_metadata ?? {}) as BankReferenceMetadata,
  };
}

function useBankReferenceList(
  session: Session | null,
  organizationId: string | null | undefined,
  isTemplate: boolean,
) {
  return useQuery({
    queryKey: ["bank_reference_requests", isTemplate ? "templates" : "active", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<BankReferenceListItem[]> => {
      const { data, error } = await supabase
        .from("bank_reference_requests")
        .select(SELECT_COLUMNS)
        .eq("organization_id", organizationId!)
        .eq("is_template", isTemplate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).map(mapRow);
    },
  });
}

/** Operational (non-template) bank reference requests for the active organization. */
export function useBankReferenceRequests(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useBankReferenceList(session, organizationId, false);
}

/** Reusable templates only — templates are never operational requests. */
export function useBankReferenceTemplates(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useBankReferenceList(session, organizationId, true);
}

/** Active company choices for the current organization. */
export function useBankReferenceCompanies(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["bank_reference_requests", "companies", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, legal_name")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("legal_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Tender choices available to the current organization. */
export function useBankReferenceTenders(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["bank_reference_requests", "tenders", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<TenderOption[]> => {
      const { data, error } = await supabase
        .from("tenders")
        .select("id, title, reference_number")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title ?? row.reference_number ?? row.id,
      }));
    },
  });
}

/** Template count only — templates are never operational requests. */
export function useBankReferenceTemplateCount(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["bank_reference_requests", "templates", "count", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("bank_reference_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .eq("is_template", true);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useCreateBankReferenceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBankReferenceInput): Promise<BankReferenceListItem> => {
      const payload: Database["public"]["Tables"]["bank_reference_requests"]["Insert"] = {
        organization_id: input.organizationId,
        company_id: input.companyId,
        bank_name: input.bankName,
        request_metadata: input.requestMetadata,
        is_template: input.isTemplate,
        status: "draft",
      };

      if (!input.isTemplate) {
        if (input.tenderId) payload.tender_id = input.tenderId;
        if (input.requestDate) payload.request_date = input.requestDate;
        if (input.expectedDate) payload.expected_date = input.expectedDate;
        if (input.expiryDate) payload.expiry_date = input.expiryDate;
        if (input.notes) payload.notes = input.notes;
      }

      const { data, error } = await supabase
        .from("bank_reference_requests")
        .insert(payload)
        .select(SELECT_COLUMNS)
        .single();
      if (error) throw error;
      return mapRow(data as unknown as Row);
    },
    onSuccess: (_item, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bank_reference_requests", "active", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["bank_reference_requests", "templates", variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ["bank_reference_requests", "templates", "count", variables.organizationId] });
    },
  });
}
