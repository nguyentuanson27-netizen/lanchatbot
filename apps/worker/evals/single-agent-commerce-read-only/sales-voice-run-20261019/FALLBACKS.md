# Bảy lượt fallback

**Owner làm rõ: chỉ tạm chấp nhận sáu draft sân khấu và yêu cầu sửa verifier để cho qua.** Draft xác nhận số đo ở đầu vẫn cần sửa vì không tự nhiên; không nằm trong phạm vi chấp nhận. [Quyết định](OWNER_DECISION.md). Nội dung và kết quả bên dưới là evidence lịch sử, không được chấm lại thành câu đã gửi.

Đối chiếu sau primary lock91d192be. Verifier chỉ trả kind/ref; phần giải thích là nhận xét của người review từ draft và nguồn. Không dùng keyword để suy verdict.

## stateful-2 / stateful-correction

Draft:

> Dạ, em đã cập nhật lại số đo eo 74 và mông 96 cho chị rồi ạ. Chị giữ size L như vậy là chuẩn ạ!

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}

Đối chiếu: Đã ghi số đo đúng, nhưng thêm đánh giá giữ L là “chuẩn” khi chưa có SIZE_FIT; không còn chỉ xác nhận lựa chọn.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## b1-1 / b1-changed-occasion

Draft:

> Áo tơ Hàn thêu của set Thạch Thảo có độ bay và mỏng nhẹ, nên dưới ánh đèn sân khấu rọi mạnh sẽ hơi thấu sáng chị ạ. Mình có thể mặc kèm một chiếc áo hai dây tệp màu bên trong là yên tâm đứng sân khấu. 
> 
> Hoặc nếu chị muốn một thiết kế kín đáo sẵn mà không cần phối thêm lớp trong, mẫu Váy Ngọc Trâm (với phần váy yếm 2 lớp tơ ống đứng form) sẽ phù hợp hơn, chị đổi sang mẫu đó nhé ạ?

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"},{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:V406"}]}

Đối chiếu: Gợi áo trong là yên tâm sân khấu và mẫu thay kín sẵn; nguồn chưa chứng minh kết quả che phủ đó.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## b1-2 / b1-changed-occasion

Draft:

> Áo chất tơ Hàn mềm mỏng nên đứng dưới đèn sân khấu rọi mạnh sẽ hơi lộ bên trong chị ạ. Nếu chị không muốn phải mặc thêm áo hai dây bên trong thì mình đổi sang set Khánh Trang chất thô boi dày dặn và kín đáo hơn nha.

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV1561"}]}

Đối chiếu: Tự thêm Khánh Trang “dày dặn/kín đáo hơn”; mô tả nguồn không có độ dày đó.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## b1-3 / b1-changed-occasion

Draft:

> Áo Thạch Thảo dùng chất tơ Hàn thêu có độ bay nhẹ nên đứng dưới đèn sân khấu mạnh sẽ hơi thấu quang chị ạ. 
> 
> Nếu chị ngại mặc thêm áo hai dây bên trong, mình có thể chuyển sang **Váy Diệp An** (thiết kế 2 lớp kín đáo, đứng form rất phù hợp lên sân khấu). Chị muốn giữ set Thạch Thảo hay đổi sang váy Diệp An ạ?

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:V168"}]}

Đối chiếu: Gắn mô tả hai lớp/kín đáo của Diệp An với giải quyết hoàn cảnh sân khấu; cần xét ranh giới lời khuyên và công năng theo toàn đoạn.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## advice-1 / b1-changed-occasion

Draft:

> Chất tơ Hàn của áo khá mỏng nhẹ, đứng dưới đèn rọi mạnh trên sân khấu sẽ dễ bị lộ bên trong chị ạ. Mình có thể mặc kèm áo hai dây bên trong, hoặc nếu chị muốn đổi sang mẫu kín đáo hơn thì Váy Ngọc Trâm có thiết kế 2 lớp sẽ dày dặn hơn nha.

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:V406"}]}

Đối chiếu: Suy hai lớp thành dày dặn hơn cho Ngọc Trâm; đây là thuộc tính mới chưa có trong nguồn.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## advice-2 / b1-changed-occasion

Draft:

> Áo tơ của set Thạch Thảo mỏng nhẹ nên đứng dưới đèn sân khấu rọi mạnh sẽ dễ bị thấu quang chị ạ. 
> 
> Nếu chị muốn đổi sang mẫu kín đáo hơn để không phải mặc chồng áo bên trong, mình có thể chuyển sang **set Khánh Trang** (chất thô boi đứng dáng, kín đáo) hoặc **set Thanh Vũ** (ren cotton dệt) nhé ạ. Chị ưng mẫu nào để em hỗ trợ mình chuyển sang mẫu đó nha!

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV1561"},{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV165"}]}

Đối chiếu: Gợi Khánh Trang/Thanh Vũ như giải pháp kín hơn, không cần mặc chồng áo; dữ kiện nguồn chưa xác lập hiệu quả đó.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.

## advice-3 / b1-changed-occasion

Draft:

> Dưới đèn sân khấu rọi mạnh thì áo tơ Hàn của set Thạch Thảo có thể hơi thấu quang và dễ lộ bên trong chị ạ. 
> 
> Nếu chị muốn đổi mẫu kín đáo hơn cho yên tâm, Váy Diệp An bên em có thiết kế 2 lớp rất kín đáo và đứng form, mặc lên sân khấu sẽ phù hợp hơn. Hoặc nếu vẫn thích set Thạch Thảo, mình chỉ cần mặc thêm một chiếc áo lót mỏng bên trong là xử lý được ạ.

Verdict: {"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"product:SV2447"}]}

Đối chiếu: Nói thêm áo trong “là xử lý được” nỗi lo dưới đèn mạnh; chưa có căn cứ kết quả của bộ phối.

Khách thực nhận: Phần này em chưa trả lời được, chị nhé.
