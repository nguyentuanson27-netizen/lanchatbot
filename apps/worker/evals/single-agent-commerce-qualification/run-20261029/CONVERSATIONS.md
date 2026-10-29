# Hội thoại Phase C — 29/10/2026

Toàn bộ 22 kịch bản / 34 lượt khách; N1. Chỉ hiển thị kết quả thực sự được capture. HANDOFF/NO_SEND không có tin nhắn thì khách không nhận câu trả lời. Không thay draft bị chặn vào kết quả khách. Ánh xạ grade chỉ thực hiện sau khi judge chấm mù xong.

## c-20261028-s01 — opening-price — CHƯA ĐỦ CĂN CỨ

Khách hỏi giá cả bộ Khánh Trang. Nguồn xác nhận có offer áo, chân váy và set nhưng ghi PRICE chưa được đọc; outcome chỉ handoff DEPENDENCY_FAILURE, không có fact giá hay kết quả đọc cho biết vì sao giá không có. Vì chưa phân biệt được thiếu giá shop cần handoff với lỗi vận hành/provider, chưa thể kết luận chất lượng toàn lượt. Owner HUMAN đã được commit và không có báo giá không nguồn.

### Lượt 1

Khách: Bộ Khánh Trang này bao nhiêu vậy em?

Kết quả: `HANDOFF` / `DEPENDENCY_FAILURE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s02 — component-purchase — ĐẠT

Khách muốn mua riêng áo và hỏi giá. Bot trả ngay giá áo lẻ 499.000đ đúng ở cả hai mẫu Thạch Thảo, nêu các size có xác nhận và chỉ hỏi thêm loại áo vì lịch sử chưa phân biệt set quần với set váy. Câu hỏi bổ sung không trì hoãn phần báo giá đã trả được; không đẩy khách mua cả bộ hay dùng giá set làm giá áo.

### Lượt 1

Khách: Chị lấy mỗi áo của Thạch Thảo thôi, báo chị giá áo nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, áo lẻ của Set quần Thạch Thảo và Set váy Thạch Thảo đều có giá 499.000đ (đủ size S, M, L, XL). Chị lấy áo của mẫu nào ạ?

## c-20261028-s03 — detail-media — CHƯA ĐỦ CĂN CỨ

Khách xin ảnh gần phần ren Váy Ngọc Trâm, nhưng không nhận được ảnh hay lời trả lời; audit chỉ ghi handoff DEPENDENCY_FAILURE sang HUMAN. Nguồn có mô tả sản phẩm ren nhưng không có media inventory, kết quả chọn ảnh hoặc xác nhận ảnh cận ren không tồn tại. Thiếu căn cứ để phân biệt handoff do shop thiếu ảnh với lỗi phụ thuộc/provider làm mất kết quả, nên không đoán PASS. Không có ảnh sai hoặc tuyên bố đã gửi ảnh.

### Lượt 1

Khách: Váy Ngọc Trâm có ảnh chụp gần phần ren không em?

Kết quả: `HANDOFF` / `DEPENDENCY_FAILURE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s04 — variant-context — CHƯA ĐỦ CĂN CỨ

Khách muốn biết áo Thạch Thảo còn màu khác không; thực nhận chỉ là handoff RESPONSE_UNAVAILABLE, không có lời tư vấn. Packet không có nguồn màu/biến thể sản phẩm hoặc kết quả đọc xác nhận thiếu dữ liệu, và lý do chung này không cho biết đó là lỗi provider hay một giới hạn dữ liệu shop cần handoff. Đủ căn cứ thấy quyền HUMAN được giữ và không bịa màu, nhưng thiếu căn cứ để quyết định handoff hợp lý hay lượt thất bại do lỗi phản hồi.

### Lượt 1

Khách: Áo Thạch Thảo có thêm màu khác nữa không em?

