# LANA Chatbot — Incident Bug-Fix Backlog Amendment

**Status:** Historical detailed issue contracts with one active canonical deviation; see ACTIVE_BACKLOG.md for the current Gate BF disposition. This file is not deployment authorization.
**Applies after:** R3 / C2 / PR-06
**Must complete before:** the first unfinished DF release slice
**Companion document:** `ACTIVE_IMPLEMENTATION_PLAN.md`

This amendment adds an incident-remediation track to the existing architecture backlog. It does not replace RI, CF, DB, DF, or UR. Before execution, this file and its companion implementation-plan amendment must be incorporated into the two canonical planning documents in the same planning pull request.

## 1. Authoritative starting point

- GitHub evidence main: `381ed381b119de4b4888170a348ecc6ae11f027f`.
- Deployed release: `20260803-dataset-store-boundary-r3`.
- R3 implementation commit: `0a5844a57cb1dd9c5687158cb9774a466d512024`.
- Tagged release commit: `9288708c536080587acf4b08d84b5a509ef768bc`.
- Runtime-state SHA: `1744af5cf9d79b90e8033a738e3414350af39c25e5bd00f9890acdcc50e61fad`.
- Migration ledger remains `0030_runtime_behavior_modes`; no R3 backfill.
- Runtime modes remain confirmation `V2_ACTIVE`, sales authority `LEGACY`, state read `LEGACY`, revision `3`, source `DATABASE`.
- Live `PREPROD_TEST_PAGE` allowlist remains page `1198992073286645` only.

The implementation task must still fetch and verify the current `origin/main` and read the latest generated runtime evidence before each PR. The values above are a checkpoint, not permission to ignore newer valid main commits.

## 2. Incident-track objective

Correct the ten confirmed live-runtime defects without introducing another language-regex authority, another sales-state authority, an unsafe model-only side effect, or an unverified business claim.

Target decision boundary:

```text
Model:
  classify dialogue semantics
  propose response strategy
  produce structured claims
  draft customer-facing wording

Deterministic code:
  resolve verified/fresh evidence
  validate every protected claim
  reconcile incompatible decisions
  authorize or block side effects
  enforce security and policy prohibitions
```

The model proposes decisions; code remains the final authority for facts, state mutation, cart/order operations, handoff, routing, security, and outbound side effects.

## 3. Global implementation rules

1. One confirmed bug equals one focused PR. Release candidates are prepared at the applicable Release Train boundary, not once per bug by default.
2. Every PR starts from freshly fetched GitHub `main`, not a previous bug branch.
3. Each behavior-changing fix deploys inactive or in its safest mode, then uses the existing database-backed, page-scoped, versioned behavior control plane for activation and readback.
4. Environment variables are startup fail-safe defaults only. Do not create env-only runtime flags.
5. Correctness and safety invariants do not receive an emergency mode that restores known-unsafe behavior.
6. No bug-fix PR changes sales authority, state-read authority, page allowlist, State V2, or commerce cutover.
7. No PR silently rewrites model wording with regex. A rejected draft receives bounded repair evidence; after bounded failure, use an approved safe clarification or handoff response.
8. Every protected claim in customer-facing text must be declared and linked to verified provenance. Undeclared protected claims fail closed.
9. Every PR adds a replay fixture for its original incident and a counterexample set that prevents overfitting.
10. Merge, Release Train preparation, activation, live Messenger testing, deployment, and public-production hardening remain separate approvals.

## 4. Release slices

