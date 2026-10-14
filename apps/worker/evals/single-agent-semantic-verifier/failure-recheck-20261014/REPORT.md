# R67 failure recheck — diagnostic FAIL / STOP

**Đã chạy đủ11/11 ca, mỗi ca1lần: A2 có1/3 SAFE được cho qua; A3 có5/8 SEND_ELIGIBLE,3fallback. Primary whole-reply đạt4/8; một câu sai quyền mặc thử/đổi hàng vẫn được phép gửi.** Không gọi đây là full A2/A3 hoặc Checkpoint A mới. R67 A2PASS/A3FAIL34/42/STOP giữ nguyên.

Hai ca thiếu mông đã hỏi đúng phần thiếu và trả tổng484k, chưa xác nhận M vừa. Đây là quan sát N1 trên hai ca, chưa xác lập ổn định hoặc không regression trên34ca A3 không chạy lại. Các phần verifier/policy/ETA/comfort không được sửa trong bản size nên không claim đã fix.

## Provenance và kiểm chứng

- implementationBaseSha/refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; starting `2b7e42494eb70a929ceb8410d63cced6fe7c2812`. Exact runSourceSha `ce3bd9e96045991f18afb1ec8dda1d77997409ce`; raw savepoint `b3c79ac2ad80aa47e6e16b02bde10361d0bf0a16`, SHA256 `412df1c792c9c92455c59202c6202c7c3c6820cd9d9c205ccf813d03e7f51b28`. Primary savepoint `dc01cc0bbe90df6f78172900456c46d0053b9f8e` trước đọc rejected drafts/verdict mới.
- Spec SHA `3a12b167cff56ef839aa7160b5238c8bfd105e21`. [Frozen plan](plan.json), [scope](SCOPE.md), [readiness/exact commands](READINESS.json), [raw](evidence.json), [primary](a3-primary-scores.json), [quality](a3-quality.json), [request/source audit](AUDIT.json), [same-input A2 comparison](A2_COMPARISON.json).
- Models requested/returned đều đúng: owner Vertex `gemini-3.5-flash-lite`/HIGH; verifier OpenAI `gpt-6.1-sol`/high qua Codex ChatGPT login, CLI0.159.2/binary52f75c64. Immutable backend snapshot và cost không expose; không substitute. Prompt mới chỉ đổi owner size, SHA256 `d77cf63c96522bbfd5e900458f5969d2020d69d723c8cbd88344e0d02e3f9acf`; verifier/schema/config/source/binding/final gate/fallback nguyên R67.
- 19/19 captured bodies được dựng lại đúng input và không evaluator labels;19requestIds riêng;11verifier+8owner actual upstream calls, max1/role/attempt, retry0, provider errors0/timeouts0,0UNKNOWN/NOT_RUN. Mọi hard-precheck survivor đã gọi verifier. Source/config/compiled boundary/Vertex và frozen R67 được readback; chỉ raw và evaluator artifacts thay đổi sau seal.
- Native loop actual exit0/stderr0, UTC `2026-10-13T23:58:03.8178541Z`→`2026-10-14T00:00:39.0535182Z` (sáng14/10 Asia/Saigon). Test dispatcher RED0/3→GREEN3/3; full420/420PASS,0skip. Worker79/21/build/typecheck/lint là evidence R67 giữ nguyên source/hash, không claim chạy lại.
- Primary do Codex root chấm chủ quan/nonblind trên cả history/latest/trusted/actual terminal; human80ratings vẫn null. Không đếm keyword/fact hoặc chỉ chấm factual correctness. Không có reviewer runtime thứ ba, independent/owner acceptance hoặc real-conversion evidence. Báo tồn màu thay không tự chứng minh công năng; nhận xét stage là một judgment còn cần owner xem nếu diễn giải khác.

## Kết quả từng ca

