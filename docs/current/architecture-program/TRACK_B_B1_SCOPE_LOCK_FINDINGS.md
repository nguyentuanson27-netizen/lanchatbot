# Track B — B1 Scope Lock Findings

**Status:** `B1_FIRST_PASS / EVIDENCE_ONLY / NO_RUNTIME_MUTATION`
**Implementation head traced:** `main@53408456ecaac8c8936061c9c3fd8275d6bdb179`
**Owner command:** Track B implementation authorized separately; this slice performed source tracing only.
**Direction selected by owner after these findings:** promote the existing Context V2 candidate capability to the live COMMERCE generation path; keep `BaselineModelCapability` byte-frozen for LEGACY comparison/rollback; do not modify the baseline and do not create a third capability.

This document records what B1 proved on the exact head. It is evidence, not authorization. No runtime, database, migration, authority or deployment action was performed.

---

## 1. Generation capability: the live COMMERCE path runs on the byte-frozen baseline

**Evidence**

- `apps/worker/src/realtime-runner.ts:102` imports `BaselineModelCapability`; the runner's model port (`realtime-runner.ts:2041-2046`) is composed only of baseline methods.
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

The plan assumes r31.3 differential evidence is available per slice. No **reply-behavior** differential runner exists today; what exists is a state-projection comparator and a side-effecting shadow worker. Per the owner's direction, B3 should build the runtime differential harness by reusing `shadow-runner.ts`, and B3.1 remains the governed Gate-E evidence slice. This is scope the current estimate does not carry.

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

## 10. What B1 has not yet covered

This pass targeted the axes that determine plan shape. Still open before B2.1 starts:

- full per-component `KEEP` / `SPLIT_REWRITE` / `RETIRE_AFTER_CUTOVER` / `ROLLBACK_ONLY` classification for every reachable component;
- the effect and commit path in `packages/chat-runtime/src/sales-cycle-runtime.ts` and the commerce-kernel policy/negotiation transition detail;
- the exact focused-test map per changed boundary;
- whether the Context V2 snapshot is reliably available for every COMMERCE turn. `contextV2CaptureEnabled` is set from `df13CommerceStartupInput.mode === "COMMERCE"` (`realtime-server.ts:869`) and defaults to `false` (`realtime-runner.ts:2468`). Promoting the candidate to the live path makes a valid snapshot a per-turn prerequisite rather than an optional capture, and `MODEL_EVALUATION_BOUNDARY.md` §2 requires candidate input to be an integrity-valid snapshot that is never optional and never `null`. If a turn can lack a valid snapshot, that is a fail-closed path to design, and if it cannot be solved inside current persistence contracts it is the plan's "legacy state becomes a real blocker" stop condition.

The last item is the highest-risk unknown remaining and should be closed before B2.1.
