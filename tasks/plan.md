# Track B — Model Authority Execution Plan

**Status:** `PROPOSED / PLAN_ONLY`
**Program point:** post-Track-A / post-Gate-F, V5 Track B
**Source baseline:** `main@3dde67234a732bae2a50e93cdf3f2892202e4207`
**Environment:** `ENGINEERING_PREPROD`, one bounded `PREPROD_TEST_PAGE`

## 1. Purpose

Execute V5 Track B by replacing the current deterministic-heavy COMMERCE business/reply orchestration with a small explicit Commerce runtime boundary in which:

- the model owns normal conversational semantics, normal sales strategy, and normal customer-facing wording;
- deterministic code owns verified facts/provenance, safety/security/PII, effect authorization/reconciliation, idempotency/CAS, fail-closed behavior, and bounded fixed safe fallback;
- deterministic code does not remain a second Vietnamese sales copywriter;
- existing platform plumbing (database, Inbox/Outbox, Meta delivery, contracts, durable messaging, cart/money correctness, security primitives) is reused rather than rebuilt.

This is an implementation refinement of the adopted V5 Track B direction, not a new architecture program or an additional Track.

## 2. Current-state and governance assumptions

1. Track A / DF-C / Gate F are complete and are not reopened by this plan.
2. Current accepted runtime state remains `salesAuthorityMode=COMMERCE`, `stateReadMode=LEGACY`.
3. Track B does **not** change `stateReadMode`, create State V2, start UR/Gate U, or perform a state migration.
4. PR #269 (`SOLO_PREPROD_MINIMAL`) is still pending at plan creation time. Before the first implementation PR is shipped or deployed, re-read the governance merged on `main` and obey the then-active process. If PR #269 is merged unchanged, use its default flow: branch -> focused verification -> PR/CI -> merge -> exact-commit deploy -> smoke, with stronger Release Train/review only when risk-triggered.
5. Existing Gate-E/DF13/release-integrity evidence is reused where still applicable. Material changes to candidate identity or an authority-sensitive contract require the owning evidence to be re-derived/rerun; old evidence must not be relabelled as current proof.

## 3. Target architecture

```text
sanitized inbound + verified state/facts
        ↓
VerifiedContext
        ↓
ModelProposal
  - semantic/sales intent
  - normal customer-facing draft
  - structured claims
  - requested effects/actions
        ↓
Claim / Safety Verifier
  - price / stock / size / promotion
  - provenance
  - PII / security
        ↓
Effect Reconciler
  - cart / checkout / payment
  - policy authorization
  - idempotency / CAS / version checks
        ↓
valid? ── no ──> bounded regeneration request
                  ↓ exhausted
               fixed safe fallback
        ↓ yes
thin final guard
        ↓
commit state + Outbox / handoff effects
```

### Authority boundary

**Model authority**
- normal sales strategy and conversational direction;
- normal objection handling and CTA choice;
- normal customer-facing wording;
- structured proposal of claims/actions/effects.

**Deterministic authority**
- verified business facts and provenance;
- safety/security/PII;
- price/promotion/policy limits;
- cart, checkout, payment and side-effect authorization;
- reconciliation, CAS/version/idempotency/fingerprints;
- fail-closed behavior;
- bounded regeneration control and fixed safe fallback.

## 4. Explicit non-goals

Track B must not expand into:

- UR / State V2 / Gate U;
- changing `stateReadMode=LEGACY` by default;
- admin/API/control-plane refactors unrelated to the COMMERCE hot path;
- multi-page rollout or public-production hardening;
- a second permanent chatbot/runtime framework;
- a new broad replay/evaluator platform when existing Gate-E/replay/judge primitives can be reused;
- destructive LEGACY/old-runtime deletion before replacement, migration, rollback validation and zero-use proof;
- repo-wide cleanup merely because adjacent code is old or complex.

## 5. Execution dependency graph

```text
B1 scope lock
  ↓
B2.1 clean CommerceRuntime boundary
  ↓
B2.2 model owns strategy + wording
  ↓
B2.3a structured claim verification
  ↓
B2.3b deterministic effect reconciliation
  ↓
B2.3c negotiation authority split
  ↓
B2.3d size wording + regeneration/fallback split
  ↓
B2.4 remove old COMMERCE authority reachability
  ↓
B3 one side-effect-free full-agent replay adapter
  ↓
B3.1 candidate evidence + accepted PREPROD baseline
  ↓
Track C continuous quality loop
```

