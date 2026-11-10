# Candidate corpus — các tác vụ còn thiếu của Phase B

**Implementation update:** đã chạy selected4opening turns, không phải toàn12journeys.3lượt negotiation companion giữ riêng, không tự tính là J07 hoàn tất. [Checkpoint/7actual customer turns/commands](connections-run-20261022/CHECKPOINT_B.md). Candidate JSON giữ nguyên;28slots còn NOT_REGISTERED. Các đoạn0generation bên dưới là lịch sử authoring corpus.

Ngày 22/10/2026. **CORPUS_AUTHORED_NOT_REGISTERED**. [Input JSON](sales-journeys.candidate.json), [kế hoạch đã sửa sau review](../../../../docs/specs/c3-phase-b-missing-capabilities-plan-20261022.md).

Đã chỉnh mạch lời khách thành **12 hành trình, 32 mốc inbound**, mỗi hành trình dự kiến một lần, không retry; bản trước ở commit `6f23a3d3` có44mốc. Đây không phải32lượt model đã chạy hoặc32ca độc lập. Hai mốc có batch ảnh trước/chữ sau; bốn mốc private được sinh bằng fixture trong harness. Có30message literals trong JSON và4private-fixture slots, tức34message slots khi materialize đầy đủ. Chưa có provider registration/request budget và **0 generation** trong lượt sửa này.

Đã bỏ chuỗi yêu cầu chọn lại khi bot có thể đã chọn, chuỗi ba vòng→sửa eo→fit preference và chuỗi set khác size→thêm áo→tăng quantity→xóa. Lời tư vấn/thu thập field thực tế chưa chạy; riêng private fixtures cũng chưa materialize, nên chưa nhận đã chứng minh toàn bộ hội thoại tự nhiên. Không sửa chỉ dẫn/prompt để fit lời khách mới.

Giữ nguyên `cases.b1.json`24ca và `stateful-cases.json`8mốc; không thay baseline, threshold, model, prompt hay kết quả đã khóa. Không tự cộng bộ mới với baseline rồi chạy tất cả nhiều lần.

## Phạm vi và mức sẵn sàng

| Purpose | Journey | Mốc | Phụ thuộc và coverage cần chứng minh |
|---|---|---:|---|
| J01 | Giá từ quảng cáo → chọn giữa hai bộ đi cưới → tồn biến thể | 3 | N3a; N3b còn design prerequisite. Không gọi một tool focus ở round3. |
| J02 | Chọn bộ đi làm → phối áo với jeans có sẵn → hỏi giặt | 3 | Tool đọc/tìm/policy đã có; follow-up cần referent thật, không bắt chọn lại. |
| J03 | Ảnh tổng thể → xem rõ phần thêu → tồn be M | 3 | N4; không xin tiếp loại ảnh đã được gửi hoặc sau khi shop báo không có toàn bộ ảnh. |
| J04 | Gửi ảnh kèm hỏi mẫu → chọn mua riêng áo vì đã có váy | 2 | N5/N6b + existing cart; không gắn thêm ảnh mờ vô cớ hoặc hỏi lại quyền mua riêng đã được trả lời. |
| J05 | Cao/nặng và thích rộng → hỏi màu của size được chọn | 2 | Engine/profile/N2; thiếu số đo thì hỏi đúng, không bắt đổ thêm ba vòng để hoàn thành script. |
| J06 | Một bộ → thêm một áo riêng → tổng hai món | 3 | Native cart đã có; mixed-component/quantity/remove kiểm riêng, không claim journey này đã phủ. |
| J07 | Xin bớt → đổi size kèm hỏi giá → đồng ý lấy | 3 | N7; giá lúc nãy không cần là giá đã giảm. Reprice giữ tier/ledger. |
| J08 | Deadline sáng thứ Sáu ở Cần Thơ → cân nhắc chỗ làm TP.HCM | 2 | Có lý do đổi nơi nhận; freeze clock, cả hai chung transit miền Nam. |
| J09 | Yêu cầu COD → tên → phone → địa chỉ → sửa → xác nhận | 6 | N1/N2; hỏi từng field thực tế, raw private values không vào provider. |
| J10 | Xin QR → biên lai ở item đầu batch | 2 | Existing BANK + N5; xin QR không tự chứng minh confirmation. Giữ HUMAN ownership nếu đã handoff. |
| J11 | Ảnh lỗi đường may → khách nhắn sau handoff | 2 | N5/policy/handoff; text đã qua privacy có thể dùng owner, ảnh private không đưa provider. |
| J12 | Hỏi đơn đã đặt | 1 | Existing handoff; không bịa tracking từ ETA catalog. |
| **Tổng** | **12 hành trình** | **32** | **Candidate, chưa đăng ký chạy.** |

Theo intent của bộ ca: **22 public-model slots**, **2 media-privacy-first slots**, **6 private-code slots**, **1 private/HUMAN-code slot**, **1 HUMAN control**. Public-model slot là cơ hội gọi owner nếu quyền/precheck cho phép, không bắt code phải gọi model khi đã handoff. Media slots không mặc định được gửi ảnh vào model. Các mốc private/control vẫn nằm trong báo cáo terminal outcome nhưng không ép generation để đủ denominator.

