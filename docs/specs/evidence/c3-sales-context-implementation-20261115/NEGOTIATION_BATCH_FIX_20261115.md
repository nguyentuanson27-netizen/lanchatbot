# Phase C — Đồng bộ contract batch thương lượng và chạy lại, 2026-11-15

Đã sửa batch thương lượng W3, chạy J4 năm lần và control hai áo một lần. Savepoint đầu `09ac48e74f26439d7b1c3544bd19ba5a4c525593` lộ thêm hai chỗ tương thích W3; bản cuối `9d5108ca1c3f4c576c86d43108b09b3744609690` sửa cả hai và chạy lại nguyên bộ sáu attempt. Kết quả cả hai lượt được giữ.

## Phần code đã sửa và kiểm

- Batch quote nhận RECORD có action/subjectRef/offerType và các action APPLY_PENDING/CANCEL_PENDING với pendingRef. Giữ trường hợp RECORD cũ không có action. Từ chối field ngoài contract, action sai, pendingRef sai, trộn tham số record vào pending hoặc đảo thứ tự writer.
- Wrapper handoff nhận receipt NEGOTIATION_REQUEST_RECORDED và NEGOTIATION_REQUEST_INVALIDATED cùng loại NEGOTIATION_UPDATED cũ. Vẫn đối chiếu operationId, trạng thái SUCCESS, đúng revision hiện hành, scope, permission, privacy và BOT ownership; revision do tác nhân khác đổi vẫn bị chặn.
- Hai nhánh JSON schema record và pending được đóng riêng. Field sourceQuote/intent/subjectRef/offerType thuộc nhánh RECORD, kích hoạt/hủy chỉ nhận action/pendingRef. Các tham số sinh sai tiếp tục bị runtime từ chối.
- Quan sát RED trước khi sửa cho bốn nhánh batch, hai nhánh receipt và schema nhận nhầm tham số. Sau sửa, 478 test worker tập trung và 83 test adapter PASS. Worker build, tsc --noEmit và lint PASS. Test tích hợp đi qua record+quote, tạo giỏ, activate+quote và gọi lặp không cấp hai lần.

