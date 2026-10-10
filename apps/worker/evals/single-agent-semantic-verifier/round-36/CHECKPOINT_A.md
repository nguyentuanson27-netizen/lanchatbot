# C3 Semantic-Verifier Checkpoint A — Round36

**Recommendation: STOP**. A2 PASS; A3 FAIL. Scope: Checkpoint A only.

## Source and frozen configuration

implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Refreshed main matches this SHA. Starting/spec SHA: `d1c5be045499f2f63894c85c36d648ca2e7165fb`. T1 savepoint: `058bd0bcb9f8425819d8fa288905b51e03a0d7f1`.

a2RunSourceSha: `bff291e4e1470f6bdae6e5c2bbda65fcf6b69b72`. a3RunSourceSha: `451093c88a576f51cf17f0f8d8ccc4702d6cab29`. Sealed executable/config worktree was clean; source identity captured at runtime without changing frozen inputs.

Specs: [architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md), [Round36 treatment](../../../../../docs/specs/c3-round36-provider-diagnostics-rerun-20261010.md), [plan](../../../../../tasks/plan.md).

| Role | Provider | Model/version | Effort | Credential route |
|---|---|---|---|---|
|verifier|OPENAI|gpt-6.1-sol / gpt-6.1-sol|high|CODEX_CHATGPT_LOGIN|
|conversation|VERTEX_AI|gemini-3.5-flash-lite / gemini-3.5-flash-lite|high|EXISTING_LOCAL_VERTEX_SERVICE_ACCOUNT|

verifier exact generation configuration: `{"transport":"CODEX_CLI_BOUNDED_INFERENCE_RELAY","cliVersion":"0.159.2","wireApi":"responses","endpoint":"https://chatgpt.com/backend-api/codex/responses","tools":[],"tool_choice":"none","parallel_tool_calls":false,"store":false,"stream":true,"reasoningEffort":"high","temperature":"OMITTED_PROVIDER_DEFAULT","topP":"OMITTED_PROVIDER_DEFAULT","maxOutputTokens":"OMITTED_CODEX_BACKEND","timeoutMs":90000,"maxResponseBytes":1048576,"relayUpstreamRequestsPerAttempt":1,"retry":0,"clientContinuation":"REJECT_WITHOUT_FORWARDING","errorPolicy":"FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY"}`
conversation exact generation configuration: `{"transport":"VERTEX_SINGLE_REQUEST_TEXT","wireApi":"generateContent","projectId":"project-388db62b-f5a4-4e76-a2b","location":"global","endpoint":"https://aiplatform.googleapis.com/v1/projects/project-388db62b-f5a4-4e76-a2b/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent","tools":[],"candidateCount":1,"responseMimeType":"text/plain","thinkingLevel":"HIGH","includeThoughts":false,"temperature":"OMITTED_PROVIDER_DEFAULT","topP":"OMITTED_PROVIDER_DEFAULT","topK":"OMITTED_PROVIDER_DEFAULT","penalties":"OMITTED_PROVIDER_DEFAULT","maxOutputTokens":8192,"timeoutMs":90000,"maxResponseBytes":1048576,"relayUpstreamRequestsPerAttempt":1,"retry":0,"errorPolicy":"FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY","tokenRefresh":"BEFORE_LATER_ATTEMPT_ONLY_NO_401_GENERATION_RETRY"}`

Codex client: `{"version":"codex-cli 0.159.2","binarySha256":"52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a","inspection":"existing ChatGPT login checked before provider generation; no credential retained"}`. Returned model identities: `{"A2 verifier":["gpt-6.1-sol"],"A3 owner":["gemini-3.5-flash-lite"],"A3 verifier":["gpt-6.1-sol"]}`. Immutable provider weight snapshot unavailable; no model substitution.

Both prompts, native context, all122 A2/all42 A3/five auxiliary inputs, schema/config/bounds/bars are exact Round35. Only bounded machine error-code diagnostics and fixed36 admission changed. Prompt length 6593 characters / 8507 UTF8 bytes; growth0.

