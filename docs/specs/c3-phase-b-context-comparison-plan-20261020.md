# Phase B — kế hoạch sửa context và kiểm chứng chất lượng tư vấn

Ngày: 2026-10-20. Trạng thái: PLAN_ONLY. Owner yêu cầu xây dựng plan; lượt này chưa sửa executable, prompt, nguồn hay chạy provider.
Preparation base: `e67b9fecb3508ef75e25252e8f3466b921cc8088`. Kế hoạch này thay phạm vi sửa tiếp theo của các mục ngày 2026-10-19; không thay kết quả, nhãn hoặc điều kiện của các run đã kết thúc. A vẫn OWNER_BYPASS, B chưa live GO.

## Mục tiêu và giả thuyết

Bot giúp khách chọn và mua hàng của shop bằng lời tư vấn dễ hiểu, tự nhiên, có lý do sát điều khách phân vân. Trả đúng dữ kiện là cần thiết nhưng chưa đủ. Không ép khách mua ít hơn, mua lẻ, chọn một mẫu cố định hoặc nhận một CTA theo công thức.

Năm run gần nhất có 60 slots: ba run 16 slots và hai run targeted 6 slots. Các tập không tương đương; captured advice phụ thuộc context đã chụp, không phải hành trình live độc lập. State/giỏ/tiền đúng trong các hành trình đã đo; lỗi tập trung vào lý do thuyết phục, lời hứa hiệu quả và giọng catalog. Hai bản sửa owner gần nhất chưa chứng minh cải thiện ổn định.

Giả thuyết cần thử: văn quảng cáo lặp trong mô tả hàng đang góp phần khiến owner nối tính từ và dùng lời khen thay cho lời khuyên sát nhu cầu. Thạch Thảo đã được biên tập, nhưng các món thay vẫn có nhiều đoạn “tổng thể… thanh lịch… duyên dáng”. Đây là dấu vết, chưa là kết luận nhân quả. Mục tiêu của lượt này là kiểm chứng giả thuyết đó; không viết lại thêm một lần yêu cầu “tự nhiên/chọn giúp khách”.

Giữ một owner Gemini `gemini-3.5-flash-lite` HIGH và verifier `gpt-6.1-sol` high, config/credential route hiện hành. Owner prompt SHA256 `057fcb7a47d69ffce4731a8ee58bb7ecafe36204bd6726128325e7838a813d70`; verifier SHA256 `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`. Code vẫn sở hữu identity/truth/freshness/state/permission/effects/receipts/privacy. Không thêm role, parser, router, repair/reverify, rewrite sau verifier, fallback động, durable state hoặc production wiring.

## T1 — thống nhất cách đọc các câu còn tranh luận

Phụ thuộc: không. Scope nhỏ: một review bổ sung bên cạnh evidence, không sửa các PRIMARY_REVIEW cũ.

- Đối chiếu nguyên câu hỏi/history/nguồn và actual reply của các trường hợp: lời khuyên tương đối; “giữ form gọn gàng suốt chuyến đi”; “ngồi lâu đứng lên vẫn mượt”; “rũ/treo lên là phẳng ngay”. Lấy cả câu PASS và fallback, không chỉ câu bị chặn. Ghi rõ sản phẩm/nguồn khác nhau có giải thích được kết luận khác nhau hay không.
- Không tự phân loại câu thành cam kết chỉ vì có thời lượng, từ nhấn mạnh hoặc từ “giữ form”. Xác định kỳ vọng mà toàn đoạn tạo cho khách: nhận xét lựa chọn thông thường hay một kết quả sử dụng cụ thể không có căn cứ. Giữ quyền tư vấn tự tin, inference vật liệu/thẩm mỹ đã được owner chấp nhận. Không đòi phép thử cho mọi lời khuyên.
- Nếu chưa giải quyết được khác biệt cách hiểu bằng chỉ dẫn hiện hành, ghi UNRESOLVED trong ghi chú review, nêu hai cách hiểu và ảnh hưởng tới quyết định. Đây không phải verdict/schema runtime mới. Không tự biến thành một lỗi safety đã xác nhận hay đổi verifier để đạt điểm. Trường hợp ảnh hưởng quyết định tiếp tục phải trình owner bằng nguyên đoạn trước khi chạy phần phụ thuộc.

