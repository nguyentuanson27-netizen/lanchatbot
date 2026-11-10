# Phase B — review năm vòng full gần nhất và root cause

Ngày review: 2026-10-27. Source đang kiểm tra: `b7e197d8877c4643fba2f86121ac1f8ec87af21d`.

Đây là review offline theo yêu cầu owner. Không sửa runtime/prompt, không chạy generation mới, không đổi policy, không deploy. Đọc đối chiếu 51 case ID giống nhau qua năm campaign, gồm lịch sử, reply/draft, terminal và capture; kiểm sâu actual provider requests/tool results/source tại các điểm bất thường. Không gọi reviewer độc lập trong lượt này.

## 1. Phạm vi và cách đọc số liệu

Các thư mục dưới `apps/worker/evals/single-agent-commerce-read-only/`, theo thứ tự thời gian:

| Vòng | Thư mục | Run source | SEND_ELIGIBLE / HANDOFF / NO_SEND | Generation requests | Generation errors | Ảnh thực tế |
|---|---|---|---|---:|---:|---:|
| 1 | compact-native-full-run-20261026 | 50753ec7aab3d7365fdabc2e2c71152c448719ea | 36 / 11 / 4 | 140 | 0 | 7 |
| 2 | media-size-context-run-20261027 | 0ef9991a578e8da33f9bfbd4f81a86765380fe9f | 37 / 10 / 4 | 143 | 2 | 7 |
| 3 | media-size-context-repeat-run-20261027 | 4efbea67356f1e3e4f7fa886dec48d58c4ab1474 | 37 / 10 / 4 | 143 | 0 | 3 |
| 4 | quote-completion-run-20261027 | 342ef0cff2888908518872f707ea33ede0f9c290 | 37 / 10 / 4 | 141 | 0 | 9 |
| 5 | quote-completion-repeat-run-20261027 | bb87949347bc8c1b3f28d41a475f57202824e83a | 36 / 10 / 5 | 138 | 1 | 7 |

Tổng: 255 native outcomes, 85 control attempts và 705 generation requests trong đúng năm campaign hoàn tất này. Không bao gồm campaign bị chặn môi trường trước vòng 1; không phải tổng usage của toàn bộ lịch sử C3.

Cả năm: owner Gemini 3.5 Flash Lite HIGH, verifier GPT-6.1 Sol HIGH, Compact V2, mỗi ca một lần/campaign, generation retry 0. Verifier prompt SHA256 không đổi: `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`.

Owner prompt SHA256: vòng 1 `71292eea99022f78c3ba5264eb4de6c8394dd2f345eb80bacb10a933c4e8e8db`; vòng 2–3 `ecc60d49142849d34263471bb8b9a14d54d33747a0ef078af64d308ed947dff6`; vòng 4–5 `a9fdb61fcbdbb26e2b79a1e70e0cb6637d0ed265ebe6f191f4971c98b8cc1ce1`.

SEND_ELIGIBLE không phải điểm bán hàng. NO_SEND của model path cũng không đồng nghĩa khách không nhận gì: cả năm, `stateful-request-checkout` có câu hỏi thông tin nhận hàng do code gửi; `stateful-private-checkout` có preview do code gửi. Hai lượt follow-up khi HUMAN đã sở hữu chat không gửi là đúng. Capture có nội dung ở 38 / 39 / 39 / 39 / 38 lượt; đây cũng không phải tỷ lệ chất lượng đạt.

Nhãn review lịch sử thay đổi giữa các vòng, nên không lấy số USABLE cũ làm cùng một thang điểm mới. Snapshot/time/source khác nhau; các cặp lặp N1 chưa phải thí nghiệm chứng minh riêng tác động của một thay đổi.

## 2. Root cause chính: owner chưa hoàn tất quyết định nghiệp vụ trước khi kết thúc lượt

### 2.1. Tìm món không giữ ràng buộc ngân sách đến bước chọn

