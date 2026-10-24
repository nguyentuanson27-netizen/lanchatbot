# Phase B — kế hoạch nối các tác vụ còn thiếu

**Đã triển khai các slice độc lập; chưa hoàn tất toàn plan/B GO.** Trạng thái code, commands, DB/capture, provider và prerequisites được ghi riêng tại [implementation evidence](c3-phase-b-missing-capabilities-implementation-20261022.md). Các mô tả “chưa sửa/chưa chạy” dưới đây là snapshot của lượt lập kế hoạch, không thay báo cáo thực thi. Không tự chuyển A OWNER_BYPASS thành PASS hoặc bật production.

Ngày 22/10/2026. **PLAN_REVISED_AND_CANDIDATE_CORPUS_ADDED** sau review độc lập HEAD `2aa9df44`. Review base code: `da54b16cb1e8825e48b6c76344baba1bd2629b5e`, branch `feat/c3-phase-b-commerce-20261014`. Chưa sửa runtime/prompt, chạy provider, bật ingress production hoặc gửi khách. Bộ ca mới là candidate, chưa được đăng ký vào provider run.

## Mục tiêu và kết luận review

Hoàn thiện candidate B để một cuộc bán hàng đi được từ tìm mẫu, xem ảnh, tư vấn, chọn biến thể đến giỏ, thanh toán hoặc chuyển nhân viên đúng việc. Giữ mục tiêu bán hàng thời trang, lời chat ngắn và tự nhiên; không biến mỗi lần thiếu căn cứ thành một đoạn giải thích về giới hạn hệ thống.

Nguồn: [audit chức năng](c3-phase-b-normal-sales-coverage-audit-20261022.md), spec kiến trúc §§6.1, 8, 9, amendment semantic verifier, code consumer và test hiện hành. Phương án này ưu tiên hoàn thiện chức năng trước [phép thử nhãn/ảnh tư vấn](c3-phase-b-two-run-fix-proposal-20261022.md); không tự cộng hai campaign hoặc sửa kết quả cũ.

Review xác nhận:

| Phần | Hiện trạng chính xác | Việc cần làm |
|---|---|---|
| Lịch sử text | Đã ghi/nạp CUSTOMER, BOT, HUMAN từ PostgreSQL; DB trả thứ tự cũ→mới; owner và verifier nhận history. Tin BOT được ghi qua dispatcher khi provider chấp nhận, không phải mọi draft. | Kiểm/sửa cách lấy cửa sổ và continuity, không xây memory mới. |
| Giới hạn history | Query 8 dòng trước rồi lọc PII; model tối đa 8 tin/4.096 byte. Chưa duplicate batch mới vào history. | Lấy một tập ứng viên có giới hạn rồi lọc, giữ tối đa 8 tin công khai mới nhất. Chưa tự tăng model bound. |
| Context sản phẩm | Ingress có ghi `currentProductId` từ snapshot khi commit; read tools mặc định bắt đầu với `currentProductId=null` và sản phẩm do caller cấp. | Chứng minh đường đọc lại focus trước giỏ, quảng cáo và chuyển mẫu; không gọi toàn bộ phần này là chưa có state. |
| Checkout | Core parser/preview/transaction có; route phụ thuộc phát hiện PII trong câu hiện tại. Tên không nhãn có thể không vào private branch. | Dựa thêm vào checkout đang chờ field, bảo vệ cả history và log trước khi gọi model. |
| Ảnh | Có selector, registry, downloader giới hạn/SSRF và Outbox IMAGE; QR thanh toán đã nối. | Nối ảnh sản phẩm ra, intake media vào, rồi ảnh công khai cho owner. Không import reranker model cũ. |
| Trả giá | Có negotiation engine/state/policy và phép tính quote. | Nối sự kiện từ conversational owner đến engine; model không chọn mức giảm. |
| Size, giỏ, ship, handoff | Native tools và nhiều test domain/DB đã có. | Bổ sung hành trình thực tế; không viết lại các engine này. |
| Tra/sửa/hủy đơn thật, hoàn tiền | Chưa có adapter B theo quyền khách được xác minh; hiện có handoff reasons. | Giữ chuyển nhân viên có context/receipt. Không nhận đã nối POS mutation tự phục vụ. |

## Phân công model–code giữ nguyên

