# Phase B — audit hành trình bán hàng thường ngày và các phần chưa nối

Ngày22/10/2026. **AUDIT_ONLY**, candidate base `c1eeb66d`; runtime implementation gần nhất `b0ff06c4`, model observation `219d7737`. Chưa sửa runtime, thêm corpus hoặc gọi model. Không live send/production wiring. Đây là audit code và độ phủ, không phải kiểm chứng runtime đang phục vụ khách.

## Kết luận

B đã có nền đọc sản phẩm/policy, size/profile, giỏ, tính tiền, private checkout và handoff trong candidate. Tuy nhiên chưa đại diện đầy đủ cho cuộc bán hàng thông thường: thiếu đường ảnh vào/ra, context từ quảng cáo, diễn biến trả giá và một số kết nối context/checkout tự nhiên. Nhiều khả năng đã nối nhưng bộ model gần đây chưa dùng đến.

Full gần đây là24B1=8nhóm mục đích×3, cộng8mốc stateful, không phải32năng lực bán hàng độc lập.15/24B1 có initialProductCodes được đưa sẵn;3ca SEARCH_READ gọi tên/mã cụ thể. Stateful chủ yếu một mẫu áo, đổi L/số lượng2, báo tổng, sửa số đo, yêu cầu checkout, form COD, xác nhận và control HUMAN. Không có native size-advice journey khởi đầu từ việc khách nhờ chọn size.

Các test deterministic/DB cũ vẫn có giá trị. Không thấy một case trong full32 không đồng nghĩa nó chưa từng được unit-test hoặc từng xuất hiện ở A3; bảng dưới chỉ rõ mức bằng chứng.

## 1. Những phần đã nối, không nên làm lại

| Năng lực | Bằng chứng code/candidate | Mức coverage hiện thấy |
|---|---|---|
| Tìm theo mã/tên hoặc query; đọc mô tả, giá/stock theo offer/màu/size | createCommerceTools; createReadOnlyTools; source adapters Qdrant/Redis | Có B1 provider cases, nhưng chưa có luồng khám phá từ nhu cầu rồi chốt mẫu. |
| Policy hiện hành, phương thức thanh toán, điều kiện đổi/trả | publicPolicyLiteral; read_policy | Có model cases. orderEligibility=null: không phải tra/duyệt đơn thật. |
| Profile/số đo/sở thích, chọn size bằng rule | apply_customer_state + recommend_size | Có focused/real-DB tests; full8stateful gần đây khách tự chọn M/L, chưa chứng minh tư vấn size của owner. |
| Giỏ, thêm món, đổi size/màu/số lượng, bỏ dòng | add_to_cart/change_cart_item; ADD_LINE/REMOVE_LINE/SET_QUANTITY/SET_COMPONENT_VARIANT | Có unit/domain coverage; model journey gần đây chỉ một sản phẩm, đổi size/số lượng. |
| Tính giá/tổng/ship/ưu đãi từ code | quote_cart, evaluateShopPolicy, cartQuote | Đã nối phép tính; không đồng nghĩa đã nối event trả giá. |
| ETA theo nguồn và vùng; địa chỉ miền Nam dùng cùng transit | read_product.deliveryRegion; realtime-sales-catalog→southernDestination; private selection source | Có focused tests/đường code; full model24+8chưa có ca hỏi deadline trước chốt. |
| Private checkout, preview/xác nhận, handoff, intents | ingress/session/persistence reuse existing sales cycle/transaction | Có disposable-DB/capture tests COD/BANK; provider full gần đây dùng form COD. |
| QR chuyển khoản | realtime-sales-cycle tạo TEXT+IMAGE từ paymentInstruction; session commit messages | Đã có đường code và BANK tests. Không nói mọi gửi ảnh đều chưa nối; phần thiếu là ảnh sản phẩm tùy yêu cầu. |
| Chuyển nhân viên theo matrix và reason | request_handoff; ownership/event/tag/readback | Đã nối, gồm EXCHANGE/DEFECT tests/batches cũ. Không chỉ là terminal label. Live acknowledgement/delivery không được chứng nhận bởi audit này. |

