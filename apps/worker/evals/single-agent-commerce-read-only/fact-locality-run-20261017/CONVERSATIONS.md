# Toàn bộ bảy stateful outcomes

Một hành trình sáu lượt và human-request control riêng; capture-only, không tin gửi khách thật. Sourcec6476301, raw savepoint2dffdfa7.

## 1. stateful-open

**Khách/lượt:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Actual SEND_ELIGIBLE / PASS:**

Dạ em đã thêm áo Thạch Thảo màu be size M vào giỏ cho mình rồi ạ!

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
        "quantity": 1,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "M",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Đã thêm đúng áo lẻ be/M×1; profile nhận76/98, giỏ revision1. Câu ACK đúng tác vụ khách yêu cầu, không đọc lại số đo hay tự chứng minh fit. USABLE chỉ ở bước tạo giỏ; chưa phải hàng sẵn hoặc giao dịch mua hoàn tất.

## 2. stateful-variant-quantity

**Khách/lượt:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Actual SEND_ELIGIBLE / PASS:**

Dạ em đã đổi áo sang size L và lấy 2 chiếc cho chị rồi ạ!

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
        "quantity": 2,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Đổi đúng L và quantity2 ngay trong lượt; màuBE giữ nguyên, giỏ revision3. Câu trả lời khớp cả hai thay đổi, không cần lượt sau cứu số lượng.

## 3. stateful-quote

**Khách/lượt:** Hai áo cả phí ship là bao nhiêu em?

**Actual SEND_ELIGIBLE / PASS:**

Dạ hai chiếc áo Thạch Thảo size L của mình sau khi áp ưu đãi và cộng 30.000đ phí ship thì tổng thanh toán là 978.100đ ạ!

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
        "quantity": 2,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Trả đúng tổng978.100đ và phí ship30.000đ theo giỏ hiện hành. Đáp ứng câu hỏi tiền, không tự thêm một bước mua hoặc khẳng định đã tạo đơn.

## 4. stateful-correction

**Khách/lượt:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Actual SEND_ELIGIBLE / PASS:**

Dạ em đã cập nhật lại số đo cho chị rồi ạ. Áo Thạch Thảo size L chị đang chọn vẫn được giữ nguyên trong giỏ nhé ạ!

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
        "quantity": 2,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review USABLE:** Profile nhận correction74/96/revision3; giỏ vẫn L/BE×2. ACK xác nhận sửa và giữ lựa chọn đúng yêu cầu, không đọc lại toàn bộ số đo hoặc chốt fit. Giọng còn dài ở phần báo trạng thái và “nhé ạ!”, nhưng chưa làm câu trả lời sai/lủng củng đến mức bác kết quả tác vụ.

## 5. stateful-private-checkout

**Khách/lượt:** Private synthetic checkout qua code; không đưa tên/điện thoại/địa chỉ vào model.

**Actual HANDOFF / DEPENDENCY_FAILURE:**

(Không có tin nhắn được capture.)

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
        "quantity": 2,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review FALLBACK_OR_NO_SEND:** Không có preview/tin capture hoặc mua hàng hoàn tất; terminal handoff dependency. Đúng boundary không thay việc khách chưa hoàn thành checkout; chưa đọc trace để gán nguyên nhân cụ thể.

## 6. stateful-confirm

**Khách/lượt:** Chốt đơn cho chị nhé.

**Actual NO_SEND / CURRENT_AUTHORITY_CHANGED:**

(Không có tin nhắn được capture.)

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
        "quantity": 2,
        "parentProductId": "SV2447",
        "components": [
          {
            "componentRole": "TOP",
            "size": "L",
            "color": "BE"
          }
        ]
      }
    ]
  }
}
```

**Review FALLBACK_OR_NO_SEND:** Không có tin capture hoặc xác nhận mua; authority đã đổi sau bước trước. Đây là kết quả phụ thuộc của cùng hành trình chưa hoàn tất, không phải một lỗi model mới độc lập.

## 7. stateful-human-request

**Khách/lượt:** Cho chị gặp nhân viên shop nhé.

**Actual HANDOFF / CUSTOMER_REQUESTED_HUMAN:**

(Không có tin nhắn được capture.)

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

**Review USABLE:** Chuyển ownership theo yêu cầu trong harness. USABLE ở phạm vi ownership-only; không chứng minh nhân viên thật nhận/phục vụ hoặc một đơn mua thành công.
