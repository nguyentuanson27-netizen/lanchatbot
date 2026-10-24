# Phase B — xác định nguyên nhân trước khi sửa tiếp phần tư vấn

**Kết quả triển khai 2026-10-21: COMPLETE_8_STOP_BEFORE_FULL.** [Report](../../apps/worker/evals/single-agent-commerce-read-only/advice-capability-20261021/CHECKPOINT_B.md). Source `eae41b53`;62focusedPASS/buildPASS;8/8native attempts,24requests,0error/timeout/retry,1actualfallback. Candidate không cho tiến bộ concern rõ theo tiêu chí, nên không chạy nhánh full32 và không promote. Phần PLAN_ONLY bên dưới giữ lại như kế hoạch trước triển khai, không phải trạng thái hiện tại. Không tự mở nhánh khác.

Ngày 2026-10-21. Trạng thái **PLAN_ONLY**. Base `a07552cbf5dcafc78f32964721dcb713cf632996`.
Yêu cầu hiện tại: lập kế hoạch chi tiết; chưa sửa runtime/prompt hoặc chạy provider.

Đã chỉnh theo review độc lập ngày 2026-10-21: bỏ nhánh final-only vì coverage quan sát được là 0/7 findings. Phép thử mới dùng luồng B1 AUTO thực tế, chỉ thay hướng dẫn của các thao tác không có trong capability B1. Đây là kế hoạch thay thế; không thực hiện phép replay tools-OFF của bản đầu.

## 1. Mục tiêu và lý do thay cách làm

Bot là nhân viên bán hàng thời trang: hiểu điều khách còn phân vân, giúp khách chọn hàng của shop, giải thích bằng lời chat có ích và đưa bước mua phù hợp. Không lấy số fact, độ ngắn hay verifier PASS làm bằng chứng tư vấn tốt.

Hai commit `ae461e0d` và `ef3a1cfb` đã sửa đúng các ý “chọn theo điều khách còn ngại”, “không trả việc chọn lại”, “không viết catalog”, “không nối lời khen”. Prompt hiện hành vẫn giữ chúng. Viết lại các ý đó lần nữa không được coi là can thiệp mới.

Nguồn đối chiếu:

- [32 outcomes mới nhất](../../apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020-r2/CONVERSATIONS_AND_REVIEW.md): B1 18 USABLE / 6 NEEDS_EDIT; stateful 6 USABLE / 1 NEEDS_EDIT / 1 ownership control; không fallback.
- [Kế hoạch chọn ý đã thực hiện](c3-phase-b-advice-focus-plan-20261020.md): đã có đối chứng prompt, kết quả chưa chứng minh cải thiện ổn định.
- [Bản sửa giọng ngày 19/10](c3-phase-b-chat-expression-fix-20261019.md): đã thay các bullet hiện hữu, không phải thiếu một lần rút gọn nữa.
- [Phân công model–code](c3-phase-b-model-code-division-plan-20261019.md): giữ một owner, tối đa một verifier và code làm chủ authority/effects.

Không làm lại phép thử biên tập mô tả sản phẩm dưới tên mới: phép thử trước chưa chứng minh mô tả candidate tốt hơn. Không đổi model, verifier hoặc ngưỡng để cứu kết quả tư vấn.

## 2. Điều đã biết và điều còn là giả thuyết

| Finding | Bằng chứng | Chưa được kết luận |
| --- | --- | --- |
| B1–7 lý do chưa giải quyết lo ren rườm rà | Dùng mềm/rũ/bay để trấn an về mức độ trang trí | Không tự kết luận cần ảnh hay thêm hàng loạt field; phải kiểm nguồn cụ thể |
| B1–15 thiếu lập trường | Khen cả bộ, đề xuất váy lẻ, rồi hỏi khách chọn | Không đồng nghĩa model hoàn toàn không hiểu khách |
| B1–23 nhận ra phương án nhưng trả việc chọn lại | Đã nêu áo lẻ hợp mặc lại, vẫn hỏi ưu tiên đã có | Có thể là cách trình bày hơn là thiếu kiến thức |
| B1–3/11 nói sai sắc thái của unknown | Context có SOURCE_UNAVAILABLE, reply nói hệ thống/chưa có thông tin bán lẻ | Không mặc định code đánh mất availability nếu chưa đọc exact request/tool result |
| B1–9 trấn an mạnh | “Không sợ bị bí nóng khi ở ngoài trời lâu” | Chưa tự adjudicate unsafe false PASS; giữ quyền inference chất liệu owner đã chấp nhận |
| Stateful correction nói như phần mềm | State sửa đúng, reply kể cập nhật hồ sơ | Không sửa receipt/state để chữa giọng |

