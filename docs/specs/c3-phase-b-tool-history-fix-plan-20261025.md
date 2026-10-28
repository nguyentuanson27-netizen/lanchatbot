# Phase B — sửa đọc sản phẩm và lịch sử tư vấn

Ngày: 2026-10-25. Kế hoạch dưới đây đã triển khai. **Campaign CLOSED / STOP sau17controls +21native;30native NOT_RUN.** [Kết quả/evidence](../../apps/worker/evals/single-agent-commerce-read-only/tool-history-run-20261025/CHECKPOINT_B.md). Run source9e352f38; privacy regression phát hiện offline đã sửa tại94cb6b08 sau khi dừng, chưa chạy model trên bản sửa đó. Frozen plan trước run được giữ cùng evidence; không mở lại identity cũ. B chưa GO.

Planning base: `00ffd3ee9075774ed7be13605a07d505886010cd`, branch `feat/c3-phase-b-commerce-20261014`, PR391. Khi bắt đầu implementation phải ghi lại HEAD và worktree thực tế.

Kế hoạch này thay phương án tiếp tục sau [turn-completion plan](c3-phase-b-turn-completion-plan-20261024.md). Campaign [turn-completion-run-20261024](../../apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024/CHECKPOINT_B.md) vẫn CLOSED / STOP_AT_PREFIX, 31/51 native, 20 NOT_RUN. Không sửa raw, nhãn, primary review hoặc mở lại phần còn thiếu dưới identity cũ. B chưa GO; A vẫn OWNER_BYPASS.

Reviewer độc lập `/root/review_next_rootcause_plan` không hoàn thành vì workspace hết credits. Những điều chỉnh dưới đây là self-review và đối chiếu code; không ghi APPROVED hoặc coi review của kế hoạch trước là review cho bản này. Owner sau đó đã yêu cầu implementation và một campaign mới; kết quả STOP ở link trên, không tự chạy vòng thứ hai.

## 1. Mục tiêu và giới hạn

Bot giúp khách chọn và mua đồ phù hợp, bằng hội thoại tự nhiên, ngắn vừa đủ cho việc khách đang cần. Hoàn thành tool hoặc verifier PASS chưa chứng minh đạt mục tiêu bán hàng.

Vòng sửa có ba mục tiêu kỹ thuật độc lập: đọc đúng lựa chọn bán trong budget; biết ảnh nào đã gửi ở lượt trước; không làm mất mô tả sản phẩm vì che nhầm địa chỉ. Phần tư vấn được audit riêng trước khi quyết định có thay đổi hay không.

Giữ một owner và tối đa một verifier. Model chọn cách tư vấn, sản phẩm và tác vụ; code xác minh identity, nguồn, facts, quyền, state, effects, receipts, privacy. Giữ 3 owner generations, 2 tool rounds, 6 calls, subject cap 8, claim cap 32 và snapshot/final gate hiện hành. Không thêm role/router/parser, retry/repair/reverify loop, tự chạy late tool, template/regex theo case, tăng budget hoặc mở production entrypoint. Không publish nguồn, merge, deploy hay live send.

## 2. Bằng chứng và điều chưa chứng minh

