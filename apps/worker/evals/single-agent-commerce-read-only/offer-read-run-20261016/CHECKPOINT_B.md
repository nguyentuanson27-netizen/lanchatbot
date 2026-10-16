# Phase B — bounded offer-read replay, 2026-10-16

**STOP sau sáu ca ưu tiên: 2 USABLE / 2 NEEDS_EDIT / 2 fallback.** Có4 SEND_ELIGIBLE; cả hai fallback là semantic FAIL. Theo [scope trước generation](SCOPE.md), giữ18B1+7stateful NOT_RUN. Coverage6/31, không phải full31 hoặc Phase B acceptance. [Sáu hội thoại thực nhận](CONVERSATIONS.md), [primary cả lượt](PRIMARY_REVIEW.md), [finding/nháp bị chặn](DIAGNOSTICS.md).

## Provenance và fixed identity

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake `1fbad99d35d85d87600fa73040625e5a241e82ce`; verified executable correction `4ceaefa71acdf44a7fe3bda94cf10d503faa0ed6`.
- Clean runtime bRunSourceSha `10040a9d99718a305cdd9d380e519c1e6e150101`, captured after scope/inputs and credential-launcher representation/output fixes, before any model generation. No executable/config change during collection; runtime SHA was not written into frozen source.
- Raw savepoint `9bf1eeda6ed779373556b5767e6696ef904cf7af`, before scored primary `2ece05f2`, then diagnostics. Historical sources/results/labels remain unchanged.
- Owner Vertex AI/global `gemini-3.5-flash-lite`, version same alias, High; candidateCount1, text/plain, max8192, thinkingHIGH/includeThoughtsfalse, omitted temperature/topP defaults, timeout90s/retry0.
- Verifier Codex ChatGPT-login `gpt-6.1-sol`, version same alias, High; CLI0.159.2/binarySHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, bounded Responses relay/tools[]/none/storefalse, timeout90s, one upstream request per generation/retry0.
- Owner prompt `74c8102ef88e970fca18e84f5d186406a4d21ac5d27bafc383c6476b85394b43`; verifier `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- B1 tools `23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8`; composed tools `486f4134f7015c3281e335e425d62c62bd5a63dfd376fd277a866c917a3c859b`.
- Exact priority corpus `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267`; source-config `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`.
- Static fallback C3_A_NONPROTECTED_V2, “Phần này em chưa trả lời được, chị nhé.”, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`.

[FROZEN_INPUTS.json](FROZEN_INPUTS.json) includes complete model settings, active/canonical/stateful corpus hashes, prompt bytes, spec/plan/todo Git blobs and the external credential-launcher hash. Aliases do not expose immutable provider model build identities. One repetition and this subjective coding-agent review do not prove stable improvement, human acceptance or model superiority. A remains OWNER_BYPASS; no A2/A3 or A qualification is claimed.

## Actual outcomes and coverage

| Ca cũ | Actual terminal | Whole-outcome review |
| --- | --- | --- |
| 1 — sân khấu/độ kín | FAIL fallback | FALLBACK_OR_NO_SEND |
| 6 — giá SD375 | PASS; áo lẻ929k/cả bộ1.065k | USABLE |
| 7 — lo ren nhiều | PASS; quảng cáo nhiều, tư vấn chưa thực dụng | NEEDS_EDIT |
| 9 — ngoài trời lâu/dễ nóng | FAIL fallback | FALLBACK_OR_NO_SEND |
| 11 — chân váy/POS fault | PASS; giữ vải/dáng, không bịa giá/tồn | USABLE as partial-source control |
| 15 — quen đồ trơn | PASS; chưa chọn rõ mua món nào | NEEDS_EDIT |

Registered24B1+7stateful, N1, max120invocations (96+24). Actual6B1/19generation invocations under first-range max24; no repetition/replacement. [COVERAGE.json](COVERAGE.json) retains all31/25held and reasons. NOT_RUN is a coverage limit, not a provider failure. No new test DB was created because the stateful condition was not reached. Private checkout/cart/handoff/delivery and remaining18B1 are not measured in this run.

Two USABLE outcomes do not establish completion of a sales journey: one is a simple price lookup, the other a deliberately partial-source control. Primary assesses actual terminal replies, not the rejected drafts or verifier PASS alone. Supporting scores do not impose keyword counts, mandatory CTA or rejection of relevant fact references/ordinary styling judgments. Human acceptance is null. Both concern replies need better purchase decisions and natural phrasing; the two blocked replies still extend product prose into unverified use results.

