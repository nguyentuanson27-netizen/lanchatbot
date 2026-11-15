# Phase C — Chạy lại các ca lỗi, 2026-11-15

Source `3814464c9558d035da7a1818e3bc3c4223fcd331`. Chạy 9 lần thử / 21 lượt khách theo yêu cầu owner, giữ prompt, owner Gemini 3.5 Flash Lite High và verifier GPT‑6.1 Sol High.
Kết quả **STOP**. 8 lượt gửi được, 6 handoff và 7 không gửi do quyền đã chuyển HUMAN. 30 generation native, 0 provider error, 0 retry. DB initial state và hai DB native đã drop, live send 0.

Phạm vi gồm J4 năm lần từ đầu, S15 lần 4 và 5, control hai áo, control khách đã chấp nhận đặt trước. Chọn lại đúng các lần chưa đạt/cần xem, không tăng N và không chạy lại các ca đã qua. Config gốc vẫn N=5; campaign mới khóa 9 slot được chọn, trần 84 generation native.

## Kết quả và nguyên nhân đã kiểm tra

- **J4 vẫn chưa hoàn thành 5/5.** Cả năm lượt xin hỗ trợ đều bị code chặn cùng batch record_negotiation + quote_product, rồi bàn giao. Năm lượt hỏi tổng tiếp theo không gửi do đã chuyển HUMAN.
- **Control hai áo chưa đạt.** Lượt đầu bị chặn cùng batch như J4, nên không lưu pending, không tạo giỏ và hai lượt sau không gửi.
- **S15 gửi được cả hai lần.** Lần 4 trước đây gặp lỗi chuẩn bị nay trả được đúng giá, hàng đặt trước và lưu sở thích bằng receipt thật. Lần 5 đúng dữ kiện nhưng lời đáp còn kể chất liệu và chào bán khi khách chỉ bày tỏ thích áo.
- **Control đặt trước** trả đúng 699.000đ, có ảnh, nhưng tiếp tục nhắc điều khách đã xác nhận rồi đọc đoạn mô tả dài. Judge vẫn chấm chưa đạt giọng.

Mình đã diễn giải sai OWNER_TOOL_MODE trong báo cáo trước khi gán nguyên nhân cho việc gọi tool ở chế độ final-only. Wire thật của cả sáu lượt lỗi này vẫn là AUTO. Kiểm hàm quoteBatchWork trên chính các calls đã ghi đều trả null. Bộ kiểm batch trong single-agent-commerce-quote.ts chỉ nhận intent/sourceQuote cho record_negotiation, trong khi contract W3 công bố thêm action, subjectRef, offerType. Khi bỏ riêng các field mới trong phép kiểm offline, cả sáu batch đều được hàm tính là hai đơn vị. Phép thử này chỉ xác định chỗ không khớp contract, chưa thực thi hoặc cấp quyền cho lời gọi đã sửa.

## Chấm lại J2 bằng trace đã có

Không gọi lại owner/verifier cho J2. Chấm lại năm cặp hành trình cũ, bổ sung kết quả tool, SIZE_FIT đúng revision, trạng thái trước/sau và ledger/receipt vào packet. Bỏ riêng mô tả capability componentSizing lỗi thời. Những thay đổi này chỉ vào evaluator.

| Arm J2 cũ | Whole/giọng đạt | Dữ kiện đạt |
| --- | ---: | ---: |
| baseline | 2/5 | 4/5 |
| candidate | 2/5 | 5/5 |

Judge xác nhận candidate chọn M theo engine đúng hồ sơ cả năm hành trình. Các lần còn trượt chủ yếu vì đọc lại số đo, lặp câu mời chuẩn bị cả bộ, hoặc giọng máy móc. Ở baseline lần 2, lời “đảm bảo vừa vặn, thoải mái và giữ form đẹp” bị chấm vượt căn cứ. Các điểm này là chấm lại với packet đầy đủ hơn, không trộn thành mẫu sinh mới.

## Cấu hình chấm và evidence

14 packet gồm 9 attempt mới và 5 cặp J2 đã lưu. Mỗi packet một generation GPT‑6.1 Sol High, 14/14 phản hồi và JSON hợp lệ, không retry. Rubric hash `95f8bb5e0e436fa5fc7d6286fb34028e6d631f54e4549b4f1984db8a24c01d88`, schema hash `79b1d3bac15af9cf8355a8dd65320befddb775d5ef055a6cd3d34e5162139b29`, packet hash `9b99a79f9ce04312a6c148305f50c4d3111aa01f288af0d4c8d2e2af1930433e`. Trước dispatch judge, tăng riêng giới hạn packet offline từ 128 KiB lên 256 KiB để chứa bằng chứng động, packet lớn nhất 180.692 byte. Giữ cả bản chuẩn bị cũ. Judge dùng 495312 input token / 10878 output token.

