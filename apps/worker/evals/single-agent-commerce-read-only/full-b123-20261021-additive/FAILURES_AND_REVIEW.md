# Các ca fallback và cần sửa

## stateful-1 — ca4 — stateful-correction

customer: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

shop: Dạ, em thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi nhé. Mẫu này là hàng đặt trước chị nha.

customer: Đổi áo sang L cho chị, lấy hai chiếc nhé.

shop: Dạ, em đổi áo sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi nhé.

customer: Hai áo cả phí ship là bao nhiêu em?

shop: Dạ, 2 áo Thạch Thảo size L của mình là 998.000đ, phí ship 30.000đ (được giảm 49.900đ), tổng thanh toán là 978.100đ chị nhé.

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, em cập nhật lại số đo mới (eo 74, mông 96) và giữ nguyên áo size L cho chị nhé.
```

**NEEDS_EDIT** — State sửa đúng eo74/mông96 và giữL×2, nhưng reply còn kiểu báo cáo cập nhật lại số đo mới kèm ngoặc đọc lại. Theo yêu cầu owner về cách xác nhận sửa hồ sơ, cần viết lại giọng. Không fail chỉ vì trích hai số đo hoặc tự đổi receipt/state để chữa giọng.

## b1-1 — ca4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, set váy Thạch Thảo (SV2447) bên em có bán cả bộ lẫn mua lẻ từng món nha chị:
- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?
```

**NEEDS_EDIT** — Khách hỏi giá set cụ thể; trả thêm cả bảng giá lẻ rồi hỏi mua cả bộ hay lẻ làm mở lại phạm vi khách đã nêu. Đây là thiếu tập trung ở toàn đoạn, không fail chỉ vì danh sách/ngoặc hoặc cấm chủ động bán thêm.

## b1-1 — ca5 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Kết quả actual (FALLBACK /PROVIDER_ERROR):

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ là fallback PROVIDER_ERROR nên chưa trả được giá/tồn khách cần. Giữ nguyên lỗi trong denominator; chưa quy cho owner hay verifier trước diagnosis.

## b1-1 — ca9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Áo chất tơ Hàn với chân váy ren tơ mềm và thoáng lắm chị ạ, lại có độ bay tự nhiên nên mặc ngoài trời không bị bí hay nặng nề đâu chị nhé.
```

**NEEDS_EDIT** — Khách dễ nóng và phải ở ngoài trời lâu, reply biến mô tả thoáng thành trấn an không bị bí, không phân định rủi ro theo hoàn cảnh. Giọng ngắn nhưng kết luận mạnh. Giữ đây là finding về mức trấn an/căn cứ; chưa tự adjudicate falsePASS hay cấm suy luận chất liệu.

## b1-1 — ca15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, đi ăn cưới ban ngày thì set này rất hợp chị ạ, vừa trang nhã lại lịch sự.

Set này form nhẹ nhàng, chất tơ thêu và ren có độ bay và rũ tự nhiên chứ không bị bồng bềnh hay cầu kỳ quá mức đâu chị. Chị hay mặc đồ trơn diện set này sẽ thấy vừa đủ điểm nhấn sang trọng, thanh lịch cho ngày vui mà không bị quá điệu hay lố chút nào cả. Mình lấy cả bộ (799k) mặc đi ăn cưới là chuẩn đẹp luôn chị nhé.
```

**NEEDS_EDIT** — Có lựa chọn cả bộ799k rõ, nhưng phần thuyết phục kéo dài chuỗi trang nhã/lịch sự/bay/rũ/sang trọng/thanh lịch/chuẩn đẹp và phủ nhận quá điệu/lố, chưa xử lý gu đồ trơn bằng lập luận có sức nặng. Lỗi là cả đoạn dài và khen chung, không đếm tính từ hay ép đổi món.

## b1-1 — ca17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Kết quả actual (FALLBACK /FAIL):

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback FAIL không giúp chọn áo hay bộ cho hoàn cảnh mới. Chưa đọc draft/verdict để giải thích vì sao; không tính draft chưa gửi thành kết quả bán hàng.

## b1-1 — ca21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual (SEND_ELIGIBLE /PASS):

```text
Dạ, áo Thạch Thảo nhà em có bán lẻ chị nhé. Áo size M hiện còn hàng, giá 499k ạ. Chị lấy mẫu này em lên đơn giúp chị nhé!
```

**NEEDS_EDIT** — Giá499k/tồnM và bán lẻ được trả rõ, nhưng câu em lên đơn giúp chị đề nghị bước B1 không có. Không gọi đây là effect đã thực hiện hay câu tự nhiên bị cấm; lỗi nằm ở khả năng thực thi bước tiếp theo.
