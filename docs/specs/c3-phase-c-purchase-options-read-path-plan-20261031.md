# Phase C — chuẩn bị lựa chọn mua và rút đường đọc dữ liệu

Ngày 31/10/2026. Revision 2: bổ sung xử lý từng finding, source binding màu, nguyên nhân handoff và judge packet. Planning base: `ec0632b0e2062eaa4339db4f7ad7cf1bb867fe1e`; revision-1 delivery `c5dbbe6d1cfe74f3c8e4c89b90ec9b8c6d3debe5`. Trạng thái: đã cập nhật theo quyết định owner; **chưa triển khai, chưa independent review, chưa chạy model**. Phase C vẫn BLOCKED; C3 NOT_RUN; B_NOT_GO. Tài liệu này thay thứ tự ưu tiên của đề xuất sau variant/search run, không hủy các fix đã được kiểm chứng hoặc sửa điểm lịch sử.

## 1. Mục tiêu và căn cứ

Luồng chính là **một mã sản phẩm có nhiều lựa chọn mua**: áo, quần, chân váy, set áo–quần, set áo–váy, combo ba món. Chỉ hiển thị lựa chọn thực sự có trong nguồn; không buộc mọi mẫu có đủ sáu loại. Owner giúp khách chọn và mua; code chịu trách nhiệm cấu trúc lựa chọn, tham chiếu nguồn, facts, binding và effects.

Hai thiết kế trùng tên là nhánh phụ. [Đối chứng B–C §3](../../apps/worker/evals/single-agent-commerce-qualification/bc-controlled-20261030/REPORT.md) cho thấy cả B và C đều không chuẩn bị runtimeProducts khi hai refs đã bound nhưng chưa có focus. Đây là thiếu sót chung của đường context, **không phải bằng chứng toàn bộ lỗi này là hồi quy code C**. Hồi quy all-offer admission từng tái hiện riêng vẫn là finding hợp lệ và đã có fix; không trộn hai kết luận.

[Root-cause review](../../apps/worker/evals/single-agent-commerce-qualification/variant-stock-search-rerun-20261030/ROOT_CAUSE.md) chứng minh search→DETAILS_ONLY có thể tiêu hết hai read rounds trước khi đọc giá/size. Ca s02/s04 còn round nhưng early exit cho thấy cũng có lỗi lựa chọn bước của owner. Giá/size có sẵn trong offline source không có nghĩa owner đã đọc hoặc được phép khẳng định chúng.

## 2. Phân công code–model

### Code chuẩn bị cho mã đã xác định

Tái sử dụng `availableOffers`, offer metadata/source pins, read coverage, size-source applicability và Compact V2 hiện có. Bổ sung ở prepare/context projection, không dựng framework/router hoặc catalog thứ hai.

Mỗi lựa chọn mua cần có:

| Nội dung | Quy tắc |
|---|---|
| Identity | productId + offerType/offerId và components/roles theo source; label dễ hiểu từ mapping đã có, không đoán từ prose |
| Giá | Tham chiếu đường đọc/source scope đúng offer; trạng thái đã đọc/chưa đọc/không khả dụng tách biệt |
| Tồn | Tham chiếu đúng selector màu/size, BOM/counter/unit; không lấy tồn áo làm tồn set hoặc cộng các scope trùng counter |
| Size | Tham chiếu chart/rule đã verified và applicability theo product/offer/component; phân biệt có chart với engine đã tính fit cho khách |
| Provenance | Binding/revision, source version/hash, observedAt/expiry; thiếu hoặc stale có status rõ, không fake reference |

Đây là **danh mục lựa chọn và đường đọc**, không phải full price×stock×size Cartesian hydration. Khi nguồn chỉ có chart sản phẩm mà không có applicability cho component thì ghi thiếu; không tự tạo chart từng phần. Numeric facts chỉ được đưa vào reply khi authoritative read/engine thực sự cấp claim. Source reference tự nó không chứng minh giá/tồn/fit.

