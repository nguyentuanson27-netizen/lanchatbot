# Finding sau primary review — offer-read replay

Primary được lưu ở `2ece05f2`, sau raw `9bf1eeda`, trước khi đọc nháp bị chặn/verdict chi tiết. Cả sáu actual outcomes: 2 USABLE / 2 NEEDS_EDIT / 2 fallback. Không sửa prompt, source, ngưỡng hoặc gọi thêm model sau kết quả.

## Hai fallback

### Ca cũ1 — lên sân khấu, lo thấy bên trong

Nháp bị chặn:

> Áo làm bằng chất liệu tơ Hàn thêu có độ mỏng nhẹ và bay bổng, nên dưới ánh đèn sân khấu rọi mạnh có thể hơi thấu mờ bên trong chị ạ.
>
> Để hoàn toàn yên tâm, mình có thể mặc kèm một lớp áo lót hoặc inner gọn gàng bên trong, hoặc nếu chị muốn đổi sang mẫu vải dày dặn kín đáo hơn thì báo em để em gợi ý thêm nhé!

Verifier FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447. Context có mô tả tơ thêu, nhẹ/bay/thoáng, không có evidence độ xuyên hoặc lớp lót dưới đèn sân khấu. Owner suy từ chất liệu sang khả năng thấu mờ và trấn an hoàn toàn yên tâm bằng một lớp bên trong chưa được xác minh. Có nêu hướng đổi mẫu nhưng chưa tìm được món thay cụ thể. Cần phân biệt hai lỗi với nhau: vượt căn cứ protected-language và tư vấn chưa đưa ra lựa chọn thực tế. Verdict chỉ ghi kind/ref; không biết chính xác verifier đã dựa vào mệnh đề nào. Không quy mọi lời dự đoán hoặc nhận xét thẩm mỹ thành lỗi, cũng không coi việc nới verifier là đã sửa được owner.

### Ca cũ9 — ngoài trời lâu, khách dễ nóng

Nháp bị chặn:

> Chị yên tâm nha, bộ này làm từ tơ Hàn thêu và ren tơ Hàn nên chất vải rất mềm, thoáng và có độ bay tự nhiên, không bị bí nóng đâu ạ. Form dáng nhẹ nhàng nên mình đứng ngoài trời lâu vẫn thoải mái và dễ chịu.

Verifier FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447. Owner giữ lời khuyên cũ và biến mô tả thoáng/nhẹ thành kết luận không bí nóng và thoải mái ngoài trời lâu cho đúng khách đang lo nóng. Không có fit hoặc evidence hoàn cảnh đó. Đây không phải yêu cầu kiểm nghiệm riêng cho mọi nhận định tư vấn; vấn đề là mức khẳng định vượt thông tin hiện có. Exact trigger trong hai câu vẫn không được verdict giải thích. Actual customer outcome là static fallback, không phải nháp này.

## Hai câu được gửi nhưng còn cần sửa

- Ca cũ7: trả đúng799k và có lập trường hợp tiệc ban ngày, nhưng lý do là một đoạn khen chất vải và vẻ bay bổng/tinh tế/sang trọng; chưa gỡ lo ren nhiều bằng một lựa chọn/cách phối thực dụng. Việc nhắc ngân sách không tự là lỗi; toàn đoạn bị yếu vì thiếu lý do giúp khách quyết định. Câu hỏi kiểm tra size cũng chưa có đường thực hiện được chứng minh trong B1: request thực tế chỉ có search_products/read_product/read_policy, không recommend_size, không chart/fit claim. Không dùng điểm này để đòi một CTA khác cho mọi câu.
- Ca cũ15: có ý tưởng mua món lẻ phối đồ trơn, nhưng vẫn đưa cả áo lẫn váy để khách chọn rồi lại trấn an cả set hoàn toàn yên tâm. Không chọn rõ hướng mua theo người quen đồ trơn. Nhận định phong cách và lời giới thiệu món lẻ có cơ sở vẫn hợp lệ; phần cần sửa là quyết định và cách diễn đạt cả lượt, không phải thiếu keyword hay kiểm nghiệm thẩm mỹ.

## Điều đã quan sát được và phần chưa thể kết luận

- Ca cũ6 đi đúng search -> một read_product không offerType -> final, 3owner/2tool rounds/2calls/1verifier. Exact code lookup không dùng embedding. Cùng read trả AO929k và COMPOSITE1.065k; model báo cả hai đúng scope, không xin thêm tool dưới NONE. Đây là evidence trực tiếp rằng giao diện mới được dùng như thiết kế ở ca này; N1 không chứng minh loại hết lỗi tool hoặc quan hệ nhân quả cho cả population.
- Ca cũ11 giữ được phần vải/dáng và không bịa giá/tồn hoặc nói shop chỉ bán set. Chấp nhận partial answer với cùng tiêu chí đã dùng ở context-fix-run; vẫn ghi naturalness1 vì giống catalog và nói về hệ thống/xin thông cảm. POS_UNAVAILABLE là fault control đã đăng ký, không phải outage nguồn thật. Không lấy kết quả này chứng minh source đã được bổ sung hoặc workflow mua hoàn tất.
- So với sáu ca ở prose-boundary run0/2/4, lượt này2/2/2. Nhưng đã rollback prompt/projection và sửa tool giữa các source, nguồn được đọc live và mỗi ca một lần: chưa cô lập đóng góp từng thay đổi, chưa chứng minh cải thiện ổn định. Không cộng các ca PASS từ nhiều phiên bản.
- Giá/tồn và danh sách món lẻ nay đủ trong một read; hai fallback chính không còn là thiếu giá. Attributes vẫn null trong fresh source readback. Đường publisher/consumer đã có nhưng dữ liệu registry chưa có trong index đo được; việc publish là dependency chưa thực hiện. UNKNOWN về độ kín và phản ứng khi ở ngoài trời lâu không được tự điền bằng dữ liệu registry đã capture.

Giữ kết quả này và STOP theo scope. Không sửa regex/template, verifier hoặc prompt để cứu điểm và không chạy thêm generation. Recommendation sales/live STOP; A OWNER_BYPASS; checkout nguồn thật vẫn BLOCKED; 18B1+7stateful còn lại NOT_RUN, không phải đã được đánh giá.
