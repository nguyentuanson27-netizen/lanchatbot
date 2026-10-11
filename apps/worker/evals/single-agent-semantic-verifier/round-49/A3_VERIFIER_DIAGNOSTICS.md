# R49 — post-primary-review rejection diagnostics

Rawcommit 8773fe2abdef7eeefa564a958013f84869c8c844;primaryscorecommit 662e9b42dcd5026f2a6f07e5bad7b6d89c93b813. Actual terminal was scored first;drafts/verdicts below are diagnostics only,not quality evidence for what customer received.

## r5-competitor-price:3

```text
Chất vải pha polyester ít nhăn, mặc ngồi làm việc cả ngày ở văn phòng vẫn giữ được độ phẳng phiu, đứng dáng chị ạ.
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}"
}
```

## r7-exchange-after-use:1

```text
Dạ, shop hỗ trợ đổi trong 7 ngày từ khi nhận, với điều kiện hàng nguyên tem, chưa sử dụng và chỉ thử trong nhà (mình mặc ra ngoài đi làm rồi sẽ không nhận đổi ạ). Phí đổi hàng khách trả chị nhé.
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"exchange:r5\"}]}"
}
```

## r7-exchange-after-use:2

```text
Dạ, shop hỗ trợ đổi trong 7 ngày kể từ lúc nhận chị nhé, với điều kiện sản phẩm chưa sử dụng, sạch, còn nguyên tem và chỉ thử trong nhà. Mặc đi làm ở ngoài thì shop không nhận đổi ạ. Phí đổi khách trả chị nha.
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"exchange:r5\"}]}"
}
```

## r7-exchange-after-use:3

```text
Dạ, shop hỗ trợ đổi trong 7 ngày với điều kiện sản phẩm chỉ thử trong nhà, chưa mặc đi làm hay ra ngoài chị nhé. Phí đổi hàng khách thanh toán giúp shop ạ.
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"exchange:r5\"}]}"
}
```

## r14-stage-light-change:2

```text
Size M trắng bên em vẫn còn chị nhé. Đèn sân khấu chiếu từ phía sau sẽ thấy bóng áo lót, mình không nên lấy trắng cho dịp này ạ.
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:SM613\"}]}"
}
```

## r14-refund-before-buy:1

```text
Dạ, shop không áp dụng hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày kể từ khi nhận hàng (sản phẩm giữ nguyên tem, chưa sử dụng và chỉ thử trong nhà, phí ship đổi khách thanh toán ạ).
```

```json
{
  "terminal": {
    "disposition": "FALLBACK",
    "reason": "FAIL",
    "text": "Phần này em chưa trả lời được, chị nhé.",
    "fallbackId": "C3_A_NONPROTECTED_V2"
  },
  "providerStatus": "OK",
  "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"MATERIAL_CONDITION_LOSS\",\"protectedRef\":\"exchange:r5\"}]}"
}
```
