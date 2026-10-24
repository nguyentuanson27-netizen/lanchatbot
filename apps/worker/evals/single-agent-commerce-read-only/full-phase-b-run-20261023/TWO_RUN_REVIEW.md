# Review toàn bộ hội thoại của hai lượt native gần nhất

Ngày review: 2026-10-23. Head được review: `b0431ab9f7529ba4f46853aa67d5bdf57fe6af43`.

Đã đọc lịch sử, tin khách, actual terminal của cả hai lượt; đối chiếu draft chưa gửi, tool responses, verdict và source/prompt hiện hành cho các finding. Đây là review của agent chính, không phải review độc lập hoặc chấm mù. Không chạy model mới, đổi nhãn raw hay sửa runtime trong lần review này.

## Phạm vi và cách đọc kết quả

- Lượt trước: [media continuation](../media-continuation-run-20261023/CONVERSATIONS.md), 7 lượt thuộc 5 hành trình, source `4564b7fb5016cd636533697227ae9700d8a66591`.
- Lượt sau: [full Phase B](CONVERSATIONS.md), 39 lượt core + 7 lượt media, source `e1a81192c9b4f5894c5d6aff6098df7d856fa381`.
- Tổng đã review: **53 lượt**, không phải 53 tình huống độc lập. Chỉ 7 lượt media có cặp đối chiếu trực tiếp giữa hai campaign. Không dùng 7 lượt cũ làm baseline cho toàn bộ 39 lượt core mới.
- Bộ 17 verifier controls xen giữa là chẩn đoán, không phải hội thoại bán hàng. Candidate verifier đã thất bại controls và được rollback; không diễn giải lượt full mới là đã giải quyết controls đó.
- Owner Gemini 3.5 Flash Lite HIGH, verifier GPT-6.1 Sol HIGH; owner prompt `27aaf35d…`, verifier baseline `0b240599…`. Source/code/thời điểm khác nhau; mỗi ca N1, không phải thử nghiệm nhân quả hoặc bằng chứng ổn định.
- B1 là seam kiểm eligibility cô lập. Các journey khác dùng PostgreSQL cô lập và capture transport. Không tin nào trong đây được gửi khách thật. Không tạo đơn POS thật.
- Đánh giá toàn lượt: khách có nhận đúng điều cần để chọn/mua/làm bước tiếp theo không? Không cộng điểm theo từ khóa, không bắt mọi reply có CTA, không coi mọi lời khen hoặc so sánh cảm giác là công năng cần kiểm nghiệm. Handoff hợp lệ vẫn không phải bot đã tự giải quyết nhu cầu.

## Kết luận

**Giao dịch và tiếp nối tác vụ có tiến triển cụ thể; tư vấn để bán hàng chưa cải thiện ổn định.** Bot làm khá tốt những việc có đáp án và kết quả code rõ: báo giá, tồn, chính sách, sửa giỏ, tổng tiền, checkout, chuyển người. Khi phải chọn và thuyết phục, bot vẫn thường dùng mô tả chất liệu thay cho lý do mua, thêm nhánh không cần thiết, hoặc chỉ cảnh báo rồi giao việc quyết định lại cho khách.

Không thể quy mọi ca chưa đạt cho verifier. Có ít nhất bốn vấn đề khác nhau: chất lượng quyết định của owner; ranh giới diễn giải kết quả tìm ảnh âm tính; code chọn fallback/output; và dữ liệu size thiếu chart. Chữa tất cả bằng một lần sửa prompt sẽ lặp cách sửa cũ.

| Kết quả runtime | Media trước, 7 lượt | Full sau, 46 lượt |
|---|---:|---:|
| SEND_ELIGIBLE | 3 | 36 |
| FALLBACK | 3 | 4 |
| HANDOFF | 0 | 4 |
| NO_SEND ở model | 1 | 2 |
| Khách thực sự không có reply trong capture | 1 | **0** |