- Một conversational owner hiểu nhu cầu, chọn câu hỏi/lời tư vấn, đề xuất tool và viết exact final text. Tối đa một verifier xét protected semantics; không chấm giọng hoặc ép CTA.
- Code cấp identity/subject refs, đọc nguồn hiện hành, chọn asset hợp lệ, quyết định giá/ưu đãi/size/permission, ghi CAS, dựng receipt và commit Outbox. Model không cấp URL gửi khách, trạng thái đã thanh toán, mức giảm hoặc quyền đổi hàng.
- Lịch sử là lời đã nói, không phải nguồn giá/tồn/policy/effect hiện hành. Đọc lại nguồn khi cần; không nâng một claim cũ thành fact chỉ vì bot từng nói.
- Không thêm model tóm tắt, semantic router, bộ nhớ vector, generic parser tiếng Việt, regex theo ca, repair/reverify hoặc framework provider. Giữ provider/models hiện hành; thay đổi model không thuộc kế hoạch này.
- Không thêm bảng/state riêng cho tác vụ đã có dữ liệu trong conversation/profile/cart/clarification/ledger/history. Nếu một task cần hơn khoảng 5 file chính, tách adapter và consumer thành savepoint kế tiếp thay vì sửa cả luồng trong một commit.

## Thứ tự triển khai

Ưu tiên làm N1 checkout riêng tư, sau đó N2 history; thứ tự còn lại theo phụ thuộc thực tế dưới đây, không bắt mọi task chờ toàn bộ chuỗi.

| Slice | Phụ thuộc bắt buộc | Không cần đợi |
|---|---|---|
| N1 checkout | Existing clarification/private checkout | Media, focus, negotiation |
| N2 history | N1 để loại trừ private turns mới đúng cách | Media hoặc focus action mới |
| N3a đọc focus/quảng cáo | Existing conversation + catalog/refs; dùng N2 cho continuity tests | N3b terminal-focus design |
| N3b lưu lựa chọn focus sau so sánh | Contract thể hiện lựa chọn trong budget 2 tool rounds, cần chốt riêng | Không được chặn N3a/N4/N5/N7 |
| N4 ảnh sản phẩm ra | Verified subject/catalog ref và Outbox/group gate hiện có | N3b; có thể bắt đầu từ mã sản phẩm rõ |
| N5 ảnh khách vào/handoff | N1 privacy routing + existing inbound/handoff stores | N4 ảnh ra |
| N6a ảnh catalog cho owner | Approved catalog asset + existing provider/context binding | N5 ảnh khách |
| N6b tìm mẫu từ ảnh khách | N5 + privacy/retrieval prerequisite thực sự đáp ứng | Không chặn N6a hoặc nhận ảnh để handoff |
| N7 negotiation | Existing current cart/quote/transition/policy | N3 focus hoặc media |
| N8 journeys | Capability cụ thể của từng journey; giữ baseline controls | Không mở tất cả pending cases chỉ vì một task đã xong |

Mỗi task: test cho rủi ro đang sửa phải RED trước, sửa nhỏ nhất rồi GREEN; giữ các test liên quan của baseline. Các bước kiểm dưới đây là verification thông thường, không thêm operator/gate/state bền mới. Chỉ chạy provider sau khi đường deterministic tương ứng hoạt động.

### N1. Nhận thông tin checkout theo trạng thái đang hỏi

**Phụ thuộc:** Không. **Scope dự kiến:** 3–5 file: ingress, session, parser hiện hữu nếu cần, tests tương ứng.

Đọc `clarification`/`checkoutDraft` bằng port hiện có trước public-model path và trước ghi history. `checkoutDraft != null` không đủ chứng minh đang thu PII: draft còn có thể tồn tại sau preview/handoff. Chỉ xác định pending intake từ active clarification/stage hiện hành. Khi đang thu checkout, xử lý input trong private code path; không đợi regex nhận ra tên/địa chỉ.

Contract hiện tại `clarification.missingFields` là một danh sách và tin mời đầu hỏi nhiều field. Vì vậy phải sửa câu hỏi deterministic để hỏi **một field xác định** trước khi map câu không nhãn. Reuse clarification hiện hữu để ghi field vừa hỏi; phần còn thiếu tính từ draft, không thêm pending-field store. Dùng parser hiện hữu cho field có nhãn/số điện thoại/phương thức và giá trị đơn giản ứng với câu hỏi vừa gửi; không đoán chuỗi bất kỳ là tên. Chỉ tiếp nhận bare answer sau khi lời hỏi tương ứng thực sự eligible/được chấp nhận theo path hiện hữu, không dựa vào draft bot bị chặn.

Không hứa hỗ trợ mọi tin trộn tên, sửa giỏ và đổi địa chỉ bằng parser hiện tại. Tin không xác định được field phải hỏi rõ ngắn trong private flow hoặc handoff theo quy định; không đẩy raw input sang owner để extract. Phải kiểm cả việc khách đổi ý/dừng checkout; không để routing theo pending field làm khách mắc kẹt hoặc tự ghi câu hỏi sản phẩm thành tên.

