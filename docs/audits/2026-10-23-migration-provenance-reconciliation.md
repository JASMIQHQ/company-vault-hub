# Migration provenance reconciliation — 2026-10-23

## Scope and safety

This is a read-only inventory of the repository migration directory and the connected Supabase migration ledger. It is not a replay plan and does not authorize applying migrations, marking migrations as applied, resetting either database, or changing production.

## Observed counts

- Live Supabase project `jasmiq-dev` (`itqepknvdiedldcyunig`): 66 migration ledger entries.
- Staging Supabase project `jasmiq-staging` (`rmtoaaxnuwsecmajhwjx`): 0 migration ledger entries and 0 public tables.
- Candidate repository branch: 16 SQL files in `supabase/migrations/`.

## Repository migration filenames

```text
20260729140357_4d9705bd-4e5e-41a4-aec8-4d3fc1d29afd.sql
20260730124656_a988f3c2-4b43-4b08-b449-a46498021f35.sql
20260911162120_add_tender_lots_and_requirement_lot_scope.sql
20260911162125_tighten_tender_lot_schema.sql
20260925160000_g34_company_scoped_tender_evidence.sql
20260925160100_g35_scope_tender_storage_to_persisted_tender.sql
20260925160200_g35_tender_storage_authorization.sql
20260928124212_g34_company_authorization_boundary.sql
20260928124236_g34_harden_risk_functions_and_read_paths.sql
20260928124252_g34_expose_company_members_read.sql
20260928124639_g35_company_storage_authorization.sql
20260928124650_g35_allow_prebind_company_uploads.sql
20260928124743_g34_grant_private_schema_usage.sql
20260928125214_g38_rls_initplan_and_hotpath_indexes.sql
20260928125412_g38_remove_redundant_hotpath_indexes.sql
20260928130000_g34_owner_company_creation_rpc.sql
```

## Mismatches that block baseline reconstruction

- Only 10 of the 16 repository filename timestamps exactly match a version in the live ledger.
- The repository includes a file timestamped `20260729140357`, while the live ledger records the related migration version as `20260729140358`.
- The repository G34/G35 files dated `20260925160000`, `20260925160100`, and `20260925160200` do not exactly match the live ledger's G34/G35 entries dated `20260925150612`, `20260925150643`, and `20260925150703`.
- The repository contains `20260928125412` and `20260928130000`; the live ledger instead has later G38/G34 entries at `20260928125333` and `20260928125509`. Similar names are not proof of identical SQL.
- The live ledger contains many versions absent from the repository filenames. The complete live ledger must be exported and reconciled against the content and checksums of every candidate SQL file before staging can be built safely.

## Required next steps

1. Export the complete live migration ledger and the exact SQL contents that originally produced it, where recoverable from Git history or deployment artifacts.
2. Compare each migration by version, logical intent, SQL content, and checksum. Record missing, renamed, duplicated, reordered, and divergent migrations separately.
3. Inspect the current live schema read-only and compare it with the result expected from the reconciled migration history.
4. Prepare a staging-only baseline/replay plan from verified source SQL, review it, and test it on a disposable isolated database before applying it to the empty staging project.
5. Keep PR #60 unapplied and production frozen until the staging schema is reproducible and authenticated isolation tests pass.

## Release decision

**BLOCKED — provenance is incomplete.** Do not manufacture placeholder migrations, edit the live ledger to make counts agree, replay guessed SQL, or apply this recovery to production.
