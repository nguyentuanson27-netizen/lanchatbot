# Findings — B1 24-case run

## Tám fallback

| Slot | Case | Nguyên nhân quan sát | Đánh giá |
|---:|---|---|---|
|1|`b1-changed-occasion`|Owner suy “có thể hơi thấu” rồi đề xuất Diễm Hoa/Thanh Vũ như giải pháp kín dưới đèn dù nguồn không chứng minh.|Verifier chặn đúng; actual fallback không bán được hàng.|
|2|`b1-current-policy`|Owner nói nguyên tem + chưa dùng là “đủ điều kiện”, bỏ sạch, không hỏng, chưa giặt và chưa có order eligibility.|Verifier chặn đúng.|
|9|`b1-changed-occasion-v2`|Từ mô tả mềm/thoáng, owner nâng thành “không bị bí nóng”.|Verifier chặn đúng.|
|10|`b1-current-policy-v2`|Owner cấp quyền đổi khi mới kể tem/chưa dùng/chưa giặt, bỏ sạch và không hỏng.|Verifier chặn đúng.|
|11|`b1-partial-source-v2`|Owner nói shop không bán riêng chân váy trong khi source cho biết có offer `CV`.|Verifier chặn đúng.|
|14|`b1-search-read-v2`|Search trả cả `product:SV1561` và callable `SV1561`; owner chọn ref thứ nhất, tool reject, generation cuối sửa ref nhưng không còn round để tạo final.|Code/tool projection gây BUDGET; không phải provider lỗi.|
|15|`b1-buying-concern-v2`|Owner nói có thể mua riêng áo/chân váy từ `availableOffers`, nhưng verifier snapshot không giữ các offer chưa read/bind.|Source-to-verifier projection mất fact; actual vẫn fallback.|
|18|`b1-current-policy-v3`|Owner duyệt đổi từ ngày nhận + “nguyên vẹn/chưa dùng”, chưa xác lập tem, sạch và chưa giặt.|Verifier chặn đúng.|

Ba ca current-policy đều fallback, trong khi ba ca khách đã dùng hàng đều trả đúng. Model hiểu tốt tình huống bị cấm rõ ràng, nhưng không ổn định khi phải phân biệt “còn trong thời hạn” với “đã đủ toàn bộ điều kiện”. Prompt hiện đã viết rõ ranh giới này; lặp thêm câu lệnh khó giải quyết root cause.

## Năm SEND_ELIGIBLE cần sửa

| Slot | Case | Lỗi whole reply |
|---:|---|---|
|6|`b1-search-read`|Không trả được giá SD375 rồi hỏi màu/gợi ý mẫu tương tự; bước tiếp theo không giải quyết mã khách hỏi.|
|12|`b1-price-v2`|Câu hỏi giá đơn giản bị kéo thành mô tả sản phẩm và xin tư vấn size.|
|17|`b1-changed-occasion-v3`|Nhận ra bối cảnh mới nhưng đưa lại cả hai phương án thay vì chọn rõ riêng áo.|
|19|`b1-partial-source-v3`|POS unavailable nhưng lại hỏi size để “kiểm tra thêm”, tạo bước tiếp theo không dùng được trong lượt.|
|21|`b1-component-stock-v3`|Hứa “lên đơn luôn” dù B1 không có mutation tool; verifier hiện coi future capability promise là quality, không phải protected effect.|

## Điều đã làm được

- Hai ca giá đơn giản trả đúng và dừng đúng lúc; ca thứ ba lộ rõ lỗi upsell/thu thập size thừa.
- Hai trong ba ca component price/stock trả gọn, đúng; ca còn lại đúng facts nhưng sai capability CTA.
- Cả ba ca hàng đã dùng/mặc thử/cắt tem đều hiểu đúng policy và từ chối thẳng.
- Hai trong ba buying concerns đưa được lựa chọn bán hàng, trong đó `b1-buying-concern-v3` dùng đồ khách đã có, giá và mục tiêu mặc lại để chọn mua riêng áo.
- Partial-source có một ca trả được facts còn dùng được mà không bịa giá/tồn.

## Root cause theo layer

1. **Code/tool projection:** hai identifier khác nghĩa cho cùng product gây tool call sai; `availableOffers` không thành trusted verifier evidence; size query không còn size trong protected STOCK scope.
2. **Owner model:** nâng mô tả tương đối thành bảo đảm vật lý; biến policy lookup thành approval; bỏ qua các instruction đã có về câu hỏi đơn giản, lựa chọn rõ và capability next step.
3. **Verifier:** chặn tốt các protected claims sai, nhưng không thể dùng facts bị projection bỏ; deliberate scope hiện tại cũng bỏ future action promises nên case21 lọt.
4. **Source/context:** SD375 không cho owner một exact price result trong lượt; raw catalog prose khuyến khích reply giống mô tả quảng cáo. Đây là source/presentation issue, không nên chữa bằng thêm ví dụ đáp án.

Không có căn cứ để kết luận chỉ đổi model hoặc viết prompt dài hơn sẽ ổn định. Sửa tiếp phải bắt đầu từ ba contract code-owned bị mất nghĩa, sau đó đo lại case sở hữu lỗi trước khi cân nhắc full batch.
