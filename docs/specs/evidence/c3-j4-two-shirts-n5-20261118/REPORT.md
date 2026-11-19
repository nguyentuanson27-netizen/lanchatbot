# J4 ×5 và control hai áo ×5 · 18/11/2026

**Phase C STOP.** Đã thực thi đủ 10 hội thoại và ghi nhận 30 lượt terminal trên head PR #392 tại thời điểm bắt đầu, `f5df827e2b2a5b23a7129f26e9aee8bc81a52aa0`. Cả hai ca đạt **0/5** theo chấm mù toàn hội thoại.

| Ca | Diễn biến trong cả 5 lần |
| --- | --- |
| J4 | Lượt 1 hỏi màu và đủ điều kiện gửi. Lượt 2 lưu yêu cầu hỗ trợ, đọc báo giá rồi bị chặn trước owner continuation vì request quá dài. Chuyển handoff im lặng. Lượt 3 NO_SEND do hội thoại thuộc HUMAN. |
| Control hai áo | Ngay lượt 1 đã lưu yêu cầu hỗ trợ và đọc dữ liệu nhưng request tiếp theo quá dài, chuyển handoff im lặng. Lượt khách chọn trắng và hỏi tổng đều NO_SEND. |

Kết quả có **5 SEND_ELIGIBLE, 10 HANDOFF, 15 NO_SEND**. Cả 10 request chấm mù hoàn thành và đánh giá chưa làm đủ việc khách cần. Năm câu đã gửi hỏi đúng hai màu trắng có sẵn và be đặt trước, ngắn và dễ hiểu. Giọng tư vấn sau xin hỗ trợ và lời báo tổng chưa được đo vì các câu này chưa sinh ra. [Toàn bộ 30 lượt](CONVERSATIONS.md), [chấm mù](BATCH_JUDGE_RESULTS.json), [kết quả tổng hợp](SUMMARY.json).

## Nguyên nhân quan sát được

1. **Request continuation vượt trần 65.536 byte.** Mười lần đều phát sinh `OWNER_REQUEST_BOUND` tại bước BUILD, có **0 HTTP** và **0 auth request** cho lần bị chặn. Request đo được từ **65.824 đến 66.810 byte**. Chín request có frame ban đầu khoảng 65 KB, rồi phần trình bày context cộng thêm 1.517 byte làm vượt trần. Một request control đã vượt ở phép đo đầu tiên. Trong breakdown, system instruction chiếm 22.483 byte, tool schema khoảng 17.290–18.520 byte, trusted frame khoảng 18.346–19.244 byte, cộng hội thoại và tool results.
2. **Nhánh trả lời từ dữ kiện đã có bị adapter chặn tiếp.** Sau `OWNER_REQUEST_BOUND`, runtime thử owner generation thứ ba ở pha final theo nhánh sẵn có. Guard `C_REGISTERED_ROLE_CAP_OR_PRIOR_FAILURE` từ chối trước khi đăng ký request vì đã có lần BUILD lỗi. Đủ 10 trường hợp đều có record `ADMISSION_REJECTED`, 0 HTTP. Do đó hành trình chuyển handoff dù có dữ kiện đã đọc.
3. **Báo giá do code dựng chưa được thực thi.** Nhánh này hiện yêu cầu một verdict FAIL/UNCERTAIN/MALFORMED, trong khi các lượt trên dừng trước verifier. Số lần `VERIFIED_QUOTE_REPLY` bằng 0. Cả 10 yêu cầu hỗ trợ còn pending và chưa tới bước mở giỏ, nên tự xét hỗ trợ cùng tính liên tục của biên nhận cũng chưa được kiểm qua model trong vòng này.

Tên trạng thái `PROVIDER_ERROR` trong runtime/ledger bao gồm mười lỗi BUILD nêu trên. Telemetry xác nhận provider chưa nhận các request đó. Mọi request thực tế gửi provider đều hoàn thành. [Toàn bộ lỗi BUILD và admission](BUILD_FAILURES.json), [audit đã lược bỏ payload truyền tải](PUBLIC_AUDIT.json).

Ledger xác nhận mỗi hội thoại chỉ ghi một yêu cầu hỗ trợ pending và đều chưa tạo giỏ. Args của 15 đầu ra gọi tool đã được lưu từ journal provider, kèm generation ID. [Biên nhận pending](PENDING_RECEIPT_AUDIT.json), [tool calls](TOOL_CALLS.json).

Hướng xử lý tiếp theo là sửa adapter nhận đúng bước chuyển sang final khi lần BUILD trước có 0 dispatch, trong trần generation và với kiểm tra state/quyền hiện hành. Cần regression đi qua cả runtime và candidate provider với request continuation vượt giới hạn, rồi xác nhận frame final nằm trong trần. Phần cấp context cần đo kích thước sau trình bày và giữ đủ khoảng trống cho kết quả tool thực tế. Hướng này chưa được triển khai trong lần chạy head này.

