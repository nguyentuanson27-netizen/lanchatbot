# Phase B — kế hoạch sửa terminal handoff và giữ quy tắc

Ngày: 26/10/2026. Revision 2 — đã sửa theo lượt review lại revision 1 (REVISE 2P2), self-review và được cùng reviewer **APPROVE ở mức kế hoạch**. Base source `461e6e571ce60a18b3e231a4d5ce889afb151f6f`; tài liệu audit/review/tasks được lưu cùng savepoint kế hoạch. **Implementation đã thực hiện theo revision 2; executable review APPROVE trên af0bc76b.** Trạng thái và commands thực chạy ở [implementation evidence](c3-phase-b-rule-retention-implementation-20261026.md). Provider acceptance chưa chạy; B chưa GO. Phần “dự kiến/CHƯA CHẠY” bên dưới là registration tại thời điểm chốt kế hoạch, không phải trạng thái hiện tại.

Nguồn: [audit](c3-phase-b-rule-retention-audit-20261026.md), [review độc lập REVISE 1P1+3P2](c3-phase-b-rule-retention-plan-independent-review-20261026.md), [opening contract](c3-phase-b-opening-quote-integration-20261024.md), [turn completion](c3-phase-b-turn-completion-plan-20261024.md), [quy tắc thiếu dữ liệu](c3-phase-b-missing-shop-information-handoff-20261025.md) và [21 actual outcomes](../../apps/worker/evals/single-agent-commerce-read-only/missing-information-run-20261025/CONVERSATIONS.md).

## 1. Mục tiêu và giới hạn

Khách nhận phần giúp mua hàng đã có căn cứ; phần shop cần xử lý tiếp được chuyển thật, không thay cả câu bằng lời chờ chung. Thiếu dữ liệu shop cần thiết thì handoff; thiếu thông tin khách thì hỏi. Không chuyển chỉ vì field null không liên quan câu hỏi.

Giữ một conversational owner, tối đa một verifier, exact final reply và authority do code. Giữ model/config hiện hành, policy nguồn, corpus gốc, giới hạn ba owner generations, không generation retry. Không mở vòng sửa giọng/regex/parser/repair/framework hoặc production wiring/deploy/live send. Không đổi silent/customer-requested handoff thành cơ hội tư vấn thêm. Không sửa source timestamp refresh trong vòng này.

Thay đổi có chủ ý: quyền terminal handoff tách khỏi quyền gọi tool thông thường. Đây là thay đổi contract/budget, không được báo là giữ nguyên mọi tool limit.

## 2. S1 — định nghĩa quyền terminal và accounting xuyên runner/adapters

### Quyết định

- Tối đa 2 normal tool rounds, 6 normal tool calls cho search/read/state/cart như hiện tại; tối đa 1 terminal handoff attempt riêng. Tổng số tool invocations thực thi có thể tới 7, phải báo đúng tổng và từng loại. Proposed/rejected calls ghi riêng đầy đủ, không bị che bởi giới hạn executed calls.
- request_handoff không phải quyền đọc thêm. Lượt cuối chỉ được FINAL text hoặc một request_handoff hợp lệ; không batch với normal tools. Calls bị từ chối vẫn được ghi, không thực thi và không loại khỏi accounting.
- Sau một request_handoff hoặc automatic required-data handoff đã được chuẩn bị, không có request/commit handoff thứ hai. Các recovery dùng lại quyết định đang có, không tạo retry sau conflict/ambiguity.
- Automatic handoff cũng phải có terminal-attempt accounting; không ẩn effect trong read tools. Báo riêng attempted/prepared/committed/blocked/unknown, không dùng prepared thay cho accepted.
- B1 không có port không được quảng cáo callable handoff. Capability configured, callable tools của generation hiện tại và remaining budget là ba thông tin tách rõ.

### Adapter contract

Request metadata thể hiện normal tools còn được gọi và terminal handoff còn được gọi. Ba phase: TOOL_OR_REPLY, TERMINAL_HANDOFF_OR_REPLY, FINAL_REPLY. Khi đã có pending handoff và còn generation chỉ cấp FINAL_REPLY; pending reason là code-owned execution metadata, không phải semantic plan/ownership object mới.

