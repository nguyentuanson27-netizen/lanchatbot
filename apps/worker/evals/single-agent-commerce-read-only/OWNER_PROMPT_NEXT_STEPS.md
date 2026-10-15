# Prompt tư vấn bán hàng sau rollback

## Tiếp theo: tư vấn có công cụ đọc — 2026-10-15

Owner bác cách chỉ từ chối món thiếu thông tin vì không giúp bán hàng, rồi yêu cầu sửa/review/chạy lại. [Scope và cách chấm](owner-tools-run-20261015/SCOPE.md), [self-review](owner-tools-run-20261015/SELF_REVIEW.md): thay hai bullet giao việc tư vấn và mở ba tools B1 đã có cho cả hai owner; vẫn same5cases N1/model, verifier/gate/policy nguồn giữ nguyên. Owner hash82964a2a,6.335bytes; không thêm few-shot, câu cấm hoặc case-specific handling. Sol thêm native function-call continuation trên relay hiện có; không thêm role/parser/repair hoặc production wiring. Readiness green; đăng ký/run riêng, không sửa evidence cũ. Các phần dưới là lịch sử trước thay đổi này.

## Bản sửa hiện tại — 2026-10-15

Owner yêu cầu thực hiện hướng sửa sau khi đã rollback. Bắt đầu từ clean HEAD `611c82073ab2cc2ae0bb937ae554cfd235d96d7a`, trên branch B hiện tại; refresh `origin/main` vẫn là `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Chỉ thay [owner prompt](prompts/owner.vi.txt) và hash tương ứng trong base manifest, cùng tài liệu/task. Đây là sửa nội dung prompt, không phải một đợt provider mới.

Prompt chuyển từ hướng dẫn đối chiếu chi tiết sang giao việc cho nhân viên bán hàng: giúp khách chọn và mua, giải quyết phân vân, dùng lý do có ích, nhắn bằng tiếng Việt bình thường. Không thêm ví dụ theo bài kiểm tra, danh sách từ cấm hoặc khuôn trả lời. Quy định thời hạn/phí/điều kiện của shop vẫn đọc từ nguồn, không chép vào prompt.

- Trước: 10.353 byte, SHA256 `d6ba7b6c3a4705fcab140a0d74b527ce9b36ebb9639c1b7cf470eb48a3c02a67`.
- Sau: 5.739 byte, giảm 44,6%; SHA256 `c6cddd33a50e09c69c50bf50ea83574c6d931578552778231b92bc1614983d82`.
- Base manifest chỉ đổi `promptHashes.owner`. Gemini High, comparison Sol Low, verifier Sol High, context serialization, schema, corpus, fallback và generation policy không đổi. Hai registration comparison lịch sử giữ nguyên hash riêng, không dùng lại với prompt mới.

Byte count mô tả input đã sửa, không phải kết quả giọng, token, latency hay chất lượng. Chưa có generation/whole-terminal review cho prompt mới; chưa kết luận model tư vấn tự nhiên hơn hoặc sales usability đã đạt. STOP/OWNER_BYPASS lịch sử giữ nguyên.

### Self-review: rút phần gì và giữ ranh giới ở đâu

| Phần rút/thay | Phần owner vẫn cần hiểu | Code/tool contract hiện có sở hữu |
|---|---|---|
| Bỏ chuỗi tên fingerprint/revision/profile và glossary số đo khỏi lời hướng dẫn chọn size | Phải có SIZE_FIT hiện tại đúng khách/món; thiếu input thì xin đủ phần thiếu, chưa gợi size; không hỏi lại dữ liệu đã có | State tools nhận sửa/bỏ thông tin, CAS, tạo/invalidate fit; current context và final gate kiểm binding/freshness. Existing state/boundary tests kiểm sửa số đo, chart đổi, profile đổi và thiếu input. |
| Bỏ diễn giải lại từng tool và việc tính/kiểm tra của code | Chỉ dùng tool đang có, còn budget, ref đã cấp; giá/tồn theo offerType/biến thể thực tế; tổng/ưu đãi theo cartQuote | Native declarations, bounded owner loop, tool validation và quote arithmetic. Existing adapter/tools/state tests kiểm capability, budget, selling offer, partial source và quote hiện tại. |
| Gộp các đoạn state/effects và bỏ hướng dẫn kỹ thuật của checkout | Áp dụng thay đổi khách trước bước phụ thuộc; thao tác theo yêu cầu; chỉ báo hoàn tất theo receipt; ACK không thành ghi hệ thống; không đưa PII vào model | Existing state/effect executors và final gate giữ CAS, quyền, subject/revision/recipient, receipt lifetime, reconcile và privacy. Không chuyển authority sang model. |
| Gộp policy thành áp dụng quy định vào việc khách hỏi | Việc bị loại trừ phải từ chối đúng việc đó; giải thích quy định không thành duyệt đơn; chỉ hỏi điều quyết định còn thiếu | Current policy source/scope vẫn được truyền đủ, orderEligibility=null vẫn nguyên. Giữ nghĩa có điều kiện của mã HOLD_UP_ONLY; không hardcode policy shop hoặc giả vờ code đã quyết định mọi ngữ nghĩa. |
| Bỏ ví dụ lỗi và danh sách yêu cầu giọng chi li | Tư vấn tự tin về phối/dáng từ dữ kiện; không tự thêm đặc tính/kết quả dùng thật; món thay cần giải quyết đúng yêu cầu | Verifier vẫn kiểm protected semantics của exact draft; code vẫn revalidate trước eligibility. Không bỏ yêu cầu grounding chỉ vì verifier đã có. Giọng và sự hữu ích vẫn cần provider/owner review sau. |

Self-review giữ việc gợi một số đo/nhu cầu có ích, cho phép tư vấn tự tin và upsell phù hợp. Thiếu chứng cứ vật lý không tự thành khuyết điểm; không bịa món thay hoặc giao việc khách ngoài khả năng bot. Không dùng số câu/độ ngắn làm chuẩn đạt. Các instruction state/effect còn lại chỉ áp dụng khi có capability; không thêm prompt router hoặc code cắt context theo ý nghĩa. Thử bỏ source text trùng vẫn là thay đổi riêng chưa làm, để tránh đổi nhiều yếu tố cùng lúc.

Đây là thay prompt tĩnh và manifest, không sửa logic TypeScript/JavaScript hoặc test. Không viết test đếm từ/so câu để tuyên bố sửa được giọng, không tạo RED/GREEN ngữ nghĩa giả. Dùng các test contract/boundary sẵn có và xác minh captured projection; các test fake transport không phải kết quả model thật.

### Verification của bản sửa hiện tại

- `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs`: **37 PASS, 1 optional SKIP**, exit 0. Các test captured request/firewall và provider error/no-retry vẫn chạy bằng fake transport.
- `pnpm --filter @lana/worker test:evals`: **467 PASS, 2 optional SKIP**, exit 0. Không thêm/sửa/bỏ test. Wrapper Windows dùng junction `v4` như baseline; finally đã khôi phục tracked link-text nguyên byte.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts`: **122 PASS**, 7 files, exit 0.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`: **21 PASS**, exit 0.
- Chạy `node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest <historical manifest> --preflight --out <temporary must-not-dispatch>` cho cả `owner-comparison-20261015/manifest.json` và `owner-comparison-followup-20261015/manifest.json`: cả hai expected exit 1 / `COMPARISON_FROZEN_INPUT`, không tạo output. Đây là kiểm tra từ chối registration cũ trước credential/source/provider work, không phải preflight nguồn thật thành công.
- Input/scope readback: owner hash khớp byte; base manifest chỉ đổi owner hash; đúng 5 file prompt/manifest/docs/tasks thay đổi. Historical frozen/raw/primary, test files và mọi worker/shared runtime source không đổi. Không tạo đăng ký/run mới.
- `git diff --check`: PASS.

Không chạy lại worker full src/typecheck/build/lint vì chỉ sửa prompt tĩnh/hash/tài liệu, không sửa TypeScript/runtime/shared package. Kết quả ở các source cũ vẫn thuộc lịch sử riêng. Tests trên không chứng minh model đã tuân thủ prompt mới hoặc giọng đã đạt; việc đó còn cần một run được đăng ký và review nguyên hội thoại. Lượt này tạo **0 provider generations**, không truy cập credential/nguồn live và không deploy/gửi tin. Complexity delta: 0 runtime abstractions/gates/parsers/roles, chỉ thay nội dung owner và hash.

## Lịch sử: rollback và hướng sửa đã chốt

Phần dưới lưu quyết định trước bản sửa hiện tại; identity và trạng thái rollback trong phần này là lịch sử, không phải active prompt hiện nay.

Owner yêu cầu rollback bản vừa sửa và tìm hướng phù hợp. Phạm vi hiện tại là khôi phục prompt/config đang dùng, sửa một giả định sai trong test và ghi hướng xử lý. Không chuẩn bị hay chạy một batch provider mới.

## Bản đang dùng sau rollback

- Khôi phục nguyên byte `prompts/owner.vi.txt` và `manifest.json` từ commit `83061af529f3ce21cb9898823c2c2a1151f30753`, trước thay đổi giọng của batch follow-up.
- Owner prompt SHA256: `d6ba7b6c3a4705fcab140a0d74b527ce9b36ebb9639c1b7cf470eb48a3c02a67`.
- Bản bị bác có hash `0a0abb5bf036f5accb4f4fcb888e26bab0e0f4cc862c295abda803c12a8db233`; vẫn tái hiện được ở source `08b98c2cab0351d4e90d294b51063e94012c45f4`. Raw, manifest, scope và primary của batch đó giữ nguyên.
- Giữ cơ chế chọn registration trong runner vì nó không sửa lời model và cho phép giữ các run lịch sử riêng biệt. Existing frozen-input check từ chối registration không khớp prompt đang dùng trước source/provider work; không sửa hash lịch sử để lách qua kiểm tra.
- Gemini High / Sol Low trong comparison và verifier Sol High giữ nguyên. Source/cache correction, mandatory verifier, current final gate, receipts/privacy/code authority không bị revert. Không deploy hoặc đổi native owner mặc định.

Bản cũ là mốc làm việc được owner yêu cầu khôi phục, chưa phải giọng đã đạt hoặc model đã được chọn. STOP và OWNER_BYPASS của A giữ nguyên; không kế thừa safety/quality PASS từ một run cũ cho source mới.

## Những căn cứ dùng để chọn hướng sửa

[Review correction](owner-comparison-followup-20261015/REVIEW_CORRECTION.md) đã đối chiếu đủ12cặp draft trước/sau. Bản sửa chủ yếu cắt bớt một lời giải trình; Sol vẫn nhắc hoàn cảnh rồi nêu dữ kiện và giới hạn, policy vẫn đọc như đối chiếu hồ sơ. Gemini có câu gần giọng chat nhưng cũng có câu tóm tắt catalog và quyền đổi vượt nguồn. Verifier không rewrite: lời văn đã sinh ở owner.

Đọc thêm hai batch B1 trước cho thấy câu hỏi giá/tồn đơn giản từng được trả gọn, đúng việc: “Set váy Thạch Thảo có giá 799.000đ ạ”, “Áo rời set Thạch Thảo size M nhà em còn chị nhé, giá 499.000đ ạ.” Đây là dữ liệu lịch sử để tham khảo cách đáp, không phải thông tin tồn/giá hiện tại hoặc mẫu đã được owner duyệt cho mọi tình huống. Ca phân vân nhiều ren vẫn dồn lời khen và lặp ngân sách; ca đã mặc đi làm vẫn liệt kê thêm điều kiện sau khi từ chối. Lỗi không chỉ xuất hiện trong batch vừa bị bác.

Request đã xác nhận description/policy bị đưa hai lần qua trusted và trustedSourceReads. Owner tool budget0 nhưng vẫn nhận hướng dẫn cả state/fit/cart. Các đặc điểm này có từ bản cũ; tác động lên giọng là giả thuyết chưa được kiểm chứng riêng. Source/history/latest không bị mất giữa hai batch.

## Hướng được đề xuất: làm lại cách giao việc của owner trước

Mục tiêu cần giao cho owner là giúp khách chọn và mua đúng món của shop: hiểu khách đang cần quyết định điều gì, chọn hoặc trả lời rõ bằng dữ liệu có sẵn, giải thích điều giúp mua, rồi tiến tới bước thực hiện được. Câu trả lời không cần thuật lại việc kiểm tra nguồn hoặc chứng minh lại toàn bộ thông tin khách đã nói.

Đây là một bản thay thế có chủ đích cho phần giao nhiệm vụ, không phải nối thêm đoạn “nói tự nhiên” vào prompt hiện tại. Chuẩn bị candidate riêng, chưa ghi đè bản đã rollback. Rà từng đoạn theo bảng sau trước khi chạy:

| Phần | Cách xử lý trong candidate | Ranh giới phải giữ |
|---|---|---|
| Vai trò và cách nhắn | Giao rõ việc tư vấn/bán hàng và mức giải thích cần cho khách; dùng lời thường ngày. Không bắt câu nào cũng nêu lại yêu cầu, chất liệu, giới hạn hoặc câu chốt. | Không bỏ nhu cầu khách, không bịa đặc tính hoặc thao tác để câu nghe thuyết phục. |
| Giải thích lựa chọn | Chọn đặc điểm thực sự giúp khách quyết định. Cho phép dẫn một số đo/nhu cầu có ích; đánh giá cả đoạn thay vì cấm riêng cụm từ. | Phân biệt nhận định phối/dáng có căn cứ với lời khẳng định vật lý/kết quả sử dụng cần nguồn. |
| Size/quote/effects | Giữ quy tắc dùng kết quả code xác nhận cho đúng khách/món và chỉ báo thành công theo receipt. Rà phần mô tả kỹ thuật đã thuộc code/tool contract để không buộc owner tự diễn giải nó. | Chỉ bỏ phần trùng khi xác định code/tool hiện có vẫn sở hữu đúng invariant. Không chuyển quyền xác minh identity/revision/freshness/permission sang model. |
| Chính sách | Áp quy định vào đúng việc khách đã làm hoặc đang hỏi. Nêu kết luận và phần còn cần biết; không đọc lại mọi điều khách đã xác nhận. | SHOP_RULES không thành duyệt đơn; điều kiện còn chưa biết không được tự coi đã thỏa. Không hardcode thời hạn/phí/quyền đổi trong prompt. |
| Bước tiếp theo | Là việc đang làm được trong lượt hoặc một câu hỏi giúp quyết định. Đủ thông tin trả lời rồi thì dừng. | Không hứa kiểm tra nền, giữ hàng/handoff/thao tác khi không có khả năng và kết quả tương ứng. |

Mẫu giọng cần được kiểm tra bằng cả đoạn nhắn, không bằng độ dài, thêm dạ/nhé hoặc có đủ từ khóa. Những câu Sol trước đây bị gắn NATURAL dù vẫn gượng là ví dụ phản chứng, không dùng làm mẫu tích cực. Chọn lại những đoạn đã thực sự được chấp nhận trong lịch sử; đoạn agent tự soạn để minh họa phải ghi là bản nháp cần xem, không tự công nhận là giọng chuẩn.

Giữ đủ quyền tư vấn tự tin từ dữ kiện đã có. Cả lời khuyên từ chối một món cũng phải rõ, gọn và có ích; thiếu dữ liệu sản phẩm cần được bổ sung từ nguồn khi có khả năng, không biến thành mặc định viết một đoạn dè dặt. Không tự bịa một món thay hoặc lý do vật lý để làm câu dễ nghe.

## Kiểm tra để không lặp lại vòng sửa cũ

1. Chuẩn bị candidate và bảng chỉ ra từng nhóm ràng buộc được giữ ở đâu; đối chiếu các vấn đề owner đã bác. Đọc lại câu hỏi và ví dụ đầu vào để tránh ngữ cảnh không giống chat mua hàng.
2. Giữ nguyên model/config/verifier/schema/context/corpus khi thử riêng candidate này. Không đồng thời đổi context trùng, effort, verbosity, policy hoặc scoring rồi quy kết quả cho prompt.
3. Khi được yêu cầu chạy tiếp, tái dùng các ca đang có: hỏi giá, băn khoăn nhiều ren/ngân sách, đã dùng hàng rồi hỏi đổi, cùng hai ca regression hiện tại. Hai ca khó không phải thước đo duy nhất cho giọng bán hàng. Không tự tạo thêm hàng trăm ca hay tăng repetitions.
4. Đọc ACTUAL TERMINAL CUSTOMER OUTCOME trước; nhận xét riêng việc giúp khách mua, giọng có thể gửi nguyên đoạn và factual/action safety. Câu ngắn hoặc PASS verifier chưa đủ để gọi tư vấn đạt. Fallback phải được tính đúng tác động lên trải nghiệm; không lấy draft bị chặn thay kết quả thật.
5. Giữ từng lần sinh và lỗi trong mẫu số, không rewrite/reverify/retry hoặc chọn bản hay nhất. Một batch có phạm vi đã chốt kết thúc bằng review, không tự lặp tới khi số đẹp.

Context trùng là hướng thử riêng sau đó nếu vẫn còn vấn đề: chỉ một biểu diễn nguồn cho mỗi loại dữ liệu, giữ scope/provenance cần thiết và lịch sử nguyên mạch. Không xóa nguyên trustedSourceReads: scopeSHOP_RULES/orderEligibilitynull, offerType thực tế, availableOffers và availability đang có ý nghĩa riêng ngoài phần nội dung bị trùng; phải giữ chúng và toàn bộ điều kiện policy. Việc này cần test projection/firewall/binding hiện có; chưa được implement trong rollback này. Tool/capability phải khớp đường chạy; chưa dùng diagnostic tools-off làm bằng chứng native Sol tool loop đã đạt. Không thêm role, semantic router hoặc framework mới.

Tham chiếu: [OpenAI Docs về reasoning prompts](https://developers.openai.com/api/docs/guides/reasoning-best-practices) khuyên mục tiêu/ràng buộc/đầu ra rõ và không buộc trình bày từng bước suy luận. Đây là cơ sở thiết kế thử nghiệm, không chứng minh candidate sẽ tự nhiên hoặc an toàn. [Đúng model Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol); không đổi model đã được owner chọn.

## Verification của rollback

- `git fetch origin main` / `git rev-parse origin/main`: main vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Readback hai file nguyên byte bằng `git show 83061af5:<path>`: PASS. Active manifest chỉ đổi owner prompt hash; models/config/verifier/schema/fallback giống trước rollback.
- Focused owner-comparison/Gemini/protocol/Codex adapter tests: sau restore thấy36PASS/1FAIL/1optionalSKIP vì một assertion sai về active/frozen hash; sửa đúng phạm vi test rồi37PASS/1optionalSKIP.
- `pnpm --filter @lana/worker test:evals`: 467PASS/0FAIL/2optionalSKIP.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts`:60PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21PASS.
- `node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-comparison-followup-20261015/manifest.json --preflight --out <temporary must-not-dispatch>`: expected exit1/COMPARISON_FROZEN_INPUT, output directory không tạo; xác nhận từ chối trước credential/source/provider work. Không gọi đây là một preflight nguồn thật thành công.
- `git diff --check`:PASS. Full-eval wrapper tạm dùng Windows junction v4 theo baseline; finally restore byte-exact. Historical raw/frozen/primary và worker/shared source không đổi.

Worker full src/typecheck/build/lint không chạy lại trong rollback này vì không sửa TypeScript/runtime/shared package; kết quả1715workerPASS và typecheck/build/lint của source08b98c2c giữ phạm vi lịch sử riêng, không báo là command mới chạy. Current checks ở trên đã chạy thật. Rollback tạo0provider generations, không claim semantic/voice improvement hoặc quality/safety PASS mới. Giữ các lỗi cũ còn mở và STOP. Delivery dùng commit mới trên branch hiện tại/draftPR391, không reset lịch sử hoặc force-push.
