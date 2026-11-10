# Review toàn bộ campaign Phase B — 2026-10-28

Review source: `574ef87db95b8109bf39689c30f7c33b9dc0112d`. Evidence/report HEAD lúc review: `488375eda9bc1da4f12087878204e88ec880a2f9`.

Đã đọc 51 native outcomes, lịch sử public/corpus liên quan, draft, actual terminal/capture, tool/source evidence và 17 verifier controls. Đây là self-review offline, không phải independent review, không có generation mới. Bảng cuối đối chiếu đủ 51 case IDs với ledger của campaign; nhận xét chi tiết dưới đây phân biệt an toàn, chất lượng bán hàng và hoạt động của luồng. Không đổi nhãn, prompt, runtime hoặc raw evidence của run cũ.

## Nhận xét chính

Giao dịch và cách dùng công cụ có tiến bộ cụ thể trong lượt này. Tư vấn vẫn chưa tương xứng: model đọc được dữ liệu và hiểu băn khoăn nhưng thường biến mô tả thành lời khen, hoặc đưa cả hai hướng mua để khách tự quyết. Không có căn cứ kết luận model thiếu mục tiêu bán hàng: prompt hiện hành đã yêu cầu chọn một hướng, không phủ nhận lo ngại bằng lời khen, không chép chất liệu thay lời khuyên.

Có một lỗi owner rõ gây fallback (SQ223) và một PASS còn cần xem phạm vi lời tư vấn (discovery/không lo bó bụng). Các hạn chế nhẹ về giọng đã được owner tạm chấp nhận vẫn được giữ như hạn chế, không tự nâng thành hard failure mới.

## Phạm vi và kết quả

Owner: Gemini 3.5 Flash Lite HIGH; verifier: GPT-6.1 Sol HIGH. Compact V2. Mỗi native case chạy một lần, không generation retry.

| Kết quả native | Số lượt | Cách hiểu |
|---|---:|---|
| SEND_ELIGIBLE | 37 | Đủ điều kiện gửi trong surface thử nghiệm; không đồng nghĩa tư vấn tốt hoặc khách đã mua |
| HANDOFF | 9 | 4 thiếu evidence ảnh, 3 controlled POS failures, 2 bàn giao nghiệp vụ |
| NO_SEND | 4 | 2 sau khi HUMAN sở hữu chat; 2 checkout có output do code tạo |
| FALLBACK | 1 | SQ223: verifier chặn sai phạm vi đặc tính |
| Tổng | 51 | Đã chạy đủ; NOT_RUN 0 |

30 outcomes có persisted capture trong database test; 21 B1 chỉ kiểm send eligibility. Không live send, không có bằng chứng conversion hay hoàn tất đơn hàng POS thật.

17 controls gồm **8 SAFE, 8 UNSAFE và 1 probe không có gold label**. 16 ca có nhãn đạt kỳ vọng; probe quan sát PASS. Cả bộ controls tập trung media semantics, không đủ đại diện cho policy/fit/giá/lớp áo-quần. Không dùng kết quả này để tuyên bố verifier đã được kiểm đủ mọi nghĩa commerce.

## Phần đã làm tốt

- Báo giá mở đầu đúng mẫu, cả set/mua lẻ đúng. Ba ca phải gửi ảnh mở đầu đều có hai ảnh; hỏi lại giá không gửi lặp ảnh. Mẫu chưa xác định thì hỏi hình/tên.
- Các ca policy dùng thời hạn 15 ngày/phí 30k hiện hành, không lấy 7 ngày hoặc 25k trong lịch sử làm nguồn hiện tại. Đã mặc đi làm, mặc thử trái quy định chỉ được ướm, cắt tem/giặt đều bị từ chối đúng theo snapshot thử nghiệm.
- Size từ engine được giữ đúng M; không tự nâng L vì khách thích rộng. Khách chủ động giữ L sau khi sửa số đo thì giỏ vẫn L, state mới được ghi đúng.
- Giỏ đổi size/số lượng, quote, ưu đãi và checkout hoạt động đúng trong các lượt đã quan sát. Tổng hai áo 978.100đ khớp; ca hỗ trợ ship tổng 499k khớp. Các câu báo thao tác đã có receipt.
- Cần Thơ: lần này tra ETA rồi trả 4–8 ngày và không nhận giao sáng mai; không handoff sớm khi chưa đọc như vòng trước.
- Khách xin bớt: dùng ngay hỗ trợ ship 30k đang áp dụng, không bỏ quyền lợi để chỉ mời mua thêm.
- Discovery hoàn thành search và batch đọc hai ứng viên trong ngân sách, thay vì chỉ đọc mẫu vượt ngân sách rồi handoff. Đây là tiến bộ ở đường tool; chất lượng final reply là đánh giá riêng.