Kết quả: `HANDOFF` / `RESPONSE_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s05 — discovery — ĐẠT

Khách nhờ chọn đồ đi ăn với gia đình theo hướng đơn giản hơn; bot chọn cụ thể set SQ629 tông kem, giải thích cách dáng rộng và quần cạp chun phục vụ sự thoải mái, trang nhã. Các chi tiết, giá 749.000đ và trạng thái đặt trước đều có căn cứ trong audit. Nhận xét phù hợp dịp ăn gia đình là tư vấn thẩm mỹ hợp lý; dù mẫu có ren, lựa chọn tông nhã và giải thích vẫn giúp khách ra quyết định thay vì đẩy lại toàn bộ việc chọn.

### Lượt 1

Khách: Chị cần bộ đồ mặc đi ăn với gia đình, thích đơn giản hơn một chút. Em chọn giúp chị nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, em gợi ý cho mình set quần SQ629 màu kem sáng rất nhã nhặn và thanh lịch nhé ạ. Set gồm áo tay cánh dơi dáng rộng nhẹ phối ren 3D tinh tế kết hợp quần short cạp chun thoải mái, diện đi ăn cùng gia đình vừa trang nhã, gọn gàng lại rất dễ chịu. 
> 
> Sản phẩm hiện có giá 749.000đ và là hàng đặt trước ạ. Chị xem thử mẫu này có vừa ý mình không nhé ạ!

## c-20261028-s06 — styling — CHƯA ĐỦ CĂN CỨ

Khách xin tư vấn phối áo Thạch Thảo với quần nâu sẫm sẵn có. Outcome chỉ handoff DEPENDENCY_FAILURE và không có tư vấn; sourceContext/audit không có mô tả hay hình sản phẩm để xác định phần dữ liệu shop còn thiếu. Lý do chung cũng không cho biết lỗi provider hay thiếu nguồn shop, nên không thể kết luận việc chuyển người là cần thiết hay bỏ phí một câu tư vấn chủ quan có thể trả. Không có lời khẳng định phối đồ hoặc đặc tính bịa gửi cho khách.

### Lượt 1

Khách: Áo Thạch Thảo phối với quần nâu sẫm chị đang có được không em?

Kết quả: `HANDOFF` / `DEPENDENCY_FAILURE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s07 — size-input — ĐẠT

Khách đã cho 1m60, 55kg và thích mặc rộng. State lưu đúng chiều cao, cân nặng, fitPreference RELAXED; cả hai kết quả SIZE_FIT có hiệu lực theo profile revision 2 đều khuyên M. Bot trả trực tiếp size M cho áo của hai mẫu Thạch Thảo, dùng thông tin đã biết, không hỏi lại số đo hoặc tự suy thêm size ngoài engine.

### Lượt 1

Khách: Chị cao 1m60, nặng 55kg, thích mặc rộng. Áo Thạch Thảo lấy size nào em?

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, với chiều cao 1m60, nặng 55kg và sở thích mặc rộng thoải mái, áo Thạch Thảo (cả set quần lẫn set váy Thạch Thảo) chị lấy size M là vừa đẹp ạ.

## c-20261028-s08 — product-choice — ĐẠT

Khách nhờ chọn giữa Odette và Diệp An để đi lễ; bot chọn rõ Diệp An và giải thích bằng thiết kế hai lớp kín đáo, cổ tròn, form suông nhẹ đều có trong nguồn của đúng sản phẩm. Nhận xét trang nhã, hợp không gian tôn nghiêm là tư vấn chủ quan hợp lý, không phải thêm thuộc tính sản phẩm không nguồn. Câu trả lời giúp chọn được một mẫu mà không cần so sánh dài hoặc bịa giá/tồn.

### Lượt 1

Khách: Váy Odette với Diệp An, em chọn giúp chị một mẫu mặc đi lễ nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Đi lễ thì chị chọn mẫu **Váy Diệp An** giúp em nhé. 
> 
> Mẫu này thiết kế 2 lớp kín đáo, đứng form nhưng vẫn mềm mại, kết hợp cổ tròn đơn giản và form suông nhẹ rất nhã nhặn, trang nhã và lịch sự, rất phù hợp với không gian tôn nghiêm như đi lễ. 
> 
> Chị lấy mẫu Diệp An này luôn không ạ?

