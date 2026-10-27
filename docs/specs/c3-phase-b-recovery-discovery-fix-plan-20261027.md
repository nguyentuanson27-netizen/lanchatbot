# Phase B — kế hoạch sửa recovery và hoàn tất quyết định bán hàng

Ngày: 27/10/2026. Revision 3. Planning base: `b7e197d8877c4643fba2f86121ac1f8ec87af21d`.

Trạng thái snapshot: REVIEW_PENDING sau sửa ba P2 ở revision 1 và một P2 ở revision 2; quyết định và hash cuối cùng ghi tại [review trail](c3-phase-b-recovery-discovery-fix-plan-review-20261027.md). Chưa implementation hoặc model run. Task hiện tại là lập kế hoạch. Review độc lập kết luận năm vòng không phải approval cho phương án dưới đây.

## 1. Mục tiêu và bằng chứng được dùng

Giúp khách tìm được món phù hợp, hiểu lợi ích thực tế khi mua và tiến tới bước mua khả thi. Ưu tiên lỗi làm mất câu trả lời hoặc làm dừng hội thoại khi dữ liệu/công cụ còn có thể giải quyết. Giọng hơi dài/máy móc tiếp tục là hạn chế tạm chấp nhận theo owner; không mở lại vòng sửa toàn bộ giọng.

Nguồn:

- [Review năm vòng](c3-phase-b-five-run-rootcause-review-20261027.md), [ledger 255 outcomes](c3-phase-b-five-run-rootcause-evidence-20261027.json).
- [Review độc lập REVISE](c3-phase-b-five-run-independent-review-20261027.md): authoritative corrections cho kết luận ở lượt trước.
- [Corrigendum và exact-wire audit](c3-phase-b-quote-completion-corrigendum-audit-20261027.md).
- [Vòng mới nhất](../../apps/worker/evals/single-agent-commerce-read-only/quote-completion-repeat-run-20261027/CHECKPOINT_B.md), OWNER_DECISION_DIAGNOSIS.json và RECOVERY_COUNTER_DIAGNOSIS.json cùng thư mục.

Hai đính chính bắt buộc áp dụng:

1. Discovery ở hai vòng cuối: lỗi bỏ lỡ nằm ở generation 2 chỉ đọc một ứng viên; generation 3 đã hết hai tool rounds, không thể đọc thêm. PRICE_UNAVAILABLE mô tả sai tình trạng, nhưng chặn reason đó riêng lẻ không tạo đường hoàn thành.
2. Ba draft discovery khác sản phẩm/phạm vi claim; chưa đủ chứng minh verifier thiếu nhất quán. Không sửa verifier hoặc ranh giới tư vấn dựa vào so sánh đó.

## 2. Ràng buộc và phạm vi

Giữ một conversational owner, tối đa một semantic verifier. Code giữ identity/truth/freshness/state/permission/effects/receipts/privacy; verifier chỉ kiểm protected semantics của exact final reply. Giữ final gate và group delivery hiện hành.

Giữ 3 owner generations, 2 tool rounds, 6 normal work units và tối đa 1 terminal handoff/7 executed units; không tăng budget, generation retry, repair/reverify, role thứ ba, semantic router hoặc regex/template theo ca. Không thêm tool/framework mới trong phương án này. Không thay Size Engine, giá/ưu đãi/policy, giỏ/checkout, default renderer/Compact V2 hoặc verifier. Dữ liệu nguồn thật chỉ được sửa khi đã xác định đúng record và có task cho phép; không tự publish/ghi nguồn ở bước implementation code.

Silent handoff giữ nguyên: thiếu dữ liệu shop cần thiết thì bàn giao, không kèm tin khách; thiếu thông tin khách thì hỏi đúng phần thiếu. Handoff theo yêu cầu khách, xác nhận mua và xử lý đổi/trả không bị siết bởi quy tắc tra dữ liệu.

## 3. W1 — sửa counter và bảo toàn evidence khi recovery lỗi

### Lỗi đã xác định

