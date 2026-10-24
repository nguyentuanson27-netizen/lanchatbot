# Các ca cần sửa và fallback

## b1-1 — ca 4 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá cụ thể cho từng lựa chọn như sau ạ:

- Cả bộ: 799.000đ
- Áo lẻ: 499.000đ
- Chân váy lẻ: 449.000đ

Chị muốn lấy cả bộ hay mua lẻ món nào ạ?
```

**NEEDS_EDIT** — Vẫn mở cả bảng giá bộ/áo/váy rồi hỏi chọn lại dù khách hỏi giá set cụ thể. Thay hướng dẫn chưa sửa được lỗi scope này; không đánh lỗi vì bullet list tự thân.

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Chất tơ Hàn và ren tơ Hàn của set này mềm, form nhẹ và có độ thoáng tự nhiên nên không bị dày hay nặng người đâu chị ạ. Tuy nhiên ở ngoài trời lâu và dễ nóng, chị lưu ý phần áo có thêu nổi nha.
```

**NEEDS_EDIT** — Đã bỏ bảo đảm không bí, nhưng thay bằng lưu ý áo có thêu nổi mà không nói điều đó ảnh hưởng gì hoặc nên giữ/đổi/cách mặc nào cho việc ở ngoài trời lâu và dễ nóng. Không giúp ra quyết định dù câu có thông tin chất liệu; không fail chỉ vì không đổi sản phẩm.

## b1-1 — ca 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ, nếu bình thường chị hay mặc đồ trơn và sợ set này hơi điệu thì em chia sẻ thật là set Thạch Thảo lên form khá nhẹ nhàng, chất tơ và ren mềm có độ bay và rũ tự nhiên nên tạo cảm giác thanh thoát, sang trọng chứ không bị phồng hay rườm rà quá mức đâu ạ.

Đi ăn cưới ban ngày thì mặc set này rất hợp, vừa nhã nhặn, tươi tắn lại lịch sự. Còn nếu chị vẫn muốn tiết chế bớt cho đúng với phong cách quen thuộc của mình, mình có thể chọn mua lẻ áo thêu phối cùng quần hoặc chân váy trơn sẵn có ở nhà, hoặc lấy chân váy ren phối với áo trơn đơn giản.

Shop có đủ lựa chọn cả bộ (799k), áo lẻ (499k) và chân váy lẻ (449k), chị cứ cân nhắc xem phương án nào thoải mái và đúng ý mình nhất nhé ạ!
```

**NEEDS_EDIT** — Đọc lại gu đồ trơn bằng câu nếu dài, khen nhiều; đưa cả bộ/áo/váy rồi bảo chị tự cân nhắc. Dù có hướng phối đồ trơn, shop chưa đứng vào một lựa chọn để trả câu có nên lấy không. Lỗi quyết định/giọng lặp lại, không phải thiếu keyword.

## b1-1 — ca 21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo bên em có bán riêng chị nhé. Áo size M hiện vẫn còn hàng, giá 499.000đ ạ. Chị có muốn em thêm áo này vào giỏ hàng cho mình luôn không ạ?
```

**NEEDS_EDIT** — Giá499k/tồnM/bán riêng đúng; vẫn mời thêm giỏ dù B1 không có add_to_cart. Câu có thể tự nhiên trong bán hàng, nhưng bước hứa chưa làm được. Lỗi capability cũ đổi từ lênđơn sang thêmgiỏ, không phải đã tự thực hiện effect.
