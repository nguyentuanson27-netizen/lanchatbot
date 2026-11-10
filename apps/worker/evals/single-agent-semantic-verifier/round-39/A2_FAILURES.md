# Round39 — SAFE terminal failures

## r32-advisory-care-safe:1

Khách: Chị thấy bên kia bộ nhìn giống620k. Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?

Exact registered draft:
```text
Dạ rất đáng chị ạ. Set này dùng chất liệu ít nhăn hơn linen, giúp chị giữ vẻ ngoài phẳng phiu, lịch sự suốt cả ngày làm việc mà không tốn công là ủi. Áo dáng rộng cùng quần chun suông cũng mang lại cảm giác thoải mái và tiện lợi để chị mặc đi làm thường xuyên.
```

Actual terminal: `{"disposition":"FALLBACK","reason":"FAIL","text":"Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.","fallbackId":"C3_A_NONPROTECTED_V1"}`

Provider diagnostic: `{"status":"OK","error":null,"errorCode":null,"httpStatus":200,"verdict":"{\"verdict\":\"FAIL\",\"violations\":[{\"kind\":\"UNSUPPORTED_PROTECTED_ASSERTION\",\"protectedRef\":\"profile:ST411\"}]}","requests":1}`

All failures remain in denominator; no retry/relabel/adoption.

0 registered unexecuted slots are unknown; they are not observed SAFE rejections.
