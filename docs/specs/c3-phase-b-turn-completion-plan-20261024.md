> Execution update25/10/2026: IMPLEMENTED_AND_EXECUTED, STOP_AT_PREFIX tại source235d570a.17controlsPASS +31/51native,20NOT_RUN theo gate. [Report](../../apps/worker/evals/single-agent-commerce-read-only/turn-completion-run-20261024/CHECKPOINT_B.md). Nội dung đăng ký trước run bên dưới giữ làm lịch sử; frozen pre-run bytes trong artifact/frozen-inputs. Không có independent implementation re-review mới; B chưa GO.

# Phase B — hoàn thành lượt và tư vấn đúng việc khách cần

Trạng thái: **PLAN_REVISED_AFTER_REVIEW; SELF_REVIEWED**. Đã tiếp thu [review độc lập: 1 P1 + 3 P2](c3-phase-b-turn-completion-plan-review-20261024.md) theo yêu cầu owner sửa plan; bảng đối chiếu ở mục 9. Reviewer chưa review lại bản đã sửa. Chưa sửa runtime/prompt, chưa chạy test hoặc provider theo kế hoạch này. Base kiểm tra: `8115516e33b43c68260cb9c2662073cfbd46540d`, working tree sạch trước khi viết bản kế hoạch đầu tiên. A vẫn OWNER_BYPASS; B chưa GO.

## 1. Mục tiêu và evidence

Khách được giúp chọn và mua hàng: tác vụ hoàn tất hoặc có chuyển tiếp thực sự; lời tư vấn xử lý đúng điều đang cản mua. SEND_ELIGIBLE không thay thế đánh giá này.

