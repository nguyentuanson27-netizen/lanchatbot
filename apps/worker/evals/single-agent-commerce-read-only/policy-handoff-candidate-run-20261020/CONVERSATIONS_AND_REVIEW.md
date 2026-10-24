# Năm hội thoại — policy + candidate handoff — 2026-10-20

Run source `05be90e8ef73cb09aa82c8f6e3a6e627b0933e81`. Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol high. Mỗi ca một lần. **3 USABLE / 2 NEEDS_EDIT**, do agent review toàn câu; chưa phải owner/human adjudication. Không chấm theo từ khóa.

Bốn câu SEND_ELIGIBLE chưa gửi qua Meta; một câu HANDOFF được dispatcher capture trong DB tạm. Không live send/Pancake tag delivery/nhân viên thật. DB đã xóa.

## 1. USABLE — SEND_ELIGIBLE

Khách:
> Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Câu thực tế đủ điều kiện gửi / dispatcher capture:

```text
Dạ, quy định đổi hàng của shop yêu cầu sản phẩm chỉ ướm bên ngoài chứ không mặc vào người. Việc mình đã mặc thử vào người, dù còn tem và chưa mặc ra ngoài, thì không đáp ứng điều kiện đổi hàng ạ.
```

Từ chối đúng việc đã mặc vào không đáp ứng đổi tự nguyện. Có giải thích trực tiếp liên quan; vẫn hơi hành chính và lặp nhưng dùng được, không cần bắt thiếu điều kiện khác.

State: BOT; event/tag intent/outbox: 0/0/0.

So với lượt trước:
- Nhãn cũ: USABLE. Câu cũ: “Dạ quy định đổi hàng của shop yêu cầu sản phẩm chỉ ướm bên ngoài chứ không mặc trực tiếp vào người ạ. Vì vậy trường hợp chị đã mặc thử, shop rất tiếc chưa thể hỗ trợ đổi size cho chị được dù sản phẩm vẫn còn nguyên tem và chưa mang ra ngoài.”

## 2. NEEDS_EDIT — SEND_ELIGIBLE

Khách:
> Chị mới ướm bộ này bên ngoài thôi, chưa mặc vào. Muốn đổi sang size L thì được không em?

Câu thực tế đủ điều kiện gửi / dispatcher capture:

```text
Dạ, shop hỗ trợ đổi size cho mình chị nhé. Chị nhận hàng được mấy hôm rồi ạ, sản phẩm còn nguyên tem mác, sạch sẽ và chưa giặt không chị?
```

Câu mở nghe như đồng ý đổi cho riêng khách, rồi mới hỏi ngày nhận và nhiều tình trạng hàng. Các thông tin này còn thiếu và có liên quan; hỏi thêm không tự thân là sai, cũng chưa có lời báo đã chuyển hay đã duyệt. Tuy vậy câu trả lời nên thể hiện rõ đang xác nhận yêu cầu, ngắn và có thứ tự; hiện khách phải xử lý một cụm câu hỏi. Không coi việc chưa handoff là lỗi thực thi khi chưa có lệnh chuyển.

State: BOT; event/tag intent/outbox: 0/0/0.

So với lượt trước:
- Nhãn cũ: NEEDS_EDIT. Câu cũ: “Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.”

## 3. NEEDS_EDIT — SEND_ELIGIBLE

Khách:
> Chị thử bộ này rồi, giờ muốn đổi size thì được không?

Câu thực tế đủ điều kiện gửi / dispatcher capture:

```text
Dạ, shop hỗ trợ đổi size trong 15 ngày kể từ khi nhận hàng nếu sản phẩm còn nguyên tem mác, chưa giặt và chỉ ướm bên ngoài chứ chưa mặc vào người. Không biết lúc nãy mình chỉ ướm bên ngoài hay đã mặc thử vào người rồi ạ?
```

Đã hỏi đúng việc chỉ ướm hay mặc vào, không cấp ngoại lệ cho mặc thử. Nhưng trước câu hỏi quyết định vẫn đọc thời hạn và các điều kiện mà khách chưa hỏi; chưa đạt mục tiêu hỏi rõ trước, trả lời gọn. Có thể bỏ cả câu chính sách đầu mà vẫn giữ câu hỏi cần thiết.

State: BOT; event/tag intent/outbox: 0/0/0.

So với lượt trước:
- Nhãn cũ: NEEDS_EDIT. Câu cũ: “Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng, với điều kiện sản phẩm còn nguyên tem mác, chưa giặt, chưa qua sử dụng và chỉ ướm bên ngoài không mặc vào người ạ (phí vận chuyển hai chiều là 30.000đ).

Chị cho em hỏi lúc nãy mình mới chỉ ướm bên ngoài hay đã mặc thử vào người rồi ạ?”

## 4. USABLE — SEND_ELIGIBLE

Khách:
> Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?

Câu thực tế đủ điều kiện gửi / dispatcher capture:

```text
Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ ngày nhận hàng chị ạ. Phí vận chuyển 2 chiều khi đổi hàng là 30.000đ chị nhé.
```

Trả đủ đúng hai điều khách hỏi: 15 ngày từ nhận và phí hai chiều 30.000đ. Hai câu rõ, không kéo thêm checklist.

State: BOT; event/tag intent/outbox: 0/0/0.

So với lượt trước:
- Nhãn cũ: USABLE. Câu cũ: “Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ ngày nhận hàng, phí vận chuyển 2 chiều là 30.000đ chị nhé.”

## 5. USABLE — HANDOFF

Khách:
> Đường may ở nách áo bị lỗi, chị mặc vào mới thấy. Chị nhận hôm qua, giờ shop xử lý sao em?

Câu thực tế đủ điều kiện gửi / dispatcher capture:

```text
Em đã chuyển nhân viên hỗ trợ lỗi sản phẩm cho chị. Nhân viên sẽ kiểm tra và hướng dẫn chị đổi/trả nhé.
```

Tiếp nhận lỗi và thông báo chuyển nhân viên kèm bước kiểm tra/hướng dẫn đổi trả. Không bắt khách nghe lại điều kiện, không tự xác nhận lỗi đã được duyệt; tin đã được dispatcher capture và state HUMAN. Câu cố định vẫn chung, không coi đây là lời tư vấn do model viết.

State: HUMAN; event/tag intent/outbox: 1/1/1.

So với lượt trước:
- Nhãn cũ: NEEDS_EDIT. Câu cũ: “Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.”

## Nhận xét cả lượt

Ca báo lỗi có tin tiếp nhận và hướng xử lý hữu ích hơn câu vận đơn mặc định. Đây là thay đổi do cấu hình code-owned. Model không viết câu handoff đó.

Ca chưa rõ cách thử vẫn đưa điều kiện trước rồi mới hỏi, nên chỉ thay một bullet chưa chứng minh sửa được thói quen trả lời này. Ca mới ướm thì model chọn hỏi thêm các dữ kiện chưa có, chưa chuyển nhân viên; câu mở nghe như đồng ý trước và cụm câu hỏi còn dồn. Không tự coi mọi câu hỏi thêm hoặc việc chưa chuyển là sai chính sách.

Số USABLE tăng từ2 lên3 chủ yếu ở tin cố định của ca lỗi. Chưa có bằng chứng model tư vấn tự nhiên hơn ổn định; chỉ một mẫu mỗi ca. Không sửa raw/nhãn cũ, không chạy bù hay tự nối full B.