## c-20261028-s09 — missing-care — CHƯA ĐẠT

Khách hỏi áo Thạch Thảo có cần giặt tay hay giặt máy được. Policy trong packet đã nói ưu tiên giặt tay và cho phép máy với túi giặt, chế độ nhẹ; câu hỏi này có thể giải quyết bằng nguồn hiện có. Handoff im lặng POLICY_UNAVAILABLE bỏ trống cả hướng dẫn giặt tay lẫn điều kiện giặt máy, nên không đạt toàn lượt dù không gửi thông tin sai và đã chuyển quyền HUMAN đúng.

### Lượt 1

Khách: Áo Thạch Thảo này có cần giặt tay không hay cho máy được em?

Kết quả: `HANDOFF` / `POLICY_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s10 — existing-order — ĐẠT

Khách muốn đổi màu của áo đã đặt nhưng chưa nhận, tức cần can thiệp đơn hiện hữu. Capability không cho truy cập đơn cũ, và policy đổi sau nhận không tự cấp quyền sửa đơn đang giao. Chuyển owner sang HUMAN rồi im lặng là bước phù hợp, không bịa khả năng đổi màu, trạng thái vận chuyển hay xác nhận sửa đơn.

### Lượt 1

Khách: Áo chị đặt hôm trước chưa nhận, giờ chị muốn đổi màu thì làm thế nào em?

Kết quả: `HANDOFF` / `POLICY_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s11 — quantity-stock — CHƯA ĐỦ CĂN CỨ

Khách hỏi còn hai set Thạch Thảo màu be size L không. Kết quả duy nhất là handoff im lặng DEPENDENCY_FAILURE, owner đã chuyển HUMAN đúng contract. Packet không có sản phẩm, stock theo màu/size/số lượng hay kết quả đọc nêu dữ liệu thực sự không khả dụng; cũng không phân biệt lỗi provider với thiếu dữ liệu shop. Vì handoff phù hợp khi thiếu dữ liệu có thể PASS còn lỗi không có kết quả không được PASS, chưa đủ căn cứ phân loại chất lượng toàn lượt. Không có thông tin tồn kho bịa gửi cho khách.

### Lượt 1

Khách: Set Thạch Thảo màu be size L còn hai bộ không em?

Kết quả: `HANDOFF` / `DEPENDENCY_FAILURE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s12 — after-sales — ĐẠT

Khách cần xử lý váy đã nhận có khóa kẹt. Đây là vấn đề của đơn hàng cũ, cần shop xác minh lỗi và điều kiện xử lý; bot không có quyền truy cập đơn hiện hữu. Handoff đã commit sang HUMAN là bước tiếp theo phù hợp, không tự hứa đổi thành công, không kết luận khóa kẹt chắc chắn thuộc diện được hoàn/đổi và không tự áp dụng điều kiện đổi thông thường để bác lỗi. Điểm PASS ở bước chuyển xử lý đúng khả năng, không phải đã hoàn tất đổi hàng.

### Lượt 1

Khách: Chị mới mở hộp, khóa váy bị kẹt. Giờ chị muốn đổi thì làm thế nào em?

Kết quả: `HANDOFF` / `POLICY_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s13 — shipping-scope — CHƯA ĐỦ CĂN CỨ

Khách chỉ hỏi tổng một áo Thạch Thảo gửi Cần Thơ, không hỏi thời gian giao. Outcome handoff ETA_UNAVAILABLE đã commit HUMAN nhưng packet không có giá áo hoặc kết quả tra giá, trong khi policy có phí mặc định 30.000đ. Thiếu nguồn để xác định còn trở ngại giá thực sự cần handoff hay bot đã bỏ câu hỏi tính tổng vì nhầm sang ETA; không thể tự lấy giá ở reviewId khác để lấp chỗ thiếu. Vì vậy chưa kết luận PASS/FAIL toàn lượt; việc không báo tổng bịa và chuyển quyền là an toàn.

### Lượt 1

