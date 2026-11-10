# Phase B — grounded state fix và một lượt chạy

**Recommendation: STOP cho sales/live acceptance. Source checkout BLOCKED. Checkpoint A vẫn OWNER_BYPASS.** Đã thực hiện đúng một lượt mới 7 stateful + 24 B1, không retry/replacement; giữ mọi lỗi. Bản sửa ghi/sửa state hoạt động đúng trên lượt quan sát; chưa hoàn tất hành trình mua, disclosure hàng đặt trước còn thiếu và 7 B1 gặp quota verifier.

[31 hội thoại](CONVERSATIONS.md) · [Review toàn lượt](PRIMARY_REVIEW.md) · [Finding/root cause](FINDINGS.md) · [Metrics](METRICS.json) · [Request accounting](REQUEST_ACCOUNTING.json) · [Audit](AUDIT.json) · [Implementation/tests](IMPLEMENTATION.md).

## Nguồn, scope và trình tự evidence

| Identity | Giá trị |
| --- | --- |
| implementationBaseSha / main đã refresh trước sửa | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Intake head | `3035c0e9a02ba3476c73a8729ed5cb551d2ce985` |
| Code/test savepoint | `c3951fc6610dbb8e047a75e6e83d9a94dc83773a` |
| bRunSourceSha cho cả hai population | `d894eb1afe0c3e1aca3d6599334b734decafc825` |
| Raw savepoint trước review | `bab60f7ccf294c1996967be717d61213bdbc0629` |
| Initial whole-outcome primary trước trace | `cf52f3033d7bd03664c14f18cee5e45e71d8efb2` |
| Spec architecture blob | `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a` |
| Boundary amendment blob | `4a09b55d2f3a972a65697738876cc5eab21e7a2b` |
| Phase B execution spec blob | `a452326d77e4493b88b02c0072cef808fecad2d8` |
| Owner-approved advisory boundary blob | `5a531cfeb03fcc20e178517a47f5be5a234e1593` |
| Plan/TODO blobs tại run source | `9c01dca3b3975bd64d1c1da8bfd3129193ebafc7` / `df73a49d39d91753da6b747933c9387aff1abbbe` |

[PLAN](PLAN.md), [SCOPE](SCOPE.md), [FROZEN_INPUTS](FROZEN_INPUTS.json) được ghi trước provider results. Hai file vật lý CRLF-only được chuẩn hóa sang Git LF trước mọi generation; `b8642f3e` là preflight superseded, không phải runtime source. Không thay executable/config trong collection. Source, model inputs và raw được audit lại với Git sau collection.

Initial primary dùng actual terminal/capture, lịch sử, nguồn public và state, trước khi đọc rejected draft/verdict chi tiết. Sau khi bắt đầu trace diagnosis có **một đính chính lỗi chấm B1 slot 4** theo spec đã freeze: lời trấn an từ chất liệu mềm/thoáng đã được owner cho phép, không phải false PASS. NEEDS_EDIT còn lại do lời khuyên lớp lót/ô và chất lượng chọn đồ. JSON giữ điểm/lý do ban đầu, correction basis và thời điểm; các hàng khác không đổi. Không đổi raw, verdict, rubric hoặc mẫu số. Review do agent triển khai thực hiện, không độc lập; human acceptance chưa có.

Scope chỉ candidate B1–B3 và test DB riêng/capture. A2/A3 không chạy; không có A2/A3 source SHA mới hay A qualification mới. Không production wiring, source write/publication, merge/deploy, live Meta/Pancake/POS effect hoặc Phase C.

## Model, cấu hình và hashes

- Conversation owner: Vertex AI global `gemini-3.5-flash-lite`, version cùng tên, effort HIGH, candidateCount 1, maxOutputTokens 8192, text/plain, includeThoughts false, timeout 90.000ms, generation retry 0; temperature/topP bỏ trống theo cấu hình đã freeze. Credential route service-account file hiện có, không lưu secret vào repo.
- Verifier: `gpt-6.1-sol`, effort high, Codex ChatGPT login relay CLI `0.159.2`, Responses stream, strict JSON schema; tools `[]`, tool_choice none, parallel_tool_calls false, store false; timeout 90.000ms, response bound 1.048.576 bytes; temperature/topP/maxOutputTokens không truyền. Một upstream generation request/attempt, không client continuation/retry. Server model release không có pin immutable ngoài tên/version được expose; không tự suy ra build ẩn.
- Tối đa 3 owner generations, 2 tool rounds, 6 calls và 1 verifier mỗi lượt; bound request 32.768 bytes. Một owner hội thoại, tối đa một verifier; code giữ identity/truth/freshness/state/permission/effects/receipts/privacy.

