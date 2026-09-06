# Track C Quality Loop Improvement Spec — Judge 3.8, Rubric, Review, Telemetry

**Status:** `DRAFT / OWNER REVIEW REQUIRED`

**Scope:** Track C offline quality-evaluation loop only. This document does not authorize runtime mutation, generator-model promotion, database changes, provider-credential changes, deployment, or PREPROD/production traffic changes.

## Objective

Improve the existing Track C quality loop without turning it into a general evaluator platform.

The change has five bounded goals:

1. Change the Track C quality judge to Vertex AI `gemini-3.8-flash` while leaving the generator/runtime model unchanged.
2. Clarify the existing rubric for `naturalness`, `objectionResolution`, and `ctaStageFit` without adding new score dimensions.
3. Establish a process rule that each candidate experiment changes only a small number of material tuning variables so quality deltas remain attributable.
4. Restrict automatic human-review routing to near-ties, regressions, and judge disagreement.
5. Record real judge token usage and latency instead of estimating them.

This stays inside the adopted Track C principle: reuse the existing `judgeSalesReplyV2(...)`, B3 replay, MUST_PASS, and provenance/identity machinery; do not build a second judge/evaluator platform.

## Current Context

Current `main` has:

- `TrackCQualityJudgePort` wrapping `judgeSalesReplyV2(...)`;
- deterministic C1 MUST_PASS asserted before either quality-judge call;
- accepted and candidate replies scored with the same pinned judge descriptor;
- `BETTER | SAME | WORSE` derived from `overall` delta with `NEAR_TIE_DELTA = 0.25`;
- human-review reasons currently including `CALIBRATION_SAMPLE`, `NEAR_TIE`, `UNEXPECTED_REGRESSION`, and `JUDGE_DISAGREEMENT`;
- the Vertex V2 judge using the same configured `modelName` as other Vertex generation paths;
- the V2 judge generation config currently including `temperature: 0.1`, `maxOutputTokens: 1024`, JSON MIME type, and the existing response schema;
- the V2 rubric already scoring `naturalness`, `objectionResolution`, and `ctaStageFit` but without explicit score anchors for those three dimensions;
- generic Vertex response parsing already able to read provider usage metadata into prompt/completion/total token counts, while the Track C judge result currently returns only the assessment and therefore does not preserve judge token/latency evidence.

## Source / API Constraints

Gemini 3.8 Flash uses model ID `gemini-3.8-flash`, is GA, supports structured outputs, and supports thinking levels `LOW`, `MEDIUM`, and `HIGH`.

For Gemini 3.8 Flash, deprecated sampling parameters such as `temperature`, `top_p`, and `top_k` must not be relied upon; the judge configuration must instead pin the model, structured response schema, and a supported thinking level. The current judge-only `temperature: 0.1` therefore cannot simply be carried forward as the determinism control for the new judge.

## Assumptions

1. **Generator remains unchanged.** This spec changes only the offline Track C judge. A stronger generator is a future candidate experiment, not Track C infrastructure work.
2. **Same provider.** Judge remains on existing Vertex AI/service-account plumbing; no new provider integration or credentials are introduced.
3. **Separate judge model configuration.** The judge needs its own model selection so changing the judge does not change the generator.
4. **No judge benchmark project.** We will not compare multiple judge models, build a calibration leaderboard, create a holdout platform, or add a multi-provider evaluator framework.
5. **No new rubric dimensions.** Only wording/anchors for the three existing dimensions named above may change.
6. **Candidate-change discipline is a workflow rule, not a new automated diff engine.** No candidate mutation classifier/platform is introduced.
7. **Thinking level must be explicitly pinned.** Recommended initial value is `MEDIUM` because this is an offline quality judge rather than a latency-critical customer reply. Owner may choose `LOW` before implementation if cost/latency is preferred.

## Tech Stack

- TypeScript / Node.js 22+
- pnpm 10.12.4 workspace
- Vitest 3.2.4
- Vertex AI `generateContent`
- Existing `@lana/contracts` `SalesRubricAssessmentV2` schema
- Existing Track C C1/C1.1/C2 quality and replay adapters

No new dependency is required by this spec.

## Proposed Design

### 1. Judge model separation

Extend the existing Vertex model configuration with a judge-specific model identity while preserving backward compatibility for existing construction sites.

Preferred shape:

```ts
export interface VertexShadowModelOptions {
  readonly modelName: string;
  readonly judgeModelName?: string;
  // existing fields unchanged
}

const judgeModelName = options.judgeModelName ?? options.modelName;
```

