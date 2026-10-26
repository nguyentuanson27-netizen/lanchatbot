# Phase B — qualification sau media/size fix, 27/10/2026

**COMPLETE:17controls +51native outcomes, không còn lượt chưa chạy.** Native: **37 SEND_ELIGIBLE /10 silent HANDOFF /4 NO_SEND**, fallback text0. Có **2 owner tool-output contract errors sau HTTP200**; không có HTTP/timeout errors hoặc generation retry. Cả sáu database test đã drop. **Không coi37eligible là37quality PASS; B chưa GO.**

Owner yêu cầu chạy model mới sau implementation S0–S4. Giữ đúng51ca, N1, CompactV2 và models hiện hành; không sửa prompt/source/rubric theo kết quả. Đã đọc toàn bộ51case gồm history, draft bị chặn, actual capture và code-only output. [Hội thoại](CONVERSATIONS.md), [review từng ca](WHOLE_TURN_REVIEW.json), [actual terminals](ACTUAL_TERMINALS.json).

## Source/config/provenance

- Exact run source `0ef9991a578e8da33f9bfbd4f81a86765380fe9f`, worktree sạch trước capture và không đổi qua toàn campaign. Latest fix base `b86825a1de84314175bf98d88a991fb940a7ddf2`; executable đã qualification deterministic tại `ff5e0543fb425ddf0f2a1b5ec6d722a690e831f9`, source0ef chỉ thêm docs/evidence sau đó. Field implementationBaseSha `dc1308c9…` trong reusable driver là foundation cũ, không bị viết lại để giả identity mới.
- [Approved plan](../../../../../docs/specs/c3-phase-b-media-size-context-fix-plan-20261027.md), hash `2cb2803f96e65511cee7daf0b9471fc957eceef875a991826c115ce9fe18e4ba`; [implementation/checks](../../../../../docs/specs/c3-phase-b-media-size-context-implementation-20261027.md).
- Owner Vertex `gemini-3.5-flash-lite`, HIGH/global, candidateCount1/text/plain/maxOutput8192/thinkingHIGH. Verifier `gpt-6.1-sol`, high, Codex ChatGPT login. Observed model versions đúng hai alias; temperature/topP omitted, generation retry0, max1upstream/generation. Không substitute model.
- CLI scoped `codex-cli0.159.2`, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, login PASS. Global CLI version mismatch được phát hiện bằng metadata precheck với0generation requests; dùng lại binary riêng đã có, không downgrade global hoặc giả identity. [CLI precheck](CLI_PRECHECK.json).
- Owner prompt SHA256 `ecc60d49142849d34263471bb8b9a14d54d33747a0ef078af64d308ed947dff6`; verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Schema/config/corpus/driver hashes trong [registration](REGISTRATION.json); additional implementation/dist hashes trong [run context](RUN_CONTEXT.json).
- Population giữ nguyên:5opening quotes +7media +3missing POS +21B1 +4journey openings +8stateful +3negotiation. **21B1 eligibility-only;30persisted slots có isolated ingress/capture.** Một private code-only slot không gọi hai model. Không gọi Meta/Pancake/POS mutation thật, không source-store write/publish/merge/deploy. Live source reads qua route hiện có; test writes chỉ ở database `c3_b_test_…` rồi drop.

Đây là qualification Phase B, không phải full semantic A2/A3 mới; CheckpointA vẫn owner-bypassed từ quyết định trước. Controls17 là bộ guard hẹp của campaign này.

## Kết quả ba mục tiêu của bản sửa

