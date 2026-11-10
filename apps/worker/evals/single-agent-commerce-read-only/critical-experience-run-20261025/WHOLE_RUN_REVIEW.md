# Review toàn bộ critical-experience run — 25/10/2026

Review head19eb7fce, runtime e7e0fbf8, native run776bdf61 và controls3a3d2b0c. Đã đọc14outcomes, draft/wire, tool calls, committed public state, capture và17controls; đối chiếu rerun14 trước. Không gọi model hoặc sửa runtime/prompt trong review này. Tiêu chí là khách có được giải quyết việc đang mua hay không, không chấm theo việc xuất hiện đủ từ khóa.

## Kết luận

Phần thay đổi giỏ, ghi nhận sửa số đo và nhận/xác nhận yêu cầu mua đã chạy được trong hành trình test này. Các điểm làm cuộc bán hàng dừng vẫn là discovery/source binding, suy sai khi nguồn thiếu và verifier hết hạn mức. Không có bằng chứng ở run này để nới verifier vì cho rằng nó chặn quá tay. Giọng chưa hay được tạm chấp nhận theo owner.

Không quy5eligible thành5ca bán hàng tốt hoặc4fallback thành4lỗi owner. Bốn fallback thuộc harness B1 không gửi/capture qua persisted ingress; hành trình stateful/openings dùng ingress và capture thực. Đây là hai bề mặt kiểm tra khác nhau.

## Review14lượt theo việc khách cần

| Lượt | Đánh giá whole-turn | Kết luận |
| --- | --- | --- |
| b1-partial-source-v2 | Khách muốn mua riêng chân váy, hỏi chất/dáng và giá/tồn M. Owner trả được chất/dáng, rồi tự suy “bán nguyên set” và kéo sang mua cả bộ. Nguồn chỉ nói offers không tra được. Lời bán thêm này dựa trên điều không biết và lệch yêu cầu khách. Verifier chặn đúng; terminal B1 lại mất cả phần mô tả đã biết. | Lỗi owner về ý nghĩa nguồn + recovery chưa hữu ích trên B1. Cần sửa, không sửa verifier để cho qua. |
| b1-price-v2 | Draft799k cả bộ và sizeS/M/L/XL khớp PRICE và sizeAvailability.confirmedInStockSizes của SET_VAY. Trả đúng điều khách hỏi, giọng dùng được. Verifier không có verdict vì429. | Draft có căn cứ; trải nghiệm B1 không đạt vì quota, không gán lỗi owner. |
| b1-component-stock-v2 | Draft449k/chân váy M còn hàng khớp PRICE và STOCK của CV, requestedSize=M. Không nói thêm cả bộ hoặc hỏi lại. | Draft dùng được; bị quota verifier. |
| b1-changed-occasion-v3 | Chọn áo lẻ499k, giải thích áo đi làm còn chân váy ren hợp tiệc hơn. Đây là quyết định bán hàng rõ, không chỉ đọc thông tin. Hơi dài và lặp “gọn gàng” nhưng tạm dùng được. | Không cần style rewrite. Verifier429 nên chưa gửi/không có semantic verdict. |
| sales-discovery-advice:need | Owner có FINAL, verifierPASS; khách thực nhận holding vì final gate STALE. Draft chọn Uyển Hoa799k/lưng chun, nhưng đó là bộ quần short. Chưa biết dress code của khách, không nên coi short chắc chắn sai; tuy vậy câu “rất hợp mặc đi làm” không thể hiện đã xử lý khác biệt này. | Lỗi ngắt luồng nằm ở source binding. Chất lượng chọn mẫu còn yếu, không chỉ do giọng; chưa chấm draft như câu đã gửi. |
| sales-product-gallery:overview | Khách xin ảnh màu be; shop gửi2ảnh và nói rõ là ảnh chung. Không giả rằng đó là đúng màu. | Chấp nhận như đã chốt; chưa đáp trọn ảnh màu, không mở vòng sửa riêng. |
| stateful-open | Cart nhận đúng áo lẻ/be/M, lưu số đo. Model draft bị STALE, code recovery xác nhận món/529k/hàng đặt trước từ receipt/current sources. Khách vẫn biết shop đã nhận lựa chọn. | Luồng mua tiếp tục được; code recovery có giá trị. Đây không phải model PASS. |
| stateful-variant-quantity | Đổi L và quantity2 đúng state/receipt; tổng978.100đ đúng998.000−49.900+30.000. Reply xác nhận đúng thao tác, không invent thêm ưu đãi. | Dùng được. Ngoặc/cách nói hơi báo cáo là minor. |
| stateful-quote | Khách chỉ hỏi tổng; trả978.100đ có ship/ưu đãi. Không tự tính khác hoặc xin lại dữ kiện. | Dùng được, không cần sửa. |
| stateful-correction | Ghi eo74/mông96/profile revision3, giữ2áo beL. Reply xác nhận giữ lựa chọn, không đọc lại3vòng, không suy SIZE_FIT. | Đúng chức năng và ngữ cảnh ở lượt này; N1 không chứng minh đã hết biến thiên. |
| stateful-request-checkout | confirm_purchase được gọi, code gửi “Chị cho em tên người nhận nhé.”; terminalNO_SEND chỉ ngăn thêm model reply. `[NAME]` trong báo cáo là analytics redaction. | Có bước tiếp theo thực hiện được, không phải im lặng hoặc bot nói placeholder. |
| stateful-private-checkout | Form synthetic gửi chung đủ4trường sau câu hỏi tên; code gửi preview2áo/be/L/tổng978.100đ/COD/ETA8–14ngày. Không gọi model trên private input. | Qua nhánh form đầy đủ. Lần provider này chưa kiểm khách trả từng trường riêng; chỉ có regression store-mock từ implementation. |
| stateful-confirm | Code commit PURCHASE_CONFIRMED và gửi acknowledgement/handoff. Không nói đã tạo đơn POS hoặc đã thanh toán. | Qua phần nhận/xác nhận yêu cầu trong candidate; chưa chứng minh đơn POS đã được tạo hoặc có người thật tiếp nhận. |
| stateful-human-request | Khách muốn gặp người, luồng commit bàn giao/tag-outbox trong DB test rồi gửi báo đã chuyển. | Handoff đúng mục đích, không tính là fallback lỗi; không claim tag đã thực thi trên production. |