Only `judgeSalesReplyV2Descriptor()` and the actual judge request path use `judgeModelName`.

All generator/proposal/draft/prelabel paths continue using `modelName` unchanged.

The Track C configured judge identity must resolve to:

```text
gemini-3.8-flash
```

### 2. Gemini 3.8 judge generation config

Keep the current response schema and JSON-only contract, but remove judge-only `temperature` for the 3.8 judge and pin a supported thinking level.

Target form:

```ts
const SALES_RUBRIC_V2_GENERATION_CONFIG = {
  maxOutputTokens: 1_024,
  responseMimeType: "application/json",
  responseSchema: SALES_RUBRIC_V2_RESPONSE_SCHEMA,
  thinkingConfig: {
    thinkingLevel: "MEDIUM",
  },
} as const;
```

`MEDIUM` is the default recommendation for this draft spec; implementation must not begin until the owner accepts `MEDIUM` or replaces it with `LOW`.

The generation-config hash remains part of judge identity, so this model/config change produces a new pinned judge configuration rather than silently reusing the old identity.

### 3. Clarify existing rubric only

Keep the existing score schema unchanged. Add concise anchors to the existing judge system instruction for:

- `naturalness`
  - high: natural Vietnamese Messenger wording, direct, non-robotic, non-repetitive, appropriate to the customer's state;
  - middle: understandable and acceptable but somewhat formulaic/generic;
  - low: awkward, robotic, repetitive, unnecessarily pressuring, or mismatched to the conversation.

- `objectionResolution`
  - high: addresses the customer's actual objection/uncertainty constructively with grounded, useful help and no unsupported reassurance or pressure;
  - middle: partially addresses the objection but misses an important concern or next step;
  - low: ignores, argues with, dismisses, pressures, or invents facts to overcome the objection.

- `ctaStageFit`
  - high: asks for the smallest useful next step appropriate to the current stage and missing information, or correctly uses no CTA when none is needed;
  - middle: useful but generic/slightly early/weakly matched CTA;
  - low: premature checkout/request, repeated question, pressure, or CTA that conflicts with the current stage/guard outcome.

Do not add `brandTone`, warmth, pressure, emoji, verbosity, or other new dimensions in this slice.

### 4. Candidate experiment discipline

Document the following Track C operating rule:

- each candidate experiment declares one primary hypothesis;
- normally change one material tuning axis;
- at most two material axes may change in a single candidate when they are inseparable;
- candidate axes are the already-approved C3 set: prompt, playbook, objection handling, CTA/question sequencing, generator model, generation config;
- changing the judge/rubric is evaluator maintenance and must not be bundled into a generator candidate experiment being compared for product quality.

No runtime enforcement or candidate-diff platform is added.

### 5. Human review routing

Change the Track C comparison contract so automatic human review is requested only for:

- `NEAR_TIE` — current `SAME` disposition / score delta within the existing threshold;
- `UNEXPECTED_REGRESSION` — candidate is `WORSE`;
- `JUDGE_DISAGREEMENT` — recommendation direction conflicts with score direction or the current disagreement rule fires.

Remove `CALIBRATION_SAMPLE` as an automatic review reason and remove the optional `calibrationSample` input from the normal comparison path.

Do not change `NEAR_TIE_DELTA = 0.25` in this slice.

### 6. Real token and latency telemetry

The judge call must preserve provider-returned usage metadata and measured latency for both accepted and candidate calls.

Minimum evidence per judge call:

```ts
{
  latencyMs: number;
  tokenUsage: {
    prompt?: number;
    completion?: number;
    thinking?: number;
    total?: number;
  };
}
```

- `prompt`, `completion`, and `total` come from the existing Vertex usage-metadata parsing pattern.
- If Vertex returns `thoughtsTokenCount`, preserve it as `thinking`; do not estimate it.
- Missing provider usage fields remain absent; do not synthesize numbers.
- Record accepted and candidate call metrics separately.
- Because the two judge calls run in parallel, do not report `accepted.latencyMs + candidate.latencyMs` as wall-clock latency. If aggregate wall time is exposed, measure it around the parallel comparison separately.

