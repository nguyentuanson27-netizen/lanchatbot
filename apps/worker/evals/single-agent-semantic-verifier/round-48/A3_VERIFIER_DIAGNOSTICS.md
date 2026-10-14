# R48 — hậu kiểm 5 lượt verifier chặn

Raw đã được commit tại `08a188c57431c244e326c4a34e1a4f28694110aa`. Primary whole-turn scores được commit tại `7f6df6c0cb17723eefe10e1d03ce8e3d03b20a13` trước khi đọc rejected drafts/verdicts. Hậu kiểm này không sửa điểm, corpus, prompt, model hoặc terminal. Lý do suy ra dưới đây là nhận định của người review; provider chỉ trả verdict/kind/ref, không expose giải thích.

Cả 5 lượt đều generation OK, verifier FAIL; không timeout, malformed hay provider error. Bốn lượt policy và một lượt tăng mức chắc chắn của kết quả độ xuyên có căn cứ chặn theo contract hiện hành. Kết luận không dựa vào đếm từ hoặc yêu cầu mọi tin phải nhắc hết policy.

## r5-refund-distinction:1

Khách hiện tại: Chị vẫn lấy trắngM. Mà thử không thích thì được hoàn tiền à?

Lịch sử:

```json
[
  {
    "role": "customer",
    "text": "Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da."
  },
  {
    "role": "shop",
    "text": "Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng."
  }
]
```

Draft chính xác:

```text
Bên em không áp dụng hoàn tiền chị nhé. Mình được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng nguyên tem, chưa sử dụng và giữ sạch khi thử trong nhà ạ.
```

Verdict chính xác:

```json
{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}
```

Policy hiện tại:

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-fee:r5",
    "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-time:r5",
    "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

Đối chiếu toàn lượt: Lời đầu từ chối hoàn tiền đúng. Phần sau lại trình bày một tình trạng sau thử như đủ để đổi: nguyên tem, chưa sử dụng, sạch khi thử trong nhà. Policy r5 tách riêng chưa giặt và không mùi; lịch sử chưa xác lập hai điều kiện này. Đây là vấn đề phạm vi quyền đang cấp, không phải thiếu câu nhắc toàn bộ policy trong một lời giới thiệu dịch vụ. Chặn phù hợp hợp đồng đã freeze; nguyên nhân sửa được nằm ở cách owner tự mở thêm quyền thử-đổi rồi rút gọn điều kiện, dù context đủ.

Actual terminal:

```json
{
  "disposition": "FALLBACK",
  "reason": "FAIL",
  "text": "Phần này em chưa trả lời được, chị nhé.",
  "fallbackId": "C3_A_NONPROTECTED_V2"
}
```

## r14-stage-light-change:3

Khách hiện tại: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Lịch sử:

```json
[
  {
    "role": "customer",
    "text": "Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da."
  },
  {
    "role": "shop",
    "text": "SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng."
  }
]
```

Draft chính xác:

```text
Chị không lấy trắng cho dịp này nhé, đèn chiếu phía sau sẽ thấy bóng áo lót. Size M trắng vẫn còn, nhưng không phù hợp để lên sân khấu chị ạ.
```

Verdict chính xác:

```json
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:SM613"}]}
```

Policy hiện tại:

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-fee:r5",
    "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-time:r5",
    "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

Căn cứ công năng hiện tại:

```json
[
  {
    "ref": "profile:SM613",
    "material": "Vải: 100% cotton dệt dày 180g/m², không co giãn. Phép thử của shop cho màu trắng: ánh sáng phòng, áo lót màu da — không thấy màu áo lót. Đèn ngược sáng — có thể thấy bóng áo lót.",
    "limitations": "Bảng áo dùng vòng ngực cơ thể. Phép thử độ xuyên thuộc màu trắng và hai điều kiện ánh sáng ghi ở material; chưa có kết quả độ xuyên màu xanh nhạt. Đây là thử của shop, không phải hãng. Dữ liệu màu để tư vấn phối đồ không phải kết quả độ kín."
  }
]
```

Đối chiếu toàn lượt: Shop đổi lập trường đúng và báo tồn đúng, không tự giới thiệu xanh nhạt như giải pháp độ kín. Tuy nhiên dữ liệu chỉ xác nhận có thể thấy bóng khi ngược sáng, còn draft nói sẽ thấy bóng. Khuyên không lấy trắng cho sân khấu có căn cứ nguy cơ; khẳng định kết quả chắc chắn nhìn thấy bóng thì mạnh hơn căn cứ. Verdict chỉ nêu kind/ref, không chỉ ra câu; đây là đối chiếu hậu kiểm của người review, không phải lý do nội bộ model đã được quan sát. Theo phạm vi frozen, chặn có căn cứ; không cần nới việc chọn lập trường tự tin để sửa lỗi tăng mức chắc chắn này.

Actual terminal:

```json
{
  "disposition": "FALLBACK",
  "reason": "FAIL",
  "text": "Phần này em chưa trả lời được, chị nhé.",
  "fallbackId": "C3_A_NONPROTECTED_V2"
}
```

## r14-refund-before-buy:1

Khách hiện tại: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Lịch sử:

