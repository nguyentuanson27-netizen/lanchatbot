# Phase B — sửa bằng chứng tra ảnh và tư vấn sau review Astra High

Ngày 23/10/2026. **PLAN_REVISED_AND_SELF_REVIEWED; chưa implementation/provider run mới.** Base `6d068e245f3245f85dbf874a88356289e07464de`. Đã tiếp thu hai P2 và một P3 của [review GPT-6 Astra High](c3-phase-b-sales-media-followup-astra-review-20261023.md). Reviewer chưa re-review hoặc APPROVE bản đã sửa.

Nguồn: [12 hội thoại](../../apps/worker/evals/single-agent-commerce-read-only/sales-media-run-20261023/CONVERSATIONS.md), [report](../../apps/worker/evals/single-agent-commerce-read-only/sales-media-run-20261023/CHECKPOINT_B.md), [audit nguồn](../../apps/worker/evals/single-agent-commerce-read-only/sales-media-run-20261023/SOURCE_AUDIT.json). Bản này thay scope triển khai/campaign chưa làm của [kế hoạch sales/media trước run](c3-phase-b-sales-and-media-plan-20261023.md). Discovery/deadline/quote vẫn theo [plan root cause](c3-phase-b-full39-rootcause-fix-plan-20261023.md), không tự cộng vào vòng này.

## Mục tiêu và giới hạn

Giúp khách quyết định mua hàng của shop bằng lời tư vấn tự nhiên và ảnh có ích. Giữ một owner Gemini 3.5 Flash Lite HIGH, một verifier GPT-6.1 Sol HIGH và configs/routes hiện hành. Code giữ truth/identity/freshness/state/permission/recipient/privacy/effects/receipts. A OWNER_BYPASS; B chưa GO.

Không thêm role, router/parser/regex/template theo ca, repair/reverify/generation retry hoặc tăng tool/subject/vision bounds. Không deploy, gửi khách thật, publish nguồn ảnh/policy hoặc tạo POS order. Lượt hiện tại chỉ sửa kế hoạch.

| Finding | Confirmed | Chưa chứng minh |
|---|---|---|
| Feedback | Owner nhận NO_VERIFIED_MATCHING_MEDIA, verifier không nhận observation; overlay chỉ giữ selected/viewed thành công. | Gap là sole cause UNCERTAIN; verdict chỉ có product ref. Draft nói shop không có ảnh còn rộng hơn phạm vi đã tra. |
| Media concern | Chọn DETAIL/TOP, không view; lời tư vấn nhiều tính từ, mở áo lẻ rồi cả bộ. | DETAIL/TOP luôn sai hoặc phải gọi GENERIC/view mới tốt. Ảnh cận có thể phục vụ áo lẻ hợp lý. |
| Advice candidate | Hai cặp rõ hơn một phần, một regression, một tương đương; chưa hơn rõ về giọng. | Prompt cause/model capability/stability. Không promote candidate cũ. |
| Cảm giác mặc | Owner có câu hướng sang đổi cách mặc/món khi khách phân vân; verifier cho phép dễ chịu/đỡ bí từ nguồn. | Câu đó là nguyên nhân duy nhất; candidate trước giữ câu đó nhưng heat output vẫn thay đổi. |
| Coverage | Audit ba sản phẩm không có feedback xác nhận; cận áo/mặt sau giao đúng qua capture. | Thiếu feedback toàn shop, feedback dương tính, vision advice hoặc provider GENERIC. |

Giữ hai code fixes đã kiểm: ưu tiên góc khác ảnh chính và exact public attachment URL/type/order. Không sửa lại selector hoặc dùng tổng test PASS để chứng minh bán hàng tốt.

## T1 — kết quả tra ảnh cùng nghĩa ở owner và verifier

Điểm chạm: `apps/worker/src/single-agent-commerce-media.ts`, media/context/boundary tests. Reuse overlay và `policyLiterals` hiện hữu; code tạo record, không thêm evidence framework hoặc summary model thành truth.

### Operation, phạm vi và vòng đời

Giữ bounded observation trong tools của lượt, key theo operation + query. Số record không vượt media calls trong tool budget hiện hữu; không persist thành customer state hoặc tự mang sang lượt khác.

