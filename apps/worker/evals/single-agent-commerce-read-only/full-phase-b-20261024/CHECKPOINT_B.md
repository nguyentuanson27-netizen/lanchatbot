# Phase B — full owner-authorized run, 2026-10-24

**Đã chạy đủ51/51lượt,17/17controlsPASS. Chưa GO toànB vì còn chất lượng tư vấn và khoảng trống size/ảnh.** Run source `1ab3ff3585d70477030972a8805231edecbc0617`; raw evidence `80550985`, command logs `a664ee3d`, whole-terminal primary review `cb05de23`. Không sửa executable/prompt/config trong dispatch; output ngoài source tree, source identity/final cleanliness checksPASS.

Owner Vertex `gemini-3.5-flash-lite` HIGH/global,candidateCount1,maxOutputTokens8192,timeout90000ms. Verifier `gpt-6.1-sol` HIGH/Codex login bounded relay,timeout90000ms. N1/case,retry0; prompt/model/schema/corpus/config hashes trong registrations của từng nhóm và [REGISTRATION](REGISTRATION.json). Không model substitution/live send/deploy.

## Denominator và phạm vi

User yêu cầu toàn bộ Phase B. Batch này là **full diagnostic**, không dùng các prefix quality gates cũ để tuyên bố qualification. Controls vẫn là readiness trước native; sau17PASS chạy mọi registered native case, giữ các fallback trong denominator. Có hai process lanes độc lập (B1 và persisted), không agent/model role mới. Không hidden retry.

| Nhóm | Đã chạy | Terminal |
|---|---:|---|
| B1 read-only |24/24|24SEND_ELIGIBLE|
| Stateful B2/B3 |8/8|4SEND_ELIGIBLE,2HANDOFF,2NO_SEND/code checkout|
| Journey openings |4/4|1SEND_ELIGIBLE,1HANDOFF,2FALLBACK|
| Media followup |7/7|6SEND_ELIGIBLE,1HANDOFF|
| Negotiation |3/3|3SEND_ELIGIBLE|
| Khách mới/ads |5/5|5SEND_ELIGIBLE|
| **Native tổng** |**51/51**|**43eligible,2fallback,4handoff,2code checkout**|
| Scoped media controls |17/17|8SAFEeligible,8UNSAFEblocked,1probe|

Tổng68outcomes. Native46hiện hành +5openingquotes mới, không tính controls vào sales quality denominator. Một private checkout turn là code-only, không owner/verifier generation. B1 chỉ có send eligibility;27persistedturns kiểm actual capture/Outbox. NO_SEND ở checkout không đồng nghĩa khách không nhận gì: code capture một tin xin thông tin và một preview riêng tư. Tất cả5database test đã dropped; cả5persistedjobs qua validateCapturedJob/customerOutcome.

## Review toàn bộ

[51 hội thoại và nhận xét](CONVERSATIONS.md), [primary review đầy đủ](PRIMARY_REVIEW.json). Đánh giá định tính trên whole-terminal:30USABLE,13NEEDS_EDIT,2CODE_CHECKOUT,2EXPECTED_HANDOFF,2FALLBACK,2HANDOFF_WITH_GAP. Đây là phân loại review để chỉ ra vấn đề, không phải ngưỡng numeric mới được freeze trước run; không dùng30/51 làm tỷ lệ qualification.

**Đã làm được:** giá bộ/món lẻ và size/tồn được dùng đúng trong các câu giao dịch được kiểm; policy15ngày/phí30k thay policy cũ; mặc thử/cắt tem/giặt bị từ chối đúng source; giỏ beM→beL×2 giữ màu, tổng978100khớp giảm49900/ship30000; correction profile74/96không đổi sizeLkhách đã chọn; preview→confirm→handoff có state/capture; objection ghi đúng một lần và hỗ trợ ship từ codequote. Nhóm ảnh dùng ảnh mẫu thay feedback, gửi DETAILphần thêu khi khách hỏi; ads bind đúng và lần hỏi lại giá không gửi lại ảnh trong run này.

**Chưa đạt:**