Chuẩn bị metadata tối thiểu cho mã đang focus trước owner generation đầu. Nếu có nhiều bound refs, chuẩn bị metadata identity/offers tối thiểu trong caps, không âm thầm chọn một mã. Nếu cùng mã có nhiều offer thì đó không phải PRODUCT_AMBIGUOUS. Search giữ cho discovery khi chưa bound đúng sản phẩm; owner không phải search lại mã đã biết chỉ để biết có thể mua áo hay set.

Admission dùng cùng projection/budget check như provider wire, publication nguyên tử và bảo toàn facts/media độc lập đã có. Không đổi expiry khi tái quan sát cùng nguồn. Nếu metadata không vừa bounds thì ghi nguyên nhân có thể audit và xử lý theo khả năng hiện có; không truncate identity/provenance hoặc tăng trần để giấu lỗi.

### Owner đọc theo nhu cầu khách

- Khách hỏi áo/quần/chân váy/set/combo đã rõ: gọi đúng offer tương ứng của mã đã xác định, không bắt đọc mô tả trước.
- “Bộ này bao nhiêu?” với đúng một set khả dụng: đọc set đó; không hỏi áo hay set chỉ vì catalog có bán áo lẻ.
- Chỉ hỏi phân biệt khi lựa chọn còn thiếu thực sự làm thay đổi câu trả lời hoặc thao tác tiếp theo. Nếu hai set có giá khác thì hỏi áo–quần hay áo–váy; nếu đã đọc được giá chung có căn cứ thì có thể trả phần chung trước và hỏi khi cần chọn mua.
- Thiếu thông tin khách để chọn size/đặt hàng: hỏi đúng phần thiếu, chưa kết luận fit từ dữ kiện chưa đủ. Thiếu dữ liệu shop ảnh hưởng quyết định: silent handoff, không bảo khách chọn một row không có tên màu.
- Tư vấn không phải liệt kê mọi offer. Chỉ đưa lựa chọn thứ hai khi có đánh đổi liên quan; không tăng chỉ dẫn giọng hoặc thêm ví dụ benchmark vào prompt trong patch đường đọc này.

Code không parse tiếng Việt để tự suy intent/offer hoặc lập chuỗi tool. Owner chọn tool dựa trên context rõ hơn; code validate selector, source và budget. Verifier vẫn chỉ kiểm protected-language semantics của exact final reply; mọi draft qua hard precheck vẫn phải verifier rồi final deterministic gate.

### Nhiều mã cùng tên

Tái sử dụng cấu hình product groups đã được xác nhận. Tên giống nhau không tự cấp delegation. Link phải chỉ rõ phạm vi nào được chia sẻ; shared size approval không cho gộp giá/tồn/ảnh hoặc đồng nhất hai thiết kế. Không có mapping thì giữ refs riêng, hỏi mẫu khi cần; thiếu chart shop thì handoff. Evaluator packet phải có approval/applicability có hiệu lực; evaluator labels không đi vào owner/verifier.

## 3. Thay đổi lựa chọn và state

Khi khách đổi áo lẻ→set, set→combo hoặc đổi size từng phần: authoritative selector mới phải thay đúng scope. Claim/receipt cũ không authorize selector mới. Các facts độc lập còn hợp lệ được giữ; facts của lựa chọn cũ không được dùng làm giá/tồn/size cho lựa chọn mới.

Giữ exact variant stock scope, demand aggregation, raw counter/unit checks và full-cart DB parity đã sửa. Combo chỉ bán theo BOM/source support; không tự ghép offer hoặc cho mixed size khi nguồn không hỗ trợ. Kiểm riêng colour ambiguity và mixed-size path: một ca dừng ở màu chưa xác định không chứng minh mixed-size path đã được chạy.

## 4. Nguồn dữ liệu và media trước model run

