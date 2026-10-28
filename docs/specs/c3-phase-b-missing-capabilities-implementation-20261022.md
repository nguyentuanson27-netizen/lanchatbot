# Phase B — evidence nối tác vụ còn thiếu

Ngày22/10/2026. **PARTIAL_IMPLEMENTED — CHƯA B GO** theo [kế hoạch](c3-phase-b-missing-capabilities-plan-20261022.md), implementation base `1aa3a1d3`. Candidate vẫn cô lập; không production wiring, live send hoặc migration vào dữ liệu thật.

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

Current status và phần đã kiểm được chốt tại [checkpoint](../../apps/worker/evals/single-agent-commerce-read-only/connections-run-20261022/CHECKPOINT_B.md). Còn staff-image readback, customer-image privacy/recognition và customer-quality/full-journey coverage theo prerequisites. N3b terminal-focus và N6b customer-image privacy/recognition vẫn cần chốt contract, không tăng model/tool budget hoặc bypass privacy. Worker build/lint và focused regressions tương ứng phải chạy sau các thay đổi cuối.

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

## Savepoint N6a — public catalog bytes to the same owner

Official API docs checked before image wire change: https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/Content (inlineData mimeType/data); https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference ; generation configuration MediaResolution enum https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/projects.locations.tuningJobs#MediaResolution . Native view_product_media reuses N4 approved selector but does not select outbound images. Existing secure downloader validates hosts/redirects/MIME/stream bounds; actual bytes must match sourceContentSha256. Header dimensions ≤1024, JPEG/PNG/WebP, ≤512KiB/image, ≤2images/turn,8s/download. Unsupported/bad source stays UNAVAILABLE, no fabricated hash or observedAt.

Owner gets code-only catalogImages input; adapter explicitly copies subjectRef/assetRef/hash + inlineData, no filename/evaluator labels. Each image must be bound in current vision policy literal. Verifier sees source metadata/hash and final prose, never raw image bytes. Existing text envelope limit65536bytes unchanged; media adds separate bounded envelope1507328bytes, MEDIUM resolution (documented256tokens/image; actual usage recorded by provider, no estimate claimed as observed). Existing maxOutput8192/2tool-rounds/6calls unchanged. Registration now records image bounds. Image text cannot authorize instructions, shop facts or test results.

Observed RED2worker +1adapter → GREEN10media and56native-adapter tests.65worker media/secure-pipeline/ingress tests PASS; direct worker tsc PASS. Runtime capture test proves same owner receives image and verifier does not. API/provider sanity not run yet; source metadata availability not proven for actual shop assets. Customer images remain excluded (N6b privacy prerequisite). Correction N5 result: actual command passed60/60, not46/46.

## Savepoint N7 — native negotiation intent to canonical engine

record_negotiation chỉ nhận PRICE_OBJECTION/PURCHASE_READY + sourceQuote từ current public inbound; không nhận mức giảm/tier/policy/source identity. Code kiểm quote tồn tại duy nhất và current cart, cấp operationId theo message+tool (không theo số tool calls), chạy NEGOTIATION_EVENT qua existing planner/apply/transaction. Canonical engine quyết customerState, reprices cart, invalidate preview; giữ consumedObjectionEvidenceIds/processedEvents. Native early branch tránh legacy text/classifier tự diễn dịch lại intent. Same-source calls không cấp thêm concession. Existing authority/CAS/current policy còn nguyên. Receipt dùng ledger event hiện hữu, effect NEGOTIATION_UPDATED; không tạo storage layer.

RED1observed→GREEN2focused;187worker effects/session/persistence/ingress/sales-cycle tests PASS. Direct worker tsc PASS. Same-source objection hai quote khác nhau chỉ1transition; cart quantity reprice giữ tier/ledger. Invented history quote và money argument bị reject. Focused negotiation-engine và native/protocol checks chạy riêng. Chưa real-DB negotiation hoặc provider false-trigger controls, nên chưa gọi N7 hoàn tất.

## N8 harness + transaction verification in progress

Extend existing isolated-integration (không runner/framework mới) bằng4composed checks: private single-field journey, TEXT+IMAGE capture, image-first/text-last source linkage, negotiation/reprice. First COD run failed because test kiểm cả authorized private preview trong raw history thay vì public projection; sửa assertion phân biệt inbound/public projection và authorized preview, không sửa kết quả cũ. Second COD run passed N1/N4/N5 rồi N7 phát hiện actual transaction EFFECT_READINESS_REQUIRED: native planner chưa gắn CART_READY/replay context. Added focused planner RED→GREEN, reuse current selection freshness + canonical replay context + CART_READY, giữ transaction guard;152focused tests PASS, direct worker compile PASS. Hai failed DBs đều dropped,0generation. Evidence ngoài repo tại ../c3-b-connections-cod-20261022 và ../c3-b-connections-cod2-20261022.