## Finding/root cause cần ưu tiên

### 1. Snapshot refresh làm mất một câu tư vấn đã đi qua verifier

Discovery và stateful-open cùng bị STALE. [So sánh snapshot](SNAPSHOT_DIAGNOSTICS.json) cho thấy các claims đã align theo type/scope/value/authorization, policy text, mô tả sản phẩm, subjects và receipts không đổi. POS observation/version và identity dẫn xuất đổi. Không phải giá799k bị thay thành giá khác; so array theo index sẽ nhầm reorder với đổi dữ kiện.

`buildReadOnlyContext` hash toàn bộ products/claims/policies; `finalGate` yêu cầu trusted snapshot identity giữ nguyên. Gate làm đúng hợp đồng hiện tại. Vấn đề nằm ở cách nguồn và binding biểu diễn một bản refresh có cùng dữ kiện, không phải câu tư vấn cần thêm lời dè dặt.

Hướng xử lý: chốt hợp đồng source observation/business revision và việc giữ nguồn nhất quán trong một turn; tái hiện refresh bằng test deterministic trước khi sửa. Test phải phân biệt refresh giữ giá trị với đổi giá/tồn/subject/permission/recipient hoặc hết freshness. Không bỏ timestamp khỏi hash rồi tự cho PASS cũ authorize snapshot mới, không thêm repair/reverify loop. Giữ gate hiện hành cho tới khi hợp đồng mới được chốt.

### 2. “Chưa biết shop bán gì” bị biến thành “shop chỉ bán cả bộ”

Owner đã được cấp rõ availability.offers=UNAVAILABLE/SOURCE_UNAVAILABLE, availableOffers chưa biết; mô tả vẫn có riêng áo/chân váy. Prompt hiện tại đã nói availableOffers thiếu/null là chưa biết. Vì thế đây không đơn giản là thiếu thêm một câu trong prompt hoặc cần thêm kiến thức chất liệu.

Lỗi xảy ra ở generation2 khi vẫn còn quyền tool; nhánh text-only final mới chưa áp dụng. Không có căn cứ quy regression này cho projection cuối. Rerun trước cũng nguồn thiếu nhưng trả lời đúng phạm vi; hành vi owner chưa ổn định.

Hướng xử lý: giữ phân biệt `không lấy được nguồn`, `nguồn xác nhận không có`, `nguồn chưa đọc`; không diễn giải list rỗng/null thành không bán. Giữ verifier chặn claim sai. Kiểm recovery/handoff ở đúng ingress trước khi thêm prompt hoặc vá ví dụ. Nếu chưa có giá/tồn, tuyệt đối không dùng lý do đó để ép khách mua cấu hình khác.

### 3. Recovery trên B1 khác recovery của luồng B đầy đủ

Bốn fallback nằm ở `run.mjs` gọi `runCommerceTurn` với read tools. Nhánh này không có persisted handoff port như `runPersistedCommerceIngress`; vì vậy terminal chung không chứng minh nhánh B đầy đủ cũng sẽ gửi đúng câu đó. Ingress đã có map PROVIDER_ERROR→DEPENDENCY_FAILURE và FAIL→RESPONSE_UNAVAILABLE, có policy rule mới commit handoff; không có quyền tự mặc định người sẽ xử lý.

Hướng xử lý: dùng lại chính các ca hiện có qua ingress/capture để xác minh lỗi dependency/semantic sẽ kết thúc bằng gì; deterministic fault injection đủ kiểm nhánh code, không cần model thêm lần chỉ để tạo429. Kiểm cả phần đã xác minh, handoff commit và lời hẹn thực hiện được. Không kết luận “chưa nối handoff” từ B1 và không thêm framework recovery thứ hai.

