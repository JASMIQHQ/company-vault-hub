import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
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

/** Operational (non-template) bank reference requests for the active organization. */
export function useBankReferenceRequests(
  session: Session | null,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["bank_reference_requests", "active", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<BankReferenceListItem[]> => {
      const { data, error } = await supabase
        .from("bank_reference_requests")
        .select(SELECT_COLUMNS)
        .eq("organization_id", organizationId!)
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[]).map(mapRow);
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
