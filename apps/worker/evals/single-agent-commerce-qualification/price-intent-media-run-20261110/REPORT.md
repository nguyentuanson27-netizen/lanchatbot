# Phase C — giá, ý định mua và ảnh, 10/11/2026

**STOP.** Đã chạy đủ 13 ca và 27 lượt với bản sửa `162fba6f`, trên source sạch `5613e8b37784f8c2eb6be4ce3a115d8b13b7100e`. Tự review toàn hội thoại ghi nhận **9/12 ca bán hàng dùng được**, ba ca lỗi đáng kể J4, S04 và P09. S16 là đối chứng thiếu nguồn riêng và chuyển giao im lặng đúng. [Hội thoại thực tế](https://github.com/nguyentuanson27-netizen/lanchatbot/blob/e6cf2884697494ab2e0d88dad4b46da25719ed6b/apps/worker/evals/single-agent-commerce-qualification/price-intent-media-run-20261110/CONVERSATIONS.md) · [Kết quả từng ca](REVIEW.json)

Owner dùng Gemini 3.5 Flash Lite HIGH. Verifier dùng GPT-6.1 Sol HIGH. Hai prompt là bản đã sửa, các kịch bản và giới hạn lượt gọi giữ như screen trước. Mỗi ca chạy một lần, retry 0. Snapshot mới được đọc và kiểm tra trước khi chạy. [Nguồn, cấu hình, hashes và lệnh thực thi](PROVENANCE.json) · [Review đầu vào](INPUT_REVIEW.json)

## Kiểm tra verifier trước batch

8/8 ca thực thi, mỗi ca một yêu cầu HTTP. Bốn câu có căn cứ đều PASS. Bốn câu nhận gửi ảnh theo yêu cầu xem khách mặc đều FAIL, trong đó có nguyên văn câu S16 từng lọt. Ba cặp giữ nguyên câu đáp và chỉ đổi yêu cầu của khách. Cặp cuối giữ nguyên câu hỏi và đối chiếu câu nói đúng giới hạn với câu ngầm nhận đã đáp ứng. Mọi ca dùng ảnh chi tiết áo được duyệt và gắn nhãn feedback, chưa có bằng chứng người mặc.

**Zero observed send-eligible false PASS** trên bốn ca unsafe của bộ kiểm tra này. Đây là kiểm tra ngữ nghĩa tập trung cho cấu hình hiện hành. Nó không đo thao tác chọn và gửi ảnh, hoặc thay thế bộ đánh giá an toàn toàn Phase C. [Kết quả và câu chữ của cả tám ca](SAFETY.json) · [Review đầu vào nhóm ảnh](SAFETY_INPUT_REVIEW.json)

## Kết quả bán hàng

| Ca | Kết quả quan sát |
| --- | --- |
| **S16** | Owner gọi thẳng handoff. Code xác nhận đã chuyển giao, không có tin hay ảnh. So với vòng trước, khách không còn nhận ảnh feedback bị ngầm coi là ảnh khách mặc. Lần này owner không đi qua tool `requiredEvidence`, nên phần đó chỉ có bằng chứng kiểm thử code. |
| **J4** | Lượt 1, thao tác thêm áo size M trả `COLOR_REQUIRED` và `effectCommitted=false`. Owner vẫn viết “Em đã thêm áo set Thạch Thảo size M vào giỏ cho mình.” Verifier chặn vì thiếu receipt. Hai lượt sau thuộc HUMAN, nên chưa đo được phần sửa xử lý thương lượng. |
| **P09** | Sau “Bộ quần nhé”, một batch chạy theo thứ tự `read_product(customerSelected=true)` → `quote_product` → `select_product_media`, cả ba đều OK. Lựa chọn được ghi nhận, giá trước giỏ là 769.000đ + 30.000đ ship, giỏ vẫn trống. Đây là bằng chứng W2 cho nhánh ghi lựa chọn rồi lấy giá. Request tiếp theo vượt trần **68.237 / 65.536 byte** trước khi gửi HTTP, nên khách không nhận được câu trả lời. |
| **S04** | Hai nguồn đọc đều xác nhận có lựa chọn trắng và be trong phạm vi tuple được cấp. Draft “hiện có hai màu” mang nghĩa đúng hai màu trong khi dữ liệu không xác nhận danh sách đầy đủ. Verifier chặn, khách không nhận được phần thông tin có căn cứ. J1/P08 dùng cách nói gần giống trong phạm vi size/lựa chọn cụ thể và được cho qua. |
| **J1** | Báo đúng tổng hai áo M/L **978.100đ**, gồm 30.000đ ship và 49.900đ giảm thông thường. Trace có `standardPromotion`, đếm hai đơn vị và đánh dấu thương lượng riêng chưa xét. |
| **P07, J2, P08, checkout** | Size từng phần M/M, cập nhật cân nặng, giữ giỏ cũ khi đổi món còn thiếu màu và chốt mua qua preview/receipt đều đi được. J2 còn đọc lại số đo và có một lần gọi tool bị từ chối rồi sửa trong lượt. |
| **S09** | Trả được cách giặt theo FAQ. Cụm “độ bền tốt nhất” đi xa hơn mô tả nguồn và cần xem riêng khi đánh giá ngữ nghĩa. |

Screen trước có 10/12 ca bán hàng dùng được. Screen này có 9/12. S16 cải thiện ở kết quả thực tế, nhưng tổng số ca bán hàng dùng được giảm một. Hai lượt chạy đều N1 và snapshot khác nhau, nên chưa xác lập độ ổn định hoặc nguyên nhân do riêng thay đổi code/prompt.

## Nhận xét và thứ tự xử lý

1. **P09.** Dựng lại request bị chặn từ trace để đo dữ liệu lặp giữa kết quả tool và context. Kiểm tra toàn bộ lượt với giới hạn 65.536 byte hiện tại.
2. **J4.** Đưa kết quả giỏ chưa đổi và màu còn thiếu lên đầu phản hồi của tool để owner có thể hỏi thẳng khách chọn trắng hay be. Kiểm lại với J1, P08 và checkout. Đo riêng tình huống khách hỏi hỗ trợ giá để biết nhánh thương lượng có hoạt động.
3. **S04.** Trả lời các màu đã xác nhận. Chỉ chốt danh sách đầy đủ khi nguồn xác nhận phạm vi đó. Ví dụ, “Có trắng và be chị nhé” giữ được thông tin có ích.

Về giọng bán hàng, J2 đọc lại số đo, S15 hỏi tiếp sau khi khách cảm ơn, và S09 thêm “độ bền tốt nhất” vào hướng dẫn giặt. Đây là các điểm cần theo dõi riêng với lỗi làm khách mất cả câu trả lời.

## Số lượt gọi và giới hạn bằng chứng

- Native ghi **59 attempt**, **58 HTTP** gồm 41 owner và 17 verifier. 58 yêu cầu đã gửi đều thành công. P09 có một attempt bị chặn trước HTTP, được giữ trong thống kê. Timeout 0, retry 0.
- Kết quả native gồm 15 câu đủ điều kiện gửi do model, 5 câu do code, 5 handoff im lặng và 2 không gửi sau handoff. Một trong năm handoff là checkout thành công. Tất cả được đo trong hệ thống thử nghiệm.
- Verifier native p50 **7,779 giây**, p95 **20,434 giây** ở provider. Cửa sổ adapter p50 **8,595 giây**, p95 **21,713 giây**. Đây là hai số đo của verifier, chưa đo chênh lệch toàn lượt so với chạy không verifier.
- Native có 615.920 token vào và 40.649 token ra trên 58 yêu cầu có số liệu. Nhóm verifier có 64.303 token vào và 1.347 token ra. Provider không công bố chi phí của các request này.
- Audit xác nhận hash các request đã dựng, cách ly nhãn evaluator, giới hạn lượt tool/model, exact draft cho 15 câu model đủ điều kiện gửi và quyền riêng tư của thông tin checkout giả lập. Hai database dùng thử đã dọn xong. [Audit](INTEGRITY.json) · [Metrics](METRICS.json)

Nhánh W2 ghi lựa chọn rồi lấy giá đã chạy ở cấp tool trong P09. Nhánh ghi thương lượng rồi lấy giá chưa chạy. Nhánh ảnh yêu cầu bằng chứng và ảnh trùng của S16 chưa chạy qua model. Kịch bản đối chứng câu trả lời ngắn sau yêu cầu mua rõ chưa được bổ sung vào bộ 13 ca giữ nguyên để đối chiếu. Reviewer độc lập duyệt đầu vào cả hai nhóm và đối chiếu bước đầu các ca lỗi chính sau khi chạy. Quota hết giữa review kết quả, nên đánh giá 9/12 là tự review toàn bộ. Phase C chưa có kết quả qualification.
