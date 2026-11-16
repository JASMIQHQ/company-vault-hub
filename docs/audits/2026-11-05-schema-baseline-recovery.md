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


## 2026-11-16 verified recovery status

The following evidence supersedes the earlier connection/export blockers above.

### Production export

- Export workflow run #11 completed successfully from main (run ID 43885665656).
- Artifact: jasmiq-production-schema-baseline-43885665656 (artifact ID 14234138047).
- ZIP SHA-256: fd4a5c746e54a0c556c3942c2c2f393101163b86578b345de1e6a67852f38c0f.
- SQL SHA-256: 6bf83ec93fc2ae9a9325fea2a6a82593b1d1ea91c4bacbb7373e2d9e8734bbc0.
- Source commit: 99563254c1b2d2ef2c56f5bcf010fe97d31f71a8.
- The export is schema-only for public/private, excludes privileges and ownership, and its workflow checked the custom archive TOC for table data, sequence values, and large objects. No production writes were performed.

### Staging preflight

- Staging project ref: rmtoaaxnuwsecmajhwjx; status ACTIVE_HEALTHY.
- A staging SQL connection test succeeded after the database password was reset in Supabase; no password was shared in chat.
- Staging PostgreSQL is 17.11. The required citext, vector, uuid-ossp, and pgcrypto extension versions match production.
- The public/private application schema has zero relations and staging has zero recorded migrations. Supabase platform schemas/tables remain present; the entire database is not empty.
- No schema restore, grants, migration repair, Storage policy/bucket changes, or Edge Function deployments have yet been performed.

### Schema and migration review

- The exported schema contains 57 tables, 18 views, 46 application functions (30 SECURITY DEFINER), 18 triggers, and 43 RLS policies. All 57 tables have RLS enabled; none uses FORCE ROW LEVEL SECURITY. All 46 functions have an explicit search_path.
- The production migration ledger contains 66 versions and matches the checked-in migration-version manifest.
- Migration review found one static seed migration for document taxonomy: 11 canonical rows and 16 aliases. The staging restore workflow replays this idempotent seed migration.
- Historical verification and company-membership backfills are not replayed because the staging application tables are empty. Post-restore verification checks that every public application table other than the two taxonomy tables contains zero rows.
- Five migrations exclusively create/revise policies on storage.objects. They are intentionally left pending for the dedicated Storage phase: 20260729140358, 20260730124656, 20260925150643, 20260928124639, and 20260928124650. The restore workflow therefore marks 61 migrations as applied, not all 66.

### ACL finding and staging hardening

A read-only production catalog audit found TRUNCATE and MAINTAIN privileges on 51 public tables for anon and authenticated, and on all 57 public tables for service_role. RLS does not restrict TRUNCATE. These grants are not copied to staging. The staging allowlist recreates only the source-confirmed SELECT, INSERT, UPDATE, and DELETE grants for authenticated/service_role, grants no table DML to anon, applies per-function EXECUTE ACLs, and hardens default privileges. Production remains frozen; any production ACL remediation requires a separate review and approval.

### Restore workflow gate

PR #92 adds a manual staging-only restore workflow with exact project-ref guards, export-run/artifact provenance checks, both SHA-256 checks, a read-only production ACL/ledger query, an atomic schema + taxonomy seed + ACL transaction, resumable migration-ledger repair, and post-restore verification. It requires the exact confirmation phrase RESTORE JASMIQ SCHEMA TO STAGING ONLY. It does not deploy Edge Functions or create Storage buckets/objects. The fail-closed workflow stub already exists on main, so the new implementation can be dispatched from the PR branch without merging: Actions → restore-staging-schema-baseline.yml → Run workflow → Use workflow from docs/staging-baseline-audit-prep-20261116. Do not select main, which runs the blocked stub. Merging can trigger the production deployment pipeline and is not required for this staging run.

**Current state: export verified; staging preflight passed; restore workflow prepared in PR #92; staging schema restoration has not started.**