Review đã kiểm raw: B1–7/15/23/17 đều AUTO→AUTO; sáu B1 NEEDS_EDIT (3/7/9/11/15/23) và stateful correction đều final AUTO. Chỉ B1–1/6/14/22 tới NONE, cả bốn đang USABLE. `single-agent-commerce-read-only.ts` chuyển final-only khi hết ngân sách tool; một output FINAL không đồng nghĩa request NONE. Vì vậy, sửa chỉ khi `toolsAllowed=false` không chạm bảy findings; nhánh đó đã bị loại trước provider.

Giả thuyết thay thế: hướng dẫn thao tác ghi state/giỏ/handoff không khả dụng trong B1 có thể ảnh hưởng cách tư vấn của B1 ngay khi tool mode là AUTO. Đây vẫn là giả thuyết, không phải root cause đã xác nhận. `readOnlyDeclarations` hiện chỉ có `search_products`, `read_product`, `read_policy`; phải giữ đủ hướng dẫn ba tool đó. Không kết luận mọi prompt dài đều gây nhiễu.

## 3. T1 — audit exact input và khóa phép đối chiếu

Phụ thuộc: không. Phạm vi: đọc source/capture và tạo registration bằng cấu trúc eval hiện hữu.

1. Đọc runtime latest/history, public context, toàn chuỗi owner request/tool result của B1–7/15/23 và B1–17. Ghi cho từng ca: quyết định khách đang nhờ, dữ kiện liên quan đã có, dữ kiện thực sự thiếu, declarations/mode/tool budget và lời khuyên khả thi từ nguồn. Gắn mỗi finding với request thực sự sẽ nhận candidate; không suy từ chữ FINAL thành tools OFF.
2. Đối chiếu riêng B1–3/11 và stateful correction để định vị hai finding ngoài tư vấn. Chưa sửa chúng trong thử nghiệm này.
3. Dùng initial inputs và source configuration của luồng B1 hiện hữu, để model tự thực hiện search/read với cùng quyền và ngân sách. Không replay câu cuối bằng tools OFF. Kiểm native functionCall/functionResponse history được giữ qua các lượt như runtime hiện tại; không thay bằng bản tóm tắt do evaluator viết.
4. Xác minh registration có thể chạy đúng bốn case hiện hữu theo từng arm bằng dispatchRange. Nếu cần, chỉ thêm explicit frozen prompt-path/hash và arm registration tại runner hiện có; không đổi corpus 24 ca hoặc count full để báo selected run như full. Nếu source không khả dụng hoặc thay version giữa cặp, giữ attempt/accounting và báo cặp không so sánh được; không bịa facts, đổi ca hoặc sinh mẫu bù.

**Đầu ra:** bảng ngắn có đường dẫn evidence/mode/capability cho từng finding; bốn initial input đã khóa; exact control/candidate prompt và diff; danh sách chỉ dẫn bị bỏ và lý do tool đó không có trong B1. Không thêm semantic summary, intent/obligation JSON hoặc đáp án vào runtime input.

## 4. T2 — tạo hai arm chỉ khác hướng dẫn vận hành không dùng được

Phụ thuộc T1. Reuse B1 `run.mjs`, `runCommerceTurn`, Gemini adapter, source adapters và dispatchRange. `advice-diagnostic.mjs` không phù hợp cho phép thử này vì ép tools OFF và bỏ native tool history; không sửa nó thành một framework replay mới.

**Control:** exact prompt hiện hành. **Candidate B1:** bản sao prompt đó, chỉ bỏ hướng dẫn thao tác của tool không có trong B1, áp dụng từ request đầu và xuyên suốt lượt B1, kể cả AUTO. Không chọn prompt theo caseId, ý định, nhãn evaluator hoặc việc model sắp trả lời FINAL.

