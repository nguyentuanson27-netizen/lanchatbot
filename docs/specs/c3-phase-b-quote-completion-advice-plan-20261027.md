# Phase B — kế hoạch hoàn tất tác vụ báo giá và kiểm riêng tư vấn

Ngày: 27/10/2026. Revision 2. Planning base: `61f3c0587515ce89310d735583d59521262cbd67`. Trạng thái snapshot: REVIEW_PENDING; quyết định và hash cuối cùng ghi ở review trail riêng.

## 1. Mục tiêu và phạm vi được giao

Bot giúp khách chọn và mua hàng thời trang. Vòng này ưu tiên lỗi bỏ bước và lời bảo đảm sai có thể làm mất cơ hội bán hàng; giọng hơi dài/máy móc đã được owner tạm chấp nhận, không mở lại chương trình sửa giọng.

Task hiện tại chỉ viết kế hoạch → independent review → sửa kế hoạch → cùng reviewer kiểm lại đến APPROVE. Chưa implementation/provider/source-store write. Phần implementation/qualification bên dưới là kế hoạch cho task tiếp theo, không lệnh tự chạy sau approval.

Giữ một conversational owner, tối đa một semantic verifier. Code giữ identity/truth/freshness/state/permission/effects/receipts/privacy. Verifier chỉ kiểm protected semantics của exact final text; không chấm sức thuyết phục, rewrite, retrieval hay send. Không classifier ảnh-bắt-buộc, semantic router, regex theo câu khách/draft, generic agent framework, role thứ ba, repair/reverify hoặc generation retry. Không production entrypoint wiring, migration, live send, merge/deploy. Không sửa Size Engine, giỏ/checkout, policy hoặc verifier để cứu kết quả.

## 2. Evidence và sửa phân loại nguyên nhân

[R1](../../apps/worker/evals/single-agent-commerce-read-only/media-size-context-run-20261027/CHECKPOINT_B.md) và [R2](../../apps/worker/evals/single-agent-commerce-read-only/media-size-context-repeat-run-20261027/CHECKPOINT_B.md): cùng 51 case IDs, executable/prompt/config/corpus, N1 mỗi vòng; mỗi vòng37eligible/10handoff/4NO_SEND/143requests. Hai campaign không phải majority vote hoặc stability proof. R2 mất ảnh ở organic/multipart (mỗi ca2→0), R1 hai OWNER_TOOL_OUTPUT sau HTTP200 còn R2 không có generation errors. Eligibility không đo completion hay usefulness.

Phân loại đúng 10handoff mỗi vòng:

| Loại | Số | Bằng chứng/ý nghĩa |
| --- | --- | --- |
| Nguồn ảnh chưa có evidence cần dùng | 4 | 3feedback +1color-binding trong phạm vi nguồn đã quan sát; không kết luận shop-wide absence |
| Controlled POS failure | 3 | sourceMode=POS_UNAVAILABLE; proxy trả null/CONTROLLED_POS_UNAVAILABLE, không proof POS thật thiếu |
| Owner claim bị verifier chặn | 1 | discovery hứa không bó/cấn bụng khi chưa có SIZE_FIT cá nhân |
| Business handoff | 2 | purchase confirmation +customer requested human; silent |

R1 có2output-contract errors trong controlled POS cases: giữ nguyên errors/usage/denominator, không gộp thành data gap và không giả biết field/enum lỗi. Hai NO_SEND sau HUMAN là ownership policy; hai NO_SEND checkout vẫn có code-owned intake/preview. Không tính private masking là literal reply lỗi.

Root cause xác định được: code có firstContact/openingQuote/media selection nhưng không completion contract khi owner FINAL sớm; owner đã có thông tin/chỉ dẫn nhưng tư vấn lựa chọn và ranh giới fit chưa ổn định. Context reformat/fit field mới chỉ là giả thuyết chưa được chứng minh. [Plan media/size trước](c3-phase-b-media-size-context-fix-plan-20261027.md) và [implementation](c3-phase-b-media-size-context-implementation-20261027.md) giữ nguyên bytes; không viết lại evidence cũ.

## 3. P0 — corrigendum và audit nguồn, không giả thêm dữ liệu

