# Admin Policy Review UX — implementation plan

Ngày lập kế hoạch: 2026-08-08

## Mục tiêu

Cải thiện màn hình **Chính sách bán hàng** để việc rà soát và duyệt nhiều policy, đặc biệt `SIZE_CHART`, nhanh hơn nhưng vẫn giữ nguyên lifecycle, revision guard, audit và các cổng an toàn Canary/Publish hiện có.

PR này **chỉ chứa kế hoạch**, chưa thay đổi code/runtime/schema và không deploy production.

## Vấn đề hiện tại

- Mỗi policy version đang hiển thị bằng card lớn, khó thao tác khi có nhiều bản nháp/chờ duyệt.
- Frontend chưa khai thác tốt các filter đã có ở API như `artifact_kind`, `lifecycle`, `artifact_key`.
- Duyệt/validate hiện theo từng artifact nên tốn nhiều thao tác với nhóm bảng size lớn.
- `SIZE_CHART` đang được xem/chỉnh theo cấu trúc field tổng quát, chưa tối ưu cho nghiệp vụ bảng size.
- Diff hiện hữu ích nhưng chưa đủ nhanh cho review tuần tự số lượng lớn.

## Nguyên tắc thiết kế

1. Tối ưu cho luồng **lọc → chọn → xem diff → validate/approve**.
2. Không tạo đường tắt vượt lifecycle hoặc gate an toàn.
3. Mọi mutation vẫn dùng `expected_revision`; conflict phải fail rõ theo từng item.
4. Không batch Canary Live hoặc Publish trong MVP.
5. Không thay đổi nguồn dữ liệu nghiệp vụ: PostgreSQL vẫn là nguồn chuẩn policy artifact; giá/tồn không đưa vào Policy Control.
6. Không thay đổi page allowlist, outbound, prompt, worker ownership hay dữ liệu production trong scope này.

## UX đích

### 1. Danh sách dạng bảng

Thay policy card grid bằng bảng quản trị:

`Chọn | Mã | Loại | Trạng thái | Version | Revision | Cập nhật | Đang dùng | Kết quả kiểm tra | Hành động`

- Click một dòng mở drawer chi tiết bên phải.
- Header và thanh bulk action giữ sticky khi cuộn.
- Phân trang/server-side query để không render toàn bộ artifact cùng lúc.

### 2. Search, filter và quick views

Thanh công cụ gồm:

- Search theo `artifact_key`.
- Filter loại: `SIZE_CHART`, `SHOP_POLICY`, `OFFER_POLICY`, `CLOSING_STRATEGY`, `HANDOFF_MATRIX`, `PAYMENT_POLICY`.
- Filter lifecycle: Draft / Validated / Approved / Canary / Published / Retired.
- Filter `đang dùng / chưa dùng`.
- Quick views: `Cần duyệt`, `Bản nháp`, `Đang chạy`, `Tất cả`.
- Sort: cập nhật mới nhất, cũ nhất chờ duyệt, artifact key.

Filter/search được phản ánh lên URL để refresh/back-forward không làm mất ngữ cảnh.

### 3. Bulk review

Khi chọn nhiều artifact, hiển thị sticky action bar:

- `Kiểm tra hàng loạt` cho artifact đang `DRAFT`.
- `Duyệt hàng loạt` cho artifact đang `VALIDATED`.
- `Mô phỏng` cho nhóm version đủ điều kiện hiện tại.

Không hỗ trợ bulk `START_CANARY`, `PUBLISH`, `RETIRE`, `ROLLBACK` trong MVP.

Batch result phải trả về theo từng item:

- success,
- revision conflict,
- invalid lifecycle,
- forbidden/gate error,
- validation error.

UI hiển thị tổng kết, ví dụ `18 thành công · 2 conflict · 1 lỗi`, đồng thời giữ lỗi chi tiết từng dòng.

### 4. Drawer duyệt nhanh

Drawer gồm:

- metadata: key, kind, lifecycle, version, revision, updated time/user;
- pointer đang active nếu có;
- diff với version trước;
- nội dung đã khóa;
- validation status/error;
- action phù hợp lifecycle hiện tại;
- `Duyệt & sang mục tiếp theo` cho review tuần tự.

Keyboard shortcut đề xuất:

- `J/K`: dòng kế/ trước,
- `Enter`: mở drawer,
- `A`: approve khi action hợp lệ,
- `Esc`: đóng drawer.

Shortcut phải bỏ qua khi focus đang nằm trong input/editor.

### 5. View chuyên dụng cho SIZE_CHART

Ở drawer/editor, `SIZE_CHART` được render thành bảng nghiệp vụ thay vì chỉ flatten JSON.

Ví dụ cột tùy schema thực tế:

`Size | Chiều cao | Cân nặng | Ngực | Eo | Mông | Ghi chú`

Rule cảnh báo UI/validation đề xuất:

- size label trùng;
- range đảo min/max;
- khoảng chồng nhau bất thường;
- thiếu giá trị bắt buộc theo schema;
- giá trị không phải số hoặc ngoài giới hạn hợp lý của schema;
- duplicate row sau normalize.

