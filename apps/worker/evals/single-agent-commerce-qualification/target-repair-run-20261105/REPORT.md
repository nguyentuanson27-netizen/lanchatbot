# Phase C — model round sau sửa target/composition/continuation, 2026-11-05

**STOP: R1 hoàn tất, functional gate FAIL ở 1 ca.** Đã chạy đủ 4 ca / 7 lượt: **6 SEND_ELIGIBLE, 1 silent HANDOFF**, không tin fallback. Không mở R2, R3 hoặc R4. Không sửa source, đổi world hay retry giữa run.

## Identity và phạm vi

Approved runtime/eval repair `639aff103898ad9e6cad5119d27c08f4809f9896`; implementation report delivery `da239714`. Evaluator-only admission source và actual model run source **`94c367a8bc9db5c2c17453436c9db015e4d902c6`**, clean khi preflight/dispatch/complete. Chỉ thêm hai scope R1/R2 và tests admission; 15 file của bản sửa đã được review giữ nguyên byte. Không đổi owner/verifier prompt, model/config, runtime, budget hoặc nguồn shop.

Owner **Vertex Gemini 3.5 Flash Lite HIGH**; verifier **GPT-6.1 Sol HIGH**, Codex CLI **0.159.2**. CompactV2, N1, retry0; tối đa 3 owner + 1 verifier/lượt, 6 primitive work/2 tool rounds. Giữ text65.536 / image count và full multimodal bounds; không bỏ tool schema để vừa request. [Exact config](evidence/FROZEN_CONFIG.json), [corpus/config/source hashes](evidence/FROZEN_CORPUS_HASHES.json), [helper inventory](evidence/HELPER_INVENTORY.json).

Fresh world `dd16e7c161f33f70e190b0510af85e685ff67a75d6ebeeea78db3fa1dd37ab79`: 107 sản phẩm, capture `2026-11-05T14:00:51.125Z`, POS của ba mẫu ưu tiên sync `13:59:05.863Z`; maxFactAge7200 giây hiện hữu, không renew clock. Giữ nguyên giả định test WHITE/shared chart/body maxima/feedback/new SD023 asset đã được owner duyệt. Đây không phải bulk update hay nguồn feedback khách thật.

Capture01 trước generation FAIL do danh sách mã bắt buộc chứa nhầm SKU synthetic `SM613`; giữ failure summary/log, không có generation hoặc source write. Capture02 dùng đúng danh sách 9 mã hiện hữu, thành công. Đây không phải retry generation hoặc thay dữ liệu sau provider result. Initial PostgreSQL thật trên clean94 đạt, DB đã drop.

## Denominator và kết quả

| Nhóm | Ca / lượt | Trạng thái |
|---|---:|---|
| R1: p06, p07, p08, j1 | 4 / 7 | EXECUTED; 1 material case failure |
| R2: phần prefix còn lại | 9 / 17 | NOT_RUN do R1 FAIL |
| R3: remainder | 20 / 24 | NOT_RUN do R1 FAIL |
| R4: checkout bổ sung | 1 / 7 | NOT_RUN do R1 FAIL |

Campaign mới còn **30 ca / 48 lượt NOT_RUN**, không nhập nhằng với **21 ca / 31 lượt NOT_RUN** của campaign69bd1221 trước. Giữ tổng dự kiến34/55, không chạy lặp prefix.

Actual capture: **6 text + 4 image, 10 accepted Outbox records**. Handoff **1/7 = 14,3%**; no-send0; fallback text0. Đây là capture transport vào DB test, không live send. Cả4ca EXECUTED/7lượt có evidence, sourceDirtyfalse, DB dropped, không diagnostic hard stop.

**22 generation records / 22 generation HTTP**: 15 OWNER + 7 VERIFIER, tất cả completion OK, tối đa1HTTP/generation, không timeout/error/retry. Verifier **6 PASS / 1 FAIL**; FAIL là verdict ngữ nghĩa, không phải provider error. Auth owner1HTTP được đếm riêng; recorded auxiliary requests0. Không gọi đây là tổng mọi network traffic.

Verifier latency p50/p95 **12,239s / 23,313s**; added verification + readback **14,544s / 25,774s**, nearest-rank trên7 mẫu. Observed input/output tokens **235.543 / 15.980**, 22usage rows; cost không expose. Các số là đo trong harness, không phải SLA production. [Accounting](evidence/ACCOUNTING.json), [run command](evidence/RUN_COMMAND.json), [integration](evidence/RUN_INTEGRATION.json).

## Review toàn bộ 7 lượt

