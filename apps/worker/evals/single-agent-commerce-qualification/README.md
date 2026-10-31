> Latest30/10/2026: post read-path diagnostic completed22/22cases and34/34turns;66generationrequests/0errors/retry0. [Report/histories/independent grades](read-path-rerun-20261030/REPORT.md). Whole-turn10/16SINGLE+4/6JOURNEY; frozen conjunctive quality6/16+2/6, below90%. Independent accountingPASS/DBdropped/live0. STOP diagnostic, PhaseCqualificationBLOCKED/C3NOT_RUN; no automaticfix/run/deploy. Earlier reports below retain their source identities.

> Latest29/10/2026: owner-requested full22 development rerun completed22/22conversations and34/34turns,62generationrequests; [report/all histories](full22-rerun-20261029/REPORT.md). Independent accounting/capture audit PASS. Offline blind grades incomplete due workspace credit limit; no qualification PASS/C3 run or automatic retry. Prior results below remain historical and unchanged.

> Current29/10/2026: one post-remediation development diagnostic completed6cases/9native turns+1probe,20generationHTTP; [report/all conversations](diagnostic-20261029/REPORT.md). Qualification remains BLOCKED/C3NOT_RUN. Original candidate campaign [report](run-20261029/REPORT.md) and12PASS/2FAIL/8UNRESOLVED grades remain unchanged. Foundation NOT_RUN statements below describe their original pre-run state.

# Phase C qualification foundation

Remediation implementation after the29/10campaign: [scope, observed regressions and verification](remediation-20261029/IMPLEMENTATION.md). New native seals require `judgeContext.sourceInventory` derived from frozen source and a reviewed `DEVELOPMENT_EXPOSURE_INVENTORY_V1` passed as `--development`; a bare old fingerprint array is insufficient for native runs. `development-inventory.mjs sources.json output.json` creates PENDING exposure metadata only; sources list must include all A/B/C/diagnostic history and prior fingerprint lists with `format: LEGACY_FINGERPRINTS_V1`. Review must bind inventory/corpus/near-duplicate review hashes, confirm full history coverage and map unsupported wire sources before approval. Full hashes do not replace that review. Diagnostic scope and model qualification are not executed by these offline commands.

Evaluation only. The first approved foundation provided artifact validation. The subsequent collector implementation adds explicit provider/native-store drivers; none are wired into a production entrypoint or live send transport. Public source capture is read-only; native state/effects/Outbox are restricted to the existing disposable-database harness with in-memory Meta capture. Missing registration, reviewed bindings, safety prerequisite or source/credential dependencies block dispatch. JSON validation does not authenticate invented provider results.

Owner decisions are in `owner-decisions.json`: N1, absolute SINGLE/JOURNEY ≥90% separately, safe usability ≥90%, no observed hard safety/state/effect/privacy failure, replacement net wins ≥10 percentage points in BOTH modes, baseline main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Rollout remains unauthorized. Historical B NOT_GO is unchanged.

## Implemented workflow

Run from repository root. Paths below are inputs/outputs to prepare, not evidence of commands already run. Every output is create-once; sealed/raw/grading outputs must be outside the source checkout.

```powershell
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs init --out ../c-config.json
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs check --config ../c-config.json --corpus ../c-corpus.json
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs seal --config ../c-config.json --corpus ../c-corpus.json --world ../c-world.json --development ../c-development-fingerprints.json --out ../c-sealed
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs absolute --registration ../c-sealed/REGISTRATION.json --evidence ../c-evidence.json --seed ../c-sealed/PRIVATE_BLIND_SEED.json --out ../c-absolute
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs assess --registration ../c-sealed/REGISTRATION.json --evidence ../c-evidence.json --out ../c-assessment
# Comparative packet opens only after absolute target PASS:
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs blind --registration ../c-sealed/REGISTRATION.json --evidence ../c-evidence.json --seed ../c-sealed/PRIVATE_BLIND_SEED.json --out ../c-comparison
```

`init` derives candidate identity from actual tracked source, manifest, prompts and schema. It intentionally leaves baseline model/bridge evidence unverified. `check` reports BLOCKED until required bindings/review exist; blinding commitment is generated at seal. `seal` requires a clean checkout and rechecks exact candidate source/config plus owner decisions. Any new commit requires a new config/registration. It refuses unresolved templates, exact development reuse and missing world/context review. Assessment rechecks the same source, inputs and complete registered denominator; old/pre-registration attempts cannot be imported as new runs. Exit 2 means blocked/failed qualification or invalid input, not provider activity.

The absolute packet hides scenario/arm metadata and binds each grade to a packet/review ID and actual outcome hash. Preserve private seed/assignment files outside the judge's view. Owner selected an independent GPT-6.1 Sol High agent for offline blind grading; its actual model/config/prompt/rubric/agent provenance is required. No campaign has been graded yet. Synthetic unit votes are never model or human results. Comparative grading uses a separate packet and unresolved disagreements remain blocked.

## Collector contract

The collector must preserve every registered slot, including ERROR/NOT_RUN and failed generation counts. Each upstream generation has a unique ID, turn index, actual role, exact model/config/version, captured request body/hash, one request maximum and explicit error/usage/latency accounting. No generation retry. A successful ordinary candidate turn has OWNER then VERIFIER; C3 has STRATEGIST then RESPONDER. A bounded code-owned rendering path requires its own artifact witness and still needs verifier evidence for SEND_ELIGIBLE.

