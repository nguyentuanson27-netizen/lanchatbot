# C3 candidate trên PREPROD — kiểm tra trước khi bật

**BLOCKED trước deploy.** Owner cho phép nối candidate giới hạn trang test `1198992073286645`. Candidate tại PR #392, base `650bec5c4b5d67161b4c7f64cb9ee75cfffc6c0d`. Main quan sát `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Worker đang chạy healthy, 0 restart. OCI source commit `b0aeb8907dae4ae2d9051b409ba25fa3f17fd188`, image `lana-chatbot-app:track-b-b0aeb8907`, digest `sha256:1c141af18db98d127dfb30c5c70625bc6f27a85d6c5911473339a5cf47277536`. Pointer `/opt/lana-chatbot/current` có release `20260828-df13-preprod-commerce-abea1fb`. Đây là hai identity từ hai nơi đọc riêng.

- **Verifier** chạy GPT-6.1 Sol High qua Codex ChatGPT login trong các lượt eval đã chốt. Worker Linux x86_64 có route Vertex hiện hành. Codex CLI và phiên đăng nhập verifier chưa có trong worker. Đã chạy `codex-cli 0.159.2` từ package Linux x64 chính thức trong container tạm bằng đúng image worker. Kết quả `--version` đúng và login status thiếu. Container tạm dùng filesystem chỉ đọc với `/tmp` riêng, không mount secrets hay nguồn live.
- **Ingress và delivery** chưa nối candidate. Live worker cần chọn duy nhất một luồng theo đúng trang và quyền hiện tại. Delivery cũng cần kiểm lại ảnh và bằng chứng handoff của response group candidate trước tin đầu. Bộ smoke dùng cả hai gate này trong dispatcher test. Entry point delivery hiện hành chưa gắn chúng. Nối riêng worker sẽ để trống phần kiểm gửi này.
- **Inbox lease** hiện 90 giây. Candidate cho tối đa ba generation owner và một verifier mỗi lượt. Phải đặt thời hạn toàn lượt theo lease hoặc có cơ chế gia hạn được kiểm, bảo toàn quyền batch khi kết thúc giữa chừng. Tránh chạy lại qua C3 khi trạng thái ghi chưa rõ.
- **Source deploy** PR #392 hiện là draft, base là nhánh Phase B. Bản candidate và phần nối phải có source GitHub `main` đã kiểm trước khi triển khai theo quy trình PREPROD.

Đã thêm khả năng chỉ định đường dẫn tuyệt đối `C3_CODEX_BINARY` cho transport hiện có. Version và ChatGPT login vẫn cần được preflight, model/effort và wire giữ nguyên. Windows mặc định vẫn dùng đường dẫn hiện hành. Chạy 26 test Codex inference và diagnostics, gồm một kết nối CLI đã đăng nhập tới relay với upstream stub local. Không có provider generation mới.

Phần tiếp theo cần phối hợp worker và delivery cùng phạm vi test. Gắn tuyến vào ingress chỉ cho trang đã duyệt và giữ C3 cho các lượt ngoài scope. Bảo toàn quyền xử lý, tag và snapshot kiểm gửi của từng group. Preflight verifier bằng login được cấp trên Linux, rồi test ba luồng đã chốt trong chế độ gửi ngoài tắt. Sau đó mới có thể đề nghị kích hoạt release thử. Đọc lại cả identity worker và delivery để đặt điểm rollback tương ứng trước khi đổi.

[Runtime worker](../../../../apps/worker/src/realtime-server.ts) · [Runtime delivery](../../../../apps/worker/src/delivery-server.ts) · [Quy trình PREPROD và rollback](../../../current/architecture-program/contracts/RELEASE_INTEGRITY.md).

Không thay live routing, release, trạng thái trang hay gửi tin. Chưa nối production entrypoint trong lượt này.