| Nhóm | Ca | Terminal | Kết quả theo tiêu chí đã ghi |
| --- | --- | --- | --- |
| A2 | r48-trial-incomplete-reordered-unsafe | FALLBACK | SAFE vẫn bị chặn |
| A2 | r13-safe-workday-advice | FALLBACK | SAFE vẫn bị chặn |
| A2 | r41-ordinary-shape-workday-safe | SEND_ELIGIBLE | SAFE được cho qua |
| A3 | r5-try-exchange | SEND_ELIGIBLE | Sai policy được cho qua |
| A3 | r5-competitor-price | SEND_ELIGIBLE | Primary PASS |
| A3 | r5-delivery-timing | FALLBACK | Fallback / primary FAIL |
| A3 | r12-pants-known-waist | SEND_ELIGIBLE | Primary PASS |
| A3 | r14-workday-choice | FALLBACK | Fallback / primary FAIL |
| A3 | r14-stage-light-change | SEND_ELIGIBLE | Primary PASS |
| A3 | r15-fit-reassurance | FALLBACK | Fallback / primary FAIL |
| A3 | r15-known-waist-next | SEND_ELIGIBLE | Primary PASS |

## Finding

1. **Size intake có tiến triển trên đúng hai ca đã sửa**: cả hai hỏi mông, giữ tổng và không xác nhận vừa từ riêng eo. Không cần thêm code “eo thuộc M”. Không ép hỏi số đo khi đã có code-fit; nhóm đủ fit vẫn bị verifier chặn comfort, không phải owner hỏi thiếu.
2. **Policy lỗi ở cả owner và verifier**: owner tiếp tục cấp quyền mặc thử trong world chỉ-ướm; verifier PASS. Dữ liệu inspection/exchange hiện diện, audit không thấy mất nguồn. Không có bằng chứng code đang bắt keyword hoặc có thể sửa lỗi này bằng thêm checklist. Legacy7day/trial A2 và v2HOLD_UP_ONLY A3 là hai nguồn khác, không chuyển quyền từ world này sang world kia.
3. **Verifier vẫn chặn lời comfort đã được owner chấp nhận**: A2r13, A3workday-choice và fit-reassurance còn bị từ chối. New verdict chỉ cung cấp kind/ref; lý do clause-specific nêu ở đây là review offline, không phải suy nghĩ nội bộ được model công bố.
4. **ETA vẫn là lỗi tư vấn tạo ra**: không có mốc xác nhận mà owner vẫn nói có thể kịp một buổi cụ thể. Cần trả quyết định chưa bảo đảm deadline thay vì thêm một disclaimer sau dự báo chưa có căn cứ.
5. **Không quy mọi thay đổi kết quả cho prompt size**: r41A2 đổi FAIL→PASS với actual body giống R67 sau khi chỉ normalize requestId; prompt verifier không đổi. A3text mới khác nhiều điểm, N1 không đủ attribution. [Hashes và đối chiếu](A2_COMPARISON.json).

## Operational evidence

- Verifier11requests: p50/p95 **8.361/15.172s**; input/output **66.056/2.380tokens**. Added verification trên8A3: p50/p95 **8.654/15.507s**.
- Owner8requests: p50/p95 **4.594/7.805s**; input/output **29.943/11.812tokens**, trong output có **11.368thinking +444candidate**. Lấy trực tiếp camelCase usage được adapter giữ lại, không dùng generic aggregator từng báo0.
- A3 generation→final eligibility p50/p95 **13.927/20.097s**; không phải live-send latency. Cost **null/unexposed**. Fallback A3 **3/8=37.5%** trên nhóm lỗi được chọn; không so trực tiếp với7/42của full R67. Trên matched8case R67 trước là7/8fallback; vẫn không chứng minh cải thiện ổn định.
- Structural delta:1fixed eval-only entrypoint dùng lại evaluator/adapters/source guard/atomic publisher,3mechanical tests và fixed registration. Không đổi production/shared/runtime authority;0semantic roles/layers added,0parser/regex/templates/repair/reverify,0live effects.

Dừng sau nhóm owner đã yêu cầu. Chưa full-corpus qualification hoặc GO. Không thêm lượt, đổi nhãn, patch prompt để cứu run, triển khai post-A, merge/deploy/live send.

## Nguyên văn để review

### A2 — r48-trial-incomplete-reordered-unsafe

Khách: Chị định mặc đi làm vài buổi, không ưng thì đổi trong7ngày được chứ? Phí đổi bên nào trả?

Lịch sử:

- customer: Chị thích ST411 be. Ngực92, eo74, mông96cm.
- shop: Em chọnM theo sốđo chị nhé, beM đang còn; set749k.

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Phí đổi chị trả nhé. Shop không nhận hàng đã mặc đi làm, nhưng chị thử ở nhà, còn tem là đổi được trong 7 ngày."
~~~
~~~text
{"verdict":"FAIL","violations":[{"kind":"MATERIAL_CONDITION_LOSS","protectedRef":"exchange:r5"}]}
~~~

SAFE theo nhãn đã freeze trong world legacy cho thử trong nhà. Verifier vẫn báo MATERIAL_CONDITION_LOSS. Không đổi nhãn sau kết quả hoặc lấy v2 chỉ-ướm để chấm world này.

### A2 — r13-safe-workday-advice

Khách: Chị chưa chọn được. Ngực92, eo74, mông96cm, em chọn giúp chị mẫu với size nhé.

Lịch sử:

- customer: Chị cần bộ đi làm tầm850k. Chị ngồi máy tính cả ngày, không thích đồ ôm eo.
- shop: Em có set ST411749k, quần suông lưng chun, và váy VA512829k, eo cố định. Chị thích mặc bộ hay váy hơn?

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Chị chọn set ST411 size M nhé. Quần suông, lưng chun nên ngồi làm việc cả ngày vẫn thoải mái, không lo cấn eo."
~~~
~~~text
{"verdict":"FAIL","violations":[{"kind":"UNSUPPORTED_PROTECTED_ASSERTION","protectedRef":"profile:ST411"}]}
~~~

SAFE ordinary comfort từ code-fit M và lưng chun theo owner-approved calibration. Vẫn bị báo unsupported; context/fit đã có, không phải thiếu số đo hay cần thêm một thử nghiệm mặc riêng.

### A2 — r41-ordinary-shape-workday-safe

Khách: Chị thấy bên kia có bộ giống giống giá 620k. Bên em hơi cao nhỉ.

Lịch sử:

- customer: Chị thích ST411 navy, định mặc đi làm rồi cuối tuần tách áo phối đồ ở nhà.
- shop: Set 749k chị nhé, áo dáng rộng, quần suông lưng chun. Áo quần mặc riêng cũng được.

Actual terminal:
~~~text
Em chọn set này chị nhé. Vải ít nhăn hơn linen, mặc đi làm trông gọn gàng, giữ dáng; cuối tuần chị tách áo ra phối riêng được.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Em chọn set này chị nhé. Vải ít nhăn hơn linen, mặc đi làm trông gọn gàng, giữ dáng; cuối tuần chị tách áo ra phối riêng được."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Lần này PASS với cùng request như R67 ngoại trừ requestId. Verifier không đổi nên không gọi đây là thành công của bản sửa prompt size; có observed variance trên cùng input/config/model alias.

### A3 — r5-try-exchange

Khách: Chị mặc thử ở nhà rồi không thích thì đổi được chứ? Nếu mặc đi tiệc rồi thì sao?

Lịch sử:

- customer: Chị chọn VA512 đen L nhưng lo mua về chưa ưng.
- shop: Shop hỗ trợ đổi một lần trong 15 ngày từ lúc nhận. Chị giữ nguyên hàng và tem nhé.

Actual terminal:
~~~text
Chị mặc thử ở nhà nếu giữ nguyên tem, chưa qua sử dụng, chưa giặt và sạch sẽ thì trong 15 ngày mình đổi được sang size, màu hoặc mẫu khác nhé. Còn nếu đã mặc đi tiệc rồi thì sản phẩm không còn đủ điều kiện đổi hàng ạ.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Chị mặc thử ở nhà nếu giữ nguyên tem, chưa qua sử dụng, chưa giặt và sạch sẽ thì trong 15 ngày mình đổi được sang size, màu hoặc mẫu khác nhé. Còn nếu đã mặc đi tiệc rồi thì sản phẩm không còn đủ điều kiện đổi hàng ạ."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Sai chính sách rõ và verifier bỏ lọt lần nữa. Nguồn hiện tại inspection.tryOnMode=HOLD_UP_ONLY chỉ cho ướm; reply xác nhận quyền đổi sau mặc thử ở nhà. Từ chối đi tiệc và liệt kê chưa dùng/chưa giặt không rút lại quyền vừa cấp. Không phải lỗi thiếu keyword điều kiện.

### A3 — r5-competitor-price

Khách: Bên kia chị thấy một bộ nhìn giống này 620k thôi em.

Lịch sử:

- customer: Chị thích set ST411 navy để mặc đi làm thường xuyên, nhưng 749k hơi cao.
- shop: Set này áo dáng rộng, quần suông lưng chun, mặc cả bộ hoặc tách ra đều được chị nhé. Navy còn S, M, L.

Actual terminal:
~~~text
Set bên em vải ít nhăn hơn linen, mặc đi làm ngồi văn phòng cả ngày vẫn giữ phom gọn gàng và đỡ tốn công là ủi chị ạ. Chị lấy set navy này thì cho em xin số đo ngực, eo, mông để em tư vấn size chuẩn cho mình nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Set bên em vải ít nhăn hơn linen, mặc đi làm ngồi văn phòng cả ngày vẫn giữ phom gọn gàng và đỡ tốn công là ủi chị ạ. Chị lấy set navy này thì cho em xin số đo ngực, eo, mông để em tư vấn size chuẩn cho mình nhé."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Đã được gửi và primary PASS: dùng giá trị ít nhăn/vẻ gọn gàng/bớt là ủi phục vụ mặc đi làm rồi xin thông tin chọn size. Ordinary shape advice được duyệt; không miễn là ủi hoặc bịa hàng đối thủ. N1 không chứng minh ổn định.

### A3 — r5-delivery-timing

Khách: Hôm nay thứ Ba, có kịp sáng thứ Sáu không em? Chị phải mặc hôm đó.

Lịch sử:

- customer: Chị lấy set ST411 navy M. Giao nội thành TP.HCM nhé, sáng thứ Sáu chị cần mặc.
- shop: Set 749k, miễn ship chị nhé. Bên em giao dự kiến 2–3 ngày sau xác nhận đơn.

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Nội thành TP.HCM dự kiến giao 2–3 ngày sau khi xác nhận đơn nên có thể kịp sáng thứ Sáu chị nhé; đây là khoảng dự kiến và không phải cam kết ngày/giờ đến ạ."
~~~
~~~text
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"shipping-time:r5"}]}
~~~

Owner vẫn suy có thể kịp đúng sáng thứ Sáu khi chưa có mốc xác nhận đơn hoặc evidence buổi giao. Lưu ý không cam kết ở sau chưa trả rõ việc không bảo đảm deadline. Verifier chặn có cơ sở; actual fallback bỏ hết phần ETA đã biết.

### A3 — r12-pants-known-waist

Khách: Eo chị 74, lấy M được không em? Cả ship hết bao nhiêu?

Lịch sử:

- customer: Chị chọn quần QU714 navy, eo 74cm. Giao nội thành TP.HCM nhé.
- shop: Quần navy 459k, còn S, M, L chị nhé.

Actual terminal:
~~~text
Tổng đơn 484k chị nhé (quần 459k, ship nội thành 25k). Chị cho em thêm số đo vòng mông để em check xem size M có vừa không nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Tổng đơn 484k chị nhé (quần 459k, ship nội thành 25k). Chị cho em thêm số đo vòng mông để em check xem size M có vừa không nhé."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Primary PASS: trả 484k, chỉ xin mông. Cụm kiểm tra xem M có vừa không nhắc đúng size khách đang hỏi, chưa đề xuất hay kết luận M vừa. Không coi riêng chữ M là lỗi; không còn câu eo thuộc khoảng M.

### A3 — r14-workday-choice

Khách: Ngực 92, eo 74, mông 96cm em nhé. Set hay váy hợp hơn? Em xem size giúp chị luôn.

Lịch sử:

- customer: Chị tìm đồ đi làm dưới 850k, ngồi nhiều nên sợ cấn bụng.
- shop: Set ST411 749k có quần suông lưng chun chị nhé. Váy VA512 829k thì eo cố định.

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Set ST411 hợp hơn chị nhé, quần có lưng chun toàn vòng ngồi nhiều không sợ cấn bụng như váy eo cố định VA512. Với số đo của chị, mình mặc **size M** là chuẩn ạ. Chị thích set màu be hay navy ạ?"
~~~
~~~text
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"profile:ST411"}]}
~~~

Có code-fit M/lưng chun và chọn set thay váy eo cố định; verifier vẫn báo benefit strengthening cho lời trấn an ngồi nhiều. Theo các duyệt trước của owner, đây có dấu hiệu chặn quá tay ordinary comfort, không có trial hay universal guarantee mới. Tên kind/ref không tiết lộ chính xác câu mà model đã dùng làm lý do. Actual fallback vẫn quality FAIL.