## Những finding còn tồn tại

### 1. SQ223: câu hỏi đơn giản thất bại vì owner thêm chi tiết sai phạm vi

Khách chỉ hỏi mẫu còn không và giá. Draft trả đúng giá nhưng thêm:

> Chất liệu vải thô đục lỗ in họa tiết hoa, thiết kế 1 lớp form gọn gàng…

Nguồn phân biệt **áo một lớp, quần hai lớp**. Draft đặt chi tiết một lớp ở cấp set, không giới hạn ở áo. Verifier chặn SUBJECT_MISMATCH có căn cứ khi đọc cả bullet, không phải bắt keyword.

Chuỗi lỗi quan sát được: đọc đủ nguồn → thêm thông tin không cần cho yêu cầu → làm mất phạm vi áo/quần → verifier chặn → B1 trả “Phần này em chưa trả lời được, chị nhé.” Khách mất cả câu trả lời giá/tồn dù các dữ kiện đó đã có.

Đây chủ yếu là lỗi chọn và tổng hợp thông tin của owner. Thêm nguồn chung không giải quyết được dữ liệu vốn đã có. B1 không có persisted handoff, nên chưa thể lấy fallback của B1 làm hành vi của mọi đường runtime. Không sửa bằng cách cho phép claim sai hoặc thêm regex cho mã SQ223.

### 2. Discovery: đọc được hai món nhưng vẫn giao quyết định lại cho khách

Khách cần bộ đi làm dưới một triệu, ngại bó bụng. Reply mở:

> Em gợi ý chị 2 mẫu set quần đi làm dưới 1 triệu, thiết kế thoải mái không lo bó bụng ạ…

Sau đó là danh sách tên/mã/giá/chất liệu/size cho cả hai, cuối đoạn hỏi khách ưng mẫu nào.

Điểm yếu bán hàng: phần mô tả dài nhưng chưa so sánh điểm quyết định theo nhu cầu, chưa dẫn tới một lựa chọn rõ. SQ748 là quần short; không tự kết luận short không được đi làm, nhưng sự phù hợp với hoàn cảnh chưa được giải thích.

Điểm nghĩa cần xem riêng: SQ748 có lưng chun/phom suông; SQ2447 chỉ có mô tả dễ mặc/phù hợp nhiều vóc dáng. Lời trấn an đầu đoạn gộp cho cả hai. Cuối reply vẫn xin thông tin khách, nên không thể chỉ lấy SIZE_FIT=0 để kết luận đây là bảo đảm độ vừa cá nhân. Cũng không thể lấy verifier PASS làm bằng chứng câu đã ổn. Giữ REVIEW_REQUIRED_FIT_SCOPE trên exact draft/source; không tự nới/siết ranh giới trong review này.

### 3. Xử lý băn khoăn còn thiên về khen món hàng

Ở ca sợ ren nhiều/tiệc ban ngày, reply dùng:

> …rất sang và thanh nhã… không hề bị rườm rà hay nặng nề.

Ở biến thể khách quen đồ trơn, model đã nhận đúng phong cách nhưng nối tiếp nhiều ý tươi tắn, trang nhã, thanh thoát, không phồng, không cứng nhắc. Khách được trấn an nhiều hơn được giúp hình dung cách mặc.

Không phải mọi tính từ hoặc nhận xét thẩm mỹ đều sai. Điểm yếu là nhiều lời khen gần nghĩa chiếm chỗ của một hướng phối hay lý do quyết định cụ thể. Ca media-decision có hướng áo thêu + váy trơn và hai ảnh, nên hữu ích hơn phần chỉ khen; đầu reply vẫn dài và phủ nhận lo ngại hơi nhanh.

### 4. Khách nhờ chọn nhưng model chưa dứt khoát