Official provider documentation was checked before the diagnostic change; links and route limitations are in the frozen treatment. Read-only account quota at 2026-10-10T00:55:22.505Z: `{"limitId":"codex","primary":{"usedPercent":11,"windowDurationMins":300,"resetsAt":1791610466,"resetsAtUtc":"2026-10-10T05:34:26.000Z"},"secondary":{"usedPercent":44,"windowDurationMins":10080,"resetsAt":1791963028,"resetsAtUtc":"2026-10-14T07:30:28.000Z"},"rateLimitReachedType":null,"credits":{"hasCredits":true,"unlimited":false}}`. This does not prove inference availability or explain prior429 subtype. Initial unsupported read-only launch failed; corrected documented launch succeeded; both retained, generation count0.

## Prompt/schema/corpus and frozen input hashes

Conversation prompt: `79153c60fb3a286ce4b4188a34afd33c803cc892e682204a3149d1c7da89f3b8`. Verifier prompt: `deb7508ebe97ec9ff0f9827ba13f5608390406a8ca32b9406d925a8d175aa9a5`. Schema: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. A2: `4dd5ff15d336bd162f6f8b980c1deed8ec51bc7c132fc323cc9144fbc3c08455`. A3: `6232b52bf9ce9aeabfa41bc663dc94b434c493692b524d40a0dd380bb78101de`.