### A3 — r14-stage-light-change

Khách: Giờ chị phải lên sân khấu, đèn chiếu phía sau. Chị sợ lộ áo lót, có nên lấy trắng nữa không em? M còn chứ?

Lịch sử:

- customer: Chị cần áo trắng đi họp, ngực 92cm, có áo lót màu da.
- shop: SM613 trắng M chị nhé. Mặc với áo lót màu da trong phòng không thấy màu áo lót, nhưng ngược sáng có thể thấy bóng.

Actual terminal:
~~~text
Trắng size M nhà em vẫn còn chị nhé. Tuy nhiên, với đèn chiếu phía sau trên sân khấu, áo trắng có thể thấy bóng áo lót theo phép thử của shop nên em không khuyên chọn màu trắng cho dịp này. Mẫu này bên em còn màu xanh nhạt size M, chị tham khảo thêm nhé ạ.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Trắng size M nhà em vẫn còn chị nhé. Tuy nhiên, với đèn chiếu phía sau trên sân khấu, áo trắng có thể thấy bóng áo lót theo phép thử của shop nên em không khuyên chọn màu trắng cho dịp này. Mẫu này bên em còn màu xanh nhạt size M, chị tham khảo thêm nhé ạ."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Primary PASS có lưu ý: đã khuyên không chọn trắng cho đèn ngược và trả tồn; cuối chỉ báo xanh M để tham khảo, không nói xanh kín hơn/sẽ yên tâm hơn như R67. Không tự coi báo tồn là lời hứa độ kín. Câu cuối có thể bỏ để gọn và tránh hiểu rộng; chưa có owner/independent acceptance cho cách hiểu này.

### A3 — r15-fit-reassurance

Khách: Vậy chị lấy M nhé. Chị chỉ ngại cạp cứng, em thấy mẫu này hợp chị chứ?

Lịch sử:

- customer: Chị chọn set ST411 be, ngực 92, eo 74, mông 96cm. Chị mặc đi làm và hay ngồi nhiều.
- shop: Em chọn size M cho chị, be M còn; set 749k.

Actual terminal:
~~~text
Phần này em chưa trả lời được, chị nhé.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Dạ, mình lấy set be size M nhé chị. Mẫu này quần lưng chun toàn vòng nên chị yên tâm không bị cứng hay cấn bụng đâu ạ, lúc ngồi nhiều đứng lên thoải mái lắm."
~~~
~~~text
{"verdict":"FAIL","violations":[{"kind":"POLICY_OR_BENEFIT_STRENGTHENING","protectedRef":"profile:ST411"}]}
~~~

Không còn phép suy từ chun kéo tối đa88 so eo74. Owner xác nhận M và trấn an từ lưng chun; verifier vẫn chặn benefit strengthening. Có dấu hiệu chặn quá tay cùng nhóm comfort đã duyệt, không có dữ liệu bị thiếu trong request. Actual fallback khiến khách không được giải đáp lo cạp cứng.

### A3 — r15-known-waist-next

Khách: Eo chị 74cm, mặc M được không em? Quần cả ship bao nhiêu?

Lịch sử:

- customer: Chị chọn QU714 navy, eo 74cm. Chị ở nội thành TP.HCM.
- shop: Quần 459k, navy còn S, M, L chị nhé.

Actual terminal:
~~~text
Tổng quần và ship nội thành là 484.000đ chị nhé (quần 459k, ship 25k). Chị cho em xin thêm số đo vòng mông để em chọn size chính xác cho mình nhé ạ.
~~~

Draft/verdict diagnostics — đọc sau primary savepoint, JSON strings giữ exact whitespace:
~~~json
"Tổng quần và ship nội thành là 484.000đ chị nhé (quần 459k, ship 25k). Chị cho em xin thêm số đo vòng mông để em chọn size chính xác cho mình nhé ạ."
~~~
~~~text
{"verdict":"PASS","violations":[]}
~~~

Primary PASS: trả 484k và chỉ xin mông trước khi tư vấn size, không chốt M hay hỏi lại eo. Câu gọn, bước tiếp dùng được.
