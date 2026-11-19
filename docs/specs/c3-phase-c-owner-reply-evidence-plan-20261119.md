# Phase C — ưu tiên dữ kiện khi owner trả lời, bản 2

Ngày 19/11/2026. Mốc triển khai `f82d308b2ea0ebe4ae6fe69713c04157405bce52`. Đây là kế hoạch sau rollback; hai lần sửa đã có bằng chứng riêng. Giả thuyết cần đo là việc tổng tiền, tình trạng bán và thẻ báo giá cùng xuất hiện trong owner request làm model chọn sai trọng tâm. [Review hai lần sửa](c3-phase-c-chat-priority-postmortem-20261119.md).

## 1. Đặt thay đổi ở đúng request

P06 và S15 đã sinh câu trả lời từ `TOOL_OR_REPLY`. S04 sinh ở `TERMINAL_HANDOFF_OR_REPLY`. Owner có thể trả lời từ cả hai. Áp dụng projection thuần cho **kết quả tool đã xác minh**, trong phần dựng owner view của adapter, trước khi request được serialize. Dùng cùng đường cho native `functionResponse` và dữ liệu `completedToolTurns`. Chọn theo loại kết quả và bằng chứng hiện hành, không dựa riêng vào `FINAL_REPLY`, `toolsAllowed` hay từ ngữ của khách.

- Thay đổi do code làm: ưu tiên kết quả tiền đã tính và đưa trạng thái bán đi cùng lựa chọn có bằng chứng. Owner đọc hội thoại và quyết định nói gì, có cần hỏi tiếp hay không.
- So sánh request để chứng minh tool schema/mode, ngân sách, call ID, phần model đã ký, nội dung khách và lịch sử shop bằng nhau. Các lượt chưa có kết quả thuộc phạm vi đi đúng đường cũ. Prompt hai nhánh giống nhau.
- Nguồn thẩm quyền vẫn là các payload nghiệp vụ gốc. Projection chỉ đọc. Verifier nhận exact draft và trusted snapshot gốc. Freshness, privacy, permission, receipt, media và Outbox tiếp tục kiểm ở các gate hiện hành.

## 2. Hai thay đổi hẹp

### A. Tổng tiền đã tính đi trước thẻ báo giá

- Khi `quote_product` trả total, chiếu `preCartQuote` thành kết quả tổng tiền dễ đọc bằng dữ liệu có cấu trúc. Tái dùng bằng chứng `PRE_CART_TOTAL_V1` hiện hành do quote tool cấp, khớp snapshot, recipient, binding, cart state, product, offer, quantity, phạm vi phí và nguồn/policy còn hiệu lực. Kết quả cũ trong trace chỉ được ưu tiên nếu khớp proof hiện tại. Giỏ đã đổi hoặc quote hết hạn thì dùng nhánh đọc/terminal hiện hành.
- Đưa tổng, có tính ship hay chưa và căn cứ phí lên đầu. Sau đó giữ giá hàng, phí từng phần, phạm vi vùng nếu đã xác nhận và loại ưu đãi. Phân biệt `QUOTED` với đã cấp từ receipt. P06 là một combo, tổng 1.019.000đ đã gồm 30.000đ theo nguồn hiện tại của ca, chưa có vùng giao cụ thể. Code không tự suy thêm nơi giao hay ngày đến.
- Lược `openingQuote.text` trong owner view khi đó là thẻ trùng của **cùng** product/offer và mọi dữ kiện dùng cho form đã có trong dữ liệu cấu trúc cùng phạm vi. Giữ thẻ khi thiếu proof, khác đối tượng, quote nhiều offer, hoặc thẻ có dữ liệu duy nhất. Field gốc vẫn dành cho kiểm nguồn và các consumer khác. J4 là ca hồi quy **chịu tác động** vì cũng có total, dù wire có thể không chứa thẻ trùng. Cần giữ 499.000đ cả ship, đúng cơ chế hỗ trợ và trạng thái thực tế.

### B. Màu đi cùng trạng thái bán đã xác minh

- Dùng `validSelectionEvidence` và đọc đúng metadata query. Khi Compact V2 gửi ref, phân giải đúng một evidence có content hash khớp trong runtime product, đề phòng trộn offer của mẫu trùng tên. Ràng buộc đúng product, offer, màu/size, quantity, thời điểm, completeness. Lần sinh live dùng đồng hồ kiểm nguồn tại lúc dựng request. Replay dùng timestamp thực của capture để đo đúng dữ liệu lịch sử.
- Tóm tắt theo màu khi các tuple trong phạm vi query đầy đủ và cho cùng trạng thái. Tồn khác theo size thì giữ theo size. Bằng chứng cho q=1 chỉ mô tả q=1. Evidence một phần, bị cắt, chưa ghi màu, hết hạn hoặc UNKNOWN không cấp một trạng thái chung. Danh sách màu hoặc mã sentinel không tự chứng minh tồn hay khả năng mua. Giữ phạm vi trên từng kết quả để model thấy đủ thông tin tư vấn.
- S04 và S15 dùng cùng logic, với áo lẻ SQ2447/AO và q=1 từ capture. **Ở S15 giữ nguyên thẻ `openingQuote.text` trong cả hai nhánh**. Vòng này đo riêng tác động của việc cho màu đi cùng trạng thái đã xác minh. Đối chiếu offline để chứng minh thẻ vẫn còn, kiểm xem candidate có tiếp nối màu be bằng bước hữu ích hay vẫn quay lại giá/size. Nếu S15 vẫn lạc trọng tâm, giữ kết quả và dừng tại gate. Việc lược thẻ trên `read_product` cần một đối chứng riêng, vì cùng tool phục vụ khách ADS hỏi giá.

