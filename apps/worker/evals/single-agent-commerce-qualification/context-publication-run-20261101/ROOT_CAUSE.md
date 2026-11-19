# Review lịch sử sửa và hội thoại — 01/11/2026

Review base `1bee3f30514e273b703201367ebfa71069c6c010`. Đã đọc terminal customer outcomes của 5 batch gần nhất: read-path, B–C repair, variant/search, purchase-options và context-publication; tổng **102 ca đã thực thi / 148 lượt khách**. Batch purchase-options còn 6 NOT_RUN, không tính như đã đọc hội thoại thực thi. Đối chiếu lịch sử commit/implementation/review, actual tool responses, source/readiness, evaluator và source code. [Evidence tổng hợp và pure replay](ROOT_CAUSE_EVIDENCE.json).

Review không gọi provider/network, không chạy PostgreSQL mới, không effect, không sửa runtime/prompt/nguồn shop hoặc grade lịch sử. Phép kiểm mới là canonical reducer trên cart thật và policy frozen của P08. Đây là review của tác giả, chưa phải independent review mới.

## Kết luận chính

Các fix về authority, binding, publication và evidence có tiến bộ xác định được. **Luồng hoàn tất yêu cầu bán hàng chưa được đóng tương ứng:** model vẫn phải tự ghép thao tác thấp, một số chuỗi không có đường hợp lệ như model chọn, schema/context chiếm phần lớn request, còn source/corpus/judge chưa thống nhất phạm vi đủ phục vụ khách. Tăng chỉ dẫn chung hoặc sửa giọng không giải quyết được các nguyên nhân này.

Không có evidence để kết luận toàn bộ thất bại là do verifier quá chặt hoặc model yếu tiếng Việt. Vòng mới nhất: verifier13 PASS,1transport error,0semantic FAIL. Những ca đã handoff trước verifier không phải bị verifier bác nội dung.

## 1. Phát hiện xác định thêm: REMOVE_LINE cuối cùng không thực hiện được như chuỗi owner chọn

P08 ở **cả hai batch mới nhất**:

1. Khách đã lấy set M, cart có đúng1dòng SET_VAY.
2. Khách đổi sang chỉ áo. Owner gọi REMOVE_LINE(set) rồi add_to_cart(AO).
3. Remove bị `NATIVE_MUTATION_REJECTED`; add bị `CLAIM_MISSING`; cart/receipt không đổi.
4. Batch trước handoff; batch mới đọc thêm sản phẩm rồi bảo khách tự xóa giỏ/thêm áo. Việc đổi vẫn chưa làm được; khác nhau ở cách kết thúc, không phải domain blocker đã được giải quyết.

**Pure replay mới, dùng actual cart/clock/policy:** `applyCanonicalCartDecisionV2(REMOVE_LINE)` trả **BLOCKED/CART_EMPTY**, trả nguyên cart cũ. [Kernel](../../../../../packages/commerce-kernel/src/canonical-cart-engine.ts) chặn giỏ rỗng; CartV1 contract yêu cầu tối thiểu1dòng. [Native bridge](../../../src/realtime-sales-cycle.ts) gom rejection thành NATIVE_MUTATION_REJECTED, làm mất nguyên nhân cụ thể ở kết quả owner thấy.

Đây không phải sai ngữ pháp gọi tool hay cần model suy luận khéo hơn. Test removal đã có ở worker/PG kiểm **hai dòng → một dòng**, không chứng minh **thay dòng duy nhất bằng offer khác**. Test green về primitive đã bị diễn giải rộng hơn khả năng nghiệp vụ thực tế.

Giới hạn kết luận: không nói mọi thứ tự thay thế đều bất khả thi. Thêm món mới trước rồi xóa món cũ có thể là một đường khác khi đầy đủ nguồn/quyền, nhưng là hai effects, chưa có bằng chứng tính nguyên tử và xử lý partial failure. Không được chỉ đổi thứ tự trong prompt rồi nhận đã giải quyết task.

Hướng đúng: kiểm task thay offer với preflight nguồn/giá/tồn rồi commit an toàn theo boundary hiện có, hoặc handoff nếu capability chưa hỗ trợ. Không bỏ invariant giỏ không rỗng để cứu một case, không hướng khách sửa giỏ nội bộ. Giữ failure reason thực để phân loại được unsupported task, thiếu claim hay commit uncertainty.

## 2. Đường dữ liệu có tiến bộ, nhưng request không còn đủ chỗ cho continuation thực

Chuỗi sửa đã đi qua: all-offer tuple quá lớn → compaction → stock/variant binding → prepare offer refs → metadata-only khi chưa chọn thiết kế. P09 batch trước request2 không dispatch; batch mới đọc được hai set và xử lý follow-up. Đây là cải thiện quan sát được, không nên rollback toàn bộ.

Nhưng s08 mới vẫn fail trước HTTP ở **67258/65536 byte**:

| Phần | Byte |
|---|---:|
| System instruction |22000|
| Tool schemas |19174|
| Trusted frame |10815|
| Dialogue/native continuation |15009|

Riêng system+schemas đã chiếm khoảng63% trần; continuation mang opaque signature11024ký tự. Prompt sửa gần nhất chỉ tăng638byte so prompt cũ đo trong replay; **không đủ căn cứ quy toàn bộ lỗi cho lần bổ sung prompt mới**. Vấn đề lớn hơn là đưa rộng capabilities/schema cộng full evidence và native continuation vào cùng một trần nhưng chỉ chứng minh một số tổ hợp vừa.

`buildGeminiCommerceRequest` hiện tạo declarations từ toàn bộ availableTools; callable chủ yếu lọc theo toolsAllowed và budget quote, chưa lược theo refs/cart/state khả dụng. Owner vẫn phải xử lý schema của giao dịch/state dù lượt đang đọc hai món để chọn mẫu. Không được cắt signature hoặc nâng cap để che thiếu headroom.

Hướng đúng: tách danh sách khả năng khỏi schema gọi được theo trạng thái có cấu trúc, giữ đường đọc thật cần thiết và exact evidence; đo continuation thực tối đa theo từng task. Không dùng semantic router để đoán ý khách, không xóa facts đã admit. P09 vừa cap không chứng minh mọi ca hai sản phẩm đều vừa.

## 3. Task chọn tool vẫn phụ thuộc quá nhiều vào model; có đường làm thừa và đường bỏ quy tắc

**s15 ACK:** ba batch30/10 đều mở đọc sản phẩm và chen giá/tồn/hỏi size dù khách chỉ nêu thích màu và cảm ơn. Batch mới gọi ảnh theo màu, nhận MEDIA_COLOR_BINDING_UNVERIFIED rồi handoff. Handoff là hệ quả; lỗi đầu là tự tạo một việc cần tra ảnh để đáp một lời ACK. Thêm ảnh vào nguồn chưa chữa được lỗi lựa chọn việc này.

**P02 báo giá:** batch trước gọi quote task, thiếu ảnh → handoff; batch mới dùng đường dữ kiện khác để gửi giá mà không ảnh, dù rule báo giá mở đầu vẫn yêu cầu ảnh. `quote_product` code có kiểm giá+ảnh, nhưng ở caller đây là một tool owner được chọn; final semantic verifier không tự kiểm tuân thủ form báo giá. Một requirement bắt buộc vẫn được thực thi tùy theo owner chọn đường nào.

**s09 giặt:** schema read_product yêu cầu enum selection và decoder chuyển sang domain args. Batch mới lỗi OWNER_TOOL_OUTPUT/selection. Evidence không giữ exact selection bị lỗi nên chưa kết luận là thiếu field hay enum/value nào sai. Không gọi đây là lỗi hiểu care policy hoặc verifier. Nguồn có câu trả lời nhưng model không tới bước đọc hợp lệ.

Hướng đúng: đóng các prerequisite bắt buộc ở task boundary code sau khi task được lựa chọn có cấu trúc; ưu tiên không tạo optional lookup trong lượt không cần nó. Tool surface phải rõ và ít cách biểu diễn dư; lỗi syntax vẫn fail closed, không tự sửa/retry generation. Không thêm một loạt ví dụ s15/s09 vào prompt để fit corpus.

## 4. Bổ sung metadata nguồn chưa tương đương có khả năng tư vấn/bán đủ scope

Offer/BOM biết áo/quần/set không có nghĩa engine chọn size được từng phần, có physical colour binding hoặc có ảnh đúng intent còn hiệu lực.

- P07 cũ gọi product size rồi coi M/L thường mặc như cấu hình khách đã chọn. Fix mới làm đúng COMPONENT/TOP → source gap → handoff. Đây là sửa sai phạm vi, **chưa phải hoàn thiện khả năng tư vấn size từng phần**.
- j2 readiness kiểm chart cấp sản phẩm nhưng khách xin size áo của bộ. Lần mới handoff ngay, correction sau đó không chạy do HUMAN đã sở hữu. Không được gọi đây là hồi quy correction chỉ từ NO_SEND, hoặc nhận readiness xanh nghĩa là đủ tư vấn component.
- Màu thiếu nghĩa và ảnh không eligible đã lặp qua nhiều batch; source capture mới không tự bổ sung metadata thiếu hoặc revalidate media hết hạn.
- P06 có số component refs nhưng lời “cả ba món” không có history xác định tổ hợp; refs có thể là biến thể cùng loại, không đủ để nhận đã kiểm flow áo+quần+váy.

Hướng đúng: kiểm readiness theo **yêu cầu và scope task**, không chỉ có product/PRICE/chart. Chỉ chọn sales-ready khi có đường phục vụ được; control thiếu nguồn vẫn giữ handoff. Không giả dữ liệu để nâng điểm và không chuyển cohort sau khi có kết quả.

