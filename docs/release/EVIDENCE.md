# JASMIQ Release Evidence Register

**Purpose:** Record evidence, not assurances. A successful build alone is not database, security, or feature acceptance. Production remains frozen unless a separate release approval is recorded.

## Gate register

| Gate / Work package | Status | Evidence (run/PR/report) | Reviewer / date | Notes |
|---|---|---|---|---|
| R0 Release controls | AUDIT_REQUIRED | Pending repository/settings audit | — | Verify real checks before ruleset |
| A2 Migration provenance | BLOCKED | PR #56 | — | Content and SQL review required |
| A2 Staging rebuild | BLOCKED | PR #67 | — | Dry-run plan review and independent apply approval required |
| A3 Verification integrity | AUDIT_REQUIRED | PR #68 | — | Staging regression not yet proven |
| A4 Tenant isolation | BLOCKED | Pending staging suite | — | Positive and negative tests required |
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