Gemini terminal phase khai báo duy nhất request_handoff, AUTO, không khai báo search/read/state/mutation. Tiếp tục dùng completed tool turns dạng data đã được sửa trước; không khôi phục opaque native tool continuation ở terminal phase. FINAL_REPLY vẫn tools=[]/NONE. Sol adapter thực thi đúng cùng allowlist; giữ đường captured Sol native trước đây khi normal tools vẫn được phép. Không đổi provider identity/config.

Runner kiểm allowlist độc lập với wire. Mixed/late normal tools hoặc nhiều request_handoff bị từ chối, không execute một phần. Không tăng generation thứ tư để xin câu trả lời sau một terminal call cuối.

## 3. S2 — prepare, verify và atomic handoff group

### Hai đường cụ thể

**A. Còn generation cho final reply:** handoff cần xử lý nghiệp vụ/missing data được chuẩn bị trong code, chưa chuyển HUMAN hoặc enqueue. Tool trả trạng thái prepared, không handoffAccepted. Ngừng normal tools. Owner dùng generation còn lại để trả phần đã biết, không báo thao tác đã hoàn tất. Code giữ holding copy theo đúng policy, không để model thay policy message/tag/reason authority.

Group được dựng một lần trước verifier: exact owner text, exact bounded policy holding nếu policy yêu cầu, và media đã xác minh độc lập nếu đủ điều kiện. Exact customer-visible text của group được đưa vào verifier; raw owner text không sửa/rewrite. Canonical message-group hash bind ranh giới/order/text/image riêng, tránh chỉ nối chuỗi rồi coi là đủ binding. Không thêm text/ảnh sau verifier.

Owner không được viết confirmation cho effect chưa có receipt. Đường A chỉ dùng holding copy đã audit/đăng ký exact text/hash từ snapshot policy hiện hành, không khẳng định việc chuyển đã hoàn tất. Holding có nghĩa “đã chuyển”, như CUSTOMER_REQUESTED_HUMAN hiện tại, chỉ dùng đường commit code-owned ngay; không cấp receipt giả hoặc ngoại lệ ngầm cho verifier. Copy mới chưa xác định đủ điều kiện precommit không vào A. Registration ghi rõ partition này, không phân loại bằng production regex hoặc model mới; không đổi policy nguồn để lách điều kiện. Dù copy precommit-safe, chỉ enqueue khi transaction thực sự thành công.

**B. Không còn generation hoặc final draft không đạt:** bỏ toàn bộ model draft, handoff bằng holding code-owned theo policy. Renderer PRICE chỉ đủ điều kiện khi lượt có đúng một resolved explicit SINGLE product/offer pair, completed read và current PRICE claim cùng scope; không có COMPARE, nhiều pair hoặc selection ambiguity trong lượt. Không lấy sellingOptions trả kèm, không dùng thứ tự kết quả hoặc field model tự gắn “khách hỏi” làm authority. Bản text ghi rõ sản phẩm/offer, không báo khách đã chọn hay mua. Không đủ điều kiện thì chỉ holding và ghi partial limitation, không chọn tất cả giá đã đọc.

Đây là giới hạn cố ý của renderer, không phải bằng chứng code đã hiểu ý khách. Chất lượng liên quan nhu cầu vẫn phải review whole reply. Multipart set+áo giữ đủ hai phần qua đường A; đường B chưa có verified final text thì không tự dựng lại hai giá từ COMPARE và không được chấm là đã trả đủ. Renderer không dựng lời tư vấn hoặc kết luận đổi/trả từ draft bị reject. Procedure/eligibility từ owner chỉ được giữ ở đường A khi có nguồn và verifier đạt. Nếu đường B không giữ được procedure, ghi actual outcome hạn chế, không chấm đủ chất lượng chỉ vì handoff thành công.

Silent policy và CUSTOMER_REQUESTED_HUMAN giữ đường kết thúc ngay, không gọi thêm model hoặc chen partial. Existing no-chart media recovery giữ riêng và phải có regression; không mở quyền HUMAN send chung.

### Binding và thứ tự kiểm tra

