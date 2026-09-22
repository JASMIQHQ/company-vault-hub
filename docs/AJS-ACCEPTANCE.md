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

## G34 — Database security surface

Every SECURITY DEFINER function must have an explicit reason to remain privileged.

For every function record its purpose, caller, required role, reason SECURITY DEFINER is required, organisation/company boundary, and whether direct RPC exposure is required.

No function is revoked or converted blindly because that can break a valid application path.

## G35 — Storage isolation

Verify that an authenticated user cannot read another organisation's or another company's private document object. Test both direct object access and signed URL access.

## G36 — Automated regression coverage

Automated tests must cover organisation isolation, company isolation, tender-company switching, expiry handling, year handling, missing evidence, manual review, and deterministic matcher output.

## G37 — Release evidence

A release is accepted only when lint passes, the production build passes, database security advisors are reviewed, relevant acceptance tests pass, and no cross-company or cross-organisation evidence leak is observed.

## G38 — Performance

After correctness and security are proven, review RLS auth-function evaluation, foreign-key indexes, genuinely unused indexes, and query plans for high-use paths.

## G39 — Production discipline

Protected main, pull-request checks, secret scanning and push protection, dependency alerts and a documented release path should be enabled before production is declared AJS-complete.
