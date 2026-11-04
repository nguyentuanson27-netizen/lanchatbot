# Current source gaps — 04/11/2026

**Cập nhật theo yêu cầu owner:** giới hạn tuổi ảnh 30 ngày đã được bỏ trong source mới. Bảng `expired` bên dưới là inventory trước thay đổi, được giữ nguyên làm đối chứng; xem [quy tắc hiện hành và replay cùng nguồn/clock](c3-phase-c-media-no-age-limit-20261104.md). Thiếu clock/approval/metadata/feedback/chart vẫn là vấn đề riêng.

Fresh public read-only capture107products at09:46:34 Vietnam time; pure eligibility checked09:49:13. Source `3a9845d0e099dcc3689b4b3a645346efcbc41cdd`, worldhash `658e571d533c11f02d8d9d79aa4d653544c69324c0cb09e7fc8817d4c305a1a7`. Provider0/sourceWrites0. [Exact inventory, chart scopes, variants and timestamps](c3-phase-c-source-gaps-20261104.json). Rawworld remains outside repository at `../c3-source-gap-check-world-20261104-01/WORLD.json`; no customer data copied.

## 1. Existing photos lack current usable verification

| Product | Source images | Clock problem | Eligible GENERIC/DETAIL |
|---|---:|---|---:|
| SQ2447 — set quần Thạch Thảo |10|10expired|0/0|
| SV1561 — Khánh Trang |11|11expired|0/0|
| V406 — Ngọc Trâm |11|11expired|0/0|
| SD023 |10|10invalid/missingclock|0/0|
| SQ748 — Uyển Hoa |7|7expired|0/0|
| SQ675 |5|5expired|0/0|
| V039 — Odette |10|10expired|0/0|
| V168 — Diệp An |12|12expired|0/0|
| SV2447 — set váy Thạch Thảo |11|1invalidclock; others notexpired|2/2|

Media TTL is the existing30days policy. This is not evidence that shop lacks image files, nor that all metadata is absent. The five primary product image arrays are byte-equivalent as JSON to the last modelrun's source; new POS sync does not renew image proof.

Prior03/11registry/byteaudit remains a separate measurement:53points/51approvedrows,22legacycanonicalbyteMATCH/29MISMATCH,2pointswithoutapprovedrow. SQ2447/SV2447 include matching generic/detail candidates; sales-photo proof preparation for SV1561/V406/SD023 remains unready. Strict preparation method compatibility was not established. No new image-byte fetch/transcode/registry read or proof publication was performed in today's check; do not relabel old byte checks as current. Required work is reconcile exact source bytes/preparation route and approvals, then genuine revalidation/readback; not blindly changing timestamps.

## 2. Component chart applicability is missing

**Đã xử lý cho dữ liệu test:** owner xác nhận dùng bảng hiện có cho các món riêng. Cấu hình test đã nối TOP/PANTS/SKIRT, không cần publish/cập nhật toàn bộ upstream. [Phạm vi, sáu kết quả và kiểm chứng](c3-test-component-size-sharing-20261104.md). Đoạn sau mô tả nguồn trước xác nhận, không còn là yêu cầu chặn test thuộc nhóm này.

Current active source has7SIZE_CHART records. Relevant ThạchThảo chart is `size-chart:SQ2447`, categorySET, componentRoleOTHER, applicabilitynull; existing configured delegation can support PRODUCT-level use. There is no approved TOP/PANTS/SKIRT applicability for the corresponding separate pieces. A chart for the whole set does not independently authorize TOP/PANTS/SKIRT fit. This does not necessarily require three new tables: a verified existing table may be reused if the shop confirms its exact component applicability. The missing item is that authoritative applicability/target mapping, or a separate appropriate chart if reuse is not valid.

## 3. Physical colour of stocked AO rows is unresolved

**Đã bổ sung cho dữ liệu test Phase C:** owner chọn giả định áo trắng. Các dòng tồn AO và ảnh cận áo được nối trong bản sao frozen world, giữ nguyên giá/tồn/clock. Không yêu cầu publish hoặc sửa hàng loạt nguồn thật. [Phạm vi và kiểm chứng](c3-test-white-shirt-source-20261104.md). Đoạn sau vẫn là inventory nguồn raw trước giả định, không phải xác minh màu hàng thực tế.

BothSQ2447/SV2447 point AO to `SV2447-AO`. Current AO price499000; stock at `__NO_COLOR__`:S32/M9/L3/XL12. BE rows are0 for those sizes. Catalogcolors is empty for both parents. No source maps the stocked unlabelled rows to a customer-visible physical colour; they cannot be renamedBE or a new 'standard version'. Need confirmed colour→SKU/offer/size/stock mapping, not another customer question that conceals missing shop data. These quantities are source observations at this capture, not future availability guarantees.

## 4. Approved feedback media for the requested piece is missing

No approved FEEDBACK image is exposed for the nine inspected products, including the ThạchThảo AO required by s16. Product photos/detail metadata do exist; MODEL is not customer feedback. Need an approved feedback asset and exact product/component linkage if the shop owns one. No conclusion about the entire uninspected upstream photo library is made.

## 5. Active policy lacks the candidate handoff matrix

Active bundle read by this candidate source contains closing/offer/payment/shop policies and sizecharts, but noHANDOFF_MATRIX. The model campaigns explicitly add the previously reviewed isolated HANDOFF_MATRIX candidate only inside their frozen testworld; they do not prove that matrix is published active upstream. Candidate-source policy completion/publication is separate from code handoff mechanics and requires an exact reviewed source change. This is not the cause of previous harness handoffs failing: the testworld already supplied the isolated matrix.

## Existing information and non-source failures

Relevant POS snapshots were refreshed at09:28:59 today. Prices, offer lists, stock rows, SKU/BOM references, care/exchange/payment/shipping policies and the existing set chart are present. This does not mean every requested filtered variant or component target is covered.

Questions asking price but receiving an unnecessary set clarification, or total-with-shipping but receiving a promise to check later, must not be attributed wholesale to source absence. They also require correct subject resolution and use of the existing pricing/tool path. No additional general fashion-advice knowledge source is established as necessary by this audit.

## Commands actually executed

```text
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs ../c3-source-gap-check-world-20261104-01 ../c3-media-context-model-codes-20261103-02.json
node ../c3-source-gap-check-analysis-20261104-01.mjs
```

Both exit0/provider0/sourceWrites0. Additional pure comparison confirmed unchanged five primary image arrays and unchanged active policies versus the prior world excluding its isolated matrix. This is read-only diagnosis, not readiness approval, data publication, runtime fix, model run or PhaseCqualification.