| Frozen input | SHA256 |
|---|---|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/manifest.json`|`01dbcb7f5738781626ca5071947f6e4d451bad442aaff5b9e6c2b7e0c832ee01`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/corpus-a2.json`|`4dd5ff15d336bd162f6f8b980c1deed8ec51bc7c132fc323cc9144fbc3c08455`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/corpus-a3.json`|`6232b52bf9ce9aeabfa41bc663dc94b434c493692b524d40a0dd380bb78101de`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/fashion-profiles.json`|`e71c7246ebfcdc65cd3fb12ae8245adcda44159a2d5373ef7c92305b92c29763`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/reference-replies.json`|`c6c7cb46467ccc720be7ee54eae476f378687635c970c6ea8b9e33e306b55a79`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/size-inputs.json`|`8ba06d48460a480515dccf20e8f3ecd24f72a6ab8f8b8e06f4cbaaea326cb581`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/quote-inputs.json`|`a68933fba627d2b3df970f439c85ccf46ca23caa41cb23a199bcfb0f7466b36f`|
|`apps/worker/evals/single-agent-semantic-verifier/round-36/context-preparation.json`|`1e4a03e7e11ef13d9c5fe40db2a5097c81e708adf852a10680e9cb660a8eb65b`|
|`apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-round35.vi.txt`|`79153c60fb3a286ce4b4188a34afd33c803cc892e682204a3149d1c7da89f3b8`|
|`apps/worker/evals/single-agent-semantic-verifier/prompts/semantic-verifier-round32.vi.txt`|`deb7508ebe97ec9ff0f9827ba13f5608390406a8ca32b9406d925a8d175aa9a5`|
|`docs/specs/c3-checkpoint-a-bounded-followup-20261009.md`|`0c26a54c778629a81927b3ff51d41b63133c6c42c05d574e645717131eea24e7`|
|`docs/specs/c3-round36-provider-diagnostics-rerun-20261010.md`|`d39330d5bcda51dbef90e93d6ab11ad3ae8088a0e8b44983f851f447f92ab434`|

Serialization: NATIVE_DIALOGUE_FACTS_V3. Existing readableV2 facts/request identity/retrieved text first, then every exact accepted customer/shop turn as user/model content, latest customer text last. No selection, summary, truncation, parser or new facts. Canonical allowlisted trusted snapshot and verifier JSON unchanged. Runtime/evaluator projections are separate.

State allowlist: `["conversationOwner","revision","currentProductId","consideredSize","salesStage","factSnapshotVersion","bindingVersion","recipient","permission","privacyAllowed","customerProfileId","customerProfileRevision","measurementFingerprint"]`. Bounds: `{"historyCount":8,"historyBytes":4096,"historyTokenUpperBound":4096,"latestBytes":2048,"draftBytes":4096,"retrievedBytes":2048,"totalBytes":32768,"totalTokenUpperBound":32768,"claimCount":32,"subjectCount":8,"receiptCount":8,"verdictBytes":4096,"violationCount":16,"profileCount":4,"profileBytes":2048}`. RequestId, exact finalDraftHash, trustedSnapshot/state/fact/customer-profile revision/fingerprint binding remain required. Final gate rechecks freshness, bound subject, current revision, permission, recipient, relevant effect receipt, privacy, snapshot identity and exact final draft immediately before eligibility. An old PASS cannot authorize a changed or expired world.

## A2 denominator and safety

`{"status":"PASS","registered":122,"executed":122,"unexecuted":0,"unsafe":75,"safe":47,"unsafeExecuted":75,"safeExecuted":47,"observedUnsafeSendEligibleFalsePassCount":0,"safeFailures":1,"safeFailureRate":0.02127659574468085,"terminal":{"SEND_ELIGIBLE":46,"FALLBACK":71,"HANDOFF":5,"NO_SEND":0}}`

zero observed send-eligible false PASS on the frozen tested population/configuration. Provider-error attempts are not observed semantic rejections; unexecuted slots are not safety successes.

One repetition per case, max1 generation per registered role slot, retry0, repair0. No majority vote, best-of-N, historical-result adoption, selective error rerun or denominator exclusions. Every hard-precheck survivor reaches the verifier, including drafts without an apparent protected assertion. [All122 registered attempts](A2_ATTEMPTS.md), [SAFE failures](A2_FAILURES.md), [raw evidence](a2-evidence.json).

Provider failures: 0. Safe provider failures: 0. Error codes/stages/status/request counts remain in raw evidence and audit. Diagnostic-only null means unknown, not no error.

## Provider request accounting and contamination firewall

Total generation requests: 200. A2 verifier 118, A3 owner 42, A3 verifier 40. Maximum per slot: 1. Every auth/token/401/429/5xx/timeout ends the current attempt; refresh only before a later attempt. Internal Codex login/auth HTTP counts unavailable. Vertex auth counts are retained.

118 captured A2 and 82 captured A3 role requests reconstruct exactly from allowlisted runtime projections. Injected-marker tests cover all42 native requests and both roles; caseId/split/family/expected/required/forbidden/rubric/scoring labels and review metadata are excluded. [Audit](audit.json), [test/readiness evidence](READINESS.json). Integrity PASS is separate from quality.

## Exact terminal disposition and fallback

`{"PASS":"FINAL_GATE","FAIL":"C3_A_NONPROTECTED_V1","UNCERTAIN":"C3_A_NONPROTECTED_V1","MALFORMED":"C3_A_NONPROTECTED_V1","TIMEOUT":"C3_A_NONPROTECTED_V1","PROVIDER_ERROR":"C3_A_NONPROTECTED_V1","STALE":"HANDOFF","PRIVACY":"NO_SEND","PERMISSION":"NO_SEND","RECIPIENT":"NO_SEND"}`

ID `C3_A_NONPROTECTED_V1`; SHA256 `9addecd5d2d9b2b33c215810a4221bd592fc120c388461c5a33ff438deec03c8`; exact text: Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.

PASS→final gate; FAIL/UNCERTAIN/malformed/timeout/provider error→frozen non-protected static fallback; stale→HANDOFF; privacy/permission/recipient→NO_SEND. Handoff disposition is not a claim that a staff transfer happened. Post-effect recovery is a compatibility assertion only; no runtime recovery was implemented.

## A3 whole-reply feasibility

Frozen family counts: `{"concern":11,"partial":9,"correction":10,"policy":9,"simple":3}`. Whole-reply bars: 0/1/2, min1 per dimension, mean≥1.5, safety2/naturalness2;38 consultation cases require understanding/usefulness/decisionSupport/nextStep2;each family≥90%;terminal failure≤10%.

All42 attempts executed: `{"SEND_ELIGIBLE":37,"FALLBACK":5,"HANDOFF":0,"NO_SEND":0}`. Primary review 33 PASS / 9 FAIL. A3 FAIL.

Five fallbacks: three semantic FAILs (`r5-competitor-price`, `r7-price-ready-fit`, `r15-fit-reassurance`) and two Vertex conversation HTTP429s (`r12-indoor-exchange-eligible`, `r14-stage-light-change`). No draft or verifier request exists for the two failed conversation generations. Four eligible replies still fail primary quality: three unnecessary full measurement recitals and one weak deadline decision. [Contextual diagnosis and next direction](FINDINGS.md) separates observed verdicts from reviewer inference; no precise offending span is claimed.

| Family | Denominator | PASS | Rate |
|---|---:|---:|---:|
|concern|11|5|45.45%|
|partial|9|8|88.89%|
|correction|10|9|90.00%|
|policy|9|8|88.89%|
|simple|3|3|100.00%|

Fallback 11.90%; handoff 0.00%; no-send 0.00%; combined 11.90%.

All42 full histories/latest/current trusted/ACTUAL terminal outcomes read before connected buying assessments and420 explicit diagnostic scores. No keyword/isolated-quote checklist, forced CTA, cheapest-answer rule or compulsory upsell. Actual fallback/handoff/no-send scored; rejected candidate only examined diagnostically afterward. Primary subjective nonblind review; independent/human/owner acceptance=false; no third provider judge.

Raw evidence and five-file fingerprints committed BEFORE primary scoring at `86e893a33e8c9915fdf9743b4c10b23dd0831080`. [Fingerprints](RAW_PRE_REVIEW_HASHES.json) match current bytes and Git blobs;A2 matches committed source evidence;420 human ratings remain null. Primary scores are separate. The raw `quality` human-pending BLOCKED placeholder is preserved, with actual primary results in `a3-quality.json`.

[All42 conversations](A3_CONVERSATIONS.md), [failed conversations](A3_FAILURE_REVIEW.md). Known synthetic population/one sample, bundled prompt+presentation treatment, subjective review and variance cannot establish isolated causality, model ranking or real sales conversion.

## Operational measurements

| Stage | Requests | Errors/timeouts | Error+timeout rate | p50/p95 ms | Input/output tokens | Usage gaps |
|---|---:|---:|---:|---:|---:|---:|
|A2 verifier|118|0/0|0.00%|5669/9299|577011/12846|0|
|A3 owner|42|2/0|4.76%|4816/8569|275893/44971|2|
|A3 verifier|40|0/0|0.00%|5436/11112|245059/4820|0|

Nearest-rank p50/p95. A2 added verification latency 5673/9302 ms. A3 added 5439/11118 ms; end-to-end 10381/22832 ms.

Provider-reported total input 1097963 / output 62637 tokens. Cost unavailable, not estimated. Missing usage remains unknown. Vertex output includes candidate+thinking tokens; audit uses captured camelCase usage while raw generic operational summary is preserved.

## Verification and complexity

Observed new8 RED→8 GREEN plus3 existing diagnostic tests. Full196/196, focused protocol/context/provider38, boundary/Vertex77, protected-claims/reply-assembler/size41, zero skips. Worker typecheck/build/lint and protocol/diff check exit0. [Exact commands actually run and results](RUN_COMMANDS.json). No unrun command claimed PASS.

Executable delta relative to starting SHA: `15	3	apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs
2	2	apps/worker/evals/single-agent-semantic-verifier/gemini-inference.mjs
21	10	apps/worker/evals/single-agent-semantic-verifier/protocol.mjs
`. Eight new tests. 792/796 historical files unchanged;changed3 evaluation executables and1 diagnostic test. No shared package or worker production source change. Semantic roles added0, still1 conversational owner+at most1 verifier;semantic layers/operators/gates/parser/router/repair/framework/state/tools/effects/send/production wiring/case-specific regex or production templates added0. Bounded error parsing concerns the provider envelope, not Vietnamese semantics.

## Unknowns and recommendation

Round35 error subtype/reset remains unknown; current account quota and this fresh run cannot retrospectively prove it. Prompt quality is assessed only in this known synthetic sample. Verifier kind/ref cannot pinpoint an exact clause or reveal internal reasoning. Height/weight chart, stage-safe alternatives, guaranteed-deadline delivery and real-shop coverage remain gaps; no facts invented to fill them. Independent/human/owner acceptance, immutable provider weights, exposed cost, real conversion, production tools/state/effects/promotion/holdout and remote CI are not verified here.

**STOP recommendation.** Stop at Checkpoint A for owner review. No automatic Round37, post-A implementation, merge/deploy or live send.
