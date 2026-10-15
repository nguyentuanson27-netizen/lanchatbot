# Root cause sau khi chấm toàn bộ24hội thoại

Raw ee519ea37c64fb613dca3ac97f42dc3b33c80f3f → primary57ac945a69350b0559e47b3bba00ea47233d2a17 → chẩn đoán này. Primary giữ nguyên14USABLE/2NEEDS_EDIT/8fallback. Các nháp bên dưới không phải tin khách nhận và không được thay vào điểm fallback. Không generation bổ sung, retry hoặc sửa prompt theo kết quả của batch.

## 8fallback thuộc những phần nào

| Ca | Lý do runtime | Đã tới verifier? | Kết luận có chứng cứ |
| --- | --- | --- | --- |
|1/sân khấu | CONTEXT_BOUND | Không | Internal request vượt32KB trước khi adapter có cơ hội bỏ dữ liệu trùng; sửa dedup ở adapter chưa sửa boundary đứng trước nó. |
|6/SD375 | BUDGET | Không | Đã tìm/đọc đúng ref, có giá; generation3 vẫn gọi tool khi prepared mode=NONE và roundsRemaining=0. |
|8/đã mặc đi làm | PROVIDER_ERROR | Không | Owner generation2 HTTP200, có671thinking tokens nhưng không có OWNER_RESULT hợp lệ; nguyên nhân parse/finish cụ thể đã bị adapter xóa. |
|9/ngoài trời dễ nóng | FAIL | Có | Owner biến chất mềm/thoáng thành đảm bảo ở ngoài trời lâu không bí. Verifier có cơ sở chặn. |
|10/policy ngày12 | PROVIDER_ERROR | Không | Đã đọc đúng policy; generation2 đã dispatch nhưng không có HTTP status/usage/answer. Chưa biết lỗi mạng/transport cụ thể. |
|14/Khánh Trang | FAIL | Có | Tìm tên trả các mẫu khác; owner tự kết luận shop không có. Verifier chặn có cơ sở; source/retrieval cũng có vấn đề. |
|18/policy ngày9 | FAIL | Có | MATERIAL_CONDITION_LOSS; có tranh luận giữa trả thời hạn và cấp quyền đủ điều kiện. Không kết luận chỉ vì thiếu từ trong checklist. |
|21/áo M | BUDGET | Không | Search thừa món đã bound, đọc default cả set, rồi generation3 dùng offer ref như product subjectRef khi NONE. |

Như vậy **5/8fallback phát sinh trước verifier**, gồm3runtime/budget và2adapter/transport;3semantic refusals còn lại gồm2có căn cứ rõ,1ranh giới policy cần phân định. Không có bằng chứng để gọi cả8là verifier quá chặt hoặc thiếu policy.

## 1. Sân khấu: đúng chỗ cần sửa là request assembly/bound

Owner đọc SV2447 rồi tìm “đồ đi tiệc”. Search trả AMBIGUOUS với3mẫu. Hai model continuations chứa1.560 và8.316bytes opaque thoughtSignature; hai tool batches khoảng2.091 và3.873bytes. Đây là metadata native phải giữ, không được cắt thành text hoặc bỏ signature.

Runtime `runCommerceTurn` kiểm `bytes(request)>32768` trên object nội bộ, gồm context và các functionResponse nguồn còn nguyên. Nó trả CONTEXT_BOUND trước khi gọi owner lần3. Dedup mới nằm trong `buildGeminiCommerceRequest`, tức ở bước sau; không thể giúp request đã bị chặn trước đó. Không có request/provider generation3, final draft hoặc verdict để đánh giá. Vì thế không được coi đây là verifier chặn lời khuyên đổi mẫu.

Fix lần này đúng với duplicate wire fields nhưng chưa đủ cho đường guard nội bộ này. Hướng sửa có phạm vi cụ thể: để cùng một bản projection/serialization của request thực tế sở hữu bound đã freeze, giữ native parts và changed evidence; loại kiểm lặp trên representation khác khi không bảo vệ invariant riêng. Giữ32KB, không tăng budget và không rút dữ liệu nguồn bằng semantic summary/parser. Cần regression replay chính chuỗi tool/content này trước provider run mới. Chưa thực hiện sửa tiếp sau batch.

