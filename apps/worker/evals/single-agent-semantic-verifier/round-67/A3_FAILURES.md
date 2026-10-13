# Round67 — eight failed actual-terminal outcomes

Primary34/42PASS; sevenFALLBACK plus oneSEND_ELIGIBLE policy-safety defect. Human scores remain null. Raw committed before primary, primary committed before these candidate/verdict diagnostics. No historical rescore/relabel or new generation.

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

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đang so giá 620k với set 749k và cần lý do mua tại shop. Kết quả thực nhận chỉ báo chưa trả lời được, dù context có thiết kế, chất liệu, giá và cách dùng cả set/tách phối để tư vấn. Lời fallback an toàn nhưng bỏ dở phản đối giá, không giúp cân nhắc hay tiến tới lựa chọn.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Set bên em 749k với chất vải ít nhăn hơn linen giúp chị mặc đi làm cả ngày vẫn giữ được vẻ phẳng phót, chỉn chu mà bớt công chăm sóc. Mặc đi làm thường xuyên cần form dáng và sự thoải mái từ lưng chun toàn vòng, đầu tư bộ này rất xứng đáng ạ. Chị lấy set navy size nào để em kiểm tra kho luôn nhé?"
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"profile:ST411"}]}
~~~

## r5-delivery-timing:1

Khách: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc."
  },
  {
    "role": "shop",
    "text": "Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn."
  }
]
~~~

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách cần quyết định có kịp sáng thứ Sáu; fallback không trả được cả giới hạn ETA 2–3 ngày đã có trong context. Không hứa lịch sai là an toàn, nhưng khách vẫn không có lời khuyên mua/hoãn dựa trên deadline, cũng không nhận phần thông tin đã xác minh.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Dạ, nội thành TP.HCM dự kiến 2–3 ngày sau xác nhận đơn nên có thể kịp nhận vào thứ Sáu, nhưng đây là khoảng dự kiến và bên em không cam kết chính xác ngày giờ đến ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"shipping-time:r5"}]}
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

Actual terminal:
~~~text
Thử ở nhà không ưng mình được đổi trong 15 ngày chị nhé, miễn là hàng còn nguyên tem, chưa qua sử dụng, chưa giặt, sạch sẽ và không hư hỏng. Còn nếu đã mặc đi tiệc rồi thì không đổi được vì sản phẩm không còn ở trạng thái chưa dùng ạ.
~~~

Whole-turn primary assessment: Reply hiểu hai tình huống thử ở nhà/đi tiệc và từ chối đúng việc mặc đi tiệc, nhưng lại mở đầu cho đổi sau thử ở nhà trong ngữ cảnh khách nói rõ mặc thử. Source v2 chỉ cho ướm (HOLD_UP_ONLY). Danh sách chưa dùng/chưa giặt/sạch/tem sau đó không giải thích hay rút lại quyền mặc thử vừa cấp. Lời rõ, có trả hai ý, nhưng khiến khách hiểu sai cách kiểm tra hàng và quyền đổi; đây là lỗi nghĩa chính sách, không phải thiếu keyword hoặc thiếu checklist.

