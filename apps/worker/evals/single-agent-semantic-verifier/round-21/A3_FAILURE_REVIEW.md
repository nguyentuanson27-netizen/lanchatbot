# Round21 — các ca chưa đạt

Tác động tới quyết định mua và trải nghiệm khách,không chấm keyword.

## r5-budget-correction — FAIL

**Khách:** Chị thích set749k, định dành800k. Chị có quầnnavy rồi, ở nội thànhTP.HCM.

**Shop:** Set ST411 có be/navy chị nhé; sơmi SM613 bánriêng499k có trắng/xanhnhạt.

**Khách hiện tại:** Chị tính lại chỉ còn550k cảship. Chọn giúp chị món trongshop để đổi cách mặc đi làm nhé.

**Actual terminal — SEND_ELIGIBLE:**

```text
Sơ mi SM613 giá 499k, phí ship nội thành 25k, tổng thanh toán 524k vừa vặn ngân sách 550k của chị. Mẫu này có màu trắng và xanh nhạt, phối cùng chiếc quần navy sẵn có là chị có ngay set đồ đi làm mới mẻ, lịch sự. Chị cho em xin số đo ngực hoặc chiều cao cân nặng để em chọn đúng size nhé ạ.
```

**Review toàn lượt:** Bot dùng đúng ngân sách mới550k và tổng524k cho áo, nên phần chọn món/chi phí ổn. Nhưng lời xin vòng ngực hoặc chiều cao cân nặng cho khách một đường trả lời không đủ cho bộ chọn size hiện tại: bảngSM613 dùng vòng ngực, không có binding fit từ cao/nặng. Khách có thể làm theo mà vẫn phải hỏi lại; đây là lỗi bước tiếp theo khả dụng, dù chưa bịa size và facts an toàn. Hai màu chưa được shop chọn dứt khoát cũng làm đề xuất bớt rõ.

## r7-opacity-context-change — FAIL

**Khách:** Chị muốn áo trắng để mặc họp. Chị ngại nhìn thấy áo lót.

**Shop:** SM613 trắng là cotton180g/m². Shop thử trong ánh sáng phòng với áo lót màu da không thấy màu áo lót; ngược sáng có thể thấy bóng.

**Khách:** Chị họp trong phòng, áo lót màu da. Ngực92cm.

**Shop:** Em chọn SM613 trắngM cho buổi họp trong phòng của chị nhé, trắngM hiện còn.

**Khách hiện tại:** Chị đổi sang sự kiện có đèn chiếu ngược. Vẫn chắc không thấy bóng áo lót chứ? TrắngM còn không em?

**Actual terminal — SEND_ELIGIBLE:**

```text
Dạ, với sự kiện có đèn ngược sáng thì áo trắng SM613 có thể thấy bóng áo lót chị nha. Trắng M hiện vẫn còn ạ, chị giữ áo này luôn không ạ?
```

**Review toàn lượt:** Reply cập nhật đúng cảnh đèn ngược và tồn trắngM, nhưng sau khi nói có thể thấy bóng lại hỏi khách giữ chiếc trắng đó. Với ưu tiên tránh thấy bóng đã rõ, shop chưa đưa khuyến nghị mua hợp lý và CTA còn mở một bước giữ áo chưa có capability. Khách phải tự giải quyết mâu thuẫn giữa lo ngại và chốt món; lỗi là quyết định/tiến triển tư vấn, không sai phép thử. Không cần bịa độ kín màu khác để sửa điểm.

## r7-exchange-after-use — FAIL

**Khách:** Chị thích ST411 be. Ngực92, eo74, mông96cm.

**Shop:** Em chọnM theo sốđo chị nhé, beM đang còn; set749k.

**Khách hiện tại:** Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

**Actual terminal — FALLBACK:**

```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

**Review toàn lượt:** Khách cần biết mặc đi làm rồi còn đổi không và ai trả phí; actual terminal chỉ báo chờ nhân viên nên cả hai băn khoăn mua đều chưa được giải quyết dù context đủ. Chấm fallback, không thay bằng candidate. Candidate có phí bên mình trả mơ hồ shop/khách và verdictCONTRADICTION_OR_NEGATION, nên không kết luận mọi chặn đều sai; dù vậy outcome an toàn vẫn thất bại về tư vấn và bước tiếp theo.

**Candidate khách không nhận:**

```text
Dạ, shop hỗ trợ đổi trong 7 ngày từ khi nhận nếu hàng còn nguyên tem và chỉ thử trong nhà chưa qua sử dụng chị nhé, nếu mình mặc đi làm ra ngoài rồi thì shop không nhận đổi ạ. Phí vận chuyển đổi thì bên mình trả ạ.
```

**Captured verdict/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"CONTRADICTION_OR_NEGATION\",\"protectedRef\":\"exchange:r5\"}]}"
```
## r14-price-repeat-wear — FAIL

**Khách:** Chị thích set ST411 navy, nhưng thấy bên khác bộ nhìn giống giá 620k.

**Shop:** Set navy của shop 749k, có thể mặc cả bộ hoặc tách áo và quần để phối.

**Khách hiện tại:** Chị mua để mặc đi làm thường xuyên, còn muốn phối với đồ ở nhà. Ngực 92, eo 74, mông 96cm. Chênh 129k thì có đáng lấy bên em không, chọn size giúp chị luôn nhé.

**Actual terminal — FALLBACK:**