Hai NO_SEND lượt sau là checkout do code trả lời, không phải im lặng. Trong 36 eligible mới, review có **28 dùng được và 8 cần sửa chất lượng**. Bốn handoff và hai code checkout đánh giá riêng; không gọi chúng là sáu ca tư vấn thành công. Nhãn “dùng được” chấp nhận polish nhỏ, không có nghĩa lời tư vấn đã hay hoặc tăng chuyển đổi.

## Bảy ca có thể đối chiếu trực tiếp

| Ca | Lượt trước → lượt sau | Nhận xét toàn hội thoại |
|---|---|---|
| Hỏi feedback, nhánh tổng thể | Fallback → fallback | Vẫn không trả trực tiếp việc có ảnh khách mặc để gửi hay không. Câu fallback hỏi tổng thể/cận khiến khách phải tự chuyển loại ảnh. Draft cũ còn giới thiệu chất ren trong khi metadata ảnh chọn chỉ xác nhận AO/UNKNOWN; không nên duyệt toàn draft cũ chỉ vì nghi verifier quá tay. |
| Xin ảnh cả bộ sau fallback | Eligible → eligible | Cả hai gửi được 2 ảnh FRONT/BACK, đúng sản phẩm, dùng lịch sử terminal thực. Hoàn thành yêu cầu; không cần ép thêm quảng cáo. |
| Hỏi feedback, nhánh chi tiết | Fallback → fallback | Draft hợp lý về hướng bán hàng nhưng vẫn vướng cách báo thiếu ảnh. Kết quả không cải thiện. |
| Xin cận phần thêu sau fallback | Eligible → eligible | Cả hai gửi đúng DETAIL/AO. Lời dẫn ngắn và vừa đủ; đây là phần giọng tự nhiên hơn các đoạn tư vấn dài. |
| Xin feedback + hỏi giá áo | Eligible → fallback | Cũ giữ giá 499k và gọi đúng ảnh mẫu. Mới cũng có giá đúng, thêm câu shop chưa có feedback nên bị FAIL; actual mất cả giá và ảnh đã chọn. Lỗi tăng lên ở xử lý yêu cầu hỗn hợp, không phải POS báo giá sai. |
| Xin cận áo + tư vấn size | Fallback → handoff | Cũ tool không có chart nhưng owner vẫn nói vừa vặn/thoải mái; chặn là đúng. Mới code kết thúc bằng handoff có căn cứ, không sinh lời khẳng định fit. Tốt hơn về xử lý, nhưng chưa tự chọn size và chưa gửi phần ảnh khách đã xin. |
| Sợ nhiều ren, mặc cưới ban trưa | Im lặng do EGRESS_WORLD_CHANGED → eligible | Mới chọn áo lẻ 499k, gửi ảnh cận áo, có hướng mua rõ. Cũ đưa áo/cả bộ rồi không gửi được. Đây là tiến bộ quan sát được ở chính ca này; chưa chứng minh ảnh/code khiến tư vấn tốt hơn hay nguyên nhân egress cũ đã được sửa. |

Như vậy, tổng eligible media vẫn 3/7 nhưng có hai cải thiện và một thoái lui. Không thể chỉ nhìn tổng để nói đã ổn hoặc không có tiến triển.

## Finding về bán hàng và giọng văn

### 1. Đúng dữ kiện chưa thành lý do khách nên mua

Ở `b1-buying-concern`, khách sợ nhiều ren. Bot mở bằng ngân sách rồi gom “form nhẹ nhàng, bay bổng”, “thanh thoát”, “nhã nhặn”, “không nặng nề”. Đó là lời trấn an và mô tả; chưa làm rõ shop chọn mặc cả bộ hay tiết chế phần ren thế nào để hợp gu khách.

Ở `b1-buying-concern-v3`, khách đã có chân váy đen và muốn mặc lại nhiều lần. Khuyên mua cả bộ có thể hợp lý vì thêm được chân váy ren; không bắt buộc chọn rẻ nhất. Nhưng reply dựa nhiều vào “linh hoạt”, “tối ưu hơn rất nhiều”, “biến hóa”, “không nhàm chán”. Giá áo 499k và set 799k đã có: cần giúp khách hiểu phần **300k mua thêm** có đáng với cách dùng này hay không, thay vì lấy việc đủ ngân sách làm lý do chính.

