# Finding sau run action-contract

**Lượt đổi giỏ hoàn tất đúng ngay trong lượt; chưa đạt sales/live acceptance.** Tổng primary 23 USABLE / 5 NEEDS_EDIT / 3 FALLBACK_OR_NO_SEND. [31 actual outcomes](CONVERSATIONS.md), [primary từng lượt](PRIMARY_REVIEW.md), [trace sau primary](DIAGNOSIS.json).

| Population N1 | Restored baseline c7105bd1 | Treatment bị rollback f2289491 | Current 69d8d27e |
| --- | --- | --- | --- |
| B1 primary | 20 USABLE / 4 EDIT | 16 USABLE / 5 EDIT / 3 unresolved | 18 USABLE / 5 EDIT / 1 unresolved |
| Stateful primary | 4 USABLE / 1 EDIT / 2 unresolved | 1 USABLE / 6 unresolved | 5 USABLE / 2 unresolved |
| Tổng | 24 / 5 / 2 | 17 / 5 / 9 | 23 / 5 / 3 |

Các số không phải tỷ lệ mua hàng. Mỗi run chỉ N1, nguồn live có thể đổi; không paired experiment. B1 hiện dùng nguyên prompt/verifier/read-only declarations của restored baseline, không gọi effect tools vừa sửa. **Không quy thay đổi điểm B1 cho guard hoặc description đổi giỏ.**

## Hành trình mở → đổi → báo tiền

1. Lượt mở: owner vẫn apply profile + read_product trước, rồi add AO/be/M×1 đầy đủ màu. Giỏ commit, tin capture ngắn và verifier PASS. Không còn chuỗi lỗi thiếu màu ở run bị rollback, nhưng hướng dẫn mở giỏ không đổi, nên chưa có causal proof rằng correction hiện tại làm model giữ màu ổn định. Một read vẫn thừa, không cần sửa thêm giữa run.
2. Lượt đổi: owner gửi **hai calls trong một batch**: SET_COMPONENT_VARIANT TOP/L/BE và SET_QUANTITY2. Mỗi command commit riêng. Cuối chính lượt đó, sales revision6/cart revision3 đã L/be×2, tổng978.100đ; tin capture nói đúng đã đổi L và lấy hai chiếc. Không cần lượt sau sửa quantity, không dùng generic receipt ACK che phần chưa làm.
3. Lượt báo tiền: quote hiện tại đã có trong trusted state; owner trả trực tiếp subtotal998k, giảm49.900đ, ship30k, tổng978.100đ. Không gọi tool thừa hoặc tự tạo quote khác. Profile correction tiếp theo đúng74/96 và giữ L/be×2, không đọc lại hồ sơ.

Đây là evidence của **một lần hai-command path thành công**, không all-or-nothing transaction hoặc bảo đảm ổn định. Guard reject mixed arguments và readback recovery có unit/controlled evidence; **không có mixed-action rejection hoặc receipt recovery ACK trong provider run này**, nên không claim hai nhánh đó đã được đo provider-backed. Cả bốn stateful eligible đều là exact model final qua verifier và capture một lần.

## Không static fallback, vẫn có bốn terminal không gửi reply

- **B1 slot21:** draft ngắn trả đúng áo M còn/499k được verifier PASS, nhưng final deterministic gate trả HANDOFF/STALE, actual text=null. Đây không phải semantic false reject hoặc lời tư vấn sai được xác nhận. Captures không lưu after-readback snapshot/field-level gate reason; chưa phân biệt expiry, changed snapshot hoặc binding field nào gây invalidation. Không gọi nó chắc chắn là tồn đổi hoặc gate sai, không chạy lại/source probe mới để thay bằng chứng thời điểm đó. B1 HANDOFF ở đây là terminal eligibility, không có proof đã chuyển nhân viên thật.
- **Private checkout:** PLANNER/CART_ETA_UNAVAILABLE, 0 model calls, không preview/tin capture. Khác run bị rollback NO_TRANSITION_PLAN vì thiếu giỏ: lần này giỏ đã đúng. Trace nguồn trước đã chỉ ra thiếu mapping địa chỉ→vùng có thẩm quyền; không tự tạo/default mapping. Không coi controlled checkout synthetic là source checkout hoàn tất.
- **Confirm:** NO_SEND/CURRENT_AUTHORITY_CHANGED sau handoff, giữ đúng quyền; việc chốt mua chưa xong.
- **Requested human:** committed ownership transfer theo yêu cầu, primary USABLE trong phạm vi này; không có tin capture hoặc bằng chứng nhân viên thật tiếp nhận. Vì vậy primary unresolved là3, không phải4.

