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

export interface DetectTenderBidStructureResult {
  detected: boolean;
  created: boolean;
  scopes: TenderLot[];
  message?: string;
}

type DynamicQuery = PromiseLike<{ data: unknown; error: Error | null }> & {
  select(columns?: string): DynamicQuery;
  eq(column: string, value: unknown): DynamicQuery;
  order(column: string, options?: { ascending?: boolean }): DynamicQuery;
  insert(values: unknown): DynamicQuery;
  single(): DynamicQuery;
};

type DynamicSupabase = Omit<typeof supabase, "from"> & { from(table: string): DynamicQuery };
const db = supabase as unknown as DynamicSupabase;

export async function listTenderLots(tenderId: string): Promise<TenderLot[]> {
  const { data, error } = await db.from("tender_lots").select("id, tender_id, organization_id, company_id, lot_number, lot_title, description, created_at, updated_at").eq("tender_id", tenderId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TenderLot[];
}

export async function createTenderLot(input: Omit<TenderLot, "id" | "created_at" | "updated_at">): Promise<TenderLot> {
  const { data, error } = await db.from("tender_lots").insert(input).select("*").single();
  if (error) throw error;
  return data as unknown as TenderLot;
}

export async function detectTenderBidStructure(tenderId: string): Promise<DetectTenderBidStructureResult> {
  const { data, error } = await supabase.functions.invoke("detect-tender-bid-structure", { body: { tender_id: tenderId } });
  if (error) throw error;
  return data as DetectTenderBidStructureResult;
}