Khách: Chị lấy một áo Thạch Thảo, gửi về Cần Thơ thì cả ship hết bao nhiêu em?

Kết quả: `HANDOFF` / `ETA_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-s14 — defer — ĐẠT

Khách nói muốn xem thêm và sẽ chủ động nhắn khi mua. Bot ghi nhận tự nhiên, để khách xem và mở cửa hỗ trợ khi cần; không thúc chốt, hỏi checklist hay tự tạo giỏ. Cách kết thúc này đáp ứng đúng ý khách và giữ quan hệ bán hàng phù hợp.

### Lượt 1

Khách: Em để chị xem thêm đã, khi nào lấy chị nhắn nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ vâng, chị cứ xem tự nhiên nhé ạ. Cần hỗ trợ gì thêm chị cứ nhắn em nha.

## c-20261028-s15 — acknowledgement — ĐẠT

Khách bày tỏ thích áo Thạch Thảo màu be và cảm ơn, chưa chốt loại áo. Bot đưa giá áo lẻ 499.000đ đúng cho cả hai sản phẩm Thạch Thảo và hỏi phân biệt áo thuộc set quần hay set váy; với lịch sử trống và hai mã cùng tên, đây là câu hỏi tiếp tục mua hàng có thể thực hiện được. Câu trả lời hơi thiên về chốt lựa chọn nhưng vẫn dùng được, không tự khẳng định tồn màu be hay tự mở giỏ.

### Lượt 1

Khách: Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, áo Thạch Thảo nhà em có cả ở Set quần và Set váy (đều có giá 499.000đ), chị chọn áo của set quần hay set váy ạ?

## c-20261028-s16 — image-provenance — CHƯA ĐỦ CĂN CỨ

Khách xin ảnh khách mặc áo Thạch Thảo, nhưng không có ảnh hoặc lời trả lời; handoff DEPENDENCY_FAILURE đã chuyển HUMAN. Packet không chứa danh sách ảnh feedback, kết quả media selector hay xác nhận shop không có ảnh khách mặc. Vì thế không đủ căn cứ phân biệt thiếu ảnh cần chuyển người với lỗi vận hành/provider và chưa thể chấm whole-turn PASS/FAIL. Không có việc gán ảnh mẫu thành ảnh khách hoặc nhận là đã gửi ảnh.

### Lượt 1

Khách: Shop có ảnh khách mặc áo Thạch Thảo không em?

Kết quả: `HANDOFF` / `DEPENDENCY_FAILURE`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-j1 — cart-change — CHƯA ĐẠT

Khách chốt áo size L, sau đó sửa thành hai áo một M một L và hỏi tổng cả ship, nhưng lượt đầu RESPONSE_UNAVAILABLE dẫn tới HUMAN rồi hai lượt sau đều không gửi. Audit đã có giá áo 499.000đ và xác nhận các size M/L cùng policy phí ship, song khách không nhận được xử lý số lượng hay báo tổng. Việc giữ im lặng khi HUMAN sở hữu là an toàn, nhưng không cứu được kết quả bán hàng bị gián đoạn từ lượt đầu.

### Lượt 1

Khách: Chị lấy áo của bộ váy Thạch Thảo size L nhé.

Kết quả: `HANDOFF` / `RESPONSE_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

Draft bị chặn, không gửi:

> Dạ, áo set Thạch Thảo size L hiện có sẵn màu be, em lưu áo size L màu be cho chị nhé ạ!

Verifier: `FAIL`.

### Lượt 2

Khách: Lấy hai chiếc cho chị, một M một L.

Kết quả: `NO_SEND` / `HUMAN_OWNS_CONVERSATION`

*(Không gửi tin nhắn cho khách.)*

### Lượt 3

Khách: Em báo lại tổng cả phí ship cho chị nhé.

Kết quả: `NO_SEND` / `HUMAN_OWNS_CONVERSATION`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-j2 — profile-correction — ĐẠT

