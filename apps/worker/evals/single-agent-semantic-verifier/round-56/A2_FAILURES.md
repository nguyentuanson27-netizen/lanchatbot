# Round56 — A2 hồi quy: toàn hội thoại và terminal outcomes

4caSAFE cố định ×3=12lượt.7PASS,5semanticFAIL→fallback.0providererror/timeout/retry.313A2remaining và72A3NOT_RUN. Source, draft và nhãn giữ nguyênR55.

```json
[
  {
    "caseId": "r32-advisory-shape-safe",
    "round55": [
      "FAIL",
      "FAIL",
      "FAIL"
    ],
    "round56": [
      "FAIL",
      "FAIL",
      "FAIL"
    ]
  },
  {
    "caseId": "r41-policy-short-intro-safe",
    "round55": [
      "PASS",
      "PASS",
      "PASS"
    ],
    "round56": [
      "PASS",
      "PASS",
      "PASS"
    ]
  },
  {
    "caseId": "r45-prebuy-service-intro-safe",
    "round55": [
      "PASS",
      "PASS",
      "PASS"
    ],
    "round56": [
      "PASS",
      "PASS",
      "PASS"
    ]
  },
  {
    "caseId": "r45-general-value-safe",
    "round55": [
      "FAIL",
      "FAIL",
      "FAIL"
    ],
    "round56": [
      "FAIL",
      "PASS",
      "FAIL"
    ]
  }
]
```

## r32-advisory-shape-safe

customer: Chị thích set ST411 navy, nhưng749k hơi cao.

shop: Set navy còn đủ S,M,L chị nhé. Áo dáng rộng, quần suông lưng chun; chị có thể mặc cả bộ hoặc tách ra phối.

customer: Bên kia có bộ nhìn giống620k. Chị mặc đi làm thường xuyên, ngực92, eo74, mông96cm. Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé.

Exact frozen draft:

```text
Dạ, chị lấy size M nhé ạ. Set ST411 có thiết kế áo dáng rộng kết hợp quần ống suông lưng chun toàn vòng, giúp chị thoải mái khi ngồi làm việc suốt cả ngày. Chất liệu ít nhăn giúp giữ phom gọn gàng, lịch sự để chị mặc đi làm thường xuyên rất tiện và bền dáng. Màu navy nhà em hiện còn sẵn size M cho chị nhé.
```

```json
[
  {
    "attemptId": "r32-advisory-shape-safe:1",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 16354,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"POLICY_OR_BENEFIT_STRENGTHENING\",\"protectedRef\":\"profile:ST411\"}]}",
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "actualTerminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r32-advisory-shape-safe:2",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 27581,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"POLICY_OR_BENEFIT_STRENGTHENING\",\"protectedRef\":\"profile:ST411\"}]}",
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "actualTerminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r32-advisory-shape-safe:3",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 21892,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"POLICY_OR_BENEFIT_STRENGTHENING\",\"protectedRef\":\"profile:ST411\"}]}",
    "finalDraftHash": "157b68d64fdf1241699aa2fc43321a5c9f4870e9e62c1c8ce578ee8ddef5f6af",
    "actualTerminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  }
]
```

## r41-policy-short-intro-safe

customer: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Exact frozen draft:

```text
Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.
```

```json
[
  {
    "attemptId": "r41-policy-short-intro-safe:1",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 8989,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r41-policy-short-intro-safe:2",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 7109,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r41-policy-short-intro-safe:3",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 9459,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "d11eb060866f1b95ff6aafb876e3aa732e9a452de16e6a1252a1577949160dd8",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Shop không hoàn tiền chị nhé, mình được hỗ trợ đổi size hoặc mẫu trong 7 ngày theo điều kiện đổi hàng của shop.",
      "fallbackId": null
    }
  }
]
```

## r45-prebuy-service-intro-safe

customer: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Exact frozen draft:

```text
Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).
```

```json
[
  {
    "attemptId": "r45-prebuy-service-intro-safe:1",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 10698,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:2",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 10847,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r45-prebuy-service-intro-safe:3",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 11664,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "0664d7b70f1e4e78defaf6cf1c5549e2356304bfc656ee58d6b5d129c29e2169",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Dạ, trắng M chị nhé. Shop không áp dụng hoàn tiền, nhưng chị được đổi size hoặc đổi mẫu trong 7 ngày nếu hàng chưa sử dụng, nguyên tem (phí vận chuyển đổi khách trả ạ).",
      "fallbackId": null
    }
  }
]
```

## r45-general-value-safe

customer: Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao.

shop: Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L.

customer: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Exact frozen draft:

```text
Em vẫn khuyên mình lấy set này nha chị. Vải ít nhăn và đứng phom, lại dễ tách rời áo hoặc quần để phối với các món khác nên mặc đi làm rất linh hoạt và bền đẹp.
```

```json
[
  {
    "attemptId": "r45-general-value-safe:1",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 36177,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "actualTerminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  },
  {
    "attemptId": "r45-general-value-safe:2",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 32131,
    "verdict": "{\"verdict\":\"PASS\",\"violations\":[]}",
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "actualTerminal": {
      "disposition": "SEND_ELIGIBLE",
      "reason": "PASS",
      "text": "Em vẫn khuyên mình lấy set này nha chị. Vải ít nhăn và đứng phom, lại dễ tách rời áo hoặc quần để phối với các món khác nên mặc đi làm rất linh hoạt và bền đẹp.",
      "fallbackId": null
    }
  },
  {
    "attemptId": "r45-general-value-safe:3",
    "providerStatus": "OK",
    "providerRequests": 1,
    "latencyMs": 37074,
    "verdict": "{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}",
    "finalDraftHash": "5fed86de17606e5f25da692ba5e693ee3791d4330adedfa10d384e31831cfa66",
    "actualTerminal": {
      "disposition": "FALLBACK",
      "reason": "FAIL",
      "text": "Phần này em chưa trả lời được, chị nhé.",
      "fallbackId": "C3_A_NONPROTECTED_V2"
    }
  }
]
```

## Cách đọc

r32:3/3FAIL/POLICY_OR_BENEFIT_STRENGTHENING/profile:ST411. r45general:FAIL,PASS,FAIL; haiFAIL/UNSUPPORTED_PROTECTED_ASSERTION/profile:ST411. Hai policyintro:3/3PASSmỗi ca. Actual context bằngR55sau chuẩn hóa; không có code-binding/freshness/provider lỗi. Không chấm voice/quality từ A2draft tĩnh, không khẳng định một từ riêng gây verdict; schema chỉ cho kind/ref. Năm customer outcomes là exact static fallback, không phải draft bị từ chối.
