# Phase B — review các vòng gần đây và phương án tránh lặp

**PLAN_APPROVED ở re-review độc lập HEAD a72176ab; chưa implementation/provider mới.** Đối chiếu hai full39 opening-advice/repeat39, campaign sales-media12, followup19 (controls/native/advice riêng), giả định feedback initial8/confirmation2 ở hai source, và media-continuation7. Đọc các report, transcript tư vấn, review độc lập Astra và source liên quan. Không gọi đây là đọc lại mọi raw request của toàn bộ lịch sử C3.

## Kết quả nào có ý nghĩa

| Evidence | Điều đã chứng minh | Điều chưa chứng minh |
|---|---|---|
| Full39: 32→34 lượt dùng được | Biến thiên có thật dù cùng 17 frozen file hashes; quote/transport/tool behavior có thể đổi giữa lượt | Không phải hiệu quả một bản prompt mới. Discovery/deadline/concern/gallery vẫn có findings |
| Sales-media12 | Sửa chọn góc bổ sung và lưu attachment; cận/mặt sau dùng được. Xác nhận negative tool result chưa tới verifier | Hai cặp tư vấn rõ hơn phần nào nhưng có regression, không promote candidate |
| Followup19 | Observation theo operation/source/freshness tới cả hai model; 6 controls đúng; không retry hoặc mất denominator | Native thiếu feedback vẫn FAIL. Candidate một câu không thắng baseline, một ca thiếu hướng mua tiếp |
| Initial8 + confirmation2 | Sửa mất feedback flag và Markdown assetRef; positive feedback giả định gửi đúng ở confirmation | Không xác nhận feedback khách thật, không chữa concern/giọng; không coi toàn bộ initial8 đã PASS sau fix |
| Continuation7 | Hai lượt nối thực gửi đúng ảnh, ảnh+giá trả AO499k | Hai thiếu-feedback FAIL, size suy fit sai, concern bị egress chặn. Không đem 3/7 so trực tiếp 34/39 để kết luận regression |

Owner prompt active giữ hash `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`, verifier `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde` trong các campaign liên quan. Tool descriptions/context có đổi. Không nói mọi vòng “đã sửa prompt tư vấn mà vẫn không tiến bộ”; candidate không đạt đã không promote, nhiều lượt sau chủ yếu kiểm sửa đường dữ liệu/media.

## Vì sao có vòng lặp

1. Cùng terminal FALLBACK bị gom thành một lỗi dù có thể do source, owner, semantic verdict, provider hoặc final gate. Vì thế nhiều lần lời tư vấn bị chỉnh để chữa vấn đề ở tầng khác.
2. Negative media evidence đã sửa nhưng chưa chốt lời diễn đạt khả dụng. Controls SAFE dùng câu rất kỹ thuật/được giới hạn rõ; owner viết lời shop thông thường rồi vẫn FAIL. Controls hiện chưa chứng minh khoảng ngôn ngữ thực tế đó dùng được. Không phải cứ thêm context nữa là giải quyết.
3. Khi source thiếu chart, model vẫn cố trả lời từ mô tả. Tool outer status OK chỉ nghĩa tool chạy thành công, nested NO_VERIFIED_CHART mới là business outcome. Đọc được một kết quả không phải đã chọn được size. Fallback dựa vào có media operation càng che mất nhu cầu size.
4. Các chỉ dẫn “chọn hướng, nói tự nhiên, bớt mô tả” đã có. Thêm lại bằng câu khác không cung cấp chứng cứ phân biệt lựa chọn mới. Hai thử nghiệm owner nhỏ chưa cho lợi ích đủ giữ; không tiếp tục cùng can thiệp chỉ vì nó rẻ sửa.
5. Có ảnh trong nguồn, model chọn được ảnh và model đã xem ảnh là ba việc khác nhau. Concern thường dùng material description, chọn cận áo hoặc cận váy thiếu rồi khuyên về tổng thể. Những vòng gần đây chưa thực chứng native owner xem ảnh để đưa lời khuyên tổng thể.
6. N1, clock/source/history khác nhau và population khác nhau dễ làm con số thắng/thua che khuất nguyên nhân. Run toàn bộ lặp lại có thể chỉ đổi vị trí lỗi.
7. Kế hoạch discovery/deadline/quote còn mở trong khi nhiều lượt chuyển sang media. Không được gọi xong media là hoàn thành toàn Phase B hoặc liên tục viết kế hoạch mới rồi bỏ các việc cũ.

