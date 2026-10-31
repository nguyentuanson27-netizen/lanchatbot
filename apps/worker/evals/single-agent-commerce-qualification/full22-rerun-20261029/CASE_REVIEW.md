# Primary review từng hội thoại

Đã đọc toàn bộ 22 hội thoại / 34 lượt, đối chiếu raw tools, actual terminal, source và state. Đây là nhận xét định tính của agent thực hiện; **không phải điểm chấm mù độc lập**, không cộng số keyword hay lấy draft bị chặn làm reply khách nhận. File [CONVERSATIONS.md](CONVERSATIONS.md) giữ nguyên câu thực tế.

| Ca | Khách cần gì | Kết quả và nhận xét |
|---|---|---|
| s01 | Giá bộ Khánh Trang | Handoff DEPENDENCY_FAILURE, không báo giá. Trace chưa xác định lower cause; chưa có căn cứ nói nguồn shop thiếu giá. Nhu cầu chưa được bot xử lý. |
| s02 | Mua riêng áo Thạch Thảo, hỏi giá | Reply chỉ hỏi áo của set quần hay set váy. Cần làm rõ mẫu nhưng đã bỏ phần báo giá có thể trả; owner chỉ đọc details, chưa đọc PRICE. Đây là lỗi hoàn thành nhu cầu, dù verifier PASS vì không bịa giá. |
| s03 | Ảnh cận ren Ngọc Trâm | Handoff DEPENDENCY_FAILURE, không ảnh. Chưa có lower error trace đủ để xác định fetch/metadata hoặc shop thiếu ảnh. Không nhầm với j3 đã gửi ảnh thành công. |
| s04 | Màu khác của áo Thạch Thảo | Bốn read_product và search bị PRODUCT_BOUND, rồi handoff RESPONSE_UNAVAILABLE. Không tới verifier. Cần xử lý read plan/product scope, chưa thể đổ cho verifier chặn quá tay. |
| s05 | Chọn đồ đơn giản đi ăn gia đình | Chọn SQ675, giá 1.279.000đ, nói rõ đặt trước; có một phương án cụ thể. Phần miêu tả hơi dài và CTA chung, nhưng có bước tư vấn bán hàng. Đối chiếu được sản phẩm discovery từ sourceReads, không chỉ pool ban đầu. |
| s06 | Áo Thạch Thảo với quần nâu sẫm đang có | Reply trả đúng hướng phối, không bị phụ thuộc ảnh như diagnostic trước. Còn dài, nhiều tính từ và câu “nếu chị muốn… cứ nhắn” thừa vì khách đang hỏi mua áo. Không phải lỗi an toàn chỉ vì văn phong. |
| s07 | Size theo 1m60/55kg, thích rộng | Handoff DEPENDENCY_FAILURE sau search. Không có kết quả chọn size để kết luận chọn sai hoặc thiếu số đo. Cần trace đường đọc/source capability; chưa xác định lower cause. |
| s08 | Chọn Odette hay Diệp An đi lễ | Có lựa chọn Diệp An và lý do từ form/hai lớp. Đoạn so sánh dài; “ghi điểm tuyệt đối” mang giọng quảng cáo. Không tự kết luận thành hard safety breach chỉ từ tính từ; cần chấm cả ý và dữ liệu nguồn. |
| s09 | Giặt tay hay máy | Trả đúng policy: ưu tiên giặt tay, giặt máy với túi giặt/chế độ nhẹ. Cụm tiếng Anh trong ngoặc và “thoải mái” có thể bỏ để tự nhiên hơn; nhu cầu đã được trả. |
| s10 | Đổi màu đơn đang giao | Handoff EXCHANGE, im lặng. Đúng hướng cần xử lý đơn cũ ngoài capability hiện có; không bịa đã sửa đơn hoặc hứa effect. |
| s11 | Be L còn hai bộ không | Một OWNER output MALFORMED: read_product.offerType là OBJECT, HTTP200 STOP; handoff. Chưa kiểm tra đủ tuple/quantity, không được nói shop hết hàng hay bị quota. |
| s12 | Váy mới nhận bị kẹt khóa, muốn đổi | Handoff DEFECT, im lặng. Đúng hướng hậu mãi; không tự xác nhận nguyên nhân/đã đổi hàng hay kể lại dài điều kiện. |
| s13 | Một áo, giao Cần Thơ, tổng tiền | Đọc details hai sản phẩm rồi vượt TOOL_RESULT_BOUND, handoff. Chưa tới verifier; cần read scope/budget/source projection đủ gọn để xử lý giá+ship. Khách chưa nhận được tổng. |
| s14 | Muốn xem thêm, chưa mua | Reply xác nhận nhẹ, không ép chốt. Câu “cần hỗ trợ…” chung nhưng chấp nhận được, không phải trọng tâm sửa. |
| s15 | Thích màu be và cảm ơn | Handoff PRICE_UNAVAILABLE sau đọc/search PRODUCT_BOUND dù khách không hỏi giá. Có dấu hiệu tạo dependency không cần thiết; không dùng lý do terminal để kết luận shop thực sự thiếu giá. |
| s16 | Ảnh khách mặc áo Thạch Thảo | Handoff PRODUCT_AMBIGUOUS sau đọc hai sản phẩm. An toàn về referent, nhưng chưa giải quyết ảnh; cần phân biệt ambiguity thật với khả năng dùng nguồn chung đã được owner cho phép. Không tự gửi ảnh nhầm mẫu. |
| j1 | Áo L → hai áo M/L → tổng ship | T1 owner thấy NO_COLOR in-stock và BE preorder nhưng gọi “bản tiêu chuẩn”; verifier thiếu tuple projection tương ứng nên FAIL. T2/T3 không gửi vì HUMAN ownership. Chưa thực hiện cart M+L hoặc tổng; không báo fix tuple đã thành công E2E. |
| j2 | Chọn size, sửa 56→51kg và thêm 88/70/94 | T1 code chọn M, reply đúng kết quả. T2 recommend_size OUT_OF_RANGE/HANDOFF, không thiếu input; T3 HUMAN no-send. Phải audit chart applicability/thresholds/correction trước khi quyết định bot cần hỏi thêm hay chọn size khác. |
| j3 | Mua áo phối quần nâu, cân nhắc cả set rồi chọn áo | T1 499k/S–XL + 2 ảnh được capture; T2 lợi ích phối lại và giá set799k so với mua lẻ có căn cứ. T3 hỏi size theo history nhưng snapshot mới không có size evidence → verifier FAIL/handoff. Hành trình đang bán được thì mất bước tiếp do current evidence, không nên chỉ thêm câu style. |
| j4 | Áo M → thương lượng → tổng ship | T1 nói hai loại be/tiêu chuẩn; owner có BE preorder nhưng verifier presentation thiếu BE, owner không nói preorder. FAIL/handoff; T2/T3 không gửi. Cả khả năng thương lượng/tổng chưa được kiểm qua trong run này. |
| j5 | Hỏi đơn cũ, muốn trao đổi trực tiếp | Handoff ORDER_STATUS rồi hai lượt HUMAN no-send. Ownership giữ đúng, không tự giành lại hội thoại hay hứa tra đơn không có capability. |
| j6 | Set M → lên đơn → COD | Cart/829k có receipt; T2 hỏi tên; T3 COD được lưu, giữ NAME attemptCount1, hỏi tên lại. Luồng intake có hoạt động, chưa đủ thông tin để preview/confirm. Giọng đầu hơi “giỏ hàng/hệ thống”; lặp câu hỏi tên là hạn chế trải nghiệm còn lại. |

Ưu tiên xử lý dependency và sự đồng nhất căn cứ giữa các lượt/model. Không mở vòng vá riêng từng câu, không ép các handoff cần thiết thành reply, không dùng kết quả N1 này như chứng minh độ ổn định.