**Hoàn thành khi:**

1. Tên không nhãn, số điện thoại, địa chỉ, COD/CK và sửa field đi vào draft đúng scope; field đủ không bị hỏi lại. Preview/xác nhận/giá ship vẫn qua cơ chế hiện có.
2. Captured owner/verifier requests, public history và log không có PII từ các lượt này; không gửi toàn bộ private history sau khi checkout kết thúc. Kiểm cả tin nhắn nhiều phần trong cùng batch.
3. Input mơ hồ, stale generation hoặc HUMAN owner không tạo preview/đơn/ack giả; private code path không cần generation để thu PII. Hành vi tạm dừng/quay lại checkout được kiểm trực tiếp.

**Kiểm:** session + ingress focused tests; DB/capture COD và BANK_TRANSFER hiện có, thêm nhánh partial/correction vào harness cũ. Không chạm dữ liệu khách thật.

### N2. Nạp lịch sử hữu ích, đúng thứ tự và giới hạn

**Phụ thuộc:** N1 để xác định loại trừ private turns mới ngay lúc intake. **Scope:** ingress + tests và DB/capture assertion, khoảng 3 file.

Giữ model bound **8 tin/4.096 byte**. Dùng một lần đọc tối đa **30 dòng ứng viên** qua `listConversationHistory` hiện có, trước timestamp của batch mới; lọc riêng tư rồi lấy 8 tin công khai mới nhất và bỏ tin cũ nhất khi vượt byte bound. Đây là tăng giới hạn đọc DB có chặn, không tăng context gửi model hay thêm semantic retrieval. Nếu cả 30 dòng đều riêng tư thì history có thể rỗng; không đọc vô hạn để cố đủ 8.

Không cần sửa query sort: DB đang `DESC` rồi `reverse()` trước trả kết quả. 30 là bounded tuning (DB port đã có default30/cap150), không phải ngưỡng chứng minh continuity và không cần gate riêng. Public history là projection đã redact và có giới hạn cắt 2.000 ký tự trong mirror hiện hữu; không gọi nó là full-message retention và không mở rộng lưu trữ để sửa tên gọi. Không đưa draft bị chặn vào history. Không coi provider acceptance là khách đã đọc hoặc human conversation đã hoàn tất.

**Hoàn thành khi:**

1. Chuỗi có private/null rows vẫn giữ đúng các tin công khai gần nhất trong bound; không trùng latest, không đảo sửa đổi cũ/mới. Kiểm timestamp bằng nhau ở ranh giới batch để không vô tình nhận claim đã bao phủ nếu query bỏ tin.
2. Sau nhiều lượt vượt cửa sổ, profile/cart đã commit vẫn còn; lời khách sửa mới thắng context cũ; HUMAN/failed delivery/stale source không tự cấp quyền BOT hoặc biến draft thành accepted reply.
3. Capture chứng minh owner/verifier nhận đúng cửa sổ; test nhiều lượt kiểm ý nghĩa và đối tượng, không chỉ tìm một chuỗi trong request. Nếu nhu cầu chưa persist rơi khỏi 8 tin thì ghi hạn chế và locked failing example, chưa thêm summary/budget state ngay.

**Kiểm:** ingress/session history tests, chat-history tests nếu sửa shared store, composed DB/capture hành trình đang có.

### N3. Nối focus sản phẩm và context quảng cáo

**Phụ thuộc:** Existing conversation/catalog/refs; N2 phục vụ continuity tests. **Scope:** N3a ingress/read-tools bridge + tests; N3b tách riêng, chưa implement action mới khi chưa giải quyết budget.

Đọc lại `currentProductId` của conversation để seed **catalog ref đã xác minh**, đọc facts mới trước trả lời; phân biệt focus đang xem với món đã có trong giỏ. Reuse phần kiểm source/fence/revision của `resolveVerifiedProductContext` khi khớp contract; không kéo theo regex reset/semantic parsing của runner cũ.

`adsContext` chỉ là gợi ý tìm mã/nguồn quảng cáo, không phải fact hay lệnh. Reuse `extractAdProductCodes`/catalog lookup cho mã rõ; nếu chưa có mapping adId/postId→product đáng tin thì tìm/đề nghị khách làm rõ, không bịa mapping. Khách gọi rõ mẫu mới phải được ưu tiên hơn quảng cáo cũ. Khi có nhiều mẫu, owner hiểu “cái trước/cái này” từ lịch sử và chọn ref code cấp; code không tự đoán bằng vị trí trong array.

