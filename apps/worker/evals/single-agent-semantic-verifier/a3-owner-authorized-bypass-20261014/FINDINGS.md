# A3 ngày 2026-10-14 — kết quả và nguyên nhân

**Đã chạy đủ 42 ca, mỗi ca một lần. Đánh giá toàn lượt: 38/42 đạt; A3 diagnostic FAIL.** Có 39 câu đủ điều kiện gửi và 3 fallback (7,14%). Ba fallback đều là lỗi stream ở lượt verifier; ca còn lại trả đúng thông tin nhưng chưa giúp khách quyết định khi hoàn cảnh đổi. Không đổi điểm sau khi đọc draft/verdict chẩn đoán.

Owner yêu cầu rõ “chạy a3 đi, by pass a2”. Vì vậy đây là lượt chẩn đoán có bypass điều kiện vào A3, không bypass verifier/final gate của từng câu. A2 cũ vẫn qualification FAIL, prefix FAIL, population summary PASS. Không chạy thêm A2 hoặc sửa lịch sử thành PASS; Checkpoint A vẫn chưa đạt, khuyến nghị STOP.

## Bốn ca chưa đạt

| Ca | Khách cần gì | Kết quả thực nhận | Nguyên nhân quan sát được |
| --- | --- | --- | --- |
| `r5-referent-navy:1` | Xác nhận quần navy M đã chọn còn hàng | “Phần này em chưa trả lời được, chị nhé.” | Verifier `PROVIDER_STREAM_ERROR`, HTTP 200, stage `GENERATION_STREAM`, không có verdict/usage. Owner đã viết “Dạ, mình lấy quần navy size M nhé chị.” |
| `r5-simple-price:1` | Giá sơ mi SM613 | Cùng fallback tĩnh | Cùng lỗi stream, không phải verdict chặn giá. Draft owner là “Sơ mi SM613 giá 499.000đ chị nhé.”, đúng nguồn. |
| `r15-fit-reassurance:1` | Trấn an cạp quần của set be M cho việc ngồi nhiều | Cùng fallback tĩnh | Cùng lỗi stream, không có verdict để kết luận verifier cho qua hay từ chối nghĩa. Draft owner dùng lưng chun/fit nhưng dài và đưa lại eo 74/chun tối đa 88cm; đây là điểm diễn đạt cần xem riêng. |
| `r7-opacity-context-change:1` | Đổi từ họp trong phòng sang sự kiện có đèn phía sau; lo lộ áo lót và hỏi tồn trắng M | “Sự kiện có đèn chiếu phía sau (đèn ngược sáng) thì áo trắng vẫn có thể thấy bóng áo lót chị nhé. Màu trắng size M hiện vẫn còn chị ạ.” | Verifier PASS phù hợp phạm vi factual safety. Owner chưa chuyển từ thông báo nguy cơ sang khuyên tránh áo trắng cho dịp mới dù đã biết khách ngại lộ. Thiếu lập trường tư vấn; không phải sai dữ kiện hoặc thiếu cả nguồn rủi ro. |

Ba lỗi stream đều đã dùng đúng một request verifier, không retry; HTTP 200 không có nghĩa generation hoàn tất. Evidence chưa chỉ ra sâu hơn lỗi nằm ở provider stream, relay hay xử lý kết thúc stream. Không gọi đây là semantic overblock, auth/quota, timeout hoặc khẳng định nội dung draft gây lỗi. Không chạy lại ba ca để thay denominator.

[Nguyên văn câu hỏi/lịch sử/câu thực nhận, điểm primary và draft/verdict sau primary](A3_FAILURES.md). Draft không được gửi không được dùng thay outcome để nâng điểm; riêng ca opacity đã được gửi, bản draft và terminal là một.

## Vì sao 38/42 vẫn FAIL

