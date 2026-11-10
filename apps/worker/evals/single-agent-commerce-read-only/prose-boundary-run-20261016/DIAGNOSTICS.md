# Chẩn đoán sau primary — catalog prose replay

Đọc nháp/verdict sau raw `74597c6d` và primary `b8586708`. [Sáu hội thoại thực nhận](CONVERSATIONS.md), [primary cả lượt](PRIMARY_REVIEW.md), [request/raw](b1/first/raw/requests.jsonl). Không đổi primary hoặc sửa source/prompt để cứu kết quả.

## Bốn fallback

**Ca cũ1 — sân khấu:** owner viết:

> Áo làm từ chất liệu tơ Hàn thêu mỏng nhẹ, bay bổng nên dưới ánh đèn sân khấu rọi mạnh sẽ dễ bị thấu quang và lộ bên trong chị ạ.
>
> Nếu mình lên sân khấu ánh sáng mạnh thì mẫu này chưa phải lựa chọn tối ưu, để em đổi sang mẫu khác kín đáo hơn cho chị nhé?

Verifier `FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447` có căn cứ: nguồn không xác nhận độ xuyên dưới đèn mạnh. Lần trước owner bảo đảm giải pháp áo lót; lần này suy thành khuyết điểm của món. Cùng lỗi lấy mô tả chung để khẳng định kết quả chưa biết, đổi chiều suy diễn chứ chưa sửa được ranh giới. Đề nghị đổi mẫu chưa kèm kết quả tìm món thay; không tính là đã thực hiện đổi hay có món giải quyết rủi ro.

**Ca cũ6 — SD375:** search_products → read_product không offerType → owner3 tiếp tục gọi read_product với offerType=AO, dù request cuối đã `NONE` và `tools=[]`. Tool cuối không được execute; runtime giữ `BUDGET` fallback. Không có final draft nên không gọi verifier, đúng mandatory-verifier boundary. HTTP200/finishSTOP không chứng minh generation đáp ứng final-only contract.

Trước khi hết budget, nguồn đã trả PRICE1.065.000đ/STOCK37 cho `offer:SD375:COMPOSITE` và choices AO/COMPOSITE. Call AO cho thấy owner có thể đang phân biệt giá áo với composite; chưa đủ căn cứ quy nó chỉ là “quên trả giá”. Owning issue cần xem là default-offer read/ý nghĩa offer mà khách hỏi và khả năng hoàn thành search→read→final trong budget hiện có, bên cạnh provider trả call dưới NONE. Không tính default COMPOSITE thành giá AO, không execute muộn hoặc tăng budget để cứu run. Nguyên nhân nội tại của provider chưa xác định từ body hash.

**Ca cũ9 — ngoài trời/dễ nóng:** owner viết:

> Chị yên tâm ạ, áo làm từ chất tơ Hàn thêu mềm mại, thoáng khí và có độ bay tự nhiên nên mặc khá dễ chịu. Dù ở ngoài trời khá lâu, chất vải nhẹ và thoáng này không gây bí bức nhiều, vẫn đảm bảo sự thoải mái cho chị nha.

Verifier cùng kind/ref như ca1; có căn cứ vì đoạn sau vẫn bảo đảm cảm giác mặc của khách ngoài trời lâu. “Thoáng” trong description chưa chứng minh kết quả ấy; giảm mức độ bằng “khá”/“không nhiều” không xóa ý bảo đảm. Không đề nghị nới verifier để cho qua.

**Ca cũ11 — chỉ chân váy, fault control:** sau read_product trả availableOffers=null và PRICE/STOCK unavailable, owner search “chân váy Thạch Thảo”; kết quả AMBIGUOUS có các váy khác. Nháp:

> Chân váy của set được làm từ chất liệu ren tơ Hàn mềm mại và nữ tính, có form nhẹ nhàng với độ rũ tự nhiên giúp tôn dáng và tạo chuyển động uyển chuyển.
>
> Mẫu này shop bán theo set nguyên bộ (gồm áo thêu và chân váy), hiện hệ thống chưa có sẵn thông tin giá cũng như tồn kho riêng cho chân váy lẻ hay size M nên em chưa báo chính xác cho chị ngay lúc này được ạ.

