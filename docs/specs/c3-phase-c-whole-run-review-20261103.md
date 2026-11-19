# Review toàn bộ lượt model hoàn tất ngày 03/11/2026

Đã đọc 48 lượt có terminal capture của 33 ca, các draft bị chặn, verdict, tool calls và native diagnostics; đối chiếu cùng 48 turn keys của lượt source-bound trước. Đây là review định tính theo toàn lượt/hành trình và mục tiêu bán hàng, không phải chấm mù theo rubric đã khóa. Không đếm keyword hay tự đổi nhãn cohort. Quality chính thức vẫn NOT_GRADED; Phase C qualification BLOCKED / C3 NOT_RUN / B_NOT_GO.

Nguồn kết quả hiện tại gồm 17 lượt ở `4e87350c` và 31 lượt bổ sung ở `5b679acc`. Attempt s09 cũ bị ngắt không có terminal vẫn được giữ với 3 generation requests riêng; không lấy lần mới thay kết quả cũ. [Packet đã audit](../../apps/worker/evals/single-agent-commerce-qualification/media-budget-context-run-20261103/REPORT.md) và [lượt đối chiếu trước](../../apps/worker/evals/single-agent-commerce-qualification/source-bound-run-20261103/REPORT.md) giữ nguyên.

## Nhận xét chính

Bot đã trả lời được thêm một số việc bán hàng thông thường, nhưng chưa vận hành trọn một cuộc bán hàng ổn định. Nút thắt lớn nhất hiện tại là ảnh đủ điều kiện sử dụng, lựa chọn biến thể/màu và capability size từng phần; không phải mọi ca im lặng đều do verifier hoặc văn phong. Một số tác vụ khách hỏi rất đơn giản vẫn bị biến thành chuỗi tool không cần thiết.

| Kết quả thực tế trong harness | Lượt trước | Lượt hiện tại |
|---|---:|---:|
| Có phản hồi, gồm code-owned | 11 | 18 |
| Handoff im lặng | 27 | 22 |
| No-send do hội thoại đã thuộc người xử lý | 10 | 8 |
| Tổng lượt capture | 48 | 48 |

Đây là so sánh outcome mô tả trên cùng turn keys, không phải điểm chất lượng, tỷ lệ chuyển đổi hoặc thử nghiệm nhân quả. Hai thế giới nguồn, thời điểm và output model khác nhau; mỗi ca chỉ chạy một lần. Chín lượt chuyển từ im lặng sang có phản hồi, hai lượt chuyển chiều ngược lại; j1 lượt 2 chuyển HANDOFF thành NO_SEND do đã handoff sớm hơn, không phải một cải thiện.

## 22 handoff dừng ở đâu

Mỗi handoff được xếp theo nguyên nhân trực tiếp quan sát ở lượt đó, không theo tất cả thiếu sót tiềm ẩn của ca.

| Nhóm | Số lượt | Ca | Bằng chứng và cách hiểu |
|---|---:|---|---|
| Chuẩn bị ảnh mở đầu không có ảnh đủ điều kiện | 6 | p02, p06, p07, h02, s01, s03 | `openingMediaWork=UNAVAILABLE/OPENING_MEDIA_SOURCE`; chưa gọi owner. p07 còn thiếu capability size từng phần nhưng lượt này bị chặn bởi ảnh trước. |
| Lựa chọn mua chưa xác định được màu/tuple | 3 | h01, j1 lượt 1, j4 lượt 1 | `add_to_cart(...color:null)` trả `SELECTION_UNAVAILABLE`; readiness ghi `CART_COLOR_REQUIRED`. Chưa commit cart trong các lượt này. |
| Size từng phần chưa được hỗ trợ | 2 | s07, j2 lượt 1 | `recommend_size(fitScope=COMPONENT)` trả `SIZE_SOURCE_UNAVAILABLE`; source code hiện từ chối toàn bộ COMPONENT trước khi đọc chart. |
| Verifier chặn nghĩa sai | 4 | p10, s04, s11, s13 | Sai mô tả họa tiết, diễn giải màu chưa ghi nhận thành phiên bản, bỏ ràng buộc màu khách hỏi, hoặc coi cùng component là hai áo khác nhau. |
| Handoff đúng nghiệp vụ | 3 | s10, s12, j5 lượt 1 | Đổi đơn đã đặt, hàng lỗi, hỏi đơn cũ; không phải lỗi tư vấn. |
| Generation/context | 2 | p01, s15 | p01 HTTP200 nhưng provider trả `MALFORMED_RESPONSE`; s15 request vượt bound trước HTTP. |
| Owner tự gọi ảnh không cần cho câu hỏi | 1 | s06 | Khách hỏi phối quần nâu; owner đọc áo rồi chọn ảnh SQ2447, không có ảnh đủ điều kiện, sau đó handoff. |
| Không phục vụ được ảnh feedback đúng yêu cầu | 1 | s16 | Readiness/capability không có FEEDBACK cho phần áo; owner gọi handoff trực tiếp. Không được thay bằng ảnh MODEL. |
| **Tổng** | **22** | | |

