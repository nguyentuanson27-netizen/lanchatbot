# Review toàn bộ 48 lượt sau quyết định của owner — 2026-10-19

Đã đọc tin khách, lịch sử, lời thực nhận và kết quả nghiệp vụ của đủ 48 lượt. Phần giao dịch khi khách đã chọn hàng hoạt động tốt trong ba lần chạy; điểm yếu còn ở việc lấy đúng dữ liệu, sức thuyết phục và giọng chat của cả model lẫn code. Không quy mọi hạn chế về verifier hoặc thiếu thêm chỉ dẫn trong prompt.

Đây là review bổ sung, không phải một run mới và không thay primary review đã khóa. Run hội thoại: `93db1d47c49618a119a446ba4b0c86015672ae39`; [48 lượt gốc](CONVERSATIONS_AND_REVIEW.md), [primary JSON](PRIMARY_REVIEW.json), [metrics lịch sử](METRICS.json). Áp dụng [quyết định chỉ chấp nhận sáu draft sân khấu](OWNER_DECISION.md). Kiểm tra sau đó tại `9fae4aa9` chỉ gọi verifier, không sinh hội thoại owner mới.

## Phạm vi đã đọc

| Lượt / nhóm | Số lượt | Nhận xét qua toàn bộ các lần chạy |
| --- | ---: | --- |
| Stateful: mở giỏ | 3 | Thêm đúng áo Thạch Thảo, be, M; báo hàng đặt trước. |
| Stateful: đổi L, lấy hai áo | 3 | State đúng cả ba. Một lượt dùng lời code recovery sau khi snapshot thay đổi. |
| Stateful: hỏi tổng tiền | 3 | Trả đúng 978.100đ cả ba. |
| Stateful: sửa số đo, vẫn lấy L | 3 | State đều đúng. Hai câu được gửi nhưng còn giọng cập nhật hồ sơ; một draft thêm đánh giá “chuẩn”, bị fallback. |
| Stateful: yêu cầu lên đơn | 3 | Code mời bổ sung thông tin qua checkout riêng tư. Capture công khai đã che thông tin; không dùng nó để khẳng định toàn bộ câu mời tự nhiên. |
| Stateful: checkout riêng tư | 3 | Preview đúng lựa chọn, số lượng, tiền; không gọi model ở lượt riêng tư. |
| Stateful: xác nhận mua | 3 | Ghi nhận xác nhận và chuyển quyền xử lý đúng phạm vi; câu code còn hành chính. Chưa phải tạo đơn POS. |
| Stateful: yêu cầu gặp nhân viên | 3 | Control riêng chuyển ownership, không phải ba lượt tư vấn bán hàng thành công. |
| B1 + replay: đổi hoàn cảnh sân khấu | 6 | Run gốc fallback cả sáu; owner chấp nhận nội dung, verifier mới kiểm tra lại PASS 6/6. |
| B1 + replay: thiếu nguồn giá/tồn | 6 | Năm câu trả phần biết được hợp lý; một câu đưa bước chờ hoặc mua cả set thiếu căn cứ thực hiện. |
| B1 + replay: ngại ren cầu kỳ | 6 | Trả được băn khoăn và giá, nhưng lý do còn giống mô tả hàng; không tính thành vi phạm an toàn. |
| B1 + replay: hỏi giá theo mã | 6 | Integrated chỉ một trong ba lấy được giá; hai replay còn lại kế thừa context thiếu giá từ integrated. |
| **Tổng** | **48** | Không bỏ fallback, recovery hoặc control khỏi phạm vi đọc. |

48 lượt gồm ba lần chạy hành trình tám lượt, bốn tình huống B1 chạy ba lần và replay của chính bốn tình huống ấy. Đây không phải 48 cuộc mua hàng độc lập, cũng không phải full bộ 24 ca B1. Replay dùng context đã chụp, không có tool để lấy thêm dữ liệu.

## Những phần đã làm được

- Khách đổi size và số lượng thì giỏ đổi đúng, không mất màu hoặc giữ số lượng cũ. Khách sửa eo/mông nhưng vẫn lấy L thì state không tự đổi size. Tổng hai áo là 998.000đ, ưu đãi 49.900đ, ship 30.000đ, thanh toán 978.100đ đúng cả ba hành trình.
- Không có lỗi đảo vai “khách đã thêm vào giỏ” như vòng trước. Các lời xác nhận lựa chọn ngắn, đúng kết quả thao tác có thể dùng được. Không coi việc nhắc lại món/size vừa chốt là liệt kê máy móc.
- Khi nguồn giá/tồn được chủ động làm không khả dụng, năm trong sáu câu vẫn trả được chất liệu và nói đúng phần chưa kiểm tra được. Không yêu cầu model bịa giá, bịa tồn hoặc một lần gọi lại để làm câu trả lời trông hữu ích.
- Sáu câu sân khấu có đề xuất phối hoặc món thay để tiếp tục bán hàng. Theo mức owner đã chốt, không coi chúng là sáu lỗi tư vấn cần viết lại. Kiểm tra hẹp sau sửa verifier đã cho qua 6/6; hai đối chứng bịa cấu tạo và kết luận fit thiếu căn cứ vẫn bị chặn. [Kết quả kiểm tra riêng](../verifier-advice-acceptance-20261019/RESULT.md).

