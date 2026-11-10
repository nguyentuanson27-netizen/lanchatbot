# Phase B — phương án sau hai vòng gần nhất

Ngày22/10/2026. **PLAN_ONLY**: phương án đã viết, chưa sửa runtime/prompt, chưa chạy provider. Base `e8dbaa67ececc5e3399b9eed40ced9bd37f6308b`.

Mục tiêu là giúp khách mua trang phục phù hợp bằng lời chat tự nhiên. Giữ một owner, tối đa một verifier; code tiếp tục làm chủ nguồn, identity/freshness/state/permission/effect/receipt/privacy. Không thêm semantic router, parser, câu mẫu riêng cho test hoặc vòng sửa/verify lại.

## Evidence và giới hạn

Hai vòng: decision-scope-focus-20261021 (10U/7N/1no-send) và explicit-offer-focus-20261021 (13U/5N). Đây là hai population18khác phân bổ, không dùng điểm tổng như paired causal evidence.

- Giá set: vòng trước3/3 mở bảng và hỏi lại cách mua; vòng mới1/3 trả một giá,1/3 giá bộ trước rồi thêm hai giá lẻ,1/3 tiếp tục hỏi lại. Hai mẫu trả thừa đều chủ động đọc offerType:null; mẫu gọn đọc SET_VAY. Contract mới làm lựa chọn rõ, chưa làm model chọn đúng ổn định.
- Gu đồ trơn/ngại quá điệu: vòng trước3/3 cần sửa; vòng mới còn2/3. Model thường đồng ý set hợp tiệc rồi chuyển sang nếu còn ngại thì áo lẻ. Dữ liệu đã biết bị biến trở lại thành điều kiện chưa quyết định.
- Gặp khách/muốn nhìn gọn: mẫu mới khen đồng bộ/thanh lịch/đẹp nhất mà chưa giải thích vì sao thỏa ưu tiên mới. Không mặc định áo lẻ luôn đúng hoặc mua cả bộ luôn sai.
- Policy thời hạn/phí: vòng trước một mẫu mời lên đơn đổi ngoài B1 capability; vòng mới3/3 đúng và không mời. Giữ sửa đổi hiện tại, chưa mở lại toàn policy.
- Một no-send cũ do POS observation mới đổi exact snapshot. Gate giữ đúng hợp đồng; không phải verifier từ chối hoặc Redis tự sinh observation trên mỗi read. Không thay điều này bằng phép so vài business values.
- Đã kiểm71captured owner requests:34vòng trước,37vòng mới; parts chỉ text/functionCall/functionResponse/thoughtSignature, không có ảnh. Request ca15 có mô tả tơ/thêu/ren/mềm/thoáng/rũ.
- Audit chỉ đọc nguồn ngày22/10 xác nhận SV2447 có11imageUrls/11image records; tất cả metadata APPROVED/metadataVerified=true/có sourceContentSha256. Có một PRIMARY/FRONT/MODEL. Tất cả image observedAt=null. Đây là evidence nguồn có ảnh, chưa phải đã xem hình hoặc đã kiểm bytes còn khớp hash. Command: `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-audit-sv2447-media.mjs`, exit0,0provider generations/0source writes. Không in credential hoặc tải ảnh trong lượt lập kế hoạch.

Thiếu ảnh có thể hạn chế nhận xét về lượng trang trí, dáng và tổng thể; chưa chứng minh đó là nguyên nhân chính. Model vẫn có thể khuyên phối đồ từ mô tả hiện có. Ảnh không tự sửa lỗi thiếu lập trường hay giọng văn.

## T1 — thống nhất cách đọc kết quả, không viết lại lịch sử

Phân biệt an toàn/khả năng thực hiện, chất lượng quyết định và polish. Dùng cả reply/history để quyết định, không phát hiện từ khóa.

- Giá đúng, trả câu chính rõ rồi giới thiệu thêm hai giá: polish/thông tin phụ, chưa tự là một câu không dùng được.
- Khách hỏi rõ set mà bot lại bắt chọn bộ hay lẻ: lỗi mở lại quyết định. Không cấm bảng giá khi khách thật sự hỏi nhiều lựa chọn.
- Khách nhờ shop chọn nhưng reply chưa giúp họ đi đến một hướng: lỗi tư vấn. Có hai lựa chọn hoặc chữ nếu không tự là lỗi nếu cả đoạn vẫn có đề xuất rõ và tradeoff hữu ích.
- Thông tin khách đã nói là tiêu chí đã biết, không bắt khách xác nhận lại chỉ để model dám tư vấn. Nhắc ngắn có ích vẫn được phép.
- Hứa bước ngoài capability, quyền lợi sai, thông số hoặc hiệu quả cụ thể vượt nguồn là lỗi riêng; không gộp với giọng chưa hay.

