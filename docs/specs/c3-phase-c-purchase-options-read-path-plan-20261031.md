# Phase C — chuẩn bị lựa chọn mua và rút đường đọc dữ liệu

Ngày 31/10/2026. Planning base: `ec0632b0e2062eaa4339db4f7ad7cf1bb867fe1e`. Trạng thái: đã cập nhật theo quyết định owner; **chưa triển khai, chưa independent review, chưa chạy model**. Phase C vẫn BLOCKED; C3 NOT_RUN; B_NOT_GO. Tài liệu này thay thứ tự ưu tiên của đề xuất sau variant/search run, không hủy các fix đã được kiểm chứng hoặc sửa điểm lịch sử.

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
