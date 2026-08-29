# Track B — B1 Scope Lock Findings

**Status:** `B1_COMPLETE_REVIEW_PENDING / EVIDENCE_ONLY / NO_RUNTIME_MUTATION`
**Implementation head traced:** `main@53408456ecaac8c8936061c9c3fd8275d6bdb179`
**Authorization source:** owner message dated 2026-08-29 in Codex task `019ff0ed-3760-7e81-98f4-5e91e8ca35b0`
**Authorized scope:** Track B source implementation only. This is not authorization to merge, deploy, migrate, tag/release, mutate an authority pointer, change routing/control-plane/VPS state, send Messenger traffic, or promote public production.

This is the normative B1 source-trace record. It closes the scope-lock questions required before B2.1; it does not activate anything.

---

## 1. Normative direction

Track B has one current direction:

1. keep `BaselineModelCapability` and its request envelope byte-frozen;
2. keep the Context V2 candidate offline/evaluation-only;
3. make the baseline `AgentProposalV1.strategyAnalysis` and `salesSignals` authoritative for normal conversational strategy;
4. demote only post-generation deterministic strategy, CTA and ordinary-copy rewrites;
5. retain deterministic facts, claim validation, state consistency, effect authorization, security, idempotency, fail-closed handling and safe fallback.

### Retracted historical analysis

Earlier revisions of this file analyzed promoting the Context V2 candidate into the live path, including candidate snapshot availability, candidate queue ownership and a live-candidate fallback. That analysis is **RETRACTED / HISTORICAL / NON-NORMATIVE**. It does not describe the selected architecture and must not be used to scope B2 or B3.

Candidate promotion would contradict the current owner direction and `contracts/MODEL_EVALUATION_BOUNDARY.md` §6 unless separately reconsidered under a future authorization. Track B creates no third live generation capability.

---

## 2. Exact live call graph and authority trace

### 2.1 Generation

- `apps/worker/src/realtime-server.ts` supplies `baselineModelCapability(vertexModel)` to the COMMERCE runner.
- `apps/worker/src/vertex-baseline.ts` defines the byte-frozen capability.
- `apps/worker/src/realtime-runner.ts` obtains DF13 runtime context, serializes `Df13CommerceRuntimeContext` — including its Context V2 projection — into model context, and calls baseline `generate`.
- The baseline returns `AgentProposalV1`, including `strategyAnalysis` and `salesSignals`.
- `context-v2-candidate.ts` is not imported into the served realtime generation path. It remains offline/evaluation-only.

The Context V2 projection is model input context; it does not turn the baseline output into the candidate output contract.

### 2.2 Post-generation strategy and copy

Two deterministic strategy uses have different authority roles and must not be removed together:

- the earlier `decideWave2SalesStrategy` use supplies a pre-generation buying hint. Keep it unless later evidence proves it writes customer-facing authority;
- the later `decideWave2SalesStrategy` use and `applyWave2ReplyPolicy` run after generation and can replace normal model strategy, limit questions and append deterministic CTA copy. These are the primary DEMOTE boundary.

`reply-assembler.ts` and `guard.ts` mix correctness enforcement with ordinary wording repair. They require a SPLIT: preserve fact/claim/security checks and bounded fail-closed behavior, while removing arbitrary phrase surgery and normal sales-copy authority.

### 2.3 DF13 admission and finalization

- `df13-commerce-runtime-composition.ts` builds the single runtime seam.
- `df13-commerce-runtime-executor.ts` admits exact runtime identity and fence/readiness inputs; it does not own conversational wording.
- `df13-commerce-runtime-finalization.ts` and `df13-commerce-fence-commit.ts` preserve final commit and fence semantics.
- Protected-outbound gating keeps the reply, claims, sales-cycle plan and effect intent as one accepted or rejected group.

DF13 remains the admission/fence/final-commit boundary. Track B must not create a reply path around it.

