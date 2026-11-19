# Ảnh sản phẩm không tự hết hạn theo tuổi

Owner yêu cầu bỏ giới hạn 30 ngày ngày 04/11/2026. Implementation base: `fb40728c354f46dcbce4c2549cfb9fe3789f8314`; executable source: `62b4ac409ca81092ba8c702ed06259e0f5dd72d5`.

Ảnh catalog đã duyệt giữ hiệu lực cho tới khi nguồn bị thay thế hoặc thu hồi. Producer hiện hành xuất `expiresAt: null`; metadata media có `freshForSeconds: null`. Không đổi ngày quan sát của ảnh, không tạo ngày hết hạn giả, không gia hạn proof bằng cách ghi lại nguồn. Áp dụng xuyên suốt lựa chọn ảnh, canonical facts, protected media claim, capability hint/provider projection, context/readiness và durable Outbox gate.

Vẫn kiểm tra approval, metadata, hash và URL cho phép; ràng buộc sản phẩm/thành phần/màu; timestamp hợp lệ và không ở tương lai; explicit proof INVALID; readback nguồn; revision, recipient, permission, policy và response-group binding. Price/stock/ETA/readiness/receipt/capture TTL giữ nguyên. Chỉ PRODUCT_MEDIA được có provenance expiry null. Serialized legacy media có finite expiry vẫn được đọc và tôn trọng expiry đã lưu; không sửa artifacts hoặc Outbox cũ. Chu kỳ kiểm tra integrity nền vẫn 15 ngày, độc lập với quyền dùng ảnh.

## Đối chứng cùng nguồn và thời điểm

Replay đúng frozen world/hash và clock của inventory trước, không thay dữ liệu nguồn: [bằng chứng JSON](c3-phase-c-media-no-age-replay-20261104.json). Đây là pure metadata eligibility, chưa chứng minh byte download/preparation hay live delivery.

| Mẫu | GENERIC trước → sau | DETAIL trước → sau |
|---|---:|---:|
| SQ2447 | 0 → 2 | 0 → 2 |
| SV2447 | 2 → 2 | 2 → 2 |
| SV1561 | 0 → 2 | 0 → 1 |
| V406 | 0 → 2 | 0 → 1 |
| SQ748 | 0 → 2 | 0 → 1 |
| SQ675 | 0 → 2 | 0 → 1 |
| V039 | 0 → 2 | 0 → 1 |
| V168 | 0 → 2 | 0 → 1 |
| SD023 | 0 → 0 | 0 → 0 |

SD023 vẫn thiếu clock hợp lệ. FEEDBACK vẫn 0 cho cả 9 mẫu. Các thiếu hụt chart/màu/metadata và byte-source mismatch không được giải quyết bằng thay đổi tuổi ảnh.

## Kiểm chứng thực tế

RED trước runtime: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts -t 'old approved' --maxWorkers=1`: 2 FAIL, 64 skipped. Sau sửa, focused media/opening/facts: 110 PASS; contracts: 78 PASS; business claims/readiness/selector: 60 PASS; database runtime/capture: 76 PASS; provider wire: 6 PASS. Bổ sung selector until-replaced: 19 PASS; database capture: 21 PASS; revalidation: 5 PASS; integrity maintenance: 15 PASS. New selector test initially used FRONT for FULL_LOOK and failed; corrected fixture to FULL_LOOK, without changing runtime selection rules.

Lượt worker đầy đủ đầu tiên: 2 FAIL / 2633 PASS, do hai assertion cũ vẫn yêu cầu expiry theo tuổi. Đã thay bằng kiểm tra không hết hạn theo publication/check age, đồng thời giữ future/malformed/INVALID rejection. Lượt đầy đủ cuối trên executable source `62b4ac40`: **2635 PASS / 154 files**, exit 0, 98.42 giây.

Commands thực sự chạy:

```text
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts src/v2/product-policy-media.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/effect-readiness.test.ts src/media-selector-v2.test.ts
pnpm --filter @lana/database exec vitest run src/context-v2-capture.test.ts src/realtime-runtime.test.ts --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-opening-media.test.ts src/realtime-product-facts-v2.test.ts --maxWorkers=2
node --test apps/worker/evals/single-agent-commerce-read-only/media-capabilities-wire.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/media-selector-v2.test.ts
pnpm --filter @lana/database exec vitest run src/context-v2-capture.test.ts --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media-revalidation.test.ts --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/p23c-media-revalidation.test.ts --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker lint
pnpm --filter @lana/database exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/business-tools exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/contracts exec tsc -p tsconfig.json --noEmit
node ../c3-no-media-age-analysis-20261104-01.mjs
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-no-media-age-pg-20261104-01 COD --check-prefix "C opening"
git diff --check
```

Worker build bao gồm rebuild dependency packages. Typecheck/lint/shared typechecks exit 0. Self-review: null chỉ được chấp nhận cho media; volatile claim schema, effect lifetime và capture deadline giữ nguyên; gate vẫn readback nguồn/authority trước sequence zero; prompt và model config không đổi. Không chạy model/provider generation, không thay nguồn shop, không deploy/live send. Phase C qualification chưa được đánh giá lại.

PostgreSQL tại clean executable `62b4ac40`: **17/17 PASS**, gồm ảnh năm 2025 được enqueue/persist/deliver qua capture transport; text + ảnh cùng response group; thiếu ảnh; authority/history; ràng buộc màu; private preview; nguồn mất sau verifier và sau enqueue/restart đều không gửi. Test database đã drop, provider generation 0, live send false. [Kết quả, tên ca và raw artifact hash](c3-phase-c-media-no-age-pg-20261104.json).
