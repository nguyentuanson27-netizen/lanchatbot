# Phase B — rollback hành vi và phương án sửa từ hai vòng gần nhất

Owner yêu cầu rollback, review hai vòng chạy và hai lượt sửa gần nhất, rồi đưa phương án fix. Phạm vi thực hiện lần này: rollback có chọn lọc, kiểm tra và kế hoạch; **không triển khai các bước fix đề xuất hoặc chạy provider mới**. A vẫn OWNER_BYPASS; B chưa đạt chất lượng bán hàng/live acceptance.

Intake: `d170e3356cad50d32fce08e9d0c2f94e079f6c1d`. Main vừa fetch: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Tiếp tục branch `feat/c3-phase-b-commerce-20261014`, draft PR391. Không reset lịch sử Git hoặc sửa artifact đã seal.

## 1. Rollback đã thực hiện

- Khôi phục đúng bytes của `prompts/owner.vi.txt` tại `571c4403bc00198daaedc150c244659f55da750c` (trước `6c5befca`): 12.478 bytes; SHA256 `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`. Cập nhật riêng hash owner trong manifest đang dùng.
- Đưa execution về `trusted.execution` trong user data: `availableTools` và `toolBudget` như cấu trúc trước. System chỉ có prompt owner; native `toolConfig` vẫn cấp AUTO/NONE và runtime vẫn kiểm quyền.
- Giữ kiểm tra ngân sách là số nguyên trong giới hạn, chỉ sao chép hai field đã biết; giữ `OWNER_TOOL_MODE`/completion-error accounting, chặn gọi muộn và receipt recovery hiện có.
- Giữ consumer Sol đọc đầy đủ system parts. Giữ thay đổi `cf137da4` bỏ root offer trùng khi có đủ bằng chứng tương đương ngay trong cùng response.
- Không đổi verifier, source/policy, domain state/effects, tool schema, model, ngân sách, corpus, rubric hoặc fallback.

Đây là baseline sau rollback có giữ sửa kỹ thuật, không phải toàn bộ tree quay về `571c4403`. Chưa có model evidence cho baseline này; kết quả vòng cũ không được gán sang baseline mới.

## 2. Hai lượt sửa đã làm gì và đã chứng minh được gì

| Lượt sửa | Thay đổi thực tế | Bằng chứng / giới hạn |
| --- | --- | --- |
| `cf137da4` → run `b3107465` | Adapter bỏ root facts/offer trùng nếu sellingOptions cùng response chứa đủ cùng scope/version/freshness; làm rõ mô tả read_product. Hai prompt giữ nguyên. | Captured wire kích hoạt 28 lần; không mất bằng chứng theo controls. Không chứng minh model chọn tool tốt hơn: cả ba opening vẫn đọc trước add, một lần gọi size không cần, năm lần gọi dưới NONE. |
| `6c5befca` → run `4619eaa5` | Thêm phần mua hàng vào prompt (+1.018 bytes), đưa execution lên system, sửa accounting NONE và consumer system parts. | Instructions thực sự tới provider; NONE giảm từ 5/9 xuống 2/8 request cuối, nhưng opening thất bại 3/3 và B1 giảm. Prompt và vị trí execution đổi cùng lúc, không thể tách tác động nhân quả. |

Nguồn: [vòng offer projection](../../apps/worker/evals/single-agent-commerce-read-only/offer-projection-run-20261018/CHECKPOINT_B.md), [vòng execution contract](../../apps/worker/evals/single-agent-commerce-read-only/execution-contract-run-20261018/CHECKPOINT_B.md), hai file DIAGNOSIS và CONVERSATIONS_AND_REVIEW đi kèm, diff hai commit nêu trên. Đã đối chiếu toàn bộ 45 primary outcomes mỗi vòng, các câu thụt lùi và traces lỗi; không chấm lại hoặc sửa nhãn cũ.

## 3. So sánh cùng 15 ca × 3 = 45 outcomes mỗi vòng

