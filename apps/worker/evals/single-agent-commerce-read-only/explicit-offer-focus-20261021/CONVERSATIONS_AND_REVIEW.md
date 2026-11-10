# Toàn bộ18 hội thoại và review

Đọc actual/history trước rejected-draft/verdict diagnosis. Không chấm keyword, bắt câu mẫu hoặc ép mua rẻ.

## r1-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ mình vẫn đổi được chị nhé, thời gian hỗ trợ đổi hàng là trong vòng 15 ngày kể từ khi nhận đơn ạ. Phí đổi hai chiều là 30.000đ chị nha.
```

**USABLE** — Trả đúng thời hạn15ngày và phí30k, thay thông tin7ngày cũ, không mời thao tác vượt khả năng.

## r1-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set váy Thạch Thảo có giá 799.000đ ạ. Ngoài ra, shop có bán lẻ áo (499.000đ) và chân váy (449.000đ) nếu chị muốn mua rời nhé ạ!
```

**NEEDS_EDIT** — Giá set799k đúng và đã đứng đầu, không hỏi lại cách mua; tuy nhiên tiếp tục đưa cả giá áo/váy không được hỏi. Có cải thiện phần mở lại lựa chọn, nhưng chưa sửa được việc tự mở bảng các cách mua.

Giọng/nội dung: Phần ngoài ra và hai giá lẻ làm lời hỏi giá đơn giản dài thêm.

## r1-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, nếu chị hay mặc đồ trơn và ngại đồ điệu quá thì set Thạch Thảo này vẫn rất vừa vặn để đi ăn cưới ban ngày mà không sợ bị lố hay quá rườm rà đâu ạ. 

Chất liệu tơ Hàn và ren tơ mềm cùng form dáng nhẹ nhàng, có độ bay và rũ tự nhiên nên lên người rất thanh thoát, nhã nhặn chứ không bị cứng nhắc hay bồng bềnh quá mức. Đi tiệc ban ngày mặc set này nhìn vừa lịch sự, sang trọng lại vừa có điểm nhấn tinh tế vừa đủ ạ.
```

**USABLE** — Đưa đề xuất giữ set cho tiệc ban ngày và giải thích vẻ ngoài nhẹ, không bồng. Đây là lời khuyên thẩm mỹ được phép; không bắt chọn áo lẻ hay đổi mẫu. Lý do vẫn mỏng với gu đồ trơn, chưa chứng minh tư vấn mạnh hơn ổn định.

Giọng/nội dung: Mở bằng nếu rồi nhắc gu; nhiều lời khen thanh thoát/nhã nhặn/lịch sự/sang trọng cùng ý.

## r2-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, đơn nhận 10 hôm thì mình vẫn đổi màu kịp chị nha, thời gian hỗ trợ đổi là trong vòng 15 ngày kể từ khi nhận hàng. Phí đổi hàng (vận chuyển 2 chiều) là 30.000đ chị nhé.
```

**USABLE** — Trả đúng còn kịp trong15ngày và30k hai chiều; không hứa lên đơn đổi.

Giọng/nội dung: Có thể bỏ phần nhắc lại đơn nhận10hôm nếu không cần làm rõ thời hạn.

## r2-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo (mã SV2447) bên em có các lựa chọn giá như sau ạ:

- **Trọn set (gồm áo và chân váy):** 799.000đ
- **Áo lẻ:** 499.000đ
- **Chân váy lẻ:** 449.000đ

Chị muốn lấy cả set hay mua rời món nào ạ?
```

**NEEDS_EDIT** — Lặp nguyên lỗi mở bảng ba giá rồi hỏi muốn cả set hay món lẻ trong khi khách đã hỏi giá set. Không phải lỗi giá hoặc bản thân danh sách.

Giọng/nội dung: Câu hỏi kết giao lại một lựa chọn khách không nhờ mở ra.

## r2-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, nếu bình thường chị hay mặc đồ trơn, set Thạch Thảo gồm áo tơ thêu nổi và chân váy ren đúng là sẽ tạo cảm giác hơi điệu so với phong cách quen thuộc của chị ạ. 

Tuy nhiên, đi ăn cưới ban ngày thì mẫu này rất hợp vì chất tơ Hàn và ren có form nhẹ, độ bay và rũ tự nhiên, tạo nét thanh lịch, nhã nhặn chứ không bị cứng nhắc hay rườm rà. Nếu chị vẫn thích vẻ đẹp của thiết kế này nhưng muốn giữ sự đơn giản, mình có thể chọn mua lẻ áo thêu để phối với quần hoặc chân váy trơn sẵn có sẽ vừa vặn và thoải mái nhất với phong cách của chị ạ.
```

