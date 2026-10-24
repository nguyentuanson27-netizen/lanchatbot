# Phase B — bind mã đầu vào và đồng nhất bằng chứng size

Base `96089cc707e0167c952d56e375aa018f1f991eba`. Owner yêu cầu fix theo findings của hai run opening-quotes, rồi một review độc lập. Chưa chạy provider trên bản sửa; B chưa GO.

## Root cause và thay đổi

1. Ingress đọc mã ads/explicit bằng readProduct nhưng adapter chỉ đọc sản phẩm đã known. Thêm resolveProductCode ở source port, chỉ ingress dùng để resolve exact code qua catalog, kiểm productId/canonicalCode trước bind. Model vẫn không có tool này; readProduct unbound/identity-swap vẫn bị từ chối. Candidate bounds và thứ tự explicit > ads > focus giữ ở ingress. Không dùng mã quảng cáo cấp giá/truth.
2. Resolver hiện hữu đã lọc facts.sizes từ các hàng tồn dương theo offer/color. Nói đây chỉ là danh sách size catalog trong review run trước là nhận định chưa đủ chính xác. Thông tin đã đi vào card owner nhưng bị mất khi project thành PRICE/STOCK claims cho verifier. Nay sizeAvailability.confirmedInStockSizes dùng cùng kết quả resolver, gắn productId/offerType/color/requestedSize; size filter giới hạn lại đúng size đã đọc. Unlisted=NOT_CONFIRMED, không tự khẳng định hết hàng/không bán. Không phải SIZE_FIT.
3. Cùng object size đi trong read_product/sellingOptions và trusted read literal hiện hữu, với sourceVersion/observedAt/expiresAt của POS. Readback tái tính; đổi size dù timestamp/tổng tồn không đổi cũng đổi snapshot và old PASS không send-eligible. Card không dùng list size từ PRICE nếu STOCK không xác minh được. Không thêm schema claim hay gate/verifier bypass.
4. Projection owner bỏ sizeAvailability default cùng scope/facts default khi đã có đủ sellingOptions, tránh ngầm chọn mặc định. Giữ evidence từng option và trusted literal.
5. Viết lại section báo giá owner: hỏi phần nào chọn offer đó; chưa xác định ads thì xin ảnh/tên; chi tiết chỉ đưa khi giúp mua; size theo evidence; giữ đường ảnh và multipart. Không thêm ví dụ riêng theo benchmark. Owner prompt 16352→16332 bytes, hash manifest cập nhật; phần trước section giữ nguyên bytes. Model3.5FlashLiteHigh/verifierSol6.1High/corpus/fallback giữ nguyên.

## Verification thực sự chạy

- Observed RED trước executable edit: 7FAIL/114PASS trên source/ingress/tools tests. Bốn test resolver thiếu method, hai composed ingress mất focus, một test thiếu size evidence. Sau sửa GREEN121; thêm edge cases.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only.test.ts`: 183PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-sources.test.ts src/single-agent-semantic-verifier-boundary.test.ts`: 67PASS (source11 lặp lại; boundary56 mới).
- `node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs`: 87PASS; gồm actual tool→owner/verifier wire test, cùng size evidence, zero evaluator leak, không resolve tool.
- `pnpm --filter @lana/business-tools exec vitest run src/catalog-projection.test.ts src/reply-assembler.test.ts src/protected-claims.test.ts src/image-selection.test.ts`: 53PASS.
- Tổng unique focused379PASS. Worker build gồm dependency builds PASS. Worker lint/typecheck PASS; lần typecheck đầu phát hiện hai lỗi type fixture mới, đã sửa rồi chạy lại PASS. `git diff --check` PASS. Không claim CI/provider hoặc DB integration mới.

## Self-review và giới hạn

Composed test dùng ingress + createCommerceReadSources thật với seed[], không dùng unrestricted catalog mock; ads/explicit đúng mã có card và final gate, missing-ad không search/giá đoán. Catalog và stores là deterministic fixture; không live source/provider evidence. Tests giữ zero/unknown/stale stock, color isolation, explicit size, parent/component attrs và old-PASS invalidation.

Không cài semantic router/parser, third role, repair/reverify/retry, production wiring hoặc live send. Prompt làm rõ lựa chọn offer và giọng không bảo đảm model luôn làm đúng; OWNER_TOOL_MODE/timeout/bounds còn có thể xảy ra, giữ fail-closed. Không tăng request bounds hoặc cắt native history. Cần run riêng sau review để đánh giá actual replies; không dùng unit tests làm model quality PASS.

Independent exact-head review được yêu cầu sau implementation/self-review; kết quả ghi tiếp khi reviewer hoàn tất.
