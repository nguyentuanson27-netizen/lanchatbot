# Vòng 2 — kết quả và nguyên nhân còn lại

Source22457e0a; raw111c78bd trước primaryb3b26c19. Ba ca prefix N1: hai fallback, một eligible/primaryPASS. Năm ca còn lại NOT_RUN; không chạy vòng3.

## Sân khấu: vẫn lấy thiếu bằng chứng làm căn cứ cho một kết quả xấu

Draft bị từ chối:

> Áo dùng chất tơ Hàn bay bổng và có độ thoáng, nguồn không ghi nhận có lớp lót dày nên dưới đèn sân khấu rọi thẳng rất dễ thấy bên trong. Nếu ngại điểm này, chị có thể cân nhắc chưa chọn set này cho sự kiện lên sân khấu trừ khi chuẩn bị sẵn đồ lót màu da hoặc áo lót phù hợp nhé ạ.

Nguồn chỉ mô tả chất liệu/thiết kế, không xác lập độ kín dưới đèn, độ dày lớp lót hoặc hiệu quả của giải pháp nội y. Cụm “nguồn không ghi nhận ... nên ... rất dễ” bộc lộ bước suy diễn sai: thiếu ghi nhận không chứng minh sản phẩm có kết quả xấu. Verifier từ chối UNSUPPORTED_PROTECTED_ASSERTION/product:SV2447 có căn cứ khi đối chiếu toàn ý. Không cần quy lỗi vào một keyword.

Owner chỉ read_product rồi trả final ở generation2, không search. Không có lỗi budget; đường search có evidence mới vẫn chỉ được kiểm bằng deterministic tests/source readback, chưa được chứng minh bằng provider trong hai prefix này. Thiếu dữ kiện để xác nhận độ kín là khoảng trống nguồn thật; bịa kết quả xấu là lỗi owner thêm vào khoảng trống đó.

## Đổi hàng: vẫn biến quy định chung thành quyết định đủ quyền

Draft:

> Dạ sản phẩm mình đổi màu được chị nhé. Thời hạn đổi bên mình là trong vòng 15 ngày kể từ khi nhận hàng, nên hiện tại 10 ngày và áo mới ướm, còn nguyên tem, sạch sẽ là hoàn toàn đủ điều kiện ạ. Phí vận chuyển đổi hàng 2 chiều là 30.000đ chị nha.

Policy đầy đủ, đúng version, cùng scopeSHOP_RULES/orderEligibility=null đã tới owner. Khách đã cung cấp chưa mặc/chưa giặt/tem/sạch/ướm; không yêu cầu reply đọc lại những từ này. Điểm vượt nguồn là “hoàn toàn đủ điều kiện” trong khi giới hạn số lần đổi của đơn chưa được xác lập, và B1 không đọc/duyệt đơn. Verifier MATERIAL_CONDITION_LOSS phù hợp với việc khẳng định quyền quá rộng. Log chỉ có kind/ref; không giả định đã biết lập luận nội bộ chính xác của verifier.

Prompt vòng2 đã tách đọc quy định/duyệt đơn, nhưng mẫu quan sát vẫn không tuân thủ. Không có bằng chứng lỗi do credential/API hoặc policy không được cấp. Không tiếp tục thêm ví dụ, regex hay vòng sửa tự động.

## Thiếu POS: giữ được phần trả lời có nguồn, giọng còn dài

VerifierPASS, primaryPASS như vòng1. Owner trả hai chất liệu và nói giá/tồn hiện chưa kiểm tra được; không gán lỗi đồng bộ, không bịa số và không hứa báo lại. “Chưa hiển thị” được đọc trong toàn câu như trạng thái phần dữ liệu đang thiếu, không phải chẩn đoán nguyên nhân hệ thống. Cách viết bằng dấu ngoặc và nhiều tính từ vẫn giống mô tả sản phẩm; naturalness1, chưa có human acceptance.

## Kết luận cho hai vòng

- Hai lỗi còn lại nằm ở kết luận owner vượt căn cứ; verifier đã chặn đúng phần đáng chặn theo đối chiếu nguồn. Không có dấu hiệu keyword-only rejection trong hai draft cụ thể này.
- Tool/context đã thay đổi có test, và ca thiếu POS được cho qua cả hai lần; không thể quy tác dụng riêng cho code hay prompt từ combined treatment/N1.
- Sửa chỉ dẫn vòng2 chưa cải thiện hai ca khó. Không coi code/tests xanh là chất lượng tư vấn đã đạt.
- Muốn tư vấn tự tin về điều kiện sử dụng cụ thể cần thông tin sản phẩm được shop xác nhận; muốn duyệt đổi thật cần nguồn/luồng kiểm tra đơn. Hai prefix không authorize việc thêm dữ liệu giả hoặc tự triển khai luồng mới.
- STOP sau đúng hai vòng. Năm ca khác của mỗi vòng chưa chạy, nên chưa có provider regression evidence cho chúng. Không nhận lại các PASS cũ vào mẫu số hiện tại.
