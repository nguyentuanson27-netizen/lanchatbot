# Track C Quality Loop Improvement — TODO

**Status:** `READY_FOR_BUILD`

Source: `tasks/track-c-quality-loop-improvement-plan.md`

- [ ] **1. Impact inventory + red tests**
  - [ ] Locate the real Track C `VertexShadowModel` composition/configuration site.
  - [ ] Locate all real `TRACK_C_QUALITY_JUDGE_V1` / `runTrackCQualityComparison(...)` consumers and fixtures.
  - [ ] Add failing focused tests for V2 contract, exact 3.8 descriptor, `HIGH` request config, calibration removal, metrics preservation, and metrics/identity isolation.
  - [ ] If a real persisted/external V1 consumer exists, stop and document the minimum compatibility requirement; otherwise add no adapter.

- [ ] **2. Slice A — judge 3.8 / V2 / telemetry / review routing**
  - [ ] Add narrow `judgeModelName` support; keep generator paths on existing `modelName`.
  - [ ] Bind Track C explicitly to `VERTEX_AI / gemini-3.8-flash` and fail closed before judge invocation on mismatch.
  - [ ] Use structured output + `thinkingLevel: HIGH`; remove `temperature`, `top_p`, `top_k` from the V2 judge request.
  - [ ] Preserve actual prompt/completion/thinking/total usage when returned and measured per-call latency.
  - [ ] Emit `TRACK_C_QUALITY_JUDGE_V2`; remove normal calibration input/reason; retain current threshold and BETTER/SAME/WORSE behavior.
  - [ ] Keep metrics in a separate non-identity block.
  - [ ] Update only the governing Track C human-review wording required by the approved amendment.
  - [ ] Get focused Slice A tests green before changing rubric wording.

- [ ] **3. Slice B — rubric anchors only**
  - [ ] Add `4–5 / 2–3 / 0–1` anchors for `naturalness`, `objectionResolution`, `ctaStageFit`.
  - [ ] Keep the three dimensions non-overlapping as specified.
  - [ ] Keep the existing ten score fields and holistic `overall`; add no new dimension/formula.
  - [ ] Get focused rubric/schema tests green.

- [ ] **4. Verification + review gate**
  - [ ] Run focused worker Vitest files.
  - [ ] Run worker typecheck, build, and lint.
  - [ ] Run `pnpm check`.
  - [ ] If already authorized credentials/environment are available, run one provider smoke for exact 3.8 + HIGH request; otherwise record that live-provider smoke was not run.
  - [ ] Review against DoD and confirm no generator/runtime/DB/deploy/authority/secret-scope change.

**Anti-bloat:** no judge benchmark, evaluator platform, dashboard, tuning agent, caching/concurrency framework, broad Vertex refactor, speculative V1↔V2 compatibility layer, metrics database, or generator-model change.