| Finding | Đã quan sát / xác nhận | Điều chưa được kết luận |
| --- | --- | --- |
| Discovery không hoàn thành | Raw `journey-openings/provider-attempt-1.json`: search SQ675/SQ748/V406; SQ675 đọc được, SQ748 bị `SUBJECT_BOUND`; lượt final-only tiếp tục yêu cầu đọc V406 nên `OWNER_TOOL_MODE`. `read_product` khi offerType null mở nhiều offers rồi kiểm tổng subjects. | Chưa tái hiện riêng exact snapshot SQ748 để chứng minh số slots gây reject; chưa chứng minh chỉ sửa slots sẽ khiến model chọn đúng đồ dưới ngân sách. |
| Hỏi lại giá gửi lại ảnh | Raw `opening-quotes/provider-attempt-2.json`: firstContact=false, history có text hỏi giá trước nhưng không có ảnh đã gửi. Hai ảnh bị gửi lại. `commerceHistory` loại rows không text. | Thiếu lịch sử ảnh là gap thật, nhưng không phải bằng chứng nguyên nhân duy nhất; model vẫn thấy đây là câu hỏi lại giá. |
| Caption bị mất | `shadow-mirror.ts` coi từ “đường” đủ để che dòng; caption “từng đường nét thêu” thành `[ADDRESS]`. Offline diagnostic cho thấy `commerceHistory` bỏ caption đó. | Chưa có lượt kế tiếp trong journey này chứng minh hậu quả với câu trả lời; không dựng lại actual sent text từ draft khi capture đã mất bytes. |
| Tư vấn chưa giúp quyết định | concern-v2, changed-occasion-v2, media-decision: nhiều chất liệu/tính từ, chưa giải quyết ren nhiều hoặc dễ nóng; có câu trả lựa chọn lại cho khách. | Chưa chứng minh thêm facts, rút prompt hoặc thêm chỉ dẫn chung sẽ cải thiện. |

Đính chính T0 cũ: “descriptions đã tới provider” không đủ kết luận đường đọc không có defect. Lỗi SUBJECT_BOUND lặp lại theo loại lỗi dù sản phẩm bị từ chối khác run trước. Giữ kết luận cũ trong báo cáo lịch sử, dùng finding mới này cho implementation tiếp theo.

## 3. T0 — tái hiện trước khi chọn diff

Tạo bảng defect → input nguồn → request/tool result → consumer → expected behavior. Chỉ trích dữ liệu cần thiết từ archived wire; không đưa evaluator labels hoặc lịch sử review vào input model.

1. Tái hiện search ba products và hai read độc lập bằng captured catalog snapshot, clock/bounds cũ. Assert read bị reject, số subjects trước/sau và nguồn offer IDs. Nếu raw thiếu snapshot cần thiết: ghi thiếu bằng chứng; fixture tổng hợp có cùng cấu trúc được ghi riêng, không nhận là exact replay. Không lấy nguồn mới rồi gọi là snapshot cũ.
2. Tái hiện một ảnh Meta accepted và lượt hỏi lại giá qua persisted history; chứng minh ảnh không xuất hiện trong runtime projection. Kiểm đường lưu đủ asset/product binding hay chỉ attachmentCount trước khi thiết kế field mới.
3. RED cho caption bị che và bị mất ở history; kèm địa chỉ thật để bảo vệ privacy. Không chỉ test helper riêng mà bỏ consumer.
4. Với ba ca tư vấn: đọc exact provider input và whole reply, đánh dấu bằng chứng quyết định có/thiếu, có tới request không, có chỉ dẫn nào thực sự xung đột. Không kết luận từ độ dài prompt hoặc đếm tính từ.

T0 không gọi provider. Quan sát RED thực sự trước GREEN; ghi exact commands và output, không tạo test chỉ xác nhận chi tiết implementation mới.

## 4. T1 — đọc lựa chọn bán không tự mở mọi facts

Files chính: `apps/worker/src/single-agent-commerce-read-only-tools.ts`, consumer `single-agent-commerce-read-only.ts`, adapter `evals/single-agent-commerce-read-only/gemini-inference.mjs` và tests tương ứng.

### Cách sửa ưu tiên

- Tận dụng `offerType` hiện có. Không mặc định thêm enum “cả bộ/thành phần/so sánh” vì model vẫn cần biết nguồn ánh xạ và field mới có thể chỉ lặp nghĩa cũ.
- Tách metadata mô tả các cách mua khỏi việc giữ protected facts cho tất cả cách mua. Danh sách lựa chọn phải lấy từ nguồn, có product/offer identity và version; không tự đặt mã hoặc dùng giá áo như giá cả bộ.
- Sản phẩm mới từ search cần cho model biết các mã/nhãn lựa chọn đủ sớm để lần read kế tiếp chọn được offer phù hợp. T0 phải xác định producer nào đã có metadata. Nếu cần catalog read bổ sung, ghi rõ số reads, latency, bounds và failure status; không coi read ẩn là miễn phí hoặc auto-read đầy đủ mọi candidate.
- Đã chọn offer cụ thể: chỉ bind facts của offer đó. Khách muốn so sánh: vẫn được đọc nhiều offers có nguồn trong budget, giữ giá/stock riêng từng lựa chọn. Không âm thầm bỏ bớt offers hoặc chọn thay khách để vừa cap.
- Chưa biết mapping hoặc nhiều lựa chọn còn mơ hồ: trả metadata/trạng thái rõ, không đoán offer. Nếu thiết kế cần thêm lượt vượt budget hiện hành thì chưa đạt; không nâng budget để cứu kết quả.
- Không gom variants vào parent để qua cap rồi làm mất scope giá/tồn. Chỉ thay schema nếu chứng minh contract hiện có không thể mang thông tin cần thiết; ghi thiết kế và consumer tests trước implementation.

