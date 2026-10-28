# Phase B — mọi fallback bàn giao im lặng, 2026-10-28

## Quyết định owner

“fallback chuyển sang hand off hết - k gửi tin nhắn cho khách nữa”.

Áp dụng cho Phase B candidate hiện hành, thay cách giao fallback/ảnh/receipt recovery trước đây. Base implementation: `488375eda9bc1da4f12087878204e88ec880a2f9`. Không sửa dữ liệu hoặc kết quả các model campaign đã đóng, không diễn giải lại Checkpoint A lịch sử.

## Hành vi mới

| Tình huống | Terminal thực tế |
|---|---|
| FAIL/UNCERTAIN/malformed, owner/verifier timeout/provider error | Atomic silent handoff nếu xác nhận được; không thì NO_SEND |
| Output chứa artifact, input/tool-result quá giới hạn, hết budget, preparation lỗi | Cùng đường silent handoff; không còn các reason bị bỏ ngoài ingress recovery map |
| Thiếu chart sau tool, world stale/readback lỗi | Yêu cầu bàn giao theo quyền/state/policy hiện tại; không dùng reply cũ hoặc receipt ACK để tiếp tục gửi |
| Có ảnh đã xác minh nhưng draft bị chặn | Không gửi caption thay thế, không gửi ảnh |
| Có thao tác giỏ/ưu đãi đã commit nhưng generation sau đó lỗi | Giữ commit/receipt, không replay/rollback, không gửi ACK/tổng giỏ thay thế; bàn giao hoặc NO_SEND |
| Bàn giao đã PREPARED rồi draft bị chặn | Hoàn tất cùng attempt bằng silent handoff; không cứu price fragment/holding/ảnh |
| Bàn giao bị từ chối, lỗi, unknown commit hoặc readback không chứng minh được | NO_SEND; không claim đã bàn giao, không tự thử lại |
| Không có adapter handoff, ví dụ standalone B1 read-only | NO_SEND/FALLBACK_HANDOFF_UNAVAILABLE; không tạo HANDOFF giả hoặc câu gửi khách |
| Privacy/permission/recipient không hợp lệ hoặc HUMAN đang sở hữu | Giữ NO_SEND |
| Handoff/checkout code-owned đã commit và đọc lại được | Giữ terminal đã xác nhận, không bàn giao lần hai |
| Reply thông thường PASS và các bước checkout thu thập/preview của code | Tiếp tục đường bình thường; không phải fallback |

Không gửi text hoặc IMAGE intent ở nhánh fallback. Handoff vẫn giữ transaction, rule/tag authority, Inbox generation/fence, event và ownership. Owner cho phép bỏ holding copy của policy cũ trong recovery này; không tạo một tag/quyền mới hoặc ghi lại nguồn policy.

## Thay đổi code

- `runCommerceTurn.finish()`: tất cả fallback và handoff chưa commit đi qua code-only `recoverFallback`; chỉ nhận HANDOFF/NO_SEND có text=null, fallbackId=null. Không gọi receipt `recover()` cũ. Lưu originalDisposition/originalReason/originalDiagnostic để không mất lỗi gốc; generation/accounting vẫn giữ.
- Handoff adapter: dùng transaction/rule hiện có, tối đa một attempt. Recovery ép SILENT_HANDOFF/customerMessages=[], không deferred price fragment, independent media hoặc reply. Pending handoff dùng cùng attempt. Không thêm model tool hay role.
- Ingress: bỏ nhánh gửi ảnh thay thế và reason map bàn giao thứ hai. Handoff transaction sở hữu Inbox completion. Sau HANDOFF/NO_SEND không commit/enqueue thêm; không tạo reply BOT sau transaction unknown. Delivery guard cấm fallback output lọt vào đường gửi.
- Manifest/protocol: freeze `fallbackDelivery={mode:SILENT_HANDOFF,unavailable:NO_SEND,customerText:false,images:false,effectReplay:false}` và terminal map mới. Sửa cấu hình thành gửi text/ảnh hoặc static fallback bị protocol tests từ chối.
- Catalog static trong semantic boundary và các helper legacy vẫn tồn tại phục vụ compatibility/control tests lịch sử. Chúng không còn là terminal customer output của native Phase B; không sửa frozen evidence cũ.
- Không sửa owner/verifier prompts, model identity, corpus, engine hay budget. Đây là đổi terminal behavior, không claim đã sửa lỗi owner sai phạm vi đặc tính hoặc nâng chất lượng tư vấn.

## TDD, regression và self-review

