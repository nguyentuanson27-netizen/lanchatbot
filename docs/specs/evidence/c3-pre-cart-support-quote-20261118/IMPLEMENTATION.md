# Báo giá hỗ trợ trước giỏ — đã triển khai, 18/11/2026

Base `0291d37c830b120e6f794e63d1b25b83041b3a51`; exact code **`ecdbf32591941f65ed31798a7b021445160da46d`**, [review độc lập APPROVE CODE](INDEPENDENT_REVIEW.md). [Plan](../../c3-phase-c-pre-cart-support-quote-plan-20261118.md), [verification](VERIFICATION.json). Đây là lượt implementation, **0 request đo model**.

## Hành vi mới

Trước đây, record_negotiation lưu lời xin nhưng quote_product luôn dùng priceObjectionCount=0. Khách phải vào giỏ mới có kết quả hỗ trợ. Giờ code dùng lời xin đã được xác thực và cùng evaluateShopPolicy để tính giá hỗ trợ trước giỏ, khi quote có quantity rõ ràng. Model nhận tổng và khoản hỗ trợ cụ thể để trả lời khách.

- Chỉ hỏi giá: vẫn giá/ưu đãi thường. Có pending đúng product/offer, episode/profile, policy id/version/hash và còn hạn: tính mức cho lần phản đối đầu. Getter code-only không đọc thêm nguồn hoặc ghi state, không cấp cho model tham số tier/mức giảm.
- Quote đánh dấu QUOTED và NOT_GRANTED, receiptRef=null. Đây là mức giá có thể đề nghị, chưa phải biên nhận ưu đãi đã được ghi vào giỏ. Verifier được phép duyệt giá/quyền lợi trong quote hiện hành; các khẳng định đã thao tác vẫn cần receipt.
- Khi khách chọn mua, đường chọn biến thể và activation hiện có kiểm lại nguồn/policy/số lượng rồi ghi ưu đãi. Cùng đầu vào cho cùng tổng; số lượng thay đổi được tính lại. Đọc quote nhiều lần không tiêu thụ objection hoặc tăng tầng.
- Header giữ ref/target/quantity/tổng. Owner chỉ đọc một bản supportEvaluation; canonical quote/verifier giữ đầy đủ. Tool result lịch sử không bị viết lại.
- Đổi pending làm mới quote từ price/policy đã đọc, không thêm tool/I/O. Đổi giỏ kết thúc quote trước giỏ để final readback không tự đưa thêm một quote mới sau verifier. Thay pending/policy/price/authority hoặc hết hạn làm PASS cũ mất hiệu lực.

Fixture dùng giá 499.000đ và phí 25.000đ: một món từ 524.000đ còn 499.000đ; hai món từ 973.100đ còn 948.100đ. Đây là số từ test synthetic, không phải giá mới đã kiểm live. Quote và giỏ sau activation cho cùng kết quả; phí ship không bị trừ hai lần.

## Phần chỉ dẫn thay đổi

Thay đoạn nghiệp vụ hỗ trợ giá, một bullet giọng, hai tool description và đoạn verifier về pending/quote. Owner dùng mức code đã tính, không bắt khách lên giỏ để biết giá hoặc tự thao tác giỏ của shop. Báo giá hỗ trợ/tổng phải truyền quantity; opening quote không có quantity vẫn chỉ là đơn giá.

Owner prompt từ 22.393 lên **22.632 byte** (+239); verifier từ 17.938 lên **18.597 byte** (+659). Hash mới nằm trong manifest/VERIFICATION.json. Model/provider/effort/config, schema, owner bound 70.000 và tool/generation budgets không đổi. Không thêm ví dụ theo case, regex, parser, router, role hoặc repair loop. Shared package source và production entrypoint không sửa. Tổng diff implementation so với base: 14 file, +234/−28 dòng, gồm plan/test.

## Kiểm tra và review

RED quan sát trước implementation: hai test nhận giá thường/NOT_EVALUATED thay vì mức hỗ trợ; một test owner projection ghi đè QUOTED thành NOT_EVALUATED. Sau sửa GREEN và bổ sung guards về pending sai identity/hash, policy đổi nội dung cùng version, hủy/thay pending cùng tổng, expiry, quote→cart→final gate, đổi số lượng, và quote thường→record sau mà không sửa kết quả lịch sử.

Final **759/759 worker** ở 12 file, **155/155 Node** ở tám file PASS. Canonical worker build có dependency prebuild PASS; final emit compile/typecheck/lint PASS. Test từng phần được chạy lại khi chỉnh compact projection. Một lỗi viết test gọi sai shape finalGate đã được sửa trước kết quả GREEN; không đổi gate để phù hợp test.

Reviewer duyệt thiết kế, working diff, exact `031394a1`, rồi exact `ecdbf325` sau khi bỏ bản trùng ở owner view. Không còn finding. Reviewer tự chạy 275 effects/quote/owner trên bản trước compact refinement, rồi 32 owner và 20 wire ở exact source cuối; không cộng lượt kiểm lặp vào 759/155.

### Các lệnh thực chạy

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts -t "quotes support before a cart" --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-owner-view.test.ts -t "keeps a computed pre-cart support offer" --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-callable.test.ts src/single-agent-commerce-owner-view.test.ts src/track-b-protected-claim-boundary.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-handoff.test.ts --reporter=dot
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs apps/worker/evals/single-agent-commerce-qualification/support-source-screen.test.mjs apps/worker/evals/single-agent-commerce-qualification/sales-context-screen.test.mjs
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
node ../c3-precart-quote-capacity-20261118.mjs
git diff --check
```

Hai lệnh đầu là RED trước sửa; bộ final và các lệnh build/check PASS. Kiểm manifest hashes và so sánh models/bounds/budgets với base cũng PASS.

## Kích thước request và giới hạn

Probe offline trên tám frame cũ, thay prompt/tool description hiện hành và thêm payload hỗ trợ với source id 256 byte cùng hai adjustment. Bản trùng lặp đầu chạm **69.997/70.000 byte**; sau compact header và giữ một supportEvaluation cho owner, đỉnh **69.433/70.000**. [Probe cuối](CAPACITY_FINAL.json), [probe ban đầu](CAPACITY_INITIAL.json). Không tăng bound. Đây là probe dung lượng synthetic, không phải kết quả provider, kiểm nghĩa hay bảo đảm mọi frame tương lai đều vừa.

Chưa chạy model sau sửa, chưa kiểm native J4/control hoặc độ tự nhiên. Không thể dùng điểm replay P1/P2 cũ làm điểm cho cơ chế này. Phép đo kế tiếp cần khóa lại prompt/source/config, nguồn và chạy hành trình từ đầu để kiểm cả giá trước giỏ lẫn receipt sau mua. Chưa có test transaction PostgreSQL mới hoặc remote CI head cuối trong lượt này; domain/CAS/receipt cũ được dùng lại và kiểm hồi quy.

Mức hỗ trợ trước giỏ hiện dành cho lần phản đối đầu đã được code nhận; không tạo ledger thương lượng nhiều tầng trước giỏ. Luồng thương lượng trên giỏ giữ quy tắc hiện hành. **Phase C vẫn STOP chờ đo model**, không deploy/live send hoặc ghi nguồn shop.
