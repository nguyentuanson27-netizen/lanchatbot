# Review lại sau khi owner bác chất lượng giọng

Owner nhận xét cả hai model vẫn nói như máy, bản sửa còn kém bản cũ. Review này đối chiếu toàn bộ12draft mới với12draft của batch ngay trước, prompt diff, request context và các nhận xét primary. Không sửa raw, nhãn/scoring đã ghi trước đó, prompt hay config; không gọi provider mới.

## Điều cần đính chính

Primary trước đó đã chấp nhận quá dễ các câu Sol slots2/6 là NATURAL: lý do ghi trong chính review là hai câu liền mạch, ngắn hơn và không tạo facts. Những điều đó chưa đủ để coi là giọng tư vấn tự nhiên. Gemini slot3 cũng được gọi NATURAL dù vẫn đọc lại tình trạng hàng bằng giọng đối chiếu điều kiện. Các nhãn lịch sử được giữ nguyên để thấy sai sót của review, không dùng chúng làm kết luận giọng đã đạt.

Số6/6 functional của Sol chỉ thể hiện có lời khuyên/đáp thông tin và giữ ranh giới nguồn trên hai tình huống này. Nó không chứng minh tư vấn bán hàng đã đạt mục tiêu hoặc được owner chấp nhận. Owner đã bác chất lượng giọng của batch; STOP giữ nguyên.

## Đối chiếu cụ thể

| Nhóm | Bản mới thể hiện gì | Nhận xét sau review |
|---|---|---|
| Sol sân khấu, slots2/6/10 | Nhắc lại đèn rọi/ưu tiên khách → khuyên chưa chọn → kể tơ Hàn → nêu chưa có thông tin/không đảm bảo | Bỏ được một đoạn disclaimer nhưng giữ nguyên nhịp giải trình. Các cụm “nếu chị ưu tiên”, “đảm bảo đúng điều chị cần” làm câu giống đang xử lý một yêu cầu theo quy trình. Một chi tiết khách có thể được nhắc hợp lý; ở đây cả đoạn vẫn đi qua cùng chuỗi giải thích, chưa thành lời khuyên gọn như shop nói. |
| Sol policy, slots4/8/12 | Thời hạn15ngày, sửa lại7ngày, lặp10ngày/ướm/mặc/giặt/tem/sạch, điều kiện còn thiếu và thêm giao nhận | Bản sửa không giải quyết được kiểu đọc hồ sơ. “Phù hợp để xét đổi”, “trong phạm vi được hỗ trợ” là giọng hành chính. Slot12 còn nêu chưa đổi lần nào rồi nhắc lại tối đa1lần. Các điều kiện chưa rõ vẫn cần giữ; không cần trình bày lại cả phép đối chiếu. |
| Gemini sân khấu, slots1/5/9 | “Mô tả set này…”, “với nhu cầu lên đèn rọi”, “hơi thấu hình ảnh bên trong”; nội y hoặc mẫu dày chung chung | Slot1 chuyển từ lời nhắn sang tóm tắt mô tả catalog. Một số câu nghe như diễn giải văn bản thay vì nói chuyện. Slot9 dùng cách diễn đạt xa từ khách vừa dùng là lộ bóng áo lót. Ngoài giọng, vẫn có suy diễn vật lý/giải pháp chưa có nguồn. |
| Gemini policy, slots3/7/11 | Cắt ngắn nhưng vẫn có “tình trạng sản phẩm… đúng yêu cầu/đúng điều kiện đổi” | Slots3/11 vẫn giống thông báo xử lý hồ sơ. Slot7 có nhịp chat gần tự nhiên hơn, nhưng lại cấp quyền đổi khi chưa xét đơn. Một câu nghe thuận tai không làm cả batch đạt hoặc sửa được lỗi nguồn. |

Đây không phải bằng chứng mọi câu mới đều kém mọi câu cũ. Sol bớt một số lời thừa, Gemini có câu ngắn và trực tiếp hơn; điều bị bác là diễn giải những thay đổi đó thành cải thiện giọng/tư vấn đã đủ tốt. Độ dài và thời gian đã đo vẫn đúng, nhưng không thay cho nhận xét của người đọc.

## Cách sửa vừa rồi sai ở đâu

