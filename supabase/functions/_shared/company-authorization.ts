export interface OrganizationMembership {
  organization_id: string | null;
  is_owner: boolean | null;
}

export interface CompanyAuthorizationContext {
  expectedCompanyId: string;
  expectedOrganizationId: string;
  company: {
    id: string;
    organization_id: string;
    is_active: boolean;
  } | null;
  membership: {
    company_id: string;
    organization_id: string;
    membership_source: string;
  } | null;
  organizationMemberships: readonly OrganizationMembership[];
}

/**
 * Pure authorization decision shared by Edge Functions and unit tests.
 * An explicit company membership is valid only while the caller remains an
 * organization member. An owner membership additionally requires the current
 * organization_members row to identify that user as an owner.
 */
export function isCompanyAuthorizationValid(context: CompanyAuthorizationContext): boolean {
  const {
    expectedCompanyId,
    expectedOrganizationId,
    company,
    membership,
    organizationMemberships,
  } = context;

  if (
    !company ||
    company.id !== expectedCompanyId ||
    company.organization_id !== expectedOrganizationId ||
    company.is_active !== true
  ) {
    return false;
  }

  if (!organizationMemberships.some((row) => row.organization_id === expectedOrganizationId)) {
    return false;
  }

  if (
    !membership ||
    membership.company_id !== expectedCompanyId ||
    membership.organization_id !== expectedOrganizationId
  ) {
    return false;
  }

  if (membership.membership_source === "explicit") return true;

  return (
    membership.membership_source === "owner" &&
    organizationMemberships.some(
      (row) =>
        row.organization_id === expectedOrganizationId && row.is_owner === true,
    )
  );
}

interface QueryResult {
  data: Record<string, unknown> | null;
  error: unknown;
}

interface QueryBuilder {
  select(columns: string): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  maybeSingle(): Promise<QueryResult>;
}

interface AdminClient {
  from(table: string): QueryBuilder;
}

/**
 * Service-role Edge Function helper. The caller must first authenticate the
 * JWT and load organization memberships for that same profile.
 */
export async function authorizeCompanyMembership(
  adminInput: unknown,
  args: {
    profileId: string;
    companyId: string;
    organizationId: string;
    organizationMemberships: readonly OrganizationMembership[];
  },
): Promise<boolean> {
  const admin = adminInput as AdminClient;

  if (!args.organizationMemberships.some((row) => row.organization_id === args.organizationId)) {
    return false;
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, organization_id, is_active")
    .eq("id", args.companyId)
    .maybeSingle();

  if (companyError) throw companyError;

  const { data: membership, error: membershipError } = await admin
    .from("company_members")
    .select("company_id, organization_id, membership_source")
    .eq("company_id", args.companyId)
    .eq("profile_id", args.profileId)
    .maybeSingle();

  if (membershipError) throw membershipError;

  return isCompanyAuthorizationValid({
    expectedCompanyId: args.companyId,
    expectedOrganizationId: args.organizationId,
    company: company as CompanyAuthorizationContext["company"],
    membership: membership as CompanyAuthorizationContext["membership"],
    organizationMemberships: args.organizationMemberships,
  });
}
