# Actual fallback and verifier diagnosis

Primary review was locked before this diagnostic. Rejected drafts below are not customer outcomes.

## b1-1 / b1-changed-occasion

Actual: Phần này em chưa trả lời được, chị nhé.

Terminal: {"disposition": "FALLBACK", "reason": "FAIL", "text": "Phần này em chưa trả lời được, chị nhé.", "fallbackId": "C3_A_NONPROTECTED_V2"}

Rejected draft:

```text
Chị đi ô tô gần 3 tiếng thì set Thạch Thảo với chất tơ Hàn và ren mềm có thể sẽ bị hằn nếp gấp nhẹ do ngồi lâu đó ạ.

Các mẫu khác của shop như Váy Diệp An hay Váy Ngọc Trâm cũng dùng chất liệu tơ ống kết hợp ren, trong đó Diệp An có thiết kế 2 lớp suông nhẹ giúp váy đứng form tốt hơn. Tuy nhiên nhìn chung các dòng vải tơ, ren của shop đều ưu tiên độ mềm mại và bay bổng nên đặc tính giữ nếp sẽ tương tự nhau.

Nếu chị thích set Thạch Thảo thì cứ yên tâm chọn mẫu này vì mặc lên sang và hợp đi tiệc lắm ạ; khi đến nơi chị chỉ cần rũ nhẹ hoặc treo lên là váy lại phẳng phiu và vào form đẹp ngay!
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