**N3a:** đọc/seed lại focus đã có và bind mã quảng cáo/catalog rõ, không tự thay focus chỉ vì owner đọc một sản phẩm. Không lấy lần `read_product` cuối cùng làm quyết định đổi focus: so sánh hai mẫu cũng cần đọc cả hai.

**N3b — design còn thiếu, chưa cho triển khai tool mới:** RED phải có round1 tìm hai mẫu → round2 đọc cả hai → generation cuối mới chọn được mẫu → lượt sau nhắc mẫu đã chọn. Runtime giới hạn 3 owner generations/2 tool rounds/6 calls; không thêm `select_product_context` sau đó vì sẽ cần round3. Trước implement phải chứng minh contract hiện hữu có thể mang quyết định ref đến terminal commit mà không thêm generation, đổi exact-final-text ownership hoặc ghi trước khi model đủ dữ kiện. Đồng thời kiểm bound subject, current revision/CAS và readback; không cần gate mới. Nếu chưa chứng minh được, giữ N3b là hạn chế riêng và chỉ hoàn thành N3a. Không tự tăng budget, thêm semantic output object hoặc chọn focus từ thứ tự reads. Field đích vẫn là currentProductId hiện có, không tạo memory/profile field hoặc cart effect.

**Hoàn thành khi:**

1. Khách vào từ quảng cáo chỉ hỏi giá vẫn tới đúng sản phẩm nếu nguồn xác định duy nhất; nhiều mã/không tìm được/mã ngoài shop xử lý rõ, không bind nhầm.
2. N3a: qua lượt mới/restart tool instance, focus đã xác nhận được đọc lại trước khi có giỏ; explicit new product thắng quảng cáo cũ, không sửa giỏ. N3b chỉ được ghi hoàn thành khi có test search→read→select→next-turn trong budget hiện hành và current revision/readback đúng.
3. Hai mẫu cùng lượt, history cũ, source hết hạn và HUMAN owner không sinh giá/ảnh/mutation cho sai subject; có readback đúng existing revision/fence.

**Kiểm:** read-only-tools + ingress focused tests, verified-product-context regression nếu reuse; DB journey hai mẫu trước/sau cart.

### N4. Gửi ảnh sản phẩm qua Outbox hiện có

**Phụ thuộc:** Verified subject/catalog ref + existing Outbox/group gate; không phải đợi N3b. **Scope:** tách hai savepoint nếu cần: (a) native media selection + schema/tests; (b) ingress egress + grouped-delivery tests. Mỗi savepoint khoảng 3–5 file.

Thêm một native operation chuẩn bị ảnh theo `subjectRef`, component và mục đích từ enum hiện hữu. Owner chọn nhu cầu xem ảnh, code reuse selector/registry để trả bounded asset refs và metadata; không nhận URL tùy ý từ model. Chọn selector theo source type thực tế: không bắt catalog `ProductImage` đi qua schema `ProductFactsV2` nếu không có source mapping hợp lệ.

Tool này **chưa gửi**. Sau exact final reply/verifier, commit TEXT+IMAGE qua response group hiện có; reuse claim/readiness/payload binding và delivery group gate trước sequence 0. Verifier nhận context media cần thiết để xét lời như “ảnh mặt sau”, còn code kiểm asset thuộc đúng product/component/source. PASS cho text không cho phép thay ảnh hoặc đổi recipient sau gate. Nếu phải bổ sung media evidence vào trusted schema, chỉ thêm trường bounded cần cho invariant này và test tương thích; không dựng verifier media thứ hai.

**Hoàn thành khi:**

1. Ảnh tổng thể, thành phần, chi tiết, feedback/bảng size chỉ được chọn khi nguồn có đúng loại; không thay ảnh sai loại/màu để đủ ảnh. Thiếu ảnh thì nói ngắn, vẫn giữ phần trả lời độc lập đã xác minh nếu eligible.
2. Capture transport có đúng TEXT/IMAGE và thứ tự, không URL model tự tạo; no duplicate khi replay. Source/permission/recipient thay đổi chặn cả group trước gửi, không giữ media của draft bị từ chối trái disposition.
3. Ảnh sản phẩm và BANK QR không dùng lẫn selector; QR checkout/COD và media-only response có regression. Không in URL riêng tư/token vào evidence.

**Kiểm:** selector tests theo loại được reuse, native adapter schema tests, ingress tests, meta-outbox dispatcher/group-delivery tests và composed capture. Không live Meta send.

### N5. Nhận media an toàn và chuyển nhân viên khi cần