### 2.4 State, policy, negotiation and effects

`packages/chat-runtime/src/sales-cycle-runtime.ts` is a pure transition boundary over trusted ports:

1. read and validate current state/context;
2. derive policy, cart, inbound and revalidation decisions;
3. produce the next state plus tag/handoff/payment/confirmation intents;
4. commit through repository compare-and-swap;
5. emit no effects when CAS loses.

The commerce-kernel policy and negotiation path remains deterministic for limits, arithmetic, freshness, idempotency and authorization. Model evidence may classify intent; it cannot authorize a protected effect. `effect-readiness.ts` validates the whole binding tuple and fails closed with authorization `NONE` on mismatch.

The realtime commit path applies the protected-outbound gate before building one `RealtimeCommitInput`. Fresh COMMERCE commits include the required Context V2 capture and pass through the existing DF13 finalizer/fence. No Track B slice may split message delivery from its claim/effect/state decision.

---

## 3. Authority-bundle and behavior identity disposition

The current canonical payload in `packages/database/src/df13-commerce-authority-bundle.ts` declares:

- `strategy: "CONTEXT_V2"`;
- `cta: "CONTEXT_V2"`;
- `legacySalesStage: "DEMOTED_TELEMETRY_ONLY"`.

Source evidence does **not** prove that those labels remain truthful after baseline `AgentProposalV1.strategyAnalysis` becomes the live strategy authority:

- `packages/contracts/src/v2/context-v2.ts` explicitly identifies the Context V2 strategy consumer as `CONTEXT_V2_STRATEGY_INPUT_V1` and the CTA consumer with its own Context V2 contract identity;
- the baseline produces `AgentProposalV1`, not `CONTEXT_V2_STRATEGY_INPUT_V1` and not the offline candidate output;
- receiving a Context V2 projection in the request context is not contractual equivalence between those output authorities.

Therefore the previous “source-deploy only / bundle unchanged” conclusion is retracted. Track B changes the truthful strategy/CTA authority labels, the canonical authority-bundle hash, and the behavior content identity.

B3.2 is consequently an authority mutation, not an ordinary source deploy. Before any activation it must have separate owner authorization and must provide:

1. exact new bundle payload/hash and behavior content identity derived from source;
2. exact previous bundle/version/hash/revision/source rollback identity;
3. a reviewed writer path with expected-revision compare-and-swap;
4. authoritative `DATABASE` readback of the new value;
5. an exact rollback operation and post-rollback readback.

Migration `0036` is not assumed. It is used only if the selected source path proves that a schema or writer change is necessary, and only under separate migration authorization.

---

## 4. Reachable-component disposition

| Reachable component | Disposition | Locked boundary |
|---|---|---|
| `BaselineModelCapability` and request builders | KEEP | Byte-frozen generation envelope |
| Context V2 candidate and Gate-E evaluator | KEEP | Offline/evaluation-only; no live promotion |
| DF13 context read/capture | KEEP | Verified input and durable capture |
| Baseline `AgentProposalV1.strategyAnalysis` / `salesSignals` | KEEP / elevate within existing output | Normal strategy evidence becomes conversational authority after validation |
| Pre-generation buying hint | KEEP | Input hint only; no customer-facing copy authority |
| Post-generation `decideWave2SalesStrategy` | DEMOTE | Must not override valid model strategy for business preference |
| `applyWave2ReplyPolicy` question limiting and CTA append | DEMOTE | Must not rewrite valid normal model wording |
| `reply-assembler.ts` | SPLIT | Keep assembly/provenance; remove ordinary-copy repair authority |
| `guard.ts` protected-claim/security validation | KEEP | Fail closed on unsupported or unsafe content |
| `guard.ts` arbitrary phrase removal / damaged-remainder shipping | DEMOTE | Reject/repair/fallback instead of silent copy surgery |
| Verified facts, catalog/media and size-engine calculations | SPLIT | Keep typed facts; model owns normal wording |
| Deterministic verified-facts fallback | KEEP | Safe fallback, never a second sales-copy pipeline |
| Sales-cycle state machine | KEEP | State consistency and pure transition authority |
| Commerce policy/negotiation limits and arithmetic | KEEP | Deterministic correctness and less-aggressive conflict resolution |
| Effect readiness/authorization | KEEP | Whole-tuple fail-closed authorization |
| Repository CAS/idempotency | KEEP | No effects on lost/stale commit |
| Protected-outbound whole-group gate | KEEP | Reply/claims/state/effects accept or reject together |
| DF13 executor/fence/finalization | KEEP | Exact identity, readiness and final commit |
| Shadow queue claim/lease/persistence worker | KEEP outside comparator | Operational worker is not a side-effect-free replay harness |
| Pure reply comparison core to extract in B2.1 | SPLIT / add seam | Side-effect-free r31.3 differential on every realtime PR |
| Authority bundle/writer/readback/rollback | SPLIT in B3.2 | New truthful identity under separately authorized mutation |

