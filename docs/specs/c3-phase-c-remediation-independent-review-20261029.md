# Independent review — Phase C remediation plan

**REQUEST_CHANGES.** Review plan tại clean HEAD `a851c25816d678a26c6a37035d6808e822184479`; reviewer `/root/phase_c_independent_review`, độc lập với tác giả kế hoạch. Read-only review: không implementation hoặc gọi model. [Kế hoạch được review](c3-phase-c-remediation-plan-20261029.md). Phase C vẫn BLOCKED; đây không phải review phê duyệt qualification.

## P1 — Phân biệt active policy và transaction policy đã pin

Plan bước1 yêu cầu pointer đổi thì invalidate/re-read nhưng chưa quy định cart/quote/receipt đã commit được giữ thế nào. Resolver dùng savePinIfAbsent, nên invalidate cache rồi resolve cùng pin có thể vẫn trả version cũ. Effects dùng version/hash policy làm binding giao dịch.

Chỉnh kế hoạch: quy định đường đọc active policy cho tư vấn và đường giữ policy binding của giao dịch đã commit riêng biệt; không tự ghi đè pin, đổi quote hoặc phát lại effect. Bổ sung test pointer đổi trước verifier, trước commit và sau commit: chặn draft cũ theo binding hiện tại, nhưng không sửa cart/receipt lịch sử.

Nguồn đối chiếu: `packages/chat-runtime/src/runtime-policy-resolver.ts` tại313/552; `apps/worker/src/single-agent-commerce-effects.ts` tại214 trên reviewed HEAD.

## P2 — Tách media evidence cho judge khỏi căn cứ của verifier

Bước3 bổ sung media inventory/absence vào evaluator packet, nhưng safe control thất bại vì runtime verifier không nhận được căn cứ. Sửa packet không tự sửa runtime. Media capability chỉ là hint; observation từ lookup thật đã có đường vào trusted context và có phạm vi cụ thể.

Chỉnh kế hoạch: chọn rõ chỉ sửa khả năng chấm và giữ handoff, hoặc reuse runtime observation có scope/version/freshness/readback để verifier nhận được căn cứ. Không biến hint hoặc lookup error thành absence proof. “Không có ảnh phù hợp trong phạm vi đã tra” không phải “cả shop không có ảnh”. Thiếu ảnh shop cần thiết cho nhu cầu vẫn handoff im lặng theo quyết định owner.

Nguồn đối chiếu: `apps/worker/src/single-agent-commerce-media.ts` tại94 trên reviewed HEAD.

## P2 — Freeze diagnostic budget và inventory contamination đầy đủ

N1 chưa phải trần tổng provider calls: mỗi ca có thể có nhiều generation. Kế hoạch chưa khóa danh sách/trần request/điểm dừng cho diagnostic và chưa yêu cầu kế thừa đầy đủ lịch sử A/B/C. Exact fingerprint có product codes; chỉ đổi SKU cũng có thể vượt exact duplicate check mà mục tiêu/cấu trúc bài gần như cũ.

Chỉnh kế hoạch: danh sách diagnostic cố định, tối đa một lượt sau deterministic readiness, trần attempts và generation requests rõ trước dispatch. Nếu còn lỗi thì ghi residual/replan, không tự lặp. Fresh holdout phải đối chiếu toàn bộ inventory A/B/C đã có và thêm mọi diagnostic mới trước seal; reviewer kiểm cả bản chỉ đổi tên/SKU hoặc paraphrase gần nguyên case. Không xây semantic classifier mới và không coi exact hash khác là chứng minh chưa contamination.

Nguồn đối chiếu: `apps/worker/evals/single-agent-commerce-qualification/qualification.mjs` tại110 trên reviewed HEAD.

## Các phần được giữ

Không dùng coercion/retry để che s11, không nới verifier cho màu tự tạo, giữ primary grades bất biến. Phân biệt sửa evidence với cải thiện kết quả khách hàng. Không cần thêm vòng sửa giọng văn.

Chưa sửa nội dung phương án theo findings trong lượt review này. Cần chỉnh3điểm trên rồi gửi lại reviewer trước implementation.
