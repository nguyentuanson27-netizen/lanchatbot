# Independent plan review — Phase C purchase options/read path

Ngày 31/10/2026. Owner yêu cầu independent review → fix → cùng reviewer review đến APPROVE. Phạm vi lần này là [kế hoạch](c3-phase-c-purchase-options-read-path-plan-20261031.md), không phải implementation hoặc model run.

Reviewer độc lập `/root/phase_c_options_plan_review`, read-only, không phải người viết/sửa tài liệu. Reviewer được cung cấp yêu cầu owner, HEAD chính xác, plan/tasks, root-cause/case review 22 ca/34 turns, đối chứng B–C và các boundary source/budget/history/evaluator cần xem. Không dùng verdict review làm runtime semantic authority.

## Vòng 1 — REQUIRES_CHANGES

Reviewed HEAD `bc0293eb46c3e243bb604c2ae00248323d690d66`; plan revision 2 SHA256 `1f902cfc0db1f70dd2c5789737d055a910366385893111ee4dcc9236c958e127`.

| Finding | Căn cứ và yêu cầu | Sửa trong revision 3 |
|---|---|---|
| P1 preparation accounting/admission | Prepare nhiều refs chưa nêu debit/callback contract; loop hiện hardcode callsRemaining5 cho một preparation. Cần bảo toàn numeric preparation hợp lệ | §2 thêm contract prospective debit/actual request, failure accounting, giữ facts/coverage, bounded staging/atomic publication; tests 1/2/3 targets, exhausted budget, admission reject, concurrency |
| P2 native history và follow-up registration | Draft ca dựa history/conditional follow-up nhưng binder hiện từ chối authored history | §5 thêm genuine accepted predecessor turns/verified seed hoặc BLOCKED, initial state/history parity, freeze default/alternate qua existing human branch binding, tính predecessor generations vào denominator, negative checks fabricated history/unregistered branches |

Reviewer xác nhận các hướng còn lại phù hợp: một mã/multi-offer là chính; source authority/approved sharing; silent handoff; giữ fixed caps/variant guards; không parser, không evaluator labels vào runtime. Frozen-config delegation §8.3 xử lý đúng gap judge-source.

## Vòng 2 — APPROVE PLAN

Fix commit và reviewed clean HEAD `305b5ecb233510fea0600fed389cf116daeae42c`; revision 3 plan SHA256 `e853d527d0a6dc4641caeb0ad1691bcb3b68594ff7656f690d8e123458d486fc`.

Cùng reviewer kiểm lại hai finding và toàn bộ plan, kết luận **APPROVE PLAN revision 3**, không còn blocking plan findings. Trích verdict: “No remaining blocking plan findings.”

Approval chỉ cho kế hoạch. Source audit/revalidation, RED→GREEN, implementation acceptance, model quality, Phase C qualification và C3 comparison chưa được chứng minh. Các source-blocked/accepted-limitations trong F01–F09 không được đánh resolved vì plan được approve.

Sau verdict, bản plan chỉ đổi dòng trạng thái từ đang review sang APPROVE PLAN và thêm link record này; nội dung kỹ thuật không đổi. Final delivery review cần kiểm status/link cùng tasks và carry-forward của approved plan hash; không tự gọi approval cũ là kiểm implementation mới.

## Verification thực hiện trong task

- Đọc repo instructions, plan và source/evidence liên quan; không dùng live credentials hoặc nguồn shop.
- `git diff --check` PASS ở fix commit.
- Python documentation assertions PASS: relative links tồn tại; 16 test paths trong plan tồn tại; ledger F01–F09 và references đủ 22 case IDs; có explicit preparation/history contracts. Đây chỉ kiểm tài liệu, không chứng minh coverage test runtime.
- `Get-FileHash -Algorithm SHA256` cùng independently verified document hashes như trên.

Không chạy tests/typecheck/build/actual PG/provider/model trong task plan review này; các commands trong plan vẫn là dự kiến. Không source mutation, deploy hoặc live send. Phase C BLOCKED; C3 NOT_RUN; B_NOT_GO.
