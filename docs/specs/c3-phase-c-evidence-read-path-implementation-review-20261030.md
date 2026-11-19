# Review độc lập — evidence/read-path implementation

Kế hoạch revision 2: [approved plan](c3-phase-c-evidence-read-path-fix-plan-20261030.md). Implementation: [report](c3-phase-c-evidence-read-path-implementation-20261030.md). Cùng reviewer `/root/full22_run_review`, actual original agent `gpt-6.1-sol`, effort `high`, tiếp tục qua followup; không thêm reviewer vào runtime.

## Review 1 — REQUEST_CHANGES

Exact executable source `83e9e73bd85095b17fd47ed564596e6cd9cf848c`.

| ID | Finding | Cách sửa / bằng chứng |
|---|---|---|
| R1 | Query M rồi L thay product evidence, mất proof trước; DETAILS_ONLY cũng có thể làm mất evidence | Giữ union theo normalized query; metadata read không xóa full read; fail atomically nếu byte overflow hoặc source conflict; readback replay giữ cả hai |
| R2 | Revalidation chỉ so sourceHash/expiry cũ, không ràng buộc replay selectors/quantity/status/options/policy | Validate toàn envelope và normalized meaning; giữ minimum TTL, không heartbeat renewal; replay malformed/different selector/quantity/status hoặc policy shortened đều block; same-tuple base/effect contradiction không last-writer-wins |
| R3 | Trace có thể ghi OK cho invalid args, bỏ known reason; media validation flag còn từ asset trước | Closed safe reason/tool mapping, terminal/result reason, per-asset fetch/validate/reset và paired selector; unknown exception không lộ raw text |

Savepoint `60b6f64eea2b34a56aab0ce4047f13bf529ad1c1`; media negative control `d08817aa`. Reviewer xác nhận P4 chart audit giữ OUT_OF_RANGE đúng nguồn, không được ép PASS hoặc sửa chart để fit case.

## Review 2 — REQUEST_CHANGES

Exact source `60b6f64eea2b34a56aab0ce4047f13bf529ad1c1`.

| ID | Finding | Cách sửa / bằng chứng |
|---|---|---|
| R4 | Cap 3 proofs vô tình chặn COMPARE3 → SINGLE size/color dù còn work | Shared cap18 từ existing6calls×3offers; product8192/wire65536/work6 vẫn giữ; neutral compare→refine giữ4proofs/readback; actual byte overflow vẫn atomic reject |
| R5 | MEDIA_ARGUMENTS_OR_REF/STATE_ARGUMENTS và known media validation failures chưa được trace đúng; validation error khác selector STARTED | Known argument failures REJECTED, rejected chưa phân loại UNKNOWN; known closed validation code giữ nguyên; error cùng assetRef; invalid-media-arg/per-asset second-fetch controls |

Savepoint `0524df64a9ac9c344ce1da7fe4adf42de053eb5a`. Review kiểm diff --check; initial verdict **CONDITIONAL APPROVE**, chờ current build/wire/PG. Root observed RED→GREEN cho regressions, focused136PASS; không đổi budget hoặc nới final gate.

## Review 3 — current source / actual checks

Reviewer đọc final root logs: worker510, shared21, full Node761PASS/2SKIP; build/typecheck/lint hoàn tất. Reviewer tự chạy actual native-wire admission3/3 và tuple/preparation/diagnostics18/18, exit0; hai external logs/hash trong [verification](c3-phase-c-evidence-read-path-verification-20261030.json). Những lần này lặp tập con, không cộng thành số test mới.

Reviewer kiểm targeted actualPG3PASS, source clean `0524df64`, sendEnabledfalse/providerGenerations0/DBdropped. FullPG tại source này thất bại ca thứ34, 33PASS/1FAIL, DB đã drop. **Conditional approval đã bị rút lại**; không bỏ ca lỗi hoặc gộp những ca chưa chạy thành PASS.

## Review 4 — query-schema regression từ actual PostgreSQL

Finding R6: `effects.selection` ghi `selectionMaxAgeSeconds` trong exact source query, nhưng delivery source-reader whitelist chưa nhận field đó. Reviewer chạy independent no-provider probe: query cũ được đọc, thêm maxAge1200 bị HANDOFF_SOURCE_QUERY trước selection port. Vì vậy đây là code contract mismatch, không phải TTLelapsed/fixture.

Fix exact `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`: optional maxAge integer60..86400 như read config, giữ nguyên query khi replay; unknown keys vẫn reject. Legacy omitted field, valid bounds và invalid values có12tests. Root meaningful RED3/9PASS → GREEN236/4files. Initial two RED logs do test-fixture setup lỗi được lưu riêng, không nhận là product regression evidence. Reviewer đọc exact diff và duyệt **source fix**, global approval vẫn pending retests.

Current canonical build/typecheck/lint PASS, full Node761PASS/2SKIP tại source mới. Affected cart-receipt/cart-source-changed actualPG2PASS; fullPG mới 73PASS/7invariants, DBdropped/gen0/sendfalse/sourceclean. Root không thay executable/config trong mỗi driver run. Chỉ sau driver hoàn tất mới bổ sung report/tasks; executable bytes giữ nguyên từ `97c6ce86`.

**APPROVE IMPLEMENTATION** tại exact clean source `97c6ce86d6e61f5eb0648a150c5fd464a9ab3e90`; không còn blocking findings. Reviewer độc lập xác minh `assertCurrentCandidate`/`assertApprovedDecisions`, candidate identity, fullPG73unique/73PASS, `validateRealAdapterReport`7invariants và canonical report hash `842ffa597a5305129e07bbe28c6bd5183e00588a980a642ada89ec2a029cdb80`. Đã kiểm finalbuild04/typecheck03/lint02 và761PASS/2SKIP/0FAIL; rehash51artifact references, tất cả khớp. External machine JSON được audit nguyên byte SHA256 `e813dd4e6d66597dd13e7a276c3d47d3af52644f1834607346c24ae9a7a6d7b0` (CRLF). Bản copy trong repo chuẩn hóa newline LF có SHA256 `ab8e2118ef091d5e24eb54f8bb506353f12e325a5864fe2605d28eea68a089af`; parsed JSON và51artifact references giữ nguyên. Failed old PG được giữ và khai báo rõ. Reviewer không sửa file, build hoặc gọi provider trong final audit. Sau verdict chỉ bổ sung documentation/tasks; executable/config giữ nguyên từ reviewed source.

Approval chỉ implementation và bằng chứng deterministic/current persistence, không suy semantic safety/quality/stability hay giảm handoff trên model. Original qualification BLOCKED, C3NOT_RUN/B_NOT_GO và incomplete blind grades giữ nguyên. Không provider/deploy/live send trong task.
