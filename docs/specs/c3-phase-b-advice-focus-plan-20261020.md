# Phase B — chọn đúng ý và dùng lời nói thường ngày

Ngày 2026-10-20. PLAN_ONLY; base `fdb2a63e1b8522042274b812b25ac0cffa53c2a6`. Chưa sửa prompt hoặc chạy provider. Đây là kế hoạch tiếp theo; không mở lại run context-comparison đã STOP.

Đã chỉnh theo self-review kế hoạch: phân biệt rõ phần mới với prompt cũ, giữ chủ động bán hàng, mở rộng kiểm tra trong cùng ngân sách 12 lượt và tách kết quả owner khỏi tác động verifier. Đây không phải review độc lập.

## Finding và mục tiêu

Owner góp ý rằng tư vấn nhồi thông tin, chưa vào trọng tâm và dùng nhiều tính từ ít gặp trong văn nói. Các ví dụ do agent viết cũng mắc lỗi này. Vì vậy, đánh giá trước đó chỉ tập trung vào câu dài, từ nối và dấu ngoặc là chưa đủ.

Run context-comparison vừa rồi: control 6/6 dùng được; candidate 4/6 dùng được, 2 fallback. Chưa chứng minh biên tập mô tả giúp tư vấn tốt hơn; concern có request giống nhau giữa hai arm. Không promote mô tả candidate. Một fallback là lời hứa phục hồi nếp thiếu căn cứ, một trường hợp reviewer nhận định verifier chặn lời khuyên đã được chấp nhận. Hai vấn đề này không được gộp thành lỗi giọng văn.

Mục tiêu: giải quyết điều khách còn phân vân để khách có thể chọn/mua hàng của shop; giải thích bằng thông tin liên quan, lời nói thường ngày. Dữ liệu có ích cho suy luận không nhất thiết phải được đọc lại cho khách. Câu ngắn nhưng không giúp khách quyết định vẫn chưa đạt. Câu nhiều ý vẫn có thể phù hợp khi khách hỏi nhiều việc.

## T1 — sửa đúng hai phần trong owner prompt

File: `apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt`.

Prompt hiện tại đã yêu cầu “giải thích phần giúp khách quyết định”, “không biến lời giải thích thành đoạn quảng cáo” và “đủ ý thì dừng”. Chỉ diễn đạt lại ba ý này chưa tạo thay đổi đủ rõ. Phần cần làm rõ là cách chọn nội dung: chi tiết được nói ra phải đóng góp vào lời khuyên, giải quyết băn khoăn hoặc việc mua đang diễn ra; không đọc lại dữ liệu chỉ để chứng minh lựa chọn có căn cứ. Đây là giả thuyết can thiệp cần kiểm chứng, chưa phải root cause đã xác nhận.

Thay phần chọn ý trong “Hiểu khách và tư vấn” và phần tương ứng trong “Giọng chat”; gộp chỉ dẫn trùng, không nối thêm một checklist ở cuối. Giữ chỉ dẫn hiểu lịch sử, đổi hoàn cảnh, quyền tư vấn tự tin và các thao tác mua hàng. Dự thảo chỉ dẫn để biên tập vào hai phần đó:

> Trả lời điều khách đang hỏi và giải quyết điều còn khiến khách phân vân. Khách nhờ chọn thì nói rõ shop chọn món nào và giải thích vì sao phù hợp với điều khách đang cần. Dùng dữ liệu sản phẩm để cân nhắc; khi giải thích, chọn chi tiết giúp khách hiểu lời khuyên hoặc quyết định mua, không kể lại từng đặc điểm để chứng minh đã xem đủ thông tin. Khách hỏi nhiều việc thì trả đủ từng việc. Chủ động đề xuất món khác, cách phối hoặc bước mua khi việc đó giải quyết băn khoăn hay giúp khách mua được món phù hợp; không cần chờ khách hỏi đúng tên phương án.
>
> Nói rõ nhận xét của shop bằng từ ngữ thường dùng khi nhắn khách. Khi đã giải thích được lý do chọn, không kéo dài cùng một ý bằng nhiều lời khen gần nghĩa. Không đọc lại yêu cầu hay hồ sơ khách nếu không giúp xác nhận hoặc giải thích lựa chọn. Hỏi tiếp hoặc đề nghị bước mua khi hữu ích và bot làm được.

Đây là nguyên tắc chọn nội dung, không phải khuôn bắt mọi câu có đủ “kết luận → lý do → CTA”. Không đặt giới hạn số câu, số facts hoặc cấm từ. Không đưa những ví dụ tư vấn vừa bị owner phản đối hay đáp án của ca kiểm tra vào prompt. Không yêu cầu model xuất thêm kế hoạch/JSON trước reply.