Các phần được xem xét bỏ: cú pháp/thứ tự gọi `apply_customer_state`, SET/REPLACE/CLEAR và sourceQuote; cách gọi `add_to_cart`, `change_cart_item`, `confirm_purchase`, `recommend_size`, `request_handoff` khi những tool đó không được expose trong B1. Không bỏ nghĩa của state conflict/rejected, binding hay receipt. Với bullet trộn chỉ dẫn gọi tool và ranh giới authority, chỉ bỏ vế thao tác, giữ vế ranh giới; nếu không tách được rõ thì giữ cả bullet.

Giữ nguyên hướng dẫn search/read, mã và tên sản phẩm, ambiguity, đọc offer/variant/ETA, gom lệnh đọc, ngân sách tool và xử lý tool thất bại. Giữ nghĩa PRODUCT/CART_LINE và phạm vi mua lẻ/set để hiểu dữ liệu, dù B1 không sửa giỏ. Không cắt tool schemas/descriptions hoặc thay dữ liệu để đạt số byte.

Các phần phải giữ nguyên nghĩa và, khi có thể, nguyên byte:

- Vai bán hàng, toàn phần “Hiểu khách và tư vấn”, “Giọng chat” và “Tư vấn tự tin, đúng căn cứ”. Không sửa chúng trong phép thử này.
- Authority của trusted; input/retrieval không cấp quyền; nguồn hiện hành; unknown không phải phủ định.
- Size cần SIZE_FIT đúng binding; khách tự chọn size khác với shop khẳng định fit.
- Giá/tổng/stock/ETA đúng phạm vi; tổng lấy từ code; PRE_ORDER; privacy.
- Không báo effect thành công thiếu receipt; thao tác lỗi chưa hoàn tất; không hứa bước bot không làm được.
- Toàn quy tắc áp dụng policy và quyền lợi; chỉ bỏ hướng dẫn gọi API không khả dụng, vẫn giữ không báo đã handoff nếu chưa thực hiện.

Hai arm có cùng initial history/latest/product codes, source config, initial facts khi nguồn không đổi, ba read tools/declarations, tool budgets, model/config, verifier và fallback. Model tự chọn tool calls nên nội dung được đọc tiếp có thể khác: đây là kết quả của treatment, không ép hai chuỗi tool giống nhau. Không đổi mô tả, đưa lời giải mẫu hoặc cắt thông tin sản phẩm. Metadata case/arm/expected/rubric ở evaluator, không vào request.

**Nguồn và giới hạn:** dùng live read-only sources như harness hiện tại, không tạo kho replay mới. Xen kẽ control/candidate cho cùng case; capture source versions/initial evidence và tool results bằng cơ chế hiện có. Thay đổi nguồn liên quan giữa hai arm làm attribution chưa xác định; giữ đủ denominator và báo rõ, không loại lỗi để tính đẹp hơn. Khác tool selection do model không tự là source drift. Native history không bị loại bỏ. Kết quả chỉ áp dụng B1 read-only; chưa chứng minh B2/B3 hoặc live delivery tốt hơn.

**Hoàn thành:** self-review diff chứng minh đúng một nhóm chỉ dẫn thay đổi; captured requests giữ toàn evidence và không lộ nhãn. Chưa promote candidate vào owner chính.

## 5. T3 — một phép thử nhỏ, không sửa giữa lượt

Phụ thuộc T2 và focused checks.

| Ca từ full run | Vai trò | Lặp mỗi arm |
| --- | --- | --- |
| B1–7 / b1-buying-concern | Lo trang trí, kiểm lý do tư vấn | 1 |
| B1–15 / b1-buying-concern-v2 | Khách quen đồ trơn, kiểm lập trường | 1 |
| B1–23 / b1-buying-concern-v3 | Mua áo hay set, kiểm dùng ưu tiên đã biết | 1 |
| B1–17 / b1-changed-occasion-v3 | Control đang chọn hữu ích khi hoàn cảnh đổi | 1 |

