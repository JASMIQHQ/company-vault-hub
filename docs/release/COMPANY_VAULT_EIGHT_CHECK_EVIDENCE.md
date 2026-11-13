# Company Vault — Eight-Check Acceptance Evidence Pack

Status: **NOT RUN**. This document is a test record template, not evidence that the application passed.

Scope: Sprint 1 Company Vault only. Do not expand scope or change the backend as part of this check.

## Safety gate before testing

1. Open the intended published preview and confirm which Supabase project it uses from the deployment's existing configuration or authorized deployment settings.
2. **STOP before login or upload if the preview points at production or the backend target cannot be established.** Do not upload test files, create test rows, or alter real company data in production.
3. Use only an approved non-production environment and a dedicated test account belonging to a test organization. Do not paste access tokens, passwords, signed URLs, or personal/company documents into this record.
4. Use a harmless, non-sensitive PDF you are authorized to upload, under the documented 25 MB application limit. Keep a local copy and record its filename and byte size.
5. Record the exact preview URL, deployment ID, Git commit SHA, test date/time (with timezone), browser, and test account label (not email or credentials).

If a safe backend and dedicated test account are unavailable, mark the run **BLOCKED — SAFE TEST ENVIRONMENT NOT CONFIRMED** and stop. A visual page load alone is not a pass.

## Run record

- Test run ID:
- Date/time and timezone:
- Published preview URL:
- Deployment ID:
- Git commit SHA:
- Backend project identifier (non-secret):
- Test account label / test organization label:
- Browser and version:
- PDF filename:
- PDF size in bytes:
- Tester:
- Result: **NOT RUN / PASS / FAIL / BLOCKED**

## Acceptance checks

Record PASS only when the observable result and supporting evidence are present. If any step fails, record the exact error and stop dependent steps where appropriate.

| # | Check | Procedure | Evidence to capture | Result |
|---|---|---|---|---|
| 1 | Login | Sign in using the dedicated test account through the existing authentication flow. | Redacted screenshot showing successful authenticated page; timestamp and commit SHA. | NOT RUN |
| 2 | Organization resolved | Confirm the Vault opens in the test account's correct organization without manually changing IDs or selecting another company's data. | Redacted screenshot of the resolved organization context; do not expose other tenants' data. | NOT RUN |
| 3 | Real PDF upload | Upload the approved, non-sensitive PDF through the normal UI. | Screenshot of the selected file and successful UI result; filename and byte size. | NOT RUN |
| 4 | Object persisted in existing bucket | Using authorized read-only backend inspection, confirm the object exists in the existing approved company-documents storage location under the expected organization path. Do not create a bucket or change policy. | Redacted object metadata/path and bucket name; no signed URL or secret. | NOT RUN |
| 5 | Database row persisted | Using authorized read-only inspection, confirm one corresponding row exists in the existing `company_documents` table and references the expected organization and stored object. Do not assume or invent column names. | Redacted row identifier and only the verified relevant fields; no tokens or document contents. | NOT RUN |
| 6 | Item appears in list | Refresh the Vault and confirm the uploaded item appears with the supported name/type/upload-date/analysis-status fields. | Screenshot showing the item and its visible status. | NOT RUN |
| 7 | Signed preview works | Use the normal UI preview action and verify the PDF renders for the authorized test user. | Screenshot of the rendered PDF with content obscured; record pass/fail and time. Do not save the signed URL. | NOT RUN |
| 8 | Signed download works | Use the normal UI download action and verify the downloaded file opens and matches the uploaded test PDF. | Downloaded-file name/size and a local comparison result; do not attach sensitive file contents. | NOT RUN |

## Final acceptance

- Checks passed: __ / 8
- Checks failed: __ / 8
- Checks blocked/not run: __ / 8
- Evidence folder or CI artifact link:
- Defects/issues opened:
- Reviewer:
- Review date:
- Overall decision: **NOT ACCEPTED / ACCEPTED FOR REVIEW**

Acceptance requires all eight checks to pass in a confirmed safe test environment, with evidence tied to the exact deployed commit. If the deployment's backend target cannot be confirmed, the overall decision remains **BLOCKED**, regardless of the page rendering successfully.

## Non-goals and prohibitions

- No production upload or test fixture.
- No schema, migration, RLS, bucket, storage policy, or Auth setting changes.
- No dummy/mock backend or fabricated evidence.
- No testing another company's access using real production records.
- No work on tenders, matching, proposals, tasks, reminders, reports, or AI assistant in this Sprint 1 acceptance run.