Hoàn thành khi diff chỉ rõ câu cũ nào được thay/gộp và phần hướng dẫn mới nào thay đổi cách chọn nội dung; không còn hai phần lặp lại cùng yêu cầu. Self-review không tự duyệt chỉ vì câu mới nghe hay hơn. Các quy tắc nguồn, policy, size, state, receipt, tiền, privacy vẫn nguyên vẹn. Báo dung lượng trước/sau, không lấy giảm dung lượng làm tiêu chí chất lượng. Không cấm riêng “thanh lịch”, “nhẹ nhàng” hay tính từ khác; đánh giá công dụng của cả đoạn. Không ép model chỉ đáp đúng câu hỏi trước mắt hoặc luôn nói ít.

## T2 — self-review trước khi chạy

Đọc toàn prompt sau sửa để tìm xung đột: có vô tình bắt khách nghe ít thông tin dù hỏi nhiều việc, ép chọn khi thiếu dữ kiện quyết định, cấm nhắc số đo hữu ích, hoặc làm tư vấn dè dặt không? Chỉnh ngay trong hai phần đã chọn, không thêm ngoại lệ theo từng case.

Code tiếp tục cung cấp dữ liệu, tool và kết quả được xác nhận; model chịu trách nhiệm chọn ý, lời khuyên và cách nói. Chưa có bằng chứng cần bộ lọc facts theo ý định, nên không thêm parser/router, tầng tóm tắt, rewrite hay vòng repair. Verifier giữ nhiệm vụ protected semantics, không chấm giọng hoặc mức hấp dẫn bán hàng.

