# Independent review — hướng sửa sau hai lượt Phase B gần nhất

Ngày: 2026-10-23. Reviewer: `/root/review_next_phase_b_plan`. Exact source HEAD: `d2c5e28c2e7ad8d3c7498e9061fba36c1b2bdcb5`, worktree sạch lúc bắt đầu. Agent chính ghi lại kết luận reviewer; đây không phải implementation hoặc approval kế hoạch đã sửa.

Reviewer đọc hai transcript native, [review toàn bộ 53 lượt](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-run-20261023/TWO_RUN_REVIEW.md), và đối chiếu runtime, raw tool traces, policy/chart pointers. Không sửa code/file, chạy tests/provider hoặc live action trong quá trình review.

## Verdict: REVISE

Phân biệt code, nguồn dữ liệu, verifier và chất lượng tư vấn là đúng. Tuy nhiên phương án trong hội thoại chưa đủ để triển khai: hai thay đổi recovery đang được mô tả như sửa lỗi code thông thường trong khi chúng cần hợp đồng quyền gửi cụ thể. Có 2 P1 và 3 P2 required.

## P1 — protected fallback sau verifier FAIL chưa được phép theo hợp đồng hiện hành

Phương án đề xuất giữ giá đã xác minh khi phần ảnh bị verifier chặn. Nhưng:

- [Read-only integration plan:82](c3-phase-b-read-only-integration-plan-20261014.md) quy định exact draft không qua verifier thì dùng terminal đã freeze, không tự dựng partial protected fallback.
- [Boundary:71](../../apps/worker/src/single-agent-semantic-verifier-boundary.ts) chỉ chấp nhận các exact static fallback đã đăng ký.
- [Owner/verifier loop:150](../../apps/worker/src/single-agent-commerce-read-only.ts) kiểm một exact draft/binding; recovery không có verifier request thứ hai.
- [Effects recovery:326](../../apps/worker/src/single-agent-commerce-effects.ts) có ngoại lệ ACK/cart summary từ receipt, readback và nguồn/policy/authority hiện tại. Ca hỏi ảnh kèm giá không có receipt để dùng ngoại lệ đó.

Renderer từ typed facts không tự là semantic parser. Điểm thiếu là quyền của terminal mới, claim binding và proof obligations, không thể chỉ gọi “gate cả response group” rồi coi đã đủ.

**Sửa phương án:** vòng gần nhất chưa triển khai generic protected partial recovery sau FAIL. Sửa nguyên nhân feedback bị chặn để giá và ảnh thay thế nằm trong một exact draft được verifier kiểm một lần. Draft thực sự FAIL vẫn đi static fallback. Giữ mất giá trong recovery là residual; nếu cần xử lý tiếp thì tách scope/spec riêng trước implementation. Không cắt draft FAIL, không thêm repair/reverify loop.

## P1 — giữ ảnh cùng handoff chưa có authority đầy đủ

- [Handoff:85](../../apps/worker/src/single-agent-commerce-handoff.ts) commit chuyển ownership trước terminal HANDOFF; holding reply chỉ được chấp nhận theo scope/state/policy đã commit.
- [Ingress:194](../../apps/worker/src/single-agent-commerce-ingress.ts) chỉ gắn ảnh và PRODUCT_MEDIA claims cho generated PASS.
- [Ingress:239](../../apps/worker/src/single-agent-commerce-ingress.ts) dùng `sendAfterOwnerHandoff` cho terminal HANDOFF; đây không phải quyền gắn mọi ảnh đã chọn trước đó.
- [Native no-chart attempt](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-run-20261023/media/provider-attempt-6.json) có terminal HANDOFF và 0 verifier generations. Không có PASS để tái dùng cho lời dẫn/ảnh của nhánh này.

“Permission hợp lệ” chưa xác định lifecycle trước/sau HUMAN, artifact/claim được phép gửi và atomic response group.

**Sửa phương án:** giữ handoff hiện tại trong vòng sửa nhỏ. Handoff+media vẫn là residual, chưa được coi đã đóng. Thiết kế riêng nếu thực hiện: success; SILENT policy; denied/no capability; unknown commit; revision/recipient/fence/policy đổi; ảnh hết hạn/nguồn đổi; repeated request. Không gửi ảnh trước gate hoặc dùng lại quyền BOT sau handoff.

## P2 — focused 14 lượt không đủ làm regression gate

8 needs-edit + 4 fallback + 2 no-chart là tập chẩn đoán hợp lý, nhưng thiếu paired SAFE/UNSAFE controls và những nhánh positive đang chạy tốt. Không đủ để chấp nhận thay đổi verifier/output rồi chạy full.

- [Controls report](../../apps/worker/evals/single-agent-commerce-read-only/evidence-fix-run-20261023/CHECKPOINT_B.md) đã ghi candidate trước chặn unsafe nhưng vẫn chặn SAFE; một positive fixture còn sai.
- [Media:97](../../apps/worker/src/single-agent-commerce-media.ts) đã biểu đạt operation error, scoped no-match và color binding. Lỗi hiện không phải thiếu truyền observation.

