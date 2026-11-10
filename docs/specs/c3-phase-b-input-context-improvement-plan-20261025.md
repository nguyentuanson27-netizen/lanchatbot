# Phase B — audit đầu vào và kế hoạch cải thiện context

Ngày 2026-10-25. **REVISION 2 / REVISED AFTER INDEPENDENT REVIEW / SELF-REVIEWED; chưa implementation, chưa gọi provider.** HEAD được audit `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`; source run `33d83f685411f44dffd2a0d7c61c92a607c34d62`. Worktree ban đầu có review 51 lượt chưa commit; giữ nguyên evidence run. B chưa GO.

[Review độc lập REVISE](c3-phase-b-input-context-independent-review-20261025.md) đánh giá revision 1 có SHA256 `9783ea783d9e059f74de976348a9c26312dc848836128c503d42443d29d58a40`. Revision 2 xử lý R1–R3 dưới đây; chưa được reviewer độc lập duyệt lại. Phạm vi triển khai gần nhất chỉ P0 → P1 → P2, mỗi phần có savepoint/acceptance riêng. P3/P4 là backlog, không nằm trong lần implementation/run kế tiếp mặc định.

Owner yêu cầu kiểm toàn bộ đầu vào và đề xuất cải thiện. Phạm vi bằng chứng: 103 owner request của 50 lượt model, 45 verifier request, 51 terminal (một lượt checkout riêng do code), captured source, tool consumers và projection. Không audit toàn bộ kho sản phẩm live hoặc khẳng định mọi ảnh thực tế đều đúng metadata. Không thay model/prompt, rubric, nguồn shop hay chạy thêm vòng trong lượt planning này.

Nguồn: [review đủ 51 lượt](../../apps/worker/evals/single-agent-commerce-read-only/recovery-priority-full-20261025/WHOLE_TURN_REVIEW.vi.md), [run](../../apps/worker/evals/single-agent-commerce-read-only/recovery-priority-full-20261025/CHECKPOINT_B.md), [plan đã sửa history/offer trước đây](c3-phase-b-tool-history-fix-plan-20261025.md), [implementation trước](c3-phase-b-tool-history-implementation-20261025.md), [recovery plan](c3-phase-b-recovery-priority-plan-20261025.md).

## 1. Đã đủ đến đâu

Dữ liệu đã đủ cho phần lớn hỏi giá, chọn phần mua, tồn, size theo engine, chính sách, tính tiền và checkout được quan sát. Chưa đủ về tính liên tục và khả năng giúp model chọn hàng: một số nguồn đã có nhưng bị mất/đổi nghĩa khi chiếu; phần mô tả còn nặng lời quảng cáo và thiếu cấu trúc để so sánh; ảnh chưa được model xem trong run này. Không nên tạo thêm một kho “câu tư vấn đúng cho mọi tình huống”.