| Frozen input | SHA-256 |
| --- | --- |
| Owner prompt | `996c7a98de710f4fd6105f7669f0a2ff033fb02aef4f89c17c9c5245f45df1a9` |
| Verifier prompt (không đổi) | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Corpus stateful | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |

Hash B1 corpus, source config, native tool schemas, 13 input files, 5 runtime files, scope, launcher và source readbacks nằm đầy đủ trong FROZEN_INPUTS/registration; không thêm lựa chọn model hoặc cấu hình sau kết quả. Các ca được dùng lại, không phải holdout chưa từng xem.

## Kết quả và mẫu số đầy đủ

| Population | Registered / recorded / reviewed | Actual terminal | Whole-outcome review sau đính chính |
| --- | --- | --- | --- |
| B1 | 24 / 24 / 24, N1 | 15 SEND_ELIGIBLE; 9 static FALLBACK | 10 USABLE; 5 NEEDS_EDIT; 9 FALLBACK_OR_NO_SEND |
| B2/B3 | 7 / 7 / 7, N1 | 4 SEND_ELIGIBLE/captured; 2 HANDOFF; 1 NO_SEND | 3 USABLE; 2 NEEDS_EDIT; 2 FALLBACK_OR_NO_SEND |
| Tổng | 31 / 31 / 31 | 19 eligible; 9 static fallback; 2 handoff; 1 no-send | 13 USABLE; 7 NEEDS_EDIT; 11 FALLBACK_OR_NO_SEND |

Một USABLE là silent ownership control, không phải nhân viên đã phục vụ hoặc một đơn mua. B1 send-disabled; stateful delivery chỉ capture. Không chấm rejected draft thay fallback. Supporting 10 dimensions 0/1/2 chỉ hỗ trợ lý do toàn lượt, không cộng keyword thành điểm; naturalness của silent control không đo.

State thật: mở đúng áo BE/M×1, đổi BE/L×2, quote 978.100đ đúng; sửa 76/98→74/96 với quote đúng và profile revision 2→3, giữ L. Đây là evidence accepted path N1; không chứng minh field/referent/negation semantics của mọi quote. Rejection/pending/same-source correction/no-op/recovery còn có focused tests.

Chưa đạt: PRE_ORDER chưa được nói khi add/change dù đã có selected context. Private checkout dừng ở PLANNER/CART_ETA_REGION_UNRESOLVED, 0 model requests/0 preview; lượt chốt sau đó bị fence, không có purchase. Shipping durations có sẵn, authoritative address→region mapping chưa giải quyết. Hai verdict FAIL là ca sân khấu và search miss→“shop không có”; bảy ca cuối HTTP 429/usage_limit_reached tại verifier, không có verdict. Xem FINDINGS để tách lỗi context/model tư vấn/semantic decision/quota.

