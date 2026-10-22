# Phase B — evidence nối tác vụ còn thiếu

Ngày22/10/2026. **IMPLEMENTATION_IN_PROGRESS** theo [kế hoạch](c3-phase-b-missing-capabilities-plan-20261022.md), implementation base `1aa3a1d3`. Candidate vẫn cô lập; không production wiring, live send hoặc migration vào dữ liệu thật.

## Savepoint N1/N2

- N1: candidate hỏi một checkout field, dùng active clarification để route private trước history/model. Bare name có syntax hẹp và street address có số nhà được nhận theo field đang hỏi; câu hỏi không bị ghi làm tên. Input mơ hồ được hỏi lại riêng tư theo retry budget hiện hữu. Không thêm generic Vietnamese parser hoặc model extract PII. Tên viết khác syntax hẹp/địa chỉ không số nhà có thể cần field có nhãn; chưa nhận hỗ trợ mọi cách diễn đạt.
- Dừng checkout reuse classifier từ chối xác nhận hiện có, clear clarification và giữ giỏ; có thể yêu cầu đặt lại và tiếp tục field thiếu. Không dùng checkoutDraft tồn tại như pending flag. Multi-field legacy path giữ mặc định cũ; chỉ candidate truyền SINGLE_FIELD.
- N2: đọc tối đa30candidate history rows rồi lọc và giữ8public messages/4.096byte như cũ. Captured owner request không duplicate latest, không có private markers. N1 input pending bị drop toàn message khỏi public history và cả hai model không được gọi.
- RED observed: bare name/address không capture và invitation hỏi nhiều field (3fail); query limit8 thay30 (fail); pause không clear clarification (fail). GREEN hiện106focused tests, gồm75legacy sales-cycle regressions.
- Chưa chạy real PostgreSQL/capture integration cho savepoint này; chưa chứng minh toàn bộ acceptance N1/N2 hoặc natural language quality. Không có provider generations.

Commands thực sự chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-session.test.ts
# RED3, sau sửa mở rộng đến các commands dưới.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts
# RED cho history; pause được tái hiện riêng sau sửa assertion null của test.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts
# RED pause.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-checkout.test.ts src/realtime-sales-cycle.test.ts
# GREEN106/106.
pnpm --filter @lana/worker typecheck
# PASS (bao gồm pretypecheck builds).
```

## Còn phải thực hiện

N3a focus/ad bridge; N4 ảnh ra; N5 media intake/staff linkage; N6a public image input; N7 negotiation event; N8 harness và real-DB/capture/model coverage theo prerequisites. N3b terminal-focus và N6b customer-image privacy/recognition vẫn cần chốt contract, không tăng model/tool budget hoặc bypass privacy. Worker build/lint và focused regressions tương ứng phải chạy sau các thay đổi cuối.

## Savepoint N3a

Ingress xác minh catalog refs từ mã khách vừa nhắn, code trong adTitle và currentProductId đã lưu. Explicit verified ref thắng ad hint; ad chưa xác minh không tái dùng mẫu cũ. Source facts vẫn được prepare/readback như cũ; không lấy read_product cuối làm lựa chọn focus. Không implement N3b/tool round3 hoặc adId→product mapping giả.

Observed RED4/22 ingress tests; GREEN78/78 ingress + read-only-tools + session tests bằng:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-session.test.ts
```

N3a mới có focused evidence, chưa real-DB/provider journey; không nhận N3b đã hoàn thành. J10 candidate đã bổ sung điều kiện chỉ gửi biên lai sau actual QR/payment instructions đúng payment context; giữ incomplete/failure bước trước khi chưa cấp được QR.
