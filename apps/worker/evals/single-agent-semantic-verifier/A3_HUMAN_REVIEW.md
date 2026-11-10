# A3 — human review of actual terminal customer outcomes

Score 0/1/2 on the ten frozen dimensions in a3-human-scores.json. No model/judge scores are synthesized.

Trusted truth and required/forbidden behavior per case are in a3-human-review.json. The packet excludes rejected drafts and verifier verdicts.

## budget:1

Customer: Chị thích kiểu này nhưng thấy giá vượt mức 800k chị tính.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị ưu tiên phom thoải mái hơn thương hiệu."}]
```

Actual terminal customer outcome:
```text
Dạ, em hiểu chị thích kiểu này nhưng muốn giữ ngân sách khoảng 800.000đ, ưu tiên phom thoải mái hơn thương hiệu. Chị muốn mẫu có kiểu dáng gần giống SQ9012, hay cũng cân nhắc kiểu khác miễn hợp ngân sách ạ?
```

## budget:2

Customer: Chị thích kiểu này nhưng thấy giá vượt mức 800k chị tính.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị ưu tiên phom thoải mái hơn thương hiệu."}]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 giá 849.000đ, cao hơn ngân sách chị tính 49.000đ và hiện cũng đang hết hàng ạ. Mình ưu tiên mức tối đa 800.000đ và phom thoải mái như chị chia sẻ nhé. Chị muốn tìm kiểu tương tự mẫu này hay sẵn sàng đổi kiểu miễn mặc thoải mái ạ?
```

## budget:3

Customer: Chị thích kiểu này nhưng thấy giá vượt mức 800k chị tính.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị ưu tiên phom thoải mái hơn thương hiệu."}]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 giá 849.000đ, cao hơn ngân sách chị dự tính 49.000đ và hiện đang hết hàng ạ. Em hiểu chị ưu tiên phom thoải mái hơn thương hiệu. Chị muốn tìm mẫu có kiểu tương tự set này hay cân nhắc kiểu khác, miễn thoải mái và trong mức 800.000đ ạ?
```

## prior-experience:1

Customer: Lần trước mặc bị khó chịu nên lần này chị ngại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ, lần trước mặc bị khó chịu thì chị ngại là dễ hiểu ạ, mình không cần vội chọn đâu chị. Chị thấy khó chịu do bí nóng, ngứa/cọ da hay bị chật ở vị trí nào ạ?

Em chưa có thông tin chất liệu và số đo của SQ9012 nên chưa thể khẳng định mẫu này sẽ thoải mái hơn cho chị. Mình làm rõ điều khiến chị khó chịu trước để biết cần kiểm tra gì khi chọn mẫu nhé.
```

## prior-experience:2

Customer: Lần trước mặc bị khó chịu nên lần này chị ngại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ, lần trước mặc khó chịu nên lần này chị ngại là dễ hiểu ạ. Chị thấy chật/cấn ở phần nào, hay chất vải gây ngứa, bí ạ?

Với SQ9012, em chưa có thông tin chất liệu và số đo để khẳng định mẫu này sẽ thoải mái hơn. Chị chia sẻ điểm khó chịu lần trước để mình biết cần kiểm tra kỹ điều gì trước khi chọn nhé.
```

## prior-experience:3

Customer: Lần trước mặc bị khó chịu nên lần này chị ngại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang cân nhắc SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ, lần trước mặc bị khó chịu thì lần này chị ngại là dễ hiểu ạ. Chị thấy khó chịu vì đồ bó/chật, chất vải cọ vào da hay ở điểm nào khác ạ?

Với set SQ9012, em chưa có thông tin chất liệu và độ vừa để khẳng định mẫu này sẽ thoải mái hơn. Chị chia sẻ thêm để mình làm rõ điều cần lưu ý trước khi chọn nhé.
```

## comparison:1

Customer: Mẫu bên kia rẻ hơn, chị nên cân nhắc thế nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn đồ mặc thường xuyên và thoải mái."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị muốn mặc thường xuyên và thoải mái thì nên cân nhắc **chất liệu, phom dáng và độ dễ chăm sóc**, chứ không chỉ nhìn giá ạ.

- Chất liệu có phù hợp thời tiết và nhu cầu mặc hằng ngày của chị không?
- Phom có thoải mái khi ngồi, đi lại và vận động không?
- Đường may, hướng dẫn giặt và chính sách đổi có rõ ràng không?

Nếu mẫu rẻ hơn vẫn đáp ứng những điểm chị cần thì đó là lựa chọn đáng cân nhắc. Hiện em chưa đủ thông tin để kết luận Set SQ9012 hay mẫu bên kia phù hợp hơn.

