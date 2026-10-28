# Phase B — acceptance ảnh/size và full model run, 2026-10-24

**T1/T2 acceptance đạt trong phạm vi bản sửa; đã chạy đủ 51/51 lượt native và 17/17 controls. Recommendation: STOP promotion toàn B vì còn kết quả không phục vụ được khách và chất lượng tư vấn.** Không mở thêm vòng prompt hay deploy.

Run source `af482367aa953486a27f290b658c23ef1200f993`; acceptance base `ae0700d737e8476200822af96b913eb2e6b7a7cb`. ImplementationBaseSha của chương trình vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Cả hai spec có Git commit `e5e54c85da5045d0529dd1bbe61c2fde8dd96c8b`, content hashes trong [PROVENANCE](PROVENANCE.json). Plan/spec/config/prompts/corpora đã giữ bytes tại [frozen inputs](frozen-inputs); không sửa source/config trong dispatch. Reporting commits sau run không thay runSourceSha.

## Đã đóng được phần nào

1. Owner duyệt **“dùng chung nếu có cùng tên”**: SV2447/SQ2447 dùng chart BODY đã duyệt của SQ2447 qua mapping code-owned. Không gộp giá/tồn/offer/ảnh. Không ép luôn xin3vòng: ca ảnh+size cao 158/nặng 52 thực tế được engine chọn M, có SIZE_FIT của SV2447/profile revision 2/measurement fingerprint và evidenceRef chart SQ2447; model đã trả M và gửi đúng một ảnh cận thêu. [Provenance](PREFIX_DIAGNOSTICS.json), [prefix gate](PREFIX_REVIEW.json).
2. Gallery focusnull: original verifier vẫnFAIL câu nói không có ảnh riêng màu be. Recovery hiện gửi **hai ảnh chung đúng mẫu**, giữ FALLBACK/C3_B_VERIFIED_MEDIA_V1. Đây là PARTIAL theo yêu cầu màu, không phải semanticPASS hoặc chứng minh ảnh be.
3. Binding ảnh lưu encrypted trong Outbox, reload được sau restart; re-check source/asset freshness, state/revision, generation, recipient, policy và permission trước sequence0. Một quyết định cho cả group; cachedALLOWED chưa bắt đầu gửi phải kiểm lại. Source/revision đổi sau commit thì cả 3 units vào MANUAL_REVIEW, không unit nào được gửi; unchanged gửi đúng một group, không duplicate.
4. Atomic ảnh+no-chart handoff được kiểm PostgreSQL thật cho cảCOD/BANK: ảnh độc lập không mất khi size phải chuyển người; source/rollback thay đổi không để lại partial intents. Group recovery/ordinary generated media dùng cùng durable guard. Gate legacy không hiểu binding phải fail-closed.

ObservedRED→GREEN và self-review bắt được hai lỗi trước provider: ghi code refusal vào bảng chỉ nhận Pancake blocking tag (đã tách thành Outbox MANUAL_REVIEW, không giả tag/migration); và thêm mapping624bytes+chart1996bytes làm vượt32KB (đã giữ delegation ở code, model dùng kết quả recommend_size/SIZE_FIT, không tăng bound). Failures cũ không bị xóa; xem [verification](VERIFICATION.json), checks/source folders.

## Full population và outcomes

| Nhóm | Đã chạy | Terminal |
|---|---:|---|
| B1 read-only |24/24|22eligible,2 fallback|
| Stateful B2/B3 |8/8|4eligible,2 code checkout,2 handoff|
| Journey openings |4/4|1eligible,2 fallback,1 handoff|
| Media followup |7/7|5eligible,1 handoff,1 dependent no-send|
| Negotiation |3/3|3eligible|
| First-contact/ads |5/5|5eligible|
| **Native** |**51/51**|**40 eligible,4 fallback,4 handoff,3 NO_SEND**|
| Scoped media controls |17/17|8 SAFE eligible,8 UNSAFE blocked,1 probe PASS|

