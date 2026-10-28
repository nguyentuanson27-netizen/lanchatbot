# Review toàn bộ 93 kết quả — 2026-10-18

Review trên HEAD e54961fb4344c86b2b5f75bb5e2c0e03fa77d916. Chỉ đọc evidence, prompt, source projection và code; không gọi provider, không sửa runtime/prompt, không chấm lại bằng model khác. Đây là nhận định review mới, không ghi đè điểm/verdict đã freeze.

Nguồn: [31 lượt đầu](../bounded-source-run-20261018/PRIMARY_REVIEW.json), [62 lượt tiếp](PRIMARY_REVIEW.json), [so sánh và accounting](COMPARISON.json), [trace chẩn đoán](DIAGNOSIS.json), [trace lượt đầu](../bounded-source-run-20261018/DIAGNOSIS.json), [toàn văn 62 lượt](CONVERSATIONS.md). Đã đọc toàn bộ actual text, customer/history, các public context khác nhau và đối chiếu trace lỗi. Nháp bị chặn chỉ dùng chẩn đoán, không thay câu khách thực sự nhận.

## Kết luận có thể tin

93 là 31 ca × 3 quan sát, không phải 93 tình huống độc lập. B1 có 72 lượt; stateful có 21 lượt, trong đó các bước sau dùng state/history thực sự của bước trước. Executable/prompt/config hashes giống nhau nhưng identity/thời điểm/snapshot không hoàn toàn giống. Không lấy chênh lệch điểm để suy ra một thay đổi prompt có tác dụng.

| Kết quả thực tế | Số lượt |
| --- | ---: |
| SEND_ELIGIBLE | 79 |
| FALLBACK do verifier FAIL | 3 |
| FALLBACK do owner gọi tool khi hết budget | 1 |
| FALLBACK do completion provider không hợp lệ | 1 |
| HANDOFF do checkout dependency | 3 |
| NO_SEND sau handoff đó | 3 |
| HANDOFF đúng yêu cầu gặp nhân viên | 3 |
| Tổng | 93 |

Có 82 lần verifier: 79 PASS, 3 FAIL, không error/timeout. Hai fallback còn lại xảy ra trước khi có final draft. Không thể quy cả 5 fallback cho verifier. Sáu terminal checkout/confirm không thành công bắt nguồn từ cùng một dependency lặp ở ba hành trình, không phải sáu lỗi model độc lập.

27/27 lượt hỏi giá/tồn/tìm mẫu trả đúng phần hàng và số tiền trong nguồn. 9/9 lượt về hàng đã dùng đều từ chối đúng tình huống bị loại trừ: đi làm, mặc thử trong phòng, cắt tem/giặt. 8/9 lượt hỏi thời hạn/phí có trả lời; một lượt lỗi completion. Nhận định trước về một câu policy unsafe được sửa ở dưới.

Điểm lịch sử 64 USABLE / 17 NEEDS_EDIT / 1 UNUSABLE / 11 unfinished được giữ làm lịch sử, không dùng như tỷ lệ thành công bán hàng: có ba control chuyển ownership; NEEDS_EDIT trộn sửa giọng với sửa nội dung; UNUSABLE policy chưa có căn cứ đủ mạnh; chốt đơn thực tế vẫn không đi hết.

## Đối chiếu đủ 31 ca, mỗi ca ba lượt

E = send-eligible, F = fallback, H = handoff, N = no-send. Đây là terminal, không phải điểm chất lượng. R1/R2/R3 tương ứng ba quan sát, không phải round A.