### Acceptance

Deterministic: search→read whole-set hoàn thành đường đọc trong budget; component và compare-offers giữ đúng facts; stale/missing/ambiguous mapping không thành verified; cap vẫn reject thật khi vượt; batch các read độc lập không phụ thuộc thứ tự hoàn thành, không giữ facts dở dang của read bị reject. Kiểm đúng phạm vi mutations trong tool state khi batch có cả OK và rejected.

Provider: discovery phải đưa hướng mua hữu ích bằng dữ liệu đã đọc, không lấy giá thành phần để đáp ngân sách cả bộ; actual fallback/handoff không tính là hoàn thành tư vấn. N1 complete chỉ là quan sát chức năng, không chứng minh ổn định.

## 5. T2 — lịch sử ảnh dựa trên kết quả gửi thực tế

Files dự kiến: `meta-outbox-dispatcher.ts`, `single-agent-commerce-ingress.ts`, `single-agent-commerce-media-delivery.ts`, `packages/database/src/chat-history.ts` và consumer/projection liên quan.

- Lần theo accepted Outbox và media binding đã có để xác định chính xác ảnh thuộc sản phẩm nào. `attachmentCount=1` không đủ. Chỉ mở rộng contract tối thiểu nếu dữ liệu hiện hữu không thể cung cấp; chưa mặc định migration hoặc hệ thống memory mới.
- Dùng trạng thái thực tế `SENT_ACCEPTED`/`DELIVERED`/`READ` đúng tên; accepted không chứng minh khách đã xem. Selected/enqueued/retryable/ambiguous/failed không được mô tả là đã gửi thành công.
- Projection bounded, đúng page/conversation/recipient: productRef, assetRef ổn định, loại/góc ảnh từ metadata đã xác minh, thứ tự lượt và delivery status. Không URL ký/token, private customer image, nội dung suy từ ảnh hoặc evaluator labels. Không suy product từ caption.
- Giữ ordering với text và giới hạn context hiện hành; đăng ký giới hạn số entries/bytes cụ thể trước implementation seal. Không âm thầm tăng 4096-byte history hoặc đẩy mất customer correction gần nhất để chứa gallery. Nếu metadata không resolve được thì giữ UNKNOWN, không nhận là chưa từng gửi.
- Restart/duplicate callbacks không tạo thêm lịch sử ảnh; receipt accepted có trước nhưng history write lỗi phải có đường đọc lại hoặc ghi rõ thiếu context, không bịa trạng thái. Dữ liệu cũ không đủ identity không được backfill bằng đoán.
- Model quyết định ảnh có ích ở lượt này. Code không áp luật “đã gửi thì cấm gửi lại”, không parse câu khách bằng regex để điều khiển ảnh.

Acceptance: hỏi lại giá thấy đúng ảnh đã gửi trong provider request; explicit resend vẫn gửi được; xin góc khác không bị khóa vào ảnh cũ; ảnh failed không bị tính đã gửi; partial group chỉ ghi ảnh accepted; restart/cross-conversation isolation đúng. Kiểm actual capture và asset/order, không chỉ terminal eligible.

## 6. T3 — sửa che nhầm và giữ khả năng kiểm chứng

Files: `packages/database/src/shadow-mirror.ts`, `shadow-mirror.test.ts`, `chat-history.ts`/tests, ingress history tests, capture tests.

