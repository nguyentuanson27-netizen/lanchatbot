# Phase B — nối mẫu báo giá mở đầu

Base: `369454dc7527975e9bdd18ceeaf7715f1b9d33fb`. Owner yêu cầu nối mẫu báo giá cho khách từ ads/mới nhắn và thêm ca test. Implementation + self-review; chưa chạy provider trong lượt này. B chưa GO.

## Luồng đã nối

- Persisted ingress dùng lịch sử thực trước tin hiện tại để cấp `conversation-entry.firstContact/fromAd`. Kiểm tra trước lọc PII: đã có tin riêng tư không thành khách mới. Ads chỉ là gợi ý mã; vẫn phải bind catalog, không lấy giá quảng cáo. Khách có lịch sử không tự trở thành khách mới khi có ads.
- `read_product` trả `openingQuote` khi khách mới, giá hiện tại đã xác minh và phần bán rõ. Tái dùng `buildVerifiedFactBlocks` có sẵn: tên/mã + giá VND, chất liệu/form đã xác minh, size từ snapshot. Nhiều offer mà chưa chọn không cấp card giá mặc định.
- Áo/chân váy/quần lẻ có nhãn phần bán. Không dùng chất liệu/form của cả bộ làm đặc tính riêng của món lẻ. Thiếu giá hoặc stale không có card. Card là kết quả tool trình bày, không cấp thêm claim/permission.
- Owner dùng card khi mở đầu báo giá, xử lý đủ câu hỏi nhiều ý, chọn bước size theo dữ liệu/bảng hiện có và gọi selector GENERIC nếu có capability ảnh. Final reply vẫn qua đúng một verifier và final gate/readback hiện hữu, ảnh đi trong cùng response group. Không lặp card ở lượt sau; không ép tin thiếu sản phẩm thành báo giá.
- B1 runner cấp entry từ lịch sử input eval; persisted B2/B3 lấy lịch sử DB. Không dùng lịch sử B1 làm bằng chứng đây là khách mới thật trên production.

## Tương thích và giới hạn

Giữ một conversational owner. Không import AgentProposal hoặc nhánh bỏ qua model của realtime cũ. Mẫu khối thông tin tái dùng bộ dựng cũ; owner vẫn tạo exact final text. Test deterministic kiểm wiring, không bảo đảm model luôn chép đúng format hoặc tự gọi ảnh. Không cắt/chèn lại text sau verifier; hiện một TEXT có các đoạn rồi IMAGE, chưa tách thành đúng hai Meta text bubbles như tài liệu r31 lịch sử. Thông tin size hỏi thêm chỉ khi phù hợp và đủ căn cứ bảng; không mặc định bắt chiều cao/cân nặng/ba vòng.

Không production wiring/deploy/live send. Chưa nối adId/postId lookup khi adTitle không có mã; unresolved tiếp tục hỏi xác định mẫu. Lịch sử không còn trong nguồn không thể chứng minh đã từng tiếp xúc. Không thêm regex nhận intent hoặc sửa verdict/rubric; chỉ thêm một section owner prompt (6 dòng), cập nhật prompt hash.

## Bộ ca model mới

`opening-quote-cases.json`, cờ `--opening-quotes` của stateful provider; 5 lượt / 4 journey, N1:

1. Ads có mã, khách hỏi “Bộ này bao nhiêu em?”; không seed sản phẩm.
2. Cùng journey hỏi lại giá, dùng lịch sử thực của lượt 1; không seed reply thành công.
3. Khách mới organic hỏi giá set bằng tên/mã.
4. Ads không xác định mẫu, hỏi giá; không đoán sản phẩm.
5. Khách mới hỏi cả giá bộ và có bán áo riêng không; trả đủ hai ý.

Runner đăng ký riêng cohort, tối đa 20 generation requests; không tự cộng vào campaign46 cũ. Lượt hỏi lại vẫn là câu hợp lệ nếu lượt đầu fallback; review phải ghi đúng actual history, không đánh dấu có báo giá trước khi chưa có. Metadata evaluator không được vào runtime. Chạy model cần source seal và preflight mới.

Lệnh dự kiến sau seal (CHƯA CHẠY): `python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-output-dir> COD --provider-run --candidate-handoff --opening-quotes` (thêm `--provider-preflight` cho lượt preflight riêng).

## Verification thực sự chạy

Observed RED: test card first-contact thiếu openingQuote, 1FAIL/48PASS. GREEN cuối:

- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only.test.ts` —159PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs` —86PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/reply-assembler.test.ts src/protected-claims.test.ts src/image-selection.test.ts` —43PASS.
- `pnpm --filter @lana/worker build` PASS trước bổ sung guard component; sau thay đổi cuối `pnpm --filter @lana/worker exec tsc -p tsconfig.json` PASS. `pnpm --filter @lana/worker lint` (tsc --noEmit) PASS trên source cuối.
- `node --check` run.mjs/stateful-provider.mjs và `git diff --check` PASS.

Self-review phát hiện và sửa fixture sai wrapper (`sellingFixture.f`) và variable B1 (`sample`, không phải runtime). Không có provider/CI/real-DB qualification mới. Giá trị kiểm chứng là wiring/card/gate/firewall và hồi quy deterministic; chất lượng hội thoại chờ run.
