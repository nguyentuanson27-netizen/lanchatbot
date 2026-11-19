# Review độc lập kế hoạch căn cứ và đường đọc

Plan: [c3-phase-c-evidence-read-path-fix-plan-20261030.md](c3-phase-c-evidence-read-path-fix-plan-20261030.md).

Task owner: lập kế hoạch → review độc lập → sửa kế hoạch → cùng reviewer review lại đến approve. Scope hiện tại chỉ documentation, không implementation/provider run.

Reviewer: `/root/full22_run_review`, cùng reviewer của full22 input/accounting. Actual agent spawn ban đầu: `gpt-6.1-sol`, reasoning effort `high`, fork không mang parent history. Lượt này tiếp tục cùng reviewer qua followup task.

## Revision 1

- Exact clean plan HEAD: `43560762a197c86a95de30a8ebba98f1756c0293`.
- Planning base: `cda76805ed939049f1fe0f8f987bff2226d07feb`.
- Đã gửi reviewer kiểm P0 early trace/PII, P1 tuple authority/final gate, P2 read coverage/budget/schema, P3 read-ahead có giới hạn và P4 correction/chart ground truth.
- Verdict thực: **REQUEST_CHANGES** trên exact `43560762a197c86a95de30a8ebba98f1756c0293`.

Self-review đã kiểm filenames của verification commands và sửa hai tên suites không tồn tại sang `track-b-protected-claim-boundary.test.ts` cùng shared business-tools `protected-claims.test.ts`/`reply-assembler.test.ts` trước revision1 commit. Chưa chạy tests trong task chỉ lập kế hoạch; không ghi PASS cho lệnh dự kiến.

## Findings và revision 2

| ID | Reviewer yêu cầu | Kế hoạch đã sửa |
|---|---|---|
| F1 | P3 eligibility/accounting quá rộng; cần giữ singleton fallback j3, admission trước publish, không hidden I/O | §6.1 giữ đúng existing prepare predicate; một source observation, local ≤3offers, fallback catalog cũ được đếm riêng; preparation work1 trừ từ6; §6.2 ghi các bound số và atomic no-partial admission, tests multi-bound/>3/overflow |
| F2 | Optional read-ahead có thể chặn cả thanks/styling/care vì mọi inserted claim đều hardPrechecked | §6.3 giữ independent catalog evidence khi optional acquisition fail, status không tạo fact âm/automatic handoff; khi usable evidence đã publish thì không được rút sau PASS, changed/expired readback vẫn block; thêm positive/negative controls |
| F3 | Tuple TTL48h khác read maxAge; chưa rõ quantity/incomplete/UNKNOWN và presentation conflict | §4 dùng minimum applicable expiry, không hydration renewal; quantity informational không cấp action; canonical source-derived views và fail-closed khi validated same-tuple conflict; atomic publication, missing-row/incomplete không thành phủ định |
| F4 | Node evals/PG có thể chạy worker dist cũ; thiếu7named PG invariants/invocation | §8 build shared trước TS focused, current worker build trước Node evals/PG; ghi actual provider-free real-adapter driver/child và đầy đủ7invariants; tests dự kiến vẫn NOT_RUN |

Reviewer xác nhận P0 UNKNOWN handling, s11 compliance residual và P4 source-based chart audit là phù hợp. Reviewer không chạy tests/providers và không sửa file trong vòng review kế hoạch.

## Revision 2 — APPROVE PLAN

Exact clean reviewed HEAD: **`f9b6e0843382e1c2be192137c5148a9d3f8e0c96`**. Cùng reviewer đã gửi verdict **APPROVE PLAN**, xác nhận F1–F4 được đóng và không còn blocking plan finding.

Reviewer đối chiếu predicate prepare với singleton j3, work1/tổng6 và source I/O, atomic admission bounds, optional acquisition giữ independent evidence, published evidence không được prune sauPASS, minimum TTL/no renewal, informational quantity/UNKNOWN/completeness và canonical source conflict. Build order, provider-free driver và7named invariants khớp source thực. Không suy root cause của dependency khi trace thiếu; s11 vẫn có thể là model compliance residual; P4 expected dựa trên chart thật. History/raw/grades cũ giữ nguyên, không tạo blind grades mới.

**Giới hạn approval:** chỉ kế hoạch. Implementation, đo byte/work bounds, neutral regression controls, actual provider readiness và semantic quality đều chưa verified. P3 không được ship nếu không đạt one-observation/bounds/controls; cần replan thay vì mở budget. Reviewer không chạy tests/providers, không sửa files hoặc thực hiện mutation trong hai vòng review.

Sau approval chỉ cập nhật status, record, tasks và PR; không đổi phương án kỹ thuật. Không claim independent final delivery-head code review vì task này không sửa executable source.