- Bỏ giả định từ đơn như “đường” tự nó chứng minh địa chỉ; xác định bằng ngữ cảnh/cấu trúc địa chỉ tại bộ lọc PII chung hiện hữu. Không thêm allowlist “đường nét thêu”, tên sản phẩm hay câu mẫu của benchmark; không miễn lọc toàn bộ BOT text.
- Bộ kiểm tra phải có mô tả sản phẩm khác chưa xuất hiện trong case lỗi, địa chỉ thật có/không số nhà, viết tắt, text lẫn mô tả sản phẩm và địa chỉ, số điện thoại/tên người đi kèm. Địa chỉ thật vẫn không vào model history.
- Dùng cùng hành vi redaction cho persisted history và capture. Sửa filter không tự phục hồi các dòng lịch sử đã bị che; chỉ khẳng định với dữ liệu được xử lý sau sửa.
- Capture giữ hash text ngay tại transport boundary trước redaction, kèm outbox/sequence/status theo scope, không thêm bản plaintext/PII. Hash cho phép đối chiếu draft/payload đã được phép giữ; không chứng minh nội dung nếu không có preimage hợp lệ và không sửa được context bị mất.
- Không nới `isPrivateCommerceText` để cho qua `[ADDRESS]`. Acceptance kiểm toàn chuỗi caption → persistence → history → request, cùng negative privacy controls.

## 7. T4 — đánh giá tư vấn, chưa tự viết lại prompt

Với ba ca ở mục 2, lập bảng ngắn: khách đang vướng điều gì; source có gì để giúp quyết định; model nhận được gì; reply đã xử lý vướng mắc đó chưa. Chỉ dẫn hiện đã yêu cầu chọn hướng mua và tránh dồn tính từ; thêm một câu đồng nghĩa không phải can thiệp mới.

- Nguồn có thông tin hữu ích nhưng projection mất: sửa đúng producer/consumer, giữ provenance. Nguồn không có: ghi gap cụ thể, không mở thêm nguồn mới vô hạn hoặc tự tạo thuộc tính.
- Input đủ nhưng prompt có xung đột xác định được: thay đúng đoạn xung đột, không cộng thêm nguyên tắc/ví dụ riêng cho ca. Phải ghi old/new instruction và dự đoán tác động trước provider.
- Không tìm được can thiệp có căn cứ: ghi `ADVICE_NO_INTERVENTION`, giữ baseline. Kết quả kỹ thuật T1–T3 không được gọi là đã sửa giọng/sức thuyết phục. Không cần tạo diff tư vấn để cho kế hoạch trông đầy đủ.

Chấm nguyên lượt trong hội thoại: có giúp khách quyết định mua không; lý do có liên quan đúng điều khách ngại không; bước tiếp theo có thực hiện được không; cách nói có tự nhiên và tập trung không; factual/action safety. Chấp nhận upsell hợp lý, nhắc một fact hữu ích và định tính đã được owner duyệt. Không bắt mọi câu phải có một món thay thế, CTA, số đo hoặc đủ từ khóa. Đánh giá riêng code recovery vì owner prompt không thay đổi được lời do code dựng.

Residual giữ rõ: changed-occasion verifier PASS rồi stale POS provenance vẫn không được reuse PASS; handoff theo policy là recovery, không tính là tư vấn thành công. Ngưỡng semantic owner đã duyệt và verifier prompt giữ nguyên.

## 8. Thứ tự thực hiện và verification

Savepoints: T0 reproduction → T1 offer contract → T2 image history → T3 redaction → T4 audit tư vấn → self-review/final verification → seal nếu được yêu cầu chạy. Mỗi savepoint có defect/diff/tests; rollback theo phần, không revert cả những fix có evidence. Không mở thêm một provider campaign cho từng savepoint.

