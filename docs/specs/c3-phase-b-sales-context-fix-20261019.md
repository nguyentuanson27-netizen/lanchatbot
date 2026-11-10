# Phase B — sửa nguồn và cách trình bày để phục vụ bán hàng

Owner yêu cầu thực hiện sau review các vòng 18–19/10 và nhắc rõ mục tiêu bán hàng. Base của đợt sửa: `58f1894a`. A vẫn OWNER_BYPASS; chưa có sales/live GO. Giữ một owner và một verifier, code giữ identity/truth/freshness/state/permission/effects/receipts/privacy.

## Mục tiêu và cách đánh giá

Bot giúp khách chọn hàng của shop và mua thuận tiện: hiểu điều khiến khách phân vân, đưa lựa chọn có lý do liên quan, thực hiện bước mua khi khách đã quyết. Trả đủ facts chưa tự chứng minh tư vấn tốt. Upsell phù hợp, nhận xét thẩm mỹ tự tin và nhắc một dữ kiện có ích được chấp nhận; không ép mọi tin có CTA hoặc bắt khách nghe lại hồ sơ.

Đối chiếu lịch sử cho thấy cùng kiểu câu ren mềm/form nhẹ/độ rũ từng được ghi USABLE + voice finding, sau đó thành NEEDS_EDIT. Không dùng chênh lệch đó để kết luận prompt gây hồi quy. Trong review tiếp theo, đọc cả cuộc chat và lời thực nhận: thông tin đúng nhưng không trả được việc khách đang nhờ, khiến khách không biết mua phần nào, hoặc đưa bước không thực hiện được là lỗi nội dung; câu vẫn giải quyết việc mua nhưng còn lời đệm là góp ý giọng. Không dùng danh sách keyword. Giữ nguyên raw/primary/counts cũ; đây là đối chiếu bổ sung, không chấm lại để nâng kết quả lịch sử.

## Thực hiện có giới hạn

1. **Context bound:** tái hiện hai search cộng dồn vượt bốn runtimeProducts. Kiểm admission ngay trong tool trước khi sửa context/trả dữ liệu mới; không cắt bằng chứng sau khi owner đã viết. Reuse bound của final gate, không tăng bound. Overflow trả rejection có thể xử lý trong ngân sách hiện có; context và nguồn trước đó vẫn nguyên vẹn. Test cả gọi song song, đọc một sản phẩm đã biết và readback.
2. **Mã hàng:** `search_products` nhận trường `productCode` riêng, ưu tiên đường mã khi khách cung cấp mã; `query` dành cho tên/nhu cầu. Reuse catalog search và chuẩn hóa mã hiện có. Không parse câu tiếng Việt, không đặc cách mã benchmark, không lấy món gần giống thay cho mã được hỏi. Chỉ sửa câu prompt tương thích tool.
3. **Hiển thị mua hàng:** dịch các loại bán đã được nguồn xác nhận sang nhãn khách hiểu, giữ mã thật cho tool và binding. Unknown vẫn unknown, không tự kết luận bán lẻ. Formatter giỏ/preview/confirmation dùng từ dễ hiểu, giữ đủ món/màu/size/số lượng/tiền và không báo đã tạo đơn POS. Không bổ sung persisted field hoặc đọc nguồn mới chỉ để đổi giọng.
4. **Owner context:** giữ lịch sử, dữ kiện, scope, phần thiếu và các ràng buộc cần thực hiện nghiệp vụ. Bổ sung nhãn hiển thị từ mã loại bán, đưa phần nội dung sản phẩm cho owner mà không lặp metadata kỹ thuật; trusted context và verifier giữ nguyên evidence. Không viết trước lời tư vấn hoặc thêm ví dụ theo ca. Prompt bán hàng hiện hành là nền; không viết lại diện rộng hay thay verifier để cứu điểm.

RED quan sát trước GREEN cho boundary/search/projection. Chạy focused worker và adapter/protocol tests, protected-claims/reply-assembler regression, worker build/typecheck/lint; full worker suite trước hoàn tất phần code. Kiểm giá/tồn/fit/policy/state/receipt/privacy không đổi. Các assertion câu code cũ được cập nhật theo câu mới, không dùng test câu chữ để chứng minh naturalness.

## Đánh giá model

Test code không chứng minh chất lượng bán hàng. Vòng provider nếu thực hiện phải dùng registration mới, source sạch đã commit, models hiện hành Gemini 3.5 Flash Lite HIGH / GPT-6.1 Sol high, một lần mỗi ca và không retry. Tái sử dụng bộ 16 slots gần nhất; so từng nhóm, không gộp replay phụ thuộc thành hội thoại độc lập. Chỉ đánh giá thay đổi presentation riêng trên cùng captured public context/history; không gọi dữ liệu live ở hai thời điểm là so sánh chỉ đổi một biến. Không tự tăng corpus hoặc mở full A2/A3 từ việc sửa này.

