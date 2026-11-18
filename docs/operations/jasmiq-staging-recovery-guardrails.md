# JASMIQ staging recovery guardrails

**Status:** preparation only. This document and its companion SQL are not authorization to restore a database, repair migration history, execute SQL, deploy functions, or touch production.

## Verified recovery inputs

- The reviewed production schema-only artifact has SHA-256: c29a0b7282ddb03af6dd7432030fc790428701b2b86c8c50012620bd9870e8b3.
- The artifact contains the public/private application schema but excludes the managed storage schema and its policies.
- The staging project was observed empty at the last read-only inspection: zero applied migrations, zero public application tables, zero deployed Edge Functions, and zero Storage policies.
- The artifact was exported with privileges excluded. Required grants must be reviewed and applied separately; do not assume the dump is a complete permission baseline.

## Mandatory sequence (not yet authorized)

1. Reconfirm the target is the non-production staging project using its project reference and dashboard identity. Never infer the target from an environment variable alone.
2. Reconfirm the schema artifact checksum before use.
3. Restore the schema-only baseline to staging using the approved recovery mechanism. Do not restore over an existing non-empty database.
4. Reconcile the exact historical migration version set against the reviewed 66-version ledger. Only after the restored schema is verified equivalent should those exact historical versions be marked applied in staging's migration history. Migration repair changes migration history; it does not create or restore schema objects.
5. Resolve all helper-function dependencies before replaying post-baseline migrations. In particular, the previously observed replay failure is: public.is_org_member(uuid) does not exist while an early Storage policy migration creates policies on storage.objects.
6. Apply only reviewed migrations newer than the 66-version baseline, in timestamp order, with the staging-only workflow and an explicit run/SHA confirmation.
7. Install the final Storage policy state using supabase/ops/bootstrap-final-storage-policies.sql only after its preflight dependencies exist. The script is transactional, replaces the eight named policies, and deliberately stops if either helper function or any required table is missing.
8. Deploy reviewed Edge Functions to staging only after schema and authorization checks pass.
9. Run the acceptance checks below. Do not promote or merge to production as part of this recovery.

## Storage policy notes

The production schema artifact excludes managed Storage policies. The final policy state is not the initial organization-folder policy set: the later G35 migrations replace the company-document INSERT policy with the pre-bind organization-folder rule. The companion bootstrap reproduces that later state: four policies for company-documents and four for tender-files.

**Known blocker:** the bootstrap requires both public.is_org_member(uuid) and private.is_company_member(uuid). It does not invent or create either helper. The historical migration replay failure shows that the former was absent at the point of failure. Its authoritative definition and migration ordering must be located and reviewed before retrying replay or the bootstrap. Do not bypass this guard or weaken Storage authorization to make replay pass.

## Verification Edge Function

supabase/functions/verify-document/index.ts now explicitly reads the target company and fails closed unless:
- the company exists;
- companies.is_active is exactly true;
- the company's organization_id matches the document's organization; and
- the requesting profile has company membership.

This explicit check is required because the function uses the service-role client, which bypasses row-level security.

## Acceptance checks before any staging restoration

- Exact 66-version ledger matches the reviewed baseline; no missing, duplicate, or unexpected versions.
- Required schema objects, helper functions, grants, and Storage buckets are present.
- Exactly the expected eight Storage policies exist with the intended commands, roles, and predicates.
- Active company member can access only documents and tender files in their company.
- Inactive company member is denied verification and Storage access.
- Cross-organization and cross-company access attempts are denied.
- Pre-bind company-document upload succeeds only for an authenticated organization member and a valid organization UUID folder.
- Verification writes an attempt; only a successful verified result creates a verified-facts row.
- Edge Function typecheck, lint, and targeted tests pass.
- No production project reference, production secrets, or production deployment target is used.

## Explicit non-actions in this PR

No database SQL has been executed; no migration has been applied or repaired; no staging restore, Edge Function deployment, bucket/policy change, production access, secret change, or deployment promotion has occurred.