| Chỉ số | Offer projection | Execution contract |
| --- | ---: | ---: |
| USABLE / NEEDS_EDIT / UNUSABLE / controls | 32 / 1 / 9 / 3 | 23 / 8 / 11 / 3 |
| B1: USABLE / NEEDS_EDIT / UNUSABLE | 20 / 1 / 3 | 9 / 8 / 7 |
| Stateful usable (gồm code preview/confirmation) | 12 / 18 | 14 / 18 |
| Static fallback | 7 | 11 |
| Nhận mua đầu tiên hoàn tất | 2 / 3 (một code recovery) | 0 / 3 |
| Đến preview và xác nhận mua | 2 / 3 | 3 / 3 |
| Model finals verifier PASS / FAIL | 28 / 3 | 25 / 8 |
| Upstream generation requests | 115 | 117 |

12 B1 outcomes từng USABLE bị giảm: 7 NEEDS_EDIT + 5 UNUSABLE. Có 8 giữ USABLE, một NEEDS_EDIT lên USABLE, một UNUSABLE lên NEEDS_EDIT và hai giữ UNUSABLE. Không quy giảm điểm chỉ cho cách chấm: các lỗi thêm quy định bán nguyên bộ, hẹn xử lý và so giá có trong chính câu sinh mới. Tuy nhiên đánh giá giọng/quyết định là review kỹ thuật chủ quan, không phải owner acceptance.

Nguồn được đọc theo từng thời điểm và stateful history đổi theo thất bại; N=3 không chứng minh ổn định hoặc một nguyên nhân duy nhất của chênh lệch. Hai verdict sân khấu vòng trước và một số cách đọc stage/so giá vòng sau còn chưa phân xử. Không đổi chúng thành PASS hay kết luận verifier sai chỉ dựa vào kind/ref.

## 4. Root cause, độ chắc chắn và phần còn chưa biết

### A. Thiếu loại hàng dẫn đến lỗi màu sai phạm vi — đã xác nhận trong code và trace

Vòng mới rep3 mở giỏ: model giữ BE/M nhưng bỏ `offerType`. Native add schema cho phép bỏ; effects truyền null; `realtime-sales-catalog.resolveOffer` chọn theo OFFER_PRIORITY. Trả `CART_COLOR_NOT_FOUND` từ loại mặc định; owner kết luận áo không có màu be. Read tiếp có AO/CV/SET_VAY nhưng không sửa được kết luận.

Đây không phải thiếu tồn màu BE được chứng minh. Màu chỉ có nghĩa khi gắn đúng loại hàng. Lượt sửa trước xử lý phần trình bày kết quả đọc, chưa xử lý đầu vào thao tác mua. Nhắc giữ lựa chọn không loại bỏ default này.

### B. Bằng chứng số đo dễ bị từ chối; nguyên nhân bị gộp — đã xác nhận

Rep1 mở giỏ trích `Eo chị 76, mông 98.` cho cả WAIST/HIPS. Giá trị đúng nhưng `measurementSource` yêu cầu một scalar/quote; exception SCALAR bị gộp cùng SOURCE/TOKEN/UNIT thành `MEASUREMENT_SOURCE_INVALID`. Trả unresolvedFields mà không nói trường nào sai theo cách nào. Tại lượt correction, model có thể tự sửa thành từng quote ngắn và thành công; đây là bằng chứng contract dùng được nhưng khó thực hiện ổn định.

Lượt sau rep1 còn trích lại 76/98 từ history, vi phạm nguồn tin hiện tại — lỗi riêng, không được chữa bằng chấp nhận mọi quote cũ. State pending chặn effect và hard precheck; không bỏ boundary này chỉ để mở giỏ được.

### C. Nguồn chưa biết bị biến thành quy định không bán lẻ — owner inference đã xác nhận; yếu tố kích hoạt chưa được tách

Ba ca chân váy vòng trước trả đúng phần có nguồn; vòng sau cả ba thêm bán nguyên set và bị chặn. Đã đọc captured continuation rep1 hai vòng: cùng description/sourceVersion, availableOffers/sellingOptions null, price/stock UNAVAILABLE. Không có bằng chứng nguồn mới nói chỉ bán bộ.

Wire còn trả top-level OK cho một read có mô tả nhưng thiếu commerce; adapter biến lý do POS_SNAPSHOT_UNAVAILABLE thành null. Model phải tự phân biệt đọc được mô tả với chưa biết cách bán. Đây là ứng viên làm context khó hiểu, không phải bằng chứng top-level OK hoặc null một mình gây lỗi: vòng cũ đã hiểu đúng cùng dữ liệu. Không cần bổ sung facts sản phẩm giả hoặc đổi dữ liệu thật để cứu kết quả.

