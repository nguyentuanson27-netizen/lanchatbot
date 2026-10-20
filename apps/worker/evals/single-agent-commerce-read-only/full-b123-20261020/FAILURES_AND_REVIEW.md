# Các ca fallback/cần sửa — full B1/B2/B3

Primary đã khóa ở9b5070c4 trước diagnosis. Lượt mở giỏ có lỗi owner protocol nhưng actual receipt recovery dùng được; ghi riêng bên dưới.

## b1-1 lượt 3 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Actual:

```text
Set Thạch Thảo có phần áo làm từ tơ Hàn thêu nổi, mềm thoáng và bay bổng, kết hợp cùng chân váy ren tơ Hàn mềm có độ rũ tự nhiên rất đẹp chị ạ.

Hiện tại thông tin giá và tình trạng size M của mẫu này em chưa tra được dữ liệu để báo chính xác cho chị ngay lúc này.
```

NEEDS_EDIT: Trả được chất liệu và không bịa giá/tồn do fixture nguồn thiếu; phần chưa trả được lại diễn đạt thành báo cáo tra dữ liệu, kèm đoạn mô tả kéo dài. Cần viết lại phần này trước khi gửi như tư vấn bán hàng.

## b1-1 lượt 7 — b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Actual:

```text
Set Thạch Thảo mặc đi tiệc ban ngày rất sang và không bị rườm rà đâu chị nhé. Mẫu này dùng chất tơ Hàn thêu kết hợp chân váy ren tơ Hàn mềm, form nhẹ và có độ bay, rũ tự nhiên nên lên người rất thanh thoát, nhẹ nhàng ạ.

Trọn bộ set váy có giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900.000đ của chị nha. Chị muốn lấy size nào để em kiểm tra độ vừa cho mình ạ?
```

NEEDS_EDIT: Có nhận định về ren và giá nhưng lời khuyên vẫn khen nhiều; câu hỏi size khách muốn lấy để kiểm tra độ vừa chưa thu đúng dữ kiện phục vụ tư vấn fit. Cần sửa bước tiếp theo theo khả năng recommend_size/hồ sơ, không suy fit từ size mong muốn.

## b1-1 lượt 15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual:

```text
Chị hay mặc đồ trơn thì diện set Thạch Thảo đi ăn cưới ban ngày rất hợp lý ạ, không bị điệu quá đâu chị nhé.

Chất liệu tơ Hàn và ren mềm của set có form nhẹ cùng độ bay tự nhiên, tạo cảm giác thanh thoát, nhã nhặn chứ không phồng cứng hay rườm rà.

Nếu chị vẫn ngại mặc cả bộ nguyên set, mình có thể chọn mua lẻ áo thêu (499.000đ) phối cùng quần hoặc chân váy trơn tối giản sẵn có trong tủ, hoặc lấy chân váy ren (449.000đ) kết hợp với một chiếc áo trơn. Giá trọn bộ là 799.000đ ạ. Chị muốn lấy nguyên set hay mình thử chọn mua lẻ một món cho quen phong cách mặc hằng ngày ạ?
```

NEEDS_EDIT: Khách muốn quyết định có nên mua khi quen đồ trơn; đoạn mở khuyên cả set rồi mở thêm áo lẻ/váy lẻ và trả việc chọn lại. Lý do dựa nhiều vào mềm/nhẹ/nhã nhặn, chưa làm rõ shop ưu tiên phương án nào cho sự ngại điệu.

## b1-1 lượt 16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual:

```text
Phần này em chưa trả lời được, chị nhé.
```

UNUSABLE: Khách hỏi thử trong phòng có đổi size được không nhưng chỉ nhận fallback chưa trả lời được.

Rejected draft (không gửi khách):

```text
Dạ, shop hỗ trợ đổi size cho mình chị nhé! Miễn là sản phẩm còn nguyên tem mác, chưa qua sử dụng, chưa giặt và còn sạch sẽ, nguyên vẹn trong vòng 15 ngày kể từ lúc nhận hàng là bên em hỗ trợ đổi size được ạ.

Nếu mặc không vừa, chị cứ nhắn em để bên em lên lịch đổi size cho mình nha.
```

Diagnosis: Correct rejection: customer already wore garment for five minutes; current inspection.tryOnMode=HOLD_UP_ONLY permits holding up, not wearing. Opening agreement grants exchange in the stated situation despite reciting unused/unwashed/clean/intact conditions. Not a failure for missing condition keywords; all those conditions are in the draft. No repair/reverify.

## b1-1 lượt 17 — b1-changed-occasion-v3

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual:

```text
Đi gặp khách hàng buổi sáng mà mặc nguyên cả bộ Thạch Thảo vẫn rất lịch sự và gọn gàng chị ạ. Chân váy ren tơ Hàn có form nhẹ và độ rũ tự nhiên chứ không bị phồng hay rườm rà, kết hợp cùng áo thêu trông rất thanh lịch và trang nhã.

Nếu chị thích sự linh hoạt để phối cùng quần sẵn có thì có thể lấy áo lẻ (499.000đ), còn lấy cả bộ (799.000đ) vừa đồng bộ, sang trọng lại vừa nhã nhặn, đi gặp khách hàng hay đi tiệc tối đều rất đẹp ạ.
```

NEEDS_EDIT: Đổi mục đích từ tiệc tối sang gặp khách, khách nhờ chọn bộ hay áo. Đoạn chỉ khen cả bộ gọn/đẹp và đưa hai hướng với giá, chưa làm rõ căn cứ ưu tiên cho mục tiêu gọn trong hoàn cảnh mới.

## Stateful lượt1 — actual recovery dùng được

Owner emitted function call on final-only generation. Existing code authority recovered once from committed receipt, retained preorder disclosure and code quote; not a verifier PASS and no generation retry. Tool intent behind rejected final-only call is not inferred.

Không gọi đây là một static fallback khách nhận; câu receipt-backed có trong toàn bộ hội thoại.