Static fallback duy nhất: `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”, hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. PASS phải qua final deterministic gate; FAIL/UNCERTAIN/malformed/timeout/provider error → fallback đã freeze; identity/freshness/permission/privacy/recipient invalidation dùng terminal map hiện có. Handoff không cấu hình holding thì không tự phát câu hứa có người tiếp nhận. Không có recovery ACK riêng được kích hoạt trong provider batch này.

## Operational measurements

87 generation invocations / 87 HTTP requests = 59 owner + 28 verifier, dưới max120; mọi invocation tối đa một request, automatic retries 0. Có 80 HTTP200 và 7 HTTP429; 0 timeout/owner generation errors. 28 model FINAL đều được đưa verifier bắt buộc: 19 PASS, 2 FAIL, 7 error chưa có verdict. 429 chiếm 7/28=25% verifier invocations, 7/87=8,05% tất cả generation invocations; không gọi chúng là semantic FAIL. Hai owner auth requests được expose riêng; Codex auth count không expose.

| Phép đo | p50 | p95 | N / giới hạn |
| --- | --- | --- | --- |
| Verifier adapter, gồm errors | 5,973s | 10,660s | 28 |
| Verifier chỉ có response OK | 6,364s | 10,660s | 21 |
| Owner adapter | 1,997s | 6,525s | 59 |
| Added verification interval B1 | 6,801s | 11,367s | 24 |
| Added verification interval stateful | 8,257s | 9,649s | 4 |
| Whole turn B1 | 13,624s | 17,643s | 24 |
| Whole turn stateful | 28,171s | 51,980s | 7 |

Nearest-rank percentiles theo samples thực, không suy ra live SLA hoặc causal A/B improvement; whole-turn còn gồm source/DB/tunnel. B1 static fallback 9/24=37,5%. Toàn31: fallback29,03%, handoff6,45%, no-send3,23%; đây là dispositions, không phải tất cả cùng nguyên nhân. Stateful handoff gồm control riêng.

Usage expose ở 80/87 requests: tổng 318.534 input / 27.629 output tokens đã ghi nhận. Owner 222.671/25.917 (output gồm 23.474 thinking); verifier 95.863/1.712 (gồm 1.176 reasoning). Bảy lỗi quota không có usage, không gán 0 vào unknown; tổng là phần đã quan sát, không phải usage đầy đủ. Provider không expose cost, không ước tính giá.

## Audit và complexity

42 raw/frozen/readback hashes khớp disk và Git; 13 frozen inputs, 5 runtime files và 6 spec/plan blobs khớp run source. 59 actual owner request hashes, 28 verifier binding/draft/snapshot identities được đối chiếu; 19 eligible giữ exact draft, 4 captures giữ exact terminal. Mọi model FINAL đều gọi verifier, kể cả errors; không có classifier skip. Không thấy evaluator caseId/split/labels/purpose trong các dispatched bodies đã audit; không có private checkout name/phone fixture trong model requests. Không có provider-side echo độc lập; evidence là body/hash ở adapter cùng capture tests hiện có.

Maximum owner wire 31.678/32.768 bytes. Ba final-only requests, 0 native call violations quan sát; chưa giải thích hay chứng minh ổn định đối với lỗi NONE lịch sử. Source generation budget và privacy/authority/CAS/final gate không đổi. Disposable PG database `c3_b_test_dedc189d0da300db` đã drop; current source read-only.

Runtime delta so với intake: 5 TS runtime files, 100 added/16 removed lines; native adapter 3/3, owner paragraph 1/1, manifest 1/1. Một sourceQuote argument, source messages do code cấp, numeric scalar lexer giới hạn và một optional pending snapshot field tái dùng các boundary sẵn có; không durable store/gate/operator/semantic role mới. Shared package runtime không đổi; shared evidence merge ordering giữ nguyên. 20 tests mới cho grounded state, 3 effects và 1 Node adapter test; các fixture còn lại đồng bộ contract. Ba legacy test URLs trỏ canonical data thay Windows symlink placeholder, không đổi assertions/data. Code savepoint tổng gồm docs/diagnostic/tests: 25 files, +575/−41; evidence sau run được tách riêng.

## Commands thực sự chạy và giới hạn

Các focused RED→GREEN commands và intermediate failures nằm trong IMPLEMENTATION.md. Final verification đã chạy trên code savepoint c3951fc6; executable runtime cùng bytes tại d894eb1a:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts --reporter=dot
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
```

Kết quả: focused state/effects67PASS; adapter/protocol38PASS; full worker1839PASS/131files, Node492PASS/2existing optionalSKIP/0FAIL; protected/reply21PASS; typecheck/build/lint exit0. Không claim full-repo pnpm check/remote CI hoặc shared package build mới. Canonical B1 runner cũng thực sự build dependencies theo flow hiện có. BANK_TRANSFER không rerun; không chuyển kết quả bank cũ thành bằng chứng mới.

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-cod-20261017 COD
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-source-check-20261017
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-stateful-run-20261017 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-b1-run-20261017 --run
```

COD control25/25PASS, 0generation, testDB dropped. Source-check PASS với 0owner/verifier generations, 1 embedding probe. Final-v2 stateful preflight PREFLIGHT_PASS; config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED, 0generation. Provider collections exit0/7 và24outcomes; đó là collection success, không phải quality PASS.

```text
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-preserve-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-primary-packet-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-write-judgments-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-primary-review-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-review-correction-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-audit-20261017.mjs
```

Các reporting commands exit0; raw/primary savepoints giữ trình tự như trên. Audit script hash được ghi trong AUDIT.json; không gọi một reporting script là provider source mới. Đính chính chấm được nêu rõ, không che bằng wording tất cả điểm hiện tại đều blinded trước trace.

Giữ findings và dừng sau report/tasks/PR391 update. Chưa có independent semantic adjudication hoặc human sales acceptance cho run này; không kết luận zero false PASS hoặc an toàn ngữ nghĩa toàn cục từ bộ B. Không tự fix/chạy thêm sau khi xem kết quả. Hướng tiếp theo ở FINDINGS chỉ là đề xuất, không mở Phase C hoặc live.
