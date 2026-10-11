# Round14 — các lượt không đạt

Score actual terminal outcome. Rejected candidate is diagnosis only. Markdown line-end display whitespace normalized; exact raw text retained. Internal verifier explanation unknown beyond codes/refs.

## r5-competitor-price

Khách thích navy, cần lý do có nên bỏ thêm129k cho việc mặc đi làm. Actual terminal chỉ là lời chờ nhân viên, không trả quyết định hoặc giá trị hàng shop dù dữ kiện đủ: FAIL toàn lượt. Candidate không được khách nhận có giữ phom suốt ngày/không tốn công là lượt bên cạnh lợi ích thiết kế; verifier trả POLICY_OR_BENEFIT_STRENGTHENING/profile:ST411. Phép thử chỉ ít nhăn tương đối, không đo giữ phom hay công là; đây là đối chiếu phạm vi, không biết lý do nội bộ verifier hoặc coi mọi inference thoải mái là sai. Không cộng điểm cho câu mở Đáng bị chặn.

**Candidate khách không nhận:**

```text
Đáng chị nhé. Với nhu cầu mặc đi làm thường xuyên, chất vải pha polyester và viscose của set ít nhăn hơn linen, giúp giữ phom gọn gàng suốt ngày dài mà không tốn công là lượt. Thêm vào đó, thiết kế quần suông lưng chun thoải mái khi ngồi làm việc lâu và khả năng tách rời phối đồ linh hoạt sẽ tiện dụng hơn rất nhiều.
```

**Captured verifier/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"POLICY_OR_BENEFIT_STRENGTHENING\",\"protectedRef\":\"profile:ST411\"}]}"
```

## r5-white-opacity

Khách đã xác lập phòng họp/áo lót màu da và cung cấp ngực, muốn chọn trắng. Owner generation lỗi VERTEX_GENERATION_HTTP, không có candidate/verifier; actual frozen fallback không trả chọn trắng/size hoặc xử lý độ xuyên dù context đủ. FAIL chất lượng kết quả khách nhận, giữ nguyên attempt trong denominator. Không suy đây là owner không hiểu hoặc đánh giá giọng một câu tư vấn chưa được sinh; factual/actionSafety2 của fallback không cứu tính hữu ích.

**Candidate khách không nhận:**

```text
[generation failed]
```

**Captured verifier/error:**

```json
"VERTEX_GENERATION_HTTP"
```

## r5-delivery-timing

Khách cần biết có chắc kịp sáng thứ Sáu và nên làm gì nếu không chắc. Reply giữ đúng ETA dự kiến, khuyên chuẩn bị đồ dự phòng và đã bỏ hứa lên đơn/kho gửi sớm không có capability. Nội dung và bước dự phòng đủ phục vụ việc hỏi, không bắt buộc thêm checkout hoặc bịa giao nhanh. Nhưng toàn câu lặp ý không cam kết, dùng lời báo cáo cố định ngày giờ/cần tuyệt đối/rủi ro thay giọng nhắn tin; chuỗi phủ định/điều kiện làm câu dè dặt và cứng. FAIL naturalness1 theo bar đã preregister, các chiều quyết định vẫn2; không đổ lỗi việc ETA có giới hạn.

## r5-budget-correction

Khách hạ ngân sách550k cả ship và nhờ chọn món để đổi cách mặc với navy. Reply chọn SM613 đúng, tổng524k và hỏi đúng vòng ngực; không bắt chọn màu khi chỉ nhờ món, không tạo hiệu ứng. Tuy nhiên câu mở ghép lựa chọn với ba thành phần tính giá trong ngoặc rồi mới tới phối đồ, khiến mạch tư vấn giống đọc báo giá và nặng hơn việc khách cần là món nào/tổng có vừa tiền. FAIL naturalness1 theo chuẩn lời shop nhắn gọn đã freeze; các chiều lựa chọn/context/next vẫn2. Đây là judgment whole voice, không keyword hoặc bắt giống reference; owner có thể phản biện mức materiality.

## r5-exchange-cost

Khách hỏi ai chịu phí đổi và muốn tin vào chọn size. Actual fallback không trả phí hoặc xử lý lo lắng nên FAIL. Candidate đọc lại khoảng cơ thể trong bảng, trấn an không lo phải đổi rồi áp miễnship nội thành cho đơn mình dù chưa có nơi nhận. Verifier trả MATERIAL_CONDITION_LOSS/shipping-fee:r5; đối chiếu thấy entitlement cá nhân có điều kiện địa điểm chưa bind, khác giới thiệu chính sách chung. Code M được phép tự tin nhưng không chứng minh không bao giờ phải đổi. Những lỗi candidate là chẩn đoán, không điểm khách nhận; không khẳng định biết đầy đủ lý do nội bộ verifier.

**Candidate khách không nhận:**

```text
Phí đổi hàng bên em khách chịu chị ạ. Nhưng chị yên tâm chọn size M, vì số đo của chị chuẩn khít với khoảng cơ thể size M (ngực 88–94, eo 70–76, mông 92–98) nên mặc vừa đẹp luôn, không lo phải đổi đâu chị nha. Thêm nữa đơn 749k của mình được miễn phí ship nội thành luôn ạ.
```

**Captured verifier/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"shipping-fee:r5\"}]}"
```

