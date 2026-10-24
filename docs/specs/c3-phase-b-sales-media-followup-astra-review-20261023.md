# Review độc lập phương án sales/media — GPT-6 Astra High

Ngày 23/10/2026. Reviewer `/root/review_sales_media_followup_astra`, model `gpt-6-astra`, effort `high`, fresh context. Reviewed base `6d068e245f3245f85dbf874a88356289e07464de`, branch `feat/c3-phase-b-commerce-20261014`, worktree clean. **REVISE: hai P2 required, một P3.** Parent ghi lại kết luận từ review trong chat, không phải reviewer APPROVE bản kế hoạch sửa sau đó.

Reviewer đọc instructions repo, source media/context/boundary/tool descriptions/prompts, plans và evidence [run12](../../apps/worker/evals/single-agent-commerce-read-only/sales-media-run-20261023/CHECKPOINT_B.md). Không sửa file, chạy tests/provider hoặc thao tác live.

## P2 — observation ảnh cần operation, source identity và readback

Gap confirmed: `single-agent-commerce-media.ts:23–41` chỉ overlay selected/viewed thành công; dòng79 trả NO_MATCH không giữ snapshot. Raw `media/provider-attempt-2.json:245` có FEEDBACK unavailable, verifier request tại dòng115 thiếu nó. Verdict chỉ product ref, chưa chứng minh sole cause.

Select/view phải tách operation/stage: download/decode lỗi không phủ định ảnh đã chọn để gửi. NO_MATCH chỉ không có asset đủ điều kiện trong phạm vi đã tra; COLOR_UNVERIFIED không nói shop không bán màu; SOURCE_ERROR chỉ lần thao tác thất bại. `catalogVersion="catalog-v2"` không phải content revision. Hash dữ liệu quyết định selection/binding, giữ thời điểm cố định/expiry; unchanged readback giữ binding, changed/expired source không dùng old PASS. Error chưa có source read thì không tạo version catalog giả hoặc tự retry. Reuse code-owned trusted observation, không raw error/model narrative.

## P2 — media treatment gần trùng chỉ dẫn đã chạy

`gemini-inference.mjs:60–62` đã nói chủ động dùng ảnh, intent theo nỗi lo, view khi metadata thiếu, view/select độc lập. Nhắc lại sẽ lặp cách sửa cũ. Thay phần phân loại bằng mục tiêu phạm vi ảnh cho thấy: “Chọn góc và phần trang phục sao cho ảnh cho thấy điều quyết định lời tư vấn.” Bỏ liên tưởng trang trí → cận; freeze exact diff. Không ép concern phải GENERIC/view/full set, cận áo có thể đúng nếu khuyên áo lẻ hợp lý.

## P3 — owner treatment nhỏ hơn

`owner.vi.txt:25` có thiên hướng đổi cách mặc/món; `verifier.vi.txt:22` cho cảm giác dự kiến từ chất liệu. Hypothesis có căn cứ, chưa confirmed cause vì candidate cũ giữ câu đó mà heat output vẫn đổi. Chỉ thay câu giữa bằng: “Khi cảm giác mặc là điều khách phân vân, có thể khuyên giữ món hoặc đổi cách mặc/món khác; giải thích lựa chọn bằng chất liệu và thiết kế đã có.” Giữ boundaries, không cần năm câu trùng quyền.

## Review chất lượng và kiểm

Hai lựa chọn có thứ bậc/đánh đổi rõ có thể tốt. Phối áo với váy đen là lợi ích cả mua áo lẻ; thêm bộ đồng bộ cần hợp khách, không ép FAIL hoặc áo lẻ. Test no-match cùng scope tới hai model, unchanged binding, changed source/color/expiry, select success/view failure, không lẫn lượt. Old draft chỉ probe, không yêu cầu PASS. Ba cặp controls, bốn native media và bốn paired advice inputs; không feedback giả hoặc auto tăng corpus. Regression B1/B2/B3 khi có candidate đáng giữ; không tự full39/43. Chưa B GO hoặc kết luận model thiếu năng lực.

Đã tiếp thu trong [kế hoạch follow-up](c3-phase-b-sales-media-followup-plan-20261023.md); parent self-review, chưa reviewer re-review.
