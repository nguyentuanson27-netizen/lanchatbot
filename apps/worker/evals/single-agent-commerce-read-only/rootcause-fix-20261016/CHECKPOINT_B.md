# Phase B — sửa hợp đồng/context và chạy đủ24ca

14/24USABLE, 2NEEDS_EDIT, 0UNUSABLE, 8fallback/no-send. Terminal: {"FALLBACK":8,"SEND_ELIGIBLE":16}. Đây là primary review chủ quan của coding agent, chưa phải owner/human acceptance. Hoàn thành một batch, STOP mở rộng/chạy tự động; A vẫn OWNER_BYPASS, không được đổi thành PASS.

## Đã sửa và review

Owner projection bỏ product evidence.ref và giữ product subjectRef dùng gọi tool; nguồn không đọc được trả unknown, không suy thành không bán; lựa chọn bán và size/color filter cùng đi vào snapshot verifier; measurement đọc/ghi dùng cùng field path; native continuation bỏ phần nguồn trùng đúng giá trị, giữ opaque parts/call IDs/receipts/history và bound32KB. Prompt tập trung quyết định mua hiện tại, thao tác đang có và lời nhắn tự nhiên; phân biệt trả thời hạn/phí với cấp quyền đổi cho đơn. Không thêm case answer/regex/template, role, parser, gate, store hoặc retry/repair loop. Còn nhầm offer ref ở ca21 và internal guard đứng trước dedup ở ca1; không coi cả hai vấn đề đã được giải quyết chỉ nhờ projection.

[Review độc lập](INDEPENDENT_REVIEW.md) GPT-6.1 Sol High phát hiện1P2, sửa RED→GREEN và xác nhận đóng ở8c7099dd. [Kết quả kiểm tra thực tế](PREPARATION.md): src1759PASS, eval480PASS/2SKIP, sau correction affected75worker+17boundary+21protected/replyPASS; compiler/build/lint đã chạy. Aggregate `pnpm --filter @lana/worker test` ban đầu exit1 vì Windows symlink fixture; full src sau junction tạm PASS, file gốc được phục hồi. Không gọi command thất bại là PASS.

## Từng nhóm và toàn bộ kết quả

| Nhóm | N | USABLE | NEEDS_EDIT | UNUSABLE | Fallback/no-send |
| --- | ---: | ---: | ---: | ---: | ---: |
| Đổi dịp mặc | 3 | 1 | 0 | 0 | 2 |
| Policy hiện tại | 3 | 1 | 0 | 0 | 2 |
| Nguồn thiếu một phần | 3 | 3 | 0 | 0 | 0 |
| Giá | 3 | 3 | 0 | 0 | 0 |
| Giá/tồn thành phần | 3 | 2 | 0 | 0 | 1 |
| Tìm và đọc sản phẩm | 3 | 1 | 0 | 0 | 2 |
| Phân vân mua | 3 | 1 | 2 | 0 | 0 |
| Đổi sau khi sử dụng/thử | 3 | 2 | 0 | 0 | 1 |

