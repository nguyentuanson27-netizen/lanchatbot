# Release r32.2 — Compatibility First

Status: **APPROVED_FOR_IMPLEMENTATION**

Ngày khóa kế hoạch: 2026-07-31.

Behavioral baseline: `20260731-realtime-generation-quota-r31.3` (`30dd6030a2e682cdd438f4226073fb77e4a579b7`).

Candidate hiện tại: r32.1 (`90760d2cf43c160d58470b0c9907f30032774140`).

## 1. Mục tiêu

r32.2 sửa các nhánh làm mất cấu trúc phản hồi hoặc làm delivery không an toàn, đồng thời chứng minh mọi hành vi ngoài phạm vi sửa vẫn tương thích với behavioral contract của r31.3.

Nguyên tắc bắt buộc:

> Final reply = Verified base + Optional enrichment + Eligible stage CTA

`Optional enrichment` có thể thiếu hoặc lỗi, nhưng không được xóa giá, tồn kho, ETA, ảnh, CTA hoặc nội dung đã xác minh trong `Verified base`.

## 2. Trạng thái vận hành

- Page `1198992073286645` là page test, chưa có người dùng thật; không cần bật kill switch chỉ để merge docs và regression shield.
- Giữ r32.1 ở phạm vi canary hiện tại; không mở rộng page/traffic.
- Không requeue Inbox/Outbox lỗi trước khi r32.2 đã deploy và xác minh.
- GitHub là source of truth. Không sửa source trực tiếp trong VPS.
- Không xóa dữ liệu hội thoại, audit event, Inbox, Outbox, Redis, PostgreSQL, Qdrant hoặc provider evidence.

## 3. Sự cố cần đóng

1. Thiếu bảng size có thể chuyển `HANDOFF` với `reply=""`, làm mất giá, tồn, ETA, ảnh và CTA đã dựng.
2. `VERTEX_SCHEMA_INVALID` ở grounded draft đầu tiên có thể làm cả lượt `FAILED_PERMANENT` thay vì dùng fallback xác định.
3. Một số fallback làm giọng văn cụt và mất đúng một câu hỏi nối theo sales stage.
4. Pancake tag đang được kiểm tra theo từng Outbox sequence. Lần đầu `unverified` lại fail-open nên sequence 0 có thể lọt; lần sau mới xác nhận `NHÂN_VIÊN` và chặn giữa response group.
5. Outbox kế tiếp có thể treo sau predecessor ở `MANUAL_REVIEW` hoặc terminal state.
6. Token telemetry và health check chưa phân biệt rõ model success, fallback, usage thiếu và queue stuck.

## 4. Compatibility contract

Ngoài sáu thay đổi cho phép bên dưới, output và side effect phải giữ hành vi r31.3:

| ID | Thay đổi được phép | Điều kiện |
|---|---|---|
| D1 | Size thiếu chart chỉ handoff phần size | Verified base và attachment không đổi |
| D2 | Vertex schema/model lỗi đi vào deterministic grounded fallback | Không `FAILED_PERMANENT` chỉ vì lỗi draft |
| D3 | Khôi phục Voice Contract và stage CTA | Tối đa đúng một câu hỏi, không hỏi khi handoff/no-reply/buying committed |
| D4 | Pancake tag được xác minh một lần cho cả response group | `unverified` hoặc blocking tag đều fail-closed trước sequence 0 |
| D5 | Watchdog giải phóng Outbox treo | Không gửi trùng, không vượt qua manual review |
| D6 | Bổ sung token/health telemetry | Không đổi nội dung hoặc quyết định bán hàng |

Không được thay đổi ngoài danh sách trên nếu chưa có decision record, regression evidence và phê duyệt riêng.

## 5. Chuỗi PR

### PR-A — Regression Shield

Merge trước mọi bản vá. Shield phải có fixture và assertion cho:

- báo giá, tồn kho, ETA và attachment;
- grouping/bong bóng và thứ tự message;
- Size Engine success, missing chart và low-confidence;
- Voice Contract, CTA theo stage và giới hạn một câu hỏi;
- buying intent, no-reply và handoff;
- model timeout, 429, 5xx, malformed JSON và schema invalid;
- Outbox ordering, idempotency và delivery gate;
- registry D1–D6 để differential test chỉ cho phép sai khác có chủ đích.

PR-A không sửa production behavior. Ca lỗi mục tiêu được ghi bằng test `todo` có ID rõ ràng; các contract không lỗi phải chạy xanh ngay trên main.

### PR-B — Size preservation

- Tách `Verified base` khỏi kết quả tư vấn size.
- Missing chart/low confidence chỉ thêm handoff reason cho phần size.
- Không cho Size Engine trả object rỗng ghi đè reply/attachments đã xác minh.
- Bắt buộc `outboundMessageCount > 0` nếu đã có verified base và không bị delivery gate chặn.

### PR-C — Vertex fallback, Voice Contract và CTA

- Mọi lỗi grounded draft gồm timeout, 429, 5xx, parse và `VERTEX_SCHEMA_INVALID` đi chung một fallback matrix.
- Fallback dựng câu trả lời từ facts đã xác minh; không bịa giá, tồn, ETA hoặc size.
- Lớp viết lời chạy sau khi nội dung an toàn đã tồn tại.
- CTA theo stage chạy trên cả model path và fallback path; tối đa một câu hỏi.
- Không hỏi khi `HANDOFF`, `NO_REPLY`, khách đã chốt mua hoặc policy cấm.

