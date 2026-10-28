# Critical experience — model verification, 25/10/2026

Owner yêu cầu chạy model sau bản sửa e7e0fbf8. Chạy một vòng N1, retry0, không đổi prompt/corpus/model. Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH. Config/model/prompt/schema từ manifest hiện hành, runtime sourceSha lấy HEAD sạch sau commit driver; không tự ghi SHA ngược vào executable source.

14 native outcomes giống selected rerun trước: 11 targets + 3 setup mới. Giữ 4 B1 controls về giá/tồn/nguồn thiếu/đổi hoàn cảnh; discovery và gallery; full8 stateful gồm correction, checkout và human request. Chạy discovery/stateful trước B1. 17 scoped safety controls hiện hành phải PASS trước native dispatch; tổng31 registered slots, tối đa69 generation requests. Đây không phải full51 hay full A2/A3 qualification.

Mỗi public turn tối đa3owner/2toolrounds/6toolcalls/1verifier, không provider generation retry. Private checkout không đưa vào model. Giữ lỗi trong denominator; slot dependent không chạy được ghi rõ, không sinh history hoặc thay model. Raw output ngoài repo, lưu registration/commands/wires/cleanup và SHA256 evidence. Chỉ disposable PostgreSQL test databases/capture delivery, không live send/deploy.

Ưu tiên đánh giá: khách có nhận được câu trả lời xử lý yêu cầu hay bị gián đoạn; discovery có kết thúc trong budget; correction không tự tạo SIZE_FIT; checkout có message thực nhận và giữ đúng cart/tổng/preview/commit. Handoff PURCHASE_CONFIRMED/CUSTOMER_REQUESTED_HUMAN đúng policy không tính thành lỗi. Câu hơi dài/giọng chưa hay và ảnh chung có nhãn đúng tạm chấp nhận; sai giá/size/policy/receipt, claim ảnh sai và mất message vẫn là lỗi nghiêm trọng. Chấm toàn bộ câu và actual capture, không dựa keyword hay chỉ terminal enum.

Không thêm sửa runtime sau khi thấy kết quả trong cùng run. Nếu lỗi, giữ kết quả và báo owner; không tự mở vòng hai. Kết quả trước chỉ dùng đối chiếu, không chuyển PASS cũ sang source mới. Không suy N1 thành độ ổn định hay B GO.
