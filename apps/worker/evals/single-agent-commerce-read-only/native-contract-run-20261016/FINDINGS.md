# Finding sau một lượt sửa và chạy đủ Phase B

**Bản sửa qua kiểm tra code nhưng kết quả model kém hơn baseline. Recommendation: STOP.** Giữ nguyên cả 31 outcomes và primary review, không sửa prompt sau kết quả hoặc chạy bù để cứu run.

| Cùng population N1 | Baseline `c7105bd1` | Candidate `f2289491` |
| --- | --- | --- |
| B1 actual terminal | 24 eligible / 0 fallback | 21 eligible / 3 fallback |
| B1 whole-turn review | 20 USABLE / 4 NEEDS_EDIT | 16 USABLE / 5 NEEDS_EDIT / 3 FALLBACK_OR_NO_SEND |
| Stateful actual terminal | 4 eligible / 2 handoff / 1 no-send | 0 eligible / 4 fallback / 2 handoff / 1 no-send |
| Tổng primary | 24 USABLE / 5 NEEDS_EDIT / 2 FALLBACK_OR_NO_SEND | 17 USABLE / 5 NEEDS_EDIT / 9 FALLBACK_OR_NO_SEND |

Baseline ở [report trước](../advisory-context-run-20261016/CHECKPOINT_B.md). Đây là hai lần đo N1, không phải paired experiment hoặc bằng chứng tác động riêng của mỗi thay đổi. Primary của candidate được commit trước đọc rejected drafts/verdict chi tiết; không đổi điểm sau diagnosis. Một USABLE stateful chỉ là requested ownership transfer, không phải mua hàng thành công. [Hội thoại thực tế](CONVERSATIONS.md), [primary từng lượt](PRIMARY_REVIEW.md), [trace diagnosis](DIAGNOSIS.json).

## 1. Lỗi stateful xảy ra trước verifier

Cả bốn lượt đầu có cùng chuỗi quan sát được:

1. Owner dùng vòng đầu đọc lại sản phẩm, có lúc cùng cập nhật profile. Initial source readback đã có trong context; native add tool tự kiểm giá/tồn, không cần read để cấp quyền thêm.
2. Ở vòng tool thứ hai, `add_to_cart` có offer/size/quantity nhưng **bỏ color**, dù lượt đầu khách đã chọn be và các lượt sau giữ lựa chọn ấy trong history. Code trả `SELECTION_UNAVAILABLE`, `status=INVALID`, `reasonCode=CART_VARIANT_AMBIGUOUS`, kèm `availableColors=[BE]` và M hoặc L. Không có cart mutation/receipt thành công.
3. Owner generation cuối đã được gửi với `tools=[]`, `mode=NONE`, không còn vòng tool (`roundsRemaining=0`). Model vẫn trả `add_to_cart` có màu BE; ở hai lượt còn kèm `quote_cart`. Runtime không thực thi chúng và kết thúc BUDGET. Cả bốn khách chỉ nhận static fallback; verifier chưa có final text để chấm.

Đây là **tool-argument omission và không tuân final-only mode**, cộng với hai vòng đã dùng hết; không phải verifier quá chặt, HTTP/token lỗi hoặc bound 32KB. 89/89 generation HTTP trả 200; max owner wire 29.616 bytes, không có bound error. Profile được ghi/sửa nhưng không thay việc giỏ vẫn null. Các `quote_cart` cùng batch sau add thất bại bị `DEPENDENT_EFFECT_REJECTED`, giữ đúng authority về tiền.

Native description mới đã rút mất câu truyền offerType/size/color/quantity theo lựa chọn khách, cùng một số hướng dẫn đọc có điều kiện. Schema vẫn chỉ bắt buộc subjectRef. Đây là **điểm yếu cụ thể của bản sửa**: kiểm tra tên/type và request size không chứng minh model tiếp tục truyền đủ lựa chọn. Tuy nhiên owner prompt và nhiều descriptions đã cùng đổi; chưa có phép đo tách riêng để kết luận một câu bị xóa là nguyên nhân duy nhất. Không tăng budget, default màu hoặc thực thi tool khi đã NONE để che lỗi.

Private checkout sau đó dừng ở **PLANNER / NO_TRANSITION_PLAN**, giỏ null, 0 model requests; không tới preview. Confirm tiếp theo NO_SEND vì ownership đã đổi. **Không quy lỗi checkout lần này cho CART_ETA_UNAVAILABLE** như baseline. Mapping địa chỉ → vùng ETA có thẩm quyền vẫn thiếu theo source trace trước, nhưng nhánh đó không được thực thi trong run này.

## 2. Ba B1 fallback có nguyên nhân khác nhau