| Ca | R1/R2/R3 | Nhận xét cả đoạn và diễn biến |
| --- | --- | --- |
| stateful-open | E/E/F | Hai lượt thêm đúng AO/BE/M và báo preorder. R1 nói “Chị đã thêm…”, giống UI và lẫn người làm. R3 bỏ màu trong args, giỏ chưa được thêm. |
| stateful-variant-quantity | E/E/E | Cả ba cuối lượt đều đúng BE/L ×2. R1 “cập nhật số lượng” khô; R3 tạo đúng giỏ sau lượt trước thất bại, không phải đã sửa được một giỏ tồn tại. |
| stateful-quote | E/E/E | Tổng 978.100đ đúng quote; không lỗi cộng tiền, dù cách trình bày khác. |
| stateful-correction | E/E/E | Profile sửa đúng, giữ L. Nhắc 74/96 ở R3 để xác nhận sửa là hợp lý; không tự coi nhắc số đo là lỗi. R1 vẫn hơi giọng giỏ hàng. |
| stateful-private-checkout | H/H/H | CART_ETA_REGION_UNRESOLVED, không có model generation. Không hoàn tất preview/checkout. |
| stateful-confirm | N/N/N | Sau chuyển HUMAN, guard không cho bot tiếp tục. Đây là hệ quả dependency, guard đúng. |
| stateful-human-request | H/H/H | Chuyển ownership đúng yêu cầu; không chứng minh nhân viên đã hỗ trợ hay đơn hoàn tất. |
| b1-changed-occasion | F/E/F | Nguy cơ dưới đèn và lớp mặc trong thuộc ranh giới tư vấn đã duyệt; R1/R3 thêm lời trấn an tuyệt đối. Chưa đủ dữ liệu quy từng FAIL cho đúng một cụm hoặc kết luận verifier ngẫu nhiên. R2 “thấu quang” vẫn xa lời chat thường. |
| b1-search-read | E/E/E | SD375 đúng áo 929k / set 1.065k. Hai lựa chọn dạng danh sách là hợp lý cho câu hỏi giá. |
| b1-buying-concern | E/E/E | R1/R2 nhiều mỹ từ và đề nghị chọn size trong B1 không có tool fit. R3 có lựa chọn tiết chế ren; hữu ích hơn nhưng còn dài. |
| b1-changed-occasion-v2 | E/E/E | Cảm giác thoáng/dễ chịu từ nguồn được phép. R1 lời khuyên ô/bóng râm hơi ngoài việc mua; R3 lặp ý. Không có căn cứ gắn nhãn sai tính năng chỉ vì nói tự tin. |
| b1-partial-source-v2 | E/F/E | R1 trả chất liệu/dáng nhưng giọng hệ thống. R2 tự thêm “hiện bán nguyên set” khi offers chưa biết. R3 tự giải thích thiếu giá lẻ bằng “thiết kế theo set”. Cần sửa suy diễn thương mại, không chỉ giọng. |
| b1-buying-concern-v2 | E/E/E | Cả ba đều nhận ra khách ngại điệu, gợi áo riêng rồi lại khen cả set; chưa giữ một lời khuyên rõ. Không phải lỗi vì bán thêm hoặc vì chọn set. |
| b1-current-policy | E/E/E | Hiểu câu hỏi còn kịp: 10 ngày trong hạn 15, phí 30k. Không cần tự xét mọi tình trạng hàng. |
| b1-partial-source | E/E/E | Có câu trả lời chất liệu; giá/tồn thiếu thật. Cụm lỗi kết nối và mỹ từ làm chất lượng giảm, không phải bịa giá hoặc mất hoàn toàn context. |
| b1-price | E/E/E | Giá set/áo/váy đúng; có thể gọn hơn, không coi danh sách ba lựa chọn là liệt kê vô ích. |
| b1-component-stock | E/E/E | AO/M còn, 499k đúng; đây không phải khẳng định M vừa khách. |
| b1-policy-used | E/E/E | Đều từ chối đúng vì đã mặc đi làm. R2 thêm bên trả phí mà snapshot không ghi riêng; cần làm rõ nguồn, chưa kết luận chắc đó là false PASS. R1/R3 không trả rõ bên trả nhưng việc đổi đã bị loại trừ. |
| b1-current-policy-v2 | E/E/E | Hạn 15 ngày/phí 30k đúng. R3 không nên bị coi là UNSAFE chỉ vì nhắc tem/chưa dùng mà không kể đủ checklist; xem đính chính dưới. |
| b1-price-v2 | E/E/E | Giá cả bộ 799k đúng và gọn. |
| b1-component-stock-v2 | E/E/E | CV/M còn, 449k đúng. |
| b1-search-read-v2 | E/E/E | Khánh Trang 999k/set, 499k/món theo nguồn. Không “sửa” giá set thành 998k bằng tự cộng. |
| b1-policy-used-v2 | E/E/E | Mặc vào người khác ướm bên ngoài: cả ba từ chối đúng HOLD_UP_ONLY. |
| b1-changed-occasion-v3 | E/E/E | R1/R2 chọn áo riêng theo mong muốn gọn. R3 chọn set vì đồng bộ/tiện, chưa giải quyết rõ ưu tiên gọn mới; cần sửa lý do quyết định, không bắt buộc mọi đáp án chọn áo. |
| b1-current-policy-v3 | E/E/F | Hai reply thời hạn đúng; R3 HTTP200 nhưng OWNER_FINISH_REASON/UNKNOWN, không phải hiểu sai policy. |
| b1-partial-source-v3 | E/E/E | Chất liệu đúng; R1 câu hỏi hỗ trợ chung thừa; R2 giọng hệ thống; R3 đổi xưng hô và xin size không khôi phục được nguồn. |
| b1-price-v3 | E/E/E | 799k đúng; R3 so với mua đủ áo+váy lẻ là phép so đúng phần hàng. |
| b1-component-stock-v3 | E/E/E | Bán riêng AO/M, 499k đúng. |
| b1-search-read-v3 | E/E/E | SQ223/set699k, lẻ429k đúng. Hỏi lựa chọn size/màu không tự là hứa chọn size vừa. |
| b1-buying-concern-v3 | E/E/E | Upsell set799k có lý do thêm cách phối và vẫn dùng váy đen sẵn có; chấp nhận. Văn hơi quảng cáo, “giúp em” không cần; không biến thành lỗi chọn món. |
| b1-policy-used-v3 | E/E/E | Đã cắt tem/giặt: cả ba từ chối đúng, không kể checklist không liên quan. |

