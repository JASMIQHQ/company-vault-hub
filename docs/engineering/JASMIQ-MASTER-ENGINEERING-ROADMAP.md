# JASMIQ Master Engineering & Feature Register

**Status:** Planning baseline — not a release certification  
**Last reviewed:** 2026-11-03  
**Production safety:** Production Supabase project `itqepknvdiedldcyunig` is frozen. No production SQL, migrations, storage changes, Edge Function deployment, or data mutation is authorized by this document.

This register is the single planning index for JASMIQ. It is deliberately evidence-led: existing UI or a successful frontend build does not count as a verified backend feature. Before implementing any item, inspect the repository and current schema so we extend existing work instead of creating duplicate modules or tables.

## Operating rules

1. **One work package per PR.** Small, reviewable changes; no unrelated refactors.
2. **No production writes.** Development/staging only until explicit release approval and a separate production gate.
3. **No guessed schema.** Verify table/column/function names against the target schema before authoring migrations.
4. **Migration discipline.** Every migration has a rationale, rollback/forward-recovery plan, automated regression test, staging execution evidence, and reviewer approval. Rollback SQL is not assumed safe if data has been transformed.
5. **Tenant isolation is a release blocker.** Every table, RPC, storage path, view, export, worker and AI retrieval must be company/organization scoped and tested with positive and negative cases.
6. **Deterministic decisions stay deterministic.** AI may extract, summarize and suggest; database/application rules validate facts, calculate readiness and authorize actions. AI cannot invent evidence, declare compliance, bypass RLS, or submit tenders.
7. **Human approvals remain explicit.** Exceptions, verified facts, capability approval and final submission approval must be traceable to an authorized person.
8. **Evidence beats narrative.** A feature is not VERIFIED until its acceptance tests and evidence are recorded. A preview build is not a database replay or security proof.
9. **No duplicate implementation.** Audit current code, migrations, Edge Functions and UI first; reuse or repair before adding.
10. **Stop on ambiguity.** Unexpected schema drift, destructive SQL, policy gaps, failed tests or production identifiers in a staging workflow means stop—not improvise.

## Status vocabulary

`DISCOVERED` → `AUDIT_REQUIRED` → `DESIGN_REQUIRED` → `BLOCKED` / `READY` → `IN_PROGRESS` → `IMPLEMENTED` → `TESTING` → `VERIFIED` → `ACCEPTED` → `RELEASED`

Use **NOT PROVEN** whenever evidence is missing. “Implemented” and “verified” are different states.

## Stage A — Foundation and release gates (highest priority)

### A1 — Release controls (R0)
**Status:** AUDIT_REQUIRED  
**Scope:** main branch protection, required checks, CODEOWNERS, GitHub environments, secrets boundaries, version endpoint, release evidence.
- Inspect current rulesets and workflows before changing them; don't replace existing valid rules blindly.
- Confirm required status-check names actually exist and are stable. Do not configure guessed check names.
- Require PR review, stale-review dismissal, resolved threads, and no direct push/deletion where supported by repository plan.
- Ensure staging and production environments have independent secrets and reviewer gates; environment names alone do not create approval protection.
- Expose deployed commit SHA through a version endpoint and compare it to the workflow SHA after deployment.
- Keep one release evidence row per gate in `docs/release/EVIDENCE.md`.

**Acceptance:** protected-main behavior is demonstrated; checks are real and required; staging/prod secrets are isolated; deployed SHA matches the release commit; evidence is linked.

### A2 — Migration provenance and staging reconstruction (PR #56 / #67)
**Status:** BLOCKED pending SQL review and a genuinely independent apply gate  
**Scope:** reconcile migration files with the production ledger; inspect every SQL file; safely reconstruct the empty staging project.
- Compare migration filenames and content checksums to the live migration ledger; document reconstructed/deleted versions and explain every difference.
- Risk-review all destructive statements, grants, SECURITY DEFINER functions/search_path, RLS/policies, triggers, storage, extensions and dependencies.
- Correct PR #67 so dry-run and apply are separate approval stages; the current workflow summary text is not itself an approval gate.
- Verify GitHub environment required reviewers are configured; review the complete plan artifact before approving apply.
- Rebuild only staging project `rmtoaaxnuwsecmajhwjx`; reject production ref `itqepknvdiedldcyunig` at multiple workflow steps.
- Compare migration ledger, schema fingerprint, table/index/policy/trigger/function/grant inventory; classify every difference.
- Deploy the five required Edge Functions to staging and verify function configuration, JWT behavior, secrets and private storage buckets.