| Ca | Terminal | Review toàn lượt | Lý do |
| --- | --- | --- | --- |
| 1/b1-changed-occasion | FALLBACK | FALLBACK_OR_NO_SEND | Khách đổi sang sân khấu và hỏi nguy cơ lộ bên trong; câu khách nhận không có lời tư vấn hay hướng chọn món. Không dùng nháp bị chặn để chấm. |
| 2/b1-current-policy | SEND_ELIGIBLE | USABLE | Đọc đúng policy hiện tại15ngày/30.000đ thay mốc7ngày cũ; trong mạch hỏi còn kịp của món chỉ cầm lên và còn tem, đây là trả thời hạn/quyền đổi màu, không báo đã thực hiện nhận đổi hay miễn những điều kiện khác. Không tự giả định món đã bẩn/giặt để bắt thêm checklist. Câu lặp xưng hô, có thể gọn hơn. |
| 3/b1-partial-source | SEND_ELIGIBLE | USABLE | Trả đúng áo tơ Hàn thêu/chân váy ren và nói rõ chưa đọc được giá/tồn M trong source-fault control; không tự tạo giá hay yêu cầu lại số đo. Phần chất liệu hơi giống mô tả catalog và câu xin thông cảm có thể bớt, nhưng câu trả lời phần có căn cứ vẫn dùng được. |
| 4/b1-price | SEND_ELIGIBLE | USABLE | Giá cả set799.000đ đúng nguồn; thông tin có bán lẻ áo/váy có offer mapping xác nhận. Đây là gợi ý bán thêm lựa chọn liên quan, không phạt chỉ vì hỏi giá mà có thêm một câu. Dấu ngoặc và nhiều ạ làm nhịp chat hơi gượng. |
| 5/b1-component-stock | SEND_ELIGIBLE | USABLE | Trả thẳng đúng áo AO sizeM còn hàng, đơn giá499.000đ từ read đúng offer/size. Không đồng nhất tồn với mặc vừa và không thêm bước mua chưa có. |
| 6/b1-search-read | FALLBACK | FALLBACK_OR_NO_SEND | Khách có mã SD375 rõ nhưng không nhận được giá hoặc một câu giải thích hữu ích. Chỉ đánh giá static fallback đang hiện ra. |
| 7/b1-buying-concern | SEND_ELIGIBLE | NEEDS_EDIT | Có lập trường chọn cả set và giải thích từ độ rũ/phối ren, giá đúng. Nhưng kết thúc mời kiểm tra size trong B1 không có recommend_size hay nguồn chart đã xác minh, nên bước tiếp theo chưa thực hiện được. Đoạn mô tả cùng việc đọc lại nguyên ngân sách làm lời tư vấn giống quảng cáo hơn chat. |
| 8/b1-policy-used | FALLBACK | FALLBACK_OR_NO_SEND | Khách nói rõ đã mặc đi làm; cần trả lời trực tiếp tình huống đổi và phí, nhưng chỉ nhận câu không trả lời được. Không coi một draft đúng nếu draft đó không gửi. |
| 9/b1-changed-occasion-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Không giúp khách quyết định mặc gì khi chuyển ra ngoài trời lâu và dễ nóng; nguồn/candidate bên trong chưa được dùng để cứu điểm terminal. |
| 10/b1-current-policy-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Câu hỏi về thời hạn nhận12ngày và phí đổi không được trả lời. Terminal không sửa mốc phí cũ hay cung cấp phần đúng có thể dùng. |
| 11/b1-partial-source-v2 | SEND_ELIGIBLE | USABLE | Trả đúng chất ren, dáng rũ của chân váy và giới hạn giá/tồn M chưa đọc được; không còn suy POS thiếu thành shop chỉ bán cả bộ. Lời mô tả hơi dài nhưng đã trả phần hỏi có dữ liệu và giữ phần thiếu rõ ràng. |
| 12/b1-price-v2 | SEND_ELIGIBLE | USABLE | Hiểu đúng đang nói Thạch Thảo và trả ngay giá cả bộ799.000đ, gọn và đúng nguồn. |
| 13/b1-component-stock-v2 | SEND_ELIGIBLE | USABLE | Dùng context chỉ lấy chân váy, trả đúng CV sizeM có hàng và giá449.000đ; đã bỏ lời mời lên đơn ngoài khả năng B1. |
| 14/b1-search-read-v2 | FALLBACK | FALLBACK_OR_NO_SEND | Khách hỏi đúng tên Khánh Trang nhưng kết quả thực nhận không giúp xác định mẫu hay biết giá. Không tự điền nguồn/candidate khác để tính là đã phục vụ. |
| 15/b1-buying-concern-v2 | SEND_ELIGIBLE | NEEDS_EDIT | Nhận ra ren/thêu khác thói quen đồ trơn và có lựa chọn mua lẻ đúng nguồn, nhưng vẫn để khách tự chọn cả bộ hay một món; chưa chốt nên lấy gì cho nỗi lo hơi điệu. Ba đoạn nhiều lời khen/đối ý khiến quyết định bán hàng loãng. Không bắt vì riêng độ dài hoặc thiếu một từ khóa. |
| 16/b1-policy-used-v2 | SEND_ELIGIBLE | USABLE | Áp dụng trực tiếp HOLD_UP_ONLY vào việc khách đã mặc thử5phút; trả không hỗ trợ đổi size, không lẫn ướm với mặc và không đọc checklist thừa. |
| 17/b1-changed-occasion-v3 | SEND_ELIGIBLE | USABLE | Đã đổi lập trường từ cả bộ đi tiệc sang chọn riêng áo phối quần/chân váy gọn cho gặp khách. Lý do dùng được từ thiết kế ren, không cần kiểm nghiệm riêng cho nhận xét phối đồ. Có thể bớt tính từ lặp nhưng hướng mua rõ. |
| 18/b1-current-policy-v3 | FALLBACK | FALLBACK_OR_NO_SEND | Không trả được câu hỏi đổi size ở ngày9 hoặc giải thích mốc15ngày hiện tại; khách chỉ nhận static fallback. |
| 19/b1-partial-source-v3 | SEND_ELIGIBLE | USABLE | Trả đúng chất áo/váy và nói rõ chưa tra được giá/tồn trong control POS thiếu. Đã bỏ câu hỏi lại sản phẩm khách đang xem hoặc giới thiệu mẫu khác không giúp việc hiện tại. |
| 20/b1-price-v3 | SEND_ELIGIBLE | USABLE | Trả đúng giá nguyên set799.000đ, ngắn gọn, không tự cộng ship hay thêm câu hỏi không cần. |
| 21/b1-component-stock-v3 | FALLBACK | FALLBACK_OR_NO_SEND | Không trả được áo có bán riêng, tồn M và giá dù đây là yêu cầu giao dịch cụ thể. Không chấm điểm từ bất kỳ draft bị chặn. |
| 22/b1-search-read-v3 | SEND_ELIGIBLE | USABLE | Tìm đúng SQ223/Xuân Thảo, trả còn hàng và699.000đ từ POS đúng offer SET_QUAN; thông tin bán lẻ có mapping xác nhận. Câu trong ngoặc hơi dài nhưng vẫn giải quyết trọn nhu cầu. |
| 23/b1-buying-concern-v3 | SEND_ELIGIBLE | USABLE | Mở đầu chọn riêng áo499.000đ để dùng chân váy đen sẵn có, đúng mục tiêu mặc lại. Cho thêm phương án đồng bộ799.000đ trong ngân sách là upsell hợp lý; không phạt vì bán cả bộ hoặc có hai lựa chọn. Có thể gọn hơn ở đoạn cuối nhưng lời khuyên chính đã rõ và giá đúng. |
| 24/b1-policy-used-v3 | SEND_ELIGIBLE | USABLE | Từ chối đổi vì đã cắt tem và giặt, áp dụng đúng sự việc khách kể dù mới nhận2ngày/chưa mặc ngoài. Giọng lịch sự, không kể lại nguyên policy. |

