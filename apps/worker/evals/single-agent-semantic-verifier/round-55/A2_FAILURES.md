# Round55 — A2 prior-failure cohort

Four immutable SAFE cases ×3 =12attempts. All12survived hard precheck and invoked the verifier once:6SEND_ELIGIBLE,6semanticFAIL→actual staticfallback. Provider errors/timeouts0. Labels/runtime/source preserved fromR54. All313remainingA2/72A3registrations NOT_RUN.

```json
{
  "rows": [
    {
      "caseId": "r32-advisory-shape-safe",
      "round54": [
        "FAIL",
        "FAIL",
        "FAIL"
      ],
      "round55": [
        "FAIL",
        "FAIL",
        "FAIL"
      ]
    },
    {
      "caseId": "r41-policy-short-intro-safe",
      "round54": [
        "PASS",
        "PASS",
        "PASS"
      ],
      "round55": [
        "PASS",
        "PASS",
        "PASS"
      ]
    },
    {
      "caseId": "r45-prebuy-service-intro-safe",
      "round54": [
        "PASS",
        "PROVIDER_ERROR",
        "PROVIDER_ERROR"
      ],
      "round55": [
        "PASS",
        "PASS",
        "PASS"
      ]
    },
    {
      "caseId": "r45-general-value-safe",
      "round54": [
        "PROVIDER_ERROR",
        "FAIL",
        "FAIL"
      ],
      "round55": [
        "FAIL",
        "FAIL",
        "FAIL"
      ]
    }
  ],
  "failures": [
    {
      "attemptId": "r32-advisory-shape-safe:1",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
    },
    {
      "attemptId": "r32-advisory-shape-safe:2",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
    },
    {
      "attemptId": "r32-advisory-shape-safe:3",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
    },
    {
      "attemptId": "r45-general-value-safe:1",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
    },
    {
      "attemptId": "r45-general-value-safe:2",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
    },
    {
      "attemptId": "r45-general-value-safe:3",
      "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
      "terminal": {
        "disposition": "FALLBACK",
        "reason": "FAIL",
        "text": "Phần này em chưa trả lời được, chị nhé.",
        "fallbackId": "C3_A_NONPROTECTED_V2"
      }
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
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 22908,
    "providerRequests": 1,
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r32-advisory-shape-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 19959,
    "providerRequests": 1,
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r32-advisory-shape-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 20609,
    "providerRequests": 1,
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  }
]
```

Cả3verdict đều UNSUPPORTED_PROTECTED_ASSERTION/profile:ST411. Prompt cho phép lời tư vấn dáng mặc/cảm giác/giá trị có căn cứ; source có thiết kế, chất liệu, phép thử gấp và giới hạn phép thử. Mâu thuẫn còn lại ở cách hiểu lời thuyết phục so với hứa kết quả sử dụng/độ bền. Schema không trả câu bị chặn/lý do, nên không được quy chắc FAIL cho một cụm riêng. Context thực gửi bằngR54 sau chuẩn hóa instructions/requestId; chưa có bằng chứng mất facts. Actual terminal cả3 là fallback, không phải candidate.

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
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 10243,
    "providerRequests": 1,
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r41-policy-short-intro-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 7243,
    "providerRequests": 1,
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r41-policy-short-intro-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 7935,
    "providerRequests": 1,
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  }
]
```

Cả3PASS; exact final draft là customer-visible send-eligible outcome. Đây là lời giới thiệu theo policy world riêng của fixture legacy; không phải kết quả kiểm chứng source v2 mới hoặc mọi ca chính sách.

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
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 12686,
    "providerRequests": 1,
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 12710,
    "providerRequests": 1,
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "latencyMs": 13506,
    "providerRequests": 1,
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "terminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  }
]
```

Cả3PASS; exact final draft là customer-visible send-eligible outcome. Đây là lời giới thiệu theo policy world riêng của fixture legacy; không phải kết quả kiểm chứng source v2 mới hoặc mọi ca chính sách.

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
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 20588,
    "providerRequests": 1,
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r45-general-value-safe:2",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 26451,
    "providerRequests": 1,
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r45-general-value-safe:3",
    "providerStatus": "OK",
    "httpStatus": 200,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "latencyMs": 18448,
    "providerRequests": 1,
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "terminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  }
]
```

Cả3verdict đều UNSUPPORTED_PROTECTED_ASSERTION/profile:ST411. Prompt cho phép lời tư vấn dáng mặc/cảm giác/giá trị có căn cứ; source có thiết kế, chất liệu, phép thử gấp và giới hạn phép thử. Mâu thuẫn còn lại ở cách hiểu lời thuyết phục so với hứa kết quả sử dụng/độ bền. Schema không trả câu bị chặn/lý do, nên không được quy chắc FAIL cho một cụm riêng. Context thực gửi bằngR54 sau chuẩn hóa instructions/requestId; chưa có bằng chứng mất facts. Actual terminal cả3 là fallback, không phải candidate.