Case `sales-discovery-advice:need`: khách tìm bộ đi làm dưới một triệu, không bó bụng.

- Vòng 1 đọc nhiều mẫu, chọn SQ748 giá 799k, rồi nói “không lo bị bó bụng” dù chưa có SIZE_FIT. Verifier PASS; xem phần 5 về ranh giới nghĩa.
- Vòng 2–3 đọc được các lựa chọn dưới ngân sách nhưng thêm bảo đảm không bó/cấn bụng; verifier FAIL và handoff.
- Vòng 4–5 search “bộ công sở đi làm”, chỉ đọc SQ675 giá 1.279.000đ rồi gọi PRICE_UNAVAILABLE. Actual final owner wire có PRICE 1.279.000đ và availability.price=OK. Không có draft/verifier ở hai lượt này.

**Quan sát chắc chắn:** hai vòng cuối không phải thiếu giá của mẫu vừa đọc. Owner dừng trước khi hoàn thành chọn món phù hợp, rồi dùng reason thiếu dữ liệu để kết thúc. Không được báo đây là lỗi độ vừa đã được sửa.

**Cơ chế góp phần:** search trả ref/mô tả/phần bán; giá phải được xác minh qua read_product. Owner phải tự giữ ngân sách qua chuỗi search → đọc các ứng viên → loại mẫu vượt ngân sách → chọn. Tool hiện không cung cấp một kết quả ứng viên đã được kiểm giá theo ngân sách ngay ở search. Tuy nhiên, không có bằng chứng ngân sách tool khiến việc đọc các ứng viên khác là bất khả thi; ở vòng 1 owner đã đọc nhiều mẫu.

### 2.2. Bỏ lợi ích có sẵn khi xử lý phản đối giá

`negotiation-price-objection`: cả năm có kết quả hỗ trợ ship 30k, grand total 499k. Vòng 1 và 3 dùng lợi ích này ngay khi khách xin bớt; vòng 2, 4, 5 bỏ qua, nói giá niêm yết hoặc giới thiệu mua hai món giảm 5%. Đến câu hỏi tổng tiền kế tiếp, cả năm lại giải thích đúng ưu đãi 30k.

**Root cause có bằng chứng:** dữ liệu nghiệp vụ đã được tạo và đã nằm trong request; owner không chọn đúng kết quả vừa có để giải quyết phản đối hiện tại. Không phải engine chưa tính ưu đãi. Bán thêm không tự là lỗi; bỏ lợi ích đang áp dụng làm lời bán hàng yếu và thiếu nhất quán.

## 3. Handoff kiểm đúng quyền bàn giao nhưng chưa chứng minh đúng lý do thiếu dữ liệu

`sales-southern-delivery:deadline`: bốn vòng đầu đọc được ETA và trả lời không nhận hẹn sáng mai. Vòng 5 gọi ETA_UNAVAILABLE ngay generation đầu; không read_product/read_policy, verifier 0. Actual request còn công cụ đọc và ETA đang là NOT_READ. Không thể dùng ETA cũ làm bằng chứng hiện hành, nhưng cũng không thể gọi lượt này là đã xác minh nguồn thiếu ETA.

Source `single-agent-commerce-handoff.ts`: request nhận enum reason, kiểm authority/state/policy rồi commit. `selectCommerceHandoff` tạo evidence INBOUND_MESSAGE; nhánh này không bắt buộc một kết quả đọc thất bại tương ứng với PRICE_UNAVAILABLE hoặc ETA_UNAVAILABLE. Các source checks của reply binding bảo vệ nội dung/commit, không tự chứng minh owner đã tra field đang báo thiếu.

**Root cause ở phân công model–code:** model vừa tự quyết “thiếu”, vừa chọn reason kết thúc; code bảo đảm handoff có quyền và được commit đúng, nhưng chưa phân biệt chưa đọc với đã đọc mà không có. Bởi vậy nhắc thêm “chưa đọc thì dùng tool” trong prompt không tạo bảo đảm thực thi.