## r5-shipping-threshold

Khách có quần đen và không muốn mua thừa, hỏi có nên thêm chỉ để freeship. Reply đã khuyên không, giải thích bỏ459k để tiết kiệm25k không hợp nhu cầu, rồi chốt lấy riêng áo: các chiều quyết định/khách hàng2, khác lỗi upsell trái ưu tiên Round13. Nhưng đoạn giữa lại giới thiệu navy và vòng về nếu tủ đồ đủ sau khi đã đủ cơ sở khuyên không; cả lời đáp bị chen một pitch không phục vụ việc hỏi. FAIL naturalness1 theo preregistered removal of irrelevant sales additions, không coi đây là giá sai hoặc decisionSupport0. Primary judgment về distraction, owner có thể phản biện materiality.

## r7-price-ready-fit

Khách cần lý do chọn shop so620k và chọn size với số đo đủ. Actual fallback mất cả lý do mua và M nên FAIL. Candidate có M đúng code nhưng tự cho miễnship chỉ vì đơn trên700k khi chưa xác lập destination; verifier trả MATERIAL_CONDITION_LOSS/shipping-fee:r5. Đây là áp quyền lợi cho đơn khách, không yêu cầu mọi policy summary phải liệt kê. Candidate còn dùng giữ phom suốt ngày ngoài phép thử tương đối; chỉ chẩn đoán, không coi candidate như đã gửi hoặc gán thêm rationale cho verdict.

**Candidate khách không nhận:**

```text
Chị lấy size M là vừa chuẩn ạ. Set bên em có chất liệu 65% polyester và viscose ít nhăn, giữ phom gọn gàng suốt ngày dài đi làm, kết hợp quần lưng chun êm ái không cấn eo, lại được miễn phí vận chuyển vì đơn trên 700k ạ.
```