1. Prepare pin intent/reason, exact authority trước transition, fence/request/recipient/source/generation, policy identity và facts/claims/source versions/expiry. Chưa pin final group/hash vì đường A chưa có FINAL. Pending giữ trong turn, không ghi state nghiệp vụ mới chỉ để điều phối.
2. Sau FINAL hoặc khi đã chọn bounded recovery B, code dựng exact group một lần, kiểm bounds và seal message-group/hash; không có placeholder group. Đường A hard precheck → một verifier trên exact visible reply → deterministic readback/final gate trong **BOT snapshot trước transition**. Đường B không dùng PASS của draft bị reject; từng bounded fragment có code authority/claims riêng và kiểm freshness. Commit chỉ được dùng sealed group này.
3. Trước commit kiểm lại authority vẫn đúng predecessor, policy và source identities/expiry, subject, permission/privacy/recipient; chưa thỏa thì không gửi draft hoặc confirmation. Dùng transaction/CAS/inbox guard hiện có để atomic ownership + event + tag intent + đúng một Outbox group. Prepared không phải effect receipt.
4. Handoff binding versioned tối thiểu ghi exact before authority hash/revision, exact expected after authority hash/revision, group hash, policy/source binding và loại nội dung owner-verified hay code-owned. Code tạo exact successor qua transition hiện có; không có phép bỏ qua revision/owner để tái dùng finalGate PASS.
5. Trước sequence 0, sau reload/restart, phải chứng minh đúng committed event/group/generation/recipient, exact successor HUMAN state và source/policy/freshness hiện tại vẫn khớp. Source reader phải đọc lại identity từ nguồn authority, không chỉ tin metadata cũ trong Outbox; reader unavailable/stale → block whole group. Không dùng `claims=[]` hoặc chỉ handoff receipt để cấp quyền gửi giá/policy/media. Receipt cũ vẫn giữ request/subject/recipient/revision gốc thuộc predecessor, không sửa hoặc remap sang revision HUMAN mới. Delivery kiểm receipt gốc cho claim trước transition và exact handoff event cho quyền gửi group sau transition riêng; receipt không thuộc predecessor hoặc sai request/subject/recipient phải chặn.
6. Expected handoff transition được chứng minh qua exact predecessor/successor/event; mọi thay đổi state khác invalidate. Routing/privacy/permission/kill switch/blocking tags vẫn có quyền chặn. Toàn group quyết định một lần trước sequence 0; retries chưa bắt đầu phải revalidate, các sequence sau theo group gate hiện có.
7. Commit false/CAS conflict: không retry effect, không tuyên bố chuyển thành công; chọn blocked/no-send theo authority hiện có. Commit ambiguous: không enqueue từ caller lần hai; chỉ delivery ledger đọc lại chứng minh exact group đã commit mới có thể gửi một lần. Sau commit bị delivery chặn, giữ HUMAN và báo riêng handoff completed/message blocked, không rollback ownership hay tạo nhóm thay thế.

Đây là phần implementation cần chứng minh bằng tests: không khẳng định binding/readiness hiện tại đã hỗ trợ protected partial sau handoff. Nếu thiếu schema hoặc reader contract thì bổ sung tối thiểu trong contracts + shared consumers; không giả handoff partial thành media binding. Không thêm migration nếu payload versioned hiện hữu đủ; nếu phát hiện bắt buộc migration thì dừng riêng phần đó, ghi lý do và thiết kế cụ thể trước mutation dữ liệu.

## 4. S3 — opening quote đúng nhu cầu, giữ scope nguồn

- Khi firstContact=true, chính khách hỏi giá và mẫu/offer rõ: dùng form mở đầu + ảnh đúng mẫu theo capability. Guard tránh intro cho deadline/size/correction và lượt hỏi lại giữ nguyên.
- Giá/offer/subject cần đúng. Material/form có verified evidence đúng scope thì dùng, không có thì bỏ trường đó; không parse description/search để tự cấp facts, không handoff vì field trình bày tùy chọn.
- Sau search có product ref: ở round hai owner có thể batch read_product với GENERIC selector. Nếu chưa rõ offer, trả lời/xin xác định đúng phần cần, không chọn ngẫu nhiên chỉ để dựng card.
- Multipart set + áo giữ đúng hai ý và hai mức giá có căn cứ; không thêm chân váy ngoài nhu cầu. Không ép mọi multipart vào SINGLE chỉ để có openingQuote.
- Ảnh cần thiết thiếu → handoff qua S2, giữ giá đã biết. Missing shop data cần thiết khác cũng handoff; thiếu ảnh/tên mẫu từ khách thì hỏi khách, không handoff tự động.
- Chỉ sửa đoạn prompt về capability/ngoại lệ opening và chuẩn bị handoff sớm khi đủ căn cứ. Không nhét ví dụ benchmark, không mở rộng phần giọng, không sửa verifier semantics để che workflow thiếu.

