# Selective sales voice comparison — 2026-10-19

**Cập nhật owner: chỉ tạm chấp nhận sáu draft sân khấu; yêu cầu sửa verifier để cho qua. Câu xác nhận số đo vẫn phải sửa vì không tự nhiên.** [Quyết định và phạm vi](OWNER_DECISION.md). Không viết lại sáu draft tư vấn; sửa ranh giới verifier theo yêu cầu mới và kiểm tra hẹp riêng. Phần số liệu bên dưới giữ kết quả thực tế của run; không đổi fallback lịch sử thành PASS.

Recommendation tại thời điểm review trước quyết định owner: STOP readiness. Hoàn tất48/48 lượt,9/9 jobs. Thay giọng chưa cho thấy cải thiện ổn định; phần giao dịch giữ được state đúng nhưng có thêm một fallback. Sáu draft sân khấu được chấp nhận; câu xác nhận số đo vẫn cần sửa; các finding khác vẫn được theo dõi riêng. Checkpoint A vẫn OWNER_BYPASS; chưa có đánh giá GO mới cho toàn bộ B hoặc run mới từ quyết định này.

## Identity và phạm vi

- Owner voice implementation: ba51204b. Run source: **93db1d47c49618a119a446ba4b0c86015672ae39**, clean executable/config trước dispatch. Primary review lock:91d192be, trước rejected-draft/verifier diagnosis. Source SHA chỉ lưu trong runtime evidence, không ghi ngược vào registration.
- Gemini3.5 Flash Lite HIGH / Vertex tư vấn; GPT-6.1 Sol HIGH / Codex login relay verifier. Exact identity/config/hash trong [registration](REGISTRATION.json) và [runtime preflight](raw/preflight.json).
- Owner prompt hash9a68252275b1414937d6558c3ade211c6e3579ac298f4143ca5b80404175e841; verifier5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd. Schema/corpora/source config giữ như vòng trước.
-48 lượt gồm stateful8×3, B1 chọn4×3 và advice replay4×3. Giữ bốn ca của vòng model-code division; không phải full24 ca B1 hoặc vòng chứng nhận A2/A3. Không sinh lại3 baseline openings không đổi. Trần156 generation requests, retry0.
- Dùng live public readers và database thử nghiệm riêng; dữ liệu nguồn/sampling khác giữa hai vòng nên so sánh mô tả, không kết luận nhân quả từ chênh lệch điểm. Advice có context chụp từ chính lượt integrated, không có tool, không phải live eligibility.

## Actual customer outcomes

[Toàn bộ48 lượt cùng lịch sử và primary review](CONVERSATIONS_AND_REVIEW.md), [JSON đã khóa](PRIMARY_REVIEW.json). Chấm cả yêu cầu, lịch sử, lời thực nhận và public committed state; minor polish riêng, không đếm keyword. OwnerAcceptance=null tại thời điểm khóa; quyết định chỉ chấp nhận sáu draft sân khấu sau đó nằm trong [OWNER_DECISION.md](OWNER_DECISION.md).

| Nhóm | Vòng trước: U / cần sửa / không dùng được / control | Vòng này: U / cần sửa / không dùng được / control |
| --- | --- | --- |
| Stateful24 |19 /2 /0 /3 |20 /0 /1 /3 |
| B1 integrated12 |8 /1 /3 /0 |6 /3 /3 /0 |
| Advice replay12 |8 /1 /3 /0 |7 /2 /3 /0 |

“Cần sửa” ở hai lookup replay ghi cả giới hạn context kế thừa, không phải hai lỗi độc lập của owner: capture không có giá thì model không được tự tạo giá. Không gộp các bảng thành một điểm chứng nhận.

- Mở áo/be/M, đổi L/hai áo, giữ màu, sửa eo74/mông96 đúng cả3 nhóm. Tổng978.100đ đúng3/3. Actual code invitation trước private form, private preview và purchase confirmation3/3; human-request controls3/3 giữ ownership. Ba database thử nghiệm đã drop; private turns dùng0 model requests.
- Các xác nhận owner không còn đảo vai như hai câu vòng trước. Nhưng một correction thêm “giữ size L như vậy là chuẩn” rồi bị verifier chặn; state write đúng vẫn không làm khách nhận được câu xác nhận hữu ích.
- Cả6 concern replies còn lặp ngân sách và nhịp catalog. Chúng xử lý băn khoăn/giá đúng nên vẫn USABLE, nhưng chưa cho thấy giọng chat cải thiện ổn định. Không quy lỗi cho một từ riêng lẻ.
- Partial-source:5/6 lượt trả phần chất liệu và nói rõ chưa có giá/tồn, không bịa nguyên nhân hệ thống. Một integrated lượt gợi chờ hoặc mua cả set dù chưa có dữ kiện để thực hiện bước đó.
- Lookup SD375: integrated chỉ1/3 trả đúng giá;2/3 còn thiếu giá. Query “áo dài SD375” trả AMBIGUOUS/mẫu khác; query “SD375” trả MATCHED. Rep2 tìm lại mã được nhưng hết round trước đọc giá. Hai advice replays kế thừa context thiếu giá. Đây là xung đột exact/discovery contract, không chỉ là giọng văn.

