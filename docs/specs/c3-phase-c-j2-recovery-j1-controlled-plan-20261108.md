# Phase C — sửa j2 và đối chứng j1

Ngày 08/11/2026. Planning base: `b7dc99c9dbc1d87cd67f38dd3264b670eb5ffe66`.

Trạng thái: **kế hoạch, chưa triển khai/chạy provider**. Căn cứ là [review root cause độc lập](evidence/c3-j2-j1-plan-20261108/independent-rootcause-review.md) và [full campaign 34 ca/55 lượt](../../apps/worker/evals/single-agent-commerce-qualification/quote-batch-run-20261108/FULL_REPORT.md). Giữ nguyên kết quả FAIL lịch sử, không dùng plan này làm GO hoặc thay điểm cũ.

Review được lưu là review căn nguyên, không phải approval cho thiết kế plan mới. Spec nền: [kiến trúc](c3-single-agent-commerce-architecture-20261004.md) và [verifier boundary](c3-semantic-verifier-boundary-amendment-20261005.md).

## 1. Mục tiêu và thứ tự

1. Sửa lỗi code đã xác nhận ở j2: sau khi patch sai bị từ chối, patch sửa đúng phải cho phép tính size từ profile mới, không bị trường HEIGHT cũ khóa tiếp.
2. Đối chứng j1: phân biệt dao động của owner với ảnh hưởng của cách trình bày prerequisite của tool. Chưa coi tool overload là nguyên nhân thiết kế đã được chứng minh.
3. Chỉ khi có evidence rõ mới đề xuất thay contract runtime cho j1. Không gộp các thay đổi j4/s15/s04 vào cùng phép đối chứng.

Giữ 1 conversational owner, tối đa 1 verifier; code giữ authority về dữ liệu, state, permission, effects, receipts, freshness và privacy. Giữ caps 3 owner/1 verifier, 6 primitive/2 rounds, request bounds và retry0. Fallback tiếp tục silent handoff; không đổi policy ảnh hoặc cho verifier tin shop-history.

Giữ owner Vertex Gemini3.5FlashLite HIGH và verifier GPT-6.1Sol HIGH, exact version/generation config/credential routes theo manifest hiện hành. Thiếu credential/model/source hợp lệ thì BLOCKED, không substitute. Freeze source/config/prompt/schema/view/input hashes trước provider; không ghi runtime source SHA ngược vào source làm đổi HEAD.

## 2. J2 — sửa đúng failure mode

### 2.1 Bằng chứng và phạm vi sửa

Native journal: lần 1 gửi HEIGHT162 từ tin cũ cùng bốn correction hiện tại; bị reject. Lần 2 bỏ HEIGHT và ghi đúng51kg/88/70/94, nhưng HEIGHT còn trong `pendingFields`, làm `blocked()` vẫn true. Profile đã đúng; không phải thiếu chart. Cơ chế thêm/xóa pending tồn tại từ17/10.

[Probe có sẵn](evidence/c3-j2-j1-plan-20261108/j2-pending-probe.json) tái hiện cùng cơ chế bằng PRODUCT/QU714/in-memory; không thay acceptance COMPONENT/PostgreSQL. Bản script lưu trong evidence có imports task-local, là archive, không phải test executable mới.

Đích sửa chính: `apps/worker/src/single-agent-commerce-state.ts`. Chưa sửa sales prompt, verifier prompt, Size Engine, chart, source quote rule, CAS/receipts hoặc shared merge semantics.

### 2.2 Contract cần đạt

Tách ba loại trạng thái đang bị gộp:

- **Đề xuất không được chấp nhận:** field/quote sai của model; trả lỗi và không ghi/provenance mới. Nó không tự trở thành một sửa đổi khách đang yêu cầu còn dang dở.
- **Correction có căn cứ hiện tại nhưng chưa commit:** giữ pending theo field và giá trị/evidence cần thực hiện; chưa được dùng fit cũ.
- **Commit/readback chưa xác nhận:** tiếp tục khóa như hiện tại; một patch khác thành công không được xóa bất định này.

Thực hiện bằng validation/staging trước commit, dùng lại validator hiện có để tránh hai cách parse/ground số đo. Không thêm tool reset hoặc cho model tự đặt cờ ready.

Đối với lỗi có một phần input hợp lệ:

1. Kiểm toàn bộ proposal và nhận diện các correction có grounding hiện tại. Patch có lỗi vẫn không được ghi một phần.
2. Giữ lỗi proposal cùng phạm vi operation/target/request; giữ pending của các correction có căn cứ. HEIGHT dùng quote cũ không được nâng thành correction hiện tại đã xác minh.
3. Lệnh sửa tiếp theo của cùng recommend operation phải validate toàn bộ và bao phủ các correction có căn cứ còn pending. Không lấy sự vắng mặt của field trong patch bất kỳ làm bằng chứng đã giải quyết.
4. Sau CAS và readback thành công: giải quyết phần pending đã thực hiện và supersede proposal lỗi trước trong đúng phạm vi đó. Không xóa pending/bất định khác.
5. Tính lại fit bằng toàn profile đã commit, gồm HEIGHT cũ còn hợp lệ. Claim mới phải khớp revision/fingerprint/target hiện tại; không tái sử dụng claim trước correction.

Điều kiện ràng buộc triển khai:

- Không sửa kiểu `pendingFields.clear()` sau bất kỳ update thành công nào.
- Không coi giá trị model đưa bằng giá trị cũ là đủ để bỏ grounding hoặc tự cấp no-op receipt.
- Patch preference/unrelated field, patch thiếu correction, empty/no-op/CLEAR không được dùng để thoát một correction còn chưa thực hiện.
- Trường quote/value/domain sai vẫn bị reject. Không cho phép ghi bằng quote từ history.
- Không thay mọi invalid-field thành không cần xử lý: all-invalid/unknown cases vẫn fail-closed nếu chưa có một correction hợp lệ giải quyết operation. Đây không phải lời hứa code đã hiểu mọi field trong câu khách.
- `STATE_COMMIT_UNCONFIRMED`, CAS conflict, readback mismatch, quyền/recipient/freshness thay đổi giữ blocker tương ứng.

### 2.3 TDD trước khi sửa

RED phải thấy trên source hiện tại; không dùng expected output để ép size M.

| Ca deterministic | Kết quả cần kiểm |
|---|---|
| Native j2: bad5ops → corrected4ops trong cùng turn | Trước fix profile đúng nhưng fit bị khóa; sau fix fit được tính bằng profile mới, HEIGHT/provenance cũ giữ nguyên |
| Cùng failure mode với COMPONENT/TOP, retainAdvice và target đã có | Không mất target/receipt, không fit cũ hoặc đổi sang PRODUCT |
| Patch lỗi có correction hiện tại chưa sửa; chỉ cập nhật preference/field khác | Vẫn khóa; không được gửi fit hoặc báo update đã hoàn tất |
| Patch sửa tiếp chỉ bao phủ một phần correction | Phần chưa thực hiện còn pending; không unlock toàn bộ |
| Patch lặp/không đổi/CLEAR dùng để né unresolved correction | Không cấp readiness giả hoặc receipt giả |
| CAS/readback/commit không xác nhận, kể cả patch sau hợp lệ | Không unlock bất định; không hidden retry |
| Height/weight mới hợp lệ và lỗi value/quote thật | Grounding/domain guards cũ giữ nguyên; không nới source rule |
| Client sửa số đo làm claim cũ hết đúng | Invalidate fit cũ; final gate không cho PASS cũ authorize profile mới |

GREEN tối thiểu, rồi thêm real-PG acceptance qua persisted ingress: scripted owner bad patch → corrected patch → final draft dựa claim mới → actual accepted Outbox → delivery restart không duplicate. Xác minh profile readback, đúng COMPONENT/parent, receipt numerical update, không tạo cart/đơn. Verifier stub chỉ kiểm seam deterministic; không gọi đây là model acceptance.

## 3. J1 — phép đối chứng trước khi quyết định sửa runtime

### 3.1 Những gì đã biết và giả thuyết

Khả năng báo tổng trước giỏ đã được sửa và từng dùng đúng05/11,06/11. Run08/11 vẫn có `quote_product` trong cả hai owner requests; prompt cũng đã nói dùng nó, nhưng owner chọn hai add-cart thiếu màu rồi quote-cart. Không quên hai áo M/L; sai là chọn đường xử lý.

Giả thuyết H: trình bày rõ prerequisite theo từng operation, bằng dữ liệu code-owned, có thể giảm việc áp yêu cầu màu của mutation sang báo tổng. Chưa kết luận H đúng hoặc model có thể chọn ổn định. Không sửa tool visibility vì conservative ordered-batch reachability tự nó không phải bug.

### 3.2 Đối chứng offline trước provider — không tốn generation

- Dùng frozen before-state/history của j1T3; replay code tại captured clock trên bản clone, không dùng clock lịch sử để gửi/provider/live eligibility.
- Đường 1: actual bad batch add M/null + L/null + quote_cart; giữ reject/no-effect và error scope như hiện tại.
- Đường 2: quote_product đúng subject/offer/quantity2; kiểm total từ calculator/policy/source, không tạo giỏ hoặc chọn màu hộ.
- Mục đích: xác nhận capacity/prerequisites trên đúng source và giữ effect guards. Không suy model sẽ tự chọn đường 2 từ scripted replay.

