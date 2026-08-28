# Track B — Model Authority Execution Plan

**Status:** `PROPOSED / PLAN_ONLY / REVIEW_AMENDED`
**Program point:** post-Track-A / post-Gate-F, V5 Track B
**Plan baseline:** `main@3dde67234a732bae2a50e93cdf3f2892202e4207`
**Environment:** `ENGINEERING_PREPROD`, one bounded `PREPROD_TEST_PAGE`
**Authorization:** merge of this plan does **not** authorize Track B implementation, authority mutation, deployment, migration, or live testing. `program-state.json` currently requires a separate owner command before the next Track implementation.

## 1. Purpose

Execute V5 Track B by simplifying the **current COMMERCE hot path** so that:

- the model owns normal conversational semantics, normal sales strategy, objection/CTA choice, and normal customer-facing wording;
- deterministic code owns verified facts/provenance, security/PII, policy limits, claim verification, effect reconciliation/authorization, CAS/idempotency, and fail-closed behavior;
- invalid model output is handled by bounded regeneration and, when needed, a bounded deterministic fallback built only from verified facts/current safe outputs;
- deterministic fallback is not allowed to become a second Vietnamese sales-copywriter or a second normal sales-strategy engine;
- existing database, Inbox/Outbox, Meta delivery, contracts, durable messaging, cart/money correctness, DF13 authority fencing, and security primitives are reused rather than rebuilt.

This is an implementation refinement of the adopted V5 Track B direction. It is **not** a new Track, State V2/UR program, new control plane, or second runtime architecture.

## 2. Current state and hard constraints

1. Track A / DF-C / Gate F are complete and are not reopened by this plan.
2. Current accepted runtime remains `salesAuthorityMode=COMMERCE`, `stateReadMode=LEGACY`.
3. `packages/database/src/df13-commerce-authority-bundle.ts` already records:
   - `legacySalesStage: "DEMOTED_TELEMETRY_ONLY"`;
   - `strategy: "CONTEXT_V2"`;
   - `cta: "CONTEXT_V2"`.
4. `apps/worker/src/df13-commerce-runtime-composition.ts` is the existing **single real COMMERCE composition seam** between behavior-pointer authority admission and `RealtimeRunner`. Track B must extend/reuse this seam, not create a sibling top-level `CommerceRuntime`.
5. Track B leaves `stateReadMode=LEGACY` unchanged unless a later separately approved evidence-backed decision opens a narrow UR/State V2 slice.
6. BF-04 remains an accepted known residual: P0 unverified size-claim bypasses must not be represented as fixed.
7. Invariant r31.3 remains binding for realtime work:
   - preserve verified facts/media when downstream model/size/enrichment fails;
   - differential-test realtime changes against the r31.3 behavioral baseline, with intentional differences explicitly justified;
   - do not mark Inbox permanently failed solely because model output is malformed/schema-invalid; first attempt deterministic fallback from verified facts.
8. PR #269 / `SOLO_PREPROD_MINIMAL` is still pending at this plan revision. Before any implementation PR is verified, merged, activated, or deployed, re-read the process actually merged on `main`. Do not treat PR #269 text as active governance until merged.
9. Existing Gate E/F evidence is historical/current evidence for its exact candidate and scope. Track B must not relabel stale candidate fingerprints, corpus/rubric hashes, authority hashes, or scored evidence as proof for a changed candidate.

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

## 5. Gate-E / candidate-integrity contract for Track B

`apps/worker/src/gate-e-registration.ts` currently freezes `GATE_E_CANDIDATE_SOURCE_PATHS_V1`, including current business-tool authority files such as `guard.ts`, `reply-assembler.ts`, `sales-strategy-v1.ts`, `size-engine.ts`, and `negotiation-engine-v2.ts`.

Track B therefore treats candidate integrity as an explicit dependency, not an end-of-track formality:

1. B1 must inventory the exact source files that can affect the Track B candidate's model authority, protected claims, output interpretation, fallback, or requested effects.
2. Any new authority-affecting DF13/internal stage file must be included in the candidate-source identity before relying on Gate-E scored evidence for that candidate.
3. Changes to existing frozen source files make the old candidate fingerprint stale for the changed candidate; re-derive rather than reuse by description.
4. Updating the candidate-source list itself changes `gate-e-registration.ts`; the resulting exact candidate identity must be derived from the final registered source set.
5. The accepted Gate-E v15 corpus/rubric/evidence remains immutable historical evidence. A future Track B scored run must follow `contracts/MODEL_EVALUATION_BOUNDARY.md`: a separate immutable corpus/rubric artifact committed before the run, Git-derived blob/plan-hash verification, registration ancestry, and strict registration-before-run ordering.
6. `executeGateEScoredRun(...)` in `apps/worker/src/gate-e-registration.ts` is the existing scored-run integration point. Do not create a second scored-run implementation.
7. Provider credentials stay outside GitHub Actions and repository contents.

