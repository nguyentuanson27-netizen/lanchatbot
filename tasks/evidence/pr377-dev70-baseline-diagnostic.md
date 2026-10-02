# P00 — Diagnostic review of all frozen DEV70 histories

Reviewed source: `92612ad182bc4b2540cd741a6278b4ed76928049`. Historical run: `LUNA6_DEV70_C3_92612ad_20260926T033240Z`.
Raw bundle SHA-256: `fd33a4a3eca3478afad407363cb1da531aecc1459113c75ac0952fdb9c360a94`.
Benchmark R2.9, DEV70 expanded hash `9256db31a3155e642afe9f9dbaeef7cf7f5818c764dbdc5933cb31dff231f643`.
Model GPT-6 Luna, reasoning medium. Full fixture history, latest customer input,
raw model stages and code-composed output were reviewed. Raw artifacts stay local.
Registered rubric file SHA-256: `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5`;
canonical parsed rubric SHA-256: `60960a535a34fdc0296e58fc8c58a983c4bbaad522439e004fe4eb2b38b821a3`.
These are two serializations of the same rubric, not a scoring-rule change.

Counts: **52 COMPLETED_NOT_JUDGED, 16 FAILED, 2 EXPECTED_PREMODEL_REJECT**.
This is a diagnostic human/agent reading, not the registered stage judge, a rubric
score or a pass certificate. `NONE_OBSERVED` means no concrete defect identified
in this reading; it does not mean quality passed. Categories can overlap.
Input/guard/model/capability distinguish owning risks, not blame allocation.

These rows describe this historical source only, not latest PR376 or PR377.
Critical corrections: Q035/Q043/Q063/Q082 contain safe uncertainty/meta language;
Q037/Q086 mention sizes already in the customer input; Q074 was accepted;
Q100 did not claim an order was placed. Re-run current source independently.

