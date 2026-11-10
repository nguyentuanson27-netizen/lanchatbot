# Finding sau primary review — 31 kết quả, không sửa để chạy lại

Source183ad77e; raw725c4765; primary389fa355. Primary đã đọc toàn hội thoại, nguồn public và actual terminal/state trước khi đọc các nháp/verdict bên dưới. Không đổi primary labels, prompt, config, corpus hoặc runtime sau kết quả. Không có lượt thay thế/retry.

## Năm fallback B1 có ba nguyên nhân khác nhau

| Ca | Đường thất bại quan sát được | Trách nhiệm chính |
| --- | --- | --- |
| 1 — đổi sang sân khấu/đèn mạnh | Owner có FINAL; verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION | Owner suy công năng/khuyết điểm từ dữ liệu thiếu; thiếu thông tin độ kín cho hoàn cảnh này |
| 6 — giá áo dài SD375 | Đã search/read được đúng mã và giá; generation cuối vẫn TOOLS trong NONE/tools[]; code BUDGET | Giao diện lựa chọn bán/policy và hành vi native final-only; verifier chưa được gọi |
| 9 — sân vườn, khách dễ nóng | Owner có FINAL; verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION | Owner biến mô tả chung thành bảo đảm cho khách/hoàn cảnh cụ thể |
| 11 — chân váy, POS thiếu | Đã có mô tả; owner tìm thêm mẫu, rồi trả tool call khi hết rounds; code BUDGET | Owner chọn thêm bước đọc không cần cho partial answer, cùng giới hạn native final-only |
| 15 — người quen đồ trơn cần quyết định mua | Generation2 HTTP200 nhưng adapter OWNER_COMPLETION, failureStage=COMPLETION, finishReason=UNKNOWN | Completion/provider-adapter contract; chưa có FINAL/verdict để đánh giá quyết định tư vấn |

### 1. Thiếu thông tin lớp lót không chứng minh dễ lộ

Khách đổi từ tiệc trong nhà sang sân khấu có đèn mạnh. Nháp bị chặn, không gửi:

> Áo làm từ tơ Hàn thêu có độ mỏng nhẹ và bay bổng, dưới ánh đèn sân khấu mạnh có thể dễ thấu hình do mô tả không ghi nhận lớp lót bên trong. Nếu ngại điểm này, chị có thể cân nhắc chọn mẫu khác kín đáo hơn cho sân khấu nhé ạ.

Nguồn chỉ mô tả tơ Hàn thêu, độ bay/thiết kế; không xác nhận độ xuyên sáng hoặc tình trạng lót. Cả câu lấy việc không ghi lớp lót làm lý do gán rủi ro thấu hình. Chặn có căn cứ theo ranh giới đã chốt; không phải thiếu một từ khóa hoặc đòi mọi nhận xét phối đồ phải có phép thử. Customer outcome vẫn không dùng được vì nhận static fallback, không nhận lời tư vấn trong phần có thể biết.

### 6. SD375 đã đọc được; model tìm policy từ một offer ref

Hai lượt tool đã làm: search_products(SD375) → read_product(SD375). Nguồn trả COMPOSITE1.065.000đ, còn hàng, availableOffers=[AO,COMPOSITE]. Tới request cuối:

```text
toolConfig.functionCallingConfig.mode = NONE
tools = []
trusted.execution.availableTools = []
roundsRemaining = 0
requestBytes = 13881 (<32768)
requestHash = 9fdd66925f91f89e06c3378c4bbc4a4c2980785084e52630c5e5efafe2ece03e
response: read_policy({ref:"offers:SD375"})
```

Call này không được thực thi. Không có FINAL hay verifier; code trả BUDGET/fallback đúng budget đã freeze. Không phải source chưa tìm ra mã hoặc request quá lớn. Trong cùng context, availableOffers còn xuất hiện dưới trusted.policy bằng literal offers:SD375; read_policy thật lại không nhận tham số ref. Đây là một điểm giao diện có thể góp phần làm owner coi offer evidence là policy cần đọc tiếp. Hành vi một mẫu không cô lập được nhân quả.

### 9. Thoáng nói chung khác bảo đảm không bí cho khách dễ nóng ở ngoài lâu

Nháp bị chặn, không gửi:

> Chị yên tâm nha, áo làm từ tơ Hàn thêu có chất vải mềm, thoáng và độ bay tự nhiên nên mặc thoải mái, không bị bí đâu ạ. Đi tiệc sân vườn vẫn rất dễ chịu và bay bổng.

