# Một ca fallback — không lỗi nguồn/provider

## advice-1 / b1-changed-occasion

Khách: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual customer outcome:

> Phần này em chưa trả lời được, chị nhé.

Rejected draft (không gửi, không dùng để thay điểm actual outcome):

> Dạ, set Thạch Thảo dùng chất tơ Hàn và ren mềm có độ bay bổng nên khi chị ngồi ô tô di chuyển liên tục gần 3 tiếng, vải mềm thế này khó tránh khỏi việc sẽ hơi hằn nếp gấp nhẹ ở phần váy và áo ạ.
>
> Các mẫu khác của shop hiện tại như set Thanh Vũ, Phi Vân hay Khánh Trang cũng đều chuộng các chất liệu tơ, ren hoặc thô boi để giữ nét thướt tha, thanh lịch nên đặc điểm chất vải cũng tương tự.
>
> Nếu chị đã ưng nét thêu nổi sang trọng của set Thạch Thảo thì cứ yên tâm chọn nha chị, lúc tới nơi mình chỉ cần giũ nhẹ hoặc treo lên là vải sẽ suôn phẳng lại ngay để mình tự tin diện đi đám cưới ạ!

Verifier FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447. Nguồn không xác nhận giũ hoặc treo lên làm vải suôn phẳng ngay. Lời này hứa hiệu quả xử lý nếp nhăn cụ thể; khác với so sánh chất liệu/nhận xét ít nhăn tương đối được owner cho phép. Không nới verifier để cho qua lời hứa đó. Đây là cùng kiểu lỗi lời hứa tự phẳng đã quan sát ở draft integrated vòng ack-source trước, không phải lỗi source/transport.

Integrated cùng câu khách chọn Khánh Trang và actual reply được PASS; advice là generation riêng trên captured world. Không majority vote hoặc dùng integrated PASS cứu advice FAIL.
