# Actual fallback and verifier diagnosis

Primary review was locked before this diagnostic. Rejected drafts below are not customer outcomes.

## advice-1 / b1-changed-occasion

Actual: Phần này em chưa trả lời được, chị nhé.

Terminal: {"disposition": "FALLBACK", "reason": "FAIL", "text": "Phần này em chưa trả lời được, chị nhé.", "fallbackId": "C3_A_NONPROTECTED_V2"}

Rejected draft:

```text
Dạ, set Thạch Thảo dùng chất liệu tơ Hàn và ren tơ nên giữ form khá tốt và ít nhăn hơn nhiều so với các dòng vải thô. Ngồi ô tô 3 tiếng di chuyển đến nơi áo váy vẫn giữ được độ bay và phẳng phiu, chị yên tâm nha!

Các mẫu khác của shop như set Thanh Vũ (tơ crep phối ren) hay Diễm Hoa (ren lưới 3D phối tơ) cũng dùng chất liệu tơ và ren cao cấp tương tự, rất ít nhăn, mặc đi đám cưới vừa sang trọng vừa thoải mái. Nếu chị vẫn thích nét thêu tinh tế của set Thạch Thảo thì cứ giữ bộ này luôn nhé ạ!
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
