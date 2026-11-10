# Sửa contract sau đợt review93 — 2026-10-18

Owner yêu cầu tiếp tục fix sau [kết quả 53 lượt](../review93-fix-20261018/CHECKPOINT_B.md). Intake `0942d0cf8855f69e3583af61dc30762ae786ea56`; main vừa fetch vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Tiếp tục branch PR391 đã được owner cho phép; không rebase hoặc sửa bằng chứng lịch sử.

## Phạm vi thực hiện

1. Thay chỉ dẫn size của owner/verifier: khách tự chọn size để mua khác với shop khẳng định độ vừa hoặc đề xuất size. Giữ nguyên code-fit, quyền và kiểm biến thể.
2. Làm rõ apply_customer_state chỉ ghi thông tin mới/sửa/bỏ trong tin hiện tại; phần đã nhận dùng từ state, không gửi lại sourceQuote của history. Không nới provenance hoặc bỏ pending-field checks.
3. Owner projection luôn có availableOffers; null khi chưa có danh sách đã xác nhận. Native partial reads đã giữ null đúng, không thêm field/loại trạng thái mới. Không tự tìm sản phẩm khác để suy quy định bán lẻ của món đã biết.
4. Recovery hiện có giữ ACK receipt; bổ sung tổng/ship và cảnh báo đặt trước khi cùng giỏ/revision còn được đối chiếu với giá và policy hiện tại. Nguồn chưa đủ thì chỉ ACK phần commit đã chứng minh. Không phân loại ý định bằng regex, không model sửa câu hoặc thực thi tool dưới NONE.
5. Thay đoạn ranh giới tư vấn ở cả prompt: gợi lớp mặc là lời khuyên; khẳng định lớp/màu đó đạt độ kín trong hoàn cảnh cụ thể cần căn cứ về kết quả, dù là lời trấn an và không nói đã kiểm nghiệm. Giữ lời tư vấn cảm giác/thẩm mỹ tự tin theo quyết định owner. Làm rõ cách giải quyết lo ngại bằng đánh đổi có thật thay chuỗi khen chung.

## Verification dự kiến

RED quan sát cho projection null và recovery summary; GREEN nhỏ nhất, đối chứng nguồn thiếu/đổi/hết hạn, policy đổi, quyền/recipient/revision và pending/partial-effect hiện có. Sau đó focused adapter/protocol/candidate, worker effects/state/read-only/ingress/boundary, protected-claim/reply/size; full worker, worker typecheck/build/lint. Chỉ sửa worker và eval, không shared schema hoặc production entrypoint.

Self-review toàn diff, đối chiếu các prompt sections không thuộc phạm vi, hash metadata hiện hành và bằng chứng cũ. Không viết test tìm từ trong prompt để gọi đó là chứng minh hiểu nghĩa. Đây là lượt implementation; chưa chạy provider mới, chưa chứng minh naturalness hoặc semantic reliability. Không tự mở run đã STOP hoặc chạy 16 ca bị dừng. Các lỗi quota/transport giữ nguyên evidence, không đổi retry/model/credential route để che lỗi.

## Kết quả thực tế

### Thay đổi đã thực hiện

- Owner/verifier phân biệt nhận size khách tự đặt với shop đề xuất size/khẳng định mặc vừa. Phần fit vẫn yêu cầu claim code đúng khách, sản phẩm và measurement fingerprint.
- Mô tả quote_cart nói rõ dùng cartQuote đã có từ add/change, tránh gọi thêm tool chỉ để đọc lại tổng.
- Owner và mô tả apply_customer_state dùng hồ sơ đã nhận, chỉ ghi phần mới/sửa/bỏ trong tin hiện tại; sourceQuote của history không được gửi như thông tin mới. Code provenance/CAS/pending fields giữ nguyên.
- trusted.products luôn có availableOffers, null khi chưa có danh sách từ nguồn. Native partial reads trước đây đã giữ null; nay phần context đứng cạnh mô tả cũng nói rõ điều chưa biết. Không biến cấu tạo áo + váy thành chính sách chỉ bán set.
- Recovery đối chiếu lựa chọn hiện tại, thời hạn nguồn và policy đã tính giỏ trước khi thêm tổng tiền code đã commit; không tự tính lại hoặc dùng tiền trong draft bị loại. Có PRE_ORDER thì thông báo hàng đặt trước. Thiếu hoặc đổi nguồn thì không thêm money/stock assertion, vẫn có thể ACK phần commit đã chứng minh. Đọc revision sau khi đọc các nguồn, giữ quyền/recipient/binding/receipt checks.
- Khi recovery có money/stock, reason nội bộ là RECEIPT_BACKED_CART_SUMMARY để consumer dùng **cart/fact readiness đang có**, cùng nhánh generated cart reply; ACK chỉ báo effect vẫn là RECEIPT_BACKED_ACK. Đây là một giá trị reason trong contract hiện có, không thêm gate/proof/schema/persisted field. Test chặn source đổi/mất trước enqueue; summary không bị coi nhầm là fallback không có catalog claims.
- Prompt cho phép cảnh báo/gợi thêm lớp trong để bớt lộ như lời khuyên phối đồ thông thường; phân biệt với việc làm khách tin bộ phối đã đủ kín dưới điều kiện ánh sáng cụ thể. Không đòi giọng dè dặt hoặc phép thử cho mọi lời khuyên. Thay chỉ dẫn concern để xét điểm chưa hợp, tránh khen nhiều rồi bắt khách chọn lại.

