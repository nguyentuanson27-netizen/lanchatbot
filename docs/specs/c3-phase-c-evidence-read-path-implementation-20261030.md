# Phase C — implementation căn cứ và đường đọc dữ liệu

Ngày 2026-10-30. Implementation base `8e955b0b8756564a709e9f7237f343164db47fd1`; approved plan revision 2 `f9b6e0843382e1c2be192137c5148a9d3f8e0c96`. Executable source được kiểm tra cuối: `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`. Bản này triển khai [kế hoạch đã duyệt](c3-phase-c-evidence-read-path-fix-plan-20261030.md); không phải một vòng model hoặc qualification mới.

## Kết quả implementation

Owner và verifier nhận cùng bằng chứng lựa chọn biến thể đã được code kiểm tra. Khi khách so sánh rồi chọn size/màu, hệ thống giữ các truy vấn đã xác minh trong lượt, không thay kết quả cũ bằng truy vấn mới. Readback kiểm lại query, quantity, options, status, source, policy và expiry; heartbeat không gia hạn căn cứ cũ. Nguồn đổi hoặc bằng chứng mâu thuẫn vẫn chặn gửi.

Candidate preparation có thể đưa giá/tồn hiện hành từ đúng source observation đã có vào context trước owner. Chỉ publish khi đúng product, ≤3 offers và vượt qua kiểm tra toàn bộ các bounds cùng serializer thực của owner/verifier. Preparation tốn 1 trong tổng 6 work units; không thêm lượt tool/model. Nếu optional giá/tồn không lấy được hoặc không đủ chỗ, vẫn giữ catalog độc lập và coverage đúng nghĩa; không biến NOT_READ thành “không có hàng”. Dữ liệu đã publish không được rút sau verifier PASS để né final gate.

Trace đánh dấu argument, catalog/POS/policy/media, projection/byte bound, readback và terminal. Trace chỉ lưu closed reason codes, hashes và byte counts, không lưu raw args, customer text, URL/credential hoặc exception text. Known validation failure được ghi đúng; lỗi chưa phân loại vẫn UNKNOWN, không suy đoán nguyên nhân ba dependency failures ở run cũ.

## Thay đổi chính

| Phần | Implementation |
|---|---|
| P0 | Optional diagnostics sidecar xuyên tool/source/media/turn và isolated harness; observer lỗi không đổi kết quả nghiệp vụ |
| P1 | `CANDIDATE_SELECTION_V1` từ resolver hiện có, selectors/source/quantity/TTL binding và hash; allowlist runtime product, owner projection, verifier và final gate cùng thấy proof |
| P2 | Loại exact duplicate giữa tool result và snapshot bằng cùng projection; không bỏ điều kiện, selectors mới hoặc tăng byte/tool bounds |
| P3 | Candidate-only bounded current-offer preparation, one-observation, atomic publication, actual Compact V2 owner/verifier wire admission; legacy default không đổi |
| P4 | Offline audit correction với đúng chart/profile; không tìm thấy mapping/correction bug đủ căn cứ để sửa nguồn hoặc ép chọn size |

`selectionOptions` là lựa chọn theo query, không phải kiểm kê đầy đủ và không cấp quyền mutation. Sentinel NO_COLOR vẫn không phải tên màu thật. Tối đa 18 retained observations xuất phát từ bound 6 normal calls × 3 offers; giới hạn product 8192 bytes và owner/verifier text wire 65536 bytes vẫn chặn trước nếu vượt. Không chọn first3 để che overflow; thất bại admission không publish một phần.

## Size audit và hạn chế dữ liệu

Replay j2 từ original full22 world/raw, audit build `83e9e73bd85095b17fd47ed564596e6cd9cf848c`: 162cm/56kg → M. Sau correction 51kg + 88/70/94 → OUT_OF_RANGE, missingInputs rỗng. Profile revision/measurements và shared-name mapping SV2447↔SQ2447 đúng rule owner đã duyệt.

Chart `image_registry:42e42d5a-c407-5927-af69-0fe8ab21a8e4:SQ2447`, version `size-chart-v1.0.0-1395f0b5e842`, source hash `6af482330db999b995608d26965fdb8eea8107f2197c3b0f337f7a7a938555f7` dùng bust/hips point bands, `REQUIRE_HUMAN_REVIEW`. 88/94 không nằm trong các band đó. Giữ OUT_OF_RANGE/handoff; không tự đổi point thành khoảng hoặc giả định garment/body tolerance. Audit artifact hash và raw/world binding có trong verification JSON. Đây là limitation nguồn cần shop làm rõ, không phải ca đã sửa thành công.

## Review và savepoints

