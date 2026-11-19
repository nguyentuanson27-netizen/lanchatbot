# Phase C — sửa phạm vi claim biến thể và admission của search

Revision 1 — **APPROVE PLAN** sau self-review và independent review; [review record](c3-variant-stock-search-admission-independent-20261030.md). Đây là **kế hoạch**, chưa sửa runtime hoặc chạy model.

Planning base: `3f383c3ddd226b85dc280877a963983596165561`. Runtime repair trước: `e6880a70cbbb2eb0745c2b008b0a4617005a71d5`; model run source: `fe4b82932137df01fea85e974c4a562e00e7204f`. Giữ PR392 đang draft và stacked base cuối B `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`; không rollback toàn bộ B/C.

## 1. Mục tiêu và bằng chứng

Khách hỏi hai mẫu đã xác định phải đọc được cả hai; khách mua hai size hợp lệ phải thêm được vào giỏ. Sửa hai lỗi deterministic đã tái hiện, không tìm cách làm owner tránh tool hoặc ép verifier cho qua.

Nguồn: [review toàn lượt](../../apps/worker/evals/single-agent-commerce-qualification/bc-repair-rerun-20261030/REVIEW_ADDENDUM.md), [replay](../../apps/worker/evals/single-agent-commerce-qualification/bc-repair-rerun-20261030/REPLAY_EVIDENCE.json), spec C3 và boundary amendment, kế hoạch qualification hiện hành. Giữ nguyên raw/grades/rubric của lượt đã chạy.

| Root cause | Bằng chứng | Kết quả cần có |
|---|---|---|
| Claim cart chỉ dùng `parentProductId + offerId` | j1: AO/L tồn 8, AO/M tồn 14; từng line hợp lệ, ghép lại thành CLAIM_CONFLICT | L1 + M1 qua readiness/transaction, không gộp hai tồn; cùng M trên nhiều line vẫn cộng nhu cầu |
| Search chiếm slot evidence của target có sẵn | s02/s07/s13: V406/SQ748/V168 chiếm 3 slot, SQ2447 vào slot4, SV2447 thành SOURCE_ERROR; không search thì cả hai đọc được | Search không lấy ngân sách đã dành cho SQ2447/SV2447; lỗi cap rõ ràng, state cũ còn nguyên |

Không tuyên bố hai sửa này giải quyết toàn bộ 22 ca. Giữ các sửa đã đạt: CANDIDATE_SELECTION_V2, tuple owner/verifier parity, COD/private intake, negotiation, media freshness và response-group delivery.

## 2. F1 — identity của cart claim phải khớp biến thể thực

### 2.1 Một hàm canonical dùng chung, không lấy lineId làm identity

Thêm helper thuần tại contracts, tính `cv2:<sha256>` từ canonical preimage có version, `parentProductId`, `offerId` và toàn bộ component tuple đã validate: componentProductId, componentSku, componentRole, color, size, component quantity. Sort canonical; xử lý component lặp bằng cùng quy tắc chuẩn hóa, không mất multiplicity. Giữ phân biệt null/NO_COLOR và các size. Không đưa lineId, line quantity, giá, stock quantity, observedAt hoặc sourceVersion vào identity: đổi tồn/giá phải tạo conflict/value mismatch của **cùng** biến thể, không tạo identity mới để né guard.

Helper tính từ full CartLineV1 đã parse; không nhận variantId do model cung cấp. Dùng exact key cho PRICE/STOCK/ETA của cart selections ở cả hai producer trong realtime-sales-cycle: freshReadiness và protected outbound cart claims. Public `selectionRef(lineId)` của verifier vẫn phục vụ referent riêng; không đổi hàng loạt thành key readiness.

Shared cart validator nhận projection có components từ full line, không tiếp tục bỏ size/màu/BOM tại business-tools hoặc hai DB consumers. So exact scope, amount, priceFactRef và required types. Cộng `line.quantity` theo exact key trước kiểm stock; không cộng tồn M + L. Hai line cùng key phải thấy cùng content/provenance hợp lệ; claim khác giá/stock cho cùng key vẫn conflict. Cart-level policy/media scope giữ nguyên.

### 2.2 Logical identity không phải bằng chứng hai kho vật lý độc lập

`pos-snapshot-core.ts` có PANCAKE_DIRECT, PANCAKE_BOM và FALLBACK_SKU_RULE. PANCAKE_BOM lấy stock quantity của **parent POS variation**; không phải capacity riêng của mỗi component. Vì vậy không dùng hash component để tự cấp hai quota tồn hoặc suy SET stock thành child stock.

