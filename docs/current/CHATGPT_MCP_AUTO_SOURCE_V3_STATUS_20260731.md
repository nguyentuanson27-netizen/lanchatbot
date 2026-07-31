# ChatGPT MCP automatic production source — v3

Status: **IMPLEMENTED_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-31**

## Mục tiêu

MCP không còn giữ snapshot source cố định tại thời điểm build. Repository tools
tự theo release production mà symlink `/opt/lana-chatbot/current` đang trỏ tới,
nên release mới không cần rebuild hoặc recreate MCP chỉ để cập nhật source.

## Thiết kế

- `lana-mcp-source-sync.path` theo dõi symlink `current`.
- `lana-mcp-source-sync.timer` kiểm tra bù mỗi 5 phút.
- Updater chỉ chấp nhận target trực tiếp bên trong
  `/opt/lana-chatbot/releases`.
- Tag cùng tên release được fetch bằng deploy key read-only của `lana-deploy`.
- README, AGENTS, MCP server và compose trong release phải khớp tag.
- Updater tạo source mirror sạch từ `git archive` tại
  `/opt/lana-chatbot/mcp-source/releases/<release>`.
- Pointer JSON được ghi `root:root`, mode `0444`, bằng atomic rename.
- MCP resolve pointer trên từng repository tool call nên không cần restart.

## Security boundary

- Container chỉ mount `/opt/lana-chatbot/mcp-source` ở chế độ read-only.
- Không mount trực tiếp production releases; MCP chỉ thấy source mirror tạo từ
  Git tag đã xác minh.
- Không mount `/opt/lana-chatbot/shared`, secret, `.git`, Docker socket hoặc
  repository ghi được.
- Release/ref/commit và mọi path đều được validate; pointer sai fail-closed.
- Pointer chỉ thay sau khi tag/source guard đạt. Lỗi giữ nguyên pointer trước.
- MCP vẫn giữ embedded snapshot làm fallback khi dynamic mode không được cấu
  hình, nhưng production v3 bắt buộc dùng pointer.

## Phạm vi

- Thay đổi: `lana-mcp` và ba systemd unit source-sync.
- Không thay đổi API, Realtime, Delivery, Admin, POS, P2.3, n8n, page allowlist,
  outbound, Redis, PostgreSQL, Qdrant hoặc Google Sheets.
- Không migration và không mutation dữ liệu khách hàng.

## Kiểm thử bắt buộc

- MCP unit test: embedded/path security, dynamic release switch không restart,
  invalid pointer fail-closed.
- Updater Linux regression: release A → B, source mismatch giữ pointer B, target
  ngoài releases root bị chặn.
- Bash syntax, compose render, systemd verify, secret scan và full `pnpm check`.
- Production smoke: MCP health 200, OAuth unauthenticated 401, repository source
  là r31.3 đúng commit/tag và các service ngoài MCP giữ nguyên container.

## Rollback

1. Disable `lana-mcp-source-sync.path` và `.timer`.
2. Khôi phục pointer trước hoặc recreate riêng `lana-mcp` bằng image
   `lana-chatbot-mcp:repository-read-v2`.
3. Không rollback schema và không xóa release, Inbox/Outbox, Redis, PostgreSQL,
   Qdrant hoặc dữ liệu hội thoại.
