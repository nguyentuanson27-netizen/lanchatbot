# J1 baseline native — 08/11/2026

**Đã chạy đủ2ca/N1:2SEND_ELIGIBLE,0fallback/handoff,6generation/6HTTP, không retry.** Đây là diagnostic trên bản nền, không phải A/B hoặc Phase C qualification.

[Toàn bộ hội thoại](CONVERSATIONS.md) · [Metrics](METRICS.json) · [Request/capture checks](INTEGRITY.json) · [Provenance/commands](PROVENANCE.json).

## Kết quả và review toàn lượt

| Ca | Actual path và kết quả | Nhận xét |
|---|---|---|
| J1 hỏi tổng | Owner gọi quote_product(SV2447, AO, quantity2) rồi trả978.100đ:998.000đ tiền2áo +30.000đ ship −49.900đ ưu đãi. Verifier PASS, exact text được isolated Outbox chấp nhận. Không hỏi màu, cart vẫn null, không có receipt giỏ mới. | Hoàn thành việc báo tổng bằng code trên input này. Hai size M/L được giữ trong lời đáp. Phản hồi vẫn dùng ngoặc để chứa chi tiết giá; không sửa giọng ở lượt chạy này. |
| ACK màu be | Owner chỉ đề xuất apply_customer_state cho preference.colors=[be], sau đó trả lời. Profile readback revision2 đúng be; không mở quote/read_product/media task, không tạo giỏ. Verifier PASS và exact text accepted. | Không gặp chuỗi tool thừa từng quan sát ở primary. Câu “Chị có cần em hỗ trợ xem size hay tư vấn thêm...” vẫn kéo dài một lời cảm ơn; tính từ “nhẹ nhàng, bay bổng, rất tôn da” còn chung chung. Ghi limitation về độ gọn/hữu ích, không tính SEND_ELIGIBLE là chất lượng tư vấn xuất sắc. |

Cả hai case có2owner+1verifier. proposed native calls mỗi ca1; số primitive tool-work và số invocation là các counter khác nhau, không gộp chúng thành generation. Không lỗi provider hoặc unknown completion. DB test đã drop; không có live customer send.

## Điều có thể kết luận

- Đường quote-product bản nền thực thi được đến terminal đúng, không cần metadata B hoặc giỏ để báo tổng trong ca này.
- ACK trong sample này ghi sở thích rồi trả lời, không có price/media dependency. Hai primary ACK trước đó chọn tool thừa chưa phải bằng chứng customer failure ổn định; lần native này không lặp lại lựa chọn đó.
- Giữ bản nền; không adopt metadata B. Conditional A/B của vòng trước vẫn NOT_RUN; đây là registration mới riêng2ca.
- N1 và fresh world khác lần trước: không suy ổn định hoặc quy cải thiện cho thay đổi runner. Prompt/runtime bán hàng không thay đổi. Không mở vòng vá prompt vì câu hỏi nối này.

**Chưa có Phase C GO**: không chạy lại full population hoặc C3 comparison, không có chấm mù whole-reply mới. Đây là review thủ công của coding agent sau khi đã có đủ output, không phải judge model độc lập.

## Provenance và vận hành

Run source6ac0eb783a3dba2e5641d503cfc222d74f2b0f5f; source sạch trong dispatch và khi audit sau run. World mới551b7fc0ae29d7f87b66250e7c4d6f4c5b38495b8fb01589c5604f232efee3ba,107products, giữ các isolated test assumptions đã được owner duyệt. Không sửa timestamp nguồn cũ.

Owner Vertex Gemini3.5FlashLite HIGH; verifier GPT6.1Sol HIGH qua CodexCLI0.159.2/cùng login. Source/credential route cũ, không đổi API/model/provider/effort. Maximum8generations; actual6. Token exposed58.463input/3.845output; cost không expose. Một OAuth HTTP được ghi riêng, không tính thành generation. Verifier N2:5.695ms và5.908ms; mẫu nhỏ không cho kết luận latency ổn định. Không có số đo E2E wall-clock riêng.

Preflight đầu do mình yêu cầu thêm ảnh riêng TOP đã fail, generation0. Gate mở đầu hiện hành chỉ yêu cầu GENERIC cho sản phẩm; cả hai nguồn có ảnh GENERIC hợp lệ. Đã sửa đúng phạm vi kiểm tra trước provider, giữ input hội thoại/ảnh gate/runtime nguyên vẹn và retain failed preflight. Không thêm giả định shop mới, không dùng kết quả model để điều chỉnh ca. Chuẩn bị đầu vào có source readiness, actual lifetime và prompt/model hashes; source clock không được gia hạn.

Automation đối chiếu6claims/6results/6wire requests với ledger và integration counters, request hashes, model/effort, evaluator firewall, không có metadata B và2exact verifier-draft→accepted-text/hash bindings. Không claim exhaustive final-gate replay. Raw signed content giữ ngoài repo, public hội thoại chỉ in exact customer-visible text.

Commands thực chạy: capture-world qua credential/source wrapper; input readiness/seal; isolated-integration BASELINE_NATIVE; audit actual artifacts; publication hash/link/whitespace checks. Không chạy lại worker build/typecheck/lint hoặc suite trong lượt execution này; implementation898PASS/2SKIP và focused32PASS là evidence của commit trước, không phải kiểm tra được chạy lại ở lượt này. Không gọi reviewer/provider sau6attempts, không merge/deploy.
