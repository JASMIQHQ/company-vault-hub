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
- Staging is a separate empty project and must remain untouched until a reviewed baseline is ready.

## One-time read-only export

1. In GitHub Settings → Environments, create `jasmiq-schema-export` and require an approving reviewer.
2. Add the environment secret `PRODUCTION_DB_PASSWORD`. Do not paste the password into chat or commit it to the repository.
3. From Actions, run `Export production schema baseline (read-only)`.
4. Review the three-day artifact `jasmiq-production-schema-baseline-<run-id>` and its SHA-256. The workflow uses `supabase db dump` with schema-only defaults; it exports no table rows and performs no production writes.
5. Inspect the dump for embedded credentials or secrets before committing or restoring it.

## Intended staging bootstrap after review

- Restore the reviewed schema-only baseline into staging only.
- Provision the two private Storage buckets with `supabase/ops/ensure-required-storage-buckets.sql`.
- Mark the exact 66 production ledger versions as applied in staging; do not replay the incomplete historical chain from an empty database.
- Apply only the reviewed append-only migrations newer than the 66-version baseline (currently the verification corrections and company-membership provenance).
- Verify the resulting ledger, schema fingerprint, functions, RLS policies, Storage policies, and Edge Functions.
- Run the SQL regression scripts and authenticated lifecycle / cross-company tests.

This process creates an empty-data staging schema that matches the current production schema foundation, then applies the reviewed pending changes. It is not a claim that the original 66 migrations have been independently replay-certified.

## Hard stop

Do not run a production schema restore, production migration, production bucket change, or production Edge Function deployment as part of this recovery. The production export is read-only. All restore and apply operations target `rmtoaaxnuwsecmajhwjx` only and require separate review.
