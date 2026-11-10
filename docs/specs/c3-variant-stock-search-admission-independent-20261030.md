# Independent review — variant stock scope và search admission

Ngày 30/10/2026. Owner yêu cầu phương án fix → review độc lập → sửa → review đến APPROVE. Phạm vi task này là kế hoạch; không runtime/provider/DB/deploy changes.

Base `3f383c3ddd226b85dc280877a963983596165561`. Reviewer độc lập `/root/bc_fix_review`, cùng reviewer vòng trước, read-only; không phải người viết kế hoạch. [Plan revision1](c3-variant-stock-search-admission-fix-plan-20261030.md).

## Quá trình review và thay đổi phương án

Review sớm cùng source audit phát hiện các điểm cần chốt; đã đưa vào revision1 trước formal review:

1. **Không đồng nhất component hash với stock pool.** POS BOM stock là parent variation quantity. Source unit/counter authority nằm ở resolver/readback; unknown/overlap fail closed, không dựng thêm inventory framework. DB không được mô tả như tự reread POS.
2. **Alias không chỉ là trùng chuỗi SKU.** Cùng canonical componentProductId **hoặc** componentSku có thể trùng nguồn; size/color unknown không chứng minh độc lập. Exact key loại lineId/line quantity/source/stock/price; cùng key cộng nhu cầu, không nhân quota hoặc tự PRE_ORDER.
3. **Sửa đủ producer và consumer.** Hai worker claim builders, shared validator, business-tools và hai DB guards phải dùng full validated cart lines. Media/legacy mode rõ; mixed/old multi-variant evidence fail closed.
4. **Chọn search rejection nguyên tử thay partial framework.** Dành slot cho initial targets chưa hydrate, tính union không đếm kép; giữ tất cả caps. Kiểm trước/sau awaits chưa đủ vì offerLiteral đang ghi offerPins: plan yêu cầu local staging/publish đồng bộ và không snapshot/restore global state qua await.
5. **Acceptance cụ thể.** Actual M14/L8, cùng M nhiều dòng, alias/parent pool/unknown units, tamper và concurrent search/read; giữ đầy đủ7 REAL_CHECKS đúng tên. Không gộp unit tests thành bằng chứng actual PG/model quality.

Formal review: **APPROVE PLAN revision1**, nội dung SHA256 `fcced93d52129dd43b666d1a6b3a2b6c45bcaac9aef32b1c216d72f2c9c5db02` trước khi đổi dòng trạng thái DRAFT thành APPROVE PLAN/link record. Reviewer đã đối chiếu các choke points trong source và không còn blocker thiết kế. Đây không phải một lượt code REQUEST_CHANGES/APPROVE giả định; chưa có implementation trong task này.

Cùng reviewer xác nhận **APPROVE PLAN FINAL** cho SHA256 `400bfbf784e4ed95ebff9486e442c5cb45d2274c76e3a683733dd26071381e4a`: byte-level rollback duy nhất dòng trạng thái/link trả đúng hash đã duyệt; đã đọc review record và tasks, không có overclaim hoặc finding chặn delivery bốn tài liệu. Đây chỉ carry-forward approval kế hoạch.

Reviewer kết luận: “Kế hoạch đã bao phủ đúng hai root cause, kiểm alias/đơn vị tồn, cộng nhu cầu cùng biến thể, đồng bộ worker–shared–DB và search admission nguyên tử. Không có blocker cần sửa trước implementation.”

## Giới hạn và verification

Approval chỉ cho kế hoạch. RED→GREEN, shared/worker tests/typecheck/build/lint, actual PostgreSQL, implementation review và model run mới đều **NOT_RUN cho bản sửa này**. Các lệnh trong plan là dự kiến, không phải PASS. Source/code/prompt/corpus và historical grades không đổi; không gọi provider, live read/write, deploy hoặc sửa nguồn shop.

Plan-only checks: đọc source/spec/evidence, self-review alias/unit/async publication, `git diff --check`. Inspection script thử đọc offer rows đã lỗi shape `rows.filter is not a function`; không dùng output đó làm evidence và không thay frozen world. Root cause dựa replay đã lưu trước task này, không claim chạy lại replay hay actual PG.

Phase C vẫn BLOCKED; C3 comparison NOT_RUN, B_NOT_GO. Kế hoạch sửa readiness/admission không phải tuyên bố chống mọi concurrent POS mutation hoặc bằng chứng cải thiện tư vấn.