Record gồm operation select/view; stage catalog-selection hoặc fetch/decode/prepare; product; query intent/color/component; outcome; thời điểm quan sát cố định; expiry và source identity khi đọc nguồn thành công. Dùng mã lỗi chuẩn hóa; không raw exception, credentials, recipient hoặc narrative model.

| Outcome | Chứng minh được | Không được suy ra |
|---|---|---|
| NO_VERIFIED_MATCHING_MEDIA | Không có asset hiện đủ điều kiện trong nguồn/phạm vi vừa kiểm | Toàn shop không có ảnh/feedback hoặc không bán sản phẩm |
| MEDIA_COLOR_BINDING_UNVERIFIED | Chưa xác nhận được ảnh đúng màu | Shop không bán/hết màu đó |
| SOURCE_ERROR ở catalog | Lần đọc catalog thất bại | Không có ảnh/hàng |
| Lỗi view fetch/decode/prepare | Lần xem ảnh thất bại | Không có ảnh để gửi; selection hợp lệ phải bị hủy |

Selected/viewed assets giữ quyền riêng hiện có. Select thành công + view lỗi không ghi đè hoặc xóa selected attachments hợp lệ. Final gate vẫn chặn khi permission/source/freshness thực sự không hợp lệ. Không thay failed query bằng ảnh khác ngầm.

### Source identity và readback

- NO_MATCH/color-unverified sau successful source read: hash canonical dữ liệu quyết định outcome, gồm product identity, colors/binding, metadata ảnh dùng để lọc (approval, loại/góc/part, URL/content hash, observation time), query và effective filter configuration. Không dùng riêng `catalogVersion="catalog-v2"` làm content revision.
- `observedAt` cố định ở lần tra đầu. Expiry không vượt thời hạn media hiện hữu; thêm mốc hiệu lực sớm hơn nếu thay đổi freshness của input có thể đổi kết quả. Không tạo absence fact vô thời hạn. Chốt helper/hash/expiry bằng tests trước provider.
- Readback dùng cùng query, đối chiếu source identity, outcome và freshness. Không đổi observedAt theo giờ đọc mới. Unchanged và chưa hết hạn phải giữ exact context/binding; nguồn/color/outcome đổi hoặc hết hạn thì old PASS không send-eligible. Không reverify/sinh lại reply.
- SOURCE_ERROR chưa đọc được nguồn không có catalog version đã xác minh. Chỉ giữ sự kiện thao tác trong lượt: identity hash operation/query/stage/outcome/thời điểm cố định, nói rõ đây là observation của thao tác. Nếu container cần `sourceVersion`, giá trị đó định danh observation, không gán thành revision catalog. Không tự retry catalog/download để xác minh lại sự kiện; record chỉ hỗ trợ lời báo lần thao tác chưa làm được, không hỗ trợ tình trạng catalog hiện tại.
- Không biểu diễn được sự kiện với nghĩa trên trong contract hiện hữu thì chỉnh thiết kế trước implementation; không bỏ freshness/binding hoặc biến error thành product fact.

Owner tool result và trusted snapshot tới verifier phải cùng nghĩa. Thay phần hướng dẫn kết quả công cụ tương ứng để owner chỉ nói đúng khả năng cung cấp ảnh đã biết; không thêm mẫu trả lời riêng feedback. Verifier prompt/static fallback giữ nguyên ở slice này.

### RED → GREEN

1. NO_MATCH có trong owner/verifier projection, cùng operation/query/scope; không evaluator labels.
2. Unchanged readback giữ exact binding khi thời gian tiến lên nhưng chưa expiry.
3. Feedback xuất hiện, color binding đổi hoặc expiry sau verdict chặn old PASS.
4. Select thành công + view download/decode lỗi vẫn giữ selected attachment hợp lệ.
5. SOURCE_ERROR không thành absence/catalog version giả; không thêm retry/request.
6. Khác operation/query không ghi đè sai; không lẫn lượt/PII/raw errors; records bị chặn bởi budget hiện có.

Mock verdict chỉ kiểm gate/contract, không chứng minh semantic understanding.

## T2 — thay đúng phần mô tả chọn ảnh đang hướng quá nhanh sang ảnh cận

