# Phase B — one customer-outcome run

**STOP sales/live acceptance; source checkout BLOCKED.** Đủ31/31, N1: B1 **14USABLE / 7NEEDS_EDIT / 3FALLBACK_OR_NO_SEND**; stateful **1USABLE ownership-only / 1NEEDS_EDIT / 1UNUSABLE / 4FALLBACK_OR_NO_SEND**. Tổng **15/8/1/7**. Không có đơn mua hoàn tất. [31hội thoại](CONVERSATIONS.md), [whole-turn review](PRIMARY_REVIEW.md), [finding/root causes/hướng xử lý](FINDINGS.md).

Lỗi quan trọng nhất: khách sửa mông96, state lưu76; model thử sửa lại96 bị stale-evidence rejection, vẫn nói đã ghi nhận và verifier PASS. Đây là lỗi accepted-state/receipt/ACK, không phải thiếu thông tin hoặc chỉ giọng văn. Không gọi observed incorrect state/ACK này là bằng chứng semantic safety hoặc coi PASS là hoàn thành đúng yêu cầu.

## Provenance và scope

- implementationBaseSha/refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake `5a158cdf0e559c00e6c7cb69bd2180a03e306cd3`.
- Clean runtime bRunSourceSha **`38beb4b0f2ee8cc9ea01ff86f79edae6ba70b592`** cho cả7stateful rồi24B1. Frozen before provider results; không ghi SHA ngược vào source hoặc đổi executable/config trong collection.
- Raw **`4ea4a2d4da3542335884f1404ac1bc4dfdaec923`** trước primary **`10d47b0509c54f15e2b5a7d12bb4b701120ded99`** trước diagnosis. Không replacement/reseed/canary/retry, không lấy historical outcome bù. [Frozen inputs](FROZEN_INPUTS.json) giữ exact config/prompt/schema/corpus/tool hashes và spec/plan blobs.
- Gemini3.5 Flash Lite High / Vertex global owner; GPT6.1 Sol High / existing Codex0.159.2 login relay verifier. Config như frozen manifest; no substitution, generation retry0, max1upstream request/invocation. Actual model-version telemetry tương ứng hai tên trên.
- Scope B1–B3 candidate, A **OWNER_BYPASS**, không A2/A3 mới hoặc A PASS. One owner/max one verifier; code giữ authority/state/effect/privacy. Source PG/Redis/Qdrant read-only, writable disposable PG DB đã drop; delivery capture-only. Không merge/deploy, source/index/policy publication, Meta/Pancake/POS mutation hoặc PhaseC.

## Actual terminal và complete denominator

| Population | Eligible | Static fallback | Handoff | No-send |
| --- | --- | --- | --- | --- |
| B1,24ca | 21 | 3 | 0 | 0 |
| Stateful,7lượt | 2 | 2 | 2 | 1 |
| Tổng31 | 23 | 5 | 2 | 1 |

Fallback16,13%; handoff6,45%; no-send3,23%; combined non-eligible25,81%. Một handoff đúng yêu cầu gặp người là USABLE ownership-only trong primary, nên primary có7FALLBACK_OR_NO_SEND chứ không phải8. B1 chỉ eligibility; không actual send. Stateful có2eligible exact captures,2static fallback captures và3outcome không tin; không có employee service.

Hai stateful đầu thiếu màuBE trong effect call, code trả SELECTION_UNAVAILABLE; final-only requests vẫn trả calls và bị BUDGET chặn. Đến lượt hỏi tiền mới có be/L×2, quote978.100đ. Không cứu điểm hai lượt đầu bằng thành công muộn. Profile correction sai như trên. Private checkout lỗi CART_ETA_REGION_UNRESOLVED; confirm sau handoff giữ authority fence.

B1 fallback: sân khấu/độ kín và Khánh Trang/không tồn tại bị chặn đúng vì claim vượt nguồn; policy-v3 là HTTP200 nhưng finishReason UNKNOWN, không phải semantic policy failure. [Chi tiết](FINDINGS.md).

| Nhóm B1,3ca/nhóm | USABLE | NEEDS_EDIT | Fallback/no-send |
| --- | --- | --- | --- |
| BUYING_CONCERN | 1 | 2 | 0 |
| CHANGED_OCCASION | 0 | 2 | 1 |
| COMPONENT_PRICE_STOCK | 3 | 0 | 0 |
| CURRENT_POLICY | 2 | 0 | 1 |
| PARTIAL_SOURCE | 0 | 3 | 0 |
| PRICE | 3 | 0 | 0 |
| SEARCH_READ | 2 | 0 | 1 |
| USED_POLICY | 3 | 0 | 0 |