Bên mình hỗ trợ đổi trong 7 ngày khi sản phẩm chưa sử dụng và còn nguyên tem. Chị gửi ảnh/link mẫu bên kia cùng giá và thông tin chất liệu nếu có nhé, để mình so sánh cụ thể hơn ạ.
```

## comparison:2

Customer: Mẫu bên kia rẻ hơn, chị nên cân nhắc thế nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn đồ mặc thường xuyên và thoải mái."}]
```

Actual terminal customer outcome:
```text
Nếu chị ưu tiên **mặc thường xuyên và thoải mái**, chị nên cân nhắc thêm vài điểm ngoài giá ạ:
- **Chất liệu:** có phù hợp thời tiết và nhu cầu mặc hằng ngày của chị không.
- **Phom và số đo:** có đủ rộng để ngồi, đi lại thoải mái không.
- **Cách chăm sóc:** có dễ giặt, phù hợp dùng thường xuyên không.
- **Điều kiện đổi:** nếu nhận về không phù hợp thì có được đổi không.

Mẫu rẻ hơn vẫn đáng chọn nếu đáp ứng những điểm chị cần; giá cao hơn chưa đủ để kết luận tốt hơn. Em chưa có thông tin mẫu bên kia nên chưa thể so sánh cụ thể với set SQ9012. Chị gửi ảnh, giá và mô tả chất liệu của mẫu đó, em giúp chị đối chiếu những thông tin có sẵn nhé.
```

## comparison:3

Customer: Mẫu bên kia rẻ hơn, chị nên cân nhắc thế nào?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị muốn đồ mặc thường xuyên và thoải mái."}]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị muốn mặc thường xuyên và thoải mái thì nên cân nhắc **độ phù hợp trước, giá sau**:
- Chất liệu có phù hợp thời tiết, dễ giặt và bảo quản không.
- Phom và số đo có giúp chị ngồi, đi lại thoải mái không.
- Tổng tiền sau phí vận chuyển và điều kiện đổi hàng.

Nếu hai mẫu tương đương ở những điểm này thì chọn mẫu rẻ hơn là hợp lý chị nhé. Em chưa có đủ thông tin để khẳng định mẫu nào đáng mua hơn.

Bên em hỗ trợ đổi trong 7 ngày khi sản phẩm chưa sử dụng và còn nguyên tem. Chị gửi em ảnh, giá và thông tin chất liệu/số đo mẫu bên kia để mình có cơ sở so sánh nhé.
```

## price-stock-eta:1

Customer: Giá bao nhiêu, còn hàng không và bao lâu nhận?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Set SQ9012 giá 849.000đ, hiện đang hết hàng bạn nhé. Mình chưa có thông tin ngày hàng về lại và thời gian giao nên chưa thể xác nhận bao lâu bạn sẽ nhận được.

Bạn có muốn tham khảo mẫu khác không ạ?
```

## price-stock-eta:2

Customer: Giá bao nhiêu, còn hàng không và bao lâu nhận?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, hiện em chưa có thông tin được xác nhận để báo chính xác giá và tình trạng còn hàng của set SQ9012. Thời gian nhận hàng cũng chưa xác định.

Anh/chị muốn nhận hàng ở tỉnh/thành và quận/huyện nào ạ? Thông tin này cần có khi kiểm tra thời gian giao dự kiến.
```

## price-stock-eta:3

Customer: Giá bao nhiêu, còn hàng không và bao lâu nhận?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 có giá **849.000đ**, hiện **đã hết hàng** ạ. Em chưa có thông tin ngày có hàng lại và thời gian giao nên chưa thể xác nhận bao lâu mình nhận được.

Anh/chị có muốn tham khảo mẫu khác không ạ?
```

## policy-price-shipping:1

Customer: Giá này bao gồm ship chưa, đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em chưa có thông tin xác nhận giá set SQ9012 đã bao gồm phí ship hay chưa ạ.

Shop hỗ trợ đổi trong **7 ngày**, khi sản phẩm **chưa sử dụng và còn nguyên tem**. Về thủ tục gửi đổi và phí vận chuyển khi đổi, em chưa có hướng dẫn cụ thể.

Anh/chị nên xác nhận thêm với shop về phí ship đến khu vực nhận hàng và cách gửi đổi trước khi đặt nhé.
```

## policy-price-shipping:2

Customer: Giá này bao gồm ship chưa, đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, với set SQ9012, em chưa có thông tin xác nhận giá đã bao gồm phí ship hay chưa ạ.

Shop hỗ trợ đổi trong **7 ngày** khi sản phẩm **chưa sử dụng và còn nguyên tem**.

Anh/chị dự định nhận hàng ở tỉnh/thành nào ạ?
```

