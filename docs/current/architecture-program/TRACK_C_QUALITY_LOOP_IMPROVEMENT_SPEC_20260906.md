# Track C Quality Loop Improvement Spec — Judge 3.8, Rubric, Review, Telemetry

**Status:** `IMPLEMENTED / COMPLETE — SEQUENCING DEVIATION RECORDED`

**Scope:** Track C offline quality-evaluation loop only. This document does not authorize runtime mutation, generator-model promotion, database changes, provider-credential changes, deployment, or PREPROD/production traffic changes.

## Implementation Closure

- Implemented by PR #329, merged to `main` as `c2125b3904f3d9b0b609715de95285a6bf61debc`.
- GitHub CI run #800 completed successfully, including repository `pnpm check`.
- No pre-existing Track C `VertexShadowModel` composition existed. Owner approved the smallest offline-only composition factory, now exposed through `createTrackCQualityJudge(...)`; runtime/generator composition remains unchanged.
- V1 comparison consumers were internal Track C consumers only and were updated directly; no V1↔V2 compatibility adapter was added.
- Slice A and Slice B landed together in PR #329 instead of preserving the planned separately reviewable sequencing. This is a recorded, accepted non-blocking deviation; final focused coverage and repository CI are green.
- Provider-backed Vertex smoke was not run. It remains optional; no provider credential expansion or provider-backed GitHub Actions job was added.
- No DB migration, runtime authority mutation, PREPROD deploy, generator promotion, generator model/location change, or new secret scope was part of this implementation.

## Objective

Improve the existing Track C quality loop without turning it into a general evaluator platform.

The change has five bounded goals:

1. Change the Track C quality judge to Vertex AI `gemini-3.8-flash` on the `global` endpoint while leaving the generator/runtime model and location unchanged.
2. Clarify the existing rubric for `naturalness`, `objectionResolution`, and `ctaStageFit` without adding score dimensions.
3. Establish a process rule that each candidate experiment changes only a small number of material tuning variables so quality deltas remain attributable.
4. Deliberately narrow normal automatic human-review routing to near-ties, regressions, and judge disagreement; calibration remains explicit/manual evaluator maintenance.
5. Record real judge token usage and latency while keeping those runtime metrics outside identity/provenance hashes and selection semantics.

This stays inside the adopted Track C principle: reuse the existing `judgeSalesReplyV2(...)`, B3 replay, deterministic MUST_PASS, and provenance/identity machinery; do not build a second judge/evaluator platform.

## Pre-implementation Context

At the start of this work, `main` had:

- `TrackCQualityJudgePort` wrapping `judgeSalesReplyV2(...)`;
- deterministic C1 MUST_PASS asserted before either quality-judge call;
- accepted and candidate replies scored with the same pinned judge descriptor;
- `BETTER | SAME | WORSE` derived from `overall` delta with `NEAR_TIE_DELTA = 0.25`;
- comparison contract `TRACK_C_QUALITY_JUDGE_V1`;
- V1 input/review semantics containing optional `calibrationSample` and `CALIBRATION_SAMPLE`;
- human-review reasons currently including `CALIBRATION_SAMPLE`, `NEAR_TIE`, `UNEXPECTED_REGRESSION`, and `JUDGE_DISAGREEMENT`;
- the adopted Track C text reserving human review for calibration samples, ties/near-ties, unexpected regressions, and judge disagreements;
- the Vertex V2 judge using the same configured `modelName` and `location` as other Vertex generation paths;
- `.env.example` currently defaults `VERTEX_LOCATION=us-central1`, so selecting 3.8 on `global` must not reuse the generator location implicitly;
- the V2 judge generation config currently including `temperature: 0.1`, `maxOutputTokens: 1024`, JSON MIME type, and the existing response schema;
- the V2 rubric scoring `naturalness`, `objectionResolution`, and `ctaStageFit` on the existing `0..5` scale without explicit anchors for those dimensions;
- generic Vertex response parsing already able to preserve prompt/completion/total token counts for other generation paths, while `judgeSalesReplyV2(...)` currently returns only `SalesRubricAssessmentV2` and therefore drops judge usage/latency evidence.

## Source / API Constraints