**Acceptance:** staging is reproducible from reviewed source; all expected migrations are accounted for; schema differences are explained; no production action occurred; evidence includes plan, run, ledger, fingerprint and test results.

### A3 — Verification fact integrity (PR #68)
**Status:** AUDIT_REQUIRED / TESTING_REQUIRED  
**Scope:** facts only arise from successful verification attempts.
- Enforce fact-to-attempt relationship in the database: attempt belongs to same document and company and outcome is success.
- Mismatch/failed/timeout attempts never create verified facts. A later success appends a new fact; it does not rewrite history.
- Clean historical invalid facts through a tightly scoped, audited mechanism that preserves append-only protections.
- Run the regression SQL on staging, including success, mismatch, failure/503, retry, cross-company and historical cleanup cases.
- Preserve attempts and audit history through archive, replacement and document deletion.

**Acceptance:** regression passes on staging; zero facts reference non-success attempts; no cross-company write; audit remains traceable.

### A4 — Tenant isolation and security certification
**Status:** BLOCKED until staging is reconstructed  
- Inventory all public tables, RLS policies, grants, views, RPCs, SECURITY DEFINER functions, Edge Functions and Storage buckets.
- Test same-company allowed access and cross-company denied access for documents, tenders, requirements, files, matches, generated documents, capabilities, tasks, submissions and reports.
- Test guessed storage paths, upload/download/delete/signed URLs, RPC authorization, removed-member revocation, owner-only actions and unauthenticated/bad JWT Edge Function requests.
- Review every privileged function: keep, SECURITY INVOKER, move to private schema, or revoke; fix search_path and authorization checks.
- Make audit logs append-only for ordinary roles; verify service/maintenance path is controlled.
- Enable strong authentication controls (password protection, suitable minimum length and owner MFA) after reviewing account impact.

**Acceptance:** positive and negative isolation suite is green; suite fails if a critical policy is removed; all advisor findings are explained or remediated; no browser service-role key.

## Stage B — Operational product

### Phase 4 — Vault
**Status:** AUDIT_REQUIRED  
Existing: document repository, categorization, verification, expiry, coverage and Bin foundations.
- Upload queue with per-file hashing, validation, progress, retry and independent failure state.
- Duplicate detection scoped by company and active/non-superseded documents.
- Search and filters (active, verified, mismatch, expired, expiring) reflected in URL parameters.
- Version/supersession history; preserve old file, hash, verification attempts and facts.
- Bin soft-delete/restore and controlled purge policy; purge must never erase audit or verification history.
- Secure preview/download; log access before issuing signed URLs.
- RLS-filtered CSV export, bulk actions, document register and expiry notifications.

**Acceptance:** upload → verify → replace → history works in staging; old version remains retrievable; eight-check Playwright suite passes; all actions are tenant-scoped and audited.

### Phase 5 — Tender Command
**Status:** AUDIT_REQUIRED  
- Create/import tender; edit and approve requirements; preserve analysis runs and changes.
- Requirement identity uses stable requirement codes, not wording alone; maintain aliases for extraction variants.
- Matching states: Matched, Needs Review, Missing (plus expired/blocked as applicable). Matched is not automatically compliant.
- Human override requires authorized role, reason, evidence and audit record; matcher never silently overwrites accepted overrides.
- One canonical readiness calculation shared by UI and exports; define denominator and mandatory blockers explicitly.
- Per-requirement explanation includes evidence, verification basis, company, validity and review status.
- Tender lifecycle, milestones/deadlines, checklist, compliance matrix, missing-document and readiness exports.