[Toàn bộ hội thoại khách thực nhận](CONVERSATIONS.md), [primary và10tiêu chí hỗ trợ](PRIMARY_REVIEW.json), [root cause sau primary](DIAGNOSTICS.md). Không dùng số từ khóa hoặc cộng điểm thay cho đánh giá cả lượt. Fallback được chấm bằng câu khách nhận, không thay bằng nháp bị chặn.

## Provenance và cấu hình

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Source `ea983ad05034ea2fbfa2e8b656d8734aa2e2848f` commit/clean trước generation; [frozen inputs](FROZEN_INPUTS.json), [registration](raw/registration.json).
- Raw `ee519ea37c64fb613dca3ac97f42dc3b33c80f3f` trước primary `57ac945a69350b0559e47b3bba00ea47233d2a17`, rồi mới đọc nháp/verdict. Spec/plan Git blobs, exact commands/log/helper hashes: [PROVENANCE.json](PROVENANCE.json).
- Owner Vertex/global gemini-3.5-flash-lite High: candidate1/max8192/HIGH/includeThoughts=false/temperature+topP omitted/90s/retry0. Verifier Codex-login gpt-6.1-sol High, CLI0.159.2, strict JSON/tools0/one upstream/90s/retry0/no client continuation. Provider aliases không phải dated immutable snapshots.
- Corpus cố định24/8nhóm×3/N1;3POS_UNAVAILABLE controls3/11/19 vẫn trong denominator, không lộ vào provider projection. B1 chỉ có search_products/read_product/read_policy; không có add-to-cart/size tool/checkout/handoff trong batch này. Seven-turn stateful population giữ riêng, không rerun provider hoặc suy B2/B3 đạt từ B1.

