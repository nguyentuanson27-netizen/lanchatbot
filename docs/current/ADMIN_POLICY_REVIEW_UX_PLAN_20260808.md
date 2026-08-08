# Admin Policy Review UX — implementation plan

Ngày lập kế hoạch: 2026-08-08  
Cập nhật sau review: 2026-08-08 (`4888199387`)

## Mục tiêu

Cải thiện màn hình **Chính sách bán hàng** để việc rà soát và duyệt nhiều policy, đặc biệt `SIZE_CHART`, nhanh hơn nhưng vẫn giữ nguyên lifecycle, revision guard, audit và các cổng an toàn Canary/Publish hiện có.

PR này **chỉ chứa kế hoạch**, chưa thay đổi code/runtime/schema và không deploy production.

## Vấn đề hiện tại

- Mỗi policy version đang hiển thị bằng card lớn, khó thao tác khi có nhiều bản nháp/chờ duyệt.
- Frontend chưa khai thác tốt các filter đã có ở API như `artifact_kind`, `lifecycle`, `artifact_key`.
- Duyệt/validate hiện theo từng artifact nên tốn nhiều thao tác với nhóm bảng size lớn.
- `SIZE_CHART` đang được xem/chỉnh theo cấu trúc field tổng quát, chưa tối ưu cho nghiệp vụ bảng size.
- Diff và rollback candidate hiện được suy ra từ tập `data.artifacts` đã load; cách này không còn đúng khi chuyển sang server-side pagination.

## Quyết định đã khóa sau review

Các điểm dưới đây là contract của MVP, không để implementation tự diễn giải:

1. **Drawer/diff/rollback không phụ thuộc page hiện tại.** Khi mở một artifact, frontend fetch review context riêng theo artifact id; predecessor và rollback candidate được backend tính theo `artifact_key + artifact_kind`, không derive từ rows đang hiển thị.
2. **`review-context` phải trả full pointer snapshot cần cho rollback hiện tại.** Mỗi pointer/candidate dùng cho rollback có tối thiểu `pointer_id`, `artifact_key`, `artifact_kind`, `page_id`, `channel`, `version_id`, `revision`; frontend không quay lại phụ thuộc global pointer list.
3. **Bulk selection MVP chỉ áp dụng current loaded page**, tối đa `100` artifact. Không có cross-page `select all filtered result` trong MVP.
4. **Batch response có schema per-item cố định, giữ request order.** Top-level request failure được phân biệt với lifecycle/conflict/validation failure của từng item.
5. **Transport timeout/ambiguous failure không được replay nguyên batch.** UI phải refresh/reconcile các selected ids trước, sau đó chỉ retry item vẫn thực sự ở state/revision cũ. Không auto-retry revision conflict.
6. **Filter `đang dùng/chưa dùng` là server-side pointer-aware filter**; không filter client-side sau pagination.
7. **Sort là MVP, chạy server-side và có deterministic total order.** Mỗi sort mode có tie-breaker bằng `version_id`; opaque cursor encode đúng tuple của sort hiện tại để không skip/duplicate row khi primary key sort bị trùng.
8. **Search UX không đổi semantics của `artifact_key` hiện hữu.** `artifact_key` tiếp tục là exact-match filter; UI search dùng query `search` mới với case-insensitive contains semantics.
9. **Quick views là frontend preset có mapping query rõ ràng**, không phải hidden business rule: `Cần duyệt = VALIDATED`, `Bản nháp = DRAFT`, `Đang chạy = active=active`, `Tất cả = no lifecycle + active=any`.
10. **Persistent validation error không nằm trong MVP** vì artifact list hiện chưa có authoritative normalized validation-result source. Table chỉ hiển thị trạng thái kiểm tra suy ra an toàn từ lifecycle; lỗi validate của thao tác hiện tại được hiển thị trong batch/action result. Không tạo N+1 request tới event/audit cho từng row.
11. **Bulk simulation theo checkbox được defer.** Nút mô phỏng page-level hiện hữu vẫn giữ nguyên và không phụ thuộc selection. MVP bulk bar chỉ có `VALIDATE` và `APPROVE`.
12. **Phase 3 trong chương trình này chỉ làm specialized read-only `SIZE_CHART` review.** Specialized editor và deterministic validation mới tách thành follow-up PR riêng sau khi review-only ổn định.

