import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

/** Active companies belonging to the current organization. */
export function useCompanies(session: Session | null, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["companies", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("legal_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface CreateCompanyInput {
  organizationId: string;
  legalName: string;
  registrationNumber?: string;
  taxIdentificationNumber?: string;
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      legalName,
      registrationNumber,
      taxIdentificationNumber,
    }: CreateCompanyInput): Promise<Company> => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          organization_id: organizationId,
          legal_name: legalName,
          registration_number: registrationNumber?.trim() || null,
          tax_identification_number: taxIdentificationNumber?.trim() || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["companies", company.organization_id] });
    },
  });
}