Không thêm ví dụ theo ca, regex/parser, classifier skip-verifier, model role, repair/reverify, retry hoặc tăng budget. Không hardcode policy shop vào prompt. Không production wiring, thay nguồn shop, gửi khách thật, merge/deploy hoặc Phase C.

### RED → GREEN và sửa trong self-review

| Rủi ro | RED quan sát | GREEN sau sửa |
| --- | --- | --- |
| Unknown offer bị giấu trong context | Adapter33PASS/1FAIL: availableOffers là undefined, kỳ vọng null | Adapter/protocol/candidate45PASS |
| Recovery bỏ tổng/đặt trước | Effects55PASS/3FAIL: chỉ nhận “đã thêm món vào giỏ” | 58PASS trước thêm race test |
| State đổi trong lúc đọc nguồn recovery | Effects58PASS/1FAIL: receipt cũ còn SEND_ELIGIBLE | Đưa read revision sau source reads; effects59PASS |
| Outbox coi summary là text không có catalog assertion | Ingress10PASS/3FAIL: không có cart binding; source đổi/mất vẫn enqueue | Dùng lại nhánh cart readiness; ingress13PASS |

Một lượt GREEN trung gian còn fail đối chứng READY do fixture khai báo priceVersion=p1 nhưng line.priceFactRef=pos:SM613; sửa fixture cho đúng source binding, giữ nguyên readiness. Typecheck ban đầu exit2 do mock bị suy kiểu chỉ IN_STOCK, không nhận PRE_ORDER; dùng kiểu READY từ CartSelectionResult, không cast qua any để bỏ kiểm tra. Protocol từng báo PROMPT_HASH sau khi sửa prompt; cập nhật hash của manifest implementation hiện hành, không bỏ guard hoặc sửa frozen manifest cũ.

Focused worker8files/211PASS đã chạy trước nhánh consumer cuối; effects+ingress cuối72PASS. Protected/product/presentation/size52PASS; adapter/protocol/candidate45PASS. Full worker trung gian1853Vitest/499NodePASS+2optionalSKIP; đã chạy lại canonical worker checks sau khi thêm consumer/ba test của nó. Build/typecheck/lint cuối đều exit0; final Vitest131files/1856PASS và Node499PASS/0FAIL/2optionalSKIP; toàn lệnh worker test exit0. Full suite chạy trước chỉnh câu mô tả quote_cart cuối cùng; sau chỉnh mô tả đã chạy lại adapter/protocol/candidate45PASS và offline projection/schema checks. Không sửa worker runtime sau các checks cuối.

### Self-review và giới hạn

Đối chiếu bằng helper offline: policy, giọng shop, đoạn tiền/receipt/privacy, vai trò verifier, tool parameter schemas, corpora và source-config byte-identical so với0942d0cf; manifest chỉ đổi hai prompt hashes. Models/config/budgets/schema/fallback không đổi. Owner12.478bytes so với11.693 (+6,7%); verifier12.145 so với11.646 (+4,3%). Độ tăng dành cho phân biệt contract, không phải nối thêm case checklist. Không suy prompt ngắn hơn thì hội thoại sẽ hay hơn.

Prompt hashes hiện hành:

- Owner: `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`.
- Verifier: `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`.

