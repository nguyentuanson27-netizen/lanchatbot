# Track B — B1 Scope Lock Findings

**Status:** `B1_FIRST_PASS / EVIDENCE_ONLY / NO_RUNTIME_MUTATION`
**Implementation head traced:** `main@53408456ecaac8c8936061c9c3fd8275d6bdb179`
**Owner command:** Track B implementation authorized separately; this slice performed source tracing only.
**Direction selected by owner after these findings, superseding an earlier selection:** demote post-generation deterministic authority only. No generation capability changes. `BaselineModelCapability` stays byte-frozen and the Context V2 candidate stays offline as a research and evaluation artifact. Owner ranking `1 > 2 >>> 3 > 4`; the escalation ladder and its rationale are in §2 of the execution plan.

**Retracted in the third self-review.** The second pass concluded the baseline stays live as a per-turn fallback. That was wrong; see §2b for the retraction and what replaces it.

This document records what B1 proved on the exact head. It is evidence, not authorization. No runtime, database, migration, authority or deployment action was performed.

---

## 1. Generation capability: the live COMMERCE path runs on the byte-frozen baseline

**Evidence**

- `apps/worker/src/realtime-runner.ts:102` imports `BaselineModelCapability`; `RealtimeModelPort` (`realtime-runner.ts:2040-2047`) is composed only of baseline methods — six of the eight, with `generate` and `groundWithFacts` required and four optional.
- `apps/worker/src/realtime-server.ts:47,893,909` wraps the Vertex model in `baselineModelCapability(...)` for the served runner.
- `apps/worker/src/vertex-baseline.ts:17-19` states the contract in-source: *"Byte-frozen generation capability shared by realtime and the V1 replay. Candidate-only generation must use a different capability and prompt builder."*
- The baseline surface is eight public generation methods (`vertex-baseline.ts:3-12`): `generate`, `groundWithFacts`, `groundDraftWithFacts`, `repairSizeClaimDraft`, `draftMultiProductClarification`, `draftCustomerUrlExplanation`, `judgeSalesReply`, `judgeSalesReplyV2`.
- `realtime-runner.ts` does **not** import `context-v2-candidate.js`. It imports `context-v2.js` only for `buildContextV2Capture` / `blockedContextV2Capture` (`realtime-runner.ts:133-136`), i.e. shadow capture persistence, plus `readLatestContextV2ForCommerce` (`realtime-runner.ts:1958`, used at `2915-2936`) to read the stored snapshot for COMMERCE product binding.

**Consequence**

`contracts/MODEL_EVALUATION_BOUNDARY.md` §1 is satisfied today exactly as written: realtime imports Context V2 only to persist a capture and to read a stored snapshot, and never passes it into the baseline capability or its request builders.

It also means the model interaction that actually serves customers is the **regression-pinned baseline envelope** of §4. Any Track B change to that envelope is not conditional — it would require an approved deviation plus realtime differential evidence. The selected direction avoids this by leaving the baseline untouched.

---

## 2. The Context V2 candidate contract already is a structured model proposal

**Evidence** — `packages/contracts/src/v2/context-v2.ts:507-535`, `ContextV2CandidateOutputV2Schema`:

| Field | Meaning for Track B |
|---|---|
| `segments` (1–16, typed semantic roles) | model-owned customer-facing draft |
| `strategy` enum | `ANSWER_VERIFIED_FACTS` \| `ASK_CLARIFICATION` \| `ADVANCE_CART` \| `HOLD_POSITION` |
| `cta` enum | `NONE` \| `ASK_PRODUCT` \| `ASK_MEASUREMENTS` \| `ASK_CHECKOUT_DETAILS` \| `CONFIRM_CART` |
| `productBinding.status` | `RESOLVED` \| `STALE` \| `AMBIGUOUS` \| `UNRESOLVED` \| `NOT_REQUIRED` |
| `contextHash` | binds the output to the exact context snapshot |

`GateEOutputInterpretationV1Schema` (`context-v2.ts:540+`) adds `claimContentHashes` and `clarificationTargets`.

Supporting machinery already exists in `apps/worker/src/context-v2-candidate.ts`: `sanitizeContextV2CandidateInput` (207), `deriveCandidateRequestIdentity` (254), `deriveCandidateRequestContextHash` (292), `buildCandidateRequest` (309), `ContextV2CandidateModel` (539).

**Consequence**

The plan's `ModelProposal` largely exists and has already passed Gate E v15 at 14/14 with claim safety 100% and zero side-effect violations. B2.2 therefore becomes *adopting and extending an existing scored contract* rather than designing a new one, and §5.3 request-identity pinning is served by machinery that is already built.