Gemini 3.8 Flash uses model ID `gemini-3.8-flash`, is GA, supports structured outputs, and supports thinking levels `LOW`, `MEDIUM`, and `HIGH` with `MEDIUM` as the provider default.

For Gemini 3.8 Flash on Vertex AI, deprecated sampling parameters including `temperature`, `top_p`, and `top_k` must be stripped rather than used as determinism controls. The judge must pin the model, strict structured response schema, and a supported thinking level.

Gemini 3.8 Flash supports Vertex AI location `global`; the official REST example uses `https://aiplatform.googleapis.com/v1/projects/.../locations/global/.../gemini-3.8-flash:generateContent`. The owner explicitly selects `global` for this Track C judge. Do not move the generator/runtime Vertex location as part of this change.

This spec deliberately selects `HIGH` rather than relying on the provider default because the judge is offline evaluation and the owner prefers maximum evaluator reasoning quality over lower token/latency cost.

Official references checked for this spec:

- Google Cloud — Gemini 3.8 Flash developer guide: `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-flash`
- Google Cloud — Gemini 3.8 Flash model/locations: `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash`
- Google AI for Developers — Gemini 3.8 Flash model page: `https://ai.google.dev/gemini-api/docs/models/gemini-3.8-fllash`
- Google AI for Developers — Gemini 3.8 migration/latest-model guidance: `https://ai.google.dev/gemini-api/docs/latest-model`
- Google AI for Developers — Gemini thinking levels: `https://ai.google.dev/gemini-api/docs/thinking`

## Canonical Track C Amendment

The adopted Track C V5 text originally included calibration samples among cases reserved for human review. This spec intentionally narrowed the **normal automatic comparison routing**:

```text
before
CALIBRATION_SAMPLE | NEAR_TIE | UNEXPECTED_REGRESSION | JUDGE_DISAGREEMENT

after
NEAR_TIE | UNEXPECTED_REGRESSION | JUDGE_DISAGREEMENT
```

This is a deliberate source-of-truth amendment, not an implementation detail.

It does **not** prohibit owner-requested/manual calibration when maintaining or changing the evaluator. It only removes calibration from the ordinary candidate-comparison contract.

PR #329 updated the governing Track C documentation so canonical wording and implementation agree.

## Assumptions

1. **Generator remains unchanged.** A stronger generator is a future candidate experiment, not Track C infrastructure work.
2. **Same provider.** Judge remains on existing Vertex AI/service-account plumbing; no new provider integration or credentials are introduced.
3. **Judge model and location are separately configured and fail-closed for Track C.** Backward compatibility may exist inside the generic Vertex model, but Track C itself must not silently inherit either the generator model or generator location.
4. **Judge location is pinned to `global`.** The existing generator/runtime Vertex location remains unchanged.
5. **No judge benchmark project.** No multi-model leaderboard, holdout platform, or multi-provider evaluator framework.
6. **No new rubric dimensions.** Only scoring instructions for the three named existing dimensions change.
7. **Candidate-change discipline is a workflow rule, not a diff engine.**
8. **Thinking level is pinned to `HIGH`.** This is an explicit owner decision for the offline judge; do not silently downgrade to `MEDIUM` or `LOW` for cost/latency.
9. **Runtime metrics are observational evidence, not identity.** Token counts and latency never participate in candidate/judge identity, reproducibility hashes, comparison disposition, review routing, or selection.
10. **Judge-model migration and rubric clarification are separately observable slices.**
11. **Contract semantics change explicitly.** Removing calibration from the normal contract and adding metrics requires a new comparison contract version rather than silently changing V1 semantics.

## Tech Stack

- TypeScript / Node.js 22+
- pnpm 10.12.4 workspace
- Vitest 3.2.4
- Vertex AI `generateContent`
- Existing `@lana/contracts` `SalesRubricAssessmentV2` schema
- Existing Track C C1/C1.1/C2 quality and replay adapters

No new dependency is required.

## Proposed Design

### 1. Version the Track C comparison contract

The updated result/input semantics must use:

```text
TRACK_C_QUALITY_JUDGE_V2
```

Do not keep the literal `TRACK_C_QUALITY_JUDGE_V1` while changing its meaning.

V2 changes are intentionally bounded to:

- removal of normal `calibrationSample` input and `CALIBRATION_SAMPLE` review reason;
- addition of non-identity judge-call metrics;
- fail-closed binding to the Track C pinned judge identity.

`SalesRubricAssessmentV2` remains unchanged; this is a Track C **comparison/evidence contract** version bump, not a sales-rubric schema version bump.

During `/plan`, locate actual V1 consumers/fixtures. Update them directly where they are internal to this Track C flow. Do not build a V1↔V2 compatibility adapter unless a concrete consumer requires one.

### 2. Judge model/location separation and Track C fail-closed binding

Extend the existing Vertex model configuration with judge-specific location and model identity while preserving backward compatibility for unrelated construction sites:

```ts
export interface VertexShadowModelOptions {
  readonly location: string;
  readonly modelName: string;
  readonly judgeLocation?: string;
  readonly judgeModelName?: string;
  // existing fields unchanged
}

const judgeLocation = options.judgeLocation ?? options.location;
const judgeModelName = options.judgeModelName ?? options.modelName;
```

Only `judgeSalesReplyV2Descriptor()` and the actual V2 judge request use `judgeLocation` / `judgeModelName`.

Generator/proposal/draft/prelabel paths continue using `location` / `modelName` unchanged.

For Track C, the resolved descriptor must be exactly:

```text
provider: VERTEX_AI
location: global
model: gemini-3.8-flash
```

The generic fallbacks exist only for backward compatibility outside this boundary. `runTrackCQualityComparison(...)` or the owning Track C boundary must validate the exact pinned provider/location/model **before invoking either accepted or candidate judge call**. A missing/mismatched descriptor fails closed with a focused Track C error; it must not silently evaluate with the generator model or generator location.

No new environment variable or configuration subsystem is required for this owner-locked Track C choice. Set `judgeLocation: "global"` and `judgeModelName: "gemini-3.8-flash"` at the real Track C composition boundary.

### 3. Gemini 3.8 judge generation config

Keep the current strict JSON response schema, remove deprecated sampling controls, and pin thinking level:

```ts
const SALES_RUBRIC_V2_GENERATION_CONFIG = {
  maxOutputTokens: 1_024,
  responseMimeType: "application/json",
  responseSchema: SALES_RUBRIC_V2_RESPONSE_SCHEMA,
  thinkingConfig: {
    thinkingLevel: "HIGH",
  },
} as const;
```

`HIGH` is owner-approved and part of the pinned judge generation-config identity. Changing it later is evaluator maintenance and must produce a new generation-config identity; it must not happen as an untracked runtime optimization.

The generation-config hash remains part of judge identity, so the model/config migration creates a new pinned evaluator identity.

### 4. Clarify the existing rubric without adding dimensions

Keep the existing score schema and `0..5` range unchanged. Use one common three-band mapping for the three clarified dimensions:

```text
4–5 = high / clearly good
2–3 = middle / partial or acceptable with material weakness
0–1 = low / clearly poor or missing
```

The bands are anchors, not a new weighting formula. `overall` remains the judge's existing holistic field; this slice does not introduce a deterministic aggregate formula.

Dimension boundaries must stay distinct:

- `naturalness`
  - **4–5:** natural Vietnamese Messenger wording; direct, non-robotic, non-repetitive, and appropriately concise;
  - **2–3:** understandable and acceptable but noticeably formulaic, generic, or mildly repetitive;
  - **0–1:** awkward, robotic, strongly repetitive, or unnatural for the conversation;
  - judge conversational delivery here, not factual correctness or CTA timing.

- `objectionResolution`
  - **4–5:** identifies and constructively addresses the customer's actual objection/uncertainty with useful grounded help;
  - **2–3:** addresses it only partially or misses an important concern/next step;
  - **0–1:** ignores, dismisses, argues with, or fails to address the objection;
  - factual violations remain primarily `factGrounding`/MUST_PASS concerns; do not double-penalize solely because a fact is unsupported.

- `ctaStageFit`
  - **4–5:** asks for the smallest useful next step appropriate to the current stage/missing information, or correctly uses no CTA when none is needed;
  - **2–3:** CTA is useful but generic, slightly early/late, or weakly matched to the stage;
  - **0–1:** CTA is clearly premature, irrelevant, contradictory to guard/stage, or improperly pushes checkout/action;
  - judge CTA timing/fit here, not general writing style.

