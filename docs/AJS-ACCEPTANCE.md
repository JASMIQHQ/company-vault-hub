# JASMIQ AJS Acceptance Standard

This is the release contract for security-sensitive JASMIQ changes.

## G33 — Company isolation

For the same tender:

1. Select Company A.
2. Run tender matching.
3. Record matched, review and missing results.
4. Switch the tender to Company B.
5. Run matching again.
6. Confirm Company A documents cannot satisfy Company B requirements.
7. Restore Company A.
8. Run matching again and confirm the original Company A evidence returns.

Required evidence: browser click-through, persisted tender company_id, Edge Function execution log, and resulting compliance matches.

**OPEN BLOCKER:** The live click-through proof for PR #32 is still outstanding. PR #32 must not merge until the exact acceptance flow above is evidenced.

## G34 — Database security surface

Every SECURITY DEFINER function must have an explicit reason to remain privileged.

For every function record its purpose, caller, required role, reason SECURITY DEFINER is required, organisation/company boundary, and whether direct RPC exposure is required.

No function is revoked or converted blindly because that can break a valid application path.

## G35 — Storage isolation

Verify that an authenticated user cannot read another organisation's or another company's private document object. Test both direct object access and signed URL access.

## G36 — Automated regression coverage and matcher contract

Automated tests must cover organisation isolation, company isolation, tender-company switching, expiry handling, year handling, missing evidence, manual review, and deterministic matcher output.

**OPEN MATCHER-CONTRACT DEFECT:** A reproduced requirement-text drift can silently change matching between two re-analyze runs. Specifically, changing extracted requirement wording from **"Professional Body Registration of Personnel"** to **"Professional Key Personnel Registration"** caused an existing match to disappear on re-analysis. This is a known, reproduced data-drift/matcher-contract defect, not a pending test. It must be investigated, documented with a deterministic reproduction, and covered by regression evidence before the matching/verification gate is considered complete.

Until the defect is resolved or explicitly accepted with evidence, no matcher, verification, or schema changes should be treated as implicitly safe merely because the surrounding guardrails pass.

## G37 — Release evidence

A release is accepted only when lint passes, the production build passes, database security advisors are reviewed, relevant acceptance tests pass, and no cross-company or cross-organisation evidence leak is observed.

## G38 — Performance

After correctness and security are proven, review RLS auth-function evaluation, foreign-key indexes, genuinely unused indexes, and query plans for high-use paths.

## G39 — Production discipline

Protected main, pull-request checks, secret scanning and push protection, dependency alerts and a documented release path should be enabled before production is declared AJS-complete.