**Gap to close in B2.2:** four strategies and five CTAs are narrower than real sales conversation needs (objection handling, negotiation, post-sale). Extending the enums changes `packages/contracts/src/v2/context-v2.ts`, which is inside the frozen candidate-source set, so it produces a new candidate identity by construction.

**Cost of that widening, from §18.** Gate E requires *"a closed coverage matrix ... positive and adversarial-negative registered probes for every reachable effect, clarification, requested-action and frozen protected-claim class; missing, extra or duplicate coverage fails before corpus scoring."* Every class added to the enums therefore costs a matched pair of registered probes, and coverage closure is validated **before** corpus scoring even begins. This is the mechanical reason the Gate E exercise needed registration versions v1 through v15: a coverage matrix that is not exactly closed fails early and repeatedly. Widen the enums deliberately and minimally, and settle the class list in B3 fixtures before spending a registration round.

---

## 2a. `MODEL_EVALUATION_BOUNDARY.md` §6 forbids the selected direction as currently written

**This is the hardest constraint found, and it is stronger than §1 or §2.**

> 6. Offline/replay candidates are side-effect-free verification tools. They cannot send customer messages, mutate commerce/conversation state, authorize claims, or **become a third live semantic authority**.

Promoting the Context V2 candidate to the live COMMERCE generation path makes it do exactly what §6 prohibits: send customer messages and act as a live semantic authority.

**Consequence.** The contract revision required before B2.2 is not a clarification of §1 — it is a status change. A capability cannot be simultaneously "the offline candidate" that §6 constrains and the authority that serves customers. The revision must:

1. define the promoted capability's new status explicitly, so it stops being governed as an offline candidate once it serves traffic;
2. preserve §6 unchanged for whatever remains an offline/replay candidate after the promotion, so the prohibition is narrowed by definition rather than weakened;
3. keep §1's protection of the baseline intact — realtime still must never pass Context V2 into `BaselineModelCapability` or its request builders;
4. carry §2's integrity-valid-snapshot requirement onto the live path, where it becomes a per-turn precondition rather than a capture-time property.

Until that revision is merged, the selected direction contradicts a durable contract. Treat it as the first B2.2 deliverable and as a blocking dependency, not as documentation cleanup.

---

## 2b. RETRACTED — the baseline is not a per-turn fallback; a non-valid snapshot already blocks

**The second self-review got this wrong, and the third one caught it.**

That pass reasoned: `MODEL_EVALUATION_BOUNDARY.md` §11 forbids calling a candidate model without a valid built capture, and `AGENTS.md:47` forbids failing the turn, therefore the baseline must serve as the live fallback.

That merged two different failure modes with two different mandated responses:

- a missing or invalid **input snapshot**, and
- malformed model **output**.

`AGENTS.md:47` is about output: do not mark an Inbox `FAILED_PERMANENT` merely because model output is malformed or fails schema parsing; try a deterministic fallback from verified facts first. It says nothing about a missing context snapshot.

The input case is already specified, and it blocks. `contracts/DF13_FENCE_AND_RELEASE_EVIDENCE.md:51-52`: *"An absent Context V2 snapshot may bootstrap only an otherwise pristine Commerce `DISCOVERY` conversation at revision zero. Every later absent snapshot blocks."*

The implementation matches. `loadDf13CommerceRuntimeContext` (`apps/worker/src/df13-commerce-runtime-context.ts:263-320`) returns `BLOCKED` on read failure (`CONTEXT_V2_RUNTIME_SNAPSHOT_READ_FAILED`), on any non-`READY` capture outcome, on revision mismatch (`DF13_COMMERCE_CONTEXT_REVISION_MISMATCH`) and on invalid context (`DF13_COMMERCE_CONTEXT_INVALID`). Only `ABSENT` routes to `bootstrapCommerceDiscoveryContext`, and that path is gated at line 202-203 on `state.revision === 0 && state.stage === "DISCOVERY"`.

**Corrected consequences:**

1. §11 and the DF13 block behavior agree. A turn that cannot legally call the candidate is blocked, not served by the baseline. There is no two-capability live path and no capture-validity selector to design.
2. **B2.4's scope is not narrowed.** Retiring baseline reachability from the COMMERCE path stays possible, subject to B2.1 proving no other live consumer needs it.
3. The genuine open question is much narrower than the second pass claimed: the **revision-zero pristine `DISCOVERY` bootstrap**. `bootstrapCommerceDiscoveryContext` *synthesizes* a context (`catalogVersion: "df13-commerce-bootstrap-v1"`, line 235) rather than reading a captured one. A synthesized context is very likely not a "valid built capture" under §11, so that single turn may be unable to call the candidate. B2.1 must decide whether the bootstrap turn answers deterministically or whether the bootstrap context is promoted into a real capture.

