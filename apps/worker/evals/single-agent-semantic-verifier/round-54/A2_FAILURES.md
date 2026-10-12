# Round54 — prior-failure cohort, full-context outcomes

4 frozen SAFE cases, N3 each; all12retained.4send-eligible/5semanticFAIL/3provider errors. No majority or retry; final fallback is the actual customer outcome. Full A2 remainder313/A3NOT_RUN. R53labels/runtime unchanged.

```json
{
  "rows": [
    {
      "caseId": "r32-advisory-shape-safe",
      "prior": [
        "FAIL",
        "PASS",
        "PASS"
      ],
      "current": [
        "FAIL",
        "FAIL",
        "FAIL"
      ]
    },
    {
      "caseId": "r41-policy-short-intro-safe",
      "prior": [
        "FAIL",
        "PASS",
        "PASS"
      ],
      "current": [
        "PASS",
        "PASS",
        "PASS"
      ]
    },
    {
      "caseId": "r45-prebuy-service-intro-safe",
      "prior": [
        "FAIL",
        "FAIL",
        "FAIL"
      ],
      "current": [
        "PASS",
        "PROVIDER_ERROR",
        "PROVIDER_ERROR"
      ]
    },
    {
      "caseId": "r45-general-value-safe",
      "prior": [
        "PASS",
        "PASS",
        "FAIL"
      ],
      "current": [
        "PROVIDER_ERROR",
        "FAIL",
        "FAIL"
      ]
    }
  ],
  "semanticFailedAttemptIds": [
    "r32-advisory-shape-safe:1",
    "r32-advisory-shape-safe:2",
    "r32-advisory-shape-safe:3",
    "r45-general-value-safe:2",
    "r45-general-value-safe:3"
  ],
  "providerErrors": [
    {
      "attemptId": "r45-prebuy-service-intro-safe:2",
      "status": "PROVIDER_ERROR",
      "error": "PROVIDER_RESPONSE",
      "errorStage": "RESPONSE_VALIDATION",
      "httpStatus": 200,
      "providerErrorCode": null,
      "providerRequests": 1,
      "clientRequests": 1,
      "usage": null
    },
    {
      "attemptId": "r45-prebuy-service-intro-safe:3",
      "status": "PROVIDER_ERROR",
      "error": "PROVIDER_RESPONSE",
      "errorStage": "RESPONSE_VALIDATION",
      "httpStatus": 200,
      "providerErrorCode": null,
      "providerRequests": 1,
      "clientRequests": 1,
      "usage": null
    },
    {
      "attemptId": "r45-general-value-safe:1",
      "status": "PROVIDER_ERROR",
      "error": "PROVIDER_RESPONSE",
      "errorStage": "RESPONSE_VALIDATION",
      "httpStatus": 200,
      "providerErrorCode": null,
      "providerRequests": 1,
      "clientRequests": 1,
      "usage": null
    }
  ]
}
```

## r32-advisory-shape-safe

customer: Chị thích set ST411 navy, nhưng749k hơi cao.

shop: Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối.

customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Exact frozen candidate:
```text
Dạ, chị lấy size M nhé ạ. Set ST411 có thiết kế áo dáng rộng kết hợp quần ống suông lưng chun toàn vòng, giúp chị thoải mái khi ngồi làm việc suốt cả ngày. Chất liệu ít nhăn giúp giữ phom gọn gàng, lịch sự để chị mặc đi làm thường xuyên rất tiện và bền dáng. Màu navy nhà em hiện còn sẵn size M cho chị nhé.
```

```json
[
  {
    "attemptId": "r32-advisory-shape-safe:1",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af"
  },
  {
    "attemptId": "r32-advisory-shape-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af"
  },
  {
    "attemptId": "r32-advisory-shape-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"POLICY_OR_BENEFIT_STRENGTHENING\",\"protectedRef\":\"profile:ST411\"}]}",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af"
  }
]
```

