import {
  isCompanyAuthorizationValid,
  type CompanyAuthorizationContext,
} from "./company-authorization.ts";

const valid: CompanyAuthorizationContext = {
  expectedCompanyId: "company-a",
  expectedOrganizationId: "org-a",
  company: {
    id: "company-a",
    organization_id: "org-a",
    is_active: true,
  },
  membership: {
    company_id: "company-a",
    organization_id: "org-a",
    membership_source: "explicit",
  },
  organizationMemberships: [{ organization_id: "org-a", is_owner: false }],
};

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

Deno.test("explicit member can access only its active company", () => {
  assert(isCompanyAuthorizationValid(valid), "valid explicit membership denied");
});

Deno.test("owner provenance requires a current organization-owner row", () => {
  const owner = {
    ...valid,
    membership: { ...valid.membership!, membership_source: "owner" },
  };
  assert(
    !isCompanyAuthorizationValid(owner),
    "owner provenance without organization ownership was accepted",
  );
  assert(
    isCompanyAuthorizationValid({
      ...owner,
      organizationMemberships: [{ organization_id: "org-a", is_owner: true }],
    }),
    "current organization owner was denied",
  );
});

Deno.test("legacy backfill memberships are denied", () => {
  assert(
    !isCompanyAuthorizationValid({
      ...valid,
      membership: {
        ...valid.membership!,
        membership_source: "legacy_backfill",
      },
    }),
    "legacy backfill membership was authorized",
  );
});

Deno.test("inactive companies are denied", () => {
  assert(
    !isCompanyAuthorizationValid({
      ...valid,
      company: { ...valid.company!, is_active: false },
    }),
    "inactive company was authorized",
  );
});

Deno.test("cross-organization company and membership rows are denied", () => {
  assert(
    !isCompanyAuthorizationValid({
      ...valid,
      company: { ...valid.company!, organization_id: "org-b" },
    }),
    "company organization mismatch was authorized",
  );
  assert(
    !isCompanyAuthorizationValid({
      ...valid,
      membership: { ...valid.membership!, organization_id: "org-b" },
    }),
    "membership organization mismatch was authorized",
  );
});

Deno.test("organization membership is required even for explicit company members", () => {
  assert(
    !isCompanyAuthorizationValid({ ...valid, organizationMemberships: [] }),
    "explicit member without organization membership was authorized",
  );
});