## Accounting and measurements

[AUDIT.json](AUDIT.json), [REQUEST_ACCOUNTING.json](REQUEST_ACCOUNTING.json), [METRICS.json](METRICS.json), [RAW_HASHES.json](RAW_HASHES.json).

- 13owner+6verifier = **19unique generation invocations / 19HTTP200 requests**. Request accounting complete, automatic retry0, transport/parse errors0/timeouts0. One owner auth request separately reported; Codex auth-network count unexposed. Preflight failures below did not enter a generation attempt and remain separate.
- All6generated finals invoked the verifier;6exact final/trusted bindings;4eligible texts equal the exact verified drafts.13native owner dispatch hashes/bytes match requests;6owner product-content/fact projections match original verifier context.11raw/source/preflight files match disk/Git hashes.0observed evaluator-label leaks, including nested JSON keys, IDs and evaluator prose; sourceMode is not model input.
- One final-only NONE/tools[] request, no unexpected tool response in this run. Search -> one read -> final is observed for SD375; this does not prove provider conformance across runs.
- Usage **67,303input / 6,764output tokens**, complete19/19; cost not exposed/no estimate. B1 embedding calls0; one separate source-check embedding. Other source counters are the instrumentation returned by the runner, not a complete network-call inventory.
- Among the measured6: fallback2/6=33.3%, handoff0/no-send0. Both fallback reasons FAIL. Rates are not extrapolated to all31.

Nearest-rank latency, seconds; generation/build/source startup are separated:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation | 13 | 1.924 | 5.141 |
| Verifier generation | 6 | 4.852 | 10.165 |
| Added verification path | 6 | 5.592 | 10.916 |
| Whole B1 turn | 6 | 11.099 | 18.491 |

Added verification uses result.verificationLatencyMs and includes readback/caller overhead; whole-turn uses attempt.elapsedMs and excludes startup/build. No paired latency experiment or cost estimate.

## Commands actually run and preflight corrections

Current worker/protected/eval/typecheck/build/lint checks are reused from [verified executable4ceaefa7](../offer-read-fix-20261016/IMPLEMENTATION.md), not claimed rerun during this model-only task. No runtime/prompt/shared-package changes. Runner canonical worker builds actually ran in source-check and dispatch. No full-repository pnpm check, new COD/bank composition or remote CI PASS claim.

```text
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:6 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-first-20261016
node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-primary-view-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-preserve-20261016.mjs --held
node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-primary-review-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-run-audit-20261016.mjs
```

Final commands exit0: CONFIG_READY_CONNECTIONS_UNVERIFIED, stateful PREFLIGHT_PASS, SOURCE_ADAPTERS_READ_BACK, six recorded/DISPATCH_RANGE_COMPLETE_REVIEW_PENDING, raw11preserved before primary2/2/2, accounting/bindings/projection verified. All preflights/source-check made0owner/verifier generations. No remaining-range or stateful generation command ran.

Two earlier credential-launcher preflights failed before the runner: initial assumptions about service-account/googleApi JSON did not match the existing deployed extracted {email,privateKey,region} file. Read-only key-shape inspection identified it; the launcher verifies configured project and account project suffix and presents the SAME account/key to the unchanged eval adapter in native JSON form. Another config preflight exited0 but nested Windows child stdout was not captured; explicit capture, as already used by source-session.py, corrected the launcher. That uncaptured exit is not used as PASS evidence. Every correction was refrozen before generation; none substituted account/provider/model or retried a generation. Frozen metadata retains these failures/unknowns. Credential contents never enter source/evidence and temporary credential files are removed at child exit.

Source access uses the existing [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) and read-only source-session route. PostgreSQL live sources are read-only. Current source readback still returns attributes null; no registry/index/policy publication or new ETA mapping. No serving mutation, customer/private send, POS order/payment/hold/notification, merge or deploy.

Repository executable/semantic-role/layer/store/gate delta for this run:0; previous read-tool correction remains+25TS/+2adapter lines. The external task-local credential launcher is hashed and only adapts the existing credential representation/output handling; it does not select data, compose replies, alter generation requests or retry policy. No post-result patch or automatic next round.

**Recommendation: STOP sales/live acceptance.** The new option read worked for the price case; natural sales decisions and unsupported use-result claims remain. Source checkout BLOCKED, A OWNER_BYPASS; preserve this run without continuing the held outcomes.