### 3.3 Hai nhánh model, chỉ một biến

**A — baseline:** owner prompt, native tools, declarations, tool descriptions và context presentation hiện hành sau fix j2.

**B — intervention ở eval:** cùng toàn bộ A, thêm một view nhỏ về prerequisite lấy từ code/contract và trạng thái hiện có. Ví dụ loại thông tin: operation nào là read-only/effect, có cần committed cart, argument nào bắt buộc ở returning quote, total chưa được code tính. Đây là metadata khả năng/điều kiện, không phải lời khuyên chọn operation cho câu khách.

Ràng buộc B:

- Builder nằm ở eval, không wire production; lấy schema/required arguments thực đã emit và các trạng thái code-owned đã có. Kiểm tính đúng của metadata bằng tests đối chiếu validator hiện hành; không refactor runtime thành registry/framework chỉ để làm thí nghiệm. Không hardcode caseId/câu hỏi/giá/màu.
- Chỉ suy từ dữ liệu A đã có; không đọc thêm nguồn, chạy calculator trước, thêm proof mới hoặc parse customer text. Thiếu dữ kiện thì UNKNOWN, không bịa READY.
- Không thêm `expectedTool`, `shouldQuote`, success label hoặc rubric. Không đưa caseId/A-B/repetition/evaluator labels vào provider.
- Không sửa owner/verifier prompt; không thêm ví dụ hoặc câu trả lời mẫu; không ẩn add_to_cart/quote_cart/negotiation để ép chọn quote.
- Tool inventory, schema/descriptions, giá/tồn/policy/cart/history, signed parts và config giữ nguyên trong từng cặp. Chỉ field view mới được khác; có structural diff allowlist/hash và test chứng minh điều này.
- Metadata không authorize claim/send/effect. `quote_product` vẫn phải đọc/kiểm nguồn và calculator như cũ. Không gắn “không cần màu” vô điều kiện khi nguồn giá chưa đủ.
- Không gắn `quote_cart.requiresCart=true` vô điều kiện: có cấu hình quoteInput hợp lệ không cần persisted cart. Phân biệt quote từ offer với quoteInput hiện hành; nếu chưa có tín hiệu code-owned để xác định readiness thì UNKNOWN, không suy `cart=null` thành mọi quote khác đều sai.
- View tối đa1KiB, không tăng bất kỳ request cap. Nếu cần bỏ context hoặc tăng cap để nhét view thì dừng thiết kế này.

H này chỉ thử cách biểu diễn prerequisite; chưa kiểm hết giả thuyết tool overload hoặc training prior. Nếu A/B không rõ lợi ích thì ghi chưa chứng minh, không sửa tiếp prompt trong cùng run.

### 3.4 Population và ngân sách cố định

| Input | A | B | Mục đích |
|---|---:|---:|---|
| j1T3 thực tế: hai áo M/L, chưa màu, hỏi tổng | 3 one-step | 3 one-step | Quan sát lựa chọn operation và variance |
| Giỏ hiện tại đã đúng, có cartQuote hiện hành | 1 one-step | 1 one-step | Không để B kéo mọi câu giá sang pre-cart hoặc bỏ quote/ưu đãi hiện tại |
| ACK/sở thích từ ca s15 đã đóng băng | 1 one-step | 1 one-step | Không để metadata quote khiến mọi tin đều mở price/media task |
| Tổng primary | 5 | 5 | **10 generation owner; tool trả về không thực thi, không verifier/send/effect** |

Dùng fresh source bundle một lần cho cả A/B; history/seed giống nhau theo từng cặp. Không renew timestamp của world cũ. Cart control phải được tạo bằng executor trong isolated store với receipt thật; không viết tay cart/effect proof. Không ghép source khác nhau để tạo đối chứng.

Đăng ký slots/hash trước dispatch; đảo thứ tự A/B bằng seed đã khóa, không best-of-N. Mọi malformed/auth/401/429/5xx/timeout nằm trong denominator; một generation HTTP tối đa mỗi slot, không automatic retry. Không gọi agent theo từng sample.

Phân loại one-step: quote-path, source-read-first, cart-mutation-path, clarification/final, malformed/error. Source-read-first có thể là kế hoạch hợp lệ, không tự chấm FAIL; one-step không chứng minh whole-turn usefulness. So target/quantity và dependencies, không chấm bằng keyword trong câu trả lời.

