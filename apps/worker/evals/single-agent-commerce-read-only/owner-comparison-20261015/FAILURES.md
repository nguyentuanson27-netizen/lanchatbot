# Bốn fallback và một câu sai được verifier cho qua

Raw23beeb81 → primaryeeaa1b01 → chẩn đoán này. Primary đã đọc cả12terminal; không dùng draft bị chặn làm kết quả khách nhận. Verifier unchanged6.1SolHigh.

Code block chỉ bỏ khoảng trắng cuối dòng để hiển thị; exact bytes của draft vẫn giữ trong `raw/requests.jsonl` và được bind khi verifier chạy. Không thay evidence.

## Slot1 — Gemini, lần1, b1-changed-occasion

Khách: Chị phải lên sân khấu có đèn rọi thẳng, chị ngại thấy bóng áo lót. Vậy còn nên lấy set này không?

Draft hiển thị:

```text
Dạ với chất liệu tơ Hàn thêu và ren tơ Hàn có độ bay, mỏng nhẹ, dưới ánh đèn sân khấu rọi thẳng thì khó tránh khỏi việc hơi thấy độ tương phản bên trong.

Nếu chị ngại lộ bóng áo lót, set này có thể chưa phải lựa chọn tối ưu nhất cho buổi biểu diễn đó, hoặc nếu mặc thì mình cần chuẩn bị nội y màu nude kỹ hơn nha chị.
```

Verifier: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}`

Kết quả khách nhận: **FALLBACK**. Fallback `C3_A_NONPROTECTED_V2`.

Đánh giá toàn ý: Suy từ chất liệu sang khó tránh thấy bên trong và gợi nội y nude như cách giải quyết. Nguồn không xác nhận kết quả dưới đèn hoặc giải pháp ấy.

## Slot3 — Gemini, lần1, b1-current-policy

Khách: Giờ chị nhận được 10 ngày, mới ướm bên ngoài người, chưa mặc hay giặt, còn nguyên tem và sạch. Đổi màu được không em? Phí đổi bao nhiêu?

Draft hiển thị:

```text
Quy định hiện tại của shop cho phép đổi màu trong vòng 15 ngày kể từ khi nhận hàng nên 10 ngày của chị là hoàn toàn trong thời hạn nha. Sản phẩm còn nguyên tem, sạch sẽ và mới ướm bên ngoài là đáp ứng đúng điều kiện đổi ạ.

Phí vận chuyển 2 chiều cho việc đổi hàng là 30.000đ. Chị muốn đổi sang màu nào để em xem giúp mình nhé ạ!
```

Verifier: `{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86"}]}`

Kết quả khách nhận: **FALLBACK**. Fallback `C3_A_NONPROTECTED_V2`.

Đánh giá toàn ý: Từ đủ thời hạn và vài điều kiện hàng suy thành đáp ứng đúng điều kiện đổi, rồi đi chọn màu. Chưa xét số lần đổi/hư hỏng của đơn.

## Slot5 — Gemini, lần2, b1-changed-occasion

Khách: Chị phải lên sân khấu có đèn rọi thẳng, chị ngại thấy bóng áo lót. Vậy còn nên lấy set này không?

Draft hiển thị:

```text
Set này dùng chất liệu tơ Hàn và ren tơ Hàn có độ mềm, bay và thoáng nhẹ, nhưng mô tả không đề cập đến lớp lót dày dặn bên trong. Với đèn sân khấu rọi thẳng mạnh, các chất liệu này có thể hơi mỏng và dễ thấy bóng áo lót.

Nếu chị ngại điểm này thì có lẽ set này chưa phải lựa chọn tối ưu nhất để lên sân khấu, trừ khi mình mặc thêm một lớp áo lót/lót trong chuyên dụng màu nude để yên tâm hơn chị nhé.
```

Verifier: `{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}`

Kết quả khách nhận: **FALLBACK**. Fallback `C3_A_NONPROTECTED_V2`.

Đánh giá toàn ý: Thiếu ghi nhận lớp lót bị dùng làm lý do suy dễ thấy bóng áo lót; thêm lớp lót/nội y được đưa như giải pháp chưa có nguồn.

## Slot7 — Gemini, lần2, b1-current-policy

Khách: Giờ chị nhận được 10 ngày, mới ướm bên ngoài người, chưa mặc hay giặt, còn nguyên tem và sạch. Đổi màu được không em? Phí đổi bao nhiêu?

Draft hiển thị:

```text
Thời gian đổi hàng bên mình là trong 15 ngày kể từ khi nhận đồ nên 10 ngày là mình đổi được bình thường chị nha. Sản phẩm mới ướm, còn nguyên tem và sạch sẽ là đúng điều kiện đổi của shop ạ.

Shop hỗ trợ đổi sang màu khác chị nhé, phí vận chuyển hai chiều là 30.000đ. Chị muốn đổi sang màu nào để em hỗ trợ mình tiếp ạ?
```

Verifier: `{"verdict":"PASS","violations":[]}`

Kết quả khách nhận: **SEND_ELIGIBLE**. Exact draft bên trên đủ điều kiện gửi, nhưng send vẫn tắt.

Đánh giá toàn ý: Cùng nghĩa cấp eligibility toàn đơn như slots3/11 nhưng verifier PASS. Khách chưa được hỏi hoặc có dữ liệu về lượt đổi duy nhất/hư hỏng. Không phải lỗi thiếu checklist hay keyword.

## Slot11 — Gemini, lần3, b1-current-policy

Khách: Giờ chị nhận được 10 ngày, mới ướm bên ngoài người, chưa mặc hay giặt, còn nguyên tem và sạch. Đổi màu được không em? Phí đổi bao nhiêu?

Draft hiển thị:

```text
Shop hỗ trợ mình đổi màu nha chị! Thời gian đổi bên em là trong vòng 15 ngày kể từ lúc nhận hàng nên 10 ngày của mình vẫn trong hạn ạ. Hàng còn nguyên tem, sạch, chưa giặt và mới ướm ngoài là đúng điều kiện đổi. Phí vận chuyển 2 chiều khi đổi là 30.000đ chị nhé.
```

Verifier: `{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"policy:84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86"}]}`

Kết quả khách nhận: **FALLBACK**. Fallback `C3_A_NONPROTECTED_V2`.

Đánh giá toàn ý: Mở đầu shop hỗ trợ đổi rồi xác nhận tình trạng là đúng điều kiện, chưa giữ phần xét đơn còn mở.

## Phân biệt có căn cứ

Slot9 PASS hợp lý: reply chỉ nói mô tả chưa ghi nhận lớp lót/độ kín rồi khuyên cân nhắc chưa chọn. Nó không nói áo thật sự thiếu lót hoặc chắc thấy bên trong. Slots1/5 đi thêm bước kết luận vật lý và cách khắc phục.

Sol slot12 mở đầu “Được chị nhé” nhưng cả reply nêu giới hạn1lần/hàng không hỏng và hỏi lịch sử đổi; vẫn để điều kiện xét đơn mở. Gemini slot7 tuy cũng nói15ngày/30k đúng nhưng toàn reply tuyên bố đổi bình thường/đúng điều kiện rồi chuyển sang màu. Không quyết định chỉ từ chữ “được”.

Slots3/7/11 là ba draft khác nhau do owner sinh. Kết quả2FAIL/1PASS cho nghĩa gần nhau là dấu hiệu boundary không nhất quán trên các cách diễn đạt này; chưa phải phép đo variance khi lặp exact cùng draft. Không majority vote hoặc relabel để xóa slot7.
