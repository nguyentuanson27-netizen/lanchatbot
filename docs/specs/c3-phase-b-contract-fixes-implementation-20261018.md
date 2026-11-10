# Phase B — implementation F1–F3 sau rollback và review độc lập

Owner yêu cầu “thực hiện fix theo kế hoạch”. Intake `863051c2a818e823909684dea9e009c674a38b11`; main vừa fetch vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Thực hiện [kế hoạch đã tiếp thu review](c3-phase-b-rollback-and-contract-plan-20261018.md) trên branch `feat/c3-phase-b-commerce-20261014`, draft PR391. Phạm vi là sửa code/kiểm thử/self-review; không có provider run mới hoặc thay đổi kết luận A OWNER_BYPASS/B sales-live STOP.

## Thay đổi đã thực hiện

### F1 — offer tường minh tại candidate add boundary

Savepoint `8f30b546`:

- Native add schema bắt buộc `offerType`; mô tả tool nói rõ chỉ đọc thêm khi chưa biết lựa chọn bán. Khi các PRODUCT refs đã có offers được code cấp, enum gợi ý lấy từ đúng literals hiện có; không tự chọn singleton. Có product chưa biết offers thì không giới hạn enum bằng danh sách không đầy đủ.
- Candidate effects trả `REJECTED/OFFER_REQUIRED` khi thiếu/không có chuỗi offer, trước policy/selector/mutation. Gọi selector bằng offer đã kiểm tra; không đi vào default priority do thiếu đối số. Selector dùng chung và đường read/legacy không đổi.
- Controls dùng selector thật trên snapshot tổng hợp: single-offer add trực tiếp một batch, đúng biến thể/cart, duplicate không ghi thêm; sai màu trong offer đã chọn khác với offer không có; nguồn không đọc được không commit. Kiểm sẵn có về change_cart_item giữ offer của CART_LINE, quyền/CAS/freshness/recovery tiếp tục chạy.
- Cập nhật một composition fixture và sáu positive add calls trong runner real-PG tổng hợp sang explicit DIRECT. Không thay negative controls hoặc artifact/run lịch sử. Runner này chưa được thực thi lại với database trong đợt fix.

### F2 — lỗi số đo theo field, giữ batch nguyên tử

Savepoint `f379252a`:

- Giữ reason tổng `MEASUREMENT_SOURCE_INVALID`, thêm `data.fieldErrors` chỉ gồm field đã allowlist và reason từ validation code. Phân biệt quote không trong tin hiện tại, quote không duy nhất, nhiều/không có scalar, số bị cắt, đơn vị sai và value không khớp. Không trả raw exception hoặc thêm nội dung từ nguồn riêng tư.
- Thu thập các lỗi numeric trong tối đa8ops trước merge/CAS; chỉ một field sai cũng không ghi phần còn lại. Pending fields vẫn chặn dependent size/effect; source, timestamp, đơn vị, atomic batch, CAS/readback và receipt không được nới.
- Test continuation tổng hợp chứng minh một owner có thể sửa arguments trong đúng2tool rounds/4calls/3owner generations; size không chạy lúc state bị từ chối, verifier chạy1lần rồi final gate đọc lại chart. Đây là transport giả lập, không phải model đã tự sửa thành công.
- Giá trị đúng vẫn có thể bị model gán sai field/người; numeric-copy check không chứng minh semantics này. Ca provider sau này phải đọc committed measurements dù tool OK/receipt có thật. Chưa có parser/proof mới hoặc verifier trước commit.

### F3 — nguồn chưa đọc được không bị xóa lý do

Savepoint `16977beb`:

- Adapter map `POS_SNAPSHOT_UNAVAILABLE` sang public `SOURCE_UNAVAILABLE` thay vì null. Không đưa tên source riêng tư vào request; không đổi top-level OK hoặc mất mô tả đọc độc lập.
- Captured-request controls giữ riêng unknown/null, source unavailable, offer absent, stale và stock quantity0, cùng nội dung/facts/offers/native id/thought signature. Existing per-option/default-fold controls giữ freshness/scope/evidence đúng response.
- Chỉ xác minh presentation tới provider request. Chưa có bằng chứng model giảm suy “chỉ bán set”, hẹn suông hoặc viết tự nhiên hơn. Không thay prompt để cố cứu kết quả.

## RED→GREEN và kiểm chứng thực sự

| Kiểm tra | Kết quả |
| --- | --- |
| F1 effects RED (sau sửa fixture identity) | 61 PASS /1 FAIL: thiếu offer vẫn commit trước khi sửa |
| F1 native schema/enum RED | 0 PASS /2 FAIL |
| F1 effects/composition GREEN | 64 PASS |
| F2 state RED | 15 PASS /6 FAIL vì chưa có fieldErrors |
| F2 state GREEN, gồm continuation budget | 22 PASS |
| F3 adapter RED | 4 FAIL trước sửa presentation |
| Focused adapter/protocol/comparison GREEN | 65 PASS |
| Focused commerce/catalog/verifier-boundary | 280 PASS /14files |
| Existing protected claims/reply assembler | 21 PASS |
| Canonical worker build | exit0 |
| Full worker Vitest | 1.869 PASS /131files, max2/min1workers |
| Node eval | 508 PASS /2optionalSKIP,510registered,0FAIL |
| Worker lint (tsc --noEmit) / C2 benchmark validators | exit0 /exit0 |
| Provider generations / real database writes | 0 /0 |

