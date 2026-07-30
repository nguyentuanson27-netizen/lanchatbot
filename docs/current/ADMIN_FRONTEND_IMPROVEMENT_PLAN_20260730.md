# Kế hoạch cải thiện Admin Frontend và bổ sung tính năng

Status: **PLANNED**

Ngày cập nhật: **2026-07-30**

Baseline tham chiếu:

- Production: `20260729-ad-acquisition-r27.1`, commit
  `1e9c20e24ce092738afa6732427c12eaf69a203f`.
- GitHub `main` tại thời điểm lập kế hoạch: commit
  `e487357dff5dcc410f5bb8eeefa2b7bfcc05c2e4`.
- Admin Web/Admin API production đang healthy, restart count `0`; public Admin
  trả `302` sang Authentik.
- `r18.7` không phải rollback target: release này từng lỗi quyền đọc static
  assets và đã được thay bởi `r18.8.1`; Admin hiện nằm trong image r27.1.

Tài liệu này là kế hoạch triển khai. Nó không tự bật feature flag, không thay đổi
production, không mở thêm page và không cho phép sửa trực tiếp trên VPS.

## 1. Mục tiêu

1. Làm Admin dễ đọc, ổn định và thao tác nhanh trên desktop lẫn mobile.
2. Loại bỏ các hành vi UI có thể gây hiểu nhầm: tìm kiếm thiếu dữ liệu, toast lỗi
   hiển thị như thành công, phím tắt được quảng bá nhưng chưa hoạt động đầy đủ.
3. Hoàn thiện các luồng vận hành có giá trị cao: handoff theo SLA, kiểm tra quyết
   định hội thoại, Media Pipeline, Meta Ads funnel và Dataset Adjudication.
4. Giữ nguyên các ranh giới an toàn hiện hành: Authentik, capability/RBAC,
   PII-free views, deterministic guard, Inbox/Outbox và page allowlist.
5. Chia thay đổi thành các release nhỏ, có smoke test và rollback riêng.

## 2. Ngoài phạm vi

- Không thay đổi prompt, model, nội dung outbound hoặc logic sales runtime chỉ vì
  thay đổi giao diện.
- Không thay đổi ownership giữa app và n8n.
- Không mở thêm page ngoài `1198992073286645`.
- Không đưa raw message, customer hash, ciphertext, secret hoặc raw model body
  vào Admin.
- Không gọi `PURCHASE_CONFIRMED` là `ORDER_CREATED` hoặc `CONVERTED` trước khi có
  acknowledgement idempotent từ POS.
- Không thay framework frontend trong wave đầu. Vanilla TypeScript + Vite tiếp
  tục được dùng; chỉ đánh giá framework khác nếu kiến trúc module vẫn không đủ.

## 3. Kết quả rà soát hiện tại

Frontend trên `origin/main` đã đạt typecheck, `47/47` test Admin Web và production
build. Bundle hiện khoảng `107,19 KB` JavaScript và `35,77 KB` CSS trước gzip.
Kiểm tra viewport `1440 px` và `390 px` không thấy tràn ngang.

Các vấn đề cần xử lý:

| Ưu tiên | Vấn đề | Bằng chứng hiện tại | Mục tiêu |
|---|---|---|---|
| P0 | Chữ quá nhỏ | Font nhỏ nhất `8 px`; nhiều thành phần dùng `7–10 px` | Nội dung chính tối thiểu `14 px`, metadata tối thiểu `12 px` |
| P0 | Polling render lại toàn trang | Chu kỳ 5 giây có thể làm mất focus, scroll hoặc trạng thái nhập | Cập nhật theo vùng; không phá thao tác đang diễn ra |
| P0 | Tìm kiếm không bao phủ toàn bộ dữ liệu | Frontend lấy tối đa 50 hội thoại rồi lọc cục bộ; `nextCursor` chưa được dùng | Search phía server và cursor pagination |
| P0 | Màu toast lỗi sai | Một số lỗi Dataset/Policy dùng tone thành công mặc định | Lỗi luôn có tone `danger`, cảnh báo dùng `warning` |
| P1 | Phím tắt Dataset chưa nối đủ | UI hiển thị A/R/E/N/P/S nhưng hiện chỉ `P` được bind ở màn hình chính | Toàn bộ shortcut hoạt động và không kích hoạt khi nhập liệu |
| P1 | Modal/drawer chưa đủ accessibility | Chưa focus trap, restore focus, `inert`, `aria-expanded` đầy đủ | Keyboard-only và screen-reader flow đạt |
| P1 | Phân trang chưa nhất quán | Handoff/Outreach có cursor; Conversations/Audit chưa có UI tương ứng | Một contract cursor dùng nhất quán |
| P1 | Frontend khó bảo trì | `main.ts`, `api.ts` và `styles.css` đã lớn | Tách module theo route và shared primitives |
| P2 | Page context hard-code | Topbar ghi cố định page test | Đọc page scope từ API; sẵn sàng cho page selector |

