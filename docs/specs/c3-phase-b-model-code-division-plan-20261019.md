# Phase B — sửa phân công model–code và kiểm riêng tư vấn

Ngày 2026-10-19. **PLAN_READY; chưa sửa runtime, chưa chạy provider.**
Owner chọn: giữ kiến trúc, sửa phân công model–code, kiểm riêng khả năng tư vấn. Planning source: `689e1e434be4a17b52e5e8525cb2a337bbda4cff`, branch `feat/c3-phase-b-commerce-20261014`, PR391. Đây không phải run source SHA. implementationBaseSha lịch sử giữ nguyên `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; không khẳng định đó là main mới nhất.

Kế hoạch này thay các đề xuất **chạy tiếp** ở đầu tasks/plan.md và tasks/todo.md. Không thay kết luận hoặc dữ liệu lịch sử. A vẫn OWNER_BYPASS; B chưa đạt, sales/live STOP. Phạm vi lượt hiện tại: lập và self-review kế hoạch; các bước implementation/provider bên dưới chưa thực hiện.

## 1. Bằng chứng và giới hạn kết luận

Nguồn bắt buộc:
- [Architecture](c3-single-agent-commerce-architecture-20261004.md), [verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [Phase B](c3-phase-b-read-only-integration-plan-20261014.md).
- [93 lượt nền](../../apps/worker/evals/single-agent-commerce-read-only/bounded-source-repeat-2x-20261018/REVIEW_93.md).
- [F1–F3 implementation](c3-phase-b-contract-fixes-implementation-20261018.md), [lượt execution-contract thất bại](../../apps/worker/evals/single-agent-commerce-read-only/execution-contract-run-20261018/CHECKPOINT_B.md), [lượt post-review đã rollback](../../apps/worker/evals/single-agent-commerce-read-only/post-review-run-20261018/CHECKPOINT_B.md).
- [Implementation đang có](c3-phase-b-agreed-fixes-implementation-20261018.md), [66 kết quả gần nhất](../../apps/worker/evals/single-agent-commerce-read-only/isolated-agreed-run-20261018/CHECKPOINT_B.md) và [toàn bộ hội thoại/điểm](../../apps/worker/evals/single-agent-commerce-read-only/isolated-agreed-run-20261018/CONVERSATIONS_AND_REVIEW.md).

| Finding đã quan sát | Quyết định cho vòng này |
| --- | --- |
| Bỏ checklist: usable 14→13/21; sửa search: usable 8→8/12 dù fallback giảm | Không lấy giảm fallback làm tiêu chí thành công; không gắn quan hệ nhân quả cho mẫu nhỏ và source khác nhau. |
| Sai đường dẫn WAIST_CM/HIPS_CM, sửa state + đọc lại chiếm hai vòng; add tới lúc NONE | Đổi giao diện field model phải viết; chuẩn bị dữ liệu của sản phẩm đã bound trước owner. Đây là giả thuyết cần đo, chưa phải nguyên nhân nội tại model đã được chứng minh. |
| Read tổng AO rồi khẳng định tồn be/M; không thực hiện add | Giữ scope tồn tổng/biến thể rõ; không coi preload là đã chọn biến thể, thêm giỏ hoặc chứng minh vừa. |
| Sân khấu: nguồn tới owner nhưng không có độ kín áo; hai lớp có thể thuộc váy | Kiểm tư vấn riêng trên chính nguồn đó; không bổ sung fact giả và không nới verifier để cho kết luận sản phẩm thiếu căn cứ qua. |
| POS lỗi đôi lúc bị diễn giải thành shop không bán lẻ | Giữ SOURCE_UNAVAILABLE và phần mô tả có thật; kiểm khả năng trả phần biết mà không bịa quy định/hẹn theo dõi. |
| Sai quan hệ trước/sau giảm hoặc làm tròn 978.100 thành 978.000 | Code đã có cartQuote đúng. Đo lỗi diễn đạt tiền riêng, không bổ sung máy tính hoặc tool quote thứ hai. |
| PASS nhưng STALE; log chỉ có snapshot IDs | Bổ sung phần khác nhau của context công khai vào evidence eval hiện có; không nới gate khi chưa biết trường nào đổi. |
| Preview mới, MIEN-NAM, receipt recovery, source errors đã có lợi ích/code proof | Giữ các phần này. Sáu preview edits ở so sánh mới thuộc formatter cũ được cố ý giữ; không sửa lại formatter đã hoàn thành. |

## 2. Phân công sau sửa

| Phần việc | Owner model | Code |
| --- | --- | --- |
| Hiểu lời khách | Hiểu tham chiếu, sửa ý, chọn sản phẩm/offer/màu/size khách yêu cầu, tư vấn và chọn bước bán hàng | Không suy ý bằng regex/router; không tự chọn màu, offer hoặc size từ tồn |
| Chuẩn bị nguồn | Tìm sản phẩm khi chưa xác định; tìm món thay theo nhu cầu | Với currentProductId đã bound, đọc nguồn hiện hành bằng reader có sẵn trước owner; không đợi model gọi chỉ để biết cách bán |
| Số đo | Chọn loại số đo, giá trị và trích dẫn tin hiện tại | Chuyển mã field hữu hạn sang đường dẫn lưu trữ; kiểm nguồn, giá trị, CAS và receipt như hiện tại |
| Mua/sửa giỏ | Gọi add_to_cart/change_cart_item với lựa chọn khách | Kiểm selection/giá/tồn/quyền, commit, tính tổng và readback như đã có |
| Tư vấn/giọng | Tạo exact final text, quyết định lời khuyên và bước tiếp phù hợp | Không viết sẵn câu tư vấn, không sửa ngầm draft sau verifier |
| Kiểm gửi | Một verifier kiểm protected semantics của exact reply | Freshness/binding/revision/permission/recipient/privacy/receipt/hash và terminal outcome |

**Không xây lại executor:** `single-agent-commerce-effects.ts` đã gọi selection trong add/change, xử lý CAS/receipt, chạy state/read trước effects và quote sau effects. Giữ nguyên những trách nhiệm này; không thêm tool “xử lý mọi việc”, planner JSON, model role, durable state hoặc repair loop.

## 3. Thứ tự thực hiện

### P0 — khóa dữ liệu và chuẩn so sánh

Đăng ký case IDs, lịch sử, nguồn công khai, capabilities, rubric và config trước generation. Dùng các ca đang có; không viết câu hỏi mới chỉ để kích đúng tool. Các câu cần nối intake phải tự nhiên và phản ánh đúng hành trình.

Giữ Gemini 3.5 Flash Lite HIGH owner / GPT-6.1 Sol high verifier, credential routes và generation config từ manifest hiện hành. Không đổi model/effort/verifier/policy/giọng trong cùng vòng này. Kiểm route/version thực tế trước dispatch; khác identity thì ghi BLOCKED, không thay ngầm.

Dùng snapshot nguồn mới chụp và lưu đủ cho replay trong môi trường eval; không giả vờ tái tạo snapshot cũ hiện còn thiếu. Bản replay dùng đồng hồ eval được ghi rõ và freshness gốc; không sửa observedAt để biến nguồn cũ thành hiện hành. Truth/freshness live vẫn do reader và gate hiện có. Paired opening phải cùng dữ liệu nguồn, lịch sử, initial state, config; IDs phiên độc lập được ghi riêng.

Evaluator-only labels/rubric/expected behavior không vào owner hoặc verifier. Freeze request projection, source/config/prompt/schema hashes rồi commit, require clean executable/config worktree, capture HEAD ở runtime. Không ghi run SHA ngược vào frozen source.

### P1 — code chuẩn bị sản phẩm đang được xác định

**Sửa ở composition/runner hiện có**, dùng `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce.ts` và session composition khi cần; không thêm service.

1. Sau input/privacy/permission checks, preload currentProductId nếu khớp PRODUCT binding hiện hành và đúng shop/scope. Audit cho thấy read-only context mặc định currentProductId=null dù initialProducts đã bind: nếu chỉ có đúng một PRODUCT bound, được đọc sản phẩm đó như dữ liệu tham khảo, **không gán nó thành lựa chọn khách/currentProductId**. Không có hoặc có nhiều PRODUCT mà thiếu current binding thì không preload; không chọn sản phẩm đầu tiên. Đây là quy tắc dữ liệu đầu vào, không phân loại ý khách.
2. Đọc tối đa một sản phẩm bằng reader hiện có, không chọn offer/màu/size thay khách. Kết quả đưa vào cùng trusted products/offer literals/claims đang dùng, giữ authority/version/scope. Aggregate stock không đổi thành stock của màu/size.
3. Khi đã có snapshot cùng nguồn còn hợp lệ trong lượt, dùng lại; không đọc lại chỉ để phục vụ preload. Effect selector và final readback vẫn kiểm nguồn hiện hành theo trách nhiệm cũ.
4. Preload tính vào trần 6 logical tool operations của lượt và thời gian end-to-end; không tăng budget 2 tool rounds/3 owner generations. Một preload mới tiêu thụ một call, không gọi generation để yêu cầu model đọc lại. Trần 6 không phải trần mọi I/O nội bộ: selector/readback vốn có các source reads riêng, phải đếm riêng và không che tăng chi phí. Reader lỗi được giữ thành kết quả thiếu nguồn, không retry tự động hoặc chặn phần tư vấn có đủ thông tin.
5. Không preload toàn catalog/history. Search mới vẫn do owner chọn truy vấn; không tự dịch “đi sân khấu” thành bộ lọc độ kín hoặc chọn mẫu thay.

Kỳ vọng: ngay lần đầu owner biết sản phẩm bán các offer nào, có mô tả gì; có thể gọi state + add trong batch hiện hữu khi khách chọn đủ. **Không bảo đảm owner sẽ làm vậy.** Nếu vẫn đọc thừa/không add/sai màu, bác bỏ kết luận preload đã giải quyết tool planning.

RED→GREEN: source-bound đúng/sai/trống, một PRODUCT khi currentProductId=null không đổi lựa chọn/state, nhiều PRODUCT không tự chọn; permission/privacy reject không preload; source lỗi; một read tối đa và accounting; scope giá/tồn không đổi; no mutation; nguồn đổi trước effect/gate vẫn bị phát hiện. Test lại cùng-turn state→add và state reject→dependent effect reject. Điểm tích hợp phải nằm sau guards và trước owner đầu tiên trong runner; chỉ sửa composition để cấp reader có sẵn, không chạy I/O sớm hơn guards khi khởi tạo tools.

### P2 — model không phải viết đường dẫn lưu trữ số đo

Sửa `gemini-inference.mjs` và test adapter; giữ tên tool `apply_customer_state`, domain writer `single-agent-commerce-state.ts` và source checks.

Wire contract mới dùng field enum mã số đo `HEIGHT_CM/WEIGHT_KG/BUST_CM/WAIST_CM/HIPS_CM`; code map hữu hạn sang `measurements.*` trước domain invocation. Các field fitPreference/preferences phải có mapping chính xác được chốt cùng schema. Native schema, owner state projection và fieldErrors trả về cùng một từ vựng; domain/revision/receipt và verifier context giữ contract nội bộ.

Đây là **thay contract wire**, không là nhánh “thấy args sai thì đoán sửa”. Chỉ chấp nhận enum đã khai báo; không nhận thêm alias/path tự do, không fuzzy match. Giữ nguyên SET/REPLACE/CLEAR, giới hạn ops, một trích dẫn đúng nguồn/giá trị, atomic batch, unresolvedFields và CAS. Model vẫn phải hiểu eo hay mông, của ai, khách đang sửa gì; code không tự suy từ văn bản.

Giữ native functionCall/functionResponse transcript và call ID đúng transport; lưu raw native args cùng domain args đã map trong evidence hiện có, không ghi đè lịch sử. Chỉ thay những câu prompt/schema mô tả field để khớp contract, không thêm ví dụ ca lỗi hoặc hướng dẫn giọng mới.

RED→GREEN: mapping hai chiều request/result, value/sourceQuote không bị biến đổi, unknown field reject trước write, duplicate target reject, CLEAR, preference, nhiều số trong quote vẫn reject, không nhận history làm nguồn mới, source conflict vẫn chặn dependent effects. Kiểm raw provider request không rò evaluator labels/PII.

P1/P2 là hai savepoint riêng. Lượt provider đánh giá gói hai thay đổi, **không quy phần tăng điểm cho riêng P1 hoặc P2** nếu chưa có so sánh tương ứng.

### P3 — kiểm riêng tư vấn, không phải kiến trúc runtime mới

Dùng runner/projection/verifier hiện có, thêm mode eval tối thiểu nếu cần. Với bốn ca đã có:
- `b1-changed-occasion`: đổi từ tiệc trong nhà sang sân khấu;
- `b1-partial-source-v2`: mô tả có, nguồn giá/tồn lỗi;
- `b1-buying-concern`: ngại ren cầu kỳ khi dự tiệc ban ngày;
- `b1-search-read`: exact lookup làm control giá/phạm vi món.

Đưa lịch sử và **public context thực tế đã lưu sau các lần đọc hợp lệ** cho cùng owner viết một final reply. tools=[]/NONE, một generation; không yêu cầu intent/obligation/plan JSON. Không đưa draft cũ, verdict, đáp án mẫu hoặc lựa chọn do evaluator tự chọn. Mỗi context phải có nguồn/hashes và capability rõ, đặc biệt không có follow-up executor trong B1.

Không tự bổ sung độ kín/mẫu thay hay SIZE_FIT còn thiếu. Nếu không có context đủ để trả điều khách hỏi, vẫn giữ ca, chấm phần thông tin thiếu riêng và xem owner xử lý được tới đâu. Không “làm đủ facts” bằng nội dung tưởng tượng.

Chấm draft độc lập về tư vấn, rồi chạy verifier/final gate và chấm actual terminal outcome riêng. Câu hay nhưng bị block không được tính là khách nhận câu hay. Câu PASS nhưng lời khuyên kém vẫn kém. Context lấy sau tool có thể thuận lợi hơn runtime lúc đầu, nên đây là phép thử **khả năng tư vấn khi đã nhận nguồn**, không chứng minh toàn bộ kiến trúc tốt hơn.

Bảng kết luận:
- Advice-only vẫn kém, nguồn liên quan có đủ: vấn đề còn ở quyết định/diễn đạt của owner.
- Advice-only tốt, integrated kém trước khi có đủ nguồn: ưu tiên tool/context acquisition.
- Hai nhánh cùng thiếu dữ kiện ảnh hưởng quyết định: thiếu nguồn; không sửa prompt thành biết điều chưa có.
- Draft phù hợp nhưng verifier chặn: kiểm exact text, scope, context trước khi kết luận verifier quá chặt.
- Verifier PASS nhưng gate block: đọc public context diff; không đổ cho giọng hay nới gate.

### P4 — đo tích hợp và giữ giọng bán hàng

Không sửa prompt giọng diện rộng trước kết quả P3. Reviewer đọc toàn cuộc trao đổi và tin khách thực nhận; kiểm:
- Có chọn/giải quyết điều khách cần, thay đổi lời khuyên khi hoàn cảnh đổi?
- Lý do có giúp mua hàng và gắn đúng sản phẩm/phần đồ? Cho phép nhận xét thẩm mỹ, cách phối, cảm giác dự kiến; không đòi test cho mọi lợi ích.
- Có hỏi lại điều đã biết, trả quyết định về khách, hẹn không có executor, hoặc tạo đặc tính cụ thể chưa biết?
- Câu có giống shop đang chat: tự nhiên, không thuật “hệ thống/ghi nhận/điểm đánh đổi”, không chép mô tả thành quảng cáo?
- Nhắc số đo/lựa chọn để xác nhận sửa hoặc giải thích thực sự được chấp nhận; không chấm theo số keyword hay cấm lặp mọi fact.
- Tiền phải đúng cả số và quan hệ đơn giá/tạm tính/giảm/ship/tổng; thao tác và quyền lợi đúng receipt/policy.

Minor polish không tự thành FAIL. Khóa USABLE / NEEDS_EDIT / UNUSABLE / OWNERSHIP_CONTROL trước khi đọc rejected draft/verdict detail; draft diagnostic là bảng riêng. Khác biệt nguồn/budget phải hiện trong kết luận.

Dùng hành trình stateful cũ, thêm **một lượt yêu cầu checkout trước private-input turn**, không thay fixture private thành bằng chứng owner đã mời checkout. Quan sát owner gọi confirm_purchase → code invitation → synthetic private input chỉ đi qua code → preview mới → confirmation; policy handoff/receipt/fence giữ nguyên. Không gửi thật.

STALE: lưu các đường dẫn public đã thay đổi + before/after allowlisted trong log eval hiện có, gồm evidence identity/freshness, permission/recipient dưới dạng hash khi cần. Không lưu raw PII, secrets hoặc full private state. Nếu chưa có readback thì vẫn ghi UNKNOWN, không suy nguyên nhân.

## 4. Phạm vi chạy có trần

Đây là đăng ký dự kiến cho bước execution, **chưa chạy**. Hoàn tất manifest cụ thể và commands trước dispatch; không tự mở rộng khi có failure.

| Nhóm | Số terminal outcomes tối đa |
| --- | ---: |
| Advice-only: 4 ca ×3 | 12 |
| Baseline HEAD cũ: ca mở giỏ ×3, clean initial state/pinned sources | 3 |
| Candidate stateful: 8 lượt/hành trình ×3, gồm intake mới | 24 |
| Candidate B1: 4 ca trên ×3 | 12 |
| Tổng | **51** |

Không gọi 51 outcomes là 51 hội thoại độc lập. Ba candidate opening nằm trong 24, không chạy lần nữa. Tối đa **180 generation requests**: advice12×2 + baseline3×4 + stateful24×4 + B1 12×4; code-only controls thực tế dùng ít hơn. Nguồn/embedding requests, tokens, latency và errors đếm riêng. Không hidden retry/best-of; mọi lỗi nằm denominator.

Chạy advice diagnostic và baseline/opening trước, sau đó hoàn tất cùng danh sách đăng ký để nhìn cả hồi quy. Dừng phần phụ thuộc nếu có vi phạm authority/PII/receipt hoặc không giữ được source identity; ghi các lượt chưa chạy. Không tự chạy full45/conditional16 hay mở vòng tiếp để cứu kết quả. Historical STOP/FAIL không bị thay bởi vòng mới.

Mục tiêu vòng hẹp:
- Candidate opening 3/3 đúng ý khách, receipt/cart đúng, không hỏi lại/không tool muộn; variant/correction giữ màu và size khách đã chọn.
- 3/3 hành trình đi qua actual code invitation/preview/confirmation đúng phạm vi; control handoff/no-send giữ đúng.
- Exact lookup/partial-source controls không hồi quy về truth, nguồn thiếu hay hẹn không có khả năng.
- Báo từng ca/lần và cả draft/terminal; chỉ gọi một ca ổn định trong mẫu này nếu 3/3 USABLE. 2/3 là chưa ổn định, không majority PASS.
- Bất kỳ protected false PASS quan sát được phải ghi riêng và STOP readiness; không bỏ khỏi mẫu vì advice được xem là hay.
- Đây là quyết định tiếp tục nghiên cứu Phase B, không phải GO production hoặc chứng minh đạt Checkpoint A.

## 5. Verification và savepoints

P1/P2/P3 quan sát RED trên test hành vi trước sửa; GREEN tối thiểu. Không viết test kiểm sự tồn tại của câu prompt. Dùng tests hiện có; chỉ thêm ca chứng minh contract thay đổi và hồi quy liên quan.

Commands dự kiến (chưa chạy trong lượt lập kế hoạch):
```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/realtime-reply-differential.test.ts --maxWorkers=2 --minWorkers=1
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```
Worker lint hiện là tsc --noEmit; ghi đúng tên command, không đếm lại thành một lần typecheck khác đã chạy. Nếu thêm test file mode diagnostic phải đăng ký command exact trước seal. Provider entrypoints hiện có: run.mjs và stateful-provider.mjs; chưa bịa CLI cho mode chưa được triển khai.

Savepoints: kế hoạch → P1/tests → P2/tests → diagnostic/registration/tests → executable seal → raw evidence → whole-turn review/report. Commit riêng không đồng nghĩa thêm approval gate. Mỗi phần có thể revert riêng; giữ F1–F3/MIEN-NAM/preview/intake/receipt recovery và dữ liệu lịch sử.

Complexity budget: không thêm runtime role, durable state/table, generic framework hay gate. Chỉ một bounded preparation ở composition, mapping enum tại adapter và diagnostic mode tại eval; reuse validation/executor. Chưa có lý do sửa shared package. Nếu cần tách tool tư vấn/transaction thành kiến trúc khác hoặc thêm semantic parser thì dừng thiết kế đó, không giấu trong P1/P2.

## 6. Self-review kế hoạch

- Đã loại đề xuất “code tự kiểm giá/tồn rồi thêm giỏ” vì executor làm sẵn.
- Không coi schema/NONE/prompt nhắc lại là fix mới; P2 thay wire contract chính thức, không sửa args sai theo heuristic.
- P1 không chọn size/màu/offer hoặc chuyển lỗi nguồn thành quy định shop; source reads vẫn có budget/accounting.
- Không bỏ dependency block chỉ vì khách tự chọn size; state lỗi vẫn không được lờ đi.
- Không nhồi thêm ví dụ/bài mẫu; giữ owner prompt ngoài đoạn field bắt buộc tương thích và giữ verifier.
- Diagnostic không cấp thêm model role/runtime bypass, không oracle facts, không đồng nhất draft tốt với terminal tốt.
- Causal limit, unknown STALE, missing historical snapshot và chưa có provider proof intake được giữ rõ.
- Mẫu 51 có trần, không tự nhân full suite; tiêu chí whole-conversation/giọng và nguồn sai được tách.
- Chưa có bằng chứng P1/P2 sẽ cải thiện hành vi. Nếu thất bại, báo giả thuyết không được ủng hộ, không nối tiếp bằng thêm lời nhắc cùng nội dung.