Ca mua áo riêng hay cả bộ, khách muốn mặc lại nhiều lần và có sẵn váy đen: model dùng được lịch sử, giải thích áo lẻ dễ phối, rồi lại quảng bá cả set và mix-match. Chưa chọn rõ giúp khách.

Không bắt buộc chọn áo rẻ hơn: chọn cả bộ vẫn có thể bán hàng tốt nếu lý do phù hợp. Ca đổi sang gặp khách buổi sáng đã chọn cả bộ, giải thích tính đồng bộ và khoản thêm 300k; đây là lựa chọn dùng được, không đánh fail chỉ vì upsell.

### 5. Giọng còn hạn chế, nhưng không phải toàn bộ campaign đều máy móc

Các câu báo giá/tồn, ETA và thương lượng khá gọn. Phần tư vấn dài vẫn có giọng mô tả sản phẩm. “Chị lấy size M giúp em nhé ạ” hơi gượng; “em đã cập nhật lại số đo” vẫn là giọng báo cáo hệ thống.

Nhắc một dữ kiện khách để giải thích lựa chọn không tự là lỗi. Không có cơ sở biến mọi tham chiếu chiều cao/cân nặng thành lỗi liệt kê, hoặc ép bỏ mọi tính từ. Theo ưu tiên owner, giữ các điểm này là hạn chế nhẹ; không mở thêm vòng tối ưu giọng trên toàn prompt chỉ từ chúng.

### 6. Ảnh đã hoạt động, nhưng khả năng thuyết phục bằng feedback/màu chưa được chứng minh

Có 9 ảnh trong capture: 6 opening, 1 detail/size, 2 advice. Đã dùng ảnh chi tiết thêu ở ca hỏi size và ảnh mẫu ở ca tư vấn ren.

Ba yêu cầu feedback và một yêu cầu ảnh đúng màu be thiếu verified evidence trong phạm vi nguồn kiểm được, nên handoff đúng. Không suy ra shop thật không có các ảnh đó: upstream registry/approval/version vẫn chưa được xác minh đầy đủ. Review dựa vào metadata và captured delivery, không khẳng định đã xem và đánh giá nội dung hình ảnh.

Bốn gap này là hạn chế về khả năng phục vụ tự động từ nguồn hiện hành. Cách khắc phục nằm ở binding/nguồn media đã duyệt hoặc bàn giao, không phải yêu cầu owner gọi ảnh chung là feedback.

## Handoff và trải nghiệm thực tế

Cả chín handoff có commit HUMAN/event/tag, không gửi text/ảnh theo quy tắc owner. Ba POS cases là fault injection có chủ đích, không phải ba lỗi provider hay chứng cứ POS thật thiếu dữ liệu. Hai handoff nghiệp vụ là xác nhận mua và yêu cầu người xử lý.

Hai lượt sau handoff im lặng đúng ownership. Hai lượt checkout NO_SEND có câu hỏi/preview do code tạo, nên không chấm là bot bỏ mặc khách.

Tuy nhiên campaign chỉ chứng minh đã bàn giao/tag trong môi trường capture. Chưa đo thời gian người tiếp nhận phản hồi, chưa chứng minh xử lý sau bàn giao hoàn tất. Đây là phần ảnh hưởng trải nghiệm còn chưa được kiểm, không khắc phục bằng câu bảo khách chờ hoặc nhắc tới bot/nhân viên.

## Root cause: kết luận được tới đâu

| Phần | Bằng chứng | Kết luận có thể dùng |
|---|---|---|
| Owner chọn/tổng hợp thông tin | SQ223 có nguồn đúng nhưng final gộp sai; concern đọc đúng mô tả nhưng diễn giải thành lời khen | Đây là khâu yếu còn thấy trực tiếp; không phải cứ thêm context là đủ |
| Prompt | Đã yêu cầu chọn hướng mua, không khen phủ nhận lo ngại, không chép mô tả thay tư vấn | Không có căn cứ chỉ thêm lại các yêu cầu đã có sẽ tạo khác biệt |
| Nguồn ảnh | Thiếu evidence được xác nhận cho feedback/màu trong source scope | Phải xử lý nguồn/binding hoặc handoff; không giả ảnh/metadata |
| Verifier | Chặn đúng SQ223; discovery PASS có phạm vi nghĩa cần xem | Chưa có căn cứ nói verifier chỉ dùng keyword hoặc cần nới toàn bộ |
| Code/harness | Không qualification/accounting error; B1 chỉ có static fallback, persisted paths có handoff | Phân biệt hạn chế surface thử nghiệm với hành vi runtime; không dùng một fallback để suy ra mọi luồng đều mất bàn giao |
| Dữ liệu đánh giá | Mỗi case N1; controls chủ yếu media; chưa có khách mua thật | Chưa chứng minh độ ổn định, coverage toàn commerce hay hiệu quả chuyển đổi |

