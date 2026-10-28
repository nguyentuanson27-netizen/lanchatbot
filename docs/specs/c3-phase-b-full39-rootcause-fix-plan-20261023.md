# Phase B — kế hoạch sửa sau review root cause full39

Ngày23/10/2026. **PLAN_REVISED_AND_SELF_REVIEWED — chưa implementation/provider.** Base `ee1d85776c2dd800d0e85422fc945e2bc40a399d`. Thay đề xuất trong chat bằng kế hoạch này theo [independent review REVISE](c3-phase-b-full39-rootcause-independent-review-20261023.md). Evidence: [full39](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-run-20261023/CHECKPOINT_B.md), [actual conversations](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-run-20261023/CONVERSATIONS.md), raw source540b8129. Kế hoạch sửa đã self-review; không gọi reviewer trước đã APPROVE bản mới.

## Mục tiêu và phạm vi

Giúp khách chọn/mua đồ của shop, trả lời đúng việc của lượt, thực hiện tác vụ thật và nói như nhân viên bán hàng. Giữ một owner Gemini3.5FlashLite HIGH, một verifier GPT‑6.1Sol HIGH, configs/routes/budgets hiện hành; code giữ truth/state/freshness/permission/recipient/privacy/effects/receipts và final gate. A OWNER_BYPASS, B chưa GO.

Không tăng bound8subjects/3owner/2toolrounds/6calls/1verifier; không router/parser/regex sản phẩm/template theo ca/role mới. Không quote copies, durable state, semantic result summary hoặc model rewrite. Không viết live policy/registry, deploy, send thật, POS order hoặc automatic retry. Phạm vi này không đóng source gaps chart/asset-color/attributes/ETA anchor.

## T0 — sửa chẩn đoán trước khi sửa behavior (nhỏ, docs/evidence)

Ghi bảng symptom/cause/hypothesis vào report implementation tiếp theo, không sửa raw/history:

| Chủ đề | Đã xác nhận | Chưa chứng minh |
|---|---|---|
| Quote | functionResponse và state có discount30k/tổng499k; owner vẫn quảng cáo policy mua2 | Policy lấn quote; đổi vị trí dữ liệu sẽ chữa được |
| Tư vấn | Current prompt đã yêu cầu chọn một hướng; concern-v2 vẫn kể nhiều cách; diagnostic toolsOFF cũng gặp | Instruction giải thích/ngoại lệ là nguyên nhân, hoặc model thiếu năng lực |
| Discovery | Search có description SQ629/SQ748/V406; đều chưa có bộ quần dài phù hợp. Trước batch4subjects; SQ629 alloffers thêm3→7; SQ748 thêm3→10>8 trả SUBJECT_BOUND; V406 thêm1→8 | Tăng bound sẽ tìm đúng món, hoặc SQ748 là đáp án đúng bị mất |
| Deadline | Clock được truyền; ETA4–8; draft kết luận không kịp; verifier chặn refETA | Verifier sai vì draft thực ra là shop refusal — draft chưa có nghĩa đó |
| Provider | Một malformed completion và một transport error | Prompt gây hai lỗi này hoặc cần retry/recovery mới |

**Done:** xác minh lại raw request các điểm trên, đặc biệt không viết nhầm cạpchun thiếu nguồn, description SQ748 bị mất hay hết tool-call budget. Đây là sửa phân tích, chưa sửa authority/production logic.

## T1 — discovery: tìm và sàng trước khi đọc rộng (2–3file/savepoint)

Điểm chạm: mô tả tools `search_products`/`read_product` trong `gemini-inference.mjs` và clause dùng nguồn trong `prompts/owner.vi.txt`; tests hiện hữu tương ứng. Thay phần hướng dẫn liên quan, không nối thêm đoạn trùng.

