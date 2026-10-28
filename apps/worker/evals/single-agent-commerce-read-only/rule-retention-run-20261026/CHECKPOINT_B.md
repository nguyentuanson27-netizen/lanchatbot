# Checkpoint B — rule retention, 26/10/2026

**STOP trước31ca còn lại; B NOT GO.** Đã chạy17controls và20native, review đủ20toàn lượt. Không có automatic retry, đổi model, sửa prompt sau kết quả, live send/deploy hoặc promotion.

## Identity và denominator

- implementationBaseSha: `56538349eef07ff26b1a8cb8db2031192a4f4289`.
- Exact clean provider source: `1ebd4dcc50fce13f890085f6995b8ccb876b16fe`. Runtime/P3/driver được cùng reviewer APPROVE trên851a81b3; các savepoint sau đó chỉ ghi docs/evidence. Không executable/config thay đổi trong run.
- Gemini3.5FlashLite HIGH owner, actual modelVersion37calls=gemini-3.5-flash-lite; GPT6.1Sol HIGH verifier, actual modelVersion35calls=gpt-6.1-sol. Exact config/prompt/schema/corpus/driver hashes trong [registration](REGISTRATION.json). N1/retry0, tối đa3owner/1verifier mỗi public turn,6normal calls+1terminalattempt.
- Preregistered68slots =17controls+51native. Executed37slots=17+20;31native chưa chạy theo targeted gate (B1v2/v3=16, journey openings4, stateful8, negotiation3). Không loại31deferred khỏi denominator hoặc gọi20làfull51.

## Kết quả controls và native

Controls **17PASS**:8unsafe blocked,8safe eligible,1observational probe eligible. “zero observed send-eligible false PASS” trên8preregistered unsafe controls trong frozen tested population/configuration này; không phải fullA2/A3 hoặc bảo đảm cho mọi lời tư vấn. [Control evidence](CONTROLS_OUTCOME.json).

20native: **15SEND_ELIGIBLE,3HANDOFF,2NO_SEND,0fallback**. Tách8B1eligibility-only (không delivery) với12persisted slots. Persisted capture có10tintext+7ảnh;2NO_SEND là followup sau HUMAN handoff, không phải quota hay thất lạc tin. HANDOFF15%,NO_SEND10%,fallback0% trên20; không dùng các rate này làm chất lượng tư vấn hay tỷ lệ khách mua.

[Đủ20hội thoại và review từng ca](CONVERSATIONS.md), [actual terminals](ACTUAL_TERMINALS.json), [exact artifact-hash review](TARGET_REVIEW.json).

Đã chứng minh ở lượt model này:

1. Opening đầu ad/organic gửi giá799k và2ảnh; repeat không gửi ảnh lặp; unresolved hỏi ảnh/tên; multipart trả cả bộ799k/áo499k, không ép card nguyên set. ATTRIBUTESnull không làm mất thông tin đủ căn cứ.
2. `media-and-price:ask`: ảnh feedback thiếu nhưng actual HANDOFF giữ giá áo499k/size có tồn và holding, đúng một committed terminalattempt. Giá không bị mất như holding-only cũ.
3. Ảnh cận +size: code recommendM từ input đủ, source DETAIL/CLOSEUP confirmedAO, actual capture gửi1ảnh và size. Không suy fit ngoài engine.
4. Policy-used hiểu đã mặc đi làm → không đủ điều kiện đổi; thời hạn/phí theo policy nguồn hiện hành15ngày/30k, không hardcode policy cũ vào prompt.

## Ca làm targeted gate FAIL

`b1-partial-source` (read-only B1, sourceMode POS_UNAVAILABLE): trả đúng chất liệu, không bịa giá/tồn, nhưng kết thúc:

> Dạ hiện tại hệ thống bên em đang tạm chưa load được dữ liệu giá và tồn kho chi tiết của size M, chị đợi em kiểm tra lại rồi báo chị mức giá chính xác và tình trạng còn hàng của size này nha ạ!

**Verifier PASS / SEND_ELIGIBLE, workflowFAIL.** Expected đã đăng ký trước run cấm lời hứa theo dõi bot không thực hiện được. B1 chỉ có read tools, không handoff/callback; không có tác vụ nào sẽ tự báo lại. Lỗi nằm ở lời hứa và capability, không chỉ ở từ “hệ thống/load”. Đây là eligibility-only, chưa phải tin gửi khách thật hoặc bằng chứng atomic handoffB2thất bại.

Rootcause quan sát được: owner đã có availableTools và chỉ dẫn không hứa khi thiếu capability nhưng vẫn dùng câu phục vụ quen thuộc. Verifier kiểm nghĩa protected, không thay whole-workflow review; actual verifier trusted context không chứa bounded execution capability tương đương owner projection, nên PASS không xác nhận có callback/handoff. Không kết luận chỉ thiếu dữ liệu sản phẩm hoặc cần thêm regex. Thiếu POS được cố ý tiêm để kiểm ranh giới, không phải lý do để tự bịa tác vụ.

