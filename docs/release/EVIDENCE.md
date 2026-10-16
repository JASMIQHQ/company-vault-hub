# JASMIQ Release Evidence Register

Last reviewed: 2026-10-16

This register records evidence, not intentions. A gate is not PASS until its linked run, tested commit, and acceptance result are recorded. `NOT PROVEN` is a release blocker, not a soft pass.

| Gate | Required evidence | Current status | Evidence / notes |
|---|---|---|---|
| G01 — Lint parity | Same toolchain and lint command on exact base/head commits; zero newly introduced findings; raw outputs retained | IN IMPLEMENTATION | This branch adds a base/head comparison runner to the Quality Gate. Await its first CI result before accepting it. |
| G02 — Quality Gate/build | Lint parity outcome plus build executed and passed on the candidate | NOT PROVEN | Previous run 38894261234 failed full-repository lint (3,888 reported findings); build was skipped. The new gate must prove build runs independently. |
| G03 — Issue #11 isolated regressions | Final PR commit passes isolated tests | PASS — ISOLATED ONLY | Run 38894261228 passed. This does not prove live database persistence. |
| G04 — Verification write integrity | Defined and tested outcome for each partial-write failure | NOT PROVEN | Current helper performs sequential writes; no atomic database transaction has been proven. |
| G05 — Live verification acceptance | Controlled test proves 503/mismatch preserve prior facts and later success appends facts | NOT PROVEN | No production verification or live end-to-end acceptance has been claimed. Use an isolated test environment. |
| G06 — Issue #12 tender regression | Locked NUPRC/NITDA fixtures and per-requirement export | NOT PROVEN | Reconcile historical baseline counts before setting expected values. |
| G07 — Requirement-kind/readiness rules | Procedural/general requirements excluded from document matching and readiness denominator; eligibility sent to review | NOT PROVEN | Must be validated against actual requirement data and current status vocabulary. |
| G08 — PR #48 matcher | Golden cases and fixture exports pass without ranking or isolation regressions | NOT PROVEN | Keep matcher changes isolated from visual and migration work. |
| G09 — G34/G35 isolation | Authenticated two-company positive and negative tests across database, function, and storage paths | NOT PROVEN | Service-role queries alone are not sufficient evidence. |
| G10 — SECURITY DEFINER audit | Function inventory, body/grants/search_path/caller review, disposition for every function | NOT PROVEN | Previously identified inventory: 19 functions; re-count from live state. |
| G11 — RLS and grants | Effective access matrix for exposed tables, including authenticated grants and policies | NOT PROVEN | Previously identified concern set: 16 tables; re-count and validate. |
| G12 — Migration provenance | Exact live/Git migration reconciliation and reviewed recovery plan | NOT PROVEN | Earlier counts (66 live vs 16 Git, reported gap 57) are historical leads, not a verified current inventory. No replay/push authorized by this register. |
| G13 — Edge Function parity | Source/version comparison for release-critical deployed functions | NOT PROVEN | Preview hosting status does not prove Supabase function parity. |
| G14 — Tender Command usability | Analysis state, stored-result labelling, errors and mandatory blockers accepted | DEFERRED | Start after trust gates; no schema assumptions without inspection. |
| G15 — Vault usability | Multi-upload, search/filter, details and expiry workflow accepted | DEFERRED | Prefer existing schema until a separate schema review justifies change. |
| G16 — Readiness correctness | Explainable denominator, no procedural inflation, mandatory blockers surfaced | NOT PROVEN | Must be tested against locked tender fixtures. |
| G17 — Tender deletion | Approved impact plan and organization-scoped soft-delete design | NOT AUTHORIZED | No column, policy, RPC, or data changes until the plan and implementation scope are reviewed. |
| G18 — Visual system | Isolated visual branch, accessible responsive review, functional regression pass | DEFERRED | Keep separate from security, matcher, migration and verification changes. |
| G19 — Phase A/B polish | Acceptance checks for audit, expiry, manual review, comparison and membership workflows | DEFERRED | Split into independently reviewable PRs. |
| G20 — Phase C/D expansion | Per-feature spec, source grounding, authorization and failure behaviour | DEFERRED | No billing or AI expansion before core trust gates. |
| G21 — Release review | All mandatory gates PASS or explicitly risk-accepted by authorized release owner | BLOCKED | No production release while a critical gate remains FAIL or NOT PROVEN. |

## Release controls

- Keep PR #57 Draft until its checks, acceptance pack, and review are complete.
- Do not treat preview Ready as evidence of live Edge Function parity or production data integrity.
- Do not apply migrations, deploy Edge Functions, change production data, or merge release code merely to make a gate green.
- Record the exact tested commit SHA and workflow URL for every future PASS.
