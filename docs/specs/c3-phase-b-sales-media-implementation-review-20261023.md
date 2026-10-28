# Independent implementation review — Phase B sales/media

Ngày 23/10/2026. **REVISE — hai P2 required trước media provider run.** Reviewer `/root/review_sales_media_impl_20261023`, reviewed HEAD `f21097eccca26465ee0913db2cad5065419558d5`, base `88589b180379eea5c5d0efbf2c06feed903909b2`. Parent ghi lại kết quả; chưa sửa implementation theo findings trong lượt review.

## P2 required — ảnh thứ hai chưa luôn bổ sung góc nhìn

`apps/worker/src/single-agent-commerce-media.ts:61` reuse `selectPriceCardImages`, nhưng helper ưu tiên SIDE cho ảnh thứ hai mà không xét góc ảnh chính. Tái hiện PRIMARY SIDE + ADDITIONAL SIDE + BACK trả hai ảnh SIDE, bỏ BACK. Test mới chỉ có main FRONT nên chưa bắt trường hợp này. Đây là lỗi mục tiêu lựa chọn ảnh, không phát hiện bypass authority.

Sửa tối thiểu: trong selector hiện hữu ưu tiên góc đã biết khác ảnh chính; giữ fallback khi không có ảnh góc bổ sung. Thêm regression main SIDE/main BACK. Nếu đổi shared helper thì kiểm consumers tương ứng; không suy góc từ pixel hoặc tạo framework mới.

## P2 required — thiếu attachment thực giao trong evidence mỗi attempt

`stateful-provider.mjs:25` đưa cohort media vào runner hiện hữu. `isolated-integration.mjs:566–571` chỉ ghi `actualCapturedMessages`, mọi ảnh thành `[CODE_IMAGE]`; dispatcher có `capturePayloads` ở dòng370 nhưng provider loop chưa persist. Temporary DB bị drop sau run, nên evidence còn lại không đối chiếu được exact delivered URL/góc/feedback với selection và mục đích tư vấn.

Sửa tối thiểu trước media run: từ capturePayloads đã có, lưu projection từng attempt gồm loại attachment, exact public URL và thứ tự; bỏ recipient/token. Kiểm hai URL khác nhau được phân biệt và lượt sau không lấy ảnh lượt trước. Reuse capture, không thêm delivery layer/gate.

## Phần phù hợp và giới hạn

Approval/freshness/host/component filtering vẫn trước selector; imageUrls rỗng chặn legacy fallback; DETAIL/FEEDBACK tách biệt. Active owner/verifier chưa bị candidate thay thế; paired advice giữ context/clock/toolsOFF. Không thấy cơ sở thêm role/parser/regex/gate hoặc tăng bounds.

Chưa có provider evidence về giọng, thuyết phục hoặc chủ động dùng ảnh. Review không xác nhận B GO. Full tests trước đó không phát hiện hai gap này; không dùng tổng test PASS thay tiêu chí nghiệp vụ.

## Verification reviewer thực chạy

- `node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs`:5/5PASS.
- Offline `node --input-type=module -e ... selectPriceCardImages(...)`: PRIMARY SIDE + SIDE + BACK trả primary-side,other-side với MAIN_AND_SIDE, tái hiện finding1. Dấu `...` mô tả invocation reviewer, không phải runnable command nguyên văn được lưu.
- `git status --short`:clean; `git rev-parse HEAD`:f21097eccca26465ee0913db2cad5065419558d5.

Reviewer đọc AGENTS/README/operating mode, skill code-review-and-quality, plan/review/report/diff/source boundaries. Không sửa file, gọi provider/live action, spawn agent hoặc rerun full suite. Parent đối chiếu thêm source capturePayloads và provider loop; chưa chạy fix.
