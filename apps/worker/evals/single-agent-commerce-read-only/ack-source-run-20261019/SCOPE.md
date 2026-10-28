# ACK / unavailable-source wording run — 2026-10-19

Owner yêu cầu chạy model sau prompt fix c1251ae6. Giữ Gemini3.5FlashLite HIGH owner / GPT6.1Sol high verifier, credential route/generation config/rubric cơ bản hiện hành. Prompt9435bytes/hash81e187d3; không đổi runtime/verifier/models/cases. Copy exact runner/cases từ sales-context-run để đọc sibling registration mới.

16 slots N1:8stateful (gồm private checkout và human control),4integrated B1,4advice từ capture mới tương ứng. Tối đa52generation requests, retry0; mọi lỗi/fallback/blocked giữ denominator. Không đổi prompt/source giữa run, không mẫu bù hoặc vòng tự động. Commit sạch → capture runtime HEAD không ghi ngược vào inputs → preflight/source readback → generation. Không reuse kết quả cũ làm attempt mới.

Đọc whole actual outcomes/public state rồi khóa primary trước rejected/verdict diagnosis. Review bổ sung trước run: xác nhận hai số đo vừa sửa có ích không phải fact dumping; correction dùng được có thể chỉ cần polish. Partial-source cố ý mất POS nên không chấm thiếu giá/tồn thành lỗi hiểu nhu cầu; chấm cách nói với khách riêng, không buộc bịa quyền bán lẻ hoặc hứa handoff khi không có capability. Không đếm từ hoặc yêu cầu theo câu mẫu. Giữ primary/counts lịch sử, nêu rõ nếu chênh nhãn do clarification. So sánh descriptive vì live nguồn/sampling có thể khác; advice phụ thuộc integrated capture.

Delivery capture only/send disabled; private PII không đi vào model, database test phải drop. Lưu request/usage/latency và raw public artifacts. Không deploy/live send/POS order, không fullA2/A3, không tự fix/chạy tiếp. A OWNER_BYPASS, B chưa live GO.