## 6 và21. Ref đã đỡ nhầm nhưng hợp đồng thao tác vẫn còn nhiều ngõ sai

Ca6:

1. Search SD375 MATCHED; read_product dùng đúng `subjectRef=SD375`, đã sửa được lỗi `product:SD375` của run trước.
2. Tool trả COMPOSITE giá1.065.000đ, có hàng, availableOffers=[AO,COMPOSITE]. Không phải thiếu giá.
3. Owner vẫn trả `read_product({subjectRef:'SD375',requestedOfferType:'AO'})`. `requestedOfferType` là field output, không phải input `offerType`; call này chưa được invoke vì đã hết2rounds. Không có giá AO để thay vào câu trả lời.

Ca21:

1. Đã có SV2447 bound nhưng owner search “Áo Thạch Thảo”, nhận3mẫu không trúng.
2. Đọc SV2447 không chọn offer/size, nên có giá/tồn cả set chứ chưa có áo M.
3. Generation3 gọi `read_product({subjectRef:'offer:SV2447:AO'})`; offer identity không phải product subjectRef và còn thiếu sizeM. Runtime chặn BUDGET trước invoke.

Captured prepared generation3 của cả hai là `functionCallingConfig.mode=NONE`, trusted.execution.availableTools=[], roundsRemaining=0. Response thực tế vẫn parse thành TOOLS; runtime giữ fail-closed. Đây là **điểm không tương thích hành vi API/client cần giải quyết**, không thể mặc định NONE đã bảo đảm final text. Gemini không có independent live HTTP body echo; bằng chứng là body chuẩn bị từ cùng builder và parsed provider response, không gán chắc lỗi cho một phía. Không silently đổi config, tăng vòng hoặc retry để cứu attempt.

Hướng xử lý: owner-facing DTO phải phân biệt một productRef dùng gọi tool với các evidence/offer identities và loại field output trông giống tham số nhập. Dùng schema/contract hiện có để biểu đạt lựa chọn bán rõ ngay lúc đọc, giảm nhu cầu đọc default rồi đọc lại; kiểm cách final-only được provider thực hiện bằng adapter tests/official contract trước khi thay config. Không strip prefix, parse tiếng Việt hay thêm câu mẫu riêng SD375/Thạch Thảo. Batch này chưa xác minh hướng sửa đó.

## 8 và10. Không phải verifier hiểu sai câu hỏi

Cả hai đã read_policy OK, nguồn15ngày/30.000đ. Không có final draft nên verifier không chạy.

- Ca8: generation2 có HTTP200, modelVersion đúng, input3.318/output671/thinking671. Sau đó adapter throw, runtime chỉ giữ PROVIDER_ERROR. Các dữ kiện phù hợp với lỗi completion/content hoặc không có phần text hiển thị, nhưng raw candidate/finishReason không được giữ nên **chưa đủ để xác nhận nhánh parse nào**. Không được kết luận model đã trả sai chính sách.
- Ca10: generation2 có providerRequests=1 nhưng HTTP status, modelVersion và token usage đều null; chưa có response được capture. Không phải401/429/5xx hay90s timeout đã quan sát; nguyên nhân transport cụ thể chưa biết.

Adapter catch hiện gom lỗi auth/network/response/model/parse vào cùng mã, làm mất dữ kiện chẩn đoán. Sửa tiếp nên giữ bounded stage/errorCode/finishReason an toàn trong telemetry hiện có, không log credentials/customer-private data hoặc thêm store/gate. Không gọi lại generation hiện tại.74dispatch attempts của batch có73HTTP200/1không capture response; error2/74, timeout0. Token coverage73/74; tổng token là phần đã biết, không phải total đầy đủ của request thiếu response.

## 9. Lợi ích vật liệu bị nâng thành kết quả ở hoàn cảnh cụ thể

Nháp bị chặn:

> Chị yên tâm nha, set này dùng chất tơ Hàn và ren tơ Hàn mềm, thoáng, lại có độ bay tự nhiên nên mặc rất nhẹ nhàng và thoải mái, ở ngoài trời lâu cũng không bị bí đâu ạ.

