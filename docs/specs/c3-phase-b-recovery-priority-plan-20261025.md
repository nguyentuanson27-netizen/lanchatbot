# Phase B — ưu tiên phục hồi hữu ích và handoff thực sự

Ngày 2026-10-25. Trạng thái: **PLAN / chưa triển khai, chưa chạy model**. Owner yêu cầu tập trung phần có thể cải thiện rõ; không tiếp tục tối ưu giọng văn trong vòng này. Planning HEAD `6398dda29f443ca9277658aba69a638777c61fc5`, PR391; worktree có báo cáo review chưa commit. Khi triển khai ghi lại HEAD và diff thực tế, giữ nguyên evidence.

**Revision 2 — đã chỉnh theo [review độc lập REQUEST_CHANGES](c3-phase-b-recovery-priority-independent-review-20261025.md).** P0 giữ nguyên. P1 chỉ nối focus có provenance kiểm chứng được, không hứa giải tham chiếu tự nhiên tổng quát. P2 chỉ thêm handoff cho failure đăng ký không có recovery media hợp lệ; không mở generic mixed media + handoff. Bản revision 2 đã self-review, chưa được reviewer độc lập review lại; không ghi APPROVED.

Nguồn: [review đủ 51 ca](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-20261025/WHOLE_TURN_REVIEW.vi.md), [lượt chạy](../../apps/worker/evals/single-agent-commerce-read-only/full-phase-b-20261025/CHECKPOINT_B.md), [bài học fallback trước](c3-phase-b-fallback-next-step-fix-20261025.md), [hợp đồng recovery ảnh hiện có](c3-phase-b-composed-input-media-recovery-20261024.md), [handoff copy](c3-phase-b-customer-facing-handoff-copy-20261025.md).

## Mục tiêu vòng này

1. Ảnh/dữ kiện còn hợp lệ không bị loại chỉ vì nguồn vừa đồng bộ lại metadata.
2. Tận dụng focus có provenance để phục hồi ảnh ở lượt tiếp nối; khi chưa chứng minh được referent thì giữ unresolved, không chọn ảnh theo phỏng đoán.
3. Với failure đã đăng ký, không có recovery media hợp lệ và luồng có handoff, code chuyển xử lý thật; khách nhận xác nhận phù hợp, không bị hỏi có muốn chuyển hay không.
4. Phân biệt lỗi provider, verifier, snapshot và capability trong báo cáo; handoff thành công không biến thành tư vấn đạt.

Giữ owner Gemini 3.5 Flash Lite HIGH, verifier GPT-6.1 Sol HIGH, hai prompt tư vấn/verifier và tiêu chí chấm. Chỉ sửa copy code-owned nếu cần để báo đúng trạng thái phục hồi. Không thêm role, parser ngôn ngữ, bộ mẫu theo case, generation retry hay sửa/reverify draft. Không triển khai production hoặc live send.

## Thứ tự quyết định terminal

| Tình trạng | Xử lý |
|---|---|
| Reply được verifier cho qua và final gate hợp lệ | Gửi nguyên reply và media hợp lệ theo đường hiện có. |
| Draft/generation thất bại, có media độc lập đúng yêu cầu và đủ authority | Dùng đường recovery media hiện có: caption tĩnh đã đăng ký + ảnh hợp lệ. Giữ original failure và ghi partial recovery; không lấy câu từ draft bị chặn. Không tự thêm handoff. |
| Failure nằm trong bảng P2, không có recovery media hợp lệ, có handoff và policy cho phép | Atomically commit handoff cùng holding reply/Outbox; chỉ công bố terminal sau khi chứng minh commit/readback. |
| Trả được ảnh nhưng chưa chứng minh đủ mọi phần của yêu cầu | Giữ partial/unresolved trong review, không tự phân loại mixed intent hoặc mở handoff bổ sung. |
| SIZE_RULE_UNAVAILABLE | Giữ đúng nhánh media + handoff hiện có, không mở rộng sang reason khác trong vòng này. |
| Khách yêu cầu chuyển xử lý hoặc handoff nghiệp vụ đã xác lập | Giữ ưu tiên handoff; không chen thêm bot reply/ảnh làm thay đổi hợp đồng. |
| Recipient/permission/privacy/routing không hợp lệ, hoặc commit chưa rõ | Giữ NO_SEND; không dùng recovery để vượt chặn. |
| Harness B1 read-only không có handoff | Ghi giới hạn capability; không báo shop đã nhận/chuyển việc và không giả receipt. |