### D. Bước tiếp theo và lập luận bán hàng không ổn định — đã thấy trong lời trả lời

- Cả ba ca set M partial ở vòng mới hẹn kiểm tra/chờ/nhắn sau; B1 chỉ có search/read/policy, không có công việc theo dõi sau lượt. Vòng trước trả phần biết rồi dừng.
- Một ca nói set 799k tiết kiệm hơn chỉ mua áo 499k: sai phạm vi so sánh, verifier chặn đúng. Các ca “lợi hơn” với nhiều món hơn cần đọc cả đoạn; không phạt upsell hoặc buộc chọn rẻ nhất.
- Một ca tự thêm “không đính bèo nhún”; mô tả không nhắc bèo không chứng minh không có.
- Một ca đưa cả áo và váy rồi để khách tự chọn; một ca hứa giữ hàng khi B1 không có khả năng đó. Giọng thường bắt đầu bằng mô tả catalog, nối nhiều tính từ rồi mới xử lý nhu cầu.

Prompt đã có quy tắc tương ứng nhưng không ổn định. B1 vẫn đọc hướng dẫn giỏ/state dù chỉ có read tools; tải hướng dẫn không phù hợp capability là giả thuyết cần đo riêng, chưa phải nguyên nhân đã chứng minh. Không dùng nó để biện minh viết lại toàn prompt ngay lần tới.

### E. NONE là lỗi cuối chuỗi, chưa giải thích được nguyên nhân bên trong provider

Vòng cũ năm calls dưới NONE, vòng mới hai. Native NONE/empty declarations đều có. Code chặn đúng; tăng budget hoặc cho gọi muộn sẽ che lỗi và đổi semantics. Tối ưu đúng đầu vào trước để model bớt tiêu tốn hai tool rounds vì read thừa, mất màu, sai quote. Vẫn phải đo NONE riêng, không hứa sửa đầu vào sẽ triệt tiêu lỗi provider.

## 5. Phương án fix đề xuất — chưa thực hiện

Thực hiện từng bước, giữ một owner/ít nhất quyền tool cần thiết/một verifier; không thêm role, router, parser tiếng Việt, durable selection state, repair loop hoặc tăng budget. Code xác minh nguồn, không diễn giải ý khách bằng regex.

### F1 — Bắt buộc chọn đúng loại hàng trước thao tác mua

1. Trong candidate add contract, yêu cầu `offerType` được truyền rõ và kiểm ngay tại effects boundary. Dùng enum từ nguồn đã xác minh khi có; chưa có thì owner đọc bằng tool hiện hữu. Không tự suy AO từ chữ “áo” trong code, không mặc định loại theo thứ tự ưu tiên.
2. Thiếu loại hàng trả lỗi đầu vào cụ thể, chưa gọi selector/mutation và không trả danh sách màu của loại mặc định. Sai loại đã truyền khác với chưa truyền; sai màu chỉ được báo trong loại đã xác định.
3. Không đổi `resolveOffer` dùng chung cho read/legacy mặc định nếu có thể chặn ngay candidate boundary. Không thêm gate mới ngoài kiểm args hiện hữu.
4. Test trước: missing offer không select/commit; explicit AO đúng màu thành công; set vẫn là set; sai màu đúng offer vẫn từ chối; change_cart_item giữ offer của CART_LINE; duplicate không thêm lần hai. Controls không pin tên/màu/giá của một case.

F1 không chữa được model truyền color=null dù khách đã nói màu: vòng cũ lỗi này lặp ở rep3, vòng mới rep2 mở giỏ và rep1 đổi giỏ. Schema đã bắt buộc field color, nên chỉ thêm required không giải quyết. Code không đủ thẩm quyền suy màu từ hội thoại để điền hộ. Giữ lỗi này trong priority evaluation; nếu còn xảy ra, cô lập request trước add để so cách trình bày tin hiện tại/history với state, không thêm persisted lựa chọn hoặc gán màu tồn duy nhất. Không tuyên bố F1/F2 giải quyết toàn bộ lỗi mua hàng.