`gemini-inference.mjs:60–62` đã nói chủ động dùng ảnh, view khi mô tả thiếu, phân biệt view/select và batch độc lập. Không thêm lại những hướng dẫn đó.

Thay đoạn phân loại “ảnh chi tiết để xem trang trí; ảnh tổng thể/góc khác để nhìn dáng” bằng mục tiêu:

> Chọn góc và phần trang phục sao cho ảnh cho thấy điều quyết định lời tư vấn.

Giữ các ranh giới màu, nguồn, view/select và budgets. Freeze exact diff trước run; nếu chỉ viết lại nguyên tắc cũ mà không loại liên tưởng trang trí → cận ảnh thì chưa đủ treatment để chạy. Không thêm tên sản phẩm, case answer hoặc router từ khóa.

Concern có thể khuyên áo lẻ hoặc cả bộ nếu có căn cứ và ảnh hỗ trợ lựa chọn. Không bắt GENERIC/view/full set. Xin cận hoặc mặt sau vẫn có thể gửi theo metadata, không bắt xem ảnh trước. Chấm ảnh và lời tư vấn có giúp khách quyết định, không chấm số tool calls.

Native T1+T2 cho kết quả bản sửa kết hợp; không quy cải thiện riêng cho T2 hoặc nhận đã chứng minh lợi ích nhân quả của ảnh. T1 có contract tests/diagnostic riêng. Vòng này không mở thêm media arms.

## T3 — candidate owner chỉ thay một câu

Baseline là active owner tại base, không phải advice candidate cũ. Verifier/config/context giữ nguyên. Thay câu giữa đoạn cảm giác mặc:

> Khi băn khoăn đó quyết định việc mua, tư vấn cách mặc hoặc món phù hợp hơn từ nguồn hiện có; không chỉ trấn an, cũng không kể dài những gì chưa biết.

Bằng:

> Khi cảm giác mặc là điều khách phân vân, có thể khuyên giữ món hoặc đổi cách mặc/món khác; giải thích lựa chọn bằng chất liệu và thiết kế đã có.

Giữ câu đầu về không bảo đảm cảm giác cụ thể, câu cuối về kỹ thuật/kiểm nghiệm và quyền suy luận định tính đã có ở đoạn trước. Hypothesis: loại thiên hướng phải đổi món; không viết lại giọng hoặc thêm năm câu lặp quyền.

Reuse bốn paired inputs toolsOFF đã freeze, cùng context/history/clock/model/verifier và thứ tự arms đăng ký trước; chỉ instruction sentence khác. Diagnostic không media tools/ảnh nên không mang T2. Không sửa dữ liệu/lời khách/rubric sau output. Candidate không hơn hoặc làm controls kém đi thì không promote, không chồng prompt/rerun để cứu.

## Review toàn lượt trước kết quả

- Hai lựa chọn không tự là lỗi: xét thứ bậc/đánh đổi hợp lý hay trả lại cùng quyết định cho khách. Không ép một món làm đáp án.
- Mua cả bộ được phép. Đủ ngân sách không tự là lý do; áo phối váy đen là lợi ích chung cả mua áo lẻ. Giá trị thêm bộ đồng bộ phải hợp nhu cầu khách. Không mặc định ca cũ FAIL hoặc ép mua rẻ nhất.
- Ảnh đúng món chưa chắc hữu ích: xem nó cho khách thấy điều gì và hỗ trợ lời khuyên nào. Lưu exact attachments cùng actual terminal.
- Giọng được đánh giá qua ý thừa, chuỗi tính từ, nhắc hồ sơ và mạch tư vấn; không blacklist từ/đếm câu/keywords/bắt CTA.
- Báo riêng quyết định/giao dịch, giọng, media và safety; SEND_ELIGIBLE không tự quality PASS. Fallback/handoff/no-send chấm theo điều khách nhận, draft bị chặn dùng chẩn đoán.
- Review thủ công, không thêm judge role. Ẩn arms khi thực hiện được; ghi rõ nonblind nếu không. Không sửa rubric hoặc raw lịch sử sau kết quả.

## Population, ngân sách và điểm dừng

Chỉ chạy sau implementation/checks và yêu cầu chạy. Mọi generation ở denominator; không retry, best-of-N, loại lỗi hoặc tự tăng repetitions.