Đường recovery phải là một quyết định terminal trong luồng commit hiện có. Không chuyển tất cả FAIL thành HANDOFF ở `runCommerceTurn` rồi trông chờ ingress tự xử lý: cách đó từng làm 11 ca ingress rơi vào NO_SEND vì không chứng minh được commit. Không commit một group ảnh rồi commit thêm group handoff trong cùng lượt theo hai đường độc lập.

## P0 — snapshot ổn định khi nội dung offer không đổi

**Căn cứ:** `media-detail-next:continue` đã chọn ảnh CLOSEUP, verifier PASS. Chỉ `offers:SV2447` đổi observedAt/expiresAt/sourceVersion, kéo theo factSnapshotVersion; text vẫn cùng AO/CV/SET_VAY. Gate trả STALE.

**Sửa dự kiến:** `single-agent-commerce-read-only-tools.ts` và test tương ứng; chỉ chạm context builder nếu thật sự cần.

- Dùng một cách dựng/so sánh offer evidence cho prepare, read và readback; hiện sourceVersion đưa `observed` vào hash ở nhiều vị trí.
- Trong cùng lượt, nếu readback xác nhận cùng shop/product/authority/release và cùng danh sách offer canonical, giữ evidence đã bind cùng thời hạn ban đầu cho lượt đó. Timestamp mới dùng cho cache/lượt sau; không gia hạn tuổi bằng chứng của PASS cũ.
- Chỉ bỏ thời điểm đọc khỏi source identity chưa đủ, vì trusted snapshot vẫn chứa observedAt/expiresAt. Phải kiểm cả snapshot cuối và factSnapshotVersion, không sửa riêng hash để test qua.
- Offer thêm/bớt, nguồn/authority đổi, nguồn lỗi hoặc bằng chứng cũ hết hạn vẫn invalidated. Các claim giá/tồn, state, recipient, permission, policy và media binding tiếp tục kiểm như hiện tại.

**RED → GREEN:** replay hai context thực tế với clock cố định; chỉ refresh metadata thì ảnh vẫn đến actual captured terminal. Đối chứng offer đổi, evidence hết hạn trong lúc verifier chạy, giá/tồn đổi, revision/recipient/permission đổi phải chặn. Gate không coi mọi snapshot khác nhau là tương đương.

## P1 — gắn yêu cầu ảnh tiếp nối với đúng sản phẩm

**Căn cứ mới:** `media-overview-next:continue` có hai PRODUCT_MEDIA claims cho SV2447 nhưng `trusted.state.currentProductId=null`. Tin mới “Gửi chị ảnh cả bộ nhé” không nhắc mã/tên. `mediaRequestProduct` không tìm được productId nên đường recovery hiện có không được dùng.

**Sửa dự kiến:** `single-agent-commerce-ingress.ts`, consumer state/context hiện có và tests ingress/media. Không nới verifier để coi metadata thiếu là metadata đã xác nhận.

### P1a — xác lập contract trước khi sửa focus

- Lập bảng provenance của các nguồn đã có: lựa chọn khách được ghi bằng receipt/state; product entry/ads binding đã xác minh; quan hệ sản phẩm trong history được consumer hiện có xác lập. Mỗi nguồn phải chỉ ra productId, customer event/turn, source identity và revision/generation mà nó còn hiệu lực. Chỉ ghi thông tin tối thiểu cần kiểm chứng, không đưa PII vào model.
- `currentProductId`, một tên duy nhất xuất hiện trong câu, một seed fixture, một boundSubject hoặc ảnh model vừa chọn **đều không tự là chứng cứ đầy đủ**. Tên tồn tại trong catalog chỉ chứng minh identity của tên, không chứng minh khách đang chọn thay vì phủ định/so sánh nó.
- Không tạo provenance ngược từ reply bị reject hoặc từ tool selection của owner. Không tự ghi focus vào state chỉ để ca ảnh có thể recovery. Focus dùng cho recovery không tự cấp quyền sửa giỏ, size hoặc effect.
- Trước edit runtime, viết test chứng minh chuỗi rõ sản phẩm và bốn nhóm âm: tên bị phủ định, hai sản phẩm, group name trả nhiều SKU, chuyển sang tham chiếu chưa rõ. Dùng các đường binding có sẵn; không thêm parser phủ định/intent/obligation để làm test xanh.
- Khi signal cấu trúc báo binding không rõ/thay đổi, không kế thừa focus cũ cho recovery. Nếu chỉ có lời nói tự nhiên mà code chưa có cơ chế xác nhận tham chiếu, ghi giới hạn unresolved; không hứa nhận biết mọi phủ định trong vòng này. Không biến việc không có mã sản phẩm mới thành bằng chứng khách vẫn muốn món cũ.