| Nhóm | Đạt | Tỷ lệ | Ngưỡng đã freeze |
| --- | --- | --- | --- |
| concern | 10/11 | 90,91% | ≥90% |
| partial | 9/9 | 100% | ≥90% |
| correction | 9/10 | 90% | ≥90% |
| policy | 8/9 | 88,89% | ≥90% |
| simple | 2/3 | 66,67% | ≥90% |

Theo registry hiện có, nhóm policy có ca opacity thiếu lời khuyên; nhóm simple có ca giá bị fallback; concern có ca trấn an cạp quần bị fallback; correction có ca xác nhận quần navy bị fallback. Không đổi tên nhóm để làm đẹp tỷ lệ. Tỷ lệ terminal không gửi 7,14% nằm trong ngưỡng 10%, nhưng không thay được điều kiện từng nhóm. Ca opacity đúng facts/safety mà không đạt usefulness/decision support/next step. Không coi verifier PASS hoặc tổng 38 là đủ kết luận GO.

## Phần tư vấn và giọng văn sau khi đọc cả 42 lượt

Phần giao dịch hoạt động tốt trong các câu được gửi: giá/tổng, biến thể, code-fit, sửa sản phẩm/số đo và chọn màu bám nguồn hiện tại. Các ca thiếu số đo hỏi đúng phần còn thiếu; hai ca chỉ có eo hỏi thêm mông, không tạm gợi M. Không dùng fit của set để cấp fit cho áo/váy khác. Quy tắc chỉ ướm được dùng đúng ở câu hỏi mặc thử; mặc đi làm bị từ chối ngay, không mở đầu bằng quyền đổi chung. Đây là quan sát của lượt N1, chưa chứng minh các lỗi cũ hết ổn định.

Bot chủ động chọn sản phẩm/màu, dùng thiết kế và cách dùng để tư vấn thay vì chỉ thông báo dữ kiện ở đa số lượt. Hai phương án freeship đều được chấm theo nhu cầu: một ca bán thêm navy với tổng958k minh bạch và tránh trùng quần đen; ca kia khuyên áo riêng524k khi khách nói đã nhiều quần. Không ép phải chọn giá thấp nhất hoặc xem mọi upsell là lỗi.

Giọng vẫn có điểm cần cải thiện. `r14-price-repeat-wear:1` đọc lại đủ ngực/eo/mông không cần thiết. Một số câu mua áo nhắc lại ngân sách rồi giải thích quan hệ phối đồ dài hơn mức cần; các câu phản đối giá vẫn thường quay về ít nhăn/tách phối. `r15-fit-reassurance:1` có bản nháp dài, kéo cả số đo cơ thể và độ kéo chun vào đoạn trấn an. Những điểm này được giữ trong nhận xét, không tự biến một cụm hoặc số facts thành naturalness FAIL khi cả lượt vẫn rõ và hữu ích theo sàn đã freeze. Điểm 2 là đạt sàn hiện tại, không phải hội thoại hoàn hảo hay owner đã duyệt.

Ca đổi hoàn cảnh r7 là lỗi cũ còn tồn tại dù prompt đã nói rõ phải xét lại lời khuyên. Ca tương tự `r14-stage-light-change:1` lại khuyên không chọn trắng được. Chênh lệch này cho thấy chỉ dẫn chưa được áp dụng đều; chưa chứng minh model không hiểu đèn ngược hoặc context thiếu. Ca r14 có thêm tồn xanh M nhưng không gọi xanh là giải pháp độ kín; vẫn cần tránh coi số liệu tồn như chứng cứ công năng. Snapshot chưa có độ kín màu xanh hoặc áo khác trong điều kiện sân khấu, nên không thể yêu cầu bot bịa món thay để đạt chất lượng.

## Phân biệt model tư vấn, verifier và context

