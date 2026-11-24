# Tender editor browser acceptance

The Playwright suite exercises the deployed **staging/preview** application using two dedicated accounts and one disposable staging tender. It is intentionally manual because the tests perform authenticated writes and restore the tender title after each owner test.

## Required GitHub Actions secrets

Configure these in the repository's Actions secrets. Do not commit browser storage-state files or paste their contents into chat.

- `PLAYWRIGHT_BASE_URL`: the reachable Vercel Preview URL for the PR branch (not the production URL).
- `PLAYWRIGHT_TENDER_ID`: UUID of a dedicated staging tender used only for browser acceptance.
- `PLAYWRIGHT_OWNER_STORAGE_STATE_B64`: base64-encoded Playwright storage-state JSON for a staging organization owner who is also a member of the tender's company.
- `PLAYWRIGHT_VIEWER_STORAGE_STATE_B64`: base64-encoded Playwright storage-state JSON for a staging viewer in the same organization/company.

The storage states must be created from dedicated staging test accounts. Never use a production account or production URL. Keep the tender's initial title free of concurrent edits while the workflow runs.

## Staging fixture requirements

Before dispatching the workflow, ensure the dedicated tender:
- belongs to the staging organization and company shared by the owner and viewer;
- is readable by both test accounts;
- is editable by the owner through `update_tender_details`;
- is not used by ordinary users or another test run.

The suite changes only the tender title. Owner tests restore the original title in `afterEach`; the viewer test verifies the title remains unchanged. If a runner is terminated before cleanup, restore the title manually in staging before re-running.

## Run

From GitHub Actions, select **Tender editor browser acceptance**, choose the PR feature branch, and run the workflow. It installs Playwright temporarily without editing the application's Bun lockfile, installs Chromium, then runs the owner-save, stale-second-tab, and viewer-denial cases.

The workflow is deliberately `workflow_dispatch` only. It is not a production deployment workflow and does not apply migrations. A green browser run is not a substitute for the separate staging SQL checks already recorded in PR #94.