Registration/campaign mới khóa trước native. World cũ `34129a0e761c32abae440f84fe934a91b8e4468c75b8abdca51eaebcd7195532` còn hiệu lực tại preflight và dispatch; không sửa timestamp của dữ liệu nguồn. Audit từng trace kiểm source hash, model, request hash, evaluator firewall, draft đã gửi và provider accounting đều PASS. Harness chỉ bổ sung cách chọn lại slot đã đăng ký, test focused 8/8 PASS.

Lệnh thực chạy gồm isolated-integration.mjs --phase-c-initial-world, prepareContextRegistration / sealContextRegistration / diagnosticPreflight, sales-context-screen.mjs native-dispatch, TARGETED_AUDIT và BATCH_CONTRACT_AUDIT offline, judge-v2.mjs prepare / run qua transport Codex đã khóa 0.159.2. Không chạy qualification.

## Hội thoại mới

Bản Markdown bỏ khoảng trắng cuối dòng; JSON cục bộ giữ nguyên text, source và request hash.

### c-20261028-j4 · lần 1

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ set Thạch Thảo size M có hai màu Trắng (sẵn hàng) và Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, tự nhiên, đúng kết quả áo M trắng sẵn/Be đặt trước. Tuy nhiên, handoff khi khách xin hỗ trợ làm mạch bán hàng dừng; câu hỏi tổng gửi Cần Thơ không được trả lời dù có giá áo 499.000đ và ship 30.000đ, tổng cơ bản 529.000đ. Không tự áp giảm giá, freeship hay nhận đã thanh toán; lượt cuối im lặng đúng trạng thái HUMAN nhưng toàn hội thoại chưa hoàn thành nhu cầu khách.


### c-20261028-j4 · lần 2

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ size M nhà em có 2 màu là Trắng (có sẵn) và Be (đặt trước). Chị thích màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu ngắn gọn, đúng kết quả tool: trắng có sẵn, be đặt trước. Sau đó HANDOFF rồi im lặng khiến yêu cầu hỗ trợ và hỏi tổng tiền chưa được giải quyết, dù nguồn đủ tính một áo 499.000đ + ship 30.000đ = 529.000đ trước hỗ trợ. Không có receipt ưu đãi nhưng cũng không tự giảm tiền, freeship hay nhận khách đã thanh toán; thiếu hoàn thành, chưa có sai factual/action gây hậu quả.