## 4. Nguyên tắc triển khai

- Mỗi wave phải giải quyết một nhóm rủi ro rõ ràng và có rollback độc lập.
- Thay đổi DB chỉ được additive/backward-compatible.
- API mới phải capability-gated và chỉ trả projection đã ẩn danh.
- FE không tự suy diễn trạng thái nghiệp vụ từ text; dùng enum/field do API cung
  cấp.
- Không dùng màu làm tín hiệu duy nhất; mọi trạng thái phải có nhãn chữ.
- Polling không được ghi dữ liệu và không được che mất lỗi.
- Mọi mutation phải có idempotency key, optimistic concurrency khi phù hợp và
  audit actor/result.
- Không recreate service ngoài phạm vi release.

## 5. Lộ trình triển khai

### Wave FE-1 — Readability, stability và accessibility

Release đề xuất: `YYYYMMDD-admin-fe-hardening-r1`

Phạm vi: `apps/admin-web`; không migration, không thay đổi outbound.

#### Công việc

1. Chuẩn hóa typography:
   - body `15–16 px`;
   - nội dung bảng/card/message tối thiểu `14 px`;
   - metadata/badge tối thiểu `12 px`;
   - line-height tối thiểu `1.4`;
   - giữ khả năng zoom trình duyệt đến 200%.
2. Thay polling render toàn trang bằng refresh theo vùng:
   - giữ focus, selection, scroll và filter;
   - tạm refresh khi modal/drawer/form đang hoạt động;
   - không khởi tạo request mới nếu request cùng loại còn chạy;
   - hiển thị trạng thái stale khi refresh lỗi nhưng giữ dữ liệu gần nhất.
3. Chuẩn hóa toast:
   - `good`, `warning`, `danger`;
   - lỗi có `role="alert"` hoặc live region phù hợp;
   - không tự biến lỗi thành thông báo thành công.
4. Nối đầy đủ Dataset shortcuts qua `resolveShortcut`:
   - A/R/E/N/P/S và Shift+A;
   - bỏ qua khi focus ở input, textarea, select hoặc contenteditable;
   - hiển thị bảng trợ giúp shortcut.
5. Hoàn thiện modal/drawer:
   - focus trap, Escape, restore focus;
   - khóa tương tác nền bằng `inert`;
   - dialog label/description đầy đủ;
   - menu mobile có `aria-expanded` và quản lý focus.
6. Thay `window.prompt`/`window.confirm` ở thao tác quan trọng bằng modal có mô tả
   phạm vi, hậu quả và trạng thái đang xử lý.
7. Tách `main.ts` thành route modules mà không thay đổi hành vi:
   `overview`, `conversations`, `handoffs`, `media`, `policy`, `datasets`,
   `operations`, `audit`.

#### Điều kiện nghiệm thu

- Không còn font dưới `12 px` trong nội dung vận hành.
- Không tràn ngang ở `320`, `390`, `768`, `1024` và `1440 px`.
- Tìm kiếm, nhập form và modal không mất focus do polling trong ít nhất 60 giây.
- 100% shortcut được quảng bá có browser test.
- Tab order, Escape, focus trap và restore focus đạt browser test.
- Typecheck, unit test, static asset test và production build đạt.
- Admin public vẫn trả `302` sang Authentik.

### Wave FE-2 — Search, pagination và navigation

Release đề xuất: `YYYYMMDD-admin-search-navigation-r1`

Phạm vi: `apps/admin-web`, `apps/admin-api`, repository/query layer. Migration chỉ
dùng khi cần index additive.

#### Công việc

1. Search hội thoại phía server theo các trường PII-free được duyệt:
   product id, stage, owner, reason code và redacted search projection.
2. Dùng cursor pagination thống nhất cho Conversations, Handoffs, Outreach và
   Audit; chống trùng item giữa các trang.
3. Đồng bộ filter vào URL để reload/back/forward không làm mất trạng thái.
4. Thêm clear filter, tổng số kết quả, trạng thái “đã tải hết” và empty state phân
   biệt “không có dữ liệu” với “không khớp bộ lọc”.
5. Page context lấy từ `/me` và `/pages`; không hard-code ID trên giao diện.
6. Saved views chỉ được lưu filter không nhạy cảm; không lưu raw query chứa PII.

