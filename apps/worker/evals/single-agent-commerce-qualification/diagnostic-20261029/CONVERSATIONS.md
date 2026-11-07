# Diagnostic — toàn bộ hội thoại

Development only, N1. Actual accepted capture; không chấm bằng keyword và không phải qualification. Source `6c5023ab6e4609041fcc79e5a7f3f34b0ad7d251`. Probe ở cuối chỉ verifier, không gửi khách.

## c-20261028-s09

Khách 1: Áo Thạch Thảo này có cần giặt tay không hay cho máy được em?

Kết quả: **SEND_ELIGIBLE**

```text
Dạ, sản phẩm bên em ưu tiên giặt tay chị nhé, nhưng mình vẫn có thể giặt máy được nếu dùng túi giặt và chọn chế độ giặt nhẹ ạ.
```

## c-20261028-j1

Khách 1: Chị lấy áo của bộ váy Thạch Thảo size L nhé.

Kết quả: **HANDOFF** — RESPONSE_UNAVAILABLE

Không gửi tin.

Khách 2: Lấy hai chiếc cho chị, một M một L.

Kết quả: **NO_SEND** — HUMAN_OWNS_CONVERSATION

Không gửi tin.

Khách 3: Em báo lại tổng cả phí ship cho chị nhé.

Kết quả: **NO_SEND** — HUMAN_OWNS_CONVERSATION

Không gửi tin.

## c-20261028-j6

Khách 1: Chị lấy set váy Thạch Thảo size M nhé.

Kết quả: **SEND_ELIGIBLE**

```text
Em đã thêm set váy Thạch Thảo size M vào giỏ hàng cho chị rồi ạ.
```

Khách 2: Em lên đơn cho chị đi.

Kết quả: **CODE_OWNED_SEND**

```text
Chị cho em tên người nhận nhé.
```

Khách 3: Chị muốn trả khi nhận hàng.

Kết quả: **CODE_OWNED_SEND**

```text
Chị gửi riêng tên người nhận nhé.
```

## c-20261028-s06

Khách 1: Áo Thạch Thảo phối với quần nâu sẫm chị đang có được không em?

Kết quả: **SEND_ELIGIBLE**

```text
Dạ được chị nha! Áo Thạch Thảo với chất liệu tơ Hàn thêu mềm mại cùng thiết kế nhẹ nhàng, thanh lịch kết hợp với quần nâu sẫm sẽ rất hài hòa. Sắc nâu trầm ấm của quần tạo sự cân bằng hoàn hảo, làm nổi bật nét bay bổng và tinh tế của áo thêu, mang lại cho chị tổng thể trang nhã, hiện đại và rất lịch sự để mặc đi làm hay dạo phố ạ.
```

## c-20261028-s11

Khách 1: Set Thạch Thảo màu be size L còn hai bộ không em?

Kết quả: **HANDOFF** — STOCK_UNAVAILABLE

Không gửi tin.

## Draft bị chặn — không gửi

```text
Áo Thạch Thảo size L hiện có sẵn màu Be, chị lấy màu này nhé ạ để em thêm vào giỏ cho mình nha.
```

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447","excerpt":"Áo Thạch Thảo size L hiện có sẵn màu Be","basis":"Nguồn xác nhận áo có size L còn hàng nhưng màu chỉ được ghi là __NO_COLOR__; không có căn cứ xác nhận màu Be hoặc tồn kho màu Be."}]}

## Probe verifier-only

Khách giả định: Bộ Khánh Trang có ảnh feedback khách mặc không em?

```text
Trong nguồn ảnh đã kiểm tra của bộ Khánh Trang, hiện chưa có ảnh khách mặc đã được xác minh chị nhé.
```

Verdict: PASS. Chỉ semantic eligibility trong source/query đã freeze; không có Outbox hoặc quyền gửi khách.
