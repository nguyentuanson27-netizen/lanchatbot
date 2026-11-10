# Chẩn đoán sau primary review — 24 ca B1

Primary commit616be825 đã chấm toàn bộ kết quả khách nhận trước khi đọc các nháp/verdict dưới đây. Các đoạn này không thay thế fallback để tính chất lượng. Đây là phân tích từ raw đã lưu, không có generation sửa hoặc retry.

## 10 fallback thực tế

### 1. b1-changed-occasion

Khách: Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Áo set Thạch Thảo làm từ tơ Hàn thêu mềm mại và thoáng, nhưng dữ liệu bên em chưa ghi nhận chi tiết về lớp lót chống thấu dưới ánh đèn sân khấu mạnh.
>
> Để yên tâm hơn khi lên đèn rọi, chị có thể chuyển sang Váy Diệp An có thiết kế 2 lớp kín đáo và đứng form nhé ạ.

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:V168"}]}`.

Có cơ sở chặn lời hứa ngầm về độ kín dưới đèn sân khấu. Nguồn V168 nói thiết kế hai lớp, kín đáo khi mặc thông thường; chưa mô tả hiệu quả dưới đèn rọi mạnh. Owner biến thông tin đó thành cách để yên tâm hơn ở đúng hoàn cảnh chưa được xác nhận. Nguồn có giá trị cho tư vấn chung nhưng chưa đủ cho chính kết quả đang hứa; không quy lỗi cho việc chọn mẫu thay nói chung.

### 2. b1-current-policy

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Vẫn kịp chị nhé! Shop hỗ trợ đổi hàng trong vòng 15 ngày kể từ khi nhận, nên đơn nhận 10 hôm của chị vẫn trong thời gian đổi ạ. Đồ còn nguyên tem mác và chưa qua sử dụng thì mình hoàn toàn có thể đổi sang màu khác. Phí đổi hai chiều là 30.000đ chị nha.

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86"}]}`.

Đúng 15 ngày và 30.000đ, không dùng mốc bảy ngày cũ. Tuy vậy cả đoạn đi từ còn trong hạn sang nguyên tem/chưa dùng thì hoàn toàn có thể đổi màu, trong khi read_policy chỉ trả SHOP_RULES và orderEligibility=null. Không phải bắt thiếu vài từ chưa giặt/sạch; vấn đề là các điều được kể đang bị dùng như điều kiện đủ cho chính đơn. Verifier chỉ trả MATERIAL_CONDITION_LOSS, không có rationale để chỉ chắc một điều kiện cụ thể.

### 6. b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: **FALLBACK/BUDGET** — Phần này em chưa trả lời được, chị nhé.

Không có final draft; generation cuối vẫn trả tool call đã vượt budget.

search_products tìm MATCHED đúng SD375, nhưng owner generation2 truyền product:SD375 (evidence ref) thay vì subjectRef SD375, nên tool trả TOOL_ARGUMENTS_OR_REF. Generation3 sửa được ref nhưng vẫn trả tool call khi hai rounds đã hết (prepared mode NONE); runtime chặn BUDGET trước invoke. Không có final draft nên không có verifier. Không tăng budget hay tự strip prefix để che sai hợp đồng ref.

### 9. b1-changed-occasion-v2

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Chị yên tâm nha, bộ này làm từ tơ Hàn thêu và ren tơ Hàn nên chất vải mềm, thoáng và có độ bay tự nhiên, mang lại cảm giác thoải mái khi mặc. Đi tiệc sân vườn ngoài trời, thiết kế nhẹ nhàng này giúp chị vẫn thoải mái, không bị bí nóng đâu ạ.

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}`.

Có cơ sở chặn đoạn cuối không bị bí nóng khi khách ở ngoài trời lâu và dễ nóng. Nguồn có mềm/thoáng/thoải mái thông thường; không xác lập không bí nóng trong tình huống riêng. Owner đã trả lời vượt phạm vi chứ không phải verifier chặn mọi lời tư vấn từ chất liệu.

### 10. b1-current-policy-v2

Khách: Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Đơn nhận 12 ngày thì vẫn kịp chị nhé, shop hỗ trợ đổi trong vòng 15 ngày đầu ạ, miễn là sản phẩm còn nguyên tem mác và chưa qua sử dụng. Tổng phí ship đổi 2 chiều hiện tại là 30.000đ chị nha.

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86"}]}`.

Mốc 12/15 ngày và phí hai chiều đều đúng. Cụm miễn là còn nguyên tem và chưa dùng biến một phần điều kiện thành lời cho phép đổi của đơn hiện tại; dữ liệu không có kết quả duyệt đơn. Cần phân biệt trả câu hỏi còn kịp về thời hạn với duyệt mọi điều kiện. Không sửa bằng cách bắt cả reply đọc đủ một checklist.