**NEEDS_EDIT** — Thừa nhận set điệu so với gu khách rồi khen phù hợp tiệc và đưa áo lẻ dưới điều kiện nếu vẫn thích. Chưa chốt shop khuyên mua theo hướng nào; phần rũ/nhẹ chưa giải thích vì sao khách quen đồ trơn nên chọn nguyên bộ.

Giọng/nội dung: Mở đầu diễn giải lại lo lắng, nhiều lời khen và cấu trúc nếu/tuy nhiên.

## r3-case02 — b1-current-policy

customer: Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

Khách: Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ nhận hàng 10 ngày là vẫn trong thời hạn đổi 15 ngày của shop nên vẫn kịp chị nhé. Phí vận chuyển 2 chiều cho đơn đổi là 30.000đ ạ.
```

**USABLE** — Trả đúng còn kịp trong15ngày và30k hai chiều; không mở thêm thủ tục hoặc hứa lên đơn.

## r3-case04 — b1-price

Khách: Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

Actual: SEND_ELIGIBLE / PASS

```text
Set váy Thạch Thảo có giá 799.000đ chị nhé.
```

**USABLE** — Trả đúng giá nguyên set799k, đủ ý, không mở bảng giá lẻ hoặc hỏi lại cách mua.

## r3-case15 — b1-buying-concern-v2

Khách: Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, đi ăn cưới ban ngày thì set Thạch Thảo rất hợp vì chất tơ và ren mềm, form nhẹ và có độ bay, rũ tự nhiên nên thanh thoát, lịch sự chứ không bị nặng nề hay lồng lộn đâu chị ạ.

Nếu chị vẫn ngại diện cả set hơi điệu, mình có thể chọn mua riêng chiếc áo tơ thêu (499.000đ) để phối cùng chân váy hoặc quần trơn có sẵn. Cách này vừa giữ được điểm nhấn tinh tế từ họa tiết thêu nổi của áo, vừa đúng với phong cách gọn gàng, tối giản quen thuộc của chị.
```

**NEEDS_EDIT** — Nêu set hợp tiệc rồi chuyển sang nếu vẫn ngại thì áo lẻ, trong khi khách đã nói rõ ngại quá điệu và nhờ shop quyết định. Lý do áo họa tiết với đồ trơn đã sát gu hơn, nhưng shop vẫn chưa nói nên mua nguyên set hay chọn áo cho trường hợp này. Không fail chỉ vì có hai phương án.

Giọng/nội dung: Vẫn dùng nhiều lời khen và diễn đạt dài trước điểm phối trơn có ích.

## r1-case09 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Actual: SEND_ELIGIBLE / PASS

```text
Set này áo làm từ tơ Hàn thêu có độ thoáng và bay tự nhiên, kết hợp chân váy ren tơ Hàn mềm nhẹ nên mặc khá thoải mái và không bị quá bí, phù hợp để chị diện đi tiệc sân vườn nha chị.
```

**USABLE** — Trả thẳng nỗi lo bí bằng mô tả mềm/thoáng và nhận xét cảm giác khá thoải mái, không quá bí. Chấp nhận trong ranh giới inference thông thường, không ép phải đổi món hoặc có phép thử riêng. Tư vấn còn mỏng với việc khách ở ngoài trời lâu.

Giọng/nội dung: Mở bằng chất liệu rồi ghép nhiều đặc điểm; có thể tập trung hơn vào điều khách đang cân nhắc.

## r1-case17 — b1-changed-occasion-v3

customer: Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

shop: Đi tiệc tối mặc cả bộ đẹp chị ạ.

Khách: Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

Actual: SEND_ELIGIBLE / PASS

```text
Em khuyên chị lấy cả bộ luôn ạ. Set Thạch Thảo gồm áo thêu và chân váy ren được thiết kế đồng bộ với form nhẹ, độ bay và rũ tự nhiên, mặc lên vừa thanh lịch lại rất chỉn chu, lịch sự khi gặp khách hàng. 

Cả bộ có giá 799.000đ (nếu lấy riêng áo là 499.000đ), diện chung với nhau là chuẩn form và đẹp nhất ạ.
```

**NEEDS_EDIT** — Khuyên cả bộ nhưng lý do chỉ đồng bộ/thanh lịch/lịch sự và đẹp nhất, không giải thích vì sao nhìn gọn hơn áo phối món khác theo ưu tiên mới. Được phép chọn cả bộ; lỗi là lý do bỏ qua tiêu chí khách đang hỏi, không phải bắt buộc chọn áo lẻ.

Giọng/nội dung: Chuỗi thanh lịch/chỉn chu/lịch sự và chuẩn form đẹp nhất còn giống lời quảng cáo.

## r1-case23 — b1-buying-concern-v3

