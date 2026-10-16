# Phase B — một lượt sau sửa catalog prose, 2026-10-16

**STOP sau sáu ca ưu tiên.** Có2SEND_ELIGIBLE/4FALLBACK; primary cả lượt **0USABLE/2NEEDS_EDIT/4FALLBACK_OR_NO_SEND**. Theo [scope trước generation](SCOPE.md), giữ18B1+7statefulNOT_RUN: coverage6/31, không phải kết quả full24B1+7stateful. [Toàn bộ sáu hội thoại](CONVERSATIONS.md), [primary](PRIMARY_REVIEW.md), [bốn fallback/nháp và finding](DIAGNOSTICS.md). Human acceptance chưa đo; A vẫn OWNER_BYPASS, không cấp A PASS/C/live acceptance.

## Provenance và frozen identity

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake: `77118d8aea11dad0601f07abf092b6ffb105e8f9`; code fix `679c53432338254c29226524749dadc09b8cb1fb`.
- Clean runtime bRunSourceSha: `f6c4f36828f0489bbae8ea1c8a503367556c5971`; no executable/config/prompt change during collection.
- Raw `74597c6dc65355dd5da574a532a63e563b830987` before primary `b85867080ef871b26769d80a9e4e8dbbce08c0f2`, then diagnosis. Historical evidence/labels stay unchanged.
- Owner Vertex AI/global `gemini-3.5-flash-lite`, version same alias, High; candidateCount1/text/plain/max8192/thinkingHIGH/includeThoughtsfalse, temperature/topP omitted defaults, timeout90s/retry0.
- Verifier Codex ChatGPT-login `gpt-6.1-sol`, version same alias, High; CLI0.159.2, Responses relay/tools[]/none/storefalse, timeout90s, one upstream request per generation/retry0. CLI binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`.
- Owner prompt SHA256 `e3157cf28eb75ea6020799e0e3e32efaeac0b036ef69c27518e3b8fe1ff41f75`; verifier unchanged `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`; schema unchanged `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Priority corpus SHA256 `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267`; source-config disk SHA256 `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`.

[FROZEN_INPUTS.json](FROZEN_INPUTS.json) includes full settings, other tool/canonical/stateful hashes and spec/intake-plan/todo Git blobs. The run's committed scope/current plan are bound by f6c4f368. Runtime SHA is not written back into the frozen source. Backend immutable model build identities are not exposed by alias strings. Fallback `C3_A_NONPROTECTED_V2`, exact text “Phần này em chưa trả lời được, chị nhé.”, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2` unchanged.

## Actual outcomes

| Original case | Actual terminal | Primary |
| --- | --- | --- |
| 1 — stage opacity | FAIL fallback, unsupported claim that stage light exposes inside | FALLBACK_OR_NO_SEND |
| 6 — SD375 price | BUDGET fallback; attempted AO read under final-only NONE/tools[] | FALLBACK_OR_NO_SEND |
| 7 — lace concern | PASS eligible, still advertising-like | NEEDS_EDIT |
| 9 — outdoor heat | FAIL fallback, still guarantees comfort outside | FALLBACK_OR_NO_SEND |
| 11 — skirt/source fault control | FAIL fallback, unavailable treated as sale-by-full-set | FALLBACK_OR_NO_SEND |
| 15 — plain-style concern | PASS eligible, offers component styling but leaves the decision to customer | NEEDS_EDIT |

No attempt replaced/retried. Registered24B1+7ordered stateful, N1/max120generations (96+24); measured6B1, first-range maximum24generations, actual19. [COVERAGE.json](COVERAGE.json) retains all31 and25HELD_BY_PRIORITY_REVIEW. They are coverage limitations, not failed provider attempts. State/private checkout/handoff/delivery paths NOT_RUN,0new test databases. No source checkout completion inferred.

Compared with the preceding same-six run2USABLE/1NEEDS_EDIT/3fallback, this run is worse on actual terminal usability; ca15's component direction is a partial improvement. One repetition cannot establish stability or attribute causality to one prompt/projection change. Scores are subjective coding-agent review of whole actual outcomes before rejected drafts/verdict details, non-independent, not keyword counts. Relevant detail/upsell allowed; no mandatory CTA or rejected-draft quality rescue.

## Accounting, audit and measurements

[AUDIT.json](AUDIT.json), [REQUEST_ACCOUNTING.json](REQUEST_ACCOUNTING.json), [METRICS.json](METRICS.json), [RAW_HASHES.json](RAW_HASHES.json).