### 11. b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Chân váy Thạch Thảo được làm từ chất liệu ren tơ Hàn mềm mại, mang lại hiệu ứng bay bổng và nữ tính. Váy có form nhẹ nhàng với độ rũ tự nhiên, giúp tôn dáng và tạo chuyển động uyển chuyển khi di chuyển.
>
> Tuy nhiên, mẫu này shop bán nguyên set gồm cả áo và chân váy chứ không tách rời bán riêng chân váy chị nha.

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}`.

POS_UNAVAILABLE khiến read_product không có giá/tồn và availableOffers=[]; đây không chứng minh chỉ bán cả set. Owner còn search lại tên đã biết, nhận ba mẫu khác, rồi tự khẳng định không tách váy. Verifier có cơ sở chặn khẳng định phủ định không có nguồn. Lỗi dữ liệu đọc được/không đọc được bị trộn với khả năng bán; mô tả chất liệu đúng bị mất theo cả draft.

### 14. b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Dạ shop không có mẫu set váy Khánh Trang ạ. Bên em có Váy Ngọc Trâm thiết kế yếm ren hoa kèm khăn choàng rất thanh lịch (699.000đ) hoặc các mẫu set quần, chị xem qua có ưng ý không nhé ạ?

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":null}]}`.

Tìm theo Khánh Trang trả AMBIGUOUS với Ngọc Trâm/Uyển Hoa/SQ675, không có target. Owner đọc giá Ngọc Trâm rồi nói shop không có Khánh Trang. Một shortlist không trúng không chứng minh hàng không tồn tại. Chặn có cơ sở; chưa đủ evidence phân biệt target thiếu index với lỗi tên/embedding/ranking, nên không kết luận catalog không có sản phẩm.

