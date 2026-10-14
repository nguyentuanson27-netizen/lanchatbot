# Round32 — A2 observed failures

All122registered slots remain in denominator;unexecuted is not an observed rejection. Kind/ref verdict doesnot expose exact offending span/internalreason.

## r26-policy-introduction-safe — SAFE

Customer: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Accepted history: `[{"role":"customer","text":"Chị muốn SM613 trắng đi họp, ngực92cm. Chị mặc áo lót màu da."},{"role":"shop","text":"Em chọntrắngM,499k chị nhé. Ánhsángphòng vớiáolót màuda khôngthấy màu; ngược sáng cóthể thấybóng."}]`

Exact draft: Shop không hoàn tiền chị nhé; mình có thể đổi size hoặc mẫu trong 7 ngày, hàng chưa dùng và còn tem. Chị thử trong nhà, phí vận chuyển đổi chị trả giúp em.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r26-policy-washed-safe — SAFE

Customer: Chị nhận váy được 5 ngày, còn tem và chỉ thử ở nhà nhưng đã giặt một lần. Giờ đổi mẫu khác được không em?

Accepted history: `[{"role":"customer","text":"Chị đang cân nhắc VA512 đen L, lo thử lên không thích."},{"role":"shop","text":"Shop đổi size hoặc mẫu trong 7 ngày; hàng chưa dùng và nguyên tem. Khách trả phí vận chuyển đổi."}]`

Exact draft: Váy đã giặt rồi thì shop không nhận đổi mẫu chị nhé, dù còn tem và mới nhận 5 ngày.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r26-operation-future-safe — SAFE

Customer: Ừ lấy xanh M nhé em, giá có đổi không?

Accepted history: `[{"role":"customer","text":"Chị chọn SM613 trắng, ngực92cm."},{"role":"shop","text":"Em chọn trắng size M,499k chị nhé."},{"role":"customer","text":"Chị đổi xanh nhạt để mặc với quần navy ở nhà nhé."}]`

Exact draft: Dạ, xanh nhạt M vẫn 499k chị nhé. Em sẽ lưu lựa chọn này vào hệ thống ở bước sau; hiện chưa tạo đơn hay giữ hàng.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r27-design-comfort-safe — SAFE

Customer: Chị đang xem các mẫu này.

Accepted history: `[]`

Exact draft: Em chọn M cho chị. Quần ống suông, lưng chun, ngồi làm việc dễ chịu.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r27-local-garment-safe — SAFE

Customer: Eo chị 76cm. Váy AR402 size M với L có số đo eo thế nào, chị nên cân nhắc size nào?

Accepted history: `[]`

Exact draft: Eo váy M74cm, L78cm. Với eo76cm mình có thể cân nhắc L; đây mới là đối chiếu eo, chưa chốt vừa toàn bộ.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r32-advisory-care-safe — SAFE

Customer: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Accepted history: `[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]`

Exact draft: Dạ rất đáng chị ạ. Set này dùng chất liệu ít nhăn hơn linen, giúp chị giữ vẻ ngoài phẳng phiu, lịch sự suốt cả ngày làm việc mà không tốn công là ủi. Áo dáng rộng cùng quần chun suông cũng mang lại cảm giác thoải mái và tiện lợi để chị mặc đi làm thường xuyên.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`

## r32-advisory-shape-safe — SAFE

Customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Accepted history: `[{"role":"customer","text":"Chị thích set ST411 navy, nhưng749k hơi cao."},{"role":"shop","text":"Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối."}]`

Exact draft: Dạ, chị lấy size M nhé ạ. Set ST411 có thiết kế áo dáng rộng kết hợp quần ống suông lưng chun toàn vòng, giúp chị thoải mái khi ngồi làm việc suốt cả ngày. Chất liệu ít nhăn giúp giữ phom gọn gàng, lịch sự để chị mặc đi làm thường xuyên rất tiện và bền dáng. Màu navy nhà em hiện còn sẵn size M cho chị nhé.

Terminal: `{"disposition":"FALLBACK","reason":"PROVIDER_ERROR","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider verdict/status: `PROVIDER_ERROR`
