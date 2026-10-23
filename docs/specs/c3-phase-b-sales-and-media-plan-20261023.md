# Phase B — tư vấn giúp khách mua và dùng ảnh đúng mục đích

**Kế hoạch hiện hành sau run12 và review GPT-6 Astra High:** [bản sửa follow-up](c3-phase-b-sales-media-followup-plan-20261023.md). Bản mới thay phần triển khai/campaign chưa thực hiện bên dưới; không thực hiện lại các bước đã có evidence. Nội dung dưới giữ nguyên như kế hoạch trước run để đối chiếu lịch sử, không mô tả trạng thái hiện tại.

Ngày 23/10/2026. **PLAN_REVISED_AFTER_REVIEW — implementation được owner yêu cầu; chưa có provider result mới.** Base quan sát: `88589b180379eea5c5d0efbf2c06feed903909b2`. Review độc lập `/root/review_sales_media_plan_20261023`: REVISE, một P2 về capability bộ kiểm và hai P3 đã tiếp thu bên dưới; chưa gọi bản đã sửa là được reviewer APPROVE.

Nguồn: [39 hội thoại](../../apps/worker/evals/single-agent-commerce-read-only/repeat39-run-20261023/CONVERSATIONS.md), [kế hoạch root cause đã review](c3-phase-b-full39-rootcause-fix-plan-20261023.md). Bản này cụ thể hóa hướng tư vấn/media, không hủy các việc discovery, deadline, tool-mode và lỗi provider còn mở. Không tự dispatch campaign trong lượt planning.

## Kết luận và giới hạn bằng chứng

- 34/39 dùng được là phân loại chất lượng cả lượt, bao gồm thông tin/giao dịch/handoff; không phải tỷ lệ bán hàng thành công. Chưa có conversion hoặc khách thật.
- Prompt đã yêu cầu chọn một hướng, lý do liên quan, không gom lời khen. Chưa chứng minh lỗi do thiếu chỉ dẫn hoặc do model không đủ năng lực. Không thêm lại các câu dặn tương tự.
- Tool description hiện mô tả intent là loại ảnh khách muốn; owner prompt chưa chỉ rõ vai trò ảnh trong xử lý phân vân. Đây là một giả thuyết về hành vi phản ứng khi khách xin ảnh, chưa phải nguyên nhân đã chứng minh.
- `createCommerceMediaTools` dùng `selectRequestedImages`, không dùng `selectProductMediaV2`. GENERIC chọn theo presentation order, không bảo đảm khác góc; không coi tính năng ở selector khác là đã nối.
- Full39 hiện chỉ chứng minh giao hai ảnh chung ở gallery qua capture. Chưa kiểm đủ cận chất, feedback, lựa chọn góc ảnh hoặc hiệu quả chủ động tư vấn bằng ảnh.

## 1. Audit nguồn và request trước khi thay đổi (nhỏ)

Kiểm các sản phẩm thực trong nhóm tư vấn/gallery và các ứng viên discovery đã trả về. Dùng nguồn catalog/registry hiện có, chỉ đọc. Lập một bảng trong báo cáo: mã, ảnh đã duyệt, loại/góc, phần trang phục, feedback được xác nhận, binding màu, dữ kiện mô tả, giá/offer được đọc. Ghi rõ nguồn chưa đọc hoặc không có ảnh đúng loại; không suy thiếu ảnh từ một lần tool thất bại.

Đối chiếu request model có thực nhận description, nguồn giá, ảnh đã xem và metadata đúng scope hay không. Tách ba lỗi: nguồn thiếu; nguồn có nhưng chưa được lấy; model nhận rồi nhưng dùng không tốt. Không tự tạo bảng công dụng, nhãn phù hợp từng khách hoặc summary do model thứ ba viết. Chỉ sửa projection nếu bắt được trường nguồn hiện có bị mất; không thêm schema dự đoán để phục vụ benchmark.

**Đạt:** chỉ rõ từng finding thuộc lớp nào bằng source/readback/request; không tuyên bố đã đủ dữ liệu toàn shop. Đầu ra là audit, không migration hoặc publish registry.

## 2. Sửa lựa chọn và giọng bằng một thay đổi có thể đối chiếu (nhỏ)