Verifier `FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447` có căn cứ: trong câu trả lời cho người muốn lấy riêng váy, “shop bán theo set nguyên bộ” hàm ý giới hạn lựa chọn bán chưa được nguồn xác nhận. Unavailable và AMBIGUOUS không chứng minh shop chỉ bán cả set. Phần chất/dáng đã có nguồn vẫn dùng được nhưng terminal bỏ hết vì có thêm mệnh đề sai. Đây là preregistered POS_UNAVAILABLE control, không phải nguồn thật mất giá/tồn và không được lấy offers ở ca LIVE khác bổ sung hộ context của ca này.

## Hai câu eligible vẫn cần sửa

- **Ca7:** giá đúng, nhận xét thẩm mỹ được phép; cả đoạn vẫn lặp ngân sách và dùng chuỗi lời khen thay việc gỡ phân vân ren nhiều. NEEDS_EDIT cùng tiêu chí trước; không fail vì một từ hoặc vì thiếu CTA.
- **Ca15:** đã thừa nhận món nhiều chi tiết, có hướng mua món lẻ phối đồ trơn và lần này verifier PASS. Đây là điểm tốt hơn. Nhưng khách nhờ quyết có nên lấy, reply lần lượt đưa nếu-ngại/nếu-cần-tiệc/rồi-chọn-một-món, để khách tự quyết áo hay váy. Cả đoạn dài và thiếu quyết định cụ thể. NEEDS_EDIT, không phủ nhận giá trị của hướng bán món lẻ. Draft khác lần trước, nên không chứng minh verifier đã ổn định hoặc verdict cũ là sai.

## Finding và hướng còn lại

So cùng sáu IDs với lượt trước:2USABLE/1NEEDS_EDIT/3fallback →0USABLE/2NEEDS_EDIT/4fallback. Ca6 và11 từ dùng được thành fallback; ca15 từ fallback thành eligible nhưng cần sửa; ca7 chưa cải thiện; ca1/9 vẫn bị chặn. N1, cả prompt lẫn projection đổi, không thể quy riêng nguyên nhân thụt lùi cho catalogDescriptions hoặc model alias.

Audit chứng minh14owner requests thực sự có catalogDescriptions tách riêng; tại5finals, nguyên văn/provenance catalog và typed facts khớp verifier context. Không có evidence dữ liệu bị mất trong bản sửa. Việc chuyển vị trí đã đúng về contract nhưng chưa giải quyết owner adherence; lặp thêm lệnh “tự nhiên” hoặc đổi tên field chưa có bằng chứng sẽ sửa được.

1. Xem owning offer/default contract của search/read và final-only wire, giữ subject/price scope và budget hiện tại; không vá tên SD375, execute call muộn hoặc retry.
2. Với phần source unavailable, giữ ranh giới không biết lựa chọn bán khác với chỉ bán set; bảo toàn partial answer từ mô tả. Không thêm regex nhận diện câu chốt, template riêng hay suy absence từ null.
3. Với tư vấn, tập trung quyết định mua/cách mặc và không tạo đặc tính khi tình huống đổi. Registry publication là dependency có thật, nhưng UNKNOWN opacity/lining không tự được giải quyết bằng publish; cần nguồn cho đúng thuộc tính quyết định. Chưa có thí nghiệm cô lập để nhận một prompt mới là root-cause fix.
4. Verifier hiện chặn ba nghĩa vượt căn cứ; chưa có finding cần nới trong lượt này. Giữ code/final gate, tách việc kiểm safety khỏi chấm usefulness/giọng.

Các hướng trên chỉ là finding sau run. Không patch hoặc chạy tiếp trong task này.18B1+7stateful heldNOT_RUN; sales/liveSTOP, source checkoutBLOCKED, A OWNER_BYPASS.
