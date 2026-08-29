# Track B — Model Authority Execution Plan

**Status:** `AMENDED_AFTER_B1 / IMPLEMENTATION_DIRECTION_SELECTED`
**B1 evidence:** `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md` (traced on `main@5340845`)
**Program point:** post-Track-A / post-Gate-F, V5 Track B
**Plan baseline:** `main@bab2fdb4d9f20e74274cd0134234632e26660a2f` (re-synced after PR #269 and PR #271 merged)
**Active process profile:** `SOLO_PREPROD_MINIMAL` (merged and current default; see `OPERATING_MODE.md`)
**Environment:** `ENGINEERING_PREPROD`, one bounded `PREPROD_TEST_PAGE`
**Authorization:** merging this plan does **not** authorize Track B implementation, authority mutation, migration, deployment, or live testing. `program-state.json` currently requires a separate owner command before the next Track implementation.

## 1. Purpose

Execute V5 Track B by simplifying the **current COMMERCE hot path** so that:

- the model owns normal conversational semantics, normal sales strategy, objection/CTA choice, and normal customer-facing wording;
- deterministic code owns verified facts/provenance, security/PII, protected-claim correctness, policy limits, effect reconciliation/authorization, CAS/idempotency, and fail-closed behavior;
- invalid model output is handled by bounded regeneration and, when required, a bounded deterministic fallback built only from verified facts/current safe outputs;
- deterministic fallback is not allowed to become a second Vietnamese sales-copywriter or a second normal sales-strategy engine;
- existing database, Inbox/Outbox, Meta delivery, contracts, durable messaging, cart/money correctness, DF13 authority fencing, and security primitives are reused rather than rebuilt.

This is an implementation refinement of the adopted V5 Track B direction. It is **not** a new Track, State V2/UR program, control plane, or second runtime architecture.

## 2. Current state and hard constraints

1. Track A / DF-C / Gate F are complete and are not reopened by this plan.
2. Current accepted runtime remains `salesAuthorityMode=COMMERCE`, `stateReadMode=LEGACY`.
3. `packages/database/src/df13-commerce-authority-bundle.ts` already records:
   - `legacySalesStage: "DEMOTED_TELEMETRY_ONLY"`;
   - `strategy: "CONTEXT_V2"`;
   - `cta: "CONTEXT_V2"`.

   B1 proved no runtime code reads these payload fields; only `contractHash` is consumed. They declare authority topology, and their only mechanical effect is the hash.
3a. **Selected generation direction (owner decision after B1).** Track B promotes the existing Context V2 candidate capability (`apps/worker/src/context-v2-candidate.ts`) to the live COMMERCE generation path. `BaselineModelCapability` stays byte-frozen and untouched. Track B does not modify the baseline and does not create a third generation capability.
3a-i. **The baseline also stays live as a per-turn fallback.** `MODEL_EVALUATION_BOUNDARY.md` §11: *"Only a valid built capture may call a candidate model."* A COMMERCE turn whose Context V2 capture is invalid, blocked, ambiguous, not-yet-terminal or absent may not call the candidate, and `AGENTS.md:47` still requires it to answer from verified facts rather than fail permanently. The migrated path is therefore a **two-capability path** with a deterministic selector driven by capture validity, never by model preference. The selector is authority-dependent output and belongs inside the fence. B2.2 must design it; **B2.4 must not remove baseline reachability** — its scope is retiring deterministic sales-strategy and copy-repair authority (`applyWave2ReplyPolicy` and the sales-stage playbooks), not the baseline generation path.
3b. B1 proved the live COMMERCE path currently runs on `BaselineModelCapability` (`realtime-server.ts:893,909`; `vertex-baseline.ts:17-19`), and that `ContextV2CandidateOutputV2` (`packages/contracts/src/v2/context-v2.ts:507-535`) already carries model-owned `segments`, `strategy` and `cta`. The plan's `ModelProposal` is that contract, extended — not a new design.
4. `apps/worker/src/df13-commerce-runtime-composition.ts` is the existing **single real COMMERCE composition seam** between behavior-pointer authority admission and `RealtimeRunner`. Track B must extend/reuse this seam, not create a sibling top-level `CommerceRuntime`. B1 clarifies the precise reading: the DF13 executor performs identity admission, fence assessment, lease dispatch and fence-bound commit only — it does not orchestrate replies. The new stages attach between DF13 admission and the runner's reply orchestration, and `RealtimeRunner` itself is what gets restructured. Do not read "extend the DF13 seam" as putting reply stages inside the fence executor.
5. Track B leaves `stateReadMode=LEGACY` unchanged unless a later separately approved evidence-backed decision opens a narrow UR/State V2 slice.
6. BF-04 remains an accepted known residual: P0 unverified size-claim bypasses must not be represented as fixed.
7. Invariant r31.3 remains binding for realtime work:
   - preserve verified facts/media when downstream model/size/enrichment fails;
   - differential-test realtime changes against the r31.3 behavioral baseline, with intentional differences explicitly justified;
   - do not mark Inbox permanently failed solely because model output is malformed/schema-invalid; first attempt deterministic fallback from verified facts.
8. `SOLO_PREPROD_MINIMAL` (PR #269) is **merged and active**. It is the default process profile for all work while `ENGINEERING_PREPROD` remains active, and only an explicit owner instruction changes the profile or operating mode; completing a Track, roadmap, or Gate does not expire it. Its default flow is `branch -> code + focused verification -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke`. Track B must follow this profile rather than reintroducing Release Train ceremony, and must still re-read the governance actually merged on `main` at implementation time instead of relying on this plan revision.
9. Existing Gate E/F evidence is historical/current evidence for its exact candidate and scope. Track B must not relabel stale candidate fingerprints, request identities, corpus/rubric hashes, authority hashes, or scored evidence as proof for a changed candidate.
10. PR #271 restored the canonical self-hosted CI backend. Exact-head verification therefore uses a functioning GitHub-hosted or GitHub Actions self-hosted CI run of the canonical checks; `CI_UNAVAILABLE_FALLBACK` applies only when remote CI cannot start or executes zero repository steps because of an external provider condition.

## 3. Target runtime shape

Track B extends the existing DF13 COMMERCE seam into explicit internal stages:

```text
behavior pointer / DF13 authority admission
        ↓
DF13 COMMERCE composition + executor seam
        ↓
verified context/state/facts
        ↓
model proposal
  - semantic/sales intent
  - normal customer-facing draft
  - structured protected claims
  - requested actions/effects
        ↓
claim + safety verification
        ↓
effect/policy reconciliation
        ↓
valid? ── no ──> bounded regeneration
                  ↓ exhausted
        deterministic fallback from verified facts
        ↓ yes
thin final guard / r31.3 preservation
        ↓
state + Outbox / handoff effects through existing infrastructure
```

### Model authority

- normal sales strategy and conversational direction;
- normal objection handling and CTA choice;
- normal customer-facing wording;
- proposal of structured claims and requested effects/actions.

### Deterministic authority

- verified business facts and provenance;
- protected-claim correctness and freshness;
- security/PII;
- price/promotion/negotiation policy limits;
- cart/checkout/payment/handoff authorization;
- CAS/version/idempotency/fingerprints;
- effect reconciliation and transaction correctness;
- bounded regeneration control;
- deterministic fallback from verified facts when required by r31.3;
- final fail-closed delivery/guard behavior.

### Deterministic fallback boundary

Permitted fallback may compose the **minimum safe response required to preserve verified facts/current safe outputs** when the model result is unusable. It must not:

- choose a normal sales strategy as a substitute for the model;
- run a second objection/CTA playbook;
- rewrite a valid model answer for ordinary style preference;
- fabricate or infer unverified price/stock/size/ETA/promotion claims;
- authorize an effect that failed deterministic verification/reconciliation.

## 4. Explicit non-goals

Track B must not expand into:

- UR / State V2 / Gate U;
- changing `stateReadMode=LEGACY` by default;
- a new top-level COMMERCE runtime/composition beside the DF13 seam;
- a new persistent behavior mode or parallel control plane;
- new persistence/queue/database topology;
- admin/API refactors unrelated to the current COMMERCE reply/effect path;
- multi-page rollout or public-production hardening;
- a second replay/evaluator platform;
- destructive legacy cleanup before replacement, consumer migration, rollback review, and zero-use proof;
- claiming BF-04 or any other accepted residual is fixed without new evidence.

## 5. Model-evaluation and candidate-integrity contract for Track B

Track B must obey the full `contracts/MODEL_EVALUATION_BOUNDARY.md`, not only source fingerprinting.

### 5.1 Candidate source identity

`apps/worker/src/gate-e-registration.ts` currently freezes `GATE_E_CANDIDATE_SOURCE_PATHS_V1`, including current business-tool authority files such as `guard.ts`, `reply-assembler.ts`, `sales-strategy-v1.ts`, `size-engine.ts`, and `negotiation-engine-v2.ts`.

Therefore:

1. B1 must inventory the exact source files that can affect Track B model authority, protected claims, output interpretation, fallback, or requested effects.
2. Any new authority-affecting DF13/internal stage file must be included in the candidate-source identity before relying on Gate-E scored evidence for that candidate.
3. Changes to existing frozen source files make the old candidate fingerprint stale for the changed candidate; re-derive rather than reuse by description.
4. Updating the candidate-source list itself changes `gate-e-registration.ts`; derive the final candidate identity from the final registered source set.
5. **The current frozen set does not cover the live orchestration path.** B1 proved `GATE_E_CANDIDATE_SOURCE_PATHS_V1` contains no `realtime-runner.ts`, no `df13-*`, and nothing from `chat-runtime`, `commerce-kernel` or `conversation-engine`. Once the candidate capability serves customers, candidate identity must be extended to cover the orchestration that consumes its output — the runner path, the DF13 stages Track B adds, and the reachable business-tools/commerce-kernel modules proven by B1. Scoring a capability while excluding the code that decides what ships to the customer would describe a component, not the served behavior.
6. Extending `ContextV2CandidateOutputV2` (strategy/CTA enums are narrower than real sales conversation needs) changes `packages/contracts/src/v2/context-v2.ts`, which is already inside the frozen set, so a new candidate identity follows by construction.

### 5.2 Baseline/candidate capability separation

The baseline and candidate may share authenticated transport only. They must **not** share:

- prompt builders;
- request builders;
- response identity rules;
- public generation methods.

B2.2 must preserve this separation while promoting the candidate path to live COMMERCE generation. Track B must not merge the baseline and candidate capabilities into one public builder/method.

Under the selected direction the separation is preserved by construction: the candidate keeps its own prompt/request builders and response identity rules in `context-v2-candidate.ts`, and the baseline is not edited at all.

**Blocking contract dependency.** Clauses of `MODEL_EVALUATION_BOUNDARY.md` currently prohibit or fail to cover the selected direction, and §6 is the hardest:

- §1 says realtime orchestration may import Context V2 *only* to persist a shadow capture;
- §6 says offline/replay candidates *"cannot send customer messages, mutate commerce/conversation state, authorize claims, or become a third live semantic authority"*.

Promoting the candidate to the served path does exactly what §6 forbids. The required revision is therefore a **status change, not a clarification**: a capability cannot be both the offline candidate that §6 constrains and the authority that serves customers. The revision must define the promoted capability's new status so it stops being governed as an offline candidate once it serves traffic; keep §6 intact for whatever remains an offline/replay candidate, narrowing it by definition rather than weakening it; keep §1's protection of the baseline unchanged; and carry §2's integrity-valid-snapshot requirement onto the live path as a per-turn precondition.

The revision must additionally state which of §8 and §11–§16 apply to synchronous live invocation. Those clauses govern the candidate as an async queue worker — claims, stale-lease recovery, attempt accounting, locked deadlines, population sync, disjoint prompt-family queue ownership — and §13 records that the async producer is not wired to a deployed entrypoint. Live use is synchronous inside the reply turn, so leaving both readings available is itself a defect. §15 also carries a concrete B2.2 requirement: a Track B candidate prompt-family version must be registered with an explicit owner predicate, because unknown `context-v2-candidate-*` versions fail closed by contract.

Until that revision is merged, the selected direction contradicts a durable contract. It is the first B2.2 deliverable and a blocking dependency — not documentation cleanup.

### 5.3 Request-envelope and request-identity pinning

The baseline request envelope remains regression-pinned to its approved source baseline. Under the selected direction Track B **does not change it at all**: the baseline capability is not edited, so no approved deviation is required for it. Any proposal that would edit the baseline envelope is out of scope and requires a separate approved deviation plus realtime differential evidence; changing a prompt/version label is never evidence of equivalence.

Realtime differential evidence is still required for every slice — not because the baseline envelope changes, but because the served reply behavior does. See `AGENTS.md:44` and B3.

The candidate request identity must cover every provider-affecting field actually sent, including at least:

- model resource;
- system instruction;
- prompt/content;
- response schema;
- generation configuration;
- safety settings;
- any other candidate-affecting request field.

B2.2 is expected to change the candidate response schema and may change prompt/system-instruction/generation configuration. Those are **candidate request-identity changes** and must be explicitly pinned/registered for the exact scored candidate; source fingerprint alone is insufficient.

### 5.4 Future scored-run evidence

1. The accepted Gate-E v15 corpus/rubric/evidence remains immutable historical evidence.
2. A future Track B scored run must use a separate immutable corpus/rubric artifact committed before the run, Git-derived blob/plan-hash verification, registration ancestry, and strict registration-before-run ordering.
2a. **Every class added to the candidate contract costs registered probes.** §18 requires a closed coverage matrix with positive *and* adversarial-negative registered probes for every reachable effect, clarification, requested-action and frozen protected-claim class, and missing, extra or duplicate coverage fails **before** corpus scoring. Widening the strategy/CTA enums therefore multiplies required probes and is the mechanical reason the previous Gate E exercise consumed registration versions v1 to v15. Settle the class list in B3 fixtures before spending a registration round.
2b. B3 differential evidence and B3.1 Gate-E evidence are **separate populations by contract**: realtime capture population is independent of Gate E and *"not admissible as Gate E data"*. Neither can substitute for the other.
3. `executeGateEScoredRun(...)` in `apps/worker/src/gate-e-registration.ts` is the existing scored-run integration point. Do not create a second scored-run implementation.
4. Provider credentials stay outside GitHub Actions and repository contents.

B3 runtime replay and B3.1 Gate-E scored evidence are related but **not the same artifact**. Runtime replay may contain focused regression fixtures; any fixture promoted into Gate-E scoring must enter the immutable corpus/rubric/registration flow required by the evaluation contract.

## 6. Execution dependency graph

```text
separate owner command authorizes Track B implementation
        ↓
B1 exact hot-path + authority + request-identity + provenance + BF-04 scope lock
        ↓
B2.1 extend existing DF13 COMMERCE seam
        ↓
B2.2 model owns normal strategy + wording
        ↓
B2.3a structured claim verification
        ↓
B2.3b deterministic effect reconciliation
        ↓
B2.3c negotiation policy/strategy split
        ↓
B2.3d size + fallback split (BF-04 fence must pass)
        ↓
B2.4 remove obsolete COMMERCE authority reachability
        ↓
B3 side-effect-free full-agent replay + r31.3 differential evidence
        ↓
B3.1 freeze candidate/request identity/corpus -> pre-register -> Gate-E scored evidence
        ↓
checkpoint: evidence accepted for exact candidate
        ↓
B3.2 owner-scoped activation/deploy/readback/smoke
        ↓
accepted Track B PREPROD baseline
        ↓
Track C
```

B2.3 sub-slices may be reordered only if B1 proves a cleaner dependency graph without widening scope or bypassing BF-04/r31.3/model-evaluation constraints.

---

## 7. Tasks

### B1 — Lock exact COMMERCE hot path, authority, request identity, candidate provenance, and residuals

**Size:** M  
**Estimate:** 0.5–1 working day  
**Depends on:** separate owner command authorizing Track B implementation

**Goal**

Refresh the prior audit against the exact implementation head immediately before build work. Trace only currently reachable COMMERCE reply/effect behavior from DF13 authority admission through context, model call, deterministic strategy/reply logic, protected claims, sales-cycle/effects, finalization, commit and Outbox.

**Primary source areas**

- `apps/worker/src/df13-commerce-runtime-composition.ts`
- `apps/worker/src/df13-commerce-runtime-executor.ts`
- `apps/worker/src/df13-commerce-runtime-context.ts`
- `apps/worker/src/df13-commerce-runtime-finalization.ts`
- `apps/worker/src/realtime-runner.ts`
- BF02 wrappers only where proven reachable/current
- `packages/chat-runtime/src/sales-cycle-runtime.ts`
- directly reachable business-tools/commerce-kernel modules
- `packages/database/src/df13-commerce-authority-bundle.ts`
- `apps/worker/src/gate-e-registration.ts`
- current baseline/candidate generation capability/builders
- current BF-04 evidence/residual owners

**Required outputs**

- exact current COMMERCE call graph;
- exact current authority graph, distinguishing already-demoted legacy `salesStage` from current `SalesCycleStageV1`/DF13-context behavior;
- baseline-vs-candidate generation capability graph proving builder/method separation;
- current baseline request-envelope pin and candidate request-identity fields;
- per-component classification: `KEEP`, `SPLIT/REWRITE`, `RETIRE_AFTER_CUTOVER`, or `ROLLBACK_ONLY`;
- exact file/test list for B2.1/B2.2;
- candidate-source/fingerprint impact list;
- BF-04 size-claim bypass map for every B2.3d-relevant path;
- activation impact: whether Track B changes authority-bundle payload, behavior pointer/config identity, migration requirements, or only source behavior behind an existing authority identity;
- current canonical CI capability/status on the self-hosted backend, and the exact activation/authorization scope Track B will need to request from the owner in one instruction.

**Acceptance criteria**

- every planned B2 target is proven reachable/current or explicitly marked rollback/legacy-only;
- no new top-level runtime/composition is needed; if the existing DF13 seam cannot host the target pipeline, stop and amend the plan;
- baseline/candidate generation capability separation remains feasible without shared prompt/request builders, response identity rules, or public generation methods;
- every authority-affecting new/changed source and every candidate request-identity change is accounted for;
- B2.3d has an explicit BF-04 closure/fence strategy before implementation;
- any required migration, new control plane, second runtime, or materially wider-than-bounded slice triggers a plan amendment and new estimate before code work continues.

**Verification**

- source trace on exact implementation head;
- map existing focused tests and r31.3 differential baseline to changed boundaries;
- verify current candidate-source registration and model-evaluation contracts;
- no runtime mutation/deploy in B1.

**Checkpoint:** publish B1 findings and re-estimate the remaining Track B plan before B2.1.

---

### B2.1 — Extend the existing DF13 COMMERCE seam into explicit stages

**Size:** M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** B1

**Goal**

Reuse the existing DF13 composition/executor boundary and introduce only the minimum internal stage interfaces required for model proposal -> verification -> reconciliation -> fallback/finalization. Do not create a sibling `CommerceRuntime` entrypoint.

**Acceptance criteria**

- COMMERCE continues through the single DF13 authority/composition seam;
- no duplicated persistence, queue, behavior-mode topology, authority resolver, or second runtime is introduced;
- current verified facts/provenance/effect infrastructure is reused;
- LEGACY rollback semantics remain intact;
- behavior remains equivalent except for explicitly characterized internal seam changes.

**Verification**

- focused composition/executor characterization tests;
- affected workspace typecheck/build checks required by `SOLO_PREPROD_MINIMAL`;
- r31.3 differential check for realtime behavior touched by the seam change.

---

### B2.2 — Make the model own normal strategy and wording

**Size:** M  
**Estimate:** 1–1.5 working days  
**Depends on:** B2.1

**Goal**

Introduce/normalize an explicit structured model proposal carrying normal semantic/sales intent, normal customer-facing draft, structured claims, and requested effects/actions. Move normal sales strategy/copy authority to the model without weakening deterministic correctness or the model-evaluation boundary.

**Likely files**

- DF13/internal model-proposal stage identified by B1;
- exact candidate model adapter/prompt-input path;
- exact candidate schema/contract owner if an existing contract is insufficient;
- focused proposal/model-boundary tests;
- current strategy consumer only where B1 proves it still overrides model authority.

**Acceptance criteria**

- model output is treated as untrusted structured input and schema-validated;
- normal COMMERCE strategy, objection handling, CTA choice, and customer-facing wording come from the model proposal;
- already-demoted legacy `salesStage` is not reintroduced as a target or authority;
- current deterministic sales-cycle/context mappings are removed/demoted only where they actually select normal sales strategy rather than protect correctness;
- valid model wording survives deterministic validation unchanged except for required safety/fact/effect rejection;
- malformed/partial/adversarial model output cannot execute protected effects and enters bounded recovery;
- baseline and candidate capabilities remain separate: no shared prompt builder, request builder, response identity rule, or public generation method is introduced;
- every changed candidate request field — including system instruction, prompt/content, response schema, generation config, safety settings and any other provider-affecting field — is included in the candidate request identity;
- the regression-pinned baseline request envelope is not changed unless that change has explicit approved-deviation + realtime differential evidence.

**Verification**

- valid/malformed/unknown-field proposal tests;
- tests proving valid model-owned wording survives deterministic validation;
- tests proving invalid claims/actions are rejected rather than silently rewritten into another normal sales reply;
- tests/static assertions proving baseline/candidate builder/method separation remains intact;
- request-identity tests covering system instruction, prompt/content, response schema, generation config and safety settings as applicable;
- r31.3 differential evidence with intentional deviations documented;
- if the baseline envelope changes, explicit regression-pin/deviation evidence rather than a prompt/version label.

---

### B2.3a — Make structured protected claims the primary correctness boundary

**Size:** M  
**Estimate:** 0.75–1.25 working days  
**Depends on:** B2.2

**Goal**

Verify protected claims against typed current facts/provenance so `guard.ts`/reply assembly no longer act as the primary reverse-parser and normal sales-copy repair layer.

**Acceptance criteria**

- price, stock, promotion, size, ETA and other protected claims are checked against typed current provenance/facts;
- unsupported/stale/mismatched claims reject the proposal or enter bounded recovery;
- final text guard remains defense-in-depth, not primary fact extraction/normal-copy rewriting;
- verified facts/media already produced upstream are preserved when later stages fail, per r31.3;
- PII/security behavior remains fail-closed.

**Verification**

- price/stock/promo/size/ETA mismatch cases;
- stale/missing provenance cases;
- adversarial/malformed proposal cases;
- PII/security regressions;
- r31.3 verified-facts/media preservation cases.

---

### B2.3b — Separate requested effects from deterministic reconciliation

**Size:** M  
**Estimate:** 0.75–1.25 working days  
**Depends on:** B2.3a

**Goal**

Let the model request bounded actions/effects while deterministic code remains the sole authority that validates, authorizes and commits cart/checkout/payment/handoff effects.

**Acceptance criteria**

- model output cannot directly mutate state or execute side effects;
- policy, expected-version, CAS, idempotency, trusted-port and transaction checks remain deterministic;
- duplicate, stale-version, conflicting or unauthorized requests fail closed or use the existing deterministic conflict/handoff outcome;
- normal conversational stage sequencing is not retained merely as a sales-strategy authority;
- state/effect atomicity is preserved.

**Verification**

- duplicate/idempotency tests;
- stale revision/cart-version tests;
- unauthorized/malformed effect requests;
- checkout/payment protected transitions;
- transaction/CAS failure paths.

---

### B2.3c — Split negotiation policy authorization from conversational strategy

**Size:** S/M  
**Estimate:** 0.5–1 working day  
**Depends on:** B2.3b

**Goal**

Retain deterministic money/policy/concurrency correctness while removing deterministic conversational negotiation strategy as normal COMMERCE authority.

**Acceptance criteria**

- model owns normal objection handling and conversational negotiation direction;
- deterministic code owns monetary adjustment limits, policy ceiling, quote arithmetic, evidence freshness/identity, fingerprints, CAS/version/idempotency;
- deterministic `READY/HESITANT/CAUTIOUS`-style progression does not remain normal sales-strategy authority where B1 proves it still affects the active path;
- out-of-policy concessions cannot execute and cannot be legitimized by wording.

**Verification**

- allowed/denied concession boundary tests;
- stale evidence/version tests;
- replay/id-collision/idempotency tests;
- preserved money arithmetic tests.

---

### B2.3d — Preserve deterministic size facts; move normal wording only after BF-04 fence passes

**Size:** M  
**Estimate:** 0.75–1.25 working days  
**Depends on:** B2.3c + B1 BF-04 fence

**Goal**

Keep verified size computation/provenance deterministic while the model words the normal size response, using the structured claim boundary as the **closure mechanism** for BF-04.

B1 evidence reframes this slice. BF-04's residual is a property of detecting size recommendations by reading Vietnamese prose: `detectConcreteSizeRecommendations` (`guard.ts:451-470`) drops any mention that `classifySafeExemptionForMention` (`guard.ts:389-394`) classifies as `QUESTION`, `NEGATION`, `CATALOG`, `STOCK` or `NON_CUSTOMER`, and no exemption heuristic over free text is complete. Making a declared, verified, in-scope structured claim the precondition for shipping any size wording removes the detector from the primary path — that closes the bypass class rather than widening it. The text guard remains as defense-in-depth and may only reject, never approve.

**Hard precondition — fail-closed direction**

A reply whose text contains a concrete size recommendation with **no** declared, verified, in-scope protected claim must fail closed on the migrated path. The structured boundary is authoritative; the detector runs alongside it and can only reject.

Do not activate model-owned size wording unless that direction is implemented and covered by regression tests. If it cannot be implemented within this slice, stop B2.3d and amend the plan — do not hide the residual behind model wording.

BF-04 may be recorded as closed only with new regression evidence for the migrated path. Absent that evidence it remains an open residual, and no Track B artifact may represent it as fixed.

**Acceptance criteria**

- deterministic code produces verified size recommendation facts / needs-more-input / out-of-range signals without normal sales prose authority;
- model wording can only use verified size facts that passed the protected-claim boundary;
- invalid model output gets a fixed maximum regeneration count;
- after exhaustion, deterministic fallback uses verified facts/current safe outputs as required by r31.3, without becoming a second normal sales strategy/copy pipeline;
- fallback preserves existing verified facts/media and cannot execute a failed/unauthorized protected effect;
- BF-04 status is updated only if new evidence actually closes it; otherwise it remains a known residual.

**Verification**

- verified recommendation, missing-input and boundary-size cases;
- explicit BF-04 bypass regression cases for the migrated path;
- regeneration budget tests;
- deterministic verified-facts fallback tests;
- no-effect and verified-facts/media preservation tests;
- r31.3 differential evidence.

**Checkpoint:** review the resulting authority boundary, BF-04 disposition, and r31.3 evidence before B2.4.

---

### B2.4 — Remove obsolete deterministic sales authority from active COMMERCE reachability

**Size:** M  
**Estimate:** 0.5–1 working day  
**Depends on:** all B2.3 slices

**Goal**

Make obsolete normal deterministic sales-strategy/copy-repair authority unreachable from the active COMMERCE response path. Do not target files solely because they are old: B1 must prove current reachability and authority first.

**Scope limit proven by B1.** `BaselineModelCapability` and the deterministic verified-facts fallback producers are **not** in scope for removal. Per constraint 3a-i they remain the live path for any turn without a valid Context V2 capture. Removing them would break both `MODEL_EVALUATION_BOUNDARY.md` §11 and the `AGENTS.md:47` fallback invariant.

**Acceptance criteria**

- active COMMERCE no longer invokes obsolete normal deterministic strategy, objection/CTA playbook, or model-rewrite authority;
- correctness/recovery semantics needed by r31.3 are preserved in explicit stages before wrappers are disconnected;
- LEGACY rollback/non-COMMERCE consumers remain intact where required;
- physical deletion happens only after replacement, consumer migration, rollback review, and zero-use proof.

**Verification**

- exact call-graph/reachability sweep on implementation head;
- focused COMMERCE tests proving new path selection;
- affected LEGACY/rollback-route tests;
- zero-use evidence before destructive deletion;
- r31.3 differential evidence for final migrated path.

---

### B3 — One side-effect-free full-agent replay adapter

**Size:** M  
**Estimate:** 0.75–1.25 working days  
**Depends on:** B2.4

**Goal**

Provide exactly one reproducible adapter that exercises the migrated DF13 COMMERCE model-proposal -> verifier -> reconciler -> fallback/finalization path without committing state or external effects. Reuse existing evaluation primitives; do not create a second evaluator platform.

**Known integration points**

- `apps/worker/src/shadow-runner.ts` (447 lines) replays the baseline capability with `assembleReply`, `guardAgentProposal` and `textSimilarity`. **Reuse it as the runtime differential harness** rather than building a second replay — but note it is *not* side-effect-free as it stands: `Phase4ShadowRunner` is queue-driven and calls `store.claimNext` (181), `store.complete` (320), `store.fail` (347), `store.claimComparisonNext` (353) and `store.completeComparison` (365, 436). It sends no customer messages and mutates no commerce/conversation state, but it claims jobs and persists shadow-evaluation rows. B3 must extract its comparison core, or run it in a non-claiming mode, before it satisfies the side-effect-free requirement.
- `apps/worker/src/commerce-authority-comparison.ts` (246 lines) already compares LEGACY and COMMERCE projections of stage, phase, product scope and cart scope. Reuse it for the state half of the differential; it says nothing about reply wording.
- `apps/worker/src/gate-e-registration.ts` exports `executeGateEScoredRun(...)`. B3 replay may reuse lower-level candidate/evaluation primitives; B3.1 owns the governed Gate-E scored run.

**Added scope from B1: no reply-behavior differential runner exists.** `AGENTS.md:44` requires every realtime change to be differential-tested against the r31.3 behavioral baseline, but the repository contains no differential runner — only `apps/worker/src/realtime-r32.2-compatibility-shield.test.ts`. B3 must build that harness by extending `shadow-runner.ts` so it can run the migrated candidate path and the retained baseline path over the same inputs and report the differences. Every B2 slice's required r31.3 evidence depends on this, so B3's harness work is a prerequisite for closing B2 slices, even though the slice is sequenced after them.

**Acceptance criteria**

- one adapter exercises the full migrated decision path with side effects disabled/captured;
- model/prompt/generation config and relevant verified-fact/policy/config identities are pinned where needed for reproducibility;
- focused replay fixtures cover unsupported/protected claims, PII/security, unauthorized effects, stale/missing facts, malformed model output, deterministic verified-facts fallback, and BF-04 size regressions applicable to the migrated path;
- replay cannot mutate customer/runtime state or send Meta messages;
- r31.3 behavioral baseline differential output is produced and intentional deviations are explicit;
- the adapter can be reused by Track C.

**Verification**

- explicit no-side-effect assertions;
- deterministic non-model fixture identity checks;
- focused `MUST_PASS` runtime assertions;
- r31.3 differential evidence;
- existing evaluator integration tests where applicable.

---

### B3.1 — Freeze Track B candidate and produce governed Gate-E evidence

**Size:** M/L  
**Estimate:** 1–2 working days of engineering/execution, excluding external provider wait; re-estimate after B1 and do not treat this as a fixed one-day commitment  
**Depends on:** B3

**Goal**

Produce governed evaluation evidence for the exact Track B candidate. This slice is **evidence-only**: no behavior-pointer/database mutation, deployment, or live PREPROD activation occurs here.

**Required sequence**

1. Freeze the final Track B candidate-source set, including every new authority-affecting file **and the live orchestration path** (`realtime-runner.ts`, the DF13 stages Track B adds, and the reachable `chat-runtime`/`commerce-kernel`/`conversation-engine` modules proven by B1). B1 proved none of these are in the current frozen set.
2. Freeze/pin the final candidate request identity, including model resource, system instruction, prompt/content, response schema, generation configuration, safety settings and other provider-affecting request fields.
3. Re-derive candidate fingerprint/request identity from the exact final registered candidate.
4. Create/commit the immutable Track B corpus/rubric artifact required for the future scored run; do not mutate the accepted v15 artifact.
5. Pre-register exact candidate + request identity + corpus/rubric/plan identities in the required ancestry/time order.
6. Run the governed `executeGateEScoredRun(...)` path in an authorized provider-capable environment; respect current execution caps and keep provider credentials out of GitHub Actions/repository.
7. Record the resulting evidence under the current evaluation contract.

**Acceptance criteria**

- no stale Gate-E candidate fingerprint/request identity or accepted v15 corpus/rubric is presented as Track B proof;
- all Track B authority-affecting sources are inside the final candidate identity;
- every candidate provider-affecting request field is bound by the final request identity;
- baseline/candidate builder/method separation remains intact;
- scored-run artifact/registration ordering satisfies `MODEL_EVALUATION_BOUNDARY.md`;
- no authority/config/database pointer mutation or deployment occurs in B3.1;
- an explicit checkpoint records whether the exact candidate evidence is accepted before B3.2 can start.

**Verification**

- candidate-source/fingerprint re-derivation;
- candidate request-identity verification;
- immutable corpus/rubric + registration verification;
- Gate-E scored-run evidence on exact candidate;
- inspection that no runtime authority mutation/deploy was performed by this slice.

**Checkpoint:** B3.1 evidence must be accepted for the exact candidate before any B3.2 activation/deploy work.

---

### B3.2 — Owner-scoped activation, exact deploy, readback, and smoke

**Size:** M  
**Estimate:** 0.5–1 working day, excluding external infrastructure/provider waiting  
**Depends on:** accepted B3.1 evidence + one owner deploy instruction that explicitly scopes the deploy and any authority/config mutation it requires

**Goal**

Activate/deploy the already-evidenced exact Track B candidate under `SOLO_PREPROD_MINIMAL`. Keep authority mutation and deployment explicitly separate from Gate-E scoring, without reintroducing approval ceremony that the current profile removed.

**Required sequence**

1. **B1 finding — provisionally source-deploy only.** No runtime code reads the authority-bundle payload fields; only `contractHash` is consumed. The payload declares authority topology, and under the selected direction the declaration stays truthful: strategy and CTA still derive from the Context V2 view, now from the candidate output rather than deterministic mapping over the same snapshot. On current evidence Track B therefore needs **no** behavior-version write, no pointer revision and no migration `0036`.

   Three conditions invalidate that and force a bundle change plus an owner-scoped authority mutation. B2.1–B2.4 must each re-check them, and B3.2 must confirm them one final time before deploying:
   - `authorityIndependentBypassClasses` stops being empty — `df13-release-candidate-evidence.ts:270` hard-fails evidence when it is non-empty, and `DF13_FENCE_AND_RELEASE_EVIDENCE.md:80-84` demands a finite enumeration plus contract tests proving independence from both authorities;
   - the eight-member consumer set changes;
   - the derivation label stops being truthful.
2. Under `SOLO_PREPROD_MINIMAL`, the owner instruction to deploy this candidate/commit to `PREPROD_TEST_PAGE` **is** the authorization for that scoped deploy; no Release Train boundary and no second approval record is required. The owner command must explicitly scope the deploy and any authority-mode/config/pointer mutation that activation requires.
3. Request additional explicit authorization only for a mutation **outside** that granted scope — an authority-mode switch, migration, routing/page-allowlist change, or destructive data action not named in the deploy instruction. Do not require a second approval merely because the step is a deploy.
4. Where an authority/config/database pointer mutation is actually performed, execute the existing DF13 fence/readback contract for it.
5. Migration `0036` is not automatically in scope; include it only if the exact activation path proves it is required and it falls inside the authorized scope.
6. Deploy only the exact merged commit/build for affected services.
7. Preserve the exact previous affected-service release/build/commit and previous authority/config state as the release-local rollback identity required by `RELEASE_INTEGRITY.md`.
8. Run applicable pre-activation readiness checks, then post-activation readback, smoke, and controlled test-page checks. Failed or unknown runtime state stops further mutation and rolls back to the exact previous affected-service identity.

**Acceptance criteria**

- B3.2 uses the exact candidate accepted in B3.1; no post-evidence authority-affecting source/request change is silently introduced;
- the owner deploy instruction explicitly scopes the deploy and every authority/config mutation performed under it; only a mutation outside that scope carries its own separate authorization, and every mutation has exact post-mutation identity/readback;
- no Release Train, second owner-approval record, tag/manifest ceremony, or runtime-state promotion is reintroduced as a default gate;
- source merge alone does not imply runtime activation or Track B completion;
- exact-head verification comes from a functioning CI run of the canonical checks; a remote run that starts zero repository steps is unavailable, not pass, and only `CI_UNAVAILABLE_FALLBACK` bound to the exact head may substitute;
- exact runtime identity and rollback identity are recorded where deployment actually occurs;
- one exact accepted PREPROD COMMERCE baseline is recorded for Track C.

**Verification**

- final candidate/evidence identity comparison before activation;
- focused/remote exact-head checks required by `SOLO_PREPROD_MINIMAL`;
- authority/config readback only if changed;
- exact runtime identity + readiness/smoke only if owner-authorized deploy actually occurs;
- rollback target/readiness confirmation for each affected service/authority state.

---

## 8. Track B completion gate

Track B is complete only when all of the following are true:

1. Active COMMERCE normal strategy, objection/CTA choice, and wording are model-owned.
2. Deterministic code remains authoritative for verified facts/provenance, security/PII, protected claims, policy, effect reconciliation/authorization, CAS/idempotency, and fail-closed behavior.
3. The existing DF13 composition remains the single COMMERCE authority/runtime seam; no second permanent runtime/control plane was created.
4. Invalid model output is bounded and cannot directly execute protected effects; deterministic fallback is verified-facts based and satisfies r31.3 without becoming a normal sales copywriter.
5. BF-04 is either closed with evidence for the migrated path or explicitly remains a fenced known residual that Track B does not increase or misrepresent.
6. Obsolete deterministic sales authority is unreachable from active COMMERCE or explicitly retained only for proven rollback/non-COMMERCE consumers.
7. Full-agent replay passes required safety/correctness assertions without side effects and r31.3 differential evidence is reviewed.
8. Baseline/candidate generation capability separation remains intact.
9. Final Track B candidate identity includes all authority-affecting source files and all provider-affecting request identity fields; stale Gate-E identities are not reused.
10. Any Gate-E scored run uses a separately committed immutable corpus/rubric artifact and valid pre-registration for the exact candidate.
11. B3.1 evidence is accepted before B3.2 authority mutation/deploy begins.
12. Every authority/config mutation is inside an explicitly scoped owner deploy instruction, or separately authorized when it falls outside that scope, and has exact readback/rollback identity.
13. Required focused tests/checks pass on the exact implementation heads where claimed, from a functioning canonical CI run; a CI job that executes zero repository steps is not a pass.
14. No unrelated UR/State V2/admin/multi-page/production-hardening work was pulled into Track B.
15. One exact accepted PREPROD COMMERCE baseline is recorded for Track C.
16. Final owner decision records Track B completion / Track C start; source merge alone is not completion evidence.

## 9. State V2 / UR decision rule

Track B deliberately leaves `stateReadMode=LEGACY` unchanged.

During B1/B2, record concrete evidence if the legacy read representation causes:

- contradictory/duplicated source of truth;
- incorrect cart/checkout/reconciliation behavior;
- unavoidable semantic translation that materially distorts the migrated COMMERCE path;
- concurrency/atomicity problems not solvable within current persistence/CAS contracts;
- a blocker to an explicit correctness invariant.

Such evidence may justify a later separately approved narrow State V2/UR slice. Architectural neatness or the mere existence of legacy state is not a trigger. Do not silently expand Track B into UR.

## 10. Estimated execution time

This estimate excludes external provider/infrastructure queue or waiting time and is intentionally re-opened after B1.

| Slice | Estimate |
|---|---:|
| B1 | 0.5–1 d |
| B2.1 | 0.5–0.75 d |
| B2.2 | 1–1.5 d |
| B2.3a | 0.75–1.25 d |
| B2.3b | 0.75–1.25 d |
| B2.3c | 0.5–1 d |
| B2.3d | 0.75–1.25 d |
| B2.4 | 0.5–1 d |
| B3 | 0.75–1.25 d |
| B3.1 evidence | 1–2 d |
| B3.2 activation/deploy | 0.5–1 d |
| **Current planning range** | **~7.5–13.25 working days** |

**Post-B1 re-estimate.** The table below predates B1. B1 removes work (the `ModelProposal` contract and its request-identity machinery already exist and are scored; the baseline needs no approved deviation; activation is provisionally source-deploy only) and adds work (the r31.3 differential harness does not exist and B3 must build it; candidate identity must be widened to the live orchestration path; the Context V2 per-turn snapshot prerequisite is unresolved). Net effect is roughly neutral on the low end and higher on the high end until the snapshot question is closed. Re-derive the table once B1's remaining items in `TRACK_B_B1_SCOPE_LOCK_FINDINGS.md` §10 are complete.

Budget **~8–13 working days** before B1 re-estimation. Do not use the old ~7-day target as a commitment. Gate-E provider waiting is excluded. If BF-04 requires broader remediation or activation requires migration/authority work beyond the bounded DF13 path, stop and re-plan rather than silently absorb it.

## 11. Main risks and stop conditions

### Correctness loss while removing deterministic business logic

Separate verified-fact/policy/effect invariants before retiring conversational authority. Add focused tests and r31.3 differential evidence before reachability removal.

### Accidental second architecture

Stop if implementation creates a sibling top-level COMMERCE runtime, new persistence/queueing, long-lived behavior modes, duplicated authority resolver/control plane, or parallel permanent runtime. Extend the DF13 seam instead.

### Model-evaluation boundary erosion

Stop if baseline/candidate capabilities begin sharing prompt/request builders, response identity rules, or public generation methods; if the baseline request envelope changes without approved deviation + differential evidence; or if candidate request fields are not fully represented in request identity.

### BF-04 exposure increases

Stop B2.3d if model-owned size wording can reach an unverified size-claim bypass not closed/fenced by the structured claim boundary. Never represent the residual as fixed without evidence.

### Deterministic fallback becomes hidden sales authority

Stop if fallback routinely chooses normal sales strategy or rewrites model output into handcrafted Vietnamese sales copy. Fallback is limited to bounded verified-facts/current-safe-output recovery required by correctness/r31.3.

### Candidate provenance becomes stale or incomplete

Stop if authority-affecting source files or provider-affecting request fields are outside the candidate identity, or if an old fingerprint/request identity/corpus/rubric is reused for a changed candidate.

### Evidence and activation get mixed

Stop if a Gate-E scored-run/evidence slice also writes authority/config/database pointers, deploys runtime, or performs live activation. B3.1 is evidence-only; B3.2 owns the owner-scoped activation/deploy.

### Activation path is unclear

Stop before runtime mutation if B1 cannot determine whether authority bundle, behavior pointer/config, migration, or simple source deployment is required. Do not improvise a database/authority mutation in B3.2.

### CI cannot produce exact-head evidence

The canonical self-hosted backend is restored, so a functioning CI run of the canonical checks is the expected verification. A remote run that starts zero repository steps is unavailable, not pass: use only `CI_UNAVAILABLE_FALLBACK` bound to the exact head, and otherwise stop merge/ship verification.

### Removed process ceremony is reintroduced

Stop if a Track B slice requires a Release Train boundary, a second owner-approval record, tag/manifest attestation, or runtime-state promotion as a default gate. `SOLO_PREPROD_MINIMAL` removed these; they return only when a concrete current risk or an explicit owner instruction requires them.

### Premature cleanup breaks rollback

Do not physically delete old implementations until replacement exists, consumers are migrated, zero active use is proven, and rollback no longer depends on them.

### Context V2 snapshot is not reliably available per turn

`MODEL_EVALUATION_BOUNDARY.md` §2 requires candidate input to be an integrity-valid snapshot that is never optional and never `null`. Today `contextV2CaptureEnabled` is derived from the COMMERCE startup mode (`realtime-server.ts:869`) and defaults to `false` (`realtime-runner.ts:2468`), so a capture is a best-effort side record. Promoting the candidate to the served path makes a valid snapshot a per-turn prerequisite. Design the fail-closed path for a turn that lacks one. If it cannot be solved inside current persistence/CAS contracts, this is the legacy-state blocker below — stop and record evidence rather than starting UR/State V2 inside Track B. B1 flags this as the highest-risk remaining unknown; close it before B2.1.

### Legacy state becomes a real blocker

Record evidence and stop the affected slice. Do not solve it by silently starting State V2/UR inside Track B.

## 12. Definition of Done discipline for every implementation PR

Each implementation PR must:

- satisfy its explicit acceptance criteria;
- test new behavior and important error/fail-closed paths;
- preserve r31.3 verified facts/media and produce required realtime differential evidence;
- keep existing applicable tests green where actually run;
- preserve business/security/data correctness and backward compatibility unless an explicit migration decision says otherwise;
- preserve baseline/candidate model-evaluation separation and complete request identity;
- avoid duplicated business logic, dead code and unrelated refactors;
- include appropriate focused lint/type/build/integration checks for the changed boundary under `SOLO_PREPROD_MINIMAL`;
- account for candidate provenance when authority-affecting source/request changes;
- document changed contract/current truth that future work depends on;
- preserve an explicit rollback target for deployed runtime/authority changes;
- never claim CI, Gate-E, runtime, migration, activation, or deploy evidence unless that exact action actually ran and produced inspectable evidence.