| Nhóm đầu vào | Hiện có | Thiếu / cần cải thiện |
|---|---|---|
| Tin mới, lịch sử | Tin mới tối đa 2048 bytes; history 8 entries/4096 bytes; có lời khách/shop và memory ảnh accepted | Public summary 499k bị coi ADDRESS và bỏ. Context không luôn khớp những gì khách thực nhận. |
| Hồ sơ khách | Số đo, fitPreference, preferences màu/style/chất liệu, profile revision/fingerprint | Ngân sách, dịp mặc, hạn cần hàng chưa là field bền trong projection này; khi ra khỏi window có nguy cơ mất. Run ngắn chưa chứng minh long-chat ổn định. |
| Product identity, options | PRODUCT refs, tên, availableOffers/offerLabels; đúng scope bộ/áo/váy | Search metadata không tự khiến owner chọn offer; null vẫn bung mọi option và làm hết slots. Không được chọn offer thay khách chỉ để qua cap. |
| Mô tả tư vấn | Content có nguồn; schema thuộc tính đã tồn tại | Trong 45 verifier payload, SV2447 xuất hiện 35 lần: content có 35/35, attributes/presentation/sizeCharts trên runtimeProduct đều 0. Source capture SV2447 cũng attributes=null; có materials REN/TƠ ở catalog nhưng chưa thành verified attributes. Không phải toàn bộ catalog đều trống. |
| Giá/tồn/ETA | Claims theo product/offer/variant, freshness và delivery region; Cần Thơ đã có ETA 4–8 ngày | Dữ liệu tốt vẫn mất tác dụng khi owner lỗi output. Cần recovery có contract và copy đúng trạng thái, không thêm dữ liệu giả. |
| Size | recommend_size đọc chart/nhóm đã được owner duyệt; missingInputs, SIZE_FIT có binding | Không có raw sizeCharts trong runtimeProducts không đồng nghĩa thiếu căn cứ chọn size. Không đổ bảng size thô vào model để nó tự chọn lại. |
| Policy | read_policy/publicPolicyLiteral từ bundle hiện hành, tách đổi/trả/thử | Những ca đã kiểm đủ dữ liệu. Không nhúng policy vào prompt; chưa chứng minh đủ mọi tình huống hậu mãi ngoài corpus. |
| Giỏ, ưu đãi | cartItems, cartQuote, checkoutStatus, receipt của effect hiện tại | Lượt sau quote giữ giảm giá nhưng receipt effect trước không theo sang; history summary cũng mất. Phải tách đọc trạng thái giá hiện tại với làm thêm ưu đãi. |
| Media | Approved assets, type/angle/parts; có select và view; accepted-image memory | FULL_SET bị loại ở descriptionEvidence. Có ảnh không đồng nghĩa metadata đủ; 103/103 owner wires không có inline image, không quan sát view_product_media trong các continuation đã capture. |
| Khả năng thực hiện | availableTools, callableTools, FINAL_REPLY, rounds/calls còn lại, failure reason | Đã nói đủ về final-only; model vẫn vi phạm một lần. Không thể kết luận thiếu câu lệnh “không gọi tool”. Giới hạn subject expansion chưa được xử lý tốt ở đường đọc. |
| Ads/first contact | conversation-entry, bound ad product, openingQuote, accepted media | Các opening observed dùng được. Không coi first contact là lệnh bắt gửi lại intro dài; giữ hành vi hiện tại. |

Owner projection loại một bản content trong tool response khi bản y hệt đã có ở trusted.products. Đây là dedup có kiểm soát; không được kết luận search mất description chỉ vì response còn subjectRef. Đã kiểm request discovery: đủ description của SQ748/V406/SQ629 ở trusted.products.

## 2. Hai chẩn đoán cần làm rõ hơn review trước

### Public history bị loại vì privacy false positive

Câu summary đã được capture và hash đối chiếu chính xác bị `redactAnalyticsMessage` thành `[ADDRESS]`; `isPrivateCommerceText=true`, `commerceHistory=[]`. Request owner lẫn verifier của lượt hỏi lại tổng thực sự thiếu câu đó. Đây là lỗi đầu vào tái hiện được. Lượt trước đã sửa các từ liên quan “đường”; không tiếp tục thêm ngoại lệ cho từng caption/câu giỏ mới.

Tuy nhiên history đầy đủ không tự cấp quyền báo effect: quote 499k hiện tại có căn cứ, còn lời đã làm thao tác cần evidence đúng phạm vi. Phải kiểm cả history, current quote và effect provenance.

### SUBJECT_BOUND không có nghĩa model chọn product không tồn tại

Discovery search trả ba PRODUCT đã bind: SQ748, V406, SQ629. Owner gọi read_product SQ748 và SQ629 đều với offerType=null; hai mẫu đều có AO/QUAN/SET_QUAN. Hợp số subject của hai full reads là 3 parent + 6 offer variants = 9, vượt cap 8. Một read bị SUBJECT_BOUND, SQ629 thành công; tới final-only owner muốn đọc tiếp.

