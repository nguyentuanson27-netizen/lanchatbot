# Phase B — đóng finding silent fallback, 2026-10-28

## Scope và owner instruction

Owner yêu cầu sửa các finding independent review, gọi lại cùng reviewer và lặp đến APPROVE. Giữ yêu cầu mọi fallback bàn giao im lặng; không gửi text/ảnh/receipt ACK thay thế; không claim bàn giao khi chưa chứng minh được.

Base bị REVISE: `e836de67e0be0b59bbd046f9b5d2cc1002bd2035`.
Runtime fix: `33e0fc14e3b683ab9299956a4a27fceacb461008`.
Final reviewed executable/config head: **`24a2ed1bf775592f20da8ea260d43c64e4e589fd`**.

Không sửa model, prompt, corpus, budget, source-store records hoặc production wiring. Sau33e chỉ sửa current integration assertions/fixtures/filter; runtime TS và shared packages không thay đổi.

## Fixes

1. **P1 private fallback:** attachment chưa hỗ trợ hoặc private checkout không hoàn tất dùng cùng `recoverFallback`, reason gốc `PRIVATE_CHECKOUT_UNAVAILABLE` ánh xạ DEPENDENCY_FAILURE. Giữ source event/message linkage, privacy và tag/transaction authority. Holding policy cũ không tạo TEXT/IMAGE intent.
2. **P2 Inbox:** quan sát lỗi transaction và profile CAS của chính lượt này. `executor.terminalCommitted()` chỉ được đặt sau khi transaction promise xác nhận commit, không đặt trong callback trước commit. Kết thúc NO_SEND phân biệt:
   - ALREADY_COMMITTED: không complete lần hai.
   - RECONCILE_REQUIRED: có unknown write/unknown handoff; không đánh dấu processed mù.
   - COMPLETED: chưa có unknown commit, complete bằng generation/lease guard.
   - SUPERSEDED: guard từ chối đóng generation cũ.
   - UNCONFIRMED: completion không xác nhận được, không fake thành completed.
3. **P2 acceptance:** current integration driver bỏ expectations gửi holding, ảnh hoặc tổng giỏ cho automatic fallback. Giữ kiểm tra ownership/event/tag/Inbox và commit-response-lost/rollback. Giữ các trường hợp explicit handoff + verified reply riêng, không đánh đồng với rejected reply.
4. **P3 fixture:** missingDependencyRule dùng SILENT_HANDOFF/null hợp lệ; fixture matrix được schema-parse trước khi vào recovery. Không dùng invalid matrix để thay thế test thiếu rule hợp lệ.
5. **Current focused filter:** đổi hai prefix no-chart theo tên case mới; combined focused flags không được âm thầm bỏ ca đó.
6. **Stale variant acceptance:** full SQL phát hiện assertion NO_SEND cũ cho STALE, trong khi runtime mới bàn giao im lặng đúng yêu cầu. Sửa thành HANDOFF/textnull/0Meta/1event/1tag/HUMAN/Inbox completed; không nới gate gửi. Clarification rollback có prerequisite qua real add-cart+confirm ports nếu chạy riêng, vẫn kiểm guard append-only.

## TDD và regression

Observed RED trên base cũ: **6 FAIL /2 PASS** cho private holding, definite no-commit completion và supersession. Sau sửa: **8 PASS**. Thêm ba regressions cho unknown profile/cart write từ bước trước và checkout đã complete Inbox trong transaction. Test checkout dùng yêu cầu mua rõ “Chốt đơn cho chị nhé”, không ép confirm từ một tin chào.

Final local verification:
- **732/732 Vitest PASS**, 28 files: commerce, semantic boundary, protected claims/reply assembly.
- **228/228 Node eval tests PASS**.
- Worker direct build, direct typecheck và lint PASS.
- `node --check isolated-integration.mjs`, `git diff --check` PASS.

Commands đã chạy:
1. `pnpm exec vitest run apps/worker/src/single-agent-commerce-ingress.test.ts -t 'private fallback silent|definitely uncommitted|completes only definite|current-generation completion' --reporter=dot` — RED6/8 rồi GREEN8/8.
2. `pnpm exec vitest run apps/worker/src/single-agent-commerce-ingress.test.ts apps/worker/src/single-agent-commerce-session.test.ts apps/worker/src/single-agent-commerce-session-silent.test.ts apps/worker/src/single-agent-commerce-silent-fallback.test.ts --reporter=json --outputFile=C:/Users/nguye/AppData/Local/Temp/c3-silent-review-fix-focused.json` — intermediate147PASS/1FAIL do test chưa cung cấp buying intent; sửa input đúng tình huống rồi targeted1PASS và full final ở mục3.
3. `pnpm exec vitest run apps/worker/src/single-agent-commerce apps/worker/src/single-agent-semantic-verifier-boundary.test.ts apps/worker/src/track-b-protected-claim-boundary.test.ts packages/business-tools/src/protected-claims.test.ts packages/business-tools/src/reply-assembler.test.ts --reporter=json --outputFile=C:/Users/nguye/AppData/Local/Temp/c3-silent-review-fix-all.json` — 732PASS/0FAIL.
4. Từ apps/worker: `node --test --test-concurrency=1 "evals/single-agent-commerce-read-only/*.test.mjs"` — 228PASS/0FAIL.
5. `pnpm exec tsc -p apps/worker/tsconfig.json` — direct worker build PASS; dependency artifacts đã có, không sửa source shared package.
6. `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` — PASS.
7. `pnpm --filter @lana/worker lint` — PASS.

## Cùng independent reviewer kiểm lại