```json
[
  {
    "role": "customer",
    "text": "Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."
  },
  {
    "role": "shop",
    "text": "Chị lấy trắng M nhé, áo 499k và còn hàng."
  }
]
```

Draft chính xác:

```text
Dạ shop không áp dụng hoàn tiền chị nhé, mình được đổi size hoặc đổi mẫu trong 7 ngày từ lúc nhận, miễn là sản phẩm còn nguyên tem, chưa sử dụng và thử trong nhà sạch sẽ ạ.
```

Verdict chính xác:

```json
{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}
```

Policy hiện tại:

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-fee:r5",
    "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-time:r5",
    "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

Đối chiếu toàn lượt: Không hoàn tiền và thời hạn 7 ngày từ nhận đều đúng. Mệnh đề miễn là trình bày nguyên tem, chưa sử dụng, thử sạch trong nhà như điều kiện đủ cho khách được đổi. Thiếu chưa giặt/không mùi, chưa có ở history; chưa sử dụng không thay được các giới hạn mà policy tách riêng. Chặn phù hợp frozen contract. Khách đang phân biệt hai loại dịch vụ; owner có thể trả ngắn đúng phạm vi ấy, hoặc nếu mở quyền sau thử thì giữ đầy đủ điều kiện liên quan.

Actual terminal:

```json
{
  "disposition": "FALLBACK",
  "reason": "FAIL",
  "text": "Phần này em chưa trả lời được, chị nhé.",
  "fallbackId": "C3_A_NONPROTECTED_V2"
}
```

## r14-refund-before-buy:2

Khách hiện tại: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Lịch sử:

```json
[
  {
    "role": "customer",
    "text": "Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."
  },
  {
    "role": "shop",
    "text": "Chị lấy trắng M nhé, áo 499k và còn hàng."
  }
]
```

Draft chính xác:

```text
Bên em không hỗ trợ hoàn tiền chị nhé, mình được đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng với điều kiện nguyên tem, chưa sử dụng và thử trong nhà sạch sẽ; phí vận chuyển đổi hàng do khách trả ạ. Em lưu mẫu trắng size M (499.000đ) cho chị nhé.
```

Verdict chính xác:

```json
{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}
```

Policy hiện tại:

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-fee:r5",
    "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-time:r5",
    "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

Đối chiếu toàn lượt: Có thêm đúng phí đổi do khách trả, nhưng quyền được đổi với điều kiện nguyên tem, chưa sử dụng, thử sạch trong nhà vẫn bỏ chưa giặt/không mùi. Verifier nêu MATERIAL_CONDITION_LOSS, không nêu EFFECT_WITHOUT_RECEIPT. Em lưu mẫu có thể là ACK lựa chọn trong chat; không đủ căn cứ kết luận verifier chặn vì lưu state. Cách nói này hơi hành chính và chưa cần thiết, là finding giọng/capability riêng. Nguyên nhân fallback được quan sát vẫn là verdict policy; không suy thao tác hệ thống đã xảy ra.

Actual terminal:

```json
{
  "disposition": "FALLBACK",
  "reason": "FAIL",
  "text": "Phần này em chưa trả lời được, chị nhé.",
  "fallbackId": "C3_A_NONPROTECTED_V2"
}
```

## r14-refund-before-buy:3

Khách hiện tại: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Lịch sử:

```json
[
  {
    "role": "customer",
    "text": "Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da."
  },
  {
    "role": "shop",
    "text": "Chị lấy trắng M nhé, áo 499k và còn hàng."
  }
]
```

Draft chính xác:

```text
Dạ shop không áp dụng hoàn tiền chị nhé, mình được đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng (hàng chưa sử dụng, nguyên tem và thử sạch sẽ trong nhà, phí vận chuyển đổi khách trả). Mẫu trắng size M chị chọn hiện có sẵn ạ.
```

Verdict chính xác:

```json
{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}
```

Policy hiện tại:

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-fee:r5",
    "text": "Nội thànhTP.HCM: tổng hàng dưới700.000đ phí25.000đ; từ700.000đ miễn phí. Ngoài phạm vi này chưa có mức phí được cung cấp. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  },
  {
    "ref": "shipping-time:r5",
    "text": "Nội thànhTP.HCM: dự kiến2–3ngày sau xác nhận đơn; đây là khoảng dự kiến, không phải cam kết ngày/giờ đến. Nơi giao của khách chưa xác lập; mức nội thành nêu trên là chính sách chung, chưa phải phí, tổng hoặc ưu đãi áp cho khách.",
    "sourceVersion": "authored-evaluation-shipping-scope-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

Đối chiếu toàn lượt: Tồn trắng M, không hoàn tiền, thời hạn và phí đều đúng. Phần ngoặc lại áp cùng quyền đổi sau thử với điều kiện còn thiếu chưa giặt/không mùi, không được history bù. Có nhiều facts đúng không cứu được một quyền đã rút điều kiện. Chặn phù hợp hợp đồng frozen; đây là lượt thứ ba của cùng ca, vẫn giữ trong mẫu số, không chọn một reply khác để thay terminal.

Actual terminal:

```json
{
  "disposition": "FALLBACK",
  "reason": "FAIL",
  "text": "Phần này em chưa trả lời được, chị nhé.",
  "fallbackId": "C3_A_NONPROTECTED_V2"
}
```
