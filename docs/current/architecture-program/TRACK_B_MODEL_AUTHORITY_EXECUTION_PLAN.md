# Track B — Model Authority Execution Plan

**Status:** `B2.4_MERGED / B3.1_V22_GATE_E_PASS / MIGRATIONS_0036_0037_0038_VERIFIED / B3.2_V2_LKG_SOURCE_REPLACEMENT_IN_PROGRESS`
**Plan baseline:** `main@4a5869f63d260091776da8236f1584f2c7e49bb5`, including reviewed B3 live-path replay head `104ee2f483e912532a77ef17b2dfe2c3878aebee`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md`
**Active process profile:** `SOLO_PREPROD_MINIMAL` (merged and current default; see `OPERATING_MODE.md`)
**Environment:** `ENGINEERING_PREPROD`, one bounded `PREPROD_TEST_PAGE`
**Authorization:** the owner messages dated 2026-08-29 and 2026-08-30 in Codex task `019ff0ed-3760-7e81-98f4-5e91e8ca35b0` authorize Track B source implementation and normal merge of a focused source PR only after clean exact-head self-review, that PR's fixed independent Sol High reviewer returns final no-blockers/approve, canonical exact-head CI runs real repository steps and passes, and the reviewed remote head/base/mergeability are reverified. The authoritative 2026-08-31 owner instruction additionally authorized the bounded B3 operational path in `ENGINEERING_PREPROD`; later explicit owner decisions separately authorized migrations `0036`, `0037`, and `0038`, which are now applied and verified. No instruction authorizes public production, page expansion, UR/State V2, LEGACY deletion or unrelated routing/control-plane changes.

**2026-09-03 owner architecture override:** PR #310 is superseded and must remain unmerged. Track B rollback is V2 to an exact compatible last-known-good V2, never V1. The replacement work is source/docs-only; it authorizes no PREPROD service, pointer, fence, database, Messenger, routing or control-plane mutation.

## 1. Purpose

Complete V5 Track B by removing the deterministic layer that overrides model output **after generation**, so that:

- the model owns normal conversational semantics, normal sales strategy, objection/CTA choice, and normal customer-facing wording;
- deterministic code owns verified facts/provenance, protected claims, security/PII, policy limits, effect authorization/reconciliation, CAS/idempotency, and fail-closed behavior;
- deterministic code stops acting as a second Vietnamese sales copywriter;
- existing database, Inbox/Outbox, Meta delivery, contracts, durable messaging, cart/money correctness, DF13 authority fencing and security primitives are reused rather than rebuilt.

B1 established that this is **closing a drift between contract and implementation**, not opening a new direction. `contracts/MODEL_CLAIM_BOUNDARY.md` already states the target principle, and the baseline prompt already tells the model that `strategyAnalysis.strategy` is a proposal for the app to check.

## 2. Selected direction — demote post-generation authority only

**Owner decision after B1, ranked `1 > 2 >>> 3 > 4`.**

Change no generation capability. `BaselineModelCapability` stays byte-frozen and unedited. The Context V2 candidate stays offline.

```text
Baseline model (byte-frozen, unchanged)
        ↓
AgentProposalV1
  - reply                 (model-owned wording)
  - strategyAnalysis      (model-proposed strategy)
  - salesSignals
  - action, businessFactQuery, protectedClaimIds
        ↓
DEMOTE deterministic strategy / copy overrides
        ↓
KEEP fact / claim / effect / security validation
        ↓