The retracted claim was introduced by reading `MODEL_EVALUATION_BOUNDARY.md` in full while still not having read `DF13_FENCE_AND_RELEASE_EVIDENCE.md` in full. Reading one durable contract completely is not the same as reading the contract set.

---

## 2c. The candidate's governance assumes an async queue worker; live use is synchronous

`MODEL_EVALUATION_BOUNDARY.md` §8 and §11–§16 govern the candidate through a queue: claims, stale-lease recovery, attempt accounting, locked deadlines, population sync, disjoint queue ownership per prompt family, and run-level configuration blocks that return a claimed row to eligibility. §13 states the async producer *"is not wired to a deployed entrypoint in DF-B."*

Live COMMERCE invocation is synchronous inside the reply turn. Most of §8–§16 does not map onto it. The contract revision required by §2a must therefore also state which of those clauses apply to synchronous live use and which are offline-worker-only, rather than leaving both readings available.

§15 carries one concrete requirement into B2.2: candidate prompt families have disjoint queue ownership and *"Unknown future `context-v2-candidate-*` versions fail closed and cannot fall through to the legacy worker."* A Track B candidate version must be registered with an explicit owner predicate, or it fails closed by contract.

---

## 3. Gate-E candidate identity does not cover the live orchestration path

**Evidence** — `GATE_E_CANDIDATE_SOURCE_PATHS_V1` (`apps/worker/src/gate-e-registration.ts:72`) contains, from `apps/worker/src`, only: `context-v2-candidate.ts`, `context-v2-evaluation.ts`, `context-v2.ts`, `gate-e-frozen-artifacts.ts`, `gate-e-git-reader.ts`, `gate-e-output-interpreter.ts`, `gate-e-registration-policy.ts`, `gate-e-registration.ts`, plus workspace manifests, `packages/business-tools/src/*`, `packages/contracts/src/*` and `pnpm-lock.yaml`.

A grep for `realtime-runner`, `df13-`, `chat-runtime`, `commerce-kernel` and `conversation-engine` inside that frozen list returns **zero matches**.

**Consequence**

Gate E v15 scored the candidate capability's outputs against a frozen corpus and rubric. It did not, and structurally could not, exercise `RealtimeRunner`, the DF13 seam, the sales-cycle runtime or the effect path. Once the candidate capability becomes the live generation path, the candidate identity must be widened to cover the orchestration that consumes it, otherwise the evidence would describe a component rather than the served behavior.

This is the finding that most changes B3.1's shape, and it is why the owner directed that candidate identity be extended to the real live orchestration path.

---

## 4. Activation impact: the authority bundle payload likely does not need to change

This answers the owner's directive to determine rather than assume.

**Evidence**

- The payload (`packages/database/src/df13-commerce-authority-bundle.ts:30-41`) declares `phase: COMMERCE_DERIVED`, `context/strategy/cta: CONTEXT_V2`, `reconciliation: COMMERCE_FINAL`, `legacySalesStage: DEMOTED_TELEMETRY_ONLY`, an empty `authorityIndependentBypassClasses`, and the eight-member consumer set.
- **No runtime code branches on any individual payload field.** A grep for reads of `.strategy`, `.cta`, `.context`, `.phase`, `.reconciliation`, `.legacySalesStage` off the bundle returns nothing outside tests; every consumer that makes a decision compares `contractHash` only (`df13-runtime-authority-boundary.ts:65`, `df13-commerce-fence-postgres-provider.ts:39`, `df13-commerce-authority-contract.ts:52`, `df13-commerce-cutover.ts:232,401,446`, `runtime-behavior-mode.ts:594-600`, `df13-commerce-preprod-startup-authority.ts:133`, `df13-release-candidate-evidence.ts:268`).
- One path does carry the whole frozen object: `df13-commerce-cutover.ts:143,266` embeds `DF13_COMMERCE_AUTHORITY_BUNDLE_V1` into `CommerceCutoverPreparation`. That propagates the payload into cutover-preparation output as declarative evidence; it still does not branch on the fields. `df13-release-candidate-evidence.ts:335-337` records only `contractHash`, the consumer set and the empty bypass list.
- `contracts/DF13_FENCE_AND_RELEASE_EVIDENCE.md:80-84` describes the fields as the declared consumer set and derivation topology, not as runtime inputs.
- Independent support from `contracts/BEHAVIOR_CONTROL_PLANE.md`: its quiescent-cutover protocol governs `sales authority: LEGACY -> COMMERCE` and `state read: LEGACY -> V2`. Track B changes neither. That document also defines authority-dependent work as inputs whose *"classification, state read, phase, context, strategy, CTA, reconciliation, or subsequent plan can differ **by authority**"* — LEGACY versus COMMERCE, not one COMMERCE implementation versus another. Track B changes how strategy and CTA are computed **inside** COMMERCE, so it does not create a new authority and does not trigger the cutover protocol.