Complexity delta dự kiến: reuse gate/search/formatter/projection hiện có; có thể tách formatter dùng chung để recovery và preview không tự viết hai cách. Không thêm model role, semantic router/parser, durable state, repair loop hoặc gate mới. Không deploy/live send.

## Đối chiếu cách review trước khi đo lại

Không lấy đủ facts làm tiêu chuẩn bán hàng; cũng không đòi một câu tư vấn thẩm mỹ phải giải thích theo đúng lập luận người chấm thích. Đọc toàn bộ tin khách, lịch sử và phản hồi thực nhận để xác định khách đã được giúp chọn/mua hay còn vướng gì. Giữ ba nhãn primary hiện hữu. USABLE có thể còn góp ý giọng nhỏ; NEEDS_EDIT phải chỉ ra phần thực sự cần viết lại trước khi gửi, không chỉ liệt kê từ không thích. Internal offer code khiến khách không hiểu đang mua gì, lời hứa xử lý không thực hiện được, hoặc lời xác nhận che mất lựa chọn đang có là lỗi cần sửa. Không chấm thiếu giá do fixture cố ý mất nguồn thành lỗi bịa/hiểu sai của model.

| Cặp lịch sử | Đối chiếu bổ sung cho lần review tới |
| --- | --- |
| [sales-voice](../../apps/worker/evals/single-agent-commerce-read-only/sales-voice-run-20261019/CONVERSATIONS_AND_REVIEW.md), concern B1 rep1: “ren tơ Hàn mềm…form nhẹ…độ bay…không bị rườm rà”, USABLE; [current-prompt](../../apps/worker/evals/single-agent-commerce-read-only/current-prompt-rerun-20261019/CONVERSATIONS_AND_REVIEW.md), concern B1: “ren tơ Hàn mềm…form nhẹ…độ rũ…”, NEEDS_EDIT | Hai câu đều đưa nhận định của shop cho tiệc ban ngày và giá bộ đúng; nhận xét tổng thể nhẹ/thanh lịch không tự thành vi phạm. Góp ý mức thuyết phục, nhịp catalog và lặp ngân sách, nhưng khác nhãn này chưa chứng minh hồi quy. Không mặc định loại câu chỉ vì lý do có chữ mềm/rũ. |
| [gemini-prompt](../../apps/worker/evals/single-agent-commerce-read-only/gemini-prompt-once-20261019/CONVERSATIONS_AND_REVIEW.md) và current-prompt, partial-source B1 | Cả hai nói đúng chất liệu, không bịa giá/tồn nhưng dùng lời giải thích hệ thống và xin thông cảm kéo dài. Điểm cần sửa là cách nói với khách; không yêu cầu model tự tạo nguồn còn thiếu hoặc hứa gọi lại. Đo giọng riêng với khả năng mua bị giới hạn bởi nguồn. |
| sales-voice lookup có lần thiếu giá vì AMBIGUOUS; current-prompt integrated báo rõ áo/cả bộ nhưng advice dùng “AO / COMPOSITE” | Thiếu giá do tìm sai đường và giải thích loại bán bằng mã là hai nguyên nhân khác nhau. Code sửa đường mã và cung cấp nhãn; owner còn chịu trách nhiệm chọn thông tin cần nói. Hai giá có mục đích rõ không phải lỗi liệt kê. |
| Hai run gần nhất, preview và purchase confirmation | Lời “ghi nhận xác nhận mua hàng” đến từ code. Sửa formatter tại nguồn, không nhồi thêm yêu cầu vào prompt hoặc trừ khả năng diễn đạt của owner cho câu code dựng. |

Đây là bổ sung để so sánh nhất quán, không sửa primary/raw/counts lịch sử và không tăng điểm run cũ. Trước một run mới cần ghi nhận cách đánh giá này; không thay nhãn sau khi thấy kết quả để cứu tỷ lệ.

## Thực hiện và self-review

