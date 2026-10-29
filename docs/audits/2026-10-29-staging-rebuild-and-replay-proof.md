# JASMIQ staging rebuild and replay proof

This procedure is intentionally split into planning, review, and application. Do not apply migrations to production from this procedure.

## Target projects

- Production (read-only inspection only): `itqepknvdiedldcyunig`
- Dedicated staging: `rmtoaaxnuwsecmajhwjx`

## 1. Review migration provenance before replay

1. Review PR #56's reconstructed migration SQL independently against the live migration ledger and known schema/function definitions.
2. Do not treat matching migration version prefixes as proof that SQL contents are historically correct.
3. Ensure the checked-out commit contains the reviewed migration set.
4. Configure repository secrets for the staging workflow: `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF` (must be `rmtoaaxnuwsecmajhwjx`), and `STAGING_DB_PASSWORD`.
5. Configure the GitHub Actions environment `jasmiq-staging` with required reviewers before any apply run.

## 2. Exact migration-version gate

The workflow checks `supabase/migrations` against `supabase/migrations/live-ledger-versions-2026-10-29.txt`, a read-only snapshot of the 66 versions returned by the production migration ledger. The check reports missing, extra, invalid, or duplicate version prefixes and blocks both preview and apply if the sets differ.

**The first audit found a real discrepancy in PR #56:** its changed-file list contains 68 SQL migration files, while the live ledger contains 66 versions. The branch's file list is missing live version `20260911162125` (`tighten_tender_lot_schema`) and contains three versions absent from the live ledger: `20260925160100`, `20260925160200`, and `20260928130000`. This means the current PR #56 branch must not be replayed as a canonical historical set yet. Those files need independent provenance review; do not delete or rewrite them blindly.

## 3. Preview the migration plan

Run **Actions → Staging schema rebuild (guarded)** with mode `dry-run`. The workflow pins the project ref to staging and runs `supabase db push --include-all --dry-run`. It must not write to either database.

Review the complete output. If it reports unexpected migration ordering, missing dependencies, destructive statements, or any target other than the dedicated staging project, stop and resolve that before applying.

## 4. Apply to staging only

Only after independent migration review and dry-run approval, run the workflow with mode `apply` and confirmation `REBUILD JASMIQ STAGING`. The job repeats the project-ref check immediately before applying. It applies migrations and deploys the five core functions listed in the workflow.

The workflow does **not** create storage buckets, configure storage object policies, seed test users, or execute isolation tests. These remain separate release gates. Verify storage bucket configuration and policies before uploading any fixtures.

## 5. Compare schema fingerprints

Run `scripts/staging-schema-fingerprint.sql` unchanged in both projects using their SQL editors or read-only database connections. Export each result as CSV with `object_key,fingerprint` columns and compare by key. The query fingerprints metadata only; it does not export application row contents.

Classify every missing, extra, or different key. Expected differences must be explained in writing; do not declare replay parity just because the migration command succeeded. The staging project was empty at the audit date, so a large initial difference is expected before replay.

The fingerprint covers function definitions and overload signatures, policies, columns, indexes, triggers, constraints, RLS flags, table grants, enum labels, extensions and storage bucket metadata. It does not prove data parity, Edge Function deployment parity, secrets/environment parity, auth configuration parity, or end-user access isolation.

## 6. Required evidence before moving on

Record in the release evidence register:
- PR #56 review result and reviewed commit SHA.
- Dry-run workflow URL and complete result.
- Apply workflow URL and resulting migration ledger.
- Staging public table/migration/function/bucket counts.
- Fingerprint comparison file and explanation for every difference.
- Confirmation that production remained unchanged.

Only after these are recorded should work proceed to staging fixtures and the two-user isolation suite in PR #59.