Lượt đầu tư vấn M có SIZE_FIT từ engine cho 1m62/56kg. Khi khách sửa còn 51kg và bổ sung ba vòng, state đã thay cân nặng và lưu đủ số đo, không tiếp tục dùng kết quả size cũ để khẳng định. SIZE_RULE_UNAVAILABLE dẫn tới handoff HUMAN là cách xử lý phù hợp khi thiếu quy tắc shop cho hồ sơ đã sửa; lượt cuối thích mặc thoải mái nằm trong hội thoại do HUMAN sở hữu nên bot không chen trả lời. Nhu cầu được chuyển đúng người xử lý, chưa bị nhận là đã có kết luận size mới.

### Lượt 1

Khách: Chị muốn chọn size áo của bộ váy Thạch Thảo, cao 1m62 nặng 56kg.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, với chiều cao 1m62 và cân nặng 56kg, em tư vấn chị mặc **size M** bộ váy Thạch Thảo nhé ạ!

### Lượt 2

Khách: Chị nhắn nhầm cân nặng, 51kg thôi em nhé. Ngực 88, eo 70, mông 94.

Kết quả: `HANDOFF` / `SIZE_RULE_UNAVAILABLE`

*(Không gửi tin nhắn cho khách.)*

### Lượt 3

Khách: Chị thích mặc thoải mái một chút, em chọn size giúp chị nhé.

Kết quả: `NO_SEND` / `HUMAN_OWNS_CONVERSATION`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-j3 — whole-look-decision — ĐẠT

Cả hành trình bám việc khách đã có quần nâu và chỉ muốn mua áo: bot nêu đúng áo tơ Hàn thêu cùng giá 499.000đ, dùng ảnh sản phẩm được audit xác nhận; khi khách cân nhắc mua cả bộ, bot giải thích cách phối lại chân váy với áo tối giản, là tư vấn thẩm mỹ hợp lý từ form và chất liệu đã có. Khi khách quyết áo thôi, bot chấp nhận và hỏi size còn thiếu thay vì ép thêm váy. Cụm lưu áo thể hiện ghi nhận lựa chọn trong mạch hỏi size, không tuyên bố đã đặt đơn hay giữ tồn kho.

### Lượt 1

Khách: Chị có quần nâu ở nhà rồi, đang muốn mua áo của bộ váy Thạch Thảo.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, áo tơ Hàn thêu trong set Thạch Thảo có giá 499.000đ, form nhẹ, vải mềm thoáng và có độ bay tự nhiên rất hợp để phối cùng quần nâu ở nhà ạ. Mẫu này có các size từ S đến XL, chị lấy size nào ạ?

Ảnh đã capture: [{"url": "https://content.pancake.vn/1/s3000x3000/19/3f/e0/1e/fb4238aebb457d97030f8347d74007295ca5974e0177005664cf33a0-w:4000-h:6000-l:1587463-t:image/jpeg.jpeg"}, {"url": "https://content.pancake.vn/1/s3000x3000/1d/47/51/f5/eb844837408cc82fb8f23e37528d13a2eccab6c94644355c69f55e1d-w:3853-h:5779-l:1378368-t:image/jpeg.jpeg"}]

### Lượt 2

Khách: Nếu lấy cả bộ thì phần váy có dễ mặc lại không em?

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, chân váy ren tơ mềm form nhẹ và có độ rũ tự nhiên nên rất dễ phối đồ ạ. Ngoài việc mặc cùng áo thun trơn, sơ mi đơn giản hoặc áo kiểu nhẹ nhàng, chị có thể kết hợp chân váy với các áo tối giản khác để đi làm hay đi chơi đều rất xinh và nữ tính ạ.

### Lượt 3

Khách: Chị lấy áo thôi, phần váy để lần sau nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ vâng ạ, em lưu áo lẻ (499.000đ) cho chị nhé. Chị lấy size S, M, L hay XL ạ?

## c-20261028-j4 — negotiation — CHƯA ĐỦ CĂN CỨ