## 1. Tra đúng mã hàng chưa ổn định: lỗi contract lấy dữ liệu

Khách hỏi rõ mã SD375, nhưng hai lần integrated tìm bằng `áo dài SD375` và nhận AMBIGUOUS với các mẫu khác. Một lần tìm tiếp bằng `SD375` thì xác định đúng nhưng đã dùng hết hai round, chưa đọc được giá. Lần tìm bằng mã ngay từ đầu còn đủ lượt đọc và trả đúng áo lẻ 929.000đ, cả set 1.065.000đ.

Hậu quả trong lời khách nhận: một câu yêu cầu kiểm tra lại mã/gửi ảnh dù mã khách đưa hợp lệ; một câu hẹn “chị đợi em một lát” dù không có bước theo dõi. Hai replay tương ứng cũng không có giá, nên không thể coi chúng là hai lỗi suy luận độc lập nữa.

Nguồn trực tiếp: `ProductSearchService.searchText` chỉ vào exact-code path khi toàn bộ query có dạng mã; query kèm loại đồ đi sang tìm semantic. Trong khi đó owner được dặn giữ cả loại sản phẩm trong tên, và tool chỉ có một trường query cho cả nhận diện lẫn tìm nhu cầu. Đây là sự không khớp giữa cách giao việc, tool và đường nhận diện, không phải bằng chứng model không hiểu khách hỏi gì.

Hướng sửa: làm rõ input nhận diện mã/tên và input tìm theo nhu cầu trong tool hiện có, tái sử dụng exact lookup đã có; kiểm cùng một sản phẩm khi khách đưa mã đơn hoặc mã kèm tên. Không thêm ví dụ SD375 vào prompt, regex theo từng mã hoặc tăng round để che lỗi nhận diện.

## 2. Có trả lời băn khoăn nhưng lý do bán hàng còn yếu

Cả sáu câu về ren đều khuyên mặc set và trả giá 799k. Điều đó không sai; không ép phải đổi món hoặc chọn rẻ nhất. Nhưng nhiều câu nối gần như nguyên mô tả “ren tơ Hàn mềm / form nhẹ / độ rũ tự nhiên” với “thanh thoát / bay bổng / sang trọng” rồi kết luận không rườm rà. Khách ngại hình thức nhiều ren; chuỗi tính từ này làm lời khuyên giống đoạn giới thiệu hàng hơn là gỡ đúng sự phân vân.

Ví dụ: “form nhẹ và độ rũ tự nhiên ... tổng thể trông rất nhẹ nhàng, bay bổng và sang trọng”, tiếp đó lại nhắc “hoàn toàn vừa vặn với ngân sách 900.000đ”. Nhắc giá để quyết định mua là hữu ích; vấn đề không nằm ở một từ ngân sách, mà ở việc câu dài hơn nhưng lý do chọn không rõ hơn. Câu so giá set với mua lẻ có ích về tiền, không tự là ép mua thêm.

Mô tả nguồn của sản phẩm này vốn đã ngắn, nên chưa có bằng chứng rằng nguyên nhân chỉ là context quá dài. Quan sát chắc chắn là model lặp nguồn và dùng nhiều tính từ; giả thuyết về thói quen model hoặc cách giao nhiệm vụ giải thích cần được phân biệt với nguyên nhân đã chứng minh. Không chữa bằng danh sách cấm tính từ, bắt mọi câu có một khuôn hoặc thêm đáp án riêng cho ca ren.

Hướng sửa: giữ quyền tư vấn tự tin, tập trung vào nhận định giúp khách chọn và một lý do thực sự liên quan; không bắt mọi lời khuyên có phép thử riêng, cũng không tự thêm cấu tạo để tăng sức thuyết phục. Khi kiểm lại, đọc cả lời trao đổi và quyết định cuối, không chấm bằng số đặc điểm được nhắc.

## 3. Bước tiếp có lúc không dùng được

Một câu thiếu nguồn viết: “Chị chờ thêm hoặc xem xét lấy cả set để shop hỗ trợ mình nhé ạ!” Không có cơ chế gọi lại, cũng chưa có giá/tồn của cả set để chứng minh chuyển sang set giải quyết được việc khách đang hỏi. Vấn đề là bước tiếp không thực hiện được, không phải cứ bán thêm là sai.