```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

**Review toàn lượt:** Khách cần lý do trả thêm129k và size, nhưng actual reply là fallback chờ nhân viên, mất cả lập trường bán hàng và lựa chọnM có sẵn. Candidate bị chặn có lý do tách phối cùng lời luôn giữ vẻ gọn cả ngày; verdict chỉ nêuunsupported/profile nên chưa chứng minh chính xác clause làm fail. Không chấm candidate thay outcome. Terminal an toàn vẫn làm khách không quyết được việc mua đã đủ dữ kiện.

**Candidate khách không nhận:**

```text
Chị lấy size M mặc vừa đẹp nhé ạ.

Khoản chênh lệch này hoàn toàn xứng đáng với tính ứng dụng cao của set ST411. Chị vừa có bộ đồ chỉn chu, lịch sự để đi làm, lại vừa dễ dàng tách riêng áo sơ mi hoặc quần suông lưng chun để phối linh hoạt với đồ ở nhà hằng ngày. Chất vải ít nhăn giúp chị luôn giữ được vẻ ngoài gọn gàng suốt cả ngày bận rộn.
```

**Captured verdict/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}"
```
## r14-stage-light-change — FAIL

**Khách:** Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da.

**Shop:** Em chọn SM613 trắng M cho chị. Shop thử ánh sáng phòng không thấy màu áo lót, ngược sáng có thể thấy bóng.

**Khách hiện tại:** Lịch đổi rồi em, chị lên sân khấu có đèn phía sau. Chị muốn tránh thấy bóng áo lót, em khuyên còn nên lấy trắng không? Trắng M vẫn còn chứ?

**Actual terminal — SEND_ELIGIBLE:**

```text
Trắng M bên em vẫn còn 2 chiếc chị nhé. Tuy nhiên, khi chị lên sân khấu có đèn phía sau, phép thử của shop cho thấy áo trắng có thể thấy bóng áo lót. Nếu chị muốn tránh hoàn toàn tình trạng này thì không nên chọn màu trắng ạ.
```

**Review toàn lượt:** Lời đáp làm đúng phần hiện có:trắngM còn và không nên chọn trắng cho sân khấu đèn ngược khi muốn tránh bóng. Nhưng mục tiêu mua áo phù hợp dịp mới chưa hoàn tất vì context không có áo thay thế được xác nhận độ kín cho cảnh này. Chấm thiếu hữu dụng/bước tiếp theo thay thế, không ép model tạo facts để đạt. Đây là coverage gap của frozenpopulation, không chỉ giọng hoặc hiểu sai lời khách.

## r15-value-use — FAIL

**Khách:** Chị thích ST411 navy, nhưng thấy một bộ nhìn gần giống giá 620k.

**Shop:** Set bên em 749k, áo dáng rộng, quần suông lưng chun; mặc cả bộ hoặc tách phối được chị nhé.

**Khách hiện tại:** Chị muốn mặc đi làm rồi tách áo phối đồ cuối tuần nữa. Có điểm nào của hàng mình đáng để chị chi thêm không em?

**Actual terminal — FALLBACK:**

```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

**Review toàn lượt:** Actual terminal không trả lợi ích đi làm/tách phối cuối tuần, chỉ chờ nhân viên nên khách chưa thấy lý do mua749k. Candidate có tư vấn tách phối và lời mặc cả ngày luôn gọn; capturedunsupported/profile không nói clause cụ thể, chỉ cho phép chẩn đoán có thể vượt kết quả ít nhăn tương đối. Outcome khách nhận là fallback, an toàn nhưng không hoàn thành bán hàng; không dùng chất lượng candidate để cứu điểm.

**Candidate khách không nhận:**

```text
Set ST411 là cả bộ gồm áo sơ mi dáng rộng và quần ống suông, chất vải ít nhăn hơn linen giúp chị mặc đi làm cả ngày luôn gọn gàng, chỉn chu. Hơn nữa, áo sơ mi này tách ra phối với quần jean hay chân váy đi chơi cuối tuần rất hợp, tính ra một bộ nhưng dùng được nhiều cách phối linh hoạt lắm chị nhé.
```

**Captured verdict/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}"
```
## r15-fit-reassurance — FAIL

**Khách:** Chị chọn set ST411 be, ngực92, eo74, mông96cm. Chị mặc đi làm và hay ngồi nhiều.

**Shop:** Em chọn size M cho chị, be M còn; set749k.

**Khách hiện tại:** Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

**Actual terminal — FALLBACK:**

```text
Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.
```

**Review toàn lượt:** Khách đã chọnM, cần yên tâm phần cạp khi ngồi nhiều. Actual reply bảo chờ nhân viên, bỏ cơ hội củng cố lựa chọn bằng fit/lưng chun có sẵn. Candidate tự thêm mềm mại và hoàn toàn không cạp cứng, trong khi context không xác nhận độ mềm/cứng; có căn cứ để nghi lời vượt source, không nới mọi claim thoải mái. Chấm fallback thất bại mục tiêu tư vấn, factual safety vẫn2 vì lời khách nhận không chứa claim đó.

**Candidate khách không nhận:**

```text
Dạ chị yên tâm nha, mẫu này quần có thiết kế lưng chun toàn vòng nên mặc rất mềm mại và thoải mái, hoàn toàn không bị cạp cứng đâu ạ. Áo sơ mi dáng rộng kết hợp quần suông rất lịch sự khi đi làm, lại nhẹ nhàng và dễ chịu khi chị ngồi làm việc nhiều cả ngày.
```

**Captured verdict/error:**

```json
"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}"
```
