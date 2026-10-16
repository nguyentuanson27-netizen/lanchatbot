# Chẩn đoán sau primary review — sáu ca ưu tiên

Đọc nháp/verdict sau raw commit `8529fe9937060967a95e1a6b9bbadcd7ae0184e3` và primary commit `acdd8491f29a142961547bda4d649511d1c76d7b`. Không đổi nhãn primary, không sửa prompt/code hoặc gọi lại model sau kết quả. [Hội thoại khách thực nhận](CONVERSATIONS.md), [nhãn và lý do cả lượt](PRIMARY_REVIEW.md), [raw requests](b1/first/raw/requests.jsonl).

## Ba fallback, từng nguyên nhân

### Ca cũ 1 — đổi sang sân khấu (`b1-changed-occasion`)

Khách chuyển từ tiệc trong nhà sang đèn sân khấu mạnh, hỏi áo có lộ bên trong không và sẵn sàng đổi mẫu. Nháp:

> Áo làm từ chất liệu tơ Hàn thêu nhẹ nhàng, bay bổng nhưng thông tin mô tả không nêu rõ có lớp lót trong hay không. Dưới ánh đèn sân khấu mạnh, để hoàn toàn yên tâm và chỉn chu, chị có thể mặc kèm một chiếc áo hai dây/lót màu nude bên trong nhé ạ.

Verifier trả `FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447`. Có căn cứ để từ chối: đoạn đầu thừa nhận chưa biết lớp lót nhưng đoạn sau đưa áo nude như cách để **hoàn toàn yên tâm** ngay trong điều kiện ánh sáng khách lo. Tư vấn phối áo lót nói chung được phép; lời giải quyết rủi ro độ kín cụ thể chưa có nguồn. Không quy lỗi cho riêng chữ “nude” hoặc bắt mọi gợi ý phối đồ phải có phép thử.

Owner vẫn chưa tách việc giúp chọn mua khỏi bảo đảm một công năng chưa biết. Mô tả hiện có không có opacity/lining; dữ liệu registry chưa publish cũng ghi UNKNOWN nên đồng bộ index không tự giải quyết câu hỏi này. Cần giữ ranh giới giữa gợi cách phối và bảo đảm đã giải quyết rủi ro, đồng thời đưa quyết định mua hữu ích trong khả năng hiện tại. Không sửa bằng regex, thêm câu đáp mẫu hay nới verifier cho lời bảo đảm này.

### Ca cũ 9 — tiệc ngoài trời, khách dễ nóng (`b1-changed-occasion-v2`)

Nháp:

> Dạ chị yên tâm ạ, áo làm từ tơ Hàn thêu có chất vải mềm, thoáng và độ bay tự nhiên, kết hợp chân váy ren tơ Hàn nhẹ nhàng nên mặc rất thoải mái, không bị bí nóng khi chị ở ngoài trời lâu đâu ạ.

Verifier trả cùng kind/ref như ca 1. Từ chối có căn cứ: mô tả “mềm, thoáng” không chứng minh khách dễ nóng sẽ **không bị bí nóng khi ở ngoài trời lâu**. Owner đã có vật liệu và mô tả nhưng mở rộng thành kết quả mặc của người này trong hoàn cảnh mới. Registry có breathability PRESENT cũng không tự cấp lời bảo đảm đó. Đây là lỗi owner còn lặp lại; không phải lỗi transport hay chỉ thiếu một field.

### Ca cũ 15 — quen đồ trơn, lo quá điệu (`b1-buying-concern-v2`)

Nháp:

> Set Thạch Thảo không quá điệu đâu chị nhé. Thiết kế này kết hợp áo tơ Hàn thêu hoa nổi tinh tế cùng chân váy ren mềm form nhẹ nhàng, tổng thể rất thanh lịch, sang trọng và không bị rườm rà. Mặc đi ăn cưới ban ngày vừa nổi bật, nhã nhặn lại rất có gu, hoàn toàn phù hợp với người thích sự tối giản nhưng vẫn muốn có điểm nhấn tinh tế ạ.

Verifier trả `FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SV2447`; schema không trả đoạn vi phạm hay giải thích. Không đủ evidence để khẳng định chính xác vì sao model từ chối:

- Nhận xét thanh lịch, đi tiệc hợp hoặc chọn cho người thích đồ trơn thuộc tư vấn thẩm mỹ đã được phép; không được coi một mình những nhận xét này là công năng mới.
- Nháp thêm chi tiết **hoa nổi** trong khi mô tả chỉ xác nhận **họa tiết thêu nổi**. Không có ảnh hay nguồn xác nhận mô-típ hoa trong request. Đây là chi tiết cụ thể vượt bản mô tả, có thể là căn cứ hợp lệ; chưa chứng minh đây là lý do thực của verifier.
- Việc nói “hoàn toàn phù hợp với người thích sự tối giản” thay vì xử lý phân vân vẫn là chất lượng bán hàng yếu. Điều đó không tự là một vi phạm protected semantics.