- Query giữ loại đồ/dịp/đánh đổi khách nêu; không tự suy khách đi làm nhất thiết cấm short hoặc tự gán dress code. Dùng description để phân biệt ứng viên đáp nhu cầu với món chỉ giống một đặc điểm.
- Search descriptions dùng để sàng trước. Không batch đọc tất cả offers của nhiều món chỉ vì search trả chúng. Đọc sâu món định khuyên; truyền offerType đã xác nhận khi phần khách cần đã rõ. `null` vẫn hợp lệ khi thực cần so các cách mua của chính món đó, không cấm toàn cục.
- Nếu description cho thấy các món hiện có chưa đáp nhu cầu, có thể tìm lại trong tool budget còn lại hoặc hỏi điều thực sự phân biệt lựa chọn. Không biến top result thành hàng phù hợp, không khẳng định shop không bán món chỉ vì search chưa tìm ra. Budget hết thì giữ đúng giới hạn hiện có, không bịa ứng viên.
- Không thêm field/suitability classifier hoặc lọc theo regex tên sản phẩm; chưa có bằng chứng lỗi bound implementation. Giữ khả năng so offers hợp lệ ở ca giá bộ/mua rời.

**Done:** focused existing tests vẫn giữ bound và đúng scope; request capture không làm mất descriptions/availableOffers. Native discovery sau này được review cả query→candidates→offer reads→actual terminal, không chỉ final wording. Ca vẫn không có hàng phù hợp phải được ghi coverage limitation; không gán thành lỗi thiếu số đo.

## T2 — một thí nghiệm quote, không ba thay đổi cùng lúc

**Giả thuyết Q:** vị trí quote sau cartItems trong functionResponse làm kết quả giao dịch kém nổi bật. Chưa coi Q là root cause đã xác nhận.

Candidate Q chỉ đổi thứ tự keys hiện có trong functionResponse của operation hiện tại đang kiểm: đặt cartQuote trước cartItems. Các responses lịch sử giữ nguyên cả giá trị và serialization; không suy operation hiện tại chỉ vì quote có số tiền lớn nhất. Không đổi receipt, policy, state projection order, instruction, tool name hoặc toàn bộ native history. Chưa đổi thứ tự state/policy vì đó là biến khác. Nếu wire diff không chỉ có thay đổi này, không dùng kết quả để kết luận về Q.

Kiểm hai đầu vào cố định từ native captures: `negotiation-price-objection` và `negotiation-total-control`. Mỗi đầu vào có baseline/candidate, cùng prompt/model/config/trusted snapshot/captured clock và **giữ native functionResponse history**, gồm các quote lịch sử. Chỉ dùng final continuation toolsOFF cho cả hai arm; không gọi mutation hoặc tạo cart giả. Chế độ replay không chứng minh current native state hoặc delivery eligibility.

Reuse inference/build/request-audit và replay code hiện có; chỉ bổ sung hỗ trợ bounded captured native contents nếu thật sự thiếu. Không dùng advice4 vốn chỉ dựng role/text history để giả thành test tool-history. Phải kiểm byte diff baseline/candidate trước dispatch, canonical evidence/historical quote không đổi, labels ngoài model wire. Không thêm framework.

**Done:** kết quả xin bớt phản ánh quote hiện tại thay generic upsell; total-control không hiểu tổng ưu đãi là vừa giảm thêm, không thay tier/evidence. N1 chỉ exploratory. Nếu baseline cũng tốt hoặc candidate không tốt hơn, Q chưa có bằng chứng; không gộp thêm state reorder/prompt rewrite để cứu. Xóa hoặc không promote treatment không có lợi.

## T3 — paired advice diagnostic có đối chứng thật

Phụ thuộc T0; độc lập Q. Reuse4inputs đã freeze trong `opening-advice-preparation-20261022/diagnostic-inputs.json`: concern, changedoccasion-v2, concern-v2, concern-v3. Có cả controls đang dùng được; không đổi lời khách/facts/description theo output.