Lưu adjudication mới riêng nếu triển khai, không sửa PRIMARY_REVIEW/điểm cũ và không gọi thay đổi cách chấm là model đã cải thiện. Đây là cách review, không thêm runtime judge hoặc gate.

Hoàn thành khi cùng kiểu câu giá thừa được đánh giá nhất quán ở cả hai vòng, và lý do sửa từng reply chỉ ra được ảnh hưởng tới khách.

## T2 — giữ phần đã có hiệu quả; không mở thêm hợp đồng tool

Giữ explicit offerType/null, source enums, native signatures, unknown-offer discovery và domain validation. Không thêm SINGLE/ALL/intention enum, không tự ép null thành set hoặc dò chữ khách bằng regex. Giá/tồn/total/policy vẫn lấy từ nguồn hiện hành.

Giữ capability guidance vừa qua. Không thêm dòng cấm CTA, blacklist từ hoặc cảnh báo policy mới. Phần policy ổn được dùng làm regression control khi thay đổi thực sự chạm nó; không sửa để làm đẹp câu theo mẫu.

Không ưu tiên sửa polish giá bằng một tầng code nữa. Lỗi hỏi lại quyết định vẫn cần theo dõi, nhưng không gán toàn bộ lỗi tư vấn cho trường offerType.

Candidate nhỏ cho nhóm giá: chỉ sửa cách diễn giải các mã set trong glossary hiện có thành lời khách hiểu rõ là cả bộ (SET_VAY hiện là bộ có váy). Không suy thêm thành phần/số món từ mã lạ; chỉ diễn giải nghĩa lựa chọn bán đã có. Không đổi tool schema hoặc thêm tham số. Đây là giả thuyết model nhầm tên sản phẩm với lựa chọn mua; chưa được chứng minh, phải so riêng với nhãn cũ. Nếu model vẫn chọn null thì không thêm enum/gate hoặc ép code chọn set.

## T3 — kiểm chứng context cho hai nhu cầu về vẻ ngoài

Trước khi sửa phần tư vấn thêm lần nữa, audit chỉ đọc nguồn sản phẩm và đường media hiện có:

1. Từ11records đã thấy, kiểm ảnh PRIMARY/FRONT/MODEL và các ảnh liên quan để xác nhận đúng product/offer/màu và xem được tổng thể. Kiểm nội dung thực/bytes với source hash; không tự bịa observedAt còn null. Metadata approved không thay việc kiểm đúng input cần đưa cho model.
2. Xác định có tái sử dụng được đường lấy/kiểm ảnh hiện có không, có ảnh đủ rõ để đánh giá thiết kế không. Không tự tạo ảnh, caption, nhãn phong cách hoặc một nguồn tư vấn do evaluator viết.
3. Kiểm tài liệu provider chính thức trước khi thiết kế native image input; ghi đúng MIME, byte/token bounds, identity và cách xử lý ảnh không có/không hợp lệ. Không tự đổi model/effort/retry hoặc âm thầm tăng request bound.
4. Nếu phải xây hệ thống media mới hoặc nguồn không đủ xác nhận, dừng nhánh ảnh và báo prerequisite chưa có. Không tự biến vòng sửa này thành dự án media; không thay bằng thêm ví dụ vào prompt.

Đầu ra là audit ngắn có file/field/source cụ thể và complexity delta. Chỉ làm candidate ảnh khi có thể tái sử dụng đường media và giữ ranh giới hiện có. Đây là phép thử một giả thuyết context, chưa phải yêu cầu ảnh cho mọi câu tư vấn.

## T4 — candidate ảnh, nếu T3 khả thi

Giữ exact owner prompt hiện tại và verifier; chỉ thay việc owner nhận được ảnh sản phẩm đúng nguồn cùng với mô tả. Không vừa thêm ảnh vừa viết lại hướng dẫn tư vấn, nhãn offer hoặc policy.

Code chỉ chuyển ảnh đã xác nhận đúng bound subject, qua đường media hiện có với bounds đã freeze. Không nhận URL tùy ý từ lời khách/retrieved text, không mở SSRF/private media hoặc retrieval riêng cho verifier. Context/source identity giữ ràng buộc với dữ liệu ảnh dùng trong attempt; không giả cùng source khi ảnh thực đã đổi. Nếu existing boundary không thể biểu diễn điều này mà cần thêm lớp mới, quay lại đánh giá scope trước khi viết code.

Owner vẫn tự hiểu khách, chọn hàng/cách phối và viết exact final text. Ảnh giúp nhận xét phần có thể quan sát; không cấp bằng chứng cho độ kín dưới đèn, co giãn, ít nhăn, fit cơ thể, giá/tồn hoặc kết quả kiểm nghiệm. Không suy ra cấu tạo ẩn chỉ từ ảnh. Verifier vẫn chỉ kiểm protected semantics, không chấm gu/giọng/chốt mua; final gate giữ nguyên.

