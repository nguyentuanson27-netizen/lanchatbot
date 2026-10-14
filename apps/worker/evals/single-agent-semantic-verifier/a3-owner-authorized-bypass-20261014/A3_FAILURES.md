# A3 diagnostic — failed actual terminal outcomes

Primary38/42PASS. A2FAIL remains; no rescore/repair/retry. Owner drafts and verifier diagnostics below read only after primary commit. Three fallback drafts were not sent; the opacity draft was SEND_ELIGIBLE and equals the customer outcome.

## r5-referent-navy:1 — FAIL

Khách: Ừ, mẫu đó còn M thì chị lấy M nhé.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị đang xem set ST411 be với quần QU714 navy."
  },
  {
    "role": "shop",
    "text": "Set 749k, quần bán riêng459k chị nhé."
  },
  {
    "role": "customer",
    "text": "Chị lấy riêng quần navy thôi, áo có rồi. Eo74, mông 98cm."
  },
  {
    "role": "shop",
    "text": "Dạ, quần QU714 navy size M theo số đo của chị nhé."
  }
]
~~~

Kết quả thực tế (FALLBACK):
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Nhận xét toàn lượt: Khách đã thống nhất quầnnavyM và chỉ cần xác nhận tồn/lựa chọn; kết quả thực nhận là câu chưa trả lời được. Không nhận được phần đã xác minh hay bước xác nhận hữu ích dù nguồn đủ. Fallback an toàn, dễ hiểu; chấm đúng câu thực nhận, chưa xem candidate hoặc verdict.

Điểm10chiều:
~~~json
{
  "understanding": 0,
  "explicitNeedCompleteness": 0,
  "contextCorrectionUse": 0,
  "usefulness": 0,
  "decisionSupport": 0,
  "partialAnswerBehavior": 0,
  "nextStep": 0,
  "coherence": 1,
  "naturalness": 2,
  "factualActionSafety": 2
}
~~~

Owner draft (JSON exact text):
~~~json
"Dạ, mình lấy quần navy size M nhé chị."
~~~

Verifier:
~~~json
null
~~~

Verifier transport status: PROVIDER_ERROR; terminal reason: PROVIDER_ERROR

## r5-simple-price:1 — FAIL

Khách: Sơ mi SM613 giá bao nhiêu em?

Lịch sử:
~~~json
[]
~~~

Kết quả thực tế (FALLBACK):
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Nhận xét toàn lượt: Khách chỉ hỏi giá áo, nguồn có499k nhưng câu thực nhận không trả giá hoặc giúp tiếp tục mua. Fallback không bịa facts/handoff, giọng rõ; vẫn FAIL về hoàn thành nhu cầu đơn giản. Chưa xem draft/verdict để gán nguyên nhân.

Điểm10chiều:
~~~json
{
  "understanding": 0,
  "explicitNeedCompleteness": 0,
  "contextCorrectionUse": 0,
  "usefulness": 0,
  "decisionSupport": 0,
  "partialAnswerBehavior": 0,
  "nextStep": 0,
  "coherence": 1,
  "naturalness": 2,
  "factualActionSafety": 2
}
~~~

Owner draft (JSON exact text):
~~~json
"Sơ mi SM613 giá 499.000đ chị nhé."
~~~

Verifier:
~~~json
null
~~~

Verifier transport status: PROVIDER_ERROR; terminal reason: PROVIDER_ERROR

## r7-opacity-context-change:1 — FAIL

Khách: Lịch đổi rồi em, chị đi sự kiện có đèn chiếu phía sau. Áo trắng có lộ áo lót không? Trắng M còn chứ?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị muốn áo trắng đi họp, ngại thấy áo lót."
  },
  {
    "role": "shop",
    "text": "SM613 trắng mặc với áo lót màu da trong phòng thì không thấy màu áo lót. Ngược sáng vẫn có thể thấy bóng chị nhé."
  },
  {
    "role": "customer",
    "text": "Họp trong phòng thôi em, chị mặc áo lót màu da. Ngực 92cm."
  },
  {
    "role": "shop",
    "text": "Vậy chị lấy SM613 trắng M nhé, trắng M hiện còn."
  }
]
~~~

Kết quả thực tế (SEND_ELIGIBLE):
~~~text
Sự kiện có đèn chiếu phía sau (đèn ngược sáng) thì áo trắng vẫn có thể thấy bóng áo lót chị nhé. Màu trắng size M hiện vẫn còn chị ạ.
~~~

Nhận xét toàn lượt: Nhận ra đèn phía sau làm thay điều kiện thử và trả đúng nguy cơ thấy bóng/tồn trắngM. Nhưng khách có ưu tiên tránh lộ từ history mà shop vẫn chỉ mô tả nguy cơ rồi báo còn, chưa đổi lập trường thành lời khuyên nên tránh chiếc này cho sự kiện. Không bắt bịa áo thay khi chưa có chứng cứ; chính thiếu quyết định dùng được khiến tư vấn chưa đạt dù facts đúng và giọng gọn.

Điểm10chiều:
~~~json
{
  "understanding": 2,
  "explicitNeedCompleteness": 2,
  "contextCorrectionUse": 2,
  "usefulness": 1,
  "decisionSupport": 1,
  "partialAnswerBehavior": 2,
  "nextStep": 1,
  "coherence": 2,
  "naturalness": 2,
  "factualActionSafety": 2
}
~~~

Owner draft (JSON exact text):
~~~json
"Sự kiện có đèn chiếu phía sau (đèn ngược sáng) thì áo trắng vẫn có thể thấy bóng áo lót chị nhé. Màu trắng size M hiện vẫn còn chị ạ."
~~~

Verifier:
~~~json
"{\"verdict\":\"PASS\",\"violations\":[]}"
~~~

Verifier transport status: OK; terminal reason: PASS

## r15-fit-reassurance:1 — FAIL

Khách: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều."
  },
  {
    "role": "shop",
    "text": "Em chọn size M cho chị, be M còn; set 749k."
  }
]
~~~

Kết quả thực tế (FALLBACK):
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Nhận xét toàn lượt: Khách đã chọnM và chỉ còn lo cạp cứng; câu thực nhận là fallback, không dùng được thiết kế lưng chun hoặc fit đã xác minh để trấn an. Không có thông tin hay bước mua thay thế trong câu thực nhận, dù bản thân câu an toàn/tự nhiên. Chưa xem candidate/verdict để gán lỗi cho tư vấn.

Điểm10chiều:
~~~json
{
  "understanding": 0,
  "explicitNeedCompleteness": 0,
  "contextCorrectionUse": 0,
  "usefulness": 0,
  "decisionSupport": 0,
  "partialAnswerBehavior": 0,
  "nextStep": 0,
  "coherence": 1,
  "naturalness": 2,
  "factualActionSafety": 2
}
~~~

Owner draft (JSON exact text):
~~~json
"Dạ, set be size M rất hợp với mình chị nhé. Chị hoàn toàn yên tâm không sợ cạp cứng vì quần thiết kế lưng chun toàn vòng, co giãn thoải mái với eo 74cm (chun kéo tối đa tới 88cm). Kiểu quần suông kết hợp lưng chun này giúp mình ngồi làm việc nhiều dễ chịu, không bị cấn bụng mà dáng mặc vẫn gọn gàng, lịch sự ạ."
~~~

Verifier:
~~~json
null
~~~

Verifier transport status: PROVIDER_ERROR; terminal reason: PROVIDER_ERROR
