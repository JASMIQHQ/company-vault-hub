# JASMIQ Engineering Charter

## Product spine

JASMIQ is a procurement operating system built around one evidence-first workflow:

Company → Company Vault → Tender → Bid Structure → Requirement Ledger → Evidence Matching → Readiness → Submission Checklist.

## Non-negotiable invariants

1. `tender_requirements` is the canonical tender requirement ledger.
2. Evidence matching may update requirement status and evidence references, but must not create or delete the requirement universe.
3. Company Readiness and Tender Readiness are separate calculations.
4. Bid Structure is user-facing terminology for Lot / Category / Package. No scope may be invented when the tender does not explicitly contain one.
5. Company and organization isolation must be enforced on every tender/evidence operation.
6. Deterministic metadata matching is Level 1. Ambiguity stops at manual review; it does not become an AI guess.
7. Document validity is derived from stored validity metadata and current date. Expired evidence cannot silently satisfy a requirement.
8. Existing Supabase project/schema is the default. New tables, columns, buckets, migrations, or RLS architecture require an explicit gate.
9. Production is never considered updated until the exact deployed commit/deploy is verified.
10. No mock procurement conclusions are allowed.

## Current release gates

- G25 Document Validity & Renewal Intelligence — implemented and browser-accepted.
- G26/G27 Bid Structure and lot-scoped requirements — implementation present; real structured-tender acceptance still required.
- G28 Missing-document/action engine — foundation present; action workflows remain downstream.
- G29 Tender Submission Readiness — foundation present; authoritative regression suite required.
- G30 Submission/Bid Package foundation — foundation present; full package generation is future work.

## Release sequence

1. Reconcile the live requirement dataset against tender analysis history.
2. Keep CI green: frozen lockfile, build, route registration and readiness tests.
3. Verify deterministic matcher against real company/tender fixtures.
4. Verify Lot / Category / Package / Whole Tender bid structure behavior.
5. Verify tender-wide versus scope-specific requirement handling.
6. Verify readiness calculations and exact action reasons.
7. Harden Supabase function authorization, RLS exposure and search paths.
8. Browser-accept the final preview.
9. Deploy once to production and record the exact production commit.

## Current known backend posture

The live Supabase project is `jasmiq-dev` (`itqepknvdiedldcyunig`). The matcher Edge Function is JWT-protected and performs organization membership checks. Public helper function search paths are pinned to `public`.

Security and performance advisor findings must be triaged by function/table ownership rather than mass-fixed blindly. In particular, RLS-enabled tables with no policies may be intentionally service-only and must be classified before policies are added.

## Future layers

- Level 2: document verification and verified facts.
- Level 3: semantic evidence resolution for genuinely ambiguous cases.
- Level 4: procurement intelligence/coprocessor.
- Submission package generation, notifications, automation and outcome learning come only after the evidence spine is stable.
