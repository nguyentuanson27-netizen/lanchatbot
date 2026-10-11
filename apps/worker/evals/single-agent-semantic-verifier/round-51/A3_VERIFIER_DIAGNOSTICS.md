# R51 — rejected draft diagnostics after primary review

Raw commit 9c8ce7e36cbe6c1651aec4873161c8a5b58cc7b1;primary commit c90e1cdf21095b30c3b9b770b838f0654bfdda4e. Actual terminal scored first;rejected drafts are diagnostic only.

## r7-exchange-after-use:3

```text
Set đã mặc đi làm thì bên em không nhận đổi chị ạ. Shop hỗ trợ đổi mẫu hoặc đổi size trong 7 ngày từ khi nhận với hàng chưa sử dụng, thử trong nhà; phí gửi đổi hàng chị thanh toán nhé.
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
