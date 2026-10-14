# Findings sau khi nối và chạy B thật

Review toàn bộ tám kết quả thực tế nằm trong [B1_CONVERSATIONS](B1_CONVERSATIONS.md), primary commit `7827c193`, sau raw commit `4ac64501`. Các phân tích draft bị từ chối dưới đây được làm sau primary. Đây là nhận xét chủ quan của agent chính, không thay owner chấp nhận chất lượng hoặc qualification.

## Những thiếu sót kỹ thuật đã sửa

Nguồn thật đã có PostgreSQL/Redis/Qdrant, index và credential route. Vấn đề của candidate là đọc sai hợp đồng nguồn: bỏ `source_updated_at`; gắn khả năng dùng mô tả sản phẩm vào việc có đủ registry attributes/BOM; chưa giữ riêng giá/tồn của set và món lẻ; dùng mặc định1200giây thay cho giới hạn7200giây đang cấu hình. Đã sửa tại adapter/evidence/tool, không đưa policy hay sản phẩm vào prompt và không biến description thành registry attributes đã xác minh. Source readback cuối có mô tả và hai facts giá/tồn ở cả bốn lựa chọn; snapshot trước/sau giống nhau. Free-text embedding hoạt động; truy vấn rộng có nhiều mẫu gần nhau nên trả AMBIGUOUS, không ép thành một lựa chọn.

B3 trước đó mới có port/memory tests. Đã nối native command vào permission/readiness và transaction hiện có, giữ inbox lease, conversation/state revision, exact prepared transition và atomic effect intents. Một tool instance mới đọc receipt từ ledger cũ thay vì ghi lại. Đọc authority hiện tại trước effect/final readback/recovery. Một test RED phát hiện response commit đến muộn được tính lại hạn receipt; sửa thành thời điểm commit cộng5phút, không cộng từ thời điểm nhận phản hồi. Không tạo table, operation store hay lớp authority mới.

Hai run PostgreSQL cuối trên clean source kiểm cùng chín nhóm cho COD và BANK_TRANSFER, đều PASS và đã drop đúng database thử nghiệm. Đây là real database với input khách/sản phẩm giả lập và policy hiện tại được capture; B2 chart/policy fixtures vẫn được ghi đúng là synthetic. Không có model trong các run này và không có delivery worker. Chuyển khoản tạo một logical intent với ba outbox message, không phải ba generation hay ba lần thanh toán.

## 1. Hỏi giá nhưng hết lượt tool

Khách hỏi giá set SV2447. Ngay lần đọc đầu đã có PRICE799k và nguồn mô tả set. Owner tiếp tục đọc SET_VAY và AO; ở generation thứ ba lại yêu cầu CV. Request thứ ba có functionCallingConfig.mode=NONE nhưng response HTTP200 vẫn chứa functionCall. Code từ chối trước khi chạy call đó và trả fallback vì hết round.

Đây không phải thiếu dữ liệu giá hoặc verifier từ chối: không có final draft và verifier không được gọi. Giới hạn2round giữ đúng. Dữ liệu trả về còn dùng offerType=null khi đọc mặc định và các mã lựa chọn như SET_VAY/AO/CV; đây là một giả thuyết về sự dư thừa tra cứu, không phải nguyên nhân đã chứng minh bằng đối chứng. Không mở budget hoặc thêm retry để che kết quả. Hướng tiếp theo nếu được làm thêm: làm rõ lựa chọn bán thực tế do resolver chọn trong tool result, rồi kiểm tra model có dừng khi đã đủ thông tin; không hardcode câu hỏi/giá hoặc tự tính giá set từ món lẻ.

## 2. Suy chất liệu thành độ kín dưới đèn

Draft bị chặn:

> Áo của set Thạch Thảo làm bằng chất liệu tơ Hàn thêu có độ bay nhẹ và thoáng, nên dưới ánh đèn sân khấu rọi thẳng mạnh sẽ khá dễ thấy bóng áo lót chị nhé. Nếu ngại vấn đề này thì chị không nên chọn set này cho dịp lên sân khấu ạ.

Nguồn có chất liệu và thiết kế, không có bằng chứng độ xuyên dưới đèn sân khấu. Owner đã đổi từ lời khuyên về rủi ro chưa rõ sang khẳng định một kết quả vật lý. Verifier trả UNSUPPORTED_PROTECTED_ASSERTION, ref đúng sản phẩm. Việc khuyên không chọn có thể hợp lý; phần lý giải vẫn tự thêm đặc tính. Không nên sửa verifier cho qua phép suy này. Cần giữ lời khuyên mua dựa vào mức chứng minh thực có, hoặc bổ sung dữ liệu sản phẩm từ shop; không tạo một phép thử giả.

