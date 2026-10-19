# Actual fallback — target slot3

Primary whole actual review locked at `e825f3a9` before diagnosis. Rejected draft was not sent and is not credited as customer outcome.

Customer: Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Actual outcome: `C3_A_NONPROTECTED_V2` — “Phần này em chưa trả lời được, chị nhé.”

Rejected draft:

```text
Dạ, ngồi ô tô 3 tiếng liên tục thì set Thạch Thảo (với chất tơ Hàn và ren tơ mềm) có thể dễ bị hằn nếp gấp chị ạ.

Nếu chị muốn tìm mẫu hạn chế nhăn hơn để thoải mái di chuyển, em gợi ý **Set váy Diễm Hoa** (với chất liệu ren lưới và chân váy tơ mềm) hoặc **Set Thanh Vũ** (chân váy tơ crep có bề mặt ít lộ nếp nhăn hơn). Cả hai mẫu này mặc đi đám cưới vừa sang trọng, vừa giữ form đẹp suốt chuyến đi đấy ạ. Chị xem mình ưng mẫu nào hơn nhé!
```

Verifier verdict:

```json
{
  "verdict": "FAIL",
  "violations": [
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV244"
    },
    {
      "kind": "UNSUPPORTED_PROTECTED_ASSERTION",
      "protectedRef": "product:SV165"
    }
  ]
}
```

Diagnosis: nhận xét định tính về vật liệu/độ lộ nếp được phép; phần “giữ form đẹp suốt chuyến đi” là cam kết hiệu quả cụ thể cho hai món thay, nguồn không xác nhận. Verifier FAIL đúng theo boundary hiện hành. Không suy từ PASS ở hai mẫu khác rằng attempt này được phép. Draft còn đưa2mẫu rồi hỏi khách chọn lại thay vì ưu tiên khi khách đã nhờ chọn, nhưng đó là finding chất lượng của draft, không thay việc chấm actual fallback.

Lỗi vẫn thuộc family suy từ mô tả sang hiệu quả sử dụng, chuyển từ món cũ sang món thay. Không phải provider error/thiếu source hoặc lỗi formatter. Không nới verifier để hạ fallback count. Không dispatch16slots conditional, không retry/repair hoặc mẫu bù.
