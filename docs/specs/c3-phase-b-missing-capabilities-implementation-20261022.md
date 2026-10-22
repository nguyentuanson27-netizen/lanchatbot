# Phase B — evidence nối tác vụ còn thiếu

Ngày22/10/2026. **IMPLEMENTATION_IN_PROGRESS** theo [kế hoạch](c3-phase-b-missing-capabilities-plan-20261022.md), implementation base `1aa3a1d3`. Candidate vẫn cô lập; không production wiring, live send hoặc migration vào dữ liệu thật.

## Savepoint N1/N2

- N1: candidate hỏi một checkout field, dùng active clarification để route private trước history/model. Bare name có syntax hẹp và street address có số nhà được nhận theo field đang hỏi; câu hỏi không bị ghi làm tên. Input mơ hồ được hỏi lại riêng tư theo retry budget hiện hữu. Không thêm generic Vietnamese parser hoặc model extract PII. Tên viết khác syntax hẹp/địa chỉ không số nhà có thể cần field có nhãn; chưa nhận hỗ trợ mọi cách diễn đạt.
- Dừng checkout reuse classifier từ chối xác nhận hiện có, clear clarification và giữ giỏ; có thể yêu cầu đặt lại và tiếp tục field thiếu. Không dùng checkoutDraft tồn tại như pending flag. Multi-field legacy path giữ mặc định cũ; chỉ candidate truyền SINGLE_FIELD.
- N2: đọc tối đa30candidate history rows rồi lọc và giữ8public messages/4.096byte như cũ. Captured owner request không duplicate latest, không có private markers. N1 input pending bị drop toàn message khỏi public history và cả hai model không được gọi.
- RED observed: bare name/address không capture và invitation hỏi nhiều field (3fail); query limit8 thay30 (fail); pause không clear clarification (fail). GREEN hiện106focused tests, gồm75legacy sales-cycle regressions.
- Chưa chạy real PostgreSQL/capture integration cho savepoint này; chưa chứng minh toàn bộ acceptance N1/N2 hoặc natural language quality. Không có provider generations.

Commands thực sự chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-session.test.ts
# RED3, sau sửa mở rộng đến các commands dưới.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts
# RED cho history; pause được tái hiện riêng sau sửa assertion null của test.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts
# RED pause.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-checkout.test.ts src/realtime-sales-cycle.test.ts
# GREEN106/106.
pnpm --filter @lana/worker typecheck
# PASS (bao gồm pretypecheck builds).
```

## Còn phải thực hiện

N3a focus/ad bridge; N4 ảnh ra; N5 media intake/staff linkage; N6a public image input; N7 negotiation event; N8 harness và real-DB/capture/model coverage theo prerequisites. N3b terminal-focus và N6b customer-image privacy/recognition vẫn cần chốt contract, không tăng model/tool budget hoặc bypass privacy. Worker build/lint và focused regressions tương ứng phải chạy sau các thay đổi cuối.

## Savepoint N3a

Ingress xác minh catalog refs từ mã khách vừa nhắn, code trong adTitle và currentProductId đã lưu. Explicit verified ref thắng ad hint; ad chưa xác minh không tái dùng mẫu cũ. Source facts vẫn được prepare/readback như cũ; không lấy read_product cuối làm lựa chọn focus. Không implement N3b/tool round3 hoặc adId→product mapping giả.

Observed RED4/22 ingress tests; GREEN78/78 ingress + read-only-tools + session tests bằng:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-session.test.ts
```

N3a mới có focused evidence, chưa real-DB/provider journey; không nhận N3b đã hoàn thành. J10 candidate đã bổ sung điều kiện chỉ gửi biên lai sau actual QR/payment instructions đúng payment context; giữ incomplete/failure bước trước khi chưa cấp được QR.

## Savepoint N4 — outbound catalog media

Native select_product_media chỉ nhận subjectRef/intent/component/color, không nhận URL hay send. Selector reuse metadata APPROVED + verified + source hash + observedAt/expiry và HTTPS allowlist; tối đa4asset. Metadata/ref nằm trong exact trusted snapshot, URL ở code-only Outbox; source đổi sau PASS làm binding đổi. TEXT+IMAGE cùng existing protected response group; media của draft bị từ chối không được giữ. Không suy màu từ filename; source thiếu per-asset color nên yêu cầu màu chỉ đáp ứng khi product có đúng một màu xác minh.

RED observed:7media tests, native declaration và ingress TEXT+IMAGE fail; thêm cart case phát hiện parent PRODUCT_MEDIA bị đối xử như offer PRICE/STOCK ở hai guard. Sửa hẹp parent media contract; PRICE/STOCK variant checks giữ nguyên. GREEN103worker tests (ingress24/media8/boundary53/protected18),60contracts,71business-tools selector/readiness,9dispatcher,69Node adapter/protocol/corpus tests. Contracts build PASS. Direct worker tsc từng fail do assertion test đọc optional recovery; đã bỏ assertion không cần thiết và sẽ chạy lại.

Commands bổ sung thực sự chạy:

```powershell
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts
pnpm --filter @lana/contracts build
pnpm --filter @lana/worker exec vitest run src/track-b-protected-claim-boundary.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker exec vitest run src/meta-outbox-dispatcher.test.ts
pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts src/image-selection.test.ts src/media-selector-v2.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs
```

Chưa real DB/media delivery hoặc provider run. Hash metadata được bind; N4 chưa download/verify actual image bytes (N6a). Source thiếu timestamp không được bịa mới. Complexity: one bounded selector wrapper + native declaration + reuse2existing guards, không role/store/gate mới.

## Savepoint N5 — private intake and source linkage

Thay blanket attachment→NO_SEND bằng private intake: không tải URL/bytes ảnh khách hoặc gửi sang owner/verifier. Unknown/customer image được handoff thật bằng policy hiện hành; pending payment receipt reuse sales-cycle attachment path. Cả batch được giữ ngoài public history; record attachmentCount và bind triggerMessagePk/eventKey tới message chứa ảnh đầu tiên, kể cả text đến sau. Không thêm durable store: encrypted Inbox giữ envelope gốc, history/handoff giữ source linkage. HUMAN tiếp tục no-send, không gọi model/fetch.

RED1observed→GREEN46/46 ingress/session/persistence/handoff tests. Chưa chứng minh staff xem được image bytes qua admin UI: existing admin_handoff_history_v chỉ expose source message/type/count và liên kết Pancake conversation; không có endpoint ảnh khách có quyền trong admin. Đây là prerequisite N5 staff-image readback/N6b, không ghi hoàn thành N5. Unknown media handoff giữ context cho nhân viên; chưa claim vừa trả phần public độc lập vừa xử lý attachment. Không tải bytes nên downloader MIME/redirect không được mở rộng hoặc bypass.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t 'unknown customer media'
# RED1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts
```