### PR-D — Atomic response-group delivery gate

- Tạo `response_group_id` ổn định cho toàn bộ sequence.
- Đọc/xác minh Pancake tag đúng một lần trước sequence 0 và lưu snapshot cho group.
- `NHÂN_VIÊN`, blocking tag, timeout, stale hoặc unverified đều chặn cả group trước send đầu tiên.
- Không đọc lại tag giữa group để tạo quyết định mâu thuẫn.
- Snapshot có TTL ngắn, audit source/time/status và không tái sử dụng cho group khác.

### PR-E — Outbox watchdog, telemetry và health

- Terminal predecessor phải cascade trạng thái rõ ràng cho descendants.
- `MANUAL_REVIEW` giữ group, có metric/age/SLO và operator action; không tự gửi tiếp.
- Watchdog idempotent, có lease và không biến provider ambiguity thành blind retry.
- Token telemetry ghi `usage_source` (`provider`, `estimated`, `missing`) cùng model/path/error class.
- Health tách process liveness khỏi dependency readiness và queue health.

## 6. Regression matrix tối thiểu

| Nhóm | Ca bắt buộc | Assertion chính |
|---|---|---|
| Quote | giá, sale, tồn, ETA, ảnh | facts/attachments không mất hoặc đổi thứ tự |
| Size | có chart, thiếu chart, low confidence | chỉ phần size handoff khi cần |
| CTA | awareness, consideration, decision | tối đa một câu hỏi đúng stage |
| Buying | hỏi mua, chốt đơn, gửi thông tin | không hỏi nối không phù hợp |
| Handoff | policy, size-only, nhân viên | giữ nội dung an toàn; bot không vượt ownership |
| Vertex | timeout, 429, 5xx, JSON/schema invalid | fallback có outbound khi có verified base |
| Grouping | một/nhiều text và ảnh | cùng response group, thứ tự xác định |
| Pancake | blocking, clear, stale, timeout | fail-closed trước sequence 0 |
| Outbox | retry, terminal predecessor, manual review | không treo vô hạn, không gửi trùng |
| Telemetry | usage đủ/thiếu/fallback | health không báo xanh giả |

Differential harness chạy cùng input/context/facts/flags trên r31.3 và r32.2, chuẩn hóa ID/timestamp rồi so output, attachment, disposition, handoff reason, CTA, sequence và side effect. Sai khác chỉ hợp lệ khi ánh xạ đúng một ID D1–D6.

## 7. Hard gates

PR hoặc release phải dừng nếu có một trong các điều kiện:

- mất verified price/stock/ETA/image/CTA ngoài deviation đã duyệt;
- `outboundMessageCount=0` khi verified base tồn tại và không có blocking gate;
- lỗi Vertex draft làm `FAILED_PERMANENT` mà chưa thử deterministic fallback;
- hơn một câu hỏi hoặc CTA xuất hiện khi không đủ điều kiện;
- sequence 0 được gửi trước khi group gate xác minh;
- delivery gate fail-open khi tag stale/unverified/error;
- Outbox gửi trùng, vượt manual ownership hoặc stuck vượt SLO;
- differential mismatch ngoài D1–D6;
- full tests/typecheck/build/migration/smoke không xanh.

## 8. Quy trình GitHub → VPS

1. Merge docs PR và PR-A Regression Shield.
2. Mỗi capability PR độc lập, có test mục tiêu và differential evidence.
3. CI chạy test, typecheck, build, migration compatibility và container smoke.
4. Tạo immutable release tag/manifest chứa commit, image digest, config/flag snapshot, migrations và test evidence.
5. VPS chỉ pull artifact đã merge/tag; không sửa source trực tiếp.
6. Deploy Delivery ở send-disabled để kiểm tra group gate/watchdog, sau đó deploy Realtime.
7. Chạy replay/shadow và tối thiểu 30 kịch bản Messenger kiểm soát trên page test.
8. Chỉ mở rộng sau 48 giờ, ít nhất 100 generation được đánh giá và mọi hard-safety metric bằng 0.

## 9. Queue recovery

Chỉ bắt đầu sau khi r32.2 canary đã xác minh:

- Không blind requeue lượt đã có bất kỳ Meta send nào.
- Vertex/size failure chỉ requeue khi chưa bị generation mới supersede, chưa có human reply/tag và facts được xác minh lại.
- Provider ambiguity phải đối soát evidence trước retry.
- Tag `NHÂN_VIÊN` còn tồn tại hoặc chưa xác minh thì không bot-send.
- Mọi repair append audit event; không sửa/xóa record gốc.

## 10. Rollback

- Lỗi riêng Realtime: có thể trả Realtime về r31.3 và giữ Delivery group gate r32.2 nếu gate đã được xác minh.
- Lỗi Delivery: dừng outbound; không rollback sang delivery fail-open cũ.
- Giữ migration additive, audit, Inbox và Outbox; không auto-requeue sau rollback.

## 11. Definition of Done

r32.2 chỉ được ghi `DEPLOYED_VERIFIED` khi:

- Regression Shield đã merge trước code fix;
- differential parity đạt 100% ngoài D1–D6;
- full local/Docker checks và migration compatibility xanh;
- 30 kịch bản Messenger, 48 giờ và 100 generation đạt;
- mọi hard-safety metric bằng 0;
- rollback artifact đã smoke và queue recovery dry-run được review;
- release manifest chứa bằng chứng cụ thể, không chỉ ghi PASS chung chung.
