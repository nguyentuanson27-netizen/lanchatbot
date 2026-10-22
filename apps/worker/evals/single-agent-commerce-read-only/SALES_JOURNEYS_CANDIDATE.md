# Candidate corpus — các tác vụ còn thiếu của Phase B

Ngày 22/10/2026. **CORPUS_AUTHORED_NOT_REGISTERED**. [Input JSON](sales-journeys.candidate.json), [kế hoạch đã sửa sau review](../../../../docs/specs/c3-phase-b-missing-capabilities-plan-20261022.md).

Đã viết lời khách cho **12 hành trình, 44 mốc inbound**, mỗi hành trình dự kiến một lần, không retry. Đây không phải 44 lượt model đã chạy hoặc 44 ca độc lập. Một mốc gồm batch hai tin biên lai/chữ; bốn mốc private được sinh bằng fixture trong harness. Có 41 message literals trong JSON và 4 private-fixture slots, tức 45 message slots khi materialize đầy đủ. Chưa có provider registration/request budget và **0 generation** trong lượt này.

Giữ nguyên `cases.b1.json`24ca và `stateful-cases.json`8mốc; không thay baseline, threshold, model, prompt hay kết quả đã khóa. Không tự cộng bộ mới với baseline rồi chạy tất cả nhiều lần.

## Phạm vi và mức sẵn sàng

| Purpose | Journey | Mốc | Phụ thuộc và coverage cần chứng minh |
|---|---|---:|---|
| J01 | Quảng cáo → xem thêm mẫu → chọn → hỏi màu | 4 | N3a; N3b còn design prerequisite. Không gọi một tool focus ở round3. |
| J02 | Tìm bộ đi làm → chọn → tách phối → chăm sóc | 4 | Tool đọc/tìm/policy đã có; cần actual search match và nối multi-turn harness. |
| J03 | Xin ảnh be → mặt sau → chi tiết → hỏi tồn | 4 | N4; asset types/color nguồn phải thật. Stock-out branch không tự tính là exercised khi source còn hàng. |
| J04 | Ảnh không chữ → tìm mẫu → ảnh khác không rõ | 3 | N5/N6b; asset/privacy/retrieval chưa materialize, không chạy giả. |
| J05 | Cao nặng → thêm số đo → sửa eo → thích rộng | 4 | Engine/profile đã có; N2 và chart eligibility/readback. |
| J06 | Set khác size → áo riêng → quantity → bỏ áo → tổng | 5 | Native cart đã có; cần source variant hợp lệ và model choreography trong budget. |
| J07 | Hỏi giá → xin bớt → đổi size → hỏi ưu đãi → mua | 5 | N7; reprice giữ tier/ledger theo engine. Step hỏi ưu đãi chỉ chạy nếu trước đó thực sự có ưu đãi. |
| J08 | Cần Thơ/deadline → sáng thứ Sáu → TP.HCM → phí | 4 | ETA/policy đã có; freeze clock, cả hai địa điểm chung transit miền Nam. |
| J09 | Yêu cầu COD → tên → phone → địa chỉ → sửa → xác nhận | 6 | N1/N2; hỏi từng field thực tế, raw private values không vào provider. |
| J10 | Confirm BANK/QR → biên lai ở item đầu batch | 2 | Existing BANK + N5; giữ HUMAN ownership nếu confirmation đã handoff. |
| J11 | Ảnh lỗi đường may → khách nhắn sau handoff | 2 | N5/policy/handoff; text đã qua privacy có thể dùng owner, ảnh private không đưa provider. |
| J12 | Hỏi đơn đã đặt | 1 | Existing handoff; không bịa tracking từ ETA catalog. |
| **Tổng** | **12 hành trình** | **44** | **Candidate, chưa đăng ký chạy.** |

Theo intent của bộ ca: **33 public-model slots**, **3 media-privacy-first slots**, **6 private-code slots**, **1 private/HUMAN-code slot**, **1 HUMAN control**. Public-model slot là cơ hội gọi owner nếu quyền/precheck cho phép, không bắt code phải gọi model khi đã handoff. Media slots không mặc định được gửi ảnh vào model. Các mốc private/control vẫn nằm trong báo cáo terminal outcome nhưng không ép generation để đủ denominator.

## Cách nối vào harness hiện hành

