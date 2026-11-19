# Phase C — kế hoạch sửa target size, cấu trúc combo và continuation

**Trạng thái: APPROVED PLAN revision 2.** Independent reviewer `/root/b_preserving_independent_review` đã đóng hai findings, không còn material finding. Approval chỉ dành cho kế hoạch; chưa triển khai hoặc chạy model. Planning base: `21c497684040553fdd7faff395980a1ae61d1615`. Source của model run đã đo: `69bd122100f51584acd6d2ac97dde9254b3e562c`. Lượt này chỉ lập, sửa và review kế hoạch; chưa triển khai hoặc gọi provider.

Nguồn chuẩn: [spec kiến trúc](c3-single-agent-commerce-architecture-20261004.md), [verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [kế hoạch giữ khả năng B](c3-phase-c-b-preserving-infrastructure-plan-20261104.md), [run 13 ca / 24 lượt](../../apps/worker/evals/single-agent-commerce-qualification/b-preserving-run-20261105/REPORT.md), [hội thoại](../../apps/worker/evals/single-agent-commerce-qualification/b-preserving-run-20261105/CONVERSATIONS.md), [audit và replay](../../apps/worker/evals/single-agent-commerce-qualification/b-preserving-run-20261105/evidence/POST_RUN_AUDIT.json). Prefix cũ FAIL; 21 ca / 31 lượt còn lại NOT_RUN. Giữ nguyên các kết quả lịch sử.

## 1. Mục tiêu và những gì phải giữ

Khách hỏi tổng combo phải nhận đúng giá và cấu trúc có nguồn. Khách hỏi size từng phần phải nhận kết quả dùng được. Khi khách đổi số lượng hoặc size nhưng chưa chọn màu, bot giữ điều đã biết và hỏi phần còn thiếu. Thao tác thông thường không được rơi vào handoff chỉ vì adapter trình bày sai hoặc request quá dài. Đo việc khách cần đã được xử lý tới đâu, không đo số keyword hay tỷ lệ verifier PASS thay cho hiệu quả bán hàng.

Giữ một owner Gemini 3.5 Flash Lite HIGH và tối đa một verifier GPT-6.1 Sol HIGH. Code giữ authority cho identity, truth, freshness, state, permission, effects, receipts và privacy. Giữ cap 6 primitive / 2 tool rounds / 3 owner / 1 verifier, giới hạn text 65.536 bytes, generation retry 0. Final gate và durable response-group gate không được bỏ qua.

Thiếu dữ liệu shop thì silent handoff; thiếu thông tin khách thì hỏi bổ sung. Không thêm third online role, semantic router, parser tiếng Việt, cache authority, repair/reverify loop hoặc generic provider framework. Không nối production entrypoint, live source write, migration, merge, deploy hoặc live send.

Mặc định giữ prompt owner và verifier. Chỉ sửa mô tả tool kỹ thuật nếu producer/consumer contract thực sự thay đổi; ghi exact diff và hash, không thêm ví dụ riêng cho benchmark. Không mở vòng sửa giọng hàng loạt, không đổi model/ngưỡng/repetitions. Giữ đúng các owner approvals về body maxima ngực/mông, shared chart, WHITE/test feedback/new SD023 asset, policy và việc bỏ TTL tuổi ảnh; không tự gộp giá/tồn/chart theo tên.

## 2. Findings và trách nhiệm xử lý

| Finding | Bằng chứng | Phần cần xử lý |
|---|---|---|
| p07: hai SIZE_FIT hợp lệ bị CLAIM_CONFLICT | Replay exact 9 claims; engine tính TOP/PANTS M, verifier và binding PASS, egress NO_SEND | Shared contract conflict identity và các consumer ingress/DB |
| p06: mất cấu trúc ba món | SD023 COMPOSITE có một SD023-AO và hai QD001; row L chỉ đảo thứ tự nhưng projection ghi VARIANT_DEPENDENT | Source projection, không phải khách chưa nêu rõ mẫu |
| j1: continuation 66.933 > 65.536 | Hai add_to_cart trả COLOR_REQUIRED; continuation bị chặn trước HTTP | Wire representation; owner gọi mutation trước khi giải quyết màu thiếu |
| p08: cuối cùng hỏi màu nhưng thử đổi giỏ trước | Owner truyền sentinel của set sang áo, rồi thử null; chưa commit đổi giỏ | Làm rõ kết quả truy vấn chưa đủ lựa chọn; không mặc định lỗi engine mutation |
| s03: mô tả ảnh vượt bằng chứng | Có DETAIL nhưng chưa xác nhận ảnh thể hiện phần ren; verifier FAIL | Asset semantics và đường xem ảnh; không nới verifier mặc định |
| s13/j4: provider malformed | HTTP 200, MALFORMED_RESPONSE / MALFORMED_FUNCTION_CALL | Completion failure; chưa có bằng chứng code gây ra |
| s15: UNKNOWN_FIELD | HTTP 200 STOP, decoder reject; chưa đủ raw args để xác định field | Chẩn đoán owner/tool contract; chưa đủ căn cứ mở schema |

Phải bảo toàn p04 giữ fit sang lượt hỏi giá, p09 tiếp tục đúng set quần, j2 ngực 88 chọn M cùng correction/fit preference, p08 hỏi màu thay vì handoff. j6 đã lưu COD nhưng tên còn thiếu nên hỏi tên là đúng; đây chưa phải checkout hoàn tất.

## 3. S1 — phân biệt target trong conflict identity của SIZE_FIT

Files dự kiến: `packages/contracts/src/v2/canonical-evidence-readiness.ts` và test. Audit producer `packages/business-tools/src/protected-claims.ts`, consumer `apps/worker/src/single-agent-commerce-ingress.ts` và `packages/database/src/realtime-runtime.ts`. Chỉ sửa consumer nếu cần dùng contract chung; không thêm rule bỏ conflict riêng ở ingress.

1. Quan sát RED với hai current component claims cùng parent/variant null, TOP và PANTS nhưng contentHash khác. Kiểm cả shared readiness lẫn persisted ingress/capture.
2. Key của riêng SIZE_FIT phải gồm target chính xác: PRODUCT theo productId; COMPONENT theo parentProductId, componentProductId và componentRole. Giữ scope/product/variant gốc. Legacy claim thiếu fitTarget chỉ đại diện PRODUCT của scope; không được làm wildcard cho COMPONENT.
3. Không đưa contentHash, profile revision hay recommended size vào key để tách hai lời khẳng định trái nhau thành hai đối tượng hợp lệ. Cùng target nhưng khác size/profile/fingerprint/source vẫn phải conflict hoặc bị stale/revision gate hiện hành chặn.
4. Sai parent/role/target hoặc thiếu target của component không được cấp quyền component. Khác customer/recipient không được cùng context. PRICE/STOCK/ETA/policy conflict behavior giữ nguyên.
5. Cùng validator phải chạy khi dựng readiness và trong transaction. Không bỏ receipt, media hoặc delivery readback.

**Test matrix:** TOP/PANTS khác target PASS; PRODUCT và COMPONENT phân biệt đúng; legacy PRODUCT và explicit PRODUCT cùng đối tượng không được tách conflict; cùng target M/L hoặc source/revision khác BLOCK; parent mismatch BLOCK; chart hết hạn, profile correction, recipient hoặc permission đổi sau verifier BLOCK; PRODUCT-only consumer vẫn reject COMPONENT.

**Acceptance:** real PostgreSQL synthetic flow tính hai target từ một lần cập nhật profile → verifier transport stub → full deterministic readiness → committed Outbox → capture text và opening image cùng group. Ghi rõ stub không phải provider evidence. Sau restart vẫn đọc lại đúng; contradictory claims cùng target phải không gửi sequence 0. Test engine trả RECOMMENDED hoặc finalGate riêng chưa đủ.

## 4. S2 — so sánh cấu trúc BOM không phụ thuộc thứ tự

Files: `single-agent-commerce-read-only-tools.ts`; reuse product-groups/selection helpers nếu có. Nếu public projection thêm quantity, cập nhật đầy đủ consumer `owner-product-tables.mjs` và roundtrip tests.

1. RED từ captured SD023: S/M/L có cùng một áo và hai QD001, khác thứ tự. Tách logical purchase composition khỏi exact variant tuple và stock identity.
2. Bản so sánh dùng multiset logical component identity và số lượng. Audit semantics của parser trước khi reuse: `realtime-sales-catalog.ts` có `positiveQuantity()` mặc định 1 cho một số input sai/thiếu, nên không dùng kết quả mặc định đó làm bằng chứng quantity của composition view. Logical quantity phải là positive safe integer từ source authority và trong bound của source contract. Missing/zero/âm/fractional/non-finite/unsafe integer hoặc overbound phải là INCOMPLETE_SOURCE/BOUND_EXCEEDED đúng nguyên nhân, không tự đổi thành 1. Legacy fallback 1 chỉ dùng nếu source contract xác nhận rõ mỗi entry tương ứng đúng một món; ghi contract/provenance riêng và test. Không suy default chỉ vì code cũ đang làm vậy. Chỉ order-independent trong composition view, không sửa/hash lại nguồn POS hoặc stock counter để che source change.
3. Không dùng Set làm mất duplicate SKU. Khi có product_sku, không dùng component_id hoặc variation_sku khác size làm logical product identity. Khi fallback ref không đủ rõ, không tự gộp.
4. Tổng quantity mới là số món, không phải độ dài array: hai entry cùng logical SKU, mỗi entry quantity 1, và một entry quantity 2 phải giữ tổng hai món khi nguồn xác nhận cùng composition. Một áo quantity 1 cộng hai quần quantity 1 phải giữ tổng ba món. Không bỏ multiplicity khi gộp; trường hợp quantity vượt bound không bung thành nhiều entry để né bound. Hai QD001 trắng/xanh vẫn là hai phần mua có variant riêng. Logical view có thể nói QD001 × 2; exact color/SKU/quantity vẫn nằm trong selection/source, không được coi các biến thể thay thế lẫn nhau hoặc tồn độc lập.
5. Role chỉ lấy từ nguồn/mapping hiện có. Nếu chưa biết loại món, giữ componentRef/quantity và trạng thái chưa biết; không tạo đặc tính hay loại trang phục từ suy đoán tên SKU.
6. Giữ bounds 64 rows và component/quantity bound hiện hành; nếu source không công bố quantity bound thì dùng validation/bound hẹp tại adapter được ghi rõ và review trước triển khai, không thay parser stock/cart toàn cục. Không bung quantity thành array vô hạn. Nếu phải mở rộng public component contract thì cập nhật pack/expand, hashes, size-applicability consumers và compatibility; không tạo framework mới.
7. Chỉ thay thứ tự không làm đổi cấu trúc. Thay component, multiplicity, quantity hoặc role thật phải được phát hiện. Incomplete/overbound/mixed structures vẫn có status đúng; không lấy ba entry đầu rồi gọi AVAILABLE.

**Acceptance:** read_product/quote_product cho SD023 giữ cấu trúc ba món và giá 989k của đúng COMPOSITE. Không ép search lại hoặc hỏi khách xác nhận mã vì false variance. Kiểm source readback, public projection roundtrip, duplicate/shared-stock controls, quantity 1+1 so với 2, total số món, invalid/missing/zero/fractional/overbound quantities. Raw exact stock/cart parser không đổi semantics theo logical view. Composition view không cấp quyền mua và không tự cộng giá lẻ thành giá combo.

## 5. S3 — thiếu lựa chọn phải rõ; continuation phải vừa bound

Files dự kiến: `single-agent-commerce-selection-evidence.ts`, effect-result producer trong `single-agent-commerce-effects.ts`, owner wire `gemini-inference.mjs`, các CompactV2 helpers và tests hiện có. Làm producer → consumer trước khi cân nhắc sửa mô tả tool.

### 5.1 Kết quả mutation chưa thực hiện

Reuse COLOR_REQUIRED/SIZE_REQUIRED, selectionEvidence và choiceResolution. Kết quả cần thể hiện được attempted action, exact target/query, trường thiếu, known options, completeness, expiry, source hash và việc chưa có receipt thành công. Chỉ thêm field nhỏ nếu contract hiện có thiếu hoặc mâu thuẫn; không tạo semantic state machine.

Không lấy `__NO_COLOR__` của lựa chọn cũ làm màu của lựa chọn mới. Sentinel là stock identity kỹ thuật của đúng tuple, không phải màu khách chọn. Null và explicit sentinel giữ nghĩa khác nhau; không đổi ngầm thành WHITE hoặc tự chọn màu để tăng pass. Với p08, owner truyền sentinel sai thì không âm thầm sửa args; kết quả phải cho owner đủ căn cứ hỏi đúng phần thiếu.

Với j1, khách bổ sung M/L vẫn chưa chọn màu. Giữ quantity/size vừa nói trong latest/history, không commit giỏ khi tuple chưa đủ. Code không parse prose để buộc model hỏi và không thêm router chặn toàn bộ tool sau COLOR_REQUIRED. Những target độc lập còn hợp lệ vẫn được xử lý; khách bổ sung lựa chọn thật vẫn phải thực hiện được. Technical marker không chứng minh owner sẽ thôi gọi tool lặp; phải đo bằng model.

### 5.2 Rút biểu diễn mà khôi phục đủ dữ liệu

1. Lưu exact captured j1 owner signed content, hai tool results, trusted snapshot và budget breakdown. Nếu failed request body không được capture đầy đủ, ghi rõ reconstruction và phần captured/derived; không gọi toàn bộ là byte-identical historical request.
2. Đo raw body, presented body và final encoded body với đầy đủ tool surface/callable phase thực tế. Bao phủ M/L batch, p08 sentinel → null, nhiều offers và trường hợp lớn trong frozen bounds. Không bỏ state/effect tools để làm request nhỏ.
3. Chỉ factor các selection observations trùng canonical value trong cùng body. Giữ query product/offer/size/color/quantity, status/reason/failed action, option identities, source/hash/version/clocks, completeness và receipt/operation IDs. Dùng exact local dictionary/current trusted có hash hoặc index được kiểm. Older/different query/source/expiry phải giữ local, không thay bằng dữ liệu mới.
4. Với cart success, giữ effect receipt, cart version và totals. Không bỏ toàn result chỉ vì trusted đã có một phần. Verifier vẫn kiểm exact draft với trusted hiện tại; compression không tạo authority.
5. Reuse CompactV2 pack/expand hẹp. Không cross-turn cache hoặc viết tắt buộc model đoán. Expansion utility dùng cho kiểm tra, không thêm model. Dangling reference, hash mismatch hoặc dictionary conflict phải reject trước provider.
6. Native model parts, thoughtSignature, ordering và call IDs giữ nguyên. Chỉ đổi presentation của code-owned tool response. Byte gate áp sau lossless transform đúng contract; raw audit vẫn giữ nguyên. Không truncate, tăng cap hoặc bỏ facts/receipts/history.

**Acceptance:** full logical request mở rộng trước/sau bằng nhau theo canonical equality; IDs/signatures/history không đổi. Giữ nguyên hai loại bound hiện tại: (a) text frame raw và presented trước inline images đều ≤ 65.536 bytes; request text-only có final encoded body ≤ 65.536 bytes; (b) request có inline images vẫn qua text gates đó, mỗi ảnh tối đa 512 KiB, tối đa 2 ảnh và full encoded multimodal wire ≤ 1.507.328 bytes theo `OWNER_IMAGE_BOUNDS`. Giữ MIME/hash/subject/source binding, thứ tự ảnh và media-resolution policy hiện hành; không áp nhầm text-only limit lên toàn body có ảnh và không tăng bất kỳ bound nào. Test dưới/tại/trên từng bound text, image count, per-image và full multimodal wire; quá bound vẫn fail-closed, 0 HTTP. Báo margin thực, không suy headroom nhỏ thành mọi context tương lai đều vừa. Đường biết trước vẫn quá bound phải ghi BLOCKED, không chạy model chỉ để tái thu lỗi.

## 6. S4 — ảnh và malformed: chỉ sửa khi có căn cứ

**Ảnh s03:** audit existing DETAIL asset/metadata, select/view contracts và khả năng xem đúng ảnh. Metadata DETAIL cho phép gửi theo loại đã duyệt, chưa tự chứng minh phần ren. Không bắt mọi ảnh phải xem; nếu owner muốn khẳng định chi tiết nhìn thấy chưa có trong metadata thì dùng view_product_media với đúng asset/byte hash khi còn budget. Nếu chỉ gửi ảnh theo metadata thì không thêm câu khẳng định nội dung chưa xác nhận. Verifier vẫn chặn protected assertion vượt nguồn.

Trước model phải kiểm asset type khác confirmed parts, thiếu ảnh/bytes lỗi/hash mismatch/revocation, instruction-like text trong ảnh, và product attribute không tự trở thành visual evidence. Không đổi nhãn DETAIL thành MODEL/feedback hoặc nâng metadata bằng suy đoán. Thiếu ảnh shop cần để đáp ứng yêu cầu thì handoff; thiếu thông tin khách thì hỏi; không trộn hai loại thiếu hụt.

**s13/s15/j4:** giữ malformed/error denominator. Trước bất kỳ sửa API/schema, kiểm tài liệu provider chính thức hiện hành. Replay schema đã expose so với decoder accepted args. Chưa có exact unknown field của s15 thì chưa mở schema/alias/parser.

Nếu cần, thêm evaluation-only diagnostics có bound: allowlisted tool name, failure stage, declared schema hash, args key count/types, known-field category. Không log raw PII/quotes/tokens/credentials/thoughts. Unknown key có thể chứa PII thì chỉ hash/category, không publish raw key. Không đưa diagnostics này cho owner/verifier.

Giữ safe public finish/status fields, 1 generation HTTP/attempt, không hidden retry; token refresh chỉ áp cho attempt sau. HTTP 200 MALFORMED_RESPONSE/FUNCTION_CALL tách khỏi decoder UNKNOWN_FIELD và local-bound 0 HTTP. Tìm được contract bug có exact evidence thì fix nhỏ kèm valid/invalid controls; chưa tìm được thì ghi limitation, không nói đã sửa. Không bỏ strict decoder để tạo success.

## 7. Savepoints và verification dự kiến

S1 → S2 → S3 → S4: quan sát RED → GREEN tối thiểu → self-review → independent review → fix nếu có finding → commit riêng. Plan approval không phải implementation approval. Tất cả command bên dưới là dự kiến, chưa có PASS của vòng sửa này.

```text
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts src/v2/customer-size-cart.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test --test-concurrency=1 apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/selection-compact-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-product-tables.test.mjs apps/worker/evals/single-agent-commerce-read-only/product-read-selection.test.mjs apps/worker/evals/single-agent-commerce-qualification/source-readiness.test.mjs
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/database typecheck
```

Database consumer/regression tests bắt buộc vì shared readiness đổi, dù không sửa database source. Shared build chạy qua worker prebuild; package bị chạm có focused tests/typecheck/build tương ứng. Nếu chạy canonical worker test thì ghi exact command/exit riêng; không gọi lệnh thay thế là canonical PASS.

Real PostgreSQL trên disposable DB, synthetic inputs và capture transport: multi-target accepted group; same-target conflict không gửi; source composition; thiếu màu không effect → khách bổ sung → mutation có receipt; current source thay đổi; delivery restart/revocation; j6 lưu COD khi còn thiếu tên; full preview/confirmation của ca checkout mới đã review. Dùng launcher/ports hiện có, không migration/live writes; await cleanup và kiểm DB đã drop. Tách scripted transport stub khỏi provider result.

B controls phải giữ: form báo giá và required opening image; giá/tồn/tổng/policy; height/weight và body maxima; correction/profile-once/multiple fits/selected offer; add/replace/multi-size/shared stock; negotiation; history/public interruption/private DLP; COD/preview/confirmation; silent handoff/HUMAN no-output. Historical replay dùng exact input/world/clock cũ, còn thực thi mới dùng current world. Ghi sourceDirty đúng thực tế; clean HEAD trước seal. Không dùng historical clock để giả freshness cho provider.

## 8. Model acceptance đề xuất sau implementation approval

User hiện chỉ yêu cầu lập/review kế hoạch. Phần này định nghĩa cách kiểm khi có lệnh triển khai/chạy; chưa cho phép dispatch trong lượt lập kế hoạch.

Giữ nguyên 34 ca / 55 lượt của bộ hiện có, bao gồm version ca checkout mới đã sửa trước provider. Không sửa lời khách để đủ màu hoặc ép tool. Nhánh khách chỉ theo frozen evaluator policy/code proof đã duyệt. Evaluator labels không vào runtime projection; test captured-request firewall bắt buộc. Giữ N1, model/effort/caps/ngưỡng; freeze source, test assumptions, prompt/config/corpus hashes trước results.

| Nhóm | Các ca và lượt | Điều kiện mở |
|---|---|---|
| R1 | p06(1), p07(1), p08(2), j1(3): **4 ca / 7 lượt** | Deterministic/source gates và independent implementation/input review đạt |
| R2 | p04(2), p09(2), s03(1), s13(1), s15(1), s16(1), j2(3), j4(3), j6(3): **9 ca / 17 lượt** | R1 không còn material task failure |
| R3 | **20 ca / 24 lượt** còn lại; giữ s11 BE là source-gap control | Đủ 13 ca / 24 lượt prefix không còn material task failure |
| R4 | Supplemental checkout **1 ca / 7 lượt** | Đúng gate đã frozen, source và witness đủ |

Tổng tối đa 34 ca / 55 lượt, không chạy lại R1/R2 trong full. Nếu chia R1/R2 cần evaluator-only scopes và admission tests chứng minh exact subsets/hashes/caps, disjoint union bằng prefix cũ; runtime không đọc case ID. Không đổi executable sau seal hoặc giữa các nhóm; source thay đổi tạo run identity mới và giữ mọi attempt cũ.

R1 phải chứng minh p06 trả giá/cấu trúc COMPOSITE đúng; p07 hai target qua egress; p08 hỏi màu đúng và chưa đổi giỏ khi thiếu lựa chọn; j1 giữ M/L, hỏi màu còn thiếu, không wire bound/handoff vì thiếu màu. Không đòi giỏ hoàn thành khi khách chưa cung cấp đủ lựa chọn.

R2 kiểm s13 trả tổng cả ship; s15 ACK không bị phụ thuộc vào tool không cần thiết; s03 ảnh/lời có căn cứ; j2 current fit/correction; p04/p09 continuity; j6 COD/missing fields. Provider error vẫn là attempt FAIL, không bỏ denominator hoặc hạ bar vì khó sửa. R4 phải có preview thật trước confirmation, đúng receipt và terminal ownership; không lấy stage label làm proof.

Trước mỗi nhóm: freeze desired task và human/judge scoring protocol; clean HEAD/inventory; independent input review; actual-time preflight; create-once dispatch sentinel. Nếu freshness không đủ thời gian dự kiến cho cả nhóm, capture nguồn mới trước seal, không renew clock hay đổi world giữa nhóm. Không gắn HEAD mới cho nguồn capture cũ. Provider 401/429/5xx/timeout fail-closed với tối đa 1 generation HTTP/attempt; không retry.

Material failure thì hoàn tất nhóm trừ hard safety/PII/unknown commit/accounting stop, giữ denominator, không mở nhóm kế. Report STOP/BLOCKED theo nguyên nhân. Không sửa regex/template rồi tiếp tục cùng identity. Handoff đúng vì thiếu nguồn không chứng minh sales capability đã hoàn thành. Chấm actual terminal customer outcome trên toàn hội thoại, có rationale và state/outbox/effect evidence; không keyword scoring. Giọng hơi kém đã được defer không được đổi thành material tùy ý sau results. Ngưỡng Phase C quality/safe usability/C3 parity giữ riêng, không GO từ R1 PASS.

## 9. Bàn giao và rollback

Implementation sau này cập nhật tasks theo actual evidence; ghi exact argv/exit, RED/GREEN, PG cleanup, wire/readiness, structural delta và semantic roles. Report exact run SHA, provider/model/config, corpus/prompt/schema hashes, attempts/HTTP/zero-HTTP/auth/auxiliary, tokens/cost unknowns, latency, reply/handoff/no-send, transcripts và rejected drafts.

Nếu controls hồi quy, revert riêng thay đổi S1/S2/S3/S4 gây lỗi; không rollback toàn Phase C hoặc bỏ chart/fit/selection/quote đã đạt. Shared readiness cần consumer review. Không merge/deploy/live send. Sau plan APPROVE dừng ở kế hoạch, không tự triển khai hoặc gọi model.

## 10. Self-review và independent review

Self-review revision 2: đã tách logical composition khỏi variant stock, target identity khỏi revision, missing customer choice khỏi shop-data gap, captured wire khỏi constructed wire, provider failure khỏi decoder bug. Tránh sai lầm vòng trước: test chỉ engine/map mà chưa tới egress; gọi READY từ label; replay bỏ tool schema; sửa câu khách cho vừa luồng. Implementation/model checks của kế hoạch này đều NOT_RUN.

Independent reviewer đọc source và actual artifacts rồi trả REVISE hoặc APPROVE. Tác giả không tự đóng finding của reviewer. Review log và exact plan hash được cập nhật sau mỗi vòng.


### Review revision 1 → revision 2

Reviewer `/root/b_preserving_independent_review` yêu cầu REVISE với hai finding: P1 giới hạn encoded multimodal bị viết nhầm thành text-only 65.536; P2 chưa quy định đủ logical quantity khi parser có fallback 1. Revision 2 tách đúng text/image/full-wire bounds hiện hành, quy định quantity có authority và invalid handling, thêm controls duplicate 1+1 so với quantity 2 và cấm thay stock/cart semantics. Cùng reviewer đã kiểm lại source và toàn bộ revision 2, đóng cả hai finding và APPROVE PLAN. [Review vòng 1](evidence/c3-target-composition-continuation-plan-review-20261105/review-01.json) và [review vòng 2](evidence/c3-target-composition-continuation-plan-review-20261105/review-02.json) giữ exact hash của nội dung tại từng vòng. Bản bàn giao chỉ cập nhật trạng thái/log sau approval; [review bản cuối](evidence/c3-target-composition-continuation-plan-review-20261105/review-final.json) ghi exact hash của file bàn giao. Không suy plan approval thành implementation hay model acceptance.
