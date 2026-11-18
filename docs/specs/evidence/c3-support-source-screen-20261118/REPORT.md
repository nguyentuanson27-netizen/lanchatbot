# Replay P1/P2 — STOP, 18/11/2026

Đã chạy đủ **8 cặp / 16 owner request + 8 judge request**, không lỗi provider và không retry. Sàng lọc **không đạt**: giọng P1/P2 đạt **1/6** input đích, cần ít nhất 5/6; thắng ròng **−3**, cần dương. Hai control bị judge chấm chưa đạt. Theo plan, **không chạy native J4/control** và không tự sửa prompt để chạy tiếp.

[Toàn bộ hội thoại](CONVERSATIONS.md) · [Kết quả hai nhánh](RESULTS.json) · [Gate](SCORE.json) · [Chấm mù](JUDGE_GRADES.json) · [Cấu hình/hash](PROVENANCE.json) · [Kế toán](METRICS.json) · [Kiểm binding](BINDING_AUDIT.json).

## Đã đo gì

Sáu input cố định: J4 lần 1/3 lượt xin hỗ trợ; control hai áo lần 3/4 lượt đầu và lần 3 lượt chọn màu/hỏi tổng. Hai control lấy bản đăng ký đầu của báo giá ads và capture sửa số đo J2 lần 1 trong chương trình giọng trước. Cả hai nhánh dùng prompt hiện hành, Gemini 3.5 Flash Lite High và cấu hình generation giống nhau. Judge offline GPT-6.1 Sol High chấm mù mỗi cặp đúng một lần.

Replay giữ thời điểm, nguồn và lịch sử đã capture; chỉ projection hỗ trợ thay đổi. Không gọi tool, không ghi state/effect, không gọi semantic verifier hoặc final gate, không tạo quyền gửi. Các câu bên dưới là **draft chưa xác minh**, không phải câu đã gửi khách. Không thể từ vòng này kết luận verifier đã để lọt claim.

Hai control không có dữ liệu hỗ trợ cần đổi nên request hai nhánh giống hệt byte. Hai input đích sau khi giỏ đã mở cũng giống hệt byte. Mọi khác biệt output ở bốn cặp này phản ánh lấy mẫu, không phải tác động của P1/P2. Lần thắng duy nhất của P1/P2 nằm ở chính một cặp input giống hệt.

## Kết quả và finding

| Input | Giọng P1/P2 theo judge | Finding khi đọc cả lượt |
| --- | --- | --- |
| J4 lần 1, xin hỗ trợ | Chưa đạt | “hệ thống sẽ tự động áp dụng mức hỗ trợ tốt nhất” biến việc chưa xét thành lời hứa. Judge đánh dấu material regression. |
| J4 lần 3, xin hỗ trợ | Chưa đạt | Chuyển sang hỏi màu, bỏ lửng câu xin hỗ trợ; “để em lên đơn” còn lẫn với khả năng giỏ hiện tại. |
| Hai áo lần 3, mở đầu | Chưa đạt | Giá/tổng đúng nhưng yêu cầu khách thêm món vào giỏ để hệ thống kiểm tra, không hỏi màu còn thiếu. |
| Hai áo lần 4, mở đầu | Chưa đạt | Tiếp tục kể việc ghi nhận/hệ thống và đẩy việc cho hàng vào giỏ sang khách. |
| Hai áo lần 3, chọn trắng | Đạt | Xác nhận đúng hai áo trắng M, 948.100đ, giảm 5%/miễn ship, không hỏi mua lại. Hai nhánh có input giống hệt. |
| Hai áo lần 3, hỏi tổng | Chưa đạt | Tổng đúng; lặp câu hỏi chốt đã có ở lịch sử. Hai nhánh có input giống hệt. |