**Phụ thuộc:** N1 privacy routing và existing inbound/handoff integration, không phụ thuộc N4 ảnh ra. **Scope:** ingress + media resolver/adapters + tests, chia riêng capture harness nếu vượt 5 file.

Thay blanket `attachments.length → NO_SEND` bằng xử lý theo khả năng hỗ trợ. Reuse downloader/URL allowlist, byte/MIME/time bounds hiện có; kiểm redirect trước request tiếp theo. Không tải URL model đề xuất. Attachment ngoài phạm vi vẫn có outcome rõ; lỗi một ảnh không tự xóa phần text độc lập đã đủ nguồn và được phép trả lời.

Biên lai, ảnh lỗi hàng và ảnh có nguy cơ chứa thông tin riêng tư không được tự đưa cho owner/verifier công khai. Giữ attachment gốc ở đường lưu/intake có quyền hiện hữu và nối request_handoff/context cho nhân viên; không khẳng định đã thanh toán hay đã duyệt đổi từ ảnh. Chưa biết ảnh là loại nào thì mặc định chưa gửi ảnh cho model; hỏi mục đích ngắn hoặc handoff, không thêm model classifier/OCR.

**Hoàn thành khi:**

1. Tin chỉ có ảnh và tin chữ+kèm ảnh không còn bị bỏ toàn bộ vì một điều kiện chung; ảnh không tải được/không hỗ trợ nhận terminal phù hợp, không giả vờ đã xem.
2. Defect/receipt đi đến handoff thật với source-message/attachment linkage cho nhân viên có quyền. Hiện session truyền attachmentIds=[]; persistence lưu triggerMessagePk=null và scope lấy từ item cuối, còn encrypted Inbox giữ envelope gốc. Đây chưa chứng minh staff nhìn thấy ảnh. Bắt buộc RED batch item1=biên lai/ảnh lỗi, item2=“Chị gửi rồi nhé”, kiểm nhân viên truy được đúng item1 bằng integration hiện hữu. Nếu chưa có adapter/readback, ghi prerequisite cụ thể; không gọi một text “đã chuyển” là hoàn thành và không mặc định cần durable store mới.
3. SSRF/redirect/MIME/oversize/cross-conversation/replay/private bytes không lọt vào provider requests hoặc raw logs; HUMAN ownership và no-send tiếp tục đúng.

**Kiểm:** existing media safety/partial-resolution tests, ingress tests và DB/capture handoff với synthetic attachments.

### N6. Cho owner dùng ảnh công khai và tìm mẫu từ ảnh

**Phụ thuộc:** N6a ảnh catalog chỉ cần approved public asset + provider/context binding; N6b ảnh khách mới cần N5 và privacy/retrieval prerequisite. Không để N6b chặn N6a. **Scope:** tách (a) provider image input/binding/tests, (b) image-search adapter/composition/tests nếu cần. Không viết lại pipeline recognition.

Trước hết cấp ảnh sản phẩm công khai đúng nguồn cho cùng conversational owner; native text/tool history vẫn giữ nguyên. Sau đó nối tìm ứng viên bằng image-search/vector path hiện hữu nếu dùng được độc lập với generative reranker; image embedding là retrieval, không được âm thầm gọi thêm model tư vấn/rerank. Owner hiện tại có thể xem và so sánh ứng viên; code chỉ cho bind refs đã truy xuất/xác minh. Similarity không tự chứng minh đúng mẫu.

Ảnh khách là untrusted và có thể chứa PII/chỉ dẫn. Không xem một câu “đây là ảnh sản phẩm” như bằng chứng ảnh an toàn để gửi provider. Nếu chưa có cơ chế privacy hiện hữu chứng minh cho phép thì tiếp tục hỏi mã/link công khai hoặc handoff; việc nhận media N5 vẫn có giá trị và không bị coi như đã hoàn thành visual recognition.

**Hoàn thành khi:**

1. Check official provider docs trước sửa API; freeze MIME/count/byte/token bounds, source hash/ref binding và request accounting theo cơ chế hiện có. Không bịa `observedAt` cho media metadata hiện đang null; URL/hash metadata chưa thay việc kiểm bytes/asset.
2. Captured request có đúng ảnh được phép và product/component identity; model thấy ảnh không được suy ra giá/tồn, độ kín/chống nhăn/độ bền như kết quả kiểm nghiệm. Catalog images không đi vào customer-image privacy exception.
3. Mẫu rõ/ảnh mờ/hai ứng viên/không có mẫu không tự chọn bừa; không nhập GEMINI_RERANK, model role mới, retry hay instructions trong ảnh. Hạn chế nào chưa giải quyết phải ghi rõ, không giảm invariant để chạy benchmark.