### 15. b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Set Thạch Thảo kết hợp áo tơ thêu nổi và chân váy ren mềm, nên đúng là sẽ điệu và nữ tính hơn phong cách đồ trơn tối giản thường ngày của chị.
>
> Tuy nhiên, form dáng set này nhẹ nhàng, rũ tự nhiên và bay bổng chứ không bị phồng xòe cầu kỳ, mặc đi ăn cưới ban ngày rất sang, thanh lịch và lịch sự.
>
> Nếu chị ngại diện cả set sẽ hơi khác sở thích, chị có thể cân nhắc mua riêng chiếc áo thêu để kết hợp cùng chân váy hoặc quần trơn sẵn có ở nhà, vừa giữ được nét quen thuộc vừa gọn gàng, tinh tế. Chị thấy phương án này thế nào ạ?

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"offer:SV2447:SET_VAY"}]}`.

Có lỗ hổng context tái hiện được: tool trả availableOffers=[SET_VAY,AO,CV] cho owner, nhưng snapshot verifier chỉ có offer:SV2447:SET_VAY, PRICE/STOCK và content; không có availableOffers/AO. Vì thế đề nghị mua riêng áo có nguồn với owner nhưng verifier thiếu chính căn cứ đó. Draft còn nói không phồng xòe khi mô tả chỉ có nhẹ/rũ; verdict UNSUPPORTED_PROTECTED_ASSERTION với ref SET_VAY không có rationale để tách chắc hai nguyên nhân. Chưa thể gọi toàn bộ ca là verifier false positive, cũng không được gọi owner bịa khả năng bán lẻ.

### 18. b1-current-policy-v3

Khách: Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

Terminal: **FALLBACK/FAIL** — Phần này em chưa trả lời được, chị nhé.

Nháp bị chặn, không gửi khách:

> Dạ, bên mình hiện áp dụng chính sách đổi hàng trong vòng 15 ngày kể từ ngày nhận chị nhé. Chị nhận hàng được 9 ngày và sản phẩm còn nguyên vẹn, chưa qua sử dụng thì vẫn được hỗ trợ đổi size bình thường ạ.
>
> Chị muốn đổi sang size nào để em kiểm tra giúp mình nhé?

Verdict gốc: `{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86"}]}`.

Owner đọc đúng policy mới nhưng chuyển còn trong hạn và nguyên vẹn/chưa dùng thành đổi size bình thường; chưa có orderEligibility. Tin khách chỉ nói mở ra xem rồi cất, không phải hồ sơ duyệt đơn. Câu hỏi size cần đổi còn đòi kiểm tồn cho một đơn không có product binding trong input. Verifier chặn quyền đổi, không phải chặn việc sửa mốc bảy ngày.

### 22. b1-search-read-v3

Khách: Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

Terminal: **FALLBACK/BUDGET** — Phần này em chưa trả lời được, chị nhé.

Không có final draft; generation cuối vẫn trả tool call đã vượt budget.

Giống ca6: MATCHED đúng SQ223, sau đó truyền product:SQ223 và bị reject. Đến generation3 dùng đúng SQ223 thì đã hết tool round; runtime BUDGET, không có final draft/verifier. Đây là lỗi interface/ref và chọn hành động, không phải tìm không ra mã hoặc verifier không hiểu câu.

## Bốn câu đủ điều kiện gửi nhưng cần sửa

- **7/b1-buying-concern:** Có lựa chọn và giá đúng ngân sách nhưng cả đoạn dùng nhiều lời khen chung, chưa giúp khách hình dung vì sao phần ren không rườm rà. Câu mời tư vấn size còn vượt capability đọc nguồn của runner này; không đánh lỗi chỉ vì bot tư vấn tự tin.
- **13/b1-component-stock-v2:** Phần chân váy riêng 449.000đ và tồn M có nguồn, nhưng câu mời lên đơn tạo bước tiếp theo bot không làm được ở B1 read-only. Đây là lời mời thao tác tương lai, không phải báo đã tạo đơn hay một semantic false PASS về effect hoàn tất.
- **17/b1-changed-occasion-v3:** Có chọn cả bộ nhưng lý do vẫn là sang trọng, hài hòa và hợp tiệc tối, chưa giải quyết ưu tiên nhìn gọn hơn sau khi khách đổi sang gặp khách hàng. Không bắt buộc phải chọn áo; điều thiếu là lý do thuyết phục cho lựa chọn ở hoàn cảnh mới.
- **19/b1-partial-source-v3:** Có trả đúng chất liệu và chưa có giá/tồn, nhưng kết bằng câu hỏi chị quan tâm mẫu này khi khách đang hỏi chính mẫu đó, rồi chuyển sang mẫu tương tự chưa được yêu cầu. Cả đoạn dài và bước tiếp không ăn khớp, không phải lỗi chỉ vì liệt kê hai chất liệu khách đã hỏi.

## Hướng xử lý tiếp theo, chưa triển khai trong batch này

1. **Sửa hợp đồng ref ở surface model thấy.** search_products đang đưa cả subjects.ref và products.ref/subjectRef với hai nghĩa khác nhau. Chỉ dẫn follow-up nên đưa một canonical subjectRef dùng được cho read_product; evidence ref tiếp tục ở trusted verifier. Kiểm captured owner request và hành trình search→read bằng ref code cấp. Không strip prefix bằng regex, không nới số round hoặc lén gọi lại.
2. **Giữ cùng căn cứ bán lẻ cho owner và verifier.** Dùng lại runtimeProducts/presentation/trusted snapshot để mang availableOffers đã xác minh và readback cùng nguồn, không thêm model role hay bộ luật ngôn ngữ. Khi POS unavailable phải phân biệt chưa biết khả năng tách bán với đã xác nhận không tách; không dùng [] như chứng cứ phủ định. Giá/tồn vẫn đúng offer và size.
3. **Trả đúng loại câu hỏi policy.** Còn kịp bao lâu/phí bao nhiêu dùng được SHOP_RULES hiện tại; đó không phải kết quả duyệt đơn. Owner không kết luận đủ điều kiện từ hai tình trạng hàng đã kể. Đơn cần xét thực tế phải qua nguồn/port có thẩm quyền, còn B1 chỉ giải thích quy định và hỏi đúng phần còn quyết định. Giữ các từ chối đúng khi khách đã mặc/giặt/cắt tem; không thêm câu mẫu cho từng case hoặc ép lặp checklist.
4. **Sửa quyết định tư vấn, không bắt verifier chấm giọng.** Ca17 phải giải thích lựa chọn nào làm tổng thể gọn hơn ở buổi gặp khách; cả bộ vẫn được phép nếu có lý do phù hợp. Ca7 cần ít lời quảng cáo hơn và không mời chọn size khi không có capability. Ca19 trả phần biết được rồi dừng hoặc đề nghị bước có ích, không hỏi lại điều hiển nhiên. Ca23 là upsell có lý do và trong ngân sách, nên giữ khả năng đó. Không cấm một cụm từ để fit corpus.
5. **Bổ sung đúng dữ liệu cho đúng câu hỏi.** Thiết kế hai lớp và mô tả thoáng hỗ trợ tư vấn chung, chưa tự là kết quả dưới spotlight hoặc không nóng ngoài trời lâu. Muốn hứa các kết quả này cần dữ liệu shop xác nhận tương ứng; nếu chưa có, chọn hướng tư vấn không giả định kết quả. Tìm tên AMBIGUOUS cần làm rõ target bằng nguồn/khách, không kết luận shop không có. Chưa có bằng chứng đủ để đổ lỗi riêng cho index hay model.

Chỉ bắt đầu sửa sau khi owner chọn tiếp hướng công việc; batch hiện tại dừng sau báo cáo. Không thêm gate, role, state store, parser, template/regex hoặc repair/reverify loop.
