# JASMIQ Release Evidence Register

**Purpose:** Record evidence, not assurances. A successful build alone is not database, security, or feature acceptance. Production remains frozen unless a separate release approval is recorded.

## Gate register

| Gate / Work package | Status | Evidence (run/PR/report) | Reviewer / date | Notes |
|---|---|---|---|---|
| R0 Release controls | AUDIT_REQUIRED | [Active repository ruleset #25160251](https://github.com/JASMIQHQ/company-vault-hub/rules/25160251) | 2026-11-03 audit | 1 approval + five required contexts present; stale-review dismissal, CODEOWNERS enforcement, last-push approval and review-thread resolution are OFF. CODEOWNERS file added in PR #69; ruleset still needs authorized settings update. Environments/reviewer gates and secrets not verified. |
| A2 Migration provenance | BLOCKED | [PR #56](https://github.com/JASMIQHQ/company-vault-hub/pull/56); [WP #70](https://github.com/JASMIQHQ/company-vault-hub/issues/70) | — | Filename parity is not SQL provenance; content/risk review required |
| A2 Staging rebuild | BLOCKED | [PR #67](https://github.com/JASMIQHQ/company-vault-hub/pull/67); [WP #73](https://github.com/JASMIQHQ/company-vault-hub/issues/73) | — | Separate plan/apply workflows drafted; syntax, environment reviewer and staging-only secrets still need validation |
| A3 Verification integrity | BLOCKED | [PR #68](https://github.com/JASMIQHQ/company-vault-hub/pull/68); [WP #71](https://github.com/JASMIQHQ/company-vault-hub/issues/71) | — | Preserve historical success; behavioral regression needed |
| A4 Tenant isolation | BLOCKED | [WP #72](https://github.com/JASMIQHQ/company-vault-hub/issues/72) | — | Positive and negative tests required across RLS/RPC/storage/functions |
| Vault acceptance | AUDIT_REQUIRED | Pending | — | Upload/verify/replace/history |
| Tender Command acceptance | AUDIT_REQUIRED | Pending | — | Deterministic fixtures/readiness |
| Compliance rules | DESIGN_REQUIRED | Pending | — | Source/version/applicability |
| Document intelligence | AUDIT_REQUIRED | Pending | — | Real provider and queue evidence |
| Capability matching | DESIGN_REQUIRED | Pending | — | Evidence-backed deterministic qualification |
| Submission workspace | DESIGN_REQUIRED | Pending | — | Independent approval and immutable package |
| Workflow / notifications | DESIGN_REQUIRED | Pending | — | Idempotency and authorization |
| Reporting | AUDIT_REQUIRED | Pending | — | RLS and formula reconciliation |
| Opportunities | DESIGN_REQUIRED | Pending | — | Source provenance/freshness |
| SaaS / platform / Copilot | DESIGN_REQUIRED | Pending | — | Isolation, operations, commercial gates |

## Evidence entry template

For each run, add:
- **Gate / PR / commit:**
- **Environment/project ref:** (never include secrets)
- **Workflow run URL:**
- **Test command / suite:**
- **Result:** PASS / FAIL / NOT PROVEN
- **Schema/ledger fingerprint (if applicable):**
- **Security/isolation result:**
- **Reviewer and timestamp:**
- **Known exceptions / follow-up:**
- **Production impact:** NONE / separately approved

## Release rule

No gate is accepted based only on a preview build, migration filename parity, screenshots, or a verbal confirmation. Link the raw test/run evidence and record the reviewer decision.
