# Findings và nguyên nhân sau một run31lượt

**Chưa đạt mục tiêu bán hàng/PhaseB.** Đã thu đủ31/31, N1, không retry hoặc thay lượt. Primary cả lượt: **15USABLE / 8NEEDS_EDIT / 1UNUSABLE / 7FALLBACK_OR_NO_SEND**. Một USABLE chỉ là ownership control, không phải mua hàng. Source `38beb4b0`, raw `4ea4a2d4` trước primary `10d47b05` trước trace diagnosis. [Toàn bộ hội thoại](CONVERSATIONS.md), [primary không dùng rejected draft](PRIMARY_REVIEW.md), [metrics](METRICS.json), [audit](AUDIT.json).

## 1. Lỗi quan trọng nhất: state sai và ACK vẫn PASS

Stateful4, khách: “eo74, mông96... vẫn lấy sizeL”. Model gửi lần đầu `WAIST_CM=74,HIPS_CM=76`; code commit profile revision3 và readback đúng **giá trị model gửi**, nhưng sai điều khách nói. Model nhận ra và gọi lần hai `HIPS_CM=96`; code trả `REJECTED/STALE_CUSTOMER_EVIDENCE`. Final vẫn nói đã ghi nhận số đo mới, giữ hai áo be/L; verifier PASS và exact reply được capture. State cuối vẫn **74/76**, không phải74/96. Đây là lỗi thực hiện thật, không phải tranh luận câu văn hay một trường dữ liệu đầu vào còn thiếu.

Owning boundaries:

- Owner trích sai giá trị từ tin mới, rồi báo thành công sau khi sửa bị từ chối.
- `single-agent-commerce-state.ts` gắn sourceEventHash/observedAt/confidence1 cho ops do model đề xuất. Schema/range/CAS/readback chứng minh đã ghi đúng proposal, không chứng minh proposal đúng nội dung khách. Đây là khoảng trống ở contract chấp nhận state.
- `mergeCustomerProfile` chỉ cho evidence mới hơn thắng; hai lần cùng message có cùng thời điểm/confidence/source nên lần sửa96 bị bỏ qua. Không được bỏ stale/CAS guard để sửa ca này.
- Nhánh `merged.ignoredFields` trả REJECTED mà không bật `blockedDependencies` hoặc xóa `committedUpdate`, nên receipt SUCCESS của lần đầu vẫn được đưa sang verifier. Khác với STATE_CONFLICT/STATE_READBACK_CHANGED, thất bại của ý định cập nhật mới không vô hiệu hóa lời ACK thành công.
- Verifier có cả latest74/96, trusted measurements74/76 và receipt CUSTOMER_STATE_UPDATED, nhưng vẫn PASS câu ACK chung chung. Vì state đã commit trước verifier, chỉ sửa verifier không giải quyết việc dữ liệu sai đã được ghi. PASS không chứng minh khách đã được xử lý đúng.

Hướng ưu tiên cho lần sửa kế tiếp: tái hiện exact chuỗi ghi sai→sửa bị reject→ACK; sửa contract accepted-state và propagation bằng existing evidence/readback/blockedDependencies, không thêm role/parser/repair loop. Proposal không đủ căn cứ từ chính tin khách không được trở thành customer truth; rejection của phần còn cần sửa không được kế thừa receipt cũ để báo đã xong. Cách bind giá trị với tin nguồn cần được thiết kế và review riêng; run này không tự thêm regex, parser, proof type hoặc confirmation flow để cứu kết quả.

## 2. Hai fallback mua hàng do thiếu màu và vượt budget

Stateful1/2 đều đọc sản phẩm trước, sau đó `add_to_cart` bỏ màuBE dù khách đã cho từ đầu. Tool trả `UNAVAILABLE/SELECTION_UNAVAILABLE`. Đến generation3, owner mới thêm BE, nhưng request lúc đó là final-only `NONE`, `tools=[]`; provider vẫn trả native call. Runtime chặn BUDGET, không thực thi call vượt giới hạn. Hai lượt đầu không có giỏ. Tới lượt hỏi tiền mới tạo được be/L×2 và quote978.100đ; không được dùng kết quả muộn đó để tính hai lượt đầu đã thành công.

Sáu final-only requests, hai vi phạm native-tool mode; max owner wire31.427/32.768bytes, không có bound rejection. Không được quy lỗi này cho hết context hoặc sửa REST theo phỏng đoán: nguyên nhân provider không tôn trọng NONE vẫn UNKNOWN. Hướng tiếp theo là contract dùng đủ lựa chọn đã có ngay lần effect đầu và không tiêu vòng vào việc đọc thừa; không tăng budget, thêm router hoặc retry. Chỉ sửa transport khi có causal reproduction riêng, không dựa vào một run.

## 3. Ba B1 fallback có nguyên nhân khác nhau