## Root cause và mức chắc chắn

### 1. Một dependency code/source đang chặn cả đường mua

Đã xác nhận: private checkout nhận địa chỉ TP Hồ Chí Minh; resolver trong realtime-sales-catalog.ts chỉ tìm tên key vùng nằm trong địa chỉ, hoặc default có sẵn. Nguồn có MIEN-NAM và thời gian vận chuyển; địa chỉ không chứa key đó. Không có bước ánh xạ địa chỉ sang vùng của shop trong đường chạy này.

Đây không phải thiếu toàn bộ dữ liệu giao hàng. [Source readback trước đó](../customer-outcome-fix-20261017/SHIPPING_SOURCE.md) có REGION/transit/enabled nhưng không có bảng tỉnh-thành/alias. Ba lần chạy model tiếp không thể sửa dependency này. Không đổi địa chỉ fixture thành MIEN-NAM để lấy PASS.

Sửa đề xuất, cập nhật sau xác nhận owner: mọi địa chỉ thuộc miền Nam dùng chung thời gian vận chuyển của vùng miền Nam. Không cần hỏi thêm thời gian riêng từng tỉnh miền Nam. Phần triển khai còn lại là nhận diện tỉnh/thành từ địa chỉ hoặc dữ liệu checkout có cấu trúc, ánh xạ các địa chỉ miền Nam vào key MIEN-NAM hiện có rồi lấy thời gian từ nguồn. TP Hồ Chí Minh thuộc nhánh này; không bắt khách viết key MIEN-NAM trong địa chỉ. Tái sử dụng dữ liệu địa danh hiện có nếu phù hợp; không dùng model xử lý PII hoặc regex riêng cho ca test. Giữ chặn vùng không xác định/ETA hết hạn. Transit chung không thay thời gian chuẩn bị hàng, nhất là preorder, và không thành lời hứa giao đúng một ngày. Test địa chỉ thông thường ở nhiều tỉnh miền Nam, địa chỉ ngoài miền Nam và địa chỉ chưa rõ; kiểm preview, xác nhận và ownership tiếp theo. Đây là cập nhật yêu cầu, chưa phải code đã được nối hay checkout đã PASS.