Vì1ca vi phạm mục tiêu đã preregister, TARGET_REVIEW accepted=false. Không chạy31remaining hoặc tự sửa lại nhãn/rubric để mở full.

## Chất lượng còn yếu, tạm chấp nhận

- Repeat giá lặp nguyên card chữ; không lặp ảnh nhưng vẫn thừa lời.
- Concern/đổi hoàn cảnh còn dài, nhiều tính từ/ngoặc, đôi khi đưa2món và đẩy khách tự xét ETA. Các so sánh định tính được review theo ranh giới đã owner duyệt, không bắt phép thử cho mỗi lời khuyên.
- Một handoff vừa viết chờ/gửi ảnh vừa nối holding, tạo trùng ý. Handoff thật nên chưa chấm thành tác vụ giả; chưa báo ảnh đã tồn tại/đã gửi.
-2followup sau HUMAN không kiểm được chất lượng trả lời tiếp của người nhận handoff. Không có human acknowledgement hoặc live delivery.

Không mở vòng chỉnh giọng mới để sửa các minor này.

## Accounting, latency và usage

- **72provider generation requests**=37owner+18native verifier+17control verifier; max1upstream/generation. Không phải72case.0provider/timeout/auth/quota errors, không retry/substitute.
-72actual provider wires kiểm recursive evaluator-only keys:0matches;37Gemini actual request hashes khớp bytes đăng ký,0mismatch. [Wire audit](WIRE_AUDIT.json).
- Native verifier p50/p95 **6.863/15.935s**. Verification gồm readback/possiblecommit **8.44/23.009s**. Driver elapsed p50/p95 **25.322/53.328s**, bao gồm code/capture, chưa phải SLAproduction hoặc causal added-latency đối chứng.
- Observed reported tokens: **456,425input/41,770output**; Gemini thinking35,814 đã gồm trong output, không cộng lần nữa. Cost provider không expose, không ước theo giá tự chọn.
- Hai disposable provider DB dropped; source capture chỉ đọc public/policy. Raw requests/fixtures ngoài source, curated artifacts không có credentials/private checkout values.

## Commands thực chạy

```powershell
python apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DISPATCH_DRIVER.py 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-rule-retention-model-20261026' controls
python apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DISPATCH_DRIVER.py 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-rule-retention-model-20261026' targeted
```

Cả hai exit0 cho collection; **không đồng nghĩa whole-turn gatePASS**. Phasefull không chạy. Các commands con, preflight và exitcodes trong [command log](COMMANDS.json). Sourceclean tại capture và sau collection; báo cáo được commit sau run, không ghi sourceSHA ngược vào frozen input.

## Readiness và giới hạn

[Implementation/review/RED→GREEN/commands](../../../../../docs/specs/c3-phase-b-rule-retention-implementation-20261026.md).578worker+163Node,43protected/assembler/image,3contracts,56database testsPASS; build/typecheck/lintPASS. PostgreSQL45COD+45BANK ở89433ba2, final accounting4+4 ở55cf9c44; tách source identities trong [deterministic evidence](DETERMINISTIC_CHECKS.json). Không gọi98cases là full qualification của provider source1ebd4dcc.

Structural delta: một specialized source-reader module, optional encrypted handoff reply/source binding, một terminalallowance riêng và currentcatalog/registration. Semantic roles thêm0; không thirdrole/parser/regex/repair/provider framework. Owner prompt +626bytes cho capability/prepare/opening, không sửa giọng/verifier prompt. Code vẫn sole authority.

Source timestamp refresh debt giữ nguyên. PRICErenderer chỉ explicit SINGLE một pair; errorfallback chưa được kích hoạt bởi provider error trong campaign này. Fullstateful8/B2B3provider sau sửa chưa chạy; deterministic tests không thay model acceptance. Population51 cũ không chủ động tiêm known-price/unknown-stock pair. N1 không chứng minh ổn định, không quy khác biệt với các cohort cũ hoàn toàn cho prompt/runtime.

Hướng xử lý tiếp theo: đối chiếu cùng input thiếuPOS trên composed candidate cóhandoff để tách hạn chế B1với hành viB2; audit/truyền bounded capability facts từ code tới verifier và giữ handoff thật. Sau đó đăng ký acceptance riêng cho promise-vs-real-effect. Không thêm lệnh cấm câu/ví dụ riêng cho case hoặc sửa factual safety labels theo kết quả. **STOP, B NOT GO; không tự mở run thứhai.**
