# Policy application model run — 2026-10-20

Owner yêu cầu chạy sau fix89ab6cc6. Chỉ8registered slots/max16generations, không full B hoặc A2/A3; không tự nối vòng. Gemini3.5FlashLiteHIGH tư vấn, GPT6.1Solhigh verifier; cấu hình/model/prompt/schema/fallback trong REGISTRATION.json. Mỗi slot1owner+≤1verifier, mỗi generation1request/retry0. Lỗi giữ denominator, không mẫu bù hoặc sửa giữa run.

Reuse advice-diagnostic.mjs: current-policy public world replay, tools off, verifier mandatory sau hard precheck rồi final deterministic gate. Không phải live send eligibility/tool/state integration hoặc full sales readiness. Actual fallback là outcome được chấm, không lấy rejected draft làm actual.

## Frozen population

1–3: exact customer text/history của b1-policy-used-v2,3lần độc lập.
4: chỉ ướm bên ngoài, hỏi đổi size.
5: nói “thử” nhưng chưa rõ đã mặc vào hay chỉ ướm.
6: hỏi thời hạn/phí.
7: báo đường may bị lỗi, mặc vào mới thấy; không áp điều kiện đổi tự nguyện để tự từ chối xử lý lỗi shop.
8: cùng câu hỏi6 với snapshot7ngày/25k riêng, hợp schema.

Slots1–7 dùng cùng policy đọc từ PostgreSQL active pointers hiện hành qua resolver/projection code saufix; giữ những field nguồn khác trong context công khai của ca cũ. Slot8 dùng fixture policy hợp schema chứa cùng customerCare, chỉ đổi exchange.windowDaysFromReceipt và exchange.totalTwoWayShippingFeeVnd; nguồn tổng thể là synthetic fixture với identity riêng, không source override/live mutation. Do đó đây là control theo nguồn, không so sánh hai policy live. Chuẩn bị có0generation; capturedAt của replay mới ghi trong input. Không hardcode policy shop vào prompt hoặc thêm ví dụ đáp án.

## Review trước khi đọc diagnosis

Chấm toàn actual outcome theo hội thoại và snapshot: kết luận đúng điều khách đã làm/đang hỏi; không duyệt hồ sơ khi chỉ có SHOP_RULES/orderEligibility:null; hỏi đúng điều còn thiếu nếu có thể đổi kết luận; không đọc checklist dài hoặc hứa xử lý ngoài khả năng. Nhánh lỗi shop có thể cần xác nhận lỗi trước khi duyệt. Lời giải thích ngắn/dẫn chứng hữu ích được phép; không chấm bằng từ khóa/số câu. Static fallback, đồng ý sai, tự từ chối khi chưa rõ hoặc áp nhầm quy định là chưa đạt.

Ghi primary cho đủ8 trước diagnosis draft/verifier, không sửa nhãn lịch sử. Reviewer verdict là đánh giá agent, không human adjudication. Run8/8 dùng được và không lỗi quyền lợi là tín hiệu đạt trên population này;3lần ca cũ không chứng minh ổn định chung. Báo riêng token/cost/latency/provider error, protocol errors và denominator. Không tự tuyên bố B/live GO.

## Provenance

Freeze code/input/config trước generation, commit và require clean source; runtime HEAD ghi ngoài frozen source, preflight rồi chạy một lần. Dùng launcher credential route sẵn có, không substitute provider/model. Toàn8offline owner projections không có evaluator labels; sau run kiểm lại captured owner/verifier requests, source/hash/bindings/accounting. Không ghi credential hoặc dữ liệu khách vào artifact.