### 2. Owner có đủ lựa chọn nhưng truyền thiếu argument

Đã xác nhận R3 stateful-open: khách nói be; owner gọi apply_customer_state + read_product, rồi add_to_cart với color:null. Tool trả CART_VARIANT_AMBIGUOUS. Lượt cuối sửa thành BE nhưng request đã tools=[]/NONE; runtime từ chối. Vì vậy tăng budget chỉ che lỗi bỏ màu và bước đọc không cần thiết.

Prompt và tool description hiện đã nói giữ màu, thêm trực tiếp, không cần read_product. Không được gọi việc chép thêm đúng câu ấy là root fix. Schema cũng đã required color nhưng cho null: schema đảm bảo có field, không chứng minh owner hiểu giá trị.

Sửa đề xuất: hợp nhất hướng dẫn thao tác đang trùng ở prompt/tool thành một chỉ dẫn rõ tại tool dùng mua; phân biệt lựa chọn đã có với phần chưa biết. Bỏ đoạn thao tác trùng trong prompt để tránh hai nơi duy trì. Giữ read_product cho câu hỏi thật sự cần đọc, không thêm router tự suy ý khách hoặc regex lấy màu. Đo trực tiếp args và thứ tự tool trên các ca đã chọn màu/đổi màu/chưa chọn màu. Đây là giả thuyết cải thiện tuân thủ, chưa có bằng chứng bảo đảm sửa được lỗi model. Nếu vẫn mất field khi context đầy đủ, ghi là reliability của owner; không chữa bằng chọn màu mặc định hoặc retry kín.

### 3. Context sản phẩm giống quảng cáo; owner dùng nó thay việc tư vấn

Đã thấy: nguồn SV2447 là đoạn dài “nữ tính, bay bổng, tinh tế, sang trọng…”; attributes/presentation null. Reply concern lặp đúng chuỗi ý này. Cả ba concern-v2 nhận ra đánh đổi nhưng quay lại khen cả hai phương án. Nguồn đã đủ để nói về áo thêu/váy ren/cách phối; không cần bịa thêm thuộc tính để tư vấn tốt hơn.

Sự giống nhau giữa nguồn và reply là bằng chứng sao chép cách diễn đạt; chưa chứng minh chỉ thay nguồn sẽ chữa toàn bộ. Prompt hiện đã yêu cầu lựa chọn nhất quán, không chép quảng cáo, đủ thì dừng. Tiếp tục thêm lời “tự nhiên/ngắn gọn/quyết đoán” khó tạo thông tin mới.

Sửa đề xuất: chuẩn bị mô tả trung tính ở nguồn sản phẩm hiện có: áo/váy dùng gì, form/chi tiết nào đã có căn cứ; bỏ mỹ từ lặp khỏi bản trình bày cho owner, giữ nguồn gốc và bản gốc để đối chiếu. Không nhét lựa chọn cho từng case vào dữ liệu, không tách một model làm người tóm tắt. Nếu chưa có field nguồn phù hợp, không viết parser cắt mỹ từ tự động. Thử phần trình bày nguồn riêng trước khi thay tiếp prompt, giữ model/verifier/case/rubric để biết thay đổi nào có tác dụng.

Giữ trọng tâm prompt là gỡ điều khách đang phân vân và đề xuất bước mua dùng được. Không thêm yêu cầu xuất intent/plan/checklist; exact final text vẫn là bề mặt owner.

### 4. Nguồn thiếu giá/tồn và lời giải thích sai đang bị gộp thành một lỗi

