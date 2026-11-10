# Findings — full Phase B ngày 28/10/2026

Không có native FALLBACK terminal hoặc verifier rejection trong lần N1 này. Vì vậy không dùng kết quả này để nói mọi nhánh fallback mới đều đã được kích hoạt bằng model. Focused deterministic evidence của implementation vẫn được giữ riêng. Chín handoff thực tế đều có HUMAN/event/tag và không gửi tin hoặc ảnh.

## Cần xử lý hoặc quyết định tiếp

1. **Discovery — quyết định bán hàng và phạm vi fit.** Hai mẫu SQ748 (799k, có S/L) và SQ629 (749k, đặt trước) có cạp chun trong nguồn. Reply đưa danh sách hai quần short rồi hỏi khách thích mẫu nào, chưa giải quyết đủ nhu cầu đi làm hoặc bước chọn size. Câu “không lo bó bụng” được verifier cho qua khi SIZE_FIT=0. Owner đã cho phép nhận xét thiết kế/cảm giác; phải đọc cả đoạn để phân biệt nhận xét thiết kế với bảo đảm vừa chính khách. Giữ REVIEW_REQUIRED_FIT_SCOPE, không quyết định bằng keyword. Mẫu thứ hai lần này là SQ629 có cạp chun xác nhận, không dùng lại finding thiếu thuộc tính của SQ2447 ở vòng trước.
2. **Đổi hoàn cảnh — phạm vi catalog.** Reply nói “Các mẫu thiết kế dự tiệc hiện tại của shop đều ưu tiên chất liệu tơ và ren…” sau khi chỉ đọc bốn mẫu. Phạm vi đó không tự đại diện toàn catalog. Gợi ý Diệp An hai lớp từ thiết kế thuộc suy luận tư vấn đã được cho phép; điều cần xem là chữ “đều” áp dụng cho cả shop, không phải bắt mọi lời khuyên có phép thử riêng. Giữ REVIEW_REQUIRED_CATALOG_SCOPE, không claim zero native false PASS.
3. **Thương lượng — context đủ nhưng dùng chưa tốt.** Current cart quote có subtotal499k, ship30k, discount30k, total499k. Reply chỉ nói “mức ưu đãi sẵn có trên hệ thống”, bỏ giá trị cụ thể có thể thuyết phục khách. Vòng trước nói hỗ trợ30k rõ hơn. Đây là owner dùng dữ liệu chưa hiệu quả; không phải thiếu context, sai phép tính hoặc cần verifier chặn giọng.
4. **Gallery — bàn giao được, chẩn đoán chưa đủ.** Có read_product/select_product_media màu BE rồi DEPENDENCY_FAILURE trước final. Provider OK, handoff commit, không gửi gì. Raw không giữ exception gốc nên chưa gán chắc lỗi cho một field metadata hoặc model/provider. Không tự tạo hoặc publish metadata ảnh giả để vượt ca.

## Đã dùng được và hạn chế được chấp nhận

- Ba form báo giá mở đầu đều gửi hai ảnh; hỏi lại giá không lặp ảnh; chưa rõ mẫu thì hỏi bổ sung.
- SQ223 phân biệt đúng áo một lớp/quần hai lớp, không lặp lỗi scope cũ. Prompt owner/verifier không đổi: một lần PASS không chứng minh silent fallback fix làm owner hiểu tốt hơn.
- Policy hiện tại15ngày/phí30k thay history cũ; các tình huống đã mặc thử/đi làm/cắt tem/giặt được từ chối theo nguồn. Không bắt mọi reply kể lại toàn bộ điều kiện.
- Giỏ hàng, đổi biến thể/số lượng, tổng tiền, private preview và confirmed handoff có state/receipt/capture. Không thực hiện checkout hoặc gửi khách thật.
- Concern và lựa chọn áo/cả bộ vẫn nhiều tính từ, còn dàn trải; coi là giới hạn nhẹ đã được chấp nhận, không tự mở vòng prompt fix. Tổng ảnh từ9 xuống7 không tự chứng minh chất lượng giảm: hai ảnh tư vấn tùy chọn không được gửi lần này.

Đọc đủ51 entries trong WHOLE_TURN_REVIEW.json. Không dùng38 eligible làm38 ca đạt chất lượng bán hàng. B_NOT_GO; không tự fix/rerun/merge/publish/deploy.
