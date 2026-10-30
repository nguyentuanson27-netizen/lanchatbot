# B–C: quyết định giữ/sửa và kế hoạch thực hiện

Implementation base: `5c88adf29f22e24a6a46c4c8f6622327164ee5b3`. Owner yêu cầu rà lại toàn bộ, chọn hướng sửa, independent review → fix → cùng reviewer review đến APPROVE. Phạm vi gồm kế hoạch và bản sửa hẹp theo bằng chứng; không tự chạy campaign model, merge, deploy hoặc sửa nguồn shop. Giữ mục tiêu tư vấn bán hàng và các quyết định thiếu dữ liệu shop → silent handoff, thiếu thông tin khách → hỏi bổ sung.

## 1. Quyết định và bằng chứng

**Không rollback toàn bộ về B.** Đối chứng trước dùng B `4efbea67`, không phải cuối B. Mốc đúng cuối B là `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`; cần build riêng và replay cùng source/clock/query với C trước/sau sửa. Chưa có whole-turn matched comparison nên không tuyên bố C hoặc B thắng tổng thể.

Đã đọc reports/conversations cuối B media-approved, cả22ca/34turn của C read-path run, diff38 runtime/test files cuốiB→C và đối chứng6request×3. Review độc lập nguồn sẽ được lưu riêng, không thay grades/raw trước.

| Nhóm thay đổi/finding | Quyết định | Căn cứ và hành động |
|---|---|---|
| COD/private checkout, provenance, clarification budget, DB transition replay | KEEP | Sửa lỗi nhận lựa chọn thanh toán, không lộ private state hoặc tăng hỏi lại; không đụng trong patch này |
| Owner/verifier thấy cùng tuple proof, readback source/TTL/quantity/policy | KEEP | Bảo vệ exact reply và state/effect; không bỏ proof để giảm bytes |
| Optional current preparation và stage diagnostics | KEEP | Có integration/PG evidence; giữ atomic admission/bounds và accounting; không sửa prompt để che issue |
| Internal product overflow khi gộp tuple proof nhiều offer | REPAIR | Same-input SV2447 unfiltered B OK/C reject; repeated option metadata phình snapshot trước wire dedup. Đo lại đúng cuốiB f160 và C trên cùng source |
| PRODUCT_EVIDENCE_BOUND bị catch thành SOURCE_EVIDENCE_CONFLICT | REPAIR | Chỉ map closed known errors, không trả raw exception/customer data; unknown vẫn fail closed |
| Ảnh SV1561/V406 expired, ảnh thiếu màu/feedback | SOURCE / giữ handoff | Không gia hạn heartbeat, không bỏ ảnh khỏi form quote bắt buộc hoặc tự cấp màu/feedback |
| NO_COLOR diễn giải thành “màu tiêu chuẩn” | SOURCE/MODEL residual | Giữ semantics unrecorded≠physical color và verifier; không thêm parser/template để cho qua |
| Size chart correction OUT_OF_RANGE, unsupported source bands | SOURCE residual | Không tự sửa chart/tolerance hoặc ép recommendation |
| Ambiguous tên hai mã; policy chưa đọc; s07/s09/s13 planning | CONTEXT/MODEL residual | B cũng có path ambiguity; chưa sửa bằng semantic router hoặc tự chọn sản phẩm. Tách khỏi regression xác định |
| Historical HNSW parity/owner whole-turn instability | UNRESOLVED | Không có index/vector đầy đủ,18samples chỉ đo quyết định đầu; không gọi đây là nguyên nhân đã chứng minh |
| Giọng dài/tính từ | ACCEPTED nhẹ | Không mở vòng tối ưu prompt/keyword vì owner đã chấp nhận hạn chế nhẹ |

Sửa attribution: s01 Khánh Trang đã gọi đúng quote_product, dependency ảnh hết freshness làm quote fail; không quy cho model tự cần ảnh. Rule quote bắt buộc có ảnh vẫn giữ. Ghi correction reference ở báo cáo mới, không sửa lịch sử grades. Các NO_SEND sau handoff là ownership đúng, không tính thành nhiều lỗi hiểu hội thoại độc lập.

### Mapping toàn22ca /34turns

