# C3 candidate trên PREPROD — kiểm tra trước khi bật

**Bản candidate vẫn BLOCKED trước deploy.** Owner chọn Gemini 3.5 Flash Lite thay GPT‑6.1 Sol High cho verifier. Commit kiểm thử `8a42c32478700951265b64396bb13242686485f1` dùng Vertex AI global, effort High, JSON schema hiện hành, tối đa một generation mỗi lần kiểm và không retry. Owner tiếp tục dùng Gemini 3.5 Flash Lite High. Prompt owner, prompt verifier, schema và final gate giữ nguyên. Offline judge vẫn dùng danh tính Sol đã duyệt.

### Smoke với verifier Gemini

Chạy đủ ba ca trong PostgreSQL cô lập với catalog test và transport ghi nhận tại chỗ. Gọi Vertex thật và tắt gửi ngoài.

| Ca | Kết quả | Điều đã quan sát |
| --- | --- | --- |
| Báo giá khách từ ads | PASS | Đúng 499.000đ, kèm ảnh đúng mẫu trong cùng response group. |
| Chọn size, xác nhận mua và checkout | FAIL | Engine chọn M, một món được ghi vào giỏ. Verifier trả verdict FAIL ở lượt xác nhận chọn áo. Runtime bàn giao im lặng, các tin tiếp theo thuộc người xử lý nên checkout dừng ở `CART_OPEN`. Webhook trùng không ghi giỏ hay phát tin lần hai. |
| Thiếu bảng size | PASS | Bàn giao im lặng vì `SIZE_RULE_UNAVAILABLE`. |

Có 10 generation, gồm 7 owner và 3 verifier. Cả 10 trả đúng model version `gemini-3.5-flash-lite`, không có lỗi provider hay timeout. Ba thời gian verifier quan sát được là 4,670 s, 3,179 s và 8,853 s theo thứ tự dispatch. Meta và Pancake live đều có 0 request. Database test đã được xóa.

Ledger chỉ lưu lý do gốc `FAIL` ở lượt chọn áo. Smoke không lưu draft bị chặn hoặc nội dung violation cho lượt này, nên chưa kết luận đó là false FAIL. Kết quả này kiểm đường Vertex và ba luồng smoke. Việc đổi model cần đánh giá riêng lỗi verifier từng có với size, ảnh và xác nhận thao tác có receipt.

Lệnh smoke thực chạy từ repo trả exit 1 với `PREPROD_SMOKE_NOT_ALL_PASS`.

```powershell
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-preprod-gemini-verifier-smoke-8a42c324 COD --candidate-handoff --check-prefix 'PREPROD smoke '
```

Có 73 test focused đạt, gồm adapter Gemini, protocol, native provider/wire và các diagnostic dùng Sol đã khóa. Vitest đạt thêm 90 test final gate và protected-claim boundary. Lần gọi hai file Vitest bằng `node --test` dừng ở khởi tạo runner và đã được chạy lại bằng Vitest. `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker lint` và `pnpm check:dataset-boundary` đều đạt.

### Worker gửi tin đã được nối trong source

Owner đã yêu cầu kích hoạt candidate trên trang test. Source `0eb119aebb6cf0cf6ea0256a0121041732647ae0` nối guard ảnh và bàn giao vào entrypoint của delivery worker. Overlay riêng của PREPROD cho phép cấu hình guard theo đúng trang `1198992073286645`. Guard đọc lại quyền, revision, generation, policy, ảnh hiện hành và bản ghi bàn giao tùy theo binding của nhóm tin. Sau khi Pancake cho phép gửi, guard đọc lại quyền và policy trước sequence 0. Nhóm tin C3 đang chạy tiếp tục dùng gate Pancake.

Hai kiểm tra PostgreSQL cô lập cùng code delivery mới đều đạt. Đọc lại sau restart gửi đúng cặp văn bản và ảnh vào transport ghi nhận. Thu hồi ảnh sau khi ghi Outbox khiến cả nhóm vào `MANUAL_REVIEW` trước khi ghi nhận tin đầu tiên. Database test đã được xóa. Không có generation trong kiểm tra này. Hai kiểm tra quyền và policy đổi trong lúc đợi Pancake tái hiện lỗi trước bản sửa rồi đạt sau sửa.