**Reading**

The payload is a declarative statement of authority topology whose only mechanical effect is the hash. `strategy: CONTEXT_V2` asserts that under COMMERCE, strategy derives from the Context V2 view rather than the demoted legacy sales stage. It does not assert *which component computes it*.

Under the selected direction the declaration stays truthful: strategy and CTA continue to derive from Context V2, now from the candidate output rather than from deterministic mapping over the same snapshot.

**Therefore B3.2 is provisionally source-deploy only** — no behavior-version write, no pointer revision, no migration `0036`.

**Three conditions would invalidate that and force a bundle change plus an owner-scoped authority mutation:**

1. `authorityIndependentBypassClasses` stops being empty. `df13-release-candidate-evidence.ts:270` hard-fails release candidate evidence when its length is non-zero, and `DF13_FENCE_AND_RELEASE_EVIDENCE.md:80-84` requires a finite enumeration plus contract tests proving independence from both authorities. If any Track B path can emit a reply outside the fence, this trips.
2. The eight-member consumer set changes.
3. The derivation label ceases to be truthful — for example if strategy came to depend on something outside the Context V2 view.

B2.1–B2.4 must each re-check condition 1. This is the single cheapest way to keep B3.2 small.

---

## 5. BF-04: structured claims are the closure mechanism, not an added risk

**Evidence**

- BF-04 enforcement is text-based: `detectConcreteSizeRecommendations` (`packages/business-tools/src/guard.ts:451-470`) normalizes the reply, tokenizes it, discovers size mentions, and drops any mention that `classifySafeExemptionForMention` (`guard.ts:389-394`) classifies as `QUESTION`, `NEGATION`, `CATALOG`, `STOCK` or `NON_CUSTOMER`.
- Verified claims are checked separately by `sizeClaimReason` (`guard.ts:471-500`) against source `VERIFIED_SIZE_ENGINE_V1`, evidence ref, product/variant scope, customer profile id and revision, and observed/expiry times.
- `program-state.json` records BF-04 as `PARTIAL_KNOWN_GAP_OWNER_WAIVED_FOR_DF_PROGRESSION`; `ACTIVE_BACKLOG.md:101,115` keeps the P0 bypass open.

**Reading**

The residual is a property of detecting size recommendations by reading Vietnamese prose. Exemption classification is where bypasses live, and no exemption heuristic over free text is complete.

The plan currently frames B2.3d as a step that could *increase* BF-04 exposure. The evidence supports the opposite framing, provided the fail-closed direction is right: if a protected size claim must be declared structurally by the model and verified against size-engine facts before any size wording may ship, the text detector stops being the primary boundary and becomes defense-in-depth. That is a closure path for the P0, not an amplifier.

**Required direction, to be enforced in B2.3a/B2.3d:** a reply whose text contains a concrete size recommendation with no declared, verified, in-scope claim must fail closed. Detector and structured boundary run together; the structured one is authoritative and the detector may only reject, never approve.

BF-04 may be recorded as closed only with new regression evidence for the migrated path. Until then it stays an open residual.

---

## 6. The r31.3 differential evidence the plan requires has no harness

**Evidence**

- `AGENTS.md:44` requires every realtime change to be differential-tested against the r31.3 behavioral baseline.
- A repository-wide search for `r31.3` / behavioral-baseline tooling in `apps` and `packages` returns exactly one file: `apps/worker/src/realtime-r32.2-compatibility-shield.test.ts`. There is no differential runner.
- The closest existing mechanism is `apps/worker/src/shadow-runner.ts` (447 lines). `Phase4ShadowRunner` replays the **baseline** capability with `assembleReply` and `guardAgentProposal` and computes `textSimilarity`.
- **`shadow-runner.ts` is not side-effect-free as it stands.** It is a queue-driven worker: `store.claimNext()` (181), `store.complete(...)` (320), `store.fail(...)` (347), `store.claimComparisonNext()` (353), `store.completeComparison(...)` (365, 436). It never sends customer messages and never mutates commerce/conversation state, but it does claim jobs and persist shadow-evaluation rows. B3 must extract its comparison core, or run it in a mode that neither claims nor completes jobs, before it can serve as the side-effect-free differential harness.
- A separate comparator already exists for **state**, not for reply content: `apps/worker/src/commerce-authority-comparison.ts` (246 lines) compares LEGACY and COMMERCE projections of stage, phase, product scope and cart scope. It is a reuse point for the state half of the differential; it says nothing about reply wording.