Đây là expansion vượt giới hạn, không phải TOOL_ARGUMENTS_OR_REF. Source code đã có check và regression cấu trúc trước đây; metadata/offerLabels đã tới model nhưng chưa ngăn chọn null. Chưa có exact POS snapshot thất bại để nhận là replay toàn byte; cần giữ phân biệt structural replay và evidence request thực tế. Không dựa vào thứ tự hoàn thành của hai read song song để chọn món được giữ.

## 3. Cần bao nhiêu dữ liệu sản phẩm là đủ

Tái dùng schema `ProductAttributesV1` hiện có và nguồn registry/POS. Với sản phẩm đưa vào tư vấn, bản tối thiểu phục vụ lựa chọn gồm:

- Identity và thành phần bán: sản phẩm nào, cả bộ gồm gì, phần nào mua riêng được.
- Thiết kế quan sát được: form, chiều dài, tay/cổ/eo, vị trí ren/thêu/họa tiết, lớp lót nếu nguồn xác nhận; không ép mọi field phải có.
- Chất liệu theo đúng từng phần, độ co giãn/cách chăm sóc hoặc tính chất sử dụng chỉ khi có thông tin được duyệt.
- Giá/tồn/size/ETA từ adapter hiện tại; ảnh approved theo đúng phần và mục đích xem.

Schema đã có materialComponents, designAttributes, designComplexity, wearProperties và careInstructions. Kiểm registry trước khi thêm field hoặc thêm nguồn. Unknown không đổi thành không có, không tự biến lời quảng cáo trong description thành thuộc tính đã kiểm nghiệm. Nếu tách nội dung văn xuôi cần hiểu nghĩa, dùng quy trình authoring/review dữ liệu nguồn; không thêm model role hoặc parser runtime để sản xuất truth.

Không thêm đáp án “khách ngại ren thì bán áo”, mẫu câu thuyết phục, nhãn hợp từng case hoặc đặc tính chưa có để fit benchmark. Model vẫn chọn cách bán và suy luận thẩm mỹ theo ranh giới owner đã chốt. Không yêu cầu bằng chứng thử nghiệm cho mọi lời nhận xét chủ quan. Đặc tính có thể kiểm chứng như cấu tạo, kỹ thuật thêu, chống nhăn/độ kín cụ thể không được tự tạo.

Riêng nỗi lo nhiều ren, mô tả áo thêu/chân váy ren đã đủ cho một số lời khuyên. Thêm attributes hoặc ảnh chỉ là giả thuyết cải thiện quyết định; không bảo đảm chữa owner chọn yếu. Không lấy data incompleteness làm lời giải thích chung cho mọi câu chưa hay.

## 4. Thứ tự triển khai đề xuất

### P0 — bảo toàn context đã có, trước khi bổ sung data

Files chính: ingress/history, dispatcher/history reader hiện có, effects snapshot/context, shared privacy tests; tránh thêm storage nếu durable records đủ.

