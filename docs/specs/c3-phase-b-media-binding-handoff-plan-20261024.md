# Phase B — kế hoạch sửa binding ảnh và ảnh kèm handoff sau review độc lập

Trạng thái: **IMPLEMENTED_WITH_RESIDUALS; chưa chạy model**. [Bản sửa/checks/giới hạn](c3-phase-b-media-binding-handoff-implementation-20261024.md), executable871ba419. T1 giữ gap tên rút gọn; T2 atomic tại commit nhưng chưa đóng revalidation catalog sau commit–trước delivery; không đánh dấu toàn bộ acceptance đạt. Base plan đã kiểm: `5ef25004fecf58e98adbfbf1bf5934879a6e87e1`. Owner yêu cầu sửa phương án sau independent review `/root/review_next_plan_loops`, verdict REVISE. A vẫn OWNER_BYPASS; B chưa GO.

Tài liệu này thay phương án trao đổi sau full run 24/10. Không thay raw evidence, nhãn hoặc kết luận các vòng cũ. Các mục “Current” cũ trong tasks là lịch sử; pointer đầu tasks dẫn tới trạng thái mới. Nội dung plan bên dưới giữ làm yêu cầu; bằng chứng thực chạy và phần chưa đạt chỉ lấy từ implementation report, không suy từ danh sách commands dự kiến.

## 1. Evidence và những hướng không làm lại

- [Full run 51 lượt](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-20261024/CHECKPOINT_B.md): 43 eligible, 2 fallback, 4 handoff, 2 code checkout; 17 controls PASS. Eligibility không phải chất lượng bán hàng.
- [Model–code division 19/10](../../apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/CHECKPOINT_B.md): integrated và advice-only cùng 8/12 dùng được, 1 cần sửa, 3 fallback. Không có căn cứ làm lại tools-off để giải thích chung lỗi tư vấn.
- [Context comparison 20/10](../../apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020/CHECKPOINT_B.md): đã bỏ/gộp quảng cáo trùng, giữ facts/cấu tạo; candidate 4/6 dùng được và 2 fallback, control 6/6 dùng được. Không promote description candidate.
- [Advice focus 20/10](../../apps/worker/evals/single-agent-commerce-read-only/advice-focus-20261020/CHECKPOINT_B.md) và [capability 21/10](../../apps/worker/evals/single-agent-commerce-read-only/advice-capability-20261021/CHECKPOINT_B.md): thay chỉ dẫn chọn ý/giọng hoặc bỏ chỉ dẫn tool không khả dụng chưa chứng minh cải thiện rõ.

Vòng này giữ owner/verifier prompts, model/config, context presentation và ranh giới tư vấn hiện hành. Không thêm ngoại lệ cạp chun, quy tắc giọng, examples theo ca, regex, parser, semantic router, model role, repair/reverify hay generation retry. Không tăng 3 owner generations / 2 tool rounds / 6 calls / 1 verifier.

Chỉ mở một can thiệp tư vấn/context mới khi có bằng chứng cụ thể khác các thử nghiệm trên: field bị mất, dữ liệu mâu thuẫn hoặc bản sao mới trong actual provider request, truy được producer → projection → consumer. Phải nêu delta và dự đoán quan sát trước run. “Model còn dài” hoặc “context có thể quá nhiều” không đủ.

## 2. Chẩn đoán đã sửa sau independent review

### Gallery màu be: đã chọn ảnh thành công, recovery mất binding

Raw `full-phase-b-20261024/journey-openings/provider-requests.jsonl`, ca `sales-product-gallery:overview`: owner gọi chọn ảnh màu be, nhận MEDIA_COLOR_BINDING_UNVERIFIED, sau đó **đã gọi select_product_media GENERIC không color**. Lượt final nhận status OK, hai ảnh FRONT/BACK, scope GENERIC_PRODUCT, colorMatched=false, delivery=PENDING_FINAL_GATE.

Draft nói chưa có ảnh riêng màu be và bị verifier FAIL. `single-agent-commerce-ingress.ts` recovery yêu cầu mọi asset.productId khớp `world.state.currentProductId`; raw state của ca này có currentProductId=null. Vì vậy ảnh đã chọn không đi ra capture. Đây không phải thiếu nextSelection hoặc hết lượt để thực hiện nó.

Hai finding riêng: owner biến chưa xác nhận màu thành không có ảnh; code recovery phụ thuộc focus chưa có. Vòng này sửa finding code. Nếu recovery gửi được ảnh chung, vẫn ghi original FAIL và giới hạn chưa đáp ứng đúng màu; không đổi thành verifier PASS hoặc gallery hoàn thành đủ.

### Media + size: handoff bỏ phần ảnh độc lập

Ca `media-and-size:ask` yêu cầu ảnh cận thêu và chọn size. NO_VERIFIED_CHART kết thúc lượt tại `single-agent-commerce-read-only.ts`; recovery chuyển nhân viên, ingress không cho ảnh đi cùng HANDOFF. Existing tests bảo vệ hành vi không ảnh này. Sửa phải thay contract và test có chủ đích; không chỉ bỏ một return hoặc cho phép mọi HANDOFF gửi ảnh.

