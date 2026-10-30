# Review toàn bộ 22 ca / 34 lượt sau variant-stock/search fix

Đọc toàn bộ terminal text và trace actual ở [CONVERSATIONS.md](CONVERSATIONS.md), đối chiếu [ACCOUNTING.json](ACCOUNTING.json) và [audit độc lập](ACCOUNTING_AUDIT.json). Đây là chẩn đoán của main, không thay grade chấm mù hoặc sửa runtime sau khi thấy kết quả.

| Ca | Kết quả và finding thực tế |
|---|---|
| s01 — giá Khánh Trang | DEPENDENCY_FAILURE silent handoff, không có reply/ảnh gửi. Quote form vẫn cần ảnh hợp lệ; không gọi đây là ca báo giá thành công hay cứu bằng bỏ ảnh. |
| s02 — giá áo Thạch Thảo | Cả SQ2447/SV2447 details đọc OK. Bot hỏi áo của set quần hay set váy, không còn SOURCE_ERROR cũ nhưng **chưa báo giá**. Cải thiện khả năng đọc không đồng nghĩa hoàn tất nhu cầu khách. |
| s03 — cận ren Ngọc Trâm | DEPENDENCY_FAILURE silent handoff, không gửi ảnh thay thế không đúng yêu cầu. Nguồn media vẫn là hạn chế; không quy cho verifier khi không có verifier call. |
| s04 — màu áo | Đọc details hai mã OK rồi RESPONSE_UNAVAILABLE handoff. Chưa giải đáp màu; không tự coi nguồn unrecorded thành một màu khác hoặc inventory hoàn chỉnh. |
| s05 — chọn đồ đơn giản đi ăn gia đình | Chọn SQ748 Uyển Hoa799k, có sẵn S/L, giải thích rồi hỏi size. Có lựa chọn shop cụ thể; giọng vẫn dày tính từ và mô tả kiểu catalog. Không sửa prompt trong batch. |
| s06 — áo với quần nâu | Trả lời dài và có điều kiện “nếu áo mang các gam màu…”, chưa chốt cách phối cụ thể. Nhiều tính từ/ngoặc và nhắc lại mục đích chung; dùng được về hướng phối nhưng sức tư vấn còn hạn chế. Không tự kết luận conditional aesthetic advice là sai fact. |
| s07 — cao/cân nặng/thích rộng | Search bị REJECTED/PRODUCT_BOUND, sau đó cả hai target details đều OK: reservation đã giữ được target. **Chưa gọi recommend_size** rồi chọn handoff reason SIZE_RULE_UNAVAILABLE. Không dùng reason do owner chọn làm bằng chứng shop thực sự thiếu chart. |
| s08 — Odette hay Diệp An đi lễ | Chọn Diệp An, giải thích thiết kế2lớp/cổtròn. “Giúp em” và câu hỏi có cần kiểm giá/size còn máy móc, chưa ưu tiên tối ưu giọng nhẹ. Không bỏ qua thực tế đã chọn một món cho khách. |
| s09 — giặt tay/máy | Reply ngắn: ưu tiên giặt tay; máy với túi giặt/chế độ nhẹ. Không thêm công dụng/độ bền hoặc kể lại policy không cần thiết. |
| s10 — đổi màu đơn đã đặt | EXCHANGE silent handoff đúng phạm vi aftersales hiện có; không hứa đã sửa đơn. Chưa có nghĩa đã hoàn thành đổi thực tế. |
| s11 — hai bộ be L | Details hai set OK, thêm reads có VARIANT_NOT_FOUND, rồi PRODUCT_AMBIGUOUS handoff. Chưa hỏi khách làm rõ set quần/set váy. Không suy “VARIANT_NOT_FOUND” thành toàn shop hết hàng hoặc lỗi reservation tái phát. |
| s12 — khóa kẹt mới mở hộp | DEFECT silent handoff, không tự duyệt đổi hoặc giả receipt xử lý. Khách còn chờ xử lý thực. |
| s13 — tổng áo và ship Cần Thơ | Search PRODUCT_BOUND; details hai target vẫn OK. **Chưa có protected price read cho AO**, rồi PRICE_UNAVAILABLE handoff. Không còn target thứ2 SOURCE_ERROR, nhưng vẫn chưa tính/trả tổng. Không chứng minh shop thiếu giá hoặc ETA chỉ từ reason này. |
| s14 — xem thêm | ACK ngắn, tôn trọng khách muốn tự xem tiếp. Không mở thêm bán hàng sau defer. |
| s15 — thích be/cảm ơn | Báo đặt trước rồi nhắc hai set, mời chọn thiết kế/size. Không giả stock; còn thêm thông tin/nextstep khi khách đã cảm ơn. |
| s16 — feedback áo | DEPENDENCY_FAILURE handoff, không thay ảnh người mẫu thành ảnh khách. Dataset không có verified matching feedback usable; thiếu shop data không chữa bằng lời hứa có ảnh. |
| j1 — mua L rồi thêm M | T0 add_to_cart trả COLOR_REQUIRED: NO_COLOR có sẵn, BE đặt trước. Draft gọi NO_COLOR là “bản tiêu chuẩn”; verifier FAIL đúng unsupported physical classification. Silent handoff ngay T0; T1/T2 HUMAN no-send, cartnull. **Không tới bước thêm M/L**, không dùng PG/component PASS để nhận hành trình model này PASS. |
| j2 — sửa cân nặng/số đo | T0 recommend_size thật trả M, owner trả M. T1 cập nhật correction rồi recommend_size thật trả OUT_OF_RANGE/HANDOFF; không giữ lại M cũ. T2 không gửi vì HUMAN. Đây là source-size decision đã thực thi, khác s07 chưa gọi engine. |
| j3 — áo hay cả bộ rồi chỉ áo | Cả3replyeligible, T0 có2ảnh. So cả bộ799k với áo499k+váy449k, rồi tôn trọng khách chỉ mua áo và hỏi size. Còn nhiều tính từ và câu hỏi mời “tư vấn chi tiết”, nhưng đã theo quyết định mua. Chưa có đủ size để hoàn tất giao dịch. |
| j4 — mua M/thương lượng/tổng | T0 COLOR_REQUIRED giốngj1; draft “màu tiêu chuẩn (có sẵn)” bị verifier FAIL. Handoff rồi2HUMAN no-send; không còn negotiation/cart/total thành công như mẫu trước. Không phải giảm quota hay timeout provider. |
| j5 — hỏi đơn cũ | ORDER_STATUS handoff rồi2HUMAN no-send, giữ ownership đúng. Không gọi hai no-send là hai lỗi hiểu khách độc lập. |
| j6 — setM/lên đơn/COD | T0 cart thật829k gồm799k+30kship, reply có receipt. T1 code hỏi tên; T2 nhận COD vẫn hỏi tên vì khách chưa cho. Payment/state được lưu; chưa hoàn tất checkout do thiếu tên. Không phạt thiếu dữ liệu khách như thiếu dữ liệu shop, không ghi là đơn đã xác nhận. |

## So sánh hành vi với lượt trước

- s02: HANDOFF → reply clarification, nhưng chưa trả giá.
- j1: trước T0 thêmL được rồi T1 mới CLAIM_CONFLICT; lần này handoff từ T0 vì màu unrecorded bị đặt tên. Cart mới không tồn tại; không thể so kết quả thành regression của variant claim gate vì gate đó chưa chạy cho mixed cart.
- j4: trước3replyeligible và thương lượng có receipt; lần này T0 handoff rồi2no-send. Đây là thụt lùi actual sales outcome cần giữ trong kết luận, dù không phải regression code đã được chứng minh.
- Các ca khác giữ cùng terminal sequence. Tổng eligible15→12, code2→2, handoff13→13, no-send4→7; ảnh2giữ nguyên, text17→14.

N1, fresh source và lời đáp khác nhau nên không quy mọi sai khác cho patch hoặc độ không ổn định của model đã được định lượng. Benefit search admission có trace/code replay; whole-turn sales outcome vẫn chưa đủ. Những lượt không gửi sau HUMAN là hệ quả đúng của handoff trước, không phải7failure độc lập.