## Nguyên tắc thiết kế

1. Tối ưu cho luồng **lọc → chọn → xem diff → validate/approve**.
2. Không tạo đường tắt vượt lifecycle hoặc gate an toàn.
3. Mọi mutation vẫn dùng `expected_revision`; conflict phải fail rõ theo từng item.
4. Không batch Canary Live, Publish, Retire hoặc Rollback trong MVP.
5. Không thay đổi nguồn dữ liệu nghiệp vụ: PostgreSQL vẫn là nguồn chuẩn policy artifact; giá/tồn không đưa vào Policy Control.
6. Không thay đổi page allowlist, outbound, prompt, worker ownership hay dữ liệu production trong scope này.
7. Server-side pagination/filter/sort phải giữ đúng semantics toàn tập dữ liệu; không áp dụng filter/sort quan trọng chỉ trên page đã tải.
8. API contract mới phải additive; không đổi nghĩa observable của query hiện hữu nếu không cần thiết.

## UX đích

### 1. Danh sách dạng bảng

Thay policy card grid bằng bảng quản trị:

`Chọn | Mã | Loại | Trạng thái | Version | Revision | Cập nhật | Đang dùng | Kiểm tra | Hành động`

- Click một dòng mở drawer chi tiết bên phải.
- Header và thanh bulk action giữ sticky khi cuộn.
- Server-side pagination để không render toàn bộ artifact cùng lúc.
- Default page size: `50`; cho phép tối đa `100` để khớp batch limit.
- Checkbox `chọn tất cả` chỉ chọn các row của **page hiện tại**.
- Selection bị reset khi filter/search/sort/page thay đổi để tránh thao tác trên tập item không còn nhìn thấy.

### 2. Search, filter, quick views và sort

Thanh công cụ gồm:

- Search text theo `artifact_key` bằng query `search`.
- Filter exact `artifact_key` vẫn tồn tại ở API cho consumer cần exact lookup.
- Filter loại: `SIZE_CHART`, `SHOP_POLICY`, `OFFER_POLICY`, `CLOSING_STRATEGY`, `HANDOFF_MATRIX`, `PAYMENT_POLICY`.
- Filter lifecycle: Draft / Validated / Approved / Canary / Published / Retired.
- Filter `đang dùng / chưa dùng`.
- Quick views: `Cần duyệt`, `Bản nháp`, `Đang chạy`, `Tất cả`.
- Sort: cập nhật mới nhất, cũ nhất chờ duyệt, artifact key.

Filter/search/sort được phản ánh lên URL để refresh/back-forward không làm mất ngữ cảnh. Selection không đưa vào URL.

#### Search semantics

- `artifact_key=<value>`: exact match, giữ semantics hiện hữu của store/API.
- `search=<text>`: trim whitespace; case-insensitive contains trên `artifact_key` (`ILIKE` với `%`/`_` được escape như literal input).
- Admin Web dùng `search` cho ô tìm kiếm, vì người vận hành có thể nhập `SQ603` và vẫn tìm thấy key dạng `size-chart:SQ603`.
- Nếu caller truyền cả `artifact_key` và `search`, hai điều kiện được áp dụng theo `AND`; API không silently ưu tiên một field.
- Input search phải có bound hợp lý tại API boundary; implementation chốt giới hạn cụ thể theo convention hiện hữu và có test cho empty/oversize input.

#### Quick-view mapping

Quick view chỉ là preset cho visible query controls:

| Quick view | lifecycle | active | sort |
|---|---|---|---|
| `Cần duyệt` | `VALIDATED` | `any` | `validated_oldest` |
| `Bản nháp` | `DRAFT` | `any` | `updated_desc` |
| `Đang chạy` | không áp lifecycle | `active` | `updated_desc` |
| `Tất cả` | không áp lifecycle | `any` | `updated_desc` |

- `Cần duyệt` **không** gồm `DRAFT`; Draft chưa qua `VALIDATE` nên chưa phải hàng chờ approve.
- `Đang chạy` dùng pointer semantics (`active=active`) thay vì hard-code lifecycle, vì trạng thái đang dùng được xác định bởi pointer thực tế mà identity được phép nhìn thấy.
- Khi người dùng sửa filter/sort sau khi chọn quick view, UI bỏ trạng thái selected của quick view nếu query không còn đúng preset; không tồn tại hidden filter phía sau chip.