Giữ phần giao dịch/policy/authority. Thay đúng phần hướng dẫn tư vấn/giọng liên quan, không nối thêm một danh sách ngoại lệ. Candidate được viết và freeze sau audit; trước run phải ghi exact diff và giả thuyết kiểm tra.

Mục đích đoạn thay: trả lời điều đang cản khách mua bằng lý do phân biệt phương án; mô tả sản phẩm chỉ đưa vào khi giải thích được lựa chọn đó. Khi khách đã quyết, chuyển sang tác vụ phù hợp. Không bắt mọi câu phải chọn món, thêm ảnh, hỏi chốt hoặc bán thêm. Không mặc định giá thấp nhất là tốt nhất; lợi ích của phần mua thêm phải cụ thể với cách khách dùng.

Giọng: từ thông dụng, bỏ ý trùng; không kể hồ sơ, quá trình đối chiếu hoặc trạng thái phân loại của hệ thống. Không blacklist “nếu”, “thì”, “giúp em”, dấu ngoặc hay áp số câu; đánh giá chúng trong toàn lượt. Giữ những thông tin khách thực sự cần về giá, hàng đặt trước, chính sách hoặc giao dịch. Không đổi dữ kiện nguồn thành bản mô tả quảng cáo mới.

Reuse bốn paired advice inputs của kế hoạch trước, cùng context/clock/model/verifier và mode giữa hai arm; chỉ đổi đoạn prompt. Nếu không tìm được candidate khác về cách xử lý mà chỉ lặp nguyên tắc cũ, chưa chạy thêm vòng prompt. Không đưa câu trả lời của ca vào prompt. Kết quả không tốt hơn hoặc controls kém đi thì bỏ candidate, không chồng tiếp chỉ dẫn.

**Đạt:** so toàn lượt thấy khách được giúp quyết định rõ hơn, lời ngắn/gần văn nói hơn mà không mất nhu cầu, không bịa lợi ích; cho phép nhiều lựa chọn mua hợp lý. Một lần chạy chỉ là bằng chứng thăm dò.

## 3. Dùng media hiện có để hỗ trợ lựa chọn (vừa; sau audit)

Điểm chạm chính: mô tả `select_product_media`/`view_product_media` trong `gemini-inference.mjs`. Nêu rõ owner có thể dùng ảnh khi ảnh giúp xử lý phân vân, không chỉ khi khách nói xin ảnh. Chủ động dùng ảnh là quyền lựa chọn theo ngữ cảnh, không nghĩa vụ mọi lượt.

- Cận chi tiết: giúp khách thấy phần thêu/ren/đường nét hiện trên ảnh.
- Tổng thể/góc khác: giúp hình dung cách mặc và dáng nhìn từ góc đó.
- Feedback: dùng đúng ảnh khách đã được nguồn xác nhận; không biến một ảnh thành nhận xét “ai mua cũng khen” hoặc bảo đảm người khác mặc vừa.
- Không có đúng loại: trả lời ngắn đúng khả năng, tiếp tục phần tư vấn có ích; không giả ảnh catalog là feedback hoặc lặp gọi tool chỉ để lấy cho đủ.

Model chỉ cần `view_product_media` nếu lời tư vấn phụ thuộc chi tiết nhìn trong ảnh mà metadata/mô tả chưa cung cấp. Muốn khách nhận ảnh thì phải select; view không gửi. Gửi theo metadata không đồng nghĩa model đã nhìn. Giữ cùng owner, giới hạn vision/tool hiện hành và final group gate. Không suy mềm/thoáng/độ bền từ pixel; không sử dụng ảnh làm nguồn giá/policy.

Tách thay đổi selector khỏi thử prompt. Nếu audit chứng minh nguồn có nhiều góc nhưng GENERIC chọn hai ảnh cùng góc, sửa tối thiểu tại selector hiện hữu theo metadata: giữ ảnh chính, ưu tiên ảnh bổ sung khác góc đã biết; nếu không có thì không bịa metadata. Trước khi sửa shared `image-selection.ts`, kiểm consumers để tránh làm lệch các mục đích khác. BACK/DETAIL/FEEDBACK vẫn chọn đúng loại, không tráo bằng GENERIC. Không thêm tool mới, framework media hoặc phụ thuộc similarity mới.

