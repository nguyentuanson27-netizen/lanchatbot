# Toàn bộ 51 lượt — đánh giá outcome trước verdict

Markdown bỏ khoảng trắng cuối dòng để hiển thị; PRIMARY_REVIEW.json giữ nguyên text. Source d699bb4a; đây là51 lượt thuộc nhiều nhóm/journey, không phải51 hội thoại độc lập. Advice là replay thế giới đã capture; baseline là live-source control mô tả. Không gộp thành PASS. Lời mời code bị redactor rút gọn; [NAME]/[PHONE]/[ADDRESS] trong bản lưu không phải literal gửi khách.

## advice-1 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận trong replay:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## advice-1 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận trong replay:**

```text
Chân váy được làm từ chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé. Hiện tại em chưa kiểm tra được giá cũng như tình trạng size M cho riêng chân váy này.
```

**Đánh giá: USABLE.** Trả phần chất liệu/dáng có nguồn, giữ giá/tồn sizeM là chưa kiểm tra được. Không tự tạo tồn hoặc từ chối bán lẻ; chưa có đường follow-up trong B1.

## advice-1 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận trong replay:**

```text
Chân váy dùng chất ren tơ Hàn mềm với form nhẹ và độ rũ tự nhiên, kết hợp cùng áo tơ thêu nên mặc đi tiệc ban ngày trông rất bay bổng, thanh nhã chứ không bị rườm rà đâu chị ạ.

Nguyên set này có giá 799.000đ, hoàn toàn vừa vặn với ngân sách tầm 900 nghìn của chị. Chị lấy set này luôn nhé ạ?
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## advice-1 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận trong replay:**

```text
Dạ, mẫu SD375 bên em có 2 lựa chọn:
- Phần áo lẻ: 929.000đ
- Cả bộ: 1.065.000đ

Chị muốn lấy áo lẻ hay cả bộ ạ?
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## advice-2 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận trong replay:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## advice-2 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận trong replay:**

```text
Chân váy Thạch Thảo làm từ chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nhé.

Dạ hiện tại em chưa kiểm tra được giá và tình trạng còn size M của chân váy lẻ.
```

**Đánh giá: USABLE.** Trả phần chất liệu/dáng có nguồn, giữ giá/tồn sizeM là chưa kiểm tra được. Không tự tạo tồn hoặc từ chối bán lẻ; chưa có đường follow-up trong B1.

## advice-2 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận trong replay:**

```text
Chất ren tơ Hàn của chân váy mềm, form nhẹ và có độ rũ tự nhiên nên mặc lên tạo cảm giác bay bổng, thanh thoát chứ không bị nặng nề hay rườm rà đâu chị nhé, đi tiệc ban ngày rất hợp và lịch sự ạ.

Giá mua trọn set là 799.000đ, vừa vặn trong ngân sách 900 nghìn của chị luôn nha.
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## advice-2 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận trong replay:**

```text
Dạ áo dài SD375 hiện có 2 lựa chọn giá:
- Áo lẻ: 929.000đ
- Nguyên set: 1.065.000đ
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## advice-3 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận trong replay:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## advice-3 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận trong replay:**

```text
Chân váy làm bằng chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên chị nha. Hiện tại hệ thống của shop đang ghi nhận nguyên set Thạch Thảo nên em chưa kiểm tra được giá và tồn kho riêng cho chân váy size M.
```

**Đánh giá: NEEDS_EDIT.** Phần mô tả có ích và không bịa giá/tồn, nhưng tự giải thích bằng "hệ thống chưa cập nhật" hoặc "ghi nhận nguyên set"; context chỉ chứng minh nguồn chưa đọc được, chưa chứng minh lý do này. Cách nói cũng khiến khách phải nghe chuyện hệ thống.

## advice-3 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận trong replay:**

```text
Chất ren tơ Hàn của chân váy mềm và có độ rũ tự nhiên nên mặc đi tiệc ban ngày rất nhã nhặn, không bị rườm rà đâu chị ạ. Nguyên set có giá 799.000đ, hoàn toàn nằm trong ngân sách 900.000đ của mình.
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## advice-3 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận trong replay:**

```text
Dạ, mẫu áo dài SD375 hiện có 2 lựa chọn với mức giá như sau ạ:
- Áo lẻ: 929.000đ
- Cả set: 1.065.000đ

Chị muốn chọn phương án nào ạ?
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## b1-1 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## b1-1 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận:**