runCommerceTurn.finish tạo executedToolInvocations; ingress recovery sau đó tăng terminalHandoffCalls/toolCalls mà không đồng bộ executedToolInvocations. Validator V2 ném TOOL_WORK_COUNTER. Harness catch thay toàn bộ result bằng envelope tối thiểu, mất generation telemetry trong artifact.

### Thay đổi dự kiến

1. Tại nhánh recovery trong `single-agent-commerce-ingress.ts`, đọc handoffStatus sau attempt và cập nhật nhất quán các counter. Với V2 chỉ cộng actual recovery attempt đã được chứng minh; không cộng proposed call hoặc tự sửa unknown/missing proof thành số hợp lệ. Legacy shape giữ nguyên.
2. Chốt counter nhất quán sau recovery, trước return từ ingress. Không thêm một throwing validator mới trong worker trước return làm mất result; validator qualification tiếp tục thuộc eval harness. Giữ công thức normal/executed-normal/terminal/executed-total theo version hiện hành, không đổi physical work thành số request model.
3. Contract eval cụ thể: sau khi ingress trả về, `statefulFixture.turn` gán result vào observed envelope **trước** `validateToolWorkAccounting`. Dùng một helper eval hẹp `retainObservedAttempt` trong file mới `attempt-evidence.mjs`: nhận envelope đã có và bước validate; thành công trả envelope + `qualification:{status:"VALID"}`; lỗi trả nguyên observed envelope + `qualification:{status:"INVALID",stage:"TOOL_WORK_VALIDATION",code:<allowlisted code>}` và `errorCode` tương thích. Không ném plain error cho validation đã có envelope; không rewrite terminal/commit/counters hoặc xóa generations. Outer-loop validation nếu có phải dùng cùng contract, không tạo exception tối thiểu làm mất result. Không phải framework recovery hoặc API send mới.
4. Caller chỉ `j.drain()` khi qualification VALID **và shared delivery queue chưa bị latch**. Qualification INVALID đặt chốt dừng eval theo **disposable database/shared dispatcher queue**, trước return/outer-loop xử lý tiếp; mọi drain/dispatch entrypoint do campaign sở hữu phải kiểm chốt, không chỉ `j.drain()` của lượt lỗi. Các slot đăng ký tiếp theo dùng cùng DB ghi `status:BLOCKED`, `executionStatus:NOT_RUN_BY_QUALIFICATION` cùng originating slot/error reference; không generation, write hoặc dispatch. Cohort có DB độc lập vẫn chạy. Không gọi policy/HUMAN hoặc bịa terminal cho slot chưa chạy.
5. INVALID đi nhánh readback/evidence: outbox/event/tag đã commit giữ nguyên trạng thái thực tế; ghi rows/status và capture trước/sau, không giả rollback, cancel hoặc gửi thành công. Không có lượt VALID hoặc journey khác được drain pending rows của INVALID trong cùng queue. Test kiểm validation trước return và sau return, hai journey chung DB, mọi dispatch entrypoint và một DB độc lập không bị chốt nhầm. Throw sớm trước khi có result giữ UNKNOWN và request/error references có sẵn; lỗi không chứng minh được queue an toàn cũng latch queue đó, không tự dựng observed envelope.
6. Consumer/analyzer đếm đúng một observed terminal khi có result; qualification INVALID là một trục lỗi riêng, không tự cộng thêm NO_SEND hoặc gọi observed SEND_ELIGIBLE là qualified PASS. Không có result thì terminal UNKNOWN với attempt error, không suy đã gửi hoặc chưa commit chỉ từ exception. Slot chưa chạy không có observed terminal; giữ trong registered denominator và báo NOT_RUN riêng, không giả executed hoặc zero-generation PASS. Request/token thực tế của attempt lỗi vẫn trong denominator usage. Harness có qualifier mới dùng consumer mới; legacy/historical artifact bytes không đổi.
7. Bổ sung error-stage/validation-code và generation reference trong evidence cục bộ. OWNER_TOOL_OUTPUT chưa biết field gốc: diagnostic chỉ dùng **tên tool/field/schema code do code định nghĩa**, kiểu giá trị tổng quát; unknown key/name thành sentinel, không ghi nguyên chuỗi model cung cấp hoặc giá trị/hash dữ liệu riêng tư. Không dump completion/args/PII hoặc nới schema để chấp nhận output chưa biết.

