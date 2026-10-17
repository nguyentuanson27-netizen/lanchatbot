# Review toàn bộ actual outcomes

Source `b2448a5726f454668fb1bf1756eac73e1e9af309`, raw `a931c587294c26bb10a01dc93a301704bd1f47b1` đã commit trước primary. Đọc cả lượt với lịch sử, public context và state cuối; chưa đọc nháp bị chặn/chi tiết verdict để chấm. Primary chủ quan, human acceptance null. Các chiều0/1/2 chỉ hỗ trợ nhận xét, không cộng điểm hoặc bắt keyword.

| Phần | USABLE | NEEDS_EDIT | UNUSABLE | FALLBACK_OR_NO_SEND |
| --- | --- | --- | --- | --- |
| B1 | 34 | 10 | 1 | 3 |
| B2_B3 | 9 | 0 | 0 | 5 |

Mỗi lượt có một ownership-only control được báo riêng; USABLE không phải số đơn mua, độ ổn định hay human acceptance. Không phạt upsell tự nó; không bắt policy checklist ở mọi câu; cho phép tư vấn cảm giác/phong cách theo ranh giới đã duyệt.

| Lượt | Cả lượt | Lý do |
| --- | --- | --- |
| Rep2 B2_B3 1 — stateful-open | USABLE | Nhận đúng lựa chọn áo/be/M, giỏ thực sự có một áo và báo đặt trước ngay lượt đầu. “Chị đã chọn” nhắc quyết định của khách, không nói khách tự cập nhật giỏ; hơi giống biên nhận nhưng không làm sai vai thực hiện. |
| Rep2 B2_B3 2 — stateful-variant-quantity | USABLE | Trong mạch vừa chọn áo, xác nhận đổi thành hai áo L/be; giỏ đọc lại đúng cả màu, size và số lượng. Câu hơi cứng nhưng mô tả lựa chọn vừa đổi, khác việc thuật lại khách đã cập nhật hệ thống; không cần nhắc đặt trước lần nữa. |
| Rep2 B2_B3 3 — stateful-quote | USABLE | Trả thẳng tổng hai áo cả ship 978.100đ, khớp cartQuote hiện hành. Khách hỏi tổng nên không cần bắt liệt kê lại từng phép tính. |
| Rep2 B2_B3 4 — stateful-correction | USABLE | Tiếp nhận sửa số đo, hồ sơ thật là eo74/mông96 và hai áo L/be giữ nguyên. Không đọc lại toàn bộ số đo, không tự chọn fit mới; giọng ghi nhận hơi hành chính nhưng việc hiện tại được giải quyết. |
| Rep2 B2_B3 5 — stateful-private-checkout | FALLBACK_OR_NO_SEND | Checkout riêng tư kết thúc HANDOFF, không có preview hay tin được capture; hành trình mua chưa hoàn thành. Primary giữ kết quả thực tế và chưa dùng trace để gán nguyên nhân. |
| Rep2 B2_B3 6 — stateful-confirm | FALLBACK_OR_NO_SEND | Khách chốt nhưng NO_SEND/CURRENT_AUTHORITY_CHANGED, không có đơn hoặc reply được capture. Tôn trọng authority đúng không biến lượt mua chưa xong thành thành công bán hàng. |
| Rep2 B2_B3 7 — stateful-human-request | USABLE | Control yêu cầu gặp người được chuyển quyền sang HUMAN và không phát tin vượt quyền. Chỉ đạt kiểm soát ownership, không chứng minh nhân viên đã tiếp nhận hay giọng tư vấn tự nhiên. |
| Rep2 B1 1 — b1-changed-occasion | USABLE | Xét lại tình huống sân khấu, cảnh báo nguy cơ từ vải nhẹ rồi nêu lớp mặc trong hoặc tìm mẫu khác bằng tool hiện có. Toàn đoạn không nêu kết quả đo độ xuyên, lớp lót sẵn có hay bảo đảm mặc inner là kín; theo ranh giới đã duyệt, đây là tư vấn nguy cơ/phối đồ thông thường. Cách nói thấu quang còn kỹ thuật nhưng không tự coi một từ là lỗi. |
| Rep2 B1 2 — b1-search-read | USABLE | Tìm đúng SD375 và trả rõ929k áo lẻ/1.065k cả set. Câu hỏi chọn gói mua liên quan đúng hai lựa chọn, không đưa nhầm mẫu. |
| Rep2 B1 3 — b1-buying-concern | NEEDS_EDIT | Chủ yếu phủ nhận lo rườm rà bằng chuỗi lời khen từ mô tả, chưa giúp khách cân nhắc độ ren theo gu. Kết thúc mời lấy size mặc vừa dù B1 không có tool chọn size, nên bước tiếp không thực hiện được trong capability hiện tại. |
| Rep2 B1 4 — b1-changed-occasion-v2 | USABLE | Trả trực tiếp lo bí khi tiệc ra sân vườn bằng nguồn tơ/ren mềm thoáng. Đây là cảm giác mặc dự kiến và trấn an thông thường được owner cho phép, không bịa số đo nhiệt, chống nắng hoặc cam kết không đổ mồ hôi. |
| Rep2 B1 5 — b1-partial-source-v2 | FALLBACK_OR_NO_SEND | Actual chỉ là fallback FAIL, không trả được phần vải/dáng có nguồn hoặc giá/tồn khách hỏi. Chấm outcome khách thực nhận; chưa đọc nháp/verdict để kết luận vì sao bị chặn. |
| Rep2 B1 6 — b1-buying-concern-v2 | NEEDS_EDIT | Có nhận ra cả bộ nhiều chi tiết hơn gu trơn và nêu cách lấy áo riêng, nhưng sau đó lại khen nguyên set để khách tự quyết lại. Ba đoạn xoay qua lại làm mất lời khuyên của shop; vấn đề là quyết định và diễn đạt cả lượt, không phải cấm bán nguyên set. |
| Rep2 B1 7 — b1-current-policy | USABLE | Dùng policy hiện tại15ngày/30k thay thông tin cũ7ngày, giải quyết câu hỏi nhận10hôm còn kịp không. “Kịp” trong mạch này nói thời hạn, không phải receipt duyệt đơn hay miễn các điều kiện chưa được xét. |
| Rep2 B1 8 — b1-partial-source | NEEDS_EDIT | Giữ đúng vải từng phần và không bịa giá/tồnM, nhưng chép giọng mô tả dài rồi giải thích hệ thống chưa cập nhật. Nguồn thiếu giá/tồn là thật; giọng hệ thống và lời khen nối nhau là chất lượng owner cần sửa. |
| Rep2 B1 9 — b1-price | USABLE | Giá799k cả set và499k/449k món lẻ đúng nguồn, phân biệt đúng gói bán. Thêm lựa chọn món lẻ liên quan, không làm lạc câu hỏi giá. |
| Rep2 B1 10 — b1-component-stock | USABLE | Trả trực tiếp áoM còn, áo lẻ499k; đúng bằng chứng món/size, không tự chọn độ vừa cho khách. |
| Rep2 B1 11 — b1-policy-used | NEEDS_EDIT | Từ chối đúng vì đã mặc đi làm và phí30k đúng nguồn. Nhưng câu phụ khẳng định khách chịu ship trong khi policy được cung cấp chỉ ghi tổng phí hai chiều, chưa có trường xác nhận bên chịu phí; cần làm rõ nguồn cho phần đó, không phải bổ sung checklist điều kiện đổi. |
| Rep2 B1 12 — b1-current-policy-v2 | USABLE | Trả đúng còn hạn15ngày và shiphai chiều30k thay25k khách nhớ. Không biến câu hỏi thời hạn/phí thành duyệt toàn bộ điều kiện đổi. |
| Rep2 B1 13 — b1-price-v2 | USABLE | Giữ đúng referent cả bộ Thạch Thảo từ lịch sử và trả799k ngắn gọn. |
| Rep2 B1 14 — b1-component-stock-v2 | USABLE | Dùng đúng chân váy khách đã chọn trong lịch sử, xác nhậnM còn và449k; không hỏi lại mẫu. |
| Rep2 B1 15 — b1-search-read-v2 | USABLE | Tìm đúng Khánh Trang, giá999k cả set và499k từng phần khớp nguồn. Không tự sửa999k vì hai món lẻ cộng lại998k. |
| Rep2 B1 16 — b1-policy-used-v2 | USABLE | Đọc tình huống đã mặc vào năm phút và từ chối đúng HOLD_UP_ONLY. Nói rõ chỉ ướm ngoài; không dựa vào việc còn tem/chưa ra đường để cấp quyền đổi. |
| Rep2 B1 17 — b1-changed-occasion-v3 | USABLE | Đổi lời khuyên theo buổi gặp khách cần gọn: chọn áo riêng với đồ công sở, giải thích vì sao chân váy ren nghiêng về tiệc. Có lựa chọn nhất quán, không tiếp tục bảo vệ lời khuyên đi tiệc tối. |
| Rep2 B1 18 — b1-current-policy-v3 | USABLE | Trả câu hỏi thời hạn9ngày bằng policy15ngày hiện hành. Trong mạch chỉ mở xem rồi cất, đây là trả còn hạn, không kết luận hồ sơ đổi đã được code chấp thuận. |
| Rep2 B1 19 — b1-partial-source-v3 | NEEDS_EDIT | Phân biệt đúng vật liệu áo/váy, giữ phần biết và không bịa giá/tồn. Tuy nhiên vẫn kể hệ thống chưa kiểm tra được bằng giọng thông báo, chưa đạt lối nhắn shop tự nhiên đã dùng làm bar ở lượt trước. |
| Rep2 B1 20 — b1-price-v3 | USABLE | Trả ngay799k cả bộ, không kéo dài hoặc gắn bước chốt không cần thiết. |
| Rep2 B1 21 — b1-component-stock-v3 | USABLE | Xác nhận có bán riêng áo, M còn và499k đúng nguồn hiện tại; đủ ý khách hỏi. |
| Rep2 B1 22 — b1-search-read-v3 | USABLE | Tìm đúng SQ223, báo còn/699kset/429kmón lẻ. Hỏi gói mua, màu/size sau đó là nhu cầu mua tiếp, chưa khẳng định đã xác minh biến thể khách chưa chọn. |
| Rep2 B1 23 — b1-buying-concern-v3 | USABLE | Đề xuất cả bộ799k trong ngân sách và giải thích thêm cách mặc lại cùng chân váy đen đã có. Câu tiết kiệm nêu rõ so với mua cả áo499k+váy449k riêng, không nói799k trả ít hơn chỉ mua áo499k; upsell có lý và phép so tương đương được chấp nhận. |
| Rep2 B1 24 — b1-policy-used-v3 | USABLE | Từ chối đổi vì đã cắt tem và giặt, hai việc quyết định trong chính câu hỏi. Không đọc thêm điều kiện không thay đổi được kết luận. |
| Rep3 B2_B3 1 — stateful-open | FALLBACK_OR_NO_SEND | Khách chỉ nhận fallback BUDGET và giỏ vẫn chưa có áo; mới ghi được số đo. Không lấy việc hồ sơ đã lưu hoặc nháp chưa gửi thay cho yêu cầu lấy hàng đã hoàn thành. |
| Rep3 B2_B3 2 — stateful-variant-quantity | USABLE | Theo đúng lịch sử thật sau lượt mở giỏ thất bại, lần này tạo được hai áo L/be và báo đặt trước. Không giả định đã có áo M; giữ đúng lựa chọn khách và thực hiện được bước mua đang yêu cầu. |
| Rep3 B2_B3 3 — stateful-quote | USABLE | Tổng978.100đ gồm ship30.000đ và ưu đãi49.900đ khớp cartQuote hai áo. Thông tin cụ thể, vừa đủ để khách hiểu số tiền thanh toán. |
| Rep3 B2_B3 4 — stateful-correction | USABLE | Hồ sơ đã sửa74/96 và giỏ hai áo L giữ nguyên. Nhắc đúng hai giá trị vừa sửa để xác nhận là liên quan trực tiếp, không phải đọc lại cả hồ sơ khi đang tư vấn; câu còn hơi giống thông báo cập nhật. |
| Rep3 B2_B3 5 — stateful-private-checkout | FALLBACK_OR_NO_SEND | Checkout dừng HANDOFF/DEPENDENCY_FAILURE và không có preview hoặc tin được capture. Không suy ra việc chuyển người đã được phục vụ; đơn mua còn chưa hoàn thành. |
| Rep3 B2_B3 6 — stateful-confirm | FALLBACK_OR_NO_SEND | NO_SEND sau khi quyền đã đổi, không có đơn hay reply được capture. Gate giữ đúng quyền nhưng outcome của yêu cầu chốt đơn vẫn chưa hoàn thành. |
| Rep3 B2_B3 7 — stateful-human-request | USABLE | Control chuyển HUMAN theo yêu cầu khách và giữ im lặng đúng quyền. Chỉ review ownership, không tính đây là một hội thoại bán hàng hoặc dịch vụ nhân viên đã xong. |
| Rep3 B1 1 — b1-changed-occasion | FALLBACK_OR_NO_SEND | Actual là fallback FAIL, không giải quyết đổi dịp lên sân khấu hoặc đưa phương án mua. Không dùng nội dung nháp bị chặn làm câu khách đã nhận. |
| Rep3 B1 2 — b1-search-read | USABLE | Tìm đúng SD375, phân biệt929k áo lẻ/1.065k cả set, câu hỏi chọn gói mua có liên quan. |
| Rep3 B1 3 — b1-buying-concern | USABLE | Đề xuất mặc cả bộ đi tiệc ban ngày với lý do ren mềm/rũ, đồng thời có giải pháp áo riêng nếu khách muốn giảm chi tiết. Khác lượt2, bỏ lời mời chọn fit ngoài capability và có phương án giải quyết lo của khách; còn hơi quảng cáo nhưng cả lượt dùng được. |
| Rep3 B1 4 — b1-changed-occasion-v2 | USABLE | Lấy vải mềm/nhẹ/thoáng từ nguồn để tư vấn cảm giác ngoài trời, có nhận xét trời nắng vẫn ấm. Không biến tư vấn này thành dữ liệu đo hoặc bảo đảm không ra mồ hôi; hơi lặp nhưng không mất giá trị câu trả lời. |
| Rep3 B1 5 — b1-partial-source-v2 | NEEDS_EDIT | Trả được ren/dáng rũ và không đưa giá/tồn giả, nhưng đổ việc thiếu thông tin món lẻ cho thiết kế theo set, trong khi source chỉ đang unavailable. Thêm giọng hệ thống làm khách hiểu sai lý do không báo được hàng; cần sửa quan hệ nhân quả và giọng, không bắt khách bổ sung dữ liệu sản phẩm. |
| Rep3 B1 6 — b1-buying-concern-v2 | NEEDS_EDIT | Có xét gu trơn và gợi lấy áo riêng, rồi lại quay về khen nguyên bộ để khách chọn lại. Câu dài, nhiều tính từ và không giữ quyết định của shop; lỗi phục vụ nhu cầu còn nguyên dù facts chất liệu đúng. |
| Rep3 B1 7 — b1-current-policy | USABLE | Dùng15ngày/30k hiện hành để trả còn kịp sau10ngày; không lặp policy cũ hay kể checklist không cần thiết. |
| Rep3 B1 8 — b1-partial-source | NEEDS_EDIT | Nói đúng áo tơ/váy ren và thiếu giá/tồn, nhưng câu hệ thống chưa kết nối kèm xin thông cảm kéo khách vào chi tiết vận hành. Phần thiếu source là thật; lối trình bày vẫn chưa tự nhiên. |
| Rep3 B1 9 — b1-price | USABLE | Giá799kset/499káo/449kváy đúng nguồn, cấu trúc liệt kê giá ba lựa chọn phù hợp câu hỏi, không coi mọi danh sách facts là lỗi. |
| Rep3 B1 10 — b1-component-stock | USABLE | ÁoM còn499k được trả trực tiếp, đúng scope hàng; không tự suy fit. |
| Rep3 B1 11 — b1-policy-used | USABLE | Từ chối ngay việc đã mặc đi làm, tách câu phí30k cho trường hợp hợp lệ. Chưa xác định bên chịu phí từ source được cung cấp nên không tự bịa payer; câu hỏi phụ không thay đổi việc đơn này không đủ điều kiện đổi. |
| Rep3 B1 12 — b1-current-policy-v2 | UNUSABLE | Trả đúng hạn15ngày/phí30k nhưng tự thêm kết luận: còn tem và chưa sử dụng là đổi size thoải mái. Cả đoạn dẫn khách tin hai điều kiện đó đủ để được đổi, trong khi nguồn vẫn có điều kiện độc lập và orderEligibility=null. Đây là mở rộng quyền đổi, không phải bắt mọi câu thời hạn nhắc đủ từ chưa giặt/sạch/không mùi. |
| Rep3 B1 13 — b1-price-v2 | USABLE | Giữ đúng referent cả bộ từ lịch sử và trả799k ngay. |
| Rep3 B1 14 — b1-component-stock-v2 | USABLE | Đúng món chân váyM và449k, không hỏi lại lựa chọn khách đã nói. |
| Rep3 B1 15 — b1-search-read-v2 | USABLE | Tìm đúng Khánh Trang, có hàng/999kset/499ktừng phần khớp nguồn. Danh sách gói mua có ích, không phải liệt kê hồ sơ khách. |
| Rep3 B1 16 — b1-policy-used-v2 | USABLE | Từ chối đúng vì đã mặc thử vào người; giải thích chỉ ướm ngoài dù còn tem và chỉ thử trong phòng. |
| Rep3 B1 17 — b1-changed-occasion-v3 | NEEDS_EDIT | Vẫn chốt cả bộ sau khi khách chuyển sang gặp khách hàng và muốn nhìn gọn hơn, chủ yếu giải thích đồng bộ/sang trọng/tiện phối. Đoạn còn tự nhận áo riêng sắc sảo hơn rồi quay lại đẩy cả bộ, chưa giải quyết ưu tiên mới. Không fail vì bán nguyên set; fail vì lý do chưa phục vụ điều khách vừa đổi. |
| Rep3 B1 18 — b1-current-policy-v3 | FALLBACK_OR_NO_SEND | Actual fallback PROVIDER_ERROR, không trả được câu hỏi9ngày còn hạn. Chưa dùng nháp hoặc trace để gán lỗi này cho cách hiểu policy/verifier. |
| Rep3 B1 19 — b1-partial-source-v3 | NEEDS_EDIT | Vật liệu đúng và không bịa giá/tồn, nhưng vừa kể hệ thống vừa đổi xưng hô sang bạn/shop, rồi xin size dù size không khôi phục nguồn giá/tồn. Bước tiếp vô ích và giọng máy vẫn còn. |
| Rep3 B1 20 — b1-price-v3 | USABLE | Giá799k đúng; lời so tiết kiệm chỉ so với mua đủ áo499k vàváy449k lẻ, nên đúng phép so chứ không phải khuyên cả bộ rẻ hơn áo riêng. |
| Rep3 B1 21 — b1-component-stock-v3 | USABLE | Trả đúng áo bán riêng/M còn/499k, ngắn và đủ. |
| Rep3 B1 22 — b1-search-read-v3 | USABLE | Tìm đúng SQ223, còn hàng/699kset/429ktừng phần; không thêm bước không cần. |
| Rep3 B1 23 — b1-buying-concern-v3 | USABLE | Chọn cả bộ799k theo ngân sách, giải thích thêm outfit nguyên bộ và áo phối chân váy đen để mặc lại. Lời giúp em và chuỗi tính từ hơi gượng nhưng không làm mất quyết định và ích lợi upsell; không coi đây là lỗi chỉ vì không chọn phương án rẻ hơn. |
| Rep3 B1 24 — b1-policy-used-v3 | USABLE | Từ chối đúng do đã cắt tem và giặt. Không bắt liệt kê điều kiện khác khi kết luận đã rõ từ việc khách làm. |
