# Phase B — tiếp nối tư vấn và yêu cầu ảnh kèm mua hàng

Base: `398c185373ace280e7e7ace13ae0b13200f39d4c`. Owner xác nhận feedback vẫn nằm cùng nguồn ảnh hiện hữu, chỉ chưa bổ sung dữ liệu. Không xây nguồn riêng hoặc publish ảnh giả định.

## Vấn đề và thay đổi

- Tool đã báo không tìm được loại ảnh khách hỏi nhưng chưa cho biết loại nào khác đang có. Owner phải đoán hoặc tốn thêm lượt tra. `availableAlternatives` nay lấy từ chính snapshot đã đọc, sau kiểm duyệt/hash/host/thời hạn/màu/component; dùng lại selector hiện hữu, không thêm retrieval, tool call hay generation. Chỉ trả tối đa các intent hữu hạn. Không tự chọn gửi ảnh thay thế.
- Danh sách rỗng nghĩa là không có lựa chọn khác đủ điều kiện trong phạm vi đó; `null` nghĩa là chưa biết do nguồn/màu chưa xác minh. Không dùng nguồn lỗi làm bằng chứng shop không có ảnh. Owner và verifier nhận cùng observation; source hash/freshness/readback tiếp tục bảo vệ cả danh sách. Thêm/bỏ ảnh sau PASS vẫn làm snapshot cũ không hợp lệ.
- Thay một đoạn mô tả tool ảnh: dùng lựa chọn thực sự có, hiểu yêu cầu nối từ lịch sử, xử lý cả giá/size khách hỏi kèm và chỉ nói điểm cần khách xem. Không sửa owner prompt chung hay verifier, không thêm ví dụ sản phẩm/regex/parser/role hoặc ép mọi lượt phải xem/gửi ảnh.
- Kiểm ingress với hai lượt nối sau actual static fallback: history chứa terminal đã gửi, không phải draft bị chặn; giữ currentProductId và đính đúng ảnh sau PASS. Đây là test transport giả lập, không phải bằng chứng model hiểu tốt hoặc một lần chạy PostgreSQL mới.
- Kiểm yêu cầu ảnh + giá: ảnh thiếu vẫn giữ PRICE trong context và gửi toàn draft khi verifier PASS. UNCERTAIN thì không gửi giá/draft/ảnh chưa được duyệt. Không cắt phần bị chặn khỏi draft, không repair/reverify. Fallback tĩnh vẫn có hạn chế làm mất phần trả lời mua hàng nếu toàn draft bị chặn; thay đổi này không giả vờ giải quyết hạn chế đó bằng cách bypass gate.

## Bộ ca sẵn sàng chạy

`sales-media-followup-cases.json`, registrar `registerMediaFollowup`, cờ `--media-followup` trên runner stateful hiện hữu. Có 5 hành trình / 7 lượt: hai hành trình feedback → tổng thể / feedback → chi tiết, ảnh + giá áo lẻ, ảnh + size, concern về tổng thể ren.

Hai lượt tiếp theo dùng terminal/history thực của cùng hành trình, không ép provider trả fallback, không seed câu shop thành công. Nếu actual trước không phù hợp cho lời tiếp, ghi giới hạn ngữ cảnh khi review; không giả có câu khác. Giữ mỗi lượt trong denominator kể cả lỗi/no-send.

N1, tối đa 28 generation requests (3 owner + 1 verifier mỗi lượt), không retry. `--assume-feedback` là điều kiện eval riêng, chưa có run nào được đăng ký/dispatch trong lần sửa này. Corpus, source SHA, tool schema hash, model/config, fallback và attachments được giữ trong cơ chế registration/capture hiện hữu khi chạy. Kiểm request không mang evaluator labels. Bộ 4 media cũ và full39 không bị đổi population.

Review actual text + attachment: có giúp khách quyết định/mua tiếp không, có trả đủ phần khách hỏi không, ảnh có liên quan không, giọng có dài và nhiều tính từ không. Không đếm từ khóa, không bắt một lựa chọn hoặc bắt view để đủ điểm. Không xem PASS semantic là đạt chất lượng bán hàng.

## Self-review

- Không mở rộng ngoài màu/component của query khi gợi loại ảnh khác; color unknown không lén bỏ color.
- Không gán cờ feedback cho catalog thật. Fixture giả định cũ chỉ eval.
- Danh sách alternative không phải attachment đã chuẩn bị; muốn gửi phải select và qua gate.
- Sửa chỗ capture attachments vốn chỉ bật cho cohort media cũ để cohort mới cũng lưu URL/type/order; không ghi recipient/token.
- Rà source bảo đảm hai lượt chung journey dùng capture/history thật; stateful transport cũ không bị đổi.
- Build lần đầu báo hai lỗi type trong test mới (readonly images và protectedClaims unknown); đã sửa test, không nới type runtime.
- Chưa có model run mới; không kết luận giọng/sức thuyết phục tốt hơn hoặc B GO. Full B1/B2/B3 vẫn cần regression sau khi candidate có evidence đáng giữ.

## Verification

Đã chạy:

- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts`: observed RED 2 fail / 23 pass do thiếu alternative evidence, sau minimum fix GREEN 25/25.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts`: 59/59 PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts`: cuối cùng 137/137 PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/assumed-feedback.test.mjs`: 81/81 PASS.
- `pnpm --filter @lana/worker build`: lần đầu FAIL do hai test type errors đã ghi trên; sau sửa PASS, gồm dependency builds.
- `pnpm --filter @lana/worker lint`: PASS (`tsc --noEmit`).
- `node --check apps/worker/evals/single-agent-commerce-read-only/stateful-provider.mjs` và `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs`: PASS.
- `git diff --check`: PASS.

Không chạy model, preflight có credential, DB integration mới, full worker suite, full B1/B2/B3 hoặc live send. Không claim remote CI PASS. Prompt owner/verifier và static fallback vẫn nguyên; chỉ tool guidance thay đổi. Không coi các test giả lập là đánh giá semantic hay độ tự nhiên của model.