| Slice | Issue | Priority | Behavior class | Runtime rollback |
|---|---|---:|---|---|
| BF-A1 | BF-04 verified size-claim enforcement | P0 | Safety containment | Fail closed; tagged-release rollback only |
| BF-A2 | BF-05 size-chart eligibility/projection | P1 | Data-path correctness | Tagged-release rollback |
| BF-A3 | BF-10 terminal Outbox error cleanup | P2 | Data consistency | Tagged-release rollback |
| BF-B1 | BF-02 preserve verified product context | P1 | Context correctness | Tagged-release rollback |
| BF-B2 | BF-01 reconcile clarification and reply action | P1 | Customer-visible behavior | Database-backed policy version |
| BF-B3 | BF-03 correction-as-SIZE incident | P1 | Foundation-only canonical disposition | No runtime policy or activation path |
| BF-C1 | BF-06 per-asset partial media resolution | P1 | Customer-visible behavior | Database-backed policy version |
| BF-C2 | BF-07 multi-product clarification | P1 | Customer-visible behavior | Database-backed policy version |
| BF-C3 | BF-08 classified customer-URL policy | P1 | Security/customer-visible behavior | Database-backed policy version; emergency fallback stays strict |
| BF-C4 | BF-09 full-look media mapping | P2 | Mapping correctness | Tagged-release rollback |

Required order:

```text
R3 / C2 complete
  -> BF-A1 -> BF-A2 -> BF-A3
  -> BF-B1 -> BF-B2 -> BF-B3
  -> BF-C1 -> BF-C2 -> BF-C3 -> BF-C4
  -> Gate BF
  -> resume DF-01 through DF-13
```

Do not run the DF-09/DF-10 paired V1/V2 evaluation against a pre-fix V1 baseline.

## 5. Issue definitions and acceptance criteria

### BF-04 — Enforce verified size claims

**Objective:** Prevent any concrete size recommendation unless it is backed by an eligible Size Engine decision.

Required behavior:

- Introduce a typed protected claim such as `SIZE_RECOMMENDATION` with value, product/variant scope, evidence reference, source, observation time, and expiry.
- Accept the claim only when its source is the verified Size Engine path and the evidence matches the active product/variant and customer measurements.
- Add a conservative text detector as defense in depth for omitted/undeclared size assertions. The detector is not the semantic authority.
- Reject and reason-code any draft that asserts a size without valid provenance; request one bounded model repair that removes or replaces the claim.
- After repair failure, return an approved clarification that does not recommend a size.

Acceptance:

- The reported SD398 case cannot emit “size L” without verified evidence.
- Paraphrases, Vietnamese diacritics, ASCII-folded text, ranges, negative statements, questions, and catalog-size lists are distinguished in tests.
- A catalog list such as `S/M/L` is not treated as fit evidence.
- No unsafe runtime flag can re-enable unverified recommendations.

### BF-05 — Preserve the full size-chart eligibility pipeline

**Objective:** Make published charts reach runtime eligibility when—and only when—all verification conditions pass.

Required behavior:

- Keep publication, verification, product scope, measurement basis, policy bundle, and projection freshness as distinct checks.
- Do not equate `PUBLISHED` with `VERIFIED`.
- Emit additive, bounded reason codes for the exact rejection layer.
- Preserve prior schema compatibility and avoid a data backfill unless separately approved.

Acceptance:

- Eligible published charts for the reported products resolve through the runtime projection.
- Wrong scope, stale bundle, unsupported measurement basis, unverified artifact, and parsing failure remain fail-closed and separately observable.

### BF-10 — Clear active Outbox errors after terminal success

**Objective:** Separate current terminal status from historical failed-attempt evidence.

Required behavior:

- `markMetaAccepted` clears the active `last_error_code` and related current-error fields atomically with terminal success.
- Retry/attempt history remains available in its canonical audit location.
- Do not infer delivery from `APP_ECHO`; retain existing delivery semantics.

Acceptance:

- A failed attempt followed by `SENT_ACCEPTED` has no active error.
- Attempt history remains queryable and duplicate/idempotency behavior is unchanged.

### BF-02 — Preserve independently verified conversation context

**Objective:** A model or grounded-schema failure discards the invalid proposal, not verified context.

Required behavior:

- Resolve fallback product context from verified current-turn facts, versioned conversation state, prior verified bot context, explicit message code, and eligible media/ad context in an explicit precedence order.
- Validate freshness, revision/fence, product switch/reset, and ownership before using state fallback.
- Do not merge arbitrary fields from an invalid grounded output.

