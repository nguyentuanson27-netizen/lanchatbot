# Phase B — sửa lỗi làm gián đoạn cuộc bán hàng

Base: `dd6cdb84a2c77c4da7d8bbf5c3af3314ebb73d54`. Phạm vi theo owner ngày 25/10: ưu tiên lỗi nghiêm trọng; tạm chấp nhận câu hơi kém, không mở thêm vòng sửa giọng văn.

## Phân loại theo trải nghiệm thực tế

- Cần sửa: discovery kết thúc bằng holding/handoff vì `TOOL_RESULT_BOUND` hoặc `OWNER_TOOL_MODE`, khách chưa nhận được tư vấn mua hàng.
- Cần giữ kiểm chứng: sau sửa số đo, ACK lựa chọn L được phép; khẳng định L vừa/thoải mái vẫn cần SIZE_FIT đúng hồ sơ. Rerun chỉ ACK đã đi tiếp checkout, chưa chứng minh owner hết suy fit.
- Chưa phải lỗi cần sửa: hai terminal `NO_SEND` trong rerun có tin hỏi tên và preview do code gửi; hai handoff PURCHASE_CONFIRMED/CUSTOMER_REQUESTED_HUMAN đúng nghiệp vụ. Phân loại bằng actual accepted Outbox, không đếm riêng enum.
- Tạm chấp nhận: câu dài hoặc chưa hay nhưng đúng, ảnh chung được nói rõ là ảnh chung, phản hồi chưa thật thuyết phục nhưng vẫn xử lý yêu cầu. Không biến chấp nhận giọng văn thành chấp nhận sai giá/size/policy/receipt.
- Bốn lỗi provider cũ không tái hiện trong rerun; không thêm retry ngầm hoặc sửa prompt để chữa lỗi transport.

Evidence: [full 51](../../apps/worker/evals/single-agent-commerce-read-only/input-context-full-20261025/CHECKPOINT_B.md), [rerun 11 targets + 3 setup](../../apps/worker/evals/single-agent-commerce-read-only/input-context-targeted-rerun-20261025/CHECKPOINT_B.md).

## Bản sửa

### 1. Không tính hai lần cùng dữ liệu sản phẩm

Trước đây runtime kiểm 8.192 bytes trên batch kết quả nguyên bản. Adapter chỉ bỏ dữ liệu trùng sau bước đó, nên một batch có thể bị chặn dù nội dung chủ yếu đã có trong snapshot.

Runtime nay tính bound sau khi bỏ bản sao **giống hoàn toàn** của content/attributes/presentation/sizeCharts, đúng subject, có trong snapshot hiện tại. Dùng chung phép so sánh canonical với adapter. Chỉ áp dụng kết quả OK của search/read; đọc thiếu giá/tồn giữ nguyên local evidence. Không bỏ facts, availability, lỗi, receipt hay cắt ngắn nguồn. Batch dữ liệu khác/không có trong snapshot vẫn chịu bound 8.192 bytes; request cuối vẫn chịu bound 65.536 bytes.

Raw tool results vẫn giữ nguyên trong transcript. Nếu nguồn thay đổi ở lượt sau, giá trị cũ khác giá trị mới vẫn được trình bày; verifier/final gate tiếp tục dùng đầy đủ nguồn và binding. Không sửa giá/tồn hoặc chọn sản phẩm thay model.

### 2. Kết thúc chuỗi gọi tool ở lượt trả lời cuối

Rerun discovery nhận HTTP200/STOP nhưng owner trả functionCall ở generation cuối dù tools=[], mode=NONE, roundsRemaining=0. Đây là lỗi tuân hợp đồng cục bộ, không phải bằng chứng hết quota. Không biết nguyên nhân nội tại của model; replay chuỗi native tool ở lượt này là một giả thuyết có thể thử bằng thay đổi request.

Ở **generation cuối vốn đã có**, adapter gửi lại hội thoại khách/shop, snapshot hiện tại và các lượt tool đã hoàn tất dưới dạng dữ liệu JSON `completedToolTurns`. Giữ args/id/status/lỗi/partial write/giá cũ/receipt, không tổng kết bằng model và không biến thành chỉ dẫn mới. Không gửi tiếp native functionCall/functionResponse hoặc thought signature ở request text-only này. Các lượt còn quyền gọi tool vẫn giữ native continuation và signature gốc. Raw input không bị sửa.

