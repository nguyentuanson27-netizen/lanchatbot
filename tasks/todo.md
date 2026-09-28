# Checklist hiện hành — C3 sales root-cause fix, cập nhật 28/09/2026

Kế hoạch: [plan.md](plan.md). Baseline `ce558e6d4028dd06bd6efc960286464425a26a85`.

Các task P là việc còn phải thực hiện theo kế hoạch mới; checkbox chưa tick không có nghĩa toàn bộ code cũ chưa tồn tại.

**Tình trạng mới nhất:** executable source `a7501694`; [lần chạy Luna tập trung](evidence/c3-luna-focused-a7501694-rootcause.md)
đã hoàn tất sáu ca từng kẹt guard nhưng **chưa đạt quality**: 3 FAIL được chấm,
3 chưa chấm do Luna hết hạn mức. Q024 thiếu current-cart readback, Q043 thiếu
variantId→màu/size mapping, Q035 thiếu canonical measurement blocker trong
frozen input; không suy ra fact/action từ text để qua benchmark. Worker 1.828
test pass, 1 opt-in skip; typecheck pass. P03/P04/P07/P11 vẫn mở.

**DEV70 gần nhất:** executable source `81602079`; `1df6bc88` chỉ thêm test
runtime cho handoff claim so giá. Luna medium đã chạy DEV70 trên đúng executable
source: 62 `COMPLETED_NOT_JUDGED`, 6 guard/seam failure, 2 stale reject đúng.
Rubric diagnostic riêng ở [báo cáo](evidence/c3-luna-dev70-81602079-report.md)
chấm 62 ca: 24 PASS, 9 PASS_WITH_NOTE, 29 FAIL; không suy chất lượng từ số ca
completed. Worker 1.823 test pass, 1 opt-in skip;
typecheck pass. Hành trình conditional 700k không mở giỏ 799k; hành trình
băn khoăn → chất liệu → mở giỏ → checkout đủ 8 lượt đã qua với C3 ở lượt mở
giỏ. P08b có phép so sánh hai giá sản phẩm do code tính và guarded egress.
P02 coverage catalog live, P03 guard hai chiều, P07 chất lượng tư vấn,
P08a tìm phương án đúng budget, P09/P10 toàn diện và P11 rubric đạt ngưỡng
vẫn mở. Draft PR phải giữ trạng thái WIP và ghi rõ chưa đủ điều kiện smoke.

Amendment từ [comment review](evidence/c3-plan-review-comment-5847545097.md), đối chiếu PR375 head `d0c8a31`. Implementation candidate `c2b22d3` và bằng chứng [ở đây](evidence/c3-sales-implementation-20260927.md) mới đóng các lát current-cart/checkout/C3 cart opening; các checkbox P còn để mở cho đến khi đủ nghiệm thu toàn mục.

Tiếp tục ở executable source `c782e90`: harness đã gọi Luna ở producer khi runtime gọi model; đã thêm typed `variantIntent`, phân biệt hỏi/đổi trong nhánh sửa giỏ hiện hành, sửa fallback C3 bỏ sót fact cuối và kiểm tra một đường registry→payload→readback→C3 cách ly. Đây là các lát kiểm chứng, chưa đóng P02/P05/P06/P11: Luna hết hạn mức trong hành trình cuối, chưa có DEV70/rubric trên source này, chưa có producer trước các quyết định routing đầu tiên hay readback index thật. Chi tiết và hash artifact ở [evidence](evidence/c3-sales-implementation-20260927.md).

Amendment executable `c93635c` bổ sung diagnostic candidate đã guard trong DRY_RUN; runner test xác nhận C3 được gọi và không tạo outbound message. Đây chưa phải server boot thực với Vertex hay điểm quality; các checkbox P05/P11 vẫn mở.

Amendment executable `c2804ac` đưa variant đã chọn từ producer vào consumer considered-variant: chọn M và hỏi S không lưu S thành lựa chọn; nhận xét L không sửa lựa chọn. Test runner và typecheck qua, nhưng producer vẫn sau một số routing nên P06 chưa đóng.

