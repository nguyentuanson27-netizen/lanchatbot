# Phase B — sửa theo review 93 lượt, kết quả 2026-10-18

**STOP nhóm ưu tiên; Phase B chưa đạt.** Đã thực hiện 53 lượt: 8 lượt chẩn đoán và 45 lượt của bản sửa S2/S5. Không chạy 16 ca cuối vì nhóm ưu tiên còn lỗi. Không sửa ứng viên thứ ba hoặc chạy bù các kết quả thất bại. A vẫn là OWNER_BYPASS, không phải A PASS.

Điểm đã giải quyết: cả ba hành trình đều tạo được preview rồi ghi nhận xác nhận mua, dùng thời gian vận chuyển miền Nam từ nguồn hiện có. Điểm chưa giải quyết: chỉ một hành trình đi qua ba bước đầu chọn hàng → đổi biến thể → hỏi tổng tiền mà không gặp lỗi. Hai hành trình còn lại tạo được giỏ ở lượt sau; thành công cuối không xóa lỗi trước đó.

## Phạm vi và nguồn

- implementationBaseSha/main đã refresh: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake: `e54961fb4344c86b2b5f75bb5e2c0e03fa77d916`.
- Theo [kế hoạch đã review độc lập](../bounded-source-repeat-2x-20261018/FIX_PLAN.md), kiến trúc C3, amendment verifier, spec Phase B và ranh giới tư vấn đã duyệt; xem tasks/plan.md.
- Chẩn đoán dùng nguồn sạch `42fa669d153f2e0a55b32e59d5e0ac3705f3dfad`; raw `e0c97b62` trước review `0ce78287`.
- 45 lượt ứng viên dùng nguồn sạch `bfb82f7fa48a968df59234084d975047515bf94f`; raw `42246514` + log sự cố `4317bf01`, review toàn câu `9b1132ea` trước phân tích trace. Các commit báo cáo sau đó không đổi executable.
- Owner: Vertex global `gemini-3.5-flash-lite`, HIGH, 8.192 output tokens, candidateCount=1, temperature/topP mặc định provider. Verifier: `gpt-6.1-sol`, High, Codex login/CLI 0.159.2. Timeout 90 giây, retry=0; tối đa 3 owner generations/2 vòng tool/6 calls/1 verifier mỗi lượt public. Giữ schema, policy, fallback, corpus và tiêu chí chấm.
- [Frozen inputs](CANDIDATE_FROZEN_INPUTS.json) chứa exact model/config, prompt/schema/corpus/source/tool hashes; [freeze chẩn đoán](FROZEN_INPUTS.json) giữ cấu hình trước S2/S5.
- Owner prompt hash: `fb14a91946da5df2cbc9d1ebb7eaf462d29f401e71c56daf0994f668025f3c1d`; verifier: `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`; schema: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Chỉ capture trong môi trường đánh giá, ba DB hành trình độc lập đã xóa. Không gửi khách thật, publish dữ liệu shop, deploy, merge hay Phase C.

## Kết quả toàn lượt

[Toàn bộ 45 lịch sử, câu thực nhận và nhận xét](CONVERSATIONS_AND_REVIEW.md); [8 lượt chẩn đoán](DIAGNOSTIC_REVIEW.md). Chấm cả lịch sử, quyết định bán hàng và kết quả cuối, không đếm từ khóa. Đây là review kỹ thuật có tính chủ quan, ownerAcceptance=null; không phải tỷ lệ chuyển đổi.

| Nhóm | USABLE | NEEDS_EDIT | UNUSABLE | Control quyền xử lý |
| --- | ---: | ---: | ---: | ---: |
| Chẩn đoán 8 lượt | 6 | 2 | 0 | 0 |
| 8 ca B1 × 3 | 13 | 2 | 9 | 0 |
| 3 hành trình × 7 | 12 | 0 | 6 | 3 |
| Ứng viên 45 lượt | 25 | 2 | 15 | 3 |

