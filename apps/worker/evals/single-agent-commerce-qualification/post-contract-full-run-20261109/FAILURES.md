# Bảy ca chưa hoàn thành — 09/11/2026

Mọi draft dưới đây đều **không gửi khách**. Hai ca dừng trước khi có final draft. Không coi lỗi transport/schema/plan là verifier chặn sai.

## c-po-20261031-p06

Báo giá ba món đúng989.000đ nhưng draft gọi QD001 là hai quần, source chỉ có role OTHER và thiếu tên/cấu tạo. Verifier chặn; không có câu trả lời gửi khách.

Lượt 1 — khách: Em tính cả ba món cho chị bao nhiêu?

Actual: **HANDOFF**, không gửi tin. Reason `RESPONSE_UNAVAILABLE`; recovery `FAIL`.

Draft chưa gửi:

```text
Dạ cả bộ gồm 3 món (1 áo và 2 quần) có giá 989.000đ ạ. Mẫu này hiện sẵn các size S, M, L, chị lấy size nào để em chuẩn bị cho mình ạ?
```

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "offers:SD023",
      "excerpt": "1 áo và 2 quần",
      "basis": "Nguồn xác nhận bộ gồm 1 SD023-AO có role TOP và 2 QD001 có role OTHER, nhưng không xác nhận QD001 là quần. Vì vậy chưa có căn cứ để mô tả bộ gồm 2 quần."
    }
  ]
}
```

## c-20261028-s15

Owner batch apply_customer_state(preferencebe)+quote_product. quoteBatchWork cấm ghi state đi cùng quote nên reject cả batch trướcI/O, OWNER_TOOL_MODE→silentHF. Không có media lookup lỗi trong ca này; nhánh sửa incidental media không được chạm.

Lượt 1 — khách: Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.

Actual: **HANDOFF**, không gửi tin. Reason `RESPONSE_UNAVAILABLE`; recovery `OWNER_TOOL_MODE`.

## c-20261028-s16

Vẫn xác nhận ảnh khách mặc từfeedback/detail dù evidence mớiNOT_RECORDED. Verifierchặn đúng thiếuprovenance; giữ nhãn chưa hoàn thành/source-contract unresolved để so cũ, không đổi thành chất lượngPASS. Cần nguồn xác nhận nếu muốn phục vụ ảnh khách mặc.

Lượt 1 — khách: Shop có ảnh khách mặc áo Thạch Thảo không em?

Actual: **HANDOFF**, không gửi tin. Reason `RESPONSE_UNAVAILABLE`; recovery `FAIL`.

Draft chưa gửi:

```text
Dạ shop có chị nhé! Em gửi chị xem ảnh feedback áo Thạch Thảo ạ.
```

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "media:c5b85f58c5a09bb96e25a6aecbb95d0d87f588e7cffce4ad538c6373987e39cb",
      "excerpt": "Dạ shop có chị nhé! Em gửi chị xem ảnh feedback áo Thạch Thảo ạ.",
      "basis": "Lời xác nhận trả lời trực tiếp yêu cầu ảnh khách mặc, nhưng nguồn chỉ có ảnh cận chi tiết áo (DETAIL/CLOSEUP), với customerWearingEvidence=NOT_RECORDED. Nhãn feedback=true không chứng minh ảnh có khách mặc."
    }
  ]
}
```

## c-20261028-j2

T1/T2 sửa được quotes, profileđúng162/51/88/70/94. T3 commitRELAXED và engineTOP/M OK nhưng ownergeneration2 TRANSPORT_ERROR/HTTPnull, không có reply. Không phải pendingfield/chart lại lỗi.

Lượt 3 — khách: Chị thích mặc thoải mái một chút, em chọn size giúp chị nhé.

Actual: **HANDOFF**, không gửi tin. Reason `DEPENDENCY_FAILURE`; recovery `PROVIDER_ERROR`.

Lỗi generation: OWNER/PROVIDER_ERROR/TRANSPORT_ERROR.

## c-20261028-j4

T2 ownerbatch record_negotiation+quote_product bị cấm trướcI/O; không chạm kết quảNOT_EVALUATED mới. OWNER_TOOL_MODE→HF; T3NO_SEND doHUMAN là hậu quả, không một generationfail mới.

Lượt 2 — khách: Shop hỗ trợ thêm cho chị được chút nào không?

Actual: **HANDOFF**, không gửi tin. Reason `RESPONSE_UNAVAILABLE`; recovery `OWNER_TOOL_MODE`.

Lượt 3 — khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?

Actual: **NO_SEND**, không gửi tin. Reason `HUMAN_OWNS_CONVERSATION`; recovery `None`.

## c-20261028-s09

OwnerHTTP200 nhưngread_product(selectionDETAILS_ONLY,offerType) sai nhánhschema. AdapterMALFORMED/OWNER_TOOL_OUTPUT→HF; chưađọc care source, không phải shop thiếu hướngdẫn giặt.

Lượt 1 — khách: Áo Thạch Thảo này có cần giặt tay không hay cho máy được em?

Actual: **HANDOFF**, không gửi tin. Reason `DEPENDENCY_FAILURE`; recovery `PROVIDER_ERROR`.

Lỗi generation: OWNER/MALFORMED/OWNER_TOOL_OUTPUT.

## c-20261028-s04

Cùng sai schemaread_productDETAILS_ONLY+offerType nhưs09; HTTP200 nhưngcompletionMALFORMED trướctoolI/O. Chưađọcmàu, khôngquythiếunguồn.

Lượt 1 — khách: Áo Thạch Thảo có thêm màu khác nữa không em?

Actual: **HANDOFF**, không gửi tin. Reason `DEPENDENCY_FAILURE`; recovery `PROVIDER_ERROR`.

Lỗi generation: OWNER/MALFORMED/OWNER_TOOL_OUTPUT.
