# JASMIQ staging rebuild and replay proof

This procedure is intentionally split into planning, review, and application. Production is read-only throughout this procedure.

## Target projects

- Production (read-only inspection only): `itqepknvdiedldcyunig`
- Dedicated staging: `rmtoaaxnuwsecmajhwjx`

## 1. Review migration provenance before replay

1. Review PR #56's reconstructed migration SQL independently against the live migration ledger and known schema/function definitions.
2. Do not treat matching migration version prefixes as proof that SQL contents are historically correct.
3. Ensure the exact reviewed source commit is the one used by the plan workflow.
4. Configure these as **environment secrets** on the GitHub Actions environment `jasmiq-staging`: `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF` (must be `rmtoaaxnuwsecmajhwjx`), and `STAGING_DB_PASSWORD`. Do not store them as repository-wide secrets.
5. Configure the GitHub Actions environment `jasmiq-staging` with required reviewers before any apply run.

## 2. Exact migration-version gate

The workflow checks `supabase/migrations` against `supabase/migrations/live-ledger-versions-2026-10-29.txt`, a read-only snapshot of the 66 versions returned by the production migration ledger. The check reports missing, extra, invalid, or duplicate version prefixes and blocks both preview and apply if the sets differ.

The PR #56 changed-file list contains 68 SQL paths, but that is not the final migration-directory count: the diff includes three deletions. The deleted versions are `20260925160100`, `20260925160200`, and `20260928130000`; the unchanged base migration `20260911162125_tighten_tender_lot_schema.sql` remains inherited. The version-set check validates the actual checked-out directory. This is a filename/version check only; SQL provenance still requires independent review.

## 3. Generate and review the read-only plan

The current workflow is **Actions → Staging migration plan (read-only)** (`.github/workflows/staging-rebuild.yml`). It is a `workflow_dispatch` workflow and produces an artifact named `jasmiq-staging-plan-<run-id>` containing:

- `plan.txt` and its SHA-256 digest;
- the production-independent staging migration ledger snapshot;
- the exact source commit SHA;
- SHA-256 hashes for every migration SQL file.

The workflow pins the target to staging and runs `supabase db push --include-all --dry-run`. It must not apply migrations or deploy functions.

Review the complete plan output and every migration SQL body. Stop for unexpected ordering, missing dependencies, destructive statements, mismatched hashes, or any target other than the dedicated staging project.

**Dispatch prerequisite:** GitHub only permits manual dispatch of a workflow that exists on the repository's default branch. If this workflow is still only present on an unmerged PR branch, first make the workflow available on the default branch through a separately reviewed change; do not claim that a run has occurred. Select the exact reviewed migration source ref when dispatching and verify the artifact's `source-commit.txt`.

## 4. Apply the exact reviewed plan to staging only

The separate workflow is **Actions → Staging migration apply (reviewed plan required)** (`.github/workflows/staging-rebuild-apply.yml`). It requires all three inputs:

- `plan_run_id`: successful read-only plan run ID;
- `approved_plan_sha256`: exact digest from that run's artifact;
- `confirmation`: literal `APPLY REVIEWED JASMIQ STAGING PLAN`.

The apply workflow downloads the exact artifact, checks out its recorded source commit, verifies the plan and every migration-file hash, regenerates the dry-run immediately before writes, and refuses to proceed if the plan digest changed. It hard-pins the project ref to staging and explicitly rejects the production project ref. It then applies migrations, deploys the five named core Edge Functions, and captures the post-apply migration ledger.

Do not dispatch apply until the plan and SQL review are complete and the `jasmiq-staging` environment's required-reviewer protection is confirmed. Do not bypass a failed hash, target, or plan check.

The workflow does **not** create storage buckets, seed test users, or execute tenant-isolation tests. These remain separate release gates. Verify storage bucket configuration and policies before uploading fixtures.

## 5. Compare schema fingerprints

Run `scripts/staging-schema-fingerprint.sql` unchanged in both projects using their SQL editors or read-only database connections. Export each result as CSV with `object_key,fingerprint` columns and compare by key. The query fingerprints metadata only; it does not export application row contents.

Classify every missing, extra, or different key. Expected differences must be explained in writing; do not declare replay parity just because the migration command succeeded. Staging currently has no public application tables or migration entries, so a large initial difference is expected before replay.

The fingerprint covers function definitions and overload signatures, policies, columns, indexes, triggers, constraints, RLS flags, table grants, enum labels, extensions and storage bucket metadata. It does not prove data parity, Edge Function deployment parity, secrets/environment parity, auth configuration parity, or end-user access isolation.

## 6. Required evidence before moving on

Record in the release evidence register:

- PR #56 review result and reviewed commit SHA;
- read-only plan workflow URL, exact source commit, plan SHA-256, and complete result;
- apply workflow URL and resulting migration ledger;
- staging public table/migration/function/bucket counts;
- fingerprint comparison file and explanation for every difference;
- successful positive and negative tenant/company/storage tests;
- confirmation that production remained unchanged.

Only after these are recorded should work proceed to staging fixtures and the two-user isolation suite. A successful migration replay alone is not tenant-isolation or feature acceptance.
