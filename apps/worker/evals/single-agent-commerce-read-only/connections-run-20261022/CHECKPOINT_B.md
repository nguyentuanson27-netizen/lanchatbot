# Phase B — kết quả nối tác vụ còn thiếu

Ngày22/10/2026. **PARTIAL_IMPLEMENTED — CHƯA B GO**. Đã nối các slice độc lập được thiết kế; N3b và privacy/đọc ảnh cho staff còn prerequisite. Khả năng gọi tác vụ đã được kiểm riêng với chất lượng bán hàng. A vẫn **OWNER_BYPASS**, không đổi thành PASS. Không production wiring, deploy, live Meta send hoặc sửa dữ liệu shop thật.

## Nguồn và provenance

- Implementation base của task Phase B này: `1aa3a1d377c3b22952c033e90d4cbd4086591c3c`. Historical manifest implementationBaseSha vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, không sửa lịch sử A.
- [Plan N1–N8](../../../../../docs/specs/c3-phase-b-missing-capabilities-plan-20261022.md); plan blob tại task base `0ba1c1a942124e4ff6dedbc23bf2f30bc52881d7`.
- Architecture spec blob `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; semantic boundary amendment blob `4a09b55d2f3a972a65697738876cc5eab21e7a2b`, cùng tại task base.
- Bốn opening: run source `bce8538b75c15197515f75793ba5d038ee7392f2`; raw commit `f14dbb7a`.
- Ba lượt negotiation companion: run source `67c78b2adb1cd6d67f418549088cfd6cd3231ba1`; raw commit `074f6945`.
- Public-image API sanity: run source `22b6bea85f18a8a441e28f5631515405b197ea9f`; raw commit `1a043515`.
- Mỗi provider source được commit, clean executable/config worktree và preflight trước chạy. Thay đổi N6a sau hai cohort customer được ghi ở source mới; không nhận kết quả cũ là qualification toàn candidate mới. Metadata/report commits không tạo generation mới.
- Exact models/config, prompt/schema/corpus hashes và budgets nằm trong [opening registration](raw/registration.json), [companion registration](raw/negotiation/registration.json), [image registration](raw/image-sanity/registration.json). Owner **Vertex Gemini3.5FlashLite HIGH**, verifier **GPT-6.1Sol HIGH** qua route Codex đã có; không đổi model/prompt hoặc dùng model thay thế.
- Owner prompt SHA256 `434e5dc01326075c74b63ff705406b531ec5adc3b95214b55731bc52b8ce86f3`; verifier `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`. Schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Candidate corpus `4b888f6e44f5b4e144125da38d70bf175946dc5277eabb8d0ab5a6639077fbeb`.

## Đã nối và giới hạn

| Slice | Kết quả | Bằng chứng / phần chưa có |
|---|---|---|
| N1 | Private checkout theo active clarification, hỏi từng field; tên/địa chỉ không nhãn trong syntax hẹp; pause/resume | Focused và real DB/capture PASS; zero model calls cho private answers. Không nhận mọi dạng tên/địa chỉ tự do đều parse được. |
| N2 | Query30history rows, lọc private rồi giữ8tin/4096byte; không duplicate latest | Captured-window test và DB public projection PASS. Private preview vẫn nằm trong authorized history store; public model projection drop toàn tin. Không claim toàn DB không còn dữ liệu riêng tư. |
| N3a | Explicit product code/adTitle code/currentProductId → verified catalog refs | Focused PASS; không lấy sản phẩm đọc cuối làm lựa chọn. Chưa có adId→product mapping riêng. |
| N3b | Chưa implement | Chưa có contract lưu lựa chọn cuối sau so sánh trong2tool rounds; không thêm round3/final semantic object. |
| N4 | `select_product_media` → source/intent/component/color checks → TEXT+IMAGE cùng protected group | Focused + DB capture/replay PASS, cả khi có giỏ; không giữ ảnh của draft bị chặn. Color không đủ nguồn thì UNAVAILABLE. Actual request ảnh be chưa gửi được ảnh. |
| N5 | Attachment không còn blanket NO_SEND; private intake/handoff; link đúng message chứa ảnh đầu batch | DB image-first/text-last PASS, nguồn Inbox mã hóa được giữ. Admin hiện chỉ expose source/type/count + Pancake conversation; chưa chứng minh staff đọc image bytes qua admin có quyền. Unknown media handoff cả batch; chưa có trả phần public độc lập trong cùng media handoff. |
| N6a | `view_product_media` → same owner với public catalog bytes, không tự chọn ảnh outbound | Actual2public images/API compatibility PASS,1request; exact downloaded/prepared hashes, readback và bounds. Chưa chạy customer journey để đo cải thiện tư vấn từ ảnh. |
| N6b | Chưa đưa ảnh khách cho model | Chưa có privacy mechanism chứng minh ảnh khách được phép đưa provider. Không OCR/reranker/third role. |
| N7 | `record_negotiation(intent,sourceQuote)` → existing canonical engine/transaction/quote | DB one event/replay/reprice PASS; provider objection ghi1evidence, total question không ghi thêm. Chất lượng giải thích ưu đãi còn cần sửa. |
| N8 | Extend existing harness cho selected openings/companion; giữ fixed24B1/8stateful | Không chạy full12journeys.28candidate slots NOT_REGISTERED được liệt kê; private/media fixtures chưa materialize đầy đủ bị reject, không tự bỏ attachments. |

Code vẫn quyết identity, truth, freshness, permission, state, effects, receipts, privacy. Verifier chỉ đọc protected semantics của exact final text. Không thêm semantic role, router, generic Vietnamese parser, repair/reverify hoặc framework provider. Có3native capabilities mới và1bounded media wrapper; không bảng/state/migration mới. Delta worker/contracts so với task base:20files,+603/-62lines, gồm tests; shared media helper sửa đúng1flag ffmpeg sau actual-binary RED. Không nối candidate vào production entrypoint. Hai shared guards chỉ phân biệt parent PRODUCT_MEDIA với variant PRICE/STOCK; variant/freshness/product checks còn nguyên.

## Kết quả model và review toàn lượt

[Toàn bộ7lượt customer](CONVERSATIONS.md), [số đo](METRICS.json), [raw hashes](raw/SHA256SUMS.json).

| Cohort | Đã thực hiện | Terminal | Nhận xét |
|---|---:|---|---|
| J02/J03/J05/J08 openings | 4/4,12requests | 1eligible,2fallback,1silent handoff | Chưa đủ dùng cho mục tiêu mua hàng; không mở dependent turns để che failure. |
| Negotiation companion | 3/3,8requests | 3eligible | Tác vụ đúng,1reply chưa dùng phần hỗ trợ code vừa cấp. |
| Image API sanity | 1/1request | Không customer outcome, không eligible/send | Đúng model/API nhận actual public images. Không cộng vào7lượt hay safety/quality PASS. |

1. **J02 — chưa đưa được lựa chọn.** Search trả nhiều ứng viên. `read_product` đầu mở nhiều selling options; lần đọc tiếp chạm existing8subject bound (`SUBJECT_BOUND`). Owner lại gọi tool khi final-only đã NONE nên terminal fallback `OWNER_TOOL_MODE`. Root gồm choreography/offer expansion trong bounds và owner không dừng đúng budget. Chưa có bằng chứng chỉ đổi prompt giọng sẽ sửa được; không tăng round/bound để cứu ca.
2. **J03 — nói đúng thiếu ảnh nhưng chưa phục vụ xong nhu cầu.** Tool thực sự trả `NO_VERIFIED_MATCHING_MEDIA` cho màu be. Reply thêm giá, một ngoặc dài kể chất liệu rồi hỏi “cần hỗ trợ thêm thông tin gì”; đây là giọng cung cấp thông tin thừa so với yêu cầu xem ảnh. Audit SV2447 cho thấy11approved/verified/hashed assets, product timestamp còn trong30ngày, nhưng `product.colors=[]`; `ProductImage` chưa có binding asset→màu bán. Index có `image_visual_colors`, không tự coi nhãn nhìn thấy là mã biến thể POS. Không nói shop hoàn toàn không có ảnh.
3. **J05 — verifier chặn có căn cứ.** Engine trả `NO_VERIFIED_CHART`; owner vẫn gắn cao/nặng với “sẽ mặc rất thoải mái”, “hoàn toàn đáp ứng” độ rộng. Khách nhận fallback, không nhận draft đó. Root là thiếu eligible chart **và** owner không dùng trạng thái thiếu nguồn đúng cách. Không quy hết cho verifier hoặc bắt thêm ba vòng khi chưa có chart hợp lệ.
4. **J08 — context ETA không dùng được, không phải verifier chặn.** Current read có `ETA_DATA_MISSING_OR_EXPIRED`; owner gọi `ETA_UNAVAILABLE` và policy hiện hành handoff không tin giữ chỗ. Khách không nhận câu trả lời. Cần kiểm producer/nguồn ETA và lựa chọn holding rule hiện có; không hardcode thời gian vào prompt. Cả miền Nam vẫn dùng chung transit theo contract đã chốt.
5. **Companion — phân công model/code có tác dụng ở state.** Giá gốc499k+ship30k, objection làm code hỗ trợ30k, tổng499k;1evidence/tierHESITANT. Lượt hỏi tổng sau đó giữ nguyên tier/version/evidence. Tuy vậy reply xin bớt chỉ nhắc giá niêm yết rồi upsell2món/5%, bỏ qua hỗ trợ vừa áp dụng; khách phải hỏi lại tổng. Upsell không tự là lỗi bán hàng; cần dùng quote hiện tại để trả đúng yêu cầu trước. Reply tổng đúng số nhưng còn ngoặc dài/giọng kế toán. Ba lượt không chứng minh độ ổn định qua repetitions.

N6a audit còn sửa một assumption kỹ thuật: registry IMAGE_HASH chỉ đối soát, publisher cho phép CDN encode lại. Hai JPEG thật3.000px vừa khác registry checksum vừa vượt vision input bound. Đã tách registry/download/prepared identity và resize bằng existing ffmpeg. Actual preflight bắt thêm flag `-autorotate 1` sai cú pháp; sửa boolean `-autorotate` theo [tài liệu FFmpeg](https://ffmpeg.org/ffmpeg.html). Google inlineData/MIME/media-resolution được đối chiếu [official Content API](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/Content) trước đổi wire. Không sửa prompts để fit các kết quả này.

## Accounting và kiểm tra

- 7 customer outcomes:4eligible,2fallback(28,57%),1handoff(14,29%),0NO_SEND;1handoff không có tin khách nhận. Không corpus unsafe preregistered ở đây, nên không có phép đo A2/false-PASS safety qualification.
- 20 customer generation requests:15owner+5verifier; thêm1owner request image sanity riêng. Max1HTTP generation/request ID,0automatic retry.0HTTP errors/0timeouts;1owner tool-mode violation dù HTTP200. Không loại failure khỏi denominator.
- Verifier p50/p95:7.402/14.233ms; added verification stage p50/p95:10.112/17.566ms, nearest-rank,n=5, có readback/hạ tầng test. Không coi là SLA.
- Customer runs:owner input/output88.012/11.002tokens, verifier25.626/802tokens; output gồm reasoning. Image sanity4.833/683tokens, request276.977bytes. Cost không expose (`null`). Chưa đo đầy đủ latency chuẩn bị ảnh/e2e tư vấn ảnh.
- Captured20customer request bodies không có evaluator-only fields; unit canary tests cho các projection mới PASS.20raw files kiểm SHA256, secret-pattern hits0. Image input là public catalog; customer attachments không đi provider. Không claim scanner là bằng chứng không thể có PII trong mọi nguồn.
- COD composed18/18 và BANK_TRANSFER full32/32 PASS trên database cô lập; tất cả DB, kể cả2run deterministic thất bại trước, đã drop. [COD](raw/cod-integration.json),[BANK](raw/bank-integration.json). Không dùng số check DB làm số hội thoại/model generations.
- Final worker451tests/19files PASS, Node77PASS, contracts60PASS; business selector/readiness71PASS, protected/reply21PASS, negotiation-engine9PASS. Typecheck/build/lint và direct final worker compile PASS; phạm vi/lần chạy cụ thể ở [commands](COMMANDS.md).
- Hai deterministic failures được giữ: assertion nhầm authorized preview với public history; negotiation planner thiếu CART_READY/replay context bị transaction chặn. Đã sửa đúng contract, không bỏ guard. Một Vitest invocation chọn nhầm các Node `.mjs` suites bị `No test suite found`; đã chạy đúng source paths và Node runner riêng. N6a compile từng fail Buffer/MIME inference rồi được sửa; image preflight đầu fail0generation ở actual ffmpeg. Không gọi các lệnh thất bại đó là PASS.

## Hướng tiếp theo và điểm dừng

Giữ các bridge đã qua kiểm; chưa mở B GO. Việc còn cần xử lý là contract terminal focus N3b, staff/private-image access và N6b privacy, binding ảnh theo màu, eligible size chart/ETA nguồn thật. Với model, ưu tiên xem choreography search/read trong bounds và cách dùng authorized quote; không tiếp tục nhồi ví dụ/cấm từ vào prompt. Cần một scope riêng có hypothesis và selected cases trước vòng chất lượng tiếp theo.

Không full provider24B1/8stateful hoặc toàn12journeys trong lượt này. Không promotion/migration/removal/deploy/live send. Các phần pending được giữ trong tasks/todo thay vì đánh dấu hoàn thành toàn plan.