1. RED tái hiện đủ chuỗi thêm giỏ → giảm giá → public summary accepted → hỏi lại tổng; assert input cả hai model thiếu summary trên baseline. Kiểm nguồn history/Outbox, không chỉ hàm redactor.
2. **Chọn bounded public event, không khôi phục raw prose qua privacy bypass.** Đường mới chỉ đọc outcome code-owned `RECEIPT_BACKED_CART_SUMMARY` đã accepted/delivered/read từ durable Outbox cùng delivery binding và dữ liệu giỏ gắn với response group. Chứng minh đúng page/conversation/recipient, renderer/version, message hash và cart/version tại thời điểm gửi. Nhãn BOT, hash đơn lẻ hoặc text giống mẫu không đủ. Không dùng draft bị reject hoặc cart mới để dựng lại lời gửi cũ.
3. Event chỉ chứa type `ACCEPTED_PUBLIC_CART_SUMMARY`, event identity, acceptedAt, cartId/cartVersion và các số tiền subtotal/shipping/discount/grandTotal đã chứng minh trong output được gửi; không title/color/size/note hoặc field text tự do, không thông tin người nhận. Đặt trong metadata lịch sử riêng, đánh dấu đây là record những số tiền đã thông báo, **không phải câu khách/shop nguyên văn, current price authority hoặc effect receipt**. Owner và verifier nhận cùng record qua untrusted dialogue context, không nhét vào policyLiterals/effectReceipts/trusted facts. Cần truyền record qua transport của cả hai model thay vì serialize giả thành một shop message.
4. **Current quote và lịch sử có hai nhiệm vụ khác nhau.** cartQuote có cart/version/readback/freshness là căn cứ trả tổng/ưu đãi hiện tại; số tiền trong event cũ chỉ giúp hiểu cuộc trò chuyện. Giữ `effectReceipts` đúng hợp đồng hiện hành, không nạp receipt lịch sử khác revision/hết hạn, không sửa timestamp hoặc kéo dài expiry. Hỗ trợ historical-effect assertion qua contract mới được hoãn; quote đủ căn cứ không cần receipt lịch sử. Nếu owner vẫn báo một thao tác không có receipt hợp lệ, verifier tiếp tục chặn và ghi residual, không đổi nhãn PASS.
5. Không gọi record_negotiation cho câu hỏi đọc tổng. Không dùng regex nhận diện “bao nhiêu”; owner dùng công cụ đọc hiện có, code giữ mutation authorization/idempotency.

**Gate khả thi trước edit:** audit durable records có đủ liên kết renderer/public fields → exact accepted response hay không. Nếu không có, không suy renderer bằng regex; dùng versioned public-outcome payload tối thiểu cùng transaction Outbox hiện có cho những output mới, sau khi kiểm contract lưu trữ hiện có có thể chứa nó. Không migration/backfill ngầm; nếu cần migration thì tách quyết định và ghi phần P0 chưa triển khai. Dữ liệu cũ thiếu provenance không phục hồi bằng đoán. Test end-to-end phải đi qua producer và reader, không seed event vượt bước chứng minh.

**Budget/merge đã chốt (R3):**

- Đọc tối đa 30 Outbox text rows gần nhất đúng scope; chỉ accepted/delivered/read, không pending/failed/unknown. Chỉ tối đa 2 public cart events, tổng JSON UTF-8 tối đa 768 bytes; event đơn vượt cap bị loại toàn bộ.
- History text vẫn tối đa 8 entries/4096 bytes như baseline. Metadata public events + accepted media dùng chung phần tối đa 1024 bytes **nằm trong tổng 4096 bytes**, không thêm vào ngoài cap. Latest customer message giữ bound riêng 2048 bytes. Public events không chiếm vai trò chat hoặc giả shop turn.
- Giữ các text entries đã được baseline lựa chọn, đặc biệt correction mới nhất; metadata chỉ dùng dung lượng còn lại. Không đẩy text ra để thêm event/ảnh. Trong phần metadata, ưu tiên public cart outcome mới nhất rồi media; giữ cap 6 media hiện có, bỏ record metadata cũ trước, không cắt giữa record.
- Dedup theo responseGroupId + sequence + accepted-message hash, có page/conversation/recipient binding; callbacks delivered/read cho cùng output cập nhật trạng thái, không tạo event mới. Nếu exact text cùng identity/hash đã có trong selected history thì không thêm event trùng; không so tương đồng ngôn ngữ. Sắp theo acceptedAt và sequence, tie-break identity ổn định. Event không đầy đủ lịch sử phải ghi `completeHistory=false`.
- Record bị bỏ vì scope/provenance/bound có telemetry count/reason; không lưu thêm PII. Không có chỗ cho event thì giữ current quote, ghi coverage thiếu; không được claim đã phục hồi mọi history trong mọi window.

