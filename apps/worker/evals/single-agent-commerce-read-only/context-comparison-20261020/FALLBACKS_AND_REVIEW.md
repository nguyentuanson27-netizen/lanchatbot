# Hai fallback — rejected draft và diagnosis sau primary lock

Primary đã commit tại0dbb6fb5 trước khi đọc rejected draft/verifier diagnosis. Draft dưới đây không phải câu khách nhận.

## Slot 5 — candidate

Actual: Phần này em chưa trả lời được, chị nhé.

Rejected draft:

```text
Dạ, chất tơ Hàn của set Thạch Thảo ngồi ô tô 3 tiếng sẽ dễ bị hằn nếp gấp chị ạ.

Đi xa thế này chị chuyển sang **Set Thanh Vũ** giúp em nhé; áo ren cotton kết hợp chân váy tơ crep ít nhăn hơn và giữ form gọn gàng suốt chuyến đi mà mặc đi đám cưới vẫn rất sang và thanh lịch.
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV165"
    }
  ]
}
```

Theo mốc T1 đã freeze, lời chọn Thanh Vũ/ít nhăn hơn/giữ form là tư vấn định tính. Câu gần nghĩa ở control slot1, cùng canonical nguồn SV165, được PASS. Reviewer coi đây là false rejection/khác biệt phạm vi với verifier, không phải protected failure đã xác nhận. Schema không cho giải thích nên không xác định được bước suy luận nội bộ hoặc chứng minh keyword matching.

## Slot 10 — candidate

Actual: Phần này em chưa trả lời được, chị nhé.

Rejected draft:

```text
Dạ, Set Thạch Thảo dùng chất tơ Hàn và ren tơ nên ngồi ô tô 3 tiếng có thể hơi hằn nếp gấp nhẹ ở phần tơ, tới nơi chị treo lên một lúc là tơ tự rủ phẳng lại ạ.

Nếu chị muốn hạn chế tối đa độ nhăn, em gợi ý mình chuyển sang **Set Thanh Vũ**: chất tơ crep mềm kết hợp ren cotton ít giữ nếp hơn khi ngồi lâu, mặc lên vẫn rất thoáng mát, nhẹ nhàng và thanh lịch.

Chị thích đổi sang set Thanh Vũ hay vẫn giữ set Thạch Thảo ạ?
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV2447"
    }
  ]
}
```

Owner tự thêm cơ chế hồi nếp: treo một lúc tơ tự rủ phẳng lại. Nguồn không có kết quả này; verifier chặn SV2447 phù hợp. Draft còn mở lại nhu cầu dưới nếu, đưa tối đa và hỏi giữ hay đổi; không có cơ sở nói context đã sửa được inference hoặc giọng.

Slot1 control để đối chiếu là toàn câu trong CONVERSATIONS_AND_REVIEW.md, không chỉ một cụm được tách ra. Không coi hai draft là byte-identical hoặc kết luận verifier chỉ kiểm keyword. Không sửa verifier/nhãn lịch sử hoặc chạy reverify để thay kết quả.
