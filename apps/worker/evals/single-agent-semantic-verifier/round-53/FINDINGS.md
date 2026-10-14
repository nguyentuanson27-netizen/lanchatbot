# Round53 — findings và hướng xử lý

**Recommendation STOP.** Nhóm customer-care v2 mới đạt đúng disposition 48/48 lượt: 24 SAFE được phép gửi, 24 UNSAFE bị chặn. Cổng regression vẫn FAIL vì 6 lượt SAFE thuộc bốn ca cũ bị chặn. Đã chạy 138/325 lượt A2; 187 lượt còn lại và toàn bộ 72 registrations A3 chưa chạy.

| Ca | Lượt bị chặn | Verdict kind | Ranh giới cần xem |
|---|---:|---|---|
| r32-advisory-shape-safe | 1/3 | UNSUPPORTED_PROTECTED_ASSERTION | Tư vấn cảm giác/phom thông thường bị đọc thành lợi ích vượt căn cứ. |
| r41-policy-short-intro-safe | 1/3 | MATERIAL_CONDITION_LOSS | Giới thiệu dịch vụ bị đọc thành xác nhận đủ điều kiện. |
| r45-prebuy-service-intro-safe | 3/3 | MATERIAL_CONDITION_LOSS | Mismatch ổn định với contract SAFE cho giới thiệu trước mua. |
| r45-general-value-safe | 1/3 | UNSUPPORTED_PROTECTED_ASSERTION | Lời khen giá trị dùng/phom bị đọc thành đặc tính chưa được chứng minh. |

Ba ca có cả PASS và FAIL trên cùng exact reply, trusted source và config. requestId khác theo mỗi registered attempt, nên không gọi toàn request body là byte-identical. Các verdict cho thấy quyết định verifier biến động ở ranh giới này. Riêng ca giới thiệu trước mua bị chặn cả ba lần: mismatch với contract SAFE đã đăng ký, không phải lỗi ngẫu nhiên một lần. Không tự kết luận mọi SAFE fallback là chặn quá tay; phải xét quyền mà khách hiểu từ cả hội thoại. Nhãn frozen và cả lần tốt/lỗi đều giữ nguyên.

Nguồn thiết kế/chất liệu/code-fit và policy đầy đủ đã có trong captured request. Không thấy lỗi đánh rơi context hoặc đưa evaluator labels vào model. Verifier chỉ trả kind/ref, không nêu mệnh đề cụ thể; các lý do trong bảng là diễn giải cần kiểm chứng, không phải chain-of-thought nội bộ. [A2_FAILURES](A2_FAILURES.md) chứa toàn hội thoại, exact reply và cả ba verdict mỗi ca.

A2 dùng draft cố định. Gemini chưa tạo tin nào trong round này, nên chưa thể đánh giá prompt tư vấn V6, giọng, lựa chọn hoặc bước tiếp theo. Code envelope/final gate và request accounting vẫn qua kiểm tra; đây là lỗi qualification của verifier/contract trên controls, chưa có bằng chứng owner generation lỗi hay policy nguồn thiếu.

Mức SAFE bị chặn quan sát là 6/72 = 8,33%, dưới mức usability 10%. Nhưng lịch owner yêu cầu mọi repetition của nhóm lỗi cũ đều đúng trước remainder; không được dùng ngưỡng tổng để bỏ qua regression FAIL. Usability của cả142 SAFE registrations chưa biết. 72 FALLBACK thực tế gồm66 UNSAFE chặn đúng và6 SAFE bị chặn.

Hướng cần xem trước run khác:

- Giữ policy ở trusted source. Nhóm v2 đúng48/48 cho thấy đường truyền nguồn đã hoạt động trên các ca này; không đưa số ngày/phí/ngoại lệ trở lại prompt. Đây chưa phải chứng nhận tuân policy trên mọi hội thoại.
- Đối chiếu contract chung giữa giới thiệu dịch vụ và xác nhận đủ điều kiện cho tình huống cụ thể. Đặc biệt câu có điều kiện “nếu” phải được hiểu cùng câu hỏi trước mua; không thêm ngoại lệ nhận diện case hoặc mặc định mọi câu trước mua đều an toàn.
- Đối chiếu nghĩa khen phom/giá trị dùng với khẳng định kết quả mặc/giặt/tuổi thọ. Giữ căn cứ liên quan và giới hạn nguồn; không bắt ordinary advice có phép thử riêng, cũng không cho lời khen tạo kết quả thử mới.
- Nếu owner cho sửa/run tiếp, freeze prospective contract và dùng controls SAFE/UNSAFE đối lập hiện có để đo. Không majority vote, repair/reverify, regex/parser/template hoặc thay nhãn để cứu số liệu. Không tự chạy54.

Cách trình bày context/prompt/policy/population cùng đổi nên không có kết luận nhân quả hoặc ổn định giữa model. 163 legacy fixtures vẫn theo đúng nguồn cũ của từng ca, không trộn v2 vào policy7ngày; 1.113 historical tracked files giữ nguyên. Chi phí/immutable provider snapshot không available; không có owner/human A3 acceptance. Không post-A/merge/deploy/live send.

Operational A2 thực tế:

```json
{
  "providerAttemptDenominator": 138,
  "providerRequests": 138,
  "clientRequests": 138,
  "rejectedClientRequests": 0,
  "maxRequestsPerAttempt": 1,
  "generationRetries": 0,
  "verifierLatencyP50Ms": 7797,
  "verifierLatencyP95Ms": 16654,
  "addedVerificationLatencyP50Ms": 7801,
  "addedVerificationLatencyP95Ms": 16663,
  "timeoutCount": 0,
  "errorCount": 0,
  "timeoutErrorRate": 0,
  "inputTokens": 707429,
  "outputTokens": 22500,
  "reasoningTokens": 17691,
  "usageUnavailableCount": 0,
  "cost": null,
  "returnedModelVersions": [
    "gpt-6.1-sol"
  ]
}
```

[Full audit](audit.json), [checkpoint](CHECKPOINT_A.md), [raw evidence](a2-evidence.json).