1. **Sửa độ gọn trước, chưa đổi cách diễn đạt.** Chuyển đoạn giọng lên đầu và thêm chỉ dẫn không kể từng bước kiểm tra, nhưng vẫn giữ gần toàn bộ cách giao việc kiểu kiểm chứng/đối chiếu trong phần còn lại. Kết quả là rút ngắn một lời giải trình, chưa tạo được lời tư vấn như người bán.
2. **Mục tiêu giọng vẫn mơ hồ, chỉ dẫn về ranh giới lại rất cụ thể.** “Nói gọn, tự tin, dùng từ thường ngày” không giúp phân biệt giọng hành chính với giọng shop khi các đoạn sau nói xét đổi/phạm vi/đủ căn cứ. Prompt tăng2.6%, không phải một lần phình lớn; vấn đề nằm ở cách ưu tiên và nội dung giữ lại, không chỉ số byte.
3. **Review dùng sai dấu hiệu để chấp nhận.** Câu có lựa chọn, đúng dữ kiện, hai câu liền mạch hoặc ngắn hơn vẫn có thể rất máy móc. Primary nhận ra nhiều lỗi nhưng vẫn cấp NATURAL hoặc functional adequate, khiến báo cáo dễ được hiểu là tư vấn đã tốt. Không lấy một cụm từ riêng làm lỗi; cần đọc cả lời nhắn như khách thực sự nhận.
4. **Hai ca này chỉ là regression cho trường hợp khó.** Một ca thiếu dữ liệu độ kín, một ca hỏi quyền đổi. Chúng không đủ kiểm tra chọn mẫu/phối đồ, xử lý phân vân mua hàng hoặc phản đối giá. Dùng chúng để định hướng toàn bộ giọng bán hàng khiến việc sửa tập trung vào câu trả lời phòng lỗi.

## Điều đã kiểm tra và điều mới là giả thuyết

- Source/history/latest text giống chính xác giữa hai batch và hai owner; không có bằng chứng bản sửa làm mất context. Verifier/config không đổi, verifier không rewrite. Các lời văn bị chê đã có ngay trong owner output.
- Cả hai owner đọc product description hoặc policy hai lần: một lần trong trusted, một lần trong trustedSourceReads. Đã kiểm tra equality trực tiếp trên request. Đây là đặc điểm có từ bản cũ, không phải thay đổi vừa thêm; khả năng nó làm model chú ý quá nhiều vào việc đối chiếu là giả thuyết, chưa có thử nghiệm tách riêng.
- Owner tools đang tắt, budget0, nhưng prompt vẫn chứa cả hướng dẫn state/fit/cart/confirmation cho luồng đầy đủ. Đây là sự lệch giữa nhiệm vụ diagnostic và lượng hợp đồng đưa vào prompt, chưa chứng minh tự nó gây toàn bộ vấn đề giọng.
- Ca sân khấu chỉ có một sản phẩm và thiếu evidence độ kín; không có nguồn cho món thay. Điều này giới hạn phương án bán hàng, không bắt buộc câu trả lời phải dài hoặc giống văn bản kỹ thuật.
- Model không được nhận rubric/scoring labels. Sai sót trong cách chấm ảnh hưởng cách agent chọn sửa prompt và kết luận, không phải bằng chứng evaluator labels leak vào request.
- Chỉ có ba mẫu/ca/model, không kết luận cơ chế huấn luyện, model nào luôn kém hơn hoặc một câu prompt cụ thể gây toàn bộ regression.

## Hướng xử lý cần thay đổi

- Không công nhận bản mới là chuẩn giọng đã cải thiện. Không tiếp tục nối thêm câu cấm hoặc ép số câu để cứu hai ca.
- Soạn lại toàn bộ cách giao nhiệm vụ owner, giữ hợp đồng nguồn/quyền cần thiết và đặt các ràng buộc tool ở đúng nơi sử dụng; giao mục tiêu chọn/giúp mua và cách nhắn rõ ràng. Lấy vài đoạn thực sự được chấp nhận trong lịch sử làm chuẩn giọng, thay cho agent tự viết ví dụ rồi tự gọi là tự nhiên.
- Đánh giá lời nhắn theo việc người bán có thể gửi nguyên đoạn đó cho khách hay phải viết lại. Lời khuyên phải đúng mạch và dùng được; nhắc một dữ kiện có ích vẫn được chấp nhận. An toàn và giọng được nhận xét riêng, cả hai đều cần đạt.
- Hai ca hiện tại vẫn giữ làm regression. Khi được yêu cầu chạy tiếp, dùng thêm các ca thường ngày đã có trong cases.b1.json như hỏi giá, áo rời hoặc băn khoăn về ren/ngân sách; không tạo thêm corpus chỉ để tăng số lượt.
- Context trùng và sự khớp giữa prompt/capability cần được xem như thay đổi riêng có kiểm chứng, không đổi đồng thời mọi thứ rồi quy kết kết quả cho một model. Không thêm model rewrite hoặc vòng sửa tự động.

Lượt hiện tại kết thúc ở review: không đổi executable/config và không generation mới. Các proposed fixes chưa được implement hoặc verified.