**Consequence**

The plan assumes r31.3 differential evidence is available per slice. No **reply-behavior** differential runner exists today; what exists is a state-projection comparator and a side-effecting shadow worker.

The contract also makes the B3/B3.1 split mandatory rather than stylistic: *"Realtime capture population is unsampled and independent of Gate E. Any legacy operational replay sample is a separate population and is not admissible as Gate E data."* The r31.3 differential runs on the realtime capture population, so its output can never be presented as Gate E evidence, and Gate E's frozen corpus can never stand in for realtime differential evidence. Both are required, separately. Per the owner's direction, B3 should build the runtime differential harness by reusing `shadow-runner.ts`, and B3.1 remains the governed Gate-E evidence slice. This is scope the current estimate does not carry.

---

## 7. Deterministic sales-copy inventory on the migrated path

`realtime-runner.ts` contains at least eighteen deterministic Vietnamese copy or proposal producers: `multiProductReply` (667), `xmlMaterialPhrase` (767), `xmlFormPhrase` (788), `productDescriptionLine` (814), `verifiedProductInfoProposal` (863), `requestedImagesProposal` (975), `productInfoLookupProposal` (1002), `deterministicVertexProposalFallback` (1046), `safeStaleProposal` (1194), `safeModelHandoffFallback` (1217), `multiFactReply` (1506), `catalogAdvisoryReply` (1594), `sizeEngineProposal` (1685), `composeSizeEngineAdvice` (1767), `approvedSizeClaimClarification` (1823), `postMediaProofCta` (1881), `withSizeEngineAdvice` (1917), `withProactiveSizeAdvice` (1935).

Deterministic strategy selection is `decideWave2SalesStrategy` (`packages/business-tools/src/sales-strategy-v1.ts:460`), called at `realtime-runner.ts:3471` and again at `4563`, with `applyWave2ReplyPolicy` (`sales-strategy-v1.ts:568`) rewriting the proposal at `realtime-runner.ts:4581`. Reply assembly is `assembleReply` (`packages/business-tools/src/reply-assembler.ts:183`), called at `realtime-runner.ts:4372`.

**Classification note.** `applyWave2ReplyPolicy` is the clearest `RETIRE_AFTER_CUTOVER` candidate: it rewrites a model proposal into deterministic strategy/CTA copy after generation. The fallback producers (`deterministicVertexProposalFallback`, `safeStaleProposal`, `safeModelHandoffFallback`) are `KEEP` — `AGENTS.md:47` requires a deterministic fallback from verified facts when model output is malformed. The fact/media builders (`buildVerifiedFactBlocks`, size-engine advice) are `SPLIT`: keep the verified-fact computation, move the wording.

---

## 8. DF13 seam confirmed as admission and fence only

`createDf13CommerceRuntimeComposition` (`apps/worker/src/df13-commerce-runtime-composition.ts:15`, wired at `realtime-server.ts:763`) binds the behavior-pointer resolver and the executor to one object. `Df13CommerceRuntimeExecutor` (`df13-commerce-runtime-executor.ts`) performs identity admission, fence assessment, request authorization, lease dispatch and fence-bound commit. It does not orchestrate replies.

The reply pipeline lives in `RealtimeRunner` (`realtime-runner.ts:2404`). B2.1's "extend the DF13 seam" is therefore accurate as a governance statement but must be read precisely: the new stages attach between DF13 admission and the runner's reply orchestration, and the runner itself is what gets restructured. B2.1 should not be read as implying the stages live inside the fence executor.

---

## 9. CI capability

The canonical self-hosted backend is functional. Run `#591` on head `ebc6a9d` completed `success` with 13/13 steps, including the full `Run repository checks` step over roughly 25 minutes and the PostgreSQL policy-transaction step. Exact-head verification is available; `CI_UNAVAILABLE_FALLBACK` is not currently needed.

---

## 9a. Full durable-contract sweep (third self-review)

All eight contracts in `contracts/` were read end to end. `MODEL_CLAIM_BOUNDARY.md` had never been opened before this pass, and it is the contract that most directly governs Track B.