**Acceptance:** NUPRC/NITDA fixtures produce deterministic identical results on repeat; no duplicate matches; readiness and exports agree.

### Phase 6 — Company capability matching
**Status:** DESIGN_REQUIRED  
- Evidence-backed company capability profile: categories, registrations, regulatory status, financial/technical experience, personnel, equipment and geography.
- Capability versions; approved versions are immutable and superseded by new versions.
- Approval requires evidence and an authorized reviewer.
- Deterministic tender matching returns Qualified / Gap / Needs Review with evidence IDs and reasons.
- Report what the company qualifies for, what is missing and what needs human review.

**Acceptance:** unsupported capability cannot be approved or reported as qualified; evidence is traceable and company-scoped.

### Phase 7 — Document intelligence / AI engine
**Status:** AUDIT_REQUIRED  
- Real provider abstraction; no fabricated/mock responses.
- Queue-based processing with idempotency, retries/backoff, dead-letter state and observable failures.
- Text extraction; OCR fallback for image/scanned PDFs; low-confidence output becomes review.
- Schema-validated extraction of metadata, expiry, classifications and tender requirements.
- AI outputs are suggestions; verified facts require the A3 success path and authorized verification.
- Provider/model usage, latency, errors, token/cost accounting and organization caps.
- UI shows processing, review, failure and exhausted quota states.

**Acceptance:** provider 503 retries/recovery without fact loss; duplicate dispatch creates one active job; invalid model JSON is rejected; deterministic matching remains unchanged.

### Phase 8 — Compliance intelligence
**Status:** DESIGN_REQUIRED  
- Versioned, source-cited federal procurement rule catalogue first; later state, sector and international/DFI frameworks.
- Stable rule/requirement codes, evidence types, applicability conditions, validity rules and effective dates.
- Alias mapping from extracted wording to stable code.
- Applicability engine; approved exceptions with reason; status history and framework versioning.
- No unsourced or silently hardcoded compliance claims.

**Acceptance:** wording changes retain identity; rule updates create a new version without rewriting prior assessments; every rule cites an authoritative source.

### Phase 9 — Tender submission workspace
**Status:** DESIGN_REQUIRED  
- Submission drafts, checklist, evidence attachments, technical/financial/profile sections and version snapshots.
- Independent reviewer approval; preparer cannot approve own submission.
- Mandatory requirements satisfied or explicitly accepted; documents valid through deadline.
- Lock approved package; changes rejected after lock.
- Generate ZIP package and manifest with hashes; preserve package versions.
- Human records submitted action, timestamp and optional receipt; JASMIQ does not submit externally.
- Grounded drafting only; unresolved `[MISSING: ...]` items block approval.

**Acceptance:** self-approval fails; locked package cannot change; manifest hashes match files; submit action is human-attributed.

## Stage C — Procurement intelligence and collaboration

### Phase 10 — Opportunity intelligence
**Status:** DESIGN_REQUIRED  
- Approved source registry, terms/use review and ingestion schedule.
- Federal/state/DFI sources with provenance, source URL, fetched time, freshness, content hash and change history.
- Deduplicated opportunity records, search/filter, deadline, buyer/category/location, watchlist and alerts.
- Suitability combines approved capability evidence, requirements and deadline; score must show gaps.
- Hide closed opportunities by default; source errors/freshness visible.

**Acceptance:** repeat ingestion has no duplicates; changes are recorded; every listing has source and fetch timestamp; no unreviewed scraping.

### Phase 11 — Workflow and collaboration
**Status:** DESIGN_REQUIRED  
- Assign tender/requirement/document tasks to actual company members only.
- Gap-generated tasks are idempotent; assignee membership is checked server-side.
- Task status, due dates, comments, completion evidence, review queue and approvals.
- Overdue escalation and delegation with audit.

**Acceptance:** non-member assignment fails; rerunning gap-task generation creates no duplicate; all actions are permission-checked.