Đây là thay đổi cách trình bày request, chưa phải kết quả model được chứng minh. Vẫn tối đa 3 owner generations, 2 tool rounds, 6 tool calls, 1 verifier; không retry/repair/model thứ ba, không gửi câu trung gian, không rewrite câu cuối. Nếu owner tiếp tục gọi tool sai mode thì vẫn bị chặn. Mọi draft qua hard precheck vẫn tới verifier/final gate.

Tham chiếu API đã kiểm tra: [Google function calling](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling) quy định NONE tắt gọi tool; [thinking](https://ai.google.dev/gemini-api/docs/thinking) phân biệt thought signature với văn bản. Không diễn giải nội dung opaque signature, không giả signature để tiếp tục native chain. Không đổi provider API/model/effort.

### 3. Kiểm tra checkout từng trường, không sửa khi chưa có lỗi

Thêm hành trình ingress test: khách trả tên, điện thoại, địa chỉ, COD ở các message/generation riêng. Mỗi bước phải commit dữ liệu đã nhận, hỏi đúng trường tiếp theo và có một message enqueue; cuối cùng preview giữ đúng cart/giá/ETA. Owner/verifier không nhận private inputs. Đây là regression test với store mock; không gọi nhầm thành một lần chạy PostgreSQL/provider thật.

## Self-review và giới hạn

- Runtime test đã quan sát RED cho batch trùng rồi GREEN. Adapter test đã quan sát RED khi request cuối còn native tool parts rồi GREEN. Kiểm thêm kết quả lỗi, nguồn khác, partial read, unknown product, unknown tool, giữ receipt/trace và firewall evaluator labels.
- Self-review thêm compatibility guard: đường so sánh Sol cũ có codexOutput giữ nguyên native chain, kể cả lượt hết tool. Không áp phép trình bày Gemini vào encrypted continuation của Sol. Hai assertion metadata cũ và một test search/POS được cập nhật theo hợp đồng đã có; không sửa runtime source-readback để vượt test.
- Giữ safety checks, privacy, request limits, no retry và không production wiring. Prompt tư vấn/verifier và corpus nguyên trạng.
- Discovery vẫn có thể tìm ứng viên chưa phù hợp. Bản sửa này không chứng minh tìm kiếm hay quyết định bán hàng tốt hơn; không tăng lượt tool để che lỗi.
- Chưa chạy provider trên source mới. Không ghi lại PASS cũ như kết quả bản sửa, không tuyên bố lỗi OWNER_TOOL_MODE đã hết hoặc B GO.
- Lần chạy xác nhận tiếp theo nên ưu tiên discovery và correction → checkout; giữ toàn bộ attempt/failure và đối chứng các ca giá/tồn/media. Chỉ mở run mới khi có yêu cầu chạy, trên source đã commit sạch.

## Verification

Chạy tại repo root, không dispatch provider:

| Command | Kết quả |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts` | RED quan sát trên batch trùng; GREEN cuối 38 tests |
| `node --test --test-name-pattern "final-only generation presents\|final reply data retains" apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` | RED 2 tests trước sửa |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t "actual private preview"` | PASS 3, 88 không thuộc filter; bao gồm hành trình từng trường |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary src/track-b-protected-claim-boundary` | PASS 553 tests / 20 files |
| `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"` | PASS 160 tests, gồm adapter/protocol/Sol compatibility |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | PASS 21 tests |
| `pnpm --filter @lana/worker build` | PASS, gồm dependency builds |
| `pnpm --filter @lana/worker typecheck` | PASS |
| `pnpm --filter @lana/worker lint` | PASS |
| `git diff --check` | PASS |

Lần gọi Vitest đầu dùng filter `single-agent-commerce` thiếu `src/`, lấy cả Node test files nên báo `No test suite found`; không tính lệnh đó PASS. Nó cũng phát hiện assertion search/POS cũ. Node owner-comparison có hai assertion cũ thiếu execution fields; đã sửa và chạy lại bằng đúng runner, kết quả cuối ở bảng trên. Các lượt GREEN riêng adapter/protocol trước kiểm rộng là 67/84 tests; không cộng lặp vào tổng.

Không chạy model, PostgreSQL integration mới, CI remote, live delivery hoặc deploy trong bản sửa này. Provider outcomes vẫn chỉ thuộc hai run evidence cũ. B chưa GO.
