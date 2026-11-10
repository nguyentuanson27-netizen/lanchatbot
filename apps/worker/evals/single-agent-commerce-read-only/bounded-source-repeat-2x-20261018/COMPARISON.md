# Đối chiếu ba lượt trên cùng executable và bộ ca

Hai lượt bổ sung/62outcomes được giữ nguyên cùng31outcomes cũ. Không majority vote, best-of, thay câu lỗi hay đổi ngưỡng. Mỗi lượt stateful tiếp nối chính output/state của lượt đó. Các lần đọc nguồn public diễn ra ở thời điểm khác nhau; đây là mô tả tính nhất quán, không phải một run N3 cùng snapshot hoặc bằng chứng nhân quả. Primary chủ quan; human acceptance null.

| Lượt | USABLE | NEEDS_EDIT | UNUSABLE | Chưa hoàn thành | Eligible | Fallback | Handoff | No-send |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|1|21|7|0|3|27|1|2|1|
|2|23|5|0|3|27|1|2|1|
|3|20|5|1|5|25|3|2|1|

Mỗi lượt có một ownership-only control; kết quả đó không đo giọng tư vấn hay dịch vụ của nhân viên. USABLE không đồng nghĩa đã mua hàng.

| Ca | USABLE /3 | Lượt1 | Lượt2 | Lượt3 |
| --- | ---: | --- | --- | --- |
|B2_B3 1 — stateful-open|1|NEEDS_EDIT|USABLE|FALLBACK_OR_NO_SEND|
|B2_B3 2 — stateful-variant-quantity|2|NEEDS_EDIT|USABLE|USABLE|
|B2_B3 3 — stateful-quote|3|USABLE|USABLE|USABLE|
|B2_B3 4 — stateful-correction|3|USABLE|USABLE|USABLE|
|B2_B3 5 — stateful-private-checkout|0|FALLBACK_OR_NO_SEND|FALLBACK_OR_NO_SEND|FALLBACK_OR_NO_SEND|
|B2_B3 6 — stateful-confirm|0|FALLBACK_OR_NO_SEND|FALLBACK_OR_NO_SEND|FALLBACK_OR_NO_SEND|
|B2_B3 7 — stateful-human-request (ownership control)|3|USABLE|USABLE|USABLE|
|B1 1 — b1-changed-occasion|1|FALLBACK_OR_NO_SEND|USABLE|FALLBACK_OR_NO_SEND|
|B1 2 — b1-search-read|3|USABLE|USABLE|USABLE|
|B1 3 — b1-buying-concern|1|NEEDS_EDIT|NEEDS_EDIT|USABLE|
|B1 4 — b1-changed-occasion-v2|3|USABLE|USABLE|USABLE|
|B1 5 — b1-partial-source-v2|0|NEEDS_EDIT|FALLBACK_OR_NO_SEND|NEEDS_EDIT|
|B1 6 — b1-buying-concern-v2|0|NEEDS_EDIT|NEEDS_EDIT|NEEDS_EDIT|
|B1 7 — b1-current-policy|3|USABLE|USABLE|USABLE|
|B1 8 — b1-partial-source|0|NEEDS_EDIT|NEEDS_EDIT|NEEDS_EDIT|
|B1 9 — b1-price|3|USABLE|USABLE|USABLE|
|B1 10 — b1-component-stock|3|USABLE|USABLE|USABLE|
|B1 11 — b1-policy-used|2|USABLE|NEEDS_EDIT|USABLE|
|B1 12 — b1-current-policy-v2|2|USABLE|USABLE|UNUSABLE|
|B1 13 — b1-price-v2|3|USABLE|USABLE|USABLE|
|B1 14 — b1-component-stock-v2|3|USABLE|USABLE|USABLE|
|B1 15 — b1-search-read-v2|3|USABLE|USABLE|USABLE|
|B1 16 — b1-policy-used-v2|3|USABLE|USABLE|USABLE|
|B1 17 — b1-changed-occasion-v3|2|USABLE|USABLE|NEEDS_EDIT|
|B1 18 — b1-current-policy-v3|2|USABLE|USABLE|FALLBACK_OR_NO_SEND|
|B1 19 — b1-partial-source-v3|0|NEEDS_EDIT|NEEDS_EDIT|NEEDS_EDIT|
|B1 20 — b1-price-v3|3|USABLE|USABLE|USABLE|
|B1 21 — b1-component-stock-v3|3|USABLE|USABLE|USABLE|
|B1 22 — b1-search-read-v3|3|USABLE|USABLE|USABLE|
|B1 23 — b1-buying-concern-v3|3|USABLE|USABLE|USABLE|
|B1 24 — b1-policy-used-v3|3|USABLE|USABLE|USABLE|

Đọc lý do của từng lượt và actual reply trong PRIMARY_REVIEW/CONVERSATIONS; không dùng tần suất trên để đảo verdict hoặc chấp nhận ca chưa đạt. REQUEST_ACCOUNTING riêng từng lượt giữ toàn bộ request. B1 generationId xác định từ source/case nên trùng giữa hai lượt mới; combined accounting dùng (repetition,generationId), không gộp hoặc giảm denominator.

Public owner projection: cả24/24ca B1 giống nhau giữa hai lượt mới; 9/24 giống cả ba lượt. Hai DB khác nhau, policy artifact version references giống nhau nhưng captured bundle hash khác; không gọi đây là cùng world snapshot.