Mô tả có vải mềm/thoáng/thoải mái, nên được dùng để tư vấn chung. Reply đã nâng thành không bị bí và vẫn rất dễ chịu cho người dễ nóng ở sân vườn lâu; nguồn không xác nhận kết quả trong điều kiện đó. Đây là chặn phần bảo đảm vượt dữ kiện, không phải chặn mọi lợi ích bán hàng hoặc buộc lặp điều kiện. Cần sửa cách owner đưa ra quyết định, không kết luận verifier phải cho qua cả đoạn.

### 11. Giá/tồn thiếu nhưng mô tả chân váy đã có

read_product(SV2447,M) trả mô tả áo/váy; price/stock UNAVAILABLE do POS_SNAPSHOT_UNAVAILABLE. Owner tiếp tục search chân váy Thạch Thảo; search trả AMBIGUOUS với các mẫu V406/V7840/V168, không xác định lại được phần chân váy đang hỏi. Request cuối đã NONE/tools[] nhưng vẫn trả read_product(SV2447); requestBytes20590, requestHash885569a0b159aa07ab68cdf8c66618c06da0ebd31be85973ddcb53228f039e7d.

Call cuối không được thực thi; không có FINAL/verifier. Thiếu POS là fault control preregistered, không phải lỗi phát sinh của nguồn thật. Model vẫn có thể trả chất/dáng váy từ mô tả đã đọc và giữ phần giá/tồn là chưa tra được, như ca3/19. Owner tìm thêm dữ liệu đã biết và final-only không giữ được đầu ra text đã làm mất partial answer này.

### 15. Lỗi completion đã nhìn thấy stage, vẫn chưa biết subtype gốc

Owner đã read_product đúng SV2447. Generation tiếp theo đã dispatch đúng model, HTTP200; adapter ghi COMPLETION/OWNER_COMPLETION và finishReason UNKNOWN. Không có completion FINAL/TOOLS được nhận, không có verifier. Input body16779bytes, dưới bound. Token usage vẫn giữ trong denominator.

Không có raw provider body/enum ngoài allowlist trong evidence để khẳng định chính xác nhà cung cấp kết thúc bằng subtype nào. Không gọi đây là câu tư vấn sai, safety refusal, timeout, hết token hoặc thiếu thông tin khi chưa có bằng chứng. Không gọi lại để lấy một câu đẹp hơn.

## Native final-only là vấn đề quan sát được, nguyên nhân chưa cô lập

Toàn bộ65owner dispatch có byte/hash telemetry khớp exact prepared body;25verifier binding khớp exact draft/trusted snapshot. Có9request ở NONE/tools[] (8B1,1stateful);2request B1 ở trên vẫn nhận TOOLS. Không thực thi cả hai call đó, không thêm vòng tool hay verifier.

