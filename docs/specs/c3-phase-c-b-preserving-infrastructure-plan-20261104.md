# Phase C — giữ khả năng Phase B, bổ sung hạ tầng để hoàn tất bán hàng

Trạng thái: **kế hoạch sau review, chưa triển khai/chạy model**. Planning base `d1b15233c6dd35b2155615a22a34ab9f5679b479`; executable của vòng vừa review `e14d26594bb8831909788007f92fba81b3cd54e4`. Owner yêu cầu giữ điểm mạnh Phase B, bổ sung hạ tầng còn thiếu thay vì đổi luồng hội thoại cho phù hợp với chỗ thiếu. Tài liệu này cập nhật thứ tự và acceptance của [plan sales completion](c3-phase-c-sales-completion-fix-plan-20261103.md); các điều chỉnh về test chart/màu/feedback, media không TTL tuổi ảnh và public interruption đã được owner chốt vẫn có hiệu lực.

[Vòng vừa chạy: 33 ca/48 lượt](../../apps/worker/evals/single-agent-commerce-qualification/test-sources-run-20261104/REPORT.md). 27 phản hồi,14 silent handoff,7 human-owned NO_SEND; không đồng nghĩa27 lượt đạt chất lượng. Kế hoạch không thay dữ liệu/kết quả của các run cũ.

## 1. Mục tiêu và điều phải giữ

Bot giúp khách chọn và mua hàng: trả đúng lựa chọn mua, dùng lại điều đã biết, tư vấn có trọng tâm, chuyển tiếp được từ chọn món tới nhận thông tin và xác nhận mua. Handoff thiếu dữ liệu shop vẫn cần thiết trong vận hành, nhưng **không phải cách nghiệm thu rằng capability bán hàng còn thiếu đã hoàn thành**. Thiếu thông tin khách thì hỏi đúng phần thiếu.

Baseline hành vi B để đối chiếu: `4efbea67356f1e3e4f7fa886dec48d58c4ab1474`, cùng sáu captured B controls trong [đối chứng B–C](c3-bc-controlled-diagnosis-20261030.md). Không gọi baseline này là B GO hoặc mặc định mọi câu B đều tốt. Giữ riêng source code, prompt, context, source clock và model variability khi quy nguyên nhân.

| Điểm mạnh phải bảo toàn | Cách bảo vệ trong lần sửa này |
|---|---|
| Báo giá, tồn, chính sách, ảnh đúng nguồn | Dùng lại read ports, quote task và business calculator; không để model tự tạo tổng/receipt hay thay form báo giá bằng lời tư vấn tự do. |
| Chọn size bằng chiều cao/cân nặng khi nguồn cho phép | Giữ đường này; có số đo trực tiếp thì dùng đúng nghĩa bảng, không bắt xin thêm ba vòng mặc định và không bỏ số đo mới để tránh lỗi. |
| Ghi nhớ/sửa thông tin khách; thêm/đổi giỏ và tổng có receipt | Giữ CAS, source evidence, idempotency, correction ordering và current readback; kiểm cả phiên mới/process mới. |
| Owner hiểu câu khách và sở hữu quyết định tư vấn | Code cung cấp nguồn/tác vụ/state; không parse tiếng Việt để quyết định khách chọn gì, không biến read_product thành ngầm xác nhận mua. |
| Một owner, tối đa một verifier; code giữ authority | Không third online role, semantic router, regex theo ca, repair/reverify, hidden generation retry hoặc production wiring. |
| Handoff im lặng, giữ quyền HUMAN và gửi cả group qua gate | Không gửi lời chờ, không nhắc bot/nhân viên; không tiếp tục tự động sau handoff. Final gate vẫn recheck mọi binding/freshness/permission/receipt/privacy. |

Không rollback toàn Phase C; mỗi thay đổi có savepoint riêng và differential controls. Không sửa giọng hàng loạt hoặc thêm ví dụ riêng cho các case lỗi. Tạm giữ những câu hơi dài nhưng vẫn phục vụ được việc mua hàng.

