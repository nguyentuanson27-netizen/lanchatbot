# Track C Quality Loop Improvement — TODO

**Status:** `COMPLETE / PR #329 MERGED`

Source: `tasks/track-c-quality-loop-improvement-plan.md`

- [x] **1. Impact inventory + tests**
  - [x] Confirmed there was no pre-existing Track C `VertexShadowModel` composition/configuration site; owner approved a minimal offline-only composition factory.
  - [x] Located the real `TRACK_C_QUALITY_JUDGE_V1` / `runTrackCQualityComparison(...)` consumers and fixtures; they were internal Track C consumers only.
  - [x] Added focused coverage for V2 contract, exact `VERTEX_AI / global / gemini-3.8-flash` descriptor, `HIGH` request config, calibration removal, metrics preservation, and metrics/identity isolation.
  - [x] Proved judge `global` binding does not alter the generator/runtime Vertex location or model.
  - [x] No persisted/external V1 consumer required compatibility; no V1↔V2 adapter was added.

- [x] **2. Slice A — judge 3.8 global / V2 / telemetry / review routing**
  - [x] Added narrow `judgeLocation` + `judgeModelName` support; generator paths remain on existing `location` / `modelName`.
  - [x] Bound Track C explicitly to `VERTEX_AI / global / gemini-3.8-flash` and fail closed before judge invocation on provider/location/model mismatch.
  - [x] Only the V2 judge endpoint uses `global`; `VERTEX_LOCATION` and generator/runtime location were not changed.
  - [x] V2 judge uses structured output + `thinkingLevel: HIGH` without `temperature`, `top_p`, or `top_k`.
  - [x] Actual prompt/completion/thinking/total usage is preserved when returned, with measured per-call latency.
  - [x] Emits `TRACK_C_QUALITY_JUDGE_V2`; normal calibration input/reason removed; threshold and BETTER/SAME/WORSE behavior retained.
  - [x] Metrics are kept in a separate non-identity block.
  - [x] Governing Track C human-review wording was updated to match V2 while preserving manual calibration maintenance.
  - [x] Final focused verification is green. Planned Slice-A-before-Slice-B sequencing was not preserved in git; PR #329 landed both slices together and this deviation is recorded as non-blocking.

- [x] **3. Slice B — rubric anchors only**
  - [x] Added `4–5 / 2–3 / 0–1` anchors for `naturalness`, `objectionResolution`, `ctaStageFit`.
  - [x] Kept the three dimensions non-overlapping as specified.
  - [x] Kept the existing ten score fields and holistic `overall`; no new dimension/formula was added.
  - [x] Focused rubric/schema coverage is green.

- [x] **4. Verification + review gate**
  - [x] Focused worker tests were added and passed in the implementation workflow.
  - [x] Worker typecheck/build/lint were reported green by the implementation workflow.
  - [x] GitHub CI run #800 passed repository `pnpm check` on PR #329 head `37b7fd6c3418adfd58edd0d729cf894fbff1d377`.
  - [ ] **Optional / not run:** provider-backed smoke for exact Vertex `global` + 3.8 + HIGH request. No provider-backed CI job or credential expansion was added.
  - [x] Final review/DoD check found no generator location/model/runtime/DB/deploy/authority/secret-scope change.

**Closure:** implementation is complete on `main` via PR #329 / merge commit `c2125b3904f3d9b0b609715de95285a6bf61debc`. The only recorded deviation is that Slice A and Slice B landed together instead of as separately reviewable changes; no follow-up code change is required for that sequencing deviation.

**Anti-bloat:** no judge benchmark, evaluator platform, dashboard, tuning agent, caching/concurrency framework, broad Vertex refactor, speculative V1↔V2 compatibility layer, metrics database, new judge-location env/config subsystem, or generator-model/location change was added.