| Ca | Kết quả nhiệm vụ |
|---|---|
| p06 | PASS: direct quote đúng COMPOSITE989k và ba món; không còn false VARIANT_DEPENDENT do đảo thứ tự BOM. |
| p07 | PASS: hai COMPONENT fit áo/quần cùng M, cùng đi qua verifier/final gate/accepted delivery; không còn target-blind CLAIM_CONFLICT. |
| p08 (2 lượt) | PASS: set ban đầu có receipt; khi chuyển áo lẻ chưa rõ màu, trả câu hỏi màu và không đổi giỏ sai. Đây là clarification đạt, không phải đã hoàn thành replace khi khách chưa chọn màu. |
| j1 lượt1–2 | Có câu hỏi màu dùng được, giữ nhu cầu hai áo M/L; không còn continuation bound hoặc handoff ở lượt2. |
| j1 lượt3 | FAIL: khách hỏi tổng cả ship, actual terminal là silent handoff. Không có tổng/clarification được gửi ở lượt này. |

[Toàn bộ lời khách và actual replies](CONVERSATIONS.md). Nhắc chiều cao/cân nặng, câu “chuẩn phom nhất” và giọng dài ở p07 vẫn là hạn chế; theo ưu tiên owner, không dùng các điểm giọng đã defer để đổi material bar sau kết quả.

## Root cause còn lại: j1 lượt3

Khách: “Em báo lại tổng cả phí ship cho chị nhé.” Owner gọi `add_to_cart` cho M và L với **color=`__NO_COLOR__`**, rồi `quote_cart`. Sentinel này không phải màu khách chọn. Hai query exact-filter đó nhận `CART_COLOR_NOT_FOUND`, options rỗng và `effectCommitted:false`; không có cart/effect receipt thành công.

Draft cuối nhắc “áo lẻ ... có 2 màu Trắng và Be” rồi hỏi màu để thêm giỏ/báo tổng. Verifier FAIL vì current trusted snapshot chỉ còn hai selection observations của query sai và presentation có raw sentinel; không có current WHITE/BE evidence để chứng minh lời nói này. Handoff là actual outcome, draft không gửi. [Exact rejected draft/verdict/bindings](evidence/REJECTED_DRAFTS.json).

**World nguồn không thiếu WHITE/BE.** Các lượt trước đã đọc được lựa chọn hiện hành, nhưng accepted shop history không cấp authority cho lượt hiện tại. Lỗi là owner chọn mutation/read path sai khi còn thiếu lựa chọn khách, cộng với coverage của current context sau query lọc sai. Không kết luận màu không tồn tại, không gọi lỗi này là provider outage, không chữa bằng cho verifier tin lịch sử hoặc nới nghĩa sentinel. Lỗi wire bound đã được giải quyết ở lượt2; điều đó chưa chứng minh whole journey đạt.

Hướng cần xem ở nhiệm vụ tiếp theo: giữ coverage nguồn hiện hành của lựa chọn chưa giải quyết qua đúng readback/binding; dùng đường báo giá trước giỏ khi chưa có lựa chọn để tạo cart. Không thêm parser câu khách, auto-pick màu, hoặc nối vòng sửa/reverify. Chưa triển khai sửa tiếp trong run này.

## Đối chiếu và giới hạn

Cùng7case-turn keys ở campaign69bd1221 trước có3SEND_ELIGIBLE/2HANDOFF/2NO_SEND; lần này6SEND_ELIGIBLE/1HANDOFF. p06/p07 và j1T2 có model evidence cho đường sửa; world mới và N1 nên **không coi đây là chứng minh cải thiện ổn định hoặc quan hệ nhân quả**. [Đối chiếu actual outcomes](evidence/COMPARISON.json).

Whole-reply quality NOT_GRADED theo rubric qualification; material-task review không được đổi thành điểm90% toàn PhaseC. S4 ảnh/malformed ở R2 chưa chạy. Không có C3 comparison mới, PhaseC qualification BLOCKED/B_NOT_GO giữ nguyên. Không merge/deploy/live send, không mở nhóm kế hoặc tự fix/rerun.

## Verification và independent review

Quan sát RED2 trước thêm scope admission; final focused stages/diagnostic/full-native/missing **13 PASS**, giữ exact case order, disjoint union13/24/96, customer scripts hashes và runtime-label firewall. Cùng reviewer APPROVED evaluator-only patch, all4input packets và R1dispatch sau actual-time preflight. Chỉ thực thi R1 theo authorization và gate đã frozen; không gọi model ở bước review.

Independent post-run audit kiểm toàn bộ7native artifacts,22provider wires/model/binding/firewall, accepted capture/Outbox/effect/no-mutation, clean source/cleanup. **APPROVE integrity; FAIL functional gate, material1case**. [Audit](evidence/POST_RUN_AUDIT.json), [gate](evidence/R1_GATE.json), [frozen scoring policy](evidence/EVALUATION_POLICY.json), [commands thực chạy](evidence/COMMANDS.json), [artifact/source/log hashes](evidence/SOURCE_AND_ARTIFACT_HASHES.json). Build/typecheck/lint/full suites của repair trước giữ source attribution ở implementation report; không claim đã chạy lại các lệnh đó trong model campaign này. Không claim remote CI/root pnpm check PASS.
