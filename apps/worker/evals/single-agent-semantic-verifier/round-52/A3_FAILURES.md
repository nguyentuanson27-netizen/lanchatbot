# Round52 A3 failures after primary review

Primary actual-terminal review was committed before these rejected-draft diagnostics.5failed attempts over3cases;25passed prefix outcomes. All5customers receive the same static fallback;rejected drafts below were not sent and do not earn quality credit.

## r5-refund-distinction:1

customer: Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da.

shop: Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng.

customer: Chị vẫn lấy trắng M. Mà thử không thích thì được hoàn tiền à?

Actual terminal:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách đã chọn trắng M và cần phân biệt hoàn tiền với đổi hàng. Tin thực tế chỉ báo chưa trả lời được, nên không làm rõ quyền hoàn/đổi hoặc hỗ trợ tiếp quyết định mua dù shop có đủ chính sách. Fallback ngắn, tự nhiên và không hứa thao tác, nhưng mất cả phần có thể trả lời chắc chắn.

Rejected draft, diagnostic only:

```text
Dạ, shop không áp dụng hoàn tiền, nhưng hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng nếu sản phẩm còn nguyên tem, chưa sử dụng và chỉ thử trong nhà (phí đổi do chị chịu ạ).
```

Verdict: {"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}

Khẳng định có thể đổi nếu nguyên tem/chưa sử dụng/chỉ thử trong nhà, nhưng không giữ các điều kiện thử độc lập chưa giặt/sạch/không mùi. Nếu ở đây cấp quyền cho tình huống, không chỉ giới thiệu loại dịch vụ.

## r5-refund-distinction:2

customer: Chị muốn SM613 trắng đi họp, ngực 92cm. Chị mặc áo lót màu da.

shop: Trắng M 499k chị nhé. Mặc với áo lót màu da trong phòng thì không thấy màu áo lót; ngược sáng vẫn có thể thấy bóng.

customer: Chị vẫn lấy trắng M. Mà thử không thích thì được hoàn tiền à?

Actual terminal:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách vẫn lấy trắng M; điều còn vướng là thử không thích có được hoàn tiền không. Câu thực tế không trả nội dung nào của câu hỏi và không tận dụng chính sách đã cấp. Lời fallback an toàn và dễ hiểu nhưng không tạo tiến triển trong việc mua.

Rejected draft, diagnostic only:

```text
Dạ shop không áp dụng hoàn tiền chị nhé. Bên em có hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng nếu sản phẩm chưa sử dụng, còn nguyên tem và chỉ thử trong nhà (khách chịu phí ship đổi ạ). 

Chị chốt sơ mi trắng M (499k) nhé ạ?
```

Verdict: {"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}

Cùng điều kiện thiếu của lượt1; còn hỏi chị chốt lại trắng M dù khách đã chốt. Câu hỏi lại là chẩn đoán draft, không được dùng để chấm fallback thay cho actual terminal.

## r14-refund-before-buy:1

customer: Chị xem SM613 trắng để đi họp, ngực 92cm, có áo lót màu da.

shop: Chị lấy trắng M nhé, áo 499k và còn hàng.

customer: Chị lấy trắng M nhé. Thử không ưng thì được hoàn tiền hay chỉ đổi mẫu em?

Actual terminal:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách chốt trắng M rồi hỏi hoàn tiền hay chỉ đổi mẫu khi thử không ưng. Tin thực tế chỉ nói chưa trả lời được; bỏ cả phân biệt hoàn/đổi đã được policy xác nhận. Không có bước mua hữu ích, dù bản thân lời fallback ngắn, an toàn và không giả handoff.

Rejected draft, diagnostic only:

```text
Dạ, shop không áp dụng hoàn tiền, nhưng mình được hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ khi nhận hàng (sản phẩm nguyên tem, chưa sử dụng, chỉ thử trong nhà và khách chịu phí ship đổi). Mẫu trắng size M (499k) sẵn hàng chị nhé.
```

Verdict: {"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}

Câu cá nhân hóa mình được đổi kèm danh sách có thử trong nhà, thiếu chưa giặt/sạch/không mùi. Không có nếu; cần kiểm tra nhất quán phạm vi giới thiệu/đủ điều kiện với các intro đã PASS, không gộp sự mơ hồ này thành thiếu context.

## r7-exchange-after-use:1

customer: Chị thích ST411 be. Ngực92, eo 74, mông 96cm.

shop: Em chọn M theo số đo chị nhé, be M đang còn; set 749k.

customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Actual terminal:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách muốn mặc đi làm vài buổi rồi đổi và hỏi phí. Actual fallback bỏ cả câu trả lời không nhận hàng mặc ra ngoài lẫn ai trả phí, mặc dù policy đủ. Câu an toàn/tự nhiên nhưng không giúp khách quyết định cách thử hoặc hiểu quyền đổi; không chấm draft mà khách không nhận.

Rejected draft, diagnostic only:

```text
Dạ, shop không nhận đổi với hàng đã mặc ra ngoài chị nhé; shop chỉ hỗ trợ đổi trong 7 ngày đối với sản phẩm nguyên tem và chỉ thử trong nhà. Phí đổi hàng do khách trả chị nha.
```

Verdict: {"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}

Từ chối đúng hàng mặc ra ngoài và trả phí, nhưng tự nối quyền thử trong nhà với danh sách thiếu điều kiện. Chỉ có thể đọc như giới hạn cần thiết; phạm vi nghĩa cần so với intro đã PASS. Đủ dữ liệu để chỉ từ chối/trả phí.

## r7-exchange-after-use:3

customer: Chị thích ST411 be. Ngực92, eo 74, mông 96cm.

shop: Em chọn M theo số đo chị nhé, be M đang còn; set 749k.

customer: Chị định mặc đi làm vài buổi, không ưng thì đổi trong 7 ngày được chứ? Phí đổi bên nào trả?

Actual terminal:

```text
Phần này em chưa trả lời được, chị nhé.
```

Khách hỏi trường hợp đã mặc ra ngoài và phí đổi, nhưng nhận tin chưa trả lời được. Không có phần giải thích chính sách, phần trả lời được hay bước dùng được để tiến tới mua. Lời fallback không bịa quyền/receipt và nghe tự nhiên, song toàn lượt vẫn không đáp nhu cầu.

Rejected draft, diagnostic only:

```text
Dạ, shop hỗ trợ đổi size hoặc đổi mẫu trong 7 ngày từ ngày nhận hàng nếu sản phẩm còn nguyên tem và chỉ thử trong nhà. Hàng đã mặc đi làm ra ngoài shop không nhận đổi ạ. Phí đổi hàng do khách trả chị nhé.
```

Verdict: {"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}

Tự chuyển câu hỏi hàng mặc đi làm sang quyền đổi nếu nguyên tem/chỉ thử trong nhà, thiếu chưa giặt/sạch/không mùi. Từ chối mặc ra ngoài đúng không làm phần cấp quyền mới đúng.

