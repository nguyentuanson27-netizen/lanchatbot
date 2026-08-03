# Hướng dẫn cho coding agent

Tài liệu này áp dụng cho toàn bộ repository La.na Chatbot.

## Bắt đầu phiên làm việc

1. Đọc `README.md`.
2. Đọc `docs/current/PRODUCTION_BASELINE_20260722.md`.
3. Với công việc thuộc chương trình kiến trúc hoặc incident `BF/DF/UR`, đọc `docs/current/architecture-program/README.md` rồi chỉ nạp các file/section được index đó định tuyến; không nạp `archive/` hoặc toàn bộ kế hoạch cũ theo mặc định.
4. Đọc `docs/current/REALTIME_AGENT_UPGRADE_PLAN.md` cho công việc realtime không thuộc `BF/DF/UR`, hoặc khi index kiến trúc dẫn chiếu trực tiếp tới kế hoạch này.
5. Đọc manifest mới nhất trong `deploy/manifests/`.
6. Kiểm tra `git status`, branch hiện tại và thay đổi chưa commit trước khi sửa file.
7. Nếu đang ở VPS, chỉ làm việc trong `/opt/lana-chatbot/repository`.

## Nguồn chuẩn và phạm vi VPS

- GitHub `nguyentuanson27-netizen/lanchatbot` là nguồn mã chuẩn.
- `/opt/lana-chatbot/current` là runtime production, không phải working tree.
- Không sửa file trực tiếp trong `current` hoặc bất kỳ thư mục `releases/*` nào.
- Deploy key VPS chỉ có quyền đọc. Không tìm cách đổi thành quyền ghi hoặc đẩy commit từ VPS.
- Thay đổi mã nguồn phải được commit/push từ môi trường phát triển được ủy quyền, sau đó VPS mới pull theo commit/tag cụ thể.

## Quy tắc an toàn production

- Không restart, recreate container, deploy, chạy migration, đổi symlink `current`, bật workflow n8n hoặc gửi tin thử nếu người dùng chưa yêu cầu rõ ràng.
- Không thay đổi allowlist page. Page canary hiện tại là `1198992073286645`.
- Không kích hoạt đồng thời workflow n8n P2.2/P2.3 với app-native POS/P2.3 workers.
- Không xóa Redis, PostgreSQL, Qdrant, Inbox/Outbox, log hoặc dữ liệu khách hàng hàng loạt.
- Không in, commit hoặc sao chép secret vào tài liệu/log. Secret production nằm ngoài repository.
- Khi chẩn đoán, ưu tiên kiểm tra chỉ đọc và ghi lại bằng chứng trước khi đề xuất thay đổi.

## Quy tắc nghiệp vụ quan trọng

- App gửi reply trực tiếp qua Meta Send API.
- Pancake dùng để quan sát/gắn tag và handoff; không phải kênh gửi reply cho khách.
- Giá, tồn, size, ETA, phí ship, freeship và ưu đãi phải đến từ node/lớp nghiệp vụ đã xác minh; model không được tự tạo.
- POS là nguồn gốc BOM, giá và tồn. Google Sheets là lớp quản trị/snapshot. Redis phục vụ realtime. Qdrant chỉ chứa dữ liệu tìm kiếm tương đối ổn định.
- Inbox chống xử lý lại webhook; Outbox đảm bảo một phản hồi chỉ được gửi một lần.

## Invariant tương thích r31.3 bắt buộc

- Bảo toàn verified facts và media: lỗi ở model, Size Engine hoặc enrichment chỉ được làm mất phần đóng góp của chính nó; không được xóa hay thay thế giá, tồn, ETA, ảnh, CTA hoặc nội dung đã xác minh đã dựng trước đó.
- Mọi thay đổi realtime phải differential-test với behavioral baseline r31.3; sai khác chỉ hợp lệ khi thuộc deviation đã phê duyệt trong kế hoạch r32.2 và có regression evidence.
- Delivery gate phải quyết định một lần cho toàn bộ response group trước sequence 0; blocking tag hoặc kết quả stale, timeout, error hay unverified đều fail-closed và không sequence nào được gửi.
- Không được chuyển Inbox thành `FAILED_PERMANENT` chỉ vì output model sai schema, malformed hoặc parse lỗi; phải thử deterministic fallback từ verified facts trước.

## Quy trình thay đổi

1. Tạo branch từ `main`; không phát triển trực tiếp trên runtime VPS.
2. Sửa nhỏ, có migration additive/backward-compatible nếu cần.
3. Chạy `pnpm install --frozen-lockfile` và `pnpm check`.
4. Rà secret, PII, ownership giữa app/n8n và ảnh hưởng dữ liệu.
5. Review và merge vào `main`; tạo tag release rõ ràng.
6. Trên VPS, fetch tag/commit bằng deploy key read-only và tạo `/opt/lana-chatbot/releases/<tag-or-commit>` mới.
7. Backup và restore-test trước migration có rủi ro.
8. Health check, smoke test và canary page test.
9. Chỉ đổi symlink `current` sau khi mọi kiểm tra đạt; giữ release trước để rollback.

## Khi có mâu thuẫn tài liệu

Ưu tiên theo thứ tự:

1. Yêu cầu mới nhất của người dùng.
2. `AGENTS.md` và `README.md` trên branch hiện tại.
3. Với `BF/DF/UR`: các file active được định tuyến từ `docs/current/architecture-program/README.md`.
4. Generated runtime-state, source pointer, symlink và manifest release mới nhất khi trạng thái production có liên quan; bằng chứng live mới hơn luôn thắng snapshot tài liệu.
5. `docs/current/PRODUCTION_BASELINE_20260722.md`.
6. Tài liệu lịch sử trong `docs/phase*`, `docs/history/` và `docs/current/architecture-program/archive/`.

## Runtime-state authorization boundary

- When current production status matters, agents must read generated `/opt/lana-chatbot/runtime-state/current.json`, its immutable history record, the resolved `current` symlink, and the release-local `.release-source.json`; unknown, partial, or mismatched evidence must fail closed.
- Repository source change: branch, review, and merge. Never develop against production runtime.
- Approved deployment automation: only after explicit production authorization may it create a new release directory from an immutable GitHub tag/commit, create that new release's `.release-source.json` once before activation, and atomically create, verify, and promote runtime-state records.
- Manual runtime mutation is prohibited. Coding agents must never edit `current`, an existing release directory, an existing source pointer, runtime-state history, or `current.json` manually.
- Explicit authorization is required before deploy, migration, restart, symlink change, canary send, routing, or page-allowlist change.
