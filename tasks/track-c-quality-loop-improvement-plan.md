# Track C Quality Loop Improvement — Implementation Plan

**Status:** `READY_FOR_BUILD`

**Source spec:** `docs/current/architecture-program/TRACK_C_QUALITY_LOOP_IMPROVEMENT_SPEC_20260906.md`

**Implementation principle:** minimum change only. Reuse the current Vertex client, Track C quality adapter, B3 replay, C1 MUST_PASS, existing identity machinery, and current test structure. Do not create a new evaluator platform, telemetry framework, compatibility layer, provider abstraction, or runtime subsystem unless a concrete existing consumer proves it is required.

## Scope

Implement the approved Track C evaluator maintenance only:

- judge: `VERTEX_AI / gemini-3.8-flash` with `thinkingLevel: HIGH`;
- generator/runtime model unchanged;
- comparison contract `TRACK_C_QUALITY_JUDGE_V2`;
- automatic review reasons limited to `NEAR_TIE`, `UNEXPECTED_REGRESSION`, `JUDGE_DISAGREEMENT`;
- real judge token/latency metrics kept outside deterministic identity;
- clearer existing rubric anchors for `naturalness`, `objectionResolution`, `ctaStageFit`;
- canonical Track C wording updated only where needed.

## Task 1 — Impact inventory + tests first

Before changing production code, locate the actual Track C composition/configuration site and every real consumer/fixture of `TRACK_C_QUALITY_JUDGE_V1` / `runTrackCQualityComparison(...)`.

Primary files to inspect:

- `apps/worker/src/track-c-quality-judge.ts`
- `apps/worker/src/track-c-quality-judge.test.ts`
- `apps/worker/src/vertex.ts`
- `apps/worker/src/vertex.test.ts`
- the concrete worker composition/config file that instantiates `VertexShadowModel` for this evaluation path

Add/update focused tests first for the approved behavior:

- V2 contract literal;
- wrong/missing Track C judge descriptor fails before either judge call;
- explicit `gemini-3.8-flash` judge binding does not alter generator `modelName`;
- judge request uses `thinkingLevel: HIGH` and no `temperature`, `top_p`, or `top_k`;
- `CALIBRATION_SAMPLE` / `calibrationSample` absent from V2 normal routing;
- token/latency metrics retained but excluded from identity/comparison/review decisions.

**Stop condition:** if a real persisted/external V1 consumer exists, do not invent compatibility immediately. Record the consumer and choose the smallest compatibility change before implementation. If V1 is internal only, update it directly and add no adapter.

**Acceptance:** blast radius is evidence-based and focused tests fail for the missing V2 behavior before implementation.

## Task 2 — Slice A: V2 judge plumbing, exact model binding, metrics, review routing

### `apps/worker/src/vertex.ts`

Make only the judge-specific additions:

- add optional `judgeModelName` to `VertexShadowModelOptions` for generic backward compatibility;
- keep generator/proposal/draft/prelabel paths on `modelName`;
- make `judgeSalesReplyV2Descriptor()` and the V2 judge endpoint use the resolved judge model;
- pin the Track C judge request config to `gemini-3.8-flash` behavior: strict existing response schema, `thinkingLevel: HIGH`, no deprecated sampling controls;
- extend the existing usage-metadata parser narrowly to retain `thoughtsTokenCount` when present;
- return a small typed V2 judge-call result containing `assessment`, `latencyMs`, and provider-returned token usage. Do not create a generic metrics framework.

### `apps/worker/src/track-c-quality-judge.ts`

- bump comparison/evidence contract to `TRACK_C_QUALITY_JUDGE_V2`;
- remove `calibrationSample` and `CALIBRATION_SAMPLE` from the normal V2 contract;
- after C1 MUST_PASS and before judge calls, require descriptor exactly `VERTEX_AI / gemini-3.8-flash`; fail closed otherwise;
- keep accepted/candidate judge calls in the existing `Promise.all` flow;
- keep `NEAR_TIE_DELTA = 0.25` and existing BETTER/SAME/WORSE semantics;
- add a separate non-identity `metrics` block for accepted/candidate latency/token usage and optional measured comparison wall-clock time;
- do not include metrics in any hash, provenance identity, disposition, or review-reason calculation.

### Concrete composition/config file discovered in Task 1

Set `judgeModelName: "gemini-3.8-flash"` only at the real Track C composition boundary. Do not add a new configuration subsystem.

### Canonical documentation

Update only the governing Track C human-review sentence in `docs/current/architecture-program/POST_DF_SIMPLIFIED_PLAN_PROPOSAL_20260825.md` so normal automatic routing matches V2; preserve manual evaluator calibration as an explicit maintenance action.

**Acceptance:** Slice A focused tests pass with the existing rubric text, generator identity/config is unchanged, wrong judge identity fails before scoring, and metrics cannot affect deterministic evidence.

## Task 3 — Slice B: rubric anchors only

In `apps/worker/src/vertex.ts`, change only `SALES_RUBRIC_V2_SYSTEM_INSTRUCTION` for the three existing dimensions:

- common bands: `4–5` high, `2–3` middle, `0–1` low;
- `naturalness`: conversational delivery only;
- `objectionResolution`: objection handling only, without duplicating fact-grounding penalties;
- `ctaStageFit`: CTA timing/fit only.

Keep the ten-field `SalesRubricAssessmentV2` schema and `overall` semantics unchanged. Add focused assertions in `apps/worker/src/vertex.test.ts` that the three anchors exist and no new score dimension is introduced.

**Acceptance:** only rubric wording/hash changes in Slice B; no model/config/runtime change is bundled with it.

## Task 4 — Verification + final review

Run in order:

```bash
pnpm --filter @lana/worker exec vitest run \
  src/track-c-quality-judge.test.ts \
  src/vertex.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm check
```

If authorized Vertex credentials are already available in the existing local/VPS/manual evaluation environment, perform one provider-backed smoke after Slice A and before Slice B to prove the exact `gemini-3.8-flash` + `HIGH` structured request is accepted. Do not add credentials or a provider-backed job to GitHub Actions. If the smoke is not run, report that limitation explicitly rather than claiming live-provider verification.

Final review against the repository Definition of Done: correctness first, then security, architecture, simplicity, and performance. Confirm no DB migration, deploy, behavior-pointer change, runtime authority mutation, generator promotion, or new secret scope occurred.

## Explicit non-goals / anti-over-engineering gate

Do **not** add judge benchmarking, a leaderboard, holdout/evaluator platform, tuning agent, dashboard, context caching, accepted-score cache, concurrency framework, broad Vertex refactor, new provider interface, speculative V1↔V2 adapter, DB storage for metrics, or generator-model changes in this work.

If implementation appears to require any of those, stop and surface the concrete blocker before expanding scope.