Telemetry remains evaluation evidence only and must not contain credentials, raw auth material, or new customer data beyond what the existing evaluation result already carries.

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
├── vertex.ts                       # Vertex judge model/config/request/usage parsing
├── vertex.test.ts                  # judge request + provider parsing tests
├── track-c-quality-judge.ts        # comparison, review routing, metrics evidence
└── track-c-quality-judge.test.ts   # C1-before-judge, identity, review, telemetry tests
```

One existing composition/configuration site that creates `VertexShadowModel` will also need to set `judgeModelName: "gemini-3.8-flash"`; locate the real call site during `/plan` rather than inventing a new config subsystem.

Documentation may update the existing Track C section/source-of-truth, but no ADR is required unless implementation discovers a genuinely new architecture decision.

## Code Style

Follow current immutable/read-only TypeScript contracts and explicit identity binding.

Example:

```ts
export interface TrackCJudgeCallResult {
  readonly assessment: SalesRubricAssessmentV2;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<Record<string, number>>;
}
```

Prefer small typed additions over a generic telemetry framework.

## Testing Strategy

### Required unit/contract coverage

1. C1 MUST_PASS still rejects before descriptor or judge invocation.
2. Judge descriptor reports `VERTEX_AI` + `gemini-3.8-flash` when judge-specific model configuration is set.
3. Generator `modelName` remains unchanged when only `judgeModelName` changes.
4. Gemini 3.8 judge request preserves the existing JSON response schema and does not send/rely on `temperature`.
5. Judge generation config pins the owner-approved `thinkingLevel`.
6. Rubric schema remains V2 with the same ten score fields; only the three target dimension instructions are clarified.
7. Accepted and candidate still use the same pinned judge descriptor/config.
8. Human review triggers only for near-tie, regression, or judge disagreement.
9. `CALIBRATION_SAMPLE` no longer appears in the normal comparison contract.
10. Mock Vertex responses prove real `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount` when present, `totalTokenCount`, and measured latency are retained correctly.
11. Missing usage metadata does not cause fabricated token numbers.
12. Evaluation remains side-effect-free and cannot authorize outbound actions.

### Provider-backed verification

A provider-backed smoke check is allowed only in the already-authorized local/VPS/manual evaluation boundary using existing Vertex credentials. It is not a judge benchmark and does not compare multiple judge models.

The smoke check should prove only that the exact pinned `gemini-3.8-flash` request is accepted, returns schema-valid V2 JSON, and exposes the expected usage metadata available from the provider.

Do not add Vertex credentials to GitHub Actions.

## Boundaries

### Always

- C1 deterministic MUST_PASS precedes quality scoring.
- Accepted and candidate are judged under the same exact judge configuration.
- Pin provider/model, rubric, generation config, facts/context, and reply identities as existing Track C evidence requires.
- Treat model output as untrusted and validate with the existing schema.
- Keep Track C judge evaluation-only and side-effects disabled.
- Keep generator/runtime configuration unchanged in this slice.

### Ask first

- changing `NEAR_TIE_DELTA`;
- adding/removing score dimensions;
- changing candidate-selection semantics beyond current `BETTER | SAME | WORSE`;
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
- weakening verified facts/provenance, PII/security, unsupported-claim checks, side-effect authorization, fail-closed behavior, or deterministic MUST_PASS.

## Success Criteria

The spec is satisfied when implementation evidence proves all of the following:

1. Track C judge identity is explicitly `VERTEX_AI / gemini-3.8-flash` while generator identity/config remains unchanged.
2. Judge-specific model configuration is separate enough that future generator candidates do not implicitly change the judge and judge maintenance does not implicitly change the generator.
3. The 3.8 judge request uses the existing strict structured-output schema and a pinned supported thinking level without relying on deprecated `temperature/top_p/top_k` controls.
4. The response schema still contains exactly the existing V2 score dimensions; `naturalness`, `objectionResolution`, and `ctaStageFit` have clearer scoring instructions and no extra style dimensions are introduced.
5. Human-review routing has exactly the three normal reasons: near-tie, regression, and judge disagreement.
6. Each accepted/candidate judge call records actual latency and provider-returned token usage; no token cost is inferred when provider metadata is absent.
7. Candidate-experiment documentation states the one-hypothesis / one-primary-axis rule without adding automated mutation-analysis infrastructure.
8. Existing C1/C2 safety, identity, evaluation-only, and side-effect-disabled invariants remain intact.
9. Focused tests, worker typecheck/build/lint, and the final repository `pnpm check` pass before implementation is declared complete.
10. No DB migration, runtime authority mutation, PREPROD deploy, provider-secret expansion, or generator promotion occurs as part of this change.

## Open Question Requiring Owner Confirmation Before `/build`

**Judge thinking level:** pin `MEDIUM` (recommended for offline quality evaluation) or `LOW` (lower token/latency cost).

All other requirements in this draft are considered specified by the owner's request.