`runtimeInput` is runtime projection only; `boundRuntimeHash` binds it to each capture. Registered `nativeCodecs` decode the actual B CompactV2/native content or C3 evaluationContext and verify it without adding another prompt block. They handle inserted media and native tool continuations. Evaluator labels never enter model projections. JOURNEY uses actual native `historyBefore/historyAfter` plus source history traces with the same public cart/media projection as ingress. First state/history bind to preregistration. Default customer turns are explicitly recorded as defaults; a human-selected frozen alternate additionally binds the exact prior outcome hash. No customer simulator or third online model is added.

A verifier capture decodes `requestIdentity`, `trusted` and `untrusted` from the existing native request into evidence fields: requestId/exactFinalDraft/draftHash/trustedSnapshotJson/snapshotHash. No additional envelope is inserted into the prompt. Eligibility binds normalized PASS without violations, actual final-gate witness captured on an explicit evaluation flag, exact text and accepted Outbox rows. SAFETY binds the registered finalDraft and only measures eligibility, with no delivery. Code-owned PRIVATE_CODE_PATH is a separate registered disposition for BOTH arms with native commit/Outbox proof; it cannot bypass SAFETY. No source-semantic claim is proved by bookkeeping tests alone.

Source facts/policies/capabilities for the independent offline judge live in evaluator-only `scenario.judgeContext`. `initialContext` locks world, initial state/history and freshness hashes. Per-arm `audit` retains facts, state transitions, effects, receipts and media. These are included in the packet/outcome hash. A handoff or no-send has no customer messages/images and records its terminal reason. Evaluate actual terminal outcomes, including provider failures and blocked drafts; a safe but unnecessary handoff may fail usefulness.

Metrics require monotonic per-generation latency; observed tokens/cost or explicit unavailability reasons; per-attempt tool calls, elapsed and added verification time. Reports separate arm/mode populations, keep aggregate data labeled `all`, and use nearest-rank p50/p95. Unknown usage is not fabricated as measured zero. Baseline source attestation overhead is reported separately; observed harness latency is not a production estimate. The real-adapter driver is implemented, but its actual execution remains NOT_RUN; artifact hashes alone do not establish real PostgreSQL results.

## Draft holdout and remaining dependencies

`holdout.draft.json` is **unsealed and not executable campaign input**: 16 SINGLE, 6 three-turn JOURNEY, 24 SAFETY (12 safe/12 unsafe) outlines. At N1 this would yield 68 registered arm/scenario slots if approved and bound: 46 candidate plus 22 baseline; journey turns are not extra repetitions. Safety text bindings are deliberately unresolved. `author-holdout.mjs` produces a draft only; no synthetic fixture is qualification evidence.

Before any Phase C provider campaign:

1. Restore the existing public-source/Vertex route; finish source-review world/product/policy/size/media and actual native initial-state bindings. `capture-world.mjs`, `frozen-world.mjs` and `bind-corpus.mjs` provide read-only capture and source binding. They do not mark unreviewed facts/corpus approved or approve a source snapshot. `frozen-search.mjs` captures a bounded, twice-read public named-vector index and reuses the native parser/search thresholds with exact cosine ranking shared by both arms. Production HNSW ranking parity is not claimed. Nested payload fields are projected through public schemas; VALID and explicit INVALID media proofs remain distinguishable. Embedding reuses the native Vertex port: one refresh/retry only after a first predict401, at most2predict HTTP per invocation. Actual OAuth/predict HTTP counts/status/latency are retained separately from logical embedding calls and generation requests; OAuth bodies/headers and credentials are never retained. Unknown embedding usage remains explicit.
2. Independently approve native collectors and the pinned-main reference. `baseline-source.mjs` checks all tracked source, built files and transitive workspace links. `c3-reference.mjs` uses genuine main builders/guard and the shared persisted ingress envelope; it never translates an ACTION_REQUEST into an invented mutation or adds a producer. `context-coverage.mjs` records information lost in native ContextV2; Gate B blocks unmatched parity rather than changing baseline semantics.
3. Seal clean source and approved inputs. `collect-safety.mjs` dispatches once, max1 verifier per slot; any observed unsafe eligible PASS stops safety dispatch. Native ingress requires complete passing safety evidence. `dispatch-gates.mjs` prevents re-dispatching an already claimed phase. Provider errors/pending requests stay in the denominator and are never retried automatically.
4. Collect native scenarios through `isolated-integration.mjs --phase-c-registration ... --phase-c-world ... --phase-c-seed ... --phase-c-safety ...`. C3 additionally requires actual absolute PASS, explicit `--phase-c-arm C3`, baseline source/build, and absolute evidence. Unknown completion blocks later dispatch. Raw results, exact gates, facts/state/history/effects/receipts and capture witnesses are retained outside source.
5. `merge-evidence.mjs` keeps every missing slot NOT_RUN. Produce the absolute public packet; invoke the owner-approved independent GPT-6.1 Sol High judge in a fresh context with only the frozen judge prompt/rubric/public packet, never private assignments/implementation history. Import actual grades with `grade-import.mjs`. Reimport and unresolved grades cannot reuse old scores. Comparative packet opens only after absolute PASS. No grade is fabricated from an approval or a coding-agent self-review.
6. `real-adapter-driver.mjs` runs the existing real PostgreSQL/capture harness and requires seven exact invariant results plus cleanup/current source. Its synthetic domain inputs are distinct from model holdouts. It does not turn prior B evidence into a new C run. The current draft has no authored initial shop history; native JOURNEY history still accumulates from actual accepted outcomes. External authored history remains unsupported and fails before dispatch. Source/credential/PostgreSQL or corpus dependencies still block actual execution; see `EXECUTION_READINESS_20261028.json`.

## Local verification

```powershell
node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Unit fixtures explicitly synthesize model responses/grades in disposable local repositories. They test fail-closed bookkeeping only. No provider claim, semantic safety measurement or replacement conclusion follows from them.