customer: Chị có sẵn chân váy đen dáng suông rồi.

Khách: Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

Actual: SEND_ELIGIBLE / PASS

```text
Chị nên mua riêng áo lẻ (499.000đ) ạ. 

Vì mình đã có sẵn chân váy đen dáng suông, chiếc áo tơ Hàn thêu nổi này kết hợp rất đẹp và dễ phối linh hoạt với chân váy hay quần sẵn có để mặc lại nhiều lần, lại vừa vặn thoải mái trong ngân sách của chị.
```

**USABLE** — Chọn áo499k tận dụng váy đen đã biết để mặc lại nhiều lần. Lựa chọn và lý do liên quan đúng nhu cầu; không ép phải upsell hoặc phải mua rẻ.

Giọng/nội dung: Cụm vừa vặn thoải mái trong ngân sách còn gượng; câu giải thích có thể ngắn hơn.

## r1-case03 — b1-partial-source

Khách: Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, set Thạch Thảo có phần áo may bằng tơ Hàn thêu với họa tiết thêu nổi, chất mềm, thoáng và có độ bay tự nhiên; chân váy làm từ ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. 

Dạ hiện tại hệ thống bên em chưa có sẵn thông tin giá và tình trạng còn hàng của size M ạ.
```

**USABLE** — Trả đúng phần chất liệu còn nguồn; giá/tồn sizeM chưa có trong nguồn của ca fault nên nói chưa có thay vì bịa hoặc hứa báo lại. Không coi nguồn thiếu là chất lượng model kém.

Giọng/nội dung: Cụm hệ thống bên em và hai lần dạ còn mang giọng hệ thống; mô tả chất liệu có thể gọn hơn mà vẫn đủ hai phần áo/váy.

## r1-case05 — b1-component-stock

Khách: Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo size M hiện còn hàng chị nhé. Áo bán riêng có giá 499.000đ ạ.
```

**USABLE** — Đúng áo lẻ sizeM còn hàng và499k, trả đủ hai câu hỏi, không mở lại lựa chọn cả set.

## r1-case06 — b1-search-read

Khách: Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

Actual: SEND_ELIGIBLE / PASS

```text
Áo dài mã SD375 có hai cách mua ạ:
- Áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn chọn mua theo mẫu áo lẻ hay lấy cả bộ ạ?
```

**USABLE** — Tìm đúng mã SD375 và báo hai cách mua áo dài với929k/1065k. Khác câu hỏi rõ nguyên set: ở đây khách mới nêu tên/mã mẫu áo dài, chưa chốt áo lẻ hay bộ, nên phân biệt hai cách mua và hỏi lại là hợp lý. Không cấm mọi bảng giá.

Giọng/nội dung: Theo mẫu áo lẻ hơi gượng, có thể dùng lấy áo hay cả bộ.

## r1-case08 — b1-policy-used

Khách: Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải chưa qua sử dụng và chưa mặc ra ngoài ạ. Do mình đã mặc đi làm rồi nên shop rất tiếc không hỗ trợ đổi sang màu khác được cho mình.

Về phí ship, nếu đổi hàng thì phí vận chuyển 2 chiều là 30.000đ do khách hàng chi trả chị nha.
```

**USABLE** — Từ chối đúng vì đã mặc đi làm; phí30k hai chiều do khách trả được trả như quy định chung theo câu hỏi, không thành lời duyệt cho đơn đã bị loại trừ.

Giọng/nội dung: Có thể nói thẳng không đổi được vì đã mặc đi làm, bỏ đoạn lặp điều kiện trước đó.

## r1-case16 — b1-policy-used-v2

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Actual: SEND_ELIGIBLE / PASS

```text
Dạ, quy định đổi size của shop yêu cầu sản phẩm chưa qua sử dụng và chỉ ướm bên ngoài, không mặc thử vào người. Do chị đã mặc thử vào người nên shop không hỗ trợ đổi size được ạ. Mong chị thông cảm giúp shop nhé!
```

**USABLE** — Từ chối đúng theo policy nguồn chỉ được ướm ngoài, không mặc vào người; việc còn tem/chưa mang ra ngoài không biến mặc thử thành hợp lệ.

Giọng/nội dung: Mở bằng quy định và kết mong thông cảm còn trang trọng, nhưng kết luận rõ và đúng tình huống.

## r1-case21 — b1-component-stock-v3

Khách: Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

Actual: SEND_ELIGIBLE / PASS

```text
Dạ áo Thạch Thảo bên em có bán lẻ chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ.
```

**USABLE** — Trả đủ có bán áo lẻ, sizeM còn và499k; không mời lên giỏ, không tự tư vấn độ vừa khi khách đã chọn size.