Reviewer: `/root/silent_fallback_independent_review`, không phải root self-review; read-only, không sửa source/dist hoặc gọi provider.

- e836de67: REVISE, P1 private holding +P2 incomplete Inbox +P2 stale acceptance.
- 33e0fc14: **APPROVE source**, không còn P1/P2; reviewer tự chạy **200/200 focused Vitest PASS**, ba repro synthetic private holding/valid missing rule/unknown commit PASS. Có P3 fixture không hợp lệ.
- 42b8b1a1: **APPROVE exact clean HEAD**, P3 đóng; reviewer tự chạy Node syntax check PASS và kiểm delta fixture. Không có finding mở trong scope.

- 55caff8c: **APPROVE exact executable source**, reviewer kiểm hai focused prefixes và Node syntax.
- 24a2ed1b: **APPROVE exact source**, reviewer kiểm stale variant assertion và real prerequisite của clarification rollback; Node syntax PASS, không có finding mới.

Approval là source review; không phải approval model quality, promotion hoặc B GO.

## PostgreSQL verification

Dùng [Lana Chatbot Ops skill](../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và documented `source-session.py` route hiện có. Dedicated MCP ops tools không được expose trong phiên; bridge trong repo là fallback đã dùng. PostgreSQL nguồn chỉ đọc; DDL/fixtures/Inbox/Outbox chỉ trong các database ngẫu nhiên `c3_b_test_*` của chính runner, customer/product/transport synthetic, delivery capture trong bộ nhớ. Không Meta/Pancake/POS socket hoặc provider generation.

**Fixture đúng — hai blocked cases:** source42b8b1a1 clean, COD/check-prefix “B composed blocked fallback completes Inbox ”: **2/2 PASS**, source42b8b1a1, providerGenerations0, testDatabaseDropped=true. Public/private NO_SEND có rows PROCESSED và lease không còn current; không gửi text/ảnh hoặc tạo handoff event giả.

Exact command:
`python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-silent-fallback-blocked-valid-20261028-r2' COD --check-prefix 'B composed blocked fallback completes Inbox '`

**Hai full synthetic acceptance runs — giữ FAIL thực tế:** COD và BANK_TRANSFER đều dừng sau **61 checks PASS và 1 FAIL** ở assertion variant cũ (đòi NO_SEND thay vì HANDOFF im lặng). Cả hai exit1 và databaseDropped=true. Các runtime checks trước đó gồm recovery/unknown commits/private checkout/current Inbox đã PASS. Không gọi hai run này là full PASS.

Trong mỗi full run: hai blocked checks có matrix fixture cũ không hợp lệ; năm candidate-only mixed-media callbacks trả về mà không chạy body khi thiếu candidate flag. Những dòng PASS đó không được dùng để claim coverage đã thực thi tương ứng. Hai checks sau variant chưa chạy trong process full; được chạy riêng trên source24a2 như dưới đây.

- COD output: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-silent-fallback-review-fix-cod-20261028-r1`.
- BANK_TRANSFER output: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-silent-fallback-review-fix-bank-20261028-r1`.
- Commands dùng cùng source-session và isolated-integration.mjs, lần lượt truyền đúng output directory và COD/BANK_TRANSFER; không provider flags.
- COD bắt đầu trên e836de67 +dirty source, BANK trên clean33e0fc14; runtime bytes dùng cùng fix33e. Hai process đã load driver trước P3 fix42b8b1a1. **Hai blocked cases trong mỗi full run có fixture invalid matrix, không dùng chúng làm evidence đóng missing-rule finding**; evidence đúng là run2cases42b riêng ở trên.
- Giữ report thực tế, không viết đè hoặc sửa raw kết quả cũ thành run42b.

**Focused PostgreSQL sau sửa:** 6/6 checks PASS trên 5 process, source sạch tại thời điểm khởi chạy:
- 42b8b1a1: blocked public/private 2PASS, fixture schema hợp lệ.
- 55caff8c: no-chart combined `--handoff-delivery-only --check-prefix 'B composed no-chart fallback'`, 1PASS; zero text/ảnh/delivery gates.
- 24a2ed1b: `--check-prefix 'B composed exact cart variant'`, 1PASS; original STALE không gửi draft, handoff event/tag/HUMAN và processed Inbox.
- 24a2ed1b: `--check-prefix 'B composed clarification rollback'`, 1PASS; prerequisite tạo qua ports thật và append-only events giữ nguyên.
- 24a2ed1b: `--check-prefix 'B qualification shared queue'`, 1PASS; observed invalid attempt được giữ, slot sau NOT_RUN, không dispatch thêm.

Các commands đều dùng `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '<new external directory>' COD` rồi thêm flags tương ứng. Paths run3/run4 và SHA256 raw report nằm trong [verification record](../../apps/worker/evals/single-agent-commerce-read-only/silent-fallback-review-fixes-20261028/VERIFICATION.json). **7/7 database test đã DROP, providerGenerations=0 tất cả**. Runtime file diff33e→24a2 rỗng; không gộp nhiều source thành một full campaign hoặc viết lại kết quả FAIL cũ. Chưa chạy lại một full COD/BANK_TRANSFER trọn vẹn sau các driver-only fixes cuối.

## Giới hạn

Chưa có fresh model campaign, live delivery hoặc SLA bàn giao. Không cập nhật lại tỷ lệ37/9/4/1 từ campaign trước. Các vấn đề chất lượng tư vấn, semantic scope và upstream media vẫn còn theo review riêng. Không merge, deploy, source publish hoặc B GO từ approval này.