Acceptance: context giữ public outcome khi đủ provenance/budget; quote trả 499k trong fixture mà không thêm ưu đãi. Kiểm đổi số lượng/size sau giảm, concession thu hồi, cart mới, event cũ hết hạn, revision khác và quote mới thắng giá history; không đưa stale receipt vào gate. Kiểm đủ 8 entries/sát 4096 bytes/nhiều ảnh/duplicate callback/restart/history write lỗi, exact request cả hai model, customer correction không mất. Private checkout/name/phone/address và metadata bị tamper không leak; rerun toàn bộ privacy negatives cũ. Empty historical evidence không tự làm mất quote hợp lệ.

### P1 — metadata và bằng chứng ảnh nhất quán

Files chính: media projection/selector, adapter owner/verifier, delivery/recovery tests. Nguồn ảnh vẫn cùng registry đã có.

1. Lập bảng raw token → canonical meaning từ schema/producer thực tế. FULL_SET/FULL_LOOK giữ nghĩa whole-look; phần áo/váy/quần và detail cần bằng chứng riêng. Không tự suy mọi part từ nhãn whole-look.
2. Owner/verifier nhìn cùng nghĩa metadata đã chuẩn hóa; tránh trả cùng lúc FULL_SET và một kết luận blanket “không biết gì về nội dung”. Tách unknown về bộ phận cụ thể khỏi known về kiểu ảnh/góc ảnh.
3. Kết quả select nói rõ intent được đáp ứng, ảnh thay thế, phần/màu còn unknown. FEEDBACK=false, không tìm được feedback trong scope và hệ thống lỗi là ba tình trạng khác nhau; giữ các fix này đã có.
4. Referent tiếp nối chỉ kế thừa từ customer/ad/selection evidence được phép và còn đúng scope. Không dùng ảnh owner vừa chọn hoặc tên xuất hiện bất kỳ để tự ghi focus. Nếu chưa có chứng cứ, ghi residual thay vì mở parser.

Acceptance: source whole-look không mất nghĩa; không gọi ảnh mẫu là ảnh khách, overview là closeup hoặc khẳng định màu chưa xác nhận. Transcript chọn ảnh/gửi/accepted/xin góc khác giữ đúng identity, không duplicate vô cớ; stale/private/cross-recipient vẫn chặn. Không chấp nhận caption false chỉ vì muốn gửi được ảnh.

### P2 — context giúp tìm/chọn hàng trong ngân sách hiện có

Files chính: read-only tools, native declarations/projection, search consumer, tests bounds/concurrency. Giữ 4 runtime products, 8 subjects, 32 claims, 2 tool rounds/6 calls/3 owner generations.