Trước tạo candidate, chỉ ra đúng các instruction được nghi cạnh tranh và diff sẽ thay. Hiện **chưa xác định được mâu thuẫn trực tiếp**: prompt đã nói chọn một hướng/dùng kết quả. Không được gọi thiếu chỉ dẫn là nguyên nhân. Nếu audit không chỉ ra được một treatment cụ thể có lý do, giữ prompt và báo hypothesis chưa đủ; không viết thêm 'hãy chọn một món'.

Nếu có candidate rõ: thay đúng một đoạn tư vấn liên quan, giữ giao dịch/authority/policy/fit/material boundaries và giọng các phần khác. Không đưa ví dụ trả lời từ corpus, bảng required/forbidden hoặc obligation JSON. Đăng ký exact diff/hash trước kết quả; không đổi đồng thời context presentation hay verifier.

Baseline và candidate đều chạy cùng diagnostic mode toolsOFF, cùng captured public world/clock/history/config. Bốn cặp cố định; không lấy native output cũ làm causal baseline. Thứ tự arm xác định trước, không chạy lặp để chọn output đẹp. Đánh giá actual terminal trước draft: có giúp quyết định, lý do thực sự liên quan, giọng nói thường và bước tiếp dùng được. Không chấm đủ keywords; không ép mua áo lẻ hay cả bộ làm đáp án.

**Done:** có bảng bốn cặp và controls, báo cải thiện/regression/không rõ. Không sửa rubric sau output. Nếu chỉ ca lỗi đẹp lên nhưng controls kém đi, không promote. Một lượt chưa chứng minh ổn định hoặc cơ chế nhân quả của model; không thêm vòng tự động.

## T4 — deadline: thống nhất nghĩa rồi kiểm hai phía (1–2file/savepoint)

Điểm chạm clause ETA hiện có trong owner/verifier, `protocol.test.mjs`/adapter tests hiện hữu cho hashes và wire. Thay clause liên quan, không thêm bộ parser ngày hoặc fallback đặc biệt.

- Cho phép shop không nhận hẹn/chưa thể cam kết giao kịp khi không có căn cứ cam kết. Đây không được kèm lời khẳng định carrier chắc trễ hoặc đã thay/cancel lịch giao.
- Lời báo chắc kịp/chắc trễ, một ngày/giờ giao cụ thể hoặc thời gian đã bắt đầu vẫn cần căn cứ tương ứng. Clock không tự cung cấp ETA anchor/day convention.
- Không re-label draft full39 cũ thành refusal hoặc sửa lịch sử FAIL. Không làm model nói dè dặt trong mọi tư vấn; chỉ nói rõ khả năng nhận hẹn ở tình huống deadline chưa bảo đảm.
- Giữ nguyên phân biệt chọn thiết kế cạpchun với bảo đảm size vừa người. Nguồn đã có cạpchun; verdictSQ629 chưa có span. Không có ngoại lệ chung cho câu không bó bụng hoặc yêu cầu SIZE_FIT cho mọi cảm giác mặc.

Freeze4semantic controls cùng một valid captured context trước verifier result: lời không nhận cam kết (safe), nêu đúng khoảng ETA dự kiến (safe), hứa chắc kịp không có căn cứ (unsafe), kết luận chắc trễ không có căn cứ (unsafe). Labels evaluator-only; prompts không chứa các draft/đáp án này. Provider check dùng verifier hiện hành, không judge model mới. Unit tests chỉ chứng minh protocol/serialization, không tự được gọi semantic PASS.

**Done:** hai safe controls usable, hai unsafe không send-eligible; error/UNCERTAIN giữ trong denominator và không được tính như safe PASS. Không nới tiếp để cứu một ca. Các controls là preregistered semantics tests, không câu mẫu production.

## T5 — gallery và errors

Gallery: thay hướng dẫn tương ứng trong mô tả media tool về cách giới thiệu ảnh chung bằng ngôn ngữ khách hiểu; không kể tình trạng phân loại/binding nội bộ. Giữ ảnh/type/color/subject/hash/group authority. Không thêm ảnh/màu giả hoặc blacklist câu cụ thể. Chấm việc xin ảnh trước phần bán thêm; không bắt mọi tin phải hỏi chốt. Đây là sửa UX cục bộ, không bằng chứng đã giải quyết giọng tư vấn chung.

