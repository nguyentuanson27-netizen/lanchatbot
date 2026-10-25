# Phase B — lời chuyển xử lý gửi khách, 2026-10-25

Review độc lập trên `5005c8d0` chỉ ra việc gỡ `C3_B_HANDOFF_OFFER_V1` chưa đủ: policy candidate vẫn có câu gửi khách nhắc vai trò nội bộ; owner prompt còn gợi cách nói đó. Fallback chung vẫn an toàn nhưng chưa hữu ích cho tư vấn bán hàng.

## Sửa trong candidate

- Thay lời xác nhận ở `handoff-matrix.candidate.json` bằng câu nói trực tiếp việc shop đã nhận và bước xử lý tiếp. Giữ nguyên reason, customerMessagePolicy, tag, điều kiện commit và receipt. Câu về đổi hàng chỉ hứa kiểm tra rồi báo cách xử lý; không hẹn giao đổi trước khi biết đủ điều kiện.
- Review lại trên `174874b2` phát hiện importer của isolated candidate từng chỉ chép ba reason, để nguyên lời cũ của policy có sẵn. Importer nay thay **mọi** lời gửi khách ở rule đang ở chế độ holding bằng copy candidate cùng reason, vẫn giữ policy và tag của nguồn; thiếu copy hợp lệ thì fail-closed trước khi chạy. Test đã quan sát RED trước sửa và GREEN sau sửa, kể cả terminal sau commit từ một upstream có lời cũ.
- Prompt owner đầy đủ và B1 vẫn hướng dẫn gọi `request_handoff` khi có khả năng, nhưng tin gửi khách chỉ xưng em/shop, không kể vai trò hoặc công cụ nội bộ. Không thêm bộ lọc từ khóa trên reply, không sửa verifier, không tạo đường gửi mới.
- Cập nhật hash prompt đầy đủ trong manifest; đổi version của policy candidate. Mọi provider run sau thay đổi cần source SHA và đăng ký input mới. Không gán kết quả run cũ cho source mới.

## Kiểm tra và giới hạn

Test của matrix xác nhận năm loại lời báo đặc thù chỉ xuất hiện sau commit thành công; khi commit bị từ chối không có lời báo đã chuyển. Tất cả lời báo từ matrix không chứa hai cách gọi owner cấm, policy/tag được giữ. Test importer xác nhận lời cũ từ upstream không lọt vào terminal sau commit. `pnpm exec vitest run src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts`: 121/121 PASS. `node --test evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs evals/single-agent-commerce-read-only/handoff-matrix.test.mjs evals/single-agent-commerce-read-only/candidate-handoff.test.mjs`: 28/28 PASS. Worker build/lint và `git diff --check` PASS.

Chưa chạy model trên prompt mới, nên chưa chứng minh mọi câu owner được PASS đều tuân giọng này. `C3_A_NONPROTECTED_V1` là fallback lịch sử mặc định của boundary và vẫn có lời nhắc vai trò; Phase B đi qua `runCommerceTurn` chọn V2. Fallback V2 hiện vẫn là câu chung không giúp chọn mua sau semantic FAIL. Chưa có cách ghép một lời tư vấn cụ thể từ draft bị từ chối mà không tạo và xác minh whole reply mới. Phase B chưa GO; không deploy hoặc gửi khách trong lượt này.

Review độc lập lần hai trên exact source `abc55dc6` đã đọc importer, đường terminal và prompt, đồng thời tự chạy lại bốn bộ test Node: 28/28 PASS. Reviewer không tìm thấy lỗi implementation blocking mới. Giới hạn chất lượng còn nguyên: chưa có provider run xác nhận giọng của owner mới; fallback V2 còn yếu. Prompt B1 chỉ được dùng khi có đăng ký chọn tường minh, còn mặc định dùng prompt đầy đủ.