Hoàn thành khi có cùng tiêu chí review áp dụng cho cả control và candidate, trước provider; phân biệt lỗi căn cứ đã rõ với tranh luận và góp ý giọng. Câu giữ form trong baseline từng được USABLE nhưng câu tương tự ở run cuối NEEDS_EDIT phải được nêu công khai. Không viết đáp án này vào request model.

## T2 — biên tập dữ liệu, bảo toàn nội dung có ích

Phụ thuộc T1 để tránh vô tình sửa nguồn nhằm cứu một verdict. Scope: một file dữ liệu candidate và bảng đối chiếu nguồn, không đổi nguồn shop dùng chung.

- Bắt đầu từ hai capture đã dùng trong `chat-expression-run-20261019/targeted-input.json`. Kiểm mọi sản phẩm trong tập đó, gồm SV2447, SV1561, SV165, SV244; không chỉ sửa món được chọn trong câu lỗi. Cùng một sản phẩm có cùng cách trình bày ở mọi slot.
- Chỉ biên tập trường mô tả: giữ vật liệu theo từng phần áo/váy, kiểu dáng, lớp, họa tiết, chi tiết trang trí, cạp và đặc điểm có ích đã có nguồn. Bỏ câu quảng cáo lặp nghĩa hoặc gom các cụm trùng. Giữ nguyên các nhận xét nguồn độc nhất có ích, kể cả cảm giác/thẩm mỹ; không loại tất cả tính từ, không rút gọn để đạt số byte.
- Mỗi phần bị lược có ghi chú là lặp hay quảng cáo chung; mỗi thông tin được giữ truy được về nguồn. Không tự suy thêm ít nhăn, tự hồi nếp, độ kín, size fit, khả năng giao kịp. Không biến chưa biết thành không có. Không thêm “mẫu nên chọn”, “được phép nói”, câu trả lời, rubric hay lựa chọn của evaluator vào dữ liệu.
- Giữ nguyên tên, ID, biến thể, offers, giá/tồn/quote, size charts, policy, history, receipts, bounds và canonical snapshot. Hash bản nguồn cụ thể; nguồn đổi thì không áp bản biên tập cũ một cách im lặng. Đo bytes trước/sau để mô tả, không dùng làm quality gate.

Hoàn thành khi self-review bảng nguồn → bản biên tập không thấy mất thông tin phân biệt sản phẩm hoặc thêm đặc tính. Dữ liệu này là candidate do agent biên tập trong eval, không gọi là nguồn shop đã cập nhật/owner chứng nhận.

## T3 — thử riêng cách trình bày cho owner

Phụ thuộc T2. Scope dự kiến 2–3 file eval: runner advice hiện hữu, fixture candidate và focused test. Chỉ sửa adapter nếu runner không thể tái sử dụng đường dựng request sẵn có; không tạo framework so sánh.

`advice-diagnostic.mjs` hiện dùng chung `trusted` cho owner, hard precheck, binding, verifier và final gate. Trong phép thử, giữ canonical `trusted` nguyên vẹn; chỉ clone context cho owner và thay các description đã được T2 kiểm tra. Cả body được capture và body thực gửi phải đi qua cùng đường dựng `buildGeminiCommerceRequest`/inference. Owner vẫn chỉ trả exact final text + telemetry.

Không dùng `candidateDescriptions` của source-config để giả là một thay đổi owner-only: helper đó thay catalog description/sourceVersion, làm evidence của verifier cũng đổi. Reuse cách lookup theo product ID/hash của helper nếu hữu ích, nhưng không đổi canonical provenance/hash hoặc runtime truth để phục vụ presentation. Không giả original hash là hash nội dung đã biên tập. Lưu hash của owner view thực gửi riêng trong evidence hiện có.

TDD cho logic projection: quan sát RED rồi GREEN. Test phải chứng minh canonical context không bị mutate; tất cả field ngoài description nguyên vẹn; unknown product giữ nguyên; mapping không lấy nhầm nguồn; control/candidate đều không leak evaluator labels; captured body chính là body inference sử dụng. Không viết test đếm tính từ, từ nối hay dấu ngoặc để chứng minh tự nhiên.