1. Tạo corrigendum tham chiếu hai report/whole-turn reviews; sửa current tasks/PR narrative để phân biệt4observed media gaps với3controlled faults. Không sửa raw artifacts, metrics, captured outputs hoặc historical labels.
2. Với media, lập bảng product/asset/hash → registry/publisher/adapter/selector → thiếu field tại nguồn hay mất khi truyền. Dùng source capture hiện có trước; có live read riêng thì ghi version/time/IMAGE_ID; không gọi capture audit là live audit.
3. Không đề xuất bổ sung POS thật từ3fault fixtures. Chỉ mở POS-source fix nếu một audit LIVE riêng chứng minh lỗi thật.
4. Thiếu metadata thật chưa xác nhận → DATA_NOT_READY, giữ silent handoff. Không tự gắn feedback/color từ tên file, AI tag, màu toàn sản phẩm hoặc ảnh nhìn có vẻ đúng. Không ghi/publish nguồn trong implementation này.

Deliverable: corrigendum và ledger phân loại, không tăng schema/prompt hoặc chạy model.

## 4. P1 — tác vụ báo giá tường minh, code hoàn tất phần thực thi

### 4.1 Trigger và giới hạn trung thực

Chọn một operation hẹp mới `quote_product` trong surface công cụ của owner hiện tại, không intent/proposal/obligation JSON và không model trung gian. Operation biểu đạt yêu cầu nghiệp vụ báo giá mở đầu; không phải tool đọc mọi mục đích.

Owner chọn operation khi khách mới hỏi giá một mẫu đã xác định và cần form mở đầu. Code không đọc câu khách/draft để phân loại. `firstContact=true` chỉ là điều kiện quyền dùng operation; không tự kích hoạt ảnh. `read_product`, PRICE, tên sản phẩm trong draft hoặc hint MATCH_AVAILABLE không tự là trigger.

**Giới hạn:** owner có thể bỏ hoặc gọi sai operation. Code bảo đảm hoàn tất contract của operation đã được gọi hợp lệ; chưa chứng minh giải quyết mọi omission/hiểu sai ý khách. Nếu provider vẫn dùng read_product rồi FINAL cho ca báo giá, ghi OWNER_OPERATION_OMISSION, không chuyển thành PASS chỉ vì text/giá đúng. Không thêm auto-router hoặc retry để cứu ca đó.

Khách hỏi lại giá, deadline, size, tồn riêng, sửa giỏ hoặc đang có history: dùng surface hiện có. Khách hỏi tồn một size/màu cụ thể kèm giá thì dùng read_product có đúng filter và existing media tool khi phù hợp; quote_product không nhận size nên không được dùng để bỏ phần yêu cầu tồn. Owner gọi quote nhưng bỏ ý tồn cụ thể là OWNER_OPERATION_MISUSE, không task-completion PASS; code không phân loại lời khách để đoán phần này. Không đưa quote_product cho B1 read-only harness, consumer không có entry/media/handoff hoặc khi firstContact=false/null. Unknown product cần search/hỏi khách bằng tool hiện có; quote_product không tự tìm gần nghĩa hoặc đoán mẫu.

### 4.2 Input/output và điều kiện chạy

Input strict, additionalProperties=false:
- subjectRef: một PRODUCT ref đã bound, không URL/tên tự ghép;
- offerTypes:1–2 mã chính xác từ availableOffers, không duplicate; đúng phần khách đang hỏi, không mở mọi offer;
- color: optional đúng lựa chọn màu cần báo, không tự mặc định màu. Có color thì không được bỏ color để lấy ảnh chung khi chưa xác nhận đúng màu.

Không nhận reply text, giá/tổng, size fit, ảnh URL, policy hay quyền gửi từ model. Không nhận cờ skipMedia/optional/force/ignoreError. Không ảnh khách chỉ yêu cầu feedback/detail được tự thay bằng GENERIC qua operation này; owner gọi sai task vẫn là lỗi được đánh giá trong provider run.

Một call hợp lệ thực hiện lần lượt:
1. Validate capability, entry, permission/privacy/BOT, binding, subject/offer/color và budget trước read.
2. Dùng read_product qua composer hiện có: SINGLE cho1offer, COMPARE cho2offer. Dùng pin/TTL/provenance hiện hành; không tạo nguồn giá mới.
3. Đối chiếu PRICE của tất cả requested offers. Thiếu giá cần thiết → existing silent handoff PRICE_UNAVAILABLE; không dùng known price bù phần thiếu. Stock/size chỉ trình bày phần xác nhận; thiếu trường giới thiệu tùy chọn không handoff.
4. Dùng select_product_media GENERIC cùng subject/color qua selector hiện có. Color binding vẫn ABSENT/VALID/INVALID; không hạ yêu cầu màu. Không dùng hint để tạo attachment hoặc tự suy ảnh đúng phần mặc.
5. Không match/nguồn ảnh lỗi → existing silent handoff DEPENDENCY_FAILURE; không trả riêng giá hoặc ảnh chung để hoàn tất giả.
6. Chỉ trả OK khi read/selection cho cùng subject/offer scope hoàn thành và có ít nhất1asset đủ điều kiện hiện tại. Response giữ price/stock evidence của read_product, selected media description evidence và trạng thái operation; không chứa câu trả lời tư vấn mẫu hoặc draft do code viết lại.

