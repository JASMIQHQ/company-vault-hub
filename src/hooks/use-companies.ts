import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

/** Active companies authorized for the signed-in user inside the current organization. */
export function useCompanies(session: Session | null, organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ["companies", organizationId],
    enabled: Boolean(session) && Boolean(organizationId),
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase.rpc("create_company_for_current_user", {
        p_organization_id: organizationId,
        p_legal_name: legalName,
        p_registration_number: registrationNumber?.trim() || null,
        p_tax_identification_number: taxIdentificationNumber?.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ["companies", company.organization_id] });
    },
  });
}
