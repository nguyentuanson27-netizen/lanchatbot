# Findings và root cause — full39 source6e38c541

Không sửa code/prompt giữa run; không diễn giải usage_limit thành lỗi hiểu của model.

| Finding | Bằng chứng | Root cause / giới hạn | Hướng xử lý tiếp theo |
|---|---|---|---|
|21verifier429,17staticfallback,4code recoveries|REQUEST_ACCOUNTING/34verifier requests|quotaCodex login hết sau13verdict; owner76generations không provider error|Khi quota available mới đăng ký run tiếp theo; không retry attempt cũ hoặc thay verifier. Không thêm prompt để chữa lỗi hạ tầng.|
|Size không trả được cho khách|openings/provider-attempt-3:158/52/RELAXED nhận thành công, recommend_size→NO_VERIFIED_CHART|Enum mismatch đã được xử lý; current trusted source không có chart. Handoff matrixSIZE_RULE_UNAVAILABLE giữ silence|Bổ sung/duyệt chart thật bằng luồng đã có; UXholdingreply là quyết định riêng. Không bịa size hoặc thêm lời dè dặt để giả đã tư vấn xong.|
|Gallery trả lời đúng giới hạn nhưng chưa bán hàng tốt|openings/provider-attempt-2|Nguồn nhiều màu không có per-asset POScolorbinding; code trả MEDIA_COLOR_BINDING_UNVERIFIED. Owner chuyển sang câu hệthống+giá/chấtliệu+CTA chung|Bổ sung binding từ nguồn có thẩm quyền; nếu dùng ảnhchung phải nói đúng phạmvi. Không gán Qdrant visualcolor thành POSvariant hoặc thêm regex/câu mẫu riêng.|
|ETA đúng dữ kiện nhưng bỏ lỡ deadline|openings/provider-attempt-4:4–8ngày|T3querykey đã sửa. Phần còn lại là owner dùng dữ kiện để ra lời khuyên, không phải thêm fieldETA|Đánh giá quyết định theo mục tiêu mua, cần nói thẳng khả năng đápứng deadline dựa mốc thật và món thay có ETA phù hợp nếu có. Chưa đổi prompt trong package này.|
|Concern nóng lặp lỗi cũ|b1/attempt-9:khách tự cân nhắc độchịunhiệt|Có material description nhưng owner giải thích/né quyết định, không đưa cách mặc/mua dùngđược|Giữ finding tư vấn riêng; ảnh không chứng minh cảm giác nóng/thoáng trong môi trường. Không coi T5 là thuốc chữa mọi concern.|
|Changed occasion FAIL|b1/attempt-1|Draft gợi ý “treo áo váy...để vải phẳng lại”; có thể tạo kỳvọng hồi phục nhăn chưa có nguồn. Source không xác nhận khả năng đó. VerdictproductRef không chỉ span|Giữ evidence/ranh giới advice và côngnăng. Đừng nới verifier chỉ vì muốngiảm fallback; không tự viết lại ca hoặc thêm vídụ benchmark.|
|Discovery FAIL|openings/provider-attempt-1|Owner chọn set áo+quầnshort đi làm; có price799k từread nhưng thêm “không bị bóbụng...dễchịu suốtcảngày”. Không có verifiedfit. Retrieval cũng trả chủ yếu đồcasual/shorts|Đây là selection/advice/source-content vấn đề, không enumstate lỗi. Muốn tưvấnworkwear tốt cần catalog phân biệt occasion/garment phùhợp và owner dùng trongbudget; chưa có fix được chứngminh ởrun này. Không thêm router/parser hoặc tăngrounds.|
|Recovery ưuđãi rõ hơn|negotiation/provider-attempt-2 và3|Objection1evidence/tierHESITANT, discount30k,total499k; câu hỏi tổng giữledger/version. Actual là coderecovery do429|Giữ receipt/currentquote/sourcevalidation. Không gọi khoản ưuđãi tổng là “giảmthêm”; không coi codeformatter là model giọngtựnhiên cải thiện.|
|Chưa đo được giọng correction|stateful/provider-attempt-4|Sốđo74/96 đã ghi, actualfallback vì429|Không chấm rejected/unchecked draft thayactual. Findings giọngtồn tại chưađóng.|
|STALE cũ đã rõ nguồn|historical-stale-diagnosis.json từbaselinepreviousattempt7|POSsource timestamps/version refresh dùgiákhôngđổi; oldPASS không authorize snapshot mới|Giữ exactgate; boundeddiagnosis giúp tìmnguồn đổi, không sửa TTL hoặc chấpnhận oldverdict.|

## Giọng và sức thuyết phục

Gallery có “hiện hệ thống...” rồi giải thích trong ngoặc và hỏi chung “chi tiết nào...”; đó là báo trạng thái công cụ thay vì giúp việc khách đang làm. Concern nóng có “chị cân nhắc...độ chịu nhiệt” chuyển lại việc lựa chọn. Concern ren đã trấn an đúng băn khoăn, nhưng nhồi chấtliệu/tính từ làm dài câu; đây là polish nếu hướng mua vẫn rõ, không chấm bằng số tính từ hoặc token cấm.

Giá và policy đã trả được thông tin cần, không tự đánh FAIL chỉ vì có danh sách2giá/một điều kiện. Các trường hợp source chưa đủ phải phân biệt missing chart/binding với model không hiểu; không tự thêm fact hoặc field giả để cứu câu. Giữ mục tiêu bán hàng, nhưng không biến thuyết phục thành bảo đảm fit/côngnăng vượt nguồn.

## T5 chưa có kết quả

6cases/12slots và pins chuẩn bị xong;0comparisondispatch vì quota verifier. Không có kết luận ảnh làm lời tưvấn tựnhiên hơn. Owner/verifier/config giữ nguyên, không thay bằng model cóquota khác. Scope dừng ở full39 đã ghi và12BLOCKED.