Lập manifest theo từng case/turn trước seal: sản phẩm/offer/components, selector, source price-stock-size-policy, media intent/component, source hashes/expiry và trạng thái readiness. Đây là evaluator-only manifest; model chỉ nhận runtime context bình thường.

Tách hai nhóm đã đăng ký trước inference:

1. **Sales-ready:** các nguồn cần cho mục tiêu ca còn hiệu lực và đủ applicability. Báo giá theo form phải có ảnh eligible; DETAIL/FEEDBACK cần đúng loại và đúng sản phẩm. Trạng thái còn hiệu lực được kiểm cả trước run và tại gate thực tế.
2. **Source-unavailable controls:** thiếu/hết hạn/mâu thuẫn ở dữ liệu shop, kỳ vọng silent handoff thật + không outbox khách. Không đánh là sales-quality success chỉ vì handoff an toàn.

Không gia hạn TTL, dời clock hoặc giả feedback/màu/chart. Revalidation hoặc bổ sung source cần quy trình nguồn/approval thực; task code không mặc nhiên cho phép ghi shop source. Nếu một sales-ready case không đạt prerequisites thì dừng dispatch ca đó và báo BLOCKED, không xóa ca khỏi denominator sau khi có kết quả. Ca đổi nhóm trước seal phải có lý do và giữ lịch sử thay đổi; thay đổi sau seal là run identity mới. Nguồn hết hạn trong run vẫn tính attempt với terminal thật, không chuyển nhóm để làm đẹp tỷ lệ.

## 5. Bộ ca và đối chứng

Giữ **sáu request B nguyên bản** trong đối chứng đã có: b1-price, b1-search-read-v2, b1-current-policy, sales-size-advice:height-weight, media-and-size:ask, stateful-quote. Giữ exact customer/history, frozen source/context, clock và generation config của control; không gọi SEND_ELIGIBLE cũ là đã PASS chất lượng. Engine/component replay và provider replay được báo riêng.

Đối chứng có hai phép đo tách biệt:

- **Cùng provider request:** replay nguyên captured body để đo owner variance; không dùng nó để chứng minh preparation mới đã cải thiện.
- **Cùng upstream input:** chạy old/new code với cùng customer/history/world/clock/scope/config; cho phép context projection khác đúng phần patch, ghi diff/hash. Phép đo này kiểm tác dụng code mới. Khi B adapter không hỗ trợ surface thì ghi NOT_COMPARABLE, không mô phỏng runtime B.

Clock frozen dùng cho offline attribution; model sales-ready run dùng nguồn còn hiệu lực ở thời gian thực, không lấy clock cũ để cấp quyền gửi. Tách report control lịch sử khỏi fresh-source run; không gọi hai input khác nhau là matched comparison.

Draft bổ sung dưới đây chưa phải frozen provider corpus. Mỗi ca phải được gắn sản phẩm/offer/source thật trước khi đăng ký; tên/ref nằm trong lịch sử tự nhiên hoặc runtime binding, không nhồi mã vào lời khách. Những điều kiện trong cột setup/chấm là evaluator-only.

