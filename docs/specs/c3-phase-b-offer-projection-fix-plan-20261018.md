# Phase B — kế hoạch sửa sau review độc lập, 2026-10-18

Trạng thái: **PLANNED**. Owner yêu cầu chỉnh kế hoạch sau review độc lập kết luận REVISE. Lượt này chỉ cập nhật tài liệu; implementation, tests hành vi mới và provider run chưa thực hiện. Intake `727d425dcadad3d74a5c992a26c54f391ace49ea`, main vừa fetch `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; tiếp tục branch PR391 hiện có. Khi thực hiện về sau phải kiểm tra lại HEAD/main và thay đổi đang có, không assume các SHA này vẫn mới nhất.

Nguồn: [Phase B execution](c3-phase-b-execution-20261014.md), [ranh giới tư vấn/giọng đã duyệt](c3-phase-b-advisory-and-chat-boundary-20261016.md), [45 outcomes mới nhất](../../apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/CHECKPOINT_B.md) và [scope đã dùng](../../apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/SCOPE.md). Không sửa frozen scope, labels, verdict, điểm hoặc evidence lịch sử.

## Những điều đã biết và giả thuyết cần kiểm

- Vòng trước: 32USABLE / 2NEEDS_EDIT / 8UNUSABLE / 3ownership controls. Tám fallback gồm năm semantic block có căn cứ rõ, một câu acceptance/fit chưa chốt, một tool-budget failure và một Gemini MALFORMED_RESPONSE. Không gộp chúng thành cùng một nguyên nhân.
- Review độc lập đã lọc raw theo `result.generations[].id`: cả ba opening nhận cùng snapshot, cùng bộ AO499k/CV449k/SET799k, đủ sáu PRICE/STOCK trong trusted. Cả ba đọc sản phẩm trước; hai lần thêm đúng, một lần đọc AO lại rồi gọi add dưới NONE và bỏ màu. Vì vậy thông tin bị thiếu không phải nguyên nhân đã xác nhận; tác động của root default tới đọc thừa vẫn là giả thuyết.
- Root `offerType/facts` đang mang lựa chọn mặc định trong khi `sellingOptions` có các lựa chọn ngang hàng. Thử làm rõ projection là hợp lý, nhưng không bảo đảm model hết đọc thừa hoặc giữ đủ args.
- Prompt hiện đã có các luật về unknown, chọn một hướng, không tạo công năng, so giá cùng phạm vi và nhận size khác fit. Viết lại cùng luật chưa chứng minh đã xử lý hallucination hoặc giọng. Review yêu cầu thu hẹp các mục này.
- Năm block rõ vẫn cần được bảo vệ; câu “vẫn lấy L như vậy là chuẩn” giữ trạng thái chưa chốt nghĩa. Tránh câu đó trong reply mới không phải bằng chứng verdict cũ đúng hoặc sai. Nguyên nhân nội bộ của MALFORMED_RESPONSE chưa biết.

## Phạm vi đã sửa theo review

Bắt buộc: một diff nhỏ trong **owner projection của read_product + declaration tương ứng**, kèm regression tests tại adapter hiện có. Giữ source/business resolver, protected claims, verifier evidence, effects, state, receipts và final gate. Không sửa runtime tools chỉ để chứng minh lại việc add tự kiểm nguồn đã có.

Unknown, size, subjective advice và giọng là invariant/review targets, không mặc định mở thêm schema hoặc projection. Owner prompt mặc định giữ nguyên; chỉ cho phép thay đoạn nhiệm vụ tư vấn theo điều kiện T2 dưới đây. Verifier, model/provider/effort/config, corpus, policy, fallback và budget giữ nguyên.

Complexity dự kiến: không role/gate/operator/schema/durable state mới; không semantic router, parser tiếng Việt, production regex/template theo ca, repair/reverify hoặc retry. Một owner, tối đa một verifier; code giữ authority về identity/truth/freshness/state/permission/effects/receipts/privacy. A vẫn OWNER_BYPASS, Phase B sales/live STOP. Không production wiring, source publication, live mutation/send, merge/deploy hoặc Phase C.

## T1 — RED → GREEN cho projection và declaration

Files dự kiến: [gemini-inference.mjs](../../apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs), [gemini-inference.test.mjs](../../apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs). Phụ thuộc: không. Scope: hai file adapter/test, không sửa domain tools hoặc effects.

**Cách sửa:**

1. Chỉ xét response `read_product` có nhiều `sellingOptions` và xác định được đây là đọc chung, không phải explicit single-offer read. Dùng dữ liệu/call identity hiện có; không đoán yêu cầu mua bằng parser hoặc sửa args của model.
2. Chỉ bỏ phần root default nếu đã chứng minh chính dữ liệu đó được giữ trong đúng option của **cùng native response**: `type/scope/value`, offer/variant, cùng metadata phiên bản/thời hạn khi có. Không lấy trusted mới nhất làm lý do xóa response cũ. Dữ liệu khác/không chứng minh trùng thì giữ nguyên; không ép mọi response thành một hình dạng.
3. Availability được kiểm riêng cùng nội dung tương ứng: giữ status/reason khác biệt, unknown, partial failure, ETA và bằng chứng độc nhất. Không coi facts rỗng là đủ để xóa availability. Metadata có ở root phải được giữ hoặc có counterpart tương ứng; không tự điền metadata từ snapshot khác. Khi chưa đủ căn cứ, giữ root và phạm vi của nó.
4. Single-offer read, unknown/null và partial read giữ hợp đồng hiện tại. Mỗi option tiếp tục mang đúng giá/tồn/phạm vi/metadata của nó. Nội dung mô tả độc lập vẫn có ích khi nguồn thương mại thiếu.
5. Đồng bộ câu declaration đang nói root luôn là default: `sellingOptions` là dữ kiện theo từng lựa chọn; nếu còn dữ kiện offer ở root thì chỉ thuộc offer/variant ghi tại đó, không là giá chung. Giữ hướng dẫn truyền size/màu và phân biệt xem tồn với fit. Không đổi tool parameter schema hoặc thêm tool.

**Tests phải quan sát RED trước sửa rồi GREEN:** bổ sung vào captured HTTP tests hiện có, dùng sản phẩm/số tiền synthetic khác corpus; không viết test chỉ tìm chữ trong prompt.

| Trường hợp | Điều phải chứng minh |
| --- | --- |
| Multi-option có root facts trùng hoàn toàn | Phần trùng được gộp; mỗi option và toàn bộ facts có ý nghĩa vẫn còn đúng scope/giá/tồn. Fixture phải thật sự có cả root facts và nhiều options. |
| Đọc rõ một offer | Giữ response single và không trộn dữ kiện offer khác. |
| Root/option khác version, thời hạn, scope hoặc value | Không xóa khác biệt; cùng số tiền không đủ chứng minh cùng bằng chứng. Có cả đối chứng trong cùng response và response lịch sử khác trusted hiện tại. |
| Availability khác nhau, ETA hoặc dữ kiện chỉ có tại root | Không mất status/reason, unknown hoặc dữ liệu giúp model chọn bước tiếp. |
| Thiếu nguồn/availableOffers=null | Giữ mô tả độc lập, null và trạng thái thiếu; không tạo chỉ-bán-bộ/không-bán-lẻ hoặc biến unknown thành danh sách rỗng. |
| Native identity và authority | Captured request giữ call/response IDs, model parts và opaque signatures; input gốc, protected claims, policy/receipt bindings và verifier input không bị sửa. Evaluator-only labels không lọt vào request. |

Acceptance: tests trên GREEN và declaration mô tả đúng cả nhánh gộp lẫn nhánh giữ root. Unit tests chứng minh bảo toàn contract, không chứng minh model hiểu tốt hơn. Ghi exact RED/GREEN commands/results; commit savepoint tối thiểu sau GREEN.

## T2 — Quyết định có cần chỉnh đoạn nhiệm vụ owner

Phụ thuộc T1. Mặc định **không đổi** owner prompt. Chỉ sửa nếu diff chỉ ra được phần hướng dẫn trùng/rải ở nhiều nơi và bản thay thế làm rõ thứ tự: chọn phương án ưu tiên → lý do sát phân vân → điểm chưa hợp/cách xử lý → bước tiếp thực hiện được khi cần.

Nếu chọn sửa, thay/gộp tại chỗ, không nối thêm checklist. Không thêm quy tắc nghiệp vụ, facts, tên mẫu/số tiền hoặc câu đáp án của bộ ca; không cấm từ “chuẩn/vừa”, không ép số câu hoặc bắt mọi tin có CTA. Giữ tư vấn cảm nhận tự tin, phối lớp mặc thông thường, upsell hợp lý và readback hữu ích. Không tạo thuộc tính/kết quả vật lý hoặc quyền chính sách mới; nhận size khách chọn khác với đề xuất độ vừa. Chất lượng quyết định/giọng không chuyển thành nhiệm vụ chặn của verifier.

Không sửa thêm mục unknown/size chỉ để diễn đạt lại luật đã có; không thêm schema hoặc field khi dữ liệu hiện tại đã đủ. Chốt có/không cùng diff/rationale trước seal, cập nhật active manifest hash chỉ nếu prompt thực sự đổi. Báo bytes/hash trước/sau, không ép rút ngắn bằng cách mất nghĩa. Đây là giả thuyết cải thiện owner sử dụng thông tin, không gọi là đã chữa nguyên nhân hallucination. Chốt một candidate; không dùng kết quả provider để tự mở nhánh sửa thứ hai.

## T3 — Verification trước provider

Phụ thuộc T1 và quyết định T2. Dùng checks hiện có, không thêm lớp kiểm hoặc sửa effects để mở rộng scope. Chạy focused sau edit; bộ checks cuối chạy một lần trên candidate hoàn tất, lặp chỉ khi có sửa/failure mới.

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Đây là lệnh **dự kiến**, không phải kết quả đã chạy cho bản sửa. Không shared package edit trong scope này; nếu có nhu cầu phải thu hẹp lại hoặc ghi rõ scope delta trước khi làm và chạy focused/typecheck/build của package tương ứng. Không cần thêm real-DB controls cho mutation không đổi chỉ để lặp evidence có sẵn. So sánh invariants cũ bằng tests/readback hiện tại; không dựa vào test kiểm số chữ để khẳng định tư vấn tự nhiên.

## T4 — Một lần đo mới khi owner yêu cầu thực hiện/run

Phụ thuộc T3. Chỉ sửa kế hoạch chưa kích hoạt implementation hoặc generation. Khi được yêu cầu, tái dùng cơ chế runner/preflight/seal/accounting hiện có và giữ đúng [điều kiện dừng cũ](../../apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/SCOPE.md).

1. Đóng băng source/config/prompt/declaration/schema/corpus/fallback hashes mới, commit, require clean executable/config, capture HEAD thành runtime `bRunSourceSha`; không ghi SHA ngược vào frozen source. Chạy config/stateful/source preflights; không substitute nguồn/model nếu thiếu. Không thay API/generation config trong scope này.
2. Giữ Gemini3.5FlashLite HIGH owner và GPT-6.1-sol High verifier qua routes đã dùng. Một request/generation invocation, retry0; tối đa3owner/2tool rounds/6calls/1verifier mỗi public turn. Không classifier bỏ verifier cho model final. Native processes tối đa2, tuần tự shared build/import startup; không thêm agent role hoặc buộc dùng subagent để chạy.
3. Giữ chính8B1 priority ×3 và3hành trình stateful riêng ×7: **45outcomes, tối đa168generation requests, 15case khác nhau**. Đọc cùng corpus priority hiện có, không tạo permutation/case mới hoặc đổi câu hỏi/nhãn cho hợp bản sửa. Không diagnostic bổ sung. Chạy đủ45, gồm downstream sau lỗi; không fail-fast bỏ phần denominator đã đăng ký.
4. Chỉ khi toàn nhóm đạt tiêu chí đã dùng mới chạy16B1 còn lại một lần: **tổng tối đa61outcomes/232requests/31unique cases**. Bất kỳ unresolved safety, selected-variant/NONE/budget, source/provider failure, unusable advice hoặc checkout/confirmation failure thì STOP trước16. Minor polish đơn thuần không tự là FAIL. Không majority, best-of, thay lỗi hoặc candidate thứ hai.
5. Raw savepoint → review toàn actual history/capture/state/terminal → primary savepoint → rejected-draft/verdict diagnosis/accounting. Lọc shared logs theo generations[].id. Tách ba ownership controls và sáu code-owned preview/confirmation milestones; downstream thành công không xóa lỗi trước. NO_SEND/HANDOFF phải đọc cùng actual capture.
6. Báo denominator, request/error/timeout/retry/token/cost coverage, latency p50/p95 và added verification latency, source/prompt hashes, leak/binding/readback checks và DB cleanup. MALFORMED_RESPONSE giữ fail-closed trong denominator; không gọi HTTP200 là generation hợp lệ. Giữ verdict mơ hồ và ownerAcceptance=null; không nâng điểm bằng sửa nhãn cũ.

Mỗi lần đọc source live có thể khác world; so sánh lần trước là quan sát, không phải causal proof hoặc đảm bảo ổn định. Nếu cả projection lẫn prompt đổi, ghi rõ candidate gộp, không quy cải thiện riêng cho một phần. Sau đo giữ evidence và STOP/report; không patch rồi chạy lại trong cùng scope. A vẫn OWNER_BYPASS, không trở thành A2/A3 PASS hay live readiness.

## Checklist bàn giao của lượt chỉnh kế hoạch

Kế hoạch đã tích hợp hai finding P2 của reviewer độc lập `/root/review_contract_replay_plan`, verdict REVISE: đồng bộ declaration + điều kiện bảo toàn dữ liệu, và loại bỏ sửa prompt/unknown/size theo kiểu nhắc lại. Reviewer chỉ đọc, không sửa nguồn hoặc chạy provider. Đây là bản tích hợp review, không phải một lượt independent review thứ hai. T1–T4 bên trên chưa thực hiện. Lượt tài liệu chỉ kiểm links/scope/whitespace/secrets, cập nhật tasks và draft PR391; không claim checks implementation/provider mới đã PASS.

Kiểm tài liệu thực sự chạy: `node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-plan-check.mjs` exit0, ba file đúng scope/chín local links hợp lệ/nội dung lịch sử giữ nguyên/0secret-pattern hits; `git diff --check` exit0. Lượt kiểm ban đầu so sánh working-tree CRLF với Git LF báo fail; đã sửa helper chuẩn hóa EOL rồi kiểm lại, không sửa lịch sử để làm check qua. Không chạy worker tests/build/typecheck/lint hoặc provider trong lượt chỉ chỉnh kế hoạch này.
