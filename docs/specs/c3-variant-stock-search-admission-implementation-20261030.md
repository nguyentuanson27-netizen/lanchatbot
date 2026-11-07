# Phase C — implementation variant claims và search admission

Implementation base `3c793f6cb486b240b09911bd85891f99e298f239`. **APPROVE IMPLEMENTATION** bởi reviewer độc lập cho exact executable source `3a06936f8f43b7b31e09215fd8cd516f79797429`, clean khi chạy PostgreSQL cuối. [Approved plan](c3-variant-stock-search-admission-fix-plan-20261030.md), [verification](c3-variant-stock-search-admission-verification-20261030.json), [implementation review](c3-variant-stock-search-admission-implementation-review-20261030.md). Chưa chạy model/campaign mới, không merge/deploy/live send.

## Kết quả sửa

**Cart nhiều size:** canonical `cv2:<sha256>` scope tính từ parent/offer và component tuple gồm size/màu/BOM/multiplicity, không từ lineId, số lượng dòng, giá hoặc tồn. Contracts giữ browser-safe bằng callback SHA256 do code worker/business-tools/DB cung cấp; thiếu/invalid hasher trong exact mode fail closed. Cùng biến thể cộng tổng nhu cầu, khác size không bị coi là cùng stock assertion. Cùng key nhưng khác sourceVersion/evidenceRef/authority/value vẫn conflict, kể cả số tồn bằng nhau. Unicode component ordering dùng codepoint, không phụ thuộc ICU.

Worker tạo exact claims ở native lane của hai builder realtime-sales-cycle và ingress egress builder đã phát hiện thêm khi audit. Conversational selectionRef(lineId) giữ riêng; legacy C3 offer-scope producer giữ tương thích, nhưng legacy multi-variant cùng offer/mixed scopes/shared component không được bypass validator. Cả business-tools và hai DB guards nhận components từ full cart; DB tự derive scope dưới cartStateHash, không tin model hoặc caller-provided variant digest. Không có SQL/CartV1 migration.

Resolver bind inventory source/counter/unit vào inventoryVersion ở cả legacy và candidate mode. DIRECT chỉ có unit bán lẻ với một component quantity1 khớp row selectors; BOM dùng một parent variation ID duy nhất, không lấy parent quantity làm child capacity. Raw row/offer source disagreement, parent IDs mơ hồ, unknown/missing independence hoặc overlapping component ID **hoặc** SKU đều fail closed trong mixed selections. Không tự chuyển nhu cầu vượt tồn thành PRE_ORDER. Đây không phải inventory reservation/decrement hoặc bảo đảm mọi thay đổi POS sau read cuối.

**Search:** giữ slot cho initial bound targets dù chưa hydrate; union của reserved IDs, admitted evidence và candidate evidence không vượt4. Giữ subject8/claim32 và native budget hiện hành, gồm lossless duplicate projection của product fields đã có trong snapshot. Vượt cap reject toàn search trước publication; không drop candidate âm thầm, evict fact cũ hoặc báo shop hết hàng.

Search và read/prepare có staged offer/POS pins, source baseline được capture trước await, kể cả invokeBatch eager fetch. Nguồn cũ trả về muộn không ghi đè pin/context mới; same identity giữ literal/expiry đã admit. Optional preparation admit chạy đồng bộ nên rollback staging không vượt await và không xóa admission song song. Double catalog failure hoặc sai product trong details preparation không xóa independent evidence cũ; final readback vẫn fail closed. Known bounds/source conflicts có closed reason, unknown error không lộ raw exception.

## Bằng chứng thay đổi hành vi

Replay cùng frozen world hash `a46067d9e203eff5c5f77f6447b3b9b3efe04df813fae43091d71dbb605a4f0e`, clock/query/captured search candidates của lượt cũ:

- Trước sửa: search nhận V406/SQ748/V168; đọc SQ2447 thành công, SV2447 thành SOURCE_ERROR vì hết slot. Sau sửa: search bị PRODUCT_BOUND, cả SQ2447/SV2447 vẫn đọc OK; không search cũng cả hai OK.
- Actual AO/L tồn **8**, AO/M tồn **14**, mỗi chiếc499000. Sau sửa hai exact claims cùng qua validator và source independence; hai dòng M tổng15 vẫn bị chặn. Không cộng tồn M/L hoặc dùng mỗi line một quota.
- Actual isolated PostgreSQL kiểm M/L commit, receipt-backed removal, tamper size sau readiness bị DB reject atomically, và raw counter chung bị chặn. Toàn bộ76checks và7existing invariants PASS trên exact3a06936f; sourceDirty=false, DBdropped=true, generation0, sendEnabled=false.

