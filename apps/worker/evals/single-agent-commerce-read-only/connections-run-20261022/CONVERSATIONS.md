# Hội thoại thực tế — nối tác vụ Phase B

Bốn opening + ba lượt companion; mỗi lượt một lần. Đây không phải12journeys hoàn tất. Phần dưới ghi đúng terminal/capture; draft bị chặn được đánh dấu riêng.

## sales-discovery-advice:need

Khách: Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.

Terminal: FALLBACK / OWNER_TOOL_MODE

Khách thực sự nhận:

> Phần này em chưa trả lời được, chị nhé.

## sales-product-gallery:overview

Khách: Cho chị xem ảnh set Thạch Thảo màu be nhé.

Terminal: SEND_ELIGIBLE / PASS

Khách thực sự nhận:

> Dạ set váy Thạch Thảo hiện em chưa có sẵn hình ảnh màu be ạ. Set có giá 799k (gồm áo tơ Hàn thêu nổi và chân váy ren mềm, form bay tự nhiên), chị có cần em hỗ trợ thêm thông tin gì về mẫu này không ạ?

## sales-size-advice:height-weight

Khách: Chị cao 1m58, nặng 52kg, bộ Thạch Thảo mặc size nào em? Chị thích rộng một chút.

Terminal: FALLBACK / FAIL

Khách thực sự nhận:

> Phần này em chưa trả lời được, chị nhé.

Draft bị chặn, khách không nhận:

> Dạ với chiều cao 1m58 và nặng 52kg, set Thạch Thảo với thiết kế form nhẹ, chất liệu tơ Hàn và ren mềm mại, có độ bay tự nhiên sẽ mặc rất thoải mái ạ. Vì chị thích rộng một chút nên form thiết kế này hoàn toàn đáp ứng được độ suông nhẹ, dễ chịu khi mặc nha chị.

## sales-southern-delivery:deadline

Khách: Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?

Terminal: HANDOFF / ETA_UNAVAILABLE

Khách thực sự nhận:

Không có tin được capture; handoff theo policy hiện hành.

## negotiation-cart-setup

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Terminal: SEND_ELIGIBLE / PASS

Khách thực sự nhận:

> Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước chị nhé.

Negotiation readback: `{"tier": "READY", "version": 1, "objectionEvidenceCount": 0}`.

## negotiation-price-objection

Khách: Bớt cho chị chút được không?

Terminal: SEND_ELIGIBLE / PASS

Khách thực sự nhận:

> Dạ áo Thạch Thảo giá 499.000đ là mức niêm yết của mẫu này rồi chị ạ. Nếu chị lấy thêm chân váy hoặc sản phẩm khác từ 2 món trở lên, shop sẽ có ưu đãi giảm thêm 5% cho đơn hàng của mình đó ạ.

Negotiation readback: `{"tier": "HESITANT", "version": 2, "objectionEvidenceCount": 1}`.

## negotiation-total-control

Khách: Thế một áo cả ship là bao nhiêu em?

Terminal: SEND_ELIGIBLE / PASS

Khách thực sự nhận:

> Dạ tổng thanh toán gồm cả phí ship của mình là 499.000đ chị nha (áo 499.000đ, phí ship 30.000đ và shop hỗ trợ giảm 30.000đ cho đơn của mình ạ).

Negotiation readback: `{"tier": "HESITANT", "version": 2, "objectionEvidenceCount": 1}`.