| Ca | Setup và mục đích | Lời khách dự kiến |
|---|---|---|
| P01 | Một mã có áo lẻ; đọc đúng giá áo | “Áo này bán riêng không em, bao nhiêu vậy?” |
| P02 | Một mã có quần lẻ | “Chị lấy mỗi quần thôi, quần bao nhiêu em?” |
| P03 | Một mã có chân váy lẻ | “Chân váy này còn màu đen size M không?” |
| P04 | Một set áo–quần đã xác định, size khách đủ từ history | “Chị lấy cả bộ thì bao nhiêu? Chọn size cho chị luôn nhé.” |
| P05 | Một mã có cả set áo–quần và áo–váy, giá khác | “Bộ này bao nhiêu em?” → khi được hỏi: “Bộ có chân váy ấy.” |
| P06 | Combo ba món có BOM/giá thật | “Lấy cả áo, quần với chân váy thì tổng bao nhiêu?” |
| P07 | Chart từng phần, input khách đủ, mixed-size nếu source cho phép | “Áo với quần chị có cần lấy cùng size không?” |
| P08 | Đổi áo lẻ→set rồi combo trong history; tổng/tồn phải theo lựa chọn mới | “Thôi lấy thêm quần luôn em.” → “Thêm cả chân váy nữa thì tính sao?” |
| P09 | Hai mã cùng tên, mapping đã approved nhưng scope giá/tồn riêng | “Set Thạch Thảo còn size M không em?” → khi cần phân biệt: “Bộ quần nhé.” |
| P10 | Tên chưa rõ, không có mapping; phân biệt mẫu trước facts cần identity | “Mẫu Thạch Thảo chị thấy hôm trước còn không?” |
| H01 | Row màu không ghi nhận, quyết định mua cần màu; không bịa tên | “Chị lấy áo size M nhé.” |
| H02 | Quote đúng form nhưng media cần thiết stale/không có eligible match | “Bộ này bao nhiêu em?” |

P01–P08 là luồng chính; P09–P10 nhánh phụ; H01–H02 kiểm handoff nguồn. Các biến thể stale price/stock/chart/media và unapproved sharing chạy deterministic negatives, không tự nhân thành provider cases. Tái dùng ca hiện có trùng mục đích thay vì cộng thêm; lập bảng keep/replace/add trước freeze. **Không chốt tổng attempts hay repetitions mới trong plan này**: inventory cuối và denominator phải được preregister trước inference, không tăng vô hạn từ 12 draft purposes.

Chấm actual terminal outcome và khả năng khách quyết định/mua, không keyword. Sales-ready bị handoff vẫn là mất khả năng phục vụ dù an toàn. Handoff controls chấm handoff receipt, quyền sở hữu, không tin nhắn khách và chống lặp effects. Mỗi report phân attribution: code/context, source/freshness, owner decision, verifier, evaluator unknown; một ca có thể có nhiều blocker nhưng không đếm hệ quả NO_SEND thành root cause mới.

## 6. Trình tự implementation và acceptance

1. Đóng source map hiện có cho một mã/multi-offer và shared-size delegation; kiểm gaps trước code. Không tạo nguồn giả để cam kết sales-ready.
2. RED observed: context chưa có danh mục/read references; cần details trước facts; phân biệt offer/thiết kế sai; stale/cross-offer binding. Giữ controls hiện có.
3. GREEN tối thiểu: sửa prepare + context projection + tool declarations khi cần, dùng source/resolver hiện có. Dự kiến chạm `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce-read-only-context.ts`, `single-agent-commerce-product-groups.ts` và native wire ở consumer thực sự cần; không bắt buộc sửa tất cả.
4. Kiểm đủ đường 1 mã→offer→fact/size trong **2 tool rounds, 6 calls, tối đa 3 owner generations** hiện tại; giữ product/subject/claim/serialized bounds. Đo cả prepared I/O, bytes, owner calls và rounds, không giấu fanout trong prepare. Metadata admission không bị ghi như authoritative PRICE/STOCK/SIZE read.
5. Regression scope: mua riêng/set/combo; component fit; đổi lựa chọn; mixed M/L; null/unknown colour; quantity/counter alias; cross-product/applicability; source change/expiry; concurrent preparation; facts/media preservation; final gate; silent handoff. Thu captured owner/verifier requests để kiểm evaluator labels không leak.
6. Build/focused verification → exact-source review/fix nếu owner yêu cầu review → readiness data/media → commit/clean source/runtime runSourceSha → preregistration/preflight → model run khi được yêu cầu. Giữ config owner/verifier đã chốt; thay model/API phải được chốt riêng. Không tự chạy provider trong task chỉ cập nhật hướng fix.

Commands dự kiến, **chưa chạy cho thay đổi này**:

```powershell
pnpm -r --filter "@lana/worker^..." build
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-selection-compact.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker test:evals
```

Nếu chạm shared package, bổ sung focused tests/typecheck/build đúng package; nếu đổi state/effect guards phải chạy actual isolated PostgreSQL và giữ cleanup/accounting. Không nhận unit mock thay actual PG. Gate không được PASS khi command chưa chạy hoặc không reach boundary cần kiểm.

Ngoài scope: tăng tool/generation/token caps, nới verifier, parser/router/third role, repair/reverify loop, prompt ví dụ theo ca, source publication ngầm, sửa điểm sau unmask, broad rollback, merge/deploy/live send. Model quality/Phase C qualification vẫn chưa được chứng minh bằng việc hoàn tất kế hoạch hoặc unit tests.

## 7. Bảng xử lý các finding đã quan sát

Phạm vi bảng là findings của 22 ca/34 turns vừa review và các boundary liên quan đã được sửa, không phải tuyên bố đã audit hết mọi chức năng của repo. Các ID chỉ dùng để truy evidence, không đưa vào prompt. Trạng thái dưới đây là **kế hoạch**, không phải kết quả test mới.

| ID / mức ưu tiên | Finding và phạm vi | Thay đổi cần làm | Bằng chứng nghiệm thu / khi còn BLOCKED |
|---|---|---|---|
| F01 / P0 trải nghiệm | s02/s07/s13: bound sản phẩm nhưng search→details, chưa tới giá/size; s04 early exit dù còn round | Prepare danh mục offer/read references theo §2; coverage tách metadata khỏi facts; đo owner chọn đường đọc sau khi context đủ | RED→GREEN context, exact selected-offer reads, engine thật và captured requests trong budget. Model vẫn bỏ giá/size dù nguồn đủ thì ghi owner decision FAIL, không đóng bằng unit PASS |
| F02 / P0 correctness | s04/j1/j4: màu chưa ghi nhận bị diễn giải thành màu tiêu chuẩn; cart chưa tới mixed M/L | Binding màu tại nguồn + projection trạng thái theo §8.1; giữ null khác sentinel và không tạo customer-facing default | Named-colour success + unknown-colour silent handoff + source-change final gate. Thiếu physical identity được xác nhận thì sales path tương ứng vẫn BLOCKED, dù negative control PASS |
| F03 / P0 trải nghiệm | s01/s03/s16: media không eligible; s16 thiếu verified feedback | Readiness manifest theo exact product/intent/component/clock; xử lý source qua quy trình hiện có theo §4 | Actual eligible image/required quote group ở ca sales-ready; stale/missing→handoff thật. Không có ảnh/feedback đúng scope thì chỉ hoàn tất handoff control, chưa khôi phục năng lực bán của ca đó |
| F04 / P1 chẩn đoán | s07/s13: owner chọn reason nguồn thiếu khi chưa thực hiện lookup cần thiết | Observed read coverage + declared handoff reason riêng theo §8.2 | Test NOT_READ/FAILED/BUDGET_EXHAUSTED/UNKNOWN đúng scope và ledger không đổi terminal. Không dùng receipt handoff làm proof nguồn thiếu |
| F05 / P0 đo lường | j2 UNRESOLVED, s07 grading có giả định thiếu chart: judge không thấy approved delegation | Bổ sung source applicability/delegation và lookup coverage vào evaluator packet theo §8.3 | Positive/negative applicability tests + captured request firewall; packet cùng input phản ánh đúng engine/source. Historical grades giữ nguyên; packet mới chưa kiểm thì grading readiness BLOCKED |
| F06 / P1 quyết định | s11 hỏi tồn biến thể nhưng owner handoff PRODUCT_AMBIGUOUS, chưa làm rõ lựa chọn; s02 hỏi phân biệt trước phần giá có thể trả | Tách thiếu lựa chọn khách với thiếu dữ liệu shop trong context/schema; owner quyết định câu hỏi, không thêm code parser | Source-ready ambiguity case hỏi đúng phần còn thiếu; exact explicit-offer case không hỏi lại; variant không tồn tại không bị hiểu là hết toàn shop. Model run chấm toàn lượt, không dò keyword |
| F07 / P0 chống hồi quy | j1 mixed M/L chưa reach; fixes cart scope/admission đã kiểm trước đó | Giữ helper/guards đã approved, bổ sung reach evidence sau khi colour prerequisites thỏa | Test isolated PG cho mixed size/quantity/alias/source tamper khi chạm guards; model trace phải tới actual add/change-cart tương ứng mới nhận đã kiểm journey. Không thay source thật bằng synthetic success |
| F08 / P1 bảo toàn | j2 correction OUT_OF_RANGE, j6 thiếu tên, s10/s12/j5 aftersales/order, các no-send sau HUMAN | Giữ correction→engine mới, hỏi thông tin khách, handoff phạm vi chưa hỗ trợ và ownership suppression; không sửa thành sales reply cho mọi ca | Regression không dùng fit cũ/không giả đơn; correction out-of-range handoff; thiếu tên hỏi tên; aftersales handoff thật, không tin nhắn khách; no-send sau HUMAN không sinh effect/outbox mới |
| F09 / P2 tạm chấp nhận | s05/s06/s08/s15/j3: catalog tone, conditional advice thiếu cụ thể, CTA thừa hoặc mở lại sau cảm ơn | Không mở patch giọng diện rộng; giữ sales goal, đánh chất lượng độc lập và ghi residual từng ca | Chưa coi đã fix. Nếu reply tạo sai thuộc tính/receipt/quyền lợi thì chuyển thành lỗi correctness, không miễn bằng nhãn giọng. Không hạ rubric để đóng finding |