[Quote proof và readback](../../apps/worker/src/single-agent-commerce-quote.ts#L114) · [Thẻ giá từ read_product](../../apps/worker/src/single-agent-commerce-read-only-tools.ts#L487) · [Compact V2 và ref](../../apps/worker/evals/single-agent-commerce-read-only/owner-product-tables.mjs#L137).

## 3. Preflight và kiểm định xác định

- So sánh hai wire từ chính capture P06, S04, S15 và J4. Khóa từng phase, case, turn, source SHA, prompt và model config. Ca đích và J4 phải thực sự đổi phần projection đã đăng ký. J2 và control ADS đã chọn phải giữ wire giống hệt theo hash. Cặp thiếu capture, thiếu proof hoặc diff lệch phạm vi phải dừng trước HTTP. Thu ngắn kết quả theo semantic scope, rồi kiểm giới hạn byte và signature hiện hành.
- TDD proof đúng/sai offer, quantity, region, recipient/binding, cart revision hoặc freshness. Assert total và thành phần tiền/nguyên tệ khớp proof, claim hỗ trợ có đúng mức thẩm quyền, metadata phù hợp. TDD màu từ evidence đầy đủ, mixed theo size, q=1/q=2, incomplete, stale, sentinel/UNKNOWN và hai parent khác nhau. Kiểm giữ ngữ cảnh để J2 dùng lại số đo đã sửa và kết quả M. Kiểm cả hai phase nêu ở §1 và đường final hiện có.
- Kiểm ingress thật trong fixture test qua cả `quote_product` và `read_product` khi form ADS có đủ evidence. So actual response group và ảnh phải đúng product ref, giữ tên/phần bán, giá, material/phom và size đã xác nhận theo phạm vi nguồn. Kiểm ADS có total và ADS hai offer, trường hợp first-contact chưa xác định, cùng egress/recovery chưa đủ ảnh. Fixture dùng owner được kịch bản hóa để exercise đúng path, Outbox test ghi nhóm thực. Kiểm verifier input/binding, state/receipt, PII, build, typecheck, lint và tập test sát phần sửa.

## 4. Sàng lọc đã chốt

- **9 cặp**. P06, S04, S15 mỗi ca hai lần với input cùng case đã khóa. J2/T2, J4/T3 và ADS mỗi ca một lần. P06/S04/S15/J4/J2 lấy exact final-producing owner capture của full 19/11 repetition 1. ADS lấy `c-context-opening` từ CONTROLS 15/11, có `firstContact:true,fromAd:true`, khớp proof và nguồn. Baseline và candidate dùng cùng prompt, Gemini 3.5 Flash Lite High và cấu hình generation đã đăng ký. Chấm mù bằng GPT‑6.1 Sol High trên dữ kiện đã xác minh, tin khách, lịch sử liên quan và hai draft đã đảo thứ tự. Seal schema/rubric, kết quả preflight và cả hash input trước provider.
- Trần **18 owner + 9 judge = 27 generation**, một call cho mỗi arm và một call chấm mỗi cặp đủ draft. Giữ lỗi provider, thiếu điểm, malformed và lệnh tool replay không thực thi trong mẫu số. Lời đáp replay chưa được cấp quyền gửi. Judge chữ chỉ chấm form/dữ kiện chữ của ADS.
- Chấm cả lượt. Câu chính đáp ngay việc khách cần chưa? Có bỏ điều kiện làm đổi lựa chọn mua không? Câu hỏi có ích ở bước này hay lặp việc đã hỏi? Với P06, tổng và phạm vi ship phải nằm ở câu trả lời chính. Với S04, phải phân biệt trắng sẵn và be đặt trước. Với S15, phải nói đúng trạng thái be và bước tiếp theo phù hợp với lời khách. Các tiêu chí ca cụ thể chỉ đi vào judge. Ngoặc, từ khóa và độ dài chỉ dùng khi đọc lại.
- **PASS** khi đủ 9/9 cặp và điểm, candidate thắng ít nhất 4/6 cặp đích và có ít nhất một cặp thắng ở mỗi ca đích. Cả sáu lượt candidate đích phải đủ dữ kiện quyết định và đúng phạm vi. Cả ba ca hồi quy đạt. J2 giữ kết quả engine và phần sửa. J4 giữ đúng total/ship/hỗ trợ và bước hỏi có ích. ADS giữ đúng form mặt chữ theo evidence đã cấp. Một lỗi fact, policy, receipt hoặc privacy của candidate là STOP. Thiếu lượt hay điểm cũng STOP; giữ tất cả kết quả, không retry. N=2 là sàng lọc, chưa kết luận độ ổn định.

## 5. Native sau khi sàng lọc qua

Chạy P06, S04, S15 mỗi ca một lượt, J2 và J4 đủ ba lượt, và một ADS báo giá từ lượt đầu. **6 ca / 10 lượt**, một lần mỗi ca. Soát actual terminal và toàn bộ hội thoại, đặc biệt quote, stock, size, hỗ trợ, thành phần ảnh đúng nguồn, quyền gửi và receipt. Hai đường ADS đã được kiểm xác định riêng ở §3. Nếu model chỉ chọn một trong hai, report ghi path thực sự đã chạy. Native dùng mẫu và nguồn còn hiệu lực đã seal, không ghép lại lịch sử shop giả vào giữa hành trình. Trần benchmark native 40 generation theo 3 owner + 1 verifier mỗi lượt, cùng accounting và quy tắc dừng hiện hành. Tổng replay và native tối đa 67 generation. Review native dùng actual tin Outbox test, kể cả handoff/no-send.

Dừng ở bản kế hoạch được review. Triển khai, preflight và phép đo thuộc lượt công việc sau. Kết luận Phase C STOP và lỗi tư vấn size P07 còn mở.