Các rule này chỉ hỗ trợ phát hiện lỗi; không tự sửa dữ liệu.

## Kế hoạch kỹ thuật

### Phase 1 — Table + filter + drawer

Phạm vi chính:

- `apps/admin-web/src/policy-control-ui.ts`
- `apps/admin-web/src/api.ts`
- `apps/admin-web/src/types.ts`
- `apps/admin-web/src/styles.css`
- test liên quan Policy Control UI/API

Thay đổi dự kiến:

1. Bổ sung query model cho policy list: `artifact_kind`, `lifecycle`, `artifact_key`, cursor/limit; nếu cần thêm sort thì mở rộng API có kiểm soát.
2. Chuyển render card → table.
3. Thêm URL state cho filter/search/page.
4. Thêm drawer detail và diff.
5. Giữ nguyên action đơn hiện tại và toàn bộ confirmation/gate behavior.

Ưu tiên tận dụng endpoint hiện hữu trước khi bổ sung backend.

### Phase 2 — Batch validate/approve

Đề xuất endpoint:

`POST /admin/v1/policy/artifacts/batch-transitions`

Request mẫu:

```json
{
  "action": "VALIDATE",
  "items": [
    { "version_id": "...", "expected_revision": 3 }
  ]
}
```

Action MVP chỉ nhận:

- `VALIDATE`
- `APPROVE`

Response không dùng all-or-nothing transaction cho toàn batch; mỗi artifact trả kết quả độc lập để một conflict không chặn các item hợp lệ khác.

Mỗi item mutation phải gọi cùng business/store transition path với action đơn để tránh tạo logic lifecycle thứ hai.

Cần giới hạn batch, đề xuất tối đa `100` item/request.

Audit phải ghi được actor, artifact/version, action, result và correlation/request id như flow đơn hiện tại.

### Phase 3 — SIZE_CHART specialized review

1. Tạo mapper từ content schema hiện tại sang row model UI.
2. Render bảng size read-only trong drawer.
3. Khi chỉnh Draft, dùng editor chuyên dụng nếu schema hỗ trợ an toàn; fallback về generic editor cho field không map được.
4. Bổ sung deterministic validation rule tại layer dùng chung phù hợp, tránh chỉ kiểm tra ở frontend.
5. Test round-trip để editor không làm mất field/provenance chưa hiển thị.

## Safety và compatibility gates

Bắt buộc giữ nguyên:

- RBAC/capability `policy_control`.
- `policyCanaryLiveEnabled` và `policyPublishEnabled`.
- `expected_revision` optimistic concurrency.
- lifecycle hợp lệ hiện tại.
- pointer rollback semantics.
- simulation `sideEffects: DISABLED`.
- audit mutation.
- page scope/policy page guard.

Không được:

- batch publish/canary live;
- bỏ confirmation cho action outbound/risky hiện tại;
- tự retry mutation sau revision conflict;
- mutate artifact đang PUBLISHED chỉ để phục vụ UI;
- đổi allowlist hoặc bật gate production trong PR này.

## Test plan

### Frontend

- filter/search/query URL state;
- checkbox select current page và select-all filtered-result behavior nếu triển khai;
- lifecycle action visibility;
- drawer keyboard/focus management;
- diff rendering;
- bulk result partial success/conflict/error;
- SIZE_CHART table rendering và malformed content fallback;
- polling/reload không làm mất selection/draft editing ngoài chủ đích.

### Admin API/store

- batch chỉ chấp nhận `VALIDATE`/`APPROVE`;
- batch size limit;
- per-item `expected_revision` conflict;
- RBAC/page scope;
- lifecycle invalid transition;
- partial success;
- audit mỗi mutation;
- không ảnh hưởng endpoint transition đơn hiện có.

### Regression

Chạy tối thiểu:

```bash
pnpm install --frozen-lockfile
pnpm check
```

và targeted Admin Web/Admin API policy tests.

## Rollout đề xuất

1. Merge Phase 1 độc lập, không migration nếu không cần backend sort mới.
2. Sau khi table/filter ổn định mới merge Phase 2 batch mutation.
3. Phase 3 SIZE_CHART specialized review tách riêng để giảm blast radius.
4. Deploy theo release flow chuẩn, chỉ sau khi có yêu cầu production rõ ràng.

## Acceptance criteria cho MVP

- Có thể tìm/lọc nhanh chỉ các `SIZE_CHART` đang Draft/Validated.
- Có thể review nhiều artifact mà không phải mở từng card dài.
- Có thể validate/approve nhiều item trong một batch an toàn.
- Revision conflict không ghi đè dữ liệu mới hơn.
- Bulk action không hỗ trợ Canary Live/Publish.
- Drawer hiển thị rõ diff và trạng thái đang active.
- Toàn bộ policy tests và `pnpm check` PASS.
- Không thay đổi runtime policy behavior, outbound, page allowlist hoặc production gate.

## Ngoài scope

- Thiết kế lại lifecycle policy.
- Bulk publish/canary/rollback.
- Tự động approve bằng AI.
- Thay đổi POS/price/stock source.
- Deploy production trong PR implementation nếu chưa được owner yêu cầu rõ.
