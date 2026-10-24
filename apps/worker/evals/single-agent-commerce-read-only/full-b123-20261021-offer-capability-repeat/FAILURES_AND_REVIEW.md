# Các ca cần sửa và fallback

## b1-1 — ca 9 — b1-changed-occasion-v2

customer: Chị đang xem set Thạch Thảo để đi tiệc trưa.

shop: Tiệc trưa mặc bộ này xinh chị ạ.

Khách: Mà tiệc chuyển ra sân vườn rồi em, chị phải ở ngoài trời khá lâu mà lại dễ nóng. Mặc bộ này có bí quá không?

Kết quả actual: SEND_ELIGIBLE / PASS

```text
Áo làm từ tơ Hàn mềm thoáng cùng chân váy ren tơ nhẹ form, có độ bay tự nhiên nên mặc ra sân vườn đứng lâu cũng dễ chịu, không bị nặng hay bí người chị ạ.
```

**NEEDS_EDIT** — Dùng mềm/thoáng/nhẹ để khẳng định đứng ngoài trời lâu cũng dễ chịu, không bí người, trong khi khách dễ nóng và cần quyết định mua. Chưa giải quyết trang phục theo hoàn cảnh mới, lại biến inference chất liệu thành bảo đảm cảm giác sử dụng cụ thể. Cần đối chiếu trusted source sau primary để đánh giá protected-language gap.

## b1-1 — ca 11 — b1-partial-source-v2

Khách: Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual chỉ nhận fallback Phần này em chưa trả lời được; không có phần chất liệu/dáng váy mà khách cần. PROVIDER_ERROR cần diagnosis sau primary; không quy cho thiếu nguồn có chủ đích hoặc prompt.

## b1-1 — ca 13 — b1-component-stock-v2

customer: Chị chỉ muốn lấy chân váy của set Thạch Thảo.

Khách: Chân váy size M còn không em, mua riêng là bao nhiêu?

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback thay câu trả tồn/giá chân váyM; chưa có ích để mua. PROVIDER_ERROR chưa xác định role/stage trước diagnosis.

## b1-1 — ca 14 — b1-search-read-v2

Khách: Shop có set váy Khánh Trang không em? Em xem giúp chị mẫu đó giá bao nhiêu với.

Kết quả actual: FALLBACK / PROVIDER_ERROR

```text
Phần này em chưa trả lời được, chị nhé.
```

**UNUSABLE** — Actual fallback, khách không biết shop có Khánh Trang/giá. Giữ lỗi trong denominator; xem provider role sau primary.