Không thêm nguồn mới để giải quyết mọi suy luận. Chỉ đưa vào danh sách bổ sung dữ liệu những thiếu hụt đã xác nhận: ảnh đúng loại, góc/màu/part đã duyệt. Quy trình xuất bản hiện hữu giữ quyền xác nhận; không tự publish trong scope này.

**Đạt:** đúng sản phẩm/loại/phần/màu theo scope; actual delivery capture chứa đúng ảnh; lời dẫn phục vụ nỗi lo hiện tại và không lộ mã/hệ thống. Gửi đúng ảnh và ảnh giúp bán hàng là hai kết quả riêng.

## 4. Khôi phục các đường bán hàng đang bị gián đoạn (reuse kế hoạch cũ)

- Discovery: dùng descriptions sàng ứng viên trước khi mở nhiều offers. Không tăng bound vì chưa tìm được đồ phù hợp; không ép short thành phù hợp mọi môi trường làm việc. Nếu lựa chọn thực sự phụ thuộc dress code thì hỏi đúng điểm đó.
- Tool-mode: inspect generation cuối đã có mode NONE và toolsAllowed=false thực ở wire chưa. Không gọi tool trái quyền dù model trả functionCall. Chỉ sửa adapter nếu có sai contract được tái hiện, không đổ lỗi cho văn phong hoặc thêm retry.
- Deadline: thống nhất shop không nhận cam kết với khẳng định chắc chắn giao trễ; kiểm bốn controls đã có trong kế hoạch. Không đổi verifier chỉ để tăng tỷ lệ gửi.
- Negotiation: kết quả repeat đã dùng đúng ưu đãi với code không đổi; quote-order vẫn là giả thuyết. Giữ thí nghiệm riêng nếu làm, không gộp reorder vào bản giọng/media rồi nhận đã chữa nguyên nhân.
- Lỗi malformed/transport giữ trong denominator; không chấm draft không tồn tại là lời tư vấn kém.

## 5. Bộ kiểm hữu hạn, không tăng corpus sau mỗi lỗi

Giữ full39 hiện có làm regression. Chuẩn bị thêm **4 lượt media**, reuse gallery mở đầu nếu hợp lý: xin ảnh phần thêu; xin ảnh khách mặc; xin mặt sau; ca phân vân về họa tiết với đủ ảnh tổng thể để kiểm chủ động dùng ảnh. Mỗi lời khách chỉ một nhu cầu tự nhiên; nếu nối tiếp thì dùng accepted history thực và chỉ chạy khi prerequisite đã xảy ra. Không dựng lời khách giả vờ nhận ảnh chưa gửi.

| Population | Capability thực | Phạm vi kết luận |
|---|---|---|
| B1 thường 24 | read-only tools, không media | Regression chữ, không chứng minh tư vấn nhờ ảnh |
| Advice4 × hai arm | toolsOFF, không catalogImages | So prompt trên cùng dữ liệu chữ |
| Stateful/openings/negotiation | ingress hiện hữu, tools theo quyền từng lượt | Tác vụ/history/delivery capture thực |
| Bốn media additions | ingress/journey hiện hữu có select_product_media và view_product_media | Đúng bốn lượt chức năng/chất lượng media, chưa conversion hay lợi ích nhân quả |

Bốn lượt bổ sung là bốn conversation độc lập với sản phẩm đã bind từ catalog; lời khách không giả vờ đã nhận ảnh. Trước freeze kiểm wire có media tools, source binding và đủ hai tool rounds/sáu calls cho đường đi dự kiến; xem và chọn ảnh độc lập có thể batch, không cần tăng bound. Không nối media vào B1 hoặc bật nhánh image-comparison để giả thành baseline39 mới. Thiếu ảnh thật thì báo source gap, không thêm ảnh giả vào provider corpus.

Freeze lời khách, products/source và tiêu chí trước kết quả. Không yêu cầu câu trả lời cố định hoặc một món duy nhất. Trường hợp nguồn không có ảnh đúng loại vẫn nằm trong báo cáo; không thay sản phẩm sau khi thấy fail để kiếm PASS. Chọn trước ít nhất một nguồn thật có cận chất/feedback nếu audit tìm thấy; nếu không có thì chỉ có bằng chứng xử lý thiếu nguồn, chưa có bằng chứng gửi loại ảnh đó.