- [51 lượt vừa chạy](../../apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024/CONVERSATIONS.md), source `af482367aa953486a27f290b658c23ef1200f993`: 40 eligible, 4 fallback, 4 handoff, 3 NO_SEND. Hai NO_SEND là code checkout có tin gửi. Ba lượt thực sự im lặng gồm hai dependency handoff và một lượt phụ thuộc đã thuộc HUMAN.
- [Snapshot diagnostic đã căn chỉnh](../../apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024/SNAPSHOT_DIAGNOSTICS_ALIGNED.json): nghĩa các protected claims không đổi; provenance POS đổi. Không diễn giải so sánh claim theo vị trí thành thay đổi tồn thực tế.
- [Tool traces](../../apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024/TOOL_DIAGNOSTICS.json): search→search→late read; search→read→late search. Cả hai final request đã NONE/tools=[]; không gọi tool sau budget.
- [Thử advice-only 19/10](../../apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/CHECKPOINT_B.md): integrated và advice-only cùng 8/12 usable. [Bỏ chỉ dẫn capability 21/10](../../apps/worker/evals/single-agent-commerce-read-only/advice-capability-20261021/CHECKPOINT_B.md) không cải thiện. Không lặp lại hai phép thử này để chẩn đoán chung.
- Spec: [architecture](c3-single-agent-commerce-architecture-20261004.md), [verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [same-name chart](c3-phase-b-same-name-size-sharing-20261024.md). Kế thừa acceptance ảnh/size đã đạt; không mở lại mapping hoặc quy tắc inference owner đã chốt.

Điều chỉnh đề xuất trong chat: **chưa thu hẹp snapshot trong vòng này**. Không thể xác định dữ liệu “không dùng” chỉ từ tool đã gọi hoặc từ draft. Dữ liệu owner nhìn thấy có thể ảnh hưởng câu trả lời. Việc đổi phạm vi binding cần thiết kế riêng, không ghép vào sửa im lặng.

## 2. Phân công và thứ tự

| Bước | Deliverable | Điều kiện qua bước |
|---|---|---|
| T0 | Bảng nguyên nhân của từng ca, trace producer→projection→consumer, diff dự kiến | Phân biệt lỗi đã chứng minh với giả thuyết; không đề xuất lại can thiệp cũ |
| T1 | Dependency handoff có lời báo theo policy candidate, receipt và quyền gửi được kiểm trước sequence 0 | Test RED→GREEN, caller coverage, transaction/delivery/restart controls đạt |
| T2 | Sửa contract tìm–đọc nếu có defect; đăng ký T2_IMPLEMENTED hoặc T2_NO_INTERVENTION trước run | Phân biệt evidence bản sửa với observed completion N1; không tăng budget hoặc auto tool |
| T3 | Thay đúng chỉ dẫn báo giá mở đầu xung đột với việc của lượt | Giá/ảnh vẫn chạy khi phù hợp; không dựng router ý định trong code |
| T4 | Self-review, deterministic checks, freeze | Không có authority regression; provider identity và accounting hoàn chỉnh |
| T5 | 17 controls → 31 native prefix → 20 native còn lại | Opening controls nằm cùng stage với deadline; gate theo mục 7, không chạy lại prefix |
| T6 | Review toàn outcome, so từng ca, kết luận | Không sửa rubric/source trong run; báo rõ phần chưa giải quyết |

Savepoint riêng T1, T2 (nếu có thay đổi), T3, rồi seal executable. Không dùng kết quả T1 để nhận đã sửa tư vấn.

## 3. T0 — chẩn đoán có giới hạn trước sửa

Không chạy provider. Đọc actual requests/results của `b1-changed-occasion` và `sales-discovery-advice:need` trong run hiện tại và các run trước có chính ca đó, ưu tiên `execution-media-run-20261024` và `full-phase-b-20261024`. Ghi source/prompt/config identity, khác biệt nguồn và outcome mỗi run; nếu ca không có trong run đó thì ghi NOT_PRESENT, không thay bằng một ca tên gần giống. Phải đọc cả lần không còn OWNER_TOOL_MODE nhưng vẫn verifier FAIL để tránh coi đổi loại lỗi là đã thành công.

So thêm `b1-search-read-v2`, `b1-search-read-v3` để kiểm đường truyền dữ liệu. Đây chỉ là controls tìm theo tên/mã đã biết, không phải đối chứng tương đương cho khả năng khám phá/chọn mẫu. Lập bảng mỗi generation: yêu cầu khách, sản phẩm đã bind, dữ liệu search trả, read đã thực hiện, status/reason từng tool, trường bị projection bỏ, số round/call còn lại, declarations thực gửi.

Search hiện đã có mô tả để sàng ứng viên; prompt đã bảo dùng lại dữ liệu và gom đọc độc lập. Final đã NONE/tools=[]; không lặp lại việc thêm ba chỉ dẫn này. Phải chỉ ra field cụ thể thiếu, status bị diễn giải sai hoặc identity không nhất quán trước khi sửa contract. Không suy “thiếu context” chỉ từ late tool.

Tách provider transport error của `b1-buying-concern` khỏi lỗi model/tool. Giữ accounting và fallback; không sửa prompt hay thêm generation retry vì ca này.

## 4. T1 — dependency handoff không bỏ khách chờ

### Contract và vị trí sửa

- Runtime hiện dùng `single-agent-commerce-handoff.ts/selectCommerceHandoff` đọc published matrix; không override SILENT bằng câu hard-code trong runtime.
- Candidate chạy isolated dùng `handoff-matrix.candidate.json` và `candidate-handoff.mjs`. Importer hiện chỉ áp dụng deltas CUSTOMER_REQUESTED_HUMAN/SIZE_RULE_UNAVAILABLE; phải nối DEPENDENCY_FAILURE một cách tường minh, giữ các rule khác, ghi upstream/candidate hashes.
- Đề xuất candidate DEPENDENCY_FAILURE: HOLDING_REPLY_THEN_HANDOFF, lời báo **“Em chuyển nhân viên hỗ trợ tiếp cho chị nhé.”** Freeze exact text/hash trước model. Đây là sửa policy candidate, chưa publish nguồn live. Giữ tag theo nguồn hợp lệ; nếu rule/nguồn không hợp lệ thì fail closed.
- Reuse transaction ownership/event/tag intent/Outbox của `single-agent-commerce-handoff.ts`, `single-agent-commerce-persistence.ts`, ingress; bổ sung delivery binding/check cho text-only nếu cơ chế hiện tại thiếu. Terminal readback trả NO_SEND không tự thu hồi Outbox đã enqueue, vì vậy phải bảo vệ ngay đường giao tin theo contract dưới đây. Không dùng draft stale.
- Không tự đổi mọi FALLBACK sang HUMAN. Thay đổi matrix áp dụng cho mọi caller hiện hữu của DEPENDENCY_FAILURE trong candidate; có thay đổi lời báo ở private-input recovery. Quyền truy cập dữ liệu riêng tư, checkout transition, kill switch và blocking tag không được nới theo thay đổi lời báo.
- Handoff receipt authorizes group chuyển giao riêng; không cấp quyền cho draft/ảnh stale. Chưa mở rộng mixed media+handoff sang dependency recovery trong vòng này. Durable media guard của bản trước giữ nguyên.

### Phạm vi caller phải kiểm

T0 bổ sung quét mọi caller trực tiếp và gián tiếp của DEPENDENCY_FAILURE; bảng dưới là phạm vi đã thấy, không dùng danh sách này để bỏ qua caller mới phát hiện.

| Caller/nhánh | Hành vi candidate mong muốn | Điều kiện riêng |
|---|---|---|
| `createCommerceHandoffTools.recover`, kết quả base là HANDOFF do snapshot/readback/dependency | Một bàn giao và một lời báo nếu policy/authority cho phép | Draft cũ không đi ra; không giả định mọi dependency chỉ là POS refresh |
| `request_handoff` do owner gọi với reason DEPENDENCY_FAILURE hợp lệ | Cùng policy và receipt như recovery | Lệnh model không tự cấp quyền; không tạo thêm bàn giao nếu đã terminal |
| Ingress private checkout không hoàn thành | Có lời báo khi thực sự bàn giao thành công | Không diễn đạt như đặt hàng thành công; không đưa tên/SĐT/địa chỉ vào model hoặc lời báo |
| Ảnh/file khách chưa có privacy projection, ngoài nhánh receipt xử lý được | Chuyển người và báo ngắn | Bytes/URL giữ ngoài model, không diễn giải nội dung ảnh chưa đọc; trigger metadata vẫn đúng |
| Private checkout/receipt đã commit thành công | Giữ nhánh thành công hiện hữu, không chạy dependency recovery | Không tạo thêm holding reply hoặc effect do thay matrix |
| Conversation đã HUMAN, quyền gửi mất, private transaction chưa rõ kết quả | Giữ đúng guard/reconciliation hiện hữu | Không dùng holding policy để chen vào HUMAN, chạy lại effect hoặc xác nhận commit chưa chứng minh |

Các reason khác giữ nguyên rule. Published policy ngoài isolated candidate không bị đổi. Nếu nguồn thiếu hoặc mâu thuẫn, không dựng policy dự phòng từ prompt.

### Contract từ policy tới actual delivery

1. **Chuẩn bị:** load policy hiện hành, chọn rule; giữ identity/version/hash policy, reason, exact text/payload hash, scope/recipient, source request/generation và authority revision/fence. Dùng cùng quy tắc policy identity lúc chuẩn bị, kiểm trong transaction và kiểm trước gửi; không chỉ giữ reason hoặc nội dung câu.
2. **Commit:** kiểm lại policy/authority trước khi chốt transaction ownership + event + tag intent + Outbox. Policy đổi trước commit thì không commit dựa trên quyết định cũ. Không hứa một phép đọc ngoài transaction tự loại được mọi race; kiểm ở delivery là bắt buộc cho khoảng sau lần đọc cuối. Gắn response group với đúng handoff event/generation và state sau commit. Giữ private binding trong payload mã hóa hiện hữu nếu đủ; nếu contract cần mở rộng thì thêm field bounded/versioned tối thiểu và kiểm shared consumers, không giả làm media binding.
3. **Trước sequence 0:** worker sau reload/restart phải kiểm được committed event, đúng nhóm/tin, policy identity, recipient, generation/revision và current delivery authority. HUMAN do chính handoff đã commit chỉ cho phép nhóm lời báo đó theo contract hiện hữu; không coi HUMAN bất kỳ là quyền gửi và không phát sinh reply BOT mới. Routing, privacy, blocking tag và kill switch vẫn có quyền chặn.
4. **Invalidate:** policy đổi hoặc authority mất trước lần bắt đầu gửi thì không gửi nhóm đã chuẩn bị; dùng disposition blocked/manual-review hiện hữu, actual accepted messages = 0. Không dùng terminal NO_SEND như bằng chứng duy nhất, không tự tạo nhóm thay thế hoặc rollback ownership đã commit. Báo riêng trường hợp handoff đã hoàn tất nhưng lời báo bị gate chặn.
5. **Retry/restart:** nhóm chưa bắt đầu sequence 0 phải revalidate, kể cả gate cache trước đó là ALLOWED. Các sequence sau dùng một quyết định cho cả group theo invariant hiện hữu; không re-decide từng message. Không migration mặc định, không framework mới.
6. **Commit ambiguity:** không gửi dựa trên kết quả chưa chứng minh hoặc tự lặp mutation. Nếu transaction đã commit nhưng caller mất response, delivery chỉ được gửi một lần khi ledger/authority đọc lại chứng minh đầy đủ; nếu không chứng minh được thì giữ không gửi. Tag intent không phải bằng chứng Pancake đã gắn tag hoặc nhân viên đã đọc.

Guard cho text-only holding được kiểm cả trên các reason đang có holding reply (customer-requested-human, size, checkout/after-sales khi dùng cùng port) để không làm hỏng hành vi cũ. Không chỉ gắn bảo vệ cho một case ID hoặc một nhánh POS.

### Tests bắt buộc

1. Reproduce hai snapshot refresh bằng clock/source fixtures, không chờ lịch refresh thật: old draft không được gửi; một handoff commit và một lời báo được capture nếu authority còn hợp lệ.
2. Nguồn thay giá/tồn thật hoặc fact hết hạn cũng không tái sử dụng PASS. Không kiểm “nghĩa tương đương” để bypass snapshot.
3. HUMAN có từ trước, recipient/revision/fence/permission/privacy/routing thay đổi hoặc blocking tag/kill switch: không lời báo trái quyền. HUMAN do chính bàn giao đang được giao tin có positive control riêng.
4. Transaction rollback, unknown commit chưa có proof, duplicate inbox/restart: không lời báo giả, không hai handoff/outbox groups. Commit thành công nhưng caller mất response: ledger chứng minh thì group được gửi đúng một lần qua gate; không chứng minh thì không gửi.
5. Lượt kế tiếp thuộc HUMAN: bot không trả lời chen vào; có audit bàn giao của lượt trước. Đây là đúng ownership, không đòi bot phải gửi ở mọi lượt.
6. Published SILENT rule ngoài candidate vẫn được tôn trọng; importer chỉ thay các reason đã đăng ký.
7. Policy HOLDING đổi thành SILENT, đổi text/tag/version, hoặc policy unavailable: inject trước commit và sau commit–trước sequence 0, gồm restart/cache ALLOWED. Old Outbox không được accept; kiểm capture thực tế bằng 0, không chỉ assert terminal NO_SEND. Không nhận test chỉ mock terminalOutcome làm bằng chứng delivery.
8. Private checkout failure, ảnh khách chưa hỗ trợ, receipt/checkout success và explicit request_handoff: kiểm theo bảng caller, privacy và số lần gửi. Các test này là deterministic/integration, không thêm provider cases.
9. Existing holding reasons và unchanged policy: đúng event, đúng câu, một group, không trùng; ảnh+size và ordinary media vẫn qua durable gate cũ. Policy/authority invalidation sau commit không tự chuyển lại BOT hoặc tạo group thay thế.

Acceptance: khi policy/authority còn hợp lệ, hai tình huống refresh và các caller trong phạm vi có đúng lời báo cùng committed handoff; khi policy/authority mất hiệu lực, nhóm pending thực sự không gửi. Phải có transaction + dispatcher/restart + capture evidence, receipt/payload khớp; không claim nhân viên đã đọc hay xử lý xong. Không thêm holding policy trước khi các guard này đạt.

## 5. T2 — hoàn thành tìm–đọc trong budget

Files liên quan: `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce-read-only.ts`, eval `gemini-inference.mjs` và focused tests của chúng.

Quyết định theo T0:

- Nếu search đã có dữ liệu nhưng projection bỏ mất: giữ lại đúng trường nguồn cần phân biệt sản phẩm, subjectRef và trạng thái đọc. Không thêm summary suy diễn hoặc thông tin giả; giữ byte/subject bounds.
- Nếu read đã thành công nhưng kết quả/context không nhất quán: sửa producer/consumer để giữ cùng identity/offer/status và dữ liệu đã xác minh. Không đổi UNAVAILABLE thành NO_MATCH hoặc NOT_SOLD.
- Nếu request thực tế đã đúng và đủ: ghi **model không hoàn thành trong budget hiện hành**. Không tạo “fix” bằng nhắc lại FINAL_REPLY, thêm examples, cấm search lần hai, tự chọn mẫu hoặc âm thầm thực hiện late tool. T1 không được tính là đã khắc phục lỗi này; prefix vẫn phải báo lỗi còn tồn tại.

Giữ 3 owner generations, 2 tool rounds, 6 calls, tối đa 1 verifier. Code bảo vệ budget và receipt; model chọn món và việc cần hỏi. Không coerce functionCall thành reply, bỏ tool history, replay/reverify hoặc auto-read toàn bộ search candidates. Nếu thay provider wire thực sự, kiểm official API docs tại thời điểm triển khai và test exact serialized request.

Trước seal/run, đăng ký trạng thái T2 cùng evidence:

- **T2_IMPLEMENTED:** có defect cụ thể, diff sửa đúng defect, observed RED→GREEN tương ứng và dự đoán tác động. Ghi trạng thái riêng từng ca nếu chỉ một ca có defect. N1 hoàn thành giúp kiểm chức năng của bản sửa trên mẫu; không chứng minh ổn định hoặc riêng thay đổi T2 gây mọi khác biệt về lời tư vấn.
- **T2_NO_INTERVENTION:** không có defect đã chứng minh hoặc chưa có sửa phù hợp. Nếu N1 trả lời được chỉ ghi **OBSERVED_COMPLETE**, root cause vẫn chưa đóng. Nếu fail ghi **OBSERVED_INCOMPLETE**, không dùng kết quả làm cớ patch prompt tiếp trong campaign. Có thể đo T1/T3 theo gate đã freeze, nhưng không gọi đó là thành công sửa T2.

Acceptance deterministic cho bản sửa: cùng producer result đến consumer đầy đủ/bounded; các read độc lập vẫn batch; ambiguity chưa resolve không thành product match; expired/sai offer/sai subject vẫn chặn. Functional observation: hai ca tìm/chọn tạo được reply hữu ích trong budget, tính theo actual terminal. Một lời báo handoff có ích chỉ là recovery, không phải thành công tư vấn tự động. Không suy từ khác biệt giữa hai run có source/prompt khác nhau thành quan hệ nhân quả chắc chắn.

## 6. T3 — sửa xung đột báo giá mở đầu; không mở vòng tối ưu giọng chung

Prompt hiện có section báo giá mở đầu yêu cầu chọn ảnh GENERIC ở lượt mở đầu, trong khi section đầu yêu cầu chỉ xử lý việc khách đang hỏi. `sales-southern-delivery:deadline` thực tế nhận giá/mã/size/ảnh trước chuyện sáng mai. Đây là xung đột cụ thể đủ để thử thay đổi; không chứng minh nó là nguyên nhân duy nhất của mọi câu dài.

Thay đoạn liên quan trong owner prompt hiện hành (xác định path từ active manifest, không sửa frozen artifact):

> Lần đầu khách nhắn không có nghĩa phải giới thiệu lại sản phẩm. Khách hỏi giá hoặc muốn xem mẫu thì dùng thông tin báo giá và ảnh đã có đúng phần khách hỏi. Khách đang hỏi việc khác thì giải quyết việc đó trước; chỉ đưa giá hoặc ảnh khi chúng giúp xử lý yêu cầu này. Không cần đọc đủ openingQuote.

Không sửa giá mẫu trong prompt; giá/policy/stock vẫn từ nguồn. Code vẫn cấp entry metadata/openingQuote như dữ liệu, không tự phân loại câu “sáng mai” bằng regex hay một model thứ ba. Nếu T0 chứng minh phần dựng reply bằng code bắt buộc chèn intro ngoài owner thì sửa đúng producer đó và ghi rõ; không chỉ patch prompt để đấu với code.

Đo ảnh hưởng đối chứng **trong cùng prefix trước gate**: deadline phải giải quyết hạn giao ngay; năm opening cases vẫn báo đúng giá/ảnh khi phù hợp, unresolved vẫn hỏi mẫu, repeat không gửi lại intro, multipart không bỏ giá áo lẻ. Không được báo T3 đạt khi nhóm opening chưa chạy hoặc thiếu outcome do lỗi provider.

Những lỗi giọng khác giữ là acceptance/residual, **chưa thêm chỉ dẫn đồng nghĩa**:

- Ren nhiều/quen đồ trơn: câu phải giúp quyết định cách mua, không dùng mềm/thoáng/rũ làm lý do thay cho mức độ trang trí.
- Ngoài trời/dễ nóng: nhận xét thoáng không bảo đảm khách không nóng; không tự thêm tính năng cho món thay.
- Sửa số đo nhưng giữ L: nhận lời tự nhiên, không báo cáo cơ sở dữ liệu.
- Tổng tiền/đề nghị giảm: trả khoản khách phải trả và quyền lợi thực có, không bắt đọc phép tính.

Prompt hiện đã có các nguyên tắc này và các thử nghiệm trước chưa chứng minh benefit của việc viết lại chung. Không lặp advice-only, capability trimming, rút mô tả sản phẩm, nhồi ví dụ hay rewrite toàn prompt trong campaign. Nếu các lỗi còn, báo đúng chưa giải quyết; không gọi sửa opening rule là đã sửa toàn bộ tư vấn.

## 7. Verification và model campaign

### Trước provider

Observed RED→GREEN cho thay đổi logic/authority. Self-review diff từng savepoint: policy authority, atomic handoff, final gate, tool identity, bounds, no retry, không mất media/verified facts và không có case labels trong model request. Không tự gọi independent agent ở lượt lập kế hoạch này.

Commands dự kiến, chưa thực chạy trong lượt planning:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media-delivery.test.ts src/meta-outbox-dispatcher.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-state.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Isolated PostgreSQL COD/BANK: dùng launcher/runner đã chạy trong [VERIFICATION](../../apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024/VERIFICATION.json); ghi exact expanded commands thực tế. Thêm interleaving tests ở T1, actual capture/once-per-group guard và DB cleanup. Shared package chỉ chạm khi cần và phải chạy focused tests/typecheck/build tương ứng. Không claim các command cũ PASS cho source mới.

### Freeze và số lượt

- Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH, giữ route/config đã duyệt, retry0. Không đổi model hoặc verifier prompt.
- Cùng 51 native + 17 scoped controls = **68 outcome slots tối đa**, mỗi case một lần. Không thêm advice-only hoặc chạy lại prefix. Bound generation tối đa 221 (51×4+17); số thực tế thường thấp hơn do code turns/early terminals. Embedding/source reads ghi riêng, không lẫn generation.
- Freeze source policy candidate, exact prompt/schema/corpus/scoring/config hashes, trạng thái và evidence T2 từng ca, commit executable, sạch source/config, capture runSourceSha runtime rồi preflight. Không ghi SHA ngược vào frozen executable.
- 17 controls phải đạt trước native. Không xem chúng là full A2/A3.
- Prefix **31 lượt**: journey openings (4, có deadline), opening quotes (5), media followup nguyên chuỗi (7), stateful nguyên chuỗi (8), negotiation nguyên chuỗi (3), b1-changed-occasion/b1-changed-occasion-v2/b1-buying-concern-v2/b1-buying-concern-v3 (4). Ưu tiên 9 lượt journey/opening để kiểm T3 cùng đối chứng trực tiếp; vẫn giữ dependency order của từng runner. Không reset state giữa lượt để cứu kết quả.
- Còn **20 lượt**: B1 còn lại. Không lặp prefix hoặc setup generation ngoài registration. Các caller/private/authority interleavings mới ở T1 dùng deterministic tests, không làm tăng 68 provider outcome slots.

### Gate prefix

Đóng băng tiêu chí trước sinh. Lỗi authority, gửi sai recipient/subject, duplicate effect, mất phần ảnh/size đã được bảo toàn, hứa handoff không có receipt: STOP. Trước khi sang full phải có đủ evidence T1, deadline + cả năm opening controls đạt T3, và hai ca tìm/chọn thực sự hoàn thành trong budget ở mẫu này. Giọng hơi dài nhưng đáp đúng/giúp mua chỉ là polish; không tự đổi thành gate lỗi nghiệp vụ.

Hai ca tìm/chọn vẫn OWNER_TOOL_MODE hoặc không giúp khách chọn: ghi OBSERVED_INCOMPLETE, chưa đóng T2, STOP full; lưu mọi slot đã dispatch và NOT_RUN phần còn lại. Nếu không có can thiệp T2 nhưng hai ca hoàn thành, có thể chạy 20 lượt còn lại để đo T1/T3 và regressions; chỉ ghi OBSERVED_COMPLETE cho T2, không nhận đã fix hoặc đóng root cause. Quyết định mở full là quyết định coverage, không phải kết luận chất lượng ổn định hay B GO.

Một transient transport error vẫn là failed attempt; không rerun hoặc bỏ denominator. Native prefix có thể hoàn tất các slot đã đăng ký trong stage để thu bằng chứng, nhưng không sang full nếu chưa đủ evidence mục tiêu. Khi có unsafe authority/effect issue, dừng dispatch mới ngay. Không tạo vòng fix/run2 trong cùng campaign.

Ca dependency refresh không nhất thiết tự xuất hiện trong N1; deterministic interleaving phải bảo đảm coverage. Handoff đúng policy có lời báo là recovery acceptance, không tự tăng điểm tư vấn. Lượt HUMAN tiếp theo giữ im lặng là đúng quyền. Một câu hơi dài nhưng đáp đúng/giúp mua chỉ là polish, không dùng để ép nới verifier hoặc vá theo từ.

## 8. Review, báo cáo và điều kiện kết thúc

Review actual terminal + lịch sử + ảnh/receipt trước rejected-draft diagnostic. Không đưa caseId/expected/rubric vào provider. Ghi bốn kết luận riêng cho mỗi ca: tác vụ thực hiện; nghĩa nghiệp vụ; giúp khách quyết định/mua; giọng chat. Không tổng hợp thành điểm keyword.

So từng ca với source af482367. Chấp nhận upsell có lý do; nhắc dữ kiện hợp lý không tự thành liệt kê; từ chối nhận hẹn khi ETA không đáp ứng không cần giọng dè dặt. Phân biệt source fault được cài trước với nguồn đủ nhưng model bỏ qua. Một lần chạy không chứng minh ổn định hoặc conversion.

Báo rõ: số complete/NOT_RUN, generation/error/token/latency, silent/holding handoff/actual captured messages, original verdict và recovered outcome, protected-claim/ảnh/receipt regressions, exact commands/source/config identities. Lưu mọi raw cũ, không sửa nhãn lịch sử.

Báo kết quả từng hạng mục: T1 có transaction/delivery/caller evidence; T3 có deadline và đầy đủ opening controls; T2 có hoặc không có can thiệp theo đăng ký trước run. Không dùng một nhãn “campaign thành công kỹ thuật” để che T2_NO_INTERVENTION. Nếu T2 có sửa, cần defect→diff→deterministic evidence và functional observation; nếu không, dù N1 complete vẫn giữ root cause chưa giải quyết. Chất lượng tư vấn chỉ được ghi cải thiện ở ca có whole-turn evidence; B vẫn chưa GO khi các yêu cầu còn thiếu. Không nối tiếp các vòng prompt cùng cách.

Không merge/deploy/live send, publish policy nguồn, thêm role/router/parser, semantic repair loop hoặc chuyển phase trong kế hoạch này. Báo cáo sau run giữ các finding còn tồn tại và đề xuất riêng nếu cần thay contract/budget/nguồn ở vòng sau.

## 9. Self-review kế hoạch

- Đã bỏ đề xuất lặp advice-only và thu hẹp snapshot chưa có authority design.
- T1 sửa policy qua đường nhập candidate hiện hữu, không bypass SILENT trong runtime. Đã thêm caller coverage và contract transaction→Outbox→delivery/restart. Không chỉ dựa vào terminal readback; commit unknown cần ledger proof trước gửi, không replay effect.
- T2 audit chính hai ca qua các run trước, controls tên/mã chỉ bổ trợ. Đăng ký IMPLEMENTED/NO_INTERVENTION trước run; observed completion N1 không được đóng root cause khi chưa can thiệp. Không che giới hạn model bằng recovery.
- T3 chỉ một xung đột có trace thực tế; các finding giọng chưa có can thiệp mới được ghi rõ chưa xử lý, không hứa sửa toàn bộ.
- Giữ 68 slots thay vì phình corpus. Prefix31 + remaining20 =51, controls17; năm opening controls nằm trong prefix cùng deadline. Mọi provider setup/repetition phải có slot, không hidden retry.
- Đã tiếp thu 1 P1 + 3 P2 ở cấp kế hoạch theo bảng dưới; giữ nguyên report review lịch sử, chưa có reviewer approval mới, chưa implementation/test/provider.

| Finding độc lập | Điều chỉnh đã ghi vào plan | Bằng chứng phải có khi triển khai |
|---|---|---|
| P1 Outbox enqueue trước readback | Mục 4: policy/receipt binding, precommit validation, delivery/restart gate, invalidation nhóm pending | Actual capture 0 khi mất quyền; unchanged group gửi đúng một lần |
| P2 reason có nhiều caller | Mục 4: bảng dependency/private checkout/ảnh khách/explicit tool và success branches | Caller tests, privacy, receipt và dedup; không publish policy live |
| P2 N1 không chứng minh fix T2 | Mục 3/5/7/8: cùng case qua lịch sử, trạng thái intervention trước run, kết luận tách biệt | Defect/change/test nếu có sửa; OBSERVED_COMPLETE nếu không can thiệp |
| P2 opening controls sau gate | Mục 6/7: prefix31 chứa cả năm opening và deadline, remaining20 | Đủ outcomes của thay đổi + đối chứng trước mở full, tổng68 không đổi |