Giới hạn sửa: không thêm inventory platform, không reservation/decrement POS, không migration CartV1/SQL. Resolver hiện có sẽ dựng mô tả source counter nội bộ từ row đã chọn, đưa inventory_source + counter identity/unit vào inventoryVersion preimage và kiểm cả tập fresh selections. Mô tả này là dữ liệu code từ source, không phải model input hay tên pool tự đặt. Không tăng capacity so với quantity từ row hiện hành.

| Nguồn | Identity/unit có thể dùng | Khi không chứng minh được độc lập |
|---|---|---|
| PANCAKE_DIRECT | source component SKU + exact size/color đã resolve, đơn vị sản phẩm bán lẻ; alias cùng tuple có thể tiêu thụ cùng counter | Khác logical key có component tuple trùng: BLOCKED, không mỗi alias được một quota |
| PANCAKE_BOM | Một parent_variation_id duy nhất có binding nhất quán với exact row; quantity tính theo parent offer, không theo child | Nhiều/thiếu parent IDs, same parent counter hoặc overlap component khác logical key chưa đủ chứng cứ: BLOCKED |
| FALLBACK_SKU_RULE | Giá trị min(component stock) chỉ chứng minh giới hạn của một selection, không chứng minh các offer độc lập | Mixed selections có khả năng dùng chung component: BLOCKED; không lấy min đó làm stock riêng cho từng child |
| Unknown/malformed/hidden source | Không tạo thêm authority | Fail closed theo readiness/source reason; không suy quantity hoặc ép IN_STOCK |

Raw source kiểm ở resolver/fresh selection + readback hiện hữu; DB không gọi POS và không được mô tả như tự xác minh kho. DB replay tính lại exact key và conservative overlap từ full cart components dưới cartStateHash. Với logical keys khác nhau, possible alias được phát hiện khi **cùng canonical componentProductId HOẶC cùng canonical componentSku**, và size/color không chứng minh được tách biệt. Không ghép ID+SKU thành một key rồi coi SKU khác là độc lập: DIRECT SV2447_AO và BOM variation SKU SV2447_AO_M có thể vẫn là cùng áo M. Null/unknown selector không chứng minh hai pool khác nhau. Gặp overlap thì shared validator chặn; không suy quantity vật lý từ component hash. Exact key giống nhau thì sum line quantity (và giữ component multiplicity), không chặn chỉ vì lineId khác nhau. Với multi-variant cùng offer, source check phải chứng minh các row/counter khác nhau (như M14/L8); không được mặc định mọi tuple khác nhau là pool độc lập. Các source descriptor hiện có không đủ thì chỉ path đó BLOCKED, không mở rộng schema/publisher để cứu ca.

PRE_ORDER chỉ theo source/policy đã resolve và thời hạn tương ứng; không dùng PRE_ORDER của một alias để bỏ kiểm tồn của alias khác, không chuyển PRE_ORDER thành IN_STOCK. Hai line riêng IN_STOCK nhưng tổng vượt tồn phải BLOCKED; validator không tự đổi thành PRE_ORDER dù shop có policy cho đặt trước. Muốn đặt trước phải có fresh resolver authority cho tổng nhu cầu. Mixed/ambiguous source không được aggregate bằng giả định.

### 2.3 Compatibility, transaction và final gate

- `cv2:` là namespace versioned, không âm thầm diễn giải offerId cũ thành exact key. Không đổi generic product claim semantics ngoài cart.
- Cart-bound claims dùng đồng nhất exact mode; mixed legacy/exact required cart claims bị reject. Legacy all-offer scopes chỉ giữ đường tương thích khi mỗi parent+offer có đúng một canonical variant và không overlap; nếu nhiều tuple thì fail closed và phải fresh-resolve tạo readiness mới. Không import PASS/readiness cũ như exact evidence.
- Giỏ cũ giữ nguyên full lines; lượt mới resolve lại selections rồi tạo claims/readiness mới. Old pending readiness không sửa hash để gửi lại. Không viết lại receipts hoặc giả mutation đã thành công.
- Sửa đồng bộ `realtime-sales-cycle.ts`, `realtime-sales-catalog.ts`, contracts canonical-evidence-readiness, business-tools effect-readiness và hai guard trong database/realtime-runtime. Audit tất cả callers bằng rg, gồm CART_OPEN/MUTATION/READY, preview/confirmation và protected outbound. Generic precheck phải chấp nhận exact scopes đúng, vẫn bắt conflict cùng key; không bypass nó.
- Giữ cartStateHash full CartV1 (đã chứa components), offerBindings, price/source versions, claimSetHash, revision, intent, checkedAt/expiresAt, policy, recipient/permission/privacy, idempotency, preview hash và receipts. Đổi component sau readiness phải mismatch dù offerId/lineId/giá giữ nguyên.
- Source/stock đổi giữa verification và final readback/commit: invalidate và silent handoff/no-send theo quy tắc hiện hành; không dùng PASS cũ, không thêm repair/reverify loop. Freshness/claim hashes không được giả làm reservation hay chống mọi thay đổi POS sau lần read cuối.