```text
Chân váy Thạch Thảo làm bằng chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất nhẹ nhàng ạ.

Hiện tại em chưa kiểm tra được giá, tồn kho cũng như chưa xác định rõ việc bán lẻ riêng chân váy này, nên em chưa báo chính xác cho chị được nhé ạ.
```

**Đánh giá: USABLE.** Trả phần chất liệu/dáng có nguồn, giữ giá/tồn sizeM là chưa kiểm tra được. Không tự tạo tồn hoặc từ chối bán lẻ; chưa có đường follow-up trong B1.

## b1-1 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận:**

```text
Mặc đi tiệc ban ngày rất nhã nhặn và sang trọng chị nhé, không bị rườm rà đâu ạ vì chân váy dùng ren tơ Hàn mềm với độ rũ tự nhiên, kết hợp cùng áo tơ thêu nổi form nhẹ nhàng, thanh thoát.

Cả set có giá 799.000đ, nằm trọn trong ngân sách 900 nghìn của chị luôn nha. Chị có muốn chốt luôn nguyên set này không ạ?
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## b1-1 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận:**

```text
Áo dài SD375 bên shop có hai lựa chọn giá để chị cân nhắc:
- Mua áo lẻ: 929.000đ
- Mua cả set: 1.065.000đ

Chị muốn lấy áo lẻ hay nguyên set ạ?
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## b1-2 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## b1-2 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận:**

```text
Chân váy làm từ chất liệu ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên rất đẹp chị ạ.

Hiện tại hệ thống của shop chưa tra được chính xác thông tin tồn kho, giá cũng như việc có bán lẻ riêng chân váy hay không, nên em chưa báo ngay cho chị được. Chị cần em hỗ trợ thêm mẫu nào khác không ạ?
```

**Đánh giá: USABLE.** Trả phần chất liệu/dáng có nguồn, giữ giá/tồn sizeM là chưa kiểm tra được. Không tự tạo tồn hoặc từ chối bán lẻ; chưa có đường follow-up trong B1.

## b1-2 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận:**

```text
Trọn bộ set váy này có giá 799.000đ, hoàn toàn vừa vặn trong ngân sách 900k của chị nhé ạ.

Chị yên tâm là chất liệu ren tơ Hàn rất mềm, form nhẹ và có độ rũ, bay tự nhiên nên mặc đi tiệc ban ngày không bị rườm rà hay nặng nề đâu ạ. Phần áo tơ thêu nổi thanh nhã kết hợp cùng chân váy ren mềm tạo cảm giác nhẹ nhàng, sang trọng và rất vừa vặn cho không gian tiệc ban ngày.
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## b1-2 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận:**

```text
Áo dài mã SD375 hiện có 2 lựa chọn mua cho chị:
- Mua lẻ áo (AO): 929.000đ
- Mua cả set (COMPOSITE): 1.065.000đ

Chị muốn lấy áo lẻ hay nguyên set ạ?
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## b1-3 / b1-changed-occasion

**Khách:** Chị đang tính lấy set Thạch Thảo để mặc đi tiệc trong nhà.

**Shop trước đó:** Dịp đó mặc set này hợp chị ạ.

**Khách:** Mà chị vừa được xếp lên sân khấu, đèn rọi khá mạnh. Áo có dễ lộ bên trong không em? Nếu có thì chị đổi mẫu khác.

**Kết quả thực nhận:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách cần đánh giá lại lựa chọn cho sân khấu nhưng chỉ nhận static fallback; không giải quyết được quyết định mua.

## b1-3 / b1-partial-source-v2

**Khách:** Chị muốn lấy riêng chân váy thôi. Vải với dáng váy thế nào em? Size M còn thì báo chị giá luôn nhé.

**Kết quả thực nhận:**

```text
Chân váy dùng chất ren tơ Hàn mềm, form nhẹ và có độ rũ tự nhiên, mặc lên rất mềm mại và bay bổng chị ạ.

Hiện tại hệ thống chưa cập nhật thông tin giá và tồn kho riêng cho chân váy lẻ hay size M, nên em chưa kiểm tra chính xác được phần này với chị nha.
```

**Đánh giá: NEEDS_EDIT.** Phần mô tả có ích và không bịa giá/tồn, nhưng tự giải thích bằng "hệ thống chưa cập nhật" hoặc "ghi nhận nguyên set"; context chỉ chứng minh nguồn chưa đọc được, chưa chứng minh lý do này. Cách nói cũng khiến khách phải nghe chuyện hệ thống.

## b1-3 / b1-buying-concern

