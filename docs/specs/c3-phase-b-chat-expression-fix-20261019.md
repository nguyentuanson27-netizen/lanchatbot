# Phase B — findings về diễn đạt và bản sửa prompt

Ngày2026-10-19. Owner yêu cầu tổng hợp finding và fix sau khi xem fallback của sales-decision-run. Phạm vi: owner prompt hiện hành, manifest hash, tài liệu/tasks; không chạy thêm provider trong lượt sửa này. Evidence lịch sử giữ nguyên, A vẫn OWNER_BYPASS/B chưa live GO.

## Findings theo toàn đoạn

| Finding | Evidence và tác động | Sửa tại nơi sở hữu |
| --- | --- | --- |
| Câu tư vấn mang nhịp thuyết trình | Hai changed-occasion replies gửi được mở bằng việc khách đi xe, rồi dẫn lại dưới điều kiện “Nếu…”, tiếp theo mô tả dài và hỏi chốt. Khách đã giao chọn nhưng phải đọc nhiều mới thấy đề xuất. | Thay phần chọn/giọng hiện hữu: trả lời hoặc chọn trực tiếp nhu cầu đã rõ; không đặt lại thành giả định. |
| Chú thích catalog chen giữa lời nói | Draft bị chặn slot3 mở ngoặc sau tên món để liệt kê chất liệu, khiến câu ngắt và có nhịp tài liệu. Đây là evidence của rejected draft, không nhận rằng toàn bộ6actual replies đều có ngoặc. | Đưa đặc điểm cần cho quyết định vào câu giải thích; không chú thích mô tả sau từng tên món. Không cấm ngoặc/danh sách hữu ích trong giá/biến thể/đơn/chính sách. |
| Dẫn nhập và nối vế làm dài câu | “Nếu… em gợi ý…” và vế mô tả→khen→mời mua lặp dù nhu cầu đã rõ. Vấn đề là dụng ý của cả đoạn, không phải từ “nếu/thì/gợi ý” luôn sai. | Hướng dẫn viết ý rõ, tách câu khi đổi ý; không kể cả quá trình cân nhắc. Không blacklist từ, câu mẫu hoặc giới hạn số câu. |
| Lý do thuyết phục vẫn chưa sát băn khoăn | Ba concern replies dùng được theo rubric cũ nhưng tiếp tục mềm/nhẹ/rũ→thanh thoát→vừa ngân sách. Chưa xử lý mạnh cảm giác nhiều trang trí về thị giác. | Giữ tiêu chí chọn từ điều khách còn ngại, đặc điểm thực tế/cách phối/lựa chọn bán; không chuyển mô tả thành đoạn khen. Không ép mua lẻ hoặc phương án rẻ hơn. |
| Đưa nhiều món nhưng chưa dẫn quyết định | Draft slot3 đưa Diễm Hoa/Thanh Vũ rồi hỏi khách thích mẫu nào dù khách nhờ shop chọn. Hai actual replies khác đã chọn ưu tiên được. | Giữ quyền chọn ưu tiên/có điều kiện và hai hướng có lý do khác nhau; không trả một danh sách để khách tự chọn lại. |
| Cam kết công năng vượt nguồn vẫn là lỗi riêng | Slot3 bị chặn vì hứa hai món thay “giữ form đẹp suốt chuyến đi”; actual chỉ fallback. Hai câu tư vấn định tính khác được phép. | Giữ nguyên ranh giới căn cứ và verifier. Sửa giọng không giải quyết hoặc chứng minh đã giải quyết lỗi này; câu ngắn vẫn có thể vượt căn cứ. |

Đánh giá trước đã tập trung quá nhiều vào claim bị chặn. Mục tiêu của bản sửa này là nhịp chat phục vụ mua hàng của cả reply, không chỉ tính đúng của từng mệnh đề. Không sửa primary5USABLE/1fallback hoặc raw/counts cũ theo nhận xét mới; USABLE vẫn có thể kém thuyết phục và chưa tự nhiên.

## Thay đổi đã thực hiện

- Thay2bullet chọn/đổi hoàn cảnh và phần Giọng chat; không nối mục mới vào prompt. Bỏ chỉ dẫn trùng và rút cách diễn đạt của chính prompt. Nói thẳng nhu cầu đã rõ, không dẫn lại thành giả định; đặc điểm cần thiết đi vào lời giải thích, chuyển ý thì tách câu.
- Không cấm tuyệt đối câu điều kiện hoặc ngoặc. Điều kiện chính sách vẫn giữ đủ theo phần Chính sách nguyên trạng; ngoặc phân biệt offer/variant và bảng đơn do code tạo tiếp tục hợp lệ. Không sửa formatter tên hàng vừa có test để loại ngoặc theo hình thức.
- Giữ khả năng nhắc số đo vừa sửa/lựa chọn/giá khi hữu ích; không đếm fact, đặt số câu tối đa, ép mọi tin có CTA hay câu chốt cố định. Nhận định/căn cứ vẫn do owner; không thêm object/router/parser/regex/repair loop/third role.
- Các section Nguồn và công cụ, Tư vấn tự tin đúng căn cứ, Size/state/giao dịch, Chính sách được so byte và không đổi. Models/verifier/fallback/schema/corpus/runtime giữ nguyên. Chỉ manifest owner prompt hash đổi.
- Prompt9.791→9.710bytes (−81). SHA256 `057fcb7a47d69ffce4731a8ee58bb7ecafe36204bd6726128325e7838a813d70`. Không dùng byte cap làm quality gate; self-review bỏ phần lặp từ draft ban đầu dài hơn và sửa cách nói về giả định để không xung đột điều kiện policy.

## Verification và giới hạn

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs` chạy trên prompt cuối:58/58PASS,0fail/skip. Source/safety/size/state/policy sections byte equality PASS; manifest diff chỉ ownerHash PASS; `git diff --check` PASS. Không viết test keyword/câu chữ để nhận tự nhiên; không chạy lại build/typecheck/lint từ thay đổi chỉ prompt/manifest/docs.

Self-review đối chiếu P4 và vòng fix trước: các yêu cầu chung “tự nhiên/chọn ưu tiên” không mới. Delta hiện tại là làm rõ diễn đạt trực tiếp từ nhu cầu đã biết, bỏ chú thích catalog và nối dài; đây là giả thuyết về output style, chưa là provider evidence hoặc chữa nguyên nhân nội bộ của model. Không thay data/context, không thêm ví dụ dùng để fit benchmark. Muốn đánh giá hiệu quả phải freeze run mới; không tái sử dụng evidence sales-decision-run cho hash prompt mới.

Chưa có model run cho bản prompt này. Không nhận đã hết fallback/đã tự nhiên hơn, không mở lại16slots conditional đã dừng của run trước. Scope user hiện tại là tổng hợp và fix.

## Evidence

- [Sáu actual outcomes và whole-turn review](../../apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019/CONVERSATIONS_AND_REVIEW.md).
- [Rejected draft/verdict và actual fallback](../../apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019/FALLBACKS.md).
- [Owner prompt hiện hành](../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt).