Commands trước provider:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker build
git diff --check
```

Reuse tests hiện hữu cho request projection/firewall. Nếu cần thay logic harness để chọn prompt từng arm, viết test chứng minh prompt thực gửi đúng arm và metadata evaluator không lọt; quan sát RED rồi GREEN. Không viết test đếm từ/tính từ để chứng minh tự nhiên. Nếu chạm runtime TypeScript, bổ sung focused tests, worker typecheck/lint tương ứng.

## T3 — so sánh riêng tác dụng của prompt

Giữ context baseline, canonical snapshot, model/config và verifier hiện hành. Không áp `ownerDescriptions` của candidate lần trước. Control dùng exact owner prompt trước sửa; candidate dùng prompt T1. Phân bổ cùng trần 12 outcomes, tối đa 24 generations:

- Hai capture trọng tâm hiện hữu: đổi hoàn cảnh/nhờ chọn món và băn khoăn ren nhiều; mỗi ca 2 lần mỗi arm, tổng 8 outcomes.
- Hai ca kiểm tra nguy cơ do bản sửa: một ca khách hỏi nhiều việc, một ca cần shop chủ động đề xuất phương án; mỗi ca 1 lần mỗi arm, tổng 4 outcomes. Chọn từ corpus/capture hiện hữu trước provider, giữ nguyên lời khách/history và nguồn; không viết câu ép điều kiện hoặc chọn lại sau khi thấy output.

Trước seal, ghi exact caseId, file nguồn, capture/hash và lý do chọn hai ca bổ sung. Capture phải có đủ evidence và available actions cho yêu cầu đang đánh giá; thiếu thì dùng capture hợp lệ khác hiện có và ghi rõ trước freeze, không tự bịa facts hoặc sửa context để tạo đáp án. Nếu chưa tìm được capture phù hợp, báo phần coverage còn thiếu trước khi chạy, không âm thầm quay về hai ca cũ. Khả năng thực thi tool được kiểm ở T4, không suy từ captured replay tools-off.

Đây là 4 tình huống với độ lặp khác nhau, không 12 ca độc lập. Đổi 3 xuống 2 lần ở hai ca trọng tâm làm giảm thông tin về dao động; hai ca bổ sung chỉ phát hiện hồi quy quan sát được, chưa chứng minh không hồi quy. Báo riêng từng tình huống, không dùng tỷ lệ gộp để tuyên bố độ ổn định hoặc conversion.

Freeze input, prompt/hash, thứ tự xen kẽ, tiêu chí review và ngân sách trước provider; commit, clean source/config rồi capture runSourceSha. Một generation request mỗi registered generation, không retry/mẫu bù. Dùng runner/request capture hiện hữu, tránh thêm framework. Chạy hết tập diagnostic đã đăng ký khi hạ tầng cho phép, không sửa giữa chừng. Giữ mọi attempt trong báo cáo.

Review toàn hội thoại và actual terminal outcome trước, lưu primary rồi mới đọc rejected draft để chẩn đoán. Ẩn arm ở bản review nếu harness cho phép; không gọi đây là blind human review. Không sửa nhãn lịch sử. Ghi nhận cụ thể cho mỗi câu:

- Khách đang cần quyết định gì; shop đã trả lời/chọn giúp đến đâu?
- Phần giải thích có giúp xử lý đúng băn khoăn đó không? Ý nào dư hoặc còn thiếu, và vì sao trong ngữ cảnh này?
- Cả đoạn có giống lời shop nhắn khách không? Nếu cần sửa, nêu phần khiến câu gượng hoặc khó hiểu, không chấm chỉ vì chứa một tính từ, ngoặc, “nếu” hay CTA.
- Có tạo kỳ vọng sử dụng vượt nguồn, bỏ câu hỏi hoặc đề nghị thao tác bot không làm được không?

Nhãn USABLE hiện hữu không đồng nghĩa “tư vấn đã hay”. Freeze cách đọc toàn đoạn trước run: lý do phải giải quyết băn khoăn trong ngữ cảnh, các câu hỏi phải được trả đủ và phần chủ động phải có ích; ngắn hơn hay ít tính từ hơn không đủ. Dùng mốc review lịch sử đã có và finding owner vừa chốt, không dùng các ví dụ do agent viết đã bị phản đối làm chuẩn. Báo thêm nhận xét chất lượng bằng toàn đoạn; không tạo thang điểm keyword mới.

Tách hai kết luận theo đúng thứ tự: (1) actual terminal outcome và chất lượng khách thực nhận, khóa primary; (2) sau đó đọc draft/verdict để chẩn đoán khả năng tư vấn của owner, lỗi căn cứ và bất đồng verifier. Fallback vẫn là outcome khách thực nhận; draft chưa gửi không được cộng thành reply thành công. Một draft hợp lý bị chặn không tự chứng minh prompt owner thất bại. Ngược lại, draft đúng giọng nhưng sai căn cứ vẫn là lỗi owner. Giữ nguyên mốc nghĩa đã chốt của run trước: tư vấn định tính không tự thành lỗi chỉ vì có thời lượng; lời hứa phục hồi/phẳng cụ thể cần căn cứ.

## T4 — quyết định sau phép thử

Chỉ chuyển sang kiểm luồng tích hợp khi candidate giúp khách quyết định rõ hơn bằng nội dung liên quan và giọng dùng được, không mất phần khách cần, không có fallback hoặc lỗi thực chất mới. Đánh giá từng outcome, không majority vote xóa lỗi. Nếu chỉ ngắn hơn, thêm từ thân mật hoặc đổi tính từ, kết luận chưa cải thiện. Kết quả lẫn lộn: báo chưa đủ bằng chứng, không chạy thêm đến khi PASS.

Tách điều kiện tiếp tục hệ thống khỏi kết luận về can thiệp: candidate có fallback thì vẫn dừng T4, kể cả khi diagnosis cho thấy draft hợp lý bị verifier chặn; báo “chưa thể tiếp tục do verifier” và mức cải thiện owner quan sát được, không quy mọi fallback thành prompt tư vấn kém đi. Bất đồng nghĩa chưa đủ căn cứ phải ghi chưa xác định, không tự gọi là false rejection đã được owner xác nhận. Hai ca bổ sung phải giữ đủ nội dung và sự chủ động phù hợp; không buộc chúng phải thuyết phục hơn nếu baseline đã dùng tốt.

Nếu điều kiện trên đạt, đăng ký mới tập 16 slots hiện hữu ×1: 8 stateful, 4 integrated B1, 4 captured advice; tối đa 52 generations. Kiểm cả câu nhiều yêu cầu, nguồn thiếu, correction, giỏ/checkout và handoff để phát hiện việc rút lời tư vấn làm mất nội dung cần thiết. Giữ source-config hiện hành; không chuyển mô tả candidate lần trước sang nguồn dùng chung. Tổng trần kế hoạch: 28 outcomes/76 generations; không phát sinh vòng thứ hai tự động.

Nếu còn bất đồng verifier, giữ raw/actual/nhận xét nguyên trạng và ghi đúng nơi sở hữu; không sửa verifier trong phép thử owner để làm giảm fallback. Nếu owner còn nhồi facts hoặc khen chung, đối chiếu phần chỉ dẫn chưa tác động bằng toàn đoạn trước khi đề xuất thay đổi khác.

## Delivery và giới hạn

Lưu diff prompt, commands thực chạy, exact inputs/config/hashes, raw/accounting, toàn hội thoại và review trong artifact hiện hữu. Dừng sau báo cáo. Không kết luận A PASS hoặc B live GO; A vẫn OWNER_BYPASS. Không deploy/live send hoặc sửa dữ liệu shop dùng chung.

Complexity delta dự kiến: thay hai đoạn prompt, registration/report và tối đa điều chỉnh nhỏ harness hiện hữu để chọn prompt; role/gate/state runtime mới = 0. Lượt lập kế hoạch này không thực hiện T1 hoặc gọi provider.