Đã kiểm tài liệu chính thức cho parametersJsonSchema và anyOf trước khi điều chỉnh schema. [Google FunctionDeclaration](https://googleapis.github.io/js-genai/release_docs/interfaces/types.FunctionDeclaration.html), [Function calling](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling).

## Hai lượt đã chạy

| Bản | Attempts / lượt khách | Request owner+verifier | Gửi được | Handoff | Không gửi |
| --- | ---: | ---: | ---: | ---: | ---: |
| 09ac48e7 · batch | 6 / 18 | 37 | 8 | 5 | 5 |
| 9d5108ca · đầy đủ W3 | 6 / 18 | 44 | 10 | 4 | 4 |

Mỗi lượt dùng Gemini 3.5 Flash Lite High cho owner và GPT‑6.1 Sol High cho verifier. 0 provider error trong native, 0 automatic retry, live send 0. Hai DB initial state và bốn DB native đều đã drop. Lượt sau dùng lại world `6b0c5c9f78bcaea8e53ee53776be6be72e8926ebe271c376db2523938344af10`, kiểm freshness trên clock thật ở preflight và mỗi generation, không gia hạn thời gian dữ liệu nguồn.

## Kết quả bản cuối

- **Bộ kiểm batch và receipt đã qua đường thật.** Cả năm J4 đều lưu pending thành công. Không còn COMMITTED_AUTHORITY_CHANGED sau khi ghi pending; những batch record+quote được thực thi khi model chọn chúng.
- **J4 hoàn thành 1/5.** Lần 4 đi đủ ba lượt, báo đúng 499.000đ + 30.000đ ship Cần Thơ = 529.000đ. Bốn lần còn lại bị verifier từ chối các khẳng định Trắng sẵn/Be đặt trước vì snapshot sau record_negotiation chưa có căn cứ màu tương ứng. Đây là vấn đề context màu giữa các bước, còn tồn tại sau sửa contract.
- **Control hai áo đã tạo đúng giỏ và kích hoạt yêu cầu cũ một lần ở lượt 3.** Có đúng một CART_OPENED và NEGOTIATION_EVENT; pending chuyển PENDING → ACTIVATED, cùng id và sourceObservedAt gốc. Tổng cuối 948.100đ khớp giỏ revision 2. Lượt 2 còn TOOL_ARGUMENTS với tham số pending sai, nên kích hoạt chậm một lượt; chưa đạt yêu cầu áp dụng ngay sau tạo giỏ.
- Câu cuối control vẫn nhắc phí vận chuyển danh nghĩa 30.000đ mà chưa giải thích đã được miễn ship. Cart lưu shippingFeeVnd 30.000đ và adjustment FREE_SHIPPING 30.000đ; tổng giảm 79.900đ gồm 49.900đ ưu đãi số lượng và 30.000đ miễn ship. Tổng cuối đúng, cách trình bày quyền lợi còn thiếu rõ ràng. Lượt đầu vẫn có cụm “hệ thống xem xét”.

Native giữ **STOP**. Kết quả đã chứng minh sửa contract đi qua runtime, chưa đạt ổn định toàn hành trình J4 hay timing của control hai áo.

## Chấm và accounting

- Bản batch đầu: 6/6 packet có điểm hợp lệ, 6 request judge. Trạng thái {"OK":6}.
- Bản cuối: 5/6 packet có điểm hợp lệ, 6 request judge. Trạng thái {"OK":5,"PROVIDER_ERROR":1}.

Một packet J4 lần 2 của bản cuối gặp UPSTREAM_TRANSPORT, 1 request và không retry. Mẫu số vẫn là 5 J4; trace runtime đã ghi nhận handoff nên không tính lần thiếu điểm là đạt. Judge offline dùng đúng GPT‑6.1 Sol High, rubric/schema/packet hash được khóa riêng trước dispatch. Giữ đầy đủ trạng thái lỗi.

Tổng hai lượt có 81 request native và 12 request judge. Audit mọi trace, model, request hash, evaluator firewall, exact draft đã gửi và provider count PASS. Lệnh thực chạy gồm focused Vitest/adapter ở trên; worker build/typecheck/lint; capture-world.mjs đọc 107 sản phẩm; isolated-integration --phase-c-initial-world; prepareContextRegistration / sealContextRegistration / diagnosticPreflight; sales-context-screen native-dispatch; audit.mjs; judge.mjs prepare / run. Output JSON và commands cục bộ giữ mẫu số và run identity. Không chạy qualification.

## Toàn bộ hội thoại của hai lượt

Bản Markdown bỏ khoảng trắng cuối dòng. JSON gốc và raw trace giữ nguyên text, binding và telemetry.

### Bản batch 09ac48e7

#### c-20261028-j4 · lần 1

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, mẫu áo Thạch Thảo size M hiện có 2 màu là **Trắng** (sẵn hàng) và **Be** (hàng đặt trước - pre-order). Chị lấy áo màu nào để em thêm vào giỏ cho chị nhé ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng hai lựa chọn từ tool và có ảnh hợp lệ. Yêu cầu hỗ trợ chỉ được ghi PENDING, chưa có receipt áp dụng ưu đãi; không tự giảm tiền, freeship hay nhận đã thanh toán. Tuy nhiên HANDOFF rồi NO_SEND khiến khách chưa được trả lời tổng gửi Cần Thơ (giá áo 499.000đ + ship 30.000đ, chưa có ưu đãi được duyệt), nên mạch bán hàng chưa hoàn thành. Việc im lặng sau khi HUMAN nhận quyền không vi phạm an toàn thao tác.

#### c-20261028-j4 · lần 2

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo thạch thảo size M nhà em có 2 màu: Trắng (sẵn hàng) và Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 2 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng lựa chọn AO size M từ tool. Lượt 2 lỗi readback rồi chuyển HUMAN; receipt chỉ ghi nhận yêu cầu hỗ trợ, không cấp giảm giá. Lượt 3 im lặng đúng quyền sở hữu, không bịa concession hay thanh toán, nhưng khách vẫn chưa được trả lời tổng tiền gửi Cần Thơ (giá áo 499.000đ, ship chuẩn 30.000đ), nên chưa hoàn thành nhu cầu mua.

#### c-20261028-j4 · lần 3

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo size M hiện có 2 màu: màu Trắng (sẵn hàng) và màu Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng lựa chọn tool và có ảnh. Receipt chỉ ghi nhận yêu cầu hỗ trợ đang chờ, chưa cấp giảm giá; không có tự giảm tiền, freeship hay nhận đã thanh toán. Tuy nhiên, handoff ở lượt 2 khiến câu hỏi tổng gửi Cần Thơ chưa được trả lời dù có nguồn giá áo 499.000đ và ship 30.000đ (529.000đ trước hỗ trợ). Lượt 3 im lặng đúng trạng thái HUMAN sở hữu, nhưng toàn hội thoại chưa hoàn thành nhu cầu khách.

#### c-20261028-j4 · lần 4

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ set Thạch Thảo size M có hai màu là Trắng (có sẵn) và Be (đặt trước). Chị thích màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 2 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng bằng chứng áo M trắng có sẵn và be đặt trước. Yêu cầu hỗ trợ mới chỉ được ghi nhận chờ có giỏ, chưa có receipt áp dụng ưu đãi; không tự giảm tiền hay freeship. Tuy nhiên, handoff im lặng khi còn có thể hỏi chốt màu làm đứt mạch bán hàng, rồi câu hỏi tổng gửi Cần Thơ không được trả lời (giá áo 499.000đ + ship 30.000đ = 529.000đ khi chưa có hỗ trợ được duyệt). NO_SEND cuối đúng trạng thái HUMAN, không có thông tin sai hoặc thao tác tài chính sai có hậu quả.

#### c-20261028-j4 · lần 5

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo thêu Set váy Thạch Thảo size M có 2 màu là **Trắng** (sẵn hàng) và **Be** (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng kết quả tool: áo M trắng sẵn hàng, be đặt trước. Yêu cầu hỗ trợ chỉ có receipt ghi nhận chờ xử lý, chưa có quyền giảm tiền; bot không tự giảm hay freeship. Handoff rồi im lặng phù hợp trạng thái HUMAN thực tế, nhưng hội thoại chưa đáp ứng câu hỏi tổng gửi Cần Thơ (giá áo 499.000đ và phí ship mặc định 30.000đ), nên chưa hoàn thành việc bán.

#### c-context-two-units · lần 1

- Khách: Chị lấy hai áo Thạch Thảo size M, shop bớt thêm cho chị được không?
  - Shop: Dạ, áo lẻ Thạch Thảo có giá 499.000đ/cái (2 áo là 998.000đ ạ). Yêu cầu hỗ trợ giá của chị em đã ghi nhận để hệ thống xem xét. Chị có muốn em thêm 2 áo size M này vào giỏ hàng luôn không ạ?
  - Terminal: SEND_ELIGIBLE · 2 ảnh
- Khách: Lấy trắng em nhé.
  - Shop: Dạ, em đã thêm 2 áo trắng Thạch Thảo size M vào giỏ hàng cho chị rồi ạ.

    Tổng đơn của chị là 978.100đ (gồm 998.000đ tiền áo, đã áp dụng ưu đãi 49.900đ và 30.000đ phí vận chuyển). Chị kiểm tra lại giỏ hàng giúp em nhé ạ!
  - Terminal: SEND_ELIGIBLE
- Khách: Cả ship hết bao nhiêu em?
  - Shop: Dạ, phí vận chuyển của đơn là 30.000đ, tổng cộng tiền hàng và ship sau khi áp dụng ưu đãi là 978.100đ ạ.
  - Terminal: SEND_ELIGIBLE

Judge: Lượt đầu ghi nhận yêu cầu hỗ trợ trước giỏ đúng receipt, chưa hứa cấp giảm. Lượt hai tạo đúng 2 áo trắng M, nhưng record_negotiation bị từ chối và pending vẫn NOT_EVALUATED/PENDING: chưa xử lý xong yêu cầu bớt giá đã lưu. Khoản giảm 49.900đ là ưu đãi số lượng, không phải bằng chứng đã áp dụng pending. Tổng 978.100đ gồm ship được báo đúng giỏ hiện hành ở lượt hai và ba; không có lỗi nhân đơn vị hay cộng trùng giỏ. Giọng lịch sự, rõ và vừa đủ.


### Bản cuối 9d5108ca

#### c-20261028-j4 · lần 1

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ áo size M của set váy Thạch Thảo có 2 màu **Trắng** (sẵn hàng) và **Be** (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, đúng nguồn: áo M trắng sẵn hàng, be đặt trước. Yêu cầu hỗ trợ chỉ được ghi nhận pending, chưa có receipt áp dụng ưu đãi; không tự giảm tiền hay freeship. Tuy nhiên handoff ở lượt 2 làm ngắt việc mua khi vẫn có thể hỏi tiếp màu; lượt cuối im lặng đúng quyền HUMAN nhưng khách chưa được báo tổng cơ bản 529.000đ (499.000đ áo + 30.000đ ship Cần Thơ), chưa tính hỗ trợ nào được duyệt. Không có claim thanh toán hay báo giá đã gửi giả.

#### c-20261028-j4 · lần 2

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo size M có màu Trắng (có sẵn) và màu Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Thiếu điểm · PROVIDER_ERROR · UPSTREAM_TRANSPORT

#### c-20261028-j4 · lần 3

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo thêu Set váy Thạch Thảo size M có màu Trắng (hàng có sẵn) và màu Be (đặt trước). Chị lấy màu nào để em thêm vào giỏ ạ?
  - Terminal: SEND_ELIGIBLE · 2 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu tự nhiên, đúng lựa chọn áo M trắng có sẵn/be đặt trước từ tool. Tuy nhiên, sau khi ghi nhận xin hỗ trợ, hội thoại chuyển người thật rồi im lặng, nên chưa giải quyết yêu cầu báo tổng về Cần Thơ dù có nguồn giá và phí ship: tổng cơ sở 529.000đ (499.000đ + 30.000đ). Receipt chỉ ghi nhận hỗ trợ đang chờ, chưa áp dụng ưu đãi. Không có thông tin sai, tự giảm tiền, freeship hay xác nhận thanh toán; lỗi chính là chưa hoàn thành nhu cầu khách.

#### c-20261028-j4 · lần 4

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo size M có hai màu là **Trắng** (sẵn hàng) và **Be** (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo có giá 499.000đ ạ. Em đã ghi nhận yêu cầu hỗ trợ giá của chị nhé.

    Chị chọn màu Trắng (sẵn hàng) hay Be (đặt trước) cho áo size M ạ?
  - Terminal: SEND_ELIGIBLE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Shop: Dạ, một áo lẻ Set váy Thạch Thảo gửi về Cần Thơ có giá 499.000đ, phí vận chuyển 30.000đ, tổng cộng là 529.000đ ạ.

    Chị lấy áo size M màu **Trắng** (sẵn hàng) hay màu **Be** (đặt trước) ạ?
  - Terminal: SEND_ELIGIBLE

Judge: Hỏi đúng màu còn thiếu, phân biệt Trắng sẵn hàng và Be đặt trước theo tool. Yêu cầu hỗ trợ giá đã được ghi nhận bằng receipt, không bị biến thành giảm giá hay freeship khi chưa được duyệt. Báo đúng một áo AO 499.000đ + ship Cần Thơ 30.000đ = 529.000đ theo quote hiện tại; không nhận đã chốt đơn hay thanh toán. Lời thoại gọn, tiếp tục hỏi màu hợp lý vì khách chưa chọn.

#### c-20261028-j4 · lần 5

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo size M có 2 màu là Trắng (có sẵn) và Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · FAIL
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, tự nhiên, đúng lựa chọn Trắng có sẵn/Be đặt trước từ tool. Yêu cầu hỗ trợ mới được ghi nhận chờ xử lý, chưa có receipt cấp giảm; không tự giảm tiền, freeship hay nhận đã thanh toán. Tuy nhiên handoff làm đứt mạch bán dù đủ nguồn, nên khách chưa được trả lời tổng một áo gửi Cần Thơ là 499.000 + 30.000 = 529.000đ trước hỗ trợ. Lượt cuối im lặng đúng quyền HUMAN nhưng nhu cầu báo tổng vẫn chưa hoàn thành.

#### c-context-two-units · lần 1

- Khách: Chị lấy hai áo Thạch Thảo size M, shop bớt thêm cho chị được không?
  - Shop: Dạ, áo Thạch Thảo có giá 499.000đ/chiếc chị ạ. Yêu cầu hỗ trợ giá của chị em đã ghi nhận lại để hệ thống xem xét ạ.

    Khi chị mua từ 2 sản phẩm, đơn hàng được áp dụng ưu đãi giảm 5% (giảm 49.900đ), tính cả phí vận chuyển 30.000đ thì tổng thanh toán cho 2 áo size M là 978.100đ chị nha. Chị chốt lấy 2 áo này thì báo em để em hỗ trợ thêm vào giỏ hàng cho mình nhé ạ!
  - Terminal: SEND_ELIGIBLE · 2 ảnh
- Khách: Lấy trắng em nhé.
  - Shop: Dạ, em đã thêm 2 áo Thạch Thảo màu trắng size M vào giỏ hàng cho chị rồi ạ.

    Tổng thanh toán của đơn là 978.100đ (đã gồm ưu đãi giảm 5% và phí vận chuyển 30.000đ). Chị chốt đơn hoặc cần em hỗ trợ thêm thông tin nào thì báo em nhé ạ!
  - Terminal: SEND_ELIGIBLE
- Khách: Cả ship hết bao nhiêu em?
  - Shop: Dạ, tổng thanh toán gồm cả phí vận chuyển 30.000đ của đơn là 948.100đ chị nhé ạ! Chị có muốn chốt đơn luôn không ạ?
  - Terminal: SEND_ELIGIBLE

Judge: Giọng lịch sự, dễ hiểu. Lượt đầu lưu pending đúng, báo 978.100đ theo ưu đãi số lượng 5%, không nhận là đã cấp hỗ trợ thêm. Khi khách chọn trắng, giỏ đúng hai áo M nhưng thao tác hỗ trợ bị từ chối và pending vẫn PENDING; chưa hoàn tất yêu cầu hỗ trợ ngay lượt này, khiến khách được báo mức cao hơn 30.000đ. Lượt cuối đã kích hoạt yêu cầu cũ đúng một lần, giỏ revision 2 và tổng 948.100đ khớp receipt; không coi các lần tool bị từ chối trước đó là thất bại cuối cùng. Nên nói rõ đã được miễn ship thay vì tiếp tục nhấn phí 30.000đ.
