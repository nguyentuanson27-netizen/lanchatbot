# Finding từ lần chạy đầy đủ Phase B

Đã đọc đủ **24 ca B1 và 7 lượt stateful**, mỗi ca một lần, cùng source `0d5a1d14916f9bcb587af37722dcf7cedd1c33c2`. Raw được lưu ở commit `cebd5cb0`, trước primary `572e4b65` và trước chẩn đoán. [Toàn bộ hội thoại](CONVERSATIONS.md) · [Review từng lượt](PRIMARY_REVIEW.md) · [Metrics](METRICS.json).

| Phần | Kết quả runtime | Review cả lượt |
| --- | --- | --- |
| 24 B1 | 20 eligible, 4 fallback | 15 dùng được, 5 cần sửa, 4 fallback |
| 7 stateful | 4 eligible, 2 handoff, 1 no-send | 5 dùng được, 2 chưa giải quyết được việc mua |

Tổng primary: **20 USABLE / 5 NEEDS_EDIT / 6 FALLBACK_OR_NO_SEND**. Nhóm review cuối gồm cả hai kết quả mua dừng ở handoff/no-send; runtime chỉ có **4 static fallback**. Một USABLE là control thiếu POS được trả phần đã biết, một USABLE chỉ là yêu cầu chuyển ownership. Không quy thành 20 giao dịch hoàn tất.

## Bốn fallback

**1. Sân khấu — verifier FAIL.** Khách đổi từ tiệc trong nhà sang sân khấu đèn mạnh, hỏi độ kín để quyết định đổi mẫu. Nháp không gửi:

> Áo chất tơ Hàn có độ bay và thoáng, dưới ánh đèn sân khấu mạnh có thể hơi thấu sáng nhẹ. Chị chỉ cần mặc kèm một chiếc áo hai dây hoặc lót mỏng bên trong là hoàn toàn yên tâm lên sân khấu mà vẫn giữ trọn vẻ bay bổng, sang trọng của set đồ ạ.

Verdict: `UNSUPPORTED_PROTECTED_ASSERTION`, ref `product:SV2447`. Cảnh báo nguy cơ và gợi lớp mặc là hướng owner đã cho phép; không tự kết luận sai chỉ vì thiếu phép thử. Câu mới nói “chỉ cần…là hoàn toàn yên tâm”, có thể bị đọc thành một biện pháp đủ để bảo đảm độ kín. Cần đối chiếu đúng ranh giới lời trấn an thông thường với bảo đảm vật lý. Verdict chỉ có kind/ref, không cho biết model đã chặn phần nào. Chưa có bằng chứng nó chỉ dò từ khóa.

**2. Ngoài trời/dễ nóng — verifier FAIL vẫn lệch hướng owner.** Nháp không gửi:

> Chị yên tâm nha, bộ này dùng chất tơ Hàn thêu và ren tơ Hàn mềm mại, thoáng khí và có độ bay tự nhiên nên mặc thoải mái, ở ngoài trời lâu cũng không bị bí đâu ạ.

Verdict cũng là `UNSUPPORTED_PROTECTED_ASSERTION`, ref `product:SV2447`. Nguồn có mềm/thoáng/độ bay; owner đã chấp nhận nghĩa tư vấn cảm giác mặc tương tự, kể cả lời nhấn mạnh trong ngữ cảnh đó. Lần chặn này không tự chứng minh lời tư vấn sai. Đây là mismatch rõ hơn giữa phán quyết với hướng owner đã duyệt. Audit xác nhận prompt mới và exact product context đã vào request, nên không phải chạy nhầm prompt cũ hoặc thiếu dữ liệu giá/fit. Giả thuyết cần xem lại là prompt vẫn để model tự quyết ranh giới cảm nhận/guarantee; chưa chứng minh nguyên nhân nội bộ hay cách đọc theo keyword.