### RED → GREEN cần quan sát

- V2 bật quoteTask, owner ném provider/output error trước tool → persisted silent recovery handoff; tổng counter đúng, 1 event/tag, 0 capture, không thêm generation.
- V2 có normal tool trước lỗi → recovery tính cả normal dispatch và handoff, không đếm lặp.
- Recovery commit rejected/unknown/readback failure → counter tính đúng attempt; không báo bàn giao thành công hoặc gửi tin.
- Legacy recovery giữ contract cũ.
- Inject invalid V2 envelope vào validation trong fixture trước return và consumer sau return → retained generations/error/observed terminal/capture; qualification INVALID, shared-queue latch bật trước return. Mọi drain/dispatch spy 0 sau chốt; journey/slot tiếp cùng DB không sinh/write/dispatch, NOT_RUN được báo riêng. Queue DB độc lập vẫn hoạt động; pending outbox/commit không bị rewrite. Consumer ghi một observed terminal và một qualification error cho attempt lỗi; request/token được đếm, unknown giữ UNKNOWN.
- Một generation HTTP200 bị adapter từ chối vẫn là generation error, không được báo provider success chỉ vì HTTP200.

Điểm dừng W1: chưa reproduce được ingress V2 end-to-end bằng fixture thì không claim sửa xong chỉ từ synthetic arithmetic. Giữ raw artifact lịch sử nguyên bytes; tạo evidence mới cho source mới.

## 4. W2 — hoàn tất discovery trong hai tool rounds hiện có

### Chọn cách sửa

Dùng batch đọc độc lập đã có, không thêm operation mới hoặc tự động tra món thay khách. Mô tả `search_products` hiện nói “chỉ đọc tiếp món định tư vấn”; điều này dễ thúc đẩy chọn một món trước khi biết giá. Đây là một contributor có căn cứ ở instruction, chưa phải nguyên nhân nội bộ của model đã được chứng minh.

Thay đúng hướng dẫn search/read liên quan:

> Search trả ứng viên, chưa xác nhận giá hoặc mức phù hợp. Dựa vào mô tả để loại món sai loại/hoàn cảnh. Nếu khách có giới hạn cần kiểm bằng dữ liệu và chỉ còn một tool round, gom read_product cho tối đa 2–3 ứng viên còn hợp lý vào cùng batch, chọn đúng phần bán. Chỉ đọc trong budget còn lại; không mở mọi offer. Sau kết quả, chọn món có dữ liệu đáp ứng ràng buộc khách; không chọn trước rồi dùng phần mô tả để biện hộ.

Áp dụng đồng nhất tại owner prompt và description của search/read, bằng cách thay đoạn cũ; không thêm ví dụ tên/mã/giá của fixture. Giữ phân biệt AMBIGUOUS khi đang xác định mẫu khách gọi tên với danh sách ứng viên khi khách tìm theo nhu cầu: không báo giá một gợi ý như đúng mẫu được gọi tên. Giữ thông tin budget/phase hiện có; không thêm bản tóm tắt ý định do code suy diễn.

### Chuỗi mong muốn

1. Round 1: owner search theo nhu cầu; chỉ ghi state khi khách thật sự cung cấp/sửa thông tin và thao tác đó cần thiết. Nếu độc lập, search/state cùng batch hiện có.
2. Round 2: chọn tối đa 2–3 ứng viên hợp lý từ kết quả; read đúng phần bán trong cùng batch và trong call budget. Không đọc váy chỉ vì search trả gần nghĩa khi khách tìm bộ quần áo. Không bắt buộc đủ ba mẫu nếu chỉ có một hoặc hai mẫu phù hợp.
3. Generation 3: chọn một hướng mua dựa vào mô tả và verified giá/tồn đã đọc. Có thể giới thiệu kiểu dáng trước khi đủ số đo; hỏi đúng phần thiếu để tư vấn size, không bảo đảm riêng khách mặc không bó/cấn.
4. Nếu không có ứng viên đã xác minh phù hợp hoặc hết lượt trước khi đủ căn cứ: handoff im lặng theo RESPONSE_UNAVAILABLE hiện có. Đây là chưa giải quyết được yêu cầu, không được báo là nguồn giá/ETA bị thiếu khi chưa có bằng chứng. Không hứa có mẫu đạt ngân sách mà chưa đọc.