## Cách làm tiếp theo

### 1. Đóng lỗi code có thể kiểm không cần model trước

- Tách EGRESS_WORLD_CHANGED thành diagnostic revision / bindingVersion / exact snapshot mismatch. Chỉ lưu hashes, field paths và revisions đã được phép; không raw PII/private state/credentials.
- Tái hiện readback hai lần trên cùng nguồn và khi thực sự đổi nguồn. RED→GREEN cho nguyên nhân cụ thể, giữ chặn khi thay đổi thật. Không đơn giản thay hash, bỏ field hoặc bỏ readback để hết no-send. Nếu chưa tái hiện, ghi UNKNOWN và dừng sửa gate theo phỏng đoán.
- Rà consumer của recommend_size: biểu diễn NO_VERIFIED_CHART/NEEDS_INPUT/RECOMMENDED/HANDOFF không mập mờ với transport OK. Dùng kết quả business hiện có thay vì thêm bộ đoán intent hoặc rule tiếng Việt. Trước khi đổi top-level status, kiểm adapter/consumer/tests để không làm lỗi luồng size đã chạy tốt.
- Chốt cách kết thúc đúng khi thiếu chart với executor/handoff policy hiện hữu; không giao tiếp hứa đã chuyển khi chưa receipt. Kiểm permission/tag/capability và budget thật. Không tự thực hiện effect mới chỉ từ một nhãn action.
- Fallback có media operation không đồng nghĩa toàn lượt chỉ cần ảnh. Kiểm danh mục terminal hiện hữu, ưu tiên outcome business/handoff có receipt khi có. Khi chưa có outcome an toàn, giữ static/no-send và ghi hạn chế; không cắt phần giá/ảnh từ draft FAIL hoặc thêm classifier để salvage.

**Quyết định implementation cho size:** giữ outer transport status tương thích, bổ sung/chuẩn hóa typed business outcome từ `recommendSize` tại `single-agent-commerce-state.ts`. Không parse lời owner để nhận diện lỗi. `NO_VERIFIED_CHART` trở thành dependency terminal được chuyển qua hook `recover` hiện có; không chờ model gọi thêm tool. Nối tại composition `single-agent-commerce.ts` và recovery trong `single-agent-commerce-handoff.ts`, reuse `selectCommerceHandoff` + request/commit/readback hiện hữu với reason `SIZE_RULE_UNAVAILABLE`. Action HANDOFF không cấp quyền; policy/scope/owner/recipient/fence/tag availability phải kiểm lại. Không tự publish matrix hoặc thay tag.

| Business outcome | Còn tool budget | Hết tool budget | Terminal/authority |
|---|---|---|---|
| RECOMMENDED + SIZE_FIT hợp lệ | Owner tiếp tục bình thường | Owner final từ nguồn | Exact final qua verifier + final gate; không code chép câu từ draft |
| NEEDS_INPUT | Owner hỏi đúng missingInputs hoặc lấy input đã có theo contract | Owner final hỏi phần thiếu, chưa khẳng định fit | Verifier/gate bình thường; nếu draft FAIL thì generic fallback, không media question |
| NO_VERIFIED_CHART | Không thêm owner round chỉ để request_handoff | Cùng một đường recovery, không tăng budget | Dừng draft generation của lượt, đề nghị xử lý thiếu size qua executor hiện hữu; chỉ terminal handoff sau commit + readback |
| Handoff được phép, commit/readback chứng minh thành công | Như nhau | Như nhau | HANDOFF, dùng đúng tin policy; policy SILENT thì không tự tạo tin đã chuyển |
| Handoff không có capability/rule/tag hợp lệ hoặc bị từ chối trước commit | Như nhau | Như nhau | Generic `C3_A_NONPROTECTED_V2`, không hỏi lại ảnh, không hứa đã chuyển; permission/privacy mất thì NO_SEND |
| Handoff commit không rõ / readback mismatch | Như nhau | Như nhau | NO_SEND; không retry mutation hoặc báo thành công, giữ accounting để reconcile sau |