**3. Chân váy/thiếu POS — hết budget, chưa tới verifier.** Khách hỏi vải/dáng riêng chân váy, size M còn thì báo giá. Đây là control `POS_UNAVAILABLE` đã đăng ký, không phải outage thật.

Trace: `read_product` thành công, đã có mô tả phần chân váy, giá/tồn chưa có. Model tiếp tục tìm “chân váy Thạch Thảo”, nhận ba mẫu khác ở trạng thái AMBIGUOUS. Ở lần chỉ được trả lời cuối, nó vẫn gọi `read_policy` dù `tools=[]/NONE`. Guard trả BUDGET và không thực thi tool thứ ba.

Lỗi là không dùng phần độc lập đã biết, tìm một sản phẩm khác dù khách đang hỏi thành phần của mẫu đã bind. Đọc thêm không phục hồi nguồn POS thiếu. Không sửa bằng tăng budget, retry hay gán mẫu gần giống; đây không phải verifier chặn quá tay.

**4. Đổi màu sau 10 ngày — verifier FAIL cần xét lại phạm vi câu hỏi.** Khách mới cầm lên xem trước gương, còn tem, hỏi còn kịp đổi màu và phí; lịch sử nói 7 ngày. Nháp không gửi:

> Dạ vẫn kịp chị nhé, thời hạn đổi của shop là 15 ngày từ lúc nhận hàng ạ. Phí đổi hai chiều là 30.000đ, sản phẩm còn nguyên tem mác và chưa qua sử dụng là mình đổi màu được chị nha.

Verdict: `MATERIAL_CONDITION_LOSS`, ref policy hiện hành. Thời hạn 15 ngày và phí 30k đều đúng. Đoạn cuối có thể bị hiểu là hai điều kiện đủ, trong khi toàn hội thoại đang hỏi thời hạn/phí và chưa nêu vi phạm thực tế. Không kết luận thiếu riêng chữ “chưa giặt” là sai policy; cũng không suy mọi điều kiện của đơn đã được duyệt. Cần kiểm cách phân biệt tóm tắt policy với cấp quyền/duyệt đơn. Các ca thời hạn khác và ba ca thật sự vi phạm policy đều được trả đúng. Không quay về bắt đọc checklist.