### `MODEL_CLAIM_BOUNDARY.md` — Track B closes a contract gap, it does not open a new direction

Its target principle already reads: *"The model decides conversational semantics and drafts the reply. Code verifies every protected claim, authorizes side effects, and enforces prohibitions."* Under "Model may" it already sanctions emitting structured claims and requested actions.

So the plan's framing — Track B *moves* authority to the model — is inaccurate. The durable contract already assigns that authority to the model; the **implementation drifted**. Track B closes a gap between contract and code. That framing matters because it changes what counts as justification: restoring the contract needs no new architectural argument, while any deviation from it does.

Four concrete requirements the plan did not carry:

1. **BF-04's fail-closed direction is already mandated.** "Code must ... validate every protected claim and **reject undeclared protected claims**", and protected claims explicitly include **size/fit recommendation** alongside price, stock, ETA, shipping fee, freeship, promotion and product media. The direction proposed in §5 is not a Track B invention; the P0 residual is a standing deviation from this contract.
2. **Bounded repair is exactly one.** "A rejected proposal may receive **one** bounded repair request containing safe reason codes and allowed evidence. After bounded failure, use an approved safe clarification or handoff response with no unsupported business claim." The plan says "a fixed maximum regeneration count" without a number. The contract sets it at one.
3. **Conflict resolution direction.** "Ambiguity or deterministic/model conflict resolves to the **less aggressive** action and emits evidence; it never selects the more aggressive action." B2.3b's reconciler must implement this explicitly.
4. **Reason codes are mandatory.** "reason-code every rejection, override, repair, and safe fallback." The plan never mentions reason codes; every B2.3 slice needs them.

Also noted, and unresolved: its "Authority migration" clause says *"Context V2, final reconciliation, derived phase, deterministic V2 consumers, and legacy-regex demotion activate atomically under the sales-authority control plane."* DF-13 already activated the Context V2 consumers under COMMERCE, so promoting **generation** may or may not count as a further V2-consumer activation. This is a fourth condition to test against the source-deploy-only conclusion in §4, and B2.1 should settle it rather than assume.

### `BEHAVIOR_CONTROL_PLANE.md`

- *"Claim verification must never have a mode that restores an unverified business claim."* No flag, mode or incident policy may reopen BF-04's bypass. Fail-closed is not configurable.
- *"Incident policies may extend the versioned payload, but they must not become env-only flags or independent untracked authorities."* This links §2b to §4: any behavioral switch Track B adds must not be an env-only flag, and if it becomes a versioned behavior-mode dimension it changes the behavior content hash — which would break the source-deploy-only conclusion. Deriving behavior purely from capture validity keeps activation cheap; making it configurable makes it an authority mutation.
- *"Offline or controlled legacy/new comparison is verification tooling, not a live authority mode. It must not create protected side effects."* Direct support for the B3 harness constraint in §6.

### `DF06_READINESS_ROOT_CAUSE_CLOSURE_20260814.md`

- §9: *"Model evidence has authorization `NONE` and cannot authorize cart, order, or protected effects."* The durable basis for B2.3b.
- §18: *"A deterministic buying hint may guide the first Wave 2 reply strategy or error fallback before canonical evidence exists. It has no side-effect authority."* This **refines the classification in §7**: the early `decideWave2SalesStrategy` call at `realtime-runner.ts:3471`, fed by `detectBuyingSignal` at `3455`, has a contractual basis for the pre-evidence first reply and cannot simply be deleted. The retire target is the **post-generation** pair: the second decision at `4563` and `applyWave2ReplyPolicy` at `4581`, which rewrite a model proposal into deterministic strategy and copy.
- §17: readiness lifetime is bounded to 60 seconds, fail-closed on staleness. A synchronous candidate call plus a bounded repair adds provider latency inside the turn and can push a readiness artifact past expiry. B2.2 must budget latency against that 60-second bound; this is a new risk the plan does not carry.

### `RELEASE_INTEGRITY.md`

§3 supports the B3.2 framing: *"Merge/evidence recording does not imply deployment; deployment does not imply a new authority-mode mutation unless that mutation was explicitly authorized."* §1.7 adds that if behavior authority or configuration does change, the exact active readback after startup must be verified and the exact previous identity retained.

### `DATASET_BOUNDARY.md`, `MULTI_PRODUCT_MEDIA_COUNT_CONTRACT_20260812.md`

No Track B impact found. The multi-product contract's `SILENT_HANDOFF` above ten inbound images runs before model generation, so it is unaffected by the generation change.

---