## 3. Đổi policy đúng nhưng xác nhận đủ quyền quá rộng

Draft bị chặn:

> Dạ, thời hạn đổi của shop là trong vòng 15 ngày kể từ khi nhận hàng nên 10 ngày của chị hoàn toàn được hỗ trợ ạ. Chị được hỗ trợ đổi màu với phí vận chuyển 2 chiều là 30.000đ chị nhé! Sản phẩm của chị nguyên tem, sạch sẽ và mới ướm bên ngoài là đạt điều kiện đổi hàng bên em ạ.

Owner đã lấy đúng15ngày/30k từ nguồn hiện tại, không giữ7ngày trong lịch sử. Khách cũng đã nói chưa mặc, chưa giặt, sạch, nguyên tem và chỉ ướm: không được coi việc thiếu lặp lại những điều này trong reply là lỗi.

Tuy nhiên reply kết luận đã đủ quyền, trong khi nguồn còn yêu cầu undamaged và maxExchangesPerOrder=1; hội thoại không xác lập toàn bộ điều kiện này. Đây là đối chiếu của reviewer. Verifier chỉ lưu MATERIAL_CONDITION_LOSS với policy ref, không có rationale xác định nó dựa vào điều kiện nào; không giả vờ biết suy nghĩ của model. Chặn có cơ sở vì lời xác nhận rộng hơn phần đã biết, nhưng một mẫu không chứng minh calibration ổn định. Hướng xử lý là tách câu trả lời về thời hạn/phí khỏi xác nhận đủ điều kiện thực hiện đổi; dùng tình trạng đã biết trong hội thoại, không bắt đọc lại checklist policy ở mọi tin.

## 4. Giữ được partial answer nhưng hứa bước chưa có

Khi POS bị chủ động tắt, owner vẫn trả đúng chất liệu, không bịa giá hoặc tồn. Nhưng kết thúc bằng “để em kiểm tra lại kho rồi báo chị nha”, trong khi candidate chưa có job kiểm tra nền/callback/handoff đó. Kết quả này FAIL về usefulness/next step trong primary. Không phải receipt success giả: không có lời báo đã làm xong. Verifier prompt hiện chủ động để lời hứa tương lai ngoài capability ở phần chất lượng; PASS ở đây không chứng minh đã có luồng xử lý đó. Cần owner trả đúng phần đã biết và giới hạn hiện tại, hoặc code có một luồng tiếp nhận thật trước khi hứa sẽ báo lại. Không thêm regex hay một model chấm CTA.

## 5. Giọng còn dấu dữ liệu nội bộ

Ca mặc đi làm đã từ chối đúng tình huống, phí30k chỉ gắn với trường hợp đổi hợp lệ. Nhưng vẫn đưa mã `unused` và backtick vào tin khách. Ca băn khoăn ren đưa quyết định hợp lý, giá đúng, nhưng dồn nhiều tính từ quảng cáo và đọc lại trọn mức ngân sách. Đây là lỗi chọn cách nói, không phải thiếu product context hay cần một lớp semantic router. Không tăng điểm vì có đủ từ của rubric; primary đọc toàn đoạn và ghi naturalness thấp hơn.

## Giới hạn còn mở

Persisted change-cart hỗ trợ thêm dòng, đổi số lượng và bỏ dòng; SET_COMPONENT_VARIANT bị từ chối rõ và không nằm trong schema model được cấp. Existing sales-stage/private-checkout và canonical permission guards vẫn tồn tại; chưa chứng minh native wording dài đuôi đều được xử lý. B1 dùng synthetic recipient/permission và các turn độc lập; B2/B3 dùng real inbox/state transactions nhưng synthetic domain inputs, chưa phải hội thoại provider stateful đầy đủ. Final B1 current readback không lưu riêng toàn bộ snapshot; raw giữ request binding và kết quả final gate, source-check giữ cả before/after. Không gọi đây là qualification hay bằng chứng live-send.

Không có code/prompt sửa sau khi xem kết quả để đổi nhãn run. Cả28generation, ba fallback và bốn kết quả chưa đủ hữu ích vẫn được giữ. Không chạy thêm vòng, A2/A3, Phase C, deploy hoặc live send.
