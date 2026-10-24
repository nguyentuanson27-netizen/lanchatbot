# Independent review — hướng xử lý root cause sau full39

Ngày23/10/2026. **REVISE — sửa kế hoạch trước implementation.** Reviewed HEAD `2a43a2f2e19d1cf2596a66f27e106c99deac2910`; source model run `540b8129e2e52062ad5bc96ffa44dd84d0591bd5`. Reviewer độc lập `/root/review_rootcause_full39_20261023`, được giao đọc source/raw evidence và phản biện đề xuất; không sửa file, chạy test/provider hoặc spawn agent khác. Parent ghi lại kết quả này sau review. Đây chưa phải bản kế hoạch đã chỉnh hoặc B GO.

## P2 required — discovery thiếu chẩn đoán offer expansion

Raw `opening-advice-run-20261023/raw/openings/provider-requests.jsonl` dòng3 có description SQ629/SQ748/V406. Trước batch có4subjects. `read_product(SQ629, offerType:null)` mở thêm3offer/variant thành7; đọc SQ748 cần thêm3 thành10, vượt bound8 tại `apps/worker/src/single-agent-commerce-read-only-tools.ts:187`, nên trả SUBJECT_BOUND; V406 thêm1 thành8 và thành công. SQ748 thiếu offer/POS readback, không thiếu description hoặc hết tool-call budget.

Cả hai bộ quần trong search results là short, chưa có bộ quần dài công sở phù hợp để chọn sẵn. Đề xuất chỉ sửa query/đọc description chưa bao phủ coverage và cách tiêu bound khi đọc toàn bộ offers.

Điều chỉnh cần thiết: xét query, tập ứng viên và độ rộng offer read cùng nhau; sàng món từ description đã có trước khi đọc nhiều món/toàn bộ offers. Không ép món gần nhất thành phù hợp khi search chưa có hàng đúng nhu cầu. Chưa có căn cứ tăng bound, classifier hoặc thay authority.

## P2 required — tách triệu chứng xác nhận khỏi giả thuyết

Quote đã đủ trong functionResponse và current state, raw negotiation dòng10. `gemini-inference.mjs:51` đã nói code tự quyết ưu đãi và trả quote; `prompts/owner.vi.txt:31` đã yêu cầu dùng kết quả hiện tại. Prompt dòng7–8 cũng đã yêu cầu chọn một hướng thay vì kể mọi phương án. Plan cũ dòng111–142 đã thay phần tư vấn trùng rồi diagnostic4, vẫn có2ca cần sửa.

Confirmed: owner bỏ qua quote khi trả lời xin bớt; owner còn trả lại quyết định mua. Policy lấn quote hoặc instruction ngoại lệ lấn lựa chọn là hypotheses, chưa được đọc prompt chứng minh.

Điều chỉnh cần thiết: paired diagnostic giữ cùng input/history/facts/config/mode, baseline và candidate đều ở diagnostic mode; chỉ đổi đúng phần prompt đã xác định. Giữ đủ4input cố định gồm controls đang dùng được, không chọn lại sau output. N1 chỉ thăm dò, không stability claim. Quote reorder là thí nghiệm riêng và cần context native/tool-history; diagnostic4 tư vấn không chứng minh đã sửa thương lượng. Không gộp reorder tool response, reorder toàn context và đổi instruction rồi quy kết một root cause đã đóng.

## P2 required — deadline refusal khác báo chắc lịch giao

Verifier prompt dòng32 giữ nguyên tắc ETA dự kiến không chứng minh chắc trễ. Draft thực tế nói “mất từ4đến8ngày nên không kịp giao vào sáng thứSáu”, tức kết luận giao hàng; chưa phải shop từ chối nhận hẹn. Clock đã có nhưng nguồn còn thiếu anchor/day convention. Không diễn giải lại draft thành refusal để coi verifier sai.

Điều chỉnh cần thiết: owner/verifier thống nhất cho phép nghĩa shop không nhận hẹn/chưa thể cam kết deadline; vẫn chặn bảo đảm kịp hoặc chắc trễ vượt căn cứ. Kiểm cả lời từ chối cam kết và lời báo chắc lịch giao.

Cạp chun: nguyên tắc phân biệt chọn thiết kế với bảo đảm fit đã có trong verifier dòng22,29. Verdict chỉ refSQ629, chưa xác định span/cơ chế chặn. Không thêm ngoại lệ chung cho mọi câu không bó bụng; chưa gọi false reject đã xác nhận.

## Những phần giữ và trình tự tối thiểu

Giữ một owner/một verifier, code authority, media binding và đánh giá whole terminal outcome. Không quote copies/regex/template/parser/role/recovery mới. Gallery sửa theo việc khách xin ảnh. Hai malformed/transport là provider errors riêng, không tự thêm retry.

1. Bổ sung trace discovery về offer expansion/bound và candidate coverage.
2. Tách confirmed symptoms/hypotheses; chỉ ra instruction cạnh tranh trước khi sửa.
3. Paired diagnostic cố định một biến prompt; kiểm thương lượng riêng bằng native/tool-history context.
4. Chốt nghĩa deadline/fit và kiểm cả hai phía ranh giới.
5. Sau đó mới một full run source/config/corpus cố định; không kết luận ổn định từN1.

Scope lượt này chỉ review và ghi kết quả; chưa sửa kế hoạch/runtime/prompt hoặc chạy model mới. A OWNER_BYPASS, B chưa GO.