final reply
```

### Why this is sufficient — B1 evidence

- `AgentProposalV1Schema` (`packages/contracts/src/index.ts:520-557`) already carries `intent`, `conversationStage`, `strategyAnalysis`, `salesSignals`, `protectedClaimIds`, `action`, `businessFactQuery`, `reply`, `attachments`. That is already V5's B3 target shape, inside the byte-frozen envelope.
- The baseline prompt already assigns the division of labour. `vertex.ts:254`: *"strategyAnalysis chi phan loai need, barrier, decisionFactor va strategy **de app kiem tra**"*. `vertex.ts:327`: *"strategy chi la de xuat va khong duoc vuot guard deterministic"*. `vertex.ts:264`: *"Model chi cung cap evidence buyingIntent; app va guard deterministic moi duoc quyet dinh"*.
- The prompt constrains strategy from overriding the **guard**, i.e. correctness. It never licenses rewriting model wording for style. The current overrides therefore exceed both the contract and the prompt.
- The drift is post-generation. `Wave2StrategyInput.modelAnalysis` (`sales-strategy-v1.ts:99`) is optional, and `applyWave2ReplyPolicy` (`sales-strategy-v1.ts:568-589`) returns `{ ...proposal, reply }` after `limitQuestions(...)` and appending `ctaText(decision.ctaPolicy)`.
- The deterministic CTA is already only a backstop: it is appended only when `questionCount(limited) === 0`. The model normally supplies its own question or CTA, so removing the append is lower risk than it appears.

### The Context V2 candidate stays offline — recorded decision

The candidate keeps its value as an **offline research and evaluation artifact**. Track B does not promote it, so `contracts/MODEL_EVALUATION_BOUNDARY.md` §6 is never contradicted and no durable-contract status change is required. A future session must not reopen this as an oversight; it is a decision.

### Stop condition if this direction proves insufficient

Baseline prompt/envelope modification, live Context V2 candidate promotion and a third capability are not Track B alternatives. If exact-head differential evidence proves the frozen baseline cannot supply adequate normal strategy/CTA after deterministic demotion, stop Track B incomplete and ask the owner whether to open a separately scoped architecture decision. Do not implement or retain an escalation path inside Track B.

## 3. Current state and hard constraints

1. Track A / DF-C / Gate F are complete and are not reopened by this plan.
2. Current accepted runtime remains `salesAuthorityMode=COMMERCE`, `stateReadMode=LEGACY`. Track B changes neither.
3. `packages/database/src/df13-commerce-authority-bundle.ts` records `legacySalesStage: "DEMOTED_TELEMETRY_ONLY"`, `strategy: "CONTEXT_V2"`, `cta: "CONTEXT_V2"`. B1 proved no runtime code branches on the individual fields; runtime admission consumes `contractHash`. The fields remain governance claims, however, and the selected baseline-output authority makes the current strategy/CTA labels untruthful. B3.2 must derive a new payload, hash and behavior identity.
4. `apps/worker/src/df13-commerce-runtime-composition.ts` is the single real COMMERCE composition seam. B1 clarified that the DF13 executor performs identity admission, fence assessment, lease dispatch and fence-bound commit only — it does not orchestrate replies. `RealtimeRunner` (`realtime-runner.ts:2404`) is what gets restructured. Do not put reply stages inside the fence executor.
5. Track B leaves `stateReadMode=LEGACY` unchanged unless a later separately approved evidence-backed decision opens a narrow UR/State V2 slice.
6. BF-04 remains an accepted known residual: P0 unverified size-claim bypasses must not be represented as fixed.
7. Invariant r31.3 remains binding for realtime work: preserve verified facts/media when downstream model/size/enrichment fails; differential-test realtime changes against the r31.3 behavioral baseline with intentional differences justified; do not mark an Inbox permanently failed solely because model output is malformed — attempt a deterministic fallback from verified facts first.
8. `contracts/MODEL_CLAIM_BOUNDARY.md` governs the division of authority. Its concrete requirements are carried into the slices below: reject undeclared protected claims; **exactly one** bounded repair request; ambiguity or deterministic/model conflict resolves to the **less aggressive** action; reason-code every rejection, override, repair and safe fallback.
9. `SOLO_PREPROD_MINIMAL` (PR #269) is merged and active for all `ENGINEERING_PREPROD` work until an explicit owner instruction changes the profile. Its flow is `branch -> code + focused verification -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke`. Do not reintroduce Release Train ceremony.
10. PR #271 restored the canonical self-hosted CI backend. Exact-head verification uses a functioning canonical run; `CI_UNAVAILABLE_FALLBACK` applies only when remote CI cannot start or executes zero repository steps.
11. Existing Gate E/F evidence is historical evidence for its exact candidate and scope. Track B must not relabel stale fingerprints, corpus/rubric hashes or scored evidence as proof for a changed candidate.

## 4. Explicit non-goals

Track B must not expand into:

- UR / State V2 / Gate U, or changing `stateReadMode=LEGACY`;
- promoting the Context V2 candidate to live generation;
- editing `BaselineModelCapability` or its byte-frozen request envelope;
- a new top-level COMMERCE runtime/composition beside the DF13 seam;
- a new persistent behavior mode, parallel control plane, persistence or queue topology;
- admin/API refactors unrelated to the COMMERCE reply/effect path;
- multi-page rollout or public-production hardening;
- a second replay/evaluator platform, or a second scored-run implementation;
- requiring the full Wave1 population before Track B finishes;
- destructive legacy cleanup before replacement, consumer migration, rollback review and zero-use proof;
- claiming BF-04 or any accepted residual is fixed without new evidence.

## 5. Model-evaluation and evidence boundary

### 5.1 The baseline is not modified

`BaselineModelCapability` and its regression-pinned request envelope are untouched. Realtime does not import or call `context-v2-candidate.ts`; the existing runner serializes admitted DF13 authority state, including the Context V2 projection, into the baseline SYSTEM model context. `MODEL_EVALUATION_BOUNDARY.md` V3 incorrectly prohibited that exact current behavior; B1 reconciles §1 in V4 and freezes the observed envelope. The projection does not make `AgentProposalV1` a candidate output. Track B may neither remove/change that projection nor import the distinct candidate capability, prompt builder, schema or request-identity path.

### 5.2 Gate-E evidence semantics — an explicit prohibition

`GATE_E_CANDIDATE_SOURCE_PATHS_V1` (`apps/worker/src/gate-e-registration.ts:72`) contains no `realtime-runner.ts`, no `df13-*`, and nothing from `chat-runtime`, `commerce-kernel` or `conversation-engine`. Gate E scores the Context V2 candidate's outputs against a frozen corpus; it does not exercise the runner, the DF13 seam, the sales-cycle runtime or the effect path.

While the candidate remains offline it does not serve customers, so:

> **A Gate-E candidate PASS must never be written or read as "the Track B runtime candidate is accepted."** Gate-E evidence describes the offline candidate capability. It is not correctness evidence for the live runtime.

The contract reinforces the separation: realtime capture population is independent of Gate E and *"not admissible as Gate E data"*. Neither population substitutes for the other.

### 5.3 Candidate source identity still goes stale

Track B will modify `packages/business-tools/src/sales-strategy-v1.ts`, `guard.ts` and `reply-assembler.ts`, all inside the frozen candidate-source set. The accepted Gate-E candidate fingerprint therefore becomes stale for the changed candidate regardless of the capability decision. V5 anticipated this: *"A materially changed Track B candidate is expected to modify candidate-affecting source covered by current Gate-E fingerprinting. The pre-deploy re-evaluation boundary is therefore a known Track B deployment dependency."*

### 5.4 Where that boundary applies

V5 C4 is explicit that *"Local experiments and candidates not selected for deployment do not require release/promotion ceremony"*, while *"A materially changed candidate selected for PREPROD deployment — including a Track B authority-completion candidate — must pass the current shared pre-deploy provenance/re-evaluation boundary."*

So the re-evaluation boundary is a **deploy** gate, not a **merge** gate. Source work merges on focused tests, r31.3 differential, side-effect-free replay and exact-head CI. Deployment additionally requires the current re-evaluation path.

Follow V5 C4's order, and do not invert it:

1. run the current re-evaluation path using the minimal operational entrypoint;
2. use existing provenance/release evidence for promotion;
3. **only if** the governing contract still creates a concrete unacceptable blocker, propose the smallest separately authorized contract/enforcement amendment;
4. preserve exact candidate identity, reproducibility and rollback traceability.

Do not pre-build a new evidence profile, a second evaluation authority, or a redesigned governance model. Provider credentials stay outside GitHub Actions and repository contents; per V5 the provider-backed scored rerun runs in an authorized local/VPS/manual or scheduled environment while GitHub CI runs deterministic checks without credentials.

## 6. Execution dependency graph

```text
2026-08-29/30 owner messages authorize Track B source work and gated source-PR merge
        ↓
B1  scope lock merged
        ↓
B2.1  post-generation seam + side-effect-free differential foundation
        ↓
B2.2  model owns strategy and wording
        ↓
B2.3a claim verification as the primary correctness boundary
        ↓
B2.3b effect reconciliation
        ↓
B2.3c negotiation policy vs conversational strategy
        ↓
B2.3d size facts deterministic, wording model-owned, BF-04 closed or fenced
        ↓
B2.4  remove obsolete post-generation authority reachability
        ↓
B3    live-path differential + side-effect-free replay      ← primary evidence
        ↓
      exact-head canonical CI
        ↓
      MERGE
        ↓
