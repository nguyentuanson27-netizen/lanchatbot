# B2/B3 — toàn bộ7kết quả thực tế

Gemini3.5FlashLiteHigh owner; GPT-6.1SolHigh verifier. N1, database thử riêng và capture transport, không gửi khách thật. Primary đọc toàn bộ tin khách, tin đã capture/terminal và state; không dùng nháp bị chặn/verdict details để cứu điểm.

## 1. stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Terminal:** SEND_ELIGIBLE/PASS

**Tin thực tế đã capture:**

Áo Thạch Thảo màu be size M giá 499.000đ, mẫu này hiện ở trạng thái đặt trước chị nhé.

**State đã commit:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
  "cart": null,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 2. stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Terminal:** NO_SEND/EGRESS_READINESS

**Tin thực tế đã capture:**

Không có tin gửi trong capture.

**State đã commit:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
  "cart": null,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 3. stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Terminal:** FALLBACK/BUDGET

**Tin thực tế đã capture:**

Phần này em chưa trả lời được, chị nhé.

**State đã commit:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
  "cart": null,
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:09:08.220Z",
        "sourceEventHash": "707843ae5f01999b9324d6d7f0c568107f6f178abd2c02a7f9cae754b960f45f"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 4. stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Terminal:** SEND_ELIGIBLE/RECEIPT_BACKED_ACK

**Tin thực tế đã capture:**

Giỏ hàng đã được cập nhật, chị nhé.

