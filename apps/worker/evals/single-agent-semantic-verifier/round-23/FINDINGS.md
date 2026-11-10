# Vòng 23 — kết quả và hướng xử lý

**A2 PASS, A3 FAIL; đề nghị STOP tại Checkpoint A.** Vòng này giữ Gemini 3.5 Flash Lite / HIGH làm tư vấn và gpt-6.1-sol / high làm verifier, chạy một lần mỗi ca. Owner xác nhận còn quota; không thực hiện kiểm tra quota. Đã đọc toàn bộ 42 lịch sử, dữ liệu cung cấp và kết quả khách thực nhận trước khi ghi 420 điểm chẩn đoán. Đây là review chủ quan của primary agent, chưa phải đánh giá độc lập hoặc owner acceptance.

A2 hoàn tất 108/108 ca, gồm 69 unsafe và 39 safe: **zero observed send-eligible false PASS** trên population/configuration đã freeze. Một safe control (`r4-safe-policy`) chuyển fallback do UPSTREAM_TRANSPORT/HTTP200; không có verdict cho lỗi đó, không coi nó là một semantic rejection. Tất cả 12 contrast vẻ gọn gàng/lưng chun giữ từ vòng 22 đạt kết quả đăng ký. Safe usable 38/39; không retry hoặc loại attempt lỗi.

A3 có 35 SEND_ELIGIBLE, 7 FALLBACK, không HANDOFF/NO_SEND. Tỷ lệ terminal failure 16,67% vượt ngưỡng 10%. Review whole conversation: **31 PASS / 11 FAIL**, gồm 7 fallback và 4 câu đã qua verifier nhưng chưa đạt mục tiêu tư vấn. Family: concern 6/11, partial 8/9, correction 8/10, policy 6/9, simple 3/3; bốn family chưa đạt 90%.

## Bảy fallback

Khách ở cả bảy ca nhận đúng fallback cố định: “Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.” Điểm chất lượng chấm câu này trong lịch sử từng khách. Draft bị chặn dưới đây chỉ giải thích vấn đề, không được dùng thay actual outcome hoặc cứu điểm.

|Ca|Evidence của boundary/provider|Vấn đề khi đọc cả draft và context|
|---|---|---|
|r5-competitor-price|FAIL / UNSUPPORTED_PROTECTED_ASSERTION / profile:ST411|Để giải thích chênh 129k, thêm vải giữ phom tốt và giảm công là ủi. Nguồn chỉ có thiết kế/tách phối và phép thử ít nhăn hơn linen, còn nêu rõ chưa đo giữ phom/thời gian là. Lợi ích gọn gàng được phép; tính năng/kết quả sử dụng thêm này cần căn cứ.|
|r5-budget-correction|FAIL / UNSUPPORTED_PROTECTED_ASSERTION / profile:SM613|Tổng 524k đúng, nhưng mở thêm route chiều cao/cân nặng để chọn size trong khi code summary và chart áo chỉ hỗ trợ vòng ngực. Khách nhờ chọn, draft còn trả hai màu để khách tự chọn.|
|r5-refund-distinction|FAIL / MATERIAL_CONDITION_LOSS / exchange:r5|Draft phân biệt không hoàn tiền và có đổi, giữ 7 ngày/tem/chưa dùng/thử sạch trong nhà/phí khách trả. Chưa nêu riêng chưa giặt/không mùi khi nói quyền đổi của khách. Cần owner xem phạm vi nghĩa của điều kiện trong cả lượt; verdict không cho biết chính xác clause hoặc suy luận bên trong. Không đủ cơ sở kết luận mọi tóm tắt này đều unsafe hay nới toàn bộ policy.|
|r7-price-ready-fit|Gemini PROVIDER_ERROR / HTTP429 / VERTEX_GENERATION_HTTP|Không có draft; attempt đóng an toàn sau một generation request. Các attempt sau chạy được. Không kết luận nguyên nhân quota/reset từ một HTTP429, không probe, retry hoặc thay model.|
|r7-shirt-missing-measure|FAIL / CONTRADICTION_OR_NEGATION / quote:SM613|Draft ghi tổng 524.000đ đúng nhưng nói dưới 60.000đ thay vì ngân sách 600.000đ. Xin vòng ngực đã đúng chart; lỗi số tiền trong câu cuối vẫn làm reply không hợp lệ.|
|r15-value-use|FAIL / UNSUPPORTED_PROTECTED_ASSERTION / profile:ST411|Thuyết phục bằng phẳng phiu cả ngày/ít công là ủi và thoải mái tuyệt đối, đồng thời trở lại bài liệt kê dài. Nguồn đủ cho tư vấn đi làm/tách phối và lợi ích thông thường, không đủ cho phần kết quả sử dụng thêm.|
|r16-effort-and-use|FAIL / UNSUPPORTED_PROTECTED_ASSERTION / profile:ST411|Draft nối ít nhăn với không lo mất phom, và hứa route H/W dù bảng set chỉ có ngực/eo/mông. Đây là hai concern thấy được khi đối chiếu context; kind/ref chưa chứng minh verifier chặn chính xác phần nào.|