Candidate không được production entrypoint import là hạn chế activation có chủ đích, không tự là lỗi cần bật live trong lần audit.

## 2. Có thành phần trong repo nhưng chưa nối hoặc nối chưa đủ vào B

### Làm rõ sau review lịch sử hội thoại

Lịch sử **text đã nối**, không phải capability hoàn toàn vắng mặt: ingress ghi inbound và nạp CUSTOMER/BOT/HUMAN; dispatcher ghi BOT khi provider chấp nhận. DB trả từ cũ tới mới. Candidate query tối đa8dòng trước rồi lọc PII, model nhận tối đa8tin/4.096byte; private/null rows có thể làm cửa sổ ít tin hữu ích hơn. Owner và verifier đều nhận history. Test DB/capture đã chứng minh lượt sau thấy câu bot trước và giỏ hiện tại, chưa chứng minh mọi tham chiếu qua cuộc trò chuyện dài. Ingress cũng có commit currentProductId từ snapshot; gap cần audit là nạp/bind focus này qua lượt trước giỏ, không phải chưa có field lưu. [Kế hoạch N1–N8](c3-phase-b-missing-capabilities-plan-20261022.md) tách rõ history/window, product focus và media continuity; chưa tăng context/model calls.

| Phần | Repo có gì | B còn thiếu gì | Phân loại |
|---|---|---|---|
| Gửi ảnh sản phẩm | selectImages/selectRequestedImages; selectProductMediaV2; registry source và transport IMAGE | Native B không có tác vụ media; generated reply egress chỉ dựng TEXT. Chưa gửi ảnh tổng thể/màu/mặt sau/chi tiết/bảng size theo yêu cầu khách. | Chưa nối. |
| Nhận ảnh/screenshot khách gửi | media-resolution; MediaRecognitionV2ImagePipeline; catalog image search/recognition ở realtime cũ | ingress có attachments.length là NO_SEND/INGRESS_SCOPE_OR_MEDIA, kể cả tin vừa có chữ vừa có ảnh. Chưa đi đến tìm mẫu, tư vấn, xem lỗi hàng hoặc handoff nhận biên lai. | Chưa nối; ưu tiên cao. |
| Cho owner xem ảnh hàng | Catalog media metadata và source ảnh đã có |71owner requests hai vòng vừa rồi không có image parts. Không đồng nhất việc owner xem ảnh với việc gửi ảnh cho khách. | Chưa nối; cần input/bounds/binding audit. |
| Product từ quảng cáo | Inbound schema có adsContext; realtime cũ đọc adTitle rồi exactProduct | Candidate ingress không xử lý adsContext; chỉ có input.read.initialProducts từ caller. Chưa có bridge/test chứng minh tự xác định mẫu khi khách chỉ hỏi bộ này giá bao nhiêu từ quảng cáo. | Chưa nối ở consumer hiện có; caller phải được audit khi bổ sung. |
| Diễn biến trả giá và nhượng bộ theo policy | applyNegotiationEventV2; policy engine; persisted NEGOTIATION_EVENT có validation | B đọc tier hiện tại để quote nhưng tool set không phát event PRICE_OBJECTION/PURCHASE_READY từ owner. Không nên gọi cả negotiation đã nối chỉ vì có cartQuote. | Engine/quote có; input event chưa nối. |
| Kế thừa mẫu đang xem trước khi có giỏ | resolveVerifiedProductContext và source/fence checks ở luồng cũ | Candidate bound products chủ yếu do caller/initialProducts hoặc read trong turn; không thấy bridge dùng resolver này. Cart đã persist refs; phần chưa có giỏ và chuyển qua nhiều mẫu cần kiểm riêng. | Chưa có bridge được chứng minh; không kết luận mọi referent đều thất bại. |
| Checkout chat tự nhiên | Core có checkoutDraft/missingFields, private preview và parser | ingress chọn private branch bằng isPrivateCommerceText(latest), chưa thấy route theo pending checkout field. Probe tên tự nhiên chưa vào private branch; form có nhãn hiện được test nhiều hơn. | Nối một phần, cần sửa/kiểm ưu tiên cao. |