## 5. S4 — fallback/catalog và khả năng không có handoff

Liệt kê mọi terminal reachable theo B1/read-only, persisted, media/no-media, handoff/no-handoff. C3_B_MEDIA_NEXT_STEP_V1 không tiếp tục dùng làm recovery chung sau thiếu feedback; chuyển sang bounded unavailable disposition phù hợp capability, không tự hứa đã chuyển. Không tùy tiện gỡ exported legacy ID nếu consumer lịch sử còn dùng: giữ legacy validation khi cần nhưng current producer/registration phải thống nhất và có test unreachable theo config mới.

Manifest, protocol, stateful registration và driver lấy cùng catalog hiện hành thay vì khai báo text cũ riêng. Dynamic code-owned fact fragments không giả thành một fallback static ID/hash; ghi renderer version/hash và exact output/group hash. Không sửa frozen artifacts/run cũ. Không dùng câu nhắc nhân viên/bot hoặc câu hỏi lựa chọn ảnh khi khách đang đợi giá/ảnh cụ thể.

## 6. S5 — RED → GREEN và acceptance

Viết test theo contract trước implementation; lưu lệnh/observed RED, rồi sửa tối thiểu và chạy GREEN. Không đổi nhãn dữ liệu hoặc nới assertion chỉ để xanh.

| Nhóm | Positive | Đối chứng/chặn |
| --- | --- | --- |
| Terminal quyền | search→read tồn UNKNOWN→handoff trong 3 generations; 6 normal calls vẫn có 1 terminal attempt ghi riêng | cùng data chỉ hỏi giá không handoff; mixed/late normal tool không execute; port absent không giả success |
| Partial giá | một SINGLE pair giá đủ + feedback thiếu, giữ giá đúng cùng một handoff group/event/tag; multipart đường A giữ set+áo | COMPARE trả thêm giá áo/chân váy không lọt vào renderer B; nhiều pair/ambiguity chỉ holding và ghi limitation; sai offer/subject, price đổi/hết hạn, draft FAIL không tái sử dụng |
| Policy | đủ căn cứ đổi/trả, kết luận ngắn + bước đúng nguồn + handoff đường A | thiếu thông tin khách thì hỏi; sai policy/thiếu căn cứ không tự duyệt; đường B thiếu procedure ghi quality limitation |
| Atomic/gate | exact before→after transition, capture đúng cả group sau restart; receipt cart gốc thuộc predecessor còn hợp lệ | changed permission/recipient/privacy/revision/policy/source, expiry; receipt sai predecessor/request/subject/recipient; không remap receipt để cho qua |
| Commit ambiguity | transaction commit rồi caller timeout: caller không enqueue lại, exact ledger group có thể gửi một lần sau đầy đủ gate | rollback rồi timeout hoặc ledger proof thiếu: không gửi; CAS conflict không effect retry; không gửi riêng fragment hoặc confirmation mới |
| Existing handoff | silent/customer request/no-chart giữ contract | không tự partial khi silent/customer-requested; không gửi BOT group sau HUMAN |
| Opening | ads/organic quote, ảnh đủ; multipart đúng các phần được hỏi | repeat/unresolved/deadline không intro; optional attrs rỗng không handoff; component không dùng parent attrs |
| Catalog/wire | mọi current terminal/renderer khai báo; Gemini và Sol đúng callable allowlist | late tools trên wire NONE cũ, label leak, catalog lệch, extra generations/requests đều bị bắt |

Với mỗi case ghi actual accepted group hoặc blocked group, handoff ledger/receipt và provider accounting riêng. SEND_ELIGIBLE, handoff commit và hữu ích cho việc mua hàng là ba trục độc lập; không chấm keyword hoặc coi chuyển được là trả lời đủ.

### Lệnh dự kiến khi implementation (CHƯA CHẠY)

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/image-selection.test.ts
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu sửa handoff shared schema: focused `pnpm --filter @lana/contracts exec vitest run src/commerce-handoff-delivery.test.ts src/commerce-media-delivery.test.ts` và typecheck/build package/consumers thực sự chạm. Nếu sửa database transaction/Outbox consumer: focused realtime-runtime tests và exact-source isolated PostgreSQL capture COD/BANK qua driver hiện có, có guard disposable DB, không live send; exact command/output đăng ký trước chạy. Không ghi PASS từ các lệnh dự kiến này.