1. Tái hiện ba candidates và hai null reads từ trace. Ghi slots/facts trước-sau từng read, assert failure không để evidence dở dang. Không tăng cap để cứu fixture.
2. **Chốt call graph:** owner generation 1 gọi search; round 1 trả tối đa 3 candidates cùng canonical offers/labels; owner generation 2 chọn những offer cụ thể cần đọc; round 2 trả facts đúng scope; generation 3 trả final. Trường hợp trace: đọc SET_QUAN của SQ748 và SQ629 cần 3 parent + 2 variants = 5 subjects. Không dựa vào việc nhận lỗi ở round 2 rồi xin model đọc lại, không generation thứ tư.
3. **Đổi contract native `read_product` từ null mở toàn bộ sang scope tường minh.** `selection` bắt buộc là SINGLE (một offerType có trong metadata đúng product), COMPARE (danh sách 2–3 offerTypes khác nhau do owner chọn), hoặc DETAILS_ONLY (content/metadata, không tự cấp giá/tồn/variants). Không optional/null ngầm bung offers. Native schema dùng cấu trúc được client hiện tại hỗ trợ; đối chiếu tài liệu official trước implementation API/schema, chưa claim provider hiểu ổn định chỉ từ unit test. Dùng existing domain resolver theo từng offer, không tự chọn SINGLE hoặc đổi COMPARE thành SINGLE để qua cap. DETAILS_ONLY cho mapping chưa biết sẽ giữ giới hạn rõ, không giả đã có giá. Sửa tool declaration/protocol tests và reference trực tiếp đến contract trong prompt nếu cần; không sửa giọng, ví dụ bán hàng hay policy. Ghi hash prompt/schema mới chính xác nếu đổi reference.
4. **Batch read deterministic và không làm mất phần độc lập hợp lệ:** fetch nguồn mỗi product một lần cho batch, stage kết quả thuần trên snapshot đó, xét từng call theo thứ tự input. Call đủ cap commit toàn bộ evidence của call; call vượt cap reject toàn bộ call, không giữ vài offers; call sau vẫn được xét nếu còn capacity. Không rollback call hợp lệ hoặc xóa evidence trước lượt. Với COMPARE, tất cả offers trong một call là một đơn vị, không truncate. Stage không đọc nguồn A rồi commit bằng nguồn B; final readback vẫn invalidate nếu nguồn đổi. Chỉ phần read-only được stage; state/effects dependencies giữ orchestration hiện tại. Giữ ordering/counters của lỗi source, không retry. Hoàn thành reverse network order phải có context/result giống nhau.
5. Search exact identity và search nhu cầu vẫn dùng công cụ hiện có: productCode giữ exact-match; query trả candidates chưa phải lời khẳng định phù hợp. Trong projection đánh dấu rõ candidate list vs identity đã match, giữ description/offer labels và status nguồn. Không thêm router hoặc đoán loại tìm kiếm bằng regex. Dữ liệu shortlist chưa có giá vẫn nói chưa đọc; vòng này không mở đọc giá mọi candidate trong search hoặc thêm bộ lọc budget/occasion.

**Phần cố ý hoãn ở P2:** enrichment giá shortlist, filter ngân sách/loại trang phục, mở rộng retrieval/ranking. Chúng cần một thay đổi riêng nếu danh sách ứng viên vẫn yếu sau khi đường đọc được sửa. Không mặc định đi làm cấm short; dữ liệu short/long có nguồn phải được giữ để model tự cân nhắc. Nếu metadata chưa đủ hoặc owner chọn sai scope, giữ failure/partial và ghi rõ, không coi schema mới bảo đảm thành công.

Acceptance: structural replay call graph 2 rounds có đủ facts của hai SET_QUAN trong 5 subjects; SINGLE/COMPARE/component/DETAILS_ONLY giữ đúng semantics; null/malformed không tự mở offers. Batch 3+3+3 vẫn chặn đúng, reverse source completion cùng kết quả, rejected call không để facts dở dang. Quan sát provider phải tách code hoàn tất đọc đúng và owner thực sự chọn/tư vấn: nếu owner vẫn gọi tool ở final-only thì giữ residual, không nhận đã chữa bởi preflight. Nếu không có ứng viên phù hợp thật, báo giới hạn; không bịa hàng hoặc tăng budgets. Mọi request/source read mới được accounting; transport bound 8192-byte tool result vẫn giữ.

### P3 — DEFERRED: hoàn thiện mô tả và dùng ảnh đúng lúc

Không triển khai trong vòng P0–P2. Chỉ mở thí nghiệm riêng sau khi có quyết định tiếp theo; không sửa đồng thời giọng prompt và data để không mất khả năng so sánh.