### P1b — nối consumer trong phạm vi chứng minh được

- Chỉ tái sử dụng focus khi provenance và scope của nó còn hợp lệ; lưu qua transaction state hiện có nếu thực sự cần. Dùng field hiện có trước; không mở migration/framework history chỉ để vượt acceptance.
- Với trace `media-overview-next:continue`, kiểm cả lượt khách gọi tên và state commit trước đó. Nếu không có provenance đủ mạnh bằng khả năng hiện có, **không cam kết ca này sẽ nhận ảnh trong vòng sửa**: nó đi tới P2 khi đủ điều kiện handoff. Ghi riêng phần chưa giải được của referent.
- Điều kiện bật đường focus mới là các test provenance/đổi scope đạt. Nếu không đạt, bỏ phần mở rộng focus khỏi implementation, giữ P0 và P2; không vá riêng câu “Gửi chị ảnh cả bộ nhé”.
- Giữ caption media tĩnh hiện có, không mô tả thêm màu/parts/feedback chưa xác minh. Khi chỉ cần gửi ảnh chung, metadata thiếu parts không được tự biến thành câu mô tả sai; source/approval/identity của ảnh vẫn phải hợp lệ.
- Nếu bổ sung metadata FRONT/BACK, chỉ lấy xác nhận từ nguồn ảnh; không điền theo tên case hoặc tự suy ra ảnh thể hiện cả bộ.

**RED → GREEN:** chuỗi hai lượt với provenance đã xác lập thì caption bị reject vẫn có thể nhận ảnh đúng qua recovery; chuỗi thiếu provenance phải giữ unresolved hoặc handoff thực sự. Đối chứng đổi món, multi-product, seed-only/null focus, stale media, quyền/recipient và duplicate event không gửi nhầm/đúp. Bốn nhóm âm không phải quyền mở một parser mới. Test riêng ảnh cận ở P0.

## P2 — handoff thật khi không phục vụ tiếp được

**Sửa dự kiến:** `single-agent-commerce-handoff.ts`, `single-agent-commerce-ingress.ts`, persistence/delivery consumers và candidate handoff matrix. Shared contract thêm duy nhất reason `RESPONSE_UNAVAILABLE` cùng mapping trong conversation engine nếu triển khai các hàng tương ứng dưới đây. Tận dụng port/transaction hiện có; không thêm kênh chuyển việc hoặc sender mới.

### Danh sách failure được mở trong candidate

Mọi hàng đều đòi terminal là FALLBACK, không có recovery media hợp lệ, không có terminal/effect chưa rõ, và authority/policy/Inbox hiện tại hợp lệ. Dùng enum reason và telemetry role, không đọc từ khóa trong câu trả lời.

| Original reason | Handoff reason/category | Quy định |
|---|---|---|
| PROVIDER_ERROR, TIMEOUT | DEPENDENCY_FAILURE / SYSTEM_FAILURE | Ghi role owner/verifier và mã provider nếu có; HTTP 429 hoặc raw MALFORMED_RESPONSE giữ nguyên trong evidence. |
| FAIL, UNCERTAIN, MALFORMED | RESPONSE_UNAVAILABLE / SYSTEM_FAILURE | Nghĩa: không có reply hợp lệ để trả; không kết luận policy/giá sai hoặc nguồn bị lỗi. |
| BUDGET, OWNER_TOOL_MODE, OWNER_OUTPUT_ARTIFACT | RESPONSE_UNAVAILABLE / SYSTEM_FAILURE | Hết khả năng tạo reply trong lượt hiện tại; không thêm generation. |
| Mọi reason khác | Không mở auto-handoff mới | Giữ hành vi hiện có; đặc biệt NO_SEND, quyền/privacy/recipient, commit chưa rõ không đi qua nhánh mới. STALE/readback failure giữ hợp đồng hiện có, không được biến thành reply cũ hợp lệ. |

`SIZE_RULE_UNAVAILABLE`, explicit handoff, hậu mãi và checkout giữ đường riêng hiện tại. Không gộp bằng một catch-all FALLBACK→HANDOFF.