### Feasibility gate trước sửa instruction

Thêm `apps/worker/src/single-agent-commerce-discovery-feasibility.test.ts`, do W2 sở hữu, chạy **real createCommerceTools → runCommerceTurn → resultBudgetView → actual mocked Gemini wire**; không stub bước read/projection bằng tool result nhỏ tùy ý. Public fixture mới `apps/worker/evals/single-agent-commerce-read-only/fixtures/discovery-feasibility.public.json` lấy cấu trúc/độ dài mô tả và offer data đại diện từ captures đã có, chỉ dữ liệu shop công khai, bỏ case labels/PII/secret/evaluator text. Fixture/hash là test-only, không thêm case/provider population hoặc ví dụ trong prompt.

Kiểm batch hai ứng viên hợp lý trong snapshot đại diện; ba ứng viên chỉ khi thực sự có ba ứng viên phù hợp và còn chỗ. Tính cả initial runtimeProducts, search candidates, MAX_RUNTIME_PRODUCTS=4, cap6, 2 rounds, requested SINGLE offer mỗi mẫu, retained metadata/provenance và toàn bộ provider request bounds. Ghi bytes từng stage: raw read results, charged resultBudgetView, native functionResponses, terminal serialized history và final owner request. Success-path và OK+partial-availability đều phải được kiểm trên kích thước đại diện; không chỉ overflow mock nhỏ.

**Gate:** tối thiểu batch hai ứng viên phù hợp phải đến được generation 3 trong bounds, đủ evidence cho owner chọn mà không cắt/bỏ field. Nếu ba mẫu không vừa, giới hạn experiment/hướng dẫn còn tối đa hai, ghi lý do; không claim đã hỗ trợ ba. Nếu hai mẫu không vừa hoặc MAX_RUNTIME_PRODUCTS bị initial context chiếm hết, dừng W2 instruction patch, giữ DESIGN_NOT_READY và báo thiết kế cần xem lại; không tăng bounds, thêm formatter hoặc âm thầm trim evidence. Các nhánh quá bound vẫn có regression fail-closed riêng.

### Cách kiểm chứng sau feasibility gate

- Mock owner dùng batch đúng → core đọc nhiều ứng viên trong 2 rounds/cap6, generation 3 không còn callable read; trusted giữ đúng từng subject/offer và giá, không dùng giá món này cho món khác.
- Batch read status **OK** nhưng availability từng field/offer thiếu → giữ partial result từng món, không coi cả nguồn thiếu hoặc giá zero. Khi có đủ căn cứ cho đúng việc khách cần ở một ứng viên, owner còn cơ hội chọn; phần thiếu cần thiết vẫn theo quy tắc handoff. Không suy mọi field gap là optional.
- Bất kỳ read-level **UNAVAILABLE/STALE** → giữ auto-handoff hiện hành của `requiredReadHandoffReason`/composition; core đọc terminal trước generation kế tiếp. Test phải thấy HANDOFF/NO_SEND theo commit thật và không thêm owner/verifier generation để chọn mẫu khác. Không đổi hành vi này để cứu experiment batch. Ghi rủi ro batch nhiều nguồn có thể tăng khả năng gặp terminal này; đo trong qualification, không đếm thành thiếu dữ liệu ở mọi ứng viên.
- Wire capture ở round 2 và terminal phase chứa đúng budget, availableOffers, actual tool results và callableTools; không mất dữ kiện vì projection/bound. Evaluator case IDs/rubric/expected outcomes không vào request; private checkout data tiếp tục do code xử lý, không đi vào model.
- Output quá bound vẫn fail-closed, không tự cắt ứng viên làm sai evidence. Không tăng bound để chứa mọi offer.
- Giữ các ca tìm theo mã/tên, AMBIGUOUS, báo giá mở đầu, câu hỏi deadline/size, mua lẻ và stateful.

