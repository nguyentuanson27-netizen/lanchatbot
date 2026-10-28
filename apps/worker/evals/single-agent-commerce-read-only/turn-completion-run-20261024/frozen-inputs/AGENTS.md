# Hướng dẫn cho coding agent

Tài liệu này áp dụng cho toàn bộ repository La.na Chatbot.

## Bắt đầu phiên làm việc

1. Đọc `README.md`.
2. Đọc `docs/current/architecture-program/OPERATING_MODE.md`; operating mode hiện tại là `ENGINEERING_PREPROD` và live page hiện tại là `PREPROD_TEST_PAGE`, không phải public production.
3. Đọc `docs/current/PRODUCTION_BASELINE_20260722.md` như baseline lịch sử; khi cần trạng thái live phải dùng generated runtime evidence mới nhất.
4. Với công việc thuộc chương trình kiến trúc hoặc incident `BF/DF/UR`, đọc `docs/current/architecture-program/README.md` rồi chỉ nạp các file/section được index đó định tuyến; không nạp `archive/` hoặc toàn bộ kế hoạch cũ theo mặc định.
5. Đọc `docs/current/REALTIME_AGENT_UPGRADE_PLAN.md` cho công việc realtime không thuộc `BF/DF/UR`, hoặc khi index kiến trúc dẫn chiếu trực tiếp tới kế hoạch này.
6. Đọc manifest mới nhất trong `deploy/manifests/` khi task thuộc release/deploy hoặc cần đối chiếu runtime.
7. Kiểm tra `git status`, branch hiện tại và thay đổi chưa commit trước khi sửa file.
8. Nếu đang ở VPS, chỉ làm việc trong `/opt/lana-chatbot/repository`.

## Nguồn chuẩn và phạm vi VPS

- GitHub `nguyentuanson27-netizen/lanchatbot` là nguồn mã chuẩn.
- `/opt/lana-chatbot/current` là live runtime của `PREPROD_TEST_PAGE`, không phải working tree hay bằng chứng public-production readiness.
- Không sửa file trực tiếp trong `current` hoặc bất kỳ thư mục `releases/*` nào.
- Deploy key VPS chỉ có quyền đọc. Không tìm cách đổi thành quyền ghi hoặc đẩy commit từ VPS.
- Thay đổi mã nguồn phải được commit/push từ môi trường phát triển được ủy quyền, sau đó VPS mới pull theo commit cụ thể.

## Quy tắc an toàn live runtime

- Không restart, recreate container, deploy, chạy migration, đổi symlink `current`, bật workflow n8n hoặc gửi tin thử nếu người dùng chưa yêu cầu rõ ràng.
- Không thay đổi allowlist page. `PREPROD_TEST_PAGE` hiện tại là `1198992073286645`.
- Không kích hoạt đồng thời workflow n8n P2.2/P2.3 với app-native POS/P2.3 workers.
- Không xóa Redis, PostgreSQL, Qdrant, Inbox/Outbox, log hoặc dữ liệu khách hàng hàng loạt.
- Không in, commit hoặc sao chép secret vào tài liệu/log. Secret live nằm ngoài repository.
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

## Quy trình thay đổi — SOLO PREPROD MINIMAL (current default)

`DF-C` và `Gate F-PREPROD` đã hoàn thành. `SOLO_PREPROD_MINIMAL` là process profile mặc định cho **mọi công việc trong `ENGINEERING_PREPROD` từ thời điểm này trở đi**, không chỉ V5 Track B/Track C. Profile này tiếp tục có hiệu lực cho đến khi owner đưa ra yêu cầu rõ ràng thay đổi process profile hoặc operating mode.

```text
branch -> code + focused test -> PR -> exact-head verification -> merge -> deploy exact commit -> smoke
```