## Fallback, recovery và nguồn giọng hệ thống

**7 fallback thực tế**:6 sân khấu như nhóm lỗi cũ,1 correction. [Đủ bảy draft, verdict và đối chiếu](FALLBACKS.md). Owner chỉ chấp nhận sáu draft sân khấu và yêu cầu sửa verifier để chấp nhận chúng; câu correction vẫn phải sửa. Kết quả kiểm tra lại ghi riêng, không thay run này.

Sáu sân khấu vẫn suy độ dày/độ kín hoặc giải pháp che phủ từ nguồn chưa đủ. Không coi mọi suy luận thời trang là sai; verifier chỉ trả kind/ref, việc đối chiếu nguồn cần tách nhận xét lựa chọn với lời hứa về kết quả sử dụng. Chỉ sửa giọng owner, giữ verifier và nguồn không tự giải quyết ranh giới này.

Stateful rep3 đổi giỏ có draft owner đúng vai và verifier PASS nhưng final gate thấy literal offers:SV2447 đổi sourceVersion/observedAt/expiresAt cùng factSnapshotVersion; availableOffers text không đổi. Owner draft không được gửi; code dựng current-cart summary từ receipt/readback. Màu BE và “Giỏ hiện có2 sản phẩm” đến từ code. Preview/confirmation cũng giữ formatter cũ, nên thay owner prompt không chữa được toàn bộ giọng hệ thống.

| Nhóm | Eligible | Fallback | Handoff | No-send |
| --- | ---: | ---: | ---: | ---: |
| Stateful24 |11 |1 |6 |6 |
| B1 integrated12 |9 |3 |0 |0 |
| Advice replay12 |9 |3 |0 |0 |

Fallback7/48=14,6%. Stateful no-send bao gồm dừng model sau actual code invitation/private preview; handoff gồm purchase confirmation và human controls, không phải sáu lỗi tư vấn. Không coi disposition của model là toàn bộ số tin code thực sự phát vào capture transport.

## Vận hành và audit

-106 generation requests:70 owner +36 verifier, mỗi registered generation đúng1 upstream request; retry0, HTTP/provider timeout/error0/106. Verifier29 PASS/7 FAIL;28 terminal eligible dùng exact PASS draft,1 eligible dùng code recovery sau STALE. Không có kết luận A2 safety hoặc readiness từ số PASS này.
- Owner tokens323.836 input/56.399 output; verifier171.630 input/4.311 output. Usage đủ; cost không được expose.
-166 wire captures kiểm không thấy evaluator labels/private fixture marker; private phone marker không vào model. Đây gồm các capture lặp DISPATCHED/RESULT, không phải166 generation requests.36 verifier bindings recompute khớp;12 capture selection/hash khớp;9 child source/prompt registrations khớp seal.
- [Metrics](METRICS.json), [request accounting](REQUEST_ACCOUNTING.json), [binding/source audit](SOURCE_AND_WIRE_AUDIT.json), [raw index](ARTIFACT_INDEX.json). Chỉ bỏ synthetic private ingress batch khỏi24 bản public provider-attempt; originals giữ ở temp, provider wire nguyên vẹn. Raw có git attribute giữ bytes để không đổi hash do line endings.

| Nhóm | Verifier p50 /p95 | Added verification p50 /p95 |
| --- | --- | --- |
| Stateful |4,71 /6,29 giây |7,49 /10,13 giây |
| B1 integrated |4,94 /14,80 giây |5,94 /16,30 giây |
| Advice replay |5,83 /7,30 giây |5,83 /7,30 giây |

Percentile nội suy trên từng nhóm12 verifier samples; integrated added latency gồm readback, replay không có live readback.

## Commands thực sự chạy và giới hạn

```text
pnpm --filter @lana/worker build
python C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs unused COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/cases.prioritized.json --range 1:4 --out C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-sourcecheck-20261019 --source-check
python apps/worker/evals/single-agent-commerce-read-only/sales-voice-run-20261019/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-run-20261019
python C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-primary.py C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-run-20261019
python C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-metrics.py C:/Users/nguye/AppData/Local/Temp/c3-sales-voice-run-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-voice-run-20261019
```

Build exit0; preflight PASS; source adapters readback PASS; runner9/9 exit0; audit assertions PASS. [Exact child commands](raw/commands.json). Prompt implementation trước registration có57 focused adapter/comparison tests PASS, protocol/hash và diff check PASS; không tuyên bố full worker tests/typecheck/lint/CI mới ở lượt chỉ chạy model này. No independent final review/owner GO mới.

Complexity delta: không đổi runtime/tool/state/verifier, không thêm semantic role/layer. Chỉ thêm registration, launcher reuse và evidence cho vòng được yêu cầu. Một conversational owner và một verifier như cũ. [Findings/root causes và hướng tiếp theo](FINDINGS.md).