Hai câu tra mã cũng làm khách phải đợi hoặc cung cấp lại thông tin vì lỗi lấy nguồn. Verifier PASS chỉ nói không tìm thấy vi phạm trong phạm vi kiểm nghĩa được bảo vệ; không đồng nghĩa lời hứa về bước tiếp hữu ích hoặc có người thực hiện.

Hướng sửa: xử lý contract nguồn trước. Khi nguồn thật sự thiếu, trả phần đã biết và phần chưa có; chỉ đưa bước tiếp nếu execution hiện tại làm được. Không thêm câu hứa chờ để bù cảm giác thiếu hụt, không tự thêm cơ chế handoff/follow-up từ review này.

## 4. Xác nhận sửa số đo vẫn mang giọng xử lý hồ sơ

Ba lượt đều ghi đúng số đo và giữ size khách muốn. Một draft lại nói: “Dạ, em đã cập nhật lại số đo eo 74 và mông 96 cho chị rồi ạ. Chị giữ size L như vậy là chuẩn ạ!” Đây không chỉ là chuyện nhắc lại số đo: nó thêm lời khen/đánh giá size ngoài việc khách yêu cầu, làm câu vừa cứng vừa dễ bị hiểu là shop xác nhận fit. Owner đã yêu cầu sửa, ngoài phạm vi chấp nhận sáu câu sân khấu.

Hai câu được gửi cũng còn thiên về “đã cập nhật lại số đo”. Cần tiếp nhận điều khách vừa sửa như một lượt chat, không biến thành biên bản thao tác. Không áp quy tắc cấm mọi dẫn chứng số đo: một dữ kiện giúp lý giải lựa chọn vẫn được phép.

Bullet owner về điểm này đã sửa ở `9fae4aa9`, nhưng lượt kiểm tra sau đó chỉ sinh verifier. Chưa có bằng chứng owner sẽ trả tự nhiên hơn với bullet mới; không ghi finding này đã giải quyết xong.

## 5. Một phần giọng hệ thống đến thẳng từ code

- Recovery: “Giỏ hiện có 2 sản phẩm, size L, màu BE...”
- Xác nhận mua: “Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.”
- Preview: mã SV2447 và màu BE thay tên/màu khách đang dùng.

Các câu này do formatter trong `single-agent-commerce-effects.ts` và `realtime-sales-cycle.ts` dựng. Sửa prompt owner không thay chúng. Bảng món/tiền ở preview có ích để khách kiểm đơn, không nên xóa chỉ vì có dạng danh sách; cần sửa nhãn hiển thị và lời dẫn, giữ nguyên dữ kiện nghiệp vụ.

Ở recovery, draft owner ban đầu đúng và verifier PASS. Final gate phát hiện metadata snapshot/offer đã đổi trong lúc chạy, nên trả summary hiện hành có receipt. Nội dung offer không đổi, nhưng identity/binding đã đổi. Không quy câu recovery cứng thành lỗi model; không nới freshness để chữa văn phong. [Đối chiếu snapshot](SOURCE_AND_WIRE_AUDIT.json).

## Lưu ý khi chuẩn bị lần sửa kế tiếp

Verifier mới cho phép tư vấn định tính về độ kín tương đối và trấn an bằng cách phối/món thay. Owner hiện vẫn có câu yêu cầu thông tin độ che phủ để nói bộ phối đủ kín trong hoàn cảnh khách nêu, và cấm nói món thay khắc phục rủi ro chưa xác nhận. Hai cách giao việc còn khác phạm vi. Đây là sự khác nhau của prompt hiện tại, chưa phải bằng chứng của một kết quả model mới. Khi sửa, đồng bộ đúng ranh giới owner đã chấp nhận; không mở lại tranh luận sáu câu, không bỏ việc cần nguồn cho cấu tạo/kiểm nghiệm/size/tiền/receipt.

Ưu tiên tiếp theo: sửa contract tìm sản phẩm và formatter có nguyên nhân rõ; kiểm lại lời xác nhận thông tin sau bullet đã sửa; chỉ chỉnh lời giao việc tư vấn khi có thay đổi cụ thể giúp quyết định mua. Không tiếp tục thêm ví dụ, gate, role hoặc tăng corpus để đuổi theo điểm. Khi cần đánh giá rộng hơn, bộ 24 ca B1 hiện có còn nhiều mục tiêu chưa được chạy trong vòng này.

Run gốc vẫn là bảy fallback thực tế, không được đổi thành một chỉ bằng kết quả recheck. Sáu draft được chấp nhận và PASS sau đó là bằng chứng riêng. Câu mới về đi ô tô dự cưới đã thay trong corpus hiện hành nhưng chưa model-run; không dùng 48 lượt này để kết luận về ca mới. Review này không chạy provider, không sửa runtime/prompt, không deploy hoặc live send.
