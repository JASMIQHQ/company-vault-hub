# G34: Company/organisation consistency audit and remediation

## Confirmed findings

The live definitions of public.register_document_upload and public.calculate_tender_compliance use SECURITY DEFINER execution.

- register_document_upload originally obtained the new document's organization_id from current_organization_id(), then separately checked membership in the requested company. The helper selects one organisation membership without a requested organisation ID, so multi-organisation membership could make the chosen tenant ambiguous.
- calculate_tender_compliance originally checked membership in the tender's company but did not explicitly reject a persisted tender whose organization_id differed from the company's organisation before updating compliance.
- The live RLS policies on company_documents and tenders originally checked company membership but did not require the row's organization_id to equal the company's persisted organization_id. Thus, membership alone was not a sufficient tenant-consistency check for direct authenticated table writes.
- A fresh read-only pg_policies inventory on 2026-10-16 confirmed exactly one policy on each of company_documents and tenders: company_documents_company_access and tenders_company_access. Both are permissive FOR ALL policies for authenticated. The companies table has companies_org_access (PERMISSIVE, ALL, roles {public}) using is_org_member(organization_id). No second permissive policy on either target table was found in that inventory.
- The live foreign keys validate that referenced company and organisation rows exist independently; they do not enforce equality between a document/tender organisation and its company's organisation.
- The live read-only consistency query found zero mismatched company-document or tender organisation relationships in the examined records. No production rows were changed.

## Proposed remediation committed to this branch

Migration: supabase/migrations/20261016160000_g34_enforce_company_organization_consistency.sql

1. Upload organisation is derived from the active persisted company.
2. Upload is rejected unless the authenticated caller is a member of that company.
3. Tender compliance is rejected unless the persisted tender's organisation equals its active company's organisation and the caller is a member of that company.
4. The compliance update repeats the tender, company and organisation predicates as a defence-in-depth write guard.
5. The company_documents and tenders authenticated RLS policies require both active company membership and equality between the row organisation and persisted company organisation, for reads and writes.
6. EXECUTE is explicitly revoked from PUBLIC and anon, and granted to authenticated and service_role, preserving the observed intended roles.

## Automated guard and CI evidence (refreshed 2026-10-16)

Latest PR head: 82cf63f83ec0f3dd1b104fbe2dc3724fcea0b9e6.

- Static migration safety assertions: PASS on latest head.
- Independent build job: PASS on latest head.
- Vercel preview comments check: PASS; no unresolved preview feedback.
- Repository Quality Gate: FAIL at the full-repository lint step with 3,894 findings (3,876 errors and 18 warnings). The migration guard script itself had no lint findings in the earlier detailed lint output. The quality job's build stage is skipped after lint fails, but the separate build job passes.
- Independent PR review: none recorded at the time of this refresh.
- PR #60 remains open and unmerged. PR #59 authenticated isolation harness remains separate and unmerged.

The static guard is not a substitute for applying the migration to a disposable/staging database and testing actual RLS/role behaviour. A successful preview is not database acceptance evidence.

## Required staging acceptance tests

Run with two separate authenticated users in a staging project; do not use a service-role token for the negative-access tests.

| Case | Setup / action | Expected result |
|---|---|---|
| U1 | User A uploads to an active company they belong to | Success; inserted document organisation equals that company's organisation |
| U2 | User A attempts upload to a company they do not belong to | SQLSTATE 42501; no row inserted |
| U3 | User A belongs to companies in two organisations; uploads to company in the non-default organisation | Success; document organisation follows the requested company, not current_organization_id() |
| D1 | Authenticated user inserts a document with a company ID and a different organisation ID | RLS rejects the insert |
| D2 | Authenticated user updates an accessible document to a mismatched organisation ID | RLS rejects the update |
| T1 | Member calculates compliance for a consistent tender/company pair | Existing percentage calculation and write succeed |
| T2 | Member calls calculation for a tender whose persisted organisation differs from its company's organisation | SQLSTATE 42501; compliance value unchanged |
| T3 | Member attempts a direct tender insert/update with mismatched company and organisation | RLS rejects the write |
| T4 | Member calls calculation for an inactive company or missing tender | SQLSTATE 42501; no update |
| P1 | Anonymous role calls either RPC | Execute denied |
| P2 | Authenticated non-member calls either RPC against another company's IDs | Forbidden; no cross-company data mutation |

Where the production schema prevents constructing an inconsistent tender through normal writes, create that fixture only in an isolated disposable test database with constraints deliberately bypassed for the test, then roll back/destroy that database. Never corrupt staging or production data to manufacture the case.

## Release status

- [x] Live function definitions, RLS policies, execute grants, foreign keys and consistency counts inspected read-only.
- [x] Proposed SQL migration committed on an isolated branch.
- [x] Static migration guard and workflow passing on latest PR head.
- [x] Independent build passing on latest PR head.
- [x] Target-table policy inventory checked; one permissive policy found per target table.
- [ ] Repository Quality Gate green; full-repository lint remains at 3,894 findings.
- [ ] Migration applied and verified in disposable/staging environment.
- [ ] Authenticated acceptance tests passed.
- [ ] Migration provenance gate reconciled and approved.
- [ ] Required independent review and repository checks passed.

The migration has not been applied to production. No production DDL, data writes, or deployment were performed.