Do not add `brandTone`, warmth, pressure, emoji, verbosity, or other score dimensions in this slice.

### 5. Implementation sequencing for attribution

Do not make the judge-model migration and rubric wording change one indistinguishable behavior change.

```text
Slice A
comparison contract V2
+ judge location/model separation
+ explicit/fail-closed Track C global / gemini-3.8-flash binding
+ 3.8 generation config with thinkingLevel HIGH
+ telemetry plumbing
+ automatic-review routing amendment
-> focused deterministic tests
-> optional authorized provider smoke

Slice B
rubric anchors for the three existing dimensions only
-> focused rubric/schema tests
-> no model/config change in this slice
```

The slices may live in the same feature branch, but Slice A must have independently reviewable verification before Slice B changes evaluator wording. Do not change generator behavior in either slice.

### 6. Candidate experiment discipline

Track C operating rule:

- each candidate experiment declares one primary hypothesis;
- normally change one material tuning axis;
- at most two material axes may change when they are genuinely inseparable;
- candidate axes remain the approved C3 set: prompt, playbook, objection handling, CTA/question sequencing, generator model, generation config;
- judge/rubric maintenance must not be bundled into a generator candidate experiment being compared for product quality.

No runtime enforcement or candidate-diff platform is added.

### 7. Human review routing

V2 automatic human review reasons are exactly:

- `NEAR_TIE` — current `SAME` disposition / score delta within the existing threshold;
- `UNEXPECTED_REGRESSION` — candidate is `WORSE`;
- `JUDGE_DISAGREEMENT` — current recommendation-vs-score disagreement rule fires.

Remove `CALIBRATION_SAMPLE` and optional `calibrationSample` from the normal V2 comparison contract.

Manual/owner-requested evaluator calibration remains allowed outside normal candidate routing and requires no new subsystem.

Do not change `NEAR_TIE_DELTA = 0.25` in this slice.

### 8. Real token and latency telemetry

The V2 judge-call result must preserve provider-returned usage metadata and measured latency for accepted and candidate separately.

Minimum shape:

```ts
interface TrackCJudgeCallResult {
  readonly assessment: SalesRubricAssessmentV2;
  readonly latencyMs: number;
  readonly tokenUsage: {
    readonly prompt?: number;
    readonly completion?: number;
    readonly thinking?: number;
    readonly total?: number;
  };
}
```

Rules:

- preserve `promptTokenCount`, `candidatesTokenCount`, and `totalTokenCount` using the existing parsing pattern;
- if Vertex returns `thoughtsTokenCount`, preserve it as `thinking`; do not estimate it;
- missing provider fields stay absent;
- accepted and candidate metrics remain separate;
- because both judge calls run in parallel, do not add their latencies and label the sum wall-clock time; if aggregate wall time is exposed, measure it around the parallel comparison separately;
- metrics must not contain credentials, raw auth material, or new customer data beyond existing evaluation evidence.

Metrics must be structurally separate from identity-bearing evidence, for example:

```ts
{
  contractVersion: "TRACK_C_QUALITY_JUDGE_V2",
  identity: { /* deterministic identity-bearing fields */ },
  metrics: {
    accepted: { latencyMs, tokenUsage },
    candidate: { latencyMs, tokenUsage },
    wallClockMs,
  },
}
```

The following must never include latency/token/wall-clock values:

- candidate or accepted identity/hash;
- judge provider/model/rubric/config identity hashes;
- replay/capture/facts/context/reply identity hashes;
- provenance/reproducibility fingerprints;
- `BETTER | SAME | WORSE` calculation;
- automatic human-review reason calculation.

Repeated evaluation of the same immutable inputs under the same pinned evaluator may produce different metrics without changing deterministic identity.

## Commands

Focused tests:

```bash
pnpm --filter @lana/worker exec vitest run \
  src/track-c-quality-judge.test.ts \
  src/vertex.test.ts
```

Worker typecheck:

```bash
pnpm --filter @lana/worker typecheck
```

Worker build:

```bash
pnpm --filter @lana/worker build
```

Worker lint/typecheck alias:

```bash
pnpm --filter @lana/worker lint
```