## Cách đăng ký và đối soát

World mới có 107 sản phẩm, hash `dfbc11c72f413c1d4052c49cd574886e8ca413589841f44f5f6654687a5e0403`. Dữ liệu nguồn được chụp mới, dùng lại các asset test đã duyệt. Cả 10 hội thoại dùng cùng world và đồng hồ thật. World khác vòng 16/11, vì vậy tỷ lệ mới chưa xác định riêng tác động của code.

Owner là Vertex Gemini 3.5 Flash Lite High. Verifier và judge offline là GPT-6.1 Sol High qua CLI 0.159.2. Hash owner prompt `3d94082edc5412188ec922ce581304ccb8771c3e302dba6ba0bf29f7f494028c`, verifier prompt `23e3315044995f2c5e8fc6ca0b242bc74e68b48f232fb7fefc8ce9528ca7d7bf`. Runtime hash `483657b9fe2a3473231ac623c6a55115d49c1a59dc40ad985d825fcacb87dde3`.

Harness hiện có đăng ký J4 ×5 nhưng control mỗi campaign ×1. Để chạy đúng control ×5 trên source đã yêu cầu, bộ chạy tạo năm registration control riêng, mỗi lần có seed, seal và kho test riêng, đánh số bên ngoài từ 1 đến 5. Có một job J4 và năm job control, chạy tối đa hai process đồng thời. Tổng đăng ký đúng **10 hội thoại / 30 lượt / tối đa 120 native generation**, cùng 10 request judge. Các slot khác của corpus dùng chung không được dispatch. [Sáu preflight](PREFLIGHT.json), [cấu hình, hash và danh sách slot](PROVENANCE.json).

Đối soát có **45 lần thử generation ở runtime** gồm 25 request thực gửi, 10 lỗi BUILD và 10 lần bị admission từ chối. Ledger provider ghi 35 lần bắt đầu, trong đó 10 lỗi BUILD có 0 HTTP. Native HTTP gồm 20 owner và 5 verifier. Cộng 10 judge là **35 generation request thực gửi**, provider error/timeout quan sát được bằng 0. Không có lần chạy thay thế sau kết quả lỗi. Các DB test đều đã được dọn và có 0 tin gửi thật.

| Phép đo adapter | p50 | p95 | Input token | Output token |
| --- | --- | --- | --- | --- |
| Owner · 20 request | 5,48 giây | 6,84 giây | 237.138 | 19.592 |
| Verifier · 5 request | 7,45 giây | 9,93 giây | 49.190 | 321 |

Đây là thời gian đo trong adapter. Chi phí không được provider expose. Năm verifier PASS gắn đúng năm câu hỏi màu đã gửi. Request hash, evaluator firewall và Outbox hash đã đối soát cùng witness của final gate. Audit PASS chỉ xác nhận tính toàn vẹn bản ghi. Kết luận bán hàng vẫn là 0/5 cho mỗi ca.

## Kiểm tra và lệnh đã chạy

Build worker, lint/typecheck, 400 test runtime trọng tâm và 138 test Node adapter/protocol đều qua trên source khóa. Chỉ chạy các kiểm tra ghi dưới đây trong lượt này.

```powershell
git fetch origin feat/c3-phase-c-qualification-20261028
git merge --ff-only origin/feat/c3-phase-c-qualification-20261028
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-callable.test.ts src/single-agent-commerce-owner-view.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs
```

Thư mục local lưu nguyên artifacts và các helper là `C:/Users/nguye/Documents/Sản phẩm AI/c3-j4-two-shirts-n5-f5df827e-20261118-003159`. Chụp nguồn qua `c3-native-context-launch-20261115.py` với `capture-world.mjs`, danh sách `CODES.json`, và proof media `c3-convergence-model-world-20261111-10/WORLD.json`. Sau đó cùng launcher chạy `isolated-integration.mjs ... COD --phase-c-initial-world ...`, tiếp đến `node seal.mjs`, `judge.mjs freeze` và session `c3-j4-two-shirts-n5-session-20261118.py`. Session thực hiện sáu lệnh `sales-context-screen.mjs native-dispatch` theo đúng registration/campaign/slot đã khóa. Cuối cùng chạy `audit.mjs`, `judge.mjs prepare`, `judge.mjs run` và `summarize.py`.

Hai helper đối soát ngoài source có lỗi đọc đường dẫn/field ban đầu và đã sửa trước khi chấm hoặc xuất kết quả. Lỗi chuẩn bị judge có 0 request model. Hash trước/sau và lý do sửa nằm trong provenance. Source chạy model luôn là `f5df827e`. Bằng chứng qualification chính thức và bước mở giỏ/xét hỗ trợ còn chưa được xác nhận trong lượt này.