B3.1  pre-deploy re-evaluation for the changed candidate    ← deploy gate only
        ↓
B3.2  owner-scoped deploy, readback, smoke
        ↓
      accepted Track B PREPROD baseline  →  Track C
```

The 2026-08-30 owner instructions supersede the earlier combined PR shape:
B2.3a and B2.3b are focused PRs in that order; B2.3c and the separate B2.3d
slice remain later work. The split does not waive BF-04, r31.3 or
model-evaluation constraints.

---

## 7. Tasks

### B1 — Scope lock

**Status:** complete and merged in PR #272 (`main@11ae2be565d7855457cdedef5986759824909004`). `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md` contains the closed call graph, effect/commit trace, authority-bundle disposition, KEEP/DEMOTE/SPLIT inventory, focused-test map and source-PR decomposition.

V5 taxonomy applies: **KEEP** deterministic authority for verified facts/claims/provenance, freshness/product scope, state consistency, side-effect authorization, auth/authz, PII/security, idempotency, fail-closed behavior, contradiction reconciliation and fixed safe fallback. **DEMOTE** deterministic logic that selects normal sales strategy instead of the model, writes normal customer-facing sales copy, rewrites a valid model draft for ordinary style or business preference, or hard-codes objection/CTA behavior as conversational authority rather than correctness. **SPLIT** mixed helpers only enough to preserve the deterministic technical boundary. No unrelated cleanup.

**Checkpoint:** independent review must report no blocker before B2.1 begins.

---

### B2.1 — Introduce an explicit post-generation seam in RealtimeRunner

**Size:** M · **Estimate:** 1–1.5 d · **Depends on:** B1 residuals closed

Create one explicit stage boundary between model generation and final delivery, so proposal handling stops being interleaved with copy production. Reuse the DF13 composition/executor/context/finalization owners; do not add a sibling top-level runtime.

**Acceptance criteria**

- COMMERCE continues through the single DF13 authority/composition seam;
- no duplicated persistence, queue, behavior-mode topology or authority resolver;
- LEGACY rollback semantics intact;
- behavior equivalent except for explicitly characterized internal seam changes;
- the pure reply-comparison core is extracted from `shadow-runner.ts` into `apps/worker/src/realtime-reply-differential.ts` without queue claim/completion writes, with `realtime-reply-differential.test.ts`, so r31.3 differential evidence exists before the first behavior-changing PR.

**Verification:** focused characterization tests; `shadow-runner.test.ts`; affected-workspace typecheck/build under `SOLO_PREPROD_MINIMAL`; r31.3 differential for any realtime behavior touched. Every later realtime PR reuses this adapter on its own exact head rather than waiting until B3.

---

### B2.2 — Make the model own normal strategy and wording

**Size:** M · **Estimate:** 1–1.5 d · **Depends on:** B2.1

Promote `strategyAnalysis` and `salesSignals` from optional advisory input to the strategy authority for normal conversation. Stop rewriting a valid model reply.

**Exact ownership** — keep the early input hint at `realtime-runner.ts:3471`; demote the later decision/rewrite at `4563/4581`, `postMediaProofCta()` at `4777`, and `limitResponseGroupPoliteness()` reached through final grouping at `4914/4922`. Primary source owners are `realtime-runner.ts` and `packages/business-tools/src/sales-strategy-v1.ts`.

**Acceptance criteria**

- `applyWave2ReplyPolicy` no longer rewrites a valid model reply on the migrated path — neither `limitQuestions` truncation nor deterministic CTA append;
- the second `decideWave2SalesStrategy` call no longer overrides model-proposed strategy for normal conversation;
- `postMediaProofCta` no longer appends post-guard deterministic sales CTA copy;
- final message grouping/splitting preserves transport shape without deleting valid model politeness wording;
- the **early** pre-evidence buying hint is retained: `DF06_READINESS_ROOT_CAUSE_CLOSURE_20260814.md` §18 sanctions a deterministic buying hint for the first reply strategy or error fallback before canonical evidence exists, with no side-effect authority;
- `BaselineModelCapability`, baseline prompt and observed serialized request envelope are byte-unchanged; if evidence shows a change is unavoidable, stop Track B incomplete and request a new separately scoped owner architecture decision;
- model output remains untrusted structured input and is schema-validated;
- valid model wording survives deterministic validation unchanged except for required safety, fact or effect rejection.

**Verification:** `apps/worker/src/track-b-post-generation-authority.test.ts`, `apps/worker/src/realtime-runner.test.ts`, `apps/worker/src/realtime-golden-transcripts.test.ts`, `packages/business-tools/src/sales-strategy-v1.test.ts`, `packages/business-tools/src/reply-assembler.test.ts`, plus exact-head r31.3 differential. Tests prove valid model wording ships unmodified and invalid claims/actions are rejected rather than silently rewritten.

---

### B2.3a — Structured protected claims as the primary correctness boundary

**Size:** M · **Depends on:** B2.2 · **PR shape:** focused B2.3a only per 2026-08-30 owner instruction

Verify protected claims against typed current facts and provenance so `guard.ts` and reply assembly stop acting as the primary reverse-parser and copy-repair layer.

This slice owns the SPLIT for reachable deterministic fact-to-copy and model-skipping producers: `catalogAdvisoryReply`, `renderPreSalePolicyReply`, `multiFactReply`, `multiProductReply`, `verifiedProductInfoProposal` and its XML description helpers, `requestedImagesProposal`, `productInfoLookupProposal`, and `assembleReply`. Keep typed facts, selected verified media, policy denials and bounded status/safety fallback; normal descriptive, advisory and CTA wording becomes model-owned.

**Acceptance criteria**

- price, stock, promotion, ETA and other non-size protected claims are checked against exact typed current provenance and product/variant or cart scope — `MODEL_CLAIM_BOUNDARY.md` requires rejecting **undeclared** protected claims; size/fit remains explicitly deferred to B2.3d and this slice does not claim BF-04 closure;
- unsupported, stale or mismatched claims reject the proposal or enter bounded recovery;
- the final text guard is defense-in-depth, not primary fact extraction or copy rewriting;
- verified facts and media already produced upstream are preserved when later stages fail, per r31.3;
- PII/security behavior remains fail-closed, and no mode may restore an unverified business claim (`BEHAVIOR_CONTROL_PLANE.md`);
- every rejection, override, repair and safe fallback carries a reason code.

**Verification:** `apps/worker/src/track-b-protected-claim-boundary.test.ts`, `realtime-runner.test.ts`, `unbounded-multi-product-text.test.ts`, `realtime-r32.2-compatibility-shield.test.ts`, `packages/business-tools/src/protected-claims.test.ts`, `size-claim-guard.test.ts`; include price/stock/promo/ETA mismatch, exact cross-product binding, stale/missing provenance, adversarial proposals, PII/security, verified-facts/media preservation and every named model-skipping path. The r31.3 runner differential must execute the migrated candidate against an immutable snapshot captured from the exact pre-slice head, not two configurations of the current runner.

---

### B2.3b — Separate requested effects from deterministic reconciliation

**Size:** M · **Combined estimate with later B2.3c:** 1–1.5 d · **Depends on:** B2.3a · **PR shape:** focused B2.3b only per 2026-08-30 owner instruction

**Acceptance criteria**

- model output cannot mutate state or execute side effects — `DF06_READINESS_ROOT_CAUSE_CLOSURE_20260814.md` §9: *"Model evidence has authorization `NONE`"*;
- policy, expected-version, CAS, idempotency, trusted-port and transaction checks remain deterministic;
- duplicate, stale-version, conflicting or unauthorized requests fail closed or use the existing deterministic conflict/handoff outcome;
- ambiguity or deterministic/model conflict resolves to the **less aggressive** action and emits evidence, never the more aggressive one;
- state and effect atomicity preserved;
- classify the current `realtime-sales-cycle.ts` renderers and retain exact transaction/effect facts, policy denial and minimal safe confirmation/clarification; normal negotiation prose is a B2.3c boundary and is not changed in this focused PR.

**Verification:** `apps/worker/src/realtime-sales-cycle.test.ts`, `packages/chat-runtime/src/sales-cycle-runtime.test.ts`, `sales-cycle-runtime-contract-mismatch.test.ts`, `packages/business-tools/src/effect-readiness.test.ts`, `negotiation-engine-v2.test.ts`; cover duplicate/idempotency, stale revision/cart version, unauthorized/malformed effects, exact renderer dispositions, checkout/payment transitions, transaction and CAS failures.

**B2.3b source disposition:** the byte-frozen `salesSignals.buyingIntent.requestedAction`
field is the structured request seam. A model-only request remains observable
with `authorization: NONE`; it cannot authorize an effect. When exact
deterministic commitment evidence corroborates a specific model request, the
canonical intent preserves that action while readiness requires the exact
action/product binding and model-proposed quantities require exact customer-text
evidence. Cross-action `OPEN_CART` compatibility no longer authorizes ADD or
SET mutations; default-one ADD and every explicit quantity are rebound to the
actual cart-open seed or mutation payload both in worker readiness and in the
final database transaction verifier. A deterministic/model conflict resolves to the less
aggressive decision and carries explicit reason codes. The database/DF13 final
transaction continues to revalidate freshness, expected versions, CAS,
idempotency, fence/policy and trusted ports before atomic state/effect commit.
The existing sales-cycle renderers in this slice are transaction facts, policy
denials and minimal safe confirmations/clarifications; negotiation prose remains
explicitly deferred to B2.3c, so this PR does not move or rewrite that prose.
The r31.3 evidence includes immutable pre-head captures for corroborated SET,
action mismatch, quantity-evidence mismatch and deterministic/model conflict.
The comparator truthfully reports the newly blocked unsafe baseline effects as
non-permittable authorization/claim/commit deltas; the positive SET case
preserves wording, facts, claims, commit and whole-group delivery while exposing
the expected new effect-authorization identity. These are source-only safety
changes and do not authorize the B3.2 bundle/pointer mutation.
The four B2.3b model conflict/mismatch codes remain canonical buying-intent
provenance only. They are deliberately not added to the dialogue-evidence
registry because deployed admin views 0032/0033 carry the frozen dialogue
allowlist and this source slice neither rewrites an applied migration nor adds a
new migration. The historical Gate-E binding is likewise left immutable: real
release-evidence and cutover integration tests now assert that changed Track B
source fails closed with `DF13_GATE_E_CANDIDATE_FINGERPRINT_MISMATCH`; downstream
startup/preparer unit tests isolate post-admission behavior with a mocked
validator. A fresh candidate evaluation remains the B3.1 pre-deploy dependency.

---

### B2.3c — Split negotiation policy authorization from conversational strategy

**Size:** S/M · **PR 4 combined estimate (B2.3b/c):** 1–1.5 d · **Depends on:** B2.3b

**Acceptance criteria**

- the model owns normal objection handling and conversational negotiation direction;
- deterministic code owns monetary adjustment limits, policy ceilings, quote arithmetic, evidence freshness and identity, fingerprints, CAS/version/idempotency;
- deterministic `READY/HESITANT/CAUTIOUS` progression does not remain normal sales-strategy authority where it still affects the active path;
- out-of-policy concessions cannot execute and cannot be legitimized by wording.

**Verification:** allowed and denied concession boundaries; stale evidence and version; replay, id-collision and idempotency; preserved money arithmetic.

**B2.3c source disposition:** COMMERCE derives one bounded internal negotiation
proposal only from the already schema-valid `strategyAnalysis`, the exact
source-message identity and the final protected-claim guard result. The model
proposal carries conversational direction and guarded wording but deliberately
accepts no protected-claim wording and carries no discount, quote, tier or
effect field; the post-transition cart renderer supplies the exact authorized
money and offer facts. `evaluateRealtimeSalesCycle`
revalidates that binding, then the existing trusted inbound, policy,
negotiation ledger, quote arithmetic, freshness, fingerprint, CAS/version and
effect-readiness owners remain the only path to a concession or commit.
`READY/HESITANT/CAUTIOUS` is therefore retained solely as a deterministic
monetary-policy ledger and no longer selects COMMERCE negotiation prose. The
accepted sales-cycle result carries its model wording authority through the
shared post-generation finalizer, so grouping cannot re-run the legacy
politeness deletion. The consumer also validates the exact proposal shape
before reading any field, making malformed inputs fail closed.
The legacy text matcher and `negotiationOfferText` remain reachable only for the
explicit LEGACY rollback; on COMMERCE the matcher is rejection-only and cannot
authorize strategy or an effect.

The exact pre-slice r31.3 capture is pinned to
`8591ed9fa5522f9ea50259fa3bf086efddb93cc8`. It preserves verified facts,
protected claims, commit outcome and whole-group shape. Model wording and
strategy are intentional differences; the protected-outbound readiness hash
also changes because it binds the changed payload, so the comparator truthfully
reports that non-permittable authorization-identity delta rather than masking
it. This source evidence does not authorize B3.2 bundle/pointer activation.

---

### B2.3d — Deterministic size facts, model-owned wording, BF-04 closed or fenced

**Size:** M · **Depends on:** B2.3a · **PR shape:** focused B2.3d only; no B3 or activation

BF-04's residual is a property of detecting size recommendations by reading Vietnamese prose: `detectConcreteSizeRecommendations` (`guard.ts:451-470`) drops any mention that `classifySafeExemptionForMention` (`guard.ts:389-394`) classifies as `QUESTION`, `NEGATION`, `CATALOG`, `STOCK` or `NON_CUSTOMER`, and no exemption heuristic over free text is complete. Making a declared, verified, in-scope claim the precondition for shipping size wording is the closure mechanism, and `MODEL_CLAIM_BOUNDARY.md` already mandates that direction.

**Hard precondition — fail-closed direction**

A reply whose text contains a concrete size recommendation with **no** declared, verified, in-scope protected claim must fail closed. The structured boundary is authoritative; the detector runs alongside it and may only reject, never approve. If that cannot be implemented in this slice, stop and amend rather than hiding the residual behind model wording.

BF-04 may be recorded as closed only with new regression evidence for the migrated path.

The B2.3d source branch now supplies that closure candidate: COMMERCE no longer
receives deterministic size prose or an automatically declared size claim; an
exact typed Size Engine claim must be declared by the bounded model proposal or
its single repair, and the final whole-group authorizer validates `SIZE_FIT`
alongside the other protected claims. Every COMMERCE proposal uses the
conservative size-token fence independent of inbound or model intent; the
prose detector remains reject-only and explicit LEGACY rollback retains its
prior semantic exemptions.
This is **source evidence only** pending independent review and exact-head CI;
it is not deployment or operational-acceptance evidence, so the deployed
`program-state.json` BF-04 disposition remains unchanged.

**Acceptance criteria**

- deterministic code produces verified size recommendation facts, needs-more-input and out-of-range signals without composing normal sales prose;
- model wording may use only verified size facts that passed the protected-claim boundary;
- invalid model output receives **exactly one** bounded repair request carrying safe reason codes and allowed evidence, per `MODEL_CLAIM_BOUNDARY.md`;
- after that bounded failure, use an approved safe clarification or handoff carrying no unsupported business claim, and a deterministic fallback built from verified facts as r31.3 requires — never a second sales-copy pipeline;
- the fallback preserves existing verified facts and media and cannot execute a failed or unauthorized protected effect.

**Verification:** verified recommendation, missing-input and boundary-size cases; explicit BF-04 bypass regressions for the migrated path; single-repair budget tests; deterministic verified-facts fallback tests; no-effect and preservation tests; r31.3 differential.

**Checkpoint:** review the authority boundary, BF-04 disposition and r31.3 evidence before B2.4.

---

### B2.4 — Remove obsolete post-generation authority from COMMERCE reachability

**Size:** S/M · **PR 5 combined estimate (B2.4/B3):** 1–1.5 d · **Depends on:** all B2.3 slices

Make the obsolete post-generation strategy and copy-repair authority unreachable from the active COMMERCE response path. Prove current reachability first; do not target files because they are old.

**Scope limits proven by B1**

- Keep the deterministic verified-facts fallback producers. `AGENTS.md:47` requires a deterministic fallback from verified facts when model **output** is malformed — a different failure mode from a missing input snapshot, which DF13 already blocks.
- Keep the early pre-evidence buying hint (DF06 §18).
- `packages/conversation-engine/src/sales-stage.ts` is already demoted to telemetry under COMMERCE; do not edit it unless current authority or a rollback need is proven.
- The retire targets are the post-generation pair — `decideWave2SalesStrategy` at `realtime-runner.ts:4563` and `applyWave2ReplyPolicy` at `4581` — plus the deterministic copy-repair path.

**Acceptance criteria**

- active COMMERCE no longer invokes obsolete post-generation strategy, objection/CTA playbook or model-rewrite authority;
- correctness and recovery semantics required by r31.3 are preserved in explicit stages before wrappers are disconnected;
- LEGACY rollback and non-COMMERCE consumers remain intact;
- physical deletion only after replacement, consumer migration, rollback review and zero-use proof.

**Current source trace:** `RealtimeRunner` now branches immediately after the
explicit post-generation seam. `COMMERCE_SELECTED` calls
`resolveCommercePostGenerationAuthority`, whose input surface has no legacy
strategy/rewrite callback; only `LEGACY_SELECTED` can call
`resolveLegacyPostGenerationAuthority`, which contains the second
`decideWave2SalesStrategy` plus `applyWave2ReplyPolicy` callback. The post-media
CTA helper is named and called as `legacyPostMediaProofCta` only inside the
LEGACY wording branch. Final delivery uses runtime authority directly: every
COMMERCE response, including deterministic transaction facts/confirmations,
uses the transport-only finalizer; only LEGACY can reach the politeness cleanup.
The early pre-generation strategy hint,
verified-facts/size fallback, structured guard/repair, negotiation/effect
reconciliation, whole-group delivery and DF13 commit/fence paths remain intact.
No helper is physically deleted because LEGACY rollback and focused rollback
tests remain current consumers.

The r31.3 acceptance capture now executes this selection through the actual
`RealtimeRunner`, not only through the extracted finalizer. It pins an immutable
snapshot from pre-B2.4 `main@a89a50cb52183a3ffc4f3d7bd313ea675564c07b`
whose bounded size repair deliberately contains wording that the LEGACY
politeness cleanup would change. The COMMERCE candidate preserves that wording
byte-for-byte while matching the pinned verified-fact, protected-claim,
effect-authorization, commit and whole-group delivery snapshot. Existing
invalid-repair/safe-fallback coverage and explicit LEGACY rollback coverage
remain part of the focused suite.

**Verification:** exact call-graph reachability sweep; focused COMMERCE tests proving new path selection; affected rollback-route tests; zero-use evidence before any deletion; r31.3 differential for the final migrated path.

---

### B3 — Live-path differential and side-effect-free replay

**Size:** M · **PR 5 combined estimate (B2.4/B3):** 1–1.5 d · **Depends on:** B2.4

**This is Track B's primary correctness evidence.** Because the Context V2 candidate stays offline, Gate-E evidence cannot stand in for it.

Complete the reproducible adapter whose pure comparison foundation is extracted in B2.1. It replays the **live baseline path** before and after demotion, with effects disabled or captured.

**Integration points**

- `apps/worker/src/shadow-runner.ts` (447 lines) already replays the baseline capability with `assembleReply`, `guardAgentProposal` and `textSimilarity`. Reuse it — the selected direction keeps the same capability, so it applies almost directly. It is **not** side-effect-free as it stands: `Phase4ShadowRunner` claims jobs and persists shadow-evaluation rows (`store.claimNext` 181, `store.complete` 320, `store.fail` 347, `store.claimComparisonNext` 353, `store.completeComparison` 365, 436). Extract its comparison core, or run it in a non-claiming mode.
- `apps/worker/src/commerce-authority-comparison.ts` (246 lines) compares LEGACY and COMMERCE state projections. Reuse for the state half; it says nothing about reply wording.
- No reply-behavior differential runner exists today, so this harness is new work that the earlier estimate did not carry.

**Pin for meaningful comparison:** model and provider-model identity; prompt/template identity; generation configuration; relevant policy/schema/config identity; fixed verified-fact and business fixtures.

**Acceptance criteria**

- one adapter exercises the full migrated decision path with side effects disabled or captured;
- it compares before/after authority changes on the same inputs and reports differences;
- it detects regressions from demoting deterministic strategy and copywriting;
- fixtures cover unsupported and protected claims, PII/security, unauthorized effects, stale or missing facts, malformed model output, the single-repair budget, deterministic verified-facts fallback, and BF-04 size regressions;
- replay cannot mutate customer or runtime state or send Meta messages — `BEHAVIOR_CONTROL_PLANE.md`: *"Offline or controlled legacy/new comparison is verification tooling, not a live authority mode. It must not create protected side effects."*;
- r31.3 differential output is produced and intentional deviations are explicit;
- the adapter is reusable by Track C; do not build a second replay framework, and do not require the full Wave1 population before Track B finishes.

**B3 source disposition:** `track-b-live-path-replay.ts` is a thin reusable
adapter over the B2.1 reply comparator and the existing commerce-authority
state comparator. It has no queue, delivery, persistence, provider or protected
effect port. Each capture records operational queue claims, customer sends,
durable state mutations and protected effects and fails closed if any count is
non-zero; in-memory commit plans remain comparison-only evidence. The corpus
pins baseline capability, configured provider/model, prompt/template,
generation config, policy/schema, behavior/authority-bundle and fact-fixture
identities. One immutable capture from exact pre-B2.4
`a89a50cb52183a3ffc4f3d7bd313ea675564c07b` is replayed through the current
`RealtimeRunner`; verified facts, protected claims, effect authorization,
commit and whole-group delivery must match rather than being reclassified as
permitted changes. Every risk label is paired with an executable, reason-coded
postcondition; a label without its assertion is rejected before replay. The
commerce state comparison is built from each capture's actual commit plan or
loaded unchanged state, takes product scope only from the BUILT canonical
Context V2 capture product binding, and fails closed when that binding is
blocked or absent. It is checked against an exact expected PII-safe state
projection, so current-vs-current execution or unchanged LEGACY product state
cannot hide canonical product-binding drift. Identity
evidence separates the configured provider model from the deterministic fixture
model and binds the unchanged live-path source revision, baseline, grounded,
grounded-draft, size-repair and customer-URL-explanation prompts, the accepted
grounded-draft and verified-fact-assembler runner flags, customer-URL policy,
the exact structured-agent and structured-grounded-draft generation configs and
Vertex response schemas, policy/schema, complete business fixtures,
case inputs, risk assertions and expected state projections. The live-path
fixtures cover unsupported and protected claims, PII/security, unauthorized
effects, stale and missing facts, malformed generation, the one-repair cap,
verified-facts fallback and BF-04 size. This is source verification only; it is
not Gate-E, deploy or operational evidence.

---

### Merge boundary — acceptance evidence for Track B source work

Track B source work merges on:

`focused tests` + `r31.3 differential` + `side-effect-free replay` + `exact-head canonical CI`

A Gate-E scored run is **not** required to merge while the Context V2 candidate remains offline. A zero-step CI run is unavailable, not a pass.

---

### B3.1 — Pre-deploy re-evaluation for the changed candidate

**Size:** S/M · **Estimate:** 0.5–1 d for the minimal operational path · **Depends on:** merged Track B source, and only when a deploy is intended

This slice is **off the merge critical path** and applies only to a candidate selected for PREPROD deployment.

Track B modifies `sales-strategy-v1.ts`, `guard.ts` and `reply-assembler.ts`, which are inside the frozen candidate-source set, so the accepted Gate-E fingerprint is stale for the changed candidate and the pre-deploy re-evaluation boundary applies.

**Required sequence, following V5 C4 order**

1. Provide the minimal operational entrypoint around the existing runner — CLI/command adapter, registration-path inputs, existing evidence-store wiring, existing provider transport, redacted result output. Reuse `executeGateEScoredRun(...)`; do not rebuild scorer or evidence logic.
2. Run the current governing re-evaluation path for the exact candidate.
3. Use existing provenance and release evidence for promotion; do not invent a competing promotion manifest.
4. **Only if** the governing contract still creates a concrete unacceptable blocker, propose the smallest separately authorized contract or enforcement amendment. Do not pre-build a new evidence profile or second evaluation authority.

**Acceptance criteria**

- no stale candidate fingerprint is presented as Track B proof;
- no Gate-E result is described as acceptance of the live runtime;
- provider credentials stay outside GitHub Actions and the repository;
- no authority, config or database pointer mutation and no deployment occurs in this slice.

---

### B3.2 — Owner-scoped deploy, readback and smoke

**Size:** S/M · **Estimate:** 0.5–1 d · **Depends on:** B3.1 evidence accepted and the active 2026-08-31 owner operational authorization

**Activation impact — B1 closed finding.** This is an **authority-bundle and behavior-identity mutation**, not source-deploy-only. Context V2 gives its strategy and CTA consumers explicit contract identities (`CONTEXT_V2_STRATEGY_INPUT_V1` and `CONTEXT_V2_CTA_INPUT_V1`). The selected live proposal instead comes from the byte-frozen baseline `AgentProposalV1.strategyAnalysis` / `salesSignals` contract. Source contains no contract equating those identities. Keeping `strategy/cta: CONTEXT_V2` after that proposal becomes normal authority would therefore make the bundle declaration misleading.

Track B must define the truthful replacement labels, derive a new canonical bundle hash and behavior content identity, and keep the fixed consumer set and empty bypass set unless separately justified. A configurable env-only switch remains forbidden. The changed identity requires a reviewed page-scoped pointer/CAS/readback/rollback path. The B1 statement that migration `0036` was conditional is historical authorization context only: it was later separately authorized, applied and read back on the approved ENGINEERING_PREPROD target; it is not authorization to apply any migration elsewhere.

**Required sequence**

1. Bind execution to the owner authorization for `ENGINEERING_PREPROD`; stop on any scope mismatch or ungranted boundary. Migrations `0036`, `0037`, and `0038` are applied and exactly read back there. Pending migration `0039` is a separately governed V2-LKG guard prerequisite and is not applied by the current source-only phase. The executable B3.2 adapter remains a separately reviewed source boundary before any service, fence, or pointer mutation.
2. Bind the exact candidate V2 bundle, behavior version/content hash/revision/source and one exact compatible last-known-good V2 release before mutation. V1/LEGACY is not a Track B rollback target.
3. Persist the self-hashed release-local candidate/LKG record, including both releases' source commit/tree, image digest/tag/build labels, runtime-config hash, behavior pointer revision/version/bundle, startup hash, Gate E certification and a database-derived migrations-through-0039 schema compatibility hash. Before an initial `CURRENT_ACCEPTED_V2` LKG record, prove the currently running service mounts the exact startup artifact hash and has a fresh exact DATABASE runtime-resolution readback for the active pointer. Then stage the exact target stopped/non-admitting, acquire the reviewed durable page fence, prove the database admission gate is `HELD` for every reachable claim transition, stop the exact source service and prove zero in-flight authority-dependent work, and use the reviewed pointer writer for the exact CAS. Durably queued/held work may remain and is recorded; it is not in-flight authority. No manual SQL or env-only authority selector.
4. Start the exact staged target only after exact CAS/readback. While the fence remains held, prove its service/image/config identity, runtime authority, activation audit and exact `DATABASE` readback from the full consumer set. Fence release has no service-start capability.
5. Before-CAS failure retains/restores the currently accepted V2 when it was stopped, discards the staged target and releases only after exact runtime/consumer readback. Post-CAS failure reverses the exact CAS to the recorded LKG V2, restores its exact V2 service and releases only after the same readback. Missing, stale, ambiguous or schema-incompatible LKG evidence retains the fence and never falls back to V1.
6. Run meaningful pre-activation readiness, then post-activation authority readback, smoke and controlled test-page checks. Failed or unknown runtime state stops further mutation and restores the exact previous authority and affected-service identities.

The concrete built operator is `node apps/worker/dist/track-b-commerce-authority-preprod-cli.js`. It accepts only fixed `ENGINEERING_PREPROD` page `1198992073286645` / `MESSENGER` inputs and reads the database credential only from the fixed secret file. `build` refuses a dirty or different checkout before and after the build, derives the build identity from the exact commit/tree plus an exact non-secret runtime-config projection, applies all three immutable image labels, and reads the image identity back. `prepare` derives—not accepts as operator input—the migration/schema compatibility hash from exact database ledger, 0039 fence-guard and 0038 admission-guard/trigger readback; it also proves the current LKG service's exact mounted startup artifact and DATABASE runtime resolution before allowing `CURRENT_ACCEPTED_V2`. It then validates a candidate V2 and an accepted LKG V2 independently. On a rollback, that immutable LKG artifact must prove the earlier accepted pointer identity; the operator derives a separate, self-hashed operation-target startup artifact for the new forward CAS revision. It binds source, operation-target and reverse-CAS startup artifacts into one self-hashed record and packet. `execute`/`recover` reread those artifacts and verify their canonical hashes, exact pointer/service/release semantics and validated Gate E evidence before constructing the database or service boundary. The operator accepts only `ACTIVATE_V2_CANDIDATE` and `ROLLBACK_TO_LKG_V2`; startup authorization accepts the rollback marker only with the active V2 bundle. No Track B operator branch accepts `ROLLBACK_TRACK_B`, a V1 bundle, an OCI-only legacy identity or a third authority. Runtime proof binds the exact pointer used for subsequent full-consumer proof; neither a CAS acknowledgment nor an unproved startup can populate that binding. `execute` and `recover` delegate every stage-container, service, fence, admission, pointer, runtime and recovery action to `TrackBCommerceAuthorityMutationPorts`; they cannot select another page, channel, compose project, container, secret path, or public-production environment.

---

## 8. Track B completion gate

1. Active COMMERCE normal strategy, objection/CTA choice and wording are model-owned.
2. Deterministic code remains authoritative for verified facts/provenance, security/PII, protected claims, policy, effect reconciliation/authorization, CAS/idempotency and fail-closed behavior.
3. `BaselineModelCapability` and its exact observed request envelope are byte-unchanged.
4. The Context V2 candidate remains offline/evaluation-only; Track B contains no candidate-promotion path.
5. The DF13 composition remains the single COMMERCE authority seam; no second permanent runtime or control plane was created.
6. Invalid model output is bounded to exactly one repair, cannot execute protected effects, and falls back to verified facts without becoming a sales copywriter.
7. BF-04 is either closed with evidence for the migrated path or explicitly remains a fenced known residual that Track B does not increase or misrepresent.
8. Obsolete post-generation authority is unreachable from active COMMERCE, or explicitly retained for a proven rollback or non-COMMERCE consumer.
9. The live-path differential and side-effect-free replay pass required safety and correctness assertions, and r31.3 differential evidence is reviewed.
10. No Gate-E result is represented as acceptance of the live runtime.
11. Required focused tests and checks pass on the exact implementation heads from a functioning canonical CI run; a zero-step CI job is not a pass.
12. Any deployed candidate passed the current pre-deploy re-evaluation boundary.
13. Every authority or config mutation, if any occurred, was inside an explicitly scoped owner instruction and has exact readback and rollback identity.
14. No unrelated UR/State V2/admin/multi-page/production-hardening work was pulled in.
15. One exact accepted PREPROD COMMERCE V2 baseline is recorded as the initial Track B LKG V2 for Track C.
16. Final owner decision records Track B completion; source merge alone is not completion evidence. The administration task separately validates the handoff and owns any Track C task creation.

Track C handoff data only: C0/C1.1/C2/C3 use Terra High, C1 MUST_PASS and C4 use Sol High, hard bugs or semantic drift escalate to Sol High, and each source PR retains one fixed independent Sol High reviewer. This does not authorize Track C work. After genuine `TRACK_B_COMPLETE`, this implementation task reports the exact checkpoint to the administration task and stops; the administration task owns creation of any new Track C task.

## 9. State V2 / UR decision rule

Track B leaves `stateReadMode=LEGACY` unchanged. During implementation, record concrete evidence if the legacy read representation causes contradictory or duplicated sources of truth, incorrect cart/checkout/reconciliation behavior, unavoidable semantic translation that materially distorts the migrated path, concurrency or atomicity problems unsolvable within current persistence/CAS contracts, or a blocker to an explicit correctness invariant. Such evidence may justify a later separately approved narrow slice. Architectural neatness is not a trigger. Do not silently expand Track B into UR.

## 10. Estimated execution time

Excludes external provider and infrastructure waiting.

| Slice | Estimate |
|---|---:|
| B1 | complete, reviewed and merged |
| PR 1 — B2.1 seam + differential foundation | 1–1.5 d |
| PR 2 — B2.2 post-generation authority demotion | 1–1.5 d |
| B2.3a + later B2.3d across two focused PRs — structured claims, then BF-04/one repair | 1.5–2 d combined |
| B2.3b + B2.3c across two focused PRs — effect, then negotiation reconciliation | 1–1.5 d combined |
| B2.4/B3 reachability + final replay | 1–1.5 d |
| Authority identity / activation-path source | 0.75–1.25 d |
| **To merge** | **6.25–9.25 d** |
| B3.1 (deploy gate only) | 0.5–1 d |
| B3.2 (owner-authorized deploy + authority mutation) | 0.5–1 d |
| **Including pre-deploy evaluation and deploy** | **7.25–11.25 d** |

The source total is the arithmetic sum of the six locked PR ranges and matches the B1 findings. Provider/infrastructure waiting remains excluded.

### Source-PR decomposition locked by B1

1. **PR B2.1:** explicit post-generation seam plus pure, non-claiming reply-comparison core; characterization only.
2. **PR B2.2:** make baseline structured strategy/wording authoritative; demote the second strategy decision, `applyWave2ReplyPolicy`, `postMediaProofCta` and final politeness deletion; exact-head r31.3 differential.
3. **PR B2.3a:** split every named deterministic fact-to-copy/model-skipping producer and add the non-size structured protected-claim fail-closed boundary with verified-facts/media preservation.
4. **PR B2.3b:** preserve the structured model effect request only when deterministic evidence corroborates it; retain exact-action readiness and transaction-time reconciliation.
5. **PR B2.3c:** separate conversational negotiation from deterministic policy arithmetic, limits and authorization.
6. **PR B2.3d:** close or explicitly fence BF-04, make size wording depend on a declared verified claim, and retain exactly one bounded repair.
7. **PR B2.4/B3:** remove obsolete COMMERCE reachability, complete full side-effect-free replay and final r31.3 evidence.
8. **PR authority identity / deploy preparation:** truthful authority-bundle labels, new bundle/behavior identity and reviewed pointer/CAS/readback/rollback tooling. It may merge as source only; no runtime mutation occurs without a new owner command.

## 11. Main risks and stop conditions

### The frozen baseline cannot select adequate strategy or CTA

If B3's differential proves the model does not reliably supply an adequate CTA or strategy once deterministic authority is removed, stop Track B incomplete. Baseline-envelope changes and candidate promotion require a new owner-scoped architecture decision outside this plan.

### Deterministic repair becomes a hidden sales copywriter

Stop if fallback routinely chooses normal sales strategy or rewrites model output into handcrafted Vietnamese sales copy. Fallback is limited to one bounded repair, then an approved safe clarification or handoff, plus the verified-facts recovery r31.3 requires.

### BF-04 exposure increases

Stop B2.3d if model-owned size wording can reach an unverified size-claim bypass not closed or fenced by the structured claim boundary. Never represent the residual as fixed without evidence.

### Correctness loss while removing deterministic logic

Separate verified-fact, policy and effect invariants before retiring conversational authority. Add focused tests and r31.3 differential evidence before reachability removal.

### Gate-E evidence is misrepresented

Stop if any artifact states or implies that a Gate-E candidate PASS accepts the live runtime while the candidate remains offline.

### Accidental second architecture

Stop if implementation creates a sibling top-level COMMERCE runtime, new persistence or queueing, long-lived behavior modes, a duplicated authority resolver or control plane, or a second replay or scored-run framework. Extend the DF13 seam instead.

### Activation turns out to require an authority mutation

The identity change is known, not conditional. Stop before runtime mutation unless the exact new/previous bundle and behavior identities, writer/CAS/readback path, rollback path and owner authorization are all present. Do not improvise a database or authority mutation at deploy time.

### CI cannot produce exact-head evidence

A remote run that starts zero repository steps is unavailable, not a pass. Use only `CI_UNAVAILABLE_FALLBACK` bound to the exact head, and otherwise stop merge and ship verification.

### Removed process ceremony is reintroduced

Stop if a slice requires a Release Train boundary, a second owner-approval record, tag or manifest attestation, or runtime-state promotion as a default gate. `SOLO_PREPROD_MINIMAL` removed these.

### Premature cleanup breaks rollback

Do not physically delete old implementations. V1/LEGACY stays dormant for existing non-Track-B contracts and historical evidence, but Track B rollback no longer depends on or selects it.

### Legacy state becomes a real blocker

Record the evidence and stop the affected slice. Do not solve it by silently starting State V2 or UR inside Track B.

## 12. Definition of Done for every implementation PR

Each implementation PR must satisfy its explicit acceptance criteria; test new behavior and important error and fail-closed paths; preserve r31.3 verified facts and media and produce the required realtime differential evidence; keep existing applicable tests green where actually run; preserve business, security and data correctness and backward compatibility unless an explicit migration decision says otherwise; avoid duplicated business logic, dead code and unrelated refactors; carry appropriate focused lint, type, build and integration checks for the changed boundary under `SOLO_PREPROD_MINIMAL`; reason-code every rejection, override, repair and safe fallback; account for candidate provenance when authority-affecting source changes; document any changed contract or current truth that future work depends on; preserve an explicit rollback target for deployed runtime changes; and never claim CI, Gate-E, runtime, migration, activation or deploy evidence unless that exact action actually ran and produced inspectable evidence.