Observed RED trước code: test file silent-fallback ban đầu **12 FAIL/2 PASS**. Lỗi quan sát được gồm receipt ACK thay fallback và static reply trên read-only surface. Minimum GREEN: 14/14; sau đó mở rộng thành 18 trường hợp cho input thật vượt bound, preparation, budget, size-unavailable và adapter cố trả text.

Cập nhật các test cũ yêu cầu ảnh/price fragment/receipt ACK khi draft bị chặn theo quyết định mới, giữ kiểm tra không replay và state đã commit. Một fixture composition cũ có PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH trước verifier, trước đây vẫn xanh do receipt recovery che rejection. Test nay xác nhận NO_SEND cùng diagnostic và state/cart đã commit còn nguyên; không biến fixture này thành bằng chứng normal verified reply.

Self-review:
- Recovery là code-only, không thêm tool model hoặc generation.
- Giới hạn một handoff attempt còn giữ; PRIMITIVE_WORK_V2 tính attempt này vào executed tổng.
- Unknown/rejected/readback failure không bị đổi thành success, không có commit thứ hai sau đó.
- Handoff giảm payload về rỗng nhưng giữ authority/rule/tag; không đổi upstream policy.
- Normal quote/ảnh/size/checkout/state/policy/giao dịch được kiểm bằng regression; quyền gửi và final gate không được nới.
- Independent review không được yêu cầu ở task này và không được gọi. Không tự ghi self-review là independent approval.

## Commands thực sự chạy

Chạy ở repository root trừ Node commands ở `apps/worker`.

1. `pnpm exec vitest run apps/worker/src/single-agent-commerce-silent-fallback.test.ts --reporter=dot`: observed RED 12/14 failures, rồi GREEN 14/14. File cuối có 18 cases, nằm trong bộ cuối dưới đây.
2. `pnpm exec vitest run apps/worker/src/single-agent-commerce apps/worker/src/single-agent-semantic-verifier-boundary.test.ts apps/worker/src/realtime-protected-claim-boundary.test.ts apps/worker/src/realtime-reply-assembler.test.ts --reporter=json --outputFile=C:/Users/nguye/AppData/Local/Temp/c3-silent-worker-pass.json`: **682 PASS, 0 FAIL, 25 files**. Hai đường dẫn realtime test trong command không có file khớp; không claim chúng đã chạy. Focused protected tests đúng đường dẫn chạy riêng ở mục 3.
3. `pnpm exec vitest run apps/worker/src/track-b-protected-claim-boundary.test.ts packages/business-tools/src/protected-claims.test.ts packages/business-tools/src/reply-assembler.test.ts --reporter=dot`: **39 PASS, 3 files**.
4. `node --test --test-concurrency=1 "evals/single-agent-commerce-read-only/*.test.mjs"`: **228 PASS, 0 FAIL**.
5. `node --test --test-concurrency=1 evals/single-agent-semantic-verifier/codex-inference.test.mjs evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs`: **24 PASS, 1 SKIP**, local installed-login test không chạy; mocked HTTP/SSE/auth/timeout/one-request/no-retry tests PASS, không có generation thật.
6. `pnpm --filter @lana/worker build`: PASS/exit0, gồm prebuild dependencies.
7. `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`: PASS/exit0.
8. `pnpm --filter @lana/worker lint`: PASS/exit0.
9. `git diff --check`: PASS.

Intermediate regression failures là các expectations cũ về fallback/customer recovery và fixture scope đã nêu; final counts chỉ lấy sau sửa. Không xóa attempt/model evidence hoặc claim các intermediate commands đã PASS.

## Chưa kiểm và giới hạn

- **Chưa chạy fresh model campaign hoặc PostgreSQL capture integration trong task này.** Không cập nhật số 37/9/4/1 của campaign cũ thành kết quả sau fix.
- Standalone B1 không có persisted handoff capability: NO_SEND không chứng minh HUMAN đã tiếp nhận. B2/B3 candidate dùng adapter bàn giao thật trong transaction; hiện đã kiểm bằng synthetic port/store tests.
- Chưa đo SLA phản hồi sau bàn giao. Câu tư vấn sai của owner vẫn là lỗi dù terminal nay bàn giao; không lấy handoff làm điểm chất lượng PASS.
- Không provider generation, live send, publish nguồn, merge hoặc deploy trong task này. B chưa có GO mới.

## Tài liệu liên quan

- [Review 51 lượt gần nhất](c3-phase-b-recovery-discovery-run-review-20261028.md).
- [Implementation trước](c3-phase-b-recovery-discovery-implementation-20261027.md).
- [Protocol hiện hành](../../apps/worker/evals/single-agent-commerce-read-only/manifest.json).