B3 runtime replay and B3.1 Gate-E scored evidence are related but **not the same artifact**. Runtime replay may contain focused regression fixtures; any fixture promoted into Gate-E scoring must enter the immutable corpus/rubric/registration flow required by the evaluation contract.

## 6. Execution dependency graph

```text
separate owner command authorizes Track B implementation
        ↓
B1 exact current hot-path + provenance + BF-04 scope lock
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
B3 one side-effect-free full-agent replay adapter + r31.3 differential evidence
        ↓
B3.1 freeze candidate/corpus -> pre-register -> Gate-E scored evidence
        ↓
if authority/config activation is required:
  owner-authorized pointer/authority mutation + exact identity/readback
        ↓
exact merged-commit PREPROD deploy under active governance + smoke
        ↓
accepted Track B PREPROD baseline
        ↓
Track C
```

B2.3 sub-slices may be reordered only if B1 proves a cleaner dependency graph without widening scope or bypassing BF-04/r31.3/Gate-E constraints.

---

## 7. Tasks

### B1 — Lock exact COMMERCE hot path, authority, candidate provenance, and residuals

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
- current BF-04 evidence/residual owners

**Required outputs**

- exact current COMMERCE call graph;
- exact current authority graph, distinguishing already-demoted legacy `salesStage` from current `SalesCycleStageV1`/DF13-context behavior;
- per-component classification: `KEEP`, `SPLIT/REWRITE`, `RETIRE_AFTER_CUTOVER`, or `ROLLBACK_ONLY`;
- exact file/test list for B2.1/B2.2;
- candidate-source/fingerprint impact list;
- BF-04 size-claim bypass map for every B2.3d-relevant path;
- activation impact: whether Track B changes authority-bundle payload, behavior pointer/config identity, migration requirements, or only source behavior behind an existing authority identity;
- current CI capability/status and the verification fallback allowed by **merged** governance.

**Acceptance criteria**

- every planned B2 target is proven reachable/current or explicitly marked rollback/legacy-only;
- no new top-level runtime/composition is needed; if the existing DF13 seam cannot host the target pipeline, stop and amend the plan;
- every authority-affecting new/changed source is accounted for in candidate provenance;
- B2.3d has an explicit BF-04 closure/fence strategy before implementation;
- any required migration, new control plane, second runtime, or materially wider-than-bounded slice triggers a plan amendment and new estimate before code work continues.

**Verification**

- source trace on exact implementation head;
- map existing focused tests and r31.3 differential baseline to changed boundaries;
- verify current candidate-source registration/evaluation contracts;
- no runtime mutation/deploy in B1.

**Checkpoint:** publish B1 findings and re-estimate the remaining Track B plan before B2.1.

---

### B2.1 — Extend the existing DF13 COMMERCE seam into explicit stages

**Size:** M  
**Estimate:** 0.5–0.75 working day  
**Depends on:** B1

**Goal**

Reuse the existing DF13 composition/executor boundary and introduce only the minimum internal stage interfaces required for model proposal -> verification -> reconciliation -> fallback/finalization. Do not create a sibling `CommerceRuntime` entrypoint.

**Likely files**

Final paths are locked by B1. Prefer colocated DF13 worker modules, for example:

- existing `df13-commerce-runtime-composition.ts` / executor/context/finalization owners;
- one internal proposal/stage module if required;
- one focused worker test file;
- `realtime-runner.ts` only if the exact seam requires a narrow call-site change.

**Acceptance criteria**

- COMMERCE continues through the single DF13 authority/composition seam;
- no duplicated persistence, queue, behavior-mode topology, authority resolver, or second runtime is introduced;
- current verified facts/provenance/effect infrastructure is reused;
- LEGACY rollback semantics remain intact;
- behavior remains equivalent except for explicitly characterized internal seam changes.

**Verification**

- focused composition/executor characterization tests;
- affected workspace typecheck/build checks required by merged governance;
- r31.3 differential check for any realtime behavior touched by the seam change.

---

### B2.2 — Make the model own normal strategy and wording

**Size:** M  
**Estimate:** 1–1.5 working days  
**Depends on:** B2.1

**Goal**

Introduce/normalize an explicit structured model proposal carrying normal semantic/sales intent, normal customer-facing draft, structured claims, and requested effects/actions. Move normal sales strategy/copy authority to the model without weakening deterministic correctness boundaries.

**Likely files**

