# Phase B — vòng model sau contract fix, 2026-10-18

**Đã chạy đủ45lượt ưu tiên; recommendation STOP.** Review toàn lượt: **32USABLE / 2NEEDS_EDIT / 8UNUSABLE / 3ownership controls**. Không chạy16ca còn lại vì nhóm ưu tiên chưa đạt. Không sửa rồi chạy thêm ứng viên sau khi xem kết quả. A vẫn OWNER_BYPASS; đây không phải vòng A2/A3 hoặc bằng chứng A PASS.

Hai hành trình đầu đi qua đủ bốn bước chọn hàng → đổi size/số lượng → hỏi tổng tiền → sửa số đo mà không fallback. Hành trình3 còn lỗi mở giỏ và bị chặn câu xác nhận size. Cả ba đều tới ORDER_PREVIEW rồi PURCHASE_CONFIRMED, đúng giỏ hai áo be L và tổng978.100đ. Thành công ở cuối không xóa lỗi ở lượt trước.

## Nguồn, cấu hình và phạm vi

- implementationBaseSha/main vừa fetch: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake/bản sửa: `7e5cfc61d154a09cda2e9286c1a8b55864ca0921`.
- **bRunSourceSha:** `f21ca3869914c675d716720122f4d06d957ca2b9`, HEAD sạch sau freeze và trước provider generation. Raw savepoint `09ed5415223a52d39780734d1b9740379a45b9f5`; primary review `ca60a6bf65ce912f22e07ccb8968bed4bd9b596b` được commit trước đọc rejected drafts/verdict details. Các commit báo cáo không đổi executable/config.
- Theo [scope đã freeze](SCOPE.md), [bản sửa/test trước run](../contract-fix-20261018/IMPLEMENTATION.md), kiến trúc C3/amendment, `docs/specs/c3-phase-b-execution-20261014.md`, owner bypass20261014 và advisory/chat boundary20261016. Spec/plan snapshot thuộc chính run source trên; không nâng trạng thái A hoặc áp kết quả cũ cho prompt mới.
- Owner: Vertex AI global `gemini-3.5-flash-lite`, version cùng tên, effort HIGH, candidateCount1, output tối đa8192tokens, includeThoughts=false, temperature/topP mặc định provider. Verifier: `gpt-6.1-sol`, version cùng tên, effort High, Codex login qua CLI0.159.2 bounded relay, tools=[], tool_choice=none, store=false, stream=true. Timeout90giây, retry0, một generation HTTP request/invocation; không substitute model.
- Prompt owner `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`; verifier `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Exact configs/schema/corpus/tool/executable hashes: [FROZEN_INPUTS.json](FROZEN_INPUTS.json).
- Mỗi public turn tối đa3owner generations/2vòng tool/6calls/1verifier. Bounds65536owner/32768verifier bytes. Continuation sau tool là generation có đăng ký, không phải retry lỗi.
- Cùng24B1 và7stateful cases. `cases.priority.json` chỉ đổi thứ tự: old slots1/3/5/6/8/17/19/23 lên đầu; deep equality theo caseId được kiểm trước freeze. Chạy8B1×3=24 và3hành trình×7=21, **15ca khác nhau/45outcomes**. Không thêm ca, sửa câu hỏi, đổi nhãn hoặc majority vote.16ca khác NOT_RUN, không được tính PASS.
- Hai native runner processes tối đa, build/import khởi động tuần tự; không thêm agent/model role. Nguồn `LIVE_PUBLIC_WITH_ISOLATED_REGISTRY_DESCRIPTION`: mô tả ứng viên chỉ thay trong eval, các lần đọc live có thể khác world/version. Ba DB stateful riêng đã drop; source PostgreSQL chỉ đọc, delivery capture-only. Không publish nguồn, gửi khách thật, tạo POS thật, merge/deploy hoặc Phase C.

## Review toàn bộ kết quả thực nhận

[45lịch sử, câu thực nhận, state và nhận xét](CONVERSATIONS_AND_REVIEW.md), [primary JSON](CANDIDATE_PRIMARY.json). Đọc cả câu hỏi/lịch sử/public context và kết quả cuối trước trace; không chấm bằng từ khóa hay lấy bản nháp bị loại thay cho câu khách nhận. Đây là review kỹ thuật chủ quan, **ownerAcceptance=null**, không phải tỷ lệ chuyển đổi bán hàng.

| Nhóm | USABLE | NEEDS_EDIT | UNUSABLE | Ownership control |
| --- | ---: | ---: | ---: | ---: |
| 8B1×3 | 16 | 2 | 6 | 0 |
| 3hành trình×7 | 16 | 0 | 2 | 3 |
| Tổng45 | **32** | **2** | **8** | **3** |

16stateful USABLE gồm sáu milestone do code tạo: ba preview và ba tin xác nhận/chuyển nhân viên. Ba control ownership là yêu cầu gặp người thật trong cuộc hội thoại riêng, không có tin trả; không coi là ba hội thoại tư vấn hoặc bằng chứng nhân viên đã phục vụ.

Terminal: **28SEND_ELIGIBLE / 8FALLBACK / 3NO_SEND / 6HANDOFF**. Ba NO_SEND là PRIVATE_CHECKOUT_COMMITTED với preview thực tế đã capture. Sáu HANDOFF gồm ba PURCHASE_CONFIRMED có capture và ba CUSTOMER_REQUESTED_HUMAN không có capture. Không đọc return disposition riêng lẻ để kết luận khách không nhận được tin.

### Tám fallback và nguyên nhân

Khách thực nhận cùng fallback đã freeze `C3_A_NONPROTECTED_V2`: **“Phần này em chưa trả lời được, chị nhé.”** Hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Các trích đoạn dưới là draft bị chặn để chẩn đoán, không phải câu đã gửi.

| Lượt | Draft/hành vi bị chặn | Đối chiếu nguyên nhân |
| --- | --- | --- |
| B1 lần2, old1/new1, đèn sân khấu | “Set Khánh Trang chất thô boi phối ren dày dặn và đứng dáng hơn” | Nguồn có thô boi phối ren/form suông nhẹ, không có so sánh độ dày/độ kín xử lý đèn sân khấu. Owner tự tạo lý do công năng cho mẫu thay; verifier chặn có cơ sở. |
| B1 lần3, old1/new1, đèn sân khấu | “set Khánh Trang chất thô boi phối ren dày dặn và kín đáo hơn” | Cùng loại lỗi ở lần2: suy chất liệu thành kết quả che phủ của món khác. Không phải cấm gợi lớp mặc bên trong hoặc cấm khuyên đổi mẫu. |
| B1 lần2, old5/new3, hỏi váy lẻ | “Mẫu này hiện shop bán theo set nguyên bộ” | `availableOffers=null`, giá/tồn không đọc được; mô tả thiết kế áo+váy không xác nhận shop chỉ bán nguyên bộ. Chặn đúng suy thiếu nguồn thành cách bán. |
| B1 lần2, old6/new4, ngại nhiều chi tiết | “không đính cườm hay bèo nhún rườm rà” | Nguồn chỉ nêu tơ thêu/ren/form nhẹ, không xác nhận sự vắng mặt của cườm/bèo. Lời thuyết phục tự thêm cấu tạo; không phải chặn nhận xét “thanh nhã/không quá điệu”. |
| B1 lần2, old17/new6, đổi dịp gặp khách | “tiết kiệm hơn so với mua lẻ áo (799k cả bộ so với499k áo lẻ)” | So sánh tiền sai: cả set799k lớn hơn áo499k. Upsell cả bộ được phép, còn so tổng cả set với tổng mua hai món rời948k thì đúng. Verifier chặn có cơ sở. |
| Stateful lần3, lượt4, sửa số đo nhưng giữ L | “Chị vẫn lấy size L như vậy là chuẩn ạ!” | State đã sửa74/96 và giữ đúng hai áo L, không có SIZE_FIT. Verifier coi “chuẩn” là bảo đảm fit. Toàn câu cũng có cách đọc là nhận lựa chọn khách, nên **chưa chốt đây là overblock hoặc một lỗi fit chắc chắn**. Khách thực nhận fallback nên primary vẫn UNUSABLE; ranh giới acceptance/fit của câu này còn cần adjudication. |
| Stateful lần3, lượt1, nhận áo be M | apply_customer_state+read_product, rồi read_product(AO), cuối cùng gọi add_to_cart khi mode=NONE | Model dùng hết hai vòng tool để đọc thay vì nhận lựa chọn mua. Lệnh add cuối không được thực thi; còn thiếu màu BE trong args dù khách đã nêu. Tool budget chặn đúng; profile76/98 đã ghi nhưng chưa có giỏ/receipt nên recovery không thể xác nhận mua. Không phải lỗi verifier hoặc thiếu giá/tồn. |
| B1 lần3, old3/new2, ngại ren | Owner generation2 HTTP200, finishReason=MALFORMED_RESPONSE | Adapter trả OWNER_FINISH_REASON/COMPLETION, không có final để verifier kiểm. Đây là lỗi hoàn tất provider, không phải HTTP429/quota hoặc verdict ngữ nghĩa. Không retry, giữ cả lượt trong denominator. |

Sáu FAIL của verifier gồm **năm block có căn cứ rõ và một câu acceptance/fit còn tranh luận**. Không thể gộp cả sáu thành verifier quá chặt; cũng không quy toàn bộ lỗi cho thiếu context. Model đã có dữ liệu để không bịa cách bán, không tạo cấu tạo và không so799k nhỏ hơn499k.

### Hai câu cần sửa và giọng còn máy móc

- B1 old6/new4, lần1: bắt đầu trấn an cả set, chuyển sang váy riêng rồi lại quay về mời nguyên set. Cả đoạn dài, nhiều lời khen, chưa giúp người quen đồ trơn quyết định gọn.
- Cùng ca lần3: có cân nhắc gu đồ trơn nhưng đưa cả áo riêng lẫn váy riêng, hỏi khách chọn lại. Khách đang nhờ shop quyết; không phải thiếu facts hoặc sai vì bán ít hơn nguyên set.
- Partial-source đã trả được chất liệu, nhưng “hệ thống chưa hiển thị/chưa cập nhật” và câu mô tả bê sát nguồn vẫn làm giọng cứng. Lần này ghi là chỉnh văn nhỏ khi cả câu vẫn hữu ích, không tự động FAIL.
- Hai lần nhận giỏ đầu còn “shop đã thêm/cập nhật”; lần2 còn “đặt trước (pre-order)”. Tin xác nhận code vẫn “ghi nhận xác nhận mua hàng”. Luồng đúng nhưng chưa phải giọng bán hàng tốt.
- Stateful lần3 hỏi tổng:978.100đ/ship30.000đ/ưu đãi49.900đ đúng, nhưng dùng “áp mã giảm” trong khi context chưa xác nhận cơ chế mã. Đây là điểm diễn đạt nên đổi thành ưu đãi; không tăng quyền lợi, tiền hoặc tạo bước nhập mã cho khách, nên primary không chấm FAIL chỉ vì một từ.
- Nhắc lại hai số đo vừa được khách sửa là readback có ích. Các ca upsell cả bộ đều có lý do đồng bộ/tách phối, trong ngân sách; không ép mua áo riêng hoặc rẻ nhất mới đạt.

Trong28model PASS đã review không xác định thêm một send-eligible false PASS rõ ràng như bảo đảm đủ kín của vòng trước. Nhận định giới hạn ở frozen tested population/configuration này; không khẳng định an toàn ngoài mẫu hoặc tính ổn định. Câu acceptance/fit bị chặn vẫn để mở, không dùng cách gắn nhãn mới để nâng kết quả.

## So với45lượt ứng viên trước

| Chỉ số cùng nhóm15ca×3 | Trước: bfb82f7f | Vòng này: f21ca386 |
| --- | ---: | ---: |
| USABLE / NEEDS_EDIT / UNUSABLE / controls | 25/2/15/3 | **32/2/8/3** |
| Static fallback | 13/45 | **8/45** |
| HTTP quota/transport error | 5quota+2transport | **0** |
| Completion error | 0 | **1MALFORMED_RESPONSE** |
| Tool-budget fallback | 3 | **1** |
| Verifier FAIL fallback | 3 | **6**, một câu acceptance/fit chưa chốt |
| Bốn bước public đầu hành trình đều hữu ích | 1/3 | **2/3** |
| Preview rồi purchase confirmation | 3/3 | **3/3** |

Đây là cải thiện quan sát, **không đủ quy hết cho prompt/code mới**: vòng trước có quota/transport, lịch sử stateful sau fallback khác nhau và public source có thể đổi theo lần đọc. Không bỏ errors để nâng tỷ lệ, không majority, không coi N=3 là ổn định. Không có lời gửi nhờ receipt recovery trong provider run này, nên chưa có bằng chứng provider activation cho nhánh total-summary mới; nhánh đó có unit/real-PG controls riêng từ bản sửa.

## Finding/root cause và hướng tiếp theo — chưa sửa trong run

1. **Lựa chọn tool vẫn chưa ổn định.** Một lần mở giỏ vẫn đọc hai lần dù khách đã chọn đầy đủ, rồi đưa add khi cấm gọi tool và bỏ màu. Đã bỏ mâu thuẫn size/fit trong prompt nhưng chưa hết lỗi thực thi; không tăng budget hoặc thêm regex để che. Bước tiếp nên đối chiếu contract read_product/sellingOptions và add_to_cart: dữ liệu đầu đã đủ gì, effect tự đọc gì, có hướng dẫn trùng khiến model nghĩ phải đọc lại hay không. Không cần thêm role/gate hay thêm call.
2. **Owner còn dùng lý do bán hàng ngoài dữ liệu.** Khác mẫu → dày/kín hơn; mô tả không nhắc cườm → không có cườm; thiếu offer → chỉ bán bộ. Cần xử lý việc dùng thông tin và suy luận, không nhồi riêng từng câu cấm. Nguồn đặc tính có giới hạn thật; khi không có dữ liệu phải chọn một cách tư vấn/phối hợp hợp lý thay vì tự tạo tính năng.
3. **So sánh giá sai thuộc nội dung tư vấn.** Giá đúng đều có sẵn; vấn đề là so hai giỏ khác nhau rồi gọi rẻ hơn. Giữ quyền upsell và dùng quote/tổng so sánh đúng phạm vi hiện có, không sửa rubric để mọi mua thêm thành sai.
4. **Acceptance/fit còn một câu mơ hồ.** Cần chốt nghĩa toàn lời “vẫn lấy L như vậy là chuẩn” trong ngữ cảnh tự chọn. Không coi riêng từ “chuẩn” là selector, cũng không nới mọi bảo đảm size khi chưa có fit. Current verdict schema chỉ kind/ref, nên nguyên do ngữ nghĩa cụ thể ở trên là reviewer inference, không phải provider explanation.
5. **Giọng và quyết định chưa cải thiện đều.** Quy tắc nói như chat đã có; owner vẫn quay sang bài giới thiệu và liệt kê phương án. Lượt sau nên rà phần nhiệm vụ/trọng tâm so với dạng nguồn mô tả và tool feedback trước khi tăng prompt. Không dùng keyword score hoặc giới hạn số câu cứng.
6. **Provider completion riêng.** Lần MALFORMED_RESPONSE cần giữ finish/accounting để theo dõi; một lần chưa xác định được nguyên nhân gốc phía provider. Không hidden retry hoặc đổi model.

Đây là đề xuất sau đo, không phải implementation/authorization cho vòng tiếp. Không tự nối16ca cuối hoặc sửa rồi chạy lại trong cùng run identity.

## Accounting và vận hành

- **117invocations/117generation HTTP requests =83owner+34verifier**;117HTTP200, không request count unknown, không generation retry. HTTP200 không có nghĩa mọi generation hợp lệ: một owner completion lỗi.
- **34final drafts đều qua verifier**,34exact draft/snapshot bindings;28PASS/6FAIL,28eligible replies đều khớp exact final draft; không model final nào được bỏ verifier nhờ classifier. Code-only preview/confirmation/handoff giữ riêng. Ba private checkout không gọi model.
- Fallback8/45=17,8%; handoff6/45=13,3%; no-send3/45=6,7% với nghĩa capture/ownership ở trên. Không cộng ba tỷ lệ thành tỷ lệ thất bại bán hàng.
- Generation error1/117=0,85%; verifier error0/34, timeout0/34; toàn run timeout0/117. Một unexpected tool call ở NONE được từ chối bằng budget, không phải provider transport error. Không loại lượt lỗi khỏi denominator.
- Verifier latency p50/p95 **5,695/11,002giây**,N34; added verification latency **7,308/14,392giây**,N34. Owner p50/p95 **2,469/5,240giây**,N83. Toàn turn **17,835/44,851giây**,N45, gồm source/DB/relay overhead. Nearest-rank quantiles, không phải SLA production. Added latency có wrapper overhead nên không đồng nhất với thời gian generation.
- Input **516.197tokens**, output **58.738tokens**, coverage117/117requests; giữ thinking tokens theo provider trong [accounting](CANDIDATE_REQUEST_ACCOUNTING.json). Cost **NOT_EXPOSED**, không suy giá từ token.
- Audit68raw hashes, frozen inputs/runtime identity,34bindings và captured provider requests: không quan sát evaluator-only labels hoặc private checkout fixture trong model input. Public runtime projection giữ riêng evaluator data; không xem xét chỉ tên trường ở corpus rồi suy model không leak.
- Ba DB test đã drop, sourceDirty=false ở registration. Không quan sát request auth/quota/transport failure mới, nhưng không đủ kết luận nguyên nhân cũ đã biến mất vĩnh viễn.
- [Metrics](CANDIDATE_METRICS.json), [request accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [trace diagnosis](DIAGNOSIS.json), [runtime](runtime.json), [exact dispatch commands/exits](commands.json).

## Verification, commands và giới hạn

Thực sự chạy trước freeze: `git fetch origin main`; focused adapter/protocol/candidate45PASS, exit0; source readback exit0/0generations; config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED/0generations và stateful preflight PREFLIGHT_PASS/0generations ở sourcef21ca386. Config-only preflight không tự là kiểm connection; các provider journeys mới có read/DB evidence thực.

```powershell
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-source-20261018
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py python C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-preflight.py
python C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-run.py
node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-collect.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-primary-review.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-diagnose.mjs
```

Các command trên exit0. Dispatcher gọi đúng ba stateful provider runs và ba B1 ranges1:8, từng argv/output/exit0 ở commands.json; không có range9:24. Canonical runner builds đã thực sự chạy khi khởi động. Full worker1856Vitest/499NodePASS+2optionalSKIP, worker typecheck/build/lint, protected52và26real-PG controls là evidence của bản sửa7e5cfc61, **không claim chạy lại toàn bộ trong vòng chỉ thu model này**. Xem commands/thời điểm/giới hạn trong IMPLEMENTATION.md trước. Không có remote CI/full-repo pnpm check PASS mới.

Complexity delta của run:0runtime lines/0newrole/0newgate/0newstate/0newretry; chỉ permutation của corpus và evidence/review. Prompt/model/config/policy/tool parameter schemas nguyên vẹn từ7e5cfc61, không có post-result patch. Historical evidence không đổi.16ca còn lại và full-suite behavioral regression **chưa verified**; actual staff service/POS/delivery/live readiness chưa verified. **STOP tại báo cáo này; owner quyết bước tiếp.**

Final reporting checks thực sự chạy, đều exit0: `node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-final-check.mjs` kiểm70JSON/6JSONL/56local links, toàn bộ frozen executable/runtime hashes không đổi, permutation-only, đủ45review và historical evidence nguyên vẹn; `node C:/Users/nguye/AppData/Local/Temp/c3-contract-replay-scan.mjs` kiểm toàn bộ file mới/đổi từ intake,0secret-pattern hits; `git diff --check` exit0. Secret-pattern scan không phải bảo đảm không thể có mọi loại bí mật; private/evaluator input kiểm riêng trên captured requests trong audit.