## 5. Evaluator tiếp tục thiếu một phần contract, khiến việc đọc điểm dễ sai

Trước đây public judge context thiếu chart delegation; đã bổ sung. Hiện thiếu nghĩa bắt buộc của ảnh báo giá/màu ở H01/H02, còn j2 scope readiness và P06 referent chưa khớp. Đây là cùng loại vấn đề contract giữa runtime, corpus và scoring, không phải cùng một câu trả lời bị sửa mãi.

13 wholeTurnPass mới gồm các handoff/clarification hợp lý nhưng nhu cầu chưa hoàn tất; conjunction chỉ8/21. Hai chỉ số trả lời hai câu hỏi khác nhau. Nếu lấy một corpus chứa expected handoff/source gaps rồi dùng literal allExplicitNeedsResolved để đo duy nhất việc bot hoàn tất bán hàng thì task đúng giới hạn vẫn bị tính chưa hoàn thành. Phải chốt rõ success của từng loại task **trước run mới** và báo riêng completion, clarification, proper handoff; không sửa grade hoặc giảm ngưỡng để cứu kết quả.

Không nói 8/21 là bằng chứng toàn bộ model trả lời sai, cũng không chọn13/21 để che nhu cầu chưa được đáp ứng. Custom development packet chưa phải official qualification. Đánh giá hiệu quả bán hàng vẫn cần cohort nguồn sẵn sàng và task thực sự hỗ trợ được.

## 6. Vì sao nhiều vòng sửa mà kết quả tổng vẫn dao động

| Việc sửa | Tác dụng có evidence | Chưa giải quyết |
|---|---|---|
| Compact/variant/counter bindings | Đóng lỗi evidence/stock sai scope | Không bảo đảm request sau tool vừa, hoặc source đủ màu/ảnh |
| Prepare danh sách offer/read refs | Rút đường search→details→facts; P09 mới xử lý được | Không tạo task đổi offer nguyên tử hoặc component-fit API |
| Publication charts + generation guard | Offline đúng world/clock cũ ổn định trước verifier; không hard stop mới | s09 mới lỗi schema trước khi tới đường sửa, chưa có provider proof cho care path |
| PRODUCT/COMPONENT scope | Chặn dùng product fit làm tư vấn từng phần; P07 mới handoff đúng | Nhu cầu chọn size vẫn chưa hoàn tất |
| Silent handoff | Giữ quyền/state/effects và không phát lời hứa sai | Lỗi upstream nhỏ có thể chấm dứt cả hành trình; cần sửa nguyên nhân đầu, không tắt guard |
| Thêm chỉ dẫn giọng/tool chung | Một số reply đã dùng được | ACK vẫn over-action, giá có thể bỏ form, tool syntax/planning biến động |

**s09 qua5batch:** không đọc policy → trả được → trả được → changed snapshot → malformed selection. Không phải cùng một root cause chưa bao giờ sửa. **s08:** bốn batch đọc/chọn được, batch mới vượt wire cap. **P08:** rejection domain giống nhau hai batch; chỉ terminal đổi từ handoff thành câu hướng dẫn không dùng được. Cần dùng trace/task boundary để phân biệt ba loại này, không chỉ tên ca hoặc tỷ lệ handoff.

Đối chứng B–C đã có cũng ghi cùng exact owner body có thể thay đổi phạm vi/thứ tự tool. Vì N=1, khác source/corpus và một batch dừng sớm, các tỷ lệ tổng giữa5batch không phải phép đo nhân quả hoặc độ ổn định.

## Ưu tiên xử lý sau review

1. Đóng task thay lựa chọn mua trong giỏ trên actual native adapter, bao gồm last line/partial failure; trả failure reason có nghĩa. Đây là code/capability trước prompt.
2. Giảm schema không callable theo state/refs và kiểm headroom của continuation thực; không thay model/cap/signature.
3. Đưa quy tắc bắt buộc của task và readiness/evaluator về cùng contract: quote+ảnh, fit đúng scope, source-gap handoff và success của clarification/aftersales. Giữ original results.
4. Sau đó mới đo owner decision trên input đã đủ/task khả thi. Giữ ca ACK/care để kiểm over-action và tool schema; không thêm regex hoặc ví dụ theo benchmark.

j6 verifier transport là lỗi vận hành riêng, không phải thiếu context; cart đã commit được giữ. Không replay mutation để thử lại reply. Giọng dài/nhiều tính từ vẫn có ở s05/s06 nhưng owner đã tạm chấp nhận hạn chế nhẹ; không nên dùng nó làm trọng tâm một vòng tăng prompt tiếp.

Chưa triển khai các hướng trên, chưa chạy model hoặc đổi điểm. Không có lý do từ review này để rollback toàn bộ những boundary đã sửa đúng hoặc nới verifier an toàn.