#### Điều kiện nghiệm thu

- Search tìm được item ngoài 50 bản ghi đầu.
- Cursor ổn định, không trùng và không bỏ sót trong test fixture lớn.
- Filter URL có thể chia sẻ trong cùng quyền truy cập nhưng không chứa PII.
- API tiếp tục enforcing RBAC; FE capability-gating không phải lớp bảo vệ duy nhất.
- Nếu thêm index DB: migration `up → down → up`, checksum và restore-test đạt.

### Wave FE-3 — Handoff SLA và Conversation Inspector

Release đề xuất: `YYYYMMDD-admin-ops-workflows-r1`

Phạm vi: Admin Web/API và migration additive nếu schema hiện tại thiếu assignment
hoặc SLA event.

#### Tính năng Handoff SLA

- Hiển thị tuổi hàng đợi, ngưỡng SLA và mức ưu tiên.
- Nhận xử lý/đổi người phụ trách/đánh dấu hoàn tất bằng optimistic concurrency.
- Bộ lọc theo trạng thái, nguyên nhân, nguồn, SLA và người phụ trách.
- Timeline append-only cho mọi lần nhận, chuyển và hoàn tất.
- Không tự gửi tin khách khi thao tác handoff.

#### Tính năng Conversation Inspector

- Timeline hợp nhất, đã ẩn danh:
  - inbound event;
  - need, barrier, decision factor và Wave 2 strategy;
  - business fact source/version/result;
  - deterministic guard reason;
  - reply plan và Meta Outbox sequence;
  - trạng thái accepted/failed khi có bằng chứng.
- Link từ Handoff, Quality và Ads funnel sang inspector.
- Không hiển thị raw model body, secret, customer hash hoặc ciphertext.

#### Điều kiện nghiệm thu

- Hai người thao tác đồng thời nhận `409` hoặc kết quả idempotent, không ghi đè
  âm thầm.
- SLA không được tính lại từ text; dùng timestamp/event có nguồn xác định.
- Inspector tái dựng được một reply plan mà không đọc bảng PII/raw conversation.
- Mọi mutation có actor, before/after an toàn và request id trong audit.

### Wave FE-4 — Ads funnel, Media Pipeline và Dataset Adjudication

Release nên tách thành tối đa ba tag độc lập nếu một miền chưa sẵn sàng.

#### Meta Ads funnel drill-down

- Lọc theo ngày, ad, post, product, meaningful label, barrier, playbook, version
  và attribution touch.
- So sánh kỳ hiện tại/kỳ trước; hiển thị mẫu số và tỷ lệ cho từng bước.
- Cohort `NO_RESPONSE_1H/24H` chỉ là analytics, không tự tạo outbound.
- Chỉ đọc `admin_acquisition_sessions_v` hoặc view PII-free kế nhiệm.
- Không thêm `CONVERTED` trước POS `ORDER_CREATED` acknowledgement.

#### Media Pipeline

- Theo dõi trạng thái:
  `manual_image_intake → PENDING_AI → APPROVED/REJECTED → ACTIVE → Qdrant`.
- Hiển thị lỗi theo stage, checksum/duplicate status và lần retry gần nhất.
- Cho phép retry có kiểm soát khi backend xác nhận thao tác idempotent.
- Không cho upload đi thẳng Qdrant và không ghi `MANUAL_OVERRIDE` từ AI.

#### Dataset Adjudication

- Thay nút placeholder “Cần phân xử” bằng endpoint và queue thật.
- So sánh nhãn reviewer/AI, evidence và mutual-exclusion conflict.
- Claim/release lease, adjudicate và audit append-only.
- Export chỉ chứa nhãn human-confirmed; holdout lock tiếp tục bất biến.
- Không đưa raw transcript hoặc ciphertext vào FE.

#### Điều kiện nghiệm thu

- Ads funnel khớp query kiểm chứng của view và giữ `delivered/read` nullable.
- Media retry không tạo duplicate intake/Qdrant point.
- Adjudication cập nhật progress đúng và không làm lộ đề xuất AI trong blind mode.
- Mỗi miền có smoke/rollback riêng; không gộp cutover nếu ownership khác nhau.

## 6. Kế hoạch kiểm thử

### Unit và contract

- Mapper API với enum lạ, null, thiếu field và cursor.
- Polling reducer/cache, stale state và AbortController.
- Shortcut, focus utilities và tone mapping.
- Search/pagination contract, optimistic concurrency và idempotency.
- PII negative tests cho mọi projection mới.

### Browser integration

