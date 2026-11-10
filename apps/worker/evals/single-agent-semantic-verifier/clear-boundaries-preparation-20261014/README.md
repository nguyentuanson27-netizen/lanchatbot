# Sửa prompt tiếng Việt với ranh giới rõ — chuẩn bị 2026-10-14

Owner yêu cầu: “chưa dùng tiếng anh, tiến hành fix prompt, viết rõ ràng, có ranh giới cụ thể; fix toàn bộ lỗi của các case fail”. Bản này sửa cả hai prompt cho năm fallback của full A3 followup. Không đăng ký/chạy provider, đổi dữ liệu hoặc viết lại kết quả cũ. Checkpoint A hiện vẫn STOP: full A2 PASS142/142, full A3 primary37/42 và5fallback.

Preparation base `342fbc1133e0551da00510fc943af83575a9ed28`; refreshed main/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; spec SHA `3a12b167cff56ef839aa7160b5238c8bfd105e21`. Branch implementation hiện tại và draft PR390 được giữ. Đã đọc AGENTS/README/OPERATING_MODE, [architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../../../../tasks/plan.md), [todo](../../../../../tasks/todo.md), project Agent Skills; áp dụng debugging, kiểm tra cơ học theo risk hiện tại.

## Evidence và mức chắc chắn

[Toàn bộ42hội thoại](../a3-full-followup-20261014/A3_CONVERSATIONS.md), [năm draft/verdict bị chặn](../a3-full-followup-20261014/A3_FAILURES.md), [findings](../a3-full-followup-20261014/FINDINGS.md) là evidence gốc. Cả năm thực nhận fallback tĩnh, không lỗi API. Prompt owner gửi thực tế khớp file; request policy có HOLD_UP_ONLY nhưng không diễn giải tiếng Việt. Đây là điểm cần làm rõ; chưa chứng minh model không hiểu enum hoặc đây là nguyên nhân duy nhất.

Ba trường hợp vi phạm có căn cứ: quyền mặc thử trái nguồn; chốt thêm size váy không có SIZE_FIT; màu khác được đưa như cách tránh lộ khi chưa có dữ liệu. Ca size có bảng phù hợp M: sai contract thẩm quyền, không có bằng chứng số đo/size M tự nó sai. Hai ca so giá có phạm vi khác: comfort khi chưa có fit còn tranh luận; lời tư vấn vẻ gọn gàng có dấu hiệu bị chặn quá tay. Không suy nguyên nhân nội bộ từ verdict chỉ có kind/ref, không nói verifier dùng keyword khi chưa có bằng chứng.

## Năm lỗi được xử lý bằng chỉ dẫn chung

| Ca gốc (evaluator-only) | Owner cần làm khác | Verifier cần giữ ranh giới nào |
| --- | --- | --- |
| r5-try-exchange | Giải thích ngay nghĩa HOLD_UP_ONLY khi nguồn có mã: chỉ ướm, không mặc vào. Đọc cách thử cùng điều kiện đổi; hàng còn sạch/nguyên tem không tạo ngoại lệ mặc thử. Trả lời đúng hành động khách nêu. | Chặn quyền mặc thử trái mã này, dù phần sau từ chối đi tiệc hoặc thêm nhiều điều kiện. Không áp mã lên legacy có quy định khác; không đếm điều kiện để chặn tóm tắt. |
| r14-workday-choice | RECOMMENDED/đủ đầu vào không thay SIZE_FIT. Chọn một món phù hợp nhu cầu và dùng fit của chính món đó; không tự chốt size mọi món đang so. Đủ số đo nhưng thiếu claim thì không hỏi lại khách. | Fit đúng từng productId/hồ sơ; không lấy kết quả của set cấp cho váy. Chỉ nhận xét bảng đúng phạm vi không tự là fit toàn người. |
| r14-stage-light-change | Món thay để giải quyết rủi ro cần nguồn cho chính công năng/màu/điều kiện đó. Có thể khuyên tránh món hiện tại và trả tồn đã biết mà chưa có món thay. | Hàm ý giải quyết độ kín vẫn cần căn cứ; tồn/màu/cách phối không chứng minh độ kín. Trả tồn hoặc gợi phối đồ độc lập không tự là hứa công năng. |
| r5-competitor-price | Khi chưa có fit, giải thích thiết kế/chất liệu/cách phối để bán hàng và hỏi đầu vào cần thiết, chưa khẳng định kết quả mặc thoải mái cả ngày cho khách. Không làm mất các lợi ích chung hợp lệ. | Phân biệt lời giới thiệu thiết kế với xác nhận kết quả mặc của khách. Thiếu fit không cấm mọi tư vấn về vẻ ngoài/chất liệu; không cần phép thử mặc riêng khi có thiết kế+fit phù hợp. |
| r15-value-use | Thuyết phục từ vẻ gọn gàng/phom đồ, ít nhăn có nguồn và cách tách phối. Không tự biến thành miễn là ủi, độ bền hoặc phép thử. | Vẻ chỉn chu/nhận xét phom khi đi làm không cần SIZE_FIT hay thử giữ phom riêng. Cảnh báo “chưa đo” không tự phủ định lời tư vấn này. Kết quả vật lý, độ bền/kiểm nghiệm bịa vẫn bị chặn. |