Actual terminal của cả bốn ca là `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Nháp chỉ phục vụ chẩn đoán, không dùng cứu điểm.

## Năm reply qua verifier vẫn cần sửa chất lượng

| Ca | Nhận xét toàn lượt |
| --- | --- |
| `b1-buying-concern` | Lo nhiều ren nhưng nhận hai đoạn khen chất/dáng, nhắc ngân sách và mời lấy set khi B1 không có tool mua. Chưa giúp cách diện bớt cầu kỳ bằng lời thực dụng. |
| `b1-buying-concern-v2` | Hiểu gu đồ trơn nhưng kéo dài ba đoạn, mở áo/váy/cả set rồi trấn an cả set; khách nhờ shop chọn vẫn chưa có hướng rõ. |
| `b1-changed-occasion-v3` | Đã đổi sang áo lẻ cho dịp gặp khách, có tiến bộ về quyết định. Giọng vẫn lặp tính từ và thêm đoạn khen cả set. Không coi phương án thứ hai tự là lỗi. |
| `b1-partial-source-v3` | Không còn xin size/hẹn kiểm tra như trước, nhưng đổi xưng hô từ chị sang bạn và báo cáo kết nối hệ thống. Phần vải đúng; lỗi ở giọng/nhất quán. |
| `b1-buying-concern-v3` | Chọn áo 499k phối váy đen sẵn có hợp lý. Câu dài, nhiều tính từ, nhắc ngân sách và ngoặc quay về set; cần sửa giọng. Không ép mua lẻ thành đáp án duy nhất. |

Hướng dẫn giọng mới **chưa chứng minh hiệu quả**: model vẫn biến mô tả nguồn thành lời quảng cáo. Request đã chứa câu hỏi/lịch sử đúng, không thể quy chung là thiếu nhu cầu khách trong context. Chưa có căn cứ rằng thêm một dòng “nói tự nhiên” hoặc rút ngắn prompt tùy ý sẽ giải quyết. Review dùng toàn lượt, không đếm keyword hay buộc cùng bố cục.

## Stateful: đã thực hiện được gì

- **Thêm giỏ:** nhận số đo 76/98, đọc sản phẩm rồi thêm đúng áo AO/BE/M. Cart tồn tại, stage CART_OPEN/revision 4. Reply qua verifier và được capture đúng một lần. Vẫn có một read, chưa phải tuân gọi mutation trực tiếp tuyệt đối.
- **Đổi lựa chọn:** giữ màu BE, đổi L rồi quantity 2; sales revision 6/cart revision 3. Model ban đầu gửi quantity cùng SET_COMPONENT_VARIANT, sau readback gọi SET_QUANTITY để hoàn tất. Hai round đủ trong lần này, chưa chứng minh tối ưu hay ổn định.
- **Báo tiền:** quote đúng **978.100đ**, từ subtotal 998.000đ, giảm 49.900đ, ship 30.000đ. Không lặp lỗi tự tính bỏ ưu đãi của run trước.
- **Sửa số đo:** profile 74/96/revision 3, giữ L/BE/2; ACK không đọc lại toàn số đo, không tự thay size hoặc tư vấn fit mới.
- **Private checkout:** không gọi model; planner trả `CART_ETA_UNAVAILABLE`, không tạo preview, chuyển người vì dependency và không có tin capture. Khác lỗi thiếu cart trước đây: lần này cart đã thành công. Reason chưa phân biệt chính xác prep/transit/mapping nào thiếu. Destination mapping đã biết còn thiếu, nhưng chưa chứng minh nó là nguyên nhân duy nhất của reason này.
- **Xác nhận:** sau handoff, không gọi model và NO_SEND vì authority đã đổi. Đúng boundary quyền; mua hàng vẫn chưa hoàn tất.
- **Gặp nhân viên:** handoff theo yêu cầu qua code/policy. Dùng được cho chuyển ownership trong test DB, chưa chứng minh nhân viên thật nhận hoặc phục vụ khách.

Failure-feedback mới không được kích hoạt trong các mutation thành công, nên run này không chứng minh riêng tác động của thay đổi code đó. Đây là quan sát N1 với cả prompt/candidate và nguồn live khác; không quy hết cải thiện stateful cho một thay đổi.

## Hướng tiếp theo, chưa thực hiện trong run này

1. Đối chiếu đúng nghĩa còn lệch với quyết định owner: cảm giác đã được chấp nhận, cảnh báo/phối thông thường và lời thực sự bảo đảm kết quả vật lý. Giữ ranh giới tính năng bịa, fit, tiền, policy trái nguồn và receipts. Không cài whitelist câu, regex hoặc bỏ verifier.
2. Với partial source, dùng availability và đúng referent thành phần: thiếu POS không phải chưa tìm được sản phẩm. Trả phần mô tả đã có, không tìm món khác/policy để lấp nguồn thiếu. Giữ budget và không retry.
3. Xử lý giọng trên toàn lượt mua và cách diễn đạt; chưa thêm danh sách từ cấm, câu trả lời mẫu hoặc di chuyển dữ liệu sang tầng mới. Không gộp chấm giọng vào semantic verifier.
4. Truy đúng prep/transit/mapping và nguồn được duyệt cho ETA trước khi kỳ vọng checkout hoàn tất. Không tạo ETA hoặc map địa chỉ bằng suy luận model. Giữ private checkout trong code.

Đã dừng sau run/report/tasks/PR update theo scope; không sửa sau kết quả hoặc chạy thêm. **A OWNER_BYPASS; sales/live STOP; source checkout BLOCKED.**
