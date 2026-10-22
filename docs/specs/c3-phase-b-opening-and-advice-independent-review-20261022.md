# Independent review — kế hoạch opening và tư vấn

Ngày 22/10/2026. Verdict: **APPROVE ở mức kế hoạch**. Không có required finding P1/P2.

Reviewer riêng `/root/review_opening_advice_fix_plan`, fresh context, được cấp mục tiêu bán hàng, ràng buộc kiến trúc, kế hoạch, finding full39/rerun và nguồn lịch sử sửa để tự đối chiếu. Reviewed HEAD `0b509b630a48afb1396b1fac47aed532332ff236`; [plan](c3-phase-b-opening-and-advice-fix-plan-20261022.md) có Git blob `ea3aea9f4db1e999db78d64eeef765c677746d65`.

Review chỉ đọc source/evidence; không sửa runtime, chạy test/provider hoặc mutation. Parent đối chiếu lại hai đường thực thi dưới đây. Verdict không xác nhận implementation, chất lượng model hay B GO.

## Kết luận

- Plan phân biệt đúng quota, lỗi owner và source gap; không coi sửa prompt là cách chữa dữ liệu thiếu.
- Clock ở ngoài mutable snapshot; historical quote giữ version riêng; handoff dùng transaction/policy hiện có.
- T7 dùng được runner hiện hành: 18 lượt ưu tiên + 21 lượt còn lại = 39 native turns; 38 public và 1 private code-only, tối đa 152 generation requests. Diagnostic4 riêng tối đa 8 requests, tổng cap160. N1 không chứng minh độ ổn định.
- Diagnostic được giới hạn và không dùng làm causal A/B hoặc bằng chứng native send eligibility. Không thêm model role, gate hay framework.

## Hai lưu ý triển khai — không chặn APPROVE

1. **T3, plan dòng64–71 — phải nối candidate handoff vào đúng provider journey.** `apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs:313–316` hiện chỉ đọc candidate matrix trong synthetic tests EXCHANGE/DEFECT; provider composition ở dòng107–116 clone published pointers. Khi triển khai, thực hiện đúng candidate qua isolated DB/resolver mà plan đã yêu cầu, lưu hash candidate thực được journey dùng. Chỉ sửa JSON hoặc synthetic fixture chưa chứng minh đóng silent first handoff. Không sửa published/live policy.
2. **T7, plan dòng136–138 — loại treatment cũ khỏi diagnostic input.** `apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.mjs:29` cho phép row override `ownerInstructions`; dòng35 cho phép `ownerDescriptions`. Bốn input frozen phải dùng đúng candidate prompt chung, không mang description/prompt treatment của thí nghiệm cũ. Reuse registration effective prompt hashes và captured input hash hiện có; không thêm framework/gate.

## Trạng thái sau review

Kế hoạch đủ rõ để bước sang implementation khi owner yêu cầu. T0–T7 vẫn chưa triển khai hoặc provider-run trong lượt review này. Giữ nguyên raw evidence, rubric, model/config và trạng thái chưa B GO; không tự bắt đầu vòng model.
