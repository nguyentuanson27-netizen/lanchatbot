# Independent implementation review — purchase options/source readiness

Ngày 31/10/2026. Cùng reviewer đã APPROVE PLAN revision3: `/root/phase_c_options_plan_review`. User yêu cầu implementation → review → fix → cùng reviewer review đến APPROVE. Reviewer chỉ đọc source/diff/plan/evidence, không sửa code, gọi provider, PG hoặc live actions. [Implementation](c3-phase-c-purchase-options-implementation-20261031.md).

## Các lượt đã hoàn tất

| Reviewed source | Verdict | Findings và cách đóng |
|---|---|---|
| `9f530bdbd8db9c0fa05d34057e4c938e56ececc9` | REQUIRES_CHANGES |6findings: required-source handoff có thể holding reply; STOCK UNKNOWN bị xem ready; expiry chưa recheck từng generation; source/component/size refs quá chung; media intent enum sai; coverage bỏ preparation facts/engine outcome |
| `727b47e9fcaef53278b6d39aa7a74739d36b83de` | REQUIRES_CHANGES |6finding trước đã xử lý; còn partial BOM bị đánh AVAILABLE sau khi bỏ malformed/oversized refs, empty-array không dùng source fallback |
| `5666f172fd74560d6e6309ca2ca7a37ab9a3d911` | APPROVE CODE REVIEW |BOM incomplete/bounds/fallback tests đã đóng finding; silent method không nằm trong model declarations. Chờ exact-source verification |
| `b23681093f3fd6f4bb5f8462921016b6c5d51c8d` | APPROVE CODE REVIEW |Thêm checkout readiness qua existing selector/BOM và PG harness tách silent source gap khỏi explicit-owner holding path: bounded/consistent. Runtime TS không đổi từ5666. Chờ PG/evidence cuối |

## Chi tiết fixes đã được reviewer kiểm

1. Code-owned silent handoff vẫn đọc policy/tag/authority và commit cùng boundary hiện có; loại customer output cho required source gap. Denied/unknown/no-repeat được test, không đổi voluntary/business handoff policy.
2. Readiness STOCK yêu cầu evidence dùng được, không chỉ transport/status OK; null quantity/UNKNOWN không đạt. Media intents lấy cùng enum runtime.
3. Readiness recheck async trước generation dispatch nằm trong registered ledger: expiry giữ0providerRequests và failureLayer PRE_DISPATCH; không hidden retry/cohort replacement.
4. Option-specific raw BOM/fallback refs, source statuses và product-only size lookup riêng; không lấy product chart thành fit từng component. Component sizing chưa hỗ trợ được ghi rõ.
5. Coverage gồm metadata và admitted preparation facts; actual engineOutcome và source hash không bị mất trong một chữ AVAILABLE. Evaluator-only, hash selectors, bounded/incomplete handling; paired packet không lộ arm qua candidate-only coverage.
6. Không publish AVAILABLE cho BOM bị thiếu/truncate; empty components array dùng fallback giống cart resolver.

Final APPROVE IMPLEMENTATION cần reviewer đối chiếu verification artifact, kết quả actual PG/drop và các limits trước bàn giao. Code-review approval bên trên không phải quality GO. Phase C BLOCKED; C3 NOT_RUN; B_NOT_GO.