Handoff thật vẫn cần giữ nguyên: khách yêu cầu, thao tác đổi/trả cần xử lý, nguồn shop thật sự thiếu, hoặc dependency failure. Không đổi quy tắc owner đã duyệt: handoff im lặng, không kèm reply. Hướng cần xem xét là căn cứ thực thi gắn đúng loại reason/subject/field và trạng thái nguồn; không dựng bộ regex đoán ý khách, không cấm handoff chung.

## 4. Thiếu dữ liệu ảnh là một nhóm riêng, không sửa được bằng giọng tư vấn

Ba ca xin feedback và một ca xin ảnh màu be không có bằng chứng asset đúng yêu cầu trong phạm vi nguồn đã kiểm, lặp qua năm vòng. Tức 20 outcomes của bốn loại yêu cầu lặp, không phải 20 lỗi dữ liệu khác nhau. Chưa có audit registry upstream trong các lượt này để kết luận ảnh thực tế hoàn toàn không tồn tại hay chỉ thiếu metadata/mapping trong nguồn được expose.

Ba ca `b1-partial-source*` mỗi vòng là fault injection POS_UNAVAILABLE có chủ đích. Không gộp 15 slot đó thành 15 ca dữ liệu shop thật bị thiếu. Vòng 2 có hai OWNER_TOOL_OUTPUT; vòng 5 có một OWNER_TOOL_OUTPUT trên nhóm này: lỗi output/adapter và nguồn bị fault là hai sự kiện khác nhau.

**Việc cần làm khác prompt:** kiểm nguồn asset, metadata loại ảnh/component/color, đường import và mapping đến đúng PRODUCT. Khi chưa có căn cứ thì handoff đúng quy tắc; không thay feedback/ảnh đúng màu bằng ảnh chung.

## 5. Ranh giới verifier chưa ổn định ở các cách diễn đạt gần nhau

Discovery vòng 1 có “lưng chun thoải mái, không lo bị bó bụng”, PASS. Vòng 2–3 có “mặc thoải mái không lo bó bụng”, FAIL với lý do chưa có fit cá nhân. Actual verifier requests của cả ba không có SIZE_FIT; prompt verifier cùng hash.

**Kết luận được phép:** các lời khuyên gần nghĩa đang được xử lý khác nhau; verifier PASS không chứng minh phần tư vấn này đã ổn. Vòng 1 còn xin chiều cao/cân nặng ở cuối, vòng 2–3 giới thiệu nhiều mẫu và cách đặt lời bảo đảm khác nhau. Không phải exact-draft repeated trial, nên chưa thể tách khác biệt ngữ cảnh khỏi variance model hoặc tuyên bố cứ cùng một câu sẽ cho kết quả ngẫu nhiên.

Phải giữ phân biệt owner đã duyệt: tư vấn phong cách/cảm giác định tính được phép, không cần thêm phép thử cho mọi tính từ; kết luận độ vừa của chính khách vẫn theo SIZE_FIT. Không dùng finding này để siết mọi suy luận chất liệu hoặc yêu cầu thêm tiếng dè dặt. Muốn kiểm độ ổn định cần dùng cùng draft, cùng trusted context và cùng ranh giới được duyệt; không thêm ví dụ riêng theo case để cứu điểm.

## 6. Lỗi code mới đã làm sai envelope báo cáo sau recovery

Vòng 5 `b1-partial-source-v3`:

1. Owner request có HTTP200/STOP nhưng adapter báo OWNER_TOOL_OUTPUT; telemetry còn 1 request, input 7842/output 2567, thinking 2540 đã gồm trong output.
2. Recovery thực tế có HUMAN/event/tag; không gửi khách.
3. Sau đó TOOL_WORK_COUNTER làm harness thay result bằng NO_SEND/ATTEMPT_UNAVAILABLE tối thiểu, mất generations và counters trong envelope. Accounting request/token được phục hồi từ log; counters runtime gốc vẫn UNKNOWN.