Tám NO_SEND nằm ở hai lượt sau của j1, j2, j4 và j5, đều là `HUMAN_OWNS_CONVERSATION`. Hệ thống giữ ownership đúng; không phải tám lần gọi model thất bại. Đồng thời, j1/j2/j4 không kiểm được đầy đủ tác vụ dự định ở đoạn sau.

## Root cause đã kiểm tra thêm

### Ảnh có trong nguồn, nhưng chưa đủ điều kiện gửi

Đọc snapshot đã freeze, chạy lại pure eligibility ở đúng capture clock, không tải ảnh, không gọi provider và không sửa timestamp:

| Sản phẩm | Ảnh trong nguồn | Quá hạn tại capture | Clock không hợp lệ | Ảnh GENERIC được chọn |
|---|---:|---:|---:|---:|
| SQ2447 | 10 | 10 | 0 | 0 |
| SV1561 — Khánh Trang | 11 | 11 | 0 | 0 |
| V406 — Ngọc Trâm | 11 | 11 | 0 | 0 |
| SD023 | 10 | 0 | 10 | 0 |
| SV2447 | 11 | 0 | 1 | 2 |

Source policy là 30 ngày cho media. SQ2447 và SV1561 mang product observedAt 28/09; V406 mang 05/09. SD023 không có clock sử dụng được. SV2447 có proof revalidation cho một phần ảnh. Vì thế capture PostgreSQL/Redis/Qdrant mới không tự làm mới bằng chứng từng ảnh. Không kết luận shop không sở hữu ảnh, và không giải quyết bằng cách gia hạn TTL trong eval. Cần quy trình kiểm tra/publish/revalidation nguồn thật cho đúng asset và metadata.

### Lựa chọn giỏ phụ thuộc vào khác biệt null và canonical tuple

Pure replay ở capture clock cho SV2447/AO cả M và L:

- `color:null` trả `COLOR_REQUIRED`: có hai tuple khả dụng, `__NO_COLOR__` IN_STOCK và BE PRE_ORDER.
- Chỉ rõ `__NO_COLOR__` hoặc BE đều resolve READY cho chính tuple đó. Đây không cấp quyền gọi `__NO_COLOR__` là màu thật, cũng không cấp quyền tự chọn màu khách chưa yêu cầu.
- j1 lượt trước owner dùng `__NO_COLOR__` và thêm áo L được; lượt này owner dùng null và bị chặn. Nguồn/contract cần phân biệt lựa chọn tồn không ghi màu với lựa chọn BE đặt trước, thay vì kỳ vọng model luôn chọn cùng cách mã hóa.

Đây là lý do quan sát được cho hồi quy j1, không phải bằng chứng W2 cleanup subject bị hỏng. Lượt này j1 chưa tới bước thêm size thứ hai, nên cũng chưa chứng minh W2 hết lỗi trên hành trình model thật. Nếu thiếu thông tin khách mà lựa chọn nguồn đã rõ thì hỏi khách; nếu thiếu ánh xạ màu thật của shop thì handoff. Không đoán màu hoặc mặc định loại có hàng chỉ để qua test.

### Size từng phần là capability chưa có

`apps/worker/src/single-agent-commerce-state.ts` trả UNAVAILABLE ngay khi `fitScope=COMPONENT`, trước việc đọc nguồn size. Chart dùng chung cấp PRODUCT không cấp fit cho riêng TOP/PANTS/SKIRT. s07/j2 không phải model chưa biết dùng chiều cao/cân nặng; owner đã gọi đúng scope và code chặn đúng capability hiện tại. p07 chưa kiểm được capability này trong lượt hiện tại vì ảnh SQ2447 chặn trước.

### Một lời cảm ơn kéo theo quá nhiều thao tác