This inventory covers every reachable authority class found in generation, post-generation rewrite, state/policy/negotiation, effect, final commit, replay/evaluation and activation paths. File-local helpers inherit the disposition of the boundary they implement.

---

## 5. BF-04 and bounded repair

BF-04 remains `PARTIAL_KNOWN_GAP_OWNER_WAIVED_FOR_DF_PROGRESSION`; B1 does not claim it is fixed.

The present size boundary detects recommendations by parsing Vietnamese prose and applying exemptions. That cannot be the primary durable authority. Under `contracts/MODEL_CLAIM_BOUNDARY.md`, size/fit is a protected claim: a proposal must declare it structurally, bind it to current typed evidence and fail closed when undeclared, stale or unsupported.

The locked B2 boundary is:

1. validate structured protected claims before wording can ship;
2. reject unsupported or undeclared protected claims with a safe reason code;
3. allow **exactly one** bounded model repair containing allowed evidence and safe reason codes;
4. after that one failure, use an approved clarification or handoff with no unsupported business claim;
5. preserve verified facts/media through downstream failure per r31.3;
6. retain the text detector only as defense in depth until new migrated-path regressions justify closing BF-04.

No flag or incident mode may restore an unverified claim.

---

## 6. r31.3 differential direction

There is no existing side-effect-free reply-behavior differential harness:

- `commerce-authority-comparison.ts` compares authority/state projections, not final reply behavior;
- `shadow-runner.ts` owns queue claims, leases and persistence, so invoking it directly is not side-effect-free.

B2.1 must first extract a pure comparison core plus a thin adapter that can run baseline and changed reply behavior on the same captured input without claiming queue rows, sending messages, committing state or authorizing effects. Every later PR that changes realtime behavior must run that adapter on its exact head; B3 cannot be the first differential run.

Required assertions include:

- verified facts and media survive downstream model/repair/enrichment failures;
- protected outbound remains whole-group;
- malformed output cannot permanently fail an Inbox item merely because generation failed;
- intentional wording/strategy differences are explicit and reason-coded;
- facts, claims, effect authorization and commit outcomes remain equivalent unless a reviewed contract permits a difference.

Realtime differential evidence and Gate-E evidence remain separate populations. Neither can substitute for the other.

---

## 7. Focused test map