Cả 9 lượt partial đều có mô tả trong trusted và native tool result. Bản sửa locality đã bảo toàn dữ liệu: không còn lý do sửa tiếp theo giả thuyết “model không được nhận chất liệu”.

Có ba vấn đề khác nhau: nguồn bị cố ý làm unavailable trong fixture; lời nói về lỗi kỹ thuật khô; và suy ra “bán nguyên set/thiết kế theo set nên không có giá riêng”. Chỉ vấn đề thứ ba tự tạo lý do thương mại.

Sửa đề xuất: giữ ranh giới independent giữa biết mô tả, biết danh sách bán và biết giá/tồn trong projection hiện có. Không đổi null thành không bán. Rút phần reason máy khỏi owner view khi status đã nói đủ unavailable; log vẫn giữ reason để chẩn đoán. Không giấu trạng thái thiếu dữ liệu, không bịa bước báo lại. Thay thế hướng dẫn partial hiện có bằng việc trả thông tin liên quan đã biết và nói đúng phần chưa kiểm tra được; không bổ sung thêm ví dụ theo từng sản phẩm. Kiểm thử preservation cho full/partial; provider mới chứng minh giọng có tốt hơn.

Một reply trung thực về nguồn thiếu vẫn có thể dùng được dù chưa thể chốt bán. Không đánh nó ngang hàng lời bịa tồn hay mất nguyên câu trả lời.

### 5. Review trước cũng có lỗi, không nên chuyển lỗi review vào verifier

R3 b1-current-policy-v2 hỏi còn kịp và phí, reply trả đúng 15 ngày/30k, nhắc tem/chưa dùng. Không có việc khách đã giặt/làm bẩn, không nói “chỉ cần”, không báo hồ sơ đã được shop duyệt. Theo phạm vi hỏi và quyết định owner trước đây, không đủ căn cứ gắn UNUSABLE/factualActionSafety=0. Nhận định mới: chấp nhận nội dung thời hạn/phí, có thể bỏ câu cuối cho gọn; không coi đây là confirmed unsafe false PASS. Điểm lịch sử vẫn giữ nguyên kèm đính chính này.

R2 b1-policy-used nói khách chịu phí. Snapshot có tổng phí hai chiều nhưng không ghi rõ payer. Cần đối chiếu nghĩa nghiệp vụ/nguồn policy; không suy chỉ từ thiếu field rằng shop thực tế trả phí, cũng không khẳng định payer bằng thông lệ. Không mở rộng sửa cả policy verifier vì một câu chưa rõ nguồn.

Hai FAIL sân khấu cũng chưa chứng minh verifier sai ngẫu nhiên: draft khác nhau, có ranh giới lời trấn an so với bảo đảm độ kín. JSON chỉ có kind/ref, không chỉ ra câu bị chặn. Không khẳng định chắc model chặn một chữ. Giữ ranh giới đã duyệt: gợi áo trong và cảm giác tự tin được phép; bịa lớp lót/kiểm nghiệm hay hứa không thể lộ dưới đèn cần chặn. Không bắt mọi câu thêm “có thể/chưa chắc”.

Trước sửa verifier, review cố định exact draft/context theo ranh giới đó. Nếu cần đo độ nhất quán, chạy replay chẩn đoán tách riêng, mỗi draft là attempt đã đăng ký; không dùng majority để biến FAIL cũ thành PASS và không nối vòng sửa/reverify vào runtime.

### 6. Completion provider lỗi chưa có nguyên nhân sâu được chứng minh

Một HTTP200 có OWNER_FINISH_REASON, telemetry ghi UNKNOWN; parser yêu cầu STOP. Adapter quy các giá trị finish reason ngoài allowlist thành UNKNOWN. Hiện không đủ evidence để nói quota, provider outage, prompt dài hay SDK sai.