## 2. Findings đã xác minh và việc còn phải xác minh

- **p04:** lượt1 recommend_size PRODUCT/SV2447 thành công; lượt2 cùng profile revision2 và cùng số đo nhưng sizeFitTargets/fingerprint rỗng. `createCustomerStateTools` tạo sizes Map trong mỗi lần compose và loại SIZE_FIT từ base khi dựng snapshot. Không phải đã chứng minh đổi áo sang set; target trước đó đúng PRODUCT. Cần phục hồi khả năng dùng kết quả có căn cứ ở lượt kế, không cho verifier tin lời shop cũ.
- **j2:** chart SQ2447 ghi BUST S86–86/M90–90/L94–94/XL98–98; HIPS cũng là các điểm đơn. Engine chuyển sang số đo trực tiếp và khớp khoảng, nên ngực88 không khớp. Chưa biết các điểm gốc là mốc cơ thể/giới hạn/số đo thành phẩm: phải đọc bảng ảnh và extraction trước khi quyết định khoảng. Không tự kết luận khách ngoài size.
- **p07:** hai recommend_size mang inline state ops cùng batch bị MULTIPLE_STATE_UPDATES; cập nhật sau đó chưa dẫn tới fit. Đây là thiếu phối hợp một lần ghi profile với nhiều kết quả size, không phải đã chứng minh thiếu chart.
- **p09:** request có “Bộ quần nhé” và lịch sử đầy đủ, owner vẫn đọc cả hai mẫu rồi hỏi lại. Lỗi tiếp tục quyết định tồn tại dù input đúng; không thể hứa chỉ thêm field context sẽ chữa được owner.
- **s13:** PRICE/stock/policy đã đọc, continuation bị OWNER_REQUEST_BOUND trước HTTP. Cần đường quote tổng đúng tác vụ và context vừa bound, không hỏi thêm size/mẫu không cần để né tổng ship.
- **j1/j4:** HTTP200/MALFORMED_FUNCTION_CALL; chưa có bằng chứng đó là thiếu dữ liệu hoặc bug parser nội bộ. Phải audit schema/wire thực, giữ fail-closed và accounting; không thêm retry để che.
- **s03:** owner đã thấy capability NO_VERIFIED_MATCH cho DETAIL; không có chứng cứ rằng chưa gọi tool là tự bỏ qua ảnh đang đủ nguồn. Cần bổ sung/kiểm metadata và asset đúng nhu cầu, không dùng ảnh MODEL làm cận ren.
- **p06/s15:** lần lượt thiếu ảnh mở đầu SD023 và binding màu be. White test assumption không cấp bằng chứng ảnh be. **s16:** route feedback chạy với ảnh catalog giả định; không chứng minh feedback khách mặc thật.
- **p10/s11:** verifier chặn gán thổ cẩm thành hoa và tồn không gắn màu thành đủ2bộ be có căn cứ. Không nới hai ranh giới này để tăng reply rate.
- **j6:** hỏi tên sau COD là đúng vì tên còn thiếu, không phải quên lời khách. Vòng hiện tại chưa đi tới preview/confirmation; cần hoàn thiện hạ tầng kiểm cả hành trình, không ép gọi đã hoàn thành checkout từ hai clarification outputs.

## 3. Savepoint I — nguồn và contract size có nghĩa đúng

Files: `packages/contracts/src` (size chart), `packages/business-tools/src/size-engine.ts`, size-chart staging/extraction/eligibility, cấu hình nguồn test và capture-world.