`RESPONSE_UNAVAILABLE` là bổ sung dự kiến, chưa tồn tại trong source. Cần schema, mapping category, candidate matrix HOLDING_REPLY_THEN_HANDOFF, importer và delivery tests đồng bộ. Không đổi default policy/reason hiện có của các consumer ngoài candidate; source thiếu rule mới thì không fallback sang một reason sai. Chưa đủ contract thì đánh dấu phần đó chưa triển khai, không tự substitute `UNSUPPORTED_REQUEST` hoặc `SAFETY_OR_COMPLIANCE`.

### Thứ tự xử lý và transaction

1. Tôn trọng terminal/effect đã commit hoặc chưa rõ; không replay effect.
2. Kiểm recovery media hiện có. Nếu hợp lệ, chỉ trả media và ghi partial recovery; không thêm generic handoff hoặc suy ra đã hoàn tất toàn bộ yêu cầu.
3. Không có recovery media hợp lệ mới đối chiếu bảng trên tại persisted orchestration, nơi có state/policy/Inbox/transaction. Không commit handoff ở adapter trước khi ingress có thể kiểm media.
4. Chuẩn bị holding reply cùng handoff decision. **Atomically commit state + handoff event/case + tag intent + Meta Outbox + Inbox completion theo contract hiện có.** Sau commit/readback mới công bố terminal HANDOFF; delivery tiếp tục qua gate. Không enqueue lời xác nhận bằng transaction thứ hai.
5. Receipt chứng minh công việc đã lưu và tag intent đã xếp hàng; chưa chứng minh Pancake nhận tag hoặc người xử lý đã đọc. Copy chỉ nói mức đã có chứng cứ: “Shop đã nhận yêu cầu của chị. Bên em sẽ kiểm tra rồi báo lại chị nhé.” Không nhắc bot/nhân viên, không hỏi xin phép chuyển hoặc hứa SLA chưa có.
6. Commit conflict/timeout/không rõ: không báo đã nhận xử lý, không tự retry effect. Silent policy vẫn silent. Một event chỉ tạo một handoff/group; replay chỉ đọc lại evidence hiện có.

Không mở generic mixed media + handoff. Nhánh kết hợp ảnh với `SIZE_RULE_UNAVAILABLE` giữ nguyên phạm vi của persistence/delivery hiện hành. Tool đã đọc giá/size không được dùng như bằng chứng khách đã nhận đủ các phần đó.

**RED → GREEN:** inject các reason trong bảng, gồm owner MALFORMED_RESPONSE/HTTP429 và verifier FAIL/timeout. Đủ authority, không có recovery thì đúng một atomic handoff; thiếu rule/authority hoặc commit chưa rõ thì không có acknowledgement giả. Đối chứng PASS không handoff, media recovery không có handoff mới, size-media/human-request giữ nguyên, receipt/state/policy đổi trước delivery bị chặn. Kiểm restart/replay, transaction rollback và tag intent/Outbox count. Rerun 11 nhóm ingress từng đỏ ở phương án cũ.

### Giá/tồn và B1: phạm vi thực tế

Không tự viết một đoạn giá/tồn/chính sách mới từ rejected draft. Vòng này ưu tiên recovery media đã có và handoff thật. Phục hồi prose có protected facts đòi một hợp đồng riêng cho code-owned fact block và delivery binding; không ngầm mở bằng cách gọi đó là “fallback an toàn”. Giữ thông tin đã đọc trong handoff context để người tiếp nhận tiếp tục, không yêu cầu khách nhắn lại.

Ba provider failures ở full run nằm trong harness B1 read-only. B1 không có quyền ghi handoff: không đổi harness thành có effects rồi so sánh trực tiếp số fallback với run cũ. Dùng ba tình huống đó làm **test integration persisted với fault injection** để chứng minh customer outcome của luồng có handoff. Báo riêng giới hạn B1; không giả rằng cả ba kết quả raw B1 cũ đã được chữa.

Nếu một phần trả lời hữu ích có sẵn dưới dạng code-owned đã được phép, giữ nguyên contract của phần đó. Không ghép thêm để mở một đường gửi protected text chưa qua contract. Không mở generic fact recovery trong vòng này.

## Phần chưa ưu tiên

- Không sửa prompt giọng, tính từ, câu nối, độ dài hoặc thêm ví dụ hội thoại.
- Không đổi verifier/rubric để giảm số fallback. So sánh chất liệu định tính vẫn theo ranh giới đã chốt.
- Discovery/khả năng chọn hàng được ghi backlog riêng: query đã trả món quần dài vượt ngân sách và quần short trong ngân sách. Sau recovery, đánh giá riêng chất lượng ứng viên/giá/loại quần trước khi sửa owner. Vòng này không trộn thay đổi retrieval với thay đổi terminal.
- SourceQuote đôi số đo có thể tự phục hồi trong budget; không mở parser đo cơ thể để sửa một ca đã hoàn tất.