Baseline cũng chỉ đạt 1/6 về giọng ở sáu input đích. P1/P2 đã sửa nghĩa UNKNOWN và giảm prose ở bốn frame nhưng **chưa tạo cải thiện giọng trong phép đo này**. N=1/cặp trên bộ development không chứng minh mức suy giảm ổn định hoặc quan hệ nhân quả cho từng câu.

### Hai giới hạn của cách chấm cần giữ rõ

Judge chặn control ads vì thiếu mã/ảnh; đây là replay một bước, không thực thi phần đính ảnh của code. Không thể dùng lý do này để kết luận runtime đã làm mất ảnh. Hai nhánh đều nhận cùng kết luận. Judge cũng coi “vừa vặn nhất”/“vừa đẹp” ở control size M là material failure, dù owner đã cho phép tư vấn tự tin từ kết quả size code chọn. Đây là điểm chấm cần đối chiếu lại với ranh giới owner; giữ nguyên điểm gốc, không đổi rubric sau khi thấy kết quả.

Ngay cả khi bỏ hai lý do control đang tranh luận, nhóm đích vẫn không đạt 5/6, thắng ròng vẫn âm, và lời hứa “hỗ trợ tốt nhất” chưa có căn cứ vẫn cần xử lý. STOP không chỉ dựa vào hai control.

## Nguyên nhân còn lại và hướng tiếp theo

1. Prose đã bỏ khỏi data hỗ trợ, nhưng prompt vẫn buộc câu xin bớt có giá + bước theo evaluation + ưu đãi; prompt nghiệp vụ và mô tả tool tiếp tục giải thích lưu yêu cầu, vào giỏ rồi tự xét. Owner vẫn biến chỉ dẫn tác vụ thành lời nói với khách. P1/P2 xử lý được một nguồn gây vấn đề, chưa xử lý xung đột này.
2. Không còn nhãn sai CUSTOMER_PURCHASE_CHOICE vẫn chưa đủ để owner hỏi đúng màu. Ở hai lượt đầu control, model tiếp tục dùng hướng dẫn giỏ như việc khách phải tự làm, thay vì shop hỏi phần thiếu và thực hiện thao tác hiện có.
3. Lịch sử cũ được giữ nguyên để đối chứng: lượt hỏi tổng vẫn đọc câu hỏi chốt của shop ở lượt trước. Replay không chứng minh hành trình sinh mới từ đầu sẽ tốt hơn; không sửa lịch sử để làm đẹp kết quả.

Hướng tiếp theo đã dự kiến ở P3: thay chính đoạn chỉ dẫn xin hỗ trợ đang ép kể quy trình bằng yêu cầu xử lý lời xin và bước mua cần thiết; chỉ dẫn thao tác vẫn dành cho model, không thành nội dung bắt khách nghe. Không thêm danh sách từ cấm hoặc câu mẫu riêng cho J4. Trước một phép đo mới cần chốt cách chấm control theo đúng bề mặt replay và ranh giới size đã được owner duyệt. **Vòng này dừng ở finding, chưa thực hiện P3 hoặc chạy thêm.**

## Run source và sự cố bộ chạy

P1/P2 runtime source đã approve là `7fb18936468c4e4df02e7cb5784650e8d21bebf0`. Harness đầu khóa tại `0f393fc356a717d3c6a8fb4f34ea87aa31c168db`, seal `74600b8358e3e551efa8d48a62a4fc404949a1a1b091cb201245056691f7dcf3`.

Sau hai owner request hoàn tất, bộ ghi tổng hợp lỗi EEXIST vì helper chỉ cho tạo file mới. Giữ cả hai kết quả và bản tổng hợp một hàng đã ghi. Sửa riêng harness tại `8403c407d20ec27524e33bbab3a7849eaf130383`, khóa resume seal `0d51cd36f6e726d4e4659902db3586c9df16e67749f32dc03d16868b021af85d`, chỉ gửi 14 request chưa chạy. Slots, thứ tự, prompt, wire hashes và runtime P1/P2 giữ nguyên; kết quả giữ originalSource/hash riêng. Không mô tả toàn bộ 16 request là cùng executable source. Không gọi lại hai request đã hoàn tất; không có unknown completion. [Bản ghi sửa executor](EXECUTOR_REPAIR.json).