Replay là component diagnosis, không provider/E2E model quality. PostgreSQL dùng synthetic domain inputs và existing current-policy capture; không gọi đó là live customer acceptance. Historical grades/raw và Phase C thresholds không đổi.

## TDD, savepoints và review fixes

1. RED trước runtime edit: contracts3FAIL/1PASS và target-search1FAIL; logs giữ nguyên. Initial RED shell wrapper in tail đã trả0 nhưng Vitest command bên trong exit1 được log rõ, không ghi test PASS.
2. `b60cc274`: F1 exact scopes, full cart consumers, source units. `d4ad7f2a`: F2 reservation/staging.
3. Reviewer phát hiện same-value/different provenance, locale ordering và deferred old search overwrite newer full read. `e7ff2e3d` đóng các finding bằng exact signatures/codepoint comparator/final source reconciliation và regression tests, gồm cả hai DB guards.
4. `f39383c5`: counter binding mọi resolver modes. `3d2ba008`: test harness kết thúc rejected inbox sau atomic assertions để chạy ca kế tiếp; không nới runtime guard.
5. `050db1dd`: prepare double error/sai product RED3→GREEN; synthetic composed fixture bổ sung stock-source metadata như producer để test thật độc lập size thay vì giả sử nguồn unknown vẫn eligible.
6. `3a06936f`: reviewer xác nhận thêm chiều reverse race. RED4 cho full/details/batch/prepare→GREEN; thêm same-source positive giữ expiry. Không queue/framework hoặc thêm model role.

Giữ failed PG01 (next-case lease lỗi sau M/L/tamper PASS), PG02 (synthetic composed fixture thiếu source units), PG03 PASS76 tại050, PG04 PASS76 tại3a. Mọi DB đều dropped. Không chọn chỉ report thành công rồi giấu failed attempts.

## Commands thực chạy và kết quả

Chi tiết logs/SHA256/commands trong verification JSON; counts dưới đây là kết quả từng suite, không cộng các lượt chạy lại thành coverage mới.

```powershell
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts src/v2/cart-variant-readiness.test.ts
pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/database exec vitest run --no-file-parallelism src/realtime-runtime.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-selection-compact.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker test:evals
pnpm -r --filter "@lana/worker^..." build
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/database typecheck
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-variant-search-pg-20261030-04 COD
node ../c3-variant-search-postfix-final-replay-20261030.mjs
git diff --check
```

Final: worker focused **507PASS**, Node **768PASS/2existingSKIP**, contracts **71PASS**, business-tools **55PASS**, database **56PASS**; shared/worker typechecks, dependency builds, worker build/lint exit0. Shared source bytes unchanged between their focused verification and final3a; no claim shared suites reran at every worker-only savepoint. PostgreSQL final76/76 and7/7 invariants PASS. Existing `validateRealAdapterReport` validates source/clean/drop/generation/send/count identities; emit witness records compiled module before actual final PG process creation.

## Hạn chế còn lại

Mixed cart mà nguồn không chứng minh được stock independence vẫn BLOCKED; không mở inventory framework để cho tất cả mixed offers qua. Các source ảnh/chart thiếu/hết hạn, ambiguity, owner planning và giọng tư vấn chưa được sửa ở patch này. Không thêm regex/parser/router, không nới verifier hoặc caps, không hardcode policy, không đổi prompt/model/corpus hay scoring. Giữ COD/private intake, quote bắt buộc ảnh, source freshness, handoff silent, revision/recipient/permission/effect receipt và group delivery gates.

Chất lượng model sau sửa **NOT_RUN**. Phase C vẫn BLOCKED, C3 comparison NOT_RUN, B_NOT_GO. Approval implementation chỉ xác nhận scope code/evidence này; không phải GO thay kiến trúc hoặc quyền deploy.