- DF13/internal model-proposal stage identified by B1;
- exact model adapter/prompt-input path;
- exact schema/contract owner if an existing contract is insufficient;
- focused proposal/model-boundary tests;
- current strategy consumer only where B1 proves it still overrides model authority.

**Acceptance criteria**

- model output is treated as untrusted structured input and schema-validated;
- normal COMMERCE strategy, objection handling, CTA choice, and customer-facing wording come from the model proposal;
- already-demoted legacy `salesStage` is not reintroduced as a target or authority;
- current deterministic sales-cycle/context mappings are removed/demoted only where they actually select normal sales strategy rather than protect correctness;
- valid model wording survives deterministic validation unchanged except for required safety/fact/effect rejection;
- malformed/partial/adversarial model output cannot execute protected effects and enters bounded recovery.

**Verification**

- valid/malformed/unknown-field proposal tests;
- tests proving valid model-owned wording survives deterministic validation;
- tests proving invalid claims/actions are rejected rather than silently rewritten into another normal sales reply;
- r31.3 differential evidence with intentional deviations documented.

---

### B2.3a — Make structured protected claims the primary correctness boundary

**Size:** M  
**Estimate:** 0.75–1.25 working days  
**Depends on:** B2.2

**Goal**

Verify protected claims against typed current facts/provenance so `guard.ts`/reply assembly no longer act as the primary reverse-parser and normal sales-copy repair layer.

**Likely files**

- one DF13/internal claim-verifier stage;
- current `guard.ts` and `reply-assembler.ts` only where B1 proves active authority;
- current protected-claim/fact contract owners;
- focused verifier tests.

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

**Likely files**

- one DF13/internal effect-reconciler stage;
- `packages/chat-runtime/src/sales-cycle-runtime.ts` only for current correctness/authority boundaries proven by B1;
- current commerce-kernel/policy owners as required;
- focused reconciler tests.

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

Keep verified size computation/provenance deterministic while allowing the model to word a normal size response **only after the known BF-04 unverified-size-claim bypasses are either closed on the migrated path or explicitly fenced so Track B cannot increase their exposure**.

**Hard precondition**

Do not activate model-owned size wording if B1/B2.3a cannot prove one of the following:

1. the relevant BF-04 bypasses are closed for the migrated path with regression evidence; or
2. the migrated path cannot emit/authorize the unsafe size claim class and the residual remains explicitly recorded as not fixed.

If neither is true, stop B2.3d and amend the plan. Do not hide the residual behind model wording.

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

**Candidate areas, not mandatory edits**

- `realtime-runner.ts`;
- BF02 wrappers if still active;
- `sales-strategy-v1.ts` if still active for migrated COMMERCE behavior;
- `sales-cycle-runtime.ts` / DF13 context mappings where they still select normal conversational strategy;
- legacy `conversation-engine/src/sales-stage.ts` is expected to be already demoted on COMMERCE and should not be edited unless B1 proves active authority/rollback need.

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

**Known integration point**

`apps/worker/src/gate-e-registration.ts` exports `executeGateEScoredRun(...)`. B3 replay may reuse lower-level candidate/evaluation primitives, while B3.1 owns the governed Gate-E scored run.

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

### B3.1 — Freeze Track B candidate evidence and establish one accepted PREPROD baseline

**Size:** M  
**Estimate:** 1–1.5 working days, excluding external provider waiting
**Depends on:** B3

**Goal**

Use the existing Gate-E registration/scored-run mechanism correctly for the changed Track B candidate, then perform any separately authorized authority/config activation and exact-commit PREPROD deployment required to establish the Track C baseline.

**Required sequence**

1. Freeze the final Track B candidate-source set, including every new authority-affecting file.
2. Re-derive candidate fingerprint from the exact final registered source set.
3. Create/commit the immutable Track B corpus/rubric artifact required for the future scored run; do not mutate the accepted v15 artifact.
4. Pre-register exact candidate + corpus/rubric/plan identities in the required ancestry/time order.
5. Run the governed `executeGateEScoredRun(...)` path in an authorized provider-capable environment; respect the current execution caps and keep provider credentials out of GitHub Actions/repository.
6. Record the resulting evidence under the current evaluation contract.
7. Determine from B1 whether model-authority changes require a new DF13 authority-bundle payload/hash, behavior content/pointer identity, migration, or only a source deploy behind the existing authority contract.
8. If an authority/config/database pointer mutation is required, obtain separate owner authorization and execute the existing DF13 fence/readback contract. Migration `0036` is not automatically in scope; include it only if the exact activation path proves it is required.
9. Under the process actually merged on `main`, deploy only the exact merged commit/build for affected services, preserve the exact previous affected-service release/build/commit and previous authority/config state as rollback identity, then run applicable readiness/smoke/readback checks.