| Boundary changed | Exact focused verification |
|---|---|
| Pure replay/differential seam | `apps/worker/src/shadow-runner.test.ts`, `commerce-authority-comparison.test.ts`, new side-effect-free adapter tests |
| Baseline proposal becomes strategy authority | `apps/worker/src/realtime-runner.test.ts`, `realtime-golden-transcripts.test.ts`, `realtime-sales-cycle.test.ts`, r31.3 differential |
| Strategy/CTA override demotion | `packages/business-tools/src/sales-strategy-v1.test.ts`, `reply-assembler.test.ts`, realtime golden transcripts |
| Structured protected claims | `packages/business-tools/src/protected-claims.test.ts`, `size-claim-guard.test.ts`, `apps/worker/src/realtime-runner.test.ts` adversarial proposal cases |
| Size/BF-04 | `packages/business-tools/src/size-claim-guard.test.ts`, `size-engine.test.ts`, malformed/undeclared/stale claim cases |
| One repair and safe fallback | realtime runner tests for zero/one/two-attempt boundaries, verified-facts/media preservation, Inbox retry semantics |
| Sales-cycle transition/CAS | `packages/chat-runtime/src/sales-cycle-runtime.test.ts`, `sales-cycle-runtime-contract-mismatch.test.ts` |
| Policy/negotiation/effect readiness | `packages/business-tools/src/policy-engine.test.ts`, `negotiation-engine-v2.test.ts`, `effect-readiness.test.ts`, plus `packages/commerce-kernel/src/protected-sales-transition.test.ts` |
| DF13 admission/fence/final commit | `df13-commerce-runtime-executor.test.ts`, `df13-commerce-runtime-finalization.test.ts`, `df13-commerce-authority-fence.test.ts`, `df13-runtime-authority-boundary.integration.test.ts` |
| Authority identity preparation | `df13-commerce-authority-bundle.test.ts`, `df13-commerce-authority-contract.test.ts`, behavior writer tests, cutover/readback/rollback tests |
| Candidate fingerprint impact | Gate-E registration/fingerprint tests; governed Gate E only if later selected for deployment |

Each source PR also runs affected-workspace typecheck/build and exact-head canonical repository checks. Gate E is a pre-deploy gate for a deployment-selected candidate, not a merge gate while the candidate stays offline.

---

## 8. Locked source-PR decomposition and estimate

The minimal source sequence before any separately authorized activation is:

1. **B2.1 — seam and differential foundation**: characterization plus pure side-effect-free r31.3 comparator. Estimate `1–1.5 d`.
2. **B2.2 — strategy authority/demotion**: baseline proposal owns normal strategy; remove post-generation strategy/CTA override. Estimate `1–1.5 d`.
3. **B2.3a/d — structured claims, BF-04 and one repair**: typed protected claims, exactly one repair, verified-facts fallback. Estimate `1.5–2 d`.
4. **B2.3b/c — effect negotiation**: model proposes, deterministic policy authorizes, whole-group delivery preserved. Estimate `1–1.5 d`.
5. **B2.4/B3 — reachability and final replay**: eliminate superseded live authority, prove no bypass and run final differential. Estimate `1–1.5 d`.
6. **Authority identity/deploy preparation source**: new bundle/behavior identity, writer/readback/rollback preparation only; no mutation. Estimate `0.75–1.25 d`.

Estimated remaining source/merge work after B1: `6.5–10.5 engineer-days`. A later authorized deployment/authority mutation adds approximately `0.5–1 day`, excluding queue/provider delay and any separately proven migration.

Slices may be combined only when the exact diff stays independently reviewable and no realtime behavior change lands before its r31.3 evidence. They may be split further if BF-04 or authority-writer evidence demands it.

---

## 9. B1 completion truth

B1 has now established:

- one normative baseline/demotion architecture;
- the full served call graph through effects and final commit;
- the KEEP/DEMOTE/SPLIT disposition for reachable authority classes;
- the authority-bundle/behavior identity change and B3.2 mutation boundary;
- BF-04 fail-closed and exactly-one-repair requirements;
- the r31.3 harness direction before behavior changes;
- the focused-test map and re-estimated source-PR sequence;
- source-only authorization boundaries.

B1 remains `REVIEW_PENDING` until the required independent reviewer accepts the exact PR head and exact-head canonical checks pass. B2.1 must not start before that checkpoint, and merge still requires a separate owner command.