Final repository gate before implementation can be considered complete:

```bash
pnpm check
```

## Project Structure

Primary implementation surface:

```text
apps/worker/src/
├── vertex.ts                       # judge location/model/config/request/usage parsing
├── vertex.test.ts                  # judge endpoint/request/provider parsing tests
├── track-c-quality-judge.ts        # V2 comparison, exact judge binding, review routing, metrics
└── track-c-quality-judge.test.ts   # MUST_PASS, contract, identity, review, telemetry tests
```

Planning confirmed no pre-existing Track C composition/configuration site. The implementation therefore uses the owner-approved minimal offline-only `createTrackCQualityJudge(...)` composition at the Track C boundary rather than modifying runtime/generator composition.

Documentation updated the governing Track C human-review wording. No ADR was required because no new cross-cutting architecture decision was introduced beyond the owner-approved bounded offline composition clarification.

## Code Style

Follow current immutable/read-only TypeScript contracts and explicit identity binding. Prefer small typed additions over a generic telemetry framework.

Example:

```ts
export interface TrackCQualityComparisonResultV2 {
  readonly contractVersion: "TRACK_C_QUALITY_JUDGE_V2";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly identity: TrackCQualityIdentity;
  readonly metrics: TrackCQualityMetrics;
  // existing assessment/comparison semantics, minus calibration routing
}
```

## Testing Strategy

### Required unit/contract coverage

1. C1 MUST_PASS still rejects before descriptor or judge invocation.
2. V2 contract literal is `TRACK_C_QUALITY_JUDGE_V2`; no new result is emitted as V1 with V2 semantics.
3. `SalesRubricAssessmentV2` schema remains unchanged.
4. Track C rejects a descriptor whose provider/location/model is not exactly `VERTEX_AI / global / gemini-3.8-flash` before invoking either judge call.
5. The real Track C composition/configuration path explicitly binds `judgeLocation: "global"` and `judgeModelName: "gemini-3.8-flash"`.
6. Generator `location` / `modelName` remain unchanged when only `judgeLocation` / `judgeModelName` change.
7. The V2 judge endpoint uses the global Vertex endpoint while generator/proposal/draft/prelabel requests continue using the existing generator location.
8. Gemini 3.8 judge request preserves the existing JSON response schema and does not send/rely on `temperature`, `top_p`, or `top_k`.
9. Judge generation config pins `thinkingLevel: "HIGH"`.
10. Slice A can be verified with the existing rubric before Slice B changes rubric wording.
11. Rubric schema remains V2 with the same ten score fields; tests assert the `4–5 / 2–3 / 0–1` anchors for only `naturalness`, `objectionResolution`, and `ctaStageFit` are present in the judge instruction.
12. Accepted and candidate still use the same pinned judge descriptor/config.
13. Human review triggers only for near-tie, regression, or judge disagreement.
14. `CALIBRATION_SAMPLE` and normal `calibrationSample` input are absent from V2; manual evaluator calibration remains possible outside automatic routing.
15. Mock Vertex responses prove real `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount` when present, `totalTokenCount`, and measured latency are retained correctly.
16. Missing usage metadata does not fabricate token numbers.
17. Telemetry values are excluded from deterministic identity/fingerprint inputs and cannot affect disposition or review-reason selection.
18. Evaluation remains side-effect-free and cannot authorize outbound actions.

### Provider-backed verification

A provider-backed smoke check is allowed only in the already-authorized local/VPS/manual evaluation boundary using existing Vertex credentials. It is not a judge benchmark and does not compare multiple judge models.

If run, it should prove only that the exact pinned Vertex `global` endpoint request for `gemini-3.8-flash` with `thinkingLevel: "HIGH"` is accepted, returns schema-valid V2 rubric JSON, and exposes whatever usage metadata the provider actually returns.

Prefer doing this after Slice A and before Slice B so provider/API integration is not confounded with rubric wording changes.

Do not add Vertex credentials to GitHub Actions.

## Boundaries

### Always