Tiếp tục ở `f0b93c2`: guard giữ fact đã chọn khi lời ghi nhận tùy chọn bị từ chối; checkout COD cho phép evidence rỗng và hỏi đủ trường còn thiếu. Worker 1.799 test pass, 1 skip. Luna trên `84527e0` qua hành trình budget và cart/size/checkout; hành trình dài gặp schema COD đã sửa sau đó. Rerun trên `f0b93c2` bị giới hạn lượt Luna nên chưa có điểm quality/DEV70. Đã readback thật qua Qdrant cục bộ cho **một fixture tổng hợp**; coverage nguồn/live còn mở. Chi tiết và hash ở [evidence](evidence/c3-sales-implementation-20260927.md).

Amendment `f5034c7` xử lý lựa chọn COD có câu hỏi giao hàng ở mệnh đề khác bằng evidence do producer khoanh vùng và kiểm tra lựa chọn ngay trên mệnh đề đó. 126 test SalesCycle/Vertex pass, typecheck pass; chưa đóng P06 vì routing đầu luồng và context cùng lượt vẫn chưa dùng extraction này.

Amendment `3bebb9f` đưa producer hiện có lên trước routing hậu mãi/gặp nhân viên và resolve product **trên nhánh C3 giỏ mở, text thường**; preflight dùng engine để giữ human-owner no-call, proposal và quota dùng đúng một lần. Kiểm thử hai trường hợp chuyển nhánh và các đối chứng lỗi/nhãn sai đã qua; P06 vẫn mở cho các nhánh khác, context cùng lượt và quyết định product/search. Chưa có Luna trên source này.

Amendment `470c174` mở cùng preflight/producer cho C3 text thường, đưa budget, occasion và mã bị từ chối đã kiểm chứng vào state và prompt Strategist cùng lượt. Từ chối sản phẩm đang tư vấn sẽ bỏ binding khi chưa có giỏ; mã vừa từ chối không được resolve ngược lại trong cùng tin. Đây là một lát P06; style/color, loại dòng giỏ, tìm phương án thay thế và Luna trên source này còn mở. Worker 1.814 pass, 1 skip; contracts 221 pass; typecheck pass.

Đã hiệu chỉnh ba finding self-review tại `d36f213` trong plan/checklist: thứ tự extraction/routing, acceptance P05/P06 và context cùng lượt ở P06. Không đánh dấu implementation đã hoàn thành từ việc sửa tài liệu.

## Chuẩn bị đã làm trong lượt lập kế hoạch

- [x] Kiểm tra local/remote HEAD, main và ancestry `88a1ce4`.
- [x] Đối chiếu spec, audit, raw-run findings, rubric và phạm vi harness.
- [x] Giữ bản kế hoạch/checklist trước khi cập nhật.
- [x] Viết dependencies, acceptance, verification, điểm rẽ guard và giới hạn bàn giao.
- [x] Self-review tài liệu; chưa sửa/chạy code ứng dụng trong lượt này.

## 1. Bằng chứng và đầu vào

- [ ] P00 — Phân loại đủ 70 output: input/guard/model/capability; pin source/contracts/rubric.
- [ ] P00 — Tích hợp findings đã hiệu chỉnh: ví dụ handoff #7, canonical NONE ở #8, positive M→L đã pass; ghi rõ hàm/evaluator/source-only/full runtime.
- [ ] P01 — Current-cart snapshot/binding và variant mapping; frozen gaps có version rõ.
- [ ] P02 — Catalog/Sheets producer → isolated readback → canonical, coverage thực.

## 2. Guard và diễn đạt

- [ ] P03 — Thử bounded editorial/guard hai chiều; chốt amendment và residual từng nhóm fact.
- [ ] P04 — Tích hợp Responder/guard theo phạm vi chứng minh; giữ first quote, đóng goal-fact bypass.
- [ ] P03/P04 không đóng bằng whitelist wording, claimId annotations hoặc chỉ schema pass.

## 3. Hành trình bán hàng