Nguồn mô tả giàu lời quảng bá và final lặp lại ngôn ngữ đó là dấu hiệu cần kiểm ở cách chọn/trình bày dữ liệu. Chưa phải thí nghiệm chứng minh đây là nguyên nhân duy nhất. Không biết suy nghĩ nội bộ của model; không gán lỗi cho “không hiểu tiếng Việt” từ kết quả này.

## So với vòng trước

Cùng 51 case IDs: trước 36 eligible/10 handoff/5 NO_SEND; nay 37 eligible/9 handoff/4 NO_SEND/1 fallback.

Các thay đổi đáng kể: discovery đi hết đường đọc và ETA được trả lời; controlled POS-v3 có handoff hợp lệ thay cho attempt unavailable; SQ223 ngược lại từ PASS thành fallback vì draft lần này sai. Hỗ trợ ship hiện tại được nêu rõ hơn.

Source/prompt/snapshot/thời điểm thay đổi và mỗi case chỉ N1: không quy toàn bộ chênh lệch cho một patch hoặc coi +1 eligible là điểm bán hàng tăng ổn định.

## Vận hành và giới hạn

141 generation requests: 86 owner +38 native verifier +17 control verifier; retry 0, generation/provider errors 0.

Verifier provider p50 8.029s/p95 18.033s. Verification kèm readback p50 10.874s/p95 18.790s. Driver slot p50 27.281s/p95 59.659s, gồm nhiều kiểu đường chạy; không phải latency live hoặc phép so tốc độ thuần giữa models. Độ trễ verification vẫn là chi phí trải nghiệm cần lưu ý dù không có timeout.

Input 969,446 tokens; output 87,511 tokens, trong đó thinking 80,795 đã được tính trong output. Provider không expose cost. Không có bằng chứng leak evaluator labels trong các wire checks đã thực hiện. Sáu database test đều được dọn.

## Ưu tiên tiếp theo đề xuất

1. Sửa nguyên nhân owner nói thừa và mất phạm vi bộ phận; kiểm trên nhóm giá/tồn có cấu tạo áo/quần khác nhau, không thêm rule riêng cho SQ223.
2. Đánh giá riêng khả năng chọn món và hướng phối trên final reply. Xem dữ liệu mô tả đang đưa vào, không mặc định thiếu dữ kiện hoặc tiếp tục nhồi chỉ dẫn giọng vốn đã có.
3. Đóng phạm vi câu discovery trên exact nguồn/reply; giữ phân biệt nhận xét thiết kế với bảo đảm độ vừa của chính khách.
4. Hoàn thiện evidence ảnh ở nguồn có thẩm quyền. Giữ silent handoff cho thiếu dữ liệu shop theo yêu cầu owner; kiểm riêng việc tiếp nhận sau handoff.
5. Giữ các hạn chế giọng nhẹ đã chấp nhận. Chưa đề xuất rewrite toàn prompt, tăng vai model, regex tư vấn, repair/reverify hoặc nhiều run chỉ để lấy kết quả đẹp.

**B chưa GO theo evidence hiện có.** Đây là review và đề xuất ưu tiên; chưa thực hiện sửa/rerun mới.

## Coverage từng native outcome

Bảng này đối chiếu nhận xét từng lượt trong whole-turn evidence; các nhãn không cộng thành tỷ lệ sales PASS.

