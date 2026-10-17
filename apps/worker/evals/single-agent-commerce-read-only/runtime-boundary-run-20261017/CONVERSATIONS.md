# Toàn bộ bảy stateful outcomes

Một hành trình sáu lượt và human-request control riêng; capture-only, không tin gửi khách thật. Source13e69d43, raw savepoint691fd912.

## 1. stateful-open

**Khách/lượt:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Actual FALLBACK / BUDGET:**

Phần này em chưa trả lời được, chị nhé.

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Khách đã chọn áo/be/M nhưng chỉ nhận fallback; profile nhận 76/98, giỏ vẫn null. Chưa hoàn thành bước lấy hàng; việc lưu số đo không cứu kết quả cả lượt.

## 2. stateful-variant-quantity

**Khách/lượt:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Actual FALLBACK / BUDGET:**

Phần này em chưa trả lời được, chị nhé.

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Khách nhờ đổi L và lấy hai chiếc nhưng tiếp tục nhận fallback; cuối lượt giỏ vẫn null. Không có thay đổi mua hàng được hoàn tất hoặc câu trả lời dùng được.

## 3. stateful-quote

**Khách/lượt:** Hai áo cả phí ship là bao nhiêu em?

**Actual FALLBACK / BUDGET:**

Phần này em chưa trả lời được, chị nhé.

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Khách hỏi tổng tiền hai áo nhưng chỉ nhận fallback, không có giỏ/quote hiện tại. Không chấm bằng draft hoặc thao tác dự định bên trong.

## 4. stateful-correction

**Khách/lượt:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Actual FALLBACK / BUDGET:**

Phần này em chưa trả lời được, chị nhé.

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Code nhận correction 74/96 vào profile revision3, nhưng khách chỉ nhận fallback. Giỏ vẫn null; phần state đúng chưa thành một kết quả tư vấn/giao dịch dùng được cho cả lượt.

## 5. stateful-private-checkout

**Khách/lượt:** Private synthetic checkout qua code; không đưa tên/điện thoại/địa chỉ vào model.

**Actual HANDOFF / DEPENDENCY_FAILURE:**

(Không có tin nhắn được capture.)

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Private checkout không tạo preview hoặc tin capture; terminal handoff dependency và chưa mua được hàng. Chấm actual outcome, không lấy controlled synthetic checkout làm bằng chứng hoàn tất nguồn thật.

## 6. stateful-confirm

**Khách/lượt:** Chốt đơn cho chị nhé.

**Actual NO_SEND / CURRENT_AUTHORITY_CHANGED:**

(Không có tin nhắn được capture.)

**Public state cuối lượt:**

```json
{
  "stage": "DISCOVERY",
  "revision": 0,
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
  "cart": null
}
```

**Review FALLBACK_OR_NO_SEND:** Xác nhận mua không có tin gửi/không tạo xác nhận mua vì authority đã đổi. Đúng boundary nhưng hành trình mua chưa hoàn tất; không coi đây là một model reply sai riêng biệt.

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

**Review USABLE:** Terminal code-owned chuyển ownership theo yêu cầu gặp nhân viên trong isolated harness. USABLE chỉ trong phạm vi chuyển ownership; không có tin capture hoặc chứng minh nhân viên thật đã nhận/phục vụ khách.