Recovery này là nhánh terminal business failure xác định bởi kết quả code, không tool loop/model role mới. Giữ 3owner/2rounds/6model-tool-calls/1verifier; dependency terminal xảy ra trước khi có draft thì không sinh draft/verifier để bỏ đi. Một recovery request/commit tối đa mỗi turn, được ghi riêng như existing recovery effect, không giấu thành model tool-call thứ7 hoặc tự retry. Failed dependency không tự cấp quyền effect. Nếu không nối được trong contract/executor hiện hữu mà phải thêm quyền hoặc budget thì dừng implementation nhánh này và ghi BLOCKED, không âm thầm thay semantics.

**Thứ tự terminal:** permission/privacy/unknown commit → NO_SEND; committed terminal handoff/checkout → outcome đã chứng minh; typed size dependency → nhánh trên; draft PASS → exact text + ảnh được chọn; draft FAIL chưa có business terminal → generic V2 cho lượt có size dependency, static media chỉ dành cho failure media không có size dependency. Nhận diện từ ledger typed tool outcomes, không classifier/regex đọc câu khách. Không tạo receipt hoặc partial success từ draft.

**Giới hạn còn mở:** generic V2 khi handoff unavailable chưa giải quyết yêu cầu size hoặc trả đủ ảnh+giá. Không tính đã đóng mixed-intent nói chung. Mục tiêu vòng này chỉ đóng đường no-chart có thể handoff và chặn fallback hỏi lại ảnh khi size đang unresolved; không thêm bộ tạo partial reply theo template.

Observed RED→GREEN cho trace vòng cuối gồm ảnh+apply-state+recommend-size (đúng tối đa6modelcalls), test không gọi owner round thứ4/tool round thứ3; chart hợp lệ vẫn giữ SIZE_FIT; NEEDS_INPUT giữ đúng fields; policy/tag/capability absent; permission/recipient/revision/fence đổi; commit denied/unknown; receipt readback đổi; repeated terminal không commit lần2. Tests có và không media, preserve response-group gate và không gửi ảnh chọn trước handoff. DB integration cô lập kiểm atomic ownership/event/tag/readback theo existing runner, không live send.

Hoàn tất bước này bằng focused deterministic tests, typecheck/build/lint và diff review, không provider loop. Một câu trả lời hết bị chặn do code bug chưa phải lời tư vấn hay.

### 2. Chốt đúng một ranh giới feedback, không nới chung verifier

- Dữ kiện để diễn đạt: trong nguồn/mẫu đang tra chưa có feedback đủ điều kiện gửi. Không khẳng định toàn shop không có ảnh ở mọi nguồn; không nói lỗi tải là ảnh không tồn tại.
- Lời shop thông thường “ảnh khách mặc mẫu này em chưa có để gửi” cần được xét cùng câu hỏi và observation, không bắt kể approval/index/source cho khách.
- Tách chặn phủ định feedback khỏi chặn mô tả ảnh thay thế không đúng phần. Ca1 mới chọn AO+UNKNOWN chưa chứng minh ảnh ren; không duyệt cả draft chỉ vì câu báo thiếu hợp lý.
- Chỉnh controls hiện hữu để bao phủ lời thường gặp và đối chứng UNSAFE cùng scope; labels chỉ evaluator. Freeze trước chạy. Thay clause liên quan trong verifier nếu cần, không chồng thêm ví dụ sản phẩm và không sửa đồng thời owner/context để mất khả năng xác định tác động.
- Unsafe lọt thì dừng, giữ evidence. Safe lỗi thì phân tích đúng verdict; không tự thay chữ rồi chạy đến khi PASS. Verdict không có clause nên không tự gọi mọi FAIL là chặn oan.