| Ca | Quan sát từ trace | Đánh giá |
| --- | --- | --- |
| B1 1, sân khấu | Nháp khẳng định áo dễ thấu quang/lộ dưới đèn mạnh và lớp trong giúp hoàn toàn yên tâm; nguồn chỉ có vật liệu/mô tả, không có độ che phủ/kiểm tra sân khấu. | Verifier chặn đúng phần vượt căn cứ. Không nới để cho qua một kết quả kiểm chứng thực tế chưa có. |
| B1 15, Khánh Trang | Search không trúng đúng mẫu; owner kết luận shop không có sản phẩm đó. | Không tìm thấy qua semantic search không chứng minh không tồn tại. Verifier chặn đúng; owner cần nói đúng mức tìm kiếm, rồi xin mã/ảnh khi cần. |
| B1 18, policy ngày9 | `read_policy` đã OK; lần owner tiếp nhận HTTP200 nhưng finishReason UNKNOWN, chỉ có thinking tokens; adapter trả OWNER_FINISH_REASON và fail-closed. | Completion/provider-protocol failure, không phải bot hiểu sai policy hoặc thiếu context. Giữ denominator và không retry, không đổi parser để coi UNKNOWN là STOP. |

## 4. Giọng và quyết định bán hàng vẫn chưa ổn

B1 3/4/6/17 vẫn dùng nhiều tính từ từ description và lời trấn an/khẳng định mạnh thay cho lời giải thích gắn với lựa chọn thực tế. B1 6 còn lộ enum `SET_VAY`, rồi trả việc chọn lại cho khách. Nguồn là mô tả bán hàng dài; owner vẫn dễ lấy nó làm câu trả lời, dù prompt đã yêu cầu dùng dữ kiện để tư vấn. Đây là một giả thuyết về nguồn ảnh hưởng, chưa phải chứng minh nhân quả.

Ba ca cố ý làm POS unavailable vẫn giữ được thông tin chất liệu và không bịa giá/tồn: boundary hoạt động. Tuy vậy cả ba nói về hệ thống/kết nối; một ca xin số đo để xử lý vấn đề thiếu giá/tồn, là bước tiếp theo sai nguyên nhân. Đây là lỗi cách tiếp tục cuộc mua của owner, không phải cần thêm số đo để nguồn giá hoạt động. Không được xóa partial-source controls hoặc bịa khả năng handoff/kiểm tra để làm câu mượt hơn.

Không áp đáp án bắt buộc chọn áo lẻ hoặc cấm upsell: B1 23 khuyên lấy cả bộ799k, vẫn trong850k, tách áo phối lại váy đen sẵn có; primary chấp nhận vì hợp mục tiêu mua/mặc lại. Không đánh lỗi mọi lần nhắc giá/ngân sách hoặc một gạch đầu dòng. Chính sách hiện tại15ngày/30k và HOLD_UP_ONLY được trả đúng ở các ca được gửi; không phạt thiếu một từ điều kiện trong câu chỉ hỏi thời hạn/phí.

## 5. Disclosure/checkout và phạm vi đo

Current complete selection là PRE_ORDER/stock0. Khi giỏ được mở ở lượt3, cả owner và verifier có selected stock fact, nhưng hai reply quote/correction vẫn không báo hàng đặt trước. Prompt mới chưa chứng minh giải quyết được hành vi đó. Code-owned preorder preview đã có tests, nhưng run này không tới preview để đo.

Private checkout gặp **PLANNER/CART_ETA_REGION_UNRESOLVED**, ownership chuyển người xử lý theo default silent rule, không có tin capture; confirm sau đó NO_SEND/CURRENT_AUTHORITY_CHANGED với0model. Nguồn shipping_eta có thời gian theo vùng nhưng còn thiếu contract địa chỉ→key. Không phải thiếu mọi dữ liệu giao hàng; không đoán vùng hoặc publish nguồn. Configured holding reply chỉ được chứng minh ở controls COD25/25+bank25/25 trước run; matrix thực tế không được sửa để kích hoạt nhánh đó.

## 6. Kết luận và thứ tự xử lý đề xuất

1. Ưu tiên lỗi state/receipt/ACK ở mục1; không tiếp tục thử giọng bằng prompt trong khi acceptance contract có thể ghi sai số đo.
2. Dùng exact first-effect failures để xem owner nhận lại lựa chọn/argument contract ra sao; giữ native integrity và các giới hạn, không đổi API/budget theo suy đoán.
3. Sau đó xử lý trình bày facts và câu trả lời theo công việc mua của khách: giữ dữ kiện nguyên vẹn, tách nội dung mô tả khỏi lời shop, tránh ép bố cục/số câu hoặc thêm ví dụ theo case. Đây là hướng cần review, chưa triển khai hoặc đo hiệu quả ở run này.
4. Address-region authority vẫn là dependency riêng cần nối đúng nguồn; không dùng model hay một bảng tự đoán làm authority.

**STOP sales/live acceptance; source checkout BLOCKED.** A OWNER_BYPASS. Không đủ cơ sở nói hệ thống ổn định hay thay đổi prompt đã cải thiện. Không patch/rerun sau kết quả, không publication, merge/deploy/live send hoặc PhaseC. Primary chủ quan/non-independent; đây không phải human acceptance hay A qualification.