Sửa đề xuất: giữ mã kết thúc provider có cấu trúc, giới hạn độ dài/ký tự, không lưu free text/PII; giữ request accounting và fail-closed. Dùng fixture response để kiểm phân biệt finish reason/empty content/tool dưới NONE. Không tự động retry, không xử lý completion không hợp lệ như một FINAL an toàn.

## Thứ tự xử lý đề xuất

1. Chốt lại nhận định review trên evidence hiện tại; không sửa rộng policy hoặc cấm từ tự tin.
2. Xử lý checkout mapping trong code/source và kiểm luồng thực tế đến confirm. Đây là blocker chắc chắn, độc lập prompt.
3. Xử lý riêng độ chính xác args/tool; thêm telemetry finish reason tối thiểu. Test code không được dùng để tuyên bố model đã hiểu.
4. Thử context mô tả trung tính, rồi mới quyết có cần sửa thêm phần tư vấn. Không đồng thời đổi source + prompt + verifier + rubric rồi quy tiến bộ cho một thứ.
5. Chạy nhóm lỗi trước: concern-v1/v2, đổi dịp-v3, partial-v2/v3, sân khấu và toàn hành trình stateful theo thứ tự. Lặp ba lần các ca rủi ro; chỉ sau khi đạt tiêu chí đã chốt mới full bộ hiện có một lần. Các lượt repeat là evidence bổ sung, không sinh case mới vào corpus.
6. Giữ nhóm regression giá/tồn/tìm mẫu, policy loại trừ, xác nhận sửa số đo, upsell hợp lý. Không chỉ đo fallback: đo lý do mua có liên quan, quyết định rõ, giọng dùng được và bước tiếp thực hiện được. Chấm cả đoạn, không keyword/đếm điều kiện/ép chọn set hay áo.

Không thêm runtime role, semantic router, regex theo case, template trả lời, repair/reverify, framework mới. Chưa có fix hoặc provider result mới trong review này. Phase B vẫn chưa hoàn tất đường mua; không suy ra A PASS hay quyền chạy live.

## Review bổ sung giọng văn trên cả 93 lượt

Đọc lại actual text theo từng ca và cả ba quan sát. Có 79 reply owner được phép gửi, 5 câu fallback tĩnh và 9 lượt không có tin nhắn. Không lấy nháp bị chặn làm lời khách đã nhận; không chấm giọng của chín lượt im lặng như một câu tư vấn. Không có generation mới.

### Phân bố chất lượng giọng theo công việc

| Nhóm | Reply owner thực sự được phép gửi | Nhận xét |
| --- | ---: | --- |
| Giá, tồn, tìm mẫu | 27 | Phần lớn trực tiếp, dễ hiểu. Danh sách giá giúp so sánh là hợp lý; vài lời dẫn như “các mức giá theo lựa chọn mua” thừa. Không cần viết lại hàng loạt. |
| Chính sách | 17 | Nhìn chung gọn và trả đúng tình huống. Một số câu mở bằng quy định thay vì trả lời khách, hoặc nhắc lại lý do hai lần. Không sửa bằng cách thêm checklist. |
| Phân vân, chọn món | 9 | Cả nhóm còn rõ giọng quảng cáo; mức độ khác nhau. Có reply quyết định mua hợp lý nhưng lời dài; không đồng nhất giọng chưa tốt với quyết định sai. |
| Đổi dịp mặc | 7 | Một số lời khuyên rõ, nhưng có từ chuyên môn, so sánh trừu tượng và giải thích quá mức. Ca sáng gặp khách R1 là lời khuyên tương đối tốt, chỉ cần gọn hơn. |
| Nguồn thiếu một phần | 8 | Cả tám đều kể về hệ thống/nguồn trong câu khách đọc. Sáu có thể sửa chủ yếu cách nói; R3 partial-v2 còn suy diễn lý do, R3 partial-v3 còn hỏi size không giải quyết vấn đề. |
| Giỏ, báo tổng, sửa thông tin | 11 | Báo tổng thường tốt; xác nhận thao tác còn giọng thông báo phần mềm, đôi lúc lẫn chủ thể. Nhắc số đo vừa được sửa có ích, không nên cấm. |
| Tổng reply owner | 79 | Nhận xét định tính; không đặt thêm ngưỡng PASS hoặc thay điểm đã freeze. |

