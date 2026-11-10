# Nguồn test: áo Thạch Thảo màu trắng

Owner chọn **“Trắng — giả định cho dữ liệu test”** ngày 04/11/2026. Base `4e1e67512be7ebb1d2b87ea255e614b762b1cdf6`. Không coi đây là xác minh màu của hàng thật hoặc yêu cầu cập nhật toàn bộ upstream.

## Dữ liệu bổ sung

Cấu hình `testColorSources` tại `apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json`, approval `owner-white-shirt-test-assumption-20261104`:

- Áo `SV2447-AO` trong offer AO của SQ2447 và SV2447: đổi nhãn `__NO_COLOR__` thành `TRẮNG` trong bản sao test; giữ size, số lượng, giá, SKU, inventory source và timestamp gốc.
- Giữ nguyên dòng BE tồn 0 và các offer set/quần/chân váy. Không cộng tồn giữa hai mã cha; cùng áo vẫn là một pool dùng chung.
- Gắn màu trắng cho đúng ảnh cận chỉ có AO, URL và SHA256 được pin trong cấu hình. Không gắn trắng cho cả set, quần/chân váy hoặc mọi ảnh. Giữ nguyên parent colours, approval, hash và clock của ảnh; không cứu proof INVALID.
- Không thêm lời chỉ dẫn màu vào prompt, không thay verifier hoặc production runtime. Đây là dữ liệu test qua chính đường đọc/selection/media sẵn có.

## Nối vào Phase C

`capture-world.mjs` vẫn kiểm tra nguồn raw hai lần trước khi bổ sung. World mới có cấu hình này sẽ ghi riêng `PUBLIC_SOURCE_WORLD.json` nguyên gốc và `WORLD.json` dùng cho test, với metadata `OWNER_APPROVED_ISOLATED_COLOR_V1`, approval, hash nguồn gốc, hash cấu hình và danh sách dòng đổi màu. Hash evidence của world test được tính lại; timestamp không được gia hạn.

Frozen exact lookup/search chiếu cùng dữ liệu bổ sung; frozen facts đọc snapshot test đã gắn màu. Search vectors/index gốc không sửa. Missing provenance bị chặn; world/corpus/run cũ không viết lại. Giả định này nối ở đường **Phase C frozen-world**; không mô tả live POS/catalog hoặc các runner live Phase B là đã được sửa nguồn.

## Kết quả kiểm tra

- TDD RED với hàm chưa bổ sung dữ liệu: 2 FAIL / 1 PASS. GREEN sau triển khai: 4 test mới PASS; toàn bộ qualification Node tests **131 PASS**, exit 0.
- Negative controls: sai title/SKU/hash, thiếu approval, trùng màu đích, proof INVALID, hai mã cha có counter không khớp, thiếu provenance. Original world bất biến; các dòng khác và raw index giữ nguyên. Shared stock không được xem là hai pool độc lập.
- Replay nguồn test đã chụp, dùng nguyên clock 09:46:34: **8/8 lựa chọn áo trắng** trên hai mã cha × S/M/L/XL; giá test 499.000đ, lượng tồn giữ nguyên. Exact native frozen lookup bằng world product ở cả hai mã; `read_product`, media selection, opening gate và exact readback đều qua.
- Bổ sung kiểm media final gate: cả hai mã ALLOWED khi nguồn không đổi, BLOCKED khi colour binding bị vô hiệu. [Bằng chứng hoàn chỉnh](c3-test-white-shirt-source-gates-20261104.json); [lượt replay đầu trước khi thêm final-gate assertions](c3-test-white-shirt-source-20261104.json) được giữ lại.
- Replay chỉ dùng in-memory ports và fake authority/base gate; **không phải PostgreSQL, byte download/prepare hay live delivery**. `WORLD.json` ngoài repo là replay ở clock cũ, không phải input mới đã seal để chạy model. World hash test `efda5ab09fcf290cad6f6405f98a7769bf00c203d46f046263dbf1bd5b35fc6b`.

Commands thực sự chạy:

```text
node --test apps/worker/evals/single-agent-commerce-qualification/test-color-source.test.mjs
node --test apps/worker/evals/single-agent-commerce-qualification/test-color-source.test.mjs apps/worker/evals/single-agent-commerce-qualification/frozen-search.test.mjs
node --test --test-concurrency=2 "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
node ../c3-white-shirt-source-check-20261104-01.mjs
git diff --check
```

Self-review: chỉ thay data preparation/projection cho evaluation, mapping và photo hash được pin; không suy màu từ AI/ảnh, không gộp counter, không rewrite old evidence. Thiếu hoặc thay source điều kiện sẽ dừng bổ sung thay vì tự đoán. Không shared/worker runtime TypeScript change nên không chạy lại build/full worker/PG ở thay đổi này. Provider generation 0, shop-source writes 0, không merge/deploy/live send; chưa có kết quả model mới hoặc qualification GO.
