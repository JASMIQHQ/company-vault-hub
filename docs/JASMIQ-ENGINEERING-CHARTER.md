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
11. Tender analysis may replace the canonical requirement ledger on re-analysis; therefore re-analysis must be treated as a full extraction event and independently integrity-checked.

## G31 — Requirement Integrity incident and closure

On 2026-09-15, the live requirement ledger changed from the previously audited NUPRC baseline of 10 requirements to 12 and the NITDA baseline of 17 to 19. The database does not retain the deleted pre-reanalysis rows, so it cannot provide a separate historical UPDATE event; the literal creation timestamp for the replacement canonical sets is **2026-09-15 15:32:19.676758+00 for NUPRC** and **2026-09-15 14:35:39.652671+00 for NITDA** (UTC). Inspection of the live `analyze-tender` v11 code and `mark_tender_analyzed` RPC confirms that analysis re-runs replace `tender_requirements` wholesale before inserting the newly extracted set; this is the code path responsible for the count change, not the evidence matcher. The four additional requirements are legitimate document-derived extractions: NUPRC adds **Enveloping and Marking** and **Soft Copy Submission**, both explicitly present in the tender's submission instructions; NITDA adds **Language and Signature** and **Maximum Lot Bidding Limit**, both explicitly present in section 5.0 General Information. The analyzer's system prompt already instructs it to list every eligibility/submission requirement in document order and to never invent values, so these four rows are accepted as the new canonical baseline rather than treated as a re-run artifact. Integrity verification on the live database returned **zero duplicate `requirement_name` rows per tender** and requirement/match parity of **NUPRC 12/12** and **NITDA 19/19**. No matcher-side requirement creation was found; the matcher remains downstream of the canonical ledger.

### G31 evidence table

| Tender | Previous audited baseline | Current canonical count | Replacement-set timestamp (UTC) | Exact newly observed requirements | Duplicate-name check | Match parity |
|---|---:|---:|---|---|---|---|
| NUPRC `f1086b0c-c629-4c57-9324-622ff427f26c` | 10 | 12 | 2026-09-15 15:32:19.676758+00 | Enveloping and Marking; Soft Copy Submission | 0 | 12 requirements / 12 matches |
| NITDA `ebbcf931-3125-485c-bb76-3611cbcbae20` | 17 | 19 | 2026-09-15 14:35:39.652671+00 | Language and Signature; Maximum Lot Bidding Limit | 0 | 19 requirements / 19 matches |

Verification query results:

```text
Duplicate requirement_name query:
[]

Requirement counts:
NITDA  19
NUPRC  12

Compliance match counts:
NITDA  19
NUPRC  12
```

## G32 — CI / Route-Tree Integrity closure

G32 is **closed** on 2026-09-16 after verifying both sides of the guard contract: the positive route-tree CI passes on the exact feature HEAD, and a throwaway negative test with the tender-detail route deliberately removed causes the route-registration guard to fail. The raw two-build byte comparison also demonstrated a conditional TanStack Start type-registration footer in `src/routeTree.gen.ts`; this is ambient TypeScript metadata (`declare module '@tanstack/react-start'`) and has no runtime route behavior. The committed-vs-fresh-build CI guard already normalizes that entire trailing registration block and canonicalizes EOF whitespace, so the raw byte variance is intentionally excluded from the actual route-drift invariant rather than weakening route comparison.

### G32 evidence table

| Proof | Evidence | Result |
|---|---|---|
| Positive route-tree guard | GitHub Actions run `35084454180` on fix commit `d15be1c70e9edd300c4ab827922aaa9b9295c136` | PASS |
| G25-G30 build verification | GitHub Actions run `35084454097` | PASS |
| Exact generated-file inspection | `src/routeTree.gen.ts` contains the trailing `getRouter`/`startInstance` ambient registration block | Confirmed type-only metadata |
| Raw two-build comparison | Exact-head throwaway verification produced the conditional type-registration footer variance | Expected harmless generated metadata; not the route-tree invariant |
| Negative route-break guard | Throwaway PR #29 removed `src/routes/_authenticated/tenders.$tenderId.tsx`; `$tenderId` registration check failed | PASS — real breakage caught |
| Workflow normalization | `.github/workflows/route-tree-drift-check.yml` strips the trailing TanStack registration block and normalizes EOF before structural comparison | Confirmed |
| Merge state | PR #27 remains Draft/unmerged | Correct — later gates remain required |

G32 closure rule: raw generator bytes are not the invariant. The invariant is that committed `src/routeTree.gen.ts` matches a fresh build after removing only known harmless TanStack registration metadata and EOF formatting variance; real route imports/definitions remain a hard failure. The negative test proves that the guard still catches actual route removal.

## Current release gates

- G25 Document Validity & Renewal Intelligence — implemented and browser-accepted.
- G26/G27 Bid Structure and lot-scoped requirements — implementation present; real structured-tender acceptance still required.
- G28 Missing-document/action engine — foundation present; action workflows remain downstream.
- G29 Tender Submission Readiness — foundation present; authoritative regression suite required.
- G30 Submission/Bid Package foundation — foundation present; full package generation is future work.
- G31 Requirement Integrity — **closed**. The live 12/19 requirement baseline is accepted and documented; no duplicate requirement names were found and compliance-match parity is 12/12 and 19/19.
- G32 CI / Route-Tree Integrity — **closed**. Positive route-tree CI passed, real route removal was caught by the negative guard, and harmless TanStack type-registration/EOF variance is explicitly normalized without suppressing structural drift.
- G33 Matcher Acceptance — **open next**. Standalone authentication, procedural-requirement handling, version selection, expiry, error handling, and CORS acceptance remain required.

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