Không nối nguyên các service cũ nếu kéo theo third model role, Strategist/Responder, semantic router hoặc parser ngôn ngữ chung. MediaRecognition hiện dùng GEMINI_RERANK; chỉ reuse cơ chế tải/giới hạn/truy xuất/source evidence phù hợp và giữ conversational owner hiện tại làm chủ việc hiểu. Negotiation cũng không được copy cơ chế Strategist/regex cũ vào B.

### Finding checkout cụ thể

Đã gọi pure function isPrivateCommerceText từ dist tương ứng runtime source hiện tại với dữ liệu tổng hợp:

| Tin giả lập | privateCodePath |
|---|---:|
| Lan | false |
| Chị tên Lan nhé | false |
|12 Nguyễn Trãi, Quận 1, TP.HCM|true|
| Địa chỉ: 12 Nguyễn Trãi, Quận 1, TP.HCM |true|
| COD |false|

Tên tự nhiên có thể đi tiếp owner path theo branch hiện tại. Chưa chạy E2E/provider để kết luận đã có leakage thực tế. Cần kiểm trạng thái đang thu checkout và field còn thiếu trước khi đưa latest/history vào model; không chữa bằng cách thêm regex tên người hoặc đưa PII vào model để extract. COD là dữ kiện công khai, false của riêng COD không phải bằng chứng lỗi privacy; cần kiểm luồng bổ sung phương thức thanh toán riêng.

Các probe còn xác nhận câu hỏi chung về Cần Thơ/Thủ Đức, height/weight và xin ảnh đều false; không ghi chúng thành lỗi privacy routing. Chỉ code-read/probe, không model generation, external write hay suite test mới.

Một phần giọng checkout do code dựng: checkout invitation hiện có các nhãn Tên/SĐT/Địa chỉ/Thanh toán, không phải lời owner tự sinh. Muốn nhận câu trả lời tự nhiên thay vì bắt khách điền đúng nhãn phải kiểm/sửa intake theo trạng thái checkout; viết lại prompt tư vấn không sửa được nhánh này. Tương tự, conversion1m65/1,65m đã có trong state adapter và unit tests, không thêm parser chiều cao mới để chữa thiếu model coverage.

## 3. Những phần chưa có adapter tự phục vụ được xác minh

- Tra đơn đã mua, vận đơn và trạng thái giao thực tế: đã có các reason ORDER_STATUS/DELIVERY_TRACKING/DELIVERY_DELAY để handoff; chưa xác minh adapter lookup theo quyền khách trong B. Không gộp ETA catalog với tracking đơn đã đặt.
- Hủy/sửa đơn đã chốt, hoàn tiền và duyệt đổi/trả thật: có handoff reasons và quy trình policy; không có native B tool tự commit các tác vụ này. Thay giỏ trước chốt không phải sửa đơn ngoài POS.
- PURCHASE_CONFIRMED trong candidate không phải receipt đã tạo đơn POS. Realtime code nói chuyển nhân viên kiểm tra/lên đơn. Không tìm thấy adapter external POS create/cancel/tracking đã nối trong đường candidate đã audit. Không khẳng định mọi endpoint đó không tồn tại ở mọi hệ thống của shop.
- Gửi biên lai không chứng minh đã nhận tiền. Core gửi QR không phải đối soát thanh toán; hướng hiện có là PAYMENT_RECEIPT_REVIEW_REQUIRED/handoff, nhưng ảnh đầu vào đang bị chặn trước khi tới đó.
- Thêm giỏ không phải giữ tồn/đặt hàng ở kho. Không thấy native reserve-stock tool. Nếu khách xin giữ đến chiều, chỉ thực hiện trong khả năng hoặc chuyển nhân viên.

Các tác vụ này có thể tiếp tục do nhân viên xử lý. Không tự biến chúng thành yêu cầu phải thêm API mutation vào B hoặc quyền thực hiện live effects.

## 4. Các nhóm case thường ngày chưa nằm đủ trong full B gần đây