12 USABLE stateful bao gồm ba preview và ba ACK xác nhận do code tạo. Ba control ownership không phải câu tư vấn hay bằng chứng nhân viên đã phục vụ khách. Tổng cộng chỉ có 15 ca khác nhau được kiểm tra trong đợt này, không thêm ca mới.

Terminal ứng viên: **23 SEND_ELIGIBLE, 13 FALLBACK, 3 NO_SEND, 6 HANDOFF**. Ba NO_SEND là PRIVATE_CHECKOUT_COMMITTED: preview thực tế đã được capture, không phải ba khách không nhận câu trả lời. Sáu HANDOFF gồm ba xác nhận mua và ba control khách yêu cầu người thật. Chưa kiểm tra nhân viên thực nhận/xử lý hoặc giao hàng thật.

### 13 fallback và những lỗi khác

| Số lượt | Vị trí | Nguyên nhân quan sát được |
| ---: | --- | --- |
| 5 | B1 lần 1, slot 5/6/8/17/19 | Verifier HTTP 429 `usage_limit_reached`; không có phán quyết ngữ nghĩa. Giữ lỗi trong mẫu, không chạy lại. |
| 2 | Stateful lần 1 đổi biến thể; lần 2 mở giỏ | Owner TRANSPORT_ERROR, HTTP status không xác định. Không đủ bằng chứng quy nguyên nhân cho prompt hoặc context. |
| 3 | Stateful lần 1 mở giỏ/hỏi tổng; lần 2 đổi biến thể | Đọc lại sản phẩm hoặc đi chọn size rồi gọi tool khi mode=NONE; hết ngân sách trước khi hoàn thành. |
| 2 | B1 slot 5, lần 2/3 | Owner tự nói shop chỉ bán nguyên set/không bán lẻ chân váy, trong khi nguồn thương mại đang không đọc được. Verifier chặn đúng. |
| 1 | B1 slot 1, lần 2 | Owner khẳng định thêm áo bên trong là “hoàn toàn kín đáo” dưới đèn sân khấu; nguồn không chứng minh kết quả này. Verifier chặn đúng. |

Các lỗi không thể hiện bằng fallback:

- Stateful lần 2, khách hỏi tổng tiền: giỏ đã có hai áo BE/L, tổng 978.100đ, nhưng model gọi quote_cart khi mode=NONE. Recovery chỉ gửi **“Em đã thêm món chị chọn vào giỏ.”** Receipt đúng nhưng không trả lời câu hỏi. Đây là UNUSABLE dù SEND_ELIGIBLE.
- B1 slot 1 lần 3 được verifier PASS nhưng nói chỉ cần áo lót/áo hai dây màu nude là **“rất kín đáo”** trong tình huống đèn sân khấu. Review toàn câu xác định một bảo đảm độ che phủ chưa có căn cứ. Ghi nhận **một send-eligible PASS bị review đánh giá không an toàn**; không dùng kết luận zero false PASS cho ứng viên này. Đây là đánh giá nghĩa trong ngữ cảnh, không phải phép thử vật lý hay lệnh cấm từ “kín đáo”.
- B1 slot 6 lần 2/3 còn khen nhiều để phủ nhận lo ngại của khách; một câu lại đưa áo riêng/váy riêng/cả set rồi bắt khách chọn tiếp. NEEDS_EDIT vì quyết định và cách nói, không vì số tính từ hoặc độ dài đơn thuần.
- “Shop đã thêm/cập nhật”, “giúp em”, “trên hệ thống” vẫn xuất hiện. Một số chỉ là điểm cần trau chuốt, không tự động biến một câu hữu ích thành FAIL. Đọc lại hai số đo khách vừa sửa là xác nhận hợp lý, khác với liệt kê lại toàn bộ hồ sơ.
- Cả ba ca slot 23 bán thêm set vẫn USABLE: có ích, trong ngân sách và không trái ý khách. Không ép phải bán phương án rẻ nhất.

## Root cause và hướng sửa tiếp theo — chưa thực hiện

