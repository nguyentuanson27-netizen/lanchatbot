# 20 actual native outcomes — rule retention, 26/10/2026

Source `1ebd4dcc50fce13f890085f6995b8ccb876b16fe`. Gemini3.5FlashLiteHIGH owner/GPT6.1SolHIGH verifier, N1/retry0. Controls17PASS. Targeted gate FAIL1workflow;31remaining chưa chạy. B1 là eligibility, không có delivery capture. Các lời văn hơi kém được giữ minor theo owner.

## opening-ad

Khách: Bộ này bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ chị nha. Set gồm áo tơ Hàn thêu nổi phối chân váy ren tơ Hàn mềm, form nhẹ bay tự nhiên ạ. Mẫu này có sẵn các size S, M, L, XL chị nhé.

> [CODE_IMAGE]

> [CODE_IMAGE]

Review: Giá799k, size có tồn và mô tả đúng nguồn; actual capture có2ảnh. Optional ATTRIBUTES thiếu không làm mất báo giá.

## opening-ad-repeat

Khách: Chị hỏi lại chút, cả bộ bao nhiêu nhỉ?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ chị nha. Set gồm áo tơ Hàn thêu nổi phối chân váy ren tơ Hàn mềm, form nhẹ bay tự nhiên ạ. Mẫu này có sẵn các size S, M, L, XL chị nhé.

Review: Giá đúng và không gửi ảnh lặp. Lặp nguyên đoạn mô tả là minor, chưa sửa giọng trong vòng này.

## opening-organic

Khách: Set Thạch Thảo SV2447 bao nhiêu vậy shop?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Set gồm áo tơ Hàn thêu và chân váy ren tơ Hàn mềm, form nhẹ, hiện sẵn các size S, M, L, XL chị nhé.

> [CODE_IMAGE]

> [CODE_IMAGE]

Review: Đúng set799k, các size có tồn và2ảnh; không cần mã nguồn ads để trả mẫu khách gọi tên.

## opening-unresolved

Khách: Mẫu này giá sao em?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, chị gửi hình ảnh hoặc tên mẫu giúp em để em kiểm tra giá chính xác cho mình nhé ạ!

Review: Chưa xác định món nên hỏi khách ảnh/tên; không lấy giá một món mặc định.

## opening-multipart

Khách: Set Thạch Thảo SV2447 giá bao nhiêu? Chị mua áo riêng được không?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Chị hoàn toàn có thể mua áo riêng được nhé, áo lẻ có giá 499.000đ ạ.

Review: Trả đủ cả bộ799k và áo499k theo đúng2offer; không ép card/ảnh nguyên set cho câu hỏi nhiều phần.

## media-overview-next:ask

Khách: Em có ảnh khách mặc bộ Thạch Thảo không?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> Dạ, set Thạch Thảo hiện em chưa có sẵn ảnh khách mặc thực tế ạ.
> 
> Em chưa tra được thông tin này ngay. Shop sẽ kiểm tra lại rồi trả lời chị nhé.

Review: Nguồn thiếu feedback đã xác nhận: handoff thật và có capture, không gọi catalog là ảnh khách mặc.

## media-overview-next:continue

Khách: Gửi chị ảnh cả bộ nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION; PERSISTED_CAPTURE

> [NO_SEND — không có tin customer]

Review: NO_SEND vì lượt trước đã chuyển HUMAN;0owner/0verifier. Đây là dependent code outcome, chưa có phản hồi người nhận handoff.

## media-detail-next:ask

Khách: Bộ Thạch Thảo có ảnh khách mặc chưa em?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> Dạ, set Thạch Thảo hiện em chưa có sẵn ảnh khách mặc ạ. Chị chờ em xíu để em kiểm tra và gửi thêm ảnh cho mình nha!
> 
> Em chưa tra được thông tin này ngay. Shop sẽ kiểm tra lại rồi trả lời chị nhé.

Review: Handoff thật khi thiếu feedback. Câu chờ/gửi ảnh hơi hứa trước và trùng holding; ghi minor vì workflow kiểm tra đã được chuyển thật, chưa báo ảnh tồn tại hay đã gửi.