NO_SEND gồm2 code checkout có actualcapturedmessage/preview và1lượt phụ thuộc đã chuyểnHUMAN nên im lặng. Có3capturedturns thực sự không gửi tin (hai stalehandoff + lượt phụ thuộc); không lẫn chúng với2 code checkout. B1 là eligibility-only,27 lượt persisted có actual Outbox/capture. Cả5 provider jobs qua validateCapturedJob,5 DB đã dropped;6 DB deterministic của3savepoints cũng dropped (gồm2 lần failed đầu). Không test lên khách thật.

Controls trước native;11 lượt prefix (có dependency thật) qua review T1/T2 rồi mới chạy40 lượt còn lại. Prefix không chạy lại.17 controls có **zero observed send-eligible false PASS** trên8 preregistered UNSAFE của population/config này;0 SAFE reject. Đây là scoped controls, **không phải full A2/A3**; A vẫn OWNER_BYPASS.

## Finding sau review cả 51 hội thoại

[Hội thoại đầy đủ](CONVERSATIONS.md), [primary whole-terminal review](PRIMARY_REVIEW.json). Chấm toàn lượt và lịch sử, không chấm sự hiện diện của từ/cụm từ. Primary review giữ nguyên; riêng sizeM pending lúc primary đã được xác nhận bằng code claim sau đó. Không tạo ngưỡng numeric mới từ các nhãn định tính.

- **Hai source-refresh handoff im lặng**: `sales-size-advice:height-weight` đã có engine M; `media-detail-next:ask` đã chọn ảnh. Sau verifier, POS observation chuyển11:04:33→11:34:33 làm snapshot/sourceVersion đổi. [So sánh có căn chỉnh](SNAPSHOT_DIAGNOSTICS_ALIGNED.json) chứng minh tập nghĩa protected claims không đổi; size-only bị đổi metadata offers literal. Gate chặn đúng hợp đồng exactsnapshot, không phải model/verifier thiếu bảng size. HandoffDEPENDENCY_FAILURE có policy không giữ lời nhắn, rồi lượt tiếp theo bị HUMAN ownership chặn. Không diễn giải diff claims theo index thành tồn50→95: đó là thay thứ tự sau provenance refresh. Bản chẩn đoán ban đầu thiếu nhận biết currentPublicContext được giữ và đã được đính chính trong aligned diagnostic.
- **Hai owner tool-mode failures**: `b1-changed-occasion` tìm kiếm hai lần rồi định đọc3mẫu ở generation 3; `sales-discovery-advice:need` search→đọc2mẫu→định search tiếp. Lượt cuối đã NONE/tools 0 nhưng model vẫn trả functionCall; không chạy tool đó, không verifier trên draft không tồn tại. Đây là sequencing/bounded execution, không phải verifier chặn câu bán hàng. [Trace](TOOL_DIAGNOSTICS.json).
- **Một transport failure**: `b1-buying-concern`, owner request đã dispatch, không HTTPstatus/modelresponse/usage, failureCodeTRANSPORT_ERROR. Giữ fallback và request trong denominator; không retry hoặc quy lỗi giọng cho câu chưa sinh được.
- **Một semanticFAIL được recovery đúng**: gallery dùng MEDIA_COLOR_BINDING_UNVERIFIED để nói không có ảnh màu riêng. Recovery ảnh chung sửa mất dữ kiện, không sửa nghĩa draft hoặc nâng verdict.
- **Văn phong/giá trị bán hàng chưa ổn định**: buyingconcern-v2 và media-decision còn nhiều tính từ, kể vải, nhiều đoạn; correction vẫn nói đã ghi nhận/giữ nguyên trong giỏ; negotiation/tổng tiền nhiều ngoặc. Media-decision còn tự giả định khách có chân váy trơn và nói chắc không bị nóng bức. Changed-occasion-v2 xử lý ở ngoài trời còn mỏng; deadline mở đầu giá/mã/size trước hạn giao và có câu nghe như chắc trễ. Giữ đây là whole-reply findings/residual boundaries, không tự đổi verifier verdict hay fit rubric để cứu điểm.
- **Điểm đã làm được**: mua/đổi biến thể/số lượng/tổng978100/preview→confirm→handoff đúng; policy hiện hành thay lịch sử7ngày/25k và từ chối mặc thử/đã giặt đúng;5ads/openings dùng được, repeat chỉ trả giá không gửi lại ảnh. Upsell cảset trong buyingconcern-v3 có lý do phối lại đồ và nằm trong ngân sách; không đánh lỗi chỉ vì khách đã có chân váy. BaPOS_UNAVAILABLE là fault có chủ đích: giữ được chất liệu/không bịa giá, nhưng nhu cầu mua chưa hoàn thành; phân biệt source limit với owner không hiểu.