Đây là danh sách thiếu coverage, chưa phải corpus mới hoặc lời thoại bắt model học thuộc. Mỗi nhóm có thể thành một đoạn hội thoại nhiều lượt; không tự nhân ba mọi dòng và đăng ký model runs.

| Nhóm | Ví dụ lời khách | Trạng thái cần kiểm |
|---|---|---|
|1. Vào từ quảng cáo/ảnh, chưa nêu mã | Bộ này bao nhiêu em? | ads/product identity; current test thường đưa sản phẩm sẵn. |
|2. Tìm theo nhu cầu thay vì mã/tên | Chị cần bộ đi làm, tầm800nghìn thôi. | search theo nhu cầu, hỏi phần cần thiết, chọn từ hàng shop. Tool đã có. |
|3. Xin ảnh đúng phần/màu | Gửi chị ảnh màu be với mặt sau nhé. | Chọn ảnh, gửi thật, không nói đã gửi khi chưa có delivery. Chưa nối media task. |
|4. Khách gửi screenshot/ảnh mẫu | Mẫu này bên mình còn không em? | Resolve ảnh hoặc clarification; không mất cả tin có ảnh+chữ. |
|5. So hai mẫu rồi gọi lại bằng đại từ | Hai bộ này bộ nào mặc đi làm hợp hơn? / Lấy bộ thứ hai nhé. | Multi-product context/identity qua turn, không chọn nhầm theo thứ tự vô căn cứ. |
|6. Tư vấn size từ đầu | Chị cao1m58, nặng52kg, mặc size gì em? | State→size engine→đề xuất. Không mặc định phải đủ ba vòng; missingInputs theo nguồn. |
|7. Thiếu/sửa số đo làm đổi lời khuyên | Eo chị74, mông để chị đo lại. | Hỏi phần thiếu, không gợi size tạm; sửa rồi tính lại đúng binding. Unit tests có, model journey gần đây chưa có. |
|8. Chọn màu/stock theo màu | Chị có quần navy rồi, chọn giúp chị màu áo đi. | Chọn phù hợp rồi kiểm đúng màu-size, có thể gửi ảnh. Không chỉ đọc tổng tồn. |
|9. Hết size/màu, hàng đặt trước | M hết rồi à, còn mẫu nào gần giống không? | Nguồn unavailable/preorder, alternative search, ngày giao phù hợp. Không hứa giữ/kịp. |
|10. Ship/ETA trước khi có giỏ | Chị ở Cần Thơ, cuối tuần nhận kịp không? | Source region/MIEN-NAM, ETA range/mốc tính và deadline, không biến dự kiến thành bảo đảm. |
|11. Giá cao, xin ưu đãi nhiều lượt | Lấy hai bộ thì bớt cho chị không? / Hỗ trợ ship được không? | Policy arithmetic có; negotiation event chưa nối; không model tự cấp ưu đãi. |
|12. Nhiều mẫu/nhiều biến thể, bỏ món | Thêm áo kia nữa, bỏ chiếc váy giúp chị. | ADD_LINE/REMOVE_LINE đã có, cần model/provider journey. Tổng/ưu đãi/stock tính lại. |
|13. Size thành phần set khác nhau | Áo chị lấy M, váy L được không? | Khả năng source/BOM và component-role mutation, không áp một size cho tất cả hoặc tự nhận hợp lệ. |
|14. Checkout bằng chat, sửa trước chốt | Chị tên Lan nhé. / Chị đổi địa chỉ nhận hàng. | Pending fields/PII/code path, partial input, đổi payment/address và preview phải đúng. Không chỉ form đủ nhãn. |
|15. Biên lai, đơn chậm, ảnh lỗi hàng | Chị chuyển rồi nhé [ảnh]. / Đường may bị thế này [ảnh]. | Không xác nhận tiền/lỗi đã duyệt; nhận context và handoff thật. Media currently blocked. |
|16. Đã đặt rồi muốn sửa/hủy | Đơn vừa rồi đổi sang màu trắng được không? | Phân biệt cart draft và đơn ngoài hệ thống; handoff theo capability, không báo đã sửa/hủy. |
|17. Quay lại sau nhiều lượt và kết thúc tự nhiên | Bộ lúc nãy còn không? / Để chị nghĩ thêm đã. / Cảm ơn em. | History8messages/4096bytes, persisted focus/preferences, không ép chốt hay nhắc lại toàn bộ hồ sơ. |
|18. Bảo quản sau khi tư vấn | Mẫu này giặt máy được không em? | Dùng care data nếu có; không bịa hướng dẫn hoặc hứa kiểm tra sau khi không có follow-up capability. |