Acceptance:

- `GROUNDED_SCHEMA_INVALID` does not erase a valid active product.
- Product switch, stale state, ambiguous multi-product context, and human ownership remain fail-closed.

### BF-01 — Reconcile final reply action

**Objective:** Eliminate contradictory terminal combinations such as `STRATEGY_ASK_CLARIFY + NO_REPLY`.

Required behavior:

- Add one final deterministic reconciliation step over dialogue evidence, strategy, CTA policy, ownership, safety policy, and proposed action.
- A direct customer question or `ASK_CLARIFY` strategy cannot terminate as `NO_REPLY` unless a higher-priority, explicitly reason-coded safety/ownership rule requires silence.
- The model writes the clarification. Code only validates and authorizes it.

Acceptance:

- The reported variant question produces a reply.
- Human ownership, dedupe, blocked outbound, and explicit silence policies are not bypassed.
- Every override records a bounded reason code.

### BF-03 — Correction-as-SIZE: canonical foundation-only disposition

**Original objective:** stop clear customer corrections from entering the legacy SIZE branch before dialogue-act migration.

**Accepted deviation:** the reviewed runtime containment was not kept. PR #158 restored the accepted BF-01/BF-02 production runner, removed the BF-03 adapter/heuristic/policy field and all activation paths, and retained only non-authoritative foundations: post-gate ordering, stale-generation completion, replay/own-echo/malformed/concurrency evidence, a pure unused allow-set primitive, and inactive research corpus data.

**Current acceptance boundary:** by owner-approved deferred deviation, BF-03 does not claim a customer-visible correction behavior and must not be reactivated through a versioned policy or an environment flag. The original semantic requirement moves to the canonical dialogue-evidence and atomic writer-demotion work in DF-05/DF-06 and DF-09/DF-11. Mentioning a topic remains insufficient authority for a capability, but no BF-03 regex classifier may become a second authority.

### BF-06 — Resolve media per asset

**Objective:** Preserve valid results when only part of a media batch fails.

Required behavior:

- Produce per-asset status and reason codes.
- Continue with `MATCHED` assets when policy permits.
- Handoff only when no safe usable result remains or the customer request cannot be completed without the failed assets.
- Never silently drop the entire customer turn solely because a small batch crosses a ratio threshold.

Acceptance:

- One failed image among two, three, or four does not discard valid matches.
- Download failure, unsupported type, ambiguity, and low confidence remain distinguishable.

### BF-07 — Clarify multiple resolved products

**Objective:** Avoid collapsing distinct products into `resolution.primary`.

Required behavior:

- When multiple distinct products are resolved and current state cannot represent the request safely, ask the model to draft a bounded product-selection clarification.
- Preserve ordered per-image/product evidence for audit.
- Do not silently choose the first product or prematurely alter canonical state shape.

Acceptance:

- A batch resolving to SD375 and SD398 cannot continue as though only SD375 exists.
- Same-product duplicate images continue without unnecessary clarification.
- The behavior is controlled by the versioned runtime policy.

### BF-08 — Classify URLs before applying sensitive-case policy

**Objective:** Distinguish supported business URLs from unsupported or dangerous URLs without weakening security.

Required behavior:

- Normalize scheme, host, port, IDN/punycode, and approved redirect behavior before classification.
- Define explicit classes: approved first-party/product, approved shop/CDN, unsupported external, and suspicious/dangerous.
- Fetch or resolve only approved allowlisted destinations using SSRF-safe networking controls.
- Never give the model raw network authority over arbitrary customer URLs.
- Emergency fallback remains the current strict fail-closed behavior.

Acceptance:

- Approved Lana/shop URLs can enter the supported resolver.
- Unknown, private-network, credential-bearing, deceptive, redirecting, or dangerous URLs remain blocked and reason-coded.
- URL handling never silently suppresses a reply without an explicit ownership/safety reason.

### BF-09 — Correct full-look media mapping