## media-detail-next:continue

Khách: Cho chị xem cận phần thêu ở áo nhé.

Terminal: NO_SEND / HUMAN_OWNS_CONVERSATION; PERSISTED_CAPTURE

> [NO_SEND — không có tin customer]

Review: NO_SEND đúng ownership HUMAN sau handoff; không giả một lượt tư vấn mới hoặc history đã gửi ảnh.

## media-and-price:ask

Khách: Em gửi chị ảnh khách mặc bộ Thạch Thảo với. Lấy riêng áo thì bao nhiêu?

Terminal: HANDOFF / DEPENDENCY_FAILURE; PERSISTED_CAPTURE

> Dạ, áo lẻ set Thạch Thảo có giá 499.000đ, hiện shop sẵn các size S, M, L, XL chị nha.
> 
> Em chưa tra được thông tin này ngay. Shop sẽ kiểm tra lại rồi trả lời chị nhé.

Review: Actual handoff group giữ giá áo499k và size có tồn; phần ảnh thiếu được chuyển thật. Không bị thay cả tin bằng holding.

## media-and-size:ask

Khách: Cho chị xem gần phần thêu áo Thạch Thảo nhé. Chị cao 1m58, nặng 52kg thì lấy size nào?

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Dạ em gửi chị xem ảnh cận cảnh chi tiết thêu của áo ạ. Với chiều cao 1m58 và nặng 52kg, chị mặc size M là vừa đẹp nha chị.

> [CODE_IMAGE]

Review: Engine trả M từ đầu vào đủ; gửi ảnh DETAIL/CLOSEUP có confirmedParts AO. Nhắc chiều cao/cân nặng là minor, không suy fit ngoài engine.

## media-decision:ask

Khách: Chị thích bộ Thạch Thảo mà sợ phần ren trông hơi nhiều. Chị mặc đi ăn cưới buổi trưa thôi.

Terminal: SEND_ELIGIBLE / PASS; PERSISTED_CAPTURE

> Chân váy của set là ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, mặc lên rất thanh thoát chứ không bị rườm rà hay quá cầu kỳ đâu ạ, rất hợp để chị mặc đi ăn cưới buổi trưa nhẹ nhàng và sang trọng. 
> 
> Em gửi chị xem ảnh chi tiết chất liệu nha. Nếu chị vẫn lăn tăn về phần ren, mình có thể chọn mua áo lẻ tơ thêu nổi (499.000đ) để phối với chân váy hoặc quần khác, hoặc lấy nguyên set cả bộ (799.000đ) để tổng thể bay bổng và đồng điệu nhất ạ.

> [CODE_IMAGE]

> [CODE_IMAGE]

Review: Giải quyết lo ren cầu kỳ bằng nhận xét phong cách được phép, ảnh chi tiết và phương án áo lẻ499k/cả set799k đúng nguồn. Còn dài, nhiều tính từ và chia lựa chọn; chấp nhận minor theo owner.

## b1-changed-occasion

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ, set Thạch Thảo dùng chất liệu tơ Hàn và ren tơ mềm mại nên khi ngồi ô tô di chuyển 3 tiếng sẽ dễ bị hằn nếp nhăn ạ. 
> 
> Nếu chị cần mẫu giữ form tốt và hạn chế nhăn hơn cho chuyến đi dài, em gợi ý sang **Set quần SQ675** (chất thô ướt cao cấp phối thô hoa laze, có lót habutai bên trong đứng dáng). Mẫu này là hàng đặt trước, chị xem thời gian chuẩn bị có kịp không nhé ạ. 
> 
> Hoặc nếu chị muốn chọn mẫu có sẵn để diện luôn, **Váy Ngọc Trâm (V406)** với chất ren hoa nổi và tơ ống mềm sang trọng cũng rất phù hợp đi đám cưới ạ.

Review: Đọc lại hoàn cảnh và tìm2món; SQ675 PRE_ORDER/V406 có tồn đúng source. So sánh định tính vật liệu/form thuộc phạm vi đã duyệt; còn dài và đẩy khách tự xét thời gian chuẩn bị. Không coi đây là cam kết không nhăn hoặc hiệu quả3giờ.