Giá/ảnh đã chuẩn bị không có nghĩa đã gửi. Không writer/Outbox/send từ tool. Mọi partial result và failure giữ trace/accounting; không tạo effect receipt bán hàng giả cho read operation.

### 4.3 Composition, bounds và final gate

- Thêm trong candidate composer hiện có; dùng public scoped invoke/read/media/handoff paths, không gọi bypass các guards. Không framework composite-tool tổng quát.
- Chỉ đăng ký khi candidate quoteTask opt-in (định nghĩa bên dưới), có read +media +handoff +entry firstContact=true. quote_product bắt buộc là call duy nhất trong batch. Có sibling bất kỳ (read/select/state/effect/handoff), duplicate quote hoặc nhiều quote thì reject **toàn batch trước I/O và trước mọi write**, không chạy sibling hay inner call. Một quote_product invocation tối đa/turn; repeated invocation reject trước I/O, không generation retry. Sau quote OK vẫn có thể gọi tác vụ thông thường nếu còn budget; không lặp quote. Invalid args chưa chạy không được cấp authority hoặc result giả.
- Tổng budget không tăng: quote giữ chỗ **2 normal units** (1read_product +1select_product_media), dùng1existing tool round. Đây là hai primitive tool invocations; outer quote là orchestrating action, không cộng thêm thành primitive thứ ba. **Prepare vẫn tiêu thụ cap6**, không có ngân sách ngoài cap. Các tool thông thường dùng1unit như trước. Reserve cả2units trước read, sau validation standalone/capability/budget; không đủ2units hoặc rounds thì reject trước I/O. Không hoàn units khi read/selection fail.
- Candidate kế tiếp khai explicit `quoteTask:{version:"EXPLICIT_QUOTE_V1",toolWorkAccounting:"PRIMITIVE_WORK_V2",normalUnits:2,standalone:true,maxPerTurn:1}` trong manifest, registration, zero-generation preflight và runtime tools configuration. Tên operation/cost cố định, không nhận cost từ owner và không framework weighted-tools tổng quát. Legacy/default bỏ quoteTask thì không expose operation; validation/projection/counters theo contract cũ. Không sửa manifest/registration archived hoặc dùng identity cũ qualify source mới.
- Counter contract của PRIMITIVE_WORK_V2: `proposedToolCalls` giữ nghĩa outer proposed calls; `normalToolCalls` là consumed/reserved normal units đã gồm prepare; `toolCalls=normalToolCalls+terminalHandoffCalls` giữ tương thích phép cộng của consumer, nhưng không được gọi là số executed khi reservation chưa dùng hết. Bổ sung `executedNormalToolInvocations` (prepare và actual primitive invocations), `executedToolInvocations=executedNormalToolInvocations+terminalHandoffCalls`, cùng trace `quoteTaskWork` ghi reservedUnits và executed read/selection counts. Toàn bộ consumed normal units<=6; actual primitive normal invocations<=consumed units; terminal handoff attempts<=1; executedToolInvocations<=7. Parent quote không nằm trong underlying executed count. Read fail trước selection: reserve2/executed1; tới selection: reserve2/executed2; validation/capability/budget rejection trước inner invoke: executed0. Không hoàn reservation để vượt cap ở generation sau. Failed invoked primitives vẫn counted.
- `protocol.mjs` phải validate discriminator/counter equations/bounds mới; manifest/registration/runner/accounting và adapter `trusted.execution.toolBudget` phải nêu PRIMITIVE_WORK_V2 khi bật, giữ roundsRemaining/callsRemaining theo consumed units (bao gồm prepare). Không đổi nghĩa ngầm chỉ bằng giữ constants6/7. Legacy run không có version không bị thêm fields, đổi counters hoặc bundle hashes. Source-store reads/DB queries/HTTP requests là telemetry riêng, không tool units; capture cả chúng nếu đo, không nhập chúng vào executedToolInvocations.
- MEDIA lookup/read có clock/TTL/permission checks hiện hành; selection và protected claims được thêm vào cùng snapshot trước final generation.
- Owner trả exact final text → mọi draft sống hard precheck đều verifier mandatory → final deterministic gate → existing media readback/group egress. Không bổ sung hoặc sửa text/attachments sau verifier; toàn bộ group vẫn bị chặn khi stale/permission/recipient/binding thay đổi.
- Khi operation fail và handoff không chứng minh commit được: NO_SEND theo existing fail-closed policy; không text chờ, không kèm ảnh/giá. Không tự mở generic partial-answer recovery.
- 8KB tool-result/64KB owner-wire bounds và current image/group limits giữ nguyên. Result không chứa nested raw copies của read +media +context đã có; giữ exact evidence/provenance theo projection hiện hành, không truncate policy/facts hoặc lấy empty làm negative.
- Đóng result consumer chain trước code: producer hợp nhất product result +media description ở một quote result; `resultBudgetView` áp dụng cùng exact-current-product dedupe helper cho quote; Gemini native functionResponse projection dùng lại normalization của read_product cho requested offers/component labels/availability/null/priceDifferences và normalization media để bỏ assetRef nội bộ khỏi owner wire; CompactV2/final `completedToolTurns` giữ đủ projected fields/native roles; canonical trusted snapshot cho verifier vẫn là claims/policy/media do existing tools tạo, không lấy owner-facing quote status làm receipt/quyền mới. Không nhân đôi raw read/media dưới hai keys, không silently bỏ partial availability để lọt bound. Actual raw tool trace vẫn giữ cục bộ; canonical context/readback/hash không bị projection mutate. Nếu không reuse được helper nhỏ mà cần thay serializer/renderer toàn cục thì dừng để addendum/review, không mở scope formatter.
- Legacy/default paths, read_product và select_product_media riêng lẻ vẫn giữ behavior; historical registration/bundle hashes không được sửa ngược. Không ngầm đổi capability của B1.

