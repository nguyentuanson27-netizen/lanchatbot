# Bảy ca chưa hoàn thành/cần xem lại

Bản trình bày bỏ khoảng trắng cuối dòng; raw text và hashes giữ nguyên ngoài repo.
Đọc cùng toàn hội thoại và source; mọi draft bên dưới đều **không gửi khách**. Một ca là lỗi transport; một ca feedback còn cần phân xử contract, không gọi cả bảy là lỗi model tư vấn.

## c-po-20261031-p08

T2 change_cart_item chuyển SET_VAY→AO nhưng mang color=__NO_COLOR__ từ lựa chọn cũ; trả STOCK_UNAVAILABLE rồi handoff. AO/Trắng/M trong frozen snapshot còn5: không phải shop hết áoM. Thiếu lựa chọn màu khách cần được hỏi, không copy sentinel sang offer mới.

Lượt2 — khách: Thôi chị lấy mỗi áo thôi, em đổi lại nhé.

Actual: HANDOFF; không gửi tin nhắn.

## c-20261028-j1

T3 đã chọn quote_product(AO,quantity2), draft tổng978.100đ đúng. Verifier lỗi UPSTREAM_TRANSPORT/GENERATION_TRANSPORT, HTTPstatusnull,1upstream/1client request; không có verdict. Actual terminal handoff, không gửi draft hoặc retry. Đây không phải lỗi cũ hỏi màu thay vì báo tổng.

Lượt3 — khách: Em báo lại tổng cả phí ship cho chị nhé.

Actual: HANDOFF; không gửi tin nhắn.

Draft chưa gửi:

```text
Dạ, tổng 2 áo lẻ Thạch Thảo (size M và L) của chị là 978.100đ (gồm 998.000đ tiền áo, phí ship 30.000đ và ưu đãi 49.900đ).

Chị lấy áo màu Trắng hay Be cho size M và L ạ?
```

## c-20261028-s15

Tin thích màu/cảm ơn vẫn gọi read_product(AO,be) và select_product_media(TOP,be,GENERIC); dependency failure trước verifier, không có lời ACK gửi khách. Lặp họ lỗi cũ; hai-ca diagnostic trước đã pass không chứng minh ổn định.

Lượt1 — khách: Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.

Actual: HANDOFF; không gửi tin nhắn.

## c-20261028-s16

Tool FEEDBACK trả nguồn nhưng verifier cho rằng DETAIL/CLOSEUP+feedback=true chưa chứng minh khách đang mặc. Không có ảnh/reply gửi khách. Cần làm rõ contract/projection và giả định ảnh feedback test; không kết luận verifier chặn sai hay thiếu ảnh toàn bộ. Đây là case chưa hoàn thành cần phân xử nguồn/boundary.

Lượt1 — khách: Shop có ảnh khách mặc áo Thạch Thảo không em?

Actual: HANDOFF; không gửi tin nhắn.

Draft chưa gửi:

```text
Dạ, shop có chị nhé, em gửi chị xem ảnh khách mặc áo Thạch Thảo ạ.
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "media:783183cb7783c69c7cd330e7e786e1482719a91a303b08f3d8e624c094a53bbb",
      "excerpt": "shop có chị nhé, em gửi chị xem ảnh khách mặc áo Thạch Thảo ạ.",
      "basis": "Nguồn xác nhận ảnh feedback cận cảnh chi tiết áo (DETAIL, CLOSEUP), nhưng không xác nhận ảnh thể hiện khách đang mặc áo. Cờ feedback=true chưa đủ căn cứ để giới thiệu đây là ảnh khách mặc."
    }
  ]
}
```

## c-20261028-j4

T2 record_negotiation không có cart hợp lệ; draft tự nói “giá niêm yết của hãng/chưa có chương trình giảm thêm” từ unit price/current discount0. VerifierFAIL;T3no-send là hậu quảHUMAN, không là lỗi provider độc lập.

Lượt2 — khách: Shop hỗ trợ thêm cho chị được chút nào không?

Actual: HANDOFF; không gửi tin nhắn.

Draft chưa gửi:

```text
Dạ, áo lẻ set Thạch Thảo giá 499.000đ (phí vận chuyển 30.000đ) là giá niêm yết của hãng, hiện shop chưa có chương trình giảm giá thêm cho sản phẩm này ạ. Chị ưng lấy áo màu Trắng hay Be size M để em hỗ trợ mình tiếp nhé ạ?
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "5fa3a55e-bc17-54f4-8121-80491883b3c3",
      "excerpt": "là giá niêm yết của hãng",
      "basis": "Nguồn PRICE chỉ xác nhận giá bán áo lẻ là 499.000đ, không xác nhận đây là giá niêm yết do hãng quy định."
    },
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "pre-cart-quote:dcf2274ac5bb08b92994c58da769cbad1f963858f398934f3cb62ba26bb8bdd4",
      "excerpt": "hiện shop chưa có chương trình giảm giá thêm cho sản phẩm này",
      "basis": "Báo giá hiện tại có mức giảm bằng 0, nhưng không có nguồn xác nhận sản phẩm không có chương trình giảm giá thêm."
    }
  ]
}
```

Lượt3 — khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?

Actual: NO_SEND; không gửi tin nhắn.

## c-20261028-s08

Đã chọn DiệpAn, nhưng từ nguồn “thiết kế2lớp” chuyển thành “lớp lót kín đáo”. Verifier chặn thêm cấu tạo chưa xác nhận; actual handoff nên chưa giúp khách quyết định. Không tự nới boundary hoặc giả có source lớp lót.

Lượt1 — khách: Váy Odette với Diệp An, em chọn giúp chị một mẫu mặc đi lễ nhé.

Actual: HANDOFF; không gửi tin nhắn.

Draft chưa gửi:

```text
Dạ, chị chọn mẫu váy Diệp An (mã V168, 699.000đ) nhé ạ. Mẫu này có thiết kế cổ tròn đơn giản, form suông nhẹ cùng lớp lót kín đáo, mang lại nét nhã nhặn và rất phù hợp mặc đi lễ.

Sản phẩm hiện là hàng đặt trước, chị lấy size S, M, L hay XL để em hỗ trợ mình nhé ạ?
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:V168",
      "excerpt": "cùng lớp lót kín đáo",
      "basis": "Nguồn xác nhận váy Diệp An có thiết kế 2 lớp giúp kín đáo, nhưng không xác nhận có lớp lót. Draft đã cụ thể hóa thành cấu tạo lớp lót chưa có căn cứ."
    }
  ]
}
```

## c-20261028-s05

Reply chỉ chọn SQ748 nhưng4ảnh gửi gồm2SQ748+2SQ675, không giới thiệu/giải thích SQ675. Lệch giữa mẫu tư vấn và ảnh thực gửi gây nhầm khi mua; không phải chỉ lỗi tính từ/giọng. Vòng trước giới thiệu2mẫu và ảnh đúng2mẫu đó. Câu CTA chọn size vẫn là limitation nhỏ riêng.

Actual: text chọn SQ748 và4ảnh được gửi. Source URL→product inventory xác nhận2ảnh SQ748 và2ảnh SQ675, không phải4góc của cùng một mẫu. Verifier PASS về prose không chứng minh coherence của cả nhóm text+media.
