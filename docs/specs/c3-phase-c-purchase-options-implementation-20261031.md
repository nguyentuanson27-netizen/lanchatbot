# Phase C — purchase-option preparation implementation

Ngày 31/10/2026. Implementation base `bd7140480267c3f1fbc63ded694cb5c794c3c8a8`; [approved plan revision 3](c3-phase-c-purchase-options-read-path-plan-20261031.md). Runtime TypeScript cuối `5666f172fd74560d6e6309ca2ca7a37ab9a3d911`; evaluator/readiness executable cuối `b23681093f3fd6f4bb5f8462921016b6c5d51c8d`. [Independent review](c3-phase-c-purchase-options-implementation-review-20261031.md), [commands/artifact evidence](c3-phase-c-purchase-options-verification-20261031.json).

**APPROVE IMPLEMENTATION + verification evidence** trên clean `2f0f8d1eaeea95553631adbc71d37792f8e2a2fa` từ cùng independent reviewer sau các vòng fix. Không có model run hoặc quality GO trong task này. Phase C BLOCKED; C3 NOT_RUN; B_NOT_GO. Stacked B base vẫn `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`, pinned C3 reference vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; không tuyên bố đây là current main mới được refresh.

## Thay đổi và giới hạn

- Code chuẩn bị danh mục offer của một mã và metadata của bounded targets chưa focus; không bắt owner search lại rồi DETAILS_ONLY để biết cách đọc giá/tồn. Các read references gắn product/offer; actual native owner projection giữ được chúng. Danh mục sáu offers không mở sáu numeric reads ngầm.
- Product-level size lookup được trình bày riêng. Component metadata lấy từ BOM/fallback SKU nguồn, dùng cùng role helper đã có ở cart resolver. Thiếu/malformed/oversized/variant-dependent BOM có status rõ; không đánh AVAILABLE sau khi bỏ sót references. **Component sizing vẫn chưa được API product-target hiện hành hỗ trợ**; chartRef null/NOT_READ không phải xác nhận chart không tồn tại hay quyền chọn size từng phần.
- Giữ optional numeric preparation đã có. Prepare nhiều target debit trước I/O, kể cả failure; callback admission dùng prospective debit thật thay callsRemaining5 cố định. Numeric staging và metadata phải qua final admission; rejected set không publish một phần. Fetch nằm trước synchronous publication, không snapshot/restore global state qua await. Original expiry và claims độc lập được bảo toàn.
- Selection evidence hợp lệ có màu nguồn chưa ghi nhận được phân biệt với khách chưa chọn màu. Khi required selection không thể hoàn tất vì gap đó, code dùng silent handoff authority; không tự đặt tên màu hoặc đổi null thành sentinel. Policy/permission/revision/receipt và commit uncertainty vẫn do code kiểm. Denied/unknown handoff khóa lần xử lý tiếp; không gửi holding reply hoặc tạo customer Outbox.
- Handoff nghiệp vụ do owner chủ động yêu cầu vẫn theo policy hiện có. Test compatibility cho holding/partial reply được tách khỏi automatic required-source gaps; không sửa policy nghiệp vụ toàn cục để cứu một ca.
- Coverage chỉ phục vụ evaluator: metadata khác PRICE/STOCK đã đọc; preparation facts cũng được ghi; engineOutcome giữ RECOMMENDED/OUT_OF_RANGE/missing-input trạng thái thực và sizeSourceHash. Declared handoff reason riêng với lookup status/budget. Record bounded, selector/result được hash, không lưu số đo/địa chỉ/raw exception.
- Judge source inventory có frozen-config delegation, chart artifact/provenance và phạm vi SIZE_APPLICABILITY_ONLY. Approval identifier được hash; config/world/content bindings được kiểm lại. Record nguồn tồn tại không tự chứng minh runtime eligibility hoặc engine đã chạy. Absolute packet có actual coverage; paired blind packet bỏ candidate-only coverage ở cả hai arm để không lộ arm qua sự hiện diện của field. Chưa có C3 coverage parity mới.
- `source-readiness.mjs` kiểm exact price/usable stock, màu, media theo enum runtime, product size source, policy và exact selector/BOM theo requirements được đăng ký. Binder tạo manifest; native seal/preflight và từng generation kiểm lại ở wall clock. Source hết hạn giữa preflight và dispatch bị giữ như registered PRE_DISPATCH failure với0HTTP; không đổi cohort sau khi có kết quả. Source-unavailable controls vẫn chạy để kiểm actual silent handoff.

Không thay owner/verifier prompt files, provider/model/config, rubric/threshold, tool/generation/token/byte caps, stock guard/DB schema, production entrypoint hoặc nguồn shop. Chỉ sửa một mô tả tool tổng quát để dùng refs code đã cấp; native tool schema không thêm API field. Không third role, semantic router, Vietnamese parser, case-specific regex/template hoặc repair loop. Online semantic roles vẫn1owner+1verifier, delta0; thêm một readiness helper evaluator-only và code-only silent handoff method.

## RED → GREEN và regression

RED quan sát trước sửa: preparation4fail (hai/ba targets, thiếu purchase read refs, failed preparation không debit); coverage1fail; delegation1fail; unknown-colour gap1fail; readiness test ban đầu fail do module chưa có. GREEN theo từng boundary được ghi trong verification record; không gọi module-import RED là semantic provider result.

