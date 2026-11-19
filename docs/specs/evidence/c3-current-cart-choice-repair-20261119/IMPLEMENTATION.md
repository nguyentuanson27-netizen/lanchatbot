# Sửa bằng chứng ưu đãi hiện hành và bước chọn mua

Ngày 19/11/2026. Implementation base `2e292e7b8e72e7fa58cf90714c1395c528252cfd`, nhánh PR392. Theo yêu cầu owner “sửa code đi” sau review độc lập phương án. Không chạy provider, không gửi khách hoặc ghi nguồn shop. Phase C vẫn STOP chờ đo lại.

## Phạm vi đã sửa

- **Verifier:** cartQuote hiện hành cùng cartBinding/cartItems chứng minh tổng và appliedAdjustments đang có; không cần receipt mới để mô tả miễn ship hiện hữu. Claim thao tác mới vẫn cần receipt tương ứng. Không lấy tool history làm quyền, không thêm parser nhận diện lời văn. Final gate và revalidation giữ nguyên.
- **Replay pending trước giỏ:** chỉ cùng operation/source event đã xử lý mới được dùng lại. Kiểm quyền và sourceQuote trước, kiểm policy hiện hành và toàn bộ proof pending trước khi trả. Giữ nguyên source/hash/thời điểm/hạn, không ghi state, không tạo receipt hoặc báo effect mới. Giỏ đã mở tiếp tục dùng cơ chế replay/NEGOTIATION_EVENT hiện có. Tin mới cùng sản phẩm giữ identity mới, không bị gộp thành lời xin cũ.
- **Context lựa chọn:** quote_product đặt choiceOptions cạnh giá, chỉ từ selectionEvidence hợp lệ và có hash trong runtimeProducts hiện tại. Ghi rõ query nguồn (qty1, chưa lọc size nếu đúng như vậy), màu được nguồn ghi, completeness và purchaseStock=NOT_CHECKED. Không tạo pendingPurchase từ quantity hoặc suy ý định mua. ADD vẫn kiểm đúng màu/size/số lượng.
- **Owner prompt:** thay các đoạn hiện có để phân biệt lời xin hỗ trợ mới với hỏi lại tổng; tiếp tục từ ý muốn mua và hỏi lựa chọn còn thiếu, không mời chốt lại sau câu hỏi tổng đã đủ dữ kiện. Không thêm ví dụ riêng cho J4/control, regex hoặc luật cấm từ mới. Owner prompt từ 22.632 xuống 22.601 byte; cập nhật hash owner/verifier trong manifest.

Review phương án ban đầu yêu cầu sửa vì nguy cơ nuốt yêu cầu thương lượng mới. Implementation dùng giới hạn chặt hơn: **cùng source event đã xử lý**, không chỉ cùng product/offer. Sau self-review, reviewer độc lập **APPROVE CODE** tại `cdbbaa99fc08aadc2ded657a4465242fc094daac`, không có finding cần sửa; tự chạy 359 test và hai dạng wire probe PASS. [Kết luận review](INDEPENDENT_REVIEW.md).

## Kiểm tra thực chạy

RED quan sát trước sửa: 3 FAIL / 3 PASS trong nhóm sáu kiểm tra được chọn. Thiếu choiceOptions, replay vẫn mang effect, và replay vẫn thành công khi policy đã đổi. Sau implementation, nhóm effects/quote/owner/boundary 359 PASS; bộ mở rộng cuối **1.273 PASS / 38 file**, **134 PASS Node / 8 file**. Các lượt chạy nhóm nhỏ chồng lặp, không cộng vào tổng 1.273/134. Sau chỉnh gọn prompt, chạy lại 26 kiểm tra protocol/owner-context: PASS. Self-review cuối làm rõ câu cũ trong verifier rằng quote trước giỏ không thay receipt thao tác, tránh xung đột với quyền mô tả ưu đãi hiện hữu; kiểm lại protocol/owner-context/verifier trên prompt cuối: 30 PASS.

Đối chứng phủ: quote qty2 từ source qty1 không tạo stock proof hoặc ý định mua; source thiếu/sai hash/sai target không sinh choiceOptions; replay giữ nguyên state và không có receipt trong request mới; source text đổi dưới cùng message ID bị từ chối; policy/expiry/permission/sourceQuote sai không được reuse; tin mới vẫn ghi request mới; thương lượng sau giỏ tiếp tục giữ từng evidence ID. Hai draft miễn ship thực tế được dùng để kiểm wire/context và final gate với verifier scripted PASS, **không phải kiểm model đã hiểu đúng hai câu**. Thay revision/recipient/permission/cart hoặc hết freshness làm PASS cũ mất hiệu lực.

