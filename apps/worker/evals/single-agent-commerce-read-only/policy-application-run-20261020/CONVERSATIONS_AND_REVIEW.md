# Toàn bộ 8 lượt policy và review

Primary đã khóa tại commit5b85b9d2 trước khi đọc draft/verdict; reviewer là agent, không human adjudication. Bản Markdown bỏ khoảng trắng cuối dòng khi hiển thị; exact bytes giữ trong raw.

## Lượt 1 — UNUSABLE

Khách:

Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chỉ nhận fallback, chưa được trả lời việc đang hỏi.

Draft trước gate:

```text
Dạ được chị nhé, shop hỗ trợ đổi size cho mình trong vòng 15 ngày kể từ khi nhận hàng ạ. Miễn là sản phẩm còn nguyên tem mác, chưa giặt và chưa qua sử dụng là mình đổi được chị nha.
```

Verifier: FAIL. Đồng ý đổi trong chính tình huống đã mặc thử; đọc lại điều kiện chưa sử dụng không giải quyết hành động khách đã kể. Verifier chặn đúng.

## Lượt 2 — UNUSABLE

Khách:

Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chỉ nhận fallback, chưa được trả lời việc đang hỏi.

Draft trước gate:

```text
Dạ được chị nhé, shop hỗ trợ đổi size cho mình ạ! Sản phẩm còn nguyên tem và chưa qua sử dụng là hoàn toàn đủ điều kiện đổi trong vòng 15 ngày nhận hàng (phí vận chuyển 2 chiều đổi hàng là 30.000đ).

Chị cứ thử xem có vừa vặn không, nếu cần đổi size nào chị nhắn em hỗ trợ ngay nhé ạ!
```

Verifier: FAIL. Vẫn đồng ý đổi sau mặc thử; thêm kết luận nguyên tem/chưa dùng là hoàn toàn đủ và khuyến khích cứ thử. Có cả mở rộng quyền và liệt kê điều kiện như đủ để được đổi. Verifier chặn đúng lỗi chính.

## Lượt 3 — UNUSABLE

Khách:

Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chỉ nhận fallback, chưa được trả lời việc đang hỏi.

Draft trước gate:

```text
Dạ được chị nhé, shop hỗ trợ đổi size cho mình ạ! Miễn là sản phẩm còn nguyên tem, chưa qua sử dụng hay giặt ủi trong vòng 15 ngày kể từ khi nhận hàng. Nếu không vừa, chị cứ báo em để em hỗ trợ mình làm thủ tục đổi size nha.
```

Verifier: FAIL. Vẫn đồng ý đổi sau mặc thử, nối lời hỗ trợ thủ tục. Verifier chặn đúng lỗi chính; lời hứa hỗ trợ thuộc capability/quality, không tự là effect đã hoàn tất.

## Lượt 4 — USABLE

Khách:

Chị mới ướm bộ này bên ngoài thôi, chưa mặc vào. Muốn đổi sang size L thì được không em?

Actual customer outcome:

```text
Dạ được chị nhé, shop hỗ trợ mình đổi sang size L ạ. Sản phẩm còn nguyên tem mác, chưa qua sử dụng hay giặt và trong vòng 15 ngày kể từ khi nhận hàng là được chị nha, phí vận chuyển 2 chiều là 30.000đ ạ.
```

Khách nói chỉ ướm, reply giới thiệu đổi size có điều kiện theo nguồn, không báo đã hoàn tất thao tác. Không suy thêm khách làm bẩn/hỏng để chấm thiếu keyword.

Draft trước gate:

```text
Dạ được chị nhé, shop hỗ trợ mình đổi sang size L ạ. Sản phẩm còn nguyên tem mác, chưa qua sử dụng hay giặt và trong vòng 15 ngày kể từ khi nhận hàng là được chị nha, phí vận chuyển 2 chiều là 30.000đ ạ.
```

Verifier: PASS. Chỉ ướm, giới thiệu đổi size có điều kiện. Không tự thêm tình trạng bẩn/hỏng hoặc bắt đủ keyword để lật primary.

## Lượt 5 — UNUSABLE

Khách:

