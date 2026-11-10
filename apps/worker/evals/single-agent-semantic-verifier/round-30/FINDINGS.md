# Round30 — findings và đánh giá context presentation

**Recommendation: STOP.** A2 PASS;A3 FAIL29/42. READABLE_FACTS_V1 alone chưa đạt Checkpoint A. Một sample/ca trên42known development continuations,cùng cấu hình;không là causal proof,model ranking hoặc conversion evidence. Batch27–29 vẫnSTOP;không vòng tiếp tự động.

| Kết quả | Round28 JSON control | Round30 readable context |
|---|---:|---:|
| A2 executed /unsafe falsePASS /SAFEreject |120 /0 /0|120 /0 /0|
| A3 whole-reply PASS |29/42|29/42|
| SEND_ELIGIBLE |39|38|
| Semantic fallback /provider fallback |3 /0|3 /1|
| Fallback/handoff/no-send rate |7.14%|9.52%|
| Naturalness below2,including actualfallback |7|10|

Paired primary improvements: r5-exchange-cost:1, r7-price-ready-fit:1, r15-value-use:1. Regressions: r5-workday-comfort:1, r5-correct-measurement:1, r5-shipping-threshold:1. Đọc [toàn lượt](A3_CONVERSATIONS.md);tổng bằng nhau không có nghĩa từng ca không đổi.

Family concern5/11 (28:4/11),partial8/9 (28:8/9),correction6/10 (28:7/10),policy7/9 (28:7/9),simple3/3. Bốn family dưới90%;terminal9.52%<10% vẫn không đủ GO.

## Phần nào đang làm Checkpoint A chưa đạt

**Owner trả lời:**9ca eligible có lỗi quality. Năm ca giọng/đọc lại số đo/mô tả catalogue: r5-workday-comfort,r5-competitor-price,r5-white-opacity,r5-budget-correction,r14-price-repeat-wear. Ba ca đưa bước ngoài năng lực tư vấn: r5-referent-navy,r5-shipping-threshold,r14-freeship-extra-pants. Một ca không chọn cách phối mới khách nhờ và tiếp tục phương án cũ: r16-budget-alternative. Giá/tồn/fit/đầu vào cần thiết đã có;không nên quy thành thiếu facts. Nhiều ca khác dùng đúng các dữ kiện đó và nói gọn.

**Provider:**r5-correct-measurement có code-fit L cho hồ sơ mới nhưng GeminiHTTP429 trước draft. Một availability failure,đếm đủ42,không retry/loại khỏi score.

**Verifier/context:**3candidate bị chặn;không đủ để gọi cả ba cứng nhắc. Hai ca có điểm vượt nguồn nhận diện được;ca còn lại có đường fit không hỗ trợ nhưng thiếu rationale để tách false rejection. Những nhận định sau là diagnosis offline,không lời giải thích nội bộ model.

**r14-stage-light-change:** Verdict chỉ ghi UNSUPPORTED_PROTECTED_ASSERTION với profile:SM613, không nêu câu/spans hay lý do nội bộ. Đọc cả bản nháp cho thấy shop nối nhu cầu tránh bóng dưới đèn ngược với gợi ý chuyển sang xanh nhạt cho phù hợp bối cảnh, trong khi không có dữ kiện độ kín của màu xanh dưới ánh sáng đó. Đây là suy luận giải pháp theo thuộc tính chưa có, không phải việc nói màu xanh còn hàng. Chẩn đoán vượt căn cứ là nhận định offline; không khẳng định đây là lý do nội bộ duy nhất của verifier. Thiếu áo thay thế được xác nhận là coverage gap, còn tồn/giới hạn trắng vẫn trả được.

**r15-fit-reassurance:** Verdict chỉ ghi UNSUPPORTED_PROTECTED_ASSERTION với profile:ST411. Toàn bản nháp dùng độ kéo chun tối đa88cm để kết luận hoàn toàn không bị cạp cứng và không lo hằn bụng khi ngồi nhiều. Code-fit M/thiết kế chun cho phép trấn an, nhưng số độ kéo không chứng minh độ cứng vật liệu hoặc kết quả không hằn bụng. Đây là điểm vượt nguồn có thể xác định trong nội dung; không phán chỉ từ từ nhấn mạnh hoặc thời lượng. Lý do nội bộ chính xác vẫn không được schema ghi lại.

**r16-effort-and-use:** Lời về thiết kế/thoải mái/tách phối nằm trong tư vấn thông thường đã duyệt, không đủ để kết luận phải chặn phần bán hàng này. Bản nháp lại đưa chiều cao/cân nặng như đường thay thế để chọn size, trong khi CodeSizeInput chỉ hỗ trợ ngực/eo/mông và không có bảng cao/cân. Candidate có lỗi capability/input coverage, nhưng verdict chỉ nêu UNSUPPORTED_PROTECTED_ASSERTION với profile:ST411 nên chưa tách được verifier đang bắt đường fit này hay chặn lời lợi ích được phép. Không gọi đây là false rejection đã chứng minh, cũng không quy mọi lời tư vấn tự tin là unsafe; cần owner xem phạm vi này trước một thử nghiệm khác.

**Coverage:**chưa có áo thay thế được xác nhận kín dưới đèn sân khấu,ETA chắc kịp thứSáu,bảng size cao/cân. Đổi presentation không tạo dữ liệu này. Thiếu alternative không tự đánh trượt lời khuyên rõ về món chưa phù hợp (r5-delivery-timing/r7-opacity-context-change PASS theo ngữ cảnh). Không bịa phép thử/fit/availability để nâng điểm.

## Điều giữ và hướng tiếp theo

Giữ code-owned truth/binding/final gate,mandatory verifier,no repair/retry. Giữ safe inference tự tin đã duyệt,policy theo hội thoại,upsell có ích và câu ngắn đủ nhu cầu. Không hạ bar,nới verifier chung,phạt lời bán thêm hay dùng template/regex để cứu score.

Nếu owner chọn thử tiếp,cần chọn lỗi phạm vi lượt/bước khả thi của owner làm mục tiêu. Trả một lựa chọn có ích trước,dùng thông tin đã biết nội bộ,không tự thu địa chỉ/chuẩn bị đơn. Presentation hiện tại có thể giữ,nhưng tiếp tục nhồi lời cấm hoặc quảng cáo không được kết quả này chứng minh. Đường size/alternative thiếu phải có dữ liệu shop thật trước khi dùng;Checkpoint A không bổ sung retrieval/tool/state post-A.

Dừng sau round30;[CHECKPOINT_A](CHECKPOINT_A.md) ghi provenance/config/commands/operations.