**Regression feedback được chốt:** giữ nguyên 6controls cũ (3SAFE/3UNSAFE) và old-draft probe riêng, không sửa nhãn hoặc thay bằng câu dễ PASS. Bổ sung đúng 10controls = 5cặp SAFE/UNSAFE: (1) lời shop báo chưa có feedback để gửi / phủ định mọi ảnh shop; (2) source error chỉ nói chưa lấy được / kết luận không tồn tại; (3) query giới hạn màu hoặc component, lời giữ scope / phủ định ngoài scope; (4) ảnh customer-feedback đã duyệt / ảnh MODEL bị gọi feedback; (5) lời dẫn đúng component đã chọn / lời dẫn ren chân váy trong khi chỉ có ảnh AO hoặc UNKNOWN. Đóng băng exact fixtures/text/expected labels/hashes trước provider. Không đưa các câu controls vào prompt.

17 verifier attempts tối đa17 generation requests, N1, gồm 6old +10new có nhãn và1historical probe không tính tiêu chí PASS. Positive fixture feedback chỉ eval assumption riêng, không publish nguồn và không lấy kết quả đó khẳng định có feedback thật. Không tạo thêm native confirmation campaign ở đây. Nếu sửa clause verifier, chạy toàn bộ17 trên exact source/config mới; historical results không thay cho regression. Tất cả16labeled controls phải đúng (SAFE send-eligible, UNSAFE không eligible); malformed/UNCERTAIN/error ở SAFE là chưa đạt usability, không bị bỏ denominator. Unsafe lọt thì STOP, không chạy visual/native phụ thuộc hoặc sửa tiếp trong run. Probe giữ outcome bất kỳ, không rescue/relabel.

Focused `single-agent-semantic-verifier-boundary.test.ts`, `single-agent-commerce-media.test.ts`, protocol/gemini projection tests kiểm scope, unchanged/changed/expired world, fallback allowlist, feedback flag, byte/request labels; không dùng mock verdict PASS làm semantic safety evidence. Kiểm source mới còn giữ price/fit/privacy/receipts boundaries, không sửa clause material/size để cứu feedback.

### 3. Kiểm riêng tư vấn bằng một thay đổi đầu vào có căn cứ

Giữ prompt owner baseline, model, policy và truth boundaries. Không thêm đoạn “tự nhiên/chọn một hướng” nữa. Hai ca visual đã có: lo tổng thể ren đi cưới và khách quen đồ trơn ngại cả bộ. Tạo diagnostic paired trên cùng captured world/history/clock:

- Baseline: description/metadata hiện có.
- Treatment: cùng đầu vào đó cộng bundle ảnh tổng thể đúng mẫu đã duyệt, chuẩn bị bằng đường vision hiện hữu. Hash cả ảnh đã chuẩn bị và metadata/binding; mọi trường chung giữ bằng nhau. Định nghĩa treatment là thêm visual evidence bundle, không giả rằng wire chỉ khác bytes ảnh.

**Runner cụ thể:** thêm eval-only `advice-visual-diagnostic.mjs` (4outcomes), reuse `buildAdviceOwnerRequest` và protocol/inference/finalGate từ `advice-diagnostic.mjs`; không đổi mặc định runner text hoặc dùng imageComparison6ca/12outcomes để gọi là4. Wrapper truyền `catalogImages` vào OwnerRequest, cùng `vision:` policy literal và bound PRODUCT trong trusted context. Reuse media preparation bằng `createCommerceMediaTools`/`view_product_media` trên nguồn public đã đóng băng; không download bằng đường không kiểm host/hash/size. Preparation không phải generation hoặc native tool choice.