Focused rộng lần đầu463PASS/3FAIL: source preparation lỗi sớm chuyển sang fallback trước owner; test cũ còn chờ holding text và một owner call. Đã cập nhật expectation theo silent transfer và phát hiện thêm lỗ latch sau denied early handoff; sửa wrapper để chặn tool tiếp theo, không làm yếu authority/receipt tests. Các failure logs được giữ.

Full Node lần đầu768PASS/5FAIL/2SKIP: hai test preparation admission dùng contract cũ, ba local Codex wire captures round56/57/58 lỗi. Hai expectations được cập nhật thành NUMERIC+FINAL admission và atomic rollback khi toàn request không được admit. Ba historical captures chạy lại độc lập đều PASS mà không sửa historical protocol/source; nguyên nhân transient chưa kết luận. Full Node02 và03 được giữ, không xóa lần lỗi.

Actual PG01 dừng ở unknown-colour case21: harness cũ chờ hỏi màu và SEND_ELIGIBLE; code mới handoff đúng yêu cầu. DB đã drop, provider0. PG02 kiểm đúng silent transfer dưới holding policy,0cart/0customerOutbox/1handoff event; giữ riêng explicit-owner partial-handoff delivery/source-change/receipt cases. Test-only adaptation `1f2a004e8e0380b0a95ea295c1b731f214145c65` không đổi runtime TS.

Probe native sáu offers (synthetic,0provider):1preparation/1source read/0protected claims; owner28442bytes, verifier24164bytes, context5759bytes. Đây là actual serialized byte evidence trong caps hiện có, không phải token/cost hoặc quality measurement.

Verification cuối: **511worker focused PASS/17files**, **776Node PASS +2existing SKIP/0FAIL**, **55business protected/effect-readiness/reply-assembly PASS**, canonical worker build/typecheck/lint exit0. Actual isolated PostgreSQL **76/76PASS +7/7existing named invariants**, source clean, DB dropped, provider0/sendfalse. Full Node03 start/end cùng executable b236; build04 và PG02 ở1f2a dùng runtime TS/packages byte-identical5666→b236. b236 chỉ bổ sung evaluator SELECTION readiness; có test trực tiếp và nằm trong full Node03. Source identities riêng được giữ trong machine record, không gán PG cho một commit khác.

## Findings và việc còn lại

| Finding | Implementation status | Chưa được chứng minh / còn cần nguồn |
|---|---|---|
| F01/F06 đường đọc, clarify/early exit | VERIFIED_CODE: metadata/read refs/budget/admission/regressions | Owner có trả đủ và quyết định tốt hơn không: MODEL_NOT_RUN |
| F02 màu chưa ghi nhận | VERIFIED_CODE: source gap/selector/handoff không tự tạo màu | SOURCE_BLOCKED ở các rows chưa có physical colour binding; không sửa shop source trong task |
| F03 media | VERIFIED_CODE: readiness và runtime eligibility/silent handoff | Chưa có fresh capture/revalidation/publication mới; feedback thiếu vẫn thiếu |
| F04 nguyên nhân handoff | VERIFIED_CODE: bounded actual coverage/engine outcome + reason riêng | Không suy missing intent từ text; trace incomplete phải UNKNOWN, model early-exit vẫn cần đo |
| F05 evaluator context | VERIFIED_CODE: frozen delegation/coverage/firewall existing regressions | Không regrade lịch sử; C3 paired coverage parity và quality comparison chưa chạy |
| F07 variant/cart/admission | Bảo toàn guards và regression; actual PG evidence ghi riêng | Provider journey phải thật sự reach boundary sau khi source prerequisites đủ |
| F08 correction/customer-input/ownership | Bảo toàn engine correction, hỏi phần khách thiếu và handoff/no-send | Handoff đúng không phải hoàn tất đổi/trả/tra đơn bên ngoài |
| F09 giọng/CTA nhẹ | ACCEPTED_LIMITATION | Không coi đã fix hoặc hạ rubric; lỗi factual/action mới vẫn là lỗi nghiêm trọng |

[Audit nguồn](../../apps/worker/evals/single-agent-commerce-qualification/purchase-options-source-audit-20261031.json) chỉ đọc **historical frozen world** cho4mã/10offers,0network/0source writes; không phải fresh capture hoặc readiness approval mới. Không đoán màu/chart từ tên/ảnh và không gia hạn TTL.

Draft12purposes và sáu B controls trong plan được giữ; chưa có frozen provider corpus/denominator mới vì chưa chốt nguồn đủ điều kiện. Không thêm lượt provider hoặc nhân repetitions trong task implementation. Ca mua riêng/set/combo có source đủ sẽ vào sales-ready; thiếu source ảnh hưởng mục tiêu phải đăng ký handoff control hoặc BLOCKED trước dispatch. Lịch sử tiếp tục dùng actual accepted native rows/default/registered human-selected branches; không gỡ guard authored history hoặc thêm customer simulator.

Không merge/deploy/live send. Implementation approval không thay thế source readiness, full model run, Phase C quality thresholds hoặc C3 comparison.