### Các lỗi giọng cụ thể

1. **Nói như nội dung giới thiệu sản phẩm.** Các chuỗi “bay bổng, sang trọng, dịu dàng, nhẹ nhàng” ít giúp khách phân biệt hai lựa chọn. “Tạo chuyển động uyển chuyển khi di chuyển” vừa lặp vừa giống catalog. Lỗi là cả đoạn thiếu giá trị quyết định, không phải cấm từng tính từ.

2. **Lập luận qua lại thay vì tư vấn.** Concern-v2 cả ba lần đi theo “hơi điệu → tuy nhiên rất hợp → nếu muốn thì áo riêng → còn cả set vẫn đẹp”. Các từ nối phản ánh việc chưa giữ một lựa chọn; chỉ xóa “tuy nhiên/còn nếu” sẽ không chữa được. Người bán vẫn có thể đưa hai phương án khi khách cần so sánh, nhưng phải nói mình khuyên phương án nào và vì sao.

3. **Kể thao tác nội bộ.** “Chị đã thêm… vào giỏ hàng”, “cập nhật số lượng”, “áo… đã sẵn sàng trong giỏ”, “tiến hành đặt hàng” khiến chat giống thông báo UI. R1 còn đặt khách làm chủ thể của thao tác shop. “Chị đã chọn…” ở R2 có thể hiểu là nhắc quyết định của khách, không tự là sai chủ thể; vẫn có cách xác nhận gần gũi hơn.

4. **Nhắc lại thông tin để trình bày đầy đủ, thay vì để giúp khách.** Ba concern-v1 và ba concern-v3 đều nhắc lại mức ngân sách cụ thể. Giá sản phẩm có ích; đọc lại cả ngân sách thường không cần khi giá đã rõ dưới mức đó. Ngược lại, xác nhận số đo mới ở stateful-correction, nhắc size/màu vừa đổi, hoặc đối chiếu 12 ngày với hạn 15 ngày đều có tác dụng. Không cấm nhắc fact nói chung.

5. **Thêm câu hỏi không tạo được bước tiếp.** “Chị có muốn em lấy size mặc vừa không ạ?” trong B1 vượt khả năng hiện có; xin size khi POS unavailable không khôi phục nguồn; “cần em hỗ trợ thêm thông tin gì…” đẩy việc dẫn dắt về khách. Hỏi áo lẻ hay set sau khi đưa hai giá có thể hợp lý, không cấm mọi CTA.

6. **Xưng hô và nhịp câu chưa ổn định.** R3 partial-v3 đổi từ chị/em sang bạn/shop. “Chị lấy cả bộ… giúp em” đặt khách vào vai giúp shop dù đang khuyên mua. “Nhé ạ”, “luôn ạ”, “hoàn toàn”, “rất nhiều” chồng nhau làm câu trau chuốt quá mức. Những từ này không tự là lỗi; xem cả giọng và chức năng của chúng. “Chị thông cảm giúp em” khi từ chối khác với “lấy size M giúp em”.

7. **Dùng từ xa lời chat.** “Thấu quang”, “tổng thể hài hòa”, “sự sắc nét, gọn gàng tối đa cho công việc”, “nhiều biến hóa đa dạng” làm khách phải đọc lại. Có thể nói về lộ áo bên trong, bớt điệu, dễ phối mà không dùng lời kỹ thuật hoặc khái quát quá cao.

8. **Câu fallback ngắn nhưng cụt.** Năm lượt đều nhận “Phần này em chưa trả lời được, chị nhé.” Vấn đề chính là không giải quyết được việc khách đang hỏi, không phải câu thiếu từ lịch sự. Không đổi thành “em sẽ kiểm tra/báo lại” hay “chờ nhân viên” nếu chưa có tác vụ đó. Muốn phục hồi hữu ích cần dùng khả năng và dữ liệu được phép ở terminal hiện có; không cho owner tự sửa/reverify để lấy một câu hay hơn.