## 9b. The option set put to the owner was incomplete (fourth self-review)

The direction question in this session offered three options: promote the Context V2 candidate to live, edit the baseline capability, or build a third capability. **A fourth option was never offered, and on the evidence it is both cheaper and closer to the adopted plan.** That question was asked before `POST_DF_SIMPLIFIED_PLAN_PROPOSAL_20260825.md`, `MODEL_CLAIM_BOUNDARY.md` and the `AgentProposalV1` schema had been read.

### The baseline already returns a structured model proposal

`AgentProposalV1Schema` (`packages/contracts/src/index.ts:520-557`) — the return shape of the **baseline** capability's `generate` — already carries:

| Field | V5 B3 target element |
|---|---|
| `intent`, `conversationStage` | model semantic/sales intent |
| `strategyAnalysis`, `salesSignals` | model structured strategy |
| `protectedClaimIds` | structured claim references |
| `action` (`ReplyActionSchema`), `businessFactQuery` | requested actions/effects |
| `reply`, `attachments` | normal customer-facing draft |

The schema comment at line 529-530 already states the claim contract: *"Model output may reference a trusted claim ID, but never carries the provenance itself. The runtime supplies and verifies that provenance."*

V5's B3 target runtime is *"model structured strategy + claims + requested effects + normal reply draft"*. That shape already exists, inside the byte-frozen envelope.

### The drift is entirely post-generation

`Wave2StrategyInput.modelAnalysis` (`sales-strategy-v1.ts:99`) is **optional**: the model's own strategy analysis is an optional input to a deterministic decision that then overrides the reply.

`applyWave2ReplyPolicy` (`sales-strategy-v1.ts:568-589`) takes a valid model proposal and returns `{ ...proposal, reply }` where `reply` is the model's prose passed through `limitQuestions(...)` and then concatenated with `ctaText(decision.ctaPolicy)` — deterministic Vietnamese CTA copy.

That is exactly what `MODEL_CLAIM_BOUNDARY.md` prohibits — *"it does not silently remove arbitrary phrases and send the damaged remainder"* — and exactly what V5's B2 defines as DEMOTE: *"rewrites a valid model draft for ordinary style/business preference"* and *"hard-codes objection/CTA behavior as conversational authority rather than correctness/safety"*.

### The missing option — demote post-generation authority only

It was absent from the three offered here. In the owner's final ranking it became **option 1**, the selected direction; the numbering in the execution plan is the owner's, not this section's discovery order.

Restructure the orchestration after generation and change **no capability**:

- keep the baseline capability and its byte-frozen envelope untouched;
- keep the Context V2 candidate offline, so `MODEL_EVALUATION_BOUNDARY.md` §6 is never contradicted and no durable-contract revision is needed;
- demote the second `decideWave2SalesStrategy` (`realtime-runner.ts:4563`) and `applyWave2ReplyPolicy` (`4581`), and the deterministic copy-repair path;
- promote `strategyAnalysis` / `salesSignals` from optional advisory input to the strategy authority;
- keep claim verification, effect reconciliation and fail-closed behavior exactly as they are.

**What this avoids compared with the selected option:** no §1/§2/§6 contract revision, no capability status change, no prompt-family registration, no widening of `ContextV2CandidateOutputV2` and therefore no new §18 coverage-matrix probes, and no per-turn snapshot prerequisite. The Gate-E candidate fingerprint still goes stale — `sales-strategy-v1.ts`, `guard.ts` and `reply-assembler.ts` are all in the frozen set — but that was already a known Track B dependency in V5 line 328.

**What it does not deliver:** the Context V2 candidate stays unused in production, so the Gate E v15 evidence continues to describe a capability that never serves customers. If the program's intent is to eventually put that capability live, this option defers that rather than resolving it. The owner accepted that deferral explicitly; see "Decision taken" below.

### Where the amended plan drifted heavier than adopted V5

V5 C4 orders the deployment work: *(1) run the current re-evaluation path using the minimal operational entrypoint from Track B; (2) use existing provenance/release evidence; (3) **only if** the governing contract still creates a concrete unacceptable blocker, make the smallest separately authorized contract/enforcement amendment.* It adds *"Do not pre-build a new evidence profile or second evaluation authority"* and *"Do not proactively redesign governance."*

V5's B3.1 deliverable is that a *minimal operational rerun path **exists*** — a CLI/command adapter, registration inputs, existing evidence-store and provider transport wiring.

