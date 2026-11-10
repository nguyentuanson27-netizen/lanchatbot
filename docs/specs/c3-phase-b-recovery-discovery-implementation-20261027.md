# Phase B — implementation recovery/discovery theo plan revision 3

Implementation base: `cee48bb768989cf2ae0dda9d6c84b9c99b0ab3c4` (savepoint review/plan); planning base `b7e197d8877c4643fba2f86121ac1f8ec87af21d`. [Plan đã duyệt](c3-phase-b-recovery-discovery-fix-plan-20261027.md), canonical LF SHA256 `762769e338908b8733900bda9af96760dea0b440a5509ad68a758a9633f0d698`, [plan review trail](c3-phase-b-recovery-discovery-fix-plan-review-20261027.md).

Trạng thái: **IMPLEMENTED + independent APPROVE** bởi cùng reviewer của plan, không còn P1/P2 mở trong phạm vi này. Chưa provider qualification/B GO. Không live send, source-store write, merge/deploy hoặc production wiring.

## Thay đổi thực tế

**W1 recovery:** ingress cộng recovery attempt có handoffStatus proof vào executedToolInvocations V2, cùng các counter terminal/toolCalls. Legacy shape giữ nguyên; không thêm throwing validator worker hoặc tự điền proof thiếu. Hai test mới trước sửa đều RED: executed1 thay vì2 và executed2 thay vì3; sau minimum patch đều GREEN. Thêm ba nhánh commit rejected/unknown/readback failure; full ingress102 tests PASS.

**W1 evidence/queue:** helper eval `attempt-evidence.mjs` giữ observed result/generations/terminal, qualifier/error tách riêng. Validation đã có envelope không ném mất result. Không có result thì UNKNOWN, không giả NO_SEND; unknown error text được đổi thành code allowlist. Một latch cho cả disposable DB được dùng ở mọi processOne/drain, chặn slot tiếp theo trước fixture/write/generation. Không cancel pending outbox hoặc đổi committed state. Consumer báo registered/executed/notRun, observed terminals và qualificationErrors riêng. Driver campaign mới giữ NOT_RUN trong denominator, tiếp tục DB độc lập và không báo FULL khi có qualification failure. Historical driver/artifacts không đổi.

**W1 diagnostics:** OWNER_TOOL_OUTPUT hiện có diagnostic code-owned tool/field/value type; không copy unknown model key, args, value hoặc hash PII. HTTP200 parse failure vẫn giữ một request, tokens, completion stage và failure code; không retry/nới schema.

**W2 feasibility:** public fixture lấy description/variant density từ capture đã có; dates/POS authority và non-selected offer values được dựng theo fixture test, không phải nguồn shop mới. Real composition → core → resultBudgetView → Gemini adapter mocked HTTP; dùng full owner prompt, initial product và ba search candidates =4 runtimeProducts. Hai ứng viên phù hợp loại bộ quần được đọc SINGLE trong round cuối; không đọc váy gần nghĩa. Không test ba ứng viên hợp lý nên instruction chỉ tối đa hai.

| Path | Raw batch bytes | Charged batch bytes | Final owner wire bytes | Owner generations |
|---|---:|---:|---:|---:|
| Complete | 5513 | 3220 | 36187 | 3 |
| OK + partial availability | 4354 | 3484 | 35275 | 3 |
| Read-level source error | 2531 | 1661 | 32405 (generation2) | 2, sau đó silent handoff |

Bound giữ8192/65536, cap6/2rounds; không cắt evidence hoặc thay renderer. Đây là feasibility và transport proof với stub generation, không phải model tự chọn batch hay provider semantic verdict thật.

**W2/W3 instruction:** thay đúng ba vùng search/read, thiếu dữ liệu và dùng kết quả negotiation; tool descriptions tương ứng. Search không yêu cầu chọn món trước khi biết giá; batch tối đa hai trong budget. NOT_READ còn callable thì đọc; chưa hoàn thành/hết rounds dùng RESPONSE_UNAVAILABLE thay vì suy nguồn thiếu. Phản đối giá dùng quyền lợi hiện tại từ record_negotiation trước upsell. Không đổi phần giọng/fit/policy còn lại, Size Engine/negotiation engine hoặc verifier. Current manifest owner hash đổi thành `445ed64be5b33eb0b1cb0035ed28103336a4559823e234cb723cbbee247aef11`; corpus/model/effort/budget/retry giữ nguyên.