Ca media concern mới tốt hơn vì lựa chọn áo lẻ trực tiếp giảm phần ren mà khách lo. Vẫn còn lời khen dày và “sẵn có ở nhà” tự ngầm gán tủ đồ cho khách chưa nói; nên trình bày phối đồ như đề xuất, không như thông tin đã biết về khách. Không vì thế phủ nhận hướng bán áo lẻ là hợp lý.

### 2. Đã hiểu hoàn cảnh mới nhưng chưa xử lý đến quyết định

- `b1-changed-occasion-v2`: khách chuyển sang tiệc sân vườn, dễ nóng. Bot nhận ra chuyện đó nhưng dừng ở “có thể hơi oi”. Khách vẫn chưa biết nên mua món này, thay món hay chọn cách phối nào. Đây là thiếu giá trị tư vấn, không tự động là sai safety.
- `b1-changed-occasion-v3`: đã chọn áo lẻ cho buổi sáng gặp khách, sau đó lại bán cả bộ cho buổi tối mà khách vừa đổi lịch. Nhánh thêm không xuất phát từ nhu cầu mới. Vấn đề là không giữ trọng tâm, không phải cứ hai phương án là sai.
- `b1-changed-occasion` có tiến triển tốt hơn: chọn Diệp An thay thế và có giá. Mô tả chất liệu/thiết kế là căn cứ cho so sánh định tính, không được tự biến lời khuyên đó thành bảo đảm chống nhăn qua 3 giờ ngồi xe. Không quan sát ảnh bằng pixel trong review này.

### 3. Giọng cứng xuất hiện khi model giải thích cách nó làm việc

- Hai ca partial-source: “thông tin hệ thống chưa cập nhật”, “hệ thống chưa có thông tin về việc tách bán lẻ”. Tool chưa trả được dữ liệu không chứng minh nguyên nhân là chưa cập nhật hay shop không bán lẻ. Khách cần phần đã biết và phần chưa báo được, không cần nghe lý do nội bộ tự suy ra.
- Gallery: “hình ảnh xác thực riêng cho màu be”, kèm hai `[asset:…]`. Khách cần biết đây là ảnh chung, chưa xác nhận màu be; không cần thuật ngữ xác thực hoặc mã asset.
- Deadline: “Do hệ thống không có mốc tính giờ cụ thể… chị cân nhắc thời gian giúp em”. Có processing time trong request; thứ chưa đủ là căn cứ gắn ETA vào hạn nhận, không phải chatbot không có đồng hồ. Đúng ETA 4–8 ngày vẫn chưa thành lời shop trả lời việc có nhận hẹn sáng thứ Sáu được không. Không được tự hứa kịp hoặc chắc chắn trễ khi thiếu mốc nguồn.
- Correction: không còn đọc lại cả eo/mông, tốt hơn. “Em đã ghi nhận số đo mới… giỏ hàng vẫn giữ nguyên…” vẫn thiên về báo cáo thao tác; nội dung dùng được nhưng chưa phải giọng chat tốt.
- Quote/negotiation: tổng đúng; còn format `978,100đ`, gọi ưu đãi tự động là “mã giảm”, câu “chốt đơn giúp em” và ngoặc nhắc lại phép tính khi khách chỉ hỏi tổng. Đây là polish cụ thể, không phải lỗi arithmetic hay cần một template chốt đơn mới.

Không lấy một chữ “nếu”, “thì”, “em gợi ý”, một câu dài hay việc nhắc lại fact làm lỗi mặc định. Lỗi là thêm ý không giúp quyết định, dùng giọng báo cáo nội bộ hoặc kéo khách trở lại phân vân đã giải quyết.

### 4. Ảnh đã gửi được, chưa chứng minh đã được dùng để tư vấn bằng quan sát

Các lượt xin ảnh cả bộ và cận áo đều dùng đúng metadata và capture attachment. Ca concern mới gắn ảnh cận áo với món đang khuyên mua, có ích hơn việc gửi ảnh không liên quan. Nhưng các trace không có `view_product_media`; không được nói owner đã nhìn ảnh để đánh giá tổng thể có rườm rà hay không. Nguồn feedback thật vẫn chưa bổ sung; không gọi ảnh MODEL là ảnh khách feedback.