**Khách:** Chị thích bộ này nhưng nhìn ảnh thấy ren hơi nhiều. Mặc đi tiệc ban ngày có bị rườm rà quá không em? Ngân sách chị tầm 900 nghìn.

**Kết quả thực nhận:**

```text
Mặc đi tiệc ban ngày hoàn toàn hợp lý nha chị, không bị rườm rà đâu ạ. Set này dùng chất ren tơ Hàn mềm kết hợp áo tơ thêu form nhẹ, có độ bay và rũ tự nhiên nên nhìn rất thanh thoát, sang trọng mà vẫn mềm mại, nhẹ nhàng cho ban ngày.

Cả set có giá 799.000đ, nằm trọn trong ngân sách 900.000đ của chị luôn nha. Chị lấy nguyên set này không ạ?
```

**Đánh giá: USABLE.** Giải thích ren/dáng rũ nhẹ theo lo ngại rườm rà và khuyên set trong ngân sách. Nhận xét thẩm mỹ được chấp nhận; vẫn dài và giống giới thiệu catalog, nhưng không làm mất câu trả lời cần thiết.

## b1-3 / b1-search-read

**Khách:** Em xem giúp chị áo dài mã SD375 giá bao nhiêu nhé.

**Kết quả thực nhận:**

```text
Dạ áo dài SD375 bên shop có 2 lựa chọn bán:
- Áo lẻ: 929.000đ
- Cả set: 1.065.000đ

Chị muốn lấy áo lẻ hay nguyên set ạ?
```

**Đánh giá: USABLE.** Trả đúng hai phạm vi áo lẻ929k/cả set1.065k cho đúng SD375. Liệt kê hai giá giúp quyết định, không phải đọc lại hồ sơ khách.

## baseline-1 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Phần này em chưa trả lời được, chị nhé.
```

**Đánh giá: UNUSABLE.** Khách đã chọn rõ áo/be/M nhưng chỉ nhận fallback và giỏ trống; số đo được ghi không hoàn thành yêu cầu mua.

## baseline-2 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Chị ơi, áo Thạch Thảo màu be size M là hàng đặt trước (pre-order) nên shop đã thêm vào giỏ cho mình rồi nhé ạ!
```

**Đánh giá: USABLE.** Shop nhận đúng áo be/M, báo đặt trước và giỏ commit đúng; không tự chọn size thay khách.

Giỏ đã commit: [{"offer": "AO", "quantity": 1, "components": [{"size": "M", "color": "BE", "role": "TOP"}]}]; tổng 529000đ.

## baseline-3 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Em đã thêm món chị chọn vào giỏ. Tổng 529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.
```

**Đánh giá: USABLE.** Shop nhận đúng áo be/M, báo đặt trước và giỏ commit đúng; không tự chọn size thay khách.

Giỏ đã commit: [{"offer": "AO", "quantity": 1, "components": [{"size": "M", "color": "BE", "role": "TOP"}]}]; tổng 529000đ.

## stateful-1 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Em đã thêm áo Thạch Thảo màu be size M vào giỏ cho mình rồi ạ. Mẫu này là hàng đặt trước nha chị. Tổng đơn của mình là 529.000đ (gồm 499.000đ tiền áo và 30.000đ phí ship).
```

**Đánh giá: USABLE.** Shop nhận đúng áo be/M, báo đặt trước và giỏ commit đúng; không tự chọn size thay khách.

Giỏ đã commit: [{"offer": "AO", "quantity": 1, "components": [{"size": "M", "color": "BE", "role": "TOP"}]}]; tổng 529000đ.

## stateful-1 / stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Kết quả thực nhận:**

```text
Em đã đổi sang áo Thạch Thảo màu be, size L và tăng thành 2 chiếc cho mình rồi ạ. Tổng đơn của mình là 978.100đ (đã gồm phí ship).
```

**Đánh giá: USABLE.** Đổi đúng L và hai áo, giữ be; khách nhận xác nhận dùng được.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Kết quả thực nhận:**

```text
Hai áo là 998.000đ, phí ship 30.000đ, được giảm 49.900đ nên tổng cộng thanh toán là 978.100đ chị nhé.
```

**Đánh giá: USABLE.** Trả đúng tổng978.100đ gồm ship; số và quan hệ ưu đãi không mâu thuẫn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Kết quả thực nhận:**

```text
Em đã cập nhật số đo mới (eo 74, mông 96) vào hồ sơ cho mình rồi ạ. Đơn hàng 2 áo Thạch Thảo màu be size L của chị vẫn được giữ nguyên nhé!
```