| Hash | SHA-256 |
| --- | --- |
| owner | `9d477de09ea59dab2f02c3fb4e0c9b9f79a88de189d72267a25e2ef1387180fa` |
| verifier | `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d` |
| schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| tools | `b0d49904c83e9c53f138ad9e6fd33792f6a797e4f50930dcbea4d7aa458789b0` |
| corpus | `790a28e0415bf4b0bdf23c44993cbe78fe76415827a080e9bb09e777775dca67` |
| manifest | `e15d390295a7466093c7367d1f2a32477f12491bd73ce835a229f5c8e2236984` |
| sourceConfig | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

## Vận hành và audit

Có74dispatch attempts:73HTTP200 và1không capture HTTP response (ca10), không phải74response thành công. Ca8HTTP200 nhưng không có parsed final hợp lệ. Error codes gốc bị adapter gom lại nên nguyên nhân hẹp của hai lỗi chưa xác định. Token totals chỉ là phần có usage của73/74generations. [Chẩn đoán từng ca](DIAGNOSTICS.md) tách5fallback trước verifier khỏi3semantic refusals.

24/24 registered/recorded; 74invocations = 55owner + 19verifier; 74known HTTP, 0unknown accounting. Error2, timeout0, retry0; verifier error0/timeout0. Fallback/handoff/no-send 33.33%. Token input228343/output22693, coverage73/74; cost=null vì provider không expose.

| Đo lường | N | p50 ms | p95 ms |
| --- | ---: | ---: | ---: |
| verifier | 19 | 5025.50 | 25026.77 |
| addedVerification | 19 | 5665.47 | 25696.37 |
| owner | 55 | 1767.70 | 5120.29 |
| endToEnd | 24 | 10952.62 | 22256.13 |
| tool | 24 | 654.27 | 2947.57 |

Nearest-rank descriptive N1, không phải SLA. [Metrics](METRICS.json)/[từng request](REQUEST_ACCOUNTING.json): 28raw/source disk+Git hashes, 74unique generation IDs, 19exact draft/trusted bindings, 16eligible exact-draft matches; 0evaluator-label leaks kể cả nested JSON. All19generated finals được verifier; không classifier skip. Gemini evidence là prepared body + fake-HTTP adapter capture tests, không independent live body echo. Codex có captured actual relay bodies.

Fallback giữ nguyên C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.” SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. PASS chỉ send-eligible khi gate/readback hiện tại đạt, sending vẫn disabled; FAIL/UNCERTAIN/malformed/error/timeout dùng static fallback, freshness thay đổi dùng handoff/no-send theo manifest; permission/privacy/recipient invalid no-send. Không hứa handoff thật.

## Giới hạn và điểm dừng

So với lần trước10USABLE/4NEEDS_EDIT/10fallback, đây chỉ là quan sát trên cùng population sau thay prompt/context/source contract; N1, live source và alias có thể biến đổi, không tách được causal effect hay khẳng định ổn định. Không nới rubric/đổi nhãn theo kết quả. [Diagnosis](DIAGNOSTICS.md) ghi phần nào source/context, owner, verifier hoặc runtime với mức chắc chắn; short verdict không đủ để khẳng định một clause cụ thể là nguyên nhân. Human acceptance=null. Không chạy A2/A3 mới hoặc suy semantic safety ngoài population/configuration đã quan sát.

Complexity:0new semantic roles/layers,0new stores/gates/frameworks; chỉ ephemeral source literal map trong existing boundary và mechanical request projection/dedup. Không tăng generation/tool/wire budgets. State/effects privacy/CAS/receipts/current gate vẫn thuộc code; chưa chứng minh stateful provider journey đã hết lỗi. Không production entrypoint wiring, publication/index mutation, activation, merge, migration, live write/send hoặc deployment. Dừng sau một batch và review; các thay đổi tiếp theo phải có source/run identity riêng.