## 7. Provider plan sau implementation, chưa dispatch

Commit executable/config trước, worktree sạch, capture runtime HEAD/hash ra registration ngoài frozen source, preflight và kiểm capability/capture. Giữ Gemini 3.5 Flash Lite HIGH và verifier GPT-6.1 Sol HIGH, N1/retry0, max1 upstream request cho mỗi registered generation attempt. Một native turn có thể dùng tối đa 3 owner + 1 verifier requests; không gọi nhầm thành một request cho cả case. Không dùng independent reviewer thay verifier.

17 scoped verifier controls hiện có trước native; lỗi control/unsafe eligible thì dừng qualification, giữ denominator. Native targeted lấy ca sẵn có cho opening và missing data/after-sales; bổ sung cặp đối chứng cần thiết thành diagnostic preregistered riêng nếu corpus hiện chưa có, không thay câu hay gắn expected labels vào model input. Đăng ký exact unique cases/slots/setup/upper request cap trước dispatch, không suy số từ tên suite hoặc tăng ngầm.

Targeted phải đạt cả workflow/capture và business outcome đã đăng ký mới full cohort B1/B2/B3 hiện hành; reuse các slot đã chạy cùng source/config/registration khi driver hỗ trợ, không chạy prefix rồi đếm lại như full mới. Full chạy hết cohort theo yêu cầu owner trừ unsafe-send/privacy/operator gate bắt buộc dừng; không dừng vì minor voice. Provider errors/fallback/dependent-blocked slots giữ denominator; không tự retry rồi lấy kết quả đẹp. Không claim N1 là ổn định, không B GO chỉ vì verifier PASS.

Lượt sửa kế hoạch hiện tại **không chạy provider**. Source/protocol/corpus thay đổi sau seal thì evidence thuộc run mới.

## 8. Savepoints và điều kiện hoàn thành

1. Plan được reviewer/self-review sửa xong, mọi choice P1 có contract và acceptance trước code.
2. S1 terminal contract + RED/GREEN, commit riêng; S2 atomic group/binding + regression/gates/shared checks, commit riêng. Không promote S1 đơn lẻ thành đã sửa missing-data experience.
3. S3 opening + S4 catalog và tests, commit riêng. Re-review exact executable head, sửa findings rồi focused/typecheck/build/lint trước seal.
4. Provider chỉ khi được yêu cầu thực hiện bước chạy; report actual outcomes/unknowns/limitations, cập nhật todo. Không tự merge/deploy/post-B.

### Tự review revision 2 và xử lý review revision 1

- Không giữ claim “tool budget hoàn toàn không đổi”: có terminal allowance riêng, báo total tối đa 7.
- Không giữ claim “mọi handoff luôn có model partial”: đường B bounded, procedure chưa có không tự tạo.
- Không dùng PASS cũ qua đổi revision hoặc mở HUMAN send chung: exact successor/event/source binding bắt buộc.
- Không biến material/form tùy chọn thành dữ liệu bắt buộc hoặc bỏ guard deadline đã duyệt.
- Reviewer revision 1 yêu cầu chọn scope renderer: đã giới hạn explicit SINGLE một pair, loại COMPARE/sellingOptions/multi-pair, ghi limitation thay vì tự chọn phần khách hỏi.
- Reviewer yêu cầu tách prepare và seal: prepare chỉ giữ intent/authority/evidence; group tồn tại sau FINAL rồi mới seal/verify, commit không đổi group.
- Giữ receipt predecessor nguyên gốc; test exact handoff transition riêng, không remap revision.
- Phân biệt caller timeout với transaction đã commit: caller không tạo thêm confirmation; ledger-proven group vẫn có thể gửi một lần, rollback/unknown không proof thì không gửi.
- Đã làm rõ copy policy có effect confirmation không được đưa vào precommit verifier bằng ngoại lệ; case precommit-safe và code-owned immediate phải đăng ký trước.
- Cùng reviewer đã đọc lại revision 2 và APPROVE, không còn finding bắt buộc trước implementation. Approval là cho thiết kế, không chứng minh runtime/binding/readiness/delivery hiện tại đã đáp ứng; executable diff cần RED→GREEN và review riêng như savepoints trên.
