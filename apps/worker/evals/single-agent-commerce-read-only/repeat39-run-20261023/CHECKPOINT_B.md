# Phase B — full39 lặp lại với prompt hiện hành

**FULL39_COMPLETE — CHƯA B GO.** Ngày23/10/2026 theo giờ shop. Source `01e689b4c4f002cfd085b4038837901a14256a3e`. Sau [review](../../../../../docs/specs/c3-phase-b-full39-rootcause-independent-review-20261023.md), lượt vừa qua chỉ [sửa kế hoạch](../../../../../docs/specs/c3-phase-b-full39-rootcause-fix-plan-20261023.md); code/prompt chưa được triển khai theo plan mới. Owner yêu cầu chạy lại model, đã chạy đủ39ca hiện hành N1; đây là repeat quan sát, không validation treatment mới hoặc stability qualification.

## Provenance và phạm vi

24B1 +8stateful +4openings +3negotiation, thứ tự18ưu tiên rồi21B1còn lại, không trùng slot.38publicturns và1privatecode-only. Không chạy diagnostic4, paired advice/quote experiments, deadline controls của kế hoạch mới hoặc A2/A3. Cap152generationrequests, retry0; không chạy lại lỗi để thay kết quả. Full run kết thúc ở cùng clean source/config HEAD; report commit sau không đổi executable.

[EXECUTABLE_COMPARISON](EXECUTABLE_COMPARISON.json) xác nhận17frozenfile hashes giống lượt trước540b8129: manifest/config/prompts/runners/corpora. Live source được đọc mới, captured clocks và accepted stateful histories có thể khác. Không coi hai lượt là causal A/B. [REGISTRATION](REGISTRATION.json), [commands](commands.json), [hashes](RAW_HASHES.json), frozen-inputs giữ exact bytes.

Owner Vertex/Gemini3.5FlashLite HIGH, model/version `gemini-3.5-flash-lite`, global/candidate1/maxOutputTokens8192/thinkingHIGH, timeout90s/retry0. Verifier OpenAI/GPT‑6.1Sol HIGH, model/version `gpt-6.1-sol`, existingCodexlogin/CLI0.159.2 boundedrelay, toolsnone/max1HTTP/generation/timeout90s/retry0. Exact manifest/config trong frozen-inputs. Giữ3owner/2toolrounds/6calls/1verifier.

Owner prompt SHA256 `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`; verifier `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`; verdictschema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.

Quota read trước dispatch: ordinaryUsageAllowed=true; không dùng resetcredit, không generation dòquota.4preflightsPASS/0generation. Candidate handoff dùng clone/version/hash/resolver trong3DBcôlập; không sửa publishedsource, không Meta send/POS order/deploy.

## Actual outcomes

| Nhóm | Ca | Eligible | Fallback | Handoff | NO_SEND có code reply |
|---|---:|---:|---:|---:|---:|
| B1 |24|23|1|0|0|
| Stateful |8|4|0|2|2|
| Openings |4|1|2|1|0|
| Negotiation |3|3|0|0|0|
| Tổng |39|31|3|3|2|

Cả39có actual reply/capture;2NO_SEND là intake/preview code, không phải silence. Review nguyên lượt: **34dùngđược/2cầnsửa/3fallback**. Dùngđược gồm code/handoff đúng khả năng và câu còn cần polish; không có nghĩa34câu đều tự nhiên/thuyết phục. N1/non-blind, giữ tiêu chí lượt trước, không keyword grading hoặc chấm draft không gửi như actual. [39hội thoại](CONVERSATIONS.md), [primaryreview](PRIMARY_REVIEW.json).

Hai ca NEEDS_EDIT vẫn là:

- `b1-buying-concern-v2`: khen cả bộ rồi mở mua áo/mua váy, chưa chọn hướng cho khách vốn quen đồ trơn. Cùng lỗi quyết định và câu dài.
- `sales-product-gallery:overview`: gửi2ảnh chung được nhưng nói “hệ thống chưa có phân loại màu riêng”, thêm mô tả/giá không khách hỏi. Media hoạt động, giọng và trọng tâm chưa đạt.

