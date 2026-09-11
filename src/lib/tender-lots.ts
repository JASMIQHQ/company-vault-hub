import { supabase } from "@/integrations/supabase/client";

export interface TenderLot {
  id: string;
  tender_id: string;
  organization_id: string;
  company_id: string;
  lot_number: string;
  lot_title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

type DynamicSupabase = Omit<typeof supabase, "from"> & {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const db = supabase as DynamicSupabase;

export async function listTenderLots(tenderId: string): Promise<TenderLot[]> {
  const { data, error } = await db
    .from("tender_lots")
    .select("id, tender_id, organization_id, company_id, lot_number, lot_title, description, created_at, updated_at")
    .eq("tender_id", tenderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TenderLot[];
}

export async function createTenderLot(input: Omit<TenderLot, "id" | "created_at" | "updated_at">): Promise<TenderLot> {
  const { data, error } = await db.from("tender_lots").insert(input).select("*").single();
  if (error) throw error;
  return data as unknown as TenderLot;
}

export async function updateRequirementLot(requirementId: string, lotId: string | null) {
  const { error } = await supabase
    .from("tender_requirements")
    .update({ lot_id: lotId } as never)
    .eq("id", requirementId);
  if (error) throw error;
}