**Kiểm:** gemini-inference adapter tests, media source/bound tests, retrieval adapter tests đang có; provider sanity sau freeze, không chiến dịch sửa prompt đồng thời. Phép thử cải thiện tư vấn từ ảnh là evidence riêng, không mặc định thiếu ảnh chính là root cause.

### N7. Nối sự kiện trả giá vào engine hiện hữu

**Phụ thuộc:** Baseline current cart/quote/negotiation transition/policy, không phụ thuộc N3 focus. **Scope:** state/effects bridge, native declaration adapter và focused tests; không sửa policy arithmetic nếu contract hiện có đủ.

Thêm native operation cho owner báo ý nghĩa của tin hiện tại: `PRICE_OBJECTION`/`PURCHASE_READY`, kèm source quote/ref phù hợp. Runtime cấp source identity, evidence IDs/timestamp, kiểm quote thuộc tin hiện tại rồi gọi transition/NEGOTIATION_EVENT hiện có; code xác định tier, ưu đãi và tổng. Quote match chỉ chứng minh nguồn trích, không chứng minh model hiểu đúng nghĩa; phải kiểm false trigger bằng hội thoại thực tế.

Reuse idempotency/fingerprint/CAS. Khi cart đổi: invalidate/reprice quote, preview và refs phụ thuộc cart; **giữ customerState cùng consumedObjectionEvidenceIds/processedEvents theo canonical cart-reprice engine**. Không reset tier/objection ledger để cho cùng phản đối được tính lại, không sửa policy arithmetic. Không lấy số lần gọi tool làm số lần khách phản đối, không áp hai ưu đãi khi replay hoặc owner gọi lại. Không quảng cáo “shop giảm thêm” trước quote/receipt được code chấp nhận.

**Hoàn thành khi:**

1. Khách phản đối giá được xử lý theo policy/version thật; hỏi giá bình thường, hỏi tổng hoặc phản đối kiểu dáng không tự nâng tier/nhận giảm giá.
2. Replay cùng message, hai tool calls cùng nguồn, cart đổi và policy đổi giữ đúng một transition có hiệu lực; quyền HUMAN/stale generation chặn ghi.
3. Tổng khách nhận khớp current cart/authorized adjustments; code không để model chọn số tiền, policy name hoặc tự cấp freeship. Không có ưu đãi thì vẫn tư vấn/chốt theo nguồn, không hứa xin giảm ngoài khả năng.

**Kiểm:** negotiation-engine/policy tests liên quan, bridge + quote/effects tests, DB/capture chống duplicate và provider journey phản đối giá với control hỏi giá.

### N8. Bổ sung hành trình bán hàng và review toàn bộ đầu ra

**Phụ thuộc:** từng năng lực N1–N7 tương ứng. **Scope:** extend corpus/harness hiện tại, không tạo runner/framework mới; tách corpus khỏi runner change để review.

Giữ 24 B1 và 8 mốc stateful cũ làm baseline. Tách rõ deterministic tests, provider outcome, lượt customer và số generation requests; không dùng số test kỹ thuật để nói số hội thoại đã chạy. Những ca từng PASS trùng mục đích không tự nhân bản thêm.

Đã bổ sung lời khách cụ thể trong [sales-journeys.candidate.json](../../apps/worker/evals/single-agent-commerce-read-only/sales-journeys.candidate.json), với [hướng dẫn/ma trận ca và prerequisite](../../apps/worker/evals/single-agent-commerce-read-only/SALES_JOURNEYS_CANDIDATE.md). Đây là **candidate corpus, chưa phải provider registration**; chưa sửa runner fixed24B1/fixed8stateful hoặc gọi generation. Các bước private/media/control không được ép thành public model turns. Asset/private fixture phải được materialize/kiểm đúng nguồn trong harness trước khi chạy; thiếu thì ghi NOT_READY, không giả lập provider result. Reuse case cũ nơi đã kiểm đúng mục đích; không cộng 12 journey thành 12 generation.