s15: “Chị thích áo Thạch Thảo màu be, cảm ơn em nhé.” Owner lưu preference màu rồi đọc AO của cả SQ2447 và SV2447. Continuation là 65.879 byte, vượt 65.536 byte, bị chặn trước HTTP. Telemetry ghi system 22.000 byte và tool schema 15.267 byte, chưa tính trusted/native dialogue còn lại. Lossless compaction đã giúp s02/s13 đi tiếp nhưng chưa bảo đảm mọi continuation đều vừa.

Lưu preference có thể có ích; đọc lại hai món để đáp ACK không giúp yêu cầu hiện tại. Không sửa bằng cách tăng cap, bỏ trusted facts, repair/retry hoặc thêm một regex bắt chữ cảm ơn. Cần giảm đường đọc thừa và kiểm kích thước request của các nhánh state+read thực tế.

## Verifier có chặn quá tay không

Trong 48 lượt có capture có 4 semantic FAIL. Review cả câu và nguồn cho thấy cả bốn có căn cứ:

| Ca | Nghĩa sai của toàn draft |
|---|---|
| p10 | Sau search “bộ hoa”, gọi Uyển Hoa là thiết kế hoa trong khi nguồn chỉ xác nhận họa tiết thổ cẩm. Search trả ứng viên không xác nhận ứng viên đúng mô tả khách. |
| s04 | “Màu be và bản tiêu chuẩn” biến token màu chưa ghi nhận thành một phiên bản thật để khách chọn. |
| s11 | Khách hỏi hai bộ **màu be**; owner đọc không được đúng màu rồi bỏ filter và nói đủ hai bộ khách đang tìm. Số tồn không sai nhưng đáp ứng màu be chưa có căn cứ. |
| s13 | AO của SQ2447/SV2447 cùng componentRef SV2447-AO, nhưng draft nói hai mẫu áo và bắt khách chọn giữa hai áo đó. |

Không thấy lý do nới verifier cho bốn câu này. s13 đồng thời cho thấy context lặp theo parent product chưa giúp owner nhận ra cùng một món mua lẻ. Các PASS không phải chứng nhận câu trả lời hữu ích; verifier không có nhiệm vụ chấm sales/CTA/voice. Attempt verifier s09 bị ngắt cũ có provider error, không được gọi là semantic FAIL thứ năm.

## Chất lượng tư vấn và trải nghiệm

Điểm dùng được: p03 trả thẳng tồn/giá; p04 chọn M bằng kết quả code rồi trả giá cả bộ; p09 hỏi đúng set quần hay váy; p08 đổi set thành áo lẻ và tổng 829k thành 529k có receipt. s05 chọn một mẫu và nói rõ preorder; s08 chọn Diệp An và có so sánh; s09 trả lời chăm sóc áo; s14 tôn trọng khách muốn xem thêm; j3 giữ mạch khách đã có quần nâu và không ép mua cả bộ. Đây là giá trị thật, dù cách viết chưa đều.

Những điểm cần cải thiện về sales, không phải lỗi fact:

- p08 sau khi khách nói lấy hàng lại hỏi “Chị cần em hỗ trợ chốt đơn luôn không ạ?”; j6 “Chị sẵn sàng chốt đơn thì báo em”. Đã có ý mua, bước tiếp theo nên giúp đi tiếp bằng tác vụ checkout phù hợp và thông tin còn thiếu. Đây là nhánh cần chỉnh hành vi, không chỉ thay một câu CTA.
- s08 chọn đúng nhưng giải thích dồn “lịch sự, trang trọng, thanh lịch, sang trọng”; s05 nối nhiều tính từ rồi gọi mã SQ675. Câu dài thêm chưa giúp khách quyết định hơn tương ứng. Đây là mức chất lượng vừa phải, tạm chấp nhận theo ưu tiên owner, không mở thêm vòng sửa giọng hàng loạt.
- j3 hỏi size theo danh sách S/M/L/XL và lặp giá/câu hỏi khi khách quay lại chọn áo; vẫn dùng được nhưng hơi giống form. Không tự gọi việc hỏi size còn thiếu là lỗi, cũng không coi “em ghi nhận” là claim đã ghi state nếu toàn câu chỉ xác nhận lựa chọn.
- p04 nhắc chiều cao/cân nặng trong câu chọn M có vai trò làm căn cứ, không phải tự động lỗi liệt kê. Không chấm fail theo sự xuất hiện của số đo.
- j6 hỏi tên lần hai vì khách chỉ nói COD, chưa trả tên. Đây không chứng minh quên lịch sử hoặc ghi sai state. Có thể đáp nhận COD gọn hơn nhưng không phải lỗi nghiêm trọng. Ca kết thúc ở thu thông tin, chưa chứng minh tạo preview/xác nhận đơn hoàn chỉnh.

