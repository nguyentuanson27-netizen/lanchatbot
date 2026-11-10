# Phase B — offer projection fix, kết quả 2026-10-18

**Đã sửa và thu đủ45lượt; recommendation STOP.** Review actual outcome: **32USABLE / 1NEEDS_EDIT / 9UNUSABLE / 3ownership controls**. Không chạy16ca còn lại vì nhóm ưu tiên chưa đạt. Tổng lượt dùng được không tăng so với vòng trước; hành trình thứ ba không tạo được giỏ, nên chỉ2/3hành trình tới preview và xác nhận mua. Không patch hoặc mở candidate thứ hai sau kết quả. A vẫn OWNER_BYPASS, đây không phải A2/A3 qualification hoặc A PASS.

## Bản sửa và nguồn chạy

- Main/implementationBaseSha vừa fetch: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake `bca8805e8c7d21f17de63f0dd0d7008686dfec90`.
- Theo [kế hoạch đã tích hợp independent REVISE](../../../../../docs/specs/c3-phase-b-offer-projection-fix-plan-20261018.md), [scope trước provider](SCOPE.md) và [implementation/RED→GREEN/commands](IMPLEMENTATION.md).
- Code savepoint `cf137da4e8f518a578ea3870a972947dcf518b14`: chỉ owner adapter projection và declaration `read_product`. Gộp root default trùng hoàn toàn vào đúng option trong cùng response; giữ partial/explicit/unknown/version/time/scope/value/availability/ETA khác biệt và native identities/signatures. Không đổi tool parameter schemas, source resolver, protected claims, state/effects/receipts hoặc final gate.
- **bRunSourceSha:** `b3107465e43d0ff12ee341144a792b12f84c07f3`, clean sau freeze, trước preflight/generation. Raw savepoint `3a89caefd48cb297bbfa3947b6ada51895f2170b`, primary `5fa86bfe5db7c8da984c89ccc350f6a0e6bf02e1` trước rejected-draft/verdict diagnosis. Các commit report không đổi executable/config.
- T2: giữ **cả hai prompt nguyên byte**. Owner hash `d5ce738518816d3fabc4c6d0dd13ab362b2cea0deba0e0b71afae2b02ba0cbde`, verifier `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. [Exact frozen config/file/declaration/corpus hashes](FROZEN_INPUTS.json).
- Owner: Vertex AI global `gemini-3.5-flash-lite`, version cùng tên, effort HIGH, candidateCount1/output8192/includeThoughts=false/temp-topP mặc định provider. Verifier: `gpt-6.1-sol`, version cùng tên, High, existing Codex login/CLI0.159.2 bounded relay, tools=[], tool_choice=none/store=false/stream=true. Timeout90s/retry0/một upstream generation request mỗi invocation. Không substitute model/provider.
- Giữ3owner generations/2tool rounds/6calls/1verifier mỗi public turn, wire bounds65536/32768bytes. Continuation sau tool là generation đăng ký, không phải automatic generation retry hoặc repair/reverify role.
- Dùng nguyên corpus priority có sẵn:8B1×3=24 và3hành trình riêng×7=21, **45outcomes/15unique cases**. Không đổi câu hỏi, labels, runtime, sourceMode hay permutation.16B1 khác NOT_RUN, không tính PASS.
- Cùng nguồn live public với isolated registry description hiện có; không publish dữ liệu. Source per-read có thể khác world/version. Native processes tối đa2, serialized build/import startup. Ba disposable DB đã drop, source PostgreSQL chỉ đọc, capture-only delivery. Không live customer/POS action, production wiring, deploy/merge hoặc Phase C.

## Review toàn bộ câu khách thực nhận

[45lịch sử/câu trả/state/nhận xét](CONVERSATIONS_AND_REVIEW.md), [primary JSON](CANDIDATE_PRIMARY.json). Đã đọc actual outcome và public context trước trace; không chấm bằng từ khóa hoặc thay fallback bằng draft bị chặn. Review kỹ thuật có tính chủ quan, ownerAcceptance=null; không phải tỷ lệ chuyển đổi bán hàng.

| Nhóm | USABLE | NEEDS_EDIT | UNUSABLE | Ownership control |
| --- | ---: | ---: | ---: | ---: |
| 8B1×3 | 20 | 1 | 3 | 0 |
| 3hành trình×7 | 12 | 0 | 6 | 3 |
| Tổng45 | **32** | **1** | **9** | **3** |

Terminal: **29SEND_ELIGIBLE / 7FALLBACK / 3NO_SEND / 6HANDOFF**.29eligible gồm28model PASS và một code recovery summary; không gọi summary đó là verifier PASS.12stateful USABLE gồm7model replies,1code recovery và4code preview/confirmation milestones. Ba human-request controls tách khỏi chất lượng tư vấn và bằng chứng nhân viên thật nhận việc.

Hai NO_SEND là PRIVATE_CHECKOUT_COMMITTED nhưng có preview capture; NO_SEND thứ ba là CURRENT_AUTHORITY_CHANGED, không có tin ở hành trình3. HANDOFF gồm2PURCHASE_CONFIRMED có capture,1DEPENDENCY_FAILURE không có preview/tin và3CUSTOMER_REQUESTED_HUMAN controls không có tin. Không cộng các disposition này để gọi chung là tỷ lệ fallback hoặc tỷ lệ handoff thành công.

### Bảy fallback và hai bước mua không hoàn tất

Mọi static fallback dùng đúng `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”, hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`.

| Lượt | Diễn biến quan sát được sau primary |
| --- | --- |
| B1 sân khấu, lần1 | Draft nói mặc áo hai dây nude “để đảm bảo kín đáo” dưới đèn mạnh. Verifier FAIL về SV2447. Đây là kết quả che phủ chưa được nguồn chứng minh; không phải chỉ gợi thêm lớp mặc. |
| B1 sân khấu, lần2 | Draft gợi áo hai dây nude “cho kín đáo”, rồi đề nghị đổi mẫu. Verifier FAIL về SV2447. Cần adjudicate cả đoạn: có cách đọc là mục đích phối lớp thông thường được owner cho phép, chưa chắc là bảo đảm đã giải quyết độ kín. Kind/ref không giải thích chính xác phần nào bị coi sai; chưa chốt overblock hoặc block đúng chỉ từ một cụm từ. Actual fallback vẫn giữ UNUSABLE. |
| B1 sân khấu, lần3 | Owner tìm thêm váy Diệp An V168 có nguồn nêu2lớp/kín đáo, rồi đề xuất cho sân khấu. Verifier FAIL cả SV2447 và V168. Nguồn có căn cứ độ kín chung, chưa riêng đèn mạnh; phải phân biệt gợi một món có lớp với cam kết giải quyết ánh sáng cụ thể. Đây còn là ranh giới nghĩa cần review, không ghi như lỗi bịa lớp lót chắc chắn. |
| Stateful lần3, mở giỏ | apply_customer_state+read_product, sau đó recommend_size dù khách đã chọn M; cuối cùng add dưới NONE, còn đưa thêm variantId ngoài schema. Add không chạy, không có giỏ/receipt; giữ BUDGET fallback. |
| Stateful lần3, đổi L/lấy2 | Read lại sản phẩm rồi add với color=null dù lịch sử có be. Tool SELECTION_UNAVAILABLE; model sửa BE ở generation cuối nhưng mode=NONE nên không được thực thi. |
| Stateful lần3, hỏi tổng | Lại read rồi add color=null; không có cartQuote vì giỏ chưa tạo. Sửa BE quá muộn dưới NONE, vẫn fallback, không có tổng trả khách. |
| Stateful lần3, sửa số đo | Profile đã sửa74/96, nhưng lại add color=null rồi cố sửa BE dưới NONE. Profile đúng không hoàn thành yêu cầu mua; vẫn không có giỏ. |
| Stateful lần3, checkout riêng tư | Không có cart/preview sau bốn lượt trên; HANDOFF DEPENDENCY_FAILURE, capture rỗng. Fail-closed đúng boundary, không hoàn thành việc mua. |
| Stateful lần3, xác nhận mua | Không có preview và authority hiện tại không cho tiếp tục; NO_SEND CURRENT_AUTHORITY_CHANGED, không capture hoặc purchase confirmation. Không loại downstream này khỏi denominator. |

Như vậy **7static fallback=3verifier FAIL+4tool-budget failures**; hai UNUSABLE còn lại là downstream checkout/confirmation. Không có quota/transport/completion error ở provider trong run này. Hai verdict sân khấu còn tranh luận không được tự đổi PASS, sửa corpus label hoặc chạy lại để lấy kết quả khác.

### Recovery và những lỗi không thành fallback

- Lần1 mở giỏ đã commit đúng áo be M, nhưng owner gọi quote_cart dưới NONE thay vì dùng cartQuote đã có. Existing code recovery gửi **“Em đã thêm món chị chọn vào giỏ. Tổng529.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé.”** State/receipt/current-source readiness cho phép summary này; actual outcome USABLE dù owner tool planning vẫn lỗi. Đây là activation thực tế đầu tiên của summary trong provider evidence mới, không phải model viết hay verifier PASS.
- Lần2 đổi giỏ: một CART_LINE ref bị model gõ thiếu đoạn, tool SUBJECT_REF từ chối; model dùng đúng ref trong continuation còn lại và hoàn tất hai áo L. Không sửa enum/parser để nhận ref sai, không tự replay effect đã commit. Cả hai generations được tính vào115requests.
- Lần1 đổi giỏ nói “Chị đã đổi áo…” nghe như trạng thái hệ thống. Tuy vậy reply vẫn xác nhận đúng lựa chọn/số lượng/tổng/preorder; primary ghi điểm chỉnh giọng, không tự động FAIL chỉ vì một cách xưng.
- B1 partial-source lần1, old19/new7: trả được chất liệu/giới hạn giá-tồn nhưng xin size hoặc mời chuyển mẫu. Size không khôi phục nguồn thương mại đang thiếu; đây là **NEEDS_EDIT về bước tiếp**, không chỉ vì chữ “hệ thống”.
- Các reply concern vẫn dài và nhiều lời khen, nhưng lần này có phương án ưu tiên/đánh đổi rõ hơn ở những câu được review USABLE. Không ép chọn áo riêng hoặc rẻ nhất, không đánh FAIL chỉ vì có phương án phụ. Nhắc hai số đo vừa sửa vẫn là readback hữu ích. Một số gợi phối mặc định khách có quần/váy khác là điểm nên nói có điều kiện, không nâng thành shop fact.

Không xác định thêm một send-eligible protected false PASS rõ ràng trong28model PASS đã đọc. Đây chỉ là quan sát trên frozen tested population/configuration; không phải bảo đảm ngoài mẫu hoặc adjudication những verdict bị chặn.

## Giả thuyết projection đã được đo ra sao

Captured84owner request bodies có28multi-offer response occurrences; **28/28occurrences đã bỏ root defaults và giữ sellingOptions**. Đây là số lần xuất hiện trong wire, không phải28tool calls độc lập. Binding audit giữ nguyên facts của owner và verifier; unit controls bảo vệ khác version/scope/expiry/partial/native parts. Bản sửa thực sự được kích hoạt, không chỉ code chưa được dùng.

Tuy vậy **cả ba opening vẫn read_product trước add**; lần3 chuyển sang recommend_size thừa, lần1 còn quote thừa. Vì thế chưa có bằng chứng gộp root chữa lựa chọn tool. Context rõ hơn không tự sửa được việc mất màu đã nói, gõ ref sai hoặc không tuân NONE. Không tiếp tục thêm lời nhắc hoặc nâng budget chỉ để ép bộ ca qua.

| Chỉ số cùng15ca×3 | Vòng trước f21ca386 | Vòng này b3107465 |
| --- | ---: | ---: |
| USABLE / NEEDS_EDIT / UNUSABLE / controls | 32/2/8/3 | **32/1/9/3** |
| Static fallback | 8 | **7** |
| Downstream checkout/confirmation không hoàn tất | 0 | **2** |
| Verifier FAIL | 6, một acceptance/fit còn mở | **3**, hai stage readings còn mở |
| NONE tool-call generations | 1 | **5**, một được code summary cứu |
| HTTP/completion error | 1MALFORMED_RESPONSE | **0** |
| Preview rồi purchase confirmation | 3/3 | **2/3** |

Không coi fallback giảm8→7 là cải thiện chung: useful count không tăng, downstream mua giảm. Các lần lặp có lịch sử khác nhau sau failure và nguồn live có thể đổi; không quy mọi dao động B1 cho projection, cũng không coi một lần đo là bằng chứng model nào tốt hơn. Review chủ quan/ownerAcceptance=null; không majority hoặc best-of.

## Finding/root cause còn lại và hướng tiếp theo — chưa thực hiện

1. **Owner chưa ổn định trong việc chọn hành động và giữ lựa chọn khách.** Trace xác nhận recommend_size không cần thiết khi khách đã chọn; colour be có trong history vẫn thành null; cartQuote đã có vẫn bị gọi lại. Không thể quy những lỗi này cho thiếu giá/tồn hoặc root duplication đơn thuần. Một kế hoạch tiếp theo phải rà mối quan hệ giữa tin hiện tại, lựa chọn đã xác lập, state hiện có và contract tool; không chỉ đổi câu nhắc cùng luật. Không thêm parser/router/role/state schema trong run này.
2. **Tool adherence là rủi ro thực tế riêng với ngôn ngữ.** Có năm generation gọi tool dưới NONE và một ref sai dù declarations đã cấp enum. Code chặn đúng. Giá trị sửa presentation cần được đánh giá riêng; chưa có căn cứ cho tăng budget/cho execute under NONE hoặc nới ref validation.
3. **Verifier ở vùng sân khấu cần đọc đúng mức lời hứa.** Một draft đảm bảo kết quả rõ, hai draft còn cách đọc lời tư vấn hoặc đề xuất từ nguồn2lớp. Cần chốt từng nghĩa theo owner boundary, không thêm keyword hoặc yêu cầu mọi lời phối phải có phép thử. Giữ current verdict/raw, không tự nới verifier hoặc tạo vòng repair.
4. **Giọng vẫn chịu ảnh hưởng mô tả và câu trạng thái.** System-oriented words và câu hỏi size vô ích còn xuất hiện dù prompt đã có lời cấm. Review phần nào thật sự giúp khách chọn/mua thay vì checklist fact; không gọi rewrite hiện có là root fix đã được chứng minh. Bản sửa này chủ ý giữ prompt để không lặp vòng nhồi luật.

Các hướng này là findings sau đo, chưa implementation/authorization cho một candidate khác. **STOP trước16, giữ115requests và toàn45outcomes nguyên vẹn.**

## Accounting và verification

- **115generation invocations/115upstream requests=84owner+31verifier**,115HTTP200, request accounting unknown0, errors0/timeouts0/retry0. Năm unexpected tool calls là lỗi logic/budget có tính riêng, không phải năm HTTP failures.
- 31model finals đều qua verifier,31exact request/draft/snapshot bindings,28PASS/3FAIL;28model eligible replies khớp exact draft.29eligible còn một code summary. Không classifier skip-verifier. Private checkout không gọi model.
- Static fallback7/45=15,6%; terminal HANDOFF6/45=13,3%; terminal NO_SEND3/45=6,7%, với nghĩa capture/ownership/failure đã tách ở trên. Không cộng chúng thành một tỷ lệ kết quả khách hàng.
- Verifier p50/p95 **6,709/11,418giây**,N31; added verification latency **7,746/12,599giây**,N31. Owner **2,311/4,994giây**,N84. Whole turn **14,432/43,828giây**,N45, gồm source/DB/relay overhead; nearest-rank, không phải SLA live.
- Token input **501.723**, output **55.193**, usage115/115requests; thinking-token evidence giữ theo provider trong accounting, cost **NOT_EXPOSED**, không suy tiền từ tokens.
- Audit68raw hashes/frozen files,31bindings/28eligible matches/actual captures và captured request projection:0observed evaluator-only/private-checkout fixture leaks. Ba DB dropped, sourceDirty=false; model không nhận thông tin checkout riêng tư. Raw file hashes tính theo bytes trên đĩa, bốn metadata JSON có Git CRLF/LF normalization; không đồng nhất mọi metadata blob với disk bytes.
- [Metrics](CANDIDATE_METRICS.json), [accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [diagnosis](DIAGNOSIS.json), [exact six dispatch commands/exits](commands.json), [runtime source](runtime.json). Các runner exit0 chứng minh collection hoàn tất, không chứng minh mọi outcome PASS.

Thực sự đã chạy: observed adapter RED→GREEN; focused50/worker191/protected21PASS; full worker1856Vitest/504NodePASS+2optionalSKIP; worker typecheck/lint exit0 và canonical worker build do source-check runner gọi exit0. Source readback0generation; clean sealed source rồi config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED và stateful PREFLIGHT_PASS/0generations. Đủ6provider processes exit0, tất cả3DB dropped. Exact implementation commands/timing ở IMPLEMENTATION.md; không claim standalone build lần nữa, CI hoặc full-repo pnpm check PASS mới. Không cần mutation DB controls mới vì effects không đổi.

```powershell
node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-freeze.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py python C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-preflight.py
python C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-run.py
node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-collect.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-render-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-diagnose.mjs
```

Các lệnh collection/audit đúng target exit0. Helper diagnosis ban đầu giữ nhầm đường dẫn thư mục lịch sử khi được tái dùng: đã khôi phục file lịch sử từ exact Git blob, xác minh không diff, sửa target và chạy lại đúng run. Không provider request, raw, primary hoặc verdict nào được thay trong việc sửa helper. Một truy vấn đếm occurrences lúc đầu chưa xử lý outcomes0generation nên lỗi; thêm xử lý danh sách rỗng cho thống kê, không đổi evidence. Các sự cố offline này không phải provider failure và không được trộn vào denominator.

Complexity của implementation:16dòng adapter/declaration thay/được thêm,92test lines;0worker domain/effect/state edit,0new gate/schema/durable state/model role/parser/template/repair/retry, không tăng budget. Hai prompt giữ nguyên. Historical evidence không đổi. Remaining16/full-suite behavioral regression, ổn định model, actual staff handling/POS/live delivery vẫn chưa verified; **B sales/live STOP, A OWNER_BYPASS**.

Final reporting checks thực sự chạy: `node C:/Users/nguye/AppData/Local/Temp/c3-offer-projection-final-check.mjs` exit0,69JSON/6JSONL/59local links, all45reviewed, frozen executable/runtime/prompts/criteria nguyên vẹn, historical evidence không diff,0secret-pattern hits; `node C:/Users/nguye/AppData/Local/Temp/c3-review93-scan.mjs` và `git diff --check` exit0. Đây là checks về tài liệu/integrity, không thêm provider outcomes hoặc CI PASS.
