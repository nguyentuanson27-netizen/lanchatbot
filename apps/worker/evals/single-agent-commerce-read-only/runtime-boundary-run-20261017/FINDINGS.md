# Finding sau sửa boundary và chạy bảy stateful outcomes

**Lượt mới FAIL về hành trình mua: 4 static fallback, 2 handoff, 1 no-send; không tạo được giỏ.** Primary chỉ có 1 USABLE cho yêu cầu chuyển ownership và 6 FALLBACK_OR_NO_SEND. [Cả bảy lượt](CONVERSATIONS.md), [review cả lượt](PRIMARY_REVIEW.md), [trace sau review](DIAGNOSIS.json). Không dùng HTTP200 hay unit PASS để thay kết quả khách nhận.

Source `13e69d43dc3ae9f792140ba8d16e9ad3057fcbb7`, N1. Raw `691fd912` trước primary `a8b74138`, rồi mới đọc trace/verdict chi tiết. Không patch, retry, replacement, reseed hoặc thêm generation sau kết quả. Models/prompts/native declarations và budgets giữ nguyên; đây không phải một phép đo paired cùng nguồn.

## Bốn lượt đầu thất bại trước verifier

| Lượt | Chuỗi thực tế | Kết quả |
| --- | --- | --- |
| 1 — lấy áo be/M | Vòng1 apply profile + read mặc định; vòng2 đọc lại AO; generation3 mới add đầy đủ be/M nhưng request đã NONE/tools[]. | Runtime chặn call quá budget; profile76/98 đã lưu, giỏ null, khách chỉ nhận fallback. |
| 2 — đổi L, lấy hai chiếc | Do chưa có giỏ, owner đọc mặc định rồi đọc AO; generation3 mới add L×2, còn bỏ màu. | Call dưới NONE không được thực thi; giỏ vẫn null. |
| 3 — hỏi tổng | Read mặc định; vòng2 add AO/L×2 thiếu màu + quote. Selector trả CART_VARIANT_AMBIGUOUS, availableSizes L / availableColors BE; quote bị DEPENDENT_EFFECT_REJECTED. Generation3 sửa BE và gọi quote nhưng đã NONE. | Không có cart/quote, fallback. |
| 4 — sửa số đo | Apply74/96 + read; vòng2 add L×2 thiếu màu + quote; cùng typed rejection. Generation3 sửa BE dưới NONE. | Profile revision3 đúng; cart null và fallback. Không lấy state correction đúng để cứu điểm cả lượt. |

**13/13 generation HTTP200 đều là owner tool outputs; không có FINAL model reply, verifier được gọi 0 lần.** Bốn request cuối thực sự có tools[]/NONE, được đối chiếu hash với exact serialized body mà adapter gửi. Các functionCall bị trả về không phải thought-only parts. Runtime giữ budget, không thực thi call muộn hoặc tự báo đã mua. Nguyên nhân sâu hơn của việc provider/model trả call dưới NONE vẫn chưa rõ; không gọi đó là lỗi auth/timeout hoặc chắc chắn một lỗi SDK.

Đây là các failure class cũ: đọc thừa → hết vòng, mất màu qua lượt, rồi tool call khi đã final-only. Không phải verifier quá chặt hay thiếu giá/tồn: từ generation2, trusted.facts đã có đúng giá499k áo/449k váy/799k set và stock; selector còn trả màu/size có thể chọn. Không có bound rejection trong run, max owner wire30.799/32.768bytes.

## Phải tính phần thay đổi đầu vào owner trong lần sửa này

Sửa diagnostic/ETA không làm owner đổi cách dùng tool. **Fact-array reuse có thay đổi hình thức tool result**: availability/sellingOptions vẫn còn nhưng số tiền/stock nằm trong trusted.facts đầu request thay vì được lặp ngay trong từng offer của response. Bảo toàn dữ kiện và scope không tự chứng minh model dùng được quan hệ đó tốt như trước.

Sau read mặc định, slots1/2 lại đọc AO dù AO price/stock đã có ở trusted. Đây là nghi phạm cụ thể về việc owner phải ghép facts qua hai chỗ; chưa có paired comparison để khẳng định fact reuse gây ra các calls này. Read thừa ở generation1 xảy ra trước khi có facts để dedup; màu bị bỏ và NONE violations cũng từng xuất hiện ở run cũ. Không đổ toàn bộ regression cho một nguyên nhân duy nhất hoặc nói model thiếu thêm một câu prompt.

**Không chấp nhận treatment này như một cải thiện đã chứng minh.** Nó bỏ20.072bytes cộng dồn trên60captures cũ, nhưng max vẫn31.352bytes và controlled signature variation vẫn35.905bytes. Lợi ích headroom chưa giải quyết owning risk, trong khi owner tool behavior của N1 mới kém hơn. Hướng sửa nhỏ tiếp theo nên khôi phục facts tại native read responses, giữ diagnostic/rejected-byte evidence, rồi mới đo lại khi có yêu cầu; không viết lại owner/verifier hoặc giảm ngân sách an toàn. Đây là đề xuất sau run, chưa thực hiện rollback hoặc generation thêm.

## Checkout chưa tới nhánh ETA mới

Private checkout thất bại tại **PLANNER / NO_TRANSITION_PLAN** vì cart null, rồi chuyển ownership. Confirm tiếp theo NO_SEND/CURRENT_AUTHORITY_CHANGED, 0 model calls. Requested-human control riêng chuyển ownership theo yêu cầu, chưa chứng minh nhân viên thật tiếp nhận và không phải mua hàng hoàn tất.

Do đó không quy lỗi checkout run này cho CART_ETA_REGION_UNRESOLVED. Nhánh phân biệt vùng mới chỉ có focused/control evidence; mapping địa chỉ→vùng có thẩm quyền vẫn chưa được bổ sung và là giới hạn còn lại nếu đi tới checkout đầy đủ. Không đoán vùng, thêm DEFAULT hoặc publish catalog để lấy PASS.

## Cái đã được chứng minh và cái chưa

- Diagnostic/recovery propagation và legacy default terminal JSON được chứng minh bằng RED→GREEN/full checks; không có runtime STALE trong provider run, nên không claim provider coverage cho nhánh diagnostic mới.
- Native input giữ nguyên prompts/declarations/signatures/current trusted facts và code authority; điều đó không bảo đảm cách đặt facts mới không ảnh hưởng model behavior.
- Max actual wire dưới bound, 0 lỗi provider/timeout/retry. Long-signature limit vẫn chưa resolved; không tăng bound, cắt signatures hoặc sửa prompt để cứu run.
- 0 observed evaluator/private-fixture labels trong13requests; private checkout/confirm không vào model. Chỉ có4static fallback được capture; không có model final để đo verifier latency, binding acceptance hoặc giọng tư vấn.
- Unit/control PASS bảo vệ hợp đồng code. Chưa có bằng chứng cải thiện tự nhiên, sales decision, verifier stability hoặc source-backed purchase. B1/A2/A3 không chạy trong lượt này; A vẫn OWNER_BYPASS.

**Recommendation: STOP sales/live acceptance; source checkout chưa hoàn tất.** Không auto-fix/rerun hoặc mở Phase C. Ưu tiên xử lý presentation của native tool result và conformance final-only; giữ từng thay đổi có thể đo riêng, không vá câu trả lời theo case hoặc tăng tool budget để che các read thừa.
