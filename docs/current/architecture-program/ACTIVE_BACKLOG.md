# LANA Chatbot — Active Incident Backlog

**Status:** Reconciled on 2026-08-13; **GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS**.
**Active track:** DF-A source work is eligible; BF residuals remain recorded and unchanged.
**Next issue:** DF-01 under the DF-A Release Train contract.
**Exit:** owner acceptance is recorded and `POST_BF_V1` is anchored to the immutable reconciled runtime evidence.
**Detailed issue contracts:** `BF_ISSUE_SPECS.md`; current disposition is below.
**Operating mode:** `ENGINEERING_PREPROD`; PRs use focused verification and Release Trains own full verification/deploy preparation.

## Objective

Correct the ten confirmed live-runtime defects without introducing another language-regex authority, another sales-state authority, a model-only side effect, or an unverified business claim.

```text
Model:
  classify dialogue semantics
  propose response strategy
  produce structured claims
  draft customer-facing wording

Code:
  resolve verified/fresh evidence
  validate every protected claim
  reconcile incompatible decisions
  authorize or block side effects
  enforce security and policy prohibitions
```

## Starting point

Use `CURRENT_BASELINE.md` as the current reconciliation checkpoint and Gate disposition, then fetch and verify current GitHub `main` and current read-only live evidence before each PR. Completed RI/CF/DB details are archived; their invariants remain in `contracts/`.

## Release order

| Order | Issue | Priority | Behavior class | Rollback class |
|---:|---|---:|---|---|
| 1 | BF-04 verified size-claim enforcement | P0 | Safety invariant | Fail closed; immutable release rollback |
| 2 | BF-05 size-chart eligibility/projection | P1 | Data-path correctness | Immutable release rollback |
| 3 | BF-10 terminal Outbox error cleanup | P2 | Data consistency | Immutable release rollback |
| 4 | BF-02 preserve verified product context | P1 | Context correctness | Immutable release rollback |
| 5 | BF-01 reconcile clarification/reply action | P1 | Customer-visible | Database-backed policy version |
| 6 | BF-03 foundation-safe correction disposition | P1 | Non-activatable retained foundations | No runtime policy or activation path |
| 7 | BF-06 per-asset partial media resolution | P1 | Customer-visible | Database-backed policy version |
| 8 | BF-07 multi-product clarification | P1 | Customer-visible | Database-backed policy version |
| 9 | BF-08 classified customer-URL policy | P1 | Security/customer-visible | Strict fail-closed fallback |
| 10 | BF-09 full-look media mapping | P2 | Mapping correctness | Immutable release rollback |

```text
Wave A: BF-04 -> BF-05 -> BF-10
Wave B: BF-02 -> BF-01 -> BF-03
Wave C: BF-06 -> BF-07 -> BF-08 -> BF-09
-> Gate BF
-> capture immutable post-fix V1 baseline
-> activate FUTURE_BACKLOG.md
```

## Post-wave reconciliation matrix (2026-08-12)

| BF | Source/release status | Effective live state | Residual / disposition |
|---|---|---|---|
| BF-01 | Merged and in the realtime artifact | CLARIFY_RECONCILED_V1 published | Active; no Gate BF blocker recorded |
| BF-02 | Merged and in the realtime artifact | Direct runtime path | Active; replay evidence retained |
| BF-03 | PR #158 foundation-safe merge | No adapter, import, policy field, or activation path | Owner-approved deferred deviation; canonical non-activatable disposition; do not revive the heuristic |
| BF-04 | PR #128 merged; later realtime artifacts contain the code | Direct claim-guard path | **PARTIAL / KNOWN_GAP** P0 bypasses; owner waived it only as a Gate blocker, not as a correctness finding |
| BF-05 | Merged and in the realtime artifact | Direct runtime path | Active; eligibility remains fail-closed |
| BF-06 | Merged and in the realtime artifact | PER_ASSET_V1 published | Active |
| BF-07 | Merged and in the realtime artifact | CLARIFY_V1 published | Active |
| BF-08 | Merged and in the realtime artifact | CLASSIFIED_ALLOWLIST_V1 published | Active; strict fallback retained |
| BF-09 | Merged and in the realtime artifact | Direct runtime path | Active; bounded full-look mapping |
| BF-10 | delivery-only r5.6 is live | New path has no observed natural terminal transition | Accepted non-blocking evidence residual; do not mutate historical rows or claim live transition evidence |