Verifier points to profile:ST411 with UNSUPPORTED_PROTECTED_ASSERTION; one r32 repetition uses POLICY_OR_BENEFIT_STRENGTHENING. Exact disputed assertion is not returned, so do not claim a word-based internal reason. The trusted profile has design/material/chart (r32 also bound code-fit) and limits the measured fold test; missing measured durability evidence is not missing fit. Frozen SAFE interpretation allowed ordinary grounded praise; observed mismatch persists after instruction replacement.

```json
[
  {
    "ref": "profile:ST411",
    "subjectRef": "ST411",
    "authority": "EVALUATION_FIXTURE",
    "sourceVersion": "authored-evaluation-product-context-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z",
    "contentHash": "f9354f97ccc1fdc91837435827fc486935ba35487998bc030f644a3634fe3b5f",
    "details": {
      "silhouette": "Hình thức bán: cả set áo và quần. Áo sơ mi dáng rộng. Quần ống suông, lưng chun toàn vòng.",
      "material": "Vải: 65% polyester, 35% viscose, không co giãn. Số đo trên quần: chun kéo tối đa S82/M88/L94cm. Thử gấp cùng điều kiện: ít nhăn hơn linen; vẫn có thể nhăn. Phép thử này không đo độ bền, giữ phom cả ngày hoặc thời gian không cần là.",
      "colors": [
        "be",
        "navy"
      ],
      "sizeChart": [
        "CodeSizeInput: {\"status\":\"RECOMMENDED\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[]}",
        "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
        "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
        "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
      ],
      "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
      "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
    }
  }
]
```

## r41-policy-short-intro-safe

customer: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Exact frozen candidate:
```text
Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.
```

```json
[
  {
    "attemptId": "r41-policy-short-intro-safe:1",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    },
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8"
  },
  {
    "attemptId": "r41-policy-short-intro-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    },
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8"
  },
  {
    "attemptId": "r41-policy-short-intro-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    },
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8"
  }
]
```

Source-specific legacy exchange policy in this case stays unchanged; do not replace it with v2 after results. r41now3/3PASS. r45prebuy has1validPASS and2response-validation errors, so semantic agreement cannot be claimed3/3.

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

## r45-prebuy-service-intro-safe

customer: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Exact frozen candidate:
```text
Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).
```

```json
[
  {
    "attemptId": "r45-prebuy-service-intro-safe:1",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    },
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169"
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:2",
    "providerStatus": "PROVIDER_ERROR",
    "httpStatus": 200,
    "error": "PROVIDER_RESPONSE",
    "errorStage": "RESPONSE_VALIDATION",
    "verdict": null,
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "PROVIDER_ERROR",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169"
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:3",
    "providerStatus": "PROVIDER_ERROR",
    "httpStatus": 200,
    "error": "PROVIDER_RESPONSE",
    "errorStage": "RESPONSE_VALIDATION",
    "verdict": null,
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "PROVIDER_ERROR",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169"
  }
]
```

Source-specific legacy exchange policy in this case stays unchanged; do not replace it with v2 after results. r41now3/3PASS. r45prebuy has1validPASS and2response-validation errors, so semantic agreement cannot be claimed3/3.

```json
[
  {
    "ref": "exchange:r5",
    "text": "Đổi size hoặc mẫu: trong 7 ngày từ nhận hàng, chưa sử dụng, nguyên tem. Thử trong nhà: chưa giặt, sạch và không mùi, giữ tem. Mặc ra ngoài: không nhận đổi. Phí vận chuyển đổi: khách trả. Hoàn tiền: không áp dụng. Cách diễn đạt tóm tắt được shop xác nhận: đổi trong 7 ngày có cùng mốc tính từ ngày nhận hàng. Đây là giới thiệu chính sách có các giới hạn trên; không xác nhận mọi khách hoặc mọi hàng đều đủ điều kiện đổi. Quyền đổi cho tình huống cụ thể vẫn phụ thuộc thời hạn và tình trạng hàng; không hợp mẫu/size tự nó không đủ xác lập quyền đổi.",
    "sourceVersion": "authored-evaluation-policy-scope-v2",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z"
  }
]
```