Điều kiện cho B đi tiếp: cả3 j1 samples chọn trực tiếp quote_product đúng subject/offer/quantity2, không suy tổng bằng model hoặc tạo cart; cả2 controls vẫn dùng được; baseline không cùng đạt3/3 theo cùng tiêu chí. Source-read-first ghi riêng và không gọi là whole-task FAIL, nhưng chưa là bằng chứng B đạt mục tiêu chọn trực tiếp. N nhỏ chỉ cho tín hiệu đáng thử, không phải causal/stability proof. Nếu A và B đều đạt, chưa có lợi ích đủ để thêm view. Nếu không đạt, dừng B và giữ toàn bộ evidence.

Nếu B qua điều kiện đã đăng ký: chạy **paired native T3**, A1lượt/B1lượt, từ hai isolated stores có prefix/state giống nhau và nguồn còn hiệu lực. Không chạy lại T1/T2 bằng model. Mỗi nhánh tối đa3owner+1verifier: **tối đa8generation**. Đánh giá actual terminal: có total từ code, giữ hai áo M/L, không mutation cần thiết giả, không hỏi màu để trì hoãn tổng; guarded fallback/handoff vẫn được ghi đúng outcome. B chỉ được đề xuất adoption nếu paired outcome không hồi quy; chưa wire runtime ngay.

Reuse transport/capture/hash/firewall từ `bc-control.mjs`/`bc-owner-replay.mjs`, nhưng **không chạy hay sửa population B–C lịch sử18slots/sáu ca**. Thêm harness eval nhỏ riêng cho experiment10slots + conditional8slots; không tạo framework/provider layer mới.

## 4. Verification và giới hạn phạm vi

Các lệnh sau là **dự kiến khi implementation đã có**, không phải kết quả đã chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Thêm focused Node tests cho harness mới: A/B chỉ khác view, đúng10slots/conditional8slots, không evaluator leak, không rewrite signed parts, one-request/error accounting, bounds. Chạy các tests đó trước full evals. Nếu chạm shared package ngoài dự kiến thì bổ sung focused/typecheck/build đúng package, không giả định worker checks đủ.

Real-PG dùng existing isolated launcher + check-prefix mới `C j2 pending recovery` sau khi đã thêm case. Preflight/post-run phải kiểm đúng1case được chọn và PASS; zero selected không được gọi PASS. DB drop và generation0 bắt buộc. Không đụng schema/live sources.

J2 model acceptance sau deterministic/PG xanh: một hành trình3turn theo script hiện có, **tối đa12generation**. Kiểm actual advice sau sửa số đo, fingerprint/receipt và không handoff vô lý; không đòi lời thoại mẫu. Đây là lượt acceptance riêng, không gộp vào one-step rate của j1.

**Ngân sách đề xuất cho lần execute sau: tối đa30generation runtime** =12j2 +10j1primary +8paired conditional. Các slot conditional không chạy phải hiện rõ NOT_RUN/theo gate, không loại denominator. Đây không tính token của coding/review và chưa authorize generation trong bước lập plan này. Không tự mở full34/55 hoặc tăng repetitions; owner có thể yêu cầu full sau khi xem kết quả nhỏ.

## 5. Savepoints, review và điều kiện dừng

1. SavepointJ2: quan sát RED → sửa minimum → focused/PG GREEN → self-review invariants. Cập nhật evidence nguồn/test thực tế.
2. SavepointJ1: thêm eval-only builder/harness và differential checks; không gộp sửa j4/s15/s04, không sửa prompt để làm baseline/B đẹp hơn.
3. Commit/seal executable và inputs khi worktree sạch; ghi runtime source SHA bên ngoài source. Provider chỉ chạy sau authorization execute và actual-time preflight.
4. Chạy các slots đã đăng ký rồi gom một packet. Chỉ **một review độc lập tổng hợp sau hoàn tất**, không gọi lại theo từng ca/arm/định dạng. Hash/JSON/LF/secret/PII/counts do script kiểm; reviewer đọc whole outcomes và source cần thiết.
5. Vi phạm privacy/permission/effect/unknown commit/accounting hoặc source hết hiệu lực: hard stop. Task failure/known provider error được giữ đúng denominator, không tự fix rồi retry. Mỗi sửa executable tiếp theo cần run identity mới.

Chưa đưa j4/s15/s04 vào sửa runtime ở vòng này. Chúng chỉ là regression controls khi liên quan: giữ chặn ảnh thiếu proof; không để quote metadata kích ACK; không tự persist verifier proof/cho phép pre-cart negotiation hoặc complete-colour claim. p04 malformed giữ policy một attempt/silent handoff, chưa có căn cứ sửa provider API hay nới parser.

Kết thúc vòng ở kết luận j2 acceptance và j1 hypothesis có/không có evidence. Không suy thành PhaseC GO, triển khai production hay chứng minh mọi ca đã ổn định.