| Slot | Nháp bị chặn, không phải tin khách nhận | Diagnosis sau primary |
| --- | --- | --- |
| 1 — đổi sang sân khấu | Nói áo “sẽ hơi thấu sáng”, mặc áo hai dây nude thì “yên tâm hoàn toàn khi lên đèn”. | Đề xuất lớp áo trong được phép. Khẳng định kết quả xuyên sáng và bảo đảm giải quyết dưới đèn mạnh không có căn cứ được cấp. Verifier chặn có cơ sở; không cần cấm tư vấn cảm giác/phối đồ. Verdict chỉ expose kind/ref, không cho biết chính xác clause nào được dùng. |
| 5 — thiếu POS, hỏi chân váy riêng | Nói “thiết kế nguyên set nên shop hiện chưa bán rời chân váy riêng”. | Hai lần read đều báo POS_SNAPSHOT_UNAVAILABLE, availableOffers/sellingOptions=null. Owner biến chưa biết lựa chọn bán thành không bán rời, thay vì trả phần chất liệu/dáng độc lập. Native description cũ có câu null là chưa biết; bản rút đã bỏ. Chặn claim bán hàng không căn cứ là hợp lý, không phải bắt thiếu keyword. |
| 23 — chọn set hay áo để mặc lại | Set 799k “kinh tế hơn hẳn so với mua lẻ áo (499k)”. | Giá đều đúng; giới thiệu cả set trong ngân sách được owner cho phép. Câu so sánh không làm rõ đang so lượng món/giá trị hay khoản phải trả, nên dễ bị đọc thành set rẻ hơn áo. Violation trỏ PRICE của SET_VAY 799k. Chưa đủ bằng chứng kết luận verifier chặn upsell nói chung hoặc trigger chính xác; cần adjudication nghĩa so sánh, không đổi nhãn sau run. |

Actual terminal của cả ba là `C3_A_NONPROTECTED_V2`, không có phần trả lời hữu ích còn lại. Không tính chất lượng nháp bị chặn thành chất lượng khách nhận.

## 3. Năm reply được gửi vẫn cần sửa

- Slot 3: câu hỏi về mẫu đi làm vẫn nhận đoạn quảng cáo dài, chưa giải quyết rõ lựa chọn.
- Slot 9 và 22: báo giá/tồn đúng nhưng đề nghị tư vấn size chuẩn trong B1 chỉ được cấp read tools, chưa có recommend_size/fit claim. Không có completed false-fit assertion; bước tiếp chưa thực hiện được bằng khả năng hiện tại.
- Slot 17: khách đã chuyển sang hoàn cảnh cần gọn hơn; owner vẫn mở bằng khuyên cả bộ, rồi coi ưu tiên ấy là giả định và hỏi khách chọn lại. Lỗi là không theo lựa chọn/hoàn cảnh mới, không phải mọi upsell đều sai.
- Slot 19: partial answer facts đúng nhưng chuyển từ “chị” sang “anh/chị” và dùng lời xin thông cảm theo mẫu. Đây là lỗi giọng cả tin, không phải một từ bị cấm.

Slot 6 cải thiện: đã ưu tiên áo phối đồ trơn thay vì giao cả danh sách cho khách tự chọn. Policy các ca mặc/giặt/cắt tem bị từ chối đúng; các câu hỏi thời hạn/phí không bị chấm thiếu checklist. Không phủ nhận phần tiến bộ này vì tổng kết quả giảm.

## 4. Phần đã chứng minh và phần chưa chứng minh

Guard mới chặn argument lẫn action trước effect; valid two-action batch/idempotence được kiểm bằng RED→GREEN và controlled integration. Projection chỉ bỏ cart khi exact current public readback khớp, giữ receipt/native signatures và original context. Worker 1.796 tests và Node eval cuối 492 tests PASS; controlled COD/bank đều 24/24 PASS. [Các lần fail đầu, corrections và commands thật](PREPARATION.md).

**Run provider chưa chứng minh hai fix ấy giải quyết hành trình mua**: không có successful add/change cart, không exercise continuation sau successful cart hoặc đổi variant/quantity. Cart-dedup không gây mất màu trong bốn lượt này vì chưa có cart thành công để dedup; action guard mới cũng chưa được gọi qua change_cart_item. Native guidance/owner behavior mới là chỗ cần xem ở trace hiện tại. Offline long-signature variation còn 284 bytes không phải bảo đảm mọi request tương lai vừa bound.

## Hướng sửa tiếp theo, chưa thực hiện trong run này

1. Giữ effect guard và projection đã có evidence. Khôi phục hướng dẫn tool có nội dung cần thiết: truyền đủ lựa chọn khách đã chốt, giữ màu qua lượt, add tự kiểm giá/tồn; null availability là chưa biết. Không đồng nhất ít chữ với ít tải hiểu, không rút các boundary này để giảm vài trăm bytes.
2. Dùng lại cùng initial public snapshot và những native calls đã capture để kiểm phần instructions/arguments mất nghĩa; nếu đo provider tiếp, tách treatment nhỏ để biết thay đổi nào giúp hoặc hại. Giữ budget, không default selection hoặc cho chạy tool sau NONE. Không thêm gate/role/parser/retry mới.
3. Giữ quyền gợi lớp áo và upsell; tách lời khuyên phối đồ khỏi bảo đảm đặc tính sử dụng, và làm rõ cơ sở của so sánh giá trị với khoản chi. Không thêm ví dụ đáp án để fit ba ca hoặc biến mọi benefit thành phép thử bắt buộc.
4. Sửa tại đoạn owner hiện có về chuyển hoàn cảnh và availableTools; đọc lại cả reply về lựa chọn, giọng và bước tiếp. Không chấm bằng keyword hoặc ép mỗi tin một format.
5. Chỉ đánh giá tiếp checkout nguồn sau khi giỏ thực sự được tạo. Mapping ETA cần source có thẩm quyền; không tự dựng mapping hoặc coi controlled synthetic checkout là source checkout.

Đây là hướng xử lý sau kết quả, không phải một vòng fix/run đã được thực hiện thêm. **Dừng sau report và PR391 update; sales/live STOP, source checkout BLOCKED, A OWNER_BYPASS.**