Source path: `runCommerceTurn.finish` chốt executedToolInvocations. `single-agent-commerce-ingress.ts` recovery sau đó tăng terminalHandoffCalls/toolCalls nhưng không cập nhật executedToolInvocations. `isolated-integration.mjs` gọi `validateToolWorkAccounting`, rồi catch ngoại lệ bằng envelope tối thiểu.

Đã chạy kiểm tra offline dùng validator hiện hành: envelope V2 tổng hợp hợp lệ được chấp nhận; áp đúng hai cập nhật counter của ingress thì validator ném TOOL_WORK_COUNTER. Đây là kiểm chứng invariant bằng dữ liệu tổng hợp, **không phải replay bộ đếm gốc hay reproduction end-to-end**.

Recovery tests hiện có gọi fixture không bật quoteTask và kiểm các bộ đếm cũ. Quote tests kiểm V2 ở nhánh tác vụ trước finish. Các đoạn test đã kiểm tra không bao phủ giao điểm V2 × recovery sau finish. Đây là giải thích có căn cứ cho việc test xanh mà path mới vẫn lỗi, không phải kết luận toàn bộ test suite vô dụng.

Hướng sửa đúng: chốt accounting sau toàn bộ recovery, hoặc cập nhật nhất quán từ proof của thao tác thực tế; giữ envelope/telemetry đã có khi invariant lỗi. Không bỏ validator, không tự điền counters UNKNOWN cho báo cáo đẹp hơn. Raw completion chưa được giữ đủ để chỉ ra chính xác field/enum nào gây OWNER_TOOL_OUTPUT; điểm này chưa có root cause hoàn chỉnh.

## 7. Vì sao giọng và sức thuyết phục vẫn lặp

`b1-buying-concern` qua cả năm vẫn đi theo “ren mềm/rũ → thanh thoát/nhã nhặn → không rườm rà → vừa ngân sách”. Khách lo nhiều chi tiết; câu trả lời chủ yếu thay cảm nhận đó bằng lời khen, chưa giải thích hoặc hướng phối thật cụ thể để khách yên tâm chọn.

`b1-buying-concern-v3` có lúc chọn áo dựa trên chân váy đen khách có, có lúc mở lại cả hai phương án rồi hỏi khách chọn. Vòng 5 khá hơn ở lập luận dùng lại đồ có sẵn. `b1-changed-occasion-v3` vòng 3–4 vẫn kéo thêm tiệc tối dù khách đã đổi sang gặp khách hàng buổi sáng; vòng 5 tập trung hơn và nêu khoản trả thêm. Chọn cả bộ không tự sai, chọn áo không mặc nhiên đúng: phải xét lý do cho lựa chọn và toàn reply.

Prompt hiện hành đã ghi mục tiêu bán hàng, không phủ nhận băn khoăn bằng lời khen, không chép chất liệu thay lời khuyên, không hỏi lại cùng quyết định. Các dữ kiện lịch sử liên quan cũng đã có trong request. Vì vậy không có căn cứ nói chỉ thiếu một dòng “tư vấn tự nhiên” hay cần thêm một nguồn context chung.

**Phân tích cơ chế, chưa phải thí nghiệm nhân quả:** mô tả catalog vốn nhiều ngôn ngữ quảng cáo tạo nguyên liệu dễ chép; nhiệm vụ yêu cầu owner đồng thời hiểu nhu cầu, lập tool chain, phân biệt evidence và viết bán hàng. Hành vi thực tế thường dừng ở lời giải thích an toàn từ phần mô tả quen thuộc. Sửa thêm câu cấm/tính từ dễ đổi bề mặt mà không làm owner hoàn tất quyết định. Năm lượt này không chứng minh năng lực tiếng Việt của một model nói chung hoặc chứng minh độ dài prompt là nguyên nhân duy nhất.