## policy-price-shipping:3

Customer: Giá này bao gồm ship chưa, đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em chưa có thông tin xác nhận giá set SQ9012 đã bao gồm phí ship hay chưa, nên chưa thể chốt tổng tiền ạ.

Shop hỗ trợ đổi trong **7 ngày** khi sản phẩm **chưa sử dụng và còn nguyên tem**. Em chưa có hướng dẫn cụ thể về cách gửi hàng đổi hoặc phí đổi; mình vui lòng xác nhận thêm với shop trước khi gửi lại hàng nhé.
```

## size-stock:1

Customer: Có màu đen size M không, chị 58kg mặc được không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60."}]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 hiện đã hết hàng nên chưa có màu đen size M để chị đặt ạ.

Chị cao 1m60, nặng 58kg, nhưng em chưa có bảng size của mẫu này nên chưa thể xác nhận size M có vừa chị không. Chị cho em xin thêm số đo ngực, eo và mông nhé; cần đối chiếu với bảng size của mẫu để tư vấn chính xác hơn ạ.
```

## size-stock:2

Customer: Có màu đen size M không, chị 58kg mặc được không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60."}]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 hiện hết hàng nên chưa có màu đen size M để chị đặt ạ.

Với chiều cao 1m60 và cân nặng 58kg, em chưa thể xác nhận chị mặc vừa size M vì chưa có bảng số đo của mẫu. Chị cho em thêm số đo ngực, eo, mông nhé; cần đối chiếu với bảng size để tư vấn chính xác hơn ạ.
```

## size-stock:3

Customer: Có màu đen size M không, chị 58kg mặc được không?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60."}]
```

Actual terminal customer outcome:
```text
Dạ, theo thông tin tồn kho hiện có, set SQ9012 đang hết hàng nên hiện chưa có màu đen size M để đặt ạ.

Với chiều cao 1m60 và cân nặng 58kg, em chưa thể khẳng định chị mặc vừa size M vì chưa có bảng số đo của mẫu này. Chị cho em xin thêm số đo ngực, eo, mông nhé; cần đối chiếu với bảng size của mẫu để tư vấn chính xác hơn ạ.
```

## weight-correction:1

Customer: Em sửa lại nhé, chị 58kg chứ không phải 48kg, vậy tư vấn size sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60 nặng 48kg."}]
```

Actual terminal customer outcome:
```text
Dạ, em sửa lại thông tin: chị cao 1m60, nặng **58kg**, không phải 48kg nhé.

Với Set SQ9012, em chưa có bảng size nên chưa thể tư vấn chính xác size chỉ dựa vào chiều cao và cân nặng. Chị cho em thêm số đo vòng ngực, eo, mông và chị thích mặc ôm hay thoải mái nhé. Mình cần đối chiếu với bảng size của mẫu trước khi chốt để tránh chọn nhầm ạ.
```

## weight-correction:2

Customer: Em sửa lại nhé, chị 58kg chứ không phải 48kg, vậy tư vấn size sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60 nặng 48kg."}]
```

Actual terminal customer outcome:
```text
Dạ, em sửa lại thông tin: chị cao 1m60, nặng **58kg**, không phải 48kg nhé. Em chưa có bảng size của set SQ9012 nên chưa thể chốt size chính xác chỉ dựa vào chiều cao và cân nặng. Chị cho em thêm số đo ngực, eo, mông (cm) nhé; cần đối chiếu với bảng size của mẫu trước khi chọn ạ.

Set SQ9012 hiện đang hết hàng, em báo chị biết thêm nhé.
```

## weight-correction:3

Customer: Em sửa lại nhé, chị 58kg chứ không phải 48kg, vậy tư vấn size sao?

Accepted dialogue:
```json
[{"role":"customer","text":"Chị cao 1m60 nặng 48kg."}]
```

Actual terminal customer outcome:
```text
Dạ, em ghi nhận lại chị cao 1m60, nặng **58kg**, không phải 48kg nhé. Với set SQ9012, em chưa có bảng size nên chưa thể xác định size phù hợp chỉ từ chiều cao và cân nặng.

Chị cho em thêm số đo **ngực–eo–mông** và muốn mặc vừa người hay rộng thoải mái nhé. Các số đo này cần được đối chiếu với bảng size của mẫu trước khi chốt size ạ.
```

## referent:1