Các lệnh dưới chạy trong `apps/worker`, trừ lệnh ghi chú root:

```powershell
pnpm exec vitest run src/single-agent-commerce-quote.test.ts src/single-agent-commerce-effects.test.ts -t 'source colour choices|reuses the exact pending|does not reuse a pending'
pnpm exec vitest run src/single-agent-commerce-quote.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-owner-view.test.ts src/single-agent-semantic-verifier-boundary.test.ts --reporter=dot
$commerceTests = @(rg --files src | Where-Object { $_ -match 'single-agent-commerce.*\.test\.ts$|single-agent-semantic-verifier-boundary\.test\.ts$|track-b-protected-claim-boundary\.test\.ts$' }); pnpm exec vitest run @commerceTests --reporter=dot
node --test --test-concurrency=1 evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/gemini-inference.test.mjs evals/single-agent-commerce-read-only/gemini-verifier.test.mjs evals/single-agent-commerce-read-only/owner-sales-context.test.mjs evals/single-agent-commerce-read-only/selection-result-wire.test.mjs evals/single-agent-commerce-read-only/provider-retry-wire.test.mjs evals/single-agent-commerce-qualification/native-wire.test.mjs evals/single-agent-commerce-qualification/support-source-screen.test.mjs
node --test --test-reporter=dot evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/owner-sales-context.test.mjs
node --test --test-reporter=dot evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/owner-sales-context.test.mjs evals/single-agent-commerce-read-only/gemini-verifier.test.mjs
pnpm exec tsc -p tsconfig.json --noEmit
pnpm lint
```

Lệnh đầu là RED trước sửa. Một lượt kiểm quote/effects ban đầu có một FAIL vì fixture tưởng candidateEvidence=false sẽ tắt evidence nhưng composition vốn bật nó; sửa fixture để thật sự loại/corrupt evidence ở adapter kiểm tra, không đổi production để né lỗi. Một lệnh glob Vitest không mở rộng trên PowerShell chỉ chạy hai file/90 test; không dùng nó làm bằng chứng bộ mở rộng. Lệnh `$commerceTests` ở trên thực sự chạy đủ 38 file.

Root commands:

```powershell
pnpm --filter @lana/worker build
pnpm check:dataset-boundary
node docs/specs/evidence/c3-current-cart-choice-repair-20261119/probe-capacity.mjs ../c3-precart-support-native-98bff18b-20261118-160005
git diff --check
```

Worker build cùng dependency prebuild, typecheck/noEmit, lint, dataset boundary và diff check PASS. Không sửa shared package. Chưa chạy full repository check, remote CI hay PostgreSQL integration mới.

## Dung lượng và phần chưa xác minh

[Probe](probe-capacity.mjs) đọc 60 owner request đã capture của native trước, thay prompt hiện hành và chèn payload lựa chọn hai màu đại diện tại quote response, gồm completed tool turns. Đỉnh từ **69.015 lên 69.283 / 70.000 byte**, overflow 0, provider request 0. [Số đo đầy đủ](CAPACITY.json). Đây là probe synthetic trên frame lịch sử; không bảo đảm mọi dữ liệu hoặc hành trình tương lai vừa bound. Không tăng budget hay bound.

Giữ nguyên model, số role, schema verdict, tool/request/generation budget và retry policy hiện hành. Owner prompt hash `7f87a56de66eb9e313a7c29642e0f7233645c33d9417a057d8e343070d15bdd5`; verifier `fa3ab818444aedd06a25a5a4f7956bc25e3162125e109d845430011e2635909c`.

Chưa chứng minh verifier thật sẽ nhất quán, owner hết RECORD thừa ở câu hỏi tổng, hoặc giọng/bước tiếp theo cải thiện. Code không thể phân loại ý định câu khách bằng identity; một tin mới bị owner gắn nhãn sai vẫn có thể đi đường record mới. Kiểm thực tế cần run identity/source/config mới, init/seal/preflight và giữ đầy đủ attempt, không tái dùng kết quả cũ. Không có GO, merge hoặc deploy trong thay đổi này.

Exact Git blob check phát hiện hash verifier tính theo CRLF sau bước ghi file Windows; đã chuẩn hóa LF, tính lại hash và kiểm cả working file lẫn Git blob khớp manifest. Không thay nội dung prompt. Protocol/verifier tests được chạy lại sau chuẩn hóa.