Lỗi tư vấn quan sát rõ là r7: biết điều kiện mới và nguy cơ nhưng dừng ở thông tin, chưa đưa quyết định mua phù hợp. Ba outcome kém do stream của lượt verifier, không có verdict để gán lỗi ngữ nghĩa. Cả 39 lượt verifier còn lại đều trả PASS hợp lệ; không có semantic FAIL/UNCERTAIN/MALFORMED quan sát trong A3 này. Primary không đánh dấu protected-unsafe trong 39 câu đủ điều kiện gửi, nhưng đây là review chủ quan, không independent/human/owner acceptance và không chứng minh verifier an toàn trên mọi câu.

Context đủ cho giá, tồn, fit, quy tắc thử/đổi và kết luận tránh trắng ở r7. Audit 84 captured request bodies khớp projection; không mất nguồn hoặc evaluator labels lọt vào request. Thiếu áo thay có chứng cứ đúng rủi ro là coverage gap riêng. Việc các payload đúng không chứng minh cách trình bày context đã tối ưu, cũng không cho phép quy mọi lỗi vào prompt.

Vấn đề A2 evidenceRef thay claimId vẫn còn trong hồ sơ A2. A3 không gặp lại malformed không chứng minh contract ấy đã được sửa: lượt này không đổi prompt/schema/parser và chỉ là một mẫu khác. Không chuyển observation 39 PASS của A3 thành qualification A2.

## Accounting và đo thực tế

42 owner + 42 verifier = 84 provider generation requests, max một request mỗi role/attempt; retries0, missing0, startedUNKNOWN0. Tất cả 42 final draft đều qua verifier/final gate. Owner errors/timeouts0; verifier stream errors3/42=7,14%, timeout0. Terminal: 39 SEND_ELIGIBLE, 3 FALLBACK, 0 HANDOFF, 0 NO_SEND. Fallback C3_A_NONPROTECTED_V2 không hứa đã chuyển nhân viên; không gửi khách thật.

Verifier latency p50/p95: 7,498/15,506 giây. Added verification đến gate: 7,722/15,737 giây. End-to-end: 13,358/21,399 giây. Owner input171693/output53336; output gồm51086 thinking +2250 candidate output tokens. Verifier input237269/output4244 của các lượt có usage; ba lượt lỗi không có usage, không tính như chi phí0. Cost không được provider expose, không tự ước lượng.

Runtime source `2a6de4360aad04c57e750a15d9c12f3b4f300f04`; raw commit `95b3ffe4ae47e4257b77a16a5059a74bf08cf181` trước primary commit `98182736f1cddd222c4664694d36c4ba09f4eecb`, rồi mới đọc rejected diagnostics. Raw và primary không bị sửa sau đó. Fresh focused47/full441 PASS, không skip; unchanged same-day worker79/protected21/typecheck/build/lint reuse có readback, không claim chạy lại. [Audit](A3_AUDIT.json), [commands](COMMANDS.json), [toàn bộ hội thoại](A3_CONVERSATIONS.md).

## Hướng xử lý sau báo cáo, chưa thực hiện

Ưu tiên phân biệt và kiểm tra điểm kết thúc stream của route verifier bằng accounting hiện có; không dùng chỉnh nội dung policy để chữa lỗi transport và không thêm generation retry ẩn. Đối với r7, xem lại cách owner chuyển ưu tiên của khách thành quyết định khi hoàn cảnh đổi trên cả hai ca cùng mục đích; không thêm một câu trả lời mẫu cho riêng ID đó. Giữ nguồn sản phẩm/fit/policy đúng scope và phạm vi tư vấn bán hàng đã được duyệt, không quay lại chặn mọi lợi ích thông thường. Contract output ref A2 là một hạng mục riêng chưa được sửa.

Không fix hoặc chạy thêm trong lượt này. Bypass đã phục vụ việc quan sát A3, không là owner GO. Không suy cải thiện ổn định từ chênh lệch 38 so với 37 lịch sử vì N1, stream errors và độ biến thiên model/review. Khuyến nghị STOP tại Checkpoint A; không post-A/merge/deploy/live send.