`sales-discovery-advice:need` chọn SQ629 dưới 1 triệu, có cạp chun và báo preorder, nên có hướng mua cụ thể. Tuy nhiên đây là set quần short, mô tả nguồn định vị biển/café/resort/dạo phố. Khách chỉ nói đi làm, chưa có dress code: chưa đủ để kết luận chọn sai, cũng không nên dùng ca này chứng minh bot đã chọn đúng trang phục công sở. Đây là điểm cần xem về độ phù hợp sản phẩm, không phải false PASS an toàn đã xác lập.

## Finding về verifier, code và dữ liệu

### 5. Feedback: ranh giới nguồn chưa được giải quyết

Kết quả tool xác nhận **không có asset đủ điều kiện trong nguồn/query đang kiểm tra**, không xác nhận shop không có ảnh ở mọi nơi. Observation này đã tới model/verifier; không còn là thiếu nối tool result.

Các draft nói “shop hiện chưa có ảnh khách mặc thực tế” bị FAIL `media-lookup`. Cách nói như vậy thường hợp lý trong chat bán hàng, nhưng đang rộng hơn literal theo cách đọc chặt. Cần chốt nghĩa khả dụng “chưa có ảnh để gửi” từ kết quả lookup thành công khác với “shop không tồn tại ảnh”; đồng thời tách trường hợp nguồn lỗi, màu chưa bind và lời dẫn ảnh không đúng metadata. Không gọi cả ba FAIL là đã chứng minh chặn oan: verdict chỉ có kind/ref, không chỉ câu gây lỗi. Cũng không sửa bằng việc bỏ qua verifier mọi câu ảnh.

### 6. Fallback vẫn bỏ mất giá trị đã xác minh

`media-and-price` có PRICE 499k và ảnh MODEL hợp lệ nhưng actual chỉ hỏi ảnh tổng thể/cận. `media-and-size` có yêu cầu ảnh cụ thể, actual chỉ báo chuyển người chọn size. Luồng code mới đã sửa no-chart đi đúng handoff; phần trả lời nhiều nhu cầu vẫn chưa hoàn chỉnh.

Trong `single-agent-commerce-media.ts`, fallback mặc định vẫn chủ yếu chọn theo việc có observation/selection/view, cộng ngoại lệ size. Nó không biểu đạt được việc khách vừa hỏi giá lẫn ảnh. Vì vậy đổi một câu fallback chung không giải quyết được cấu trúc này.

Không cắt câu từ draft FAIL để gửi. Khi thiết kế sửa, phần code-owned được giữ phải dựng từ facts/selection hợp lệ, có ràng buộc subject/freshness/permission/recipient/privacy và gate cả response group; không gửi một phần trước gate hoặc qua nhánh handoff đã mất quyền.

### 7. Gallery lộ asset ref là lỗi output, không phải lý do mở rộng vai trò verifier

`sales-product-gallery:overview` gửi đúng hai attachment chung nhưng text cũng có hai mã `[asset:…]`. Đây là lỗi hiển thị có thật trong capture, không phải PII/secret leak. Verifier PASS không chứng minh tin nhắn đã tự nhiên hoặc sạch metadata vì verifier chỉ kiểm nghĩa được bảo vệ.

Code đang đưa asset refs vào tool result để bind ảnh; refs không phải lời nhắn cho khách. Hướng sửa phải giữ binding nội bộ và attachment do code dựng, bảo vệ bề mặt final text. Nếu final text thay đổi thì phải bind/verify exact text mới trước gate; không strip sau verifier PASS, không dùng regex theo riêng hai mã ảnh quan sát được, không giao verifier thêm việc chấm giọng.

### 8. Size thiếu nguồn, không phải thiếu thêm câu hỏi khách

Hai ca no-chart mới đều handoff có căn cứ. Đã tránh được lỗi owner suy từ chất liệu/chiều cao/cân nặng ra vừa vặn khi không có SIZE_FIT. Điều chưa hoàn thành là chart đúng sản phẩm và khả năng trả phần ảnh của yêu cầu hỗn hợp. Xin lại đủ ba vòng không chữa được một chart không có.