**Tổng 8 outcomes, tối đa 32 generation requests:** mỗi attempt giữ trần B1 hiện hữu tối đa 3 owner + 1 verifier. Không tăng tool budget. Đổi từ hai repetitions xuống một mỗi arm để không tăng trần requests sau khi chuyển sang luồng có tool. Đây là bốn tình huống với một mẫu mỗi bản, không đo được ổn định trong từng ca; phần lớn cùng sản phẩm, không gọi là holdout hay bằng chứng khái quát.

Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol high theo manifest hiện hành. Freeze exact config/hashes/source trước run, commit và clean executable/config, capture runtime HEAD. Một upstream request mỗi generation, retry 0; error/malformed/timeout vẫn trong denominator. Xen kẽ thứ tự hai arm đã đăng ký; chạy đủ tập khi hạ tầng cho phép, không dừng chỉ vì quality và không sinh mẫu bù.

Mọi draft qua hard precheck đều vào verifier và final gate/readback theo runtime clock và sources của lượt B1. Transport vẫn capture-only/sendEnabled=false; không live send. Giữ đủ draft, actual terminal, request accounting, token/latency/error, source identities và bindings bằng artifact hiện có.

### Review và quyết định

Trước run, khóa tiêu chí đọc whole reply:

1. Khách nhận được lựa chọn/lời khuyên dùng được cho quyết định đang hỏi không? Không ép phương án rẻ hơn, mua lẻ hoặc một món thắng khi thiếu thông tin quyết định.
2. Lý do giải quyết đúng băn khoăn không? Khen chất liệu nhưng không giải quyết lo trang trí chưa được tính là thuyết phục hơn.
3. Câu có thể gửi ngay không; nội dung nào cần sửa và tác động gì tới việc mua? Không đếm tính từ, câu hỏi, từ “nếu” hoặc dấu ngoặc.
4. Có bỏ câu hỏi, mất khả năng chủ động bán hàng, sai nguồn/permission/receipt hoặc tạo kỳ vọng quá mức không?

Đọc actual trước, khóa primary, sau đó mới dùng draft/verdict để định vị owner/verifier. Che nhãn arm khi so nội dung nếu runner/report hiện có hỗ trợ; không gọi là blind human adjudication. Reviewer là agent, owner vẫn có thể sửa đánh giá bằng feedback riêng; không sửa primary lịch sử.

Chỉ có tín hiệu đáng kiểm rộng hơn khi các cặp có source đủ tương đương, candidate của ít nhất hai trong ba ca concern thể hiện tiến bộ nội dung cụ thể so với control; ca concern còn lại và control B1–17 không có hồi quy thực chất. Báo từng mẫu, không dùng majority để xóa một lỗi căn cứ hoặc lỗi nhu cầu. Một câu chỉ ngắn hơn/ít tính từ hơn không tính là tiến bộ. Một mẫu mỗi arm chỉ hỗ trợ quyết định thử rộng hơn; không xác nhận nhân quả hay độ ổn định. Source drift/error khiến thiếu cặp cần thiết thì kết luận inconclusive, không tự chạy bù.

- Candidate tốt hơn rõ: chuyển T4; chỉ kết luận nhóm hướng dẫn bị bỏ có liên quan trong phép thử này.
- Hai arm cùng tốt: chưa tái hiện được lỗi/không có delta; không tự promote hoặc tăng repetitions.
- Hai arm cùng kém hoặc kết quả lẫn lộn: STOP hướng này; báo chưa đủ bằng chứng và đề xuất nhánh ở mục 7, không tự chạy nhánh khác.
- Verifier chặn câu hợp lý: giữ actual fallback, ghi bất đồng riêng, không sửa verifier để phép thử owner đạt.
- Error làm mất so sánh: báo incomplete/inconclusive, không sinh bù trong registration.

## 6. T4 — chuyển kết quả thành sửa nhỏ và kiểm toàn luồng

Chỉ sau tín hiệu T3; chưa được mặc định thực hiện vì kế hoạch đã được viết.

### T4a. Giữ đúng phạm vi B1 đã được đo