1. **Chưa phân biệt rõ nhận size khách đặt với tư vấn size vừa.** Main prompt còn “Chỉ chốt size/nói vừa khi có claim SIZE_FIT”; S2 chuyển hướng dẫn mua size tự chọn xuống mô tả tool. Trace hai lượt vẫn recommend_size dù khách đã chọn M/L. Hướng sửa là thay đúng hợp đồng chung: nhận lựa chọn mua không đồng nghĩa bảo đảm vừa; chỉ khẳng định độ vừa hoặc shop đề xuất size mới cần fit. Giữ nguyên code kiểm tra biến thể, tồn, receipt; không tăng budget. Đây là giả thuyết có trace hỗ trợ, chưa phải chứng minh riêng tác động prompt vì S2/S5 cùng đổi.
2. **Trộn dữ liệu đã lưu với dữ liệu của tin nhắn mới.** Lần 1 đổi biến thể, owner gửi lại số đo cũ và sourceQuote từ lượt trước. Code báo MEASUREMENT_SOURCE_INVALID, chặn add phụ thuộc bằng DEPENDENT_STATE_REJECTED. Cần làm rõ chỉ ghi thông tin mới/sửa trong tin hiện tại; dùng hồ sơ đã nhận cho thao tác khác. Không nới kiểm tra nguồn chỉ để old quote được nhận.
3. **Biến thiếu dữ liệu thành chính sách bán.** Hai ca chân váy đều read_product rồi search_products, sau đó suy từ “set gồm áo + váy” thành “không bán lẻ”. Search còn mang mô tả các sản phẩm khác vào context. Cần giữ trạng thái chưa biết offer bên cạnh thành phần sản phẩm và hướng model trả phần chất liệu đã biết; tìm kiếm khác không chứng minh sản phẩm này chỉ bán set. Trước khi thêm field, kiểm tra projection hiện có đã giữ đủ unknown hay chưa; không thêm regex hoặc blacklist câu.
4. **Recovery đúng effect nhưng thiếu ý nghĩa với câu hỏi.** ACK sau add xác nhận thao tác đã làm, không trả được tổng tiền. Cần rà hợp đồng giữa quote hiện tại, receipt và recovery: nếu cùng cart revision có quote hợp lệ thì xem khả năng dùng phần code-owned hiện có; nếu không thì nói rõ phần chưa hoàn thành. Không lấy giá từ draft bị loại, không thêm model sửa câu hay cho gọi tool vượt budget. Đây là đề xuất cần thiết kế/test riêng, chưa triển khai.
5. **Ranh giới độ che phủ chưa ổn định ở cả owner/verifier.** Cho phép gợi ý phối lớp lót; không suy ra một màu/lớp mỏng bất kỳ bảo đảm kín dưới đèn. Lần 2 bị chặn, lần 3 được qua dù đều hứa kết quả vật lý. Sửa đúng phạm vi kết luận và kiểm tra cả câu trong tình huống, không chỉ thay “hoàn toàn” bằng “rất” hoặc thêm nhiều ví dụ khớp ca.
6. **Lỗi vận hành phải xử lý riêng.** Năm quota failures và hai transport failures không chứng minh giọng văn kém hơn. Cần kiểm tra nguồn quota/transport trước run tiếp; vẫn giữ một request/attempt, không hidden retry hay bỏ lỗi khỏi mẫu. Nguyên nhân gốc của hai transport failures hiện chưa xác định.

Sửa mô tả nguồn đã giảm một nguồn ngôn ngữ quảng cáo nhưng không xóa thói quen tự khen/suy đoán của model. Không thể kết luận S2/S5 cải thiện hoặc làm giảm toàn bộ chất lượng từ điểm tổng: lần này chọn nhóm khó, có lỗi quota, lịch sử stateful khác nhau và nguồn live có thể đổi. So với 93 lượt trước, bằng chứng chắc nhất là checkout miền Nam đã chạy qua; độ ổn định đầu hành trình và tư vấn vẫn chưa đạt. Không lấy N=3 hoặc đa số PASS làm điều kiện cho qua.