### Chart: kế thừa gap đã audit

[Audit source 23/10](c3-phase-b-source-contract-fix-implementation-20261023.md#chart-authority-giữ-gap-có-chủ-đích) đã ghi thiếu brand/offer/BOM target identity, chưa có mapping authority LANA ↔ La.na Design và khác biệt SQ/SV/parent/component scope. Không tìm lại từ đầu, alias SQ→SV, lấy chart gần giống, suy brand từ tên hiển thị hoặc publish chart giả để đóng ca.

Lập bảng nhỏ các identity thiếu, producer hiện hữu, consumer và bằng chứng nguồn có thể cấp hợp lệ. Trong vòng này giữ no-chart khi chưa có authority; thay đổi schema/producer nguồn nếu cần là scope riêng phải mô tả trước, không ghép âm thầm vào media fix. Hoàn thành ảnh+handoff không đồng nghĩa đã nối được size chart.

## 3. T1 — binding ảnh của lượt hiện tại

1. Viết test RED tái hiện ca gọi đúng tên sản phẩm lần đầu, persisted focus null, chọn hai ảnh chung thành công, draft FAIL, capture mất ảnh. Dùng ingress + catalog/source resolution thật trong fixture, không mock cho mọi product tự hợp lệ.
2. Xác định identity sản phẩm đã được code resolve cho yêu cầu lượt này. Tái dùng kết quả lookup/search có xác nhận và binding hiện hữu; không lấy productId từ rejected prose, coi mọi boundSubject là yêu cầu khách, hoặc dùng ảnh được chọn làm bằng chứng tự cấp quyền cho chính nó.
3. Cho recovery dùng binding hợp lệ của lượt thay cho yêu cầu bắt buộc persisted focus. Binding phải gắn request/batch/recipient, đúng sản phẩm và scope ảnh, giữ source version/freshness/readback. Không cần ghi focus vào state chỉ để vượt guard.
4. Nếu chưa phân biệt được sản phẩm khách yêu cầu với sản phẩm thay do model tự chọn bằng evidence hiện hữu, giữ fail-closed cho nhánh đó và ghi gap; không thêm parser tên sản phẩm hoặc nới guard toàn bộ catalog.
5. Dùng code-owned media fallback hiện hữu nếu đúng phạm vi ảnh chung. Không sửa rejected draft, không chạy lại verifier. Giữ terminal FALLBACK và original reason; ghi riêng recovered attachments và mức phục vụ yêu cầu.

Acceptance: đúng sản phẩm được resolve dù focus null có ảnh chung trong capture; không tự gọi ảnh là màu be. Ảnh sai món/món thay, ambiguous lookup, unresolved ads hoặc focus cũ không được cấp quyền bởi binding mới. Thay source/asset/revision/recipient, privacy, HUMAN ownership, Inbox stale hoặc commit không rõ phải chặn. Không thêm generation, tăng round hoặc gửi trùng.

## 4. T2 — một response group ảnh + handoff do thiếu chart

Đây là mở rộng có giới hạn so với [contract recovery 24/10](c3-phase-b-composed-input-media-recovery-20261024.md), vốn loại HANDOFF. Chốt contract trước sửa implementation:

- Chỉ áp dụng dependency handoff SIZE_RULE_UNAVAILABLE và ảnh đã được chọn/xác minh đúng yêu cầu độc lập của khách. Không áp dụng khách yêu cầu gặp người, private input, payment receipt, unknown commit hoặc handoff đã tồn tại trước lượt.
- Chuẩn bị một response group do code sở hữu: lời dẫn ảnh chung đúng evidence, ảnh được duyệt, tin chuyển nhân viên chọn size. Text dùng nguồn code/policy phù hợp; không lấy mệnh đề từ draft bị chặn. Nếu phải thêm fallback ID/text, freeze hash và kiểm registry trước provider; không đổi prompt để giải thích hộ.
- Việc chuyển quyền, handoff receipt, Outbox group và quyền giao group phải dùng transaction/fence hiện hữu. Chốt toàn group trước sequence 0. Không commit chuyển HUMAN rồi tạo thêm group BOT để lách permission; không gọi model sau chuyển quyền.
- Chọn ảnh không hợp lệ hoặc không còn fresh: vẫn thực hiện handoff chuẩn nếu còn đủ authority; không cố giữ ảnh. Với group đã chuẩn bị, authority/source thay đổi trước giao thì gate chặn toàn group, không gửi từng phần theo quyết định riêng.
- Readback xác nhận receipt, revision, recipient và asset identity. Không thêm effect retry khi transaction chưa rõ kết quả; dùng cơ chế reconciliation hiện hữu.

Acceptance: ca media+size có ảnh đúng và một tin handoff, một group, không duplicate, không lời chốt size. Ca hỏi size đơn thuần vẫn handoff chuẩn. Customer-requested-human không nhận thêm tư vấn/ảnh. Tests interleaving phải chứng minh source/state/permission change chặn group; transaction failure không để lại ảnh lẻ hoặc hai thông báo handoff. Nếu port hiện tại chưa làm được atomic group, sửa port tối thiểu và kiểm contract trước khi mở provider; không dùng gửi tuần tự bên ngoài transaction để né.

## 5. T3 — self-review và kiểm chứng trước model

Thực hiện T1/T2 theo observed RED → minimum GREEN, savepoint riêng. Self-review diff tập trung authority mới, scope recovery, handoff atomicity, source freshness, ảnh thay và số lần gửi. Không coi test được sửa sang kỳ vọng mới là bằng chứng đủ nếu chưa có negative controls.

Commands dự kiến (chỉ ghi PASS sau khi thực chạy):

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Thêm focused test của persisted handoff/executor nếu chạm port đó; nếu chạm shared package chạy focused test/typecheck/build tương ứng. Isolated PostgreSQL integration phải kiểm actual Outbox/capture cho cả COD/BANK theo runner hiện hành, gồm mới thêm mixed group và negative controls, ghi exact commands/DB cleanup thực tế. Không provider generation trong bước deterministic này. Không sửa production entrypoint/deploy/live send.

## 6. T4 — phép đo model dự kiến và điều kiện dừng

Lượt sửa phương án này không dispatch. Khi triển khai và chạy được yêu cầu: giữ Gemini 3.5 Flash Lite HIGH / Sol 6.1 HIGH, N1, retry0; cùng 51 native cases và 17 controls hiện hành. Không tự tăng repetitions hoặc thêm corpus chống đỡ patch. Freeze manifest/inputs/rubric, commit executable, clean source, capture runtime runSourceSha rồi preflight đúng identity. Controls cũ không qualify source mới.

- Controls 17 phải đạt trước native. Ưu tiên hai ca gallery và media+size trong đúng journey/dependency order. Prefix là một phần của 51, không chạy lại rồi tính thêm; mọi setup cần provider phải có slot/accounting rõ trước seal. Giữ hết error/fallback trong denominator.
- Acceptance prefix là actual customer outcome đúng contract T1/T2, không bắt original draft phải verifier PASS. Gallery recovery chỉ ảnh chung được ghi PARTIAL, không coi đáp ứng đúng màu. Media+size vẫn HANDOFF, không coi đã tư vấn được size.
- Khi prefix đạt mới chạy các slot native còn lại; nếu không đạt, dừng campaign, lưu raw và phân tích đúng delta. Không tự patch/run vòng hai. Không dùng majority, best-of hoặc loại kết quả lỗi.
- Báo riêng thao tác, nghĩa nghiệp vụ, hoàn thành nhu cầu và giọng. Câu gây hiểu sai/bỏ yêu cầu hoặc không giải quyết quyết định là substantive finding; câu vẫn dùng được nhưng dài/hơi khuôn là polish. Tranh luận inference giữ riêng theo boundary owner đã duyệt; không đổi rubric sau khi đọc kết quả.
- So sánh full run 24/10 theo từng case và actual attachments/receipt, cùng denominator. Sửa media không tạo bằng chứng chất lượng tư vấn toàn bộ tăng. Không chuyển 30 USABLE / 13 NEEDS_EDIT định tính của run trước thành ngưỡng pass mới.
- Nếu các câu tư vấn vẫn lặp lỗi cũ, giữ residual và dừng can thiệp giọng trong campaign này. Chỉ đề xuất vòng mới khi có giả thuyết khác đã được truy bằng evidence; không tự nối một vòng prompt/context khác.

Lưu raw trước primary whole-terminal review, rồi mới xem rejected-draft diagnostics. Giữ accounting, captures, evaluator-label firewall, source hashes và exact commands thực chạy. Cập nhật tasks/PR sau implementation/run thực tế; không gọi code-only hay handoff chuẩn là model no-send failure. B chưa GO cho tới đánh giá đủ phạm vi; không tự chuyển phase.

## 7. Self-review kế hoạch và trạng thái

- Đã tiếp thu 5 nhóm finding từ reviewer độc lập: thử nghiệm lặp; chẩn đoán ảnh sai; audit chart có sẵn; tránh nới/siết fit theo ca; khóa tiêu chí và stop condition.
- Đính chính rõ: owner đã chọn ảnh chung thành công, nên không sửa nextSelection hoặc budget. Chart audit không phải dữ liệu mới hôm nay và chưa đóng authority gap.
- Thêm giới hạn first-contact/name binding: catalog identity không tự chứng minh ý định khách, không dùng selected asset hoặc rejected prose để cấp quyền recovery.
- Mixed handoff là contract mới với atomic delivery, không dùng ngoại lệ HUMAN chung. Default khi không đủ authority vẫn fail-closed/handoff chuẩn.
- Chưa sửa runtime/prompt/corpus/config; chưa chạy test/provider; chưa claim plan được reviewer duyệt lại sau chỉnh. Không tự gọi thêm review trong lượt sửa tài liệu này.