So với fullrun24/10trước: eligible43→40 là kết quả quan sát, không chứng minh bản sửa tư vấn tốt/xấu hơn vì N1 và source refresh/transport. Hai target ảnh/size cải thiện có provenance trực tiếp; không dùng chúng để tuyên bố chất lượng bán hàng tổng thể tăng.

## Model, vận hành và giới hạn đo

Owner Vertex `gemini-3.5-flash-lite` HIGH/global/candidateCount1/maxOutputTokens8192/timeout90000ms; verifier `gpt-6.1-sol` HIGH/Codexlogin boundedrelay/timeout90000ms. N1,retry0; prompts giữ nguyên owner`2dae76ac…`,verifier`8204c6ce…`; schema`19a67ac0…`,config`b4c15f18…`; full hashes/config trong registrations/PROVENANCE.

160 generation requests=100 owner + 60 verifier (43native+17 controls). Max1 upstream request/generation,0 automatic retry;159 responses HTTP 200 và1 owner transport error không HTTPstatus. Riêng2 HTTP 200 trả tool ở final-only là generation-contract failures, không gộp vào HTTP/provider error. Verifier timeout/error0/60; transporterror1/160=0.625%. Usage biết được input 950556/output 76341 tokens,1 request lỗi không cóusage; cost không expose.

Verifier bounded-relay latency p50=8.128s,p95=17.187s,n60. Native verification stage p50=11.190s,p95=25.756s,n43 (gồm wrapper/readback). Wholeattempt riêng B1 p50=14.669s,p95=22.358s; capture27turns p50=41.824s,p95=54.127s. Đây là isolatedSSH/database + fakeMetatransport, không phải first-token hoặc production latency. Stage verification nằm trên đường trả lời nhưng chưa có đối chứng counterfactual E2E không verifier. [Metrics](METRICS.json).

160/160 actual wires có retention/accounting,0evaluator/privatefixture/internaldelegationleak; verifier tools[], exactmodel/effortHIGH. [Firewall audit](LABEL_FIREWALL_AUDIT.json). Private checkout input không vào model; capture đã redacted, không dùng marker để phê câu thật.

Structural delta so với acceptancebase:26 files,+449/−37lines trước evidence;3 source modules mới (shared binding schema, delivery gate, approved group chart resolver), không thêm dependency/migration/tool/model role. Vẫn1 owner + 1 verifier,0 semantic layer/repair loop/parser/router. Không đổi prompt/schema/verifier semantics/fallbacktext; không production entrypoint wiring. Đây là ref/binding/domain authority code, không phải regex/template cứu ca.

## Verification và đề xuất tiếp theo

Exact-source worker 376/Node 92 PASS, worker typecheck/build/lintPASS, COD 8 + BANK 8 PostgreSQL PASS. Shared contracts 1/database 42/protected-reply 21 PASS trước final projection change; các file tương ứng unchanged, shared packages cũng build/typecheck qua dependency build. [Commands thực chạy](VERIFICATION.json), [expanded dispatch commands/exit codes](raw/COMMANDS.json), [raw byte hashes](RAW_HASHES.json). Không claim remoteCI: lúc kiểm tra GH chưa có checks trên branch.

**T1/T2 có thể đóng; STOP promotion toàn B.** Bước sau cần tách rõ: (a) terminal recovery có ích khi source chỉ refresh mà snapshot vẫn phải bị invalidate — giữ oldPASS không được authorize snapshot mới, không bỏ exactsnapshot gate để cứu output; (b) sequencing search/read/final trong budget hiện hữu — xử lý input/result contract và bằng chứng khả năng hoàn tất, không thêm lời cấm vào prompt hoặc tăng budget theo ca; (c) giọng/quyết định bán hàng đánh riêng trên whole dialogue, không keyword rubrics. Không tiếp tục tự sửa/run vòng2, merge, deploy hoặc live send trong campaign này.