- C1 deterministic MUST_PASS precedes quality scoring.
- Track C fails closed unless the exact pinned judge provider/location/model descriptor is present.
- Accepted and candidate are judged under the same exact judge configuration.
- Pin provider/location/model, rubric, generation config, facts/context, and reply identities.
- Pin judge location to `global`; do not change the generator/runtime Vertex location in this slice.
- Pin judge `thinkingLevel` to `HIGH` unless the owner explicitly amends this spec later.
- Keep runtime token/latency metrics outside deterministic identity and selection semantics.
- Treat model output as untrusted and validate it with the existing schema.
- Keep judge evaluation-only and side effects disabled.
- Keep generator/runtime configuration unchanged.
- Verify Slice A before changing rubric wording in Slice B.

### Ask first

- changing judge location away from `global`;
- changing judge `thinkingLevel` away from `HIGH`;
- changing `NEAR_TIE_DELTA`;
- adding/removing score dimensions;
- changing candidate-selection semantics beyond `BETTER | SAME | WORSE`;
- switching provider or adding credentials;
- changing generator model/runtime configuration;
- adding provider-backed CI jobs;
- changing database, behavior pointer, release, or runtime authority.

### Never in this slice

- multi-model judge benchmark/leaderboard;
- general evaluator or holdout platform;
- auto-tuning/tuning agent;
- automatic prompt mutation;
- automatic candidate promotion/deploy;
- context-caching work;
- evaluator dashboard;
- speculative V1↔V2 compatibility layer without a real consumer;
- putting latency/token measurements into deterministic identity/provenance hashes;
- weakening verified facts/provenance, PII/security, unsupported-claim checks, side-effect authorization, fail-closed behavior, or deterministic MUST_PASS.

## Success Criteria

The spec is satisfied when implementation evidence proves all of the following:

1. Track C comparison/evidence contract is explicitly `TRACK_C_QUALITY_JUDGE_V2`; `SalesRubricAssessmentV2` remains unchanged.
2. Actual V1 consumers/fixtures are identified and updated, or a compatibility need is evidenced before any adapter is added.
3. Track C judge identity is exactly `VERTEX_AI / global / gemini-3.8-flash` while generator location/model/config remain unchanged.
4. A missing/mismatched Track C judge descriptor fails before either accepted or candidate judge invocation; generic Vertex fallbacks cannot silently select the generator location/model for Track C.
5. The 3.8 judge request uses the global Vertex endpoint, strict structured-output schema, and `thinkingLevel: "HIGH"` without deprecated sampling controls.
6. Judge location/model/config migration has independently reviewable verification before rubric-anchor changes.
7. The rubric keeps the same ten V2 score dimensions and `0..5` range, with explicit `4–5 / 2–3 / 0–1` anchors only for `naturalness`, `objectionResolution`, and `ctaStageFit` and with their responsibilities kept distinct.
8. Human-review routing has exactly the three normal automatic reasons: near-tie, regression, and judge disagreement; calibration is manual/explicit evaluator maintenance.
9. Governing Track C documentation is amended to match the new automatic-review contract.
10. Each accepted/candidate judge call records actual latency and provider-returned token usage; absent metadata is not invented.
11. Token/latency/wall-clock metrics are excluded from candidate/judge/replay/provenance identity hashes and cannot alter comparison or review-routing decisions.
12. Candidate-experiment documentation states the one-hypothesis / one-primary-axis rule without adding mutation-analysis infrastructure.
13. Existing C1/C2 safety, identity, evaluation-only, and side-effect-disabled invariants remain intact.
14. Focused tests, worker typecheck/build/lint, and final repository `pnpm check` pass before implementation is declared complete.
15. No DB migration, runtime authority mutation, PREPROD deploy, provider-secret expansion, generator location/model change, or generator promotion occurs as part of this change.

Success criteria 1–5 and 7–15 are implemented and verified by the merged change and CI evidence. Criterion 6's planned ordering was not preserved because Slice A and Slice B landed together in PR #329; this sequencing deviation is explicitly recorded above and accepted as non-blocking rather than rewritten as if the original ordering occurred.

## Owner Decisions Locked

- Judge model: `gemini-3.8-flash`.
- Judge Vertex location: `global`.
- Judge thinking level: `HIGH`.
- Generator/runtime model and location: unchanged by this spec.
- No judge benchmark project.

The specification has no remaining owner decision. Implementation is closed on `main`; provider-backed smoke remains optional future verification only.
