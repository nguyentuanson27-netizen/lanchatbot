# Toàn bộ 31 hội thoại và actual outcomes

Markdown bỏ khoảng trắng cuối dòng để hiển thị; JSON/raw giữ nguyên exact customer text.
Source `487816d8c3f27299b62daaccca8bd861d81abee1`, N1. Owner Gemini3.5 Flash Lite High, verifier GPT6.1 Sol High. Stateful chỉ capture, B1 chỉ eligibility; không gửi khách thật hoặc lấy rejected draft làm actual outcome.

## B2_B3 1. stateful-open

**Khách/lượt:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Actual SEND_ELIGIBLE / PASS:**

Chị đã thêm áo Thạch Thảo màu be size M vào giỏ hàng, mẫu này là hàng đặt trước (pre-order) chị nhé.

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 4,
  "customerProfileRevision": 2,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76
    },
    {
      "kind": "HIPS_CM",
      "value": 98
    }
  ],
  "cart": {
    "revision": 1,
    "grandTotalVnd": 529000,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 1,
        "components": [
          {
            "role": "TOP",
            "size": "M",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review NEEDS_EDIT:** Giỏ đúng áo riêng BE/M x1, profile đúng76/98 và lần này khách đã được báo hàng đặt trước. Tuy nhiên shop nói Chị đã thêm rồi lại gọi khách là chị: người nói và người làm việc bị lẫn, cả câu giống thông báo giao diện. Đây là lỗi giọng/chủ thể giao tiếp, không phủ nhận commit đúng hoặc coi thiếu fit là lỗi khi khách tự chọn M.

## B2_B3 2. stateful-variant-quantity

**Khách/lượt:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Actual SEND_ELIGIBLE / PASS:**

Chị đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc rồi ạ.

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "customerProfileRevision": 2,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76
    },
    {
      "kind": "HIPS_CM",
      "value": 98
    }
  ],
  "cart": {
    "revision": 3,
    "grandTotalVnd": 978100,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 2,
        "components": [
          {
            "role": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review NEEDS_EDIT:** Giỏ đã đổi đúng BE/L x2 và không cần nhắc lại preorder đã báo ngay trước. Reply tiếp tục nói Chị đã đổi và cập nhật số lượng, kể thao tác thay lời shop nhận lựa chọn. Cần sửa cách xưng vai trong mạch hai tin này; không chấm sai biến thể, số lượng hoặc đòi disclosure lặp lại.

## B2_B3 3. stateful-quote

**Khách/lượt:** Hai áo cả phí ship là bao nhiêu em?

**Actual SEND_ELIGIBLE / PASS:**

Dạ, 2 áo giá 998.000đ, phí ship 30.000đ, sau ưu đãi tổng cộng là 978.100đ chị nha.

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "customerProfileRevision": 2,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76
    },
    {
      "kind": "HIPS_CM",
      "value": 98
    }
  ],
  "cart": {
    "revision": 3,
    "grandTotalVnd": 978100,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 2,
        "components": [
          {
            "role": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Trả đủ tổng978.100đ sau ưu đãi, giá hai áo998.000đ và ship30.000đ theo giỏ hiện tại. Nêu các thành phần tiền có mục đích giải thích tổng, không phải liệt kê hồ sơ khách; không báo đã tạo đơn.

## B2_B3 4. stateful-correction

**Khách/lượt:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Actual SEND_ELIGIBLE / PASS:**

Dạ vâng, em đã lưu lại số đo mới của chị rồi ạ. Áo size L chị chọn đã sẵn sàng trong giỏ, mình tiến hành đặt hàng luôn nhé ạ?

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "customerProfileRevision": 3,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74
    },
    {
      "kind": "HIPS_CM",
      "value": 96
    }
  ],
  "cart": {
    "revision": 3,
    "grandTotalVnd": 978100,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 2,
        "components": [
          {
            "role": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Nhận sửa đúng eo74/mông96, giỏ vẫn BE/L x2. Không đọc lại toàn bộ số đo. Lời lưu số đo/sẵn sàng trong giỏ còn hành chính và câu mời đặt hơi dài, nhưng trong mạch khách đang mua, ý tiếp tục checkout là bước có luồng code; không hứa đã tạo đơn, không đọc sẵn sàng trong giỏ thành hàng có sẵn khi preorder đã rõ.

## B2_B3 5. stateful-private-checkout

**Khách/lượt:** [Private synthetic checkout through code; no PII passed to a model]

**Actual HANDOFF / DEPENDENCY_FAILURE:**

(Không có tin được capture.)

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "customerProfileRevision": 3,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74
    },
    {
      "kind": "HIPS_CM",
      "value": 96
    }
  ],
  "cart": {
    "revision": 3,
    "grandTotalVnd": 978100,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 2,
        "components": [
          {
            "role": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review FALLBACK_OR_NO_SEND:** Bước checkout riêng tư không tạo được preview và không có tin được capture. Giỏ/profile trước đó vẫn đúng nhưng hành trình mua chưa hoàn tất; handoff im lặng không chứng minh nhân viên đã nhận việc. Chưa dùng trace để gán lý do dependency.

## B2_B3 6. stateful-confirm

**Khách/lượt:** Chốt đơn cho chị nhé.

**Actual NO_SEND / CURRENT_AUTHORITY_CHANGED:**

(Không có tin được capture.)

**Public state cuối lượt:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "customerProfileRevision": 3,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74
    },
    {
      "kind": "HIPS_CM",
      "value": 96
    }
  ],
  "cart": {
    "revision": 3,
    "grandTotalVnd": 978100,
    "lines": [
      {
        "product": "SV2447",
        "quantity": 2,
        "components": [
          {
            "role": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review FALLBACK_OR_NO_SEND:** Sau handoff, yêu cầu chốt không có tin/confirmation mới. Code giữ authority là đúng nhưng khách chưa mua xong; không tính im lặng bảo vệ quyền thành câu tư vấn hữu ích.

## B2_B3 7. stateful-human-request

**Khách/lượt:** Cho chị gặp nhân viên shop nhé.

**Actual HANDOFF / CUSTOMER_REQUESTED_HUMAN:**

(Không có tin được capture.)

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
  "customerProfileRevision": 1,
  "measurements": [],
  "cart": null
}
```

**Review USABLE:** Control riêng nhường ownership khi khách muốn gặp nhân viên; không gửi lời hứa giả hoặc tạo giỏ. Chỉ tính đúng boundary nhường quyền, không là bán hàng thành công, độ tự nhiên hay bằng chứng nhân viên thật đã phục vụ.

## B1 1. b1-changed-occasion

**Khách trước:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước:** Dịp đó mặc set này hợp chị ạ.

**Khách/lượt:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Actual FALLBACK / FAIL:**

Phần này em chưa trả lời được, chị nhé.

**Review FALLBACK_OR_NO_SEND:** Khách hỏi độ lộ dưới đèn mạnh và sẵn sàng đổi mẫu nhưng chỉ nhận fallback chung. Actual không có lời khuyên về cách mặc hoặc lựa chọn tiếp; chưa xem rejected draft/verdict detail để quyết định người chặn đúng hay sai.

## B1 2. b1-search-read

**Khách/lượt:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Actual SEND_ELIGIBLE / PASS:**

Dạ áo dài mã SD375 bên em có 2 lựa chọn:
- Áo lẻ: 929.000đ
- Cả set: 1.065.000đ

Chị muốn lấy áo lẻ hay nguyên set ạ?

**Review USABLE:** Tìm đúng SD375 và tách giá áo929k/set1.065k. Câu hỏi chọn áo hay bộ hợp với hai lựa chọn bán, chưa hứa đã thêm giỏ; list giá ngắn giúp khách hiểu lựa chọn.

## B1 3. b1-buying-concern

**Khách/lượt:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Actual SEND_ELIGIBLE / PASS:**

Dạ mặc đi tiệc ban ngày hoàn toàn không bị rườm rà đâu chị nhé! Phần chân váy dùng ren tơ Hàn có độ rũ tự nhiên và mềm mại, kết hợp với áo tơ thêu thanh thoát nên tổng thể rất bay bổng, sang trọng mà vẫn giữ được nét dịu dàng, nhẹ nhàng dưới ánh sáng ban ngày.

Cả set có giá 799.000đ, nằm trọn trong ngân sách 900.000đ của mình luôn ạ. Chị có muốn em lấy size cho mình không ạ?

**Review NEEDS_EDIT:** Giá799k đúng, nhưng đoạn tư vấn dùng nhiều lời khen từ mô tả để phủ định ngay nỗi lo ren rườm rà. Khách chưa hình dung được cách tiết chế cho tiệc ban ngày; lời mời lấy size lại vượt khả năng chọn fit của B1. Lỗi ở sức thuyết phục và bước tiếp, không phải một từ khen tự nó bị cấm.

## B1 4. b1-changed-occasion-v2

**Khách trước:** Chị đang xem set Thạch Thảo để đi tiệc trưa.

**Shop trước:** Tiệc trưa mặc bộ này xinh chị ạ.

**Khách/lượt:** Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

**Actual SEND_ELIGIBLE / PASS:**

Chất tơ Hàn thêu và ren tơ Hàn của bộ này mềm, nhẹ và thoáng nên mặc rất dễ chịu, không bị bí nặng người đâu chị ạ.

Tuy nhiên đứng ngoài trời lâu, chị lưu ý chọn thêm ô che nắng hoặc đứng ở khu vực có bóng râm để thoải mái nhất nhé!

**Review USABLE:** Đã xét việc ra ngoài trời và trả trực tiếp cảm giác mặc từ chất mềm/nhẹ/thoáng. Gợi ô hoặc chỗ râm là lời khuyên thêm, không phải món hàng hay bằng chứng vải chống nắng; có thể bỏ để câu gọn hơn nhưng không làm mất câu trả lời về độ bí. Không bắt cảm giác thoáng phải có phép đo riêng.

## B1 5. b1-partial-source-v2

**Khách/lượt:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Actual SEND_ELIGIBLE / PASS:**

Chân váy làm từ chất liệu ren tơ Hàn mềm mại, mang lại hiệu ứng nữ tính, bay bổng. Váy có form dáng nhẹ nhàng với độ rũ tự nhiên, giúp tôn dáng và tạo chuyển động uyển chuyển khi di chuyển.

Hiện tại hệ thống chưa kiểm tra được giá và tình trạng tồn kho cụ thể cho size M của chân váy này.

**Review NEEDS_EDIT:** Lần này trả được ren tơ Hàn và dáng rũ của đúng chân váy, đồng thời báo chưa có giá/tồn M, không bịa hàng. Tuy vậy hai câu mô tả chép gần nhịp catalog và câu cuối nói hệ thống chưa kiểm tra thay lời shop về việc mua. Partial answer được giữ; giọng chưa đạt, không yêu cầu tạo CTA/handoff khi capability không có.

## B1 6. b1-buying-concern-v2

**Khách/lượt:** Chị hay mặc đồ trơn, ít họa tiết. Set Thạch Thảo nhìn đẹp nhưng chị sợ lên người hơi điệu quá. Chị cần một bộ để đi ăn cưới ban ngày, em tư vấn thật là có nên lấy không?

**Actual SEND_ELIGIBLE / PASS:**

Set Thạch Thảo gồm áo tơ thêu nổi và chân váy ren tơ Hàn nên có độ nữ tính, bay bổng khá rõ rệt. Nếu chị quen mặc đồ trơn hoàn toàn, mặc cả set đúng là sẽ hơi điệu so với phong cách thường ngày của mình.

Nhưng đi ăn cưới ban ngày thì set này lại cực kỳ hợp lý: chất tơ ren nhã nhặn, sáng sủa và sang trọng vừa đủ dưới ánh sáng ban ngày, không bị quá lồng lộn hay nặng nề như tiệc tối.

Nếu chị vẫn lăn tăn độ điệu, chị có thể chọn mua riêng áo thêu (499k) để mix với chân váy hoặc quần trơn sẵn có ở nhà giúp tổng thể tiết chế lại, hoặc lấy nguyên set (799k) nếu muốn một bộ đồ đồng điệu, thanh lịch trọn vẹn cho ngày cưới. Đi ăn cưới diện set này rất vừa vặn và lịch sự chị nhé.

**Review NEEDS_EDIT:** Tiến bộ ở chỗ thừa nhận cả bộ điệu hơn phong cách đồ trơn và có cách tiết chế bằng áo lẻ. Nhưng lời khuyên kéo dài ba đoạn, quay lại khen cả bộ sau khi mở cả hai lựa chọn; khách phải tự gỡ lại shop nghiêng về cách nào cho chính nỗi lo của mình. Cần một khuyến nghị rõ và ngắn hơn, không phạt upsell hoặc đề xuất áo lẻ.

## B1 7. b1-current-policy

**Khách trước:** Lần trước shop nói với chị là hàng chỉ đổi trong 7 ngày.

**Khách/lượt:** Đơn này chị nhận 10 hôm rồi, mới chỉ cầm lên ngắm trước gương, tem mác vẫn còn. Giờ đổi màu còn kịp không em? Phí đổi bao nhiêu?

**Actual SEND_ELIGIBLE / PASS:**

Dạ thời hạn đổi hàng bên em là 15 ngày kể từ ngày nhận nên đơn của chị mới nhận 10 hôm vẫn kịp đổi màu nha chị. Phí đổi hàng (phí vận chuyển 2 chiều) là 30.000đ ạ.

**Review USABLE:** Sửa đúng thời hạn cũ7ngày thành15ngày và phí hai chiều30k. Cả câu gắn vẫn kịp với ngày nhận10hôm, không thêm tags-only như điều kiện duy nhất hay báo đã nhận đổi. Không bắt đọc toàn bộ checklist cho câu hỏi thời gian/phí.

## B1 8. b1-partial-source

**Khách/lượt:** Set Thạch Thảo may bằng vải gì vậy em? Chị muốn lấy size M, em xem giúp chị giá bao nhiêu và còn hàng không nhé.

**Actual SEND_ELIGIBLE / PASS:**

Set Thạch Thảo kết hợp giữa tơ Hàn thêu cao cấp cho áo và ren tơ Hàn mềm mại cho chân váy, chất vải mềm, thoáng và có độ bay tự nhiên rất nhẹ nhàng, bay bổng. Hiện hệ thống chưa kết nối được dữ liệu giá và tồn kho nên em chưa kiểm tra chính xác size M cho chị được ạ.

**Review NEEDS_EDIT:** Phân đúng tơ thêu của áo và ren tơ của váy, giữ phần có nguồn và không bịa giá/tồn M. Nhưng lời mô tả dày tính từ và phần sau kể chưa kết nối dữ liệu khiến câu giống báo lỗi kỹ thuật. Không còn hẹn nhắn lại vô căn cứ như baseline; giọng shop vẫn chưa đạt.

## B1 9. b1-price

**Khách/lượt:** Set Thạch Thảo mã SV2447 giá bao nhiêu vậy em?

**Actual SEND_ELIGIBLE / PASS:**

Set váy Thạch Thảo có giá 799.000đ. Ngoài ra shop có bán lẻ áo 499.000đ và chân váy 449.000đ nha chị.

**Review USABLE:** Trả ngay giá cả bộ799k, rồi nêu riêng áo499k/váy449k đúng phạm vi. Hai lựa chọn bổ sung ngắn và liên quan, không trộn giá hoặc hỏi thông tin thừa.

## B1 10. b1-component-stock

**Khách/lượt:** Áo của bộ Thạch Thảo size M còn không em? Áo bán riêng bao nhiêu?

**Actual SEND_ELIGIBLE / PASS:**

Áo Thạch Thảo size M có bán riêng chị nhé, giá 499.000đ và hiện còn hàng ạ.

**Review USABLE:** Đáp đúng áo bán riêng size M còn và giá499k. Một câu rõ, không tự tư vấn M vừa hoặc báo đã mua khi chỉ hỏi hàng.

## B1 11. b1-policy-used

**Khách/lượt:** Chị đã mặc bộ này đi làm một buổi rồi nhưng về thấy không hợp. Giờ chị đổi sang màu khác được không em? Nếu đổi thì ai chịu phí ship?

**Actual SEND_ELIGIBLE / PASS:**

Dạ, bộ này mình đã mặc đi làm rồi nên shop không hỗ trợ đổi được ạ, vì quy định đổi hàng yêu cầu sản phẩm phải chưa qua sử dụng và chỉ ướm thử. Trường hợp đổi hàng hợp lệ thì phí ship 2 chiều là 30.000đ chị nhé.

**Review USABLE:** Từ chối đúng việc đã mặc đi làm trước, nên ca hiện tại không phát sinh giao dịch đổi/phí. Phần phí30k được nói riêng cho đổi hợp lệ; người chịu phí nên rõ hơn nếu thật sự xử lý một ca đổi, nhưng không dùng thiếu chữ khách trả để biến câu từ chối đúng thành sai policy. Không đòi checklist thay lý do đã sử dụng.

## B1 12. b1-current-policy-v2

**Khách trước:** Lần trước chị nhớ phí đổi là 25 nghìn.

**Khách/lượt:** Đơn này chị nhận 12 hôm rồi, chưa dùng. Giờ chị đổi size còn kịp không em? Phí ship tính thế nào?

**Actual SEND_ELIGIBLE / PASS:**

Dạ mình nhận hàng 12 hôm thì vẫn kịp đổi size chị nhé, vì thời gian hỗ trợ đổi là trong vòng 15 ngày ạ. Phí vận chuyển 2 chiều cho đơn đổi hiện là 30.000đ chị nha.

**Review USABLE:** Dùng15ngày và30k hiện hành thay ký ức25k. Vẫn kịp được giải thích ngay bằng thời hạn12/15, không phải thông báo đã phê duyệt toàn bộ đơn; trả đúng phạm vi hỏi.

## B1 13. b1-price-v2

**Khách trước:** Chị đang xem bộ Thạch Thảo bên mình.

**Khách/lượt:** Cho chị xin giá cả bộ với em.

**Actual SEND_ELIGIBLE / PASS:**

Dạ, cả bộ váy Thạch Thảo có giá 799.000đ chị nhé.

**Review USABLE:** Theo đúng referent Thạch Thảo từ lịch sử và trả giá cả bộ799k trong một câu, không bắt khách nhắc mẫu hoặc thêm chốt mua.

## B1 14. b1-component-stock-v2

**Khách trước:** Chị chỉ muốn lấy chân váy của set Thạch Thảo.

**Khách/lượt:** Chân váy size M còn không em, mua riêng là bao nhiêu?

**Actual SEND_ELIGIBLE / PASS:**

Dạ chân váy Thạch Thảo size M bên em còn hàng, giá mua riêng là 449.000đ chị nha.

**Review USABLE:** Giữ nhu cầu chân váy riêng từ lịch sử, báo đúng tồn M và449k, không trả giá set hoặc chốt fit.

## B1 15. b1-search-read-v2

**Khách/lượt:** Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

**Actual SEND_ELIGIBLE / PASS:**

Dạ shop có sẵn set váy Khánh Trang chị nhé. Giá nguyên set là 999.000đ, hoặc chị có thể mua lẻ áo hoặc chân váy với giá 499.000đ/món ạ. Chị muốn lấy cả set hay mua lẻ món nào ạ?

**Review USABLE:** Xác định đúng SV1561/Khánh Trang, có tồn, trả set999k và từng món499k. Câu hỏi bộ hay lẻ phù hợp lựa chọn bán; không tự sửa giá set theo cộng hai giá lẻ hoặc dùng mẫu gần giống.

## B1 16. b1-policy-used-v2

**Khách/lượt:** Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

**Actual SEND_ELIGIBLE / PASS:**

Dạ, shop không hỗ trợ đổi được chị ạ. Quy định thử đồ của shop là chỉ ướm bên ngoài, nên sản phẩm đã mặc vào người sẽ không đủ điều kiện đổi size ạ.

**Review USABLE:** Hiểu mặc vào năm phút vẫn vượt chỉ ướm ngoài và từ chối đổi size ngay cho ca này. Còn tem/chưa ra ngoài không được dùng xóa tình trạng đã mặc; không liệt kê điều kiện không quyết định.

## B1 17. b1-changed-occasion-v3

**Khách trước:** Chị định lấy cả bộ Thạch Thảo đi tiệc tối.

**Shop trước:** Đi tiệc tối mặc cả bộ đẹp chị ạ.

**Khách/lượt:** Mà lịch đổi rồi, sáng chị mặc đi gặp khách hàng. Chị muốn nhìn gọn hơn thì nên lấy cả bộ hay chỉ lấy áo thôi em?

**Actual SEND_ELIGIBLE / PASS:**

Đi gặp khách hàng buổi sáng, chị lấy áo thêu mặc với quần âu hoặc chân váy gọn gàng sẵn có ở nhà sẽ sắc sảo và chuyên nghiệp hơn. Cả bộ với chân váy ren có độ rũ bay bổng sẽ hợp với đi tiệc hoặc không gian mềm mại hơn chị nhé.

**Review USABLE:** Đổi lời khuyên từ cả bộ đi tiệc sang áo riêng với đồ cơ bản cho buổi gặp khách; giải thích bằng độ rũ ren đối lập nhu cầu gọn, gọn hơn baseline. Sẵn có ở nhà vẫn là giả định nên viết như gợi cách phối, nhưng lời khuyên chính giúp quyết định và không tạo tính năng mới.

## B1 18. b1-current-policy-v3

**Khách trước:** Hồi trước chị nhớ bên mình chỉ cho đổi trong 7 ngày.

**Khách/lượt:** Lần này chị nhận hàng được 9 ngày, chỉ mở ra xem rồi cất lại. Giờ chị đổi size còn được không em?

**Actual SEND_ELIGIBLE / PASS:**

Dạ thời gian đổi hàng bên em hiện là trong vòng 15 ngày kể từ lúc nhận hàng, nên 9 ngày thì mình vẫn đổi size được chị nha.

**Review USABLE:** Dùng15ngày hiện hành thay7ngày và trả9ngày còn trong hạn. Cụm đổi được đang được giải thích trong phạm vi thời gian, không là receipt duyệt một đơn; không yêu cầu thêm điều kiện mặc định khi khách chỉ hỏi còn kịp.

## B1 19. b1-partial-source-v3

**Khách/lượt:** Áo với váy là chất gì em? Cả set bao nhiêu, còn hàng không?

**Actual SEND_ELIGIBLE / PASS:**

Áo của set được làm bằng tơ Hàn thêu mềm mại, thoáng mát, còn chân váy là chất ren tơ Hàn bay bổng chị nha. Về giá và tình trạng tồn kho thì hiện tại hệ thống bên em chưa check được trực tiếp, chị cần em hỗ trợ thêm thông tin gì cứ nhắn em nhé ạ!

**Review NEEDS_EDIT:** Đã giữ đúng chất liệu áo/váy và thừa nhận giá/tồn chưa đọc được. Tuy nhiên câu cuối kể hệ thống không check trực tiếp rồi mời nhắn thông tin khác chung chung, trong khi nhu cầu mua cụ thể vẫn dang dở. Cần nói ngắn phần shop chưa trả được; không tạo yêu cầu xin size hoặc hứa handoff giả.

## B1 20. b1-price-v3

**Khách/lượt:** Nguyên set Thạch Thảo bao nhiêu tiền em?

**Actual SEND_ELIGIBLE / PASS:**

Nguyên set Thạch Thảo có giá 799.000đ ạ.

**Review USABLE:** Giá cả set799k đúng và trả ngắn. Không cần chèn thêm lựa chọn, ngân sách hoặc câu hỏi để đủ cấu trúc.

## B1 21. b1-component-stock-v3

**Khách/lượt:** Áo Thạch Thảo có bán riêng không em? Chị lấy size M, còn thì báo chị giá luôn nhé.

**Actual SEND_ELIGIBLE / PASS:**

Áo Thạch Thảo có bán riêng chị nhé. Áo size M hiện còn hàng, giá 499.000đ ạ.

**Review USABLE:** Đủ ba ý áo bán riêng/M còn/499k, đúng cấu hình khách hỏi. Không suy khách đã chọn M thành shop xác nhận fit.

## B1 22. b1-search-read-v3

**Khách/lượt:** Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.

**Actual SEND_ELIGIBLE / PASS:**

Set quần Xuân Thảo (SQ223) hiện bên em vẫn còn hàng chị nhé:

- Mua cả set: 699.000đ
- Mua lẻ áo hoặc quần: 429.000đ/món

Chị muốn lấy cả set hay mua lẻ món nào ạ?

**Review USABLE:** Tìm đúng SQ223/Xuân Thảo, còn hàng và giá bộ699k/lẻ429k mỗi món đúng nguồn. List và hỏi mua bộ/lẻ phục vụ lựa chọn thực, không phải ép CTA cho mọi câu.

## B1 23. b1-buying-concern-v3

**Khách trước:** Chị có sẵn chân váy đen dáng suông rồi.

**Khách/lượt:** Theo em chị mua riêng áo Thạch Thảo hay lấy cả bộ? Chị muốn mặc lại nhiều lần, ngân sách tầm 850 nghìn.

**Actual SEND_ELIGIBLE / PASS:**

Chị lấy cả bộ Thạch Thảo giúp em nhé, giá 799k là vừa vặn trong ngân sách 850k của chị luôn ạ.

Mua cả bộ lợi hơn rất nhiều vì chị vừa có set váy ren tơ thêu sang trọng để mặc đi tiệc hoặc sự kiện, lại vừa có thể tách chiếc áo thêu này phối cùng chân váy đen sẵn có ở nhà để đi làm hay đi chơi, tha hồ mix-match mặc lại nhiều lần mà vẫn mới mẻ.

**Review USABLE:** Chọn cả bộ799k trong850k và giải thích hai cách dùng: diện bộ, tách áo với váy đen khách có để mặc lại. Lợi hơn ở đây nói thêm công dụng/lựa chọn phối, không hứa chi ít hơn áo499k. Giúp em và chuỗi lời khen còn hơi quảng cáo, nhưng khuyến nghị mua và lý do vẫn dùng được; không đổi bar để cấm upsell.

## B1 24. b1-policy-used-v3

**Khách/lượt:** Chị nhận hàng hôm kia, đã cắt tem với giặt qua một lần nhưng chưa mặc ra ngoài. Chị đổi sang mẫu khác được không em?

**Actual SEND_ELIGIBLE / PASS:**

Dạ, quy định đổi hàng của shop yêu cầu sản phẩm phải còn nguyên tem mác và chưa qua giặt ạ. Sản phẩm đã cắt tem và giặt rồi nên bên em không hỗ trợ đổi sang mẫu khác được, chị thông cảm giúp em nhé!

**Review USABLE:** Từ chối đổi ngay vì cắt tem và đã giặt, không dùng còn trong hạn/chưa mặc ngoài làm quyền đổi. Lời thông cảm không gây thêm điều kiện hoặc hứa ngoại lệ.