Ca B1 fallback `buying-concern-v2` khác: verdict trỏ SV2447, draft có “mặc lên rất sang và vừa vặn”, không có fit. Đây là nghi vấn hợp lý nhưng “vừa vặn” có thể cần đọc theo nghĩa toàn đoạn; không kết luận duy nhất chữ này gây FAIL khi verdict không có clause. Dù được cho qua, draft vẫn dài và không chọn dứt khoát.

### 9. Không im lặng mới là cải thiện quan sát, chưa là root cause egress đã được sửa

Không có `EGRESS_WORLD_CHANGED` trong 46 lượt mới. Lượt concern trước thiếu diagnostic để định vị revision, snapshot hay binding nào đổi. Diagnostic mới giúp lần tới tìm nguyên nhân; một lượt không tái hiện không đủ để đóng incident cũ.

## Root cause: mức nào đã có bằng chứng?

| Nhóm | Điều đã xác định | Giới hạn / điều chưa biết |
|---|---|---|
| Tư vấn vòng vo, mô tả thay quyết định | Prompt đã yêu cầu chọn hướng mua, không chép mô tả, giữ hoàn cảnh mới và không nói lỗi hệ thống; output vẫn vi phạm nhiều mục. Không phải chỉ thiếu một câu chỉ dẫn. | Dữ liệu có ảnh hưởng từ vựng nhưng hai run không cô lập ảnh hưởng prompt, model, context hay ngân sách tool. Không thể kết luận model bất lực hoặc rút ngắn prompt chắc chắn chữa được. |
| Feedback fallback | Literal hẹp về nguồn/query; owner diễn đạt vắng ảnh theo cách chat rộng hơn; active verifier baseline vẫn FAIL cùng ref. | Không có giải thích clause; candidate vừa thử cũng chưa qua controls. Chưa có căn cứ chấp nhận mọi draft cùng family. |
| Mất giá/ảnh khi fallback | Chọn recovery theo trạng thái/tool footprint và terminal toàn lượt; actual mất phần PRICE/ảnh đã có. | Chưa có thiết kế và evidence giữ phần hợp lệ mà vẫn gate response group. |
| Lộ mã ảnh | Mã binding nội bộ xuất hiện trong exact customer text và đi qua PASS/capture. | Chưa chứng minh các biến thể mã/media khác; không biến hai chuỗi cụ thể thành rule riêng. |
| Không tự chọn size | Tool xác nhận NO_VERIFIED_CHART; code mới chuyển người thay vì cho owner bịa fit. | Chart chưa bổ sung vào đúng nguồn. Handoff eval dùng candidate matrix, chưa publish hoặc kiểm chứng nhân viên xử lý thực. |
| Egress cũ | Có PASS rồi NO_SEND, chưa rõ nhánh invalidation. | Root cause **UNKNOWN**; không nới gate để chữa việc không tái hiện. |

## Hướng xử lý có căn cứ, tránh lặp vòng sửa cũ

1. **Sửa code ở đúng hai hợp đồng:** tách media binding khỏi text khách nhìn; thiết kế recovery giữ facts/media hợp lệ cho yêu cầu hỗn hợp. Viết kiểm tra output/response group, including changed world/recipient/permission; không chỉnh giọng bằng regex. Giữ nguyên one-owner/one-verifier, không rewrite/reverify loop.
2. **Chốt feedback bằng nghĩa nghiệp vụ:** lookup thành công nhưng không có ảnh đủ điều kiện để gửi; lookup lỗi; màu chưa xác nhận; có feedback thật. Kiểm chúng với các positive/negative controls giữ nguyên denominator, không chỉ chọn các draft từng FAIL. Không đổi policy thành “shop chắc chắn không có ở mọi nguồn”.
3. **Bổ sung chart đúng nguồn:** no-chart là việc dữ liệu cụ thể, không cần một nguồn kiến thức tư vấn mới hay thêm mọi phép thử vật liệu.
4. **Kiểm riêng chất lượng tư vấn trước khi lại chạy full:** giữ code, verifier và nguồn cố định; review các quyết định concern/đổi hoàn cảnh/bán thêm theo toàn đoạn. Có thể tái dùng evidence cũ làm đối chứng, không bắt mọi câu cùng khuôn hoặc cài câu trả lời cho từng case. Chỉ sửa phần hướng dẫn thực sự có giả thuyết mới; prompt hiện đã có phần lớn câu “nên làm”. Nếu dùng ảnh để nhận xét vẻ ngoài, cần kiểm wire có pixel, không suy từ việc đã select ảnh.
5. **Giữ phần đã hoạt động:** không sửa policy, tính tiền, state hay handoff chỉ để làm chỉ số tổng đẹp hơn. Khi source sửa, giữ regression gồm các ca trả giá/tổng/tồn ngắn, policy loại trừ rõ, đổi giỏ/correction và media continuation; không chỉ chạy lại family đang đỏ.