1. Audit mapping source registry → StableProductDocument → RuntimeProductEvidence → owner/verifier. Với attributes=null, xác định registry thiếu hay adapter bỏ mất. Source capture chứng minh null ở SV2447, chưa đủ kết luận toàn bộ registry không có dữ liệu.
2. Reuse schema fields hiện có. Đặc điểm do nguồn xác nhận được giữ với scope từng phần và version. Tạo candidate input từ nguồn thật/reviewed; không publish sửa catalog live trong scope này.
3. Những câu hỏi về vẻ ngoài có thể cần xem ảnh. Tool view_product_media hiện có nhưng run này không dùng. Thiết kế kiểm riêng model nhìn approved image so với chỉ chữ, dùng các case visual đã có; không tự chèn ảnh vào mọi request hoặc tăng tool budget. Không đưa ảnh khách riêng tư vào model. B1 read-only hiện không có media tools: nếu mở capability cho thí nghiệm thì phải đăng ký như treatment riêng, không báo đó là cùng cấu hình B1 baseline.
4. Giữ owner là người tư vấn duy nhất; verifier không retrieval hay judge bán hàng. Visual input chỉ cho lời nhận xét nhìn thấy/cách phối, không sinh claim kiểm nghiệm, chất liệu/độ kín theo ánh đèn hoặc tuổi thọ sản phẩm. Không nâng suy đoán visual thành trusted fact.
5. Tối ưu projection theo “giữ đủ nghĩa, loại trùng” đã có. Không đặt mục tiêu rút prompt/context theo %; một phần thiếu phải được đo tại consumer trước khi thêm data.

Acceptance: mọi field mới có source; owner/verifier không mâu thuẫn; exact request có ảnh khi view thành công, metadata/hash đúng; thiếu ảnh vẫn trả được giá/size độc lập. Chấm toàn reply có giúp quyết định mua không, không đếm từ/câu hay ép một đáp án. Nếu không cải thiện trên dữ liệu đủ, ghi lỗi lựa chọn của owner, không tiếp tục phình context.

### P4 — DEFERRED: context dài hơn và recovery

Hai nhánh cần thiết kế và quyết định riêng; không nằm trong P0–P2:

- **Customer constraints ngoài window:** ngân sách/dịp mặc/hạn cần hàng có thể mất sau 8 messages. Trước hết kiểm các state fields và nguồn hiện hữu; chỉ mở tối thiểu field cần có với evidence của customer turn, revision và cơ chế sửa/xóa. Owner trích thông tin trong luồng sẵn có; code kiểm source/type/version. Không model summarizer thứ ba hoặc summary văn xuôi được coi là truth. Đây là risk từ cấu trúc, chưa là failure được quan sát trong run ngắn.
- **Quote/ETA recovery:** ETA 4–8 ngày đã có, generation lại lỗi. Nếu dùng public fact recovery, chốt enum dữ kiện/format/binding và final freshness/recipient/permission gate; không parse rejected prose để dựng đáp án. Handoff còn lại giữ reason và công việc đã commit, copy không báo thiếu nguồn khi chỉ output lỗi. Không mở generic protected-reply builder trong cùng diff history.

## 5. Kiểm trước model và cách đánh giá tiếp theo

Tạo inventory machine-readable cho baseline request: source field → normalized field → owner/verifier consumer → field bị loại và lý do; chỉ lưu hash/count/ref cần thiết, không copy secrets/PII hay evaluator labels sang runtime. Nguồn truth và evaluator projection tiếp tục tách.

Không thêm hàng chục ca provider theo từng lỗi nhỏ. Dùng deterministic tests cho:

1. Accepted public recovery/history và private checkout; quote/receipt/correction/expiry/cross-conversation.
2. Source attrs/unknown/scope không đổi nghĩa qua projection; dedup không làm mất data.
3. Media whole-look/parts/detail/feedback/color; accepted vs pending/failed và đúng request tiếp nối.
4. Discovery parent/offer caps, compare vs single option, batch completion order, không facts dở dang.
5. Existing protected claims/final gate, state/effects, size sharing đã duyệt, policy, opening quote, handoff.

Focused commands khi implementation chạm phần tương ứng: worker vitest read-only tools/context/session/ingress/media/state/effects/delivery; Node gemini-inference/protocol tests; shared database redaction/history và contracts/business-tools khi thay; worker typecheck/build/lint, shared checks liên quan. Ghi lệnh thực chạy; planning này không claim đã PASS lại các suite.