Nguồn xác nhận mềm/thoáng/thoải mái khi mặc thông thường; không xác nhận khách dễ nóng sẽ không bí khi ở ngoài trời lâu. Lỗi nằm ở lời đảm bảo cuối trong toàn ngữ cảnh, không phải cứ nhắc chất liệu hay tư vấn tự tin là sai. Verdict UNSUPPORTED_PROTECTED_ASSERTION/ref product:SV2447 có cơ sở.

Hướng tiếp: dùng dữ kiện để chọn phương án mặc thực tế cho nhu cầu này, giữ đúng mức nhận xét mà chất liệu hỗ trợ; không thêm giả thuyết kỹ thuật hoặc hứa kết quả cá nhân. Không yêu cầu phép thử cho nhận xét phối đồ thông thường. Hiện prompt đã nói ranh giới này nhưng owner vẫn vượt, nên chỉ lặp thêm lời cấm chưa có bằng chứng giải quyết root cause.

## 14. Tìm tên không trúng và suy sai thành phủ định catalog

Nháp bị chặn:

> Dạ shop không có mẫu set váy Khánh Trang ạ. Chị xem lại giúp em tên mẫu hoặc gửi hình ảnh để em kiểm tra đúng sản phẩm cho mình nha.

Search “Khánh Trang” trả AMBIGUOUS với Ngọc Trâm/Uyển Hoa/SQ675. Không có bằng chứng phủ định toàn catalog, nên câu đầu sai căn cứ dù câu sau xin hình là bước hợp lý. Verifier chặn đúng phần phủ định không có nguồn; không phải chặn hỏi lại ảnh.

Sau primary đã chạy **một phép đọc exact code**, dùng SV1561 có trong lịch sử evidence, không gọi embedding/owner/verifier. Index trả productId=SV1561, title=Set váy Khánh Trang, catalogVersion=catalog-v2: [readback](NAME_SOURCE_DIAGNOSIS.json). Đây là phép đọc chẩn đoán sau run, không bơm mã vào model, không thuộc denominator24 hoặc source counters của batch. Nguồn mutable nên readback chứng minh tồn tại lúc probe, không được viết lại lịch sử query của run.

Root cause có hai tầng: named retrieval không đưa target vào candidates; owner lại coi shortlist không khớp là chứng minh không có. Chỉ sửa prompt không làm named lookup tìm đúng. Cần xem/reuse exact normalized title/alias path trong source adapter và độ phủ/index/filter hiện có trước khi sửa retrieval; không hardcode tên hay thêm semantic router. Trong khi nguồn chưa xác định được, owner chỉ được nói chưa xác định đúng mẫu, không phủ định tồn tại. Hướng này chưa được implement/rerun sau batch.

## 18. Policy: phân định nghĩa của cả câu, không đánh rớt vì thiếu từ

Nháp:

> Dạ bên mình đổi size trong vòng 15 ngày kể từ ngày nhận hàng nên chị vẫn đổi size thoải mái nha chị.

Verdict MATERIAL_CONDITION_LOSS trên policy hiện tại. Nếu hiểu câu là15ngày tự đủ để cho phép mọi tình trạng hàng thì có rủi ro mở rộng điều kiện. Nhưng khách nói chỉ mở xem rồi cất, hỏi còn được đổi ở ngày9; câu cũng có thể là trả lời thời hạn cho trường hợp chưa có dấu hiệu bị loại. Không có rationale clause từ verdict để biết verifier đọc cách nào. **Không gán chắc nguyên nhân cho việc không liệt kê sạch/chưa giặt/không mùi**, cũng không tự coi mọi chữ “thoải mái” là cấp quyền vô điều kiện.

Ca2 cùng run PASS: “Dạ chị vẫn đổi được chị nhé, thời gian đổi bên em áp dụng trong15ngày… Phí đổi…30.000đ… đổi màu được hỗ trợ…”, trong context cầm lên/còn tem/ngày10. Primary đã nhận câu2 là trả thời hạn/phí theo câu hỏi, không phải receipt hoặc waiver. Chênh lệch thông tin tình trạng có thể ảnh hưởng hai verdict, nhưng cặp này cho thấy ranh giới vẫn dễ dao động; chưa đủ evidence N1 để nói tất cả do owner hoặc tất cả do verifier.