## 3. F2 — search admission dành chỗ cho target đã có

Chọn **all-or-nothing admission**, không tạo candidate promotion framework/partial evidence protocol.

1. Khi tạo tools, chụp tập R là distinct PRODUCT IDs đã bound ban đầu, gồm currentProductId chỉ khi ref hợp lệ/bound. Đây là code scope sẵn có, không phải phân loại ý khách hoặc state semantic mới. R chưa hydrate vẫn giữ slot; R đã có trong products chỉ tính một lần.
2. Với search candidates có heavy evidence C và tập product evidence đã admit P, tính `U = R ∪ P ∪ C`. Nếu `|U| > 4` trả `REJECTED / PRODUCT_BOUND` **trước publication**. Các bound subjects khác cũng phải không vượt8; claims≤32, existing context/result/wire limits giữ nguyên. Reservation không bảo đảm mọi all-offer read đều vừa các cap khác.
3. Kiểm admission trước metadata I/O, kiểm lại sau mọi await ngay trước publication; không có await giữa kiểm cuối và publish đồng bộ. Staging local phải bao gồm cả `offerPins`: helper offerLiteral hiện ghi pin ngay lúc đọc metadata nên cần tách tính literal/pending pin khỏi publication. Áp dụng cùng nguyên tắc cho hints/prepared/posPins bị chạm trong path admission. Không snapshot/restore toàn map sau await vì có thể xóa một concurrent admission hợp lệ. Chỉ read metadata theo fanout hiện có, không thêm read giá/tồn hoặc fanout hydrate targets ngầm. Search không cần thiết vẫn có thể bị reject; owner còn target refs để đọc.
4. Rejected search không bind candidates, không ghi products/offerContexts/searchReads/claims và không sửa evidence đã có. Không biến thành NOT_FOUND, unavailable stock hoặc SOURCE_ERROR. Unknown exception vẫn closed SOURCE_ERROR, không trả raw exception/PII.
5. Explicit reads/prepare cũng tôn trọng reservation cho các target còn thiếu: `R ∪ P ∪ {requestedId}` không vượt4. Staging và source awaits không được tạo partial publication khi cap/source admission fail. Không evict sản phẩm/fact/receipt cũ hoặc xóa proof sau PASS.
6. Existing no-target discovery3candidates vẫn được admit nguyên vẹn khi mọi cap hợp lệ. Search lại candidate đã có không thay fuller reads, không tiêu slot kép. Initial targets vượt capacity là invalid scope fail closed rõ, không tự drop target.

Áp dụng trong single-agent-commerce-read-only-tools; audit wrapper/snapshot/readback/context/telemetry để kết quả cap không tự đổi thành missing-shop-data/source outage. `PRODUCT_BOUND` là lỗi admission tool, không phải bằng chứng shop không có hàng. Không thêm câu “đừng search” vào prompt hoặc parser tiếng Việt.

## 4. TDD và acceptance matrix

Trước runtime change, thêm focused tests và **quan sát RED** cho M/L conflict và reserved-target crowding. Lưu log/version. GREEN tối thiểu sau đó mới broaden kiểm shared consumers.