## 8. Điều đang hiệu quả và thứ tự xử lý tiếp

**Có tiến bộ cụ thể:**

- Co-location inputFitPreference/alternativeSizes: ca height-weight vòng 1 tự thêm L ngoài kết quả M; vòng 2–5 dùng đúng M.
- Tác vụ quote_product gom đọc giá + chọn ảnh thành công việc rõ ràng: vòng 3 thiếu ảnh hai ca opening; vòng 4–5 cả ba ca opening bắt buộc đều có hai ảnh. Sáu quan sát N1 ở hai campaign chưa phải bảo đảm tuyệt đối.
- Media-decision vòng 1 tự tạo phụ thuộc ảnh rồi handoff; vòng 2–5 đã tư vấn được. Ảnh tùy chọn 9 → 7 giữa hai vòng cuối không phải ảnh báo giá bắt buộc bị mất.
- Giá/thành phần/tổng giỏ, sửa size/số lượng, correction state và policy hiện hành giữ được qua năm lượt. Checkout hỏi dữ liệu riêng và preview do code xử lý; handoff xác nhận mua và khách xin người xử lý vẫn đúng. Không dùng lần review này để viết lại những phần đó.

**Thứ tự đề xuất:**

1. Sửa lỗi counter/envelope, kiểm giao điểm V2 × recovery; đây là lỗi xác định được ở code.
2. Làm rõ căn cứ của handoff do thiếu field và kiểm riêng lựa chọn ứng viên theo ngân sách/đọc dữ liệu; giữ handoff nghiệp vụ cần thiết.
3. Audit/mapping đúng bốn nhu cầu ảnh thiếu evidence, không tiếp tục chạy lại cùng ca để mong xuất hiện ảnh.
4. Kiểm riêng owner sử dụng kết quả vừa có: ưu đãi hiện tại, so sánh khoản trả thêm, đổi nhu cầu. Giữ scope vào quyết định bán hàng; không mở vòng sửa giọng toàn prompt.
5. Với các ranh giới verifier có bằng chứng chưa nhất quán, kiểm trên snapshot/draft cố định trước khi quy cho một bản prompt mới tốt hơn.

Không nên chạy full tiếp với cùng nguồn lỗi chưa được xử lý; không thêm regex/template từng ca, không rewrite context toàn bộ lần nữa khi chưa thấy mất dữ kiện cụ thể, không dùng số eligible thay cho chất lượng bán hàng. Root cause không nằm ở một lớp: **owner dùng dữ liệu/lập chuỗi hành động chưa ổn, code chưa ràng buộc đủ căn cứ cho lý do handoff, một số evidence ảnh thiếu, và recovery/accounting có bug độc lập**.

## Bằng chứng và giới hạn

- Mỗi run: REGISTRATION.json, REVIEW_METRICS.json, ACTUAL_TERMINALS.json, CONVERSATIONS.md, WHOLE_TURN_REVIEW.json.
- Ledger đối chiếu 255 kết quả: `c3-phase-b-five-run-rootcause-evidence-20261027.json`, chỉ ID/hash/count/ref; không chép input checkout riêng.
- Actual requests/tool results: raw campaign folders tương ứng; `OWNER_DECISION_DIAGNOSIS.json`, `RECOVERY_COUNTER_DIAGNOSIS.json` vòng 5.
- Corrigendum đã tách nguồn thật/fault và xác nhận wire có dữ liệu: `c3-phase-b-quote-completion-corrigendum-audit-20261027.md` cùng ADVICE_WIRE_LEDGER.json, MEDIA_EVIDENCE_LEDGER.json.
- Kiểm trong lượt review: đọc/đối chiếu JSON cả năm; xác nhận cùng 51 case ID; kiểm metric/count/hash; đọc source handoff/recovery/search/test; chạy synthetic validator check. Không chạy worker test/build/lint lại và không claim kết quả mới cho các lệnh đó.
