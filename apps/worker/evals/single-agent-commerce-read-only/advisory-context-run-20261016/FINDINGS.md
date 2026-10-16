# Finding sau sửa và chạy đủ 31 lượt

**24 B1 đều eligible, không còn static fallback; review toàn lượt vẫn có 5 NEEDS_EDIT và 2 lượt mua chưa hoàn tất trên 31 outcomes. Chưa đạt sales/live acceptance.**

Raw `88f97757` trước primary `4c01efbf`, cùng run source `c7105bd1cb3ac955a99df589faa1aef4aaef5fd3`, N1. [31 hội thoại](CONVERSATIONS.md) · [Review từng lượt](PRIMARY_REVIEW.md) · [Accounting](REQUEST_ACCOUNTING.json).

| Phần | Actual terminal | Review cả lượt |
| --- | --- | --- |
| 24 B1 | 24 eligible, 0 fallback | 20 USABLE / 4 NEEDS_EDIT |
| 7 stateful | 4 eligible, 2 handoff, 1 no-send | 4 USABLE / 1 NEEDS_EDIT / 2 FALLBACK_OR_NO_SEND |

Tổng **24 USABLE / 5 NEEDS_EDIT / 2 FALLBACK_OR_NO_SEND**. Ba USABLE là control thiếu POS trả phần mô tả; một USABLE chỉ là requested ownership transfer. Không diễn giải thành 24 đơn mua hoặc 31 lượt bán hàng thành công.

## Bốn fallback cũ đã thay đổi như thế nào

- **Sân khấu:** lần này được verifier PASS theo nghĩa cảnh báo và gợi lớp mặc đã được owner chấp nhận. Tuy nhiên actual reply vẫn dài, dùng lời quảng cáo tỏa sáng/sang trọng/thướt tha; primary NEEDS_EDIT về giá trị tư vấn/giọng, không bắt sửa chỉ vì chưa có phép thử.
- **Ngoài trời/dễ nóng:** được PASS, primary USABLE với ghi chú còn dài. Tư vấn độ thoáng dựa trên vật liệu được phép; gợi che nắng không phải báo tính năng chống nắng của sản phẩm.
- **Chân váy thiếu POS:** đã trả được ren/dáng váy và phần chưa tra được giá/tồn M; không tìm sản phẩm khác hoặc gọi policy dưới NONE. Primary USABLE cho partial answer, không phải mua hoàn tất.
- **Đổi màu sau 10 ngày:** trả ngắn thời hạn 15 ngày/phí 30k, PASS và USABLE. Không chuyển câu hỏi thời hạn thành duyệt đủ điều kiện.

Đây là quan sát mới với cả prompt owner và verifier thay đổi, model/nguồn live cũng có variance. Không quy thành từng thay đổi đã được chứng minh gây cải thiện hoặc verifier đã ổn định. Không chạy A2 mới; run này không phải bằng chứng về tỷ lệ false PASS trên population adversarial.

## Năm lượt vẫn cần sửa

| Lượt | Điều chưa đạt | Ranh giới cần giữ |
| --- | --- | --- |
| B1 1 — sân khấu | Đã có lời xử lý nhưng vẫn hai đoạn quảng cáo, làm mờ quyết định thực dụng. | Không quay lại chặn mọi gợi lớp mặc hoặc bắt phép thử riêng cho tư vấn. |
| B1 3 — ngại ren nhiều | Dùng chuỗi tính từ để nói không rườm rà, chưa giúp khách hình dung cách diện phù hợp. | Không đo chất lượng bằng số facts đúng; không bắt phải chọn món lẻ. |
| B1 6 — quen đồ trơn | Mở đầu khen cả set rồi chuyển áo/váy lẻ; có phương án phối nhưng chưa có hướng shop ưu tiên, lời vẫn như catalog. | Nhiều lựa chọn có thể đúng; vấn đề là cả lượt chưa giúp quyết định khi khách đang nhờ chọn. |
| B1 18 — còn trong hạn đổi size | Thời hạn và courier swap đúng nguồn, nhưng đoạn cuối dễ làm hai điều kiện được nhắc thành điều kiện đủ để hứa hỗ trợ. | Không tự thêm việc khách đã giặt/làm bẩn, không FAIL chỉ vì thiếu một chữ. Đây là rủi ro cách hiểu cần owner adjudication, chưa khẳng định là một unsafe false PASS đã được chốt. |
| Stateful 2 — đổi L, lấy hai chiếc | Size đổi thành L nhưng quantity cuối lượt vẫn 1; ACK chung không báo phần số lượng chưa làm xong. | Không chấm thành công chỉ vì có receipt/eligible. Lượt 3 hoàn tất quantity 2 không cứu điểm lượt 2. |

Ca mua cả set để mặc lại nhiều lần (B1 23) được chấm **USABLE**: có quyết định và lý do upsell hợp lý với váy đen sẵn có, không ép phương án rẻ nhất. Giọng vẫn cần gọn hơn nhưng không phủ nhận giá trị bán hàng chỉ vì mua thêm. Ca gặp khách buổi sáng (B1 17) cũng USABLE: đã chọn áo lẻ và dùng so sánh để giải thích đánh đổi, không quay lại khuyên cả hai.