| Nhóm | Controls bắt buộc | Assertion |
|---|---|---|
| F1 actual | Actual M14/L8, L1→thêm M1; mỗi size tồn/giá đúng | Cùng scope helper worker/shared/DB, giỏ2line, receipt đúng một lần |
| F1 aggregate | Hai lineId khác nhau cùng M, sum dưới/đúng/vượt14; duplicate components; reorder components | Identity không đổi do lineId/qty/order; không cấp quota lặp hoặc mất multiplicity |
| F1 source units | Direct aliases cùng SKU/size/color; AO+SET chung component; BOM parent pool same/different/missing/multiple; fallback min; source unknown | Conservative BLOCKED khi chưa có independent capacity; không đòi mọi mixed-offer phải PASS |
| F1 conflict | Cùng key khácstock/price; priceFactRef khác; legacy multi-size; mixed namespaces; missing claim; malformed line | Guard vẫn chặn, không chỉ đổi key cho tất cả đều PASS |
| F1 tamper/replay | Đổi size/color/component quantity sau readiness; stale source; expired sau verifier; concurrent revision; duplicate receipt; private/payment changes | Atomic reject, giỏ/revision/receipt/Outbox không partial; stale PASS không cấp quyền |
| F2 actual | R={SQ2447,SV2447}, search3candidates cũ trước hai detailsOnly | Search PRODUCT_BOUND, không đổi maps; cả hai target đọc được, không SOURCE_ERROR |
| F2 normal/caps | R rỗng+3discovery; R trùng P; search target đã có; subject8/9, products4/5, claim32/33, result/context limits | Không double-count/tăng cap; response reason đúng; không mất full evidence |
| F2 async | Consecutive/concurrent search+search, search+prepare/read; source error giữa staging; changed source sau PASS | Atomic publication; reservations/caps giữ sau awaits; readback invalidates changed proof |
| Compatibility | Quote form+ảnh, media freshness, policy shipping/discount/COD, handoff silent, correction out-of-range, private intake | Không bỏ ảnh bắt buộc, không thêm customer fallback text, không rò PII hoặc phá quy tắc đã chốt |

Replay source/clock/query cố định trên current-before/current-after; có finalB control khi helper tương thích. Không đổi nguồn hết hạn thành mới. Development cases đã lộ không trở thành fresh holdout.

## 5. Trình tự thực hiện và kiểm chứng dự kiến

P0: chốt plan qua cùng independent reviewer đến APPROVE PLAN. Task hiện tại dừng ở đây.

Khi owner yêu cầu implementation: P1 RED→F1→GREEN savepoint; P2 RED→F2→GREEN savepoint; P3 focused/shared/build/actual PG; P4 independent exact-source review→fix→review APPROVE và delivery record. Không tăng benchmark/model repetitions, không tự chạy campaign hoặc fresh qualification.

Commands dưới đây **CHƯA CHẠY cho bản sửa mới**, là commands dự kiến từ repo root:

```powershell
pnpm -r --filter "@lana/worker^..." build
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts
pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/database exec vitest run --no-file-parallelism src/realtime-runtime.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-selection-compact.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/database typecheck
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker test:evals
```

Nếu thêm test file, ghi chính xác command/file mới trong implementation evidence. Build dependency graph ở đầu và worker build bao gồm các shared packages đã đổi. Thực PostgreSQL dùng isolated-integration hiện hữu, bổ sung M/L và tamper/alias invariants vào adapter tests trước khi chạy:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-variant-search-pg-20261030-01 COD
```

Dùng ephemeral DB đúng route đã có, không live mutation; giữ mọi failed attempt, DB cleanup, request accounting phải generation0. Kiểm đủ7 `REAL_CHECKS` hiện có: stale_revision, duplicate_source, crash_after_commit, ambiguous_reconciliation, operation_idempotency, history_outbox_recovery, no_duplicate_effect; thêm assertions M/L, alias/tamper và privacy/authority riêng, không gọi tất cả là tên7invariants. Nếu PG unavailable thì ghi NOT_RUN/BLOCKED, không gọi unit mock là actual PG. Không cần source publisher write, migration hoặc deploy.

## 6. Review gates, dừng và hạn chế

Plan/implementation review phải xem riêng: identity không né conflict; aggregate không nhân quota; raw BOM stock unit không bị hiểu sai; worker/shared/DB không lệch; reservation không phá discovery/atomicity; no regression of protected facts/media/private state. Review record ghi exact document hash/revision, finding và cách đóng. APPROVE PLAN không đồng nghĩa APPROVE CODE/Phase C GO.

Nếu không chứng minh được source counter/unit bằng dữ liệu hiện có, đóng path affected bằng reason có thể audit và handoff silent; báo hạn chế, không kéo thêm stock framework vào patch. Không coi source descriptor hash là tự thân một capacity proof.

Ngoài scope: sửa giọng hàng loạt, hardcode policy/size, source ảnh/chart publication, nới verifier, semantic router/parser/third role, production entrypoint wiring/deploy, sửa scoring sau unmask, C3 matched comparison hoặc chạy lại model. Phase C vẫn BLOCKED/C3 NOT_RUN/B_NOT_GO; stock snapshot check không phải reservation chống cạnh tranh POS.