Ảnh gửi được là ảnh giới thiệu chung; chưa có bằng chứng ở lượt này rằng bot dùng thành công ảnh cận chất hoặc feedback đúng yêu cầu để thuyết phục. s03 và s16 đều không phục vụ được ảnh khách cần. Không gọi số attachment là điểm thuyết phục.

## Review từng ca — đủ 33 ca, 48 lượt

Các ID p/h có prefix c-po-20261031-; s/j có prefix c-20261028-. Nhận xét áp dụng cho toàn ca, kể cả terminal recovery; không chấm draft bị chặn như reply gửi khách.

| Ca | Lượt | Review toàn ca |
|---|---:|---|
| p01 | 1 | Khách hỏi bán áo lẻ/giá; ảnh đã READY, owner gọi thêm ảnh rồi provider trả MALFORMED_RESPONSE ở HTTP200. Mất một cơ hội bán hàng đơn giản, hồi quy so với lượt trước. Không đủ bằng chứng về nguyên nhân nội bộ provider. |
| p02 | 1 | Giá quần lẻ không được trả vì ảnh SQ2447 quá hạn; owner chưa được gọi. Source/media gate, không phải model không biết báo giá. |
| p03 | 1 | Trả tồn M và giá chân váy gọn, có ảnh. Dùng được. |
| p04 | 2 | Chọn M có kết quả code, trả giá cả bộ đúng câu hỏi sau. Nhắc căn cứ khách ở mức có thể chấp nhận. |
| p06 | 1 | Combo ba món bị chặn bởi ảnh SD023 không có clock; chưa kiểm được tính giá combo bằng model. |
| p07 | 1 | Yêu cầu chọn size từng phần dừng ở ảnh trước; capability COMPONENT cũng chưa có. Không kết luận đã test xong tư vấn hai size. |
| p08 | 2 | Add set rồi đổi áo lẻ đúng receipt/tổng; CTA hỏi có muốn chốt khi khách đã muốn mua còn vòng vo. Ưu tiên sửa bước tiếp theo, giữ mutation đã đạt. |
| p09 | 2 | Hỏi phân biệt set quần/váy đúng, rồi trả tồn M/giá. Tiến bộ ở đường clarification. Không có ảnh, opening scope ghi NOT_REQUIRED; không tự gọi là vi phạm gate vừa được owner thu hẹp. |
| p10 | 1 | Hỏi mẫu cũ chưa rõ; search trả ứng viên nhưng owner gán họa tiết sai. Verifier chặn hợp lý. |
| h01 | 1 | Mua áo L chưa chọn được tuple vì null màu; handoff. Cùng gốc lựa chọn với j1/j4, không phải media. |
| h02 | 1 | Hỏi giá Khánh Trang nhưng ảnh source quá hạn chặn mở đầu. Trùng gốc với s01. |
| s05 | 1 | Có chọn một set cho ăn gia đình và báo preorder/giá; không có lỗi cần tiếp tục siết, câu còn nhiều tính từ/mã. |
| s06 | 1 | Hỏi phối áo/quần nâu; owner tự gọi ảnh không cần cho việc này rồi handoff. Lỗi lập tác vụ làm mất lời tư vấn, không phải thiếu thông tin khách. |
| s08 | 1 | Có lựa chọn Diệp An và lý do/so sánh; dài và nhiều tính từ nhưng có giá trị quyết định, tạm chấp nhận giọng. |
| s09 | 1 | Có trả lời giặt tay/máy theo nguồn; “gentle cycle/giúp em” gượng nhẹ, không ưu tiên sửa. Attempt cũ bị ngắt vẫn giữ riêng. |
| s10 | 1 | Đổi màu đơn đã đặt/chưa nhận: handoff EXCHANGE đúng phạm vi. |
| s12 | 1 | Hàng lỗi khóa váy: handoff DEFECT đúng phạm vi. |
| s14 | 1 | ACK khách muốn xem thêm, không ép mua. Dùng được. |
| s15 | 1 | Cảm ơn nhưng state+hai read làm request vượt cap; handoff không cần thiết cho nội dung khách nói. Lỗi nghiêm trọng cần ưu tiên hơn giọng. |
| j2 | 3 | Size riêng áo COMPONENT chưa hỗ trợ nên handoff; hai lượt sửa cân nặng/nhờ chọn sau đó NO_SEND. Ownership đúng, chức năng correction/fit chưa được thực thi ở đoạn sau. |
| j6 | 3 | Add giỏ/tổng/ảnh đúng; code hỏi tên, nhận COD rồi tiếp tục hỏi tên còn thiếu. Có tiến trình checkout, chưa chứng minh full order. |
| s01 | 1 | Báo giá Khánh Trang bị chặn vì ảnh quá hạn. Cùng gốc h02. |
| s02 | 1 | Báo áo lẻ 499k, chất liệu, size và hai ảnh; dùng được. Trước bị bound, lần này tới verifier/send. |
| s03 | 1 | Khách xin cận ren Ngọc Trâm; gate ảnh chung đã chặn do freshness. Không phục vụ được nhu cầu ảnh, không được kết luận shop không có ảnh ren. |
| s04 | 1 | Tự tạo “bản tiêu chuẩn” từ màu chưa ghi nhận; verifier chặn đúng. |
| s07 | 1 | Owner dùng chiều cao/cân nặng và fitScope đúng nhưng COMPONENT bị code từ chối. Không cần yêu cầu khách thêm ba vòng để chữa capability chưa có. |
| s11 | 1 | Bỏ constraint BE khi kết luận tồn đáp ứng khách; verifier chặn đúng. |
| s13 | 1 | Nhân đôi cùng áo theo hai parent set, không trả tổng ship; verifier chặn đúng. Context/identity cần rõ hơn. |
| s16 | 1 | Thiếu ảnh feedback cho phần áo; handoff thay vì tự gửi ảnh model. Phù hợp nguyên tắc owner. |
| j1 | 3 | Null màu làm add áo L bị chặn ngay; hai lượt nhiều size/tổng sau NO_SEND. Hồi quy đường thực thi, chưa kiểm được W2 trên model run mới. |
| j3 | 3 | Trả lời phối áo với quần nâu, tính dùng lại váy và tôn trọng khách chỉ mua áo; ba lượt được gửi. Có giá trị sales, hỏi size/giá hơi form. Lượt trước lỗi quota verifier, nên không quy cả cải thiện này cho code. |
| j4 | 3 | Add áo M chưa chọn tuple nên handoff; lượt thương lượng/tính ship không được xử lý. Không có dữ liệu để chấm năng lực thương lượng của run này. |
| j5 | 3 | Hỏi đơn cũ rồi tiếp tục trao đổi: handoff ORDER_STATUS và giữ HUMAN ownership đúng. Không tính là ba lỗi sales. |