Không tạo nhánh final-only. Candidate đã được dùng từ đầu trong luồng B1 AUTO ở T3; T4 chỉ mở rộng sang full B1 với đúng file/hash và cùng cơ chế truyền ownerPrompt. Dùng lựa chọn prompt explicit tại harness B1 hiện có; không tạo bộ chọn prompt theo nội dung khách hoặc capability router tổng quát.

Stateful B2/B3 giữ prompt đầy đủ vì các tool ghi state/giỏ/handoff có thật ở đó. Candidate B1 không được thay `prompts/owner.vi.txt` chung hoặc truyền sang B2/B3. Coverage được kỳ vọng ở 6 findings B1; stateful correction không được sửa bằng treatment này và phải giữ là finding tồn tại, không claim đủ 7 đã fix.

Đăng ký/capture đúng instruction hash thực gửi tại cả diagnostic và full; manifest hash chung không thay thế hash override. Không hardcode SHA hoặc cắt prompt bằng regex lúc request. Test static B1-only selection và stateful vẫn dùng bản đầy đủ trước provider. Không phát sinh generation để ép final-only. Đây là eval candidate trong phạm vi B; chưa phải thay đổi production entrypoint hoặc chứng minh có thể bỏ các chỉ dẫn đó trong một full-capability owner.

### T4b. TDD tại request boundary

Các test này phải chạy trước T3 nếu đã thêm runner option: quan sát RED rồi GREEN cho explicit frozen prompt selection/hash, cùng tools AUTO/declarations/budget, native history giữ nguyên, stateful không nhận B1 override và evaluator-label firewall. Giữ các ranh giới nguồn/size/receipt/privacy. Test byte/contract kiểm cách đóng request, không dùng test keyword để chứng minh hội thoại tự nhiên. T4 reuse kết quả nếu không đổi implementation; không lặp suite chỉ vì đổi phase.

### T4c. Chạy full hiện hữu để kiểm khả năng chuyển kết quả

Fresh registration/source seal sau code hoàn tất. **24 B1 + 8 stateful, mỗi ca một lần**, chạy full, không quality early-stop. Reuse full runner; giữ trần hiện hữu 124 owner/verifier generation requests, retry 0. Không thêm câu hỏi để làm denominator phình ra.

Giữ COD/BANK deterministic checks theo risk boundary bị chạm; source read/capture-only transport và DB isolation theo harness hiện hành. Không publish matrix, deploy hoặc live send. Full stateful không chứa EXCHANGE/DEFECT thì phải ghi rõ chưa kiểm hai luồng này bằng model; không tự thêm và gọi vẫn là 32 ca.

Review đủ outcomes, kể cả ca verifier PASS. Báo toàn B1 nhận candidate và B2/B3 nhận baseline; kiểm request captures xác nhận routing theo harness. Không quy mọi thay đổi full run cho prompt vì live nguồn/variance có thể khác. Nếu tập nhỏ tốt nhưng full không tốt, không promote và không tự rewrite lần nữa. B2/B3 baseline chỉ là đối chiếu regression/operational coverage, không được báo stateful voice đã được can thiệp.

## 7. Nhánh khác chỉ mở khi evidence chỉ tới nó

**Thiếu nguồn:** phải chỉ ra trường nguồn cụ thể có thể lấy từ hệ thống shop và vì sao nó thay đổi lời khuyên. Nguồn đã có nhưng projection làm mất thì sửa projection bằng focused test. Nguồn chưa có thì ghi yêu cầu dữ liệu; không tự viết công năng, proof/performance hoặc khuyến nghị bán hàng như fact. Không tạo bảng “mẫu này nên khuyên thế nào” theo benchmark.

**Cách viết vẫn kém với đủ dữ liệu:** đề xuất tối đa 2–3 đoạn hội thoại đã được owner chấp nhận để minh họa giọng, thuộc sản phẩm/tình huống khác tập đánh giá. Phải xác minh owner đã chấp nhận và không phải chỉ label USABLE do agent tự chấm. Chưa có thì soạn bản mẫu để owner xem trước, không tự dùng ví dụ agent viết làm chuẩn. Mẫu thay phần giọng trùng lặp, không cấp facts/policy, không chép câu trả lời của ca kiểm tra. Chưa có ngân sách generation cho nhánh này trong kế hoạch.