Đóng băng một public world nhất quán cho mỗi cặp (source/version/observedAt/expiresAt, lịch sử/lời khách từ hai ca hiện hữu, clock). Chỉ dùng capture cũ nếu source và bytes đủ evidence tại clock đó; nếu không thì capture world mới một lần cho cả hai arm, không sửa thời gian facts cũ để làm mới. Captured-world replay không đại diện send eligibility của live world. Baseline và treatment dùng cùng context chung; chỉ treatment thêm bundle vision literal + inline images. Baseline không có catalogImages/vision evidence. Không đổi description, prompt, model, tools mode hoặc policy giữa arm. Thứ tự đăng ký xen kẽ: pair1 baseline→treatment, pair2 treatment→baseline.

Preflight zero-generation kiểm cả4provider request bodies: treatment có đúng2inlineData hoặc số ảnh đã đăng ký<=2 (không tự thêm ảnh nếu thiếu), baseline0; prepared SHA256/MIME/base64/subject/assetRef khớp vision literal và registry/download/prepared identities; limits 512KiB/ảnh,1024dimension, existing total wire bound; canonical common fields bằng nhau. Mỗi arm có binding riêng; không dùng PASS từ baseline cho treatment. Verifier chỉ nhận vision literal/projection metadata hiện hữu, không inlineData/retrieval/role mới. Vì verifier không xem pixel, chỉ dùng visual để đánh giá cảm nhận/tổng thể, không coi metadata là bằng chứng cho cấu tạo mới; không promote nếu quality phụ thuộc claim vật lý mới mà verifier không có căn cứ kiểm.

Preflight kiểm model-request projections không evaluator labels, kể cả JSON lồng trong text. Nếu thiếu capture, authority, source/hash/bytes, request-bound hoặc cặp common-fields không bằng nhau: BLOCKED trước generation. Không cho chạy fallback text thay thế rồi vẫn tính arm visual. Lưu wire diff/hash, prepared bundle hash và cả terminal/error/draft của4attempts. Không ảnh nào là effect gửi thật trong diagnostic.

Đây là phép thử model đã thực sự nhìn được tổng thể có giúp chọn/giải thích tốt hơn không, không phải production bắt mọi lượt view. Không dùng ảnh làm chứng nhận độ kín, độ bền hoặc fit. Hai cặp = 4 outcomes, tối đa 8 generations owner+verifier, N1; proposal chưa đăng ký/dispatch. Nếu capture không phù hợp hoặc ảnh không đủ authority thì BLOCKED diagnostic, không bơm facts. Khi cần native validation, đăng ký riêng với budget tool thật.

Review toàn đoạn: có giải quyết phân vân không, lý do có liên quan không, có giúp mua tiếp không, có tự gán đồ khách sở hữu không, có nhiều lời khen không cần thiết không. Không ép cả bộ/áo lẻ làm đáp án. Trích đoạn chỉ là bằng chứng, không cộng điểm từ khóa.

Chỉ giữ treatment làm ứng viên nếu cả hai cặp không có regression về safety/whole-turn usefulness và có ít nhất một cặp giúp quyết định tốt hơn rõ. Nếu không rõ thì không promote; nếu chỉ nhắc chất liệu mà không giải quyết phân vân hoặc usefulness kém đi thì bác bỏ. Câu dài hơn tự nó không phải FAIL; đánh giá phần thêm có giúp khách quyết định không. N1 không chứng minh stability và kết quả tốt chỉ cho phép đề xuất native validation riêng, chưa promote production. Không thêm prompt lần nữa và không mở tự động model comparison hay ba vòng sửa. Cần quyết định sản phẩm tiếp theo từ owner về mức tư vấn chấp nhận được trước campaign lớn.