### 4.4 Files dự kiến và contract consumers

- `apps/worker/src/single-agent-commerce.ts`: register/execute operation qua existing composers và failure handoff mapping.
- `single-agent-commerce-read-only.ts`: standalone validation và weighted tool-call reservation/telemetry trước batch; mở resultBudgetView dùng helper dedupe cho quote; giữ3owner generations/2tool rounds/6call units và primitive execution cap7 gồm handoff.
- `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce-media.ts`: chỉ reuse/expose helper tối thiểu khi composer chưa đủ interface; không đổi generic read/media semantics.
- `single-agent-commerce-ingress.ts`: entry/capability wiring và existing group validation, không production wiring.
- `evals/single-agent-commerce-read-only/gemini-inference.mjs`: strict declaration +parse/validation branch cho quote, PRODUCT ref enum, explicit capability list/accounting metadata; reuse product/media response normalizers cho quote ở native functionResponse và FINAL_REPLY serialized history. Kiểm actual mocked HTTP body, không chỉ declaration. No tool callable after budget ends. Trước implementation adapter/declaration, kiểm current official Vertex function-calling/schema documentation và ghi URL/ngày/constraints; không dựa memory, không đổi provider API/credential/retry route.
- `prompts/owner.vi.txt`: thay đúng chỉ dẫn báo giá dùng operation; mô tả operation nói rõ khi dùng/không dùng. Không thêm examples theo benchmark, policy/voice/advisory/verifier changes.
- `protocol.mjs`, `manifest.json`, `stateful-provider.mjs`, registration/preflight/accounting/driver test helpers: quoteTask discriminator, primitive counting equations/caps và capability/config/hash khớp new source. Driver217generation cap không tăng. Legacy omission path giữ nguyên, historical registrations/artifacts không regenerate. Accounting không dùng old toolCalls alias làm physical execution evidence khi versionV2 bật.
- Không shared-package change dự kiến. Nếu cần vì contract thực tế không nằm trong worker: nêu delta cụ thể và focused shared checks trước sửa, không mở refactor rộng.

## 5. P2 — kiểm riêng quyết định tư vấn trước khi sửa context/prompt thêm

Giữ CompactV2/owner advisory instructions/verifier/model như baseline. Không thêm fit block, benefit source, global renderer hoặc bản tổng kết nhu cầu do code suy diễn.

