# Phase B — handoff im lặng và tư vấn cách mặc, 26/10/2026

Implementation base: `f5fcaf532c20cb009440f2362215f0628f5be222`. Owner chốt sau review đủ 20 lượt: handoff ngay, không cần trả phần đã biết hay câu chờ; tư vấn đón nhận băn khoăn bằng cách phối hoặc điểm mạnh trang phục, câu chữ như người bán nhắn tin. Đây là thay đổi yêu cầu so với partial reply + holding trong plan giữ quy tắc trước đó, không sửa lại kết quả run cũ.

## Thay đổi

- Candidate HANDOFF_MATRIX v6 chọn SILENT_HANDOFF cho toàn bộ reasons; holdingReply=null. Adapter áp dụng mode của candidate cho cả rule upstream, giữ tag và không ghi nguồn shop. Ownership/event/tag vẫn phải commit thật; thất bại/không rõ thì không gửi, không giả thành công.
- Runtime đã có đường silent: không prepare partial, không ghép giá/ảnh/holding, không cần thêm generation hoặc verifier khi không có reply. Giữ đường holding dùng bởi policy khác/consumer cũ; không xóa cơ chế đã kiểm trước.
- Shared HandoffDecisionV2 trước đây bắt hậu mãi có một tin chờ bất kể matrix. Cho phép hậu mãi im lặng chỉ khi provenance ADMIN_CONTROL có matrix identity đúng dạng. Giữ reason/category/tag VAN_DON và count=0; deterministic default vẫn bắt một holding. Schema chỉ kiểm shape, quyền thật vẫn từ policy resolution và transaction.
- Owner prompt thay chỉ dẫn tư vấn bằng hướng giúp khách hình dung cách mặc, nêu điểm mạnh liên quan, không bác cảm nhận bằng chuỗi lời khen. Sửa giọng theo câu nói trực tiếp, một ý rõ mỗi câu, bỏ diễn giải ngân sách/yêu cầu thừa. Không chèn ví dụ sản phẩm, câu đáp án benchmark hoặc bộ từ khóa cấm. Giữ form báo giá đầu, ranh giới facts/fit/receipt/privacy và prompt verifier.
- Sửa các câu mâu thuẫn về trả phần đã biết, hậu mãi và ảnh+giá: đã handoff thì không kèm tin. Chỉ hỏi quy định hoặc thiếu thông tin khách vẫn được trả lời/hỏi bổ sung. Không chuyển vì field tùy chọn thiếu.
- Manifest đăng ký SILENT_HANDOFF và approvedHoldingHashes=[]; owner hash cập nhật theo bytes. Không thay model, corpus, nhãn hoặc evidence lịch sử.

## Kiểm chứng thực chạy

Observed RED: test native silent handoff trước đổi matrix/adapter trả NO_SEND thay HANDOFF vì vẫn có holding. GREEN sau đổi: một committed handoff, HUMAN ownership, terminal.text=null, một owner gọi tool, không owner viết tiếp/verifier/partial/media. Shared contract cũng observed RED trước khi cho phép admin-bound silent after-sales, rồi GREEN; nhánh deterministic không matrix vẫn bị từ chối khi thiếu holding.

Các lệnh đã chạy trên bản sửa:

```powershell
node --test --test-name-pattern='silent candidate commits' apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs
pnpm --filter @lana/contracts exec vitest run src/v2/handoff-sales-funnel.test.ts src/commerce-handoff-delivery.test.ts
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/contracts build
node --test --test-concurrency=1 apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-persistence.test.ts
pnpm --filter @lana/worker lint
pnpm --filter @lana/conversation-engine exec vitest run src/handoff-fallback-v2.test.ts
```

Kết quả: contracts16PASS + typecheck/build; focused candidate/protocol53PASS; worker578PASS/20files; toàn bộ Node commerce187PASS; worker buildPASS. Bổ sung test persistence hậu mãi silent sau suite578: file17PASS, kiểm transaction chứa ownership/event/tag và không có Meta Outbox. Engine49PASS; worker lint (tsc --noEmit) exit0. Protocol18PASS sau cập nhật cuối prompt/hash. Không cộng các suite chạy chồng thành số test duy nhất.

## Self-review và giới hạn

- Loại mâu thuẫn cũ cấm đưa cách phối khi hoàn cảnh đổi; cho phối khi giải quyết được nhu cầu, đổi món khi không đáp ứng. Không bắt một khuôn câu hoặc ép thêm lời khuyên cho mọi câu hỏi.
- Silent handoff là kết quả hợp lệ theo owner mới, không chấm như fallback hay bot cần tự tiếp tục khi HUMAN sở hữu. Chưa chứng minh người nhận bàn giao phản hồi hoặc thời gian tiếp nhận.
- B1 read-only vẫn không có handoff port. Prompt không tạo ra capability: không claim ca B1 POS_UNAVAILABLE đã được bàn giao. Khi kiểm acceptance thiếu nguồn phải dùng composed candidate có port; B1 chỉ dùng kiểm tư vấn/đọc và ghi rõ giới hạn. Không giả handoff bằng lời nói hoặc NO_SEND.
- Chưa chạy provider trên prompt/matrix mới, chưa xác nhận giọng tự nhiên hơn bằng hội thoại thật. Không sửa registration/gate của campaign cũ để coi 31 lượt deferred là đã chạy hoặc mở lại run cùng identity.
- Không source-store write, migration, production wiring, live send, deploy hoặc B GO. Bản này là implementation và kiểm chứng local; lần chạy model tiếp phải seal identity mới.