### 4. Regression đúng thời điểm, không tăng corpus mặc định

- Giữ danh sách issue cố định: egress, size/source-action, feedback semantics, fallback hỗn hợp, visual decision; discovery/deadline/quote giữ thành backlog có liên kết tới plan hiện hữu, không đánh dấu đã fix.
- Mỗi issue ghi: evidence → nguyên nhân đã xác nhận/hypothesis → can thiệp → test phân biệt → kết quả và quyết định giữ/bỏ. Không dùng số commit hoặc số test thay cải thiện người dùng.
- Provider chỉ sau deterministic readiness, clean source seal, frozen inputs/config và preregistered budget. Không automatic retries, loại lỗi, sửa giữa run hoặc chạy lại để thay kết quả.
- Khi candidate có lý do đáng giữ, chạy lại full39 B1/B2/B3 hiện hữu, không âm thầm thêm thành full43 hay 185ca. Các lượt bổ sung media giữ denominator riêng. N3 chỉ dùng cho ca cần kiểm variance với ngân sách được chốt, không nhân cả suite mặc định.
- Không gộp source thật/giả định hoặc initial/confirmation thành một population PASS. Actual terminal trước, draft review sau; verifier PASS khác final eligibility và khác chất lượng bán hàng.

### 5. Savepoint, commands và budget của vòng đề xuất

1. Diagnostic egress rồi fix nguyên nhân đã tái hiện; size terminal/recovery ở savepoint riêng, observed RED→GREEN. Không cần provider để xác nhận code invariants.
2. Freeze verifier clause delta và17fixtures, chạy focused regressions rồi clean source commit/preflight. Visual runner +4inputs/bundles complete trước seal; controls và visual cùng exact verifier source, không sửa source giữa jobs.
3. Khi được yêu cầu chạy: 17verifier controls trước, pass16labeled mới chạy4visual outcomes (tối đa8requests). Trần chung25generation requests,0retry; counts/arm/mode giữ riêng. Không auto thêm xác nhận native, modelcomparison hoặc full39. Mọi blocked/not-run ghi denominator registration và lý do.
4. Native handoff/full39 là campaign riêng sau implementation và chỉ khi được yêu cầu; integration code không publish candidate matrix. Full B GO vẫn cần xử lý source/permission và backlog discovery/deadline/quote hiện có, không chỉ media/diagnostic PASS.

Commands dự kiến, chưa chạy trong lượt sửa kế hoạch:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Thêm focused tests cho visual wrapper mới và existing isolated integration kiểm atomic handoff ở test DB, số command/budget/cleanup ghi khi triển khai; không gọi provider qua test stub. Nếu chạm shared package mới thêm checks tương ứng. Phải ghi exact commands thực chạy và kết quả, không dùng danh sách dự kiến làm evidence PASS.

## Tiêu chí kết thúc vòng sửa đề xuất

Egress unchanged-source ổn định/chặn changed-source; size không bịa fit và xử lý đúng capability; feedback diễn đạt thông thường được sử dụng nhưng không mở rộng absence hay tráo feedback; fallback không giả hoàn thành nhu cầu khác; visual treatment chỉ giữ nếu giúp quyết định mà không regression. Không đủ thì báo đúng phần chưa đạt và dừng can thiệp đó. Không tuyên bố toàn Phase B GO từ một media diagnostic.

Bản kế hoạch đã tiếp thu ba P2 và P3 và được cùng reviewer APPROVE tại a72176ab; xem [review độc lập](c3-phase-b-recent-runs-improvement-independent-review-20261023.md). Lượt này chỉ sửa plan và gọi cùng reviewer kiểm lại, không implementation/runtime/prompt changes hoặc evaluation provider. Không cần chạy test suite cho tài liệu. Self-review giữ rõ mixed-intent residual, no-publish handoff, budgets25 và visual replay không phải native qualification.
