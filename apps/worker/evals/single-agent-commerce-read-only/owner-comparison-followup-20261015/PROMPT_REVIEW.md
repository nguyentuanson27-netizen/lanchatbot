# Sửa điều model cần nói, giữ điều model cần tuân thủ

Baseline: run695f126d, owner promptd6ba7b6c. Đọc toàn bộ12draft/terminal và prompt gốc: Sol thường nhắc lại hoàn cảnh, nêu thiếu dữ kiện, rồi giải thích thêm tại sao thiếu dữ kiện chưa chứng minh điều ngược lại. Ba reply policy nhắc lại nhiều điều khách vừa xác nhận. Gemini gọn và gần giọng chat hơn nhưng có suy diễn độ kín/giải pháp nội y và cấp quyền đổi khi chưa xét đơn. Verifier không rewrite; các câu dài đã do owner sinh.

## Thay đổi trước run

- Đặt phần nhắn với khách ngay sau vai trò; gom chỉ dẫn giọng cuối prompt vào đây. Nêu rõ quy tắc nguồn/quyền/thao tác dùng để quyết định nội dung, không phải các bước phải giải trình với khách. Lý do liên quan và phần chưa rõ ảnh hưởng quyết định vẫn phải được nói.
- Giữ quyền dẫn một chi tiết khách đã cho khi giúp giải thích lựa chọn hoặc trấn an. Không biến việc nhắc fact thành lỗi keyword, không bắt giấu dữ kiện quan trọng.
- Sửa đoạn áp dụng policy: dùng thông tin đã có để xét; hỏi phần còn thiếu; trả ngay khi hành động bị loại trừ đã quyết định kết quả. Bỏ hướng dẫn dễ hiểu thành đọc lại toàn bộ tình trạng hàng. Vẫn cấm coi nằm trong hạn/vài điều kiện đúng là đã đủ quyền đổi.
- Giữ câu khuyên chọn/không chọn khi nhu cầu thay đổi; thiếu thông tin không bị suy thành khuyết điểm và món thay phải có căn cứ. Không đưa thêm sản phẩm/claim độ kín hoặc policy shop vào prompt.

Giữ nguyên phần kỹ thuật gọi tool, quyền/code authority, unknown-property, scope/binding fit, giá/quote/ETA, state và receipts/privacy. Không thêm examples, blacklist từ, parser hoặc khuôn số câu. Không sửa verifier để cứu owner; không thay câu hỏi, nhãn, context projection, effort, verbosity hoặc fallback.

## Self-review và giới hạn

Prompt10626bytes so với10353bytes (+273, khoảng2.6%); tăng nhỏ để phân biệt kiểm chứng nội bộ với tin khách đọc, không tuyên bố đã rút ngắn prompt. Cách viết mới là giả thuyết cần provider evidence, không phải semantic GREEN từ test chuỗi. Rủi ro cụ thể: hướng dẫn ngắn có thể khiến Gemini bỏ mất điều kiện hoặc Sol vẫn giải trình; kiểm qua toàn bộ12slot và giữ mọi lỗi/fallback. Không cấm mọi lời giải thích hay mọi câu nhắc thông tin khách.

Complexity delta executable: loader3dòng + một CLI string option, tái dùng validation/dispatcher/projection cũ để chọn đăng ký mới mà không ghi đè đăng ký lịch sử. Zero semantic roles/layers, runtime gates/stores, provider API changes hoặc production wiring. Test explicit file selection đã RED vì thiếu export, rồi GREEN7/7; test bảo toàn default registration, chọn file mới, không fallback khi path sai và không mutate historical file. Test captured requests hiện có bảo vệ evaluator firewall và model/effort/no-tools/no-retry.

Tham chiếu official đã mở: [OpenAI reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices) khuyên mục tiêu/ràng buộc/đầu ra rõ và không bắt diễn giải từng bước; [đúng model Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) hỗ trợ Low. Không suy diễn rằng docs chứng minh Sol sẽ tự nhiên hơn hoặc rằng API verbosity đã được xác minh trên route Codex hiện tại.
