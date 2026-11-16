# JASMIQ production schema baseline recovery

## Why this is required

The recorded migration chain is not a complete empty-database bootstrap. The first migration already creates Storage policies that call `public.is_org_member(uuid)`; production also has `public.current_profile_id()` and `public.organization_members`, none of which are created by the tracked migration files.

The read-only local replay confirmed this dependency gap. Do not replay the 66 historical migrations against an empty staging database and do not add a fake local-only helper to hide the problem.

## Production facts observed

- Production project ref: `itqepknvdiedldcyunig`
- Production has 57 public application tables, 211 public/private functions, 18 views, 18 triggers, and 51 policies.
- Production has 66 recorded migration versions.
- The first two migration files only create Storage object policies; they assume pre-existing organization membership objects.
- The production `is_org_member(uuid)` function is a SECURITY DEFINER SQL function that checks `organization_members` using `current_profile_id()`.
- Staging is a separate project, `rmtoaaxnuwsecmajhwjx`. Its project control plane currently reports `ACTIVE_HEALTHY`, but that status does not prove SQL connectivity or an empty schema.

## One-time read-only export

The current workflow is `.github/workflows/export-production-schema-baseline.yml`. Its implementation was updated after this audit was first written; follow the workflow itself as the source of truth.

1. In GitHub Settings → Environments, use the protected `jasmiq-schema-export` environment with an approving reviewer.
2. Store `PRODUCTION_DB_URL` only as that environment's secret. It must identify the approved production project `itqepknvdiedldcyunig`. Never paste it into chat or commit it.
3. From GitHub Actions, manually run **Export production schema baseline (read-only, privilege-free)** against `main`.
4. Review the 30-day artifact `jasmiq-production-schema-baseline-<run-id>`. The current workflow exports `production-schema.sql`, `production-schema.sha256`, and `production-schema-manifest.txt`.
5. Verify the archive TOC check passed and the manifest identifies schemas `public,private`, `schema-only`, `no-privileges`, and `no-owner`.
6. Inspect the SQL for embedded credentials or secrets before committing or restoring it. Record the exact artifact run ID and SHA-256; do not invent or pre-populate a checksum before a successful export.

The workflow uses PostgreSQL 17 `pg_dump --format=custom --schema-only --no-privileges --no-owner`, checks the custom archive TOC for data-bearing entries, and renders SQL with `pg_restore --no-owner --no-privileges`. Artifact retention is 30 days. It performs no production writes and exports no table rows or Storage objects.

## Intended staging bootstrap after review

- Restore the reviewed schema-only baseline into staging only, after confirming the target project ref and determining whether its schema is empty. If it is not empty, stop and prepare a separately reviewed reset/reconciliation plan.
- Verify required extensions and target schemas before restore.
- Apply a reviewed explicit grants allowlist only after mapping table, sequence, and function privileges to actual application access paths and RLS policies. `supabase/grants/README.md` is the current security boundary; no guessed allowlist may be applied.
- Run the read-only ACL inventory in `supabase/audits/staging-acl-inventory.sql` and retain the raw output. It covers effective relation ACLs and both global and schema-specific default ACLs. Function-level EXECUTE privileges still require a separate object-by-object review.
- Mark the exact 66 production ledger versions as applied only after the restored baseline has been verified; do not replay the incomplete historical chain from an empty database.
- Apply only reviewed append-only migrations newer than the 66-version baseline.
- Verify the resulting ledger, schema fingerprint, functions, RLS policies, Storage policies, and Edge Functions.
- Run SQL regression scripts and authenticated lifecycle / cross-company tests.

This process creates an empty-data staging schema that matches the current production schema foundation, then applies reviewed pending changes. It is not a claim that the original 66 migrations have been independently replay-certified.

## Current blockers and hard stops

- On 2026-11-16, the Supabase SQL connector failed against staging with PostgreSQL `28P01 password authentication failed` for both `supabase_read_only_user` (catalog listing) and `postgres` (migration listing / SQL execution). The project control plane still reports `ACTIVE_HEALTHY`. Treat SQL connectivity as **NOT PROVEN** until a successful read-only query is returned.
- No fresh export artifact or checksum has been produced in this recovery run. Do not create `supabase/baseline/schema.sha256` from an assumed or copied value.
- No staging restore, grants, migration replay, Storage bucket creation, or Edge Function deployment has been performed as part of this recovery.
- Do not run a production schema restore, production migration, production bucket change, or production Edge Function deployment as part of this recovery. The production export is read-only. All restore and apply operations target `rmtoaaxnuwsecmajhwjx` only and remain blocked pending verified access and review.