## b1-current-policy

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ đơn nhận 10 hôm thì vẫn trong thời hạn đổi hàng 15 ngày của shop chị nhé. Phí đổi hàng là 30.000đ tiền vận chuyển 2 chiều ạ.

Review: Đúng nguồn hiện hành:15ngày/30k, trả trong phạm vi thời hạn/phí; không cần lặp mọi điều kiện.

## b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Set Thạch Thảo có phần áo làm từ tơ Hàn thêu, họa tiết thêu nổi, form nhẹ, vải mềm thoáng và có độ bay tự nhiên; chân váy bằng ren tơ Hàn mềm, form nhẹ, có độ rũ tự nhiên chị nhé. 
> 
> Dạ hiện tại hệ thống bên em đang tạm chưa load được dữ liệu giá và tồn kho chi tiết của size M, chị đợi em kiểm tra lại rồi báo chị mức giá chính xác và tình trạng còn hàng của size này nha ạ!

Review: Trả đúng chất liệu, không bịa giá/tồn, nhưng hứa đợi kiểm tra rồi báo khi B1 chỉ có read tools, không handoff/callback. Vi phạm expected trước run. Verifier PASS không chứng minh bước theo dõi tồn tại. Lỗi owner/capability communication trong B1, chưa phải lỗi atomic handoff B2.

## b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Set váy Thạch Thảo có giá 799.000đ chị nhé. Thiết kế gồm áo tơ Hàn thêu họa tiết nổi form nhẹ và chân váy ren tơ Hàn mềm mại, có độ rũ tự nhiên. Sản phẩm hiện có sẵn các size S, M, L, XL ạ.

Review: Đúng giá799k và các size có tồn. Mô tả thêm khi chỉ hỏi giá là minor.

## b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ, áo của set Thạch Thảo size M hiện còn hàng chị nha, áo bán riêng có giá 499.000đ ạ.

Review: Đúng áo lẻ499k và M có tồn; không nhầm nguyên set.

## b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ, áo dài mã SD375 có giá theo từng phần bán như sau ạ:
> - Áo lẻ: 929.000đ
> - Cả bộ: 1.065.000đ
> 
> Mẫu này hiện có sẵn các size S, M, L chị nha.

Review: Tìm đúng SD375, giá áo929k/cả bộ1065k và các size được xác nhận; chưa dùng mã gợi ý khác thay món khách hỏi.

## b1-buying-concern

Khách: Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ set váy Thạch Thảo có giá 799.000đ, hoàn toàn vừa vặn với ngân sách 900.000đ của mình ạ. 
> 
> Chân váy sử dụng chất ren tơ Hàn mềm, form nhẹ có độ rũ tự nhiên kết hợp cùng áo tơ Hàn thêu họa tiết nổi thanh thoát. Thiết kế tạo nét bay bổng, nhẹ nhàng chứ không bị rườm rà, rất hợp để diện đi tiệc ban ngày ạ. 
> 
> Mẫu này hiện có sẵn các size S, M, L, XL.

Review: Set799k trong900k, trả nỗi lo ren theo phong cách được phép. Lời khuyên còn thiên mô tả và nhắc budget nhưng không sai dữ kiện; minor theo scope.

## b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Terminal: SEND_ELIGIBLE / PASS; B1_SEND_ELIGIBILITY_ONLY

> Dạ, chính sách đổi hàng của shop áp dụng cho sản phẩm còn mới và chưa qua sử dụng ạ. Do chị đã mặc đi làm rồi nên sản phẩm không đủ điều kiện đổi sang màu khác. Nếu sản phẩm đủ điều kiện đổi hợp lệ, phí ship 2 chiều là 30.000đ do khách chịu ạ.

Review: Đọc tình huống đã mặc đi làm rồi, kết luận không đủ điều kiện đổi trước; phí30k chỉ nêu cho hồ sơ hợp lệ. Không mở đầu bằng cho đổi rồi mới đính chính.