| ID | Hành trình | Bằng chứng cần thấy |
|---|---|---|
| J01 | Giá từ quảng cáo → nhờ chọn giữa hai bộ đi cưới → hỏi tồn be M của bộ đó | Đúng subject/focus/history và facts mới; không tự sửa giỏ. |
| J02 | Bộ đi làm → phối áo với quần jeans có sẵn → hỏi giặt | Lựa chọn hữu ích từ đầu, thông tin mới ở follow-up; không bắt chọn lại hoặc bịa care. |
| J03 | Ảnh tổng thể → xem gần phần thêu → hỏi tồn | Asset đúng loại; thiếu ảnh nói rõ. Góc khác/stock-out giữ ở regression, không cố exercise mọi nhánh trong một chat. |
| J04 | Gửi ảnh kèm hỏi mẫu → mua riêng áo vì đã có váy | Đúng source mẫu/offer và privacy; không nối ảnh mờ vô cớ hoặc mua cả bộ trái ý khách. |
| J05 | Cao/nặng và thích rộng → hỏi màu của size được chọn | Đủ dữ liệu thì tư vấn bằng engine, thiếu thì hỏi đúng. Correction kiểm riêng, không tự nhồi ba vòng. |
| J06 | Mua set → thêm một áo riêng → tổng hai món | Đúng line/ref/tổng. Mixed-size/quantity/remove giữ regression riêng, chưa claim model coverage cho chúng. |
| J07 | Xin bớt → đổi size kèm hỏi giá → đồng ý lấy | Transition/reprice đúng policy, giữ tier/ledger; không buộc phải có ưu đãi để chạy. |
| J08 | Cần sáng thứ Sáu ở Cần Thơ → cân nhắc nhận tại chỗ làm TP.HCM | Có lý do đổi nơi nhận; ETA miền Nam chung transit, không bảo đảm sáng từ lịch giao dự kiến. |
| J09 | COD, cung cấp thông tin từng tin rồi sửa tên/địa chỉ trước xác nhận | Private flow, không leak/hỏi lại; preview/confirmation đúng. |
| J10 | Chuyển khoản, nhận QR rồi gửi ảnh biên lai | Đúng QR/payment context; ảnh không tự chứng minh trả tiền; handoff có linkage. |
| J11 | Báo lỗi hàng kèm ảnh hoặc đã dùng rồi muốn đổi | Trả lời đúng tình huống/policy hiện hành; đủ điều kiện thì nói cách xử lý, không đọc điều kiện thừa; staff thực hiện nghiệp vụ. |
| J12 | Hỏi vận đơn hoặc muốn sửa/hủy đơn đã chốt | Đúng handoff reason/context; không nhầm sửa giỏ với sửa đơn POS. |

Sau review ngôn ngữ/mạch chat, candidate còn12journeys/32inbound slots thay vì44; chưa đăng ký generation. Trước follow-up phải xét actual accepted reply, không cố hỏi điều bot đã trả đúng/đủ. Dùng disposition evaluator hiện có để ghi vì sao chưa dispatch, không thêm model classifier hoặc keyword router. Việc hỏi thiếu đầu vào engine hợp lý không tự là lỗi; ghi đúng phần completion chưa chứng minh. Giữ các action/correction dày ở regression hiện hữu/companion, không nhận chúng đã được model kiểm hết qua bộ ordinary journeys. Kiểm lịch sử vượt8tin, pause/thanks, đổi ý, stale source và HUMAN ownership bằng deterministic multi-turn/DB tests trước; chỉ thêm provider probe khi có owning risk cụ thể. Không kéo dài hội thoại để đủ từ khóa.

**Hoàn thành khi:**

1. Mỗi chức năng mới có đường từ inbound → owner/tool nếu cần → current source/state → verifier final text nếu sinh prose → deterministic gate → captured terminal/Outbox/handoff. Riêng private code path không ép gọi model.
2. Chấm exact actual terminal outcome trên **toàn hội thoại**: hiểu khách, lựa chọn, lý do liên quan, tiến triển mua hàng, giọng tự nhiên và safety. Không chấm đủ keyword; tư vấn an toàn nhưng vô ích vẫn cần sửa. Verifier không trở thành người chấm giọng.
3. Freeze selected case/turn counts, model config, prompt/schema hashes, source SHA và max request budget trước provider. Chạy changed-risk cases trước; chỉ chạy full B1/B2/B3 khi readiness tương ứng đạt. Mỗi ca một lần cho vòng coverage đầu, không best-of/retry; kiểm ổn định chỉ nhân các ca cần đo và ghi variance riêng. Không claim các giới hạn corpus cũ tự động bao phủ media/negotiation mới.

Giữ runtime projection tách evaluator projection: caseId, split, expected behavior, rubric và nhãn quality không được đi vào owner/verifier, kể cả filename/metadata của ảnh. Extend captured-request contamination test cho các field mới. README đã được sửa trong lượt bổ sung corpus: component-variant có native support, không đồng nghĩa đã model-test mọi cấu hình nhiều thành phần. Tiếp tục cập nhật bảng capability/harness theo code và evidence thực tế.

## Lệnh verification dự kiến — chưa chạy trong lượt lập kế hoạch

