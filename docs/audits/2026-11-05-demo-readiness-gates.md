# JASMIQ demo-readiness gates

This runbook is for the first controlled staging demonstration. It does not authorize production changes.

## Current environment facts

- Production project: `itqepknvdiedldcyunig`
- Staging project: `rmtoaaxnuwsecmajhwjx`
- Production currently has 57 public application tables and 66 applied migration versions.
- Staging currently has no public application tables and no applied migrations.
- Production has two private Storage buckets: `company-documents` and `tender-files`.
- Staging currently has no Storage buckets.

## Required order

1. Merge the reviewed migration and Edge Function changes only after all required checks pass.
2. Dispatch the read-only `Staging migration plan (read-only)` workflow from `main`, using the exact reviewed source commit SHA.
3. Inspect the plan artifact, remote migration ledger, and every SQL statement. Do not apply if any unexpected drop, rewrite, extension change, or production reference appears.
4. Run the separate staging apply workflow only after the plan is approved and the `jasmiq-staging` environment approval is configured.
5. After migrations succeed, create the two private Storage buckets using `supabase/ops/ensure-required-storage-buckets.sql` against staging only.
6. Verify the buckets exist and are private; verify the migration ledger and expected tables, policies, triggers, and functions.
7. Deploy the five repository-backed Edge Functions and verify their required secrets exist in staging.
8. Run document lifecycle, tenant-isolation, Storage object-path, and end-to-end tender readiness tests before preparing demo data.

## Preview environment isolation

The repository's committed `.env` file currently contains the production Supabase URL and publishable key. Vercel Preview builds must explicitly override `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the staging project URL and staging publishable key before anyone uses a preview for test data. Keep the Production context pointed at production.

Do not assume a Preview deployment is connected to staging just because its URL contains a Git branch name. Verify the runtime Supabase project reference in the browser's network requests or a controlled app diagnostic before uploading anything. Apply the same check to Netlify Deploy Previews.

## GitHub staging environment prerequisites

The GitHub Actions environment named `jasmiq-staging` must have a required reviewer and these environment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `STAGING_PROJECT_REF` set to `rmtoaaxnuwsecmajhwjx`
- `STAGING_DB_PASSWORD`

Do not put these values in repository files, workflow inputs, or chat messages. The workflow hard-rejects any project reference other than the staging project.

## Storage provisioning

The migration history defines Storage object policies but does not create the bucket rows. A fresh staging project therefore needs the two private buckets provisioned separately. The SQL script is idempotent and mirrors the production bucket names and private visibility.

After running the script, verify:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('company-documents', 'tender-files')
order by id;
```

Expected: exactly two rows, both with `public = false`.

## Edge Function secrets to confirm in staging

- `LOVABLE_API_KEY` for tender analysis, bid-structure detection, and document analysis.
- `AI_PROVIDER=gemini` and `GEMINI_API_KEY` for document verification (Gemini is the function default).
- If Anthropic is selected instead: `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.
- `GEMINI_MODEL` / `ANTHROPIC_MODEL` are optional overrides; the function has defaults.
- Supabase URL and service-role credentials are supplied by the Supabase runtime; never put service-role credentials in browser variables.

## Acceptance tests before a client demonstration

- Owner can access only their company workspace.
- A legacy-backfill company membership is denied.
- A different company's user cannot read or mutate documents, tenders, Storage objects, verification attempts, or verified facts.
- Upload, overwrite, download, signed URL, rename, and delete paths are tested against both private buckets.
- Verification pending → verified creates one fact linked to the exact successful attempt.
- Verified → mismatch and mismatch → failed append attempts without deleting or rewriting prior successful facts.
- Failed → verified records a new successful attempt and preserves the prior audit history.
- A low-confidence verification fact remains low-confidence.
- Matching, missing-document counts, and readiness percentages agree with the underlying requirements and evidence.
- No screen reports success when its backend operation failed.

## Release boundary

A successful preview build is not a successful application acceptance test. Do not call JASMIQ production-ready until the staging checks above pass. Do not run migrations, bucket provisioning, or Edge Function deployments against production as part of this exercise.
