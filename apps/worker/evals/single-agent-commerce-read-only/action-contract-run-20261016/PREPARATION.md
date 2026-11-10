# Implementation, kiểm tra và self-review trước provider

Intake `938086a7b1c52eae32a1756067237336872cbfef`; refreshed main/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Plan](PLAN.md), [scope](SCOPE.md). Minimum implementation savepoint `72367940e2a138ae41ff51200e6e6ff1ac6efa80`.

## Boundary được sửa

`single-agent-commerce-effects.ts`: allowlist riêng cho REMOVE_LINE, SET_QUANTITY, SET_COMPONENT_VARIANT trước authorize/select/commit. Không còn nhận field action khác rồi bỏ qua. Chỉ description native của change_cart_item đổi để nói rõ fields và hai action trong cùng batch; schema, tool count/names, descriptions khác giữ nguyên. Mỗi command commit riêng; không all-or-nothing toàn batch và không đổi domain/persistence/authority/receipt contracts.

Recovery sau CART_MUTATED báo tổng quantity trong current committed cart. Chỉ thêm size/màu nếu mọi component đều có đúng cùng giá trị; không lấy giá trị component đầu gán cho giỏ hỗn hợp. Không tính fit, stock, tiền hoặc quyền mới; không đoán phần khách còn yêu cầu. Receipt/readback/revision/binding/permission/recipient/privacy checks và PARTIAL_EFFECT handoff giữ nguyên. Open/purchase ACK không đổi. Đây là code-owned current-state recovery đã có trong B, không sửa/reverify model final hay thêm post-effect loop.

Owner prompt **11.756 bytes**, SHA256 `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3`; verifier **11.646 bytes**, SHA256 `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`. Cả hai exact Git blobs bằng rollback target; manifest/source config/corpora cũng bằng. Không rút giọng/advice/policy, di chuyển catalog, cart-dedup, đổi B1 capability hoặc thay model/effort/budget/static fallback.

## Observed RED→GREEN

Focused effects đầu: **38 PASS / 5 FAIL** trên 43 tests. Ba fail tái hiện cross-action arguments bị thực thi thay vì reject; hai fail tái hiện generic ACK không báo committed quantity/configuration. Hai-action success và partial failure controls PASS sẵn, chứng minh hành vi cần giữ, không được gọi là bug RED mới.

Minimum guard/readback GREEN **43/43 PASS**. Thêm mixed-cart control để chứng minh không trình bày size/màu của một dòng như cấu hình mọi sản phẩm, focused cuối **44/44 PASS**. Valid two-action batch giữ L×2; replay action cuối không commit thêm; action thứ hai thất bại giữ đúng state phần đã commit và HANDOFF/PARTIAL_EFFECT, quote phụ thuộc bị reject. Không gọi batch replay là all-or-nothing/idempotence toàn batch.

Không có correction test expectation sau RED để cứu kết quả. Không thêm prompt-answer hoặc snapshot test chỉ để khớp dòng instruction. Existing privacy, changed binding/recipient/revision/source contradiction và receipt recovery tests tiếp tục PASS.

## Commands thực sự chạy

```text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
pnpm --filter @lana/worker exec vitest run src
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
node C:/Users/nguye/AppData/Local/Temp/c3-action-contract-offline-20261016.mjs
git diff --check
```

| Check | Actual result |
| --- | --- |
| Focused owning effects | RED 38 PASS/5 FAIL → GREEN 43 PASS; final mixed-cart control 44 PASS |
| Full worker | 130 files / 1.799 PASS |
| Focused adapter/protocol/comparison | 47 PASS |
| Protected claims/reply assembler | 21 PASS |
| Full Node eval | 489 PASS / 0 FAIL / 2 existing optional SKIP |
| Worker typecheck/build/lint | Mỗi command exit 0 |
| Offline captures/context/native parts | 60 bodies checked, 0 provider generations |

Full worker dùng helper junction hiện có tại `C:/Users/nguye/AppData/Local/Temp/c3-action-contract-worker-wrapper-20261016.ps1`: kiểm resolved absolute target trong workspace, tạo/xóa đúng junction và restore tracked placeholder bytes. Không recursive delete hoặc sửa corpus. Full-suite log ở TEMP với action-contract prefix. Không shared source change, không claim fullrepo pnpm check hoặc remote CI PASS.

## Payload chưa được sửa

[OFFLINE_COMPATIBILITY](OFFLINE_COMPATIBILITY.json): reconstitute 60 dispatched owner bodies của baseline, toàn trusted owner view và native model parts/signatures không đổi. Max body **31.144/32.768 bytes**. Transport/projection sau declaration section exact bằng rollback target; chỉ description change_cart_item khác. Không cắt signed parts hoặc giảm dữ kiện để lấy headroom.

Variation từ captured continuation trước, thay độ dài signature 6.660 thành 11.364 ký tự đã quan sát ở lượt sau, vẫn bị OWNER_REQUEST_BOUND. Đây là **KNOWN_BOUND_LIMIT_RETAINED**, không phải preparation PASS cho mọi continuation, provider result hoặc exact failed request reproduction. Không tăng bound, retry hoặc đưa payload fix vào treatment này. Nếu xảy ra trong run mới thì retain invocation/request count0 và actual recovery outcome.

Official docs đọc 2026-10-16: [Google function calling](https://ai.google.dev/gemini-api/docs/function-calling) và [Vertex function calling reference](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/function-calling). Chỉ đổi description trong declaration hiện có, không áp API/schema feature mới hoặc thay endpoint/client/config theo ví dụ model khác trên docs.

## Controlled PostgreSQL integration

Observed **24/24 PASS**, **0 provider generations**, uniquely owned test DB đã drop/readback true. Source 72367940e2a138ae41ff51200e6e6ff1ac6efa80, sourceDirty=false; raw [controls/cod.json](controls/cod.json), SHA256 a72da516b5a3a3540d773da9e87052155d7310010d228b1905193a2d53d7287a. Đây là synthetic domain/current captured policy integration, không phải provider result hoặc source-backed purchase.

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-action-contract-cod-20261016 COD
```

Dùng [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và route credential/source-session đã có. Không in secrets hoặc source mutation. Bank controlled run không chạy lại riêng lần này; focused suite vẫn kiểm purchase ACK cả COD/bank. Không dùng historical bank report như evidence mới.

## Self-review và limits

Net **+11 runtime TS lines**, một native description thay tại chỗ; không role/layer/gate/store/framework, regex/parser/router, semantic repair/reverify, automatic generation retry, new mutation hoặc production wiring. Source readback/mutation/CAS/receipt/egress boundaries được reuse; không chứng minh lại unrelated authority bằng lớp mới.

Code/tests/self-review không chứng minh model truyền đủ màu hoặc hai actions, văn tự nhiên, verifier ổn định hoặc hành trình mua hoàn tất. Giữ ambiguity đã ghi về advisory/policy; không chốt lại nhãn bằng keyword. Mapping ETA có thẩm quyền vẫn thiếu; không fabricate để checkout PASS. Freeze clean source và thu đủ N1 population trước nhận xét mới, raw trước primary trước diagnosis. A OWNER_BYPASS, sales/live STOP và source checkout dependency giữ nguyên.
