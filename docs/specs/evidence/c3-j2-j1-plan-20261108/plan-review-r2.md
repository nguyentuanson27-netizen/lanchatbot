# Review độc lập kế hoạch j2/j1 — Revision 2

**APPROVE_PLAN** — không còn blocking finding trong Revision 2 được định danh dưới đây. Approval chỉ áp dụng cho kế hoạch, không xác nhận implementation, acceptance, kết quả model, Phase C GO hoặc quyền chạy provider/deploy.

- Repo: `C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`.
- HEAD: `f0cf4a502b60fd9b9a987b336d525ad5472fc0e2`.
- Plan: `docs/specs/c3-phase-c-j2-recovery-j1-controlled-plan-20261108.md`, bản chưa commit trong shared worktree.
- **SHA256 chính xác:** `2c617c4d6b467a92797a706279d37ee43bdc9ac38f47bdb8767b3539e71d0393`.
- Đây là lần review Revision 2 của cùng reviewer, theo yêu cầu mới tiếp tục sửa plan đến khi APPROVE. Không ghi đè report Revision 1.

## Đóng các finding bắt buộc

**R1 — CLOSED.** Bảng §2.2 dòng 31–41 phân biệt NON_CURRENT_REUSE_REJECTED, CURRENT_VALID, CURRENT_INVALID và UNKNOWN; quote hiện tại nhưng value/unit/domain sai vẫn khóa, kể cả value bằng profile cũ. Dòng 49–53 buộc patch đầy đủ và confirmed readback trước fit; dòng 76–78 thêm đúng negative controls mixed-valid/current-invalid. Không còn đường định nghĩa “mọi invalid field đều bỏ qua”.

**R2 — CLOSED.** Dòng 43–55 dùng cùng request/profile recovery ledger cho standalone, inline và identical-patch batch; target không phải namespace để né pending. Dòng 47–51 chốt reject partial trước CAS và giữ wildcard UNKNOWN; dòng 52–55 giữ uncertainty riêng, resolve trước dependent refresh, metadata CAS không clear ledger. Ma trận dòng 75,79–82 kiểm các entry paths/targets và receipts. Chấp nhận corrective patch đầy đủ ở target B là hợp lý vì measurement thuộc profile; fit của B vẫn cần chart/target riêng.

**R3 — CLOSED.** Dòng 143–149 khóa DIRECT_QUOTE, ACK_PLAN_OK và CART_PLAN_OK trước seal, cùng predicate cho A/B; gate cần ít nhất một valid behavioral miss của A, technical misses đơn thuần cho INCONCLUSIVE/NOT_RUN. Dòng 151–155 tách planning với native terminal usefulness, identities store riêng và accounting của NOT_RUN. Không tăng sample, retry hoặc quota để cứu kết quả.

Các điểm O1/O2 cũng đã được làm cụ thể ở dòng 120–124 và 155: adapter eval chèn một part vào actual wire sau projection/presentation, field allowlist/bounds rõ; pairs liền nhau theo seeded order và kiểm lifetime/deadline trước từng attempt.

## Kiểm tính khả thi và giới hạn quan trọng

Source hiện tại `apps/worker/src/single-agent-commerce-ingress.ts:120–135,262–264` dựng sourceMessages trực tiếp từ claimed current batch sau schema/scope/current-batch checks, không lấy measurement source từ accepted shop history. Vì vậy một source binding tối thiểu do code truyền để xác nhận batch coverage và source-event set là khả thi trong phạm vi plan; không cần semantic intent parser hoặc history lookup mới.

`single-agent-commerce-state.ts:57–90` hiện gộp source lookup, numeric copy/unit/token checks và provenance. Có thể tách helper thuần dùng lại phần numeric validation để kiểm quote literal của rejected reuse. **Helper này chỉ kiểm numeric copy/unit/domain; nó không được cấp provenance, tạo history-source giả, hoặc khẳng định quote có trong history.** Quote tự parse cộng equality chỉ là một phần điều kiện phân loại; complete current-source coverage và stored provenance phải do native ingress/profile code chứng minh. Không có proof thì UNKNOWN/blocker theo dòng 41, không fallback sang equality-only để làm j2 xanh. Approval không xác nhận source hiện tại đã có đủ binding này hoặc helper đã tồn tại.

NON_CURRENT_REUSE_REJECTED cũng không chứng minh code đã tìm hết mọi correction trong customer text. Plan đã giới hạn đúng: không hứa hiểu mọi field khách nói và không cho giá trị/quote bị reject trở thành truth. Việc triển khai phải giữ giới hạn đó.

Native builder hiện dựng explicit view và bounds tại `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs:143–149,269–289,329–366`; vì thế adapter sau actual projection là khả thi và tránh field bị bỏ âm thầm. Việc metadata diễn đạt đúng prerequisite, giữ signed contents và đáp ứng 1KiB/full-wire caps vẫn phải được focused checks chứng minh sau implementation.

Không thấy plan nới code authority, ảnh first-contact/silent fallback, 1 owner/≤1 verifier, source/receipt/commit/freshness/privacy guards hoặc các caps/retry0. Proposed future budget vẫn tối đa30 runtime generations; historical18slots không trở thành population mới. N nhỏ và hai native T3 outcomes không được dùng làm causal/stability GO.

## Phạm vi đã kiểm

Đã đọc toàn Revision 2, đối chiếu lại finding R1/R2/R3 của report trước cùng các đoạn source về numeric validator, native ingress source construction, writer/ledger entry paths và native wire builder đã đọc ở vòng trước. Đã xác minh SHA256 trước và lúc chuẩn bị xuất report. Shared worktree có thay đổi plan/provenance và archive report R1 của parent; reviewer không sửa các file đó.

Không chạy tests/evals/archive probe/provider, không gọi nguồn live, không sửa code hoặc plan, không spawn subagent hay gọi reviewer khác. Chỉ xuất hai report r2 ngoài repo. Chưa xác minh implementation, source binding mới, RED/GREEN/real-PG, credential/model/source availability, lifetime headroom thực tế hoặc sales acceptance. Các kiểm tra đó vẫn thuộc lượt implementation/execute có authorization riêng.

Trạng thái approval/hash nên lưu trong evidence riêng như header hiện quy định; không cần sửa plan đã được hash để chèn kết luận này.