**DF_A_READY: READY_FOR_DF_A_SOURCE_WORK.** This is an owner governance decision, not
a claim that BF-04 is fixed, BF-10 has natural-transition evidence, or a deployment is authorized.
`POST_BF_V1` uses the immutable r5.7.1 realtime plus r5.6 delivery evidence recorded in
`CURRENT_BASELINE.md` as its comparison anchor.

Each issue is one focused PR starting from freshly fetched `main`, not the preceding bug branch. PR merge does not imply one release or one deploy. Immutable release preparation, full verification, and any authorized `PREPROD_TEST_PAGE` deployment occur at the applicable Release Train boundary.

## Required per-issue context

For one BF task, load only:

1. the matching `BF-xx` section from `BF_ISSUE_SPECS.md`;
2. the matching wave section from `ACTIVE_IMPLEMENTATION_PLAN.md`;
3. `contracts/MODEL_CLAIM_BOUNDARY.md`;
4. `contracts/BEHAVIOR_CONTROL_PLANE.md` only for policy-gated behavior;
5. `contracts/RELEASE_INTEGRITY.md` for release/deploy work.

## Common constraints

- No BF PR changes sales authority, state-read authority, confirmation mode, page allowlist, State V2, or commerce cutover.
- Customer-visible flags use the existing versioned, database-backed, page-scoped control plane; no env-only flags.
- Claim verification cannot have a mode that restores unsafe unverified claims.
- Code must not rewrite normal customer wording by deleting regex-matched phrases.
- A rejected draft receives bounded repair evidence; after bounded failure, use an approved safe clarification/handoff with no unsupported claim.
- Every original incident gets a replay fixture plus counterexamples that prevent keyword overfitting.
- No live Messenger send/test, merge, migration, activation, service recreation, or deployment without explicit authorization.

## Dependencies into later architecture

- BF-04 remains an unresolved safety residual. Its verified-claim design informs DF-05/DF-06, but its known P0 bypasses must not be represented as closed containment. The 2026-08-13 owner waiver permits DF progression only.
- BF-03 has an owner-approved deferred deviation and the canonical foundation-only disposition from PR #158: retained inert primitives and evaluation data have no runtime authority or activation path. Do not revive correction containment; the root dialogue-evidence and writer-demotion obligations remain DF-05/DF-06 and DF-09/DF-11.
- BF-07 clarifies multiple products; canonical multi-product state remains an UR-00 ADR obligation.
- DF-09/DF-10 must use the post-Gate-BF V1 baseline, never the known-buggy pre-wave path.
- Detailed DF-A work is active in `FUTURE_BACKLOG.md`; later trains retain their logical dependencies.

## Gate BF

The original strict Gate BF checklist remains the technical acceptance contract. It is **not
claimed fully satisfied**. On 2026-08-13 the owner explicitly accepted progression with these
bounded deviations:

- BF-03 semantics are deferred to the canonical DF dialogue-evidence/authority work; the
  foundation-only implementation remains non-activatable.
- BF-04 remains `PARTIAL / KNOWN_GAP`; its P0 bypass is accepted as an open safety residual.
- BF-10 natural post-cutover evidence remains pending. This is absence of live exercise, not
  a failed runtime condition and not a newly invented mandatory acceptance criterion.

Accordingly the governance verdict is `GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS`, not an
unqualified technical `GATE_BF_PASSED`. The following checklist is preserved so later work
cannot erase or misrepresent the residuals:

- [ ] All ten original incidents and their counterexamples pass stable replay.
- [ ] No protected business claim lacks typed verified provenance.
- [ ] No direct customer question ends in `NO_REPLY` without an explicit higher-priority reason.
- [ ] Invalid model output cannot erase independently verified context.
- [ ] Partial media failure preserves usable results.
- [ ] Multi-product media cannot collapse silently to the first product.
- [ ] URL classification remains SSRF/phishing fail-closed.
- [ ] Terminal Outbox success has no active stale error while attempt history remains intact.
- [ ] Behavior activation, readback, cache propagation, audit, and rollback pass on the single approved page.
- [ ] Focused tests and applicable migration-diff, secret/PII, security, data-integrity, and architecture checks pass for every PR; frozen install, full `pnpm check`, integration/replay, runtime-state, and release-integrity gates pass at the Release Train boundary.
- [ ] Any test-page deployment evidence and soak are append-only and tied to immutable tags.
- [ ] An immutable post-fix V1 baseline records model/config, prompt, policy versions, evidence-envelope version, and page scope.

Owner acceptance resumes DF-A source work and creates the `POST_BF_V1` comparison anchor.
Gate BF is an engineering/architecture gate; it does not declare production readiness or
authorize `COMMERCE`, State V2, a second page/brand, deployment, or any live mutation.
