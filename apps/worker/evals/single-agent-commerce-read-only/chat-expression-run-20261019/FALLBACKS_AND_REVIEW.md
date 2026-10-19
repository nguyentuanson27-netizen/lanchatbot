# Fallback và câu được gửi cần review

Primary whole-turn/source review đã khóa tại `ebdde894` trước rejected-draft/verifier diagnosis. Chỉ actual terminal được dùng chấm kết quả khách hàng.

## Slot2 — actual fallback

Khách: Chị đi ô tô gần3tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual: `C3_A_NONPROTECTED_V2` — “Phần này em chưa trả lời được, chị nhé.”

Rejected draft, chưa gửi:

```text
Set Thạch Thảo dùng chất tơ Hàn nên mềm mại, ít nhăn hơn vải thô, nhưng ngồi ô tô 3 tiếng liên tục thì khó tránh khỏi có chút nếp gấp nhẹ chị ạ.

Nếu chị muốn tìm mẫu ít nhăn tối đa để khi tới nơi vẫn giữ form gọn gàng, em gợi ý **Set váy Thanh Vũ** (chân váy tơ crep) hoặc **Set váy Diễm Hoa** (chân váy tơ mềm mịn). Chất tơ crep và tơ mềm giữ nếp rất tốt, ngồi xe lâu đứng lên vẫn mượt mà và lịch sự, mặc đi đám cưới cực kỳ hợp lý. Chị ngó qua 2 mẫu này xem ưng kiểu nào hơn nhé ạ!
```

Verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV165"
    },
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV244"
    }
  ]
}
```

Source mô tả vật liệu/thiết kế, không xác nhận hiệu quả ít nhăn tối đa hoặc ngồi lâu đứng lên vẫn mượt. FAIL đúng cho phần hứa hiệu quả cụ thể. Draft đồng thời tái hiện chính các vấn đề giọng đang sửa: lặp nhu cầu đã rõ dưới “Nếu chị muốn”, ngoặc chú thích chất liệu sau tên từng món, chuỗi mô tả/khen/đề nghị khách chọn lại.

## Slot3 — send-eligible, reviewer yêu cầu sửa

Actual được verifierPASS, đúng exact final text:

```text
Set Thạch Thảo dùng chất tơ và ren mềm nên ngồi xe 3 tiếng sẽ dễ bị hằn nếp nhăn chị ạ.

Em chọn set Thanh Vũ cho chị nhé. Áo ren dệt cotton kết hợp chân váy tơ crep đứng dáng và ít nhăn hơn, giúp chị giữ form gọn gàng suốt chuyến đi.
```

Đoạn chọn Thanh Vũ ngắn và trực tiếp hơn. Tuy nhiên, trong ngữ cảnh đi xe3giờ vì lo nhăn, “giữ form gọn gàng suốt chuyến đi” vẫn gắn hiệu quả giữ form với toàn chuyến đi. Primary review coi phạm vi này vượt căn cứ theo boundary đã áp dụng ở run trước, cần sửa trước gửi; không phải lỗi do riêng từ “gọn gàng” hay cấm inference chất liệu.

Đây là khác biệt giữa review và verifier cần báo riêng: không gọi5verifierPASS là5qualityPASS hoặc khẳng định zero observed unsafe send-eligible claims. Chưa có owner/independent human adjudication cho cách hiểu slot3, chưa chứng minh verifier chặn theo keyword hoặc nguồn gây ra lật verdict. So với slot2, hai draft khác nội dung và mức khẳng định; không kết luận chúng là identical-semantics samples. Không nới/siết verifier hoặc sửa output trong run này.
