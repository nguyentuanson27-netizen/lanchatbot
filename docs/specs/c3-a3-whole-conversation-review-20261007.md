# A3: review toàn hội thoại và hiệu quả tư vấn

Owner phản hồi ngày2026-10-07: cách bóc tách cụm từ để cho điểm có thể thưởng cho câu đủ keyword nhưng lủng củng, thiếu hợp lý. Phản hồi này sửa cách review cho công việc tiếp theo; không cấp quyền chạy provider hoặc thay kết quả đã freeze.

## Lỗi của cách review trước

Các bảng trước có nhận xét cả lượt, nhưng phần biện minh điểm số lại quá dễ: trích “Em chọn cho chị” cho decisionSupport, nhắc số đo cho contextCorrectionUse, nhắc ngân sách cho coherence. Các đoạn đó không đủ chứng minh kết luận tương ứng. Đây là lỗi của phương pháp chấm, không chỉ lỗi trình bày bảng.

- Có lời mở đầu chọn giúp không chứng minh phương án đáng chọn hay giúp khách quyết định.
- Nhắc lại số đo không chứng minh dùng đúng số mới, đúng mẫu, đúng kết quả code hoặc tránh hỏi lại.
- Giá nằm trong ngân sách chỉ là một quan hệ đúng; toàn câu vẫn có thể tự mâu thuẫn, lan man hoặc không giải quyết băn khoăn.
- Liệt kê thuộc tính không chứng minh hữu ích; thuộc tính phải giải thích được phương án trong tình huống mua cụ thể.
- Có câu hỏi kết không chứng minh bước tiếp hữu ích; không có câu hỏi cũng không tự động là thiếu bước tiếp.

Lối chấm này có thể thưởng cho việc nhồi thông tin và khiến chỉnh prompt hướng tới làm đủ ô. Các số tổng kết trước, kể cả16/20 của Round6, được giữ như self-assessment lịch sử nhưng không dùng làm bằng chứng chất lượng được owner chấp nhận hay cải thiện đã được chứng minh. Checkpoint A vẫnSTOP. Không sửa âm thầm điểm/nhãn/raw reply hoặc hồi tố các ngưỡng.

## Đơn vị đánh giá và thứ tự review mới

**Đơn vị chấm là kết quả khách thực sự nhận trong toàn bộ lịch sử.** Đọc lịch sử, tin mới, dữ kiện được phép và toàn bộ terminal reply/fallback/handoff/no-send. Không đọc một cụm từ độc lập để suy ra chất lượng.

1. **Hiểu tình huống mua:** khách đang muốn đạt điều gì, đã thống nhất điều gì, còn vướng gì, vừa sửa điều gì? Đối chiếu với hội thoại thực tế; nhãn/rubric do tác giả ca viết cũng có thể sai và không thay thế việc đọc.
2. **Đánh giá toàn lời tư vấn:** phương án có phù hợp và đủ cơ sở không; lý do có giúp giải quyết đúng điểm vướng không; các ý có ăn khớp và nối tiếp lịch sử không; lượng thông tin/giọng điệu có giống một nhân viên đang tư vấn không?
3. **Đánh giá tác động với khách:** đọc xong khách hiểu rõ hơn, tin tưởng và dễ chọn hàng hơn ở điểm nào? Điều gì vẫn chưa được giải quyết? Bước tiếp có thực sự cần, đúng lúc và làm được không? Giá/tồn đơn giản, lựa chọn đã đủ hoặc lời dừng có thể hoàn tất mà không hỏi thêm.
4. **Kết luận cả lượt rồi mới chẩn đoán:** nêu kết luận có thể sử dụng/đạt hoặc chưa đạt theo chuẩn đã freeze cho lần review đó, với lý do quyết định và mức chắc chắn. Khi chỉ đang audit phương pháp, không tạo một PASS mới cho lần provider đã chạy. Nếu lời tư vấn nhìn toàn thể vẫn lủng củng hoặc thiếu hợp lý, việc có đủ thông tin riêng lẻ không cứu được nó.

