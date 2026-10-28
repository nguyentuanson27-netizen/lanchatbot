# Full B1/B2/B3 — offer, capability and advice correction

Owner yêu cầu “chạy model đi” sau commit950d05b4. Chạy toàn bộ24B1+8stateful một lần/ca, giữ mọi lỗi/fallback/dependent block, không retry hoặc thay mẫu. Tối đa124 generation requests. Hoàn thành toàn bộ các population, không dừng giữa chừng do chất lượng.

Dùng current owner prompt, adapter và manifest; verifier/models/corpus/source routes không đổi. Có provider/source preflight và deterministic COD/BANK disposable checks trước provider. Source read-only; state/effects chỉ trong test DB; delivery capture-only. Không live send/deploy/promotion.147focused tests và worker build đã PASS trên950d05b4; chỉ thêm registration/wrapper copy/scope ở đây.

Clean commit trước preflight; runtime ghi HEAD ra output, không ghi ngược vào frozen source. Raw commit trước primary whole-turn review, primary lock trước rejected-draft/verdict diagnosis. Chấm khả năng bán hàng, lựa chọn, lý do, giọng và bước tiếp theo theo toàn bộ history/actual terminal; cho phép inference thẩm mỹ/chất liệu thông thường và upsell phù hợp, minor polish không tự thành FAIL. Không chấm keyword/câu mẫu, không ép áo lẻ/rẻ nhất/câu hỏi kết thúc. So với vòng reply-focus trước, tách thay đổi thật trong reply khỏi variance; N1 không chứng minh ổn định hoặc nhân quả.