1. Đọc ảnh gốc SQ2447, bản extraction và active policy. Ghi rõ mỗi cột là số đo cơ thể hay thành phẩm, range hay nominal point hay upper bound, đơn vị, ngưỡng có bao gồm biên và độ dư nếu nguồn quy định. Đây là công việc adapter/ingestion, không đẩy cho model diễn giải mỗi lượt.
2. Reuse chart schema nếu nguồn đã có khoảng đúng. Nếu schema thiếu phân biệt BODY/GARMENT/POINT/LIMIT, thêm extension nhỏ có version/provenance và consumer rõ; không viết công thức chia trung điểm hoặc độ dư chung cho mọi mẫu. Điểm chưa đủ nghĩa không được biến thành range giả.
3. Với dữ liệu test, dùng mapping SQ2447→component đã được owner duyệt; không bắt cập nhật toàn catalog. Chỉ chuẩn hóa chart test theo căn cứ đã đọc. Nếu bảng gốc thật sự không quy định cách áp các mốc, hoàn tất phần code độc lập và ghi đúng phần source semantics cần owner chốt; không dùng thêm câu hỏi khách để chữa thiếu quy tắc shop.
4. Engine dùng interval đúng nghĩa, có boundary/overlap handling và fit preference hiện hữu. Áo/quần/chân váy chỉ dùng những số đo mà nguồn áp dụng cho phần đó; việc bỏ cột không được suy từ tên role nếu nguồn chưa xác nhận. Profile correction vẫn được ưu tiên hơn dữ liệu cũ.
5. Controls: điểm giữa hai mốc, đúng min/max, ngoài biên, overlap, khách có chiều cao/cân nặng, bổ sung số đo trực tiếp, sửa cân nặng, chart/role/basis sai, chart đổi. Giữ PRODUCT-only consumers không nhận COMPONENT fit.

**Gate:** bảng gốc→normalized chart→engine result→claim có trace; phân biệt dữ liệu không đủ nghĩa với khách thật sự không vừa. Không đo success bằng việc ép j2 chọn M.

## 4. Savepoint II — kết quả tư vấn sống qua nhiều lượt và một profile cho nhiều target

Files: `single-agent-commerce-state.ts`, composition/session/native adapter, product groups, trusted context/boundary và PostgreSQL profile/state ports hiện hữu.

1. Tách **ý định tư vấn đã được yêu cầu** khỏi claim có hiệu lực. Dùng state hội thoại hiện hữu lưu bounded fit targets đã được owner chọn và code resolve; reuse nơi lưu recommendation nếu có. Nếu port chưa có, thêm adapter hẹp cho target intent tại state repository, không dựa history prose để cấp quyền và không dựng cache authority song song.
2. Ở lượt sau, code tải profile hiện tại và chart/BOM đúng các targets đang dùng, chạy lại deterministic engine để tạo claim hiện tại. Giữ tối đa4targets; không carry nguyên PASS, claim hết hạn hay receipt cũ. Metadata/profile/source đổi thì kết quả cũ không được cấp quyền. Recompute là đường mặc định; không tăng provider calls và không cần migration cache SIZE_FIT nếu state hiện hữu đủ chứa intent.
3. Final readback vẫn kiểm profile revision/fingerprint, chart/BOM/source, target và permission; thay đổi sau verifier phải block. State write/readback failure không được báo đã lưu hay dùng kết quả cũ.
4. Cho một logical profile update đã verify phục vụ nhiều recommend_size trong cùng lượt: code xác định inline ops giống nhau bằng structured equality/provenance thì commit một lần, đọc lại một lần, rồi tính các target trên cùng revision. Ops mâu thuẫn hoặc không thể chứng minh cùng update phải reject cả nhóm trước ghi. Không last-write-wins, không tự sửa sourceQuote, không bỏ MULTIPLE_STATE_UPDATES cho mọi batch.
5. Primitive/state/source-read accounting phải phản ánh việc thực sự làm, giữ cap hiện hành. Nếu chuỗi đã hợp nhất không thể vừa budget, ghi exact thiếu hụt để quyết định riêng; không cộng thêm lượt/call ngầm. Test sourceQuote nhiều giá trị từ j2 và lỗi sửa quote trước khi tính size; không viết parser tiếng Việt mới.