Budget/occasion/điều khách không thích chưa có trường native state riêng trong B hiện tại; profile hiện có số đo/fitPreference/colors/styles/materials. Lời chat vẫn nằm trong history có bounds. Đây là lý do cần test dài/hồi lại, chưa phải bằng chứng phải thêm durable state mới. Ưu tiên reuse history/focus hiện có trước khi thêm schema.

## 5. Thứ tự xử lý đề xuất

1. Checkout pending-field/privacy route và ảnh đầu vào không bị bỏ qua toàn lượt. Với biên lai/hậu mãi, ưu tiên đường code/handoff thích hợp; không cho model xem PII tự do.
2. Gửi ảnh sản phẩm và nhận diện/binding sản phẩm từ quảng cáo/ảnh. Reuse source/selection/Outbox và current gate; không importer toàn pipeline model cũ.
3. Kiểm model journey cho phần đã nối: size từ đầu, nhiều mẫu/màu, bỏ món, unavailable/preorder, ETA, checkout chat. Không viết lại tool đã có.
4. Nối negotiation event đúng authority/policy nếu được triển khai; phân biệt với quote engine đã có.
5. Kiểm focus/history qua nhiều lượt và phép thử ảnh tư vấn đã đề xuất. Phương án18mẫu nhãn/ảnh trước đó chỉ kiểm lời tư vấn, không thay audit chức năng này hoặc chứng minh B hoàn chỉnh.

Giữ inbound parsing/current-source/CAS/fencing/receipt/privacy và giới hạn role. Không deploy, live send, external order mutation, import regex/Strategist/Responder hoặc tự mở provider campaign trong audit. Chưa có kết luận bot bán hàng đầy đủ hay B GO.

## File anchors chính

- [Tool composition](../../apps/worker/src/single-agent-commerce.ts:19).
- [Ingress attachment exclusion/private routing](../../apps/worker/src/single-agent-commerce-ingress.ts:77), [model reply TEXT egress](../../apps/worker/src/single-agent-commerce-ingress.ts:151).
- [Size adapter](../../apps/worker/src/single-agent-commerce-state.ts:218), [cart mutations](../../apps/worker/src/single-agent-commerce-effects.ts:209).
- [Private executor](../../apps/worker/src/single-agent-commerce-session.ts:110), [handoff](../../apps/worker/src/single-agent-commerce-handoff.ts:83).
- [Existing image selection](../../packages/business-tools/src/image-selection.ts:102), [media selector](../../packages/business-tools/src/media-selector-v2.ts:290), [old media reranker boundary](../../apps/worker/src/realtime-media-recognition.ts:97).
- [Ad context read in old consumer](../../apps/worker/src/realtime-runner.ts:6390), [verified product context](../../apps/worker/src/verified-product-context.ts:92).
- [Negotiation event engine](../../packages/business-tools/src/negotiation-engine-v2.ts:266), [policy arithmetic](../../packages/commerce-kernel/src/policy-engine.ts:190).
- [Current B1 corpus](../../apps/worker/evals/single-agent-commerce-read-only/cases.b1.json), [stateful8](../../apps/worker/evals/single-agent-commerce-read-only/stateful-cases.json), [DB/capture harness](../../apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs:76).

Verification trong lượt này: đọc code/registered corpora/old test evidence, đếm purpose/case metadata, gọi pure privacy-routing function trên synthetic strings. Không chạy mới test suites, build hoặc provider, không dùng kết quả cũ để claim test PASS cho một thay đổi runtime. Command đọc n8n/code không tìm được adapter hoàn chỉnh không được dùng làm bằng chứng tuyệt đối hệ thống ngoài repo không có endpoint.