| Mục tiêu | Quan sát hiện tại |
| --- | --- |
| Required media khi metadata có / handoff khi thiếu | Opening quotes có6ảnh actual; media-and-size có1ảnh cận TOP. Feedback3case vẫn handoff; ảnh màu be vẫn bị chặn vì thiếu per-asset color binding. Không giả data readiness PASS. |
| Concern đủ dữ liệu không tự tạo phụ thuộc ảnh | `media-decision:ask` đọc các cách bán và trả lời được, không gọi DETAIL/SKIRT rồi handoff. Có phương án áo lẻ phối đồ trơn. Đây là cải thiện trong1attempt; đoạn tư vấn vẫn dài. |
| M-only + RELAXED không tự thêm L | `sales-size-advice:height-weight` trả M, không thêm L. Actual owner wire có recommended M/inputFitPreference RELAXED/alternatives[]. Media-and-size cũng dùng M đúng. Đây là N1 adherence evidence, chưa stability proof. |

[Actual wire audit](MEDIA_SIZE_WIRE_AUDIT.json):88owner requests;42cómediaCapabilities, tối đa2156B/field và3products, dưới4096B và1024B/product.44B1requests dùng read-only harness không cung cấp capability field;2request persisted đầu chưa có product summary. Không gọi46request thiếu hint là omission failure. Hai actual function responses recommend_size có đúng field co-location.38native verifier trusted contexts không bị thêm hint. Không-extra-read được chứng minh bằng deterministic tests trước run; không dùng token/tool totals lần này làm causal query proof.

[Offline source diagnosis](MEDIA_SOURCE_DIAGNOSIS.json) trên fresh control capture:11images, chưa cófeedback/color binding; DETAIL/TOP1match, DETAIL/SKIRT0, GENERIC/be không được cấp quyền. Đây không phải exact replay từng native readback, không phải kết luận shop không có ảnh ngoài phạm vi nguồn đã đọc. Không bổ sung label/metadata giả để cứu kết quả.

## Findings còn tồn tại

**Một owner claim vượt căn cứ, đã bị chặn:** `sales-discovery-advice:need`. Khách tìm bộ đi làm dưới1triệu, không bó bụng. Owner tìm/đọc được hai set, nhưng viết “mặc thoải mái không lo bó bụng” khi mới ghi RELAXED, chưa có thông tin và SIZE_FIT cho khách. Verifier FAIL, actual handoff im lặng. Đây là lỗi cũ: suy từ phom/lưng chun sang bảo đảm độ vừa của cá nhân, không phải thiếu dữ liệu sản phẩm hoặc lỗi HTTP. Không nới verifier hay viết regex để cho câu này qua.

**Hai output-contract failures, không được giấu dưới nhãn data gap:** `b1-partial-source` và `b1-partial-source-v2` nhận HTTP200/STOP nhưng adapter trả `OWNER_TOOL_OUTPUT`, trước tool invocation. Runtime gọi chung là PROVIDER_ERROR; phân loại chính xác ở đây là output contract, không phải auth/429/5xx/timeout. Cả hai fail-closed sang committed silent handoff. Shop POS cũng thiếu thật nên terminal handoff phù hợp owner policy; điều đó không xóa lỗi generation. Raw completion không được giữ đủ để kết luận field/enum nào sai; chỉ biết các nhánh validation của adapter, không khẳng định một root cause cụ thể chưa quan sát được.

**Tư vấn vẫn chưa cải thiện tổng thể:** ba `b1-buying-concern*` còn dùng mềm/rũ/thanh thoát để trấn an hơn là giúp hình dung cách mặc. Biến thể khách quen đồ trơn còn gọi set thêu/ren là giữ được tối giản; biến thể đã có váy đen vẫn đẩy hai lựa chọn về khách. Upsell cả bộ799k trong ngân sách850k không tự là lỗi; điểm yếu là lý do mặc lại và ưu tiên lựa chọn chưa rõ. Ghi hạn chế nội dung, không chấm theo việc có đủ từ khóa hoặc cứ nhiều fact là fail.