s09 chăm sóc sản phẩm và s14 defer là controls bảo toàn, không có finding correctness mới cần sửa. j3 tôn trọng chỉ mua áo, j6 nhận COD và hỏi tên còn thiếu cũng là hành vi phải giữ. Các reason hợp lệ/handoff đúng vẫn có thể không hoàn tất nhu cầu khách; report tách đúng safety/state với sales completion.

## 8. Ba phần cần implementation cụ thể

### 8.1. Binding màu: nguồn trước, projection sau

1. Audit read-only snapshot/catalog/POS mapping hiện có theo product→offer→component/SKU/variant; xác định row có màu vật lý được ghi rõ, row chỉ có sentinel, source version/hash, đơn vị tồn và selector. Không dùng ảnh hoặc tên mẫu để tự suy màu. Xuất danh sách gap không có PII/secret.
2. Nếu nguồn có mapping được xác nhận: dùng đúng canonical colour identity + label nguồn; alias/default chỉ áp dụng theo phạm vi approval thật. Không ghi giá trị màu vào prompt hoặc hardcode theo sản phẩm. Nếu nguồn chưa đủ: lập source correction/revalidation request theo quy trình sẵn có, chưa ghi nguồn chỉ vì task sửa code.
3. Projection tách rõ màu đã biết, khách chưa chọn màu, màu nguồn chưa biết, và variant không có trong nguồn. Đây là trạng thái dữ liệu, không phải classifier câu khách. Không đưa row không rõ màu thành “màu tiêu chuẩn/có sẵn” cho khách chọn. Row unknown không làm mất facts độc lập của row named còn hợp lệ; handoff khi gap thực sự ảnh hưởng lựa chọn/claim/effect cần thực hiện.
4. Resolver/guards giữ exact selection và source provenance. `color=null` không tự biến thành `__NO_COLOR__`; sentinel không tự mang nghĩa physical/default. Source binding thay đổi sau verifier phải làm old PASS không authorize draft/effect theo nguồn cũ.
5. Tests bắt buộc: explicit named colour; null khi nguồn chỉ có một lựa chọn đã xác định theo policy hiện hành; nhiều named colours cần khách chọn; named + unrecorded; sentinel không cấp nhãn; cross-offer/components; source change/expiry; giữ price/stock facts độc lập. Không tự nới rule chọn mặc định để làm positive test PASS.