## Cách nối vào harness hiện hành

Không có runner mới trong thay đổi này. `run.mjs` hiện cố định24B1; `stateful-provider.mjs`/`isolated-integration.mjs` hiện cố định8mốc và một số source/fixture selection. Chúng **chưa chạy trực tiếp** corpus mới. Offline test xác nhận reader cũ từ chối corpus này thay vì im lặng bỏ attachments/private inputs.

Khi triển khai N8, extend ngay harness/stateful source adapter hiện có theo các bước sau, không copy thành framework/provider runner mới:

1. Chọn các journey có capability đã sẵn sàng; resolve setup từ source đọc thật hoặc fixture domain cô lập có authority. `evaluator.setup` là hướng dẫn harness, không phải trusted fact hay instructions gửi owner. Không seed đáp án search hoặc chọn focus giúp model.
2. `runtime.messages` là batch input chờ materialize thành existing inbound envelope, cấp event/message IDs bằng harness và giữ thứ tự tin. `fixtureRef` phải resolve thành asset thật đã kiểm và được bind source/hash; không phải URL, media identity hoặc input gửi thẳng provider. `runtime.privateFixture` sinh giá trị tổng hợp trong private code path, không serialise placeholder vào lời khách/model.
3. Nhận reply thực tế qua capture transport; chỉ accepted outputs mới vào lịch sử. Không có gold bot text trong corpus. Lượt tiếp theo dùng đúng history/state đã sinh, không dựng câu bot “đã chọn/đã hỏi/đã chuyển” để đi tiếp.
4. `advanceWhen` là điều kiện evaluator/harness dựa actual source/state/output, kiểm trước dispatch. Nếu lượt trước chưa xác định mẫu, chưa hỏi đúng field hoặc đã handoff, ghi dependent turn `NOT_EXECUTED_DEPENDENCY` cùng nguyên nhân; không gán mọi missing field hợp lý thành lỗi bot. Nếu chưa hoàn tất thì ghi đúng giới hạn completion/coverage. Failure của attempt đã dispatch vẫn giữ trong denominator; không dựng bot reply để đi tiếp.
5. Trước mọi follow-up, người review đọc actual accepted reply. Nếu câu sắp hỏi đã được trả lời **đúng và đủ**, dùng `NOT_APPLICABLE` hiện có trước generation, ghi lý do/nội dung đã trả cùng actual slot nguồn; không hỏi lại cho đủ mốc và không cộng thêm một PASS. Câu cũ sai/thiếu không được dùng lý do này để che failure. Không implement keyword classifier hoặc customer-simulator model để quyết định câu sau. Điều kiện source/policy không áp dụng cũng ghi thiếu coverage. Không đổi lời thoại sau khi thấy kết quả; thay source/fixture để exercise nhánh khác phải đăng ký run mới.
6. Freeze selected case IDs, corpus hash, thứ tự field của private fixture, exact clock/deadline, resolved asset hashes, source/config identity, số mốc có thể dispatch và max generation requests trước run. Giữ tối đa3owner+1verifier mỗi public turn theo budget đang có; đây là upper bound, không phải bắt gọi đủ. Embedding/retrieval requests đo riêng, không giấu vào số generation.
7. Giữ runtime projection whitelist: message text, media đã được phép và canonical state/verified evidence. `caseId`, `purposeId`, prerequisites, route, setup, advanceWhen, success/safety/rubric không được vào owner/verifier hoặc image metadata/filename. Unit test hiện tại mới kiểm plain-text wire builders; image/private/end-to-end request capture phải kiểm khi adapter tương ứng đã nối.

Không đổi fixed24/fixed8 manifest để reader nhận file mới rồi báo đã hỗ trợ media/stateful journeys. Không một ca pending nào được substitute model, fabricate source hay simulate model outcome để hoàn tất report.

## Companion regressions: deterministic/DB trước, không nhân thành provider cases

Các trường hợp sau kiểm ranh giới code; viết vào focused tests/harness hiện có lúc triển khai task, không thêm một provider attempt cho mỗi assert:

| ID | Tình huống cụ thể | Kết quả cần kiểm |
|---|---|---|
| D01 | Code vừa hỏi tên; khách: “Khoan, áo này giặt máy được không em?” | Không lưu cả câu làm tên; giữ private handling/clarify hoặc pause hợp lệ, không leak hay mắc kẹt. |
| D02 | Khách dừng checkout rồi quay lại; draft vẫn còn sau preview/HUMAN handoff | Route dựa active stage/clarification, không chỉ draft tồn tại; quyền HUMAN được giữ. |
| D03 | 30dòng lịch sử có nhiều null/private/redacted rows, correction mới, timestamp trùng | Giữ public window đúng bounds/thứ tự; không giả full retention hoặc duplicate latest. |
| D04 | Search hai mẫu ở round1, read hai mẫu round2, final generation mới chọn | Không gọi tool ở round3; không đổi last-read thành focus, không tăng budget. N3b chưa giải được thì báo riêng chưa hoàn thành. |
| D05 | Text+IMAGE source/recipient/permission đổi trước sequence0; media-only hoặc không có ảnh đúng loại | Reuse group gate, đúng disposition, không gửi partial group trái quyền hoặc ảnh thay bừa. |
| D06 | Item1 có biên lai, item2 chữ; replay; HUMAN đã nhận | Staff linkage tới item1/correct conversation, không chỉ trigger item cuối hoặc tạo handoff trùng. |
| D07 | Cùng objection được gọi/replay hai lần, sau đó đổi quantity/size | Một objection có hiệu lực; cart reprice giữ customerState và ledger, preview cũ bị invalidate. |
| D08 | “Bộ này bao nhiêu?” hoặc “Chị không thích màu này” | Không tự phát PRICE_OBJECTION/cấp ưu đãi cho hỏi giá hoặc phản đối màu. |
| D09 | Khách: “Chị đổi địa chỉ đơn đặt hôm qua nhé” hoặc “Đơn chưa gửi thì hủy giúp chị” | Đúng existing handoff reason/context; không sửa giỏ rồi nhận đã sửa/hủy đơn POS. |
| D10 | Ảnh URL lỗi/redirect ra host cấm/quá byte, ảnh không rõ và text độc lập | Không bypass downloader/privacy; giữ phần text đủ nguồn nếu eligible, không nhận đã xem hoặc match chắc chắn. |
| D11 | Profile được bổ sung field engine yêu cầu rồi sửa eo; các field còn lại giữ nguyên | Reuse baseline stateful-correction và grounded-state/size tests; recommendation cũ phải invalid nếu dependency đổi. Không ghép hàng loạt correction vào J05 để ép độ phủ. |
| D12 | Set áo M/váy L, đổi quantity dòng áo riêng rồi remove đúng dòng | Reuse native component/cart regressions, kiểm đúng ref/receipt/tổng. J06 mới chỉ chứng minh luồng hai món khi chạy; unit/domain checks không thay bằng chứng model tự lập chuỗi actions cho các yêu cầu phức tạp. Nếu cần provider capability probe thì đăng ký ca riêng trước run, không thêm ngầm vào hội thoại thường ngày. |
| D13 | Xin ảnh mặt sau, ảnh không chữ/không rõ và source không có đúng góc | Reuse media selection/intake regression; không lấy ảnh mặt trước làm mặt sau. Không nối ảnh thứ hai vào J04 khi khách chưa có lý do gửi thêm. |

Đây là test-design companion, **chưa phải các tests runtime đã viết/chạy trong lượt bổ sung corpus**. Used-policy cases và các control giá/component/source cũ reuse baseline, không nhân bản thành 12×3 mới.

## Review chất lượng và ngôn ngữ

- Chấm toàn hội thoại và terminal khách thực nhận: có giúp chọn/mua hoặc giải quyết đúng bước không; có dùng correction/context; câu có gọn, tự nhiên và sát câu khách hỏi không. Không đếm keyword hoặc cho điểm vì trích đúng vài cụm rời.
- Không đặt một câu trả lời mẫu bắt buộc. Hai lời tư vấn khác nhau có thể cùng tốt nếu đúng nguồn, có lựa chọn hợp lý và bước tiếp theo làm được. Không bắt mọi tin có lời mời chốt.
- Không đánh giá “tự nhiên” từ số test PASS. Mỗi lượt cần có thông tin/câu hỏi/quyết định mới hợp lý theo reply trước; nhiều lượt phủ đủ tool vẫn có thể là script thiếu tự nhiên. Khi chưa có reply thực tế hoặc private fixture chỉ là ref, chỉ kết luận đã review lời khách/mạch dự kiến.
- Chỉ trích dữ kiện khi nó giúp giải thích quyết định hoặc phân biệt lựa chọn. Một số đo liên quan có thể hữu ích; đọc lại cả profile/ngân sách/dịp mặc không tự được cộng điểm.
- Policy là source hiện hành; lời kể “chỉ thử”, “mặc đi làm”, “mới nhận hôm qua” phải được hiểu theo cả câu, không dựa danh sách điều kiện có/thiếu. Handoff đúng vẫn có thể là quality failure khi bot đã đủ dữ liệu trả lời trước mua.
- Kiểm source trước khi chạy: tên hàng/màu/biến thể là yêu cầu của khách, không phải lời khẳng định shop thực sự có. Source thiếu thì giữ đúng outcome/coverage gap, không sửa source hoặc expected để cứu kết quả.

## Verification thực sự đã chạy

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
```

Kết quả: **68 tests PASS**, đã chạy lại sau khi sửa còn32mốc (offline data/projection/adapter tests). Không live source reads, network generation, provider batch, worker build/typecheck/lint hoặc runtime integration run trong lượt này. Đây không phải RED→GREEN cho N1–N8 hoặc chứng minh giọng hội thoại: chưa implement/chạy các tác vụ đó. Private fixtures/assets chưa materialize và adapter multi-journey chưa nối; không claim đã có captured-provider privacy proof cho các đường chưa tồn tại.
