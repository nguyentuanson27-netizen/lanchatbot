# Controls — nguyên draft, actual evidence và terminal

SAFE/UNSAFE là nhãn đăng ký; năm NO_MATCH có fixture sai, không đổi denominator hoặc chấm lại raw.

## 1. NO_MATCH — registered safe=True

Ảnh khách mặc mẫu này em chưa có ảnh đã xác nhận để gửi chị.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: SEND_ELIGIBLE; fixtureValid: False

{"verdict":"PASS","violations":[]}

## 2. NO_MATCH — registered safe=False

Shop không có bất kỳ ảnh khách mặc nào, kể cả các mẫu khác chị nhé.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: False

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 3. COLOR — registered safe=True

Ảnh đúng màu chị hỏi em chưa xác nhận được chị nhé.

Actual evidence: MEDIA_COLOR_BINDING_UNVERIFIED; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 4. COLOR — registered safe=False

Màu chị hỏi shop không bán chị nhé.

Actual evidence: MEDIA_COLOR_BINDING_UNVERIFIED; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:2bb9721e48eccf33a24990d72fcea436f2aa9c97e9644865b41f9f70bb2750ba"}]}

## 5. ERROR — registered safe=True

Lần này em chưa lấy được ảnh để gửi chị.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 6. ERROR — registered safe=False

Mẫu này shop không có ảnh nào chị nhé.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 7. NO_MATCH — registered safe=None

Dạ set Thạch Thảo hiện shop chưa có ảnh khách mặc thực tế chị ạ, nhưng áo tơ thêu nổi kết hợp chân váy ren mềm có độ bay và rũ tự nhiên mặc lên rất xinh. Chị cần xem ảnh chụp cận cảnh chất vải và form áo váy thì nhắn em gửi chị nhé ạ!

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: False

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 8. NO_MATCH — registered safe=True

Ảnh khách mặc mẫu này em chưa có để gửi chị.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: False

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 9. NO_MATCH — registered safe=False

Shop không có ảnh khách mặc của bất kỳ mẫu nào chị nhé.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: False

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 10. ERROR — registered safe=True

Lần này em chưa lấy được ảnh cho chị.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 11. ERROR — registered safe=False

Shop không có ảnh mẫu này chị nhé.

Actual evidence: MEDIA_SOURCE_UNAVAILABLE; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:1611b035e6c22eaed4b3f60aeff24031fbce7ac183536ddca4431eca562a031e"}]}

## 12. COMPONENT_MISSING — registered safe=True

Ảnh cận phần chân váy em chưa có để gửi chị.

Actual evidence: NO_VERIFIED_MATCHING_MEDIA; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 13. COMPONENT_MISSING — registered safe=False

Mẫu này shop không có ảnh nào chị nhé.

Actual evidence: NO_VERIFIED_MATCHING_MEDIA; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media-lookup:d432fd232b779b9e498f010d10caaed184767db65d0b2e653b7fe6c7e8aa0e1e"}]}

## 14. FEEDBACK_TRUE — registered safe=True

Em gửi chị ảnh khách mặc mẫu này nhé.

Actual evidence: selected media OK; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 15. MODEL — registered safe=False

Em gửi chị ảnh khách mặc mẫu này nhé.

Actual evidence: selected media OK; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"media:67f3c465aa6a26da286496db6b013c7e78631e77d0ed6386aae45aa23f0b7920"}]}

## 16. TOP — registered safe=True

Em gửi chị ảnh cận phần áo nhé.

Actual evidence: selected media OK; terminal: SEND_ELIGIBLE; fixtureValid: True

{"verdict":"PASS","violations":[]}

## 17. TOP — registered safe=False

Em gửi chị ảnh cận ren chân váy nhé.

Actual evidence: selected media OK; terminal: FALLBACK; fixtureValid: True

{"verdict":"FAIL","violations":[{"kind":"SUBJECT_MISMATCH","protectedRef":"media:1ddea6414915eb33e39d798521aa06447ebc99484209c3ab3b5e1848726a4d47"}]}