Offline chiếu thay đổi prompt/projection lên 141 wire bodies đã lưu (103owner/38verifier, cả diagnostic và candidate cũ): max owner33.002bytes <65.536, verifier24.861 <32.768. Đây là kiểm bounds trên hình dạng input cũ; **không phải request mới hoặc provider outcome mới**. Không thể từ test này kết luận model đã hiểu đúng, tự nhiên hơn hoặc không còn false PASS.

Unit consumer dùng controlled terminal từ composition boundary để kiểm readiness; effects tests kiểm logic recovery thật. Real-PG control bổ sung đã nối toàn bộ commit → model transport failure giả lập → summary → Outbox readiness → capture một lần; delivery vẫn là transport giả lập. Không coi synthetic failure là một provider generation.

Giới hạn còn lại: chưa có provider run với prompt mới; chưa biết owner có bỏ read/recommend_size thừa, ngừng tìm lại khi nguồn bán lẻ thiếu, hoặc tư vấn hữu ích hơn hay chưa. Cũng chưa biết verifier sẽ phân biệt ổn định các lời trấn an về độ kín. Quota/transport failures của run cũ vẫn là lỗi vận hành chưa xác định hoàn toàn; không có hidden retry hoặc model substitution trong bản sửa. Phase B chưa được chấp nhận, A vẫn OWNER_BYPASS. Các53outcomes cũ và16NOT_RUN giữ nguyên.

## Commands thực sự chạy

Từ repository root; log dưới C:/Users/nguye/AppData/Local/Temp/c3-contract-fix-*. Các lệnh RED/focused có thể lặp sau thay đổi mới hoặc để chẩn đoán failure vừa xuất hiện; không generation nào được chạy lại.

```powershell
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/realtime-sales-catalog.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t 'cart summary'
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker test
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fix-self-review.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-fix-bounds.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-contract-fix-controls-20261018 COD
git diff --check
```

Không đổi provider API; không dùng credential generation route cho controls0generation. Source-session dùng đường ops/SSH có sẵn, nguồn live PostgreSQL read-only; chỉ DB ngẫu nhiên c3_b_test_* có DDL/domain mutations và capture-only egress. Không có live Meta/Pancake/POS send. Chưa chạy full-repo pnpm check hoặc có CI PASS cho head mới.

## Hoàn tất verification và bàn giao

- [26/26 real-PG COD controls](controls.json) PASS, exit0, providerGenerations=0; DB thử nghiệm đã drop. Có kiểm commit response bị mất, idempotency, profile correction, checkout/confirm, supersession, partial effect, handoff và một recovery summary được lưu/capture đúng một lần qua readiness hiện có. Synthetic products/customer inputs và capture transport, policy đọc từ nguồn hiện hành. Không phải hội thoại provider hoặc delivery thật.
- Controls được chạy trước commit trên working implementation, sourceDirty=true tại intake0942d0cf; không gọi đó là clean sealed provider run. Chỉ giữ các trường report cần review trong controls.json; raw report/log gốc nằm ở thư mục Temp đã ghi trong command.
- Scope delta: projection/tool descriptions, các đoạn prompt thay thế, khoảng20dòng logic recovery/consumer và các regression tests; một reason trong TerminalOutcome hiện có để tái dùng readiness. Không thêm semantic role/layer, gate, proof schema, durable state, parser hay generation retry.
- Full worker test được lặp vì thêm consumer và tests sau lượt trung gian; focused adapter được lặp sau câu mô tả quote_cart cuối. Không broad test lặp thêm khi source không đổi.
- Source/prompt implementation đã sửa; **provider behavior NOT_RUN**, Phase B chưa accepted, recommendation sales/live vẫn STOP. Lượt sau cần freeze nguồn/prompt/config mới; không gắn53outcomes cũ cho bản sửa này và không tự tiếp tục16ca đã dừng.

Final reporting checks đã chạy: `python C:/Users/nguye/AppData/Local/Temp/c3-contract-fix-final-check.py` exit0 (hai link local,26controls/0generation/DBdropped, prior evidence unchanged); `node C:/Users/nguye/AppData/Local/Temp/c3-review93-scan.mjs` exit0 (14modified/untracked files,0secret-pattern hits); `git diff --check` exit0. Các kiểm tra này xác nhận scope/evidence, không bổ sung kết quả hội thoại model.