Không có runner mới trong thay đổi này. `run.mjs` hiện cố định24B1; `stateful-provider.mjs`/`isolated-integration.mjs` hiện cố định8mốc và một số source/fixture selection. Chúng **chưa chạy trực tiếp** corpus mới. Offline test xác nhận reader cũ từ chối corpus này thay vì im lặng bỏ attachments/private inputs.

Khi triển khai N8, extend ngay harness/stateful source adapter hiện có theo các bước sau, không copy thành framework/provider runner mới:

1. Chọn các journey có capability đã sẵn sàng; resolve setup từ source đọc thật hoặc fixture domain cô lập có authority. `evaluator.setup` là hướng dẫn harness, không phải trusted fact hay instructions gửi owner. Không seed đáp án search hoặc chọn focus giúp model.
2. `runtime.messages` là batch input chờ materialize thành existing inbound envelope, cấp event/message IDs bằng harness và giữ thứ tự tin. `fixtureRef` phải resolve thành asset thật đã kiểm và được bind source/hash; không phải URL, media identity hoặc input gửi thẳng provider. `runtime.privateFixture` sinh giá trị tổng hợp trong private code path, không serialise placeholder vào lời khách/model.
3. Nhận reply thực tế qua capture transport; chỉ accepted outputs mới vào lịch sử. Không có gold bot text trong corpus. Lượt tiếp theo dùng đúng history/state đã sinh, không dựng câu bot “đã chọn/đã hỏi/đã chuyển” để đi tiếp.
4. `advanceWhen` là điều kiện evaluator/harness dựa actual source/state/output. Kiểm trước dispatch. Nếu lượt trước không chọn được mẫu, không hỏi đúng field hoặc đã handoff, ghi dependent turn `NOT_EXECUTED_DEPENDENCY` cùng nguyên nhân. Failure của attempt trước vẫn giữ trong denominator; không đổi lời thoại rồi chạy lại hoặc thay thế bằng mẫu tốt hơn.
5. Nhánh không áp dụng từ source/authorized policy (ví dụ không có ưu đãi) ghi `NOT_APPLICABLE` trước generation và ghi thiếu coverage. Không loại một provider error/verifier FAIL sau dispatch dưới nhãn này. Thay source/fixture để exercise nhánh khác phải đăng ký run mới trước kết quả.
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

Đây là test-design companion, **chưa phải các tests runtime đã viết/chạy trong lượt bổ sung corpus**. Used-policy cases và các control giá/component/source cũ reuse baseline, không nhân bản thành 12×3 mới.

## Review chất lượng và ngôn ngữ

- Chấm toàn hội thoại và terminal khách thực nhận: có giúp chọn/mua hoặc giải quyết đúng bước không; có dùng correction/context; câu có gọn, tự nhiên và sát câu khách hỏi không. Không đếm keyword hoặc cho điểm vì trích đúng vài cụm rời.
- Không đặt một câu trả lời mẫu bắt buộc. Hai lời tư vấn khác nhau có thể cùng tốt nếu đúng nguồn, có lựa chọn hợp lý và bước tiếp theo làm được. Không bắt mọi tin có lời mời chốt.
- Chỉ trích dữ kiện khi nó giúp giải thích quyết định hoặc phân biệt lựa chọn. Một số đo liên quan có thể hữu ích; đọc lại cả profile/ngân sách/dịp mặc không tự được cộng điểm.
- Policy là source hiện hành; lời kể “chỉ thử”, “mặc đi làm”, “mới nhận hôm qua” phải được hiểu theo cả câu, không dựa danh sách điều kiện có/thiếu. Handoff đúng vẫn có thể là quality failure khi bot đã đủ dữ liệu trả lời trước mua.
- Kiểm source trước khi chạy: tên hàng/màu/biến thể là yêu cầu của khách, không phải lời khẳng định shop thực sự có. Source thiếu thì giữ đúng outcome/coverage gap, không sửa source hoặc expected để cứu kết quả.

## Verification thực sự đã chạy

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
```

Kết quả: **68 tests PASS** (offline data/projection/adapter tests). Không live source reads, network generation, provider batch, worker build/typecheck/lint hoặc runtime integration run trong lượt này. Đây không phải RED→GREEN cho N1–N8: chưa implement các tác vụ đó. Private fixtures/assets chưa materialize và adapter multi-journey chưa nối; không claim đã có captured-provider privacy proof cho các đường chưa tồn tại.