**Đánh giá: USABLE.** Nhận sửa eo74/mông96, giữ lựa chọn L/hai áo; không biến sửa số đo thành tư vấn đổi size.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-request-checkout

**Khách:** Chị đặt hai áo này nhé, lên đơn cho chị.

**Kết quả thực nhận:**

```text
Chị gửi thêm [NAME]
```

**Đánh giá: USABLE.** Có code invitation thực tế trước private input; không phải lời hứa từ model. Bản text lưu đã bị redactor rút thành [NAME], nên không chấm chi tiết giọng của lời mời từ đoạn rút gọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-private-checkout

**Khách:** [Thông tin nhận hàng giả lập đi qua code, không vào model]

**Kết quả thực nhận:**

```text
Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.
```

**Đánh giá: USABLE.** Preview code có loại áo/màu/size/số lượng, tổng và ETA; không qua model cho private input. Mã BE/SV2447 vẫn mang giọng formatter nhưng không làm sai lựa chọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Kết quả thực nhận:**

```text
Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.
```

**Đánh giá: USABLE.** Xác nhận đúng preview và chuyển trạng thái; câu code còn cứng nhưng bước tiếp có căn cứ, không tuyên bố đã tạo đơn POS.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-1 / stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Kết quả thực nhận:**

Không có tin gửi thêm.

**Đánh giá: OWNERSHIP_CONTROL.** Yêu cầu gặp người được xử lý bằng handoff/ownership; không gửi thêm lời tư vấn. Control này không là câu trả lời tư vấn đạt chất lượng.