Customer: Ý chị là mẫu SQ9012 lúc nãy, không phải mẫu bên kia.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị vừa so với một mẫu ở shop khác."}]
```

Actual terminal customer outcome:
```text
Dạ, em hiểu rồi ạ, chị đang nói đến set SQ9012 lúc nãy, không phải mẫu bên kia. Chị muốn hỏi thêm thông tin gì về SQ9012 ạ?
```

## referent:2

Customer: Ý chị là mẫu SQ9012 lúc nãy, không phải mẫu bên kia.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị vừa so với một mẫu ở shop khác."}]
```

Actual terminal customer outcome:
```text
Dạ, em hiểu rồi ạ, chị đang nói đến set SQ9012 lúc nãy, không phải mẫu ở shop khác. Chị muốn hỏi thêm thông tin nào về set này ạ?
```

## referent:3

Customer: Ý chị là mẫu SQ9012 lúc nãy, không phải mẫu bên kia.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị vừa so với một mẫu ở shop khác."}]
```

Actual terminal customer outcome:
```text
Dạ, em hiểu rồi ạ — chị đang nói đến set SQ9012 lúc nãy, không phải mẫu ở shop khác. Chị muốn hỏi thêm thông tin gì về set này ạ?
```

## defer:1

Customer: Chị chưa chốt đâu, để cuối tuần chị xem lại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, chị cứ cân nhắc thêm ạ. Cuối tuần khi muốn xem lại set SQ9012, chị nhắn em nhé.
```

## defer:2

Customer: Chị chưa chốt đâu, để cuối tuần chị xem lại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, chị cứ cân nhắc thêm nhé. Cuối tuần muốn xem lại set SQ9012, chị nhắn em ạ.
```

## defer:3

Customer: Chị chưa chốt đâu, để cuối tuần chị xem lại.

Accepted dialogue:
```json
[{"role":"customer","text":"Chị đang xem SQ9012."}]
```

Actual terminal customer outcome:
```text
Dạ vâng chị, chị cứ cân nhắc thêm ạ. Cuối tuần khi muốn xem lại set SQ9012, chị nhắn em nhé.
```

## unknown-referent:1

Customer: Lấy mẫu thứ hai lúc nãy, nhưng chưa đặt nhé.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, chưa đặt hàng nhé. Bạn gửi lại ảnh hoặc mã của mẫu thứ hai lúc nãy giúp mình để xác định đúng mẫu ạ.
```

## unknown-referent:2

Customer: Lấy mẫu thứ hai lúc nãy, nhưng chưa đặt nhé.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, mình chỉ xác nhận mẫu, chưa chốt đơn nhé. Bạn gửi lại ảnh hoặc mã của “mẫu thứ hai” giúp mình, vì mình chưa xác định được bạn đang nhắc đến mẫu nào ạ.
```

## unknown-referent:3

Customer: Lấy mẫu thứ hai lúc nãy, nhưng chưa đặt nhé.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, chỉ chọn mẫu, chưa đặt hàng nhé. Bạn gửi lại ảnh hoặc mã của mẫu thứ hai lúc nãy để mình xác định đúng mẫu bạn muốn chọn ạ.
```

## exchange-used:1

Customer: Chị mặc đi làm thử hai hôm rồi đổi được chứ?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị đã mặc đi làm hai hôm thì không đáp ứng điều kiện đổi ạ. Chính sách hỗ trợ đổi trong 7 ngày chỉ áp dụng khi sản phẩm **chưa sử dụng và còn nguyên tem**. Nếu chị đang cân nhắc đổi, chị nên giữ sản phẩm chưa sử dụng, nguyên tem và đề nghị đổi trong thời hạn này nhé.
```

## exchange-used:2

Customer: Chị mặc đi làm thử hai hôm rồi đổi được chứ?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị mặc đi làm hai hôm rồi thì không đáp ứng điều kiện đổi ạ. Shop hỗ trợ đổi trong 7 ngày khi sản phẩm **chưa sử dụng và còn nguyên tem**. Nếu cần đổi, chị nên giữ nguyên tem và chưa sử dụng sản phẩm nhé.
```

## exchange-used:3

Customer: Chị mặc đi làm thử hai hôm rồi đổi được chứ?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, nếu chị mặc đi làm hai hôm rồi thì không đáp ứng điều kiện đổi ạ. Shop hỗ trợ đổi trong 7 ngày khi sản phẩm **chưa sử dụng và còn nguyên tem**, nên chị cần kiểm tra sản phẩm trước khi sử dụng nhé.
```

## exchange-window:1

Customer: Sau một tháng chưa dùng và còn tem thì đổi được không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, chính sách hỗ trợ đổi trong 7 ngày khi sản phẩm chưa sử dụng và còn nguyên tem. Sau một tháng thì đã ngoài thời hạn này, nên em chưa thể xác nhận được đổi dù sản phẩm chưa dùng và còn tem. Anh/chị có thể liên hệ shop kèm thông tin đơn hàng để hỏi xem trường hợp của mình có được xem xét riêng không ạ.
```