Candidate corpus vẫn12journeys/32slots, không đổi baseline24B1/8stateful. New evaluator-only registration nối được4opening turns J02/J03/J05/J08 vào existing provider harness;28dependent/setup/media/private slots ghi NOT_REGISTERED với lý do. Không tự dispatch follow-up khi chưa review accepted output. Private/media fixture chưa materialize bị từ chối, không drop attachments. Selection/corpus/source/config/tool/image bounds được freeze ở preflight;0generation đến đây. Native declarations regression updated (2old assumptions về danh sách/thứ tự tool từng fail);74adapter/protocol/corpus/handoff tests PASS, thêm2registration tests PASS. Worker349focused tests, lint và full dependency+worker build PASS; business-tools protected/reply21PASS. Không claim đầy đủ12journeys đã chạy.

## N6a source-contract correction after public-source audit

Audit actual SV2447:11approved/verified/hashed assets; image observedAt=null nhưng productObservedAt=2026-09-28 hợp lệ trong30ngày tại run date. colors=[] và source không có per-asset color, nên request ảnh be không đủ binding màu. Hai GENERIC JPEG được đọc có kích thước2000×3000/1966×3000,661509/368717bytes; checksum download khác registry. Không kết luận hình đã đổi: p23b-metadata-staging.ts ghi rõ CDN có thể encode lại và IMAGE_HASH chỉ đối soát. Assumption N6a đầu rằng registry hash phải bằng current HTTP bytes là sai contract.

Observed RED cho tách registry/download identity. Sửa trong wrapper: retain registrySha256 làm source provenance, bind downloadSha256 thực đo và prepared sha256 trong trusted vision literal; readback download lại và chặn khi bytes đổi. Reuse existing secure downloader + ffmpeg arguments/transcoder/geometry checks để thu ảnh lớn về≤1024; JPEG q3, PNG giữ alpha; không crop/upscale. Source≤2MiB/12000dimension/50M pixels; prepared≤512KiB/image,≤2images, provider wire bound giữ nguyên. Không dùng checksum khác làm quyền mở rộng policy/facts/identity ngoài approved catalog URL/version. Source hash nghĩa đối soát và measured byte hashes được tách rõ, không âm thầm coi URL hash là image bytes hash.

66focused media/pipeline/ingress tests PASS sau correction (test serialized nested JSON assertion đã sửa); worker compile PASS. Các provider outcomes source bce8538b/67c78b2a thuộc source cũ, vẫn giữ nguyên; không nhận chúng đã kiểm provider image API mới. Một public-image API sanity không gửi khách sẽ có freeze/source/count riêng trước dispatch; không chạy lại campaign sửa prompt.

Compile correction: lượt compile trước savepoint4ad3e99a đã FAIL ở Buffer generic/MIME literal inference, không phải PASS như dòng trước ghi. Đã khai báo kiểu cụ thể; pnpm --filter @lana/worker exec tsc -p tsconfig.json PASS sau sửa. One-shot public-image API probe reuse actual wrapper/inference, không gửi/ghi state; registration tối đa1generation, không verifier/customer qualification.

Actual image preflight found existing ffmpeg canonical args used `-autorotate 1`; installed ffmpeg interprets `1` as output URL and exits before decode. Reproduced RED with real PNG/installed ffmpeg; official https://ffmpeg.org/ffmpeg.html documents boolean `-autorotate` without argument. Minimal shared helper correction removes `1`; geometry/no-crop/no-upscale unchanged.41media/pipeline tests PASS (real ffmpeg available,0skip), final direct worker compile PASS. Earlier 450worker tests passed before this flag correction; focused real-binary test owns this new compatibility risk. First image preflight had0provider requests and was not a generated attempt.

## Kết quả chốt