- Chrome/Edge desktop: `1440 × 900`.
- Tablet: `768 × 1024`.
- Mobile: `390 × 844` và tối thiểu `320 px`.
- Keyboard-only: navigation, drawer, modal, Dataset Review.
- Polling 60 giây khi đang search, nhập form, mở modal và cuộn danh sách.
- Authentik redirect và asset 200/404 contract để không lặp lại sự cố r18.7.

### Production smoke

- Admin Web `/health` và Admin API `/health/ready` trả 200 nội bộ.
- Public Admin trả 302 sang Authentik.
- Asset JavaScript/CSS trả đúng MIME; asset thiếu trả 404.
- Target service restart count `0`.
- Không có migration checksum drift, lỗi Admin mới hoặc thay đổi page allowlist.
- Realtime, Delivery, POS, P2.3 và n8n không restart nếu release chỉ đổi Admin.

## 7. Chỉ số thành công

Chỉ ghi số liệu tổng hợp, không PII:

- lỗi tải trang và lỗi mutation theo route;
- thời gian tải dữ liệu và refresh;
- tỷ lệ search có kết quả, số trang cursor được tải;
- tuổi handoff P50/P95 và tỷ lệ quá SLA;
- thời gian review mỗi dataset item và disagreement rate;
- media items theo stage, retry và failure rate;
- funnel conversion giữa các stage với mẫu số hiển thị rõ;
- số lỗi accessibility/browser regression trước release.

Không dùng vanity metric để tự động thay đổi outbound hoặc policy.

## 8. Thứ tự ưu tiên và ước lượng

| Wave | Ước lượng | Giá trị chính | Phụ thuộc |
|---|---:|---|---|
| FE-1 | 4–6 ngày kỹ thuật | Dễ đọc, ổn định, giảm lỗi thao tác | Không |
| FE-2 | 5–7 ngày kỹ thuật | Search đúng toàn bộ dữ liệu, navigation rõ | Admin API/query |
| FE-3 | 8–12 ngày kỹ thuật | Giảm thời gian xử lý handoff và điều tra lỗi | Event/projection PII-free |
| FE-4 | 10–15 ngày kỹ thuật, nên chia nhỏ | Tối ưu Ads, media và dataset operations | View/API từng miền |

Ưu tiên thực hiện FE-1 và FE-2 trước khi thêm tính năng lớn. FE-3 nên triển khai
Handoff SLA trước Inspector nếu nguồn event Inspector chưa đủ. FE-4 chỉ bắt đầu
sau khi từng miền có owner, contract và rollback được chốt.

## 9. Quy trình GitHub → VPS cho từng wave

1. Tạo branch mới từ `origin/main`; không phát triển từ branch cũ trên VPS.
2. Thay đổi nhỏ, review theo module và không trộn refactor với migration lớn.
3. Chạy `pnpm install --frozen-lockfile`, test mục tiêu và `pnpm check`.
4. Kiểm tra secret, PII, capability/RBAC, source-of-truth và ownership app/n8n.
5. Merge qua review, tạo annotated tag và release manifest.
6. VPS dùng deploy key read-only để fetch tag/commit vào
   `/opt/lana-chatbot/releases/<tag>`.
7. Nếu có migration: backup có checksum, restore-test rồi mới migrate.
8. Recreate đúng Admin Web/Admin API hoặc service nằm trong manifest.
9. Chạy health, asset, Authentik, RBAC và browser smoke.
10. Chỉ đổi symlink `current` sau khi đạt; giữ release/image trước làm rollback.

## 10. Rollback

- FE-1: quay lại Admin Web image trước; không có schema/data rollback.
- FE-2: quay lại Admin Web/Admin API image trước; giữ index additive nếu có.
- FE-3: tắt capability/feature flag trước, sau đó rollback image. Giữ event/audit
  đã ghi; không xóa handoff history.
- FE-4: rollback riêng theo Ads, Media hoặc Dataset; không xóa acquisition event,
  manual image intake, annotation, Inbox/Outbox, Redis, PostgreSQL hoặc Qdrant
  hàng loạt.

## 11. Definition of Done

Một wave chỉ hoàn thành khi:

- code và tài liệu đã merge vào GitHub `main`;
- test/typecheck/build và security/PII review đạt;
- manifest ghi đúng commit, image, migration và phạm vi service;
- production health/smoke đạt, restart count mục tiêu bằng `0`;
- rollback đã syntax-check và có target xác định;
- README/baseline/status document được cập nhật theo release thực tế;
- chưa có bằng chứng production thì ghi rõ `EVIDENCE_PENDING`, không suy diễn.