Nếu owner yêu cầu provider sau sửa: freeze cùng model/config/rubric, đăng ký rõ schema/tool contract P2 mới và hash của mọi reference sửa theo contract; registration/source commit sạch, giữ 51 native + 17 controls N1/retry0 như baseline. Nhóm negotiation (đủ setup), media, discovery chạy trước trong cùng denominator; không chạy prefix rồi full trùng case. Không đổi source giữa run. Một request generation tối đa một lần; mọi lỗi ở denominator. **Safety/privacy/authority breach: dừng dispatch mới ngay, giữ evidence/NOT_RUN; không fix tại chỗ rồi nối cùng identity.** Chất lượng/provider error thông thường tiếp tục coverage đã đăng ký nếu không có breach; không rerun để đổi kết quả. Visual comparison hoãn, nếu mở sau phải có registration/denominator riêng.

Báo ba kết quả riêng: (a) request có đủ bằng chứng hay không; (b) tác vụ/terminal thực tế có đáp ứng không; (c) lời tư vấn có giúp chọn mua không. Handoff không thế chỗ câu trả lời đủ; eligible không đồng nghĩa bán hàng đạt. Độ ổn định không được kết luận từ N1.

## 6. Khác lần sửa trước ở đâu

- Trước đã thêm offerLabels và dặn đọc đúng offer, owner vẫn null. Lần này kiểm semantics của search, preflight expansion và batch deterministic; không thêm câu nhắc y hệt vào prompt.
- Trước sửa redaction theo một nhóm ngôn ngữ, public summary khác vẫn mất. Lần này ưu tiên provenance của public code outcome và consumer history, bảo vệ private checkout bằng field/scope, không whitelist cả role hoặc câu benchmark.
- Trước nói thiếu metadata ảnh; lần này truy raw token và projection, chốt nghĩa trước khi bổ sung ảnh.
- Trước thêm chỉ dẫn “chọn một phương án”; lần này đo data và thử visual/context riêng. Vẫn công nhận có ca data đủ nhưng quyết định owner yếu.
- Không tạo dữ liệu vô hạn cho từng hoàn cảnh khách. Cải thiện registry hiện có, binding và context; phần cảm nhận/thuyết phục vẫn do owner.

## 7. Đối chiếu review và self-review revision 2

- R1: chốt SINGLE/COMPARE/DETAILS_ONLY ở native read contract và call graph trước khi hết round 2; batch stage cùng snapshot, giữ từng call nguyên vẹn theo input order. Không coi structured error là giải pháp hoàn tất tư vấn.
- R2: P0 chọn bounded numeric public-history event từ accepted code outcome có provenance; current quote riêng, receipt gate không đổi; historical-effect authority deferred. Không miễn privacy cho role BOT, không phục hồi arbitrary raw text.
- R3: chốt 30 source rows, 2 cart events/768 bytes, metadata chung1024 trong tổng4096, giữ8text entries và correction, dedup identity/hash, overflow telemetry. Event riêng khỏi dialogue role; cả owner/verifier nhận cùng bounded record.
- Scope: P0/P1/P2 có savepoint và tests riêng; P3 vision/attrs, P4 long context/recovery cùng search enrichment đều deferred. Không mở migration, source publish, deploy hoặc provider run qua việc duyệt planning.
- Self-review: event ghi historical communicated numbers không phải effect/fact hiện tại; current quote đủ vẫn dùng khi event bị bỏ vì bound; receipt cũ không làm gate stale. P2 không chọn offer thay model, COMPARE không bị truncate, null bị reject; failure còn lại được báo đúng. Native contract mới là thay đổi thật phải freeze, không quảng cáo là so sánh cùng input hoàn toàn.
- Verification lượt sửa kế hoạch: đọc plan/review/code hiện có và diff check; chưa chạy suite/build hoặc model. Revision 2 đã self-review, **chưa có independent APPROVE cho bản sửa này**.