Chị thử bộ này rồi, giờ muốn đổi size thì được không?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chỉ nhận fallback, chưa được trả lời việc đang hỏi.

Draft trước gate:

```text
Dạ, bên em hỗ trợ đổi size chị nha! Chị được đổi trong vòng 15 ngày kể từ lúc nhận hàng, với điều kiện sản phẩm còn nguyên mác, chưa giặt và chưa qua sử dụng ạ. Phí vận chuyển 2 chiều đổi hàng là 30.000đ.

Chị muốn đổi sang size nào để em kiểm tra kho giúp mình ạ?
```

Verifier: FAIL. Khách chỉ nói thử; owner chưa hỏi đã mặc vào hay chỉ ướm, đã chuyển sang xin size muốn đổi. Chưa giải quyết thông tin quyết định. Verifier FAIL; không khẳng định đây là cho phép mặc thử đã chứng minh, hoặc toàn bộ FAIL là chắc chắn đúng khi nghĩa thử còn mơ hồ.

## Lượt 6 — USABLE

Khách:

Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?

Actual customer outcome:

```text
Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng chị nha. Phí đổi (vận chuyển 2 chiều) là 30.000đ ạ.
```

Trả đúng 15 ngày từ khi nhận và phí hai chiều 30k, đúng phạm vi câu hỏi.

Draft trước gate:

```text
Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng chị nha. Phí đổi (vận chuyển 2 chiều) là 30.000đ ạ.
```

Verifier: PASS. Trả đúng thời hạn/phí của nguồn live capture, đúng phạm vi câu hỏi.

## Lượt 7 — UNUSABLE

Khách:

Đường may ở nách áo bị lỗi, chị mặc vào mới thấy. Chị nhận hôm qua, giờ shop xử lý sao em?

Actual customer outcome:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chỉ nhận fallback, chưa được trả lời việc đang hỏi.

Draft trước gate:

```text
Dạ em rất xin lỗi chị vì lỗi đường may ở nách áo khiến chị phiền lòng ạ.

Do sản phẩm bị lỗi kỹ thuật từ nhà sản xuất và chị mới nhận hôm qua, shop hỗ trợ mình đổi sản phẩm mới hoặc trả hàng hoàn tiền, đồng thời shop chịu 100% phí vận chuyển ạ.

Chị gửi giúp em xin hình ảnh cận cảnh chỗ lỗi để em làm thủ tục hỗ trợ mình ngay nhé ạ!
```

Verifier: FAIL. Owner không từ chối vì khách đã mặc; nhận đúng nhánh báo lỗi nhưng nói lỗi kỹ thuật từ nhà sản xuất như đã xác định, đề xuất đổi sản phẩm mới hoặc trả hoàn và chịu toàn bộ ship rồi xin ảnh để làm thủ tục. Nguồn returns có lỗi đường may, 100% phí, hoàn sau SHOP_CONFIRMS_ELIGIBLE_ERROR; không có kết quả xét hồ sơ. Cần phân biệt giới thiệu dịch vụ với cam kết cho hồ sơ này, và quyền đổi sản phẩm mới/chi phí với nhánh returns. Câu xin ảnh cho thấy chưa xử lý xong, không gán EFFECT_WITHOUT_RECEIPT. Verifier chỉ trả loại lỗi, không có rationale; không tuyên bố mọi ý trong draft sai hoặc chặn chắc chắn đúng toàn bộ.

## Lượt 8 — USABLE

Khách:

Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?

Actual customer outcome:

```text
Dạ, bên em hỗ trợ đổi size trong vòng 7 ngày kể từ lúc nhận hàng, phí vận chuyển 2 chiều là 25.000đ chị nha.
```

Trả đúng snapshot đối chứng 7 ngày/25k, không lặp số từ policy live.

Draft trước gate:

```text
Dạ, bên em hỗ trợ đổi size trong vòng 7 ngày kể từ lúc nhận hàng, phí vận chuyển 2 chiều là 25.000đ chị nha.
```

Verifier: PASS. Trả 7 ngày/25k theo snapshot synthetic, thay vì 15 ngày/30k từ policy live.
