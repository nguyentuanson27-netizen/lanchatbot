# Independent review — kế hoạch đóng task bán hàng, 01/11/2026

Scope: plan-only trên base `9c5b8387f517e1e16a8a124379912c749886c6c3`. [Kế hoạch](c3-phase-c-task-completion-fix-plan-20261101.md) dựa trên approved diagnosis, không đổi runtime/prompt/model/corpus/nguồn shop hoặc locked grades. Reviewer độc lập mới `/root/phase_c_task_completion_plan_review`, read-only; cùng reviewer kiểm các revision. Không có provider evaluation, PostgreSQL, source mutation hoặc agent reviewer khác trong vòng này.

## Review 1 — REQUEST_CHANGES

Revision1 SHA256 `db15f668661a6798fdb1f7303249f77dd354b6a26ad54adad82c4f75ff76e68f`.

- **R1 — replacement chưa đủ shared contract chain:** action/payload/authority/receipt/reason, readiness, negotiation reprice, native/persistence và DB replay dùng closed bindings. Không chỉ internal union; phải ràng buộc cả old line và target, định identity/reason/authority và kiểm tamper/replay.
- **R2 — pruning làm mất legal same-batch path:** effects chạy tuần tự; không có giỏ trước generation vẫn có thể add→confirm trong batch. Phải giữ dependency closure/conditional callable và revalidate từng invocation, kiểm state→dependent tools và replacement continuation.
- Reviewer chấp nhận P2a là staged design gate: thiếu trusted quote producer thì DESIGN_BLOCKED/giữ bypass RED, không nhận optional tool/owner intent/prompt là guarantee.

Revision2 sửa R1 tại §2.2–2.3 (full chain/dual binding/replay/tamper controls) và R2 tại §3 (legal transition closure/conditional callable/per-invocation checks). Self-review không gọi đây là capability hoặc quality proof.

## Review 2 — APPROVE PLAN revision 2

Reviewer kiểm revision2 SHA256 `ad6ec3dba445f4a12e231a2f9cae0964012894de2717717ece08697b6d47a44a`: R1/R2 đã được xử lý, không có blocker mới. Theo clarification của reviewer, thêm một câu §3 bắt buộc byte acceptance dùng **final combined implementation** gồm replacement schemas + dependency closure + final prompts/config, không cached source1427-only declarations.

Cùng reviewer đọc/kiểm hash cuối và trả **APPROVE PLAN — revision 2**, exact SHA256 `3fcfb9e42faa96f38af50a375788f1a722332d217ec29a73f280443fac30c9fd`. Không còn blocking finding trong kế hoạch.

Reviewer xác nhận full shared contract/dual old-target authority/receipt/reprice/native/DB replay/atomicity acceptance, legal intra-batch callable closure/per-invocation guard và combined-source budget requirement. P2a vẫn là proof gate: không có trusted quote producer thì phải báo DESIGN_BLOCKED, chưa được nhận đã đóng free-text quote bypass. Đây là điều kiện thiết kế được công khai, không phải capability hoặc guarantee đã có.

## Verification và giới hạn

Đã chạy read-only source/evidence inspection, `git diff --check` (PASS) và local links check hai tài liệu (5links,0broken). Commands build/test/PG trong plan đều là **dự kiến, chưa chạy**. Không model run hoặc provider API change trong task này. APPROVE PLAN không cấp IMPLEMENTATION APPROVE/Phase C GO hoặc chứng minh P0/P2 feasibility. Cần owner yêu cầu build tiếp; không merge/deploy/live send.