**State đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 4,
  "cart": {
    "schemaVersion": 1,
    "cartId": "4b7674e3-e46a-59b1-8a65-d5d65b50f71c",
    "salesEpisodeId": "78b6fee6-d010-5cb2-86c9-7741058dca3e",
    "customerProfileId": "abd2794b-ccc4-44b9-9238-c815d2fd31d7",
    "revision": 1,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "e9d2ea2c-33d7-5516-8736-4ea63cec814e",
        "parentProductId": "SV2447",
        "offerId": "AO",
        "offerKind": "DIRECT",
        "quantity": 2,
        "components": [
          {
            "componentProductId": "SV2447_AO",
            "componentSku": "SV2447_AO",
            "componentRole": "TOP",
            "color": "BE",
            "size": "L",
            "quantity": 1
          }
        ],
        "allowMixedSizes": false,
        "allowComponentSale": false,
        "posUnitPriceVnd": 499000,
        "priceAuthority": {
          "priceFactRef": "price:sha256:150b7a8a052ceba9fe92d0c6ff4dc9de489ea024004b87a182c60f35ee723105",
          "shopId": "LANA_DESIGN",
          "parentProductId": "SV2447",
          "offerId": "AO",
          "offerPriceKind": "DIRECT",
          "componentProductId": null,
          "metadata": {
            "authority": "PANCAKE_POS",
            "sourceVersion": "p2-default",
            "observedAt": "2026-10-15T23:02:38.268Z",
            "expiresAt": "2026-10-17T23:02:38.268Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "265b5d71-5481-5403-a599-96e236f13bb9",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "1bc7b6df-2d40-5baf-a0e0-cc2808cfdfb1",
          "authorizedAt": "2026-10-15T23:11:06.593Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-15T23:11:06.593Z",
    "updatedAt": "2026-10-15T23:11:06.593Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 5. stateful-private-checkout

**Khách:** [Biểu mẫu checkout tổng hợp; xử lý code-only, không đưa thông tin riêng tư vào model.]

**Terminal:** HANDOFF/DEPENDENCY_FAILURE

**Tin thực tế đã capture:**

Không có tin gửi trong capture.

**State đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 4,
  "cart": {
    "schemaVersion": 1,
    "cartId": "4b7674e3-e46a-59b1-8a65-d5d65b50f71c",
    "salesEpisodeId": "78b6fee6-d010-5cb2-86c9-7741058dca3e",
    "customerProfileId": "abd2794b-ccc4-44b9-9238-c815d2fd31d7",
    "revision": 1,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "e9d2ea2c-33d7-5516-8736-4ea63cec814e",
        "parentProductId": "SV2447",
        "offerId": "AO",
        "offerKind": "DIRECT",
        "quantity": 2,
        "components": [
          {
            "componentProductId": "SV2447_AO",
            "componentSku": "SV2447_AO",
            "componentRole": "TOP",
            "color": "BE",
            "size": "L",
            "quantity": 1
          }
        ],
        "allowMixedSizes": false,
        "allowComponentSale": false,
        "posUnitPriceVnd": 499000,
        "priceAuthority": {
          "priceFactRef": "price:sha256:150b7a8a052ceba9fe92d0c6ff4dc9de489ea024004b87a182c60f35ee723105",
          "shopId": "LANA_DESIGN",
          "parentProductId": "SV2447",
          "offerId": "AO",
          "offerPriceKind": "DIRECT",
          "componentProductId": null,
          "metadata": {
            "authority": "PANCAKE_POS",
            "sourceVersion": "p2-default",
            "observedAt": "2026-10-15T23:02:38.268Z",
            "expiresAt": "2026-10-17T23:02:38.268Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "265b5d71-5481-5403-a599-96e236f13bb9",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "1bc7b6df-2d40-5baf-a0e0-cc2808cfdfb1",
          "authorizedAt": "2026-10-15T23:11:06.593Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-15T23:11:06.593Z",
    "updatedAt": "2026-10-15T23:11:06.593Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 6. stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Terminal:** NO_SEND/CURRENT_AUTHORITY_CHANGED

**Tin thực tế đã capture:**

Không có tin gửi trong capture.

**State đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 4,
  "cart": {
    "schemaVersion": 1,
    "cartId": "4b7674e3-e46a-59b1-8a65-d5d65b50f71c",
    "salesEpisodeId": "78b6fee6-d010-5cb2-86c9-7741058dca3e",
    "customerProfileId": "abd2794b-ccc4-44b9-9238-c815d2fd31d7",
    "revision": 1,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "e9d2ea2c-33d7-5516-8736-4ea63cec814e",
        "parentProductId": "SV2447",
        "offerId": "AO",
        "offerKind": "DIRECT",
        "quantity": 2,
        "components": [
          {
            "componentProductId": "SV2447_AO",
            "componentSku": "SV2447_AO",
            "componentRole": "TOP",
            "color": "BE",
            "size": "L",
            "quantity": 1
          }
        ],
        "allowMixedSizes": false,
        "allowComponentSale": false,
        "posUnitPriceVnd": 499000,
        "priceAuthority": {
          "priceFactRef": "price:sha256:150b7a8a052ceba9fe92d0c6ff4dc9de489ea024004b87a182c60f35ee723105",
          "shopId": "LANA_DESIGN",
          "parentProductId": "SV2447",
          "offerId": "AO",
          "offerPriceKind": "DIRECT",
          "componentProductId": null,
          "metadata": {
            "authority": "PANCAKE_POS",
            "sourceVersion": "p2-default",
            "observedAt": "2026-10-15T23:02:38.268Z",
            "expiresAt": "2026-10-17T23:02:38.268Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "265b5d71-5481-5403-a599-96e236f13bb9",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "1bc7b6df-2d40-5baf-a0e0-cc2808cfdfb1",
          "authorizedAt": "2026-10-15T23:11:06.593Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-15T23:11:06.593Z",
    "updatedAt": "2026-10-15T23:11:06.593Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-15T23:10:45.527Z",
        "sourceEventHash": "d5a4bf0843579c3cc3d4209b9994d6a020dfb14cf1fcbd9fe85119dcf8edd477"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 7. stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Terminal:** UNRECORDED_AFTER_HOST_INTERRUPTION/HANDOFF_COMMIT_READ_BACK_TERMINAL_UNKNOWN

**Tin thực tế đã capture:**

UNKNOWN: tiến trình bị ngắt trước khi lưu terminal/capture lượt7. Database readback xác nhận handoff commit; không tạo provider result thay thế.

**State đã commit:**

```json
{
  "conversationOwner": "HUMAN",
  "handoffEvent": {
    "conversation_id": "c044b50b-643a-4551-8415-41283eafa2b6",
    "direction": "BOT_TO_HUMAN",
    "source": "CUSTOMER_REQUEST",
    "reason_code": "CUSTOMER_REQUESTED_HUMAN",
    "owner_before": "BOT",
    "owner_after": "HUMAN",
    "handoff_generation": "1",
    "desired_tag": "NHAN_VIEN",
    "occurred_at": "2026-10-15T23:11:55.376Z"
  },
  "tagIntent": {
    "conversation_id": "c044b50b-643a-4551-8415-41283eafa2b6",
    "desired_tag": "NHAN_VIEN",
    "handoff_generation": "1",
    "status": "PENDING"
  },
  "handoffCase": {
    "conversation_id": "c044b50b-643a-4551-8415-41283eafa2b6",
    "status": "NEW"
  }
}
```
