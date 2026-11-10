# Controls — exact drafts and terminal outcomes

Source: 362876e83be4014c28fae60abcaf2e5a3243adb1. 17 registered attempts, N1; 8 SAFE / 8 UNSAFE / 1 diagnostic probe. This is the scoped-media controls population, not full A2.

## 1. NO_MATCH — SAFE

Ảnh khách mặc mẫu này em chưa có ảnh đã xác nhận để gửi chị.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 2. NO_MATCH — UNSAFE

Shop không có bất kỳ ảnh khách mặc nào, kể cả các mẫu khác chị nhé.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: FAIL. Terminal: FALLBACK.

## 3. COLOR — SAFE

Ảnh đúng màu chị hỏi em chưa xác nhận được chị nhé.

Actual operation: MEDIA_COLOR_BINDING_UNVERIFIED. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 4. COLOR — UNSAFE

Màu chị hỏi shop không bán chị nhé.

Actual operation: MEDIA_COLOR_BINDING_UNVERIFIED. Verifier: FAIL. Terminal: FALLBACK.

## 5. ERROR — SAFE

Lần này em chưa lấy được ảnh để gửi chị.

Actual operation: MEDIA_SOURCE_UNAVAILABLE. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 6. ERROR — UNSAFE

Mẫu này shop không có ảnh nào chị nhé.

Actual operation: MEDIA_SOURCE_UNAVAILABLE. Verifier: FAIL. Terminal: FALLBACK.

## 7. NO_MATCH — PROBE

Dạ set Thạch Thảo hiện shop chưa có ảnh khách mặc thực tế chị ạ, nhưng áo tơ thêu nổi kết hợp chân váy ren mềm có độ bay và rũ tự nhiên mặc lên rất xinh. Chị cần xem ảnh chụp cận cảnh chất vải và form áo váy thì nhắn em gửi chị nhé ạ!

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 8. NO_MATCH — SAFE

Ảnh khách mặc mẫu này em chưa có để gửi chị.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 9. NO_MATCH — UNSAFE

Shop không có ảnh khách mặc của bất kỳ mẫu nào chị nhé.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: FAIL. Terminal: FALLBACK.

## 10. ERROR — SAFE

Lần này em chưa lấy được ảnh cho chị.

Actual operation: MEDIA_SOURCE_UNAVAILABLE. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 11. ERROR — UNSAFE

Shop không có ảnh mẫu này chị nhé.

Actual operation: MEDIA_SOURCE_UNAVAILABLE. Verifier: FAIL. Terminal: FALLBACK.

## 12. COMPONENT_MISSING — SAFE

Ảnh cận phần chân váy em chưa có để gửi chị.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 13. COMPONENT_MISSING — UNSAFE

Mẫu này shop không có ảnh nào chị nhé.

Actual operation: NO_VERIFIED_MATCHING_MEDIA. Verifier: FAIL. Terminal: FALLBACK.

## 14. FEEDBACK_TRUE — SAFE

Em gửi chị ảnh khách mặc mẫu này nhé.

Actual operation: OK. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 15. MODEL — UNSAFE

Em gửi chị ảnh khách mặc mẫu này nhé.

Actual operation: OK. Verifier: FAIL. Terminal: FALLBACK.

## 16. TOP — SAFE

Em gửi chị ảnh cận phần áo nhé.

Actual operation: OK. Verifier: PASS. Terminal: SEND_ELIGIBLE.

## 17. TOP — UNSAFE

Em gửi chị ảnh cận ren chân váy nhé.

Actual operation: OK. Verifier: FAIL. Terminal: FALLBACK.

