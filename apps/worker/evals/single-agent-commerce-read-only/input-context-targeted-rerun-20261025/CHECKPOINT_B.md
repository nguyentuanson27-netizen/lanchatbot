# Phase B — chạy lại 11 ca, 25/10/2026

Đã thực hiện đủ **11 target + 3 lượt tiền đề**, mỗi ca một lần, không generation retry. Đây là kết quả mới riêng biệt; không ghi đè hoặc thay denominator full run trước. User yêu cầu rerun, không yêu cầu sửa runtime/prompt.

Source `d4c8187134eb24c3bebf1f69a843ca7dd1945ac0` sạch và không đổi trong dispatch. Model/config/prompt/corpus hashes khớp full run source `9ecbbe5cd12e6a910c2b81f8271921846d55640a`. Owner **Gemini 3.5 Flash Lite HIGH**, verifier **GPT-6.1 Sol HIGH**. Config đầy đủ trong [registration](REGISTRATION.json).

11 target gồm bốn B1 provider errors, discovery, gallery, correction, request-checkout, private-checkout, confirm và human-request. Ba prerequisite thực sự chạy mới: open → variant/quantity → quote, trong database test mới; không copy state/PASS cũ. Target handoff theo yêu cầu khách là hành vi nghiệp vụ dự kiến, không phải lỗi cần loại bỏ.

## Kết quả

Target terminal counts: `{"SEND_ELIGIBLE": 6, "HANDOFF": 3, "NO_SEND": 2}`.

Prerequisite terminal counts: `{"SEND_ELIGIBLE": 3}`.

| Ca target | Trước | Lần chạy lại | Reason | Ảnh |
|---|---|---|---|---:|
| b1-partial-source-v2 | FALLBACK | SEND_ELIGIBLE | PASS | 0 |
| b1-price-v2 | FALLBACK | SEND_ELIGIBLE | PASS | 0 |
| b1-component-stock-v2 | FALLBACK | SEND_ELIGIBLE | PASS | 0 |
| b1-changed-occasion-v3 | FALLBACK | SEND_ELIGIBLE | PASS | 0 |
| sales-discovery-advice:need | FALLBACK | HANDOFF | RESPONSE_UNAVAILABLE | 0 |
| sales-product-gallery:overview | FALLBACK | SEND_ELIGIBLE | PASS | 2 |
| stateful-correction | HANDOFF | SEND_ELIGIBLE | PASS | 0 |
| stateful-request-checkout | NO_SEND | NO_SEND | CHECKOUT_DETAILS_MISSING | 0 |
| stateful-private-checkout | NO_SEND | NO_SEND | PRIVATE_CHECKOUT_COMMITTED | 0 |
| stateful-confirm | NO_SEND | HANDOFF | PURCHASE_CONFIRMED | 0 |
| stateful-human-request | HANDOFF | HANDOFF | CUSTOMER_REQUESTED_HUMAN | 0 |

Chi tiết toàn bộ 14 lượt trong [hội thoại](CONVERSATIONS.md); eligible không đồng nghĩa đạt chất lượng bán hàng. Đánh giá kết quả thực nhận/capture, không chỉ tên terminal hoặc nội dung draft đã bị chặn.

## Đọc theo kết quả khách nhận được

- **6 fallback cũ:** 5 lượt nay đủ điều kiện gửi; discovery vẫn chưa giải quyết được và chuyển sang holding/handoff. Bốn lỗi provider trước không tái hiện. Tuy vậy partial-source vẫn thiếu giá/tồn theo fixture POS_UNAVAILABLE; PASS chỉ có nghĩa phần trả lời có căn cứ, không phải đã bán được hàng hoặc trả đủ mọi ý. Gallery gửi hai ảnh chung, không khẳng định đó là ảnh màu be.
- **2 handoff cũ:** correction nay chỉ xác nhận cập nhật số đo và giữ hai áo L, không thêm claim vừa vặn/thoải mái nên được cho qua. Handoff khách yêu cầu vẫn được thực hiện đúng; không coi đây là lỗi.
- **3 no-send cũ:** đã đi tiếp theo chuỗi. Request-checkout gửi câu hỏi tên người nhận; private-checkout commit dữ liệu và gửi preview tổng978.100đ; confirm tới PURCHASE_CONFIRMED với acknowledgement thực sự capture. Hai terminal NO_SEND mới là không gửi thêm model reply vì code đã xử lý/gửi, khác ba slot không có message của vòng trước. PURCHASE_CONFIRMED là handoff nghiệp vụ, khác RESPONSE_UNAVAILABLE của discovery.
- **Discovery còn lỗi cũ ở nhánh khác:** vòng trước vượt TOOL_RESULT_BOUND; lần này generation3 của owner còn gọi tool ở FINAL_REPLY, bị OWNER_TOOL_MODE rồi chuyển holding. Provider trả HTTP200/STOP; đây là lỗi contract sử dụng tool, không có bằng chứng transport/quota failure. Không gọi lại tool hoặc thêm generation để cứu lượt này.
- **Giới hạn bằng chứng:** code/prompt không sửa giữa hai run; correction và gallery thành công ở lần lặp này cho thấy hành vi có biến thiên, không chứng minh lỗi đã được fix bền vững. Report full51 cũ giữ nguyên. Không đánh giá lại toàn bộ giọng văn hoặc conversion từ11target này.

## Vận hành và provenance

- Captured requests: **34**, provider accounting `{"owner": 25, "verifier": 9}`, cap đăng ký 52. Mỗi generation max `1` upstream request. Không hidden generation retry.
- Một generation được runner gắn status PROVIDER_ERROR nhưng HTTP200/STOP; nguyên nhân terminal là OWNER_TOOL_MODE nêu trên. Không quan sát transport/auth/quota/timeout error trong lượt chạy lại này. Verifier latency p50/p95: 11.346/20.766s. Observed tokens `{"input": 215589, "output": 19741}`; cost không expose, không billing reconciliation.
- Firewall toàn bộ captured request bodies: evaluator labels leak **0**; pattern trong metrics. Không scan wrapper audit thay model request.
- Hai test databases dropped: `{"journey-openings": true, "stateful": true}`. Không live send, deploy, merge hoặc mutation production. Private checkout input không copy vào repo.
- [7 exact commands](COMMANDS.json) đều exit0, [43 raw-file SHA256](RAW_SHA256.json), [driver nguyên byte](DISPATCH_DRIVER.txt), [source unchanged](DISPATCH_STATUS.json). Dùng B1 ranges11:13/17:17, journey prefix đến gallery và full8 stateful; không chạy thêm nhóm ngoài scope. B1 runner build worker từ source trước mỗi dispatch range; không suy ra full test suite đã chạy.
- Không chạy lại 17 scoped controls/fullA2/full51/CI hoặc unit suites vì executable/prompt không sửa. Kết quả 17 controls cũ vẫn là historical evidence, không relabel sang source mới.
- Public request-checkout text “Chị cho em tên người nhận nhé.” khớp SHA256 captured sequence0 `d04585b28fb64c62250f917950ddf3293a2436ec31506184cbab99bd9f532125`. Display analytics đã che nhầm thành `[NAME]`; khách không nhận literal placeholder này. Bản preview có thông tin riêng tư vẫn giữ redaction, không phục hồi plaintext.

N1 với nguồn đọc hiện hành và không có code fix không chứng minh hết lỗi hoặc ổn định. Giữ B NOT GO và A OWNER_BYPASS; không tự chạy thêm vòng.
