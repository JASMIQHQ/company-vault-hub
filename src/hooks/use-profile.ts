import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export interface OrganizationOption {
  id: string;
  name: string;
}

/** Reads the signed-in user's profile row (existing table, read-only). */
export function useProfile(session: Session | null) {
  return useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, display_name, default_organization_id")
        .eq("auth_user_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Organizations the user belongs to. A user may legitimately belong to several.
 * Falls back to current_organization_id() when the membership rows aren't readable.
 */
export function useOrganizations(session: Session | null, profileId?: string | null) {
  return useQuery({
    queryKey: ["organizations", session?.user.id, profileId],
    enabled: Boolean(session),
    queryFn: async (): Promise<OrganizationOption[]> => {
      if (profileId) {
        const { data, error } = await supabase
          .from("organization_members")
          .select("organization_id, organizations(id, name)")
          .eq("profile_id", profileId);
        if (!error && data && data.length > 0) {
          const options = data
            .map((row) => {
              const org = row.organizations as { id: string; name: string | null } | null;
              const id = org?.id ?? row.organization_id;
              if (!id) return null;
              return { id, name: org?.name ?? "My company" };
            })
            .filter((value): value is OrganizationOption => value !== null);
          if (options.length > 0) return options;
        }
      }

      const { data: fallback, error: fallbackError } = await supabase.rpc(
        "current_organization_id",
      );
      if (fallbackError) throw fallbackError;
      const id = (fallback as string | null) ?? null;
      return id ? [{ id, name: "My company" }] : [];
    },
  });
}