Ba fallback dùng nguyên static `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.”

1. `b1-changed-occasion`: owner generation3 vẫn trả functionCall khi toolmodeNONE/đã2rounds; `unexpectedToolCall:true`, terminalOWNER_TOOL_MODE. Code không thực hiện tool ngoài budget. Lượt trước ca này gửi được.
2. `sales-discovery-advice:need`: verifierFAIL refSQ748, UNSUPPORTED_PROTECTED_ASSERTION. Draft giới thiệu UyểnHoa short/lưngchun, “không lo bị bó bụng”, hợp đi làm rồi hỏi khách chọnsize. Nguồn SQ748 có short/lưngchun thật, không gọi bịa cấu tạo. Query `bộ đi làm`; batch lần này đọcSQ748 trước, SQ629 bịSUBJECT_BOUND, V406đọcđược. Khác thứ tự lượt trước vốn SQ748bịchặn; thiếu readback đổi món nhưng cả hai search candidates vẫn short. Không kết luận bound là nguyên nhân duy nhất hoặc có thể sửa bằng tăng bound. Span verdict chưa rõ, không mặc định false reject.
3. `sales-southern-delivery:deadline`: owner generation2 HTTP200/MALFORMED_RESPONSE/OWNER_FINISH_REASON; chưa gọi verifier, không có finaldrafthợplệ. Lượt trước failởverifier; lượt này không chứng minh deadline boundary đã tốt hơn hay lại chặn cùng nghĩa.

## Recovery và authority

`negotiation-cart-setup` có verifier response nhưng finalgate phát hiện CURRENT_SNAPSHOT thay đổi, revision giữ4. [SNAPSHOT_RECOVERY](SNAPSHOT_RECOVERY.json) dùng existing allowlisted comparator: observedAt22:04→22:34UTC và expiresAt đổi; offers sourceVersion/factSnapshotVersion đổi. Trong phần comparator, giá/tồn không đổi. Đây không phải toàn bộ world-equivalence proof.

Old draft không được gửi dựa vào PASS cũ. Existing code dùng receipt/currentquote trả “Em đã thêm món chị chọn vào giỏ. Tổng529.000đ… Có món đặt trước…”. Có đúng1receipt-backed recovery;7result có recoverymetadata không được tính thành7successfulrecoveries.3DB provider đã drop, captured delivery only, không giữ live mutation.

## So với lượt trước

| Review actual | Trước | Lặp lại |
|---|---:|---:|
| Dùng được |32|34|
| Cần sửa |3|2|
| Fallback |4|3|

[COMPARISON](COMPARISON.json) đối chiếu cùng39caseIds:

- `stateful-correction` và `b1-partial-source-v2`: trước lỗi malformed/transport, nay trả được.
- `b1-changed-occasion`: trước gửi được, nay toolmodeviolationfallback.
- `negotiation-price-objection`: trước bỏqua ưuđãi30k để quảng cáo policy mua2; nay nói hỗ trợ30k và tổng499k. Totalcontrol cũng đúng499k. Ledger tierHESITANT/version2/evidenceCount1 giữ nguyên sau totalquestion; không tự tăngưuđãi.
- Discovery vẫn fallback nhưng chọn SQ748 thaySQ629; deadline vẫn fallback nhưng loại lỗi khác. Không gọi hai ca cùng loại rootcause từ terminalFALLBACK.
- Gallery/concern-v2 vẫn NEEDS_EDIT. Concern còn gom mềm/nhẹ/rũ/thanhthoát/baybổng và lặp ngân sách. Ca gặp khách chọn áo; ca mua dùng nhiều lần lần này chọn bộ thay áo, cả hai chấp nhận nếu lý do mua hợp lý. Không ép cùng đáp án làm qualitypass.

Kết quả tốt hơn nhẹ trên actual counts nhưng **chưa có bản sửa behavior mới**, không quy32→34cho plan/prompt và không kết luận ổn định từ haiN1. Các lỗi cũ còn thay đổi vị trí, model có lúc dùng quote đúng và có lúc bỏqua. Giữ kế hoạch kiểm giả thuyết riêng trước khi triển khai/gộp nhiều thay đổi.

## Accounting và vận hành

109generationrequests=77owner+32verifier,109uniqueIDs/109wirebodies, max1upstreamrequest/generation,0retry. Owner2generationerrors (unexpectedtoolcall và malformedcompletion),0HTTPerror quan sát; verifier32responses=31PASS/1FAIL,0providererror. Không dùng verdictPASS thay finalgate. Không timeout/quotaerror quan sát. Fallback3/39=7,69%; handoff3/39=7,69%; rawNO_SEND2/39=5,13%; actualsilence0.

Recursive modelrequest scan cả JSON lồng trong text và exactcaseIds:0evaluatorlabelleak. Model/effort/tool_config giữ đúng manifest. [Accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), rawcaptures giữ errors và draft không gửi.

Verifier p50 **5,432s**, p95 **7,679s** (N32); verificationstage+readback p50 **7,037s**, p95 **14,284s**. Wholeturn p50 **15,564s**, p95 **50,742s** (N39), không gồm launcher/build startup. Nearest-rank. Owner input372671/output54506 (thinking50984), usage77/77; verifier input152416/output2604 (reasoning1828), usage32/32. Thinking nằm trong output telemetry, không cộng lần nữa. Cost không expose. Source/auth/embedding I/O tách khỏi generation accounting.

## Verification và giới hạn

Thực chạy13jobs:4zero-generationpreflights +6B1ranges1:1,9:9,15:15,2:8,10:14,16:24 +3isolatedproviderjourneys `--candidate-handoff`. Allcommands exit0, sáuB1runner builds PASS; exit0 không có nghĩa mọi draft/casePASS. Coverage/109requestidentity/oneupstream/label/model/DBcleanup,JSON/secretpattern và hashes kiểm riêng khi packaging.

Không sửa runtime/shared source hoặc rerun full unit/typecheck/lint ở lượt này. Implementation checks trước vẫn là evidence lịch sử, không claim remoteCI. Các thay đổi sau run chỉ report/tasks. Matching charts/asset-color/attributes/ETAanchor và N3b/N6b/staffimage/unregisteredjourneys vẫn mở. Không chạy experiments của plan mới hoặc auto vòngtiếp.

**Recommendation: STOP tại kết quả lặp39, B chưaGO; A OWNER_BYPASS.** Có thể triển khai kế hoạch đã sửa trong bước được yêu cầu tiếp theo, không gọi các lỗi đã được fix từ việc chạy lại cùngmodel.