### 3. Semantics của `Đang dùng`

`Đang dùng` nghĩa là version hiện tại được tham chiếu bởi ít nhất một policy pointer mà identity hiện tại được phép nhìn thấy.

- `active=active`: chỉ artifact có pointer accessible trỏ tới version đó.
- `active=inactive`: chỉ artifact không có pointer accessible trỏ tới version đó.
- `active=any`: không áp filter pointer.

Filter này phải được thực hiện trong Admin API/store trước pagination. Không fetch một page rồi lọc client-side.

### 4. Trạng thái `Kiểm tra` trong MVP

MVP không thêm durable validation-result store và không suy diễn error từ audit bằng N+1 query.

Table dùng trạng thái tối giản:

- lifecycle `DRAFT` → `Chưa xác nhận`;
- lifecycle `VALIDATED`, `APPROVED`, `CANARY`, `PUBLISHED`, `RETIRED` → `Đã qua kiểm tra`.

Nếu một lần `VALIDATE` hiện tại thất bại, row/batch result hiển thị `error_code` và message của lần thao tác đó. Sau full reload, UI không cam kết giữ persistent validation error cho tới khi có authoritative durable source ở follow-up.

Drawer cũng không có field “validation error gần nhất” trong MVP; chỉ hiển thị lifecycle-derived check state và transient action result nếu có trong session.

### 5. Bulk review

Khi chọn nhiều artifact ở page hiện tại, sticky action bar chỉ có:

- `Kiểm tra hàng loạt` cho artifact đang `DRAFT`.
- `Duyệt hàng loạt` cho artifact đang `VALIDATED`.

Không hỗ trợ bulk:

- `START_CANARY`
- `PUBLISH`
- `RETIRE`
- `ROLLBACK`
- selected-version `SIMULATE`

Nếu selection chứa mixed lifecycle, action chỉ enabled khi **toàn bộ selected rows** hợp lệ cho action đó. MVP không silently bỏ qua item không hợp lệ trước khi gửi request.

### 6. Drawer duyệt nhanh

Drawer gồm:

- metadata: key, kind, lifecycle, version, revision, updated time/user;
- pointer đang active nếu có;
- diff với version trước;
- nội dung đã khóa;
- lifecycle-derived check state;
- rollback candidate phù hợp pointer/channel nếu có;
- action đơn phù hợp lifecycle hiện tại;
- `Duyệt & sang mục tiếp theo` cho review tuần tự.

Keyboard shortcut đề xuất:

- `J/K`: dòng kế/trước,
- `Enter`: mở drawer,
- `A`: approve khi action hợp lệ,
- `Esc`: đóng drawer.

Shortcut phải bỏ qua khi focus đang nằm trong input/editor.

## API contract — Phase 1

### 1. Policy list query

Giữ endpoint:

`GET /admin/v1/policy/artifacts`

MVP mở rộng query contract:

- `limit=1..100`, default `50`;
- `cursor=<opaque>`;
- `artifact_kind=<PolicyArtifactKind>`;
- `lifecycle=<PolicyLifecycle>`;
- `artifact_key=<exact value>` — semantics exact-match hiện hữu;
- `search=<text>` — case-insensitive contains trên `artifact_key`;
- `active=any|active|inactive`, default `any`;
- `sort=updated_desc|validated_oldest|artifact_key_asc`, default `updated_desc`.

Toàn bộ filter và sort phải chạy server-side trước cursor pagination.

`validated_oldest` chỉ có ý nghĩa khi query lifecycle/quick-view đang nhắm `VALIDATED`; nếu không, API trả `400 ADMIN_POLICY_SORT_INVALID` thay vì silently đổi semantics.

List response giữ envelope hiện tại và không cần trả full history/diff context cho từng row.

### 2. Deterministic sort + cursor contract

Mỗi sort mode có total order cố định:

- `updated_desc` → `updated_at DESC, version_id DESC`.
- `validated_oldest` → `validated_at ASC NULLS LAST, version_id ASC`.
- `artifact_key_asc` → `artifact_key ASC, version_id ASC`.

Opaque cursor phải encode tối thiểu:

- sort mode hiện tại;
- primary sort value của last row;
- `version_id` tie-breaker.

