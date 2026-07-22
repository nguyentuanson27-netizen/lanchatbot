# Giai đoạn 4 — Admin Policy Control Plane

## Quyết định đã khóa

- PostgreSQL là nguồn chuẩn duy nhất cho policy đang hoạt động.
- Google Sheets chỉ được import vào `DRAFT`, làm staging hoặc báo cáo; không
  được publish trực tiếp.
- Vòng đời: `DRAFT → VALIDATED → APPROVED → CANARY → PUBLISHED → RETIRED`.
- OWNER được tự duyệt. Các vai trò được giới hạn thành `OWNER`, `EDITOR`,
  `APPROVER`, `VIEWER`.
- Canary chỉ cho page `1198992073286645`; hỗ trợ `SHADOW` và `LIVE_OUTBOUND`,
  trong đó giao diện chọn `SHADOW` trước.
- Rollback không sửa nội dung phiên bản. Hệ thống chỉ đổi active pointer về một
  phiên bản `PUBLISHED` bất biến.
- Simulation chỉ đọc lịch sử đã ẩn danh và luôn có `sideEffects=DISABLED`; không
  gửi Meta và không gắn tag Pancake.

## Artifact có cấu trúc

- `SHOP_POLICY`: phí ship, câu hẹn giao, dữ liệu nhận hàng và phương thức thanh toán.
- `OFFER_POLICY`: giảm 5% từ hai sản phẩm, freeship lần hai, 20.000đ + freeship
  lần cuối và quy tắc cộng ưu đãi.
- `CLOSING_STRATEGY`: READY/HESITANT/CAUTIOUS và bước tiếp theo do engine chọn.
- `SIZE_CHART`: kết quả trích xuất từ ảnh/bản import có nguồn, hash và trạng thái duyệt.
- `HANDOFF_MATRIX`: reason code, câu giữ chân hoặc im lặng và đúng một trong hai
  tag quản lý `VAN_DON`/`NHAN_VIEN`.
- `PAYMENT_POLICY`: COD/chuyển khoản và QR asset đã duyệt; không chứa secret.

Mọi payload dùng schema chặt. API và giao diện không nhận code, tag tùy ý, JSON
tùy ý, giá POS, tồn POS hoặc secret.

## Lưu trữ và audit

Migration `0014_admin_policy_control` tạo:

- `admin_artifact_versions`: nội dung chỉ sửa khi còn DRAFT; mọi trạng thái sau
  đó bất biến.
- `admin_artifact_events`: nhật ký append-only người tạo/sửa/duyệt/publish.
- `admin_active_pointers`: con trỏ riêng theo artifact, page và kênh.
- `admin_simulation_runs` và `admin_simulation_results`: chỉ lưu ID nội bộ,
  conversation hash và số liệu tổng hợp.

Optimistic revision ngăn hai quản trị viên ghi đè. Published version không bị
xóa để luôn có điểm rollback.

## API và giao diện

API nằm dưới `/admin/v1/policy/*`: danh sách/chi tiết phiên bản, cập nhật DRAFT,
transition, audit event, active pointer, rollback và simulation queue.

Giao diện “Chính sách bán hàng” hiển thị trạng thái, cấu hình khóa, active
pointer, lịch sử simulation và các nút transition theo đúng vai trò. Canary gửi
thật có xác nhận cảnh báo riêng.

## Cổng triển khai production

1. `pnpm check` đạt.
2. Backup PostgreSQL có checksum và restore-test thành công.
3. Chạy migration `0014` trên bản restore trước production.
4. Giữ `ADMIN_POLICY_CONTROL_ENABLED=false` trong lần deploy schema đầu tiên.
5. Kiểm tra read-only UI, sau đó mới bật cho page test.
6. Chạy simulation, canary shadow, rồi mới cân nhắc canary live.
7. Không deploy thay đổi giá/tồn, secret hoặc quyền tạo tag tùy ý vì các chức
   năng đó không tồn tại trong contract.