**Gate:** p04 hai lượt giữ được căn cứ current mà không cần khách chọn lại size; p07 trả fit từng phần hoặc hỏi đúng input engine còn thiếu; process restart vẫn đọc đúng. Correction/chart/BOM/revision/recipient change invalidates đúng kết quả. Kiểm PostgreSQL thực và idempotent replay, không chỉ in-memory Map.

## 5. Savepoint III — tiếp tục lựa chọn và báo đúng tổng bằng đường tác vụ đủ dùng

Files: read-only tools/product groups, `single-agent-commerce-quote.ts`, callable/effects/state/session, CompactV2/native provider codec.

1. Giữ canonical component/purchase options và price/stock/chart/media read references đã có. Khi khách đã chọn, owner ghi lựa chọn qua command typed của state hiện hữu. Audit port trước; nếu thiếu khả năng ghi product+offer đang chọn, bổ sung command hẹp đúng conversation state, không nhét vào body measurements hoặc tự thêm giỏ. Code kiểm identity/source, CAS/revision; owner vẫn hiểu khách chọn gì. Không suy read_product đồng nghĩa khách chốt món.
2. Render current selection và phần còn cần khách quyết định rõ trong state; giữ alternative products cho tư vấn khi cần, không để cả hai mẫu cùng xuất hiện như hai lựa chọn còn chưa giải quyết. Không rewrite latest/history. Kiểm request thật của p09 và controls khách đổi ý/hỏi so sánh/chưa chọn. Owner vẫn có thể bỏ qua state; chỉ model acceptance mới chứng minh cải thiện, không coi typed field là bằng chứng hiểu đúng.
3. Reuse quote_product/quote_cart và `evaluateShopPolicy`. Bổ sung đường **quote một lựa chọn trước khi có giỏ**: product/offer/qty/region đã đủ thì code trả unit/subtotal/ship/discount/grandTotal đúng nguồn; không tạo giỏ giả, không cần số đo hoặc địa chỉ chi tiết nếu tính ship không cần. Nếu contract quote hiện hành không biểu diễn được, mở rộng chính helper hẹp đó, không framework/tool tính tiền mới song song.
4. Quote ảnh vẫn theo opening rule owner chốt: mẫu đã xác định duy nhất hoặc trong giỏ phải chuẩn bị ảnh cho opening; danh sách còn phân vân không bắt ảnh từng mẫu. Ảnh ngoài phạm vi bắt buộc không được thành phụ thuộc nhân tạo của ACK/quote tiếp theo. Không bỏ required opening media để né nguồn thiếu.
5. Bounded continuation: cùng canonical component không lặp toàn mô tả dưới hai parent; giữ refs và source identities, receipts, exact tool outputs, signed parts/history. Kiểm cả raw/presented/trusted bounds bằng captured request s13 và đường quote mới. Không truncate, tăng cap hoặc bỏ protected facts. Kiểm schema/function declarations/required args thật của j1/j4; chỉ sửa lỗi contract nếu tìm được. MALFORMED còn lại ghi hạn chế provider, không retry.
6. Prompt chỉ thay đoạn đang mâu thuẫn với command/capability đã nối, không thêm câu mẫu p09/s13. Không giao verifier chấm sales hoặc sửa wording của final reply.

**Gate:** “Bộ quần nhé” dẫn tới xử lý set quần, không hỏi lại hai mẫu; quote áo+ship ra tổng khi đủ nguồn. Giá, nhiều variant, mua lẻ/combo, đổi ý và không tạo effect khi chỉ hỏi giá vẫn đúng.

## 6. Savepoint IV — đủ nguồn ảnh và đủ hạ tầng checkout, không đổi đường khách mua