1. `83e9e73b`: triển khai P0–P3 và regression controls.
2. Independent review REQUEST_CHANGES: mất proof cũ, replay mới chỉ so sourceHash, trace chưa phân biệt đúng lỗi đã biết.
3. `60b6f64e`: giữ proofs theo normalized query; kiểm toàn bộ meaning/expiry/policy; source conflict fail-closed; bổ sung realPG controls và actual serializer tests.
4. `d08817aa`: per-asset fetch/validation negative control.
5. Independent review REQUEST_CHANGES: compare3→refine bị arbitrary proof cap3; một số argument/media errors trace sai.
6. `0524df64`: đóng hai finding trên, không tăng byte/work budget. Sau sửa, focused136PASS; final source review không còn blocking finding, chờ verification đầy đủ trước approval cuối.
7. Full actualPG tại `0524df64` dừng ở ca thứ34: 33PASS/1FAIL, DB đã drop. Root và reviewer xác nhận query đã thêm `selectionMaxAgeSeconds` nhưng source-reader delivery vẫn reject unknown field; lỗi xảy ra trước selection port, không phải hết TTL hay fixture.
8. `97c6ce86`: cập nhật đúng closed query contract, cho optional integer60..86400 giống read config, giữ nguyên field khi replay; unknown key/invalid value vẫn block. Meaningful RED3/9PASS → GREEN12new cùng224existing trong focused236PASS. Reviewer duyệt source fix, sau đó chạy current build và PG lại; logs lần thất bại giữ nguyên.

Đã quan sát RED trước GREEN ở diagnostics, tuple parity, preparation, replay và review regressions. Các lần test authoring lỗi (fixture/import, expression đọc snapshot trước async readback) và build test readonly `.push` lỗi được giữ trong log; không tính những lỗi đó thành production root cause. Build `.push` đã sửa rồi canonical build hiện hành PASS. [Review record](c3-phase-c-evidence-read-path-implementation-review-20261030.md).

## Verification thực chạy

[Machine-readable commands/hashes](c3-phase-c-evidence-read-path-verification-20261030.json) ghi exact command, source và artifacts. Các số sau không cộng lại các lần chạy lặp:

- Worker tại `0524df64`: 486 PASS/13 files; additional preparation/source/public-history: 24 PASS/3 files. Tổng 510 distinct tests. Lệnh đầu có 2 filename patterns không tồn tại; đã chạy đúng preparation/read-only-sources trong additional suite, không claim patterns đó là suites đã chạy. Tại `97c6ce86`, handoff-source/delivery/effects/ingress236PASS, gồm37tests bổ sung vào tổng coverage và199tests chạy lại; không cộng236 vào510. Những worker files khác giữ nguyên byte từ lần PASS trước.
- Business-tools protected claims/reply assembler: 21 PASS/2 files. Shared package production source không đổi.
- Canonical worker build, typecheck và lint: exit 0. Build/pretypecheck dựng lại shared dependencies trước; Node evals và PostgreSQL chỉ chạy sau successful current worker build.
- Qualification Node: 80 PASS, nằm trong full worker evals. Full evals: 761 PASS, 2 SKIP, 0 FAIL; hai SKIP là opt-in installed Codex/local-stub checks vì không bật `C3_TEST_CODEX_TRANSPORT`.
- Reviewer tự chạy actual-wire admission 3 PASS và source tuple/preparation/diagnostic 18 PASS; đây là repeated verification, không thêm vào distinct totals.
- Actual PostgreSQL targeted tại `0524df64`: 3/3 PASS. Sau query fix tại `97c6ce86`: affected cart handoff2/2PASS, full driver 73/73PASS và7/7named invariantsPASS. Mỗi lần source clean/DB test đã drop/providerGenerations0/sendEnabledfalse. Domain input synthetic, persistence/Outbox/capture là actual disposable DB; không gọi provider hoặc gửi live.

Ba PG controls mới kiểm actual Outbox khi preparation work1/remaining5, changed source sau verifier không enqueue, và ambiguous tuple chia sẻ owner/verifier proof nhưng không mutation. Bảy invariants: stale_revision, duplicate_source, crash_after_commit, ambiguous_reconciliation, operation_idempotency, history_outbox_recovery, no_duplicate_effect.

## Phạm vi và trạng thái

Structural delta từ implementation base: 24 executable/test files, +600/−56 lines (chưa tính tài liệu báo cáo). Online semantic roles/layers thêm 0; không đổi prompt, model/provider/API shape, tool round/work caps hoặc production entrypoint. Không thêm parser, regex theo ca, repair loop, source dữ liệu phụ, persisted field hay migration.

**APPROVE IMPLEMENTATION**: cùng reviewer xác nhận exact clean source `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`, không còn blocking finding; độc lập kiểm73PG/7invariants/cleanup và51artifact hashes. Chỉ chốt implementation sau independent review; **Phase C qualification vẫn BLOCKED, C3 comparison NOT_RUN, B_NOT_GO**. Original full22 outcomes/registration/raw/grades bất biến. Chưa có model quality, fallback reduction hoặc stability evidence sau sửa; không dùng unit tests/PG để suy ra chất lượng hội thoại. Blind grading cũ vẫn incomplete do quota. Remote CI chưa verified. Không merge, deploy, live send hoặc publish nguồn shop. Vòng model tương lai cần fresh registration theo executable source hiện hành; không tái dùng run identity cũ.