### 4. Quota và độ trễ là vấn đề vận hành, không sửa bằng prompt

Ba verifier429 có mãusage_limit_reached; một controls transport error không cóHTTP. Không nhập chúng thành một loại hoặc coi verifierreject. Ba draft B1 khớp dữ liệu đã kiểm, nhưng chỉ native verdict thiếu nên chưa thể cho gửi hoặc ghi PASS.

Harness elapsed: quote35,8s, correction41,1s, variant52,2s, gallery51,8s, discovery69,2s, open74,1s. Đây là thời gian harness gồm DB/source/capture, không phải production SLA. Tổng thời gian owner mỗi ca chỉ khoảng5–16s ở các ca trên; verifier khoảng10–28s, readback thêm vài giây, còn I/O/commit/delivery. Muốn giảm đợi cần đo theo chặng, không mặc định đổi model hoặc cắt prompt.

## Verifier và17controls

8unsafe bị chặn đúng phạm vi ảnh/absence/component/feedback;7safe được cho qua,1safe transport error nên controlsFAIL. Một probe được PASS nhưng không phải ca unsafe đã gắn nhãn. Không quan sát semantic false rejection trên7safe có kết quả, nhưng N nhỏ và đều xoay quanh media. Không có cơ sở kết luận verifier quá cứng từ run này.

17controls không bao phủ policy, correction-fit, whole-reply advice hay toàn bộ8+family A2. Không dùng zero observed trên8unsafe media làm bằng chứng safety cho toànB. Ca partial-source còn cho thấy cùng lỗi “không tra được→không có” có thể tái xuất ở loại dữ liệu khác.

17controls chiếm17/27requests verifier của hai phần; prompt verifier/media không đổi, còn lỗi cần kiểm chính là source/final-tool turn. Lần chạy sau cần chọn controls theo thay đổi và mục tiêu trước dispatch, giữ đại diện safety cần thiết; không tăng/nhân lặp mặc định hoặc bỏ kết quả lỗi sau khi chạy. Cũng nên chốt ngay từ đầu diagnostic hay qualification, tránh STOP controls rồi phải lập diagnostic riêng. Kết quả lần này vẫn giữ nguyên FAIL, không được hợp thức hóa lại.

## Những gì chưa thể kết luận

- Hết OWNER_TOOL_MODE lần này chưa chứng minh chỉ nhờ projection mới. Trước: search → state+readSQ629 → late readSQ748 bị chặn. Lần này: search+state → readSQ629+readSQ748 → FINAL. Owner đã gom khác ngay trước lượt cuối; đây là yếu tố gây nhiễu, và chưa quan sát ổn định.
- Quần short Uyển Hoa được chọn cho đi làm là điểm cần theo dõi ở relevance/context, không đủ căn cứ phán mọi quần short đều sai. Trong candidate search, SQ629 cũng short/resort, V406 là váy. Không có nhiều ứng viên công sở đúng nhu cầu; tăng chất lượng retrieval/metadata có ích hơn thêm tính từ thuyết phục. Prompt không thể biến ứng viên sai loại thành hàng phù hợp.
- Tổng5eligible/4fallback/3handoff/2NO_SEND không phải điểm chất lượng hoặc conversion. Có cả setup, B1 eligibility, private code message và handoff nghiệp vụ.
- Checkout đã đến acknowledgement/handoff trong test, không phải đã tạo đơn/bán thành công ngoài thực tế. Run không đi qua tất cả51ca PhaseB;17controls cũng không phải fullA2/A3.
- Không có lý do trong run này để rollback toàn bộ, nới verifier, viết lại giọng hoặc thêm prompt riêng từng ca. Cần xử lý source consistency và terminal recovery trước; giữ các điểm minor theo owner.

## Sửa cách hiển thị evidence trong lần review này

Report trước nói câu hỏi tên đã được phục hồi nhưng Markdown vẫn hiện `[NAME]`. Raw terminal text=null vì code đã gửi; không được gọi đây là text lấy từ terminal. Review xác minh câu code-owned ở `realtime-sales-cycle.ts`1473: “Chị cho em tên người nhận nhé.” có SHA256 `d04585b28fb64c62250f917950ddf3293a2436ec31506184cbab99bd9f532125`, đúng accepted capture sequence0. Chỉ sửa public display/derived evidence, giữ masked capture và raw files nguyên trạng; không phục hồi tên/điện thoại/địa chỉ riêng tư.

Kết luận: **B chưa GO**. Ưu tiên1 source consistency, ưu tiên2 ý nghĩa nguồn thiếu và recovery đúng ingress, rồi mới xác nhận lại các ca mất verifier khi quota sẵn sàng. Giữ minor voice/gallery, không tự chạy model hay sửa code trong review này.