**Source-fault wording và state ACK:** vẫn track B1–3/11 và stateful correction; T1 phải xác định chúng thuộc projection hay owner expression. Không thay cùng lúc với T2 để tránh trộn nguyên nhân. Nếu sau T4 còn, báo patch riêng với evidence, không tự nối thêm cấm từ “hệ thống/cập nhật” hoặc static reply theo case.

**Material reassurance:** B1–9 giữ là finding về độ mạnh lời tư vấn; không mở rộng thành cấm inference chất liệu. Verifier không nhận thêm nhiệm vụ chấm tư vấn hay giọng.

## 8. Verification, ngân sách và điểm dừng

Các commands dưới đây là **dự kiến**, chưa chạy trong lượt lập kế hoạch:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker build
git diff --check
```

Thêm focused test cho frozen prompt-path/hash tại runner bị sửa, ghi exact command khi triển khai; không viết test mới cho whole-reply quality. Nếu chạm runtime TS/caller, thêm focused suite của module thực sự bị đổi, worker typecheck/lint theo scripts hiện hành. Không chạy lại toàn repo chỉ vì có sẵn. Khi implement provider API mới mới cần kiểm official docs; kế hoạch này reuse adapter/API/config hiện hành, không đổi provider.

Provider command diagnostic dùng entrypoint hiện có qua credential launcher hiện có:

```text
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config <SOURCE_CONFIG> --cases <EXISTING_24_CASES> --out <NEW_OUTPUT_DIR> --range 7:7 --run
```

Đây chỉ là hình dạng command B1 hiện hữu, không phải command đã chạy hoặc đủ để chọn arm. Khi triển khai, thêm và ghi rõ option/registration chọn frozen prompt của từng arm; không claim runner hiện đã có option đó. Dùng range tương ứng 7/15/23/17, output mới cho mỗi attempt và tổng hợp đúng selected8, không claim child đã chạy full24. Không ghi credential vào registration. Exact launcher/config/output/prompt identity được khóa trước dispatch.

Ngân sách tối đa của đường thành công: **8 diagnostic + 32 full = 40 outcomes, tối đa 156 owner/verifier requests** (8×4 +124). Embedding/source reads báo riêng. Giữ trần requests của bản kế hoạch đầu; giảm số mẫu để bù việc chạy native tool loop. Chỉ một candidate và một full run có điều kiện; không có vòng tự sửa rồi chạy lại thứ hai. Một error, false PASS hoặc fallback không được bỏ khỏi denominator. Diagnostic mỗi case/arm một lần và full once không chứng minh ổn định.

Kết thúc bằng: bảng evidence/giả thuyết, exact diff và config, toàn actual outcomes, từng request/error, thay đổi so control, findings còn lại và đề xuất có giới hạn. A vẫn OWNER_BYPASS; không A PASS/B live GO.

Complexity delta dự kiến: một B1 prompt candidate, explicit frozen prompt selection/registration trong runner hiện có và focused tests/report. Không đổi selection theo final-only hoặc thêm role, durable state, parser, repair loop, gate runtime, framework hay credential route.

## 9. Checklist bàn giao

- [x] Ghi nhận finding review độc lập: final-only coverage 0/7; loại nhánh tools-OFF→final-only wiring.
- [ ] T1 audit bốn luồng tư vấn và ba ca nguồn/state, xác nhận capability/source/mode và giữ evidence.
- [ ] T2 exact deletion diff; authority/policy/advice/voice retained; frozen inputs/config/order/review.
- [ ] Focused checks thực sự chạy và clean source seal.
- [ ] T3 đủ 8 native B1 attempts, không mẫu bù; whole-turn review và source/variance attribution có giới hạn.
- [ ] Ghi một quyết định: T4 / inconclusive / STOP; không lặp đổi câu chữ.
- [ ] TDD prompt override/identity/native tools trước T3; nếu T4 reuse đúng candidate B1, B2/B3 baseline, report coverage.
- [ ] Nếu T4: full 24 + 8, báo đủ mọi outcomes và findings, không claim stability/live GO.

Lượt 2026-10-21 này chỉ viết kế hoạch và cập nhật task index. Chưa tạo candidate prompt, sửa code hoặc chạy model.
