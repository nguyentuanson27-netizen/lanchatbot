# Phase C qualification foundation

Evaluation artifacts only. This directory does not call providers, mutate shop/customer stores, or send customer messages. It does not implement the campaign collector, matched persisted C3 bridge, or real-adapter test driver. Imported evidence comes from those independently reviewed drivers; JSON validation does not authenticate an invented provider response or replace reading captured artifacts.

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

The absolute packet hides scenario/arm metadata and binds each grade to a packet/review ID and actual outcome hash. Preserve private seed/assignment files outside the judge's view. Human owner grading remains a planned protocol until the owner supplies actual grades; coding-agent unit votes are never human results. Comparative grading uses a separate packet and unresolved disagreements remain blocked.

## Collector contract

The collector must preserve every registered slot, including ERROR/NOT_RUN and failed generation counts. Each upstream generation has a unique ID, turn index, actual role, exact model/config/version, captured request body/hash, one request maximum and explicit error/usage/latency accounting. No generation retry. A successful ordinary candidate turn has OWNER then VERIFIER; C3 has STRATEGIST then RESPONDER. A bounded code-owned rendering path requires its own artifact witness and still needs verifier evidence for SEND_ELIGIBLE.

`runtimeInput` is the runtime projection only; its canonical JSON must be present in the captured request and its digest must match `boundRuntimeHash`. This applies to both arms and all roles. Evaluator labels are never put in these projections. JOURNEY uses actual `historyBefore/historyAfter`, whose hashes and public customer/shop message chain are checked; first history/state bind to the preregistered context. Frozen alternate customer branches may be selected from actual replies, without resetting either arm to scripted shop replies.

A verifier capture includes a `verifierInput` envelope actually present in its request: `requestId`, `exactFinalDraft`, UTF-8 SHA256 `draftHash`, `trustedSnapshotJson`, and UTF-8 SHA256 `snapshotHash` of that exact snapshot serialization. Eligibility binds the normalized PASS without violations, envelope, final-gate request/draft/snapshot identity and exact terminal text. SAFETY additionally binds the registered finalDraft itself. This is an evidence contract for the future collector; the foundation does not insert this envelope into the existing B transport or claim its serialization has already been qualified.

Source facts/policies/capabilities for the human judge live in evaluator-only `scenario.judgeContext`. `initialContext` locks world, initial state/history and freshness hashes. Per-arm `audit` retains facts, state transitions, effects, receipts and media. These are included in the packet/outcome hash. A handoff or no-send has no customer messages/images and records its terminal reason. Evaluate actual terminal outcomes, including provider failures and blocked drafts; a safe but unnecessary handoff may fail usefulness.

Metrics require monotonic per-generation latency; observed tokens/cost or explicit unavailability reasons; per-attempt tool calls, elapsed and added verification time. Reports separate arm/mode populations, keep aggregate data labeled `all`, and use nearest-rank p50/p95. Unknown usage is not fabricated as measured zero. Operational evidence and structural/real-adapter artifact hashes require raw artifact review; this tool does not execute those tests itself.

## Draft holdout and remaining dependencies

`holdout.draft.json` is **unsealed and not executable campaign input**: 16 SINGLE, 6 three-turn JOURNEY, 24 SAFETY (12 safe/12 unsafe) outlines. At N1 this would yield 68 registered arm/scenario slots if approved and bound: 46 candidate plus 22 baseline; journey turns are not extra repetitions. Safety text bindings are deliberately unresolved. `author-holdout.mjs` produces a draft only; no synthetic fixture is qualification evidence.

Before any Phase C provider campaign:

1. Finish/source-review world, product/policy/size/media and pre-state bindings; review new corpus naturalness, coverage, labels and development separation before seeing results.
2. Build and review the actual candidate collector and an authentic matched C3 bridge pinned to the owner-selected main SHA. Freeze exact C3 model/effort/generation config; existing simulation-only journey adapters are not proof of persisted parity. Preserve C3 orchestration rather than building a fake C3 from OWNER.
3. Bind captures/measurement and source provenance to the above evidence schema; independently approve the bridge, clean-source registration and human scoring workflow.
4. Run full fresh candidate safety/absolute qualification, then matched comparison and the seven real-adapter invariants. Do not infer C PASS from the synthetic tests below.

## Local verification

```powershell
node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Unit fixtures explicitly synthesize model responses/grades in disposable local repositories. They test fail-closed bookkeeping only. No provider claim, semantic safety measurement or replacement conclusion follows from them.