- [ ] P05 — Luna chạy producer/C3 thật trên nhánh được gọi; fake ports, full history/state/calls/skip reasons; tái hiện lỗi baseline được phép, không đòi P06 pass.
- [ ] P05 — Server DRY_RUN → C3 candidate quan sát được, không send; kiểm C3-off/no-call và phân biệt candidate/reply/send, không chỉ LIVE fake harness.
- [ ] P06 — Một owner trên nhánh chuyển; no-cart→commitment→edit→checkout→confirm đúng state.
- [ ] P06 — Extraction trước routing hậu mãi/handoff, giữ/loại current product và session update; consumer dùng kết quả đã validate, trusted ownership/no-call vẫn đi trước.
- [ ] P06 — Context cùng lượt đúng trong state/prompt trước P07: budget/preference/correction/rejection; differential C3-off cho timing, không đợi P09.
- [ ] P06 — Typed edit producer → kernel `SET_LINE_VARIANT` hiện có, đúng line/value/source/revision; nhận xét không sửa giỏ, sửa rõ phải làm được.
- [ ] P06 — Giữ chọn M + hỏi S theo từng mệnh đề; không dùng dấu hỏi/phủ định toàn tin để xóa commitment hợp lệ.
- [ ] P06 — Checkout đúng recipient role và payment selection; field label không thành tên, địa chỉ Hội An không xóa COD; không khôi phục fallback cũ thiếu semantic checks.
- [ ] P06 — Handoff đúng phạm vi phủ định/đối tượng; giỏ mở không che hậu mãi; giữ human-owner no-call preflight.
- [ ] P07 — Chê giá/trải nghiệm/fit: hỏi hữu ích, evidence liên quan, lời đáp tự nhiên.
- [ ] P08a — Tìm phương án theo budget/tiêu chí, lookup thật, no-result đúng.
- [ ] P06/P08a — P06 sửa màu/mẫu, bộ/bỏ từ input tới context/product resolution; P08a tái dùng khi mở retrieval nhiều phương án, không phân loại lại bằng regex.
- [ ] P08b — Comparison đúng subject/offer, code derivation, đổi product giữ binding.

## 4. Hội thoại dài và sự cố

- [ ] P09 — Preferences/correction/referent/câu hỏi đang dở qua window; giữ history recovery.
- [ ] P09 — Tái dùng updater P06 qua window/recovery/multi-product; differential C3-off cho history recovery, ghi deviation có chủ đích.
- [ ] P10 — Fallback đúng nhu cầu/partial facts/compatibility, detailed reason và call telemetry.

## 5. Đánh giá và bàn giao

- [ ] P11 — GPT-6 Luna DEV70 đúng revision + runtime full-intent ngoài wording DEV70; full history.
- [ ] Chấm stage/quality theo rubric; đọc accepted/rejected; COMPLETED_NOT_JUDGED không là pass.
- [ ] Báo input/contract/provider/judge failures và giới hạn blind holdout.
- [ ] P11 — Controls theo invariant, Luna theo hành trình; giữ full history và phân biệt planned state/commit/receipt; không thêm gate Luna cho từng finding.
- [ ] P12 — Self-review code/spec, required checks/CI, evidence đúng source, draft PR/residual.
- [ ] Không merge/deploy/bật traffic/gửi khách/ghi dữ liệu live.

## Năng lực và invariants đã có cần bảo toàn

- PR371 ancestry, checkout binding/private capture, cart variant edits/payment policy.
- History recovery, bounded profile/session context, alternative search và multi-product price binding.
- MCP fix `f448911`, authority/CAS/Outbox/human-owner/delivery invariants.
- Evidence cũ có phiên bản; không ghi đè bằng kết quả candidate mới.

Không bảo toàn regex kích hoạt sai chỉ vì thuộc fix trước. Thay hiểu ý định tại producer/consumer tương ứng; không fit câu ví dụ/DEV70 hoặc thêm template. Typed JSON/span/confidence không tự cấp quyền nghiệp vụ. Giữ form báo giá đầu và sáu trường Strategist theo spec.