| Ca C | Turns | Quyết định sau review |
|---|---:|---|
| s01 giá Khánh Trang | 1 | SOURCE ảnh expired, KEEP quote-form contract; không sửa thành báo giá thiếu ảnh |
| s02 áo lẻ Thạch Thảo | 1 | KEEP giá trước clarification, ambiguity hai mã giữ rõ |
| s03 cận ren Ngọc Trâm | 1 | SOURCE expiry + TOP/VAY mismatch; không giả approved metadata |
| s04 màu khác | 1 | DEFER_MODEL/SOURCE NO_COLOR không phải màu vật lý; KEEP verifier reject |
| s05 chọn bộ ăn gia đình | 1 | KEEP usable; hạn chế quảng cáo nhẹ đã được chấp nhận |
| s06 phối quần nâu | 1 | KEEP usable; không chỉnh prompt giọng |
| s07 size/thích rộng | 1 | UNRESOLVED/CONTEXT search sai hướng, không proof chart missing; không auto chọn mã |
| s08 chọn váy đi lễ | 1 | KEEP decision/safety trong nguồn |
| s09 giặt tay/máy | 1 | DEFER_MODEL chưa đọc policy; không lỗi verifier và không source thiếu FAQ |
| s10 đổi màu đơn cũ | 1 | KEEP EXCHANGE silent handoff đúng capability |
| s11 hai set be L | 1 | SOURCE thiếu exact tuple; không nhận cả shop hết hàng |
| s12 khóa kẹt | 1 | KEEP DEFECT handoff, không fake approval đổi |
| s13 tổng ship Cần Thơ | 1 | DEFER_MODEL gọi handoff ETA khi không cần; chưa causal paired-context evidence |
| s14 xem thêm | 1 | KEEP ACK/defer |
| s15 thích be/cảm ơn | 1 | KEEP giá/preorder đúng, giọng nhẹ ngoài patch |
| s16 ảnh khách mặc | 1 | SOURCE feedback metadata thiếu; KEEP handoff |
| j1 M/L và tổng | 3 | T1 DEFER_MODEL NO_COLOR; T2/T3 KEEP HUMAN no-send, không đếm thêm2lỗi model |
| j2 correction | 3 | T1 KEEP M; T2 SOURCE chart OUT_OF_RANGE đủinput; T3 KEEP HUMAN no-send |
| j3 áo/bộ/quay lại áo | 3 | KEEP cả3eligible + actual media; không gọi compaction là đã cải thiện các reply này |
| j4 áo/thương lượng/tổng | 3 | T1 DEFER_MODEL NO_COLOR; T2/T3 KEEP HUMAN no-send, chưa đo negotiation |
| j5 hỏi đơn/gặp shop | 3 | KEEP ORDER_STATUS và HUMAN ownership cả3 |
| j6 giỏ/checkout/COD | 3 | KEEP cartreceipt, private name question và COD persistence; không nhận đơn hoàn tất |

REPAIR all-offer là control code độc lập với22ca, không suy đây là root cause mọi terminal ở bảng trên. B full51 gồm21B1/30persisted khác population22C/34turn, không so aggregate rates như matched A/B.

## 2. Sửa hẹp: lossless compact evidence

Candidate transient evidence chuyển từ discriminator `CANDIDATE_SELECTION_V1` sang **`CANDIDATE_SELECTION_V2`**. Sáu trường trùng trong mọi option (productId,offerType,quantity,sourceVersion,observedAt,expiresAt) chỉ lưu một lần ở envelope. Mỗi tuple giữ identityHash,size,color,status,reasonCode. Selectors/sourceHash/completeness/colorSemantics/contentHash vẫn ở envelope. Không bỏ tuple hoặc điều kiện, không chọn first3 offers để né overflow; first8 exact-tuples cap hiện hữu giữ nguyên và không có nghĩa full inventory.

`selectionEvidenceFromOptions` phải kiểm FULL input options khớp identity/source/quantity/time envelope **trước compaction**. Không compact rồi mới validate khiến tuple sai subject/source được rửa thành đúng. Full options phải có finite observedAt/expiresAt, observedAt<=now<expiresAt và expiry sau observedAt. Envelope expiry không vượt MIN(retained full-option expiries), read-config và policy caps. Read producer clip expiry theo cap nguồn/options trước gọi factory; factory reject nếu envelope còn rộng hơn hoặc source option đã hết hạn/future. Clip dài xuống ngắn được; không biến source option ngắn thành envelope dài. Đây là hardening TTL trước schema normalization, phải ghi riêng nếu config maxAge rộng hơn source default làm khác hành vi V1; capture thực đang maxAge120 không bị ảnh hưởng. Full option exact shape/enum/unique identity/filter selectors và source timestamps được kiểm trước khi bỏ dữ liệu lặp. V2 validator exact keys, thiếu/thừa/unknown discriminator đều reject; không silently đọc V1 như V2.

Một expander thuần khôi phục CandidateCartOption[] từ validated V2 để giữ legacy/catalog/effects `selectionOptions` contract. Reuse cùng expander tại:

- realtime-sales-catalog result;
- read_product result;
- effects TTL clipping và effect selection result;
- omitCurrentProductDuplicates: chỉ bỏ full selectionOptions khi bằng EXACT expanded options đã có trong current proof. Changed selector/condition/new options không bị drop.