Vì vậy ghi riêng hai điều: owner vẫn viết như quảng cáo; verdict có phạm vi chưa xác định, có khả năng chặn cả nhận xét thẩm mỹ. Không kết luận chắc đây là false rejection, không dùng nó để nới chung verifier, không chấm nháp như câu khách đã nhận. Lượt trước ca này lỗi completion HTTP200; lượt này có final hợp lệ rồi bị semantic FAIL: đã đổi đường lỗi, chưa đạt mục tiêu tư vấn.

## Ba câu được cho qua cũng được review

| Ca cũ | Primary | Nhận xét cả lượt |
| --- | --- | --- |
| 6 — giá SD375 | USABLE | Trả đúng 1.065.000đ từ COMPOSITE, gọn và đủ. Owner dùng hết ba generations theo budget rồi trả final dưới NONE/tools[], không gọi tool thêm. |
| 7 — ren có rườm rà không | NEEDS_EDIT | Giá 799k đúng nhưng vẫn liệt kê lời khen bay bổng/thanh thoát/tinh tế/sang trọng và lặp ngân sách. Thiếu lựa chọn hoặc cách phối cụ thể để gỡ phân vân. Đánh giá cả đoạn, không rớt chỉ vì một từ hoặc đòi kiểm nghiệm cho thẩm mỹ. |
| 11 — chỉ chân váy, POS control unavailable | USABLE, còn yếu về giọng | Giữ phần chất/dáng đã có nguồn và không bịa giá/tồn M. Giọng catalog và nói về hệ thống vẫn kém; cùng ngưỡng primary cũ, chưa loại cả lượt chỉ vì phần giọng. Đây là source fault control đăng ký trước, không phải bằng chứng POS thật mất dữ liệu. |

## Điều đã sửa và điều chưa chứng minh

So cùng sáu case ID với lượt trước: ca 6/11 từ BUDGET fallback thành câu dùng được; ca 7 vẫn NEEDS_EDIT; ca 1/9 vẫn FAIL fallback; ca 15 từ completion error thành semantic FAIL fallback. Sáu ca cũ có 0 USABLE/1 NEEDS_EDIT/5 fallback, nay 2/1/3. Chỉ N1, đổi cả presentation lẫn lời hướng dẫn owner; không thể quy riêng cải thiện cho offers projection, tuyên bố ổn định hoặc so số này với tỷ lệ full24 cũ.

- Projection đã được chứng minh bằng RED→GREEN/captured requests: offers nằm theo product, non-offer literals còn nguyên; availability giữ status/reason; original verifier evidence/binding không bị sửa. Cả sáu lần đều có final và verifier. Lượt này không có budget/parser/HTTP/timeout error.
- Một request final-only được đo, không trả tool ngoài phép. Chưa chứng minh nguyên nhân hai lần vi phạm NONE ở lượt trước đã hết hoặc chia nhỏ được nguyên nhân completion cũ. Các bounded diagnostics mới chưa gặp failure thật trong lượt này.
- Owner vẫn chuyển dữ liệu quảng cáo thành lời trấn an, thay việc xử lý quyết định mua bằng đoạn khen. Prompt đã nói rõ không làm vậy nhưng adherence chưa đạt. Presentation/source có thể góp phần; chưa có thí nghiệm cô lập chứng minh nguyên nhân đầy đủ.
- Registry→index là gap hiện tại đã đọc được: registry có material/style/design/wear values, nhưng 11 payload points được trả về không có product_attributes. Không có code candidate làm rơi một giá trị đã nhận. Reuse publisher hiện tại để đồng bộ sau khi nguồn/bản publish được duyệt; không bơm snapshot registry vào run đang đo hoặc parse XML thành facts.
- ETA có số liệu prep5–8 và MIEN-NAM transit3–6. Thiếu mapping có thẩm quyền giữa địa chỉ TP.HCM và region key shop mà resolver hiện dùng. Không cần bịa ETA/default hoặc vá riêng TP.HCM; phải nối nguồn mapping có thẩm quyền trước khi coi checkout nguồn thật hoàn tất. Lượt này stateful NOT_RUN.

## Hướng xử lý còn lại, chưa thực hiện

Ưu tiên hoàn tất nguồn product/fulfillment qua đường có sẵn, tách dữ liệu mô tả bán hàng khỏi facts có cấu trúc với đúng provenance. Không kỳ vọng việc publish UNKNOWN thành field sẽ tự sửa tư vấn. Với owner, cần kiểm việc nó thực sự chuyển phân vân thành lựa chọn/cách phối, thay vì thêm nhiều ví dụ hoặc điều cấm vào prompt. Với verifier, review nghĩa của ca 15 tách biệt chất lượng bán hàng và chi tiết vật lý cụ thể; chỉ sửa khi đã xác định phần bị chặn sai. Giữ các controls đang đúng, đặc biệt hai lời bảo đảm công năng bị chặn ở trên.

Không chạy tiếp 18B1+7stateful, không tự sửa vòng thứ hai trong task này. Primary human acceptance chưa đo; mọi đề xuất còn lại không được tính là đã fix. Sales/live acceptance STOP, current-source checkout BLOCKED, A OWNER_BYPASS.
