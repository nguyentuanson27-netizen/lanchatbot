# Independent plan review — sales completion repair

Scope: plan review and documentation fixes only. No runtime/prompt implementation, model run, network/provider request or shop-source write. Plan: [sales completion repair](c3-phase-c-sales-completion-fix-plan-20261103.md).

Reviewer: `/root/sales_completion_plan_review`, independent read-only agent. User explicitly requested independent review → fix → same-reviewer re-review until approval. Review is not implementation acceptance or permission to publish sources, run providers, merge or deploy.

## Review 1 — CHANGES REQUESTED

Reviewed plan savepoint `91d86587660a9e1b30abfa90f91dda27744d553e`. Reviewer found two P1 blockers; no other blockers in S1/S2/S4/S5. Planned focused test paths were independently confirmed to exist. No implementation tests were run.

1. **S3 target compatibility/authority incomplete.** Legacy SIZE_RECOMMENDATION strict schema and producer lack target, protected projection discards it, parent-only fingerprint/authorization/matching and legacy guard could interpret a component claim as product fit. Required: explicit producer→legacy/schema→projection→trusted target/fingerprint→verifier→authorization/final-gate chain, independent expected target from code/source, and target-aware versus PRODUCT-only-reject dispositions. Negative gates must reject missing/mismatched target, cross-component/product scope and lossy projection while preserving PRODUCT behavior.
2. **S6 evaluator capability incorrectly assumed.** Existing selector accepts HUMAN alternates only; collector forwards priorTerminal without missing-field/preview proof. Diagnostic admission hardcodes j6 code-owned turns `[1,2]`, others none, and qualification rejects unregistered code-owned turns. Required: explicit typed witness bridge and separate evaluator selector actor, policy/outcome/witness hash validation and tests; prospective registered code-owned turn admission; seven-turn branches that respond naturally to early intake/completion, confirm only with preview proof and record completion only with confirmation receipt.

## Review 2 — CHANGES REQUESTED; hai blocker đầu đã đóng

- S3 now names both claim representations, strict producer/schema/projection, code-owned expected target, request-key matching/fingerprints, PRODUCT-only legacy rejection, final readback and mandatory consumer-disposition inventory. Added the exact negative gate list.
- S6 now explicitly requires an evaluator-only typed witness bridge/selector, distinct actor from HUMAN, hash/authority/receipt checks, no private fields to models/public reports, frozen early-intake/early-completion branches and prospective per-scope code-owned turn/kind allowlists. Existing historical scripts/scopes remain unchanged.
- Missing/wrong witness blocks before dispatch; no default confirmation, new turn, rerun or blanket code-owned exception. Supplemental checkout is NOT_EXECUTABLE until these evaluator changes are implemented and tested.

Reviewer kiểm exact clean `22654e25c34c4c7c02c8fa1fef59e5f24e8becfb`, xác nhận hai blocker S3/S6 đã đóng. Còn một P1 ở S5: ingress ép mọi inbound khi checkout pending vào private code path, nên mở intake ngay sau add có thể khiến p08 đổi sang áo, j1 sửa số lượng/size và j4 thương lượng chỉ nhận lại câu hỏi tên. Code-owned allowlist không sửa được việc yêu cầu khách không tới owner. Reviewer yêu cầu mandatory feasibility gate và giải pháp tối thiểu giữ mutation/negotiation, privacy/caps/no parser-router; nếu chưa có giải pháp phù hợp phải ghi S5 BLOCKED, không blanket early-intake.

## Review 3 — APPROVE PLAN

- Bỏ yêu cầu mặc định add→intake; giữ first-turn checkout hiện có, không tắt feature để tránh regression. S5 được đánh dấu FEASIBILITY_REQUIRED trước khi mở rộng hành vi intake sớm.
- Gate S5-A yêu cầu composed ingress/session/real-PG tests với pending fields/preview: p08/j1/j4 phải có receipt và reply đúng tác vụ, không chỉ clarification text. Candidate reuse privacy boundary cho typed positive public proof; negative detector/parser miss không đủ để đưa raw text cho owner. Không semantic intent router/parser hoặc model thứ ba.
- Không private commit và owner-effect turn/budget mới cùng inbound; mutation phải xử lý preview/quote revision đúng domain và không đưa PII vào public. Unknown/mixed/unproved input fail-closed.
- Nếu route không chứng minh được trong các ràng buộc hiện có thì S5 BLOCKED_AT_PRIVACY_OR_INTERRUPTION_CONTRACT. Không activate early-intake prompt hoặc prospective code-owned allowlist/full55 acceptance, không claim hỏi tên lặp là sales progress. S1–S4 có thể bàn giao riêng, không tự đổi campaign denominator.

Reviewer kiểm exact clean commit `7c1dd5ebaaebad6f2b558cbd0c26e0138b307f65` và kết luận **APPROVE PLAN**, không còn blocker ở cấp kế hoạch. Reviewer xác nhận S5 đã có mandatory privacy/interruption feasibility gate, không dùng detector âm tính làm proof public, không chạy hai luồng effect/budget cho cùng inbound, không dùng code-owned allowlist/clarification để che tác vụ bị bỏ. Nếu không chứng minh được route phù hợp thì S5 và full acceptance vẫn BLOCKED. Các sửa S3/S6 vẫn giữ target authority/compatibility, typed evaluator proof và admission.

Final reviewer qualification: approval chỉ cho kế hoạch engineering có điều kiện; chưa chứng minh implementation, privacy route, nguồn shop hoặc chất lượng model đã đạt. Reviewer chỉ đọc, không chạy tests/provider/network hoặc sửa file. Các implementation commands, real PostgreSQL và model run cho kế hoạch này đều **NOT_RUN**. Source publication, merge/deploy/live send không được cấp quyền bởi approval này.

Delivery chỉ cập nhật status đầu plan và record/todo, không sửa contract R3 đã được approve.