The order above is the default for a solo implementation. B2.3 sub-slices may be reordered only if B1 proves a cleaner dependency graph without widening scope.

---

## 6. Tasks

### B1 — Lock the exact current COMMERCE call graph and scope

**Size:** S  
**Estimate:** 0.25–0.5 working day  
**Depends on:** none

**Goal**

Refresh the prior audit against the exact implementation head immediately before build work. Trace only the currently reachable COMMERCE response/effect path from authority admission through context, model call, deterministic sales/reply logic, guards, sales-cycle/effects, commit and Outbox.

**Primary source areas**

- `apps/worker/src/realtime-runner.ts`
- `apps/worker/src/df13-commerce-runtime-*.ts`
- `apps/worker/src/bf02-core-realtime-runner.ts`
- `apps/worker/src/bf02-realtime-runner.ts`
- directly reachable files in `packages/business-tools`, `packages/chat-runtime`, `packages/commerce-kernel`, and `packages/conversation-engine`

**Required outputs**

- exact call graph for current COMMERCE hot path;
- per-component classification: `KEEP`, `SPLIT/REWRITE`, `RETIRE_AFTER_CUTOVER`;
- exact implementation/test file list for B2.1 and B2.2;
- list of any legacy-state semantic leakage/workarounds observed, recorded as evidence only — not automatic UR scope.

**Acceptance criteria**

- every planned B2 target is proven reachable from current COMMERCE or explicitly marked migration/rollback-only;
- no deletion candidate is based only on naming/history;
- the model-vs-deterministic authority contract in section 3 remains feasible without changing State V2/read authority;
- any finding that would require a state migration, new permanent runtime, or >~5 critical files in one implementation slice triggers a plan update before code work continues.

**Verification**

- source trace on exact implementation head;
- map existing focused tests to each changed boundary;
- no runtime mutation/deploy required.

**Checkpoint:** lock B1 findings before B2.1. A material architecture contradiction requires plan amendment rather than silent scope expansion.

---

### B2.1 — Introduce a clean CommerceRuntime boundary

**Size:** M  
**Estimate:** 0.75–1 working day  
**Depends on:** B1

**Goal**

Create a small, explicit COMMERCE orchestration boundary inside the existing worker and route the current COMMERCE path through it with behavior kept as equivalent as practical. This is a strangler seam, not a second permanent runtime.

**Likely files (final paths locked by B1; keep the implementation slice small)**

- new `apps/worker/src/commerce/commerce-runtime.ts`
- new `apps/worker/src/commerce/verified-context.ts`
- `apps/worker/src/realtime-runner.ts`
- one focused worker test file
- at most one existing DF13 context/authority adapter if required by the exact call graph

**Acceptance criteria**

- COMMERCE traffic crosses one explicit runtime boundary before normal reply/effect orchestration;
- LEGACY rollback behavior is not rewritten by this slice;
- no duplicated persistent state, second queue, second DB model or new behavior-mode topology is introduced;
- current verified facts/provenance and effect infrastructure are passed through rather than reimplemented;
- failure at the new boundary remains fail-closed where the current contract requires it.

**Verification**

- focused unit/integration tests for the new boundary;
- affected workspace typecheck/build checks required by current repository scripts;
- characterization tests for unchanged COMMERCE admission/context behavior.

---

### B2.2 — Make the model own normal strategy and wording

**Size:** M  
**Estimate:** 1–1.25 working days  
**Depends on:** B2.1

**Goal**

Introduce an explicit structured `ModelProposal` contract carrying normal semantic/sales intent, normal customer-facing draft, structured claims and requested actions/effects. Move normal sales strategy/copy authority to the model.

**Likely files**

- new `apps/worker/src/commerce/model-proposal.ts`
- `apps/worker/src/commerce/commerce-runtime.ts`
- exact model adapter/prompt-input path identified by B1
- exact contract/schema file identified by B1 if a reusable contract is not already sufficient
- focused proposal/model-boundary tests

**Acceptance criteria**

- model output is treated as untrusted structured input and schema-validated;
- normal COMMERCE strategy and customer-facing wording come from the model proposal;
- `sales-strategy-v1`, legacy/current sales-stage FSMs, deterministic objection/CTA playbooks and reply assemblers no longer override normal model strategy/wording on the migrated path;
- deterministic code may reject an invalid proposal or request bounded regeneration, but does not rewrite a normal sales reply into its own preferred Vietnamese sales copy;
- malformed/partial/adversarial model output fails safely.

**Verification**