Chấm actual reply + attachments + bước thực hiện, theo câu hỏi:

1. Đã giải quyết điều khiến khách hỏi/phân vân chưa?
2. Lựa chọn và lý do có hợp với toàn hội thoại, giúp khách tiến tới mua không?
3. Ảnh có cung cấp điều hữu ích hơn lời nói, đúng scope và được gửi thật qua capture không?
4. Giọng có giống tin nhắn shop, có ý thừa hoặc từ quảng cáo gượng không?
5. Bước tiếp có dùng được, an toàn và trong khả năng bot không?

Không cộng điểm keywords hoặc đòi mọi lượt có đủ năm cấu phần. Tách kết quả giao dịch, quyết định mua, giọng và media; safety vẫn chặn sai giá/quyền/effect. Manual review xem toàn lượt, không lấy SEND_ELIGIBLE làm chất lượng PASS; nếu có thể ẩn arm trước khi chấm. Báo cả neutral và regression, không chỉ case đẹp.

Report có cột riêng `giao dịch/quyết định`, `giọng cần sửa`, `media`, `bằng chứng toàn lượt`. Một ca có thể dùng được về tác vụ nhưng còn dài/gượng; tổng USABLE không che finding giọng. Đây là ghi nhận thủ công, không thêm judge/gate/thang điểm runtime.

**Dự kiến khi có yêu cầu chạy:** advice4 × 2 arms = 8 diagnostic outcomes, tối đa16 generation requests, độc lập full. Native full39 + 4 media bổ sung = tối đa43 lượt (42 public + 1 private), tối đa168 generation requests theo bound 3 owner + 1 verifier/public. Đây là đề xuất mới, chưa dispatch; không gộp vào cap cũ hoặc gọi tất cả là một campaign. Các lượt prerequisite phải nằm trong43; nếu runner cần lượt khác thì sửa đăng ký trước khi chạy. Quote/ETA diagnostic không tự cộng vào ngân sách này. Không auto rerun, không chọn best-of-N.

## 6. Verification và thứ tự thực hiện

Sau audit, advice và media là hai nhánh độc lập. Advice: chọn candidate có căn cứ rồi đối chiếu, hoặc giữ prompt nếu chưa có treatment rõ. Media: triển khai phần có bằng chứng ngay cả khi advice chưa chọn được candidate. Sau đó hoàn thiện contract fix có bằng chứng và full regression khi được yêu cầu. Không coi ảnh là thuốc chữa mọi câu trả lời, không gộp các thay đổi rồi tuyên bố nguyên nhân đã chứng minh.

Files dự kiến: owner prompt, `gemini-inference.mjs`, tests adapter; media selector/tests chỉ nếu cần; corpus/eval hiện hữu. Không tạo runtime sales planner, labels chấm điểm, durable state hoặc role mới.

Kiểm theo phần thực sự thay:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu đổi shared selector: chạy focused image-selection tests và typecheck/build của package theo scripts thực trong repo; bảo toàn callers hiện hữu. Logic mới cần observed RED→GREEN; không dùng test đếm từ để chứng minh naturalness. Clean executable/config và freeze SHA/hashes trước provider, giữ request accounting và evaluator firewall sẵn có. Không chạy test/build/provider trong lượt chỉ viết kế hoạch này.

## Self-review kế hoạch

- Giữ một owner và một verifier; model chọn lời/ý/ảnh, code xác minh nguồn và thực thi. Không keyword router, parser hoặc template theo case.
- Tool framing và chất lượng tư vấn là giả thuyết có kiểm soát; không giả nguồn media đã đủ.
- Không tăng tool/subject bounds; không thêm inventory summary vào model context trước khi chứng minh thiếu thông tin cần thiết.
- Kế hoạch cũ còn việc chưa triển khai; tài liệu này không được dùng để báo đã fix hoặc đóng source gaps.
- Bán thêm hợp lý được chấp nhận, nhưng đủ ngân sách không tự là lý do mua. Không ép chọn rẻ nhất hoặc đưa câu hỏi chốt khi khách chưa cần.
- Không chuyển 34/39 thành conversion; chưa đề xuất B GO hay gửi khách thật. Các số request là trần dự kiến, không phải kết quả hoặc lệnh chạy.
