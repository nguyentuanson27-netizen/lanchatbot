# B2/B3 — toàn bộ7bước và kết quả thực tế

N1, public sources/isolated PostgreSQL/capture transport. Phần private preview nếu có được lưu qua redaction hiện có; không dùng draft bị chặn để chấm kết quả.

## 1. stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Terminal:** SEND_ELIGIBLE/PASS

**Tin đã capture:**

Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho mình rồi ạ.

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 4,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 1,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
        "parentProductId": "SV2447",
        "offerId": "AO",
        "offerKind": "DIRECT",
        "quantity": 1,
        "components": [
          {
            "componentProductId": "SV2447_AO",
            "componentSku": "SV2447_AO",
            "componentRole": "TOP",
            "color": "BE",
            "size": "M",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 499000
      }
    ],
    "adjustments": [],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 499000,
    "discountTotalVnd": 0,
    "grandTotalVnd": 529000,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:13.635Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 2. stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Terminal:** SEND_ELIGIBLE/PASS

**Tin đã capture:**

Dạ em đã đổi áo sang size L và cập nhật số lượng thành 2 chiếc trong giỏ cho mình rồi ạ.

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 3,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "3af5fbc8-5d8a-5882-8e87-d93edf752961",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "20e4ff50-2d98-5dce-b529-edd8a16dfb70",
          "authorizedAt": "2026-10-16T03:24:49.561Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:49.561Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 3. stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Terminal:** SEND_ELIGIBLE/PASS

**Tin đã capture:**

Dạ tổng tiền 2 áo bao gồm phí ship của mình là 978.100đ ạ (đã gồm 30.000đ phí ship và ưu đãi giảm 49.900đ).

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 3,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "3af5fbc8-5d8a-5882-8e87-d93edf752961",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "20e4ff50-2d98-5dce-b529-edd8a16dfb70",
          "authorizedAt": "2026-10-16T03:24:49.561Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:49.561Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 76,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 98,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:23:57.695Z",
        "sourceEventHash": "47499538ba24d151ada03f0486786c444d9bd43dbc14f86fcd33aaa0c7233cc8"
      }
    }
  ],
  "customerProfileRevision": 2
}
```

## 4. stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Terminal:** SEND_ELIGIBLE/PASS

**Tin đã capture:**

Dạ em đã cập nhật lại số đo mới cho mình rồi ạ.

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 3,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "3af5fbc8-5d8a-5882-8e87-d93edf752961",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "20e4ff50-2d98-5dce-b529-edd8a16dfb70",
          "authorizedAt": "2026-10-16T03:24:49.561Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:49.561Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 5. stateful-private-checkout

**Khách:** [Biểu mẫu checkout tổng hợp; code-only, không đưa thông tin riêng tư vào model.]

**Terminal:** HANDOFF/DEPENDENCY_FAILURE

**Tin đã capture:**

Không có tin trong capture.

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 3,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "3af5fbc8-5d8a-5882-8e87-d93edf752961",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "20e4ff50-2d98-5dce-b529-edd8a16dfb70",
          "authorizedAt": "2026-10-16T03:24:49.561Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:49.561Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 6. stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Terminal:** NO_SEND/CURRENT_AUTHORITY_CHANGED

**Tin đã capture:**

Không có tin trong capture.

**Public state đã commit:**

```json
{
  "stage": "CART_OPEN",
  "revision": 6,
  "cart": {
    "schemaVersion": 1,
    "cartId": "3db00b66-6b7d-5556-891d-c354e9445179",
    "salesEpisodeId": "333e8c00-3728-573c-8561-63b783d09172",
    "customerProfileId": "1823da36-c62d-4967-b358-230263894f7f",
    "revision": 3,
    "currency": "VND",
    "status": "OPEN",
    "checkoutEligibility": "ELIGIBLE",
    "lines": [
      {
        "lineId": "4b3b1714-e096-5dfc-8ec4-572ff97ca55e",
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
            "observedAt": "2026-10-16T03:02:38.872Z",
            "expiresAt": "2026-10-18T03:02:38.872Z",
            "freshForSeconds": 172800,
            "freshnessState": "FRESH"
          }
        },
        "lineTotalVnd": 998000
      }
    ],
    "adjustments": [
      {
        "adjustmentId": "3af5fbc8-5d8a-5882-8e87-d93edf752961",
        "kind": "PERCENT_DISCOUNT",
        "amountVnd": 49900,
        "percentageBps": 500,
        "policyAuthorization": {
          "policyBundleId": "admin-policy:1198992073286645",
          "policyBundleVersion": "1a618942f5821335db2e00be8c71ea7a",
          "ruleId": "SHOP_WIDE_MULTI_ITEM_PERCENT",
          "decisionId": "20e4ff50-2d98-5dce-b529-edd8a16dfb70",
          "authorizedAt": "2026-10-16T03:24:49.561Z"
        }
      }
    ],
    "shippingFeeVnd": 30000,
    "subtotalVnd": 998000,
    "discountTotalVnd": 49900,
    "grandTotalVnd": 978100,
    "createdAt": "2026-10-16T03:24:13.635Z",
    "updatedAt": "2026-10-16T03:24:49.561Z"
  },
  "measurements": [
    {
      "kind": "WAIST_CM",
      "value": 74,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    },
    {
      "kind": "HIPS_CM",
      "value": 96,
      "provenance": {
        "source": "CUSTOMER_MESSAGE",
        "confidence": 1,
        "observedAt": "2026-10-16T03:25:25.533Z",
        "sourceEventHash": "1354cd94f6381e370eb69af9501e9f3cf829fe4275e2355b1342fdee4749eba5"
      }
    }
  ],
  "customerProfileRevision": 3
}
```

## 7. stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Terminal:** HANDOFF/CUSTOMER_REQUESTED_HUMAN

**Tin đã capture:**

Không có tin trong capture.

**Public state đã commit:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
  "cart": null,
  "measurements": [],
  "customerProfileRevision": 1
}
```