## stateful-2 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Chị đã thêm áo Thạch Thảo màu be size M vào giỏ rồi nhé. Mẫu này hiện là hàng đặt trước, chị xem lại giỏ hoặc báo em khi cần hỗ trợ thêm nha!
```

**Đánh giá: NEEDS_EDIT.** Thao tác đúng nhưng shop nói chính khách vừa thêm/đổi giỏ ("Chị đã...") trong khi khách đang nhờ shop làm. Mạch vai/xưng hô sai; opening còn kết bằng lời xem giỏ/hỗ trợ chung, cần viết lại câu xác nhận.

Giỏ đã commit: [{"offer": "AO", "quantity": 1, "components": [{"size": "M", "color": "BE", "role": "TOP"}]}]; tổng 529000đ.

## stateful-2 / stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Kết quả thực nhận:**

```text
Chị đã đổi áo Thạch Thảo màu be sang size L và lấy 2 chiếc nhé ạ. Mẫu này hiện là hàng đặt trước nha chị!
```

**Đánh giá: NEEDS_EDIT.** Thao tác đúng nhưng shop nói chính khách vừa thêm/đổi giỏ ("Chị đã...") trong khi khách đang nhờ shop làm. Mạch vai/xưng hô sai; opening còn kết bằng lời xem giỏ/hỗ trợ chung, cần viết lại câu xác nhận.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Kết quả thực nhận:**

```text
Tổng 2 áo sau ưu đãi và cộng 30.000đ phí ship là 978.100đ chị nhé.
```

**Đánh giá: USABLE.** Trả đúng tổng978.100đ gồm ship; số và quan hệ ưu đãi không mâu thuẫn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Kết quả thực nhận:**

```text
Dạ em cập nhật lại số đo cho chị rồi ạ, mình vẫn giữ size L nhé!
```

**Đánh giá: USABLE.** Nhận sửa eo74/mông96, giữ lựa chọn L/hai áo; không biến sửa số đo thành tư vấn đổi size.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-request-checkout

**Khách:** Chị đặt hai áo này nhé, lên đơn cho chị.

**Kết quả thực nhận:**

```text
Chị gửi thêm [NAME]
```

**Đánh giá: USABLE.** Có code invitation thực tế trước private input; không phải lời hứa từ model. Bản text lưu đã bị redactor rút thành [NAME], nên không chấm chi tiết giọng của lời mời từ đoạn rút gọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-private-checkout

**Khách:** [Thông tin nhận hàng giả lập đi qua code, không vào model]

**Kết quả thực nhận:**

```text
Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.
```

**Đánh giá: USABLE.** Preview code có loại áo/màu/size/số lượng, tổng và ETA; không qua model cho private input. Mã BE/SV2447 vẫn mang giọng formatter nhưng không làm sai lựa chọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Kết quả thực nhận:**

```text
Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.
```

**Đánh giá: USABLE.** Xác nhận đúng preview và chuyển trạng thái; câu code còn cứng nhưng bước tiếp có căn cứ, không tuyên bố đã tạo đơn POS.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-2 / stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Kết quả thực nhận:**

Không có tin gửi thêm.

**Đánh giá: OWNERSHIP_CONTROL.** Yêu cầu gặp người được xử lý bằng handoff/ownership; không gửi thêm lời tư vấn. Control này không là câu trả lời tư vấn đạt chất lượng.

## stateful-3 / stateful-open

**Khách:** Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

**Kết quả thực nhận:**

```text
Dạ, em đã thêm áo Thạch Thảo màu be size M vào giỏ cho chị rồi ạ. Mẫu này là hàng đặt trước nha chị ơi!
```

**Đánh giá: USABLE.** Shop nhận đúng áo be/M, báo đặt trước và giỏ commit đúng; không tự chọn size thay khách.

Giỏ đã commit: [{"offer": "AO", "quantity": 1, "components": [{"size": "M", "color": "BE", "role": "TOP"}]}]; tổng 529000đ.

## stateful-3 / stateful-variant-quantity

**Khách:** Đổi áo sang L cho chị, lấy hai chiếc nhé.

**Kết quả thực nhận:**

```text
Dạ, em đã đổi áo Thạch Thảo màu be sang size L và cập nhật số lượng thành 2 chiếc cho chị rồi ạ.
```

**Đánh giá: USABLE.** Đổi đúng L và hai áo, giữ be; khách nhận xác nhận dùng được.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-quote

**Khách:** Hai áo cả phí ship là bao nhiêu em?

**Kết quả thực nhận:**

```text
Dạ, tổng thanh toán cho 2 chiếc áo size L là 978.100đ (đã gồm 30.000đ phí ship) ạ.
```

**Đánh giá: USABLE.** Trả đúng tổng978.100đ gồm ship; số và quan hệ ưu đãi không mâu thuẫn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-correction

**Khách:** Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

**Kết quả thực nhận:**

```text
Dạ, em đã cập nhật lại số đo eo 74, mông 96 cho chị và giữ nguyên 2 áo size L ở giỏ hàng nhé ạ!
```

**Đánh giá: USABLE.** Nhận sửa eo74/mông96, giữ lựa chọn L/hai áo; không biến sửa số đo thành tư vấn đổi size.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-request-checkout

**Khách:** Chị đặt hai áo này nhé, lên đơn cho chị.

**Kết quả thực nhận:**

```text
Chị gửi thêm [NAME]
```

**Đánh giá: USABLE.** Có code invitation thực tế trước private input; không phải lời hứa từ model. Bản text lưu đã bị redactor rút thành [NAME], nên không chấm chi tiết giọng của lời mời từ đoạn rút gọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-private-checkout

**Khách:** [Thông tin nhận hàng giả lập đi qua code, không vào model]

**Kết quả thực nhận:**

```text
Áo SV2447 màu BE, size L ×2: 998.000đ
Tạm tính: 998.000đ
Ưu đãi: -49.900đ
Phí ship: 30.000đ
Tổng: 978.100đ
SV2447: hàng đặt trước
Người nhận: Khách thử nghiệm - [PHONE]
[ADDRESS]
Thanh toán: COD
Dự kiến nhận hàng: 8-14 ngày.
Chị xác nhận chốt đơn nhé.
```

**Đánh giá: USABLE.** Preview code có loại áo/màu/size/số lượng, tổng và ETA; không qua model cho private input. Mã BE/SV2447 vẫn mang giọng formatter nhưng không làm sai lựa chọn.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-confirm

**Khách:** Chốt đơn cho chị nhé.

**Kết quả thực nhận:**

```text
Em đã ghi nhận xác nhận mua hàng. Nhân viên sẽ kiểm tra và lên đơn cho chị.
```

**Đánh giá: USABLE.** Xác nhận đúng preview và chuyển trạng thái; câu code còn cứng nhưng bước tiếp có căn cứ, không tuyên bố đã tạo đơn POS.

Giỏ đã commit: [{"offer": "AO", "quantity": 2, "components": [{"size": "L", "color": "BE", "role": "TOP"}]}]; tổng 978100đ.

## stateful-3 / stateful-human-request

**Khách:** Cho chị gặp nhân viên shop nhé.

**Kết quả thực nhận:**

Không có tin gửi thêm.

**Đánh giá: OWNERSHIP_CONTROL.** Yêu cầu gặp người được xử lý bằng handoff/ownership; không gửi thêm lời tư vấn. Control này không là câu trả lời tư vấn đạt chất lượng.
