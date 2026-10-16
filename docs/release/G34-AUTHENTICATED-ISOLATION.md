# G34 authenticated company-isolation acceptance

This test verifies the authorization boundary through the Supabase Data API using two normal authenticated user access tokens. It deliberately does not use the service-role key and makes read-only requests only.

## Required staging fixture

Use a dedicated staging Supabase project, never production credentials for this acceptance run.

- Company A and Company B must be different legal-company records.
- User A must be an active member of Company A and **not** Company B.
- User B must be an active member of Company B and **not** Company A.
- Each company must have at least one existing Vault document and one existing tender.
- Tender A and Tender B must belong to their respective companies.
- The users must have valid access tokens from normal sign-in; do not paste tokens into workflow inputs or commit them.

The current production workspace has historically backfilled the same profile into both companies. Such a user cannot prove the negative case; the test should fail rather than mislabel that arrangement as isolated.

## Configure repository Actions secrets

Create these GitHub Actions secrets for the repository:

- `G34_STAGING_SUPABASE_URL`
- `G34_STAGING_SUPABASE_ANON_KEY`
- `G34_STAGING_USER_A_ACCESS_TOKEN`
- `G34_STAGING_USER_B_ACCESS_TOKEN`

Tokens should belong to dedicated staging test users and should be rotated when no longer needed. Never configure a service-role key for this workflow.

## Run the acceptance test

Open **Actions → G34 Authenticated Company Isolation → Run workflow** and enter the four staging UUIDs:

- Company A ID
- Company B ID
- Tender A ID
- Tender B ID

The workflow checks positive access to each user's own Vault document and tender, then checks cross-company denial for Vault documents, tenders, tender requirements, tender files, compliance matches, and generated documents.

A PASS is evidence for the exact staging project and fixture only. It does not by itself authorize a production deployment. A missing secret, invalid fixture, unexpected API error, or visible cross-company row fails the run.
