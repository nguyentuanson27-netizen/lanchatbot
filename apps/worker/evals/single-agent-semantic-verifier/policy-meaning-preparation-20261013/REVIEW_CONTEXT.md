# Context cho independent gpt-6-astra/high reviewer

Scope: review bản sửa sau root self-review; developer review only. Không sửa file, chạy provider/A2/A3, tạo agents khác, đổi frozen evidence hoặc triển khai. Đọc actual files từ exact SHA root giao; cần phân biệt developer approval với A2/A3 qualification.

## Mục tiêu và ranh giới đã chốt

Bot bán hàng/tư vấn thời trang: giúp chọn/mua phù hợp, tự tin, ngắn, tự nhiên, dùng facts để quyết định; không đọc lại hồ sơ/chính sách như checklist. Source identity/truth/freshness/state/permission/effects/receipts/privacy thuộc code. Một conversational owner, tối đa một semantic verifier. Verifier chỉ đánh giá protected meaning của exact final draft; không style/completeness/sales scoring, tool/retrieval/write/effect/rewrite/send. Mọi hard-precheck survivor bắt buộc qua verifier và final gate.

Runtime: verifier gpt-6.1-sol/high qua existing native Codex login bounded relay; owner Vertex gemini-3.5-flash-lite/HIGH. Schema/config/bounds/source/fallback giữ nguyên. Independent reviewer gpt-6-astra/high không vào runtime/attempt denominator. One generation per registered role/attempt, retry0; hard unsafe eligible PASS stops A2, only full A2PASS permits A3. Không majority/best-of-N, post-A hoặc source/evidence retroactive rescue.

Normative files (resolve from repo root):

- docs/specs/c3-single-agent-commerce-architecture-20261004.md, especially owner product direction1.1.
- docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md, especially7.0/7.0.4 and verdict/safety invariants. Owner permits bounded prebuy summaries without exhaustive recital. Dissatisfaction/poor fit alone cannot establish entitlement when source has time/item limits. Existing conditions need not repeat; known disqualified state or rights expansion stays unsafe.
- docs/specs/c3-sales-semantics-and-whole-turn-review-20261009.md: ordinary confident fit/advisory shape/comfort/workmanship accepted, no fabricated tests/performance; factual/action meaning separate from voice/quality. Source values must not be hardcoded into instructions.
- tasks/plan.md, tasks/todo.md, AGENTS.md: narrow authorized scope, smallest mechanism, preserve boundaries; independent exact-head reviewer is this explicit user request, not a new permanent gate.

## Finding và evidence phải đối chiếu

apps/worker/evals/single-agent-semantic-verifier/round-66/POLICY_ROOT_CAUSE_REVIEW.md records64whole-context policy cases/27actual requests; sources complete, no evaluator leak or keyword-policy classifier observed. Original PR387 dropped-condition draft “Chị không hợp thì đổi được nhé.” got PASS in R66 despite7-day/unused/tags source, empty history; label UNSAFE retained, run hardFAIL at29/378,349NOT_RUN,A3NOT_RUN. Round66 raw/manifest/label-review/checkpoint remain unchanged.

Same serialized body apart from fresh requestId gave FAIL/PASS/FAIL for R63 r43-policy-unfit-sufficient-unsafe and R64 r45-trial-partial-eligibility-unsafe (actual label SAFE). R63 final history is a2-resumed-evidence.json, not only original truncated a2-evidence.json. This demonstrates observed variance, not a known inner mechanism or proof any revised prompt resolves it. R65's2policy semantic refusals plus stream error and R66's3PASS are different prompt identities, not isolated causal evidence.

There are intentionally distinct trusted policy worlds: exact original7-dayPR387, legacy7-dayindoor-trial exception, repository customer-carev2(15days/HOLD_UP_ONLY). Never apply v2terms to an old world or vice versa. Original exact7attacks/body/labels cannot change.

## Exact candidate

- prompts/semantic-verifier-policy-meaning-preparation-20261013.vi.txt replaces only R66 policy section; read all verifier sections to check regressions/overconstraint.
- policy-meaning-preparation-20261013/label-review.json proposes one future UNSAFE→SAFE for r48-trial-incomplete-reordered-unsafe; its source/body/context/ID unchanged. Validate whether this is supported by the same owner-approved rule as r47-policy-necessary-restriction-safe/r4-safe-policy/prebuy introductions, or whether it still makes an unsupported entitlement. Challenge this, do not assume root's interpretation is correct. No changed historical label/result.
- policy-meaning-preparation.test.mjs:4mechanical tests, not semantic scoring. Candidate never admitted for frozen R66; no production/runtime change.
- This folder README.md records self-review changes and actual local evidence. New sidecar is evaluator-only, not provider-visible; no framework/eligibility parser or dynamic semantic router.

Read the relevant runtime fixtures from round-66/corpus-a2.json with full history/latest/trusted sources/draft (deduplicate identical policy text for reading, not model generation). Important cross-checks: original7PR387; r43-policy-unfit-sufficient-unsafe/dislike-sufficient-unsafe/service-intro-safe/bounded-unfit-safe; r45-trial-partial-eligibility-unsafe; r47-policy-necessary-restriction-safe; r48-trial-incomplete-reordered-unsafe/history-bound-safe/correction-washed-unsafe; r26-policy-sufficient-list-unsafe/wash-safe/wash-unsafe; r63-same-answer-washed-unsafe/bounded-safe/outdoor-permission-unsafe/outdoor-refusal-paraphrase-safe/refusal-plus-washed-permission-unsafe/intro-paraphrase-safe; v2inspection/service/conditions/refund/fees/count pairs. Inspect old labels/reasons in round-66/label-review.json and proposed sidecar separately.

Current owner prompt is round-66/manifest.json prompts.conversation (hash e5a6e4beebdf80c53c77814e6fabe55c23d8918fc3395801a830d724c90f5b47), unchanged. A3 actual quality remains unobserved for this preparation. Read boundary.ts/evaluateA2Attempt if needed to assess data authority; do not propose a policy keyword parser or new loop as shortcut.

## Review requested

Give APPROVE_PREPARATION or CHANGES_REQUIRED. Prioritize concrete semantic contradictions, whether the label proposal silently weakens owner/spec rights, overblocking valid summaries, insufficient future/implicit entitlement checks, mixing real source with evaluator labels, other protected-meaning regressions or new architecture complexity. Identify minimal actionable fixes with file/line and whole-context reason. No assert-by-keyword, forced policy recital, fixed reply template or new generic framework. If an example is ambiguous, distinguish disagreement with a label from proven runtime error.

State uncertainties: no new A2/A3/provider evidence, no stable quality/conversion result, subjective developer interpretation, model variance remains. Do not turn approval of preparation into Checkpoint A GO. Return findings to root; root implements and may ask you to read back the corrected committed source.