1. Tạo branch từ `main`; không phát triển trực tiếp trên runtime VPS.
2. Giữ PR nhỏ; chạy focused verification cho contract, consumer và risk boundary bị tác động, cùng các guard secret/PII/security/data phù hợp.
3. Exact PR head phải có verification evidence trước merge. Backend ưu tiên là GitHub-hosted CI hoặc GitHub Actions self-hosted CI chạy canonical checks. Chỉ khi remote CI không start hoặc chạy zero repository steps vì billing/quota/provider outage mới dùng `CI_UNAVAILABLE_FALLBACK` trong `OPERATING_MODE.md`. Self-review diff là đủ cho solo PREPROD; independent exact-head reviewer không phải gate mặc định.
4. Merge không mặc định deploy.
5. Khi owner yêu cầu deploy một candidate/commit cụ thể lên `PREPROD_TEST_PAGE`, chính yêu cầu đó là authorization cho deploy đó; không cần Release Train hoặc approval record thứ hai.
6. PREPROD deploy bình thường cần exact merged commit, release/build identity mới và exact previous release/build/commit **cho từng service bị tác động** để rollback đúng service. Trước activation, lưu các identity này trong một release-local machine-readable record tối thiểu theo `RELEASE_INTEGRITY.md`. Annotated tag, full release manifest, runtime-state promotion và per-file attestation không phải gate mặc định nếu không có risk cụ thể yêu cầu.
7. Migration, authority-mode switch, routing/page-allowlist change và destructive data action vẫn cần authorization rõ ràng nếu chưa được nêu trong scope hiện tại. Backup trước migration có rủi ro.
8. Trước activation/switch, chạy các candidate readiness/health check có thể thực hiện mà không cần live traffic. Sau activation, chạy live smoke/readback/controlled test-page verification. Check nào chỉ có nghĩa sau activation thì không bị ép chạy trước. Nếu fail hoặc trạng thái không rõ, dừng mutation tiếp theo và rollback affected service(s) về exact previous identity.
9. Không áp `PRODUCTION_HARDENING` hoặc mô tả public-production readiness nếu owner chưa yêu cầu chuyển mode rõ ràng.
10. Không tự kết thúc `SOLO_PREPROD_MINIMAL` khi Track B, Track C hay một roadmap hiện tại hoàn thành; chỉ owner explicit instruction mới thay đổi profile này.

Chi tiết authoritative nằm trong `docs/current/architecture-program/OPERATING_MODE.md` và `docs/current/architecture-program/contracts/RELEASE_INTEGRITY.md`.

## Khi có mâu thuẫn tài liệu

Ưu tiên theo thứ tự:

1. Yêu cầu mới nhất của người dùng.
2. `AGENTS.md`, `README.md` và `docs/current/architecture-program/OPERATING_MODE.md` trên branch hiện tại.
3. Với `BF/DF/UR`: các file active được định tuyến từ `docs/current/architecture-program/README.md`.
4. Generated runtime-state, source pointer, symlink và manifest release mới nhất khi trạng thái live có liên quan; bằng chứng live mới hơn luôn thắng snapshot tài liệu.
5. `docs/current/PRODUCTION_BASELINE_20260722.md`.
6. Tài liệu lịch sử trong `docs/phase*`, `docs/history/` và `docs/current/architecture-program/archive/`.

`program-state.json` hiện ghi `GATE_F_PREPROD_ACCEPTED_DF_C_COMPLETE`; không mở lại DF-C/Gate F chỉ để áp quy trình tối giản cho công việc hiện tại hoặc tương lai. Các checklist DF13/Gate F cũ là lịch sử/evidence trừ khi một thay đổi mới thực sự chạm lại đúng technical invariant của chúng. Roadmap/Track hiện tại không giới hạn thời hạn của `SOLO_PREPROD_MINIMAL`.

## Runtime-state authorization boundary

- When current live status matters, agents must determine the exact running commit/release and exact rollback target from available generated runtime evidence, the resolved `current` release and source identity. Unknown or mismatched live identity fails closed.
- Repository source change: branch, focused verification, PR, exact-head verification, and merge. Never develop against live runtime.
- PREPROD deploy requires explicit owner instruction. For the current solo profile, that scoped deploy instruction is the deploy authorization; a second Release Train approval record is not required.
- Approved PREPROD deployment may create a new release from the exact selected merged commit and switch `current` as part of that deploy only after applicable pre-activation readiness checks. It must preserve a release-local machine-readable rollback record for each affected service, then run post-activation smoke/readback. Tag/manifest/runtime-state promotion ceremony is not required unless a concrete risk requires it.
- Manual source mutation in `current` or an existing release directory remains prohibited.
- Migration, authority-mode switch, routing/page-allowlist change, destructive data action, or any mutation outside the requested deploy scope still requires explicit authorization.
