# Phase C — triển khai W0–W4, 2026-11-15

Implementation base `d786159a907b859629f4a93ef08514a5d324b891`. Kế hoạch Rev. 2 có SHA-256 `f200cf4dfe0c43e5a9c2befc25e0cd1a01caf7a2423af7f1c6e23d7ab050354a`. Baseline hành trình J2 khóa tại `7cdd2e80b0ebda08f0176082ea09885a63a76fe2`. [Kế hoạch](../../c3-phase-c-sales-context-contract-plan-20261115.md) · [Nguồn W0](SOURCE.md).

## Các thay đổi

- W1 khôi phục cách trả lời gần với chat bán hàng và dùng lại dữ kiện khách đã cung cấp khi có ích cho quyết định. Prompt riêng của W1 nằm ở `b02e2d3c` để đo riêng với hướng dẫn gọi tool của W3.
- W2 đưa phần mô tả và các điều kiện của nguồn về cùng sản phẩm/offer đã xác nhận, giữ nội dung gốc trong cùng request. Tool result cũ chỉ được chiếu lại khi có bằng chứng cùng nguồn. Lượt kiểm tra vẫn sử dụng exact final draft.
- W3 ghi yêu cầu hỗ trợ trước khi có giỏ. Code chỉ xét hỗ trợ sau khi đối chiếu đúng yêu cầu cũ, đúng giỏ và receipt tạo giỏ. PostgreSQL áp dụng một lần, kể cả khi request được gửi lại. Migration 0036 mở rộng danh sách loại lệnh trong bảng hiện hành.
- W4 chuẩn bị 12 cặp replay với prompt hoặc projection thay đổi riêng. J2 đối chứng 5 hành trình, candidate 25 lần thử và controls 4 lần thử. Mỗi control chạy một lần theo scope cố định. Config owner-decision vẫn giữ N=5. Native cần cùng world, replay PASS và registration đã review. Chấm mù whole-turn trên actual terminal, kể cả handoff và no-send.

## Kết quả kiểm

- Worker focused Vitest 495 PASS; business-tools protected claims/reply assembler 22 PASS; contracts sales-cycle 14 PASS; chat-runtime sales-cycle 32 PASS; database 65 PASS.
- Worker typecheck, build, lint PASS. Touched package build/typecheck PASS.
- PostgreSQL cô lập chạy hai lần và đều PASS cho luồng ghi pending → tạo giỏ → kích hoạt đúng một lần → gọi lặp. Hai lần dùng DB tạm và đã drop. Lệnh dùng `isolated-integration.mjs <out> COD --check-prefix 'C pending support records before cart'` qua wrapper local cấp kết nối nguồn vào process. Provider 0.
- Chuẩn bị replay offline từ capture lịch sử có 12/12 cặp đúng hai arm khác nhau, 0 cặp thiếu nguồn. Capture này phục vụ đối chứng đã khóa. Native vẫn cần capture và readback còn hiệu lực tại thời điểm chạy.
- Node focused 49 PASS. Test W4 kiểm đường bind source với fixture, kiểm quyết định N=5 và validate đủ bốn slot controls N=1. Collector giữ đủ mẫu số khi queue chặn. Kiểm này thực thi không có provider.
- Bộ `test:evals` đầy đủ có sáu lỗi cũng có trong log baseline `c3-sales-repair-5dfde94b-evals-final.log`: một historical V1 bundle hash, một owner comparison, hai task-path assertions và hai tool-output diagnostics. Assertion mới cho schema thương lượng đã được cập nhật và chạy PASS riêng.

Review độc lập đã xác nhận APPROVE trên executable savepoint `baf8a0e4847b4f53d78c34ac854538130ac54d91`. Reviewer chạy lại 8/8 test offline và xác nhận các file code đúng commit đã review.

## Đăng ký chuyến chạy sau khi có yêu cầu model

Các file seed, world, input review và log thô được lưu ngoài worktree. Trước mỗi chuyến chạy, khóa commit, manifest, cấu hình, input và công cụ chấm độc lập.

1. Dùng `sales-context-screen.mjs prepare` với registration 5dfde94b, năm journal lặp theo thứ tự, cấu hình ads control, journal mở đầu và seed. Chạy `judge-packet` và `score` trên kết quả replay đã khóa. Dùng `sales-context-judge.mjs identity REPLAY` để ghi hash rubric/schema trước khi chạy, và `run REPLAY <packet> <packetHash> <out>` một lần cho packet đã khóa.
2. Khi replay PASS, dùng `sales-context-screen.mjs corpus` với corpus lịch sử theo scope chính và `SALES_CONTEXT_CONTROL_CASES_20261115.json`. Dùng native world vừa capture, lệnh `isolated-integration.mjs <out> COD --phase-c-initial-world <world>` để lấy initial state PostgreSQL cho cả hai worktree. Baseline dùng bản 13 ca `TOOL_CONTRACT_SCREEN_20261109` trên commit 7cdd2e80, dispatch chỉ chọn 5 slot J2.
3. Dùng `sales-context-registration.mjs prepare --kind <BASELINE_J2|CANDIDATE|CONTROLS> --root <source> --template <approvedConfigOrRegistration> --draft <corpus> --world <world> --bindings <reviewedSourceBindings> --initial <initial> --seed <privateSeedJson> --out <pending>`. Ba job dùng chung một `{seed}`. File bindings dùng schema của `bind-corpus.mjs`: mỗi ca có initial codes, danh mục source reads và version 3 readiness cho giá, biến thể, policy hay ảnh đúng phạm vi. Review nguồn/initial state và hash toàn bộ pending trước khi chạy `seal --kind <job> --root <source> --pending <pending> --world <world> --review <review> --out <registration>`.
4. Dùng `sales-context-screen.mjs native-jobs` để khóa campaign, sau đó `native-dispatch` theo đúng job, seal và slot. Giữ journal, file evidence từng turn và DB-drop report. Dùng `native-judge-packet`, ghi danh tính judge bằng `identity NATIVE`, chạy `run NATIVE <packet> <packetHash> <out>` một lần rồi dùng `native-score`. Giữ lại cả lần thiếu kết quả và báo nguyên nhân dừng.

Phase C hiện chưa có điểm chất lượng của W0–W4. 0 request model của gói sửa này, 0 live send. Test W3 chứng minh luồng khi caller dùng đúng công cụ. Chuyến native sẽ đo owner có tự chọn đúng luồng và giúp khách mua được hay không.