### Phase 12 — Notifications and deadlines
**Status:** DESIGN_REQUIRED  
- In-app/email notifications for expiry, closing dates, missing evidence, reviews, approvals, tasks and processing failures.
- Preference controls and delivery/error history.
- Daily scheduled checks with dedupe keys and idempotent delivery.
- Deadline changes notify affected authorized members.
- WhatsApp/SMS/calendar are later integrations, not MVP dependencies.

**Acceptance:** running scheduler twice emits one event per trigger; retries do not duplicate delivery.

### Phase 13 — Reporting and analytics
**Status:** AUDIT_REQUIRED  
- Company compliance, document register/expiry, tender readiness/gaps, capability, opportunities, submissions/outcomes, task completion and audit reports.
- RLS-aware/security-invoker views or scoped queries; browser CSV exports reflect only visible authorized rows.
- KPI formula documented; all metrics from real records, never invented.
- PDF reports generated from authorized data.

**Acceptance:** cross-company report access denied; displayed figures reconcile to source query and formula.

## Stage D — SaaS and platform operations

### Phase 14 — Organization, roles and administration
**Status:** AUDIT_REQUIRED  
- Organization/company onboarding, invitations, memberships, ownership transfer, member removal and role management.
- Roles: Owner, Admin, Procurement Manager, Compliance Officer, Analyst, Contributor, Viewer (validate current model before migration).
- Enforce permissions in RLS/RPC/Edge Functions—not UI only.
- Invitation token hashed, expiring, single-use and email-bound.
- At least one owner remains; ownership changes are audited.

**Acceptance:** role matrix enforced server-side; removed member immediately loses access; unauthorized approval/write fails.

### Phase 15 — Platform administration
**Status:** DESIGN_REQUIRED  
- Separate platform admin identity and route; never equate company role with platform privilege.
- Explicit, time-bound, scoped support grants; every support access audited and revocable.
- Job/AI/function health, organization usage, release SHA, incidents and feature flags.
- Admin changes audited; support access is least privilege.

**Acceptance:** no platform privilege from company membership; expired support grant denied; access logs complete.

### Phase 16 — Procurement Copilot
**Status:** BLOCKED until real intelligence and isolation are certified  
- Fixed, permission-aware tools under user's JWT; no free SQL tool or service key to model.
- Retrieval from authorized company records, tender gaps and expiry; evidence/source citations.
- Grounded explanations, summaries, qualification gaps and drafting support.
- Reject fabricated citations and unsupported claims; say “no evidence found” when appropriate.
- No cross-company retrieval; AI cannot declare compliance or submit.

**Acceptance:** cross-company question returns no data; invented citation rejected; answer cites only retrieved records.

### Phase 17 — Commercialization and product operations
**Status:** DESIGN_REQUIRED  
- Plans, trials, subscriptions, payment-provider webhook verification, replay protection and server-side limits.
- Usage caps for AI, storage, seats and invites; billing reconciliation and entitlement tests.
- Company export/deletion workflows and documented retention.
- Backup restore drill, uptime/version monitoring, incident runbook, support, terms, privacy and data-processing notices.
- Cost controls, onboarding/help, feedback and customer support.

**Acceptance:** webhook signature/replay tests pass; entitlements are enforced server-side; restore drill passes isolation tests; legal/privacy artifacts published.

## Execution sequence

1. **A1:** audit and establish release controls (do not install guessed checks).
2. **A2:** complete migration review; harden independent staging apply approval; reconstruct staging only.
3. **A3:** fix and test verification fact integrity.
4. **A4:** certify tenant isolation and security.
5. **Phase 4:** Vault → **Phase 5:** Tender Command → **Phase 8:** rules/identity.
6. **Phase 7:** real document intelligence → **Phase 6:** capabilities → **Phase 9:** submission.
7. **Phases 11–12:** workflow and notifications → **Phase 13:** reporting → **Phase 10:** opportunities.
8. **Phases 14–17:** roles/admin → platform admin → Copilot → commercialization.

A stage cannot begin until its prerequisite isolation suite and acceptance checks are PASS in `docs/release/EVIDENCE.md`. Every new table, RPC, storage path and Edge Function enters the isolation suite in the same PR that introduces it.

