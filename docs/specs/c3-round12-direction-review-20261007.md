# Round12: review hướng xử lý trước implementation

Owner yêu cầu “review lại hướng xử lí rồi thực hiện”. Main đã refresh: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; source review `f14d6b26bc0688ad52f80dc9bef2db9cfcce204b`. Giữ branch/PR390, scope Checkpoint A only.

Đã đọc cả24 lịch sử/tin mới/facts/candidate/verdict/terminal của Round11. Dữ liệu và history tới cả hai roles đúng; chưa có evidence mất context. Ba fallback có unsupported wearing/benefit claims dù context ghi rõ giới hạn. Verifier không trả giải thích chi tiết, nên không suy nguyên nhân nội bộ từ reason code. `r5-competitor-price` đã nói “nội thành”; không gọi đây là lỗi thiếu từ đó. Giữ một safe policy rejection chưa được giải thích, không tune verifier để cứu nó.

Owner prompt cũ đã có quy định giọng văn, grounding và next step. Nó lặp trách nhiệm tư vấn/điều kiện/giọng qua nhiều mục. Thiếu rule không giải thích hết thất bại. Giả thuyết thử lần này: chỉ dẫn trùng và cạnh tranh giữa thuyết phục với trấn an khiến model vừa kể facts vừa thêm lợi ích hoặc để khách tự quyết. Chưa chứng minh đây là nguyên nhân duy nhất; nondeterminism và model capability vẫn là unknowns.

## Quyết định giữ và sửa

Giữ nguyên verifier, schema, product profiles, quotes, code-fit, provider/model/config, bounds, terminal map và các bars. Không thêm retrieval, planner, parser, template, repair hoặc role. Code tiếp tục sở hữu world authority; seam không wire production. Sửa owner prompt bằng bốn mục rõ vai trò/tư vấn/giọng/authority, bỏ chỉ dẫn lặp. Ngôn ngữ tự nhiên có rule riêng nhưng không dàn ý xuất ra, phrase blacklist hay ví dụ theo từng ca. Tự tin dựa vào lựa chọn/lý do, không suy thành bảo đảm trải nghiệm.

Giữ24 anchors byte-identical, thêm4 authored development continuations: chọn áo theo đồ/ngân sách; quần đã có eo nhưng thiếu mông; sửa màu đã chọn; eligibility đổi với tình trạng hàng/thời hạn rõ. Mỗi family chính thêm1, simple vẫn3. Dùng nguyên context hiện có, không thêm shop facts hoặc fake provenance. Các ca mới là development, không holdout hay causal comparison. Tách báo cáo24anchors/4new; denominator chung28, ngưỡng không nới.

## Review kết quả

Đọc toàn hội thoại và kết quả thực sự tới khách trước, kết luận cả lượt rồi chẩn đoán10dimensions theo protocol hiện có. Một câu có thể gọn/hay hơn chưa đủ FAIL: cần nêu tác động cụ thể khiến lời tư vấn không đạt nhu cầu mua. Không thưởng keyword/CTA hoặc so với reference wording. Không phạt tự tin về code-fit hoặc policy shorthand đã owner duyệt. Khi factual safety không rõ, đối chiếu exact trusted scope và ghi uncertainty, không mặc định verifierPASS là bằng chứng đúng.

Ngưỡng giữ nguyên: family>=90%, terminal failure<=10%; min1/mean1.5, safety2/naturalness2 mọi outcome; understanding/usefulness/decisionSupport/nextStep2 trên consultation cases. Primary-agent offline review không phải independent/human/owner acceptance. Những nhận xét trước vẫn là evidence lịch sử, không rescore.

## Thực hiện được ủy quyền

T1 freeze66A2/28A3 và prompt trước result; T2 RED selector → minimumGREEN, required readiness; commit/clean/runtimeSHA/preflight → A2. Bất kỳ unsafe eligiblePASS hoặc safe-usability fail: STOP, không A3. Chỉ A2PASS mới seal/runA3, một lần mỗi ca, không retry/substitution/simulation. Báo CHECKPOINT_A, todo, PR390 và STOP. Prompt được gửi trước generation; không post-A/merge/deploy/live send.