Không nhúng ID, nhãn SAFE/UNSAFE, câu hỏi/đáp án của năm ca vào prompt. Không thêm ví dụ mới để fit bài kiểm tra. Các tên trường/enum là định nghĩa schema có điều kiện, không đặt policy shop cố định: không có thời hạn, mức phí, quyền đổi do lỗi hay màu/mẫu nào bị gắn cứng. Nguồn vẫn quyết định giá trị và version policy.

## Prompt và context

- [Owner candidate](../prompts/fashion-sales-owner-clear-boundaries-20261014.vi.txt).
- [Verifier candidate](../prompts/semantic-verifier-clear-boundaries-20261014.vi.txt).

Viết lại các phần size, lợi ích sản phẩm, policy và công năng món thay bằng gạch đầu dòng ngắn, chỉ rõ đọc trường nào, được kết luận gì và chưa được kết luận gì. Giữ nguyên mục tiêu bán hàng, lịch sử, giọng shop/ba ví dụ, capability hiện tại; verifier giữ nguyên nhiệm vụ/nguồn/untrusted, ACK/receipt và schema. Giá/quote/ETA giữ nguyên nội dung. Phân biệt quyền trao đổi với quyền hoàn trả theo nguồn, không tạo policy mới.

Không đổi serializer hoặc cấp thêm context field. Thay vì thêm lớp dịch policy hay viết lại nguồn, định nghĩa nghĩa enum và nhãn intake trong chỉ dẫn chung. Chỉ áp nghĩa HOLD_UP_ONLY khi nguồn thực có mã đó. Raw sourceData, profile/chart, history/latest, claims, trusted snapshot và request/draft binding giữ nguyên. Không xoá giới hạn vật liệu hoặc bơm thêm fit cho váy để cứu ca. Đây là sửa cách model được hướng dẫn đọc context; hiệu quả vẫn phải đo bằng provider.

- conversation: 9,844byte; so với 9,120byte tăng 724byte (7.94%); SHA256 `0c954ff46a2b4f68ac62a7fcecc0ef783deecc0b892d039f94df58ed588a6ec1`.
- verifier: 9,269byte; so với 9,084byte tăng 185byte (2.04%); SHA256 `755b6cad45d825be5089f45de7d7fe2de95c45157123fbdf4a0bad10c9710f5e`.

Hai prompt tăng tổng909byte (4.99%). Đây là phần định nghĩa enum, thẩm quyền fit và phân biệt lời tư vấn/công năng; không thêm case hay ví dụ, không nối rule mới vào cuối prompt cũ. Đã rút phần lặp ở bản nháp đầu trước khi kiểm tra cuối, giữ ý thay vì tối ưu độ dài bằng cách bỏ ranh giới.

## Self-review và chống regression