Mock chứng minh đường thực thi khả thi, không chứng minh owner sẽ luôn chọn batch đúng. Chỉ actual provider run sau này mới đo được adherence. Nếu vẫn đọc một món rồi bế tắc, ghi OWNER_TOOL_PLANNING_LIMITATION và dừng hướng sửa instruction này; không nối thêm vòng cấm/nhắc vào prompt. Operation discovery có verified constraints là thiết kế khác, cần evidence/plan riêng, không âm thầm thêm trong implementation.

## 5. W3 — dùng đúng kết quả ưu đãi và tránh handoff khi còn đọc được

### Ưu đãi

Giá/tổng/ship đã đúng, không sửa negotiation engine. Thay đoạn description `record_negotiation` và đoạn owner về kết quả thao tác thành chỉ dẫn dùng **cartQuote hiện tại sau thao tác** để giải quyết phản đối giá. Nếu code vừa cho quyền lợi, nói lợi ích đó trước; không biến ưu đãi đang có thành giảm thêm, không nói không có hỗ trợ khi vừa có adjustment. Upsell chỉ là lựa chọn bổ sung có ích, không thay phần quyền lợi của giỏ hiện tại.

Không thêm source concession mới khi wire đã có adjustment, discountTotalVnd và grandTotalVnd. Deterministic tests chỉ kiểm đúng record/quote đến native và final serialized wire, freshness/receipt và số tiền; không dùng keyword grader để chứng minh thuyết phục. Provider review đọc toàn reply để xem khách được giải thích quyền lợi hiện tại hay không.

### ETA và reason handoff

Giữ nguyên quyền đọc/handoff. Thay đoạn thiếu dữ liệu hiện có bằng quy tắc thao tác rõ: field NOT_READ + công cụ đọc còn callable → đọc field cần giải quyết; kết quả đọc UNAVAILABLE → bàn giao phù hợp; không còn tool round hoặc không hoàn thành được lựa chọn → RESPONSE_UNAVAILABLE, không suy nguồn thiếu.

Không thêm gate bắt mọi handoff phải có failed read: nó có thể chặn handoff đúng và chỉ đẩy sang NO_SEND khi đã hết tool. Trong vòng này kiểm reason correctness ở evidence review, không triển khai classifier hiểu lời khách. Nếu phải ràng buộc reason bằng code sau này, cần thiết kế đủ đường terminal/recovery trước, có scope riêng.

Giới hạn diff instruction: ba vùng search/read, thiếu dữ liệu, dùng kết quả negotiation; giữ các đoạn giọng/tư vấn/chính sách/fit khác nguyên nội dung. Thay chữ cũ, không chồng phụ lục hoặc ví dụ benchmark. Lưu before/after diff, hashes và byte counts; độ ngắn không thay thế chất lượng.

## 6. W4 — xác định đúng chỗ thiếu evidence ảnh

Audit ba yêu cầu feedback và một yêu cầu ảnh màu be, gom theo product/intent/component/color; không coi bốn case là bốn asset phải tạo mới. Dùng captures/ledger hiện có trước, rồi truy đúng registry/import/published snapshot khi công cụ chỉ đọc có sẵn. Không đọc lịch sử khách hoặc secret không liên quan.

Deliverable là bảng: yêu cầu → IMAGE_ID/asset hash nếu có → metadata nguồn → publisher snapshot → adapter → selector → field thiếu đầu tiên.

- Có evidence tại nguồn nhưng mất trong code: sửa đúng producer/consumer đó bằng focused test, giữ provenance/hash/TTL và ABSENT/VALID/INVALID. Chỉ sửa khi chỉ ra được field path, không refactor lại pipeline đã nối.
- Nguồn thật thiếu row/feedback approval/color binding: DATA_NOT_READY; ghi record/version và phần shop cần bổ sung. Implementation không tự gắn nhãn bằng tên file, nhìn màu ảnh hoặc metadata của sản phẩm khác, không publish source.
- Không truy được registry: UPSTREAM_UNVERIFIED, không báo đã xác nhận không có ảnh. Audit chưa xong không được dùng làm lý do sửa prompt.