- valid proposal contract tests;
- malformed/unknown field/schema tests;
- tests showing model-owned normal wording survives deterministic validation when claims/actions are valid;
- tests showing invalid structured claims/actions are rejected rather than silently repaired into new sales copy.

---

### B2.3a — Replace reverse-parsing with structured claim verification

**Size:** M  
**Estimate:** 0.75–1 working day  
**Depends on:** B2.2

**Goal**

Make structured claims the primary correctness boundary. Shrink the existing text guard/reply-assembly role so deterministic code verifies supported facts instead of reverse-engineering and rewriting the model's normal prose.

**Likely files**

- new `apps/worker/src/commerce/claim-verifier.ts`
- `apps/worker/src/commerce/commerce-runtime.ts`
- `packages/business-tools/src/guard.ts`
- `packages/business-tools/src/reply-assembler.ts`
- focused verifier tests

**Acceptance criteria**

- protected claims such as price, stock, promotion, size and other verified business facts are checked against typed current provenance/facts;
- unsupported/stale/mismatched protected claims reject the proposal or trigger the bounded regeneration/fallback path;
- final text guard is defense-in-depth, not the primary fact-extraction/repair engine;
- no deterministic normal-sales-copy assembly remains authoritative on the migrated path;
- PII/security requirements continue to fail closed.

**Verification**

- price/stock/promo/size claim mismatch cases;
- stale/missing provenance cases;
- adversarial/malformed proposal cases;
- PII/security regression cases relevant to changed boundaries.

---

### B2.3b — Separate requested effects from deterministic reconciliation

**Size:** M  
**Estimate:** 0.75–1 working day  
**Depends on:** B2.3a

**Goal**

Let the model request bounded actions/effects while deterministic code remains the sole authority that validates, authorizes and commits cart/checkout/payment/handoff effects.

**Likely files**

- new `apps/worker/src/commerce/effect-reconciler.ts`
- `apps/worker/src/commerce/commerce-runtime.ts`
- `packages/chat-runtime/src/sales-cycle-runtime.ts`
- focused runtime/reconciler test file(s), keeping the slice within ~5 files where practical

**Acceptance criteria**

- model output cannot directly mutate state or execute side effects;
- cart/checkout/payment commands retain policy, expected-version, CAS, idempotency and trusted-port checks;
- duplicate, stale-version, conflicting or unauthorized requests fail closed or return the existing deterministic conflict/handoff outcome;
- state and transactional effect intents preserve current atomicity requirements;
- normal conversational stage sequencing is not reintroduced as a prerequisite for valid model-owned sales semantics unless it protects an explicit correctness invariant.

**Verification**

- duplicate/idempotency tests;
- stale revision/cart version tests;
- unauthorized/malformed effect request tests;
- checkout/payment protected-transition tests;
- transaction/CAS failure-path tests at the owning boundary.

---

### B2.3c — Split negotiation policy authorization from conversational strategy

**Size:** S/M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** B2.3b

**Goal**

Retain deterministic money/policy/concurrency correctness while removing deterministic conversational negotiation strategy as normal COMMERCE authority.

**Likely files**

- `packages/business-tools/src/negotiation-engine-v2.ts`
- `packages/commerce-kernel/src/policy-engine.ts`
- `packages/commerce-kernel/src/negotiation-transition.ts`
- `apps/worker/src/commerce/effect-reconciler.ts` or `commerce-runtime.ts` as proven by B1/B2.3b
- focused negotiation tests

**Acceptance criteria**

- model owns normal objection handling and whether/how to conversationally pursue a sale;
- deterministic code owns allowed monetary adjustment, policy ceiling, quote arithmetic, evidence identity/freshness, fingerprints, CAS/version/idempotency;
- deterministic `READY/HESITANT/CAUTIOUS`-style customer-state progression does not remain the normal sales-strategy authority;
- a model-requested concession outside policy cannot execute and cannot be disguised by wording.

**Verification**

- allowed/denied concession boundary tests;
- stale evidence/version tests;
- replay/id-collision/idempotency tests;
- preserved money arithmetic tests.

---

### B2.3d — Keep deterministic size facts; move wording + bounded fallback control

**Size:** S/M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** B2.3c

**Goal**

Keep verified size computation/provenance deterministic while model-owning the normal wording. Add an explicit bounded regeneration/fixed-safe-fallback stage shared by invalid model proposals.

**Likely files**

- `packages/business-tools/src/size-engine.ts`
- new `apps/worker/src/commerce/safe-fallback.ts`
- `apps/worker/src/commerce/commerce-runtime.ts`
- focused size/fallback tests

