# Phase B — ảnh sản phẩm và quyết định tư vấn

Ngày 2026-10-25. Đây là thí nghiệm chẩn đoán sau review 51 ca, không phải kết quả acceptance Phase B. Không gửi tin cho khách. Source chạy sạch `969c9d707f09528f6b0299d09ca7f6c5a0af083c`; corpus SHA-256 `c9219393e49f13e464955271ce78c3483432e239ed9abe23a8415c33abb81abb`; image registration SHA-256 `fe1116e90daf59b9efd94a1a8ab86599ea0a0f99b33a6e56afc7ed4b46b58d71`. Owner: Vertex Gemini 3.5 Flash Lite HIGH; verifier: GPT-6.1 Sol HIGH. Owner prompt SHA-256 `72a044fe15aaa2ff7471b0e93beae27ec630e7adbfd0a261c9bca1860ab39cbc`; verifier prompt SHA-256 `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Mỗi arm một lượt, không retry hoặc chọn câu tốt nhất.

## Sửa và kiểm tra nguồn

Lượt chẩn đoán đầu đã chạy đủ 12 slot nhưng 6 arm PRELOAD đều bị `IMAGE_PIN_CHANGED` trước model: ảnh public hiện tại khác registration cũ. `--source-check` trước đó chưa đối chiếu ảnh. Bổ sung helper kiểm tra cả sáu pin bằng `view_product_media` trong source preflight; nếu drift thì chặn trước bất kỳ generation nào. Utility đăng ký ảnh mới chỉ đọc Qdrant/Redis và bytes ảnh, không gọi model hoặc ghi nguồn shop. Test quan sát RED do thiếu helper rồi GREEN; focused image-comparison 5/5, worker typecheck/build/lint PASS. Source-check với registration mới PASS, 0 provider generations. Sáu arm PRELOAD sau đó đều `preparation.status=OK`, mỗi arm có 2 ảnh; captured owner request có hai `inlineData` cho mỗi generation tương ứng. Không thay prompt, corpus, verifier, policy hoặc code production trong lượt so sánh này.

## Kết quả whole-turn

| Cặp ca | CONTROL | PRELOAD | Nhận xét bán hàng |
| --- | --- | --- | --- |
| Ngại ren nhiều, tiệc ban ngày | SEND_ELIGIBLE | SEND_ELIGIBLE | Cả hai nói chắc “không rườm rà” nhờ mềm/rũ/bay, không xử lý thật băn khoăn về thiết kế. Ảnh không cải thiện lựa chọn. |
| Khách chuộng đồ trơn, ngại điệu | SEND_ELIGIBLE | SEND_ELIGIBLE | Cả hai tiếp tục trấn an lấy set nhiều thêu/ren; PRELOAD còn nói set giữ “nét đơn giản quen thuộc” của khách. Chưa tư vấn một món hợp gu hơn. |
| Đổi dịp sang gặp khách hàng | SEND_ELIGIBLE, chọn áo lẻ | FALLBACK/FAIL | Draft PRELOAD cũng chọn áo lẻ nhưng thêm “chân váy ren dáng dài” khi nguồn không xác nhận dáng dài; verifier chặn. Terminal lại là `C3_B_MEDIA_UNAVAILABLE_V1` (“Lúc này em chưa gửi được ảnh chị cần”), không đúng nhu cầu khách. |
| Nhã Vy, áo hay cả bộ | SEND_ELIGIBLE | SEND_ELIGIBLE | Cả hai chọn áo lẻ với jeans; PRELOAD nói gọn và quyết đoán hơn. Một cặp không đủ quy kết cải thiện do ảnh. |
| Bích Trà, ít phụ kiện | SEND_ELIGIBLE | SEND_ELIGIBLE | Cả hai nêu giữ/tháo hoa cài và nhiều tính từ; PRELOAD ngắn hơn chút nhưng vẫn chưa chọn cách mặc dứt khoát. |
| Bạch Liên, đã có short be | SEND_ELIGIBLE | SEND_ELIGIBLE | Cả hai ưu tiên bán cả bộ rồi đưa áo lẻ như nhánh phụ. Upsell có thể hợp lý, nhưng ảnh không tạo khác biệt rõ về lý do mua. |

Tổng: 12/12 attempts, 6/6 PRELOAD chuẩn bị ảnh thành công, 11 SEND_ELIGIBLE, 1 FALLBACK (8,3%), 0 timeout/provider error. 23 owner + 12 verifier generation requests, tất cả status OK, 0 automatic retry; token owner 161.773 input/21.279 output, verifier 83.097 input/1.508 output; cost không được provider expose. Verifier latency p50 khoảng 7,21 giây, p95 nearest-rank khoảng 12,03 giây. Kiểm trực tiếp 23 owner request và 12 verifier request: không có case ID, purpose/rubric, evaluator labels. Verifier PASS chỉ nói về protected-language semantics, không xác nhận chất lượng bán hàng. Một lượt/arm không chứng minh tính ổn định.

## Kết luận và giới hạn

Với đúng sáu ca và dữ liệu hiện tại, thêm ảnh vào request **không chữa được** lỗi tư vấn chính. Mô tả registry dùng trong eval đã chứa các tính từ “mềm, nhẹ, bay, rũ”; model tiếp tục lấy chúng để phủ nhận lo ngại thẩm mỹ thay vì chọn theo gu khách. Ảnh là bằng chứng về thiết kế nhìn thấy, không tự tạo lý do mua hoặc lựa chọn thay thế. Không thêm câu nhắc hoặc regex theo sáu ca này. Lượt tiếp theo cần thử cách trình bày lựa chọn hàng **có đối chứng sản phẩm thay thế thật**, tách đặc điểm nhìn thấy khỏi lời đánh giá chủ quan, rồi đo quyết định bán hàng trên terminal reply. Cần sửa fallback chọn theo nguyên nhân thực tế: verifier FAIL về đặc tính không được nói “chưa gửi được ảnh”. Các việc này chưa được xác nhận bằng model trong source hiện tại; Phase B vẫn **STOP / chưa GO**.

Raw evidence nằm ngoài repo tại `C:/Users/nguye/Documents/Sản phẩm AI/c3-b51-visual-diagnostic-20261025/paired-run-current/`; source-check tại sibling `source-check-current/`, registration mới tại `image-registration-current.json`. Không gộp lượt stale-pin trước với lượt này.