```powershell
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-preprod-delivery-integration-0eb119ae COD --candidate-handoff --check-prefix 'PREPROD delivery '
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-preprod-delivery.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/meta-outbox-dispatcher.test.ts
pnpm --filter @lana/business-tools exec vitest run src/qdrant.test.ts src/qdrant-image-channel.test.ts
pnpm --filter @lana/business-tools exec tsc --project tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm check:dataset-boundary
docker compose -f deploy/docker-compose.vps.yml -f deploy/docker-compose.c3-commerce-preprod.yml config --quiet --no-interpolate
```

67 test worker và 8 test Qdrant đạt. Worker build, lint, business-tools typecheck, dataset guard và kiểm cấu trúc Compose đều đạt. Live chưa đổi. Worker nhận tin vẫn thiếu bước chọn candidate trước khi ghi state và cách giữ quyền xử lý batch trong giới hạn lease. PR #392 còn ở nhánh draft, chưa có release từ main.

### Kiểm tra hạ tầng trước khi đổi verifier

Owner cho phép nối candidate giới hạn trang test `1198992073286645`. Candidate tại PR #392, base `650bec5c4b5d67161b4c7f64cb9ee75cfffc6c0d`. Main quan sát `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Worker đang chạy healthy, 0 restart. OCI source commit `b0aeb8907dae4ae2d9051b409ba25fa3f17fd188`, image `lana-chatbot-app:track-b-b0aeb8907`, digest `sha256:1c141af18db98d127dfb30c5c70625bc6f27a85d6c5911473339a5cf47277536`. Pointer `/opt/lana-chatbot/current` có release `20260828-df13-preprod-commerce-abea1fb`. Đây là hai identity từ hai nơi đọc riêng.

- **Verifier lúc kiểm tra hạ tầng** dùng GPT-6.1 Sol High qua Codex ChatGPT login. Worker Linux x86_64 có route Vertex hiện hành. Codex CLI và phiên đăng nhập verifier chưa có trong worker. Đã chạy `codex-cli 0.159.2` từ package Linux x64 chính thức trong container tạm bằng đúng image worker. Kết quả `--version` đúng và login status thiếu. Container tạm dùng filesystem chỉ đọc với `/tmp` riêng, không mount secrets hay nguồn live.
- **Ingress và delivery lúc đọc runtime** chưa nối candidate. Live worker cần chọn duy nhất một luồng theo đúng trang và quyền hiện tại. Delivery cũng cần kiểm lại ảnh và bằng chứng handoff của response group candidate trước tin đầu. Bộ smoke dùng cả hai gate này trong dispatcher test. Entry point delivery hiện hành chưa gắn chúng. Nối riêng worker sẽ để trống phần kiểm gửi này.
- **Inbox lease** hiện 90 giây. Candidate cho tối đa ba generation owner và một verifier mỗi lượt. Phải đặt thời hạn toàn lượt theo lease hoặc có cơ chế gia hạn được kiểm, bảo toàn quyền batch khi kết thúc giữa chừng. Tránh chạy lại qua C3 khi trạng thái ghi chưa rõ.
- **Source deploy** PR #392 hiện là draft, base là nhánh Phase B. Bản candidate và phần nối phải có source GitHub `main` đã kiểm trước khi triển khai theo quy trình PREPROD.

Đã thêm khả năng chỉ định đường dẫn tuyệt đối `C3_CODEX_BINARY` cho transport hiện có. Version và ChatGPT login vẫn cần được preflight, model/effort và wire giữ nguyên. Windows mặc định vẫn dùng đường dẫn hiện hành. Chạy 26 test Codex inference và diagnostics, gồm một kết nối CLI đã đăng nhập tới relay với upstream stub local. Không có provider generation mới.

Phần còn lại cần nối tuyến ingress cho đúng trang đã duyệt. Các lượt ngoài phạm vi đi qua C3. Bảo toàn quyền xử lý, tag và snapshot kiểm gửi của từng group. Route Vertex đã xác nhận trong smoke cô lập. Luồng checkout còn lỗi bàn giao ở lượt chọn áo. Trước khi bật trang test cần kiểm luồng checkout với candidate đã nối ingress và delivery. Đọc lại cả identity worker và delivery để đặt điểm rollback tương ứng trước khi đổi.

[Runtime worker](../../../../apps/worker/src/realtime-server.ts) · [Runtime delivery](../../../../apps/worker/src/delivery-server.ts) · [Quy trình PREPROD và rollback](../../../current/architecture-program/contracts/RELEASE_INTEGRITY.md).

Live routing và release vẫn dùng C3. Candidate đã có guard trong source của worker gửi tin và bằng chứng từ harness cô lập.