**Sửa phương án:** reuse bộ 17 verifier controls hiện hữu; sửa positive fixture đã xác định sai trước đăng ký run mới, giữ nguyên evidence cũ. Bổ sung deterministic output/world-expiry/recipient/permission/response-group tests phù hợp. Giữ các positive native cases giá, ảnh, size hợp lệ, receipt/state và continuation trong regression; không tăng corpus tràn lan. Freeze exact counts/source/prompts/budgets trước generation. Unsafe send-eligible ⇒ STOP.

## P2 — can thiệp tư vấn chưa khác các vòng sửa cũ

[Owner prompt:5](../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt) đã yêu cầu chọn hướng mua, nêu điểm khác biệt, không chép mô tả, không kể đủ mọi lựa chọn và quyết định lại khi hoàn cảnh đổi. [Giọng chat:47](../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt) đã yêu cầu từ thông thường, bỏ lời khen thừa và không kể hệ thống. Viết thêm cùng ý chưa phải can thiệp có căn cứ.

Hai run N1 không cô lập prompt, model, context hoặc tool budget. Chưa đủ bằng chứng để kết luận thiếu chỉ dẫn hay prompt dài là root cause.

**Sửa phương án:** bước đầu giữ owner prompt; sửa feedback/output riêng. Với tư vấn hình dáng/ren, dùng diagnostic visual đã xây: cùng world/history/clock/model/prompt, baseline text so treatment có pixel đúng binding. [Gemini adapter:60](../../apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs) phân biệt select ảnh và xem ảnh. Không ép view mọi lượt; chỉ promote khi cải thiện whole-turn usefulness và không mất safety. Nếu chưa cải thiện rõ, báo chưa tìm ra can thiệp hiệu quả; không tự thêm prompt để cứu từng câu.

## P2 — chưa xác định chart thiếu hay không resolve đúng scope

- [Media integration:166](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-run-20261023/media/integration.json) có artifact PUBLISHED `size-chart:SQ2447`, version 2.
- [Opening attempt:209](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-run-20261023/openings/provider-attempt-3.json) trả `sizeCharts: []` cho SV2447.
- [Ingress:164](../../apps/worker/src/single-agent-commerce-ingress.ts) resolve bằng `sizeChartTarget(product)` và `evaluateSizeChartEligibility`.

Điều đã biết là adapter chưa trả chart đủ điều kiện cho target. Chưa thể nói toàn repo không có chart, cũng chưa được coi SQ2447 và SV2447 là cùng món.

**Sửa phương án:** read-only trace published pointer → nội dung/scope → target → eligibility reason. Chỉ bổ sung dữ liệu khi đã xác định thiếu đúng nguồn. Không tự map alias hoặc dùng chart khác món để hết handoff. Chưa có chart hợp lệ thì giữ no-chart/handoff, ghi thiếu căn cứ cho tự chọn size; không xin thêm số đo để chữa thiếu chart.

## Phần reviewer đồng ý giữ

- Bảo vệ customer text trước exact hash/verifier; không strip sau PASS. Không coi bỏ refs khỏi tool result là đủ vì context/history cũng có thể mang refs.
- Không mở rộng verifier sang chấm giọng, không regex theo observed IDs, không parser/role/framework mới.
- Lookup thành công đúng scope có thể hỗ trợ cách nói đời thường “ảnh khách mặc mẫu này em chưa có để gửi”; source error không chứng minh absence. MODEL/SIZE_GUIDE không tự thành feedback.
- Ảnh chung không được nhận là màu đã xác nhận khi color binding chưa có.
- Review actual terminal cùng history; không score draft chưa gửi như thành công. Không ép một món, số câu, CTA hoặc từ cố định; upsell hợp lý được phép.
- EGRESS_WORLD_CHANGED cũ vẫn UNKNOWN; không nới gate để chữa việc chưa tái hiện.

## Scope nhỏ nhất reviewer đề xuất

1. Thiết kế output projection/artifact guard cụ thể trước verification, giữ binding/attachments nội bộ và text thường không bị biến đổi.
2. Chỉ điều chỉnh nghĩa lookup trong verifier ở bước feedback; giữ owner/context khác cố định, chạy controls đã sửa fixture và freeze.
3. Audit chart scope/alias/eligibility từ nguồn có sẵn; chưa thay dữ liệu hoặc authority.
4. Sau readiness, dùng phép thử visual nhỏ hiện có cho chất lượng tư vấn thay vì viết thêm chỉ dẫn giống cũ.
5. Có candidate đáng giữ mới focused native rồi full population hiện hành, báo riêng residual protected fallback và handoff+media.

Đây là **đề nghị sửa kế hoạch của reviewer**, chưa phải kế hoạch đã sửa/được re-review APPROVE hoặc việc đã implementation. Chưa chạy provider, B chưa GO.