## Root cause xác nhận ở lượt đổi giỏ

[Trace](BOUND_DIAGNOSIS.json) và raw cho thấy:

1. Model gọi `SET_COMPONENT_VARIANT` kèm size L, be và quantity 2. Action hiện tại chỉ đổi variant; readback trả cart L/be **quantity 1**. Đây là sự lệch giữa argument model gửi và nghĩa action thực thi, không phải code tính sai giá hoặc mất receipt.
2. Continuation tiếp theo bị `OWNER_REQUEST_BOUND` ngay trước dispatch. Generation invocation vẫn có trong mẫu số nhưng **0 HTTP request**, không phải verifier FAIL hoặc HTTP timeout. Không có final model text ở lượt này; code recovery dùng receipt thật để gửi ACK chung.
3. Lượt báo tiền sau đó model mới gọi `SET_QUANTITY` rồi `quote_cart`, đưa giỏ thành 2 áo và báo đúng **978.100đ** sau ưu đãi/ship.

Native response cho lần đổi variant có **11.364 ký tự thought signature**, so với 6.660 ở run trước: tăng 4.704 ký tự. Prompt owner tăng 732 bytes và history cũng tăng. Exact failed continuation wire không được capture, nên không bịa số byte hoặc kết luận chỉ prompt tăng là nguyên nhân. Có bằng chứng rõ guard envelope đã chặn; không có lỗi request ở provider cho invocation đó.

Self-review trước run đã kiểm 90 request cũ, max 31.081/32.768 bytes. Check đó **không bao phủ native signature mới dài hơn**, vì vậy chưa chứng minh đủ headroom cho stateful continuations. Đây là giới hạn thật của preparation, cần sửa cách giảm payload ở boundary đang sở hữu request, không thêm prompt để bắt model ít suy nghĩ, cắt native signature, tăng budget, retry hoặc tạo completion framework.

## Giọng và policy: điều đã biết, điều chưa biết

Captured requests đã có đúng mục tiêu bán hàng, lịch sử, prompt mới và source. Không thể tiếp tục quy chung các câu quảng cáo là model không nhận context. Đã xác nhận model còn tạo đoạn catalog sau các chỉ dẫn viết chat; chưa chứng minh chính xác tác động riêng của catalog prose, prompting hoặc thói quen model. Di chuyển mô tả ra khỏi trusted đã từng làm kết quả kém và bị rollback; không lặp lại như một giải pháp đã được chứng minh.

Ba ca thật sự vi phạm policy (đã mặc đi làm, đã mặc thử lên người theo HOLD_UP_ONLY, đã cắt tem/giặt) đều từ chối đúng. Các ca thời hạn/phí được trả đúng. B1 18 vẫn cần làm rõ nghĩa của câu cuối trong toàn context, không dựa vào một từ nối hay đếm checklist. Giữ source policy cũ theo quyết định owner, không hardcode policy vào prompt hoặc đổi nhãn lịch sử.

## Checkout: nguồn còn thiếu gì

Planner tiếp tục trả `CART_ETA_UNAVAILABLE`; không preview rồi handoff dependency. [Source diagnosis trước run](SOURCE_DIAGNOSIS.json) cho thấy prep và transit đều có số, nhưng địa chỉ TP.HCM không khớp key vùng và không có default/mapping được duyệt. Không tự chọn MIEN-NAM bằng suy luận. Confirm sau đó NO_SEND vì ownership đã đổi. Đây là thiếu nguồn/contract ánh xạ tại checkout, không phải model tư vấn hay verifier.

## Hướng xử lý tiếp theo

1. Ưu tiên envelope và contract mutation: dùng readback hiện có để phân biệt phần đã đổi; làm rõ/validate argument theo action thay vì lặng lẽ bỏ quantity. Giảm dữ liệu giỏ/receipt trùng trong owner projection khi có thể chứng minh vẫn giữ đúng readback/authority, bảo toàn native signatures và bound. Chưa chọn implementation cụ thể hoặc claim nó đã được chạy.
2. Bổ sung mapping tỉnh/thành → vùng giao từ nguồn shop có thẩm quyền trước khi kỳ vọng checkout thật hoàn tất; không sửa bằng fixture/default hoặc đoán địa lý.
3. Giữ bar whole-turn để xử lý giọng/decisions; không bổ sung chuỗi ví dụ câu trả lời, keyword cấm hoặc bắt mọi lượt theo mẫu. Đối chiếu điểm còn tranh luận ở policy B1 18 với owner, không tự biến nó thành label SAFE/UNSAFE mới.

Đã dừng sau một run và báo cáo, không post-result prompt/code fix hoặc extra generation. **A OWNER_BYPASS; sales/live STOP; real-source checkout BLOCKED.**