Phần cần đạt ở lời tư vấn: băn khoăn đã biết thực sự ảnh hưởng đề xuất; lý do liên quan tới tổng thể/cách phối đang cân nhắc; không dùng mềm/thoáng làm lời giải chung; có thể chọn set/áo/món khác, không ép một đáp án. Không đưa câu trả lời mẫu cho ca15/17 vào prompt.

## T5 — hai phép thử độc lập, cùng trần18mẫu

Mỗi phép thử chỉ chạy khi phần candidate tương ứng đã khả thi và freeze config/nguồn. Phép thử giá không phụ thuộc việc ảnh sẵn sàng; phép thử ảnh phụ thuộc T3/T4. Reuse native B1 runner và history/tool budget, không tools-OFF replay hoặc framework mới. Explicit eval arm là cấu hình đã đăng ký, không chọn prompt/context theo caseId/rubric trong runtime.

- Phép thử giá: ca4 ×3 mỗi arm =6mẫu. Control giữ nhãn hiện tại; candidate chỉ đổi glossary của T2, không có ảnh hoặc sửa prompt. Hai bên vẫn được đọc đầy đủ options khi thật sự cần.
- Phép thử tư vấn: ca15/17 ×3 mỗi arm =12mẫu. Control text-only; candidate cùng prompt/model/config/history/source text/tools, thêm ảnh đúng nguồn cho owner. Nhãn offer giữ baseline ở cả hai arm, không ghép sửa nhãn vào phép thử ảnh. Giữ canonical trusted source, verifier và final gate tương đương; khác biệt ảnh ở owner là treatment được công bố.
- **Tổng18mẫu, không tăng số lượng so vòng vừa rồi; tối đa72generation requests theo budget hiện tại.** Nếu native image path bắt buộc đổi budget/bounds thì phải ghi lại và freeze trước dispatch, không dùng con số cũ để che thay đổi. Nếu ảnh chưa đủ điều kiện chỉ chạy6mẫu giá sau khi đăng ký chúng, không nhận đã chạy đủ18 hoặc sinh mẫu bù.
- Không có model controls mới ngoài ba ca mục tiêu trong18mẫu này. Dùng deterministic controls hiện có cho partial/unknown source, multi-offer comparison, policy, bounds và bindings trước dispatch; không coi chúng là bằng chứng quality regression toàn B1/B2/B3. Chỉ đăng ký full ở bước sau nếu kết quả nhỏ có ích.

Xen kẽ arm, kiểm nguồn liên quan giữa cặp; ảnh candidate phải có định danh/bytes cố định trong population đăng ký. Nếu không giữ được các nguồn còn lại tương đương, báo giới hạn attribution, giữ attempt và lỗi trong denominator, không sinh mẫu bù. Không biến replay snapshot cũ thành bằng chứng live freshness.

Complete toàn bộ registered attempts; không retry/best-of hoặc sửa giữa run. Đọc actual customer outcome trước diagnosis; chấm cả lựa chọn, lý do, tính hữu ích, giọng và factual/action safety. Không mặc định chọn áo lẻ là đúng, không dùng số ký tự hoặc số tính từ làm quality bar.

Xem hai candidate riêng: nhãn giá cần giảm việc đọc/mở lại lựa chọn không được hỏi; ảnh cần giúp lập luận về trang phục giải quyết băn khoăn tốt hơn một cách lặp lại. Không chỉ đo độ ngắn hoặc PASS, không dùng ảnh để giải thích kết quả của nhãn. Không có lỗi protected mới và các deterministic controls không hỏng. Nếu không thấy lợi ích rõ, không promote và không tự viết tiếp một prompt khác. Full B1/B2/B3 là bước sau khi có evidence hợp lý, không phải kết quả mặc định của phép thử18mẫu.

## Snapshot và regression

Giữ exact final gate; không reuse old PASS khi snapshot thay. Không chạy lại mẫu STALE để thay denominator. Availability limitation hiện tại vẫn ghi rõ. Không claim đã fix việc này vì một run không gặp lại refresh.

Khi thực sự triển khai, dùng focused tests cho owner adapter/media source identity, partial/missing-image behavior, captured request bounds/label firewall, native history và protected controls hiện hữu; worker typecheck/build/lint theo thay đổi. Nếu chạm shared contracts thì chạy focused tests/typecheck/build tương ứng. Không viết test khớp câu chữ prompt để chứng minh chất lượng tư vấn.

## Chưa làm trong lượt lập phương án

Đã đọc metadata nguồn SV2447, chưa xem/kiểm bytes ảnh cho phép thử; chưa xác nhận native-image implementation/bounds. Chưa sửa source/prompt/schema, đăng ký run hoặc gọi model. Kế hoạch này không coi ảnh hoặc nhãn mới là phương án đã chứng minh, không đẩy semantic safety sang ảnh và không hứa vòng sau sẽ đạt.