Thành công của vòng sửa sau phải quan sát được ở actual outcome: không lộ mã; hỏi ảnh+giá vẫn nhận được giá khi một phần lỗi; no-chart xử lý đúng mà không bịa fit; concern giúp chọn mua; hoàn cảnh đổi không bị kéo về kịch bản cũ. Không yêu cầu mọi câu phải ngắn, một lựa chọn hoặc có CTA.

## Rà soát toàn bộ 39 lượt core mới

Chi tiết exact reply ở [CONVERSATIONS.md](CONVERSATIONS.md); bảng này giải thích vì sao giữ/chưa giữ được kết quả, không thêm điểm keyword.

| # | Ca | Đánh giá sau đọc toàn lượt |
|---:|---|---|
| 1 | changed-occasion | Dùng được: chọn Diệp An thay, có giá và lý do. So sánh là lời khuyên, không chứng minh công năng chống nhăn. |
| 2 | current-policy | Dùng được: trả thời hạn/phí hiện hành; cuối hơi lặp. Không ép đọc mọi điều kiện. |
| 3 | partial-source | Cần sửa: giữ chất liệu nhưng tự kể “hệ thống chưa cập nhật”. |
| 4 | price | Dùng được: giá bộ/món lẻ rõ; phần thêm chưa gây lạc quyết định. |
| 5 | component-stock | Dùng được: đúng áo/M/tồn/499k, ngắn. |
| 6 | search-read | Dùng được: đúng SD375 và giá áo/cả bộ. |
| 7 | buying-concern | Cần sửa: trấn an bằng chuỗi tính từ/mô tả thay lý do lựa chọn. |
| 8 | policy-used | Dùng được: mặc đi làm không được đổi; không đọc phí cho tình huống bị loại. |
| 9 | changed-occasion-v2 | Cần sửa: biết nóng/sân vườn nhưng chỉ cảnh báo oi, không giúp chọn. |
| 10 | current-policy-v2 | Dùng được: đúng thời hạn/phí mới thay lời cũ, không tự duyệt hồ sơ. |
| 11 | partial-source-v2 | Cần sửa: chưa đọc được giá/tồn không thành hệ thống chưa có dữ liệu bán lẻ. |
| 12 | price-v2 | Dùng được: trả đúng giá cả bộ, không kéo thêm hướng mua. |
| 13 | component-stock-v2 | Dùng được: đúng chân váy/M/tồn/449k. |
| 14 | search-read-v2 | Dùng được: đúng Khánh Trang và giá bộ/món lẻ. |
| 15 | buying-concern-v2 | Fallback: khách không nhận tư vấn; draft cũng chưa tốt, lý do semantic chính xác chưa định vị. |
| 16 | policy-used-v2 | Dùng được: phân biệt mặc thử với ướm; ngoặc dài là polish. |
| 17 | changed-occasion-v3 | Cần sửa: chọn áo cho lịch mới rồi mở lại cả bộ cho buổi tối. |
| 18 | current-policy-v3 | Dùng được: thời hạn/phí đúng nguồn, không lấy policy cũ trong history. |
| 19 | partial-source-v3 | Dùng được: trả chất liệu, nói thẳng giá/tồn chưa có; không bịa nguyên nhân. |
| 20 | price-v3 | Dùng được: đúng giá nguyên set, ngắn. |
| 21 | component-stock-v3 | Dùng được: đúng bán lẻ áo/M/giá/tồn. |
| 22 | search-read-v3 | Dùng được: đúng SQ223; danh sách giá có mục đích so cách mua. |
| 23 | buying-concern-v3 | Cần sửa: bán cả bộ hợp lệ nhưng lợi ích khoản mua thêm chưa rõ, nhiều quảng cáo chung. |
| 24 | policy-used-v3 | Dùng được: cắt tem/giặt bị loại, trả đúng lý do. |
| 25 | stateful-open | Dùng được: receipt thêm áo/be/M, báo preorder. |
| 26 | stateful-variant-quantity | Dùng được: đổi 2 áo/L, giữ màu và state đúng. |
| 27 | stateful-quote | Dùng được: 978.100đ đúng; sửa cách gọi mã giảm/format là polish. |
| 28 | stateful-correction | Dùng được: sửa hồ sơ, giữ L/2 áo; vẫn hơi hành chính, không còn đọc lại số đo. |
| 29 | stateful-request-checkout | Code checkout: có capture xin thông tin riêng, không phải im lặng. Placeholder đã redacted, không chấm nguyên bản chứa NAME. |
| 30 | stateful-private-checkout | Code checkout: preview đủ tổng/ship/ưu đãi/preorder/ETA và xác nhận; không PII vào model. |
| 31 | stateful-confirm | Handoff hợp lệ: nhân viên tiếp nhận việc kiểm tra/lên đơn, chưa có đơn POS hoàn tất. |
| 32 | stateful-human-request | Handoff hợp lệ: chuyển theo yêu cầu, có holding reply. |
| 33 | sales-discovery-advice:need | Dùng được có lưu ý: chọn mẫu/cạp chun/giá/preorder; tính hợp quần short với chỗ làm chưa kiểm chứng. |
| 34 | sales-product-gallery:overview | Cần sửa: gửi ảnh chung được nhưng lộ 2 asset refs và giọng xác thực nội bộ. |
| 35 | sales-size-advice:height-weight | Handoff đúng no-chart; không tính là tự chọn size thành công. |
| 36 | sales-southern-delivery:deadline | Cần sửa: ETA đúng, lời giải thích hệ thống và giao khách tự cân nhắc chưa giúp việc mua. |
| 37 | negotiation-cart-setup | Dùng được: thêm đúng áo và báo preorder có receipt. |
| 38 | negotiation-price-objection | Dùng được: hỗ trợ ship/tổng đúng; “tốt nhất/chốt giúp em” cần polish. |
| 39 | negotiation-total-control | Dùng được: giữ đúng tổng/ưu đãi; ngoặc dài nhưng không sai phép tính. |

Bảy lượt media mới và bảy lượt media trước đều đã được đối chiếu ở bảng phía trên, gồm các cặp nối lịch sử thực. Không bỏ ca lỗi/provider error khỏi quần thể review.

## Vận hành và giới hạn

Lượt trước 25 requests, lượt mới 132; không generation retry, provider error hoặc timeout được ghi nhận. Lượt mới whole-turn p50 khoảng 19,48 giây, p95 khoảng 44,88 giây; riêng media p50 khoảng 30,64 giây. Verifier toàn 46 lượt mới p50 khoảng 6,78 giây, p95 khoảng 14,53 giây. Đây là completed-turn latency, không phải thời gian thấy token đầu hay SLA production. Tốc độ này vẫn đáng quan tâm cho bán hàng qua chat, dù không giải thích các lỗi nội dung.

Không có conversion thật, blind comparison, stability N nhiều hoặc kiểm chứng nhân viên hoàn tất handoff. Candidate description/handoff matrix vẫn thuộc eval. Kết luận giữ **B chưa GO**; review này không mở run/fix/deploy mới. Những số liệu và kết luận trên không thay thế raw evidence hoặc biến 17 controls chưa đạt thành PASS.