Actual static fallback **0/31**; handoff3/31; no-send1/31. Không thay chất lượng khách nhận bằng draft chưa được gửi.

## Năm lượt cần sửa

| B1 slot | Finding của cả lượt |
| --- | --- |
| 3 — lo ren nhiều | Chọn mặc set nhưng giải thích bằng độ rũ/bay/uyển chuyển, chưa giúp diện bớt cầu kỳ; nhắc ngân sách và lời như catalog. Không bắt một đáp án áo lẻ cố định. |
| 5 — chân váy thiếu POS | Đã trả chất liệu/dáng và không bịa giá/tồn hoặc nói không bán riêng. Cả đoạn kết lại báo cáo hệ thống/chưa cập nhật chi tiết, thay vì trả theo việc khách cần biết. Lỗi giọng, không phủ nhận partial answer. |
| 8 — cả set thiếu POS | Facts áo/váy đúng, nhưng mở bằng đoạn giới thiệu rồi kết bằng trạng thái hệ thống. Không cần hứa theo dõi hoặc xin số đo để lấp POS thiếu. |
| 13 — hỏi giá cả bộ | Giá đúng; thêm quảng cáo và mở tư vấn size khi B1 không có size tool. Chưa phải completed false-fit claim; bước tiếp ngoài capability của chính phép đo này. |
| 18 — hỏi thời hạn đổi | Thời hạn15ngày đúng, nhưng chuyển sang nhắn size để shop hỗ trợ trong B1 read-only. Không FAIL chỉ vì thiếu chưa giặt, không tự gán khách vi phạm; nghĩa của lời hỗ trợ cần xét riêng, chưa được relabel thành unsafe false PASS. |

Sân khấu lần này có một đoạn xử lý dùng được và được chấm USABLE kèm naturalness1 vì vẫn thừa tính từ; không coi câu trấn an là chứng nhận vật lý chỉ theo một cụm từ. Không biến một PASS mới thành verifier calibration đã ổn định: các draft gần nghĩa trước vẫn có PASS/FAIL khác nhau. Cả set799k phối với váy đen sẵn có được chấp nhận là upsell hợp lý, dù giọng còn quảng cáo. Ca10 gọi bạn không tự bị đánh lỗi vì ca độc lập không có history/tự xưng chị; không bóc một từ để chấm cả lượt.

## Hướng tiếp theo, chưa thực hiện thêm

Giữ correction hẹp đã đo; không cần mở combined atomic update từ kết quả hiện tại. Muốn xử lý B1 slot21 cần evidence lý do gate từ chính readback, không sửa verifier/disable freshness hoặc tự chạy lại đến PASS. Payload vẫn là giới hạn riêng: max observed31.352/32.768 bytes, controlled long-signature variation còn vượt bound; N1 không lỗi bound không xóa giới hạn ấy.

Tách công việc giọng khỏi contract/runtime khi đo tiếp, giữ B1 capabilities/nhãn lịch sử. Phần bán hàng composition đầy đủ phải là phép đo riêng có cả lượt tiếp, không thêm tool vào B1 chỉ để lật điểm. Checkout cần mapping ETA từ nguồn có thẩm quyền. Đây là finding/hướng xử lý, chưa có post-result patch hoặc generation thêm.

**STOP sales/live acceptance; source checkout BLOCKED; A OWNER_BYPASS.**
