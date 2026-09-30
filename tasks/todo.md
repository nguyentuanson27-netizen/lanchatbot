# Checklist hiện hành — C3 sales root-cause fix, cập nhật 30/09/2026

Implementation mới từ merge PR375: branch `feat/pr375-sales-implementation-20260929`.
PR376 đã đóng, không kế thừa commit của PR376. Tiến độ và thay đổi contract xem
[runtime amendment](../docs/specs/pr375-customer-input-runtime-20260929.md).
PR378 chỉ cập nhật kế hoạch/checklist trên baseline PR377 `7576e6ec964aca0f22ca19c24eddc773030a0866`. Owner đã yêu cầu self-review/fix lần cuối và thực hiện kế hoạch; checkpoint chờ review ở bản kế hoạch trước đã được đáp ứng, không cần xin lại quyền bắt đầu. Thực hiện P00 trước trên nhánh PR377; PR378 vẫn chỉ tài liệu, không merge/deploy/đổi provider live. Mục [x] là evidence cụ thể đã ghi nhận, không đóng cả task hoặc chứng minh exact head mới.

Nguồn kế hoạch duy nhất: [plan.md](plan.md), mục 3 (mục tiêu model) và mục 4 (mapping trùng lặp). Baseline ce558e6d thuộc snapshot PR375, không phải điểm bắt đầu lại implementation.

Các task P là việc còn phải thực hiện theo kế hoạch mới; checkbox chưa tick không có nghĩa toàn bộ code cũ chưa tồn tại.

Amendment lịch sử từ [comment review](evidence/c3-plan-review-comment-5847545097.md), đối chiếu PR375 head `d0c8a31`. PR377 đã sửa một phần; mục còn mở là acceptance chưa đủ, không có nghĩa mọi lỗi cũ còn nguyên. PR378 không sửa code.

Đã hiệu chỉnh ba finding self-review tại `d36f213` trong plan/checklist: thứ tự extraction/routing, acceptance P05/P06 và context cùng lượt ở P06. Không đánh dấu implementation đã hoàn thành từ việc sửa tài liệu.

## Chuẩn bị đã ghi nhận ở lượt lập kế hoạch PR375 (lịch sử)

- [x] Kiểm tra local/remote HEAD, main và ancestry `88a1ce4`.
- [x] Đối chiếu spec, audit, raw-run findings, rubric và phạm vi harness.
- [x] Giữ bản kế hoạch/checklist trước khi cập nhật.
- [x] Viết dependencies, acceptance, verification, điểm rẽ guard và giới hạn bàn giao.
- [x] Self-review tài liệu; chưa sửa/chạy code ứng dụng trong lượt này.

## 1. Bằng chứng và đầu vào

- [x] P00 — Phân loại đủ 70 output: input/guard/model/capability; pin source/contracts/rubric. Xem `evidence/pr377-dev70-baseline-diagnostic.md`; đây là diagnostic, không phải quality pass.
- [ ] P00 — Tích hợp findings đã hiệu chỉnh; khóa source PR377 và phân loại CI fail 7576e6ec/cc9f34cd. Khi log báo test không tồn tại trong blob đã xác minh, đối chiếu HEAD, blob tại HEAD và file thực tế trên runner trước khi sửa assertion; nguyên nhân chưa khớp giữ UNKNOWN, không bỏ test hoặc coi là guard/model defect đã chứng minh. Giữ hiệu chỉnh handoff #7, canonical NONE #8, positive M→L; tách source-only/reproduced/full runtime, không tính evidence cũ là exact-head pass.
- [ ] P01 — Current-cart snapshot/binding và variant mapping; frozen gaps có version rõ.
- [ ] P02 — Catalog/Sheets producer → isolated readback → canonical, coverage thực.

## 2. Guard và diễn đạt

- [ ] P03 — Thử bounded editorial/guard hai chiều; chốt amendment và residual từng nhóm fact.
- [ ] P04 — Tích hợp Responder/guard theo phạm vi chứng minh; giữ first quote, đóng goal-fact bypass; giữ phần chưa có evidence trong câu hỏi ghép để P10 tái dùng coverage.

P03/P04 không đóng bằng whitelist wording, claimId annotations hoặc chỉ schema pass; không mặc định mở rộng sáu trường Strategist.

## 3. Hành trình bán hàng

