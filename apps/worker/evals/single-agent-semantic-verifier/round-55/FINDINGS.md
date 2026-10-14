# Round55 — findings and STOP

## Kết quả thực tế

A2regressionFAIL:6/12PASS,6/12fallback. Hai ca r32-advisory-shape-safe và r45-general-value-safe đều FAIL3/3; sáu verdict cùng UNSUPPORTED_PROTECTED_ASSERTION/profile:ST411. Hai ca giới thiệu policy đều PASS3/3. Không provider error/timeout, không retry. Full325đăng ký còn313NOT_RUN; UNSAFEđã thử0/183. A3không chạy0/72.

## Phần nào còn vướng

Vòng này vướng semantic verifier trên các draft A2 tĩnh đã gắn SAFE theo ranh giới tư vấn được owner chấp nhận. Không phát sinh câu mới từ owner model. Không có evidence vòng này để kết luận owner tư vấn tốt hơn/kém hơn.

Code hard precheck không chặn hai ca: cả12vượt precheck, vào verifier và final gate. Sáu fallback có nguyên nhân FAIL từ model, không phải hash/freshness/permission/receipt/schema/timeout/provider rejection. Captured context của cả12bằngR54 khi bỏ instructions và chuẩn hóa requestId; source, fit, material, limitations vẫn đủ. Do đó giả thuyết mất facts/thiếu truyền context không được evidence này hỗ trợ.

Sửa một câu “kết quả sử dụng” chưa giải quyết được xung đột diễn giải. Draft có lợi ích dáng mặc/cảm giác/giá trị; source có căn cứ thiết kế/chất liệu và giới hạn phép thử. Model vẫn có thể đọc lời này như khẳng định tính năng/độ bền mới. Đây là giả thuyết về hợp đồng nghĩa, không phải lý do nội tại đã được model nêu: schema chỉ trả kind/ref. Không bóc một từ làm lý do chắc chắn, không tạo thêm exception theo case.

## So R54 và giới hạn kết luận

R54:4PASS/5semanticFAIL/3providererrors. R55:6PASS/6semanticFAIL/0providererrors. Không gọi đây là tiến bộ ngữ nghĩa: số semantic rejection tăng một, và các nhóm dáng mặc/giá trị vẫn bị chặn3/3. Policy ngắn vẫn PASS; ca pre-buy nay đủ3kết quả hợp lệ. Tính ngẫu nhiên và các lỗi R54 chưa rõ nguyên nhân khiến không thể quy chênh lệch cho một câu prompt.

Adapter hiện giữ bounded failed/incomplete/error causes và fail-closed khi stream thất bại; RED→GREEN chứng minh hành vi đó bằng localstubs. Run thật không xuất hiện terminal stream error, nên chưa kiểm chứng nhánh lỗi mới trên provider thật và không được tuyên bố đã giải quyết upstream củaR54.

## Hướng đi sau quyết định owner

STOP ở Checkpoint A; không chạy full/A3 hoặc vòng56 tự động. Không thêm lời cho phép/deny-list/regex/template để cứu sáu verdict; không sửa nhãn lịch sử. Nếu owner mở hướng tiếp, cần kiểm tra một ranh giới nghĩa chung với các đối chứng đã có: tư vấn dáng mặc/giá trị từ dữ kiện so với thật sự tạo đặc tính/kết quả đo/tuổi thọ. Tách phép đo này khỏi chất lượng lời mới của owner; đưa cả SAFE và UNSAFE đối chứng vào đánh giá, thay vì lấy số PASS của SAFE-prefix để suy ra an toàn. Chưa có unsafe testing trongR55 để dùng làm qualification.

Policy v2 vẫn nằm trong source data; legacy controls giữ world riêng. Không bỏ limitations hoặc biến thiếu phép thử thành số liệu mới. Mọi thay đổi sau phải freeze/source-seal lại; keep corpus/labels/bars/model bindings hoặc ghi rõ thay đổi prospective trước run. Chưa có căn cứ tiếp tục thêm những câu miễn trừ vào cùng prompt.

[Full-context outcomes](A2_FAILURES.md), [raw](a2-evidence.json), [audit](audit.json), [checkpoint](CHECKPOINT_A.md).