**Captured verifier/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"shipping-fee:r5\"}]}"
```

## r7-opacity-context-change

Khách đổi từ phòng họp sang đèn ngược, vẫn ưu tiên tránh bóng áo lót và hỏi còn trắng M. Reply giữ đúng rủi ro mới/tồn và nói gọn nhưng dừng ở facts; thiếu hướng tư vấn có nên giữ trắng cho yêu cầu đã biết. FAIL usefulness/decisionSupport/nextStep1: khách vẫn phải tự giải quyết lựa chọn shop vừa khuyên trước khi context đổi. Không yêu cầu bịa màu khác kín hơn hoặc một CTA; bản thân giọng ở đây2, factual/actionSafety2.

## r12-pants-known-waist

Khách đã có eo74 và hỏi tổng/đủ chọn size chưa. Owner generation lỗi VERTEX_GENERATION_HTTP, không có draft hoặc verifier; actual fallback không trả484k hoặc hỏi mông nên FAIL. Dữ liệu bảng/code-fit absence đủ, nhưng run không quan sát được lời owner cho ca này nên không tuyên bố lỗi chọn M trước mông đã sửa hoặc còn tái diễn. Giữ error attempt trong denominator, safety của fallback không cứu chất lượng.

**Candidate khách không nhận:**

```text
[generation failed]
```

**Captured verifier/error:**

```json
"VERTEX_GENERATION_HTTP"
```

## r12-change-color-only

Khách đổi màu sang xanh, hỏi vẫn M và giá. Reply trả M/tồn499k đúng rồi lại giải thích M với ngực92 và phối navy; cả đoạn thứ hai lặp điều đã xác nhận thành đối chiếu cơ thể. Khách hỏi xác nhận size sau đổi màu, không cần đọc số đo để chứng minh fit hoặc giới thiệu lại cách phối họ đã chọn. FAIL naturalness1 vì whole-turn redundancy/recital có ảnh hưởng theo yêu cầu mới; understanding/fit/decision/next2, không coi tự tin là lỗi. Không dùng một từ ngực làm detector, xét quan hệ câu đầu đã xong việc và câu sau thêm gì.

## r14-price-repeat-wear

Khách nhờ lý do chọn shop/chọn size để dùng thường xuyên và tách phối. Actual fallback không giúp quyết định hoặc trả M nên FAIL. Candidate tự nói đơn đã được miễn phí ship nội thành rồi dùng điều đó giải thích chênh giá nhỏ, trong khi nơi nhận chưa xác lập và không có quote admission; không có chi phí đối thủ để so tổng. Verdict EFFECT_WITHOUT_RECEIPT/shipping-fee:r5 được giữ đúng raw; phân loại effect versus entitlement có thể cần review, nội bộ lý do unknown. Có vấn đề independently về áp freeship chưa bind; không coi mọi chính sách ngắn cần receipt hoặc chấm candidate như sent.

**Candidate khách không nhận:**

```text
Chị lấy size M nhé ạ. Mức chênh lệch rất xứng đáng vì đơn hàng của chị đã được miễn phí ship nội thành, tính ra chi phí thực tế rất nhỏ. Thêm nữa, chất vải pha ít nhăn hơn linen giúp chị mặc đi làm cả ngày luôn giữ được nét gọn gàng, lại dễ tách rời áo hoặc quần để phối linh hoạt với các món sẵn có ở nhà.
```

**Captured verifier/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"EFFECT_WITHOUT_RECEIPT\",\"protectedRef\":\"shipping-fee:r5\"}]}"
```

## r14-stage-light-change

Khách đổi lên sân khấu có đèn sau, muốn tránh bóng áo lót và hỏi có nên trắng/tồn. Actual fallback mất lời khuyên và tồn nên FAIL. Candidate có hướng không chọn trắng nhưng rồi đề xuất xanh nhạt M để đáp ứng tránh bóng; trusted chỉ có thử độ xuyên màu trắng, không có chứng cứ xanh kín hơn dưới đèn đó. Verifier UNSUPPORTED_PROTECTED_ASSERTION/profile:SM613 chặn implication opacity đúng owning risk; phong cách màu được phép nhưng không thay opacity evidence. Không cộng điểm cho phần đầu candidate đúng hoặc bắt phải bịa món thay thế để có nextStep.

**Candidate khách không nhận:**

```text
Dạ chị không nên lấy màu trắng ạ, vì lên sân khấu có đèn phía sau sẽ dễ bị thấy bóng áo lót. Trắng M bên em vẫn còn, nhưng để đáp ứng đúng nhu cầu tránh lộ bóng của chị thì chuyển sang màu xanh nhạt (size M) sẽ phù hợp hơn ạ.
```

**Captured verifier/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:SM613\"}]}"
```

## r14-refund-before-buy

Khách development mới hỏi refund versus đổi mẫu trước mua. Reply trả đúng no refund/đổi7ngày với unused/tem, đủ để hiểu policy; không cần liệt kê toàn bộ conditions. Nhưng tiếp tục nhắc trắng M499k/còn hàng để gửi dù món/tồn đã rõ và câu hỏi chỉ về quyền, làm cả lời chuyển sang một sales closing không xử lý thêm băn khoăn. FAIL naturalness1 cho đoạn nối lặp/lạc mục đích theo protocol freeze; không khẳng định đã gửi/đổi hoặc gán receipt failure cho câu purpose còn sẵn để gửi. Formal safety/decision2, judgment materiality có thể được owner phản biện.