Các lần lỗi được giữ: hai assertions control F1 ban đầu sai do fixture shop alias khác shop id, đã sửa adapter identity của fixture rồi quan sát lại RED đúng missing-offer. Một assertion F2 ban đầu quên lần chart readback sau verifier; đã kiểm riêng không gọi size trước correction và một lần trước final, rồi ghi đúng hai source reads. F3 có thêm ba expectations cũ về null cần cập nhật đúng contract mới; giữ mọi scope/content assertions. Một shell command Python sửa fixture bị lỗi quoting và không sửa file, sau đó dùng patch tường minh. Lệnh Vitest có literal glob chỉ chạy62catalog/boundary tests; sau đó dùng danh sách đường dẫn từ rg để chạy đủ14files/280tests. Không báo các lần này là PASS hoặc xóa assertion authority để làm xanh.

Replay offline từ historical source `4619eaa5`: dùng nguyên args thiếu offer của rep3 opening và args/quote hai số của rep1 opening trong port tổng hợp, clock/scope tổng hợp. Kết quả: OFFER_REQUIRED,0selector/commit; hai fieldErrors ONE_VALUE,0state commit. Presentation replay dùng hình dạng partial response cũ và lý do typed-source tái dựng; không gọi đó là raw reason đã quan sát hoặc một generation mới. Phần mô tả giữ nguyên, top-level OK, public SOURCE_UNAVAILABLE. Helper local `%TEMP%/c3-contract-offline-replay-20261018.mjs`, log tương ứng; không thêm runner/gate production.

Commands thực sự chạy (RED failures ở trên được giữ):

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
node --test --test-name-pattern='numeric writes|cart offer arguments' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
# cwd apps/worker: danh sách từ rg, không phải literal glob
$c3FocusedTests = @(rg --files src -g 'single-agent-commerce*.test.ts' -g 'single-agent-semantic-verifier-boundary.test.ts' -g 'realtime-sales-catalog.test.ts')
pnpm --filter @lana/worker exec vitest run @c3FocusedTests
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
node C:/Users/nguye/AppData/Local/Temp/c3-contract-offline-replay-20261018.mjs
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker benchmark:c2:validate
node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs
git diff --check
```

Logs nằm trong `%TEMP%/c3-contract-*.log`. Các focused checks không chứng minh chất lượng model/live hoặc toàn repository. Không dùng kết quả model lịch sử như kết quả của source mới.

Final checks: exact owner/verifier prompt và active manifest hashes giữ nguyên; shared selector/historical run folders không diff; không có source file mới. `git diff --check` và local doc links PASS, secret-pattern scan added code/test lines không có match (không phải bảo đảm tuyệt đối). Node syntax check của runner đã cập nhật exit0. Full worker test population/C2 validators/Node eval được gọi bằng các commands riêng ở trên; không claim đã chạy wrapper `pnpm --filter @lana/worker test`, duplicate typecheck prebuild, remote CI hoặc full-repository `pnpm check`.

## Self-review và complexity

- Offer enum chỉ gợi ý union khi đủ options cho tất cả products đang bound; không thay kiểm product/offer tại selector. Không áp enum thiếu dữ kiện cho product mới, không đổi shared default hoặc cho phép tool dưới NONE.
- Measurement reasons lấy từ finite mapping, fieldErrors chỉ phát sinh sau kiểm field hợp lệ; dữ liệu lỗi không được dùng cho merge/CAS. Bounds ops/sourceQuote giữ nguyên, không thêm regex hoặc nới nhận quote nhiều số.
- F3 không đổi unknown thành absent hoặc unavailable thành stock0; source evidence và top-level content được test trước khi báo presentation đạt.
- Owner prompt SHA256 giữ `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`; verifier `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; manifest giữ nguyên. Tool add schema/description có thay đổi thuộc F1, không coi là prompt byte-equivalence của toàn request.
- Executable logic chỉ ở existing candidate effect/state boundary và native adapter; sáu scripted positive fixtures theo schema mới. Không thêm file runtime/module/gate, model role, schema durable, parser, router, repair/retry hoặc tăng budget. Diff executable logic so với intake:37added/12removed lines across3files; scripted fixture updates6added/6removed.
- Không triển khai F4. Color loss, đúng nghĩa field/người, provider NONE, stage/price interpretations và sales voice còn cần đo. Không tuyên bố F1–F3 chữa toàn bộ lỗi cũ hoặc đạt B. Không live action, source publication hoặc Phase C.