**Acceptance criteria**

- deterministic code can produce verified size recommendation facts / needs-more-input / out-of-range signals without composing normal sales prose;
- model words the normal size response from verified facts;
- invalid proposal handling has a fixed maximum regeneration count;
- exhaustion uses a bounded fixed safe fallback, not a second generative/deterministic sales-copywriter pipeline;
- fallback cannot authorize protected effects that failed verification/reconciliation.

**Verification**

- verified recommendation, missing-input and boundary-size cases;
- regeneration count/budget tests;
- fallback safety/no-effect tests.

**Checkpoint:** after B2.3, review the resulting authority boundary before removing old reachability.

---

### B2.4 — Cut old deterministic sales authority out of COMMERCE reachability

**Size:** M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** all B2.3 slices

**Goal**

Make the old normal sales-strategy/FSM/copy-repair path unreachable from the active COMMERCE response path. Preserve only code still required for proven LEGACY rollback or other active non-COMMERCE consumers.

**Likely files**

- `apps/worker/src/realtime-runner.ts`
- `apps/worker/src/bf02-core-realtime-runner.ts`
- `apps/worker/src/bf02-realtime-runner.ts`
- `packages/business-tools/src/sales-strategy-v1.ts`
- `packages/conversation-engine/src/sales-stage.ts`

B1/B2 may prove that some of these become no-change evidence-only files; do not touch them solely to match this list.

**Acceptance criteria**

- active COMMERCE reply flow does not invoke old normal deterministic sales strategy, sales-stage authority, CTA/objection copy playbook or BF02 model-rewrite authority;
- useful recovery/correctness semantics are moved to explicit stages before old wrappers are disconnected;
- LEGACY rollback remains available where the accepted rollback contract still requires it;
- physical deletion happens only after replacement + consumer migration + zero-use proof. If rollback still requires a file, mark it migration-only/deferred instead of deleting it.

**Verification**

- exact call-graph/reachability sweep on the implementation head;
- focused COMMERCE tests proving new path selection;
- focused LEGACY/rollback route tests where affected;
- zero-use evidence before any destructive deletion.

---

### B3 — Add exactly one side-effect-free full-agent replay adapter

**Size:** M  
**Estimate:** 0.75–1 working day  
**Depends on:** B2.4

**Goal**

Provide one reproducible adapter that exercises the migrated CommerceRuntime without committing state or external effects. Reuse existing replay/Gate-E evaluation infrastructure; do not create a second evaluator platform.

**Exact evaluator paths:** resolve from current source during B1/B3 implementation because repository code-search indexing did not provide a reliable path at plan creation time. The existing `executeGateEScoredRun(...)` capability is the intended integration point when confirmed reachable/current.

**Acceptance criteria**

- one adapter invokes the full model-owned proposal -> verifier -> reconciler decision path with effects disabled/captured;
- model/prompt/generation config, relevant verified-fact envelope and policy/config identity are pinned/reproducible for a scored candidate;
- mandatory replay assertions cover unsupported/protected claims, PII/security, unauthorized effects, stale/missing required facts and fail-closed behavior;
- replay cannot mutate customer/runtime production-like state or send Meta messages;
- the same adapter can be reused by Track C candidate-vs-baseline quality work.

**Verification**

- replay determinism/reproducibility checks for pinned non-model inputs;
- explicit no-side-effect assertions;
- mandatory `MUST_PASS` safety/correctness corpus cases;
- existing evaluator integration tests where available.

---

### B3.1 — Re-evaluate materially changed candidate and establish the accepted PREPROD baseline

**Size:** S/M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** B3

**Goal**

Use the existing Gate-E scored-run/provenance mechanism with only minimal CLI/wiring required by the migrated candidate. Establish one accepted COMMERCE baseline for Track C.

**Acceptance criteria**

- provider credentials remain outside GitHub Actions and repository contents;
- only materially changed deployment candidates invalidate/re-run the owning generative evidence; accepted unrelated evidence is not ceremonially rerun;
- exact candidate identity/provenance required by the current merged governance is recorded;
- if deployed under owner authorization, deploy the exact merged commit, retain the exact previous affected-service release/build/commit as rollback target, and run the applicable smoke/controlled checks;
- no deployment, migration, authority mutation or runtime success is inferred from source merge alone;
- Track B is not called complete until the model-owned path passes the required replay/correctness evidence and an accepted PREPROD baseline is established.

**Verification**