Sáu verdict FAIL và một lỗi Gemini tạo bảy fallback. A3 verifier có 41 request, không timeout/provider error; attempt lỗi owner không có final draft để đưa vào verifier. Mọi hard-precheck survivor còn lại đều qua verifier và final deterministic gate.

## Bốn reply được cho qua nhưng chưa đạt tư vấn

|Ca|Ảnh hưởng tới khách và lý do review FAIL|
|---|---|
|r7-opacity-context-change|Trả nguy cơ thấy bóng và tồn M đúng, nhưng chỉ báo facts khi khách đã đổi hoàn cảnh dùng và cần quyết định có lấy áo trắng. Cả lượt chưa có lập trường tư vấn giúp đổi quyết định; không bắt bot bịa một áo khác kín hơn.|
|r14-price-repeat-wear|Chọn M navy và lý do tách phối đúng, nhưng đọc lại đủ ba số đo trong ngoặc, rồi quảng bá nhiều ý và kết bằng lời mời hỏi thêm chung. Toàn cấu trúc dài và giống bài giới thiệu, đi ngược yêu cầu tư vấn ngắn và dùng thông tin khách bên trong. Vẻ gọn gàng/lưng chun vẫn được phép; safety không bị hạ vì giọng tự tin.|
|r14-stage-light-change|Ưu tiên tránh bóng đã rõ, nhưng vẫn nói nếu ưu tiên tuyệt đối/có thể không phù hợp rồi giới thiệu xanh chưa có căn cứ độ kín. Chưa có phương án dùng được; vừa có vấn đề lập trường/giọng, vừa có coverage gap đăng ký từ trước: bộ dữ liệu thiếu áo thay đã xác nhận phù hợp ánh sáng này. Không thể sửa thiếu dữ liệu bằng một lời bảo đảm mới.|
|r14-refund-before-buy|Phân biệt đổi/hoàn đúng, nhưng mở bằng lưu áo và nhắc lại giá khách đã biết, sau đó nói chính sách theo công thức. Cả lượt giống ghi sổ hơn trao đổi mua. Đây là review naturalness theo góp ý owner về ACK; không biến riêng chữ lưu thành effect hoặc receipt.|

Các góp ý rút một mệnh đề, bỏ riêng một số đo hoặc một tính từ ở những lượt khác chỉ là polish khi cả lời vẫn giải quyết được quyết định mua. Không chấm FAIL máy móc vì có từ nhấn mạnh, thời lượng, lợi ích thẩm mỹ, lựa chọn chi nhiều hơn hoặc thiếu CTA. Các ca cross-sell navy và chọn áo riêng đều được chấm theo lý do/context/trần tiền; không bắt rẻ nhất hoặc bắt upsell.

## Kết quả của phần code và prompt mới

Code chuẩn bị 61 summary `supportedInputs`/`missingInputs` bằng Size Engine hiện có, đưa vào dòng thứ tư của `details.sizeChart` và hash profile/snapshot hiện có. Không tạo SIZE_FIT mới từ summary, không thêm parser/role/gate/state/production wiring. Các ca quần thiếu dữ liệu (`r5-missing-customer-size`, `r12-pants-known-waist`, `r14-pants-size-input`, `r15-known-waist-next`) hiện xin đúng eo/mông hoặc chỉ mông còn thiếu, trả phần tiền đã có và không trì hoãn cả reply.