Chạy từ root. Chọn đúng file theo task, không lặp build/typecheck nếu không có thay đổi mới. Đây là commands có runner hiện hữu; test cho native operation mới phải được thêm vào cùng cơ chế trước khi chạy.

```powershell
# Focused worker source tests: thay danh sách bằng task đang sửa.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts

# Native protocol/adapter, giữ evaluator labels ngoài captured requests.
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs

# Media source tests khi N4/N5 thực sự thay boundary này.
pnpm --filter @lana/business-tools exec vitest run src/image-selection.test.ts src/media-selector-v2.test.ts
pnpm --filter @lana/worker exec vitest run src/media-resolution.test.ts src/media-recognition-v2-image-pipeline.test.ts src/media-input-limit.test.ts

# Negotiation khi N7 thay bridge; focused domain regression hiện có.
pnpm --filter @lana/business-tools exec vitest run src/negotiation-engine-v2.test.ts

# Typecheck/build/lint sau runtime changes, thêm checks của shared package nếu bị chạm.
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Real DB/capture reuse `source-session.py` + `isolated-integration.mjs <new-external-dir> COD` và `BANK_TRANSFER` theo README harness; chỉ database test tách biệt, không live delivery. Cần approved credential route khi thực hiện, không in secret. Provider preflight/run chỉ dùng runner sau khi đã thêm support cho capability mới; không chạy runner cũ rồi nhận coverage tác vụ chưa được khai báo. Nếu provider API/input thay đổi, kiểm tài liệu chính thức trước implement.

## Self-review và giới hạn

- Không thay lời tư vấn để chữa lỗi do route/history/media chưa nối; chỉ bổ sung contract tool tại nơi cấp capability. Giữ prompt baseline cho phép so sánh, không gộp campaign sửa giọng.
- N2 không phải giải pháp nhớ dài hạn: model vẫn 8 tin. Chỉ sửa underfill đã thấy và kiểm reuse canonical state; nhu cầu cũ mất context phải có evidence trước mở rộng.
- Không bảo rằng policy trong prompt là nguồn chuẩn: policy/price/stock/ETA vẫn lấy từ adapter hiện hành. Không hardcode ưu đãi, thời hạn đổi hoặc bảng vùng vào owner prompt.
- N4 là gửi ảnh; N6 là cho model xem ảnh. Hoàn thành một phần không được báo đã hoàn thành cả hai. Ảnh public catalog và ảnh khách có rủi ro privacy khác nhau.
- Intake attachments có thể hoàn thành bằng handoff đúng trong khi recognition ảnh khách còn hạn chế; phải ghi riêng. Không chấp nhận URL/hash/consent làm bằng chứng đã loại PII hoặc xác định đúng mẫu.
- Tool sourceQuote không chứng minh model hiểu đúng ý trả giá; phải kiểm false activation. Không mở thêm quyền vì tool schema đã hợp lệ.
- Existing user-facing handoff chỉ được nói đã chuyển sau commit/readback. Staff cần xem được source/context qua integration hiện hữu; không thêm durable handoff store nếu đường đang có đáp ứng.
- External order lookup/mutation, refund execution, OCR xác minh thanh toán, video recognition và production activation **không được coi là đã có** sau kế hoạch này. Candidate phải chuyển người đúng việc và ghi phần chưa hỗ trợ.
- Complexity delta dự kiến: adapter/consumer glue, bounded media fields, native media preparation và negotiation event. N3b focus action chưa thuộc scope implement cho đến khi choreography phù hợp budget được chứng minh; không tự thêm round hoặc semantic output object. Không thêm semantic role, storage subsystem, operator hoặc verification layer. Mọi schema mới chỉ bảo vệ asset identity/privacy hoặc event authority đang thiếu, reuse final/group gate.

## Trạng thái và điểm bàn giao

Lượt lập kế hoạch ban đầu chỉ code/spec/test review. Lượt sửa sau review bổ sung candidate corpus và kiểm offline theo report trong SALES_JOURNEYS_CANDIDATE.md; **0 provider generations, 0 runtime/prompt changes**. Không dùng kết quả các vòng trước hoặc static corpus checks để claim N1–N8 đã chạy/đạt. N3b và customer-image recognition còn prerequisite riêng; các slice độc lập vẫn có thể triển khai.

Sau mỗi task ghi file/command/result và hạn chế vào todo. Kết thúc implementation bằng report phân biệt: đã nối, đã deterministic/DB test, đã model-run và còn hạn chế. Tiêu chí B hoàn thiện là hành trình đi được và tác vụ đúng quyền, không chỉ giảm fallback. A vẫn OWNER_BYPASS; không tự chuyển thành A PASS/B GO, merge/deploy hay live send.