Commands dự kiến trước provider, chạy từ root repo và ghi kết quả thật:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker build
git diff --check
```

Build cung cấp dist hiện hành cho runner; nếu sửa TypeScript/runtime thì thêm focused tests của caller/boundary thực sự bị đổi, worker typecheck và lint. Nếu cần file test mới cho projection, freeze exact command thêm file đó trước chạy. Không chạy full suite dư thừa hoặc claim test code chứng minh chất lượng tư vấn.

## T4 — một phép so sánh, có đối chứng mới

Phụ thuộc T1–T3. Đây là kế hoạch cho lần owner yêu cầu thực hiện/chạy; yêu cầu lập plan hiện tại chưa chạy provider.

- Hai tình huống hiện hữu: `b1-changed-occasion` và `b1-buying-concern`; mỗi tình huống 3 lần cho mỗi cách trình bày. **12 slots tổng cộng, tối đa 24 generation requests** (12 owner + 12 verifier). Không phải 12 case mới. Control dùng context cũ, candidate dùng bản T2; cả hai dùng prompt hiện hành và verifier không đổi. Không lấy kết quả lịch sử làm control duy nhất.
- Cùng canonical capture, replay clock, model/config, history, câu hỏi, tools tắt. Freeze trước provider: exact inputs, candidate map/source hashes, thứ tự xen kẽ control/candidate (đảo bên bắt đầu giữa các repetition), review và ngân sách. Arm/caseId/split/expected/rubric chỉ ở evaluator, không vào model request. So nguồn verifier giữa các arm với cùng case: chỉ draft và binding/request ID đương nhiên khác.
- Commit executable + frozen inputs; require clean source/config, capture HEAD runtime làm runSourceSha, không viết SHA đó ngược vào source. Preflight, tối đa một upstream generation mỗi generation đã đăng ký, retry 0. Source thay đổi thì evidence thuộc run mới.
- Hoàn thành tập diagnostic đã đăng ký dù một slot có semantic rejection; không gửi khách và không sửa giữa chừng. Auth/quota/nguồn khiến không thể chạy tiếp thì giữ request/error accounting và đánh dấu phần chưa chạy. Không thay mẫu, retry, majority vote hoặc chạy thêm đến khi PASS. Đây là Phase B diagnostic theo OWNER_BYPASS, không gọi là A2 hay áp thành thay đổi hard-stop của A2.

Review trước khi xem rejected draft/verdict diagnosis: đọc whole actual outcome. Giữ nhãn terminal cũ USABLE/NEEDS_EDIT/UNUSABLE/OWNERSHIP_CONTROL; báo riêng chất lượng tư vấn bằng nhận xét cụ thể: đã giúp chọn/mua thế nào, lý do có liên quan tới băn khoăn không, câu nào khiến khách phải tự giải lại việc đã nhờ shop, giọng có phải viết lại trước khi dùng không. USABLE chức năng không tự là cải thiện bán hàng. Fallback được chấm như fallback; rejected draft chỉ dùng chẩn đoán sau primary lock.

Ẩn arm và điểm lịch sử khi dựng bản hội thoại để review nếu làm được bằng artifact hiện có; không gọi là blind human review vì agent đã biết treatment. Không bắt hai options, ngoặc, ngân sách, “nếu” hoặc CTA thành lỗi tự động. Không đòi model chọn đúng món theo ý evaluator. Nhận xét chủ quan và bất đồng safety được báo riêng, không âm thầm tính thành lỗi đã được owner chốt.

Quyết định sau phép thử:

- Candidate còn fallback/lỗi protected rõ, bỏ lỡ yêu cầu chọn hoặc giọng/lập luận vẫn phải viết lại: kết luận giả thuyết chưa đủ; dừng phần integrated. Không thêm prompt ngay rồi gọi cùng run là thành công.
- Candidate chỉ ngắn hơn nhưng vẫn khen thay cho giải quyết băn khoăn, hoặc kết quả lẫn lộn: INCONCLUSIVE, không tuyên bố cải thiện/ổn định và không mở thêm mẫu tự động.
- Chỉ tiếp tục nếu cả hai tình huống có cải thiện giải thích được bằng toàn câu trả lời, không có lỗi thực chất ở candidate và không có suy giảm chức năng. Không dùng đa số PASS xóa một failure. Sáu candidate outputs chỉ là bằng chứng thăm dò; không chứng minh conversion hoặc độ ổn định toàn hệ thống.

## T5 — kiểm lại luồng có tool nếu phép thử có ích

Phụ thuộc kết quả T4. Không mở lại 16 slots chưa chạy của run cũ. Freeze registration/source mới cho **16 slots hiện hữu ×1** (8 stateful + 4 integrated B1 + 4 captured advice), tối đa **52 requests**. Tổng trần hai giai đoạn **28 slots / 76 requests**; số thực có thể thấp hơn do code-only/control/hard precheck. Không phát sinh vòng thứ hai trong plan này.

Chuyển dữ liệu T2 sang cấu hình `candidateDescriptions` của eval đã có, áp dụng đồng nhất exact lookup/search và source readback liên quan. Đối chiếu từng mô tả với source hiện hành trước run; nguồn hoặc tập sản phẩm khác phải được ghi rõ. Món ngoài map giữ nguyên, không bịa bản biên tập. Không tăng product bound, thêm fetch, lọc kết quả để ép tìm món “đúng”, thay signed native tool history hoặc viết shared registry/Qdrant/POS.

Ở bước này cả source evidence của verifier có thể nhận mô tả candidate qua cơ chế existing; đây là phép kiểm tích hợp riêng, không còn phép so sánh owner-only T4. Không ghép các tỷ lệ thành một số cải thiện nhân quả. Verify search/read/readback dùng nhất quán mô tả và version hiện hành; reuse các test candidate-description, tools/readback đang có. Nếu đường hiện tại không hỗ trợ nhất quán, sửa đúng đường đó với focused RED→GREEN trước seal, không thêm gate mới.

Quan sát actual trace: bot tìm/đọc món nào, lấy lý do nào để tư vấn, có thực hiện bước mua đúng khả năng không. Đồng thời kiểm giỏ, đổi biến thể/số lượng, correction, tổng tiền, checkout và handoff giữ hành vi đã đúng. Captured advice vẫn không phải live journey độc lập. Không dùng integrated result để chứng minh hiệu quả của projection trên toàn catalog.

## T6 — báo cáo và dừng

Phụ thuộc T4; thêm T5 nếu đã chạy. Reuse report/raw/accounting/audit hiện hữu, không thêm loại bằng chứng hay gate mới.

Lưu nguyên 12 outcomes hoặc phần thực chạy, primary trước diagnosis, request/errors/usage/latency, source/prompt/config/capture hashes và test commands thực chạy. Báo riêng control/candidate, integrated/stateful/replay, actual fallback và disagreement; không sửa primary/raw lịch sử. Kết luận rõ: giả thuyết có ích, không đủ hay chưa xác định; lỗi nào thuộc owner, dữ liệu, verifier, code hoặc review.

Nếu không có cải thiện: giữ baseline, không áp candidate vào cấu hình dùng chung, dừng với finding. Bước sau phải dựa trên evidence mới thay vì một vòng prompt “ngắn/tự nhiên hơn”. Nếu có cải thiện: giữ candidate làm hướng triển khai tiếp, chưa kết luận toàn B đạt hoặc deploy. Không live send, tạo POS order thật, merge/deploy hoặc tự chạy tiếp.

Complexity budget: một bộ mô tả biên tập có nguồn, nhánh projection nhỏ trong harness hiện hữu và test của boundary đó; runtime role/layer/gate/state mới = 0. T1 là review dữ liệu hiện có, không provider generation. Prompt/verifier không đổi trong vòng này. Một thay đổi khác cần thiết phải được tách khỏi phép so sánh thay vì âm thầm gộp vào treatment.

## Tham chiếu

- [Đối chiếu stability](../../apps/worker/evals/single-agent-commerce-read-only/wording-stability-2-20261019/WORDING_STABILITY.md).
- [Baseline có câu giữ form từng được chấm dùng được](../../apps/worker/evals/single-agent-commerce-read-only/ack-source-rerun-20261019/CONVERSATIONS_AND_REVIEW.md).
- [Sáu câu sau sửa quyết định](../../apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019/CONVERSATIONS_AND_REVIEW.md).
- [Sáu câu sau sửa giọng](../../apps/worker/evals/single-agent-commerce-read-only/chat-expression-run-20261019/CONVERSATIONS_AND_REVIEW.md).
- [Prompt/verifier hiện hành](../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt), [verifier](../../apps/worker/evals/single-agent-commerce-read-only/prompts/verifier.vi.txt).