Đóng F02 phải ghi riêng **source readiness**, **code correctness**, **model outcome**. Nếu source chưa xác nhận màu, phần mua tương ứng BLOCKED và handoff control có thể PASS; không lấy control PASS làm bằng chứng mua được.

### 8.2. Nguyên nhân handoff: quan sát, không phỏng đoán

Mở rộng diagnostics/coverage hiện có ở boundary thực hiện tool và kết thúc lượt; không thêm model hoặc runtime semantic router. Lưu hai phần riêng:

- Owner-declared reason: giá trị owner đã yêu cầu, không đổi lịch sử.
- Observed coverage: operation + scope/selector hash + attempt ordinal + source/result status và read budget. Metadata-only khác protected fact read; size source khác kết quả recommend_size cho input khách hiện tại.

Trạng thái quan sát dự kiến: NOT_READ (không có lookup đúng scope), AVAILABLE (lookup thành công), FAILED (lookup đã chạy và có failure cụ thể), BUDGET_EXHAUSTED (budget hết và read cần xét chưa hoàn thành), UNKNOWN (thiếu trace/diagnostic bị giới hạn). Đây là schema **đề xuất**, chưa phải enum code đã có. Mỗi record giữ cả read status và budget status: hết budget không xóa failure đã xảy ra; một failure ở offer A không giải thích offer B. STALE/missing/conflict/bound/provider failures phải giữ loại gốc thay vì ép thành “nguồn không có”.

Code không suy mọi nhu cầu tiếng Việt để quyết định “tool bắt buộc”. Coverage ghi theo các scope/operations quan sát được; evaluator đối chiếu yêu cầu ca offline. Không có cơ sở liên kết thì UNKNOWN. Một request_handoff SIZE_RULE_UNAVAILABLE sau DETAILS_ONLY không tạo failure size engine giả. Không cấm handoff an toàn chỉ vì chưa gọi một tool.

Diagnostic observer phải bounded và không đổi outcome, tool count hoặc I/O. Không ghi raw số đo/địa chỉ, exception text, credentials hoặc full selectors; dùng hash/allowlisted status theo boundary hiện có. Nếu trace rơi do bound thì ghi coverage incomplete, không suy NOT_READ từ absence không đầy đủ.

Tests: metadata OK nhưng chưa đọc price; đọc đúng offer thành công rồi early handoff; failed/stale read; wrong-offer lookup; hết rounds nhưng còn calls; diagnostic overflow; human ownership; observer lỗi. Assert cùng terminal/receipt/outbox khi bật/tắt instrumentation và không generation/I/O bổ sung. Findings đóng phần attribution không đồng nghĩa đã sửa owner early exit: F01/F06 vẫn cần measured model outcome.

### 8.3. Judge packet: applicability có căn cứ và actual read coverage