- existing Gate-E/scored-run mechanism on the exact applicable candidate when candidate identity changed materially;
- focused CI/checks required by the active process and changed risk;
- exact runtime identity + smoke only if an owner-authorized deploy is actually performed.

---

## 7. Track B completion gate

Track B is complete only when all of the following are true:

1. Active COMMERCE normal conversation strategy and wording are model-owned.
2. Deterministic code remains authoritative for verified facts/provenance, security/PII, policy, reconciliation, authorization, CAS/idempotency and bounded fail-closed behavior.
3. Old deterministic sales-stage/strategy/copy-repair authority is unreachable from the active COMMERCE path, or explicitly retained only for a proven rollback/non-COMMERCE consumer.
4. Invalid model proposals cannot directly execute protected effects and cannot be silently rewritten into an alternative deterministic sales reply.
5. The one full-agent replay adapter passes all required safety/correctness `MUST_PASS` cases without side effects.
6. Existing tests affected by each implementation slice pass; new behavior/error paths have focused tests; type/lint/build checks required by the active repository process pass.
7. No unrelated UR/State V2/admin/multi-page/production-hardening work was pulled into Track B.
8. Rollback remains viable for every changed runtime boundary until intentionally closed by a separate owner decision and zero-use evidence.
9. One exact accepted PREPROD COMMERCE baseline is identified for Track C.
10. Final human owner approval records the Track B completion decision; source merge alone is not completion evidence.

## 8. State V2 / UR decision rule

Track B deliberately leaves `stateReadMode=LEGACY` unchanged.

During B1/B2, record any concrete evidence that the legacy read representation causes:

- contradictory/duplicated source of truth;
- incorrect cart/checkout/reconciliation behavior;
- unavoidable semantic translation that materially distorts the new CommerceRuntime;
- concurrency/atomicity problems not solvable within the current persistence/CAS contracts;
- a blocker to a required correctness invariant.

Such evidence may justify a later, separately approved State V2/UR slice. Architectural neatness, naming, or the mere existence of a legacy representation is not a trigger. Do not silently expand Track B into UR.

## 9. Estimated execution time

Assuming no material B1 contradiction and excluding external/provider waiting time:

| Slice | Estimate |
|---|---:|
| B1 | 0.25–0.5 d |
| B2.1 | 0.75–1 d |
| B2.2 | 1–1.25 d |
| B2.3a | 0.75–1 d |
| B2.3b | 0.75–1 d |
| B2.3c | 0.5–0.75 d |
| B2.3d | 0.5–0.75 d |
| B2.4 | 0.5–0.75 d |
| B3 | 0.75–1 d |
| B3.1 | 0.5–0.75 d |
| **Total planning range** | **~6–8.75 working days** |

A reasonable execution target is ~7 working days, with the upper range reserved for hidden coupling uncovered during B2.3. This is an engineering estimate, not a delivery guarantee.

## 10. Main risks and stop conditions

### Highest risk — correctness loss while removing deterministic business logic

Mitigation: separate verified-fact/policy/effect invariants before retiring conversational authority; add focused tests before reachability removal.

### Accidental second architecture

Stop if B2 introduces new persistence, queueing, long-lived behavior modes, duplicated control planes, or a parallel permanent runtime. Prefer a small strangler seam in the existing worker.

### Deterministic repair remains a hidden sales copywriter

Stop if an invalid model reply is routinely transformed into another handcrafted Vietnamese sales reply. The permitted response is bounded regeneration or a fixed safe fallback.

### Premature cleanup breaks rollback

Do not physically delete old implementations until replacement exists, consumers are migrated, zero active use is proven, and the current rollback contract no longer depends on them.

### Legacy state becomes a real blocker

Record the evidence and stop the affected slice. Do not solve it by silently starting State V2/UR inside Track B.

### Candidate provenance becomes stale

If model/prompt/generation/config/context/fact-envelope/output interpretation materially changes, re-run/re-derive the owning evidence before relying on the old result for deployment acceptance.

## 11. Definition of Done discipline for every implementation PR

Each implementation PR must:

- satisfy its explicit acceptance criteria;
- test new behavior and important error/fail-closed paths;
- keep existing applicable tests green;
- preserve business/security/data correctness and backward compatibility unless an explicit migration decision says otherwise;
- avoid duplicated business logic, dead code and unrelated refactors;
- include appropriate focused lint/type/build/integration checks for the changed boundary;
- document any changed contract/current truth that future work depends on;
- preserve an explicit rollback target for deployed runtime changes;
- never claim runtime/deploy evidence unless that exact runtime action was actually performed.