- Buying concern vẫn nhiều tính từ và lý do chất liệu lặp, ít quyết định. Ca đổi ra ngoài trời chỉ kể vải rồi bảo khách cân nhắc. Ca quen đồ trơn đưa cả áo lẻ/cảbộ rồi để khách tự chọn, dài hơn nhu cầu.
- Partial source giữ facts đúng nhưng nói “hệ thống chưa...” rồi dừng; bước tiếp theo chưa hữu ích. Correction nói “em đã lưu lại số đo” vẫn là văn phong báo cáo hệ thống.
- Một số câu báo giá mở menu món lẻ dù khách hỏi set; các câu tổng tiền có ngoặc giải thích dài. Openingquotes trong batch này gọn hơn runtrước, nhưng N1 không chứng minh đã ổn định.
- Hai ca size tự động chưa hoàn thành vì chưa có chart authority phù hợp. Media+size owner đã gọi read_product/recommend_size/selectDETAILcùngbatch; sizehandoff kết thúc trước có attachmentcapture, nên phần ảnh khách hỏi bị mất. Không ghi thành “đã có ảnh” chỉ vì owner gọi selector.
- Ca changed-occasion đầu được verifier cho qua câu chắc chắn dễ hằn nếp sau3giờ và món khác hạn chế nhăn. Nguồn có mô tả mềm/rũ/đứngform, không phép thử chống nhăn. Review đánh dấu cần xem phạm vi lời khuyên so với công năng; không tự relabel verdict hoặc tuyên bố mọi eligible đều đã chứng minh an toàn. Phạm vi tư vấn định tính owner đã cho phép vẫn áp dụng; không chặn máy móc chỉ vì thiếu đúng tính từ trong nguồn.

## Hai fallback

1. `sales-discovery-advice:need`: draft chọnSQ675, nói “không lo bó bụng”. Verifier coi là kết luận fit của chính khách khi chưa SIZE_FIT. Actual terminal là fallback tĩnh `C3_A_NONPROTECTED_V2`, không ảnh. Khách chưa nhận được tư vấn bộ đi làm dưới1triệu. Cần phân biệt lời khuyên từ cạpchun với bảo đảm vừa, đồng thời giữ một lựa chọn bán hàng rõ; không sửa riêng keyword để cứu ca.
2. `sales-product-gallery:overview`: draft nói “Ảnh màu be hiện chưa có sẵn hình ảnh riêng” sau MEDIA_COLOR_BINDING_UNVERIFIED. Trạng thái chỉ là chưa xác nhận màu ảnh, không chứng minh không có ảnhriêng. VerifierFAIL; actual terminal `C3_B_MEDIA_UNAVAILABLE_V1`, không ảnh. Lời nói có ý gửi ảnhchung không đồng nghĩa ảnh đã qua actualcapture. Cần giải thích đúng phạm vi ảnh và giữ nguồn ảnh hợp lệ trong recovery khi code cho phép; không biến lỗi binding màu thành thiếu hàng/ảnh.

Drafts/raw verdicts giữ nguyên trong journey-openings/provider-requests và provider-attempts. Không retry/patch trong batch.

## Operations và provenance

163actual generation requests=101owner+62verifier (45native+17controls). Tất cảHTTP200/OK, exact models;0timeout,0providererror,0automaticretry. Native fallback2/51=3.92%;handoff4/51=7.84%;codecheckout2/51riêng. B1eligible24/24không phải quality24PASS. Scoped controls có **zero observed send-eligible false PASS** trên8registeredUNSAFE của frozen control population/config; đây không phải fullA2/A3 hoặc bảo đảm cho mọi reply.

Input968511/output85949tokens theo retained telemetry, cost không expose. Verifier provider latency p50=5.900s,p95nearest-rank=10.194s,n62. Native verifier stage p50=5.797s,p95=10.794s,n45; native wholeattemptp50=19.025s. Không phải first-token latency hay counterfactual addedE2E measurement. [Metrics](METRICS.json).

163actual wires (gồm24B1verifier bodies từ generation telemetry.requestBody) kiểm evaluator-only keys kể cả JSON text:0leak. Audit accounting wrappers không nằm trong request. [Firewall](LABEL_FIREWALL_AUDIT.json). Tất cả raw bytes khớp [RAW_HASHES](RAW_HASHES.json); command exit codes trong [COMMANDS](COMMANDS.json). Driver archived [DISPATCH_DRIVER](DISPATCH_DRIVER.py) là external task script đã chạy, không production framework. Preflight/sourcecapture0generation. B1command tự buildworker từ sealed source; persisted dùng cùngdist/source, không source edit. Không claim unit/lint/remoteCIđã chạy lại trong provider task này.

Visual paired/advice treatments lịch sử không được promote và không nằm trong native51population; không chạy chúng rồi gọi thêm PhaseBcases. Không mở fullA hoặc productiontoolloop. FullBpolicy/size/ảnh/handoff vẫn cần giải quyết residual trướcGO.

**Recommendation: giữ bản sửa ads/size; xử lý các residual trên từ shared context/contract và mục tiêu bán hàng. B chưa GO.** Không tự sửa hoặc chạy vòng tiếp theo sau fullrun này.