### c-20261028-j4 · lần 3

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ size M của set Thạch Thảo có sẵn màu Trắng và màu Be (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, tự nhiên; áo M trắng có sẵn và be đặt trước đúng kết quả tool. Sau đó HANDOFF rồi NO_SEND khiến yêu cầu hỗ trợ giá và tổng gửi Cần Thơ chưa được trả lời dù đủ nguồn tính 499.000 + 30.000 = 529.000đ. NO_SEND đúng trạng thái HUMAN nhưng mạch bán hàng chưa hoàn thành. Không tự áp dụng giảm giá, freeship, concession chưa có receipt hay nhận đã thanh toán.


### c-20261028-j4 · lần 4

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo size M của set váy Thạch Thảo có hai màu là **Trắng** (hàng có sẵn) và **Be** (hàng đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi màu gọn, tự nhiên, đúng kết quả tool: áo M trắng có sẵn, be đặt trước. Tuy nhiên, handoff ở yêu cầu hỗ trợ rồi im lặng khi khách hỏi tổng khiến nhu cầu mua chưa được giải quyết; tổng cơ sở là 499.000đ + 30.000đ ship = 529.000đ, chưa có receipt ưu đãi. Không tự giảm giá, freeship, nhận đã thanh toán hay viện dẫn quote chưa gửi; lỗi chính là thiếu hoàn thành, không phải sai thông tin.


### c-20261028-j4 · lần 5

- Khách: Chị lấy áo của bộ váy Thạch Thảo size M.
  - Shop: Dạ, áo lẻ Set váy Thạch Thảo size M hiện có 2 màu: **Trắng** (sẵn hàng) và **Be** (đặt trước). Chị lấy màu nào ạ?
  - Terminal: SEND_ELIGIBLE · 1 ảnh
- Khách: Shop hỗ trợ thêm cho chị được chút nào không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Vậy một áo size M, gửi về Cần Thơ thì hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Lượt đầu hỏi chọn Trắng sẵn hàng hay Be đặt trước đúng kết quả tool, gửi ảnh hợp lệ. Sau đó handoff và im lặng khiến yêu cầu hỗ trợ giá, tính tổng gửi Cần Thơ bị bỏ dở dù có nguồn giá áo 499.000đ và ship 30.000đ; cần báo tổng 529.000đ và tiếp tục chốt màu. Không tự giảm giá, freeship hay nhận đã thanh toán; lượt cuối không gửi đúng trạng thái HUMAN nhưng toàn mạch chưa hoàn thành việc khách cần.


### c-20261028-s15 · lần 4

- Khách: Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.
  - Shop: Dạ em ghi nhận chị thích mẫu áo Thạch Thảo màu be ạ. Áo lẻ có giá 499.000đ (hàng đặt trước). Chị có cần em tư vấn thêm về size áo không ạ?
  - Terminal: SEND_ELIGIBLE

Judge: Xác nhận đúng sở thích màu be, có receipt cập nhật hồ sơ và state tương ứng; không tự tạo giỏ hay đơn. Giá áo lẻ 499.000đ và tình trạng đặt trước khớp kết quả đọc offer AO. Lời đáp lịch sự, gọn, chỉ mở lời tư vấn size chứ không ép chốt mua.


### c-20261028-s15 · lần 5

- Khách: Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.
  - Shop: Áo lẻ Thạch Thảo màu be có giá 499.000đ, chất liệu tơ Hàn thêu cao cấp mềm mại, bay bổng và rất tôn dáng ạ. Mẫu này hiện là hàng đặt trước (pre-order). Chị cần em tư vấn size nào không ạ?
  - Terminal: SEND_ELIGIBLE

Judge: Khách chỉ nói thích màu be và cảm ơn, nhưng người bán chuyển sang báo giá, quảng cáo chất liệu và hỏi size, chưa đáp đúng nhịp ACK nhẹ nhàng. Giá 499.000đ và trạng thái đặt trước có nguồn tool; không tạo giỏ/đơn hoặc nhận đã lưu sở thích khi chưa có receipt.


### c-context-preorder · lần 1

- Khách: Đặt trước cũng được em. Váy Diệp An bao nhiêu?
  - Shop: Dạ, mẫu Váy Diệp An có giá **699.000đ** và là hàng **đặt trước** chị nha. Váy làm từ chất liệu tơ hoa thêu họa tiết phối tơ ống mềm mại, bay nhẹ, thiết kế 2 lớp kín đáo với form suông nhẹ dễ mặc và tôn dáng lắm ạ.

    Chị muốn lấy size nào để em tư vấn chi tiết cho mình nha chị?
  - Terminal: SEND_ELIGIBLE · 2 ảnh

Judge: Báo đúng giá 699.000đ, đúng tình trạng đặt trước và gửi ảnh có nguồn. Tuy nhiên, khách đã chấp nhận đặt trước và chỉ hỏi giá, người bán vẫn nhắc lại rồi kể dài chất liệu, cấu tạo và form váy, khiến lượt trả lời thiên về đọc catalogue, chưa gọn và sát mạch khách. Không có thông tin hay thao tác sai gây hậu quả.


### c-context-two-units · lần 1

- Khách: Chị lấy hai áo Thạch Thảo size M, shop bớt thêm cho chị được không?
  - Terminal: HANDOFF · OWNER_TOOL_MODE
- Khách: Lấy trắng em nhé.
  - Terminal: NO_SEND
- Khách: Cả ship hết bao nhiêu em?
  - Terminal: NO_SEND

Judge: Nguồn đủ để tiếp tục bán nhưng lượt đầu chuyển người thật, không lưu yêu cầu hỗ trợ trước giỏ. Hai lượt sau đều im lặng: chưa tạo giỏ hai áo trắng size M, chưa áp dụng pending theo receipt và chưa trả lời tổng cả ship. Không có phát ngôn sai hay thao tác cấp giảm sai; vấn đề là bỏ dở nhu cầu mua hàng.


## J2 — lý do chấm lại từng cặp

### J2 · lần 1

- Đối chứng: Đã thay 56kg bằng 51kg, giữ chiều cao 162 và đủ ba vòng trong hồ sơ; lượt cuối lưu RELAXED và chạy lại engine đúng revision, kết quả vẫn là M cho áo. Không có sai lệch size hay thao tác. Tuy nhiên lượt hai đọc lại toàn bộ thông tin khách vừa bổ sung rồi lặp gần nguyên khuôn trả lời trước, làm giọng máy móc.
- Candidate: Trả lời gọn, chọn thông tin ngực và cân nặng mới để xác nhận thay vì đọc lại mọi số đo. Receipt và state chứng minh đã giữ 162cm, cập nhật 51kg cùng ba vòng; sở thích RELAXED được dùng ở revision 5 và engine tiếp tục khuyến nghị M đúng phần áo. Cụm “thoải mái nhất” hơi mạnh nhưng trong mạch này vẫn là lời tư vấn chọn size, không phải cam kết vừa tuyệt đối.

### J2 · lần 2

- Đối chứng: Đã thay 56kg bằng 51kg, giữ chiều cao 162 và số đo 88–70–94; engine trả M đúng hồ sơ ở từng revision, lượt cuối có dùng RELAXED. Lượt 2 đọc lại dàn số khách vừa cung cấp nên hơi máy móc. Lượt 3 biến khuyến nghị M thành lời “đảm bảo vừa vặn, thoải mái và giữ form đẹp”, vượt bằng chứng engine và tạo cam kết về độ vừa thực tế.
- Candidate: Cập nhật đúng 51kg thay 56kg, giữ chiều cao 162 và số đo 88–70–94; chốt M theo engine đúng customer/revision, kể cả khi đã dùng RELAXED. Lượt cuối giải thích bằng đặc tính áo nhẹ, bay, thoáng có nguồn và không đưa bảo đảm tuyệt đối. Tuy nhiên lượt 2 chủ yếu đọc lại toàn bộ số đo vừa nhận, khiến giọng tư vấn máy móc hơn cần thiết.

### J2 · lần 3

- Candidate: Tư vấn gọn, đúng nhu cầu chọn size áo. Hồ sơ đã thay 56kg bằng 51kg, giữ chiều cao 162 và đủ ba số đo; lượt cuối lưu và dùng RELAXED. Cả ba lần chọn M đều khớp engine RECOMMENDED đúng khách và revision. Cách nói hơi lặp nhưng vẫn tự nhiên, không bảo đảm độ vừa tuyệt đối.
- Đối chứng: Cập nhật đúng 51kg, giữ chiều cao và ba số đo; RELAXED được dùng ở revision 5, kết quả M đúng engine qua cả ba lượt. Tuy nhiên lượt hai đọc lại toàn bộ số đo mới, lượt ba lại nhắc ngực, eo và cân nặng trong ngoặc, khiến lời tư vấn nặng tính đọc hồ sơ và máy móc. Không có sai thông tin hay thao tác gây hậu quả.

### J2 · lần 4

- Đối chứng: Đã thay 56kg bằng 51kg, giữ chiều cao 162 và đủ số đo 88–70–94 trong hồ sơ. Lượt cuối lưu RELAXED và chạy lại engine đúng khách, revision 5, vẫn được khuyên áo M. Trả lời đúng nhu cầu, ảnh mở đầu hợp lệ; dẫn chứng vải mềm liên quan sở thích thoải mái. Câu cuối hơi tô đậm và có lỗi gõ “thơ Hàn”, nhưng chưa thành bảo đảm độ vừa tuyệt đối hay lỗi có hậu quả.
- Candidate: Dữ liệu và size đúng: sau các lần bị từ chối ở lượt 2, lần gọi cuối thành công với revision 4, đủ hồ sơ đã sửa; lượt 3 dùng RELAXED ở revision 5 và engine khuyên áo M. Tuy nhiên, lặp nguyên câu mời “chuẩn bị luôn bộ này” cả ba lượt khiến giọng máy móc, thúc mua cả bộ khi khách vẫn đang hỏi size áo. Đây là vấn đề giọng và bám nhu cầu, không phải thao tác mua sai đã thực hiện.

### J2 · lần 5

- Candidate: Đã thay 56kg bằng 51kg, giữ chiều cao và ba vòng; lượt cuối dùng RELAXED, chốt M đúng engine và revision hồ sơ. Tuy nhiên, lượt 2 đọc lại toàn bộ cân nặng và ba số đo khiến lời tư vấn giống xác nhận dữ liệu hơn trò chuyện tự nhiên. Dẫn chứng chất liệu ở lượt cuối phù hợp nhu cầu thoải mái; không có sai thông tin hay thao tác có hậu quả.
- Đối chứng: Cập nhật và lưu đúng 51kg, chiều cao 162 cùng ba vòng; preference RELAXED được đưa vào lần tư vấn cuối. Cả ba lượt chọn M đều có engine RECOMMENDED đúng khách và revision hiện tại. Lời đáp hơi lặp cách diễn đạt nhưng ngắn, bám nhu cầu chọn size áo và không bảo đảm độ vừa tuyệt đối.