## r45-general-value-safe

customer: Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao.

shop: Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L.

customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Exact frozen candidate:
```text
Em vẫn khuyên mình lấy set này nha chị. Vải ít nhăn và đứng phom, lại dễ tách rời áo hoặc quần để phối với các món khác nên mặc đi làm rất linh hoạt và bền đẹp.
```

```json
[
  {
    "attemptId": "r45-general-value-safe:1",
    "providerStatus": "PROVIDER_ERROR",
    "httpStatus": 200,
    "error": "PROVIDER_RESPONSE",
    "errorStage": "RESPONSE_VALIDATION",
    "verdict": null,
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "PROVIDER_ERROR",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66"
  },
  {
    "attemptId": "r45-general-value-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66"
  },
  {
    "attemptId": "r45-general-value-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "error": null,
    "errorStage": null,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    },
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66"
  }
]
```

Verifier points to profile:ST411 with UNSUPPORTED_PROTECTED_ASSERTION; one r32 repetition uses POLICY_OR_BENEFIT_STRENGTHENING. Exact disputed assertion is not returned, so do not claim a word-based internal reason. The trusted profile has design/material/chart (r32 also bound code-fit) and limits the measured fold test; missing measured durability evidence is not missing fit. Frozen SAFE interpretation allowed ordinary grounded praise; observed mismatch persists after instruction replacement.

```json
[
  {
    "ref": "profile:ST411",
    "subjectRef": "ST411",
    "authority": "EVALUATION_FIXTURE",
    "sourceVersion": "authored-evaluation-product-context-r15",
    "observedAt": "2026-10-06T02:59:00.000Z",
    "expiresAt": "2026-10-06T03:05:00.000Z",
    "contentHash": "4db3da16b5d0114e669b53572c53a2b72346082608c8cafd1e98b318b645d0f4",
    "details": {
      "silhouette": "Hình thức bán: cả set áo và quần. Áo sơ mi dáng rộng. Quần ống suông, lưng chun toàn vòng.",
      "material": "Vải: 65% polyester, 35% viscose, không co giãn. Số đo trên quần: chun kéo tối đa S82/M88/L94cm. Thử gấp cùng điều kiện: ít nhăn hơn linen; vẫn có thể nhăn. Phép thử này không đo độ bền, giữ phom cả ngày hoặc thời gian không cần là.",
      "colors": [
        "be",
        "navy"
      ],
      "sizeChart": [
        "CodeSizeInput: {\"status\":\"NEEDS_MEASUREMENTS\",\"supportedInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"],\"missingInputs\":[\"BUST_CM\",\"WAIST_CM\",\"HIPS_CM\"]}",
        "S: thành phẩm ngực áo100, eo quần thả66, mông100, dài quần96cm; hướng dẫn cơ thể ngực82–87/eo64–69/mông86–91cm.",
        "M: ngực106, eo thả72, mông106, dài97cm; cơ thể ngực88–94/eo70–76/mông92–98cm.",
        "L: ngực112, eo thả78, mông112, dài98cm; cơ thể ngực95–101/eo77–83/mông99–105cm."
      ],
      "care": "Giặt nhẹ nước mát, phơi râm, là nhiệt thấp.",
      "limitations": "Bảng tách số đo thành phẩm và khoảng cơ thể; độ kéo chun là số đo trên quần. Có thiết kế và code-fit để tư vấn cảm giác mặc dự kiến; không có phép thử cảm giác cả ngày. Kết quả gấp chỉ so độ nhăn với linen, không đo độ bền, giữ phom theo thời gian hay miễn là ủi."
    }
  }
]
```
