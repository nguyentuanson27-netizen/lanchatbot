# Dùng chung bảng size trong dữ liệu test

Owner xác nhận dùng bảng `size-chart:SQ2447` cho các món riêng của Thạch Thảo ngày 04/11/2026. Đây là cấu hình dữ liệu test được chấp thuận; **không yêu cầu cập nhật/publish lại toàn bộ nguồn shop để tiếp tục kiểm thử**. Base `99585359`.

Cấu hình trong `apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json`: hai mã SQ2447/SV2447 dùng bảng chung cho TOP/PANTS/SKIRT, approval `owner-test-component-size-sharing-20261104`. Brand trên snapshot là `lanadesign`, được khai báo cụ thể thay vì suy luận từ tên. Không thay bands, số đo, version/reference của bảng gốc hoặc bản ghi policy published. Không gộp giá/tồn/media giữa hai mã.

Runtime nhận cấu hình qua port productGroups hiện có. Món thực tế vẫn phải được xác định duy nhất từ BOM đúng mẫu. Bảng gốc vẫn cần hợp lệ theo cơ chế sẵn có; chỉ mở rộng phạm vi sử dụng bằng xác nhận owner. Source binding bao gồm xác nhận này; đổi xác nhận/bảng/BOM làm binding thay đổi. Không cấu hình thì giữ hành vi cũ; bảng component hợp lệ trực tiếp vẫn có ưu tiên. Readiness dùng cùng resolver với runtime, không tiếp tục chặn mặc định tất cả component fit.

Đối chứng pure trên nguồn test đã chụp, dùng nguyên clock và policy records: [6 kết quả](c3-test-component-size-sharing-20261104.json). SQ2447: cả set, áo SV2447-AO, quần SQ2447-QUAN; SV2447: cả set, áo SV2447-AO, chân váy SV2447-CV. Cả 6 có nguồn size; bốn món riêng qua SIZE_SOURCE readiness. Không đổi nguồn hoặc làm mới timestamp, provider 0. Đây là kiểm tra dữ liệu/đường đọc, chưa phải hội thoại model hoặc chứng nhận chất lượng tư vấn.

Kiểm chứng thực tế:

- RED trước implementation: ba test sharing TOP/PANTS/SKIRT đều FAIL với COMPONENT_CHART_UNAVAILABLE.
- GREEN cuối: worker focused **256 PASS**, gồm product groups/fit target/state/ingress. Negative controls: không xác nhận, thiếu role, sai brand, source scope sai, bảng unreviewed; không mutation policy hoặc bands; approval thay đổi binding. Một assertion ban đầu kỳ vọng chặn cả chart PANTS có scope trực tiếp hợp lệ đã được sửa để bảo toàn quyền dùng chart độc lập này.
- Node readiness/evaluator-source **21 PASS**. Pure đối chứng thực tế đầu tiên phát hiện khác cách ghi brand POS/chart; đã cấu hình brand nguồn cụ thể, không thêm parser hoặc sửa upstream.
- Direct worker compile, typecheck và lint exit 0; git diff --check exit 0. Không chạy lại full worker/shared packages hoặc PostgreSQL cho thay đổi này; không sửa shared package.

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-product-groups.test.ts -t 'explicit owner-approved shared chart' --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-fit-target.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-ingress.test.ts --maxWorkers=2
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
node --test apps/worker/evals/single-agent-commerce-qualification/source-readiness.test.mjs apps/worker/evals/single-agent-commerce-qualification/evaluator-source.test.mjs
node ../c3-test-size-sharing-check-20261104-01.mjs
git diff --check
```

Self-review: mapping chỉ bật qua cấu hình explicit của nhóm test, không suy theo tên; published chart bất biến; exact component target giữ nguyên; các artifact/run cũ không bị viết lại. World mới sẽ mang cấu hình và hash mới; evidence cũ không được đổi nhãn thành đã dùng cấu hình mới. Không sửa prompt/model, live source, merge hay deploy; chưa chạy model.