- **14owner+5verifier=19unique generation invocations/19HTTP requests**, all200, automatic retry0; transport/parse errors0/timeouts0. Separately one native contract violation under NONE: parsed tool output blocked without execution; not a successful final. Two measured final-only requests, one violation. Provider-side echo/underlying violation cause unknown.
- Five generated final drafts all verified,5exact draft/trusted bindings,2eligible texts equal exact verified drafts. Case6 has no final and therefore no verifier; no semantic-verifier skip classifier.
- 14owner dispatch body hashes/bytes agree with captured requests.14catalog separation projections verified; for5finals exact catalog content/provenance and typed facts match original verifier context.11raw/source/preflight disk/Git hashes verified.0observed evaluator-label leaks, including nested JSON/key/IDs/evaluator-prose checks. No sourceMode input to models.
- Usage **61,339input/7,687output tokens**,19/19complete: owner41,454/6,926; verifier19,885/761. Cost not exposed/no estimate. One owner auth request recorded; Codex auth-network count unexposed. Each verifier relay has clientRequests1/rejectedClientRequests0, no continuation forwarded.
- Fallback4/6=66.7% among measured, comprising3semantic FAIL/1BUDGET; handoff0/no-send0. Not a full-population rate. Two source embeddings separately:1source-check+1B1search; B1 counters catalog19/POS11/policy0/embedding1.

Nearest-rank latency in seconds:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation | 14 | 1.833 | 4.019 |
| Verifier generation | 5 | 7.817 | 9.617 |
| Added verification path | 5 | 8.545 | 11.012 |
| Whole B1 turn | 6 | 11.206 | 22.807 |

Use generation.latencyMs/result.verificationLatencyMs/attempt.elapsedMs. Build/source startup excluded from whole-turn. Added verification includes caller overhead, not a paired experiment. The no-final case is absent from verifier latency with denominator explicit. No variance/model-superiority/human-acceptance claim.

## Commands actually run and limits

No code changed since [491eval/49focused/167worker-boundary/21protected and typecheck/build/lint checks](../prose-boundary-fix-20261016/IMPLEMENTATION.md); those checks are reused, not rerun in this model-only task. Earlier full-worker/COD/bank controls for unchanged `.ts` also reused. The runner's canonical build really ran in both source-check and B1 dispatch. No shared-package source change or full-repository pnpm check/remote CI PASS claim.

```text
git fetch origin main
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-prose-run-stateful-preflight-unused-f6c4f368-20261016 COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-prose-run-source-f6c4f368-20261016
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:6 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-prose-run-first-f6c4f368-20261016
node C:/Users/nguye/AppData/Local/Temp/c3-prose-run-primary-view-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-prose-run-preserve-20261016.mjs --held
node C:/Users/nguye/AppData/Local/Temp/c3-prose-run-primary-review-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-prose-run-audit-20261016.mjs
```

All exited0: main unchanged; CONFIG_READY_CONNECTIONS_UNVERIFIED; PREFLIGHT_PASS; SOURCE_ADAPTERS_READ_BACK; DISPATCH_RANGE_COMPLETE_REVIEW_PENDING/6recorded; terminal/catalog-only primary view;11raw exact preserved; primary0/2/4; accounting/bindings/projection verified. Preflight/source checks made0owner/verifier generations; one separate embedding in source-check. Credential route C3_VERTEX_CREDENTIAL_FILE/Codex login retained, no secret contents logged. No remaining-range/stateful dispatch command ran.

Offline closeout checks PASS:7frozen hashes unchanged;4primary blobs equal b8586708;0post-run executable/config changes; two previous run folders unchanged;9root JSON files parse/16local Markdown links resolve; `git diff --check 77118d8a` passed. These do not replace provider or human quality evidence.

Source reads used the existing [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md)/approved read-only route. Current returned product attrs remain null; authoritative destination mapping not supplied by this task. No registry/index/policy publication, serving mutation, real order/payment/hold/notification, customer send, merge or deploy; sendEnabled=false. No cleanup DB needed because stateful never dispatched.

Structural/semantic complexity delta in this run:0executable/prompt/schema/roles/layers/stores/gates changes. Historical root-fix delta remains adapter+4/-2, owner+79bytes and one owner-only field; not repeated here. No post-result patch, parser/regex, template growth, repair/reverify or automatic additional round.

**Recommendation: STOP sales/live acceptance.** Contract relocation is exercised correctly but not enough to fix owner advice or native final-only behavior. Offer/default semantics, source-unknown handling and useful purchase decisions still need investigation; source checkout BLOCKED, A OWNER_BYPASS. Preserve this negative result; no automatic next run.