**Acceptance criteria**

- no stale Gate-E candidate fingerprint or accepted v15 corpus/rubric is presented as Track B proof;
- all Track B authority-affecting sources are inside the final candidate identity;
- future scored-run artifact/registration ordering satisfies `MODEL_EVALUATION_BOUNDARY.md`;
- source merge alone does not imply runtime activation, deployment, or Track B completion;
- any authority mutation has explicit owner authorization and exact post-mutation identity/readback;
- one exact accepted PREPROD COMMERCE baseline is recorded for Track C with viable rollback.

**Verification**

- candidate-source/fingerprint re-derivation;
- immutable corpus/rubric + registration verification;
- Gate-E scored-run evidence on exact candidate;
- focused/local/remote checks required by merged governance. If remote CI cannot start or executes zero repository steps, do not call it a pass; use only the fallback explicitly allowed by merged governance and bind it to the exact PR head;
- authority/config readback only if changed;
- exact runtime identity + smoke only if owner-authorized deploy actually occurs.

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
8. Final Track B candidate identity includes all authority-affecting source files; stale Gate-E fingerprints are not reused.
9. Any Gate-E scored run uses a separately committed immutable corpus/rubric artifact and valid pre-registration for the exact candidate.
10. Any authority/config mutation is separately owner-authorized and has exact readback/rollback identity.
11. Required focused tests/checks pass on the exact implementation heads where claimed; a CI job that executes zero repository steps is not a pass.
12. No unrelated UR/State V2/admin/multi-page/production-hardening work was pulled into Track B.
13. One exact accepted PREPROD COMMERCE baseline is recorded for Track C.
14. Final owner decision records Track B completion / Track C start; source merge alone is not completion evidence.

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

This estimate excludes external provider queue/wait time and is intentionally re-opened after B1.

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
| B3.1 | 1–1.5 d |
| **Current planning range** | **~7–11.75 working days** |

Budget **~7–12 working days** before B1 re-estimation. Do not use the old ~7-day target as a commitment. If BF-04 requires a broader remediation or activation requires migration/authority work beyond the bounded DF13 path, stop and re-plan rather than silently absorb it.

## 11. Main risks and stop conditions

### Correctness loss while removing deterministic business logic

Separate verified-fact/policy/effect invariants before retiring conversational authority. Add focused tests and r31.3 differential evidence before reachability removal.

### Accidental second architecture

Stop if implementation creates a sibling top-level COMMERCE runtime, new persistence/queueing, long-lived behavior modes, duplicated authority resolver/control plane, or parallel permanent runtime. Extend the DF13 seam instead.

### BF-04 exposure increases

Stop B2.3d if model-owned size wording can reach an unverified size-claim bypass not closed/fenced by the structured claim boundary. Never represent the residual as fixed without evidence.

### Deterministic fallback becomes hidden sales authority

Stop if fallback routinely chooses normal sales strategy or rewrites model output into handcrafted Vietnamese sales copy. Fallback is limited to bounded verified-facts/current-safe-output recovery required by correctness/r31.3.

### Candidate provenance becomes stale or incomplete

Stop if authority-affecting source files are outside the candidate identity, or if an old fingerprint/corpus/rubric is being reused for a changed candidate.

### Activation path is unclear

Stop before runtime mutation if B1 cannot determine whether authority bundle, behavior pointer/config, migration, or simple source deployment is required. Do not improvise a database/authority mutation at B3.1.

### CI executes zero repository steps

Treat as unavailable, not pass. Use only the exact-head fallback allowed by merged governance; otherwise stop merge/ship verification.

### Premature cleanup breaks rollback

Do not physically delete old implementations until replacement exists, consumers are migrated, zero active use is proven, and rollback no longer depends on them.

### Legacy state becomes a real blocker

Record evidence and stop the affected slice. Do not solve it by silently starting State V2/UR inside Track B.

## 12. Definition of Done discipline for every implementation PR

Each implementation PR must:

- satisfy its explicit acceptance criteria;
- test new behavior and important error/fail-closed paths;
- preserve r31.3 verified facts/media and produce required realtime differential evidence;
- keep existing applicable tests green where actually run;
- preserve business/security/data correctness and backward compatibility unless an explicit migration decision says otherwise;
- avoid duplicated business logic, dead code and unrelated refactors;
- include appropriate focused lint/type/build/integration checks for the changed boundary under merged governance;
- account for candidate provenance when authority-affecting source changes;
- document changed contract/current truth that future work depends on;
- preserve an explicit rollback target for deployed runtime/authority changes;
- never claim CI, Gate-E, runtime, migration, activation, or deploy evidence unless that exact action actually ran and produced inspectable evidence.