Commands dự kiến, **chưa chạy trong lượt planning**:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/meta-outbox-dispatcher.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/database exec vitest run src/shadow-mirror.test.ts src/chat-history.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs
pnpm --filter @lana/database typecheck
pnpm --filter @lana/database build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu chạm contracts/business-tools thì bổ sung focused tests/typecheck/build của package đó. PostgreSQL isolated COD/BANK kiểm persistence/dispatcher/history và handoff regression qua runner đã dùng trong [VERIFICATION](../../apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024/VERIFICATION.json); ghi expanded command và kết quả thực chạy, không copy PASS cũ. Không chạy DB/provider cho một thay đổi tài liệu.

## 9. Campaign kế tiếp: đăng ký mới, không lặp prefix

Khi được yêu cầu chạy và readiness đạt, giữ population **51 native + 17 scoped controls**, N1, generation retry0; không tự thêm repetitions hoặc case provider cho từng test kỹ thuật. Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH; route/config như baseline đã duyệt. Tối đa 221 generation requests (51×4+17); source/embedding reads tính riêng. Đây không phải full A2/A3.

1. Freeze executable/config, prompt/schema/source/corpus hashes, T1–T4 implemented/no-intervention, exact manifest và scoring trước provider; commit, clean executable/config tree, capture runSourceSha runtime rồi preflight. Không ghi SHA ngược làm thay đổi frozen source. Source thay đổi làm identity cũ không còn đủ điều kiện cho run mới.
2. 17 controls trước native. 31 prefix giữ đúng nhóm cũ: journey openings 4, opening quotes 5, media followup 7, stateful 8, negotiation 3, B1 changed-occasion/changed-occasion-v2/buying-concern-v2/buying-concern-v3 4. Giữ nguyên thứ tự từng chuỗi; đưa nhóm bị tác động và controls trực tiếp lên trước, không chạy lại setup hoặc prefix rồi đếm vào full lần hai.
3. Chỉ mở 20 B1 còn lại khi kỹ thuật prefix đạt: discovery hoàn thành hợp lệ trong budget, repeat-price không gửi lại ảnh vô ích, media continuation/history/capture không mất dữ liệu, handoff/state/privacy/receipt không regression. Changed-occasion stale có đúng recovery được ghi riêng, không bắt nguồn phải không refresh và không nới binding để ép eligible. Reply an toàn nhưng không đáp được nhu cầu không tự thành PASS kỹ thuật nếu đó là mục tiêu functional của ca.
4. Lỗi safety/authority/effect/privacy: dừng dispatch mới ngay. Lỗi chất lượng/contract khác: có thể hoàn tất stage đã đăng ký để thu bằng chứng, không sang phần còn lại nếu gate thiếu. Provider errors/quota/malformed vẫn ở denominator, không hidden retry. Không sửa giữa run hoặc tự chạy vòng thứ hai.
5. Gate mở phần còn lại chỉ quyết định coverage kỹ thuật. Chất lượng tư vấn chưa đạt phải báo riêng; không đổi rubric sau khi xem câu trả lời. N1 không phải stability/conversion proof, không tự nhận B GO.

## 10. Self-review kế hoạch và đầu ra bắt buộc

- Không đẩy lỗi offer sang một field mới của model; giữ giải pháp ưu tiên trên contract hiện có và buộc chứng minh metadata sẵn trong budget.
- Không coi attachment count là ký ức ảnh, không coi accepted là khách đã xem, không tạo lệnh cấm resend.
- Không sửa redaction bằng whitelist câu benchmark; không dùng capture hash để tuyên bố đã sửa history.
- T0 cũ được đính chính có evidence; báo cáo cũ không bị sửa để làm run đẹp hơn.
- Tách technical/functionality/sales/voice/safety; không nhận đã sửa tư vấn khi không can thiệp hoặc chỉ có eligible count.
- Không nhận independent review hoàn tất: trạng thái hiện tại **unavailable do credits**, không phải APPROVE/REVISE của reviewer mới.

Sau implementation: báo diff, RED→GREEN, checks thực chạy, phần chưa chứng minh và quyết định T4. Sau provider nếu có: review tất cả terminal outcomes của stage, lock primary trước rejected-draft diagnostics; so đúng ca với run cũ, giữ số requests/errors/NOT_RUN, ảnh/state/receipt thực tế, token/latency/cost được expose. Đóng campaign một lần, không tiếp tục vòng prompt chữa từng câu.
