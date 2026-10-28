# Current prompt rerun — 2026-10-19

Owner yêu cầu một vòng mới với prompt hiện hành. Owner hiện tại vẫn là nguyên bản Gemini đầy đủ; verifier giữ ranh giới tư vấn định tính đã chốt. Giữ exact prompt/model/config/runtime/corpus/budget/rubric của vòng gemini-prompt-once-20261019, mỗi population một lần:8stateful,4integrated B1,4captured advice. Tổng16slots, tối đa52generation requests, retry0. Đây không phải full24B1 hoặc fullA2/A3.

Reuse nguyên runner và frozen inputs của vòng trước sau khi so deep-equal với active corpus/hash hiện tại. Không copy/sửa runner cũ hoặc tạo cơ chế mới; REGISTRATION.json mới ghi đường dẫn/hashes đầu vào được reuse. Source SHA chụp tại runtime sau clean commit, chỉ lưu vào output mới. Preflight/source readback rồi mới provider. Output directory mới hoàn toàn; không ghi đè evidence lịch sử.

Giữ cả lỗi/fallback/blocked trong denominator, không generation retry, đổi model, thêm mẫu bù hoặc sửa giữa vòng. Context của advice phải từ đúng lượt integrated mới. Đọc toàn bộ actual outcomes và public state, khóa primary trước rejected draft/verdict diagnosis. Một mẫu chỉ là quan sát; so sánh với run trước mang tính mô tả vì live sources/sampling có thể đổi. Known context limit và các finding cũ giữ để kiểm lại, không tự fix từ yêu cầu chỉ chạy.

Không sửa runtime/prompt hoặc tự mở vòng tiếp. A vẫn OWNER_BYPASS, chưa GO toàn bộ B. Delivery chỉ capture; private checkout không đưa PII vào model, database thử nghiệm được drop. Không deploy/live send.