- Reuse giới hạn bốn sản phẩm của hard precheck tại nơi nhận search/read. Cả batch vượt giới hạn bị từ chối trước khi bind hoặc trả dữ liệu mới; vẫn đọc được sản phẩm đã giữ. Không tăng bound, cắt source sau khi viết reply hoặc thêm cơ chế chọn sản phẩm bằng ngôn ngữ.
- Self-review tìm thêm một đường cùng lỗi: search ban đầu chưa có content nhưng readback sau đó bổ sung. Đã tái hiện RED và chặn admission thứ năm ngay trong readback. World thay đổi vẫn phải qua checks hiện hữu; không dùng PASS cũ.
- `productCode` dùng lookup hiện có và chuẩn hóa mã hiện có; kết quả gần giống không được bind như mã được hỏi. Query theo nhu cầu vẫn giữ. Tool contract đã đối chiếu [tài liệu function calling chính thức](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling): `properties` và `required` độc lập; code kiểm ít nhất một trường. Không đổi provider transport/retry/model.
- Owner view thêm `offerLabels` từ đúng `availableOffers`; unknown key giữ null, unknown offers vẫn null. Content/name/variants được giữ, bỏ bookkeeping của current trusted content/presentation; metadata nguồn gốc và history khác phiên bản không bị sửa. Captured-request test giữ firewall evaluator labels và signed native parts.
- Formatter preview viết số lượng trước món, màu bằng chữ thường; recovery dùng lại formatter đó để gắn đúng màu/size từng món thay vì gộp toàn giỏ. Confirmation nói chuyển nhân viên lên đơn, không nói đã tạo đơn POS. Vẫn giữ mã sản phẩm khi chưa có tên đã bind tại formatter; không thêm lookup hoặc persisted display field.
- Owner prompt chỉ đổi hai đoạn về search và lựa chọn bán chưa biết: 9.195 → 9.309 bytes (+114); không thêm ví dụ, câu mẫu benchmark, checklist giọng hoặc điều kiện policy. Verifier giữ nguyên. Owner SHA256 mới: `5e9c85034ccf164274888093650db477b4e296b26dadc35642339993ad520824`.

Complexity delta thực tế: một hằng số dùng lại bound cũ, một argument tùy chọn, một bảng nhãn các loại bán, reuse formatter hiện có; không thêm file runtime, role, gate, parser, framework, durable state hoặc production entrypoint wiring.

## Verification

| Command đã chạy | Evidence |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts --maxWorkers=2 --minWorkers=1` | RED đầu: 6 fail/35 pass; self-review readback RED: 1 fail/41 pass. |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-semantic-verifier-boundary.test.ts --maxWorkers=2 --minWorkers=1` | GREEN sau fix/readback: 95/95. |
| `node --test --test-name-pattern="search exposes exact\|captured owner context names\|owner current product view" apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` | RED: cả 3 tests mới fail trước implementation. |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` | GREEN: 48/48. |
| `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts --maxWorkers=2 --minWorkers=1` | RED: 6 fail/67 pass, đúng các assertion formatter/confirmation đã đổi. |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts --maxWorkers=2 --minWorkers=1` | RED: 3 fail/60 pass, giỏ đổi quantity/variant và nhiều cấu hình. |
| `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-effects.test.ts --maxWorkers=2 --minWorkers=1` | GREEN: 136/136. |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-claim-guard.test.ts --maxWorkers=2 --minWorkers=1` | PASS 119/119. Không sửa shared package. |
| `pnpm --filter @lana/worker build` | Lần đầu fail do hai fixture dùng sai enum `LOW_GAP`; sửa thành `TOP_GAP_TOO_SMALL` đúng contract, chạy lại PASS. |
| `pnpm --filter @lana/worker test` | PASS: benchmark validation; 131 files / 1.889 worker tests; 515 eval tests PASS, 2 SKIP. Hai test opt-in dùng installed Codex với local stub không chạy; không phải provider evidence. |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs` | PASS 58/58 sau self-review cuối: nhãn DIRECT chỉ là “sản phẩm”, không suy thành cả bộ/nguyên chiếc từ key này. |
| `pnpm --filter @lana/worker typecheck` | PASS. |
| `pnpm --filter @lana/worker lint` | PASS. Repo hiện dùng TypeScript noEmit cho lint. |
| `git diff --check` | PASS. |

Self-review: các điều kiện freshness/permission/recipient/receipt/policy/fit vẫn giữ nguyên; không thêm nguồn đọc chỉ để đổi giọng. Snapshot gốc và signed model history không bị mutate; unknown/empty/missing offer vẫn phân biệt. Binding/thứ tự giỏ, tiền và component size/color được kiểm bằng regression hiện hữu. Bound dùng chung thay số 4 rải rác; formatter dùng lại thay một cách gộp giỏ riêng. Không sửa framework, ingress routing hoặc dữ liệu live. Lỗi enum fixture được sửa theo contract, không nới type để pass build.

Phần sửa code/prompt và self-review hoàn tất. Savepoint nguồn/context: `5b75011c`; presentation/prompt và báo cáo nằm ở commit tiếp theo. Chưa chạy provider từ bản sửa này. Test code không chứng minh owner đã bán hàng tự nhiên hơn hoặc hết fallback. Bound bốn sản phẩm vẫn giới hạn phạm vi khám phá; thiếu nguồn lựa chọn bán vẫn cần xử lý trung thực. Giữ A OWNER_BYPASS, B live chưa GO.
