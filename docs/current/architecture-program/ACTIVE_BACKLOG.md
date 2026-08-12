# LANA Chatbot — Active Incident Backlog

**Status:** Planning-ready; implementation, merge, activation, and deployment require separate authorization.
**Active track:** BF incident remediation
**Next issue:** BF-04
**Exit:** Gate BF
**Detailed issue contracts:** `BF_ISSUE_SPECS.md`
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

Use `CURRENT_BASELINE.md` as the last accepted checkpoint, then fetch and verify current GitHub `main` and current read-only live evidence before each PR. Completed RI/CF/DB details are archived; their invariants remain in `contracts/`.

## Release order

| Order | Issue | Priority | Behavior class | Rollback class |
|---:|---|---:|---|---|
| 1 | BF-04 verified size-claim enforcement | P0 | Safety invariant | Fail closed; immutable release rollback |
| 2 | BF-05 size-chart eligibility/projection | P1 | Data-path correctness | Immutable release rollback |
| 3 | BF-10 terminal Outbox error cleanup | P2 | Data consistency | Immutable release rollback |
| 4 | BF-02 preserve verified product context | P1 | Context correctness | Immutable release rollback |
| 5 | BF-01 reconcile clarification/reply action | P1 | Customer-visible | Database-backed policy version |
| 6 | BF-03 correction containment for legacy SIZE | P1 | Temporary behavior containment | Database-backed policy version |
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

- BF-04 adds the immediate typed size-claim containment required for safety; the generalized canonical evidence contract and full writer cutover remain DF-05/DF-06 obligations.
- BF-03 is temporary and retires only after DF-09/DF-11 evidence and atomic regex demotion.
- BF-07 clarifies multiple products; canonical multi-product state remains an UR-00 ADR obligation.
- DF-09/DF-10 must use the post-Gate-BF V1 baseline, never the known-buggy pre-wave path.
- Detailed remaining DF/UR work stays inactive in `FUTURE_BACKLOG.md` until Gate BF.

## Gate BF

Gate BF passes only when:

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

Passing Gate BF resumes the DF plan. Gate BF is an engineering/architecture gate; it does not declare production readiness or authorize `COMMERCE`, State V2, a second page/brand, deployment, or any live mutation.
