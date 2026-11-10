# Full Gemini owner prompt — one repetition — 2026-10-19

Owner yêu cầu chạy một vòng với bản tư vấn Gemini đầy đủ trong file đã gửi, mỗi ca một lần. Dùng exact bytes của `gemini-code-1792381971310.txt`, không ghép lại giọng với prompt cũ hoặc sửa thêm nội dung. Bản Gemini verifier không dùng; giữ verifier hiện tại đã chấp nhận tư vấn định tính. Hai snapshot owner nằm trong thư mục này để đối chiếu.

Giữ phạm vi vòng 48 lượt gần nhất, giảm ba lần xuống một: stateful 8 lượt, integrated B1 4 ca và advice replay của cùng 4 ca. Tổng 16 slots, tối đa 52 generation requests, retry 0. Không tự mở full 24 B1, thêm baseline, sửa kết quả rồi chạy tiếp hoặc lấy mẫu bù. Lỗi/fallback/downstream block đều giữ trong denominator. Các generation continuation trong budget tool hiện có không phải lặp một case hay generation retry.

Freeze lại subset từ corpus active: ca đổi hoàn cảnh nay là đi ô tô trước đám cưới/lo nhăn. 23 ca khác giữ nguyên. Bốn ca chọn giữ cùng logical ID với vòng trước; ca đã đổi context không phải cùng world để so điểm nhân quả. Replay dùng context của chính lượt integrated này, không lấy lại capture lịch sử.

Giữ Gemini 3.5 Flash Lite HIGH/Vertex tư vấn, GPT-6.1 Sol HIGH/Codex login verifier; schema, bounds, tools/runtime, source config, policy/fallback và rubric whole-turn giữ hiện tại. Exact identities/hashes trong REGISTRATION.json, source SHA chỉ được ghi tại runtime sau clean commit. Preflight và source readback không gọi generation. Một owner và một verifier, không role/gate/framework mới.

Đọc toàn bộ lời thực nhận trước khi chẩn đoán rejected drafts/verdict. Không chấm từ khóa, không mặc định phải chọn món rẻ nhất hoặc lược mọi thông tin khách. Tách model/code, thiếu nguồn/thiếu khả năng và lời tư vấn. Một mẫu mỗi ca chỉ là quan sát; không kết luận ổn định hoặc chứng nhận an toàn toàn bộ. A vẫn OWNER_BYPASS; chưa có GO toàn bộ B. Delivery chỉ capture, stateful DB thử nghiệm được drop; không deploy hoặc live send.