**Objective:** Allow eligible `AO+QUAN` assets to represent the full look without incorrect component scoping.

Required behavior:

- Apply taxonomy precedence explicitly rather than relying on first-matching tag order.
- Assign `FULL_LOOK` only when the asset genuinely represents the complete product/set.
- Leave `componentProductId` null only for full-product assets.
- Preserve `maxAssets`, deduplication, verified media provenance, and ordering.

Acceptance:

- Eligible SD375 media can return multiple bounded full-look assets.
- Component-only images remain scoped and cannot masquerade as the full set.

## 6. Gate BF — Incident remediation

**Current state: GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS.** The original checklist remains the strict technical contract and is not claimed fully satisfied. On 2026-08-13 the owner explicitly accepted: BF-03 as a deferred, non-activatable foundation; BF-04 as `PARTIAL / KNOWN_GAP` with its P0 bypass still open; and BF-10 natural-transition evidence as a pending non-blocking residual. This governance waiver permits DF-A progression and a `POST_BF_V1` comparison anchor; it does not claim the residuals are fixed or authorize deploy/runtime changes.

Gate BF passes only when:

- [ ] All ten original incidents exist as stable replay fixtures and pass.
- [ ] Counterexamples prove the fixes are not keyword-specific patches.
- [ ] No protected business claim lacks typed verified provenance.
- [ ] No direct customer question ends in `NO_REPLY` without an explicit higher-priority reason.
- [ ] Invalid model output cannot erase independently verified context.
- [ ] Partial media failure preserves usable results.
- [ ] Multi-product media cannot collapse silently to the first product.
- [ ] URL classification remains SSRF/phishing fail-closed.
- [ ] Terminal Outbox success has no active stale error while history remains intact.
- [ ] Behavior-policy activation, readback, cache propagation, audit, and rollback pass on the single approved page.
- [ ] Focused tests and risk-applicable migration-diff, secret/PII, security, data-integrity, and architecture checks pass for every PR; frozen install, full `pnpm check`, integration/replay, release-integrity, and runtime-state gates pass at the Release Train boundary.
- [ ] Any test-page deployment evidence and soak are append-only and tied to immutable tags.

## 7. Required changes to later backlog items

### DF-01

Add observability for dialogue act, protected-claim validation, draft repair, reconciliation override, per-asset media result, multi-product clarification, and URL class. Store bounded codes/hashes only.

### DF-05 through DF-06

- Add canonical dialogue evidence as a separate contract from buying intent.
- Add typed protected-claim provenance, including size/fit evidence.
- Keep model evidence non-authoritative for side effects.

### DF-09 through DF-10

- Feed canonical dialogue and claim evidence into Context V2.
- Use the post-Gate-BF verified `PREPROD_TEST_PAGE` path as the V1 baseline.
- Include all ten incidents and counterexamples in deterministic and generative evaluation strata.

### DF-11 through DF-13

- Activate Context V2, derived phase, deterministic V2 consumers, final reconciliation, and regex demotion atomically.
- Implement correction semantics through canonical dialogue evidence and atomic writer demotion; the retired BF-03 containment must not be recreated as a co-authority.

### UR-00

The State V2 ADR must decide how to represent multiple considered products, ordered evidence, one active selection, product switch/reset, and retention. BF-07 must not pre-empt this schema decision.

## 8. Prohibited changes

- Do not use whole-response regex scanning as the sole claim verifier.
- Do not let a model-proposed claim authorize its own side effect.
- Do not silently delete unsupported words from a model draft and send the remainder.
- Do not add a new regex buying-intent or commercial-phase authority.
- Do not equate chart publication with verified runtime eligibility.
- Do not merge invalid model output with verified state.
- Do not choose `resolution.primary` when multiple distinct products are unresolved.
- Do not fetch arbitrary customer URLs or follow unbounded redirects.
- Do not use a customer-visible env-only feature flag.
- Do not run paired V1/V2 evaluation against the known-buggy pre-wave baseline.
- Do not expand the page allowlist during this track.
