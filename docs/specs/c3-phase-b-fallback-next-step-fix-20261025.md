# Phase B — fallback đúng nguyên nhân và có bước tiếp theo

Ngày 2026-10-25. Phạm vi: candidate Phase B trên PR391; không nối production, không gửi khách và không chạy model trong lượt sửa này.

## Vấn đề quan sát

Trong lượt so sánh ảnh gần nhất, khách hỏi nên lấy cả bộ hay áo lẻ để đi gặp khách hàng. Owner đã xem ảnh, rồi verifier chặn câu `chân váy ren dáng dài` vì nguồn không xác nhận dáng dài. Terminal lại nói `Lúc này em chưa gửi được ảnh chị cần.` Đây là sai nguyên nhân: khách không xin ảnh, ảnh đã được chuẩn bị và verifier chặn đặc tính sản phẩm. Fallback chung `Phần này em chưa trả lời được, chị nhé.` an toàn nhưng không giúp khách tiếp tục khi bot có khả năng chuyển nhân viên.

## Sửa

- Media adapter chỉ chọn `C3_B_MEDIA_UNAVAILABLE_V1` khi lookup ảnh thực sự không thành công. Việc đã chọn hoặc xem ảnh thành công không còn được coi là thiếu ảnh. Semantic FAIL sau khi xem ảnh trở về fallback chung.
- Nếu tool surface có `request_handoff` và không có fallback đặc thù hơn, code chọn câu tĩnh `C3_B_HANDOFF_OFFER_V1`: **“Chị muốn nhân viên kiểm tra giúp phần này không ạ?”** Đây là lời hỏi, không phải lời báo đã handoff. Lượt sau vẫn phải dùng handoff tool, policy và commit hiện có; câu này tự nó không ghi state hoặc chuyển người.
- Giữ fallback riêng cho nguồn ảnh thực sự không sẵn, media next-step và size. Không cắt câu owner để giữ một phần chưa được verifier xác nhận, không generation retry, không regex theo câu thử.

Một phương án tự handoff ngay sau mọi verifier FAIL đã quan sát RED ở 11 luồng ingress: commit không được chứng minh và terminal chuyển thành NO_SEND. Nhánh đó đã được rút hoàn toàn; test tích hợp trở lại GREEN. Không dùng lời báo đã chuyển nếu không có receipt.

## Kiểm tra và giới hạn

Test mới quan sát RED trước sửa cho hai trường hợp media, GREEN sau sửa; test handoff-offer quan sát RED trước sửa, GREEN sau sửa. Focused 209/209 worker và 20/20 protocol PASS; worker build và lint PASS; `git diff --check` PASS. Full `pnpm exec vitest run` trên bản trước một chỉnh sửa nhỏ giữ short-circuit có 2.129 PASS và **1 FAIL** ở `single-agent-commerce-read-only-sources.test.ts` (`POS_UNAVAILABLE`, test search-only readback); chạy riêng vẫn FAIL. Sau chỉnh sửa short-circuit, focused 152/152 và lint PASS. File/module source bị FAIL không được sửa trong lượt này; không claim full suite PASS. Không có provider run mới và chưa đo chất lượng khách nhận trên 51 ca với source mới.

Giới hạn còn lại: runner read-only B1 không có `request_handoff`, nên ca đổi dịp ở thí nghiệm ảnh nay nhận fallback chung đúng nguyên nhân nhưng chưa có lời tư vấn thay thế hữu ích. Việc đưa một lựa chọn sản phẩm cụ thể sau verifier FAIL đòi một nguồn/surface được xác nhận và một whole-reply mới đi qua verifier; không ghép câu tĩnh theo case hoặc gửi nửa draft cũ. Phase B vẫn chưa GO.