Tài liệu [Vertex function calling](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) và [v1 FunctionCallingConfig](https://docs.cloud.google.com/vertex-ai/docs/reference/rpc/google.cloud.aiplatform.v1) mô tả NONE là tắt function calling. Evidence hiện hỗ trợ rằng client chuẩn bị/dispatch cùng bytes đã lưu, với continuation/signatures được giữ. Chưa có provider-side HTTP echo hoặc thử nghiệm cô lập để quy dứt khoát lỗi cho Google, API compatibility hay cách continuation được diễn giải. Không dùng việc fake-HTTP tests PASS làm kết luận API thật đã tuân.

## Ca7 được gửi nhưng cần sửa vì cách thuyết phục

Verifier PASS là đúng phạm vi: giá và nhận xét thiết kế có nguồn, không có quyền/effect hoặc kết quả kiểm nghiệm bịa. Primary vẫn NEEDS_EDIT: cả đoạn lặp ngôn ngữ mô tả catalog, mở bằng ngân sách rồi dùng nhiều lời khen, chưa giúp khách hình dung cách mặc gọn cho tiệc ban ngày. Không thêm nhiệm vụ chấm tự nhiên/bán hàng vào verifier.

Nguồn hiện có attributes=null và WEBSTORE_XML.description chứa nhiều lời quảng cáo. Reply lấy lại nhịp/cụm từ đó. Đây là bằng chứng liên hệ giữa input và cách viết; N1 không chứng minh đó là nguyên nhân duy nhất. Các ca3/19 cũng nói về hệ thống chưa cập nhật/hiển thị dù source chỉ chứng minh lần này chưa tra được giá/tồn. Các ca này vẫn giữ partial answer và được primary USABLE với hạn chế giọng.

## B2/B3: hành động đã đi được, checkout bị chặn bởi ETA

| Bước | Quan sát thực tế |
| --- | --- |
| 1 | Eo76/mông98 được lưu; giỏ áo SV2447/AO/be/M×1 được commit; reply xác nhận đúng và được capture |
| 2 | Cùng lượt đổi L và quantity2; cart revision3; reply đúng/capture |
| 3 | Trả978.100đ đúng code quote:998.000−49.900+30.000; không cần gọi quote_cart thêm vì current quote đã có |
| 4 | Profile sửa74/96/revision3; giỏ vẫnL×2; reply không đọc lại số đo/capture |
| 5 | PRIVATE_CODE_PATH,0owner/0verifier; PLANNER/CART_ETA_UNAVAILABLE; committed handoff, không có preview/purchase/capture text |
| 6 | CURRENT_AUTHORITY_CHANGED/NO_SEND,0generation sau handoff; không giả xác nhận mua |
| 7 | Journey riêng yêu cầu nhân viên: HANDOFF/CUSTOMER_REQUESTED_HUMAN được ghi đủ terminal; không có customer text/capture theo đường handoff hiện tại |

Ở bước5, source prerequisite đã được đo trực tiếp trong run này, thay vì suy từ fallback chung: CART_ETA_UNAVAILABLE. Bước6 phụ thuộc handoff trước đó; không phải một lỗi model thứ hai. Bước7 là requested handoff thành công trong khả năng candidate, không chứng minh nhân viên thật đã được thông báo/đã trả lời. Sales-cycle stage CART_OPEN không phải bằng chứng handoff thất bại: port handoff chuyển conversation ownership/event/tag, không bắt sales-cycle stage đổi thành HANDED_OFF. Không tạo external POS order.

Bốn reply giao dịch đầu dùng được, nhìn chung ngắn nhưng còn nhịp thông báo cập nhật/đã thêm. First cart ACK không nói PRE_ORDER; đây là điểm cần xem trên cả journey để khách biết tình trạng đặt trước trước khi xác nhận mua. ACK không hề khẳng định còn hàng/giao kịp nên không tự gọi đó là false PASS. Không sửa primary labels sau chẩn đoán để làm đẹp hoặc làm xấu con số.

## Hướng tiếp theo cụ thể; chưa thực hiện trong run này

1. Xử lý hợp đồng final-only trước: dùng chính request/hash và continuation đã lưu để xác định API/client nhận NONE thế nào; chỉ áp dụng đường gọi được tài liệu hỗ trợ. Giữ budget, không thực thi call ngoài lượt, không chuyển functionCall thành câu trả lời bằng parser hoặc mở retry/repair loop. Nếu cần model request chẩn đoán mới thì đăng ký riêng trước; không cộng vào run đã chốt.
2. Gỡ nhầm namespace trong context owner: availableOffers là dữ kiện lựa chọn bán đã đọc ở read_product, không phải một policy ref cần read_policy. Reuse các field sẵn có; verifier vẫn giữ evidence/binding gốc. Không thêm semantic router, schema/tool framework hoặc sửa args bằng regex.
3. Giữ kiểu quyết định tự tin nhưng không suy thiếu lót thành dễ lộ, hoặc mô tả thoáng thành cam kết không bí với khách cụ thể. Trình bày dữ kiện có nguồn gọn và đúng mức trước khi tiếp tục sửa câu chữ; không nhồi thêm ví dụ theo5case. Dữ kiện thiết kế đủ cho nhận xét phối đồ chung không cần phép thử riêng.
4. Bổ sung ETA có thẩm quyền cho đúng hàng đặt trước/region qua luồng nguồn được phép, rồi kiểm private checkout/confirmation. Không dùng default3–6ngày hoặc fixture để coi đã mua xong. Việc publish dữ liệu không thuộc request chạy model này.
5. Review giọng theo cả đoạn và quyết định giúp mua: giảm copy quảng cáo, giữ fact giải thích lựa chọn, không đọc lại ngân sách cho đủ ý; không thêm keyword penalty hay bắt CTA mọi tin. Không sửa verifier để chặn văn dài hoặc cứu điểm case7.

Recommendation: STOP sales/live acceptance; không tự fix/run vòng nữa. B1 tốt hơn ở giao dịch và lookup tên trong mẫu N1 này; chưa chứng minh ổn định. B2/B3 chứng minh tiến bộ state/cart/quote nhưng checkout mua thật của journey vẫn thiếu prerequisite.