Handoff đúng do thiếu evidence ảnh là outcome được owner chấp nhận; vẫn ghi chưa phục vụ được yêu cầu ảnh. Không thay bằng ảnh chung và không giữ nguyên câu trả lời một phần để giả hoàn tất yêu cầu.

## 7. Phạm vi file và validation

| Nhóm | File dự kiến | Giới hạn |
|---|---|---|
| Recovery | single-agent-commerce-ingress.ts và ingress.test.ts | Đồng bộ counter sau recovery, không đổi effect/permission semantics |
| Harness/evidence | isolated-integration.mjs; attempt-evidence.mjs/test.mjs mới; protocol/analyzer/driver consumers thực sự đọc envelope đó | Retain evidence/diagnostic, shared-queue latch/no-drain và NOT_RUN accounting; historical artifacts và validator semantics giữ nguyên |
| Owner guidance | prompts/owner.vi.txt; gemini-inference.mjs tool descriptions | Chỉ ba vùng W2/W3; không đổi schema/API/model/retry |
| Regression | quote/ingress/adapter/protocol/driver tests; discovery-feasibility.test.ts + public fixture mới | Kiểm giao điểm mới, batch kích thước đại diện và actual wire, không mirror câu chữ prompt |
| Media | Chỉ thêm file vào diff nếu audit W4 chứng minh defect producer/consumer | Không mặc định có code patch hoặc source write |
| Docs/tasks | Plan, implementation record, audit evidence, tasks hiện hành | Tách planned / actually run / unknown |

Các file worker tương đối từ `apps/worker/src/`; harness/prompt từ `apps/worker/evals/single-agent-commerce-read-only/`. Nếu chạm shared package phải bổ sung scope/checks đúng package trước sửa.

Lệnh dự kiến sau implementation, chưa chạy trong planning task:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-discovery-feasibility.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/attempt-evidence.test.mjs
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Hai test mới và fixture nêu trên là planned files, chưa tồn tại hoặc chạy trong task này. Test worker feasibility có thể gọi helper projection/mock HTTP của eval qua test-only dynamic import, không đưa eval module vào worker runtime. Test attempt-evidence inject validator/drain/readback và consumer counting để kiểm hai validation stages, shared-queue latch (hai journey chung DB, mọi entrypoint, DB riêng), pending rows không đổi và NOT_RUN accounting; test ingress chứng minh counter/commit trên path thật. Nếu thiếu consumer test phải thêm focused test và ghi exact command trong implementation record. Không sửa historical DISPATCH_DRIVER/artifacts để nhận envelope mới: consumer campaign mới đặt ngoài folder source lịch sử, ghi identity riêng. Không test prompt bằng đếm keyword; provider capture chứng minh instructions/fields không mất hoặc đổi meaning. Không claim các lệnh trên PASS trước khi chạy.

## 8. Qualification ở task chạy model sau này

Sau implementation + focused checks + self-review, commit source và yêu cầu clean executable/config; capture HEAD vào runtime registration bên ngoài source đã seal. Không ghi SHA ngược vào frozen source hoặc sửa executable giữa run. Không tự chạy model vì kế hoạch được duyệt.

Khi owner yêu cầu: giữ Gemini 3.5 Flash Lite HIGH/GPT-6.1 Sol HIGH, Compact V2, 51 native case IDs hiện có + 17 controls, N1/retry0, cap217 generation requests. Không thêm x3 hoặc một lượt targeted rồi lặp lại full để tăng denominator. Stateful cohorts giữ setup/dependency order. Controls là safety gate trước native; sau đó chạy đủ population, không dừng vì giọng hơi kém. Ngoại lệ là qualification invariant/queue safety không còn xác nhận được: latch DB bị ảnh hưởng theo W1, giữ các slot chưa chạy trong registration và báo BLOCKED/NOT_RUN; DB độc lập tiếp tục. Không claim 51 executed/COMPLETE nếu còn slot bị chốt, không retry chúng trong cùng run để giấu lỗi.