### F2 — Cho model biết đúng lỗi số đo trong lần tiếp tục hiện có

1. Giữ sourceQuote và kiểm tra scalar hiện có trước; chưa mở rộng chấp nhận quote nhiều số, chưa tạo offset/proof schema mới.
2. Giữ mã public tổng nếu consumer cần; bổ sung chi tiết bounded cho field bị lỗi từ chính validation hiện tại: quote không thuộc tin hiện tại/không duy nhất, có nhiều scalar, giá trị không khớp hoặc đơn vị sai. Không trả message/raw error/PII tùy ý.
3. Nếu validation phát hiện lỗi từng op, cả batch vẫn không ghi một phần. Model sửa argument trong vòng tool còn lại, không sinh thêm vòng ngoài budget. Chỉ giữ quote gắn tin mới; không tự replay số đo history.
4. Test trước: một câu chứa hai số báo đúng lỗi từng field, quote một số hợp lệ ghi đúng; sai giá trị/nguồn cũ/quote trùng/đơn vị sai vẫn chặn; height notation hiện được hỗ trợ không bị mất. CAS/revision/receipt và dependent-state blocking giữ nguyên.
5. Nếu model vẫn không sửa được với lỗi cụ thể, đánh giá lại contract trước khi nghĩ đến một proof format khác. Không coi thêm chi tiết lỗi là đã sửa xong độ tin cậy.

### F3 — Làm rõ dữ kiện chưa có ngay trong kết quả đọc, đo riêng

1. Reuse availability.status/reason: nguồn POS không đọc được map sang lý do công khai SOURCE_UNAVAILABLE thay vì null; không đưa tên hệ thống/diagnostics riêng tư cho model. availability của từng phần tiếp tục là authority; top-level OK chỉ nghĩa call có kết quả. Không đổi OK thành lỗi tổng làm mất mô tả đã đọc được.
2. availableOffers/sellingOptions null vẫn là chưa xác nhận. Chỉ trả “không có loại này” từ nguồn đủ và truy vấn đúng offer. Chưa thêm schema song song hoặc field kể lại cùng thông tin.
3. Test unknown, source unavailable, known offers, explicit offer absent, stock zero, stale, partial with content; không collapse các trạng thái này. Giữ locality của source evidence/native history/signature.
4. Chạy cặp ca partial chân váy/set và control nguồn đầy đủ để xem thay đổi có giảm suy only-set/hẹn suông hay không. Nếu không, không tiếp tục bổ sung nhiều nhãn cùng nghĩa; giữ kết quả và review prompt/context riêng.

### F4 — Giọng và quyết định bán hàng sau khi các contract đã rõ

Giữ prompt rollback trong F1–F3. Chỉ khi lỗi còn xuất hiện mới sửa một đoạn hướng dẫn liên quan; không đồng thời đổi giọng, vị trí system và verifier. Nếu thử bỏ hướng dẫn state/effect khỏi B1, lựa chọn đoạn phải dựa trên capability do code cấp, không classifier đoán ý khách; mỗi surface có hash và test consumer đầy đủ. Đây là bước có điều kiện, chưa chốt thêm cơ chế lắp prompt.

Review toàn câu: có giúp khách chọn/mua không, lý do có đúng và có bước thực hiện được không. Nhắc dữ kiện vừa sửa có thể hữu ích; không cấm mọi nhắc số đo. Gợi lớp mặc trong và thẩm mỹ tự tin được phép; không cam kết độ kín dưới đèn cụ thể khi chưa có căn cứ. Chưa thay verifier hoặc nhãn sân khấu trong kế hoạch contract này.

## 6. Cách kiểm chứng, tránh lặp lại cách sửa vừa rồi