Audit đúng10case IDs ở cảR1/R2:
- sales-discovery-advice:need;
- media-decision:ask;
- b1-buying-concern, b1-buying-concern-v2, b1-buying-concern-v3;
- b1-changed-occasion, b1-changed-occasion-v2, b1-changed-occasion-v3;
- negotiation-price-objection;
- sales-size-advice:height-weight.

Mỗi case lập ledger: latest/history nguyên bản; actual final owner wire path tới product/offer/price/current concession/fit; có bị thiếu/truncate/sai subject không; quyền tư vấn nào được cấp; owner đã chọn/hứa/hỏi gì; actual terminal. Chỉ phân biệt facts/requests/ownership, không dùng regex hoặc grader chạy trong runtime.

Decision rule trước implementation:
- Có field/quan hệ mất hoặc sai phạm vi cụ thể → đề xuất patch producer/consumer đúng path, có minimal RED→GREEN, kiểm cả source/hash/serialization. Không được tự ghép field từ giả định bán hàng.
- Facts đã tới đúng nơi nhưng owner bỏ qua → OWNER_DECISION_ADHERENCE_LIMITATION. Không coi đó là quyền đổi renderer/prompt tiếp trong scope này. Giữ diagnosis và đưa owner quyết định một experiment riêng nếu cần.
- Discovery chưa cần SIZE_FIT để chọn mẫu; chỉ cần fit để kết luận độ vừa của chính khách. Không ép khách đưa đủ3vòng hoặc hỏi size ngay trước khi giới thiệu mẫu. Không nới verifier.
- Nhận xét định tính/nhẹ về phong cách, chất liệu/cảm giác theo ranh giới owner đã duyệt vẫn được chấp nhận; không tự siết lại thành mọi lợi ích đều phải có phép thử.
- Có upsell/nhắc một fact hợp lý không tự FAIL. Hoàn cảnh đã đổi phải xét mục tiêu mới; không chấm theo việc bắt buộc chọn áo lẻ hay cả bộ.

Deliverable P2 là audit có bằng chứng và quyết định patch/no-patch; **không mặc định phải có code change**. Mọi actual missing path mới ngoài P1 phải được viết thành addendum và review trước implementation, tránh scope creep.

## 6. Acceptance phải freeze trước code

### Deterministic RED→GREEN

| Nhóm | Kích thích | Kết quả bắt buộc |
| --- | --- | --- |
| Trigger | firstContact=true, chỉ read_product rồi FINAL | Không tự attach/parse prose; diagnostic provider grading giữ omission nếu ca yêu cầu báo giá. Không claim runtime biết ý định từ PRICE |
| Task đủ | quote_product1offer và2offers +source hợp lệ | Có đúng giá requested offers, selected images cùng subject/color, response/gate/capture khớp |
| Task fail | một requested PRICE thiếu; media unavailable/no match/unverified color | Silent handoff;0customer text/images; không downgrade color hoặc dùng giá một phần |
| Batch | quote+read, quote+select, quote+state/effect, quote+handoff, duplicate quote | Reject toàn batch trước I/O;0inner/sibling execution,0writes/partial commit; không bỏ sibling rồi tiếp tục |
| Budget | prepare đã tiêu thụ budget; remaining1 và2units; read fail/selection fail; invalid/repeated quote; final-only | remaining1 reject trước read, remaining2 có thể chạy; trace/counters đúng reserve2/executed1 hoặc2; actual failed invocations vẫn counted; no refund/cap growth |
| Scope | firstContact=false/null, missing capability, unknown ref/offer, wrong subject | Reject/no invocation; không gắn nhầm mẫu hoặc ảnh |
| Negative business | first-contact deadline/size; hỏi lại giá; sửa giỏ; hỏi sizeM còn không và báo giá | Existing operations không tự ảnh/form. Tồn size cụ thể là required khi khách hỏi, không optional; quote bỏ phần này ghi OWNER_OPERATION_MISUSE dù PRICE/ảnh đúng |
| Integrity | snapshot/PRICE/media expiry; changed hash/revision/recipient/permission; changed draft | Không send; toàn response group gated, không append sau verify |
| Tool failure | exception, bound8KB/64KB, handoff/readback thất bại | Existing bounded fail-closed disposition; retained accounting; không retry/reverify |
| Compatibility | direct read/media; B1readonly; sizeM/RELAXED; policy; checkout/private intake | Behavior không đổi; private data không vào model, không thêm earlyeffects |
| Wire/firewall | capture actual mocked HTTP body, strict declaration/parse/model refs/effort/config và toolWorkAccounting | quote chỉ callable khi capability/phase/budget cho phép; no evaluator IDs/rubric/expected outcomes; verifier thấy exactfinal+canonical trusted evidence |
| Result consumers | native quote functionResponse +FINAL_REPLY completedToolTurns;1/2offers; component labels; null/empty/partialavailability; biên8KB/64KB | Dedupe chỉ exact current duplicates; đầy đủ requested prices/current claims/media descriptions/availability/labels; không rawcopies/assetRef nội bộ/mutation canonicalcontext; overflow fail-closed |
| Accounting compatibility | manifest/registration/preflight/runtime/adaptermetadata/runnerproof, quoteV2 và legacy | Version/counters/inner trace khớp actual invokes; prepare trong cap6; actualnormal<=consumed<=6; handoff<=1; totalexecuted<=7; old bytes/IDs/hashes không đổi |