**Nguồn ảnh:** audit registry/catalog/POS/Qdrant/lookup hiện có cho GENERIC combo SD023, DETAIL ren V406, áo BE và FEEDBACK/TOP. Tìm asset hiện có trước; bổ sung metadata, applicability hoặc index bị thiếu qua đúng source adapter trong clone test, hash/approval/parts/colour kiểm đủ. Search và exact lookup phải thấy cùng nguồn. Nếu thực sự không có asset, ghi cần bổ sung asset đúng loại; không chế feedback, đổi nhãn MODEL hoặc trả ảnh chung thay yêu cầu ảnh riêng. Giả định feedback trước vẫn giữ để test routing, tách khỏi nghiệm thu feedback thật. Không mở lại TTL tuổi ảnh đã bỏ.

Không mở lại yêu cầu publish live hoặc cập nhật toàn catalog chỉ để chạy eval. Snapshot test có giả định đã được owner chốt đủ cho nghiệm thu cơ chế tương ứng; s16 được kiểm routing bằng giả định hiện có, không bị yêu cầu cung cấp lại feedback thật để mở run chức năng. Mức chứng minh functional-test và nguồn thật phải ghi riêng. Với s15, trước hết giữ đúng nhu cầu ACK: nếu phạm vi opening không bắt ảnh, ACK không cần tự phát sinh media call; bổ sung ảnh be phục vụ luồng bán có nhu cầu ảnh, không biến ảnh thành điều kiện để cảm ơn khách. Policy vẫn dùng bản active đã được chốt, không tự thay quy tắc shop trong vòng sửa.

**Checkout:** hoàn tất phần còn thiếu của S6 đã kế hoạch: receipt-backed typed branch witness trong evaluator, native-population/terminal/capture validators và frozen branch policy. Dùng actual after-state/receipt để khách test trả đúng field còn thiếu và xác nhận sau preview thật; không đọc prose để đoán stage, không chèn lời xác nhận vào lúc chưa có preview, không đưa PII/labels vào owner/verifier.

Thêm/đổi giỏ, một đơn nhiều size, thương lượng và public interruption trong pending intake phải chạy bằng luồng native hiện hành. Giữ DLP của tin riêng tư/mixed, receipt/CAS/idempotency, báo giá/ảnh khi phải gửi, group egress và handoff thật. Không giảm journey còn bước hỏi tên để gọi đạt; không bật early-intake khác chỉ để hợp lời thoại cố định. Native confirmation chỉ là xác nhận purchase trong DB test, không tạo POS order thật.

**Gate:** hành trình chọn mua→bổ sung thông tin→preview→xác nhận có actual accepted output/current receipts và không duplicate. Cả thiếu dữ liệu shop và missing customer field có typed outcome đúng; source chưa đủ thì nghiệm thu sales capability còn thiếu, không đổi rubric thành handoff PASS cho chức năng đó.

## 7. Verification và giữ điểm mạnh B trước model

Mỗi savepoint: RED quan sát→GREEN tối thiểu→self-review→sửa; independent review khi owner yêu cầu, không tự ghi APPROVED. Các assertion ranh giới thay đổi phải test producer→consumer→gate; không snapshot test chỉ khớp câu mẫu.

1. Replay sáu B controls bằng exact historical request/facts/clock khi kiểm tương thích; thêm so sánh source ports/size/selection với cùng fresh world cho B và C. Historical clock chỉ dành offline replay, không giả freshness khi chạy model. B không có capability mới thì đánh dấu không áp dụng, không yêu cầu B thực thi tool/schema C. Giữ phần source/search parity chưa có bằng chứng ở mức unknown.
2. Giữ regressions B đang có: báo giá/form+ảnh, policy, chiều cao/cân nặng, correction, add/replace giỏ/tổng, thương lượng, lịch sử, COD, hậu mãi, silent handoff và HUMAN ownership. Không bỏ assertions cũ vì C đổi surface; thay đổi hợp lệ cần deviation/evidence cụ thể.
3. Chạy focused suites theo module chạm; worker protected claims/reply assembler, full worker test, typecheck/build/lint. Shared contracts/business/database bị chạm phải chạy focused tests/typecheck/build tương ứng. Real PostgreSQL cho cross-turn fit, profile conflict, multi-target, lựa chọn offer, quote/no-effect và complete checkout/interruption; dữ liệu synthetic, DB test riêng, cleanup có readback.
4. Trước seal kiểm actual source readiness theo **đúng nhu cầu** (không chỉ có giá/ảnh GENERIC): normalized size meaning, colour tuples, exact media purpose/part, policy, checkout selection/receipt capabilities. Nguồn thiếu phát hiện trước thì bổ sung/hạch toán gap, không sửa câu hỏi thành việc dễ hơn. Không thể bổ sung được thì báo capability chưa hoàn tất; không chạy full lặp lại chỉ để thu cùng handoff.