| Bộ kiểm N1 | Outcomes | Trần generation requests | Kết luận được phép |
|---|---:|---:|---|
| 3 cặp SAFE/UNSAFE cho NO_MATCH, COLOR_UNVERIFIED, SOURCE_ERROR | 6 | 6 | Verifier hiểu đúng phạm vi observation |
| Exact old feedback draft + context bổ sung | 1 | 1 | Probe, không yêu cầu PASS; không live send eligibility |
| Native media: đúng 4 ca hiện có | 4 | 16 | T1+T2 qua ingress/capture, actual attachments |
| Advice: 4 inputs × baseline/candidate | 8 | 16 | Chỉ treatment câu T3, toolsOFF |
| Tổng small evaluation tối đa | 19 | 39 | Population riêng, không gọi 19 native conversations |

Controls phải freeze trước result: SAFE giới hạn đúng operation/phạm vi; UNSAFE mở rộng thành thiếu ảnh toàn shop/không bán màu/không có ảnh từ lỗi nguồn. Reuse public captured source và code-generated outcomes; fixture lỗi ghi rõ diagnostic, không giả sự cố live. Labels evaluator-only; không đưa draft/đáp án vào production prompt.

Sáu controls cần SAFE dùng được và không UNSAFE nào send-eligible; UNCERTAIN/error không tính SAFE PASS. Không đạt thì report, dừng native media phụ thuộc/promote, không nới để cứu. Probe cũ không phải PASS gate. Advice độc lập media; thiếu feedback thật không chặn advice.

Native giữ bốn lời khách/sản phẩm, không tạo feedback giả hoặc đổi sản phẩm sau fail. Refresh nguồn công khai trước freeze, kiểm capability/budgets/wire, ghi thiếu nguồn đúng phạm vi. Không ép kết quả giống lần trước.

Regression B1/B2/B3 là bước sau khi có candidate đáng giữ và được yêu cầu chạy. Full39 hiện có 24 B1 + 8 stateful + 4 opening + 3 negotiation, trần 152 generations, đăng ký riêng ngoài cap39. B1 chữ không kiểm media. Không tự full43 hoặc cộng quote/ETA diagnostics. N1 không chứng minh stability/conversion. Không tiến bộ thì giữ baseline và ghi hypothesis chưa được hỗ trợ; không tự kết luận model kém hoặc mở model comparison.

## Thứ tự savepoint và verification

1. T1 observed RED → minimum fix → focused GREEN; self-review operation/scope/source/expiry/readback/no retries.
2. T2 exact tool-description diff + adapter/wire checks; native giữ owner baseline.
3. T3 candidate riêng một câu, effective hashes/paired equality; chưa thay active owner.
4. Clean executable/config/corpus commit, capture runtime SHA ngoài frozen source, preflight. Source đổi thì evidence cũ không đại diện source mới.
5. Khi được yêu cầu chạy: controls/probe; native media phụ thuộc controls; advice độc lập. Giữ accounting, errors, latency, tokens và mọi registered attempt. Không tự chạy bù.

Commands dự kiến, chưa chạy trong lượt planning:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Thêm focused context tests nếu đổi builder. Không mở rộng shared selector. Kiểm scripts thực trước execution; build/lint hiện kiểm type safety, không claim worker typecheck riêng nếu chưa chạy. Implementation kiểm theo consumers/risk, không chạy full suite cho docs.

## Self-review tiếp thu Astra

- P2 evidence: operation/stage, hash source thay catalog-v2, timestamp cố định, readback/expiry, event khác catalog truth, preserve selection khi view lỗi, bounded per-turn scope.
- P2 treatment: thay đoạn phân loại media; không chồng lại quyền view/select; cận áo không mặc định sai; không claim causal improvement từ combined native run.
- P3 owner: chỉ một câu, không verifier rewrite; hypothesis chưa confirmed cause.
- Không yêu cầu old draft PASS. Controls/native/advice tách denominator/capability; 19 outcomes/39requests mới là cap đề xuất, chưa đăng ký/chạy.
- Tests cũ không xác minh implementation chưa tồn tại. Không tự đóng discovery/deadline/quote/feedback coverage hoặc B GO.