Tests phải kiểm actual outer/inner invocation counts, capreservation và Outbox/capture khi có persisted fixture, không chỉ mock owner làm đúng chuỗi. Races phải inject giữa operation/finalgate/egress, không chỉ so response schema.

### Commands dự kiến, chưa chạy trong planning task

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-session-silent.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu thêm focused file mới, ghi exact command bổ sung và observedRED trước minimumGREEN. Shared checks chỉ khi chạm package tương ứng. Local persistence tests/mock HTTP không phải fresh PostgreSQL/provider/live delivery acceptance. Không cộng test counts trùng hoặc claim commands PASS trước chạy.

## 7. Qualification sau implementation, chỉ khi owner yêu cầu chạy

Không tự gọi provider khi plan hoặc code được APPROVE. Nếu owner yêu cầu full vòng sau: giữ51case IDs+17controls, CompactV2, models hiện hành Gemini3.5FlashLite HIGH/GPT6.1Sol HIGH, N1/retry0; không thêm repetitions, fixtures hoặc hidden completion requests. Operation contract đổi → new executable/config/prompt hash và run identity; không dùng R1/R2 qualify code mới.

Commit source, clean executable/config, capture runtime HEAD bên ngoài frozen source, zero-generation preflight,17controls trước51native; không loại failed attempts khỏi denominator. Generation cap217 giữ nguyên, underlying tool-work cap không tăng. Không retry provider, không model substitution.

Báo ba trục riêng cho cả51outcomes:
1. Semantic eligibility/safety: actual verdict/finalgate; unsafe falsePASS/error không che.
2. Task completion: quote có/thiếu ảnh bắt buộc, đúng scope; state/tool/commit có receipt; correct handoff không được coi là đã giải quyết nhu cầu.
3. Sales usefulness: đọc cả hội thoại và actual terminal; lựa chọn phù hợp, lý do giúp quyết định, dùng hoàn cảnh mới, bước tiếp theo khả thi. Không đủ keywords=PASS, không có ảnh/upsell/factmention tự=qualityPASS.

Report mọi owner omission/misuse,7handoff nguồn phân loại đúng, businesshandoff,2HUMANfollowups/codecheckout; request counts/thinking tokens/cost/latency/fallback và unknowns. P50/p95 chỉ mô tả samples, hai N1 không stability proof. Không chốt BGO chỉ từ37eligible hoặc số ảnh tăng; human acknowledgement/live send chưa verified.

## 8. Savepoints, dừng và rollback

Implementation dự kiến savepoints P0corrigendum →P1RED/contract →minimumGREEN+checks →P2audit/no-patch/addendum →independent implementation review/fix →report. Không trộn source publication hoặc model campaign vào code commit. Plan revision/hash APPROVE không phải implementation approval.

Nếu trigger/declaration/budget integration không giữ được invariants hoặc cần classifier/router: DESIGN_NOT_READY, dừng workstream đó và báo lựa chọn; không vá parser. Nếu P2 không tìm được context defect, dừng context changes. Nếu tests/provider có regression: giữ evidence và quay lại candidate source trước thay đổi P1, không checkout xóa artifacts hoặc thay bảng điểm. Không tự triển khai B tiếp hoặc merge/deploy.

Planning acceptance: plan paths/commands existent, không secret/private data, reviewer độc lập đọc đủ context và APPROVE exact plan SHA256; lưu revision findings và resolution ở trail, tasks hiện hành, PR391. Không sửa lại bytes plan sau approval chỉ để đổi status; trail là authoritative decision.