Mười chiều hiện có giúp người review kiểm tra mình bỏ sót điều gì. Chúng không phải mười nhiệm vụ phải nhét vào lời bot. Khi một vòng sau cần số0/1/2 để báo cáo, ghi số sau nhận xét toàn lượt, giải thích bằng quan hệ giữa lịch sử → phương án/lý do → tác động với khách. Không suy điểm từ từ khóa hoặc tự động cho2 vì tìm được một đoạn tương ứng. Quy trình/ngưỡng mới phải được freeze trước provider result, không áp hồi tố để cứu vòng cũ.

## Evidence và hình thức báo cáo

Mỗi hội thoại được trình bày liền mạch:

- Lịch sử liên quan, tin mới và exact terminal outcome.
- Nhu cầu/điểm vướng còn lại của khách ở lượt này.
- Nhận xét toàn lời tư vấn: phương án, lập luận, dùng lịch sử, điều còn thiếu, độ tự nhiên và ảnh hưởng tới quyết định mua.
- Kết luận toàn lượt cùng lý do quyết định; điểm các chiều chỉ là phần chẩn đoán bổ sung nếu protocol của lần đó yêu cầu.

Trích dẫn là dẫn chứng cho một nhận xét đã có ngữ cảnh. Chọn đủ câu/đoạn để người đọc kiểm tra lập luận, không ép mỗi chiều phải có một keyword riêng. Một nhận xét về sự lặp lại có thể phải đối chiếu câu cũ với câu mới; nhận xét thiếu thông tin cần nói rõ phần vắng mặt. Không lấy reference reply làm mẫu câu phải giống, không thưởng độ dài hoặc số lượng facts. Thay cách diễn đạt mà vẫn giữ hiệu quả tư vấn không được làm điểm thay đổi chỉ vì keyword biến mất.

Giữ an toàn factual/action và code authority. VerifierPASS không chứng minh bán hàng hay. Ngược lại, câu nghe thuyết phục không làm facts/quyền lợi/hành động thiếu căn cứ thành hợp lệ. Không thêm một model judge online, parser, keyword scorer, tầng completeness hoặc repair loop. Đây là sửa công việc review offline của primary agent, không thêm gate/runtime.

## Đọc lại ví dụ owner chỉ ra

Trong [ca Round6 workday-comfort](../../apps/worker/evals/single-agent-semantic-verifier/round-6/A3_CONVERSATIONS.md), khách cần đồ đi làm trong850k, ngồi nhiều và không thích ôm eo; họ đã đưa số đo và nhờ chọn mẫu/size. Lời đáp chọn ST411 navyM749k, đối chiếu quần suông/lưng chun với váy eo cố định, rồi xác nhận size và tồn.

**Nhận xét toàn lượt:** phương án và size có cơ sở, lời khuyên bám ưu tiên dáng và giúp thu hẹp lựa chọn. Tuy nhiên câu “không thích eo cố định” đã đổi cách nói của khách từ “không thích đồ ôm eo”; lý do cần giữ đúng ưu tiên đó thay vì coi mọi eo cố định đều không phù hợp. Ba đoạn lặp ngân sách, toàn bộ số đo và xác nhận khiến lời tư vấn dài hơn cần thiết; câu về màu navy khá chung chung. Có hướng tư vấn sử dụng được, nhưng bảng keyword không đủ biện minh mọi chiều đều2 hoặc chất lượng hoàn hảo. Muốn kết luận formal đạt/chưa đạt phải dùng chuẩn review toàn lượt đã thống nhất; ví dụ này là audit nhận xét, không rescore hay sửa kết quả frozen.

Điểm cần đánh giá là chất lượng kết nối giữa nhu cầu → lựa chọn → lý do → quyết định của khách. Cụm “Em chọn cho chị” tự nó không chứng minh chuỗi đó.

## Phạm vi áp dụng

Tài liệu này là hướng review tiếp theo sau phản hồi owner, thay yêu cầu biện minh bằng một exact phrase cho từng chiều. Các vòng đã freeze giữ nguyên nguồn/input/output/điểm để audit, kèm giới hạn phương pháp này. Chưa chấm lại toàn bộ20ca theo protocol mới; không có thống kê chất lượng mới. Round7 A2FAIL/A3NOT_RUN không thay đổi; chưa chạy model, chưa sửa manifest/scorer/runtime. Một vòng provider tiếp theo vẫn cần kế hoạch/freeze riêng và A2PASS trướcA3.