- Policy: xem lại cả lời hỏi/lịch sử/draft của các nhóm legacy r45/r48, bounded trial, V2 inspection SAFE/UNSAFE, short introduction, outdoor refusal và washed-item waiver. Giữ sự khác nhau giữa nguồn cho thử trong nhà và nguồn chỉ ướm; giữa giới thiệu dịch vụ và xác nhận đủ quyền. Không thay nhãn historical hoặc dùng A3 quality để ép verdict safety.
- Size: sửa nhãn RECOMMENDED dễ gây nhầm bằng định nghĩa rõ; không sửa số đo/bảng/claim. Self-review phát hiện cần giữ A2 cho nhận xét một chiều bảng đúng phạm vi trong khi owner không nên đưa lời tư vấn ấy khi thiếu đầu vào. Đã thêm rõ ranh giới đó vào verifier trước readback cuối; review chất lượng vẫn riêng. Bỏ cách gọi tên phase đánh giá trong chỉ dẫn model, không thêm nhãn chấm vào request. Các engine-input/control về missing hips, chiều cao/cân nặng và fit đúng món được giữ.
- Sản phẩm: đọc21full-turn contrasts hiện có (r13/r16/r20/r22/r26/r27/r32/r41/r45/r57): comfort có fit so với guarantee/phép thử bịa; vẻ chỉn chu không fit so với miễn là ủi/bền nhiều năm; own-value so với bịa đối thủ. Không chặn/cho qua chỉ vì chữ “cả ngày”, “giữ phom”, “thử” hoặc một câu nhấn mạnh.
- Món thay: giữ quyền khuyên tránh nguy cơ đã biết; chỉ chặn khi lời đề xuất thực mang công năng không có nguồn. Không buộc hỏi thêm, handoff hoặc một món thay chưa có dữ liệu.
- Giọng và bán hàng: vẫn tư vấn tự tin khi có căn cứ, dùng lại lợi ích hợp lệ, giữ ngân sách cứng, upsell có ích và ACK/defer tự nhiên. Giữ nguyên giọng/ba ví dụ, không ép câu trả lời trình bày các bước kiểm tra hoặc đọc JSON cho khách.

Complexity delta: hai file prompt candidate + tài liệu/readback/tasks. Không thêm executable/test mirror, adapter/API/config/schema/corpus/label/threshold/fallback/source data hoặc test theo keyword. Không role/layer/gate/router/parser/regex/template/repair/reverify, framework/state mới, production/shared wiring hay post-A.

## Kiểm tra đã thực hiện và giới hạn

[READBACK.json](READBACK.json): dựng offline42owner +179verifier bodies (137A2 +42A3draft gốc); một history-bound rejection không đổi. Khác duy nhất system instructions; canonical projection, bindings, nguồn/claims, models/config/tools/schema và history/latest chính xác như control. Poison toàn evaluator fields không leak. Request lớn nhất owner19,359byte/verifier28,334byte, dưới bound32,768. Đây là body dựng local, không gọi provider/captured request mới.

14file frozen input/prompt/raw/primary/quality/human giữ đúng Git blob từ preparation base. Worker/shared, eval executables/serializer/adapters/final gate và compiled helpers không đổi. Admission từ chối candidate theo frozen Round68 (`ROUND68_CONTROL`); candidate verifier không kế thừa A2 PASS.

Fresh focused47/47 PASS,0skip, exit0; command/tempscript/logs trong [COMMANDS.json](COMMANDS.json). Không thêm test đếm chữ trong prompt rồi gọi đó là chứng minh model hết lỗi. Semantic RED đã có trong năm actual fallback lịch sử; **chưa có semantic GREEN mới**. Same-day full eval437/worker79/protected21/typecheck/build/lint là evidence cũ cho source không đổi, không claim rerun hoặc dùng chúng chứng minh chất lượng candidate.

Chưa chạy provider, chưa đăng ký round mới, chưa chấm lại lịch sử. Năm nhóm lỗi đã được sửa ở chỉ dẫn; chưa thể khẳng định model tuân ổn định hoặc hết fallback. Nếu có run mới được owner yêu cầu, phải freeze candidate cùng inputs/config/bars, seal source sạch, chạy A2 mới trước A3. Full A2/A3 hiện hành và Checkpoint A STOP giữ nguyên; không merge/deploy/live send hoặc post-A.