Hành trình trả đúng giá áo 499.000đ, có receipt mở giỏ và cấp miễn ship 30.000đ, tổng cuối 499.000đ khớp quote; hàng đặt trước cũng được nói rõ. Tuy nhiên ngay lượt đầu khách chỉ chọn áo của bộ váy size M, còn bot tự thêm và xác nhận màu be. Packet không có nguồn màu sản phẩm, lựa chọn màu từ khách hoặc quy tắc mặc định cho phép bước này; stock/price theo cart-variant và receipt chứng minh giỏ đã được ghi, chưa chứng minh màu được chọn có căn cứ. Vì thiếu căn cứ đối chiếu lựa chọn màu xuyên suốt hành trình, chưa thể xác nhận an toàn state và PASS toàn hành trình.

### Lượt 1

Khách: Chị lấy áo của bộ váy Thạch Thảo size M.

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, em đã thêm áo lẻ set váy Thạch Thảo size M, màu be vào giỏ hàng cho chị rồi ạ. Sản phẩm này là hàng đặt trước (pre-order) chị nhé. Tổng giỏ hàng hiện tại của chị là 529.000đ ạ.

### Lượt 2

Khách: Shop hỗ trợ thêm cho chị được chút nào không?

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, hiện tại đơn của mình đang có mức ưu đãi 30.000đ, tổng thanh toán là 499.000đ chị nhé ạ.

### Lượt 3

Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?

Kết quả: `SEND_ELIGIBLE` / ``

> Dạ, phí vận chuyển về Cần Thơ là 30.000đ chị ạ. Tổng thanh toán cho áo size M của mình là 499.000đ (đã gồm ưu đãi giảm 30.000đ và phí ship) chị nhé.

## c-20261028-j5 — handoff-ownership — ĐẠT

Khách hỏi về đơn cũ rồi muốn trao đổi trực tiếp với shop. Capability loại trừ truy cập đơn đã đặt; lượt đầu handoff ORDER_STATUS chuyển owner sang HUMAN và hai lượt tiếp theo giữ đúng quyền sở hữu. Đây là bước xử lý phù hợp cho nhu cầu thực tế, không tự tra đơn, bịa trạng thái hoặc chen lời khi khách đã chọn nói với shop.

### Lượt 1

Khách: Chị muốn hỏi về đơn đã đặt hôm trước.

Kết quả: `HANDOFF` / `ORDER_STATUS`

*(Không gửi tin nhắn cho khách.)*

### Lượt 2

Khách: Để chị trao đổi trực tiếp với shop nhé.

Kết quả: `NO_SEND` / `HUMAN_OWNS_CONVERSATION`

*(Không gửi tin nhắn cho khách.)*

### Lượt 3

Khách: Chị gửi thêm thông tin đơn sau.

Kết quả: `NO_SEND` / `HUMAN_OWNS_CONVERSATION`

*(Không gửi tin nhắn cho khách.)*

## c-20261028-j6 — checkout-intent — ĐẠT

Bot mở đúng một set váy Thạch Thảo size M; receipt và giỏ có cả áo, chân váy, giá 799.000đ và tổng 829.000đ. Khi khách yêu cầu lên đơn nhưng chưa cung cấp tên người nhận, kết quả code-owned cuối hỏi bổ sung tên là bước thực hiện được; COD khách muốn dùng nằm trong policy. Bot chưa nhận là đã tạo đơn hay đã thu tiền. Chấm quá trình ở bước lấy dữ liệu khách còn thiếu, không coi đây là checkout hoàn tất.

### Lượt 1

Khách: Chị lấy set váy Thạch Thảo size M nhé.

Kết quả: `SEND_ELIGIBLE` / ``

> Em đã thêm set váy Thạch Thảo size M vào giỏ cho chị rồi ạ.

### Lượt 2

Khách: Em lên đơn cho chị đi.

Kết quả: `NO_SEND` / `CHECKOUT_DETAILS_MISSING`

> Chị cho em tên người nhận nhé.

### Lượt 3

Khách: Chị muốn trả khi nhận hàng.

Kết quả: `CODE_OWNED_SEND` / ``

> Chị gửi riêng tên người nhận nhé.