**Kết quả thương lượng có sẵn nhưng owner chưa dùng tốt:** `record_negotiation` đã ghi FREE_SHIPPING30000, grandTotal499000. Reply phản đối giá chỉ nói không giảm thêm đơn giá và upsell2món/5%, không nêu lợi ích hỗ trợ ship vừa có. Upsell có policy và tổng sau đó vẫn đúng499k; đây là hạn chế dùng tool result để thuyết phục, không cần nguồn thông tin mới để biết concession hiện tại.

**Giọng chưa được coi là đã sửa:** correction vẫn “em đã ghi nhận…(eo74,mông96)” và size advice lặp height/weight/preference. Những điểm máy móc này được ghi theo yêu cầu chấp nhận minor voice tạm thời; không mở thêm vòng viết prompt hay grading keyword trong campaign này. [Whole-turn self-review](WHOLE_TURN_REVIEW.json) có đủ51lý do theo ngữ cảnh, không independent review/model judge mới.

## Phân tách terminal và trải nghiệm

- 10 HANDOFF: 7 data-gap (feedback3, missingPOS3, color-binding1), 1 draft fit bị chặn, 1 purchase confirmation, 1 customer-requested handoff. Cả10 có HUMAN/event1/tag1 và0customer text/attachments trong actual isolated capture. Hai output errors nằm trong3missingPOS, không đếm thành hai handoff thêm.
- 4 NO_SEND: 2 follow-up sau khi đã HUMAN không được bot tiếp tục; 2 checkout có code-owned question/preview. Public preview/intake đã masking; các placeholder trong artifact không phải literal text khách nhìn thấy. Private slot owners0/verifiers0 được kiểm bằng explicit harness counters.
- Checkout giữ CART_OPEN → ORDER_PREVIEW → PURCHASE_CONFIRMED. Sau confirm:0newOutbox/0capture, HUMAN/event/tag đúng silent matrix. Quote hai áo978100, correction74/96/khách giữL, negotiation499k đều khớp code/receipts. Không claim live handoff acknowledgement hoặc delivery thật từ test transport.
- Policy lấy nguồn15ngày/30k thay7ngày/25k trong ký ức history. Đã mặc đi làm/mặc thử vào người/cắt tem-giặt được hiểu và từ chối theo nội dung câu hỏi; không đánh fail do thiếu các từ điều kiện không còn quyết định kết quả.

## So với full run trước

[Cùng51case IDs](PRIOR_COMPARISON.json), source trước50753ec7:36eligible/11handoff/4NO_SEND →37/10/4. Có đúng3ca đổi disposition:media-decision vàsize-advice handoff→eligible;discovery eligible→handoff vì claim cá nhân bị chặn. **Net+1eligible không chứng minh tư vấn tổng thể tốt hơn.**

Requests140→143; input910216→971229 (**+6,70%**), owner input572699→623552 (**+8,88%**). Hint thêm context và số/tool choices cũng khác; không quy toàn bộ mức tăng cho một field hay kết luận giảm quota. Prompt/source clocks/public observations/model output khác, N1 không tách được causal effect hoặc ổn định.

## Accounting và vận hành

[Metrics](REVIEW_METRICS.json), [accounting](TASK_ACCOUNTING.json), [commands](COMMANDS.json), [cleanup](DATABASE_CLEANUP.json), [raw hashes](RAW_SHA256.json).

| Chỉ số | Kết quả |
| --- | --- |
| Complete terminal denominator |68=17controls+51native;0not-run |
| Generation attempts/requests, kể cả lỗi |143=88owner+38native verifier+17control verifier;cap217;max1upstream;retry0 |
| HTTP/auth/timeout generation failures |0/143; không đồng nghĩa0output errors |
| Output-contract failures |2/143=1,40%;2/88owner=2,27%; toàn bộ token/error giữ trong accounting |
| Native verifier |37PASS/1FAIL;0UNCERTAIN/timeout; không phải37quality PASS |
| Controls |8safe eligible/8unsafe bị chặn/probe eligible; **zero observed send-eligible false PASS** trên8unsafe của frozen tested configuration này, không fullA2 hoặc safety proof |
| Native terminal rates |HANDOFF10/51=19,6%;NO_SEND4/51=7,8%;fallback text0 |
| Verifier provider latency |38samples,p50 6,319s/p95 15,360s |
| Verification gồm readback |38samples,p50 7,185s/p95 18,917s; observed added verification stage, không causal latency estimate |
| Whole slot latency |51samples,p50 23,730s/p95 49,218s; không live SLA |
| Usage |971229input/84835output;77652thinking/reasoning đã gồm trong output; cost không expose,null |
| Isolated test database cleanup |6/6dropped |