Provider errors: giữ accounting, fail-closed, không auto retry hoặc state-only recovery mới. Không dùng malformed/transport để đánh giá một final draft không tồn tại. Lưu errors, không chạy bù để thay kết quả trong campaign.

## Thứ tự, budgets và verification dự kiến

T0 → chuẩn bị riêng T1/Q/advice/ETA/gallery → savepoints và focused tests → commit clean source/config/inputs → seal runtime SHA ngoài frozen source → preflight. Không dispatch nhiều treatments đã gộp vào cùng candidate rồi nhận causal attribution. Nhánh advice/Q phải dùng prompt/config trước các thay đổi khác nếu muốn giữ isolation; effective arm hashes ghi rõ, không chỉ ghi latest manifest hash.

Proposed small evaluations, **chưa đăng ký/chạy provider trong lượt planning**:

| Population | Outcomes | Requests tối đa |
|---|---:|---:|
| Advice4 × baseline/candidate, nếu candidate đủ rõ |8|16 (owner+verifier) |
| Native-history quote2 × baseline/candidate |4|8 (owner+verifier) |
| Deadline static controls verifier-only |4|4 |
| Tổng trần small evaluation |16|28 |

Đây là population khác nhau; không gọi16là16native. Không automatic extra arms/repetitions. Small evaluation kết thúc bằng report treatment nào có bằng chứng để giữ/bỏ; không tự full39 khi kết quả chưa rõ. Full39 vẫn có thể được yêu cầu riêng sau đó: giữ24B1+8stateful+4openings+3negotiation, N1, max152generationrequests/38public+1private. Không coi28+152nằm trong cap160 cũ; không âm thầm mở180requests hoặc gộp với campaign đã hoàn tất. Khi owner yêu cầu full ở bước sau, chỉ claim functionality/sales outcome của đúng candidate đã seal; không causal A/B từ kết quả gộp.

Verification implementation dự kiến (chưa chạy ở lượt planning):

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Chỉ thêm focused test khi logic bị thay; observed RED→GREEN cho adapter/replay behavior, không viết test đếm từ hoặc fake verdict để tự chứng minh prompt. Shared source hiện không dự kiến thay. Không lặp full worker suite nếu eval/prompt-only và checks focused đã đủ; source runtime thay thì bổ sung kiểm risk tương ứng. Không claim commands chưa chạy.

## Self-review và phản hồi reviewer

1. Required discovery đã có bound4→7→10reject→8, tách description khỏi POS readback và coverage; không tăng bounds hoặc gán SQ748 là đáp án.
2. Required experiment isolation đã tách Q/advice/ETA. Quote có một biến thứ tự response, chưa reorder state/policy; advice có baseline cùng mode và controls. Không gọi hypothesis là confirmed root cause.
3. Required deadline đã giữ kết luận lịch sử, không hợp thức hóa draft cũ; owner/verifier cùng phân biệt nghĩa nhận hẹn và lịch giao. Fit boundary không mở rộng khi chưa rõ span.
4. T3 có điểm dừng nếu không xác định được treatment có căn cứ; không tiếp tục prompt rewrite chỉ để gọi đã fix. Không tự động tăng số lần chạy hoặc full sau N1.
5. Không tạo gate/operator/proof/state mới. Replay chỉ dùng các request fields/evidence đã có, không cấp truth hoặc quyền mới. Projection/history/binding phải giữ nguyên.
6. Các con số là proposed caps, không kết quả đã chạy. Small28 và full152 tách rõ; chưa xin/nhận thêm model/provider/effort hoặc quota route. A/B ở đây chỉ là hai arm diagnostic; không gọi là qualification.

Planning verification: đọc review/source/runner để đối chiếu; sẽ kiểm paths/links/diff và tài liệu tasks khi ghi xong. Không generation, không test/build mới hoặc thay runtime/prompt trong lượt này.
