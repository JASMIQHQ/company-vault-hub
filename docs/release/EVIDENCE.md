# JASMIQ Release Evidence Register

Last reviewed: 2026-10-22

This register distinguishes code existence from verified release acceptance. A gate may only be marked PASS when the evidence identifies the exact commit and a successful test/run. "Not proven" is not a pass.

## Release gates

| Gate | Current status | Evidence / remaining action |
|---|---|---|
| Repository install and production build | PASS for the latest recorded PR #59 code commit only | G25-G30 build verification run #204 passed `bun install --frozen-lockfile` and `bun run build` for commit `5604080726507ea0d6b44e522bca3d0ef92ca432`. This does not prove production parity. |
| Lint quality gate | BLOCKED | Quality Gate run #104 failed on the existing lint baseline (3,894 findings: 3,876 errors and 18 warnings); lint parity work is in open PR #58. The build passing separately does not clear lint. |
| Two-user authenticated company isolation (G34/G35) | NOT PROVEN | PR #59 syntax check passed, but the authenticated two-user job was skipped on the PR event as designed. Run the manual staging workflow with two distinct normal-user tokens and populated positive-control fixtures. |
| Company/organisation consistency hardening | NOT PROVEN | PR #60 contains a proposed migration and static guard. No production migration was applied. Test on disposable staging, including red-without-fix / green-with-fix evidence before merge. |
| Migration provenance and semantic replay | BLOCKED | PR #56 reports 66 live ledger entries and a 66-file recovery set, but filename/version alignment does not prove semantic replay fidelity. Independently review the diff in a disposable environment. Do not reset or modify production to test replay. |
| Company Vault eight-step E2E | NOT PROVEN | Run a Playwright test against a preview with a dedicated seeded test user: login, automatic workspace resolution, real PDF upload, object persisted, database row persisted, list display, signed preview, signed download. |
| Storage access and signed URL safety | NOT PROVEN | Read live bucket visibility, size/MIME limits and storage object policies; test cross-company access, guessed paths and traversal with separate authenticated users. Do not change bucket settings until existing constraints are verified. |
| Verification integrity (Issue #11 / PR #57) | NOT PROVEN end-to-end | Isolated regression work exists; verify tests and review CI, then validate deployed function parity. Production Gemini failure simulation requires explicit approval and a safe fixture. |
| Matcher acceptance (Issue #12 / PR #48) | NOT PROVEN | PR #48 reports passing golden tests, but it remains open/draft and production `match-tender-evidence` was last recorded as v33. Complete NUPRC/NITDA fixture runs twice, inspect all final statuses, verify correct-company evidence and idempotence, then verify deployed source parity. |
| Production commit identity | NOT PROVEN | Add a server route only after confirming the actual TanStack Start/Nitro route conventions and deployment adapter. Verify the endpoint against the reviewed `main` SHA; do not assume a Vercel-only environment variable is available on Netlify. |
| SECURITY DEFINER functions, RLS and Auth settings | AUDIT INCOMPLETE | The last read-only inventory found 57 public tables, all RLS-enabled, 43 public policies and 29 public SECURITY DEFINER functions. Review each function's body, grants and search-path behavior; verify storage policies and Auth settings before any changes. |
| Production release approval | NOT APPROVED | Keep production unchanged until every required core gate above has commit-specific evidence and independent review. |

## Product scope control

The repository README defines Sprint 1 as Company Vault only and explicitly prohibits speculative schema changes, new tables/buckets, mock data and work beyond Sprint 1 until all eight Vault acceptance checks pass. The broader procurement roadmap (verification, matching, proposals, tasks, notifications, reports and assistant) is downstream work; it must not be mixed into the Vault release gate.

## Safety rules

- No production migrations, data repairs, Edge Function deployments or releases without verified staging results and explicit approval.
- Do not invent schema, column names, RPC parameters, bucket limits or route conventions.
- Do not mark a test PASS when it skipped or ran only against an in-memory fixture.
- Keep one pull request per gate and attach the exact commit SHA and workflow run URL.