## exchange-window:2

Customer: Sau một tháng chưa dùng và còn tem thì đổi được không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi trong **7 ngày** khi sản phẩm chưa sử dụng và còn nguyên tem. Sau một tháng thì đã quá thời hạn hỗ trợ đổi theo chính sách, dù sản phẩm chưa dùng và vẫn còn tem ạ.
```

## exchange-window:3

Customer: Sau một tháng chưa dùng và còn tem thì đổi được không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi trong **7 ngày** khi sản phẩm chưa sử dụng và còn nguyên tem. Sau một tháng thì đã quá thời hạn đổi theo chính sách, dù sản phẩm vẫn chưa dùng và còn tem ạ.
```

## exchange-all:1

Customer: Chưa dùng, nguyên tem và trong 7 ngày thì đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi trong **7 ngày** khi sản phẩm chưa sử dụng và còn nguyên tem ạ.

Em chưa có thông tin cụ thể về cách gửi hàng đổi hoặc phí phát sinh nên chưa thể hướng dẫn chính xác phần này. Anh/chị cho em xin mã đơn hàng và cho biết muốn đổi sang mẫu hay size nào nhé?
```

## exchange-all:2

Customer: Chưa dùng, nguyên tem và trong 7 ngày thì đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Shop hỗ trợ đổi trong 7 ngày khi sản phẩm chưa sử dụng và còn nguyên tem ạ.

Anh/chị cho em xin mã đơn hàng và muốn đổi sang mẫu/size nào nhé. Hiện em chưa có thông tin cụ thể về thủ tục gửi hàng đổi và phí liên quan, nên chưa thể hướng dẫn chính xác các bước này ạ.
```

## exchange-all:3

Customer: Chưa dùng, nguyên tem và trong 7 ngày thì đổi thế nào?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, shop hỗ trợ đổi trong 7 ngày khi sản phẩm chưa sử dụng và còn nguyên tem. Nếu sản phẩm của anh/chị đáp ứng các điều kiện này thì thuộc trường hợp được hỗ trợ đổi ạ.

Em chưa có hướng dẫn cụ thể về cách gửi lại hàng hoặc phí đổi nên chưa thể xác nhận các bước đó. Anh/chị cho em biết mã đơn, sản phẩm cần đổi và muốn đổi sang mẫu hay size nào nhé?
```

## simple-price:1

Customer: SQ9012 giá bao nhiêu?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 giá 849.000đ. Hiện mẫu này đang hết hàng ạ.
```

## simple-price:2

Customer: SQ9012 giá bao nhiêu?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em chưa thể xác nhận giá hiện tại của set SQ9012. Anh/chị vui lòng hỏi trực tiếp shop để có giá chính xác trước khi đặt ạ.
```

## simple-price:3

Customer: SQ9012 giá bao nhiêu?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em chưa thể xác nhận giá hiện tại của set SQ9012. Anh/chị vui lòng hỏi nhân viên shop để được báo giá chính xác trước khi đặt nhé.
```

## simple-stock:1

Customer: SQ9012 còn hàng không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 hiện đã hết hàng ạ.
```

## simple-stock:2

Customer: SQ9012 còn hàng không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, set SQ9012 hiện đã hết hàng ạ. Bạn có muốn tham khảo mẫu khác không ạ?
```

## simple-stock:3

Customer: SQ9012 còn hàng không?

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em chưa thể xác nhận Set SQ9012 còn hàng hay không. Bạn vui lòng liên hệ trực tiếp shop để kiểm tra tồn kho hiện tại nhé.
```

## simple-ack:1

Customer: Cảm ơn em, chị hiểu rồi.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị ạ. Chị cần hỗ trợ thêm thì cứ nhắn em nhé!
```

## simple-ack:2

Customer: Cảm ơn em, chị hiểu rồi.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị ạ. Chị cần hỗ trợ thêm thì cứ nhắn em nhé!
```

## simple-ack:3

Customer: Cảm ơn em, chị hiểu rồi.

Accepted dialogue:
```json
[]
```

Actual terminal customer outcome:
```text
Dạ, em cảm ơn chị ạ. Chị cần hỗ trợ thêm thì nhắn em nhé!
```
