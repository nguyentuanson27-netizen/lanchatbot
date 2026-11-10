# A3 — five failed actual-terminal outcomes

Primary37/42PASS; five fallback outcomes. Raw savepoint precedes primary savepoint; these rejected-draft/verdict diagnostics were read only afterward. No rescore/repair/retry.

## r5-competitor-price:1

Khách: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao."
  },
  {
    "role": "shop",
    "text": "Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L."
  }
]
~~~

Actual customer outcome:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đang cân nhắc chênh giá để mua set mặc đi làm; câu thực nhận chỉ nói chưa trả lời được. Nguồn có thiết kế/chất liệu/cách tách phối nhưng khách không nhận được lý do mua hoặc phương án cân nhắc nào. Fallback an toàn, dễ hiểu nhưng bỏ dở cuộc bán hàng; không chấm nội dung candidate chưa được xem.

Rejected draft (JSON preserves exact text/line whitespace):
~~~json
"Dạ, set bên em 749k nhưng quần lưng chun toàn vòng mặc rất thoải mái cả ngày làm việc, vải ít nhăn hơn linen nên giữ phom gọn gàng ở văn phòng. Chị chọn set navy này nhé, cho em xin số đo ngực, eo và mông để em chọn size chuẩn cho mình nha."
~~~

Actual verifier:
~~~json
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:ST411"}]}
~~~

## r5-try-exchange:1

Khách: Chị mặc thử ở nhà rồi không thích thì đổi được chứ? Nếu mặc đi tiệc rồi thì sao?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị chọn VA512 đen L nhưng lo mua về chưa ưng."
  },
  {
    "role": "shop",
    "text": "Shop hỗ trợ đổi một lần trong 15 ngày từ lúc nhận. Chị giữ nguyên hàng và tem nhé."
  }
]
~~~

Actual customer outcome:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách cần phân biệt mặc thử ở nhà và đã mặc đi tiệc với quy tắc chỉ được ướm. Kết quả thực nhận chỉ là chưa trả lời được, bỏ cả hai câu hỏi dù nguồn có đủ policy. Câu không bịa quyền nên an toàn, nhưng không giúp quyết định mua hoặc hiểu cách kiểm tra hàng.

Rejected draft (JSON preserves exact text/line whitespace):
~~~json
"Mặc thử ở nhà giữ nguyên tem, chưa qua sử dụng hay giặt, còn sạch và nguyên vẹn trong 15 ngày thì chị đổi được nhé. Còn nếu đã mặc đi tiệc rồi thì sản phẩm không đủ điều kiện đổi ạ."
~~~

Actual verifier:
~~~json
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"exchange:r5"}]}
~~~

## r14-workday-choice:1

Khách: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng."
  },
  {
    "role": "shop",
    "text": "Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định."
  }
]
~~~

Actual customer outcome:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách muốn shop chọn set/váy và size cho việc ngồi nhiều trong850k; nguồn có ST411M và đặc điểm lưng chun phù hợp. Thực nhận chỉ là chưa trả lời được, không có lựa chọn, size hay lý do nào giúp mua. Fallback an toàn nhưng không đạt mục tiêu tư vấn của toàn lượt.

Rejected draft (JSON preserves exact text/line whitespace):
~~~json
"Set ST411 hợp hơn chị nhé vì quần có lưng chun toàn vòng, ngồi nhiều thoải mái không lo cấn bụng như eo cố định của váy VA512. \n\nVới số đo của chị (ngực 92, eo 74, mông 96), cả hai mẫu chị đều mặc **size M** vừa vặn ạ."
~~~

Actual verifier:
~~~json
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:VA512"}]}
~~~

## r14-stage-light-change:1

Khách: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Lịch sử:
~~~json
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
~~~

Actual customer outcome:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đã chuyển sang sân khấu và cần lời khuyên có nên lấy trắng cùng tồnM. Kết quả thực nhận chỉ báo chưa trả lời được, không dùng dữ liệu có thể thấy bóng dưới đèn phía sau để đưa quyết định, cũng mất phần tồn đã biết. An toàn nhưng không đủ ích lợi bán hàng hoặc bước tiến cho hoàn cảnh mới.

Rejected draft (JSON preserves exact text/line whitespace):
~~~json
"Dạ với đèn chiếu phía sau thì em khuyên chị không nên lấy màu trắng vì điều kiện này có thể thấy bóng áo lót ạ. Size M trắng vẫn còn, hoặc mình chuyển sang màu xanh nhạt (size M cũng còn) để yên tâm hơn nhé chị."
~~~

Actual verifier:
~~~json
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:SM613"}]}
~~~

## r15-value-use:1

Khách: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối với đồ chị đang có."
  },
  {
    "role": "shop",
    "text": "Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được."
  }
]
~~~

Actual customer outcome:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách phân vân giá set để dùng đi làm/tách phối cuối tuần, nhưng chỉ nhận fallback chưa trả lời được. Nguồn có đủ chất liệu/thiết kế để giải thích giá trị hiện có mà không so bịa đối thủ; câu thực nhận không giúp cân nhắc mua. Không chấm candidate chưa xem, factual safety của fallback vẫn2.

Rejected draft (JSON preserves exact text/line whitespace):
~~~json
"Em vẫn khuyên mình chọn set này chị nhé. Vải ít nhăn hơn linen giúp chị mặc đi làm cả ngày vẫn đứng form gọn gàng, lại dễ tách áo ra phối đồ cuối tuần linh hoạt ạ."
~~~

Actual verifier:
~~~json
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:ST411"}]}
~~~
