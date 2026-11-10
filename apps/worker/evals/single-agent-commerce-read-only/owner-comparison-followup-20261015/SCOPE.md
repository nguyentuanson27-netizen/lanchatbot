# Hai owner sau sửa cách nhắn — đăng ký trước provider

Owner yêu cầu sửa rồi chạy lại cả hai model để so sánh. Giữ surface `POST_READ_OWNER_DIAGNOSTIC`: code đọc nguồn shop thật, model viết đúng tin khách đọc; không đánh đồng với Sol tự gọi tool hoặc hoàn thành B1. Tiếp tục trên branch Phase B / draft PR391; Checkpoint A vẫn OWNER_BYPASS, không mở lại qualification.

## Thay đổi và những ranh giới giữ nguyên

Chỉ sửa prompt owner dùng chung: đặt cách nhắn ngay sau vai trò; dùng quy tắc kiểm chứng để quyết định câu trả lời, không kể từng bước kiểm tra; dùng thông tin khách để xét thay vì đọc lại từng điều đã xác nhận; giữ lý do thật sự giúp chọn và phần chưa rõ ảnh hưởng đến quyết định. Giữ các ràng buộc dữ kiện, unknown-property, fit, policy/order eligibility, tool budget, state, permission và receipts. Không thêm ví dụ theo ca, thông số/policy shop, từ khóa bắt buộc hoặc khuôn số câu. Runner chỉ thêm lựa chọn file đăng ký mới, tái dùng toàn bộ dispatcher/projection/provider/gate; không sửa manifest hoặc raw của run trước.

Context projection, hai câu hỏi/lịch sử từ cases.b1.json, nguồn LIVE, model/config, verifier/prompt/schema, fallback, bounds và terminal map giữ nguyên. Không thêm text.verbosity trong phép thử này, để thay đổi có chủ đích chỉ là owner prompt. Không thay nguồn policy hay tạo dữ liệu/claim độ kín còn thiếu. Mọi provider API dùng adapter hiện có; tham chiếu OpenAI Docs đã kiểm tra cho đúng model và hướng dẫn prompt ngắn/rõ, không buộc trình bày từng bước suy luận. Không thêm role, rewrite, regex/parser, repair/reverify, retry, production wiring hoặc live send.

## Population và request accounting

- Hai ca không đổi: `b1-changed-occasion` và `b1-current-policy`, mỗi ca ba lần/mỗi model: 12 slot, tối đa24 generation requests.
- Gemini 3.5 Flash Lite High / Vertex và GPT-6.1 Sol Low / Codex login hiện có; verifier GPT-6.1 Sol High. Exact configuration/hashes trong manifest.json. Alias/version không phải dated immutable snapshot; lưu returned modelVersion.
- Interleave giữ như trước: mỗi repetition, mỗi ca, Gemini rồi Sol. Mỗi owner tối đa một generation và mỗi final draft sống hard precheck phải qua đúng một verifier. Không chọn best-of-N/majority, không bỏ lỗi khỏi mẫu hoặc chạy bù.
- Nguồn PostgreSQL policy / Redis POS / Qdrant catalog chỉ đọc. Hai owner nhận cùng instructions và ordered source/history/latest text, có hash per case; source thay đổi gây mismatch được giữ như outcome, không âm thầm thay input.
- Reuse firewall test và audit request thực: caseId, split, expected, required/forbidden behaviors, rubric/scoring và nhãn arm/repetition không vào request. Verifier không sửa câu trả lời.
- Giữ mọi auth/HTTP/stream/timeout failure và request count. Tối đa một upstream/generation, retry0. Không thay model hoặc route khi lỗi.

## Thực hiện và review

RED quan sát cho explicit registration selection -> GREEN tối thiểu; focused comparison/provider/protocol/boundary/protected tests, worker typecheck/build/lint và self-review diff. Commit executable/config và frozen input; clean worktree; capture HEAD vào registration runtime, không ghi SHA ngược vào frozen source; preflight0generation rồi một batch12slot. Source đổi sau seal làm mất run identity.

Commit raw trước khi primary review. Primary đọc toàn lịch sử/latest và ACTUAL TERMINAL CUSTOMER OUTCOME trước khi đọc draft bị chặn/verdict. Review toàn ý, không cộng keyword: lời khuyên có giúp quyết định, đáp ứng câu hỏi, đúng mạch, có bước tiếp theo dùng được và đúng dữ kiện/quyền không. Độ tự nhiên ghi `NATURAL`, `NEEDS_EDIT` hoặc `STATIC_FALLBACK_NOT_COUNSEL`; nêu lý do cho cả đoạn, không coi một từ/câu nhắc fact là lỗi mặc định. Primary chủ quan, biết model; không có independent/human acceptance. Sau primary mới chẩn đoán drafts bị chặn và phân biệt chất lượng câu owner viết với kết quả khách thực nhận. Bất kỳ unsafe eligible quan sát được đều ghi nhận và dừng dispatch còn lại nếu còn; không chạy tiếp một vòng sửa.

Tổng hợp đầy đủ12outcomes, provider counts/errors/timeouts, bindings/firewall, tokens/cost khi expose và latency p50/p95: owner, verifier, added verification/readback, end-to-end bao gồm source preload; không cộng medians để tạo số tổng, không suy token usage thành độ dài lời nhắn. So baseline12slot trước với điều kiện source/context hash đã kiểm tra; source/sampling/provider khác biệt còn lại phải ghi rõ, không quy mọi thay đổi cho prompt.

Không coi kết quả12slot là full A2/A3, full B1, stability/model promotion hay native Sol tools evidence. Lưu hội thoại, findings, prompt diff, commands thực chạy và report; update tasks/draft PR391 rồi dừng để owner xem.
