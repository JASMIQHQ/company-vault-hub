import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { useOrganizationId } from "@/hooks/use-vault";
import { useOrganizations, useProfile, type OrganizationOption } from "@/hooks/use-profile";

const STORAGE_KEY = "jasmiq-active-organization";

export interface ActiveOrganization {
  session: Session | null;
  sessionLoading: boolean;
  organizations: OrganizationOption[];
  multiCompany: boolean;
  activeOrgId: string | null;
  activeOrgName: string | null;
  setActiveOrgId: (id: string) => void;
  firstName: string | null;
  bootstrapping: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Single source of truth for "which company am I working in?".
 * Reuses the existing session, profile and current_organization_id() logic and
 * remembers the user's choice so every page shares the same company context.
 */
export function useActiveOrganization(
  session: Session | null,
  sessionLoading: boolean,
): ActiveOrganization {
  const orgQuery = useOrganizationId(session);
  const profileQuery = useProfile(session);
  const orgsQuery = useOrganizations(session, profileQuery.data?.id);
  const organizations = orgsQuery.data ?? [];

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelected(stored);
  }, []);

  const valid = selected && organizations.some((org) => org.id === selected) ? selected : null;
  const activeOrgId = valid ?? orgQuery.data ?? organizations[0]?.id ?? null;

  const setActiveOrgId = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setSelected(id);
  };

  return {
    session,
    sessionLoading,
    organizations,
    multiCompany: organizations.length > 1,
    activeOrgId,
    activeOrgName: organizations.find((org) => org.id === activeOrgId)?.name ?? null,
    setActiveOrgId,
    firstName: profileQuery.data?.first_name ?? profileQuery.data?.display_name ?? null,
    bootstrapping: sessionLoading || orgQuery.isPending,
    error: (orgQuery.error as Error | null) ?? null,
    refetch: () => {
      orgQuery.refetch();
      orgsQuery.refetch();
    },
  };
}