Hướng tiếp: review cặp whole turns đối chiếu nguyên policy, xác định đúng lời cấp quyền đang bị hiểu rộng hơn câu hỏi thời hạn ở chỗ nào; chỉ thay protocol/prompt khi đã có kết luận đó. Không thêm danh sách bắt buộc mọi reply, từ cấm, template hoặc chấm lại primary cho đẹp số. Ca18 vẫn tính fallback.

## Hai câu được gửi nhưng cần sửa chất lượng

- **7:** có chọn set799k và lý do, nhưng lời mời “kiểm tra size phù hợp” không thực hiện được trong B1 chỉ có3read-only tools và chưa có chart verified. Giá/source đúng không làm CTA đó dùng được. Câu vẫn chép giọng catalog và nhắc nguyên ngân sách. Cần để câu hỏi tiếp/bước mua bám capabilities thực tế; không buộc mỗi tin kết thúc bằng câu hỏi.
- **15:** có hiểu nỗi lo hơi điệu, có verified availableOffers và không còn fallback do thiếu bằng chứng bán lẻ; nhưng ba đoạn nói đẹp/tinh tế rồi cho cả set/áo/váy mà không chọn cụ thể. Cần một quyết định bán hàng dựa trên mức đơn giản khách muốn; không chỉ thêm từ nối hoặc yêu cầu số câu cố định. Tính từ về phong cách không tự động là protected assertion.

Không phạt ca23 vì có phương án cả bộ799k: câu đã mở đầu chọn áo499k tận dụng váy đen, và upsell trong850k có lý do. Không coi nhắc lại một fact liên quan hoặc có hai lựa chọn là lỗi mặc định.

## Cái gì đã cải thiện, cái gì chưa chứng minh

So với run trước10USABLE/4NEEDS_EDIT/10fallback: hiện14/2/8. Có chuyển biến cụ thể ở11(không suy mất POS thành không bán lẻ),13(bỏ hứa lên đơn),17(đổi lựa chọn theo dịp gặp khách),19(bỏ hỏi lại món),22(tìm/đọc đúng code). Ca2 đã trả thời hạn/phí, ca15được gửi nhưng chất lượng lựa chọn vẫn chưa đạt. Đây là observed changes, không chứng minh riêng sửa nào tạo ra thay đổi trong N1/live sources/aliases.

Ca8từ reply dùng được thành provider failure;21từ reply dùng được thành budget. Ca6ref đầu đã đúng nhưng vẫn không có final;1chuyển từ semantic rejection sang context failure, không phải tiến bộ tư vấn sân khấu. Số verifier FAIL giảm8→3 phần nào do chỉ19finals so với22trước đó; không được đọc thành verifier đã ổn định hơn. Không identified protected eligible violation chắc chắn trong primary16finals; ca7có vấn đề capability, ca2có scope qualification đã ghi. Chưa có owner/human acceptance hay variance evidence.

Thứ tự xử lý tiếp nên là request boundary/native final-only semantics và lỗi adapter có mã nguyên nhân; hợp đồng product/offer call cùng named lookup; rồi đánh giá chất lượng quyết định/giọng với nguồn mô tả ít kiểu catalog. Nguồn XML hiện dài/nhiều tính từ và attributes=null ở SV2447 góp phần làm owner chép văn quảng cáo; cần cải thiện dữ liệu tư vấn được publish qua luồng nguồn hiện có, giữ nguồn gốc, thay vì bổ sung parser hay model tóm tắt runtime thứ ba. Không biến đây thành một bộ prompt riêng cho10case.

**STOP sales/live acceptance.** Kết thúc đúng một batch và báo rõ việc còn lại; không sửa tiếp source sau kết quả rồi gắn evidence cũ cho source mới. Seven-turn stateful provider journey chưa chạy lại, nên projection/measurement regressions deterministic không chứng minh giỏ/checkout/handoff đã hoạt động tốt với provider. Không A2/A3 mới, A PASS, promotion, merge, deploy hoặc live send.