**W4 media:** [audit](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-implementation-20261027/MEDIA_AUDIT.json) giữ 11 asset hashes/metadata và chain registry→publisher→hash→Qdrant adapter→selector. Capture có feedback=false, colorBinding ABSENT và product.colors=[]; không chứng minh đúng feedback/ảnh màu be. Publisher/adapter đã hỗ trợ các field; chưa thấy mất field do code. Nguồn IMAGE_ID/approval/version hiện hành chưa truy cập được bằng connector đúng nghiệp vụ: **UPSTREAM_UNVERIFIED**, không kết luận ảnh không tồn tại hoặc tự gắn/publish metadata. Không media code patch trong scope này.

## Commands đã chạy

1. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t "retains V2 executed counters"`: RED2 trước patch → GREEN2 sau patch (97 tests khác skipped).
2. `node --test apps/worker/evals/single-agent-commerce-read-only/attempt-evidence.test.mjs`: RED module chưa có → GREEN4 sau implement.
3. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-discovery-feasibility.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts`: **480 PASS**. Feasibility lúc dựng test có một fixture không tạo đúng partial status và hai lỗi type; đã sửa fixture/search result type/cast, không sửa runtime để cứu chúng.
4. `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"`: **227 PASS**.
5. `python apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-implementation-20261027/driver.test.py`: **3 PASS**, mọi child/git/provider stubbed.
6. `python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py`: **2 PASS**, historical driver nguyên bytes.
7. `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`: exit0.
8. `pnpm --filter @lana/worker build`: exit0, gồm dependency prebuild; shared source không đổi.
9. `pnpm --filter @lana/worker lint`: exit0.
10. `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs`: exit0.
11. `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-recovery-qualification-check-20261027' COD --candidate-handoff --check-prefix 'B qualification'`: **1 PostgreSQL scenario PASS**, providerGenerations0, testDatabaseDropped=true. Synthetic domain/current policy/capture transport; dirty worktree source identity được ghi rõ, chưa clean-source qualification hoặc live delivery proof. Kiểm actual pending outbox, hai journey chung DB, restart dispatcher, slot sau không generation/dispatch và observed terminal được giữ.
12. `git diff --check`: exit0. Các lần chạy focused trùng nằm trong full suite không được cộng lại thành tổng unique tests.

## Giới hạn và acceptance còn lại

Cùng reviewer đã kiểm và **APPROVE** exact14 executable/config/fixture/test files tại [inventory](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-implementation-20261027/APPROVED_SOURCE_FILES.json), inventory SHA256 `764302c9713189639be1f91388aa40fa2d83ee81da25fec33222baecebb41cac`. Hash policy: sorted array `{path,sha256(raw worktree bytes)}` JSON compact UTF-8. Reviewer độc lập chạy105worker (ingress102+feasibility3),6Node,3Python driver PASS và git diff --check PASS; các số này là kiểm lại subset, không cộng vào480/227/5 thành tổng unique tests. Không tìm thấy P1/P2 cần sửa; không cần thay thêm code để đạt approval.

Không có model generation thật trong task này. Chưa chứng minh owner tuân batch/current concession/reason instruction hoặc chất lượng tư vấn cải thiện. Vòng qualification sau, khi owner yêu cầu, giữ51native+17controls N1/retry0/cap217 và source sạch đã seal; dùng driver mới. Upstream media registry cần audit đúng record nếu muốn bổ sung evidence; không tự chuyển thiếu metadata thành producer refactor. Shared-queue latch chỉ bảo vệ runner tuần tự trong cùng process/disposable DB; không phải production delivery lock hoặc bảo đảm concurrency đa process.

Giữ kiến trúc một owner/một verifier; không semantic router/parser/regex theo case, không operation mới, retry/repair/reverify hoặc production entrypoint. Complexity delta chủ yếu eval evidence latch/consumer và tests/driver; runtime behavioral delta chỉ accounting recovery. Test-only export resultBudgetView cho đo chính xác charged bytes, không thêm runtime authority hoặc changer bound.
