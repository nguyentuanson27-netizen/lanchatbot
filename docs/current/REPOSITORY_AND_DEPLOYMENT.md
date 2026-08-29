# Repository and deployment policy

## Vai trò

- GitHub private repository là nguồn mã chuẩn.
- Codex Windows làm việc trên checkout tạm, tạo branch và push.
- Exact PR head phải có verification evidence trước merge. GitHub-hosted CI hoặc GitHub Actions self-hosted CI đều là remote backend hợp lệ; local fallback chỉ dùng khi remote CI không start hoặc chạy zero repository steps vì provider/billing/quota outage theo `OPERATING_MODE.md`.
- VPS chỉ pull/build hoặc nhận artifact từ exact merged commit đã được chọn; deploy key VPS chỉ có quyền đọc repository.
- Process profile hiện tại là `SOLO_PREPROD_MINIMAL` trong `ENGINEERING_PREPROD` và tiếp tục có hiệu lực cho đến khi owner explicit thay đổi process profile hoặc operating mode.

## Nhánh và tag

- `main`: release-ready, không force-push.
- Feature branch: `feat/*`, `fix/*`, `ops/*`, `docs/*`.
- Normal solo PREPROD deploy không bắt buộc annotated tag hoặc full release manifest; exact merged commit là source identity tối thiểu, rollback identity theo bước 2 bên dưới.
- Tag/manifest trở thành bắt buộc khi một concrete risk boundary yêu cầu, khi owner explicit chọn Release Train, hoặc khi process/hardening profile khác quy định.

## Triển khai SOLO PREPROD mặc định

1. Chọn exact merged commit và các service bị tác động; không `git pull` hoặc sửa source trong `current`.
2. Trước activation, ghi một release-local machine-readable record tối thiểu chứa selected source commit, new release/build identity và exact previous release/build/commit **cho từng affected service**; nếu authority/config boundary thay đổi, cùng record đó phải chứa exact previous authority/config identity cần cho rollback. Reuse `.release-source.json` nếu đủ field; nếu không dùng `.rollback-targets.json`. Không tạo full manifest thứ hai chỉ để thỏa ceremony.
3. Nếu có migration rủi ro: backup trước mutation; migration vẫn cần authorization rõ ràng nếu chưa nằm trong scope deploy được yêu cầu.
4. Build/fetch release mới từ exact commit; trước activation chạy candidate readiness/health checks có thể thực hiện mà không cần live traffic.
5. Activate/recreate đúng service cần đổi; không recreate service ngoài scope.
6. Sau activation, kiểm tra live health/restart count, Inbox/Outbox và các smoke/readback/routing/allowlist liên quan tới changed boundary. Check chỉ có nghĩa sau activation không bị ép chạy trước switch.
7. Fail hoặc unknown thì dừng mutation tiếp theo và rollback affected service(s) về đúng previous identity.

Một explicit owner instruction để deploy candidate/commit cụ thể lên `PREPROD_TEST_PAGE` là authorization cho scoped deploy đó; không cần approval record hoặc Release Train ceremony thứ hai. Authority-mode switch, routing/page-allowlist change, destructive data action hoặc mutation ngoài scope deploy vẫn cần authorization riêng.

## Release Train / hardening khi được chọn

Khi owner explicit chọn Release Train hoặc một risk/hardening boundary yêu cầu, dùng stronger protocol tương ứng trong `docs/current/architecture-program/OPERATING_MODE.md` và `docs/current/architecture-program/contracts/RELEASE_INTEGRITY.md`, bao gồm tag/manifest/provenance/full verification khi contract đó yêu cầu.

## Rollback

Rollback theo **từng affected service** về exact previous release/build/commit đã ghi trước deploy; authority/config change rollback về exact previous authority/config identity đã ghi trong cùng release-local record. Không xóa Inbox, Outbox, Redis hoặc PostgreSQL hàng loạt. Migration schema không tự động rollback cùng application release nếu migration contract không cho phép.

## Secret

- Production secret nằm ngoài repository tại thư mục secret của VPS.
- GitHub Actions chỉ giữ credential tối thiểu nếu sau này bật CD.
- Không dùng deploy key read-only để push.
- Không đưa private deploy key ra khỏi VPS.

## Source-of-truth

Mỗi miền dữ liệu chỉ có một writer được ghi trong production baseline. Thay đổi ownership là một authority-transition change có contract/cutover/rollback riêng, không phải thao tác bật thêm workflow và không được suy ra chỉ từ deploy authorization.