| Case | Execution | Owning category | Diagnostic and next boundary |
|---|---|---|---|
| V5V4Q001 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Giữ form báo giá đầu; hỏi một lựa chọn màu. Chưa có chấm rubric. |
| V5V4Q002 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Giữ form cho ad lead ngắn; không xem hoàn tất pipeline là đạt bán hàng. |
| V5V4Q003 | COMPLETED_NOT_JUDGED | MODEL | Báo giá đúng; hỏi lại ưu tiên màu đã được khách nêu, cần phân biệt xác nhận cần thiết với câu lặp. |
| V5V4Q004 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Hỏi làm rõ sản phẩm khi chưa bind, không đoán giá. |
| V5V4Q005 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Trả lời giá theo referent đã resolve; cần giữ nguồn binding. |
| V5V4Q006 | COMPLETED_NOT_JUDGED | MODEL | Đủ hai giá theo hai chủ thể; phần dẫn dài và thừa. |
| V5V4Q007 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Binding stale dẫn đến hỏi lại hợp lý, không dùng dữ liệu cũ. |
| V5V4Q011 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Giá trực tiếp đúng phạm vi được cấp. |
| V5V4Q012 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Khách hỏi lại giá nên nhắc lại là phù hợp, không tự đánh dấu lặp vô ích. |
| V5V4Q013 | COMPLETED_NOT_JUDGED | MODEL,CAPABILITY | Chỉ đồng cảm rồi dừng; thiếu bước làm rõ tiêu chí có thể thay đổi tư vấn. |
| V5V4Q014 | COMPLETED_NOT_JUDGED | CAPABILITY,MODEL | Budget đã biết nhưng câu nêu thiếu khả năng giải quyết khoảng chênh, không có retrieval/phương án tiếp. |
| V5V4Q015 | COMPLETED_NOT_JUDGED | MODEL | Cho khách tự cân nhắc quá sớm khi đang so đối thủ; chưa hỏi tiêu chí khác biệt. |
| V5V4Q016 | COMPLETED_NOT_JUDGED | MODEL,CAPABILITY | Nhắc thiếu thông tin thay vì hỏi rõ phần trải nghiệm trước gây khó chịu. |
| V5V4Q017 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Không coi đề nghị giá 690k là giá được duyệt hay commitment vô điều kiện. |
| V5V4Q021 | COMPLETED_NOT_JUDGED | INPUT,MODEL | Không có promo source nên không hứa giảm; mạch tiếp vẫn yếu. |
| V5V4Q022 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Nêu ưu đãi từ claim hiện hành; acceptance chưa thay thế chấm chất lượng. |
| V5V4Q023 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Freeship có evidence; không suy rộng từ một câu được chấp nhận sang checkout runtime. |
| V5V4Q024 | FAILED | INPUT,GUARD,MODEL | Thiếu snapshot giỏ độc lập cho claim âm; prose lộ mã giỏ nội bộ; không quy toàn bộ cho model. |
| V5V4Q025 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Phí giao theo claim giỏ; compiler test chưa chứng minh readback realtime. |
| V5V4Q026 | FAILED | MODEL,GUARD | Ưu đãi bị nhắc lại ở prose ngoài fact slot, gây chặn cả câu có fact đúng. |
| V5V4Q027 | EXPECTED_PREMODEL_REJECT | EXPECTED_REJECT | Claim hết hạn bị chặn trước model, đúng negative control. |
| V5V4Q031 | COMPLETED_NOT_JUDGED | MODEL | Hỏi nhiều số đo cùng lúc; cần hỏi đúng dữ kiện đang thiếu và thực sự có công dụng. |
| V5V4Q032 | COMPLETED_NOT_JUDGED | MODEL | Hỏi eo còn thiếu hợp lý nhưng dẫn nhập lặp; không cần hỏi lại chiều cao/cân nặng. |
| V5V4Q033 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Khuyến nghị M/L từ claim size, cần giữ authority khi chuyển sang runtime. |
| V5V4Q034 | FAILED | MODEL,GUARD | Lặp gợi ý size ở prose ngoài fact slot; không nhất thiết là size model tự bịa. |
| V5V4Q035 | FAILED | GUARD,INPUT | Uncertainty về XL bị chặn dù không khẳng định vừa; thiếu nguồn fit. False positive chưa được giải quyết. |
| V5V4Q036 | FAILED | MODEL,GUARD | Lặp fit recommendation ngoài slot có quyền, làm câu bị chặn. |
| V5V4Q037 | FAILED | CAPABILITY,GUARD | Khách đã nêu S/M và có mixed-size permission; phải tách permission khỏi tồn/fit, không gọi là bịa size. |
| V5V4Q041 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Stock có nguồn, trả lời trực tiếp. |
| V5V4Q042 | COMPLETED_NOT_JUDGED | MODEL | Thông tin hết hàng đúng, dẫn nhập thừa làm câu nặng. |
| V5V4Q043 | FAILED | INPUT,GUARD | Thiếu mapping variant cụ thể; lời chưa xác nhận tồn bị chặn, không phải tự tạo kết luận hết hàng. |
| V5V4Q044 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Hỏi stock sau giá được trả lời đúng chủ đề. |
| V5V4Q045 | FAILED | MODEL,GUARD | Nhắc stock trong prose ngoài evidence slot, bị chặn; không suy thành cố tạo khan hiếm. |
| V5V4Q046 | FAILED | CAPABILITY,MODEL,GUARD | Lặp hết hàng trong prose và thiếu retrieval phương án; cần lookup thực mới tư vấn tiếp được. |
| V5V4Q047 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Khách chủ động hỏi lại stock, nhắc lại không tự là lỗi. |
| V5V4Q051 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Chất liệu có evidence, lời đáp trực tiếp. |
| V5V4Q052 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Không đoán khả năng chống nhăn nhưng nhắc chất liệu ngoài slot; authority prose kiểm chưa đủ. |
| V5V4Q053 | COMPLETED_NOT_JUDGED | MODEL | Nói thiếu thông tin eo trong khi evidence có cạp chun; chọn dữ kiện và xác định phần chưa trả lời chưa rõ. |
| V5V4Q054 | COMPLETED_NOT_JUDGED | MODEL | Liên hệ kiểu dáng với nhu cầu có ích; câu còn máy móc/thụ động, không suy đáng tiền. |
| V5V4Q055 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Care có nguồn nhưng rationale bổ sung và lặp chưa được kiểm ranh giới đủ rõ. |
| V5V4Q056 | COMPLETED_NOT_JUDGED | MODEL | Lặp chính sách không chỉnh sửa trong hai phần của câu. |
| V5V4Q057 | COMPLETED_NOT_JUDGED | CAPABILITY | Thiếu khả năng gửi ảnh trong lane; thành thật nhưng không có bước thay thế hữu ích. |
| V5V4Q061 | COMPLETED_NOT_JUDGED | MODEL | ETA và lời giới hạn bị nhắc lặp. |
| V5V4Q062 | COMPLETED_NOT_JUDGED | MODEL | Không hứa ngày mai; phần giới hạn và ETA lặp, cần lời ngắn rõ. |
| V5V4Q063 | FAILED | GUARD | Uncertainty về deadline 5 ngày bị chặn; không được ghi thành hứa giao sai. |
| V5V4Q064 | COMPLETED_NOT_JUDGED | MODEL | Tránh hứa ngày chính xác nhưng nhắc giới hạn nhiều lần. |
| V5V4Q065 | COMPLETED_NOT_JUDGED | INPUT,CAPABILITY | Không có ETA nên không thể hứa; câu dừng ở thiếu thông tin. |
| V5V4Q066 | EXPECTED_PREMODEL_REJECT | EXPECTED_REJECT | ETA hết hạn bị chặn trước model, đúng negative control. |
| V5V4Q067 | FAILED | CAPABILITY,MODEL,GUARD | Phân biệt dispatch và nhận hàng đúng nhưng nhắc số ETA trong prose không chọn evidence tương ứng. |
| V5V4Q071 | COMPLETED_NOT_JUDGED | CAPABILITY | Projection tự hứa kiểm tra lại trong khi chưa có tác vụ kiểm tra; nguồn/code cũng có lỗi. |
| V5V4Q072 | COMPLETED_NOT_JUDGED | MODEL | Policy đúng; nối câu Dạ với Mẫu viết hoa khiến lời kém tự nhiên. |
| V5V4Q073 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Lọt áp dụng nhóm sale trên 30% cho sản phẩm cụ thể khi chưa có bằng chứng membership. False negative. |
| V5V4Q074 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Raw status là accepted, không phải rejected như nhận xét cũ; refund policy lặp ngoài fact slot. |
| V5V4Q075 | COMPLETED_NOT_JUDGED | MODEL | Payment policy được trả lời nhưng dẫn nhập dài. |
| V5V4Q076 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Lặp phương thức thanh toán ngoài fact slot; hỏi phương thức chưa phải lựa chọn thanh toán. |
| V5V4Q077 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Địa chỉ cửa hàng trực tiếp; không xem chấp nhận là chất lượng đã chấm. |
| V5V4Q081 | FAILED | CAPABILITY | Thiếu code derivation comparison; thứ tự giá có thể đúng nhưng prose chưa có authority. Không đồng nghĩa số bịa. |
| V5V4Q082 | FAILED | GUARD | Câu meta về tình trạng còn hàng giúp cân nhắc bị chặn; false positive trên ngữ cảnh referent đúng. |
| V5V4Q083 | COMPLETED_NOT_JUDGED | MODEL | Ghi nhận đổi referent đúng; cần tiếp tục câu hỏi đang dở, tránh chỉ ACK. |
| V5V4Q084 | COMPLETED_NOT_JUDGED | MODEL | Khách hỏi riêng áo nhưng kèm cả giá bộ không cần thiết; nguồn giá vẫn đúng. |
| V5V4Q085 | COMPLETED_NOT_JUDGED | MODEL,GUARD | Thành phần combo bị lặp ngoài slot evidence. |
| V5V4Q086 | FAILED | CAPABILITY,GUARD | S/M có trong tin khách, không bịa size; thiếu phân biệt split-size eligibility với fit/stock. |
| V5V4Q087 | COMPLETED_NOT_JUDGED | MODEL | Ngừng sản xuất đúng nguồn; phần dẫn dài. |
| V5V4Q091 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Không biến ok sau tư vấn thành mua. |
| V5V4Q092 | COMPLETED_NOT_JUDGED | INPUT | Redactor trong báo cáo thay dữ liệu; phải đọc runtimeReply trước nhận xét capture. Không chứng minh checkout commit. |
| V5V4Q093 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Commitment nhưng chưa rõ sản phẩm được yêu cầu làm rõ. |
| V5V4Q094 | COMPLETED_NOT_JUDGED | MODEL,CAPABILITY | Hỏi các số đo còn thiếu quá mơ hồ; cần canonical missing fields cụ thể. |
| V5V4Q095 | COMPLETED_NOT_JUDGED | NONE_OBSERVED | Lời kết ngắn, không tự công bố tác động bên ngoài. |
| V5V4Q096 | FAILED | CAPABILITY,GUARD | Ghi nhận chọn L trong browsing bị chặn; chưa có cart mutation trong lane để kết luận sửa giỏ trái phép. |
| V5V4Q100 | FAILED | INPUT,CAPABILITY,GUARD | Thiếu checkout/current-cart contract; lời không thể xác nhận tổng bị chặn. Không gọi là tuyên bố đã lên đơn. |

## Consequences for implementation

- Preserve exact product/variant/current-cart scope at the producer and consumer;
  do not synthesize missing cart snapshots from the claims being checked.
- Duplication is often caused by the split between free prose and fixed factual
  slots. Repair that contract/use of slots; appending uncertainty regexes cannot
  establish semantic truth. Positive and harmful controls are both required.
- Useful sales progression requires a supported question or actual lookup. Missing
  retrieval/comparison/media capability cannot be repaired by empathetic wording.
- Semantic uncertainty false positives and conditional-policy false negatives remain
  open until the current guard experiment proves its scope. Complete runtime traces
  and a registered quality judge are still required for P11.