Hash dùng compact canonical envelope; meaning hash vẫn so đủ source/selectors/quantity/status/identity/conditions, bỏ time chỉ theo cơ chế heartbeat hiện có. Source replay vẫn full resolver, không tin hash tự cấp source authority. selectionPresentation đọc tuple fields không mất nghĩa. V2 chỉ là transient candidate evidence; không migration/persisted shape/prod wiring hoặc provider API đổi. Không thêm online role/parser/router/framework/retry.

Giữ nguyên envelope4096bytes, product8192bytes, owner/verifier textwire65536bytes, tool/work caps. Bytes phải kiểm cả internal snapshot, tool result budget projection và actual serialized owner/verifier requests, không chỉ thấy wire bớt trùng là claim đã sửa internal overflow. Snapshot/context sau publication không được bỏ evidence để vượt gate.

## 3. Error attribution

read_product merge catch trả PRODUCT_EVIDENCE_BOUND chỉ với Error có message đúng closed literal đó. SOURCE_EVIDENCE_CONFLICT giữ riêng. Unknown merge error được rethrow ra invoke boundary vốn trả **UNAVAILABLE / SOURCE_ERROR** (closed reason), không suy conflict nguồn hoặc log raw exception. Factory không tạo được proof khi candidate tuple source invalid phải failclosed, không âm thầm bỏ proof rồi trả OK. Snapshot/claims/reads cũ giữ nguyên khi reject. Mọi product quá lớn thật vẫn bị chặn; không fallback sang B representation thiếu bằng chứng. Tests inject known bound/conflict và unknown private-message error để kiểm disposition, atomicity và không leak marker.

## 4. TDD và verification

1. RED trước: generic three-offer/eight-option source đủ gây V1 repeated-metadata overflow; expected full compare + exact expanded tuples và readback qua. Kiểm wrong subject/offer/quantity/source/time input không bị compact-launder, exact schema/version/extra keys, stale/hash/selector/identity tamper và source change vẫn fail. Không dùng tên ca hoặc sản phẩm để branch production.
2. GREEN minimum V2 + shared expander + consumers; update tests assertion theo full expanded contract. Existing overflow negative giữ meaning/product8192, có thể cần thêm observations để thật vượt bound sau nén; không xóa test chỉ vì compact hỗ trợ thêm dữ liệu.
3. Compare→refine, details-only retention, quantity/expiry/policy/source replay; mismatch cannot authorize mutation; owner/verifier actual wire parity+dedup and budgets. No_COLOR remains nonphysical.
4. Build exact finalB f160 and current C separately. Same frozen world107products/input clock from prior diagnostic; probes SV2447 unfiltered/AO/SET_VAY và SV1561 unfiltered/SET_VAY. Save BEFORE/AFTER + byte hashes of source/query and emitted expanded tuples. Historical final clock không có: không chế ra một final send outcome từ turn start.
5. Deterministic actual PG: affected candidate tuple/private checkout/handoff source tests and all7 existing invariants, disposable DB/drop/send-disabled/provider0. B/C component replay không tự là real adapter hoặc model-quality evidence.
6. Canonical worker build/typecheck/lint; focused worker/catalog/context/effects/boundary/ingress tests; protected business-tools claim/reply tests; full Node evals if schemas consumed there. Shared runtime packages không sửa; nếu phát sinh thì chạy tương ứng hoặc replan.

Planned commands (chưa PASS cho task này trước khi chạy):

```powershell
pnpm -r --filter "@lana/worker^..." build
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-selection-evidence.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker test:evals
```

PG command lấy đúng driver/config hiện có sau khi xem khả năng actual local environment, không tự tạo success hay live mutation. Logs/command/exit/source phải ghi thực tế. Cần fixture source proof phù hợp, không stub final PASS.

## 5. Review và điểm dừng

Gửi cùng reviewer độc lập: plan revision → finding → sửa → APPROVE PLAN; sau đó build/TDD và exact-source implementation → finding → sửa/retest affected → review lại đến APPROVE IMPLEMENTATION. Reviewer có quyền bác compaction nếu source binding hoặc bounds yếu đi. Nếu dữ liệu thực vẫn không vừa bounds sau lossless representation thì ghi limitation/replan, không cắt thêm có mất nghĩa hoặc tăng trần trong scope này.

Approval chỉ về code/verification scope. Không nói đã cải thiện bán hàng/giọng, không ghi PhaseC GO hoặc zero semantic falsePASS từ unit tests. Không tự chạy full model/C3 qualification, sửa media registry/chart/policy, reset branch hoặc rollout. Tasks/PR cập nhật đúng commands, intermediate failures và unresolved finding.