## Hướng tiếp theo theo mức ảnh hưởng

1. **Hoàn thiện đầu vào có thể bán/gửi thật:** kiểm tra/publish/revalidate ảnh đang quá hạn/thiếu clock; xác nhận ánh xạ màu và canonical purchase options. Phân biệt thiếu thông tin khách với thiếu nguồn shop. Không dùng model để tạo dữ liệu nguồn hoặc sửa timestamp trong runner.
2. **Đóng capability size từng phần:** hoặc cung cấp adapter/chart có authority cho TOP/PANTS/SKIRT, hoặc công bố rõ unsupported và giữ ca đó làm handoff control. Không tiếp tục sửa prompt như thể COMPONENT đang hoạt động.
3. **Giảm tác vụ không giúp lượt hiện tại:** s15 và s06 là ca kiểm chứng. ACK không cần đọc hai sản phẩm; tư vấn phối đồ không mặc định cần ảnh. Đồng thời xác nhận cùng component AO dưới hai parent ở context do code chuẩn bị để bớt hỏi phân biệt/đọc trùng. Không thêm classifier câu khách hoặc case regex.
4. **Sửa nhánh khách đã muốn mua:** đi tới intake/checkout phù hợp thay vì hỏi lại có muốn chốt; chỉ hỏi thông tin thực sự còn thiếu. Giữ receipt/gate/mutation đã đạt.
5. **Chạy đúng phần có thể quan sát:** giữ một số ca handoff làm controls, nhưng không dùng các hành trình bị chặn từ lượt 1 để chứng minh correction, thương lượng hay nhiều mutation. Khi nguồn/capability ready mới chạy các hành trình bán hàng đó. Giọng hơi kém hiện tại tạm chấp nhận, không mở thêm vòng prompt polishing hàng loạt.

Chưa sửa code/prompt, chạy model, gọi provider hoặc ghi nguồn shop trong task review. Hai pure capture-clock analyses không phải live checks, source renewal hay effect replay. Lệnh offline đầu dùng bare workspace package alias bị ERR_MODULE_NOT_FOUND; sau khi dùng đường import dist có sẵn thì phân tích chạy được. Không có test suite mới được chạy hoặc khai PASS trong review này.