88owner wire hashes/bytes khớp actual telemetry;34verifier pre-dispatch shadow matches gồm controls/persisted và21B1 capture/telemetry matches. Không gọi21B1 là independent pre-dispatch reconstruction. Bounded scan143bodies:0evaluator/secret-key/case-ID-string matches; known synthetic private canaries0. Đây là phạm vi scan cụ thể, không privacy proof phổ quát. Registration/version/effort/source unchanged và silent confirmation/cleanup checks PASS.

## Commands thực sự chạy và giới hạn

Readiness từ implementation trước:537worker/192shared/216Node/2Python PASS, shared/worker typecheck/build/lint và PostgreSQL49COD+49BANK PASS trên executable ff5e0543. Không claim đã chạy lại các suites đó trong campaign model này.

```powershell
# Mỗi process dùng APPDATA scoped đã tồn tại; global inspect trước đó fail version với0provider request.
$env:APPDATA='C:/Users/nguye/Documents/Sản phẩm AI/c3-eval-runtime-01592'
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-context-model-20261027" controls
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-size-context-model-20261027" native
node "../c3-b-media-size-context-model-20261027/ANALYZE.mjs"
node "../c3-b-media-size-context-model-20261027/AUDIT_MEDIA_SIZE.mjs"
node "../c3-b-media-size-context-model-20261027/MEDIA_SOURCE_DIAGNOSIS.mjs"
python "../c3-b-media-size-context-model-20261027/REVIEW_AND_COMPARE.py"
python "../c3-b-media-size-context-model-20261027/ACCOUNTING_AUDIT.py"
git diff --check
```

Hai driver phases và đủ20child commands exit0, accounting/whole-turn/wire scripts PASS. Offline accounting checker đầu giả định code-only result có ownerGenerations, gặp KeyError; đã đổi sang explicit owners/verifiers counters và chạy offline PASS, không provider rerun. Source/body/case outputs không được sửa. Raw artifacts/scripts/logs giữ ngoài repo tại output directory nêu trên; public evidence đã curate/mask private checkout input. Không remote CI PASS hoặc independent code/evidence approval mới.

git diff --check đầu bắt trailing spaces từ literal model reply trong bản Markdown. Chỉ chuẩn hóa khoảng trắng cuối dòng ở bản hiển thị rồi kiểm lại; exact strings/JSON/raw hashes không đổi. Không gọi bản hiển thị đã chuẩn hóa là byte-identical raw transcript.

Run này không đổi executable/config, structural complexity delta0, semantic roles/layers thêm0. Không source metadata write, rewrite/reverify, parser/regex growth hoặc post-run fix→rerun. Những race/freshness/receipt boundaries được regression-test trong implementation; campaign này không chứng minh provider đã gặp một live POS-refresh race.

**Recommendation: giữ kết quả vòng này; B chưa GO.** Hai mục tiêu adherence/context có kết quả tốt hơn ở ca kiểm tra tương ứng, data ảnh thiếu vẫn được handoff đúng. Discovery fit claim và2tool-output errors còn tồn tại; tư vấn/negotiation usefulness chưa tiến bộ ổn định. Chưa stability/human acknowledgement/live delivery qualification; không tự mở vòng sửa/model hoặc publish dữ liệu tiếp theo.