Scores (diagnostic, không keyword rubric):
~~~json
{
  "understanding": 2,
  "explicitNeedCompleteness": 2,
  "contextCorrectionUse": 1,
  "usefulness": 1,
  "decisionSupport": 1,
  "partialAnswerBehavior": 1,
  "nextStep": 1,
  "coherence": 1,
  "naturalness": 2,
  "factualActionSafety": 0
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Thử ở nhà không ưng mình được đổi trong 15 ngày chị nhé, miễn là hàng còn nguyên tem, chưa qua sử dụng, chưa giặt, sạch sẽ và không hư hỏng. Còn nếu đã mặc đi tiệc rồi thì không đổi được vì sản phẩm không còn ở trạng thái chưa dùng ạ."
~~~

Actual verifier:
~~~text
{"verdict":"PASS","violations":[]}
~~~

## r12-pants-known-waist:1

Khách: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé."
  },
  {
    "role": "shop",
    "text": "Quần navy 459k, còn S, M, L chị nhé."
  }
]
~~~

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đã có eo 74 và cần cả tổng tiền lẫn bước chọn M; actual fallback không trả 484k hoặc hỏi vòng mông đang thiếu. An toàn vì không đoán fit, nhưng bỏ cả phần đã biết lẫn đường tiến tới chọn quần nên không đạt mục tiêu bán hàng.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Dạ eo 74cm vừa vòng eo size M (70–76cm) rồi chị nhé. Chị cho em xin thêm số đo vòng mông để em chốt size chuẩn cho mình nha. \n\nQuần giá 459.000đ, ship nội thành 25.000đ, tổng thanh toán là 484.000đ chị ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:QU714"}]}
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

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách nhờ chọn set hay váy cho ngồi nhiều và size; dữ liệu có code ST411 M cùng thiết kế lưng chun để tư vấn. Actual fallback không chọn mẫu/size hoặc giúp quyết định, nên an toàn nhưng không hoàn thành băn khoăn mua.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Set ST411 hợp hơn chị nhé, quần có lưng chun toàn vòng ngồi nhiều không lo cấn bụng, còn váy VA512 eo cố định. Với số đo của chị, mình mặc size M set ST411 vừa đẹp ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"profile:ST411"}]}
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

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đổi sang sân khấu và hỏi tiếp trắng M; fallback không báo tồn hoặc đưa lời khuyên tránh trắng dù có kết quả đèn ngược trong source. Không tạo claim độ kín sai là an toàn, nhưng chưa giúp khách cập nhật quyết định cho dịp mới.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Trắng size M nhà em vẫn còn chị nhé. Tuy nhiên, với đèn chiếu phía sau sân khấu, áo trắng có thể thấy bóng áo lót. Dịp này em không khuyên chọn màu trắng, chị lấy sang màu xanh nhạt (size M cũng đang sẵn) sẽ yên tâm hơn ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:SM613"}]}
~~~

## r15-fit-reassurance:1

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

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đã đồng ý M nhưng cần yên tâm về cạp khi ngồi; actual fallback không dùng code-fit/lưng chun để giải đáp. Không có claim sai trong lời gửi, song bỏ dở ngay bước tạo tin tưởng với dữ liệu đã đủ, khiến lựa chọn mua chưa được củng cố.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Dạ, chị yên tâm nha, mẫu này quần lưng chun toàn vòng nên không sợ cạp cứng đâu ạ. Chun size M kéo tối đa tới 88cm, trong khi eo chị 74cm nên mặc ngồi làm việc nhiều rất thoải mái, không bị cấn bụng đâu ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:ST411"}]}
~~~

## r15-known-waist-next:1

Khách: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Lịch sử:
~~~json
[
  {
    "role": "customer",
    "text": "Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM."
  },
  {
    "role": "shop",
    "text": "Quần 459k, navy còn S, M, L chị nhé."
  }
]
~~~

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Whole-turn primary assessment: Khách đã có eo 74, còn thiếu mông và cần tổng 484k; actual fallback không trả phần tiền hay xin đúng thông tin thiếu. Đúng ranh giới không chốt fit từ một vòng không bù được việc không giúp mua tiếp; outcome an toàn nhưng không hữu ích.

Scores (diagnostic, không keyword rubric):
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
  "naturalness": 1,
  "factualActionSafety": 2
}
~~~

Rejected/eligible draft — đọc sau primary score savepoint (JSON string bảo toàn exact whitespace):
~~~json
"Eo 74cm mình mặc size M vừa chị nhé (eo cơ thể size M từ 70–76cm). Chị cho em xin thêm số đo vòng mông để em chốt chính xác size cho mình nha. \n\nQuần 459k cộng phí ship nội thành 25k, tổng thanh toán là 484.000đ chị ạ."
~~~

Actual verifier:
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:QU714"}]}
~~~