Giá/tồn và các ca đã mặc/cắt tem/giặt trả đúng trong N1; lời tư vấn khi đổi hoàn cảnh và lúc thiếu nguồn vẫn yếu. Đây là mô tả population hiện tại, không phải ngưỡng mới hoặc chứng minh ổn định.

## Accounting, firewall và operational measurements

[Audit](AUDIT.json):42raw/preparation hashes khớp disk/Git;13frozen input/runtime files và6spec/plan reference blobs;63owner dispatch body hashes;25exact verifier bindings;23eligible texts khớp final draft; tất cả25generated finals đều được verify/gate. Zero observed evaluator/private-fixture leaks trong actual captured requests. Private checkout/confirm không gọi model; không classifier skip-verifier. Không có independent provider-side echo; evidence là prepared/dispatched hashes và adapter capture checks.

**88invocations/88upstream generation HTTP200** trên max120:63owner+25verifier; request-count accounting88/88, mỗi invocation đúng1request, retry0. Một owner completion error `OWNER_FINISH_REASON/UNKNOWN`; HTTP transport/auth error0, timeout0, verifier error0. Error rate overall1/88=1,14%; owner1/63=1,59%. Không loại failure khỏi denominator. [Request accounting](REQUEST_ACCOUNTING.json).

| Measurement | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation | 63 | 1,967ms | 5,463ms |
| Verifier generation | 25 | 6,054ms | 8,795ms |
| B1 whole turn | 24 | 11,651ms | 17,103ms |
| Stateful whole turn | 7 | 24,818ms | 40,521ms |
| B1 verification interval, gồm readback/gate | 23 | 6,638ms | 9,282ms |
| Stateful verification interval, gồm readback/gate | 2 | 9,964ms | 12,293ms |

Đo trong local evaluation/remote source+disposable PG harness; không live SLA. Verification interval không phải paired causal E2E delta. Input354,841/output29,619tokens, usage88/88; cost không expose, không ước lượng. Source-check1embedding call, B1 thêm1embedding call, stateful0; embedding không nằm trong88conversation generations. [Metrics](METRICS.json).

Sáu final-only requests/hai native calls vi phạm NONE; adapter/runtime chặn thực thi vượt budget. Max owner wire31.427/32.768bytes,0bound failure; không chứng minh headroom ổn định hoặc nguyên nhân NONE. Không cắt signatures/tăng bound.

## Verification và commands thực sự chạy

Runtime/prompt/model/corpus không sửa trong request chạy này. Reuse [unchanged-runtime implementation checks](../customer-outcome-fix-20261017/IMPLEMENTATION.md): worker1,816/contracts223/Node491PASS+2existing optionalSKIP, build/typecheck/lint exit0, COD25/25+bank25/25/0generations/both DBs dropped. Không rerun full test suite chỉ để gọi kết quả mới. Source-check và B1 runner đều rebuild worker từ current source trước import. Initial local preflight thiếu temporary environment, corrected qua existing launcher với0generation; giữ output. Git staged-check chặn CRLF preflight output, canonicalized metadata trước seal; exact provider transcript whitespace được giữ bằng attribute chỉ cho CONVERSATIONS.md, không đổi captured replies.

```text
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-source-check-20261017
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-selection-20261017.mjs C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-selection-20261017.json
node C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-freeze-20261017.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-stateful-run-20261017 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --range 1:24 --run --out C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-b1-run-20261017
node C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-preserve-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-primary-packet-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-primary-review-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-customer-outcome-audit-20261017.mjs
git diff --check
```

Config preflight commands/output và credential/source boundary ở [preparation](PREPARATION.md). Fresh full-repo pnpm check/remote exact-head CI/human acceptance/real employee delivery không claimed PASS. One N1 không chứng minh cải thiện nhân quả hoặc ổn định; các assessment về giọng/quyết định là primary chủ quan. Hai semantic rejections không phải false blocks cần nới; lỗi state/receipt cần ưu tiên trước thử thêm prompt. Structural runtime delta của request này **0**, semantic roles/layers added **0**. Dừng sau report/tasks/PR391; không tự fix/rerun.