Exact command groups kế thừa mục Verification của plan sales completion; bổ sung focused file cho range semantics/cross-turn fit/profile-once/select/quote/branch khi implementation đặt tên. Trước chạy phải ghi argv thực; hiện tất cả checks và model mới của kế hoạch này **NOT_RUN**.

## 8. Bộ ca và điều kiện mở run

Giữ nguyên33ca/48lượt đã chạy; không tăng số paraphrase hoặc đổi expected sau outcome. Sáu B controls chủ yếu là offline differential, không tự cộng thêm provider attempts.

Prefix chức năng: p04,p06,p07,p08,p09,s03,s13,s15,s16,j1,j2,j4,j6 = **13ca/24lượt**, N1. Chỉ mở khi prerequisites cần cho từng task đã sẵn sàng và code gate trên đã GREEN; source-gap/fault controls tách đúng trước seal. Prefix phải kiểm nhiệm vụ cuối, không chỉ verdict PASS: lựa chọn không hỏi lại, fit còn căn cứ/current, quote đúng tổng, media đúng yêu cầu, cart/checkout tiếp tục đúng state. Thiếu nguồn thật có thể handoff đúng nhưng không được dùng để chứng minh đường sales đó đã sửa.

Nếu không còn lỗi material trong prefix, chạy **20ca/24lượt còn lại**, không rerun prefix. Supplemental checkout1ca/7lượt đã có trong plan là scope riêng, chạy sau khi witness bridge đủ; tổng tối đa của đợt đăng ký **34ca/55lượt** nếu đủ prerequisites. Không đếm lại prefix, không thêm attempts vì kết quả xấu. Bất kỳ lỗi an toàn/state/effect/PII hoặc capture/accounting invariant thì dừng theo protocol; lỗi output/quality giữ denominator, không tự fix rồi tiếp tục cùng run identity.

Giữ Gemini3.5FlashLite HIGH owner / GPT6.1Sol HIGH verifier hiện hành, cap6primitive/2rounds/3owner/1verifier và1generationHTTP/attempt, retry0. Seal executable/config/inputs sạch, source SHA runtime không ghi ngược vào frozen source. Giữ evaluator-only labels khỏi mọi model request; publish actual terminal transcripts/drafts/usage/latency/HTTP/errors riêng.

Đánh giá theo hoàn thành bán hàng, không theo keyword: khách đã quyết định được gì, việc yêu cầu đã xong chưa, bước tiếp theo có thực thi được và lời tư vấn có hữu ích trong toàn đoạn không. Giọng nhẹ chấp nhận theo owner; không để PASS semantic thay sales quality. Giữ ngưỡng Phase C hiện hành và C3 parity requirement riêng; không tự GO hoặc deploy.

## 9. Bàn giao và rollback

Savepoints I→II→III→IV có implementation evidence và exact test/source identities riêng. Nếu regression, revert riêng thay đổi gây lỗi và giữ source/evidence cũ, không xóa Phase C để lấy lại B. Chưa có independent approval cho kế hoạch này; source/model/API/policy không đổi trong lượt lập kế hoạch. Không live source write, merge, deploy hoặc model dispatch.