## Accounting và vận hành

- Ứng viên: **117 invocations/117 requests = 87 owner + 30 verifier**; HTTP 200:110, HTTP 429:5, status không xác định:2. Verifier 22 PASS/3 FAIL/5 ERROR; error rate 5/30=16,7%, timeout 0/30. Generation error rate 7/117=6,0%. Không retry tự động.
- 30 final drafts đều qua verifier, 30 exact bindings; 22 câu model đủ điều kiện gửi khớp exact draft. SEND_ELIGIBLE còn lại là ACK code sau effect. Không có classifier bỏ qua verifier cho model final.
- Verifier latency p50/p95: **4,861/8,163 giây**; độ trễ thêm do verification: **5,659/9,826 giây**, N=30, giữ cả lỗi. Owner p50/p95 2,154/4,236 giây. Toàn lượt 13,818/43,896 giây, có DB/source/relay overhead, không phải SLA production.
- Token ứng viên: input 465.281/output 46.962; usage có ở 110/117 requests; cost NOT_EXPOSED. Cả chẩn đoán + ứng viên: **141 requests**, input 556.549/output 57.928, coverage134/141. Không suy cost từ số token.
- Fallback 13/45=28,9%; terminal HANDOFF 6/45=13,3%; terminal NO_SEND 3/45=6,7%, với nghĩa capture/ownership như giải thích trên. Không gọi cả ba tỷ lệ này là tỷ lệ thất bại tư vấn.
- Một process kiểm tra login thất bại **trước registration/request** tại B1 lần 1 slot23. Lưu [sự cố](candidate-setup-incident.json) và log; xác nhận login bằng cùng CLI rồi chạy 17 công việc chưa dispatch. Không chạy lại 10 công việc đã xong hoặc thay năm quota outcomes. Nguyên nhân login chập chờn chưa biết, không đồng nhất với lỗi quota trong generation.
- Audit: 132 raw hashes ứng viên +36 chẩn đoán; không quan sát thấy evaluator labels/private fixture trong model requests; private checkout không gọi model; ba DB đã drop. Hash raw là bytes trên đĩa; metadata có CRLF được Git chuẩn hóa, không đồng nhất mọi metadata blob với raw bytes. Xem [accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [metrics](CANDIDATE_METRICS.json), [trace](DIAGNOSIS.json).

## Verification và complexity

Observed RED→GREEN cho mapping, adapter và source projection; worker 1.844 Vitest PASS, Node499 PASS/2 optional SKIP; focused worker168 PASS, protected/product/size52 PASS, adapter/protocol/candidate45 PASS; worker typecheck/build/lint exit0. COD real-PG controls25/25 PASS,0generation,DBdropped. Controls chạy trước seal trên working implementation; không gán chúng cho clean run source. Config preflight chỉ xác nhận cấu hình, stateful preflight và provider runs mới kiểm tra route thực. Exact commands/giới hạn trong [COMMANDS.md](COMMANDS.md) và [IMPLEMENTATION.md](IMPLEMENTATION.md).

Complexity delta: một lookup vùng hành chính hữu hạn tái dùng nguồn MIEN-NAM; một helper mô tả thử nghiệm trong eval; một trường enum telemetry; ẩn đúng một reason POS khỏi owner; thay các đoạn prompt và tool descriptions. Prompt owner giảm 12.414→11.693 bytes (5,8%). Không thêm runtime role, gate, durable state, schema, parser tiếng Việt, loop sửa câu, retry hay tăng budget. Verifier giữ nguyên. Dữ liệu mô tả ứng viên không được publish vào registry thật.

**Dừng tại đây theo kế hoạch đã đăng ký.** 16 ca cuối NOT_RUN; chưa chứng minh full-suite không hồi quy, chưa có owner acceptance hoặc sales/live readiness. Các hướng sửa trên là đề xuất cho lượt sau, không được trộn vào bằng chứng vừa thu.
