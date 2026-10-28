# So cùng21 ca với turn-completion

Cùng owner/verifier prompt và model configuration, mỗi ca N1; data/time và accepted history khác. Không quy toàn bộ thay đổi cho diff code hoặc suy ra độ ổn định.

| Case | Trước: terminal / ảnh | Sau: terminal / ảnh |
| --- | --- | --- |
| sales-discovery-advice:need | FALLBACK/OWNER_TOOL_MODE / 0 | FALLBACK/FAIL / 0 |
| sales-product-gallery:overview | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 0 |
| sales-size-advice:height-weight | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| sales-southern-delivery:deadline | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| media-overview-next:ask | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 2 |
| media-overview-next:continue | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 2 |
| media-detail-next:ask | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 2 |
| media-detail-next:continue | SEND_ELIGIBLE/PASS / 1 | SEND_ELIGIBLE/PASS / 1 |
| media-and-price:ask | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 2 |
| media-and-size:ask | SEND_ELIGIBLE/PASS / 1 | SEND_ELIGIBLE/PASS / 1 |
| media-decision:ask | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 0 |
| opening-ad | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 2 |
| opening-ad-repeat | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 0 |
| opening-organic | SEND_ELIGIBLE/PASS / 2 | SEND_ELIGIBLE/PASS / 2 |
| opening-unresolved | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| opening-multipart | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 2 |
| stateful-open | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| stateful-variant-quantity | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/RECEIPT_BACKED_CART_SUMMARY / 0 |
| stateful-quote | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| stateful-correction | SEND_ELIGIBLE/PASS / 0 | SEND_ELIGIBLE/PASS / 0 |
| stateful-request-checkout | NO_SEND/CHECKOUT_DETAILS_MISSING / 0 | NO_SEND/CHECKOUT_DETAILS_MISSING / 0 |

Đọc kết quả theo mục tiêu:

- Discovery trước OWNER_TOOL_MODE; sau explicit whole-set reads OK và tới verifier, nhưng customer vẫn fallback. Chưa đạt mục tiêu chọn mua.
- Hỏi lại giá trước gửi lại2ảnh; sau trả giá ngắn không ảnh. Durable image identity xuất hiện trong request; explicit resend và detail continuation vẫn gửi được.
- Caption trước bị ADDRESS; sau capture đọc được. Wording lần này khác và không chứa từ đường, nên N1 không cô lập tác động redactor. RED→GREEN through-history mới là evidence sửa helper.
- Tư vấn ren và ACK correction vẫn dài/cứng; không có can thiệp tư vấn mới nên không nhận tiến bộ giọng.
- Lỗi privacy lowercase được phát hiện ngoài population, không thể dùng17controls PASS để bỏ qua. Correction sau STOP chưa model-qualified.