## Immediate work queue (do these first)

| ID | Work package | Gate / output | Status |
|---|---|---|---|
| WP-01 | Inspect branch protection, CI workflows and repository settings | Verified release-control inventory; no guessed check names | AUDIT_REQUIRED |
| WP-02 | Migration filename/content/ledger reconciliation | Raw diff + SQL risk annotations on PR #56 | BLOCKED |
| WP-03 | Harden PR #67 workflow | Separate dry-run review from apply; real reviewer gate; production ID rejection | BLOCKED |
| WP-04 | Rebuild staging from reviewed migrations | Ledger/schema fingerprint/function/storage report | BLOCKED |
| WP-05 | Correct PR #68 verification facts | Staging regression output + zero invalid facts | BLOCKED |
| WP-06 | Tenant isolation suite | Positive/negative matrix across DB/RPC/storage/functions | BLOCKED |
| WP-07 | Feature audit | Existing-code inventory mapped to Phases 4–17 | AUDIT_REQUIRED |

## Feature audit checklist

For each feature, record: existing route/component; existing table/RPC/function; migration(s); data ownership; role permissions; deterministic vs AI behavior; acceptance tests; negative/security tests; evidence URL; known gaps; status; next action. Do not mark “missing” until repository and schema audit confirms it.

## PR checklist

- [ ] Scope is one gate or feature.
- [ ] Baseline SHA recorded.
- [ ] Existing implementation/schema inspected.
- [ ] What changed and what did not change stated.
- [ ] Positive, negative and regression tests included.
- [ ] Tenant isolation cases included.
- [ ] Migration and recovery/rollback plan reviewed.
- [ ] Staging execution evidence linked.
- [ ] Production untouched unless separately authorized.
- [ ] Decision explicitly PASS / FAIL / NOT PROVEN.

## Decision log

| Date | Decision | Reason / evidence |
|---|---|---|
| 2026-11-03 | Production remains frozen; work proceeds via reviewed PRs and staging | Prevent unverified migration/security changes from reaching customer data |
| 2026-11-03 | This register is planning, not proof of implementation | Existing feature state must be audited against code and live schema |


## Audit findings recorded during execution (2026-11-03)

These are source-code findings, not assumptions; tracked by [Issue #70](https://github.com/JASMIQHQ/company-vault-hub/issues/70), [Issue #71](https://github.com/JASMIQHQ/company-vault-hub/issues/71) and [Issue #72](https://github.com/JASMIQHQ/company-vault-hub/issues/72).

- The migration version audit script checks filenames/count/prefixes only. It cannot establish that the SQL matches what was applied to production or that replay is safe.
- Recovered migration `20260902135736_backfill_and_enforce_document_verification_audit.sql` backfills verified-fact rows for both `verified` and `mismatch`, and its trigger inserts facts for both outcomes. This violates the intended evidence semantics.
- PR #68's proposed correction deletes facts on a mismatch, including previously successful evidence. That is also unacceptable: a mismatch attempt must not create a fact or erase an earlier successful fact.
- Company membership and company-scoped RLS were introduced in `20260928124212_g34_company_authorization_boundary.sql`; this requires table-by-table policy and negative cross-company testing, not a general claim of tenant isolation.
- Storage policies in `20260928124639_g35_company_storage_authorization.sql` require a matching persisted document/tender record. Prebinding, upload order, cleanup and signed URL behavior need integration tests.
- Owner-company creation RPC in `20260928125509_g34_owner_company_creation_rpc.sql` checks organization-owner authorization; authenticated non-owner and unauthenticated invocation need explicit tests.
- Staging project `rmtoaaxnuwsecmajhwjx` is healthy and empty (zero migration records); no reconstruction has been executed.
- PR #67 is not approved for apply: its preflight and apply jobs are in one dispatch, so the generated plan is not subject to an enforced post-plan review decision. Required reviewers for the GitHub environment have not been verified.

**Gate decision:** A2/A3/A4 remain BLOCKED. Do not merge or execute migration/rebuild changes until the issues above are resolved and staging evidence is independently reviewed.