1. Dùng source config/delegation đã đóng băng của chính run, không đọc latest config sau khi có kết quả. Mỗi mapping thể hiện approvalRef, source chart/artifact identity/hash, source product, target scope/components và phạm vi được chia sẻ. Nếu nguồn không cung cấp expiry riêng thì ghi rõ; không tự tạo approval mới.
2. `sourceInventory` cho biết nguồn tồn tại; actual read coverage cho biết runtime đã đọc/gọi engine gì. Packet giữ hai phần riêng, kèm engine status/fit provenance và customer correction đã dùng. Có chart không đồng nghĩa đã chạy engine; metadata read không cấp price/fit.
3. Raw approval identifiers/product mappings chỉ nằm ở evaluator data cần thiết. Blind projection phải không lộ arm/source variant hoặc expected verdict: áp dụng mapping mù nhất quán cho approval refs/implementation identifiers nếu chúng tiết lộ arm, giữ provenance bindings có thể audit trong private mapping. Source evidence vốn cần để judge không bị xóa chỉ để làm packet đối xứng giả; khác biệt còn lộ phải ghi blinding limitation.
4. Runtime context được giữ source delegation cần thiết để sử dụng facts; tuyệt đối không nhận caseId/split/expected/rubric/scoring hoặc lý do chấm. Public judge packet và owner/verifier projection được test riêng, kiểm actual captured wire qua continuation/history chứ không chỉ object trước serialize.
5. Positive tests: approved shared chart dùng đúng scope; chart cùng tên nhưng không có delegation bị từ chối; sharing size không chia sẻ price/stock/media; wrong component/artifact/hash bị reject/UNKNOWN theo dữ liệu; missing approval không được packet tự bù. Test source-present-but-NOT_READ được phân biệt với successful recommendation và actual OUT_OF_RANGE.

Tương lai chấm packet mới trước unmask bằng protocol đã freeze. Không mở grade cũ để sửa j2 thành PASS hoặc thay điểm s07; score cũ vẫn giữ UNRESOLVED/giới hạn đã công bố. Chưa có packet verified thì không claim quality comparison hợp lệ.

## 9. Thứ tự đóng finding và bàn giao

1. **Source audit và readiness gaps:** inventory offers/colours/chart delegation/media đúng các scope cần kiểm; phân biệt việc sửa code được phép làm ngay với việc cần nguồn được xác nhận. Không chặn mọi code task khi một nguồn thiếu, nhưng không seal sales-ready cho scope chưa đủ.
2. **Read path + instrumentation:** RED→GREEN F01/F04/F06 trong budgets; map F02 vào source/resolver/projection mà không suy màu; giữ F07/F08 và các B controls.
3. **Evaluator và readiness:** implementation/test F05; hoàn tất source/media audit F02/F03; keep/replace/add corpus và readiness manifest trước freeze. Không tự tăng số ca provider do thêm ma trận deterministic.
4. **Verification:** commands §6; thêm `single-agent-commerce-diagnostics.test.ts`, `single-agent-commerce-selection-evidence.test.ts`, `single-agent-commerce-missing-information.test.ts`, `single-agent-commerce-media.test.ts`, `single-agent-commerce-media-revalidation.test.ts`, `single-agent-commerce-handoff-delivery.test.ts` vào worker focused run khi chạm tương ứng. Chạy evaluator-source/native-wire/context-coverage tests trong `test:evals`; bổ sung test mới đúng module nếu semantics mới chưa có coverage. Các commands này đều chưa chạy cho revision 2.
5. **Review và run:** nếu có independent review, bind exact source/docs hash; APPROVE PLAN/CODE không phải quality GO. Khi được yêu cầu model run: seal clean executable/config cùng manifest/denominator, mọi generation thuộc accounting, không hidden retry; đánh actual terminal outcomes và nguyên nhân riêng. Không dispatch sales-ready ca biết thiếu prerequisite.
6. **Bàn giao:** mỗi F01–F09 có code/source references, commands thực chạy, failed attempts, boundary đã reach, status OPEN / VERIFIED_CODE / SOURCE_BLOCKED / MODEL_FAILED / ACCEPTED_LIMITATION và next action. Các status là trục theo dõi, có thể đồng thời: VERIFIED_CODE không che SOURCE_BLOCKED hoặc MODEL_FAILED. Finding chỉ được gọi resolved khi các điều kiện nghiệm thu tương ứng đủ evidence. F09 giữ ACCEPTED_LIMITATION theo phạm vi owner đã chốt, không “hết lỗi”.

Không có provider, PG hoặc source mutation trong lần bổ sung kế hoạch này. Đã xác định cách xử lý các nhóm lỗi quan sát được; implementation, source readiness và chất lượng thực tế vẫn là công việc chưa hoàn tất.
