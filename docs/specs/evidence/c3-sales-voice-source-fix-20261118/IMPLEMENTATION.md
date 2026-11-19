# P1/P2 — sửa nguồn lời văn quy trình, 18/11/2026

Code source `7fb18936468c4e4df02e7cb5784650e8d21bebf0`, implementation base `5d5d0300cba024d270119e35e357b26777b8e541`. [Plan](../../c3-phase-c-sales-voice-source-fix-plan-20261118.md) · [Review độc lập APPROVE CODE](INDEPENDENT_REVIEW.md) · [PR392](https://github.com/nguyentuanson27-netizen/lanchatbot/pull/392).

## Bản sửa

P1: `pendingSupportView()` không còn suy ra khách chưa chọn mua khi thiếu pending purchase. Chỉ trả KNOWN COLOR/SIZE khi có record khớp product/offer; giỏ đủ điều kiện trả KNOWN với mảng rỗng. Thiếu bằng chứng hoặc yêu cầu khác giỏ trả UNKNOWN với mảng rỗng. Cả câu khách chỉ hỏi giá và câu khách nói mua đều nhận UNKNOWN nếu chưa có bằng chứng cấu trúc. Code không phân loại lời khách để đoán ý định.

P2: projection owner bỏ prose `meaning` tại đúng các field hỗ trợ giá, trên header và kết quả tool của cả continuation/final. Snapshot cũ có CUSTOMER_PURCHASE_CHOICE đọc thành UNKNOWN. Giữ status/by/when, target, tiền, ưu đãi, operation/receipt và các điều kiện chưa được cấp. Không ghi đè kết quả tool lịch sử bằng state mới. Nguồn canonical của verifier, accepted history, signed native parts và call IDs giữ nguyên.

Thay đổi tám file, +180/−48 dòng; thêm hai hàm projection cùng trạng thái waitingForStatus, không thêm role hoặc tầng suy luận. Prompt, model/config, bound owner 70.000 byte và budget tool/generation giữ nguyên. P3 chưa mở. Không thêm parser, regex, template trả lời hay sửa câu model sau generation. Giá/size/policy/media và domain eligibility của hỗ trợ không đổi.

## RED → GREEN và hồi quy

RED quan sát trước implementation: bốn test effects không nhận được trạng thái mới; hai test wire vẫn thấy prose và legacy fallback. Đã sửa tối thiểu và thêm trường hợp giỏ thay đổi, pending khác product/offer, missing SIZE/COLOR, cũng như kết quả tool lịch sử sau khi hỗ trợ đã được xét.

Lệnh thực sự chạy từ repo root:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-callable.test.ts src/single-agent-commerce-owner-view.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot
```

PASS **412/412**, bảy file; gồm owner/effects/quote/boundary/callable và protected claims.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-handoff.test.ts --reporter=dot
```

PASS **329/329**, năm file, trên exact code commit. Tổng hai nhóm worker **741/741**.

```powershell
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs
```

PASS **142/142** sau khi thêm regression header đã settled. Bao phủ hai pha wire, điều kiện tool, lịch sử, nguyên bản đầu vào và request verifier thực dựng từ nguồn canonical.

```powershell
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
git diff --check
```

Cả bốn PASS; build gồm prebuild dependency chuẩn. Lint của worker là typecheck noEmit. Không sửa source shared package. Reviewer độc lập tự chạy thêm 174 test Vitest và 18 test wire; đây là kiểm lặp các nhóm trên, không cộng vào 741/142.

## Giới hạn

**0 request hội thoại/verifier/judge để đo model** trong implementation này. Chi phí agent coding/review không phải request đo chatbot. Không có hội thoại mới để kết luận giọng hoặc sức thuyết phục đã tốt hơn. Không dùng lại kết quả 5/5 ở source cũ làm bằng chứng cho source này.

Sàng lọc tám cặp, native J4/control và P3 trong plan đều NOT_RUN. Qualification toàn Phase C giữ STOP; lỗi guard final sau BUILD vượt bound đã ghi trước đó chưa được xử lý trong scope này. Chưa kiểm transaction PostgreSQL mới hoặc remote CI trên head cuối trong lượt implementation này. Không deploy, live send, nguồn shop write hay thay lịch sử model cũ.

Code đã qua review và hồi quy; phép đo model hữu hạn theo plan là bước xác minh chất lượng còn lại.
