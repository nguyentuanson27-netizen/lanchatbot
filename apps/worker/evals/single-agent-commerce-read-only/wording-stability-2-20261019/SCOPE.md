# Stability round 2/2 — 2026-10-19

Owner yêu cầu thêm hai vòng để kiểm độ ổn định sau ack-source-rerun-20261019. Vòng 2:16 slots N1, max52generation requests/retry0. Tổng hai vòng32slots/max104requests; không tăng corpus. Giữ nguyên prompt9435bytes/hash81e187d3, Gemini3.5FlashLite HIGH owner / GPT6.1Sol high verifier, runtime/config/cases/rubric và supplemental review rule.

Mỗi vòng gồm8stateful (private checkout và human control trong đó),4integrated B1,4advice từ capture mới của chính vòng. Copy exact runner/cases, clean-source commit trước dispatch; chụp runtime HEAD không ghi ngược frozen inputs. Không đổi source/config/prompt giữa hai vòng, không fix sau khi thấy kết quả vòng đầu hoặc majority vote. Preflight/source-check trước generation; mọi lỗi/fallback/blocked giữ denominator, không retry/mẫu bù. Hai vòng chạy lần lượt để giữ source và tài nguyên test cô lập.

Đọc whole actual conversations/public state, khóa primary trước verdict/rejected-draft diagnosis. USABLE vẫn có voice findings; không đếm keyword, ép CTA hoặc lấy thiếu nguồn theo fixture làm lỗi model. Relevant repetition khi xác nhận sửa thông tin được phép. Dùng cùng rubric ở cả hai vòng và baseline, giữ nguyên điểm/raw lịch sử; mọi clarification chỉ nêu như limitation, không đổi điểm sau khi thấy results.

So sánh từng case qua baseline vàhai vòng thêm: terminal, nghiệp vụ/state, lời hứa vượt nguồn, usefulness/choice và giọng. Không kết luận chất lượng từ tổng PASS; không bỏ một unsafe attempt vì hai attempt khác tốt. Live nguồn/sampling có thể khác, advice phụ thuộc integrated capture; đây là stability observation N3 theo case, không causal isolation hoặc safety certification.

Delivery capture only/sendEnabled:false; private PII không vào model, DB test phải drop. Không live order/send/deploy/fullA2A3. Dừng sau đúng hai vòng và báo finding, không tự fix hoặc thêm vòng.
