# Phase C — ưu tiên dữ kiện trong phản hồi owner

**Triển khai và preflight offline PASS. Review độc lập APPROVE. Phase C vẫn STOP.**

- Source triển khai và review `8cfba71f258e36e3120cd496c5ca949fd0a1f3b7`.
- Baseline code `f82d308b2ea0ebe4ae6fe69713c04157405bce52`. Kế hoạch duyệt tại `39ed83b7bbb69d72b71ee747d5bd91a1e5ed98a2`, SHA256 `46c16cf5639d1c6d2eb41dd69df2070a84fe68213da54fe0347baa8e2cc8d296`. [Kế hoạch](../../c3-phase-c-owner-reply-evidence-plan-20261119.md).
- Prompt owner `7f87a56de66eb9e313a7c29642e0f7233645c33d9417a057d8e343070d15bdd5`. Cấu hình đăng ký Vertex AI `gemini-3.5-flash-lite`, High, cùng prompt/cấu hình giữa hai nhánh. Judge A/B đã đăng ký GPT-6.1 Sol High.
- Seal local `4ac0ba84a775cb5a20f793389cf6665f59cf667ac92767d1ed6d791718ef7f55`, rubric `2dc0ba644c64d434f5744dc7467642060d8f236627f410d378885f1e49e2cbc2`. Raw wire và seed giữ ngoài repo.

## Thay đổi và đối chứng

Projection chỉ chạy trong owner view Compact V2 trên cặp call/result khớp. Tổng tiền cần bằng chứng còn hạn gắn đúng khách, giỏ, sản phẩm và phần bán. Tình trạng bán theo màu cần đủ biến thể trong đúng phạm vi truy vấn. Dữ liệu nguồn, prompt, tool mode, nội dung khách, model parts và quyền gửi giữ nguyên.

| Capture | Điều kiểm được offline | Text bytes baseline → candidate |
| --- | --- | ---: |
| P06 | Tổng 1.019.000đ lên đầu. Bỏ đúng thẻ báo giá trùng. | 58.096 → 58.032 |
| S04 | Áo lẻ q=1 có trắng sẵn, be đặt trước, cùng phạm vi size đã xác minh. | 39.770 → 40.084 |
| S15 | Cùng bằng chứng theo màu. Thẻ giá vẫn còn. | 59.767 → 60.025 |
| J4/T3 | Tổng 499.000đ. Phí mặc định của shop. Hỗ trợ ở trạng thái đã báo giá và chưa áp dụng. | 64.176 → 64.231 |
| J2/T2 | Hai request giống hệt từng byte. | 53.880 → 53.880 |
| ADS | Hai request giống hệt từng byte. | 56.048 → 56.048 |

Kiểm ADS qua ingress trên các đường `read_product`, `quote_product` có tổng và `quote_product` hai phần bán. Script đọc từ request Compact V2, xác minh tên mẫu, giá đúng phần, chất liệu, phom, size còn và nhóm Outbox gồm đúng tin cùng ảnh sản phẩm. Đây là test fixture với owner được kịch bản hóa.

## Review độc lập

Reviewer phát hiện nhãn phí ship có thể khiến owner hiểu nhầm thành mức riêng theo vùng. Đã sửa để gửi phí mặc định theo engine, giữ vùng là phạm vi của câu hỏi. Test quan sát 2 RED rồi 8 GREEN. Review tiếp phát hiện fixture ADS mới kiểm raw tool result. Đã đổi fixture sang dữ liệu thực gửi cho owner và xác minh cả nhóm gửi. Reviewer chạy độc lập 8/8 test projection, 6/6 test ingress và kiểm seal 9 cặp, 0 request provider trước khi APPROVE exact source. Một lần chạy lạnh lúc nhiều tác vụ đồng thời chạm timeout 5 giây và qua khi chạy riêng.

## Xác minh

```text
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-read-only/owner-reply-evidence.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/selection-compact-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-qualification/diagnostic.test.mjs
pnpm --filter @lana/worker exec vitest run --reporter=dot src/realtime-sales-cycle.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-quote-routing.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-read-only-tools.test.ts src/size-chart-eligibility.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm check:dataset-boundary
git diff 39ed83b7 HEAD --check
node apps/worker/evals/single-agent-commerce-qualification/owner-reply-evidence-screen.mjs ../c3-owner-reply-evidence-8cfba71f-20261119060931093 ../c3-phase-c-full-992e360f-20261119-110449 ../c3-sales-context-native-9a65450f-20261115-151018/CONTROLS
```

Kết quả cuối: 159 test Node, 786 test worker, build, lint/typecheck, dataset boundary, diff check và preflight đều qua. Lần đầu chạy đầy đủ song song build chạm timeout 5 giây ở ba test import adapter đã có. Cùng lệnh chạy sau khi build xong qua 786/786.

**0 provider request mới.** Preflight đã đăng ký 9 cặp. A/B đọc toàn lượt và native 6 ca/10 lượt còn chờ thực thi. Chưa có kết quả về mức cải thiện tư vấn hay điều kiện qualification. Lỗi tư vấn size P07 còn mở.