Reviewer độc lập yêu cầu sửa binding của control số đo và recheck clean source trước từng judge request; đã sửa trước judge. APPROVE HARNESS đúng `0f393fc3`, rồi APPROVE HARNESS REPAIR đúng `8403c407`, reviewer không gọi provider. Test projection/unknown-completion/binding **3/3 PASS**. Source runtime/prompt không thay so với bản đã qua 741 test worker, 142 test Node, build/typecheck/lint trước đó; không claim chạy lại các suite đó trong vòng model này.

## Kế toán và các lệnh đã chạy

- 16/16 owner và 8/8 judge HTTP hoàn thành OK, đủ mẫu số 24; 2 OAuth request tách riêng, 0 generation retry.
- Owner: 236.900 input / 12.435 output token. Judge: 54.167 input / 4.263 output token. Cost không expose.
- Latency owner gồm auth nếu cần: p50 2,91 giây, p95 75,58 giây theo nearest-rank. Không có verifier latency hoặc added end-to-end verification measurement trong replay này.
- Handoff/fallback/no-send: không áp dụng cho replay. Native đăng ký có điều kiện chưa chạy vì screen STOP. Không live send hoặc nguồn shop write.
- Bound/firewall, native dialogue, 16 request-hash bindings và hash các input đã khóa đều qua; raw wire/signature/credential giữ local.

Các lệnh thực thi, với local run `../c3-support-source-screen-20261118`:

```powershell
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/support-source-screen.test.mjs
node --check apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs
node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs prepare ../c3-support-source-screen-20261118/INPUTS.json ../c3-support-source-screen-20261118/REGISTRATION.json
python ../c3-j4-two-shirts-70000-launch-20261118.py node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs dispatch ../c3-support-source-screen-20261118/REGISTRATION.json 74600b8358e3e551efa8d48a62a4fc404949a1a1b091cb201245056691f7dcf3 ../c3-support-source-screen-20261118/owner
node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs prepare-resume ../c3-support-source-screen-20261118/REGISTRATION.json ../c3-support-source-screen-20261118/owner ../c3-support-source-screen-20261118/RESUME_REGISTRATION.json
python ../c3-j4-two-shirts-70000-launch-20261118.py node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs dispatch ../c3-support-source-screen-20261118/RESUME_REGISTRATION.json 0d51cd36f6e726d4e4659902db3586c9df16e67749f32dc03d16868b021af85d ../c3-support-source-screen-20261118/owner-resumed
node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs judge ../c3-support-source-screen-20261118/RESUME_REGISTRATION.json ../c3-support-source-screen-20261118/owner-resumed/RESULTS.json ../c3-support-source-screen-20261118/judge
node apps/worker/evals/single-agent-commerce-qualification/support-source-screen.mjs score ../c3-support-source-screen-20261118/RESUME_REGISTRATION.json ../c3-support-source-screen-20261118/owner-resumed/RESULTS.json ../c3-support-source-screen-20261118/judge/GRADES.json ../c3-support-source-screen-20261118/SCORE.json
git diff --check
```

Prepare ban đầu đã phát hiện thiếu initialProductCodes trong control cũ và một lần worktree bẩn do đặt nhầm file backup; đều sửa trước generation, 0 provider. Dispatch đầu lỗi ghi aggregate sau hai HTTP; resume, judge và score đều exit 0. Score trả STOP là kết quả phép đo, không phải lỗi tiến trình. Không có chạy native bị giấu hoặc request lỗi bị bỏ mẫu số.

Bản Markdown bỏ khoảng trắng cuối dòng để qua diff-check; text gốc trong RESULTS.json giữ nguyên. Kiểm JSON, mẫu số và mẫu credential công khai đã qua.
