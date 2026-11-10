# J2 recovery và đối chứng J1 — implementation 08/11/2026

Đã triển khai phần sửa code và harness theo [Revision 2 đã approve](../../c3-phase-c-j2-recovery-j1-controlled-plan-20261108.md). **Chưa chạy provider, chưa có model acceptance hoặc Phase C GO.** Bản plan được hash giữ nguyên; trạng thái thực hiện ghi ở đây và trong tasks.

Base triển khai: `01d73f694642f25f173129a7f1812814f160bae7`. Savepoint J2: `a0b7c6af`; savepoint J1: `82971134`, bổ sung actual-wire text/image bound: `7aa253bb`. Đây không phải các run-source SHA cho một provider run mới.

## J2: thay đổi và bằng chứng

Lỗi cũ: writer thêm tất cả field được đề xuất vào pending trước validation. HEIGHT lấy lại từ tin cũ bị reject nhưng vẫn còn pending; bốn số đo mới đã được ghi đúng mà bước tính size tiếp theo vẫn bị khóa.

- Giữ ledger theo request/profile, dùng chung cho standalone apply, inline recommend và batch identical-patch. Đổi target không né được pending.
- Chỉ tách rejected reuse khi có complete current-source binding do ingress cấp, provenance cũ không thuộc current batch, giá trị/domain hợp lệ và numeric-copy check khớp. Quote cũ vẫn bị reject; không ghi lại HEIGHT, cấp provenance giả hoặc tìm nghĩa bằng parser mới. Không đủ proof thì vẫn khóa.
- Giữ correction hiện tại sai value/unit/domain và field không xác định. Patch thiếu field bị reject trước CAS; preference, CLEAR hoặc no-op không mở khóa correction SET đang pending. Correction có bằng chứng current xung đột giữ khóa.
- Chỉ resolve sau validated complete patch và exact commit/readback, trước dependent fit. CAS conflict và unknown commit giữ blocker riêng. Claim/receipt cũ không được dùng cho profile mới.

RED đã quan sát trước sửa: **14 failed / 20 passed**. Một test cũ được đổi contract từ partial commit sang reject-before-CAS theo plan; các recovery tests mới cùng native failure mode cũng RED. Sau đó quan sát riêng CLEAR-bypass RED, thêm operation guard và GREEN. Bản cuối của bốn focused files: **311 PASS**. Các regression protected-claim/verifier-boundary: **75 PASS**. [TDD attribution](j2-tdd.json).

Real PostgreSQL, đúng một check `C j2 pending recovery`: **1/1 PASS**, disposable DB đã drop, generation0. Qua actual persisted ingress: patch5ops bị reject → complete4ops commit/readback → claim COMPONENT/TOP mới và numerical-update receipt → accepted Outbox → delivery restart/drain chỉ gửi một lần; không cart mutation. HEIGHT/provenance cũ giữ nguyên. [PG evidence](j2-pg-acceptance.json).

PG chạy trên working edits và ghi đúng `sourceDirty=true`; không gọi đây là exact-clean-source/provider acceptance. Các fixture là dữ liệu tổng hợp; verifier stub chỉ chứng minh deterministic seam.

## J1: giữ giả thuyết, thêm cách kiểm

Replay offline dùng frozen world và captured j1T3 before-state của run06b3901b. Đường add M/null + L/null + quote-cart bị từ chối đúng scope, CAS0. Đường quote-product quantity2 đọc được **978.100đ** từ code, CAS0/receipt mới0/provider0. Clock lịch sử chỉ dùng cho replay, không dùng gửi/provider. Đây là capacity check với reconstructed empty business state, không phải full historical DB hoặc dự đoán hành vi owner. [Evidence](j1-code-replay.json).

Harness mới chỉ nằm trong eval:

- A dùng current native body; B thêm một text part chứa metadata contract của tối đa ba operation, tối đa1024 UTF-8 bytes. Xóa part này khôi phục nguyên serialization A. Lấy required args từ schema sau projection; không thêm shop facts, lời khuyên chọn tool, giá, scoring labels hoặc rewrite signed content.
- Kiểm lại raw/presented/full-image bounds, firewall và hash. View chỉ dùng `UNKNOWN` khi không có proof readiness; không suy cart-null thành quote-cart luôn bất khả dụng.
- Đăng ký đúng10 primary slots, các cặp A/B liền nhau theo seed; control cart/ACK có predicates cố định. Có valid behavioral miss của A mới mở conditional native; technical-only miss là INCONCLUSIVE. Quote kèm read-only siblings đúng budget vẫn được xét direct. Prose đi kèm cần đánh giá whole-output offline, không dùng keyword classifier.
- Một generation tối đa mỗi slot, không retry/refill; errors giữ trong denominator. Atomic primary-dispatch claim chặn chạy lại registration tại cùng nơi lưu. Unknown accounting/completion phải dừng.
- Conditional native wrapper dùng actual persisted ingress mặc định, hai independently seeded stores với canonical business/history parity; caps3owner/1verifier mỗi arm. Unit tests inject runner để kiểm bounds/accounting; **chưa claim conditional native PG/provider acceptance**.

Focused harness + existing captured-sender tests: **23/23 PASS**; request captures trong tests dùng local transport stubs, không upstream generation. Full eval result và file hashes được ghi trong [verification.json](verification.json).

CLI đã có `prepare`, `preflight`, `primary`, `score` trong `j1-operation-control.mjs`; không tự chạy `primary`. Prepare cần native captures hiện hành, cart control được tạo/readback bởi isolated executor và receipt thật, artifact hashes, exact model/project, seeded pair order, phase deadlines và source lifetime đủ headroom. Không chuyển captured world cũ thành nguồn fresh bằng sửa timestamp.

Ở lần execute sau còn phải tạo/freeze input population thực, bind actual isolated stores/history cho conditional native wrapper, seal clean HEAD bên ngoài source và chạy actual-time preflight. Ba lượt j2 acceptance dùng existing native journey harness, tối đa12 generation; J1 primary10 + conditional8. Tổng trần vẫn **30 generation**, chưa phải quota đã dùng trong bước này. Nếu dữ liệu/credential/lifetime không đáp ứng thì BLOCKED/NOT_RUN; không thay model hoặc tự thêm sample.

## Self-review và phạm vi giữ nguyên

Đã kiểm lại source binding, mixed valid/invalid correction, partial-before-CAS, CLEAR/preference/no-op, cross-wrapper/target/batch, retained COMPONENT, unknown commit, exact-wire diff, label firewall, bounds, attempted/error/NOT_RUN accounting và behavioral gate. Final focused tests gồm cả những sửa phát hiện trong self-review.

Không sửa owner/verifier prompts, chart, policy, dữ liệu shop, tool visibility/caps hoặc production entrypoints. Không thêm model role/parser/router/framework; không tăng retry hoặc mở full55. Những lỗi j4/s15/s04/p04 và qualification lịch sử vẫn chưa được đóng bởi bản sửa này.

Không gọi reviewer độc lập theo từng test/ca. Plan quy định một review tổng hợp sau registered model runs; vòng đó chưa diễn ra. Self-review ở đây không thay approval implementation hoặc model acceptance.