- [ ] P05 — Hoàn thiện harness hiện có, fake ports/full history/state/calls/skip reasons; kiểm provider/schema/private boundary cho thử model theo mục 3 plan. CLI adaptation không tự chứng minh API đích; tái hiện lỗi baseline được phép, không đòi P06 pass.
- [x] P05 — Luna stateful cart/size/checkout run `e76a9667`: 7 turns, 13 calls, current fee answer, size L retained, confirmed final state. Separate actual-server C3_RECOVERY control retains verified selected facts and guard reason. Synthetic/DRY_RUN only; not sales-quality or live smoke.
- [x] P05 — Server DRY_RUN → C3 candidate quan sát được, không send; kiểm C3-off/no-call và phân biệt candidate/reply/send, không chỉ LIVE fake harness. `realtime-server-c3.test.ts` import entrypoint thật, giữ hai BF wrapper, thay external IO, chạy `processOne`.
- [ ] P06 — Một owner trên nhánh chuyển; no-cart→commitment→edit→checkout→confirm đúng state.
- [ ] P06 — Extraction trước routing hậu mãi/handoff, giữ/loại current product và session update; consumer dùng kết quả đã validate, trusted ownership/no-call vẫn đi trước.
- [ ] P06 — Context cùng lượt đúng trong state/prompt trước P07: budget/preference/correction/rejection; differential C3-off cho timing, không đợi P09.
- [ ] P06 — Typed edit producer → kernel `SET_LINE_VARIANT` hiện có, đúng line/value/source/revision; nhận xét không sửa giỏ, sửa rõ phải làm được.
- [ ] P06 — Giữ chọn M + hỏi S; thêm CHANGE + mua, mua + hỏi policy; đối chứng chỉ sửa/nhận xét/đề nghị giá có điều kiện. Không xóa commitment độc lập hoặc tự mutation khi điều kiện chưa giải quyết; kiểm final reply và state.
- [ ] P06 — Checkout đúng recipient role và payment selection; field label không thành tên, địa chỉ Hội An không xóa COD; không khôi phục fallback cũ thiếu semantic checks.
- [ ] P06 — Handoff đúng phạm vi phủ định/đối tượng; giỏ mở không che hậu mãi; giữ human-owner no-call preflight.
- [ ] P07 — Chê giá/trải nghiệm/fit: hỏi hữu ích, evidence liên quan, lời đáp tự nhiên; bổ sung mã tiếp tục câu hỏi đang dở. First-contact đã biết input: chống hỏi lại; duyệt amendment trước khi thay quy tắc đúng một progression, không tự đổi form.
- [ ] P08a — Tìm phương án theo budget/tiêu chí, lookup thật, loại current/rejected products, no-result đúng. Tái dùng phân biệt màu/mẫu, bộ/bỏ và context/product resolution của P06, không phân loại lại bằng regex.
- [ ] P08b — Comparison đúng subject/offer, code derivation, đổi product giữ binding.

## 4. Hội thoại dài và sự cố

- [ ] P09 — Giữ preferences/correction/referent/câu hỏi đang dở và tiêu chí cần thiết qua window; tái dùng updater P06/profile/session/history, không thêm store mặc định. Giữ accepted Outbox recovery; differential C3-off và deviation có chủ đích.
- [ ] P10 — Fallback đúng nhu cầu/partial facts/compatibility, detailed reason/call telemetry; recovery giữ phần chưa biết của câu giá + chống nhăn, không coi `unrealizedEvidence=[]` là trả lời đủ.

## 5. Đánh giá và bàn giao

- [ ] P11 — GPT-6 Luna DEV70 đúng revision + runtime full-intent ngoài wording DEV70; full history.
- [x] Chấm bundle Luna e76a9667 bằng registered stage judge/rubric và candidate cache chính xác: 43 scored (14 PASS, 23 PASS_WITH_NOTE, 6 FAIL), 9 judge errors sau retry, 16 generation/guard failures và 2 expected pre-model rejects. Giữ kết quả 5596631 riêng; COMPLETED không tự thành quality pass. Chi tiết ở [diagnostic](evidence/pr377-dev70-e76a9667-diagnostic.md) và artifact ngoài repo; không chứng nhận head 7576e6ec.
- [ ] Báo input/contract/provider/judge failures và giới hạn blind holdout.
- [ ] P11 — Controls theo invariant, Luna theo hành trình có nhánh theo câu trả lời; giữ full history và phân biệt planned state/commit/receipt; không thêm gate Luna cho từng finding.
- [ ] P11 — Đối chiếu model theo vai trò cùng source/facts/contract/rubric sau P05; bắt đầu chỉ đổi Strategist, đo quality/guard/calls/token/p50/p95/chi phí gồm retry. Không dựng ma trận mọi tổ hợp hoặc coi đổi model là sửa được runtime.
- [ ] P12 — Self-review code/spec, required checks/CI, evidence đúng source, draft PR/residual.
- [ ] Không merge/deploy/bật traffic/gửi khách/ghi dữ liệu live.

## Năng lực và invariants đã có cần bảo toàn

- PR371 ancestry, checkout binding/private capture, cart variant edits/payment policy.
- History recovery, bounded profile/session context, alternative search và multi-product price binding.
- MCP fix `f448911`, authority/CAS/Outbox/human-owner/delivery invariants.
- Evidence cũ có phiên bản; không ghi đè bằng kết quả candidate mới.

Không bảo toàn regex kích hoạt sai chỉ vì thuộc fix trước. Thay hiểu ý định tại producer/consumer tương ứng; không fit câu ví dụ/DEV70 hoặc thêm template. Typed JSON/span/confidence không tự cấp quyền nghiệp vụ. Giữ form báo giá đầu và sáu trường Strategist theo spec.