[Checkpoint và findings](../../apps/worker/evals/single-agent-commerce-read-only/connections-run-20261022/CHECKPOINT_B.md), [7lượt thực tế](../../apps/worker/evals/single-agent-commerce-read-only/connections-run-20261022/CONVERSATIONS.md), [exact commands](../../apps/worker/evals/single-agent-commerce-read-only/connections-run-20261022/COMMANDS.md). Final451worker tests/77Node PASS; contracts60/business selector-readiness71/protected-reply21/negotiation9PASS; typecheck/build/lint/direct final compile PASS. COD18/BANK32checks PASS, tất cả DBs dropped.7customer outcomes/20requests,4eligible/2fallback/1silent handoff; API sanity2public images/1request PASS riêng, không gửi khách.0retry,0HTTPerrors/timeouts,1owner tool-mode violation; no evaluator labels in20captured customer requests. Không nhận toàn plan/B đã hoàn tất hoặc tư vấn tự nhiên đã cải thiện.

## Sửa ba finding sau review độc lập

Fix base: `e9c301e1fb9024a603b8f40d21e70428ae1dea8a`. Đây là sửa code sau cohort trên; không model generation mới, không gán kết quả provider cũ cho source mới.

- **N7:** quote phải nằm duy nhất trong một message public thuộc current batch; không ghép qua hai message. Operation ID và negotiation evidence dùng message chứa quote, giữ original timestamp qua type `VerifiedInboundMessageV1` hiện có. Source hash cấp quyền transaction vẫn là message cuối batch. Reuse processed commands/receipt ledger: reclaim có thêm tail không cấp giảm lần hai; phản đối ở message khác vẫn dùng được.
- **N5:** receipt evidence giữ ID/timestamp/attachment metadata của message chứa ảnh, riêng với last-message commit authority; handoff trigger vẫn đúng ảnh đầu batch. Không gán ảnh cho message chữ cuối hoặc đưa URL/bytes vào model. Database transaction guard không đổi.
- **N4:** `CART_READY` bind exact cart như cũ; outbound có thể thêm product catalog với parent-scope `PRODUCT_MEDIA` đã xác minh. Existing binding vốn cho phép product scope chứa cart subset; readiness producer được sửa cho khớp, chỉ cho extra subjects có parent-media claim. Cart semantics không bắt ảnh catalog thuộc giỏ. Variant media, giá/tồn/quantity, freshness, cart hash, parent readiness và payload vẫn kiểm; xin ảnh món khác không thêm món vào cart.

Observed RED trước sửa: ingress **3failed/27passed**, contracts **1failed/59passed**, business readiness **1failed/33passed**. Sau sửa GREEN; controls bao gồm quote lặp trong/multiple messages, quote ghép qua hai message, thiếu source, phản đối thực ở message khác, extra product không có claim, ảnh stale và cart effects không được mở rộng scope.

Commands thực sự chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts
# RED3/30 -> GREEN30/30. Sau bổ sung replay outcome, fixture generation cố định gây fail;
# sửa fixture theo batch.generation + ledger readback, final30/30 PASS.
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts
# RED1/60 -> GREEN60/60.
pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts
# RED1/34 -> GREEN34/34.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-session.test.ts
# Intermediate117/117 PASS, trước5quote controls mới.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts src/realtime-sales-cycle.test.ts src/meta-outbox-dispatcher.test.ts src/media-recognition-v2-image-pipeline.test.ts
# 460/460 PASS,19files,0skip; sau bổ sung fixture replay đã chạy lại ingress30/30.
pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts src/v2/canonical-commerce-bindings.test.ts
# 78/78 PASS.
pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
# 55/55 PASS.
pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts
# 40/40 PASS.
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs
# 77/77 PASS.
pnpm --filter @lana/contracts build
pnpm --filter @lana/business-tools build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
# All PASS. Worker prebuild/pretypecheck rebuild dependencies.
```

Intermediate direct `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` failed do test gán readonly state và optional property truyền undefined; đã sửa immutable fixture/conditional property rồi worker typecheck/build/lint PASS. Không nhận lệnh thất bại là PASS.

Receipt regression chạy actual `PostgresRealtimeRuntimeStore.commitWithinTransaction` với query doubles đến sau current-source guard, không PostgreSQL connection/SQL mutation. Negotiation regression dùng actual ingress/planner/domain với store fixture: giữ original evidence ID, HESITANT và tổng tiền sau supersession, đọc receipt rồi SEND_ELIGIBLE ở lần xử lý lại. Đây là deterministic regression evidence; chưa chạy lại COD18/BANK32 hoặc full provider B1/B2/B3 trên source mới.

Self-review đối chiếu từng finding với regression/controls. Complexity: sửa adapter và existing readiness scope; không gate/role/router/parser/prompt example/durable state/table/migration mới. Prompts/models/corpora, production entrypoints và database transaction guard không đổi. N3b/staff-image/N6b/28slots và chất lượng tư vấn vẫn pending. **CHƯA B GO**.