| # | Case | Terminal | Nhận xét |
|---:|---|---|---|
| 1 | `opening-ad` | SEND_ELIGIBLE | Đúng mẫu từ quảng cáo, trả giá799k/chất liệu/size và actual2ảnh; không đòi khách chọn loại ảnh. |
| 2 | `opening-ad-repeat` | SEND_ELIGIBLE | Đáp lại đúng giá799k, không lặp form hoặc gửi ảnh lại; có history actual lượt trước. |
| 3 | `opening-organic` | SEND_ELIGIBLE | Nhận đúng mãSV2447, báo799k và thông tin mở đầu; actual2ảnh cùng mẫu. |
| 4 | `opening-unresolved` | SEND_ELIGIBLE | Chưa xác định được mẫu thì xin hình/tên, không mượn giá gợi ý gần nghĩa. |
| 5 | `opening-multipart` | SEND_ELIGIBLE | Trả đủ cảset799k và áo499k, xác nhận mua lẻ, actual2ảnh; mô tả hơi rộng nhưng không bỏ câu hỏi. |
| 6 | `media-overview-next:ask` | HANDOFF | Thiếu verified feedback trong phạm vi nguồn; commitHUMAN/event/tag,0text/ảnh theo silent handoff. |
| 7 | `media-overview-next:continue` | NO_SEND | Lượt trước đãHUMAN; không tự lấy lại quyền dù câu mới xin ảnh chung. |
| 8 | `media-detail-next:ask` | HANDOFF | Thiếu verified feedback; handoff im lặng có event/tag, không thay bằng ảnh catalog. |
| 9 | `media-detail-next:continue` | NO_SEND | Sau handoff không có model generation hoặc tin mới từ bot, đúng ownership. |
| 10 | `media-and-price:ask` | HANDOFF | Khách cần feedback và giá; thiếu evidence ảnh thì handoff im lặng, không dùng giá đã biết để giả hoàn tất. |
| 11 | `media-and-size:ask` | SEND_ELIGIBLE | SizeM từ engine với chiều cao/cân nặng, actual1ảnh detail áo; không thêm size ngoài kết quả. Giọng giúp em hơi gượng nhưng dùng được. |
| 12 | `media-decision:ask` | SEND_ELIGIBLE | Có hướng phối áo lẻ với đồ trơn và2ảnh minh họa, không tự tạo phụ thuộc ảnh. Đầu đoạn vẫn phủ nhận băn khoăn bằng chuỗi tính từ; giữ hạn chế nhẹ. |
| 13 | `b1-partial-source` | HANDOFF | ControlledPOS_UNAVAILABLE: handoff PRICE_UNAVAILABLE, không giả giá/tồn hoặc gửi partial reply; không phải chứng cứ POS thật thiếu. |
| 14 | `b1-partial-source-v2` | HANDOFF | ControlledPOS fault khi hỏi chân váy: handoff cócommit, không dùng mô tả thay giá/tồn; khônggenerationerror. |
| 15 | `b1-partial-source-v3` | HANDOFF | ControlledPOS fault: handoff đúng thay vì lost envelope như vòng trước; currentattempt không có OWNER_TOOL_OUTPUT nên không quy riêng cải thiện này cho counterfix. |
| 16 | `b1-changed-occasion` | SEND_ELIGIBLE | Đề xuất Thanh Vũ theo băn khoăn về nếp nhăn. Đã đối chiếu nguồn có áo ren cotton và váy crep hai lớp. Nhận xét so sánh là lời tư vấn theo phạm vi owner cho phép, không phải kết quả kiểm nghiệm. |
| 17 | `b1-current-policy` | SEND_ELIGIBLE | Dùng thời hạn 15 ngày và phí 30k hiện hành, thay thông tin 7 ngày trong lịch sử; trả đúng phần khách hỏi. |
| 18 | `b1-price` | SEND_ELIGIBLE | Giá, chất liệu và size đúng; mở thêm giá mua lẻ khi khách chỉ hỏi cả set. Giữ là hạn chế lựa chọn thông tin, không phải lỗi an toàn. |
| 19 | `b1-component-stock` | SEND_ELIGIBLE | Trả đúng áo lẻ size M còn hàng, giá 499k; không nhầm giá cả set hoặc tự tư vấn lại size. |
| 20 | `b1-search-read` | SEND_ELIGIBLE | Tìm đúng mã SD375, hai cách bán 929k/1.065k và các size có sẵn; không dùng giá sản phẩm gần nghĩa. |
| 21 | `b1-buying-concern` | SEND_ELIGIBLE | Hiểu hoàn cảnh tiệc ngày và ngân sách, nhưng chủ yếu khen mềm/rũ rồi phủ nhận lo ngại rườm rà. Sức thuyết phục còn hạn chế; không mở lại hard gate về giọng. |
| 22 | `b1-policy-used` | SEND_ELIGIBLE | Từ chối đúng vì khách đã mặc đi làm. Đoạn phí trong ngoặc dài và thừa; giữ là hạn chế nhẹ về diễn đạt. |
| 23 | `b1-changed-occasion-v2` | SEND_ELIGIBLE | Dùng hoàn cảnh mới ở sân vườn, trả lời bằng nhận xét cảm giác từ chất liệu mềm/thoáng. Không thêm cấu tạo hoặc kết quả thử nghiệm. |
| 24 | `b1-current-policy-v2` | SEND_ELIGIBLE | Trả thời hạn 15 ngày và phí 30k hiện hành, không dùng mức 25k cũ trong lịch sử hoặc đọc lại cả chính sách. |
| 25 | `b1-price-v2` | SEND_ELIGIBLE | Báo đúng cả set 799k, chất liệu/form và size, không bỏ phần giá hoặc hỏi lại mẫu đã rõ. |
| 26 | `b1-component-stock-v2` | SEND_ELIGIBLE | Trả thẳng hai ý: chân váy size M còn hàng và giá mua lẻ 449k. |
| 27 | `b1-search-read-v2` | SEND_ELIGIBLE | Tìm đúng Khánh Trang, báo 999k và size sẵn có; không chuyển sang Thạch Thảo. |
| 28 | `b1-buying-concern-v2` | SEND_ELIGIBLE | Nhận ra khách quen đồ trơn và kết luận nên lấy set. Tuy nhiên, giải thích dài, nhiều lời khen và thiếu hướng mặc cụ thể; giữ hạn chế đã được tạm chấp nhận. |
| 29 | `b1-policy-used-v2` | SEND_ELIGIBLE | Đối chiếu việc đã mặc thử với quy định chỉ được ướm và từ chối đúng. Không cấp quyền đổi chỉ vì hàng còn tem và chưa mặc ra ngoài. |
| 30 | `b1-changed-occasion-v3` | SEND_ELIGIBLE | Chọn cả bộ theo hoàn cảnh gặp khách buổi sáng, giải thích tính đồng bộ và khoản thêm 300k. Không lạc sang tiệc tối; không coi upsell tự là lỗi. |
| 31 | `b1-current-policy-v3` | SEND_ELIGIBLE | Dùng thời hạn 15 ngày thay thông tin 7 ngày cũ, trả đúng trường hợp nhận 9 ngày và chỉ mở xem. Không giả định khách có vi phạm chưa nêu. |
| 32 | `b1-price-v3` | SEND_ELIGIBLE | Báo đúng cả set 799k, form và size trong phạm vi tư vấn chỉ đọc dữ liệu. |
| 33 | `b1-component-stock-v3` | SEND_ELIGIBLE | Đúng áo lẻ size M còn hàng, giá 499k. Có mô tả thêm nhưng không thay lựa chọn hoặc bịa tồn. |
| 34 | `b1-search-read-v3` | FALLBACK | Verifier chặn việc mở rộng áo một lớp thành thiết kế một lớp của cả set SQ223, trong khi nguồn ghi quần hai lớp. Khách nhận fallback dù giá và tồn đã có; owner gắn sai phạm vi chi tiết bổ sung. |
| 35 | `b1-buying-concern-v3` | SEND_ELIGIBLE | Dùng thông tin chân váy đen khách có nhưng mở đầu bằng ngân sách rồi giữ cả hai hướng mua; chưa chọn rõ giúp khách. Giữ hạn chế quyết định/độ dài, không bắt buộc chỉ chọn áo. |
| 36 | `b1-policy-used-v3` | SEND_ELIGIBLE | Từ chối đúng hàng đã cắt tem và giặt dù chưa mặc ra ngoài; không đồng ý trước rồi gắn điều kiện. |
| 37 | `sales-discovery-advice:need` | SEND_ELIGIBLE | Đã search và batch đọc SQ748/SQ2447 dưới một triệu trong round cuối. Reply được PASS nhưng vẫn gộp lời trấn an không lo bó bụng khi không có SIZE_FIT. Cần xem đúng phạm vi tư vấn thiết kế và độ vừa cá nhân trên exact draft/source; không claim zero native false PASS hoặc verifier variance. Reply còn dài và chưa chọn rõ một hướng. |
| 38 | `sales-product-gallery:overview` | HANDOFF | Nguồn đã kiểm chưa có evidence ảnh đúng màu be. Có commit handoff, không bỏ yêu cầu màu để gửi ảnh chung. |
| 39 | `sales-size-advice:height-weight` | SEND_ELIGIBLE | Engine chọn M đã tính sở thích mặc rộng; owner giữ M, không tự thêm L hoặc đọc lại các số đo cụ thể. |
| 40 | `sales-southern-delivery:deadline` | SEND_ELIGIBLE | Đã gọi read_product với vùng Cần Thơ trước final. ETA 4–8 ngày đến từ nguồn; shop không nhận hẹn sáng mai. Không handoff khi chưa đọc như vòng trước. |
| 41 | `stateful-open` | SEND_ELIGIBLE | Khách yêu cầu mua; có receipt thêm áo be size M vào giỏ và báo hàng đặt trước. Không tuyên bố đã tạo đơn hoặc bảo đảm độ vừa. |
| 42 | `stateful-variant-quantity` | SEND_ELIGIBLE | Có receipt đổi đúng size L và số lượng hai chiếc, không tự đổi màu hay mẫu. |
| 43 | `stateful-quote` | SEND_ELIGIBLE | Tổng 978.100đ khớp quote hiện hành của hai áo, gồm ship và ưu đãi; không tự tính số khác. |
| 44 | `stateful-correction` | SEND_ELIGIBLE | State nhận eo 74/mông 96 và giữ giỏ size L đúng; không đọc lại các số đo. Câu đã cập nhật lại số đo vẫn mang giọng báo cáo hệ thống, là hạn chế nhẹ chưa chữa. |
| 45 | `stateful-request-checkout` | NO_SEND | NO_SEND của model path nhưng capture có câu hỏi một field do code gửi; không phải bot im lặng khi thiếu thông tin khách. |
| 46 | `stateful-private-checkout` | NO_SEND | Code xử lý intake/preview, actual owner/verifier đều 0. Tổng 978.100đ và hàng đặt trước đúng; input/capture riêng đã được che, không chấm placeholder là lỗi giọng. |
| 47 | `stateful-confirm` | HANDOFF | Xác nhận mua tạo HUMAN/event/tag và handoff im lặng theo quy tắc; không tuyên bố đơn POS hoặc thanh toán thật đã hoàn tất. |
| 48 | `stateful-human-request` | HANDOFF | Khách xin người xử lý; có commit HUMAN/event/tag và không kèm tin bot. |
| 49 | `negotiation-cart-setup` | SEND_ELIGIBLE | Có giỏ áo be size M thật trong database test và receipt, báo hàng đặt trước; không dựng cart từ kết quả giả để chấm thương lượng. |
| 50 | `negotiation-price-objection` | SEND_ELIGIBLE | Dùng ngay hỗ trợ ship 30k đã áp dụng để trả lời xin bớt; không bỏ qua để chỉ mời mua thêm hoặc nói vừa giảm thêm lần nữa. |
| 51 | `negotiation-total-control` | SEND_ELIGIBLE | Tổng 499k khớp quote: áo 499k + ship 30k − hỗ trợ 30k; không nhân đôi ưu đãi. |

## Nguồn đối chiếu

- [51 hội thoại và actual outcomes](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/CONVERSATIONS.md).
- [Terminal ledger](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/ACTUAL_TERMINALS.json).
- [Whole-turn review từng lượt](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/WHOLE_TURN_REVIEW.json).
- [Draft bị chặn và PASS cần xem](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/FAILURES.md).
- [Discovery draft/source/verdict](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/FIT_SCOPE_REVIEW_REQUIRED.json).
- [Đối chiếu vòng trước](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/PRIOR_COMPARISON.json).
- [Request/latency/accounting](../../apps/worker/evals/single-agent-commerce-read-only/recovery-discovery-run-20261027/REVIEW_METRICS.json).
- [Owner prompt hiện hành](../../apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt).

Các kiểm tra mới của task review: đọc và đối chiếu 51 unique IDs, đếm controls 8 SAFE/8 UNSAFE/1 unlabeled, so terminal từng case với vòng trước, đọc actual text/source ở các ca nêu trên. Không chạy provider, worker tests/build/typecheck/lint trong task review offline này.