- Deterministic RED→GREEN trước cho F1/F2/F3, kiểm đúng risk đang đổi. Không viết test chỉ tìm keyword trong prompt.
- Dùng các trạng thái/request lỗi đã lưu cho replay offline: chỉ chứng minh code hiểu cùng arguments đúng; không ghi là provider PASS.
- Khi được yêu cầu chạy model: freeze một thay đổi hoặc nhóm thay đổi phụ thuộc rõ ràng, cùng model/config/corpus/rubric. Dùng ca lỗi trước cùng ca từng tốt, mỗi ca 3 lần; đăng ký số lượt trước provider, giữ mọi lỗi. Không phát sinh thêm ca chỉ để tăng tỷ lệ PASS.
- Ca ưu tiên dùng lại: nhận mua, đổi size/số lượng sau failure, sửa số đo, partial chân váy và set; controls gồm add đúng loại/màu, quote đã có, policy và tư vấn upsell. Stateful phải chạy cả mạch cần thiết và giữ downstream failures; không đếm một continuation tách lịch sử như hành trình thật.
- Chỉ chạy full sau khi ca ưu tiên và controls đạt tiêu chí đã freeze. Không dùng majority, bỏ attempt hoặc sửa prompt giữa run. Không gán cả mức tăng/giảm cho một edit nếu source/history không được kiểm soát.
- Ghi riêng: customer outcome, committed state, model tool adherence, verifier decision, giọng/quyết định. Giảm fallback nhờ code summary không chứng minh owner tư vấn tốt hơn; cuối hành trình mua thành công không xóa lỗi đầu hành trình.

## 7. Verification của rollback

Đã chạy: adapter RED với hai assertions thất bại khi execution còn ở system; sau rollback test consumer lộ hai expectations cũ còn đọc system part thứ hai, đã cập nhật đúng projection user-data. Không thay assertions về authority/history/evaluator privacy/budget.

- Focused adapter/protocol/owner-comparison: 63 PASS.
- `pnpm --filter @lana/worker test:evals`: 506 PASS / 2 optional SKIP / 0 FAIL, 508 registered.
- Focused runtime/effects/state/ingress/verifier-boundary: 160 PASS.
- `pnpm --filter @lana/worker build`: exit 0 (canonical dependency prebuild rồi worker tsc).
- `pnpm --filter @lana/worker lint`: exit 0; script này là `tsc -p tsconfig.json --noEmit`, đã kiểm type. Không chạy lặp riêng script typecheck/prebuild hay full worker Vitest vì rollback chỉ đổi eval adapter/prompt; không claim full-repo/CI PASS mới.
- `git diff --check`: exit 0. Python kiểm prompt bytes bằng Git blob571c4403, manifest hash, danh sách file được đổi và không diff hai run folders/runtime: PASS. Hai link nguồn trong doc tồn tại.
- Provider requests mới: 0. Không claim CI hoặc full behavioral PASS.

Exact focused commands:

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Rollback code savepoint: `fde1f627d51de49079d01bc73b8c05736fed249b`. Logs Node/worker/build/lint nằm trong `%TEMP%/c3-rollback-20261018-*.log`. Các lần RED/consumer failure trước GREEN giữ nguyên trong output phiên làm việc, không được báo PASS.

Complexity delta: gỡ phần prompt +1.018 bytes và system execution part; giữ hai field budget validation. Không thêm production layer/state/proof/gate; tài liệu kế hoạch không phải implementation. Các artifacts hai vòng trước bất biến.

## 8. Self-review phương án

- Chỉ require offer ở candidate add; không vô tình đổi default read cho toàn ứng dụng. Không bắt model có giá/tồn trước add khi tool tự đọc được.
- Không mở rộng phép nhận quote nhiều số ngay: có thể che nhầm field/referent. Dùng lỗi validation hiện hữu rõ hơn trước, giữ bằng chứng tin hiện tại và atomic batch.
- F3 là giả thuyết presentation, không phải kết luận chỉ cần đổi null là hết hallucination. Vòng trước đã trả đúng cùng partial data; phải có controls và đo riêng.
- Chưa mặc định chia prompt thành framework nhiều module. Capability mismatch đáng kiểm tra nhưng chưa được tách khỏi biến động generation.
- Không sửa fallback để che failure, không đổi nhãn stage để cứu điểm, không tăng budget hoặc bỏ verifier. Thành công deterministic không đồng nghĩa thành công tư vấn.
- Việc rollback chọn mốc cũ là quyết định hạn chế thay đổi chưa chứng minh được, không phải bằng chứng mốc cũ ổn định. Cần source identity mới nếu chạy provider lại.