### Ví dụ biên tập để thấy nhịp chat mong muốn

Các đoạn dưới là minh họa review, không phải template đưa vào prompt, không phải kết quả model mới hay câu đã được verifier duyệt.

- Đã đổi giỏ thành hai áo be/L: “Dạ, 2 áo be size L chị nhé.”
- Khách ngại cả set quá điệu khi đi đám cưới: “Em nghiêng về áo riêng chị nhé. Áo đã có thêu rồi, phối với quần trơn sẽ bớt điệu hơn cả bộ mà vẫn đẹp đi đám cưới.”
- Khách muốn mặc lại nhiều lần và đã có váy đen; giá set được xác minh: “Chị lấy cả bộ 799k nhé. Có thêm bộ đi tiệc, còn áo chị vẫn phối được với chân váy đen ở nhà.”
- Hỏi giá áo riêng: “Áo size M còn chị nhé, 499k ạ.”
- Khách hỏi còn trong hạn 15 ngày hay không: “Vẫn kịp chị nhé, bên em đổi trong 15 ngày từ lúc nhận. Phí đổi hai chiều là 30k ạ.”

Các ví dụ không buộc mọi reply chỉ có hai câu; cần bao nhiêu để giải quyết việc khách thì viết bấy nhiêu. Không xóa điều kiện quan trọng, thông báo preorder lần đầu, hoặc chi tiết làm khách hiểu đúng.

### Nguyên nhân và hướng sửa giọng

Prompt hiện đã có vai người bán thời trang, mục tiêu giúp mua, yêu cầu tự nhiên/không kể thao tác/không chép mô tả. Vì vậy không thể giải thích bằng “chưa nói model là người bán hàng” hoặc tiếp tục thêm cùng một yêu cầu.

Bằng chứng rõ: nguồn sản phẩm viết như quảng cáo; reply giữ nhiều cách diễn đạt của nguồn. Công việc tool trả state/receipt chính xác nhưng owner có xu hướng kể lại thao tác đó. Ở ca khó, owner dàn đều mọi mặt thay vì chọn lý do có ích. Đây là ba hiện tượng quan sát được; mức đóng góp của source, prompt dài và thói quen model chưa được tách bằng thử nghiệm.

Hướng sửa:
- Chuẩn hóa phần trình bày sản phẩm thành dữ kiện và đặc điểm có ích, có nguồn; không biến nó thành một bài giới thiệu mẫu, không bỏ thông tin để đạt mục tiêu giảm token.
- Hợp nhất hướng dẫn giọng đang trùng. Giữ rõ nhiệm vụ giao tiếp: trả lời/khuyên lựa chọn/xác nhận thay đổi; dùng receipt để biết việc nào đã xong, không bắt thuật lại API.
- Đánh giá câu hỏi cuối bằng việc câu trả lời của khách có giúp thực hiện bước kế tiếp hay không. Không đặt quota câu hỏi, số câu, số tính từ hay blacklist từ nối.
- Khi review, xét quyết định, giọng và tính đúng riêng nhưng đọc cùng một đoạn. Một upsell hợp lý có thể cần biên tập lời; một câu rất gọn vẫn có thể tư vấn sai. Không đưa naturalness thành tiêu chí FAIL của semantic verifier.
- Thử thay đổi nguồn trước, giữ các biến còn lại. Nếu cần sửa prompt, thay đoạn cũ thay vì nối thêm quy định. Dùng các ca hiện có để kiểm, giữ những reply giá/tồn/policy đang tốt. Không chạy lại hàng loạt chỉ để tìm một mẫu nói hay.

Xác nhận owner về miền Nam đã được cập nhật vào mục checkout phía trên. Đây vẫn là review/phương án, chưa sửa code/prompt hay chạy provider.


