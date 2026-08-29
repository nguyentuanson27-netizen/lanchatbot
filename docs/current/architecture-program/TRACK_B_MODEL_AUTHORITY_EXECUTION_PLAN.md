# Track B — Model Authority Execution Plan

**Status:** `PROPOSED / PLAN_ONLY / REVIEW_AMENDED`
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
4. `apps/worker/src/df13-commerce-runtime-composition.ts` is the existing **single real COMMERCE composition seam** between behavior-pointer authority admission and `RealtimeRunner`. Track B must extend/reuse this seam, not create a sibling top-level `CommerceRuntime`.
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

### 5.2 Baseline/candidate capability separation

The baseline and candidate may share authenticated transport only. They must **not** share:

- prompt builders;
- request builders;
- response identity rules;
- public generation methods.

B2.2 must preserve this separation while introducing the structured `ModelProposal` candidate path. Track B must not simplify the architecture by merging the baseline and candidate generation capabilities into one public builder/method.

### 5.3 Request-envelope and request-identity pinning

The baseline request envelope remains regression-pinned to its approved source baseline. If Track B intentionally changes the baseline envelope, the change requires the applicable realtime differential evidence and an approved deviation; changing a prompt/version label is not evidence of equivalence.

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

### B3.1 — Freeze Track B candidate and produce governed Gate-E evidence

**Size:** M/L  
**Estimate:** 1–2 working days of engineering/execution, excluding external provider wait; re-estimate after B1 and do not treat this as a fixed one-day commitment  
**Depends on:** B3

**Goal**

Produce governed evaluation evidence for the exact Track B candidate. This slice is **evidence-only**: no behavior-pointer/database mutation, deployment, or live PREPROD activation occurs here.

**Required sequence**

1. Freeze the final Track B candidate-source set, including every new authority-affecting file.
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

1. Use B1 evidence to determine whether activation requires a new DF13 authority-bundle payload/hash, behavior content/pointer identity, migration, or only a source deploy behind the existing authority contract.
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