Đọc đủ actual outcomes theo ba trục: protected safety/final gate; hoàn tất yêu cầu; hữu ích để mua. Báo riêng:

- Discovery: batch đã đọc bao nhiêu ứng viên hợp lý, budget từng generation, lựa chọn và reason terminal có đúng tình trạng không. Không có verified lựa chọn trong sample thì không bắt model bịa để PASS.
- Negotiation: kết quả code vừa áp dụng có được dùng trong lời đáp phản đối giá; totals/discount không đổi.
- ETA: đã đọc chưa, callable budget còn không; handoff do nguồn thiếu hay chuỗi chưa hoàn thành.
- Media: evidence thực có trong snapshot; đúng handoff khác với đã đáp yêu cầu. Các ca fault injection không thành số lỗi source thật.
- Recovery: error stage, observed commit/terminal, qualification error, generations/tokens/counters có giữ đủ không; không bỏ attempt lỗi hoặc đếm hai terminal, INVALID không tự drain/send. Diagnostic hook không cấp quyền gửi.
- Regression: ba opening quotes đủ ảnh; ca size dùng đúng engine; policy/cart/checkout/private intake và handoff silent giữ đúng. No-send code path phải xét actual question/preview.

17 controls PASS hoặc eligibility tăng không phải B GO. Một campaign N1 không stability proof. Verifier giữ nguyên; nếu gặp nghi vấn false PASS mới thì lưu exact draft/trusted snapshot và xét đúng subject/phạm vi trước khi quy nguyên nhân.

## 9. Savepoints và điều kiện dừng

Implementation dự kiến: W1 observed RED → minimum GREEN + retained evidence/no-drain → W2 feasibility gate thực tế → W2/W3 instruction diff và wire/regressions → W4 audit/patch hoặc DATA_NOT_READY → final checks/self-review → report. Không trộn model outputs vào source commit; không merge/deploy/live send.

W1 cần chứng minh ingress path thật, không chỉ synthetic counter. W2/W3 là một experiment instruction hẹp: nếu vẫn thất bại trên đường thực thi đã đủ dữ liệu thì giữ limitation và dừng lặp prompt đó; không tăng budget, sửa câu theo case hoặc thêm source tùy tiện. W4 dừng ở data-readiness gap khi chưa có nguồn cho phép.

Thành công vòng sửa này: code accounting/recovery đúng và evidence đầy đủ; model có đường batch hợp lệ, instruction không mâu thuẫn; source ảnh được định vị đúng; provider evidence sau này mới xác nhận hành vi. Không cam kết sửa hết tư vấn hoặc tuyên bố B GO từ kế hoạch.

## 10. Self-review kế hoạch

- Đã tính hết 2 rounds trước terminal, không coi call units còn lại là quyền đọc thêm.
- Không sửa verifier từ ba draft khác phạm vi và không thu hẹp các suy luận owner đã chấp nhận.
- Không biến kiểm reason handoff thành lớp chặn mới mà không có terminal hợp lệ.
- Không hứa batching chắc chắn sửa model; xác định scope experiment, tiêu chí và điểm dừng.
- Không sửa engine khi concession đã tới wire, không thêm context dump.
- Giữ fault injection/data gap/owner omission/runtime bug thành các nguyên nhân có evidence riêng; không đổi nhãn lịch sử.
- OK+field availability gap khác read-level UNAVAILABLE/STALE tự handoff; không hứa continuation mà runtime cấm.
- Validation trước return từ eval fixture giữ observed result; qualifier INVALID latch shared queue ở toàn disposable DB, không để lượt/journey khác drain pending rows; không thêm throwing worker validator làm mất envelope.
- Batch experiment phải qua feasibility với public snapshot đại diện và MAX_RUNTIME_PRODUCTS/8KB/wire bounds trước khi sửa instruction.
- Không mở lại vòng sửa giọng toàn prompt; không code/template theo tên/mã/giá của case.
- Các commands trên là planned; task lập kế hoạch chỉ đọc source/evidence, kiểm paths/link/hash và diff docs.