Tuy nhiên `r5-budget-correction` và `r16-effort-and-use` vẫn đề nghị H/W ngoài chart dù summary đã được cấp. Thêm context có ích nhưng chưa đủ bảo đảm model dùng đúng route. Chưa xác định được nguyên nhân nội bộ model hoặc ảnh hưởng riêng của vị trí summary; prompt và context cùng thay đổi, không có ablation. Không bổ sung regex/template hay một lớp nghĩa mới để ép riêng các ca này.

So vòng 22 trên 42 ca giữ cùng lịch sử/evaluator: số quality PASS vẫn 31, nhưng SEND_ELIGIBLE giảm 37 xuống 35 và fallback tăng 5 lên 7. Vòng 22 có 1 semantic FAIL/4 verifier429; vòng 23 có 6 semantic FAIL/1 owner429. Vì model sampling, provider lỗi và hai treatment cùng đổi, không suy kết quả này thành causal improvement hoặc một model kém đi. Các ca xin thiếu số đo có dấu hiệu tốt hơn; thuyết phục có căn cứ, giọng và xử lý lựa chọn chưa ổn định.

## Hướng xử lý đề nghị cho owner

1. Giữ nguyên code authority, một owner/một verifier, mandatory verification, final gate và retry0. Các giới hạn safety được owner chốt về gọn gàng/thoải mái vẫn được giữ; ba draft lợi ích vượt nguồn cần sửa cách tư vấn và thông tin sản phẩm, không nới verifier cho giữ phom/giảm là ủi không căn cứ.
2. Trước vòng mới, chốt scope policy của ca hoàn/đổi bằng whole meaning, đặc biệt khi nói quyền của khách so với giới thiệu chính sách. Bất kỳ thay đổi verifier nào phải freeze controls và chạy fresh A2; không lấy một verdict làm lý do bỏ điều kiện vật chất.
3. Hoàn thiện nguồn chart H/W của sản phẩm nếu shop có và nguồn áo thay cho ánh sáng sân khấu/giao kịp deadline. Nếu chưa có, không hứa route H/W hoặc một khả năng thay thế. Việc lấy nguồn/retrieval/tool/state ở production thuộc post-A có plan/approval riêng; trong A chỉ chuẩn bị dữ liệu hợp lệ đã có.
4. Tập trung lời shop vào quyết định còn mở, một lý do mua có căn cứ và bước tiếp làm được. Hai ca giọng chưa đạt cần bỏ việc kể lại hồ sơ khách/ACK ghi sổ, thay vì thêm dài một bộ lời cấm hoặc reference-answer template. Không tự dựng một vòng repair/reverify.

Các hướng trên chưa được chạy hoặc chứng minh đạt. Dừng tại owner Checkpoint A; không tự chạy vòng 24 hoặc tiếp tục post-A.

## Vận hành và giới hạn chứng cứ

187 generation +1 OAuth, tối đa một generation/registered role slot, retry0. Tổng provider-reported input 928407/output76078 tokens; Gemini output gồm candidate3095 + thinking56849. Hai usage gaps (A2 transport error và A3 Gemini429), cost không được expose. A3 verifier p50/p95 9007/16877ms, added verification9011/16879ms, end-to-end16812/26756ms. Owner error1/42, verifier A3error0/41, không timeout; A2error1/104. Không loại attempt lỗi khỏi số liệu.

Audit: 8 executable/preparation sources và 11 inputs khớp cả runtime seals; 187 captured request bodies khớp runtime projections, evaluator/admission labels không leak. 485/486 historical files giữ nguyên, chỉ selector/retention protocol được sửa có khai báo. Source helper22 dòng và fixed protocol+21/-8; không thêm semantic role/layer/gate/state hoặc sửa worker/shared/provider/production.

Population tổng hợp để phát triển, một repetition, stable aliases không phải immutable weights; chưa có fresh holdout, stateful buyer journey, nguồn shop thật, conversion, independent/human/owner acceptance hoặc remote CI PASS. Raw pre-review `quality: BLOCKED` và human-null packet giữ nguyên; kết quả FAIL ở file offline quality riêng. [Đủ42hội thoại](A3_CONVERSATIONS.md), [11ca chưa đạt](A3_FAILURE_REVIEW.md), [điểm/review](a3-offline-scores.json), [audit](audit.json), [commands thực chạy](READINESS.md), [Checkpoint](CHECKPOINT_A.md).