## Verification và điều kiện hoàn tất

1. Commit savepoint từng P0 → P1 → P2. Quan sát test tái hiện thất bại trước sửa, chạy focused checks sau sửa; ghi command thực tế, không ghi PASS trước khi chạy.
2. Self-review toàn đường terminal, đặc biệt thứ tự recover/handoff/egress, atomic Inbox+Outbox, scope media và stale/privacy. Chỉ gọi independent reviewer khi owner yêu cầu.
3. Focused commands dự kiến từ repo root:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-effects.test.ts
pnpm --filter @lana/worker exec node --test evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs evals/single-agent-commerce-read-only/handoff-matrix.test.mjs evals/single-agent-commerce-read-only/candidate-handoff.test.mjs
pnpm --filter @lana/contracts exec vitest run src/v2/handoff-sales-funnel.test.ts src/v4/admin-policy-control.test.ts src/commerce-handoff-delivery.test.ts
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/contracts build
pnpm --filter @lana/conversation-engine exec vitest run src/handoff-fallback-v2.test.ts
pnpm --filter @lana/conversation-engine typecheck
pnpm --filter @lana/conversation-engine build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu chạm shared contract/renderer: chạy test/typecheck/build tương ứng, liệt kê cụ thể khi chọn implementation. Không nhập advisory parser cũ từ reply assembler để phục hồi text model.

4. Model run là bước sau implementation khi owner yêu cầu: giữ 17 controls + 51 native cases, một attempt/case, cùng model/prompt/rubric. Source/config clean, seal commit, fresh preflight, ghi mọi request/error. Không thêm model retry để săn được lần API thành công.
5. Trong 51 ca, ưu tiên hai chuỗi media có vấn đề (cả lượt trước cần thiết), ba ca B1 provider lỗi cũ và stateful handoff/checkout; mỗi registered slot chỉ chạy một lần. Persisted companion fault-injection không tính thành provider cases. Chạy phần còn lại theo đăng ký; không sửa source giữa run. Giữ dependency order, không chạy một lượt tiếp nối thiếu history/state rồi coi là cùng ca.
6. Chấm actual terminal với các cột riêng: trả lời đủ/partial/unresolved; media recovery; handoff committed/failed/unproved; provider errors; duplicate effects và NO_SEND. Có ảnh hoặc handoff không tự là đủ câu trả lời. Không đổi FALLBACK thành PASS để làm đẹp bảng; original failure luôn giữ. Handoff chỉ là continuity, không thay thế điểm tư vấn bán hàng.

**Acceptance chốt:** (a) ca ảnh cận không bị chặn do metadata-only refresh; (b) recovery ảnh chỉ dùng focus có provenance, trường hợp chưa chứng minh được được ghi unresolved hoặc handoff thực; (c) failure đăng ký không có recovery tạo đúng một handoff hoặc ghi rõ lý do không thể commit; (d) không duplicate effect/response group, không phát sinh NO_SEND do bỏ sót receipt ở nhánh mới; các NO_SEND đúng vì authority/commit conflict vẫn giữ; (e) luồng báo giá, size, giỏ/checkout và size-media handoff hiện có không hồi quy. Không đặt mục tiêu ép mọi fallback về 0 hoặc mọi ca handoff thành PASS.

## Đối chiếu review và self-review revision 2

- Finding 1: bỏ generic mixed-intent decision và mixed media + handoff; media recovery luôn ghi partial, P2 chỉ chạy khi không có recovery hợp lệ.
- Finding 2: tách P1a kiểm provenance và P1b nối consumer; thêm tiêu chí dừng phần focus khi capability hiện có chưa chứng minh được, không hứa chữa mọi tham chiếu bằng parser.
- Finding 3: sửa thứ tự atomic transaction/commit/readback/delivery, làm rõ receipt không chứng minh người tiếp nhận đã đọc.
- Checklist bổ sung: chốt reason allowlist, một reason mới tối thiểu cho reply unavailable, tests shared/consumer tương ứng, giữ B1 read-only và denominator.
- Self-review tài liệu: không thay owner/verifier/rubric, không lén mở protected-fact fallback, không biến recovery thành PASS, không dùng caption bị reject, không đổi scope của size-media exception. Chỉ tài liệu được sửa; các command trên chưa chạy trong lượt planning.