The amended plan's B3.1 instead mandates, up front, freezing the candidate, committing a new immutable corpus/rubric artifact, pre-registering and executing a governed scored run. That inverts V5's order by front-loading step 3. The `MODEL_EVALUATION_BOUNDARY.md` requirement for a fresh corpus on any future scored run is real, but V5 says to reach it through the minimal path first and amend only if genuinely blocked.

Two further divergences from the adopted plan:

- **Estimate.** V5 sets Track B at ~4–10 working days with a 1–2 day B1 timebox. The amended plan says 7.5–13.25 days, budget 8–13, above the adopted range. Divergence from a canonical adopted plan should be stated, not silent.
- **Taxonomy.** V5 uses KEEP / DEMOTE / SPLIT. The amended plan uses KEEP / SPLIT_REWRITE / RETIRE_AFTER_CUTOVER / ROLLBACK_ONLY.

V5 also adds a B3 constraint the plan does not carry: *"Do not require the full Wave1 population before Track B finishes."*

### Decision taken

The owner re-decided with the full option set and selected this option, ranking `1 > 2 >>> 3 > 4`. Two premises were verified before the decision was accepted:

- `AgentProposalV1` already carries the fields the target requires (above);
- the baseline prompt already assigns the division of labour. `vertex.ts:254` — *"strategyAnalysis chi phan loai need, barrier, decisionFactor va strategy **de app kiem tra**"*; `vertex.ts:327` — *"strategy chi la de xuat va khong duoc vuot guard deterministic"*; `vertex.ts:264` — *"Model chi cung cap evidence buyingIntent; app va guard deterministic moi duoc quyet dinh"*.

The prompt constrains model strategy from overriding the **guard**, which is a correctness boundary. It never licenses rewriting model wording for style, so the current overrides exceed the prompt as well as the contract.

One further datum lowers the perceived risk: the deterministic CTA is appended only when `questionCount(limited) === 0` (`sales-strategy-v1.ts:583-586`). The model normally supplies its own question or CTA, so the deterministic append is a backstop rather than the primary source.

**Recorded so a later session does not reopen it:** the Context V2 candidate remaining outside production is an accepted consequence, not an oversight. It keeps its value as an offline research and evaluation artifact. Promotion is deferred to the escalation ladder in execution-plan §2 and is reached only if the frozen baseline is proven unable to select adequate strategy or CTA.

Two amendments were made to the owner's proposal during review, both recorded in the execution plan:

1. **Escalation ladder.** The owner's stop condition went from option 1 straight to option 2. `MODEL_EVALUATION_BOUNDARY.md` §4 *contemplates* a baseline envelope change and defines its mechanism, while §6 states a flat prohibition with no mechanism. A narrowly scoped baseline prompt change under §4 is therefore inserted between them, with the loss of the byte-frozen V1 comparison anchor weighed explicitly at that point.
2. **Gate-E leaves the merge path, not the deploy path.** The trigger for pre-deploy re-evaluation is a change to candidate-affecting source, not a change of capability. Track B modifies `sales-strategy-v1.ts`, `guard.ts` and `reply-assembler.ts`, all inside the frozen set, so V5 line 328's deployment dependency still applies. V5 C4 exempts candidates not selected for deployment, so the boundary is a deploy gate.

### Process note

A direction question was put to the owner before reading the plan that defines the work, the contract that governs the boundary, and the schema of the object at the centre of it. The three options offered were therefore not the real option set. The correction cost four review passes.

---

## 10. What B1 has not yet covered

This pass targeted the axes that determine plan shape. Still open before B2.1 starts:

- full per-component `KEEP` / `SPLIT_REWRITE` / `RETIRE_AFTER_CUTOVER` / `ROLLBACK_ONLY` classification for every reachable component;
- the effect and commit path in `packages/chat-runtime/src/sales-cycle-runtime.ts` and the commerce-kernel policy/negotiation transition detail;
- the exact focused-test map per changed boundary;
- whether the Context V2 snapshot is reliably available for every COMMERCE turn. `contextV2CaptureEnabled` is set from `df13CommerceStartupInput.mode === "COMMERCE"` (`realtime-server.ts:869`) and defaults to `false` (`realtime-runner.ts:2468`). Promoting the candidate to the live path makes a valid snapshot a per-turn prerequisite rather than an optional capture, and `MODEL_EVALUATION_BOUNDARY.md` §2 requires candidate input to be an integrity-valid snapshot that is never optional and never `null`. If a turn can lack a valid snapshot, that is a fail-closed path to design, and if it cannot be solved inside current persistence contracts it is the plan's "legacy state becomes a real blocker" stop condition.

The last item is the highest-risk unknown remaining and should be closed before B2.1.