Với `validated_oldest`, cursor phải biểu diễn được `validated_at = null`; các row bất thường thiếu `validated_at` được xếp cuối, không làm pagination mất row.

Rules:

- Client không decode hoặc tự chế cursor.
- Khi search/filter/sort thay đổi, client reset cursor.
- API phải dùng tuple comparison tương ứng với sort mode, không chỉ primary sort value.
- Cursor không hợp lệ hoặc không khớp sort mode trả `400 ADMIN_POLICY_CURSOR_INVALID`; không silently fallback về page đầu.
- Test bắt buộc có nhiều row trùng `updated_at`, trùng `validated_at` và trùng `artifact_key` để chứng minh không skip/duplicate giữa pages.

### 3. Review context endpoint

Thêm endpoint detail riêng:

`GET /admin/v1/policy/artifacts/:id/review-context`

Mục tiêu: drawer có đủ dữ liệu dù predecessor/rollback target nằm ngoài current page.

Response target:

```json
{
  "artifact": {
    "version_id": "v-current",
    "artifact_key": "size-chart:SQ603",
    "artifact_kind": "SIZE_CHART",
    "version_number": 3,
    "revision": 5,
    "lifecycle": "PUBLISHED",
    "content": {}
  },
  "previous_version": {
    "version_id": "v-prev",
    "version_number": 2,
    "content": {}
  },
  "active_pointers": [
    {
      "pointer_id": "ptr-1",
      "artifact_key": "size-chart:SQ603",
      "artifact_kind": "SIZE_CHART",
      "page_id": "page-1",
      "channel": "PUBLISHED",
      "version_id": "v-current",
      "version_number": 3,
      "revision": 4,
      "updated_at": "2026-08-08T00:00:00Z"
    }
  ],
  "rollback_candidates": [
    {
      "pointer": {
        "pointer_id": "ptr-1",
        "artifact_key": "size-chart:SQ603",
        "artifact_kind": "SIZE_CHART",
        "page_id": "page-1",
        "channel": "PUBLISHED",
        "version_id": "v-current",
        "version_number": 3,
        "revision": 4
      },
      "target_version": {
        "version_id": "v-prev",
        "version_number": 2,
        "content": {}
      }
    }
  ]
}
```

Contract:

- `previous_version` là version number gần nhất nhỏ hơn current cùng `artifact_key + artifact_kind`, hoặc `null`.
- `active_pointers` chỉ gồm pointer identity được phép nhìn thấy.
- Pointer snapshot phục vụ rollback có tối thiểu `pointer_id`, `artifact_key`, `artifact_kind`, `page_id`, `channel`, `version_id`, `revision`.
- `rollback_candidates` được backend tính theo semantics hiện tại của từng pointer/channel; frontend không scan current table page để tự chọn target.
- Mỗi rollback candidate mang pointer snapshot tại thời điểm fetch; frontend gọi rollback mutation hiện tại bằng snapshot đó + `target_version.version_id`.
- Pointer stale sau khi drawer mở được bảo vệ bởi `expected_pointer_revision`; frontend không tự refresh/retry rollback khi conflict.
- Candidate không được trả nếu pointer không có đủ page context hoặc target không hợp lệ theo rollback semantics hiện tại.
- Endpoint là read-only và không thay đổi rollback mutation contract.
- Drawer chỉ gọi endpoint khi mở row; table không N+1 fetch review context cho mọi item.

## API contract — Phase 2 batch transition

### Endpoint

`POST /admin/v1/policy/artifacts/batch-transitions`

### Request

```json
{
  "action": "VALIDATE",
  "items": [
    { "version_id": "v-a", "expected_revision": 3 },
    { "version_id": "v-b", "expected_revision": 7 }
  ]
}
```

Rules:

- `action` MVP chỉ nhận `VALIDATE` hoặc `APPROVE`.
- `items` từ `1..100`.
- `version_id` không được trùng trong cùng request.
- Server giữ request order trong response.
- Mỗi mutation phải gọi cùng business/store transition path với action đơn để không tạo lifecycle logic thứ hai.
- Không dùng all-or-nothing transaction cho toàn batch.

### Success/partial-failure response

Khi request envelope hợp lệ và server đã bắt đầu xử lý items, response là `200` với kết quả độc lập từng item:

```json
{
  "request_id": "...",
  "action": "VALIDATE",
  "results": [
    {
      "version_id": "v-a",
      "ok": true,
      "artifact": {
        "version_id": "v-a",
        "lifecycle": "VALIDATED",
        "revision": 4
      }
    },
    {
      "version_id": "v-b",
      "ok": false,
      "error_code": "ADMIN_ARTIFACT_VERSION_CONFLICT",
      "current_revision": 8
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

Per-item failure tối thiểu phân biệt:

- `ADMIN_ARTIFACT_VERSION_CONFLICT` + `current_revision` nếu đọc được current artifact;
- invalid lifecycle/transition;
- validation failure;
- not-found-or-not-visible/forbidden theo boundary hiện có;
- item-level unexpected failure đã được normalize an toàn, không lộ database detail.

`artifact` success phải đủ để frontend cập nhật tối thiểu lifecycle/revision của row mà không đoán state mới.

### Top-level failure

Top-level `4xx` dùng khi request chưa được xử lý theo item, ví dụ:

- malformed body;
- unsupported action;
- zero items / quá `100` items;
- duplicate `version_id`;
- capability/auth bị từ chối ở request boundary.

Các lỗi này phải fail trước khi bắt đầu item mutation.

Top-level `5xx`, network error hoặc timeout được coi là **ambiguous transport failure**: client không được giả định `0` item đã chạy và cũng không được replay nguyên batch.

### Recovery sau timeout/transport ambiguity

UI bắt buộc:

1. Giữ danh sách `{version_id, expected_revision, action}` của batch vừa gửi trong memory.
2. Khi timeout/network/5xx ambiguous xảy ra, disable nút retry trực tiếp.
3. Refresh/reconcile các selected ids từ server.
4. Với từng item:
   - nếu lifecycle/revision cho thấy transition đã hoàn tất → đánh dấu recovered success;
   - nếu vẫn đúng lifecycle + `expected_revision` cũ → cho phép retry item đó;
   - nếu revision khác nhưng target state chưa đạt → đánh dấu conflict/manual review;
   - không auto-retry conflict.
5. Retry chỉ tạo request mới chứa các item được xác nhận vẫn ở state/revision cũ.

MVP không yêu cầu batch idempotency-key riêng; safety dựa trên `expected_revision` + reconcile-before-retry. Có thể bổ sung idempotency contract sau nếu telemetry cho thấy cần.

### Audit

Mỗi item mutation phải giữ audit tương đương flow đơn:

- actor;
- artifact/version;
- action;
- result;
- request/correlation id.

Batch request id phải cho phép gom các item cùng một thao tác khi điều tra.

## Simulation semantics

MVP **không gắn simulation với checkbox selection**.

- Nút `Mô phỏng trên chat cũ` page-level hiện tại vẫn tồn tại.
- Simulation tiếp tục dùng một `pageId` rõ ràng từ policy page context hiện tại và `sideEffects: DISABLED`.
- Nếu identity có nhiều policy page, UI phải có page context được chọn rõ trước khi chạy simulation; không tự trộn page.
- Thiết kế selected-version bulk simulation, snapshot selection hay cross-page simulation là follow-up ngoài MVP.

## Phase 3 — SIZE_CHART specialized read-only review

Phase này chỉ làm review/read-only để giảm blast radius:

1. Tạo mapper từ content schema hiện tại sang row model UI.
2. Render bảng size read-only trong drawer.
3. Với field/schema không map được, hiển thị fallback generic read-only content; không làm mất provenance.
4. Không thay generic Draft editor trong phase này.
5. Không thêm deterministic business validation mới trong phase này.

Ví dụ cột tùy schema thực tế:

`Size | Chiều cao | Cân nặng | Ngực | Eo | Mông | Ghi chú`

### Follow-up riêng sau Phase 3

Chỉ mở PR mới sau khi read-only review ổn định để xem xét:

- specialized `SIZE_CHART` Draft editor;
- deterministic range/duplicate validation ở shared backend layer;
- round-trip editor tests;
- migration/data-model thay đổi nếu thực sự cần.

Các rule như range đảo min/max, overlap, duplicate row... không được đưa vào frontend-only validation rồi coi là authoritative.

## Kế hoạch triển khai theo vertical slice

### Phase 1A — Admin API/store read contracts

Phạm vi dự kiến:

- additive `search` query, giữ `artifact_key` exact-match;
- pointer-aware `active` filter;
- deterministic sort/cursor tuple cho 3 sort mode;
- `review-context` endpoint với full pointer snapshot;
- targeted Admin API/store tests.

Không migration trừ khi implementation chứng minh query hiện tại không thể đáp ứng an toàn; nếu cần migration phải tách review riêng trước khi áp dụng.

### Phase 1B — Admin Web table/filter/drawer

Phạm vi chính:

- `apps/admin-web/src/policy-control-ui.ts`
- `apps/admin-web/src/api.ts`
- `apps/admin-web/src/types.ts`
- `apps/admin-web/src/styles.css`
- Policy Control UI/API tests.

Thay đổi:

1. Card → table.
2. URL state cho filter/search/sort/cursor.
3. Quick views map trực tiếp sang query controls theo bảng preset đã khóa.
4. Current-page selection only.
5. Drawer dùng `review-context`, không derive predecessor/rollback từ current page/global pointer list.
6. Giữ action đơn và confirmation/gate behavior hiện tại.

### Phase 2 — Batch validate/approve

- thêm endpoint batch theo contract ở trên;
- sticky bulk bar chỉ `VALIDATE`/`APPROVE`;
- ordered per-item result;
- transport reconcile/retry flow;
- per-item audit.

### Phase 3 — SIZE_CHART read-only specialized review

- mapper + table read-only;
- fallback generic content;
- không editor/validation mới.

## Safety và compatibility gates

Bắt buộc giữ nguyên:

- RBAC/capability `policy_control`;
- `policyCanaryLiveEnabled` và `policyPublishEnabled`;
- `expected_revision` optimistic concurrency;
- lifecycle hợp lệ hiện tại;
- pointer rollback semantics và `expected_pointer_revision`;
- simulation `sideEffects: DISABLED`;
- audit mutation;
- page scope/policy page guard.

Không được:

- batch publish/canary live/retire/rollback;
- bỏ confirmation cho action outbound/risky hiện tại;
- tự retry mutation sau revision conflict;
- replay nguyên batch sau timeout/transport ambiguity;
- derive diff/rollback candidate chỉ từ current table page/global pointer list;
- filter `active` hoặc sort toàn tập bằng client-side current-page data;
- thay nghĩa `artifact_key` exact filter để phục vụ search UI;
- dùng cursor chỉ có primary sort key mà thiếu deterministic tie-breaker;
- mutate artifact đang `PUBLISHED` chỉ để phục vụ UI;
- đổi allowlist hoặc bật gate production trong PR này.

## Test plan

### Frontend

- filter/search/sort/query URL state;
- search `SQ603` map sang `search`, không map sang exact `artifact_key`;
- quick-view preset map đúng lifecycle/active/sort;
- manual filter edit không để hidden quick-view constraint;
- current-page checkbox selection và max `100` semantics;
- selection reset khi đổi filter/search/sort/page;
- không có cross-page select-all;
- lifecycle action visibility;
- drawer keyboard/focus management;
- drawer fetch review-context riêng;
- predecessor nằm ngoài current page vẫn diff đúng;
- rollback candidate nằm ngoài current page vẫn hiển thị đúng;
- rollback dùng pointer snapshot từ review-context và revision conflict không auto-retry;
- bulk ordered result partial success/conflict/error;
- timeout/5xx → reconcile trước retry;
- không auto-retry revision conflict;
- lifecycle-derived check state;
- `SIZE_CHART` read-only table + malformed/unmapped fallback;
- polling/reload không giữ stale selection ngoài chủ đích.

### Admin API/store

- `artifact_key` vẫn exact-match như contract hiện hữu;
- `search` là case-insensitive contains và escape `%`/`_`;
- list filter chạy trước pagination;
- `active=active|inactive` dùng accessible pointer semantics;
- `updated_desc` tie-break bằng `version_id` khi nhiều row trùng `updated_at`;
- `validated_oldest` tie-break bằng `version_id` khi nhiều row trùng `validated_at`;
- `artifact_key_asc` tie-break bằng `version_id` khi nhiều row trùng key;
- cursor không skip/duplicate qua ít nhất 2 page cho từng sort mode;
- invalid/mismatched cursor trả `ADMIN_POLICY_CURSOR_INVALID`;
- invalid `validated_oldest` combination trả `ADMIN_POLICY_SORT_INVALID`;
- `review-context` predecessor theo key+kind, độc lập current page;
- `active_pointers`/rollback candidate có full pointer snapshot gồm `page_id`, key/kind/channel/revision;
- rollback candidate theo pointer/channel hiện tại;
- batch chỉ chấp nhận `VALIDATE`/`APPROVE`;
- batch `1..100`, duplicate id bị từ chối top-level;
- response giữ request order;
- per-item `expected_revision` conflict trả `current_revision` khi có thể;
- invalid lifecycle/validation failure không làm hỏng item khác;
- top-level validation/auth failure xảy ra trước item processing;
- RBAC/page visibility;
- audit mỗi mutation + batch request correlation;
- endpoint transition đơn hiện có không đổi behavior.

### Regression

Khi implementation bắt đầu, dùng repository command thực tế. Baseline hiện tại dự kiến:

```bash
pnpm install --frozen-lockfile
pnpm check
```

và targeted Admin Web/Admin API policy tests.

PR kế hoạch hiện tại là docs-only nên không tuyên bố các command trên đã được chạy cho implementation chưa tồn tại.

## Rollout đề xuất

1. Merge Phase 1A/1B độc lập với batch mutation; không deploy production nếu chưa được yêu cầu rõ.
2. Sau khi table/filter/review-context ổn định mới merge Phase 2 batch mutation.
3. Phase 3 read-only `SIZE_CHART` tách riêng để giảm blast radius.
4. Specialized editor/validation nếu làm sẽ là follow-up PR khác, không gộp vào rollout này.
5. Deploy theo release flow chuẩn, chỉ sau khi có yêu cầu production rõ ràng.

## Acceptance criteria cho MVP

- Có thể server-side tìm `SQ603` bằng case-insensitive `search` mà không đổi `artifact_key` exact-match contract.
- Quick views có mapping lifecycle/active/sort xác định, không có hidden semantics.
- Có thể server-side lọc `SIZE_CHART` theo lifecycle và active state mà pagination không làm sai kết quả.
- Có server-side sort đúng toàn tập cho 3 sort mode đã khóa và cursor không skip/duplicate khi primary sort value trùng nhau.
- Có thể review artifact bằng drawer dù previous/rollback version nằm ngoài current page.
- Review context trả đủ pointer snapshot để gọi rollback mutation hiện tại, gồm `page_id` và revision guard.
- Selection chỉ current page, tối đa `100`, không có cross-page select-all mơ hồ.
- Có thể validate/approve nhiều item trong một batch an toàn.
- Batch response giữ request order và trả success/error contract theo từng item.
- Revision conflict không ghi đè dữ liệu mới hơn.
- Timeout/5xx không dẫn tới replay nguyên batch; UI reconcile trước retry.
- Bulk action không hỗ trợ Canary Live/Publish/Retire/Rollback/selected-version Simulation.
- `Kiểm tra` không phụ thuộc N+1 audit/event fetch và không giả vờ có persistent error source chưa tồn tại.
- `SIZE_CHART` có specialized read-only review trong Phase 3; editor/validation mới không nằm trong MVP.
- Khi implementation tồn tại: targeted policy tests và project quality gate phải PASS trước khi coi task hoàn thành.
- Không thay đổi runtime policy behavior, outbound, page allowlist hoặc production gate.

## Ngoài scope

- Thiết kế lại lifecycle policy.
- Cross-page select-all / query snapshot token / chunking selection.
- Bulk publish/canary/retire/rollback.
- Selected-version bulk simulation.
- Persistent normalized validation-history model.
- Specialized `SIZE_CHART` editor trong PR này.
- Deterministic size-range validation mới trong PR này.
- Tự động approve bằng AI.
- Thay đổi POS/price/stock source.
- Deploy production nếu chưa được owner yêu cầu rõ.

## Gate trước implementation

Plan được coi là đủ contract để bắt đầu **Phase 1A/1B** khi owner chấp thuận phiên bản này. Review `4888199387` yêu cầu khóa 2 P1 (full rollback pointer snapshot + deterministic cursor total order) và 2 P2 (search semantics + quick-view mapping); cả bốn đã được đưa thành contract cụ thể ở trên.

Việc plan đủ rõ **không** đồng nghĩa implementation đã được verify: implementation vẫn phải đi theo TDD, targeted tests, project quality gate và review trước merge.
