# Kế hoạch triển khai nhận diện ảnh Cutout-first + AI reranker

> Trạng thái: `PLANNED_NOT_IMPLEMENTED`
> Ngày lập: `2026-07-28`
> Phạm vi live ban đầu: page test `1198992073286645`
> Source đã đối chiếu: `origin/main` tại `5f817bb`, tag
> `20260728-wave1-recorded-replay-r21`
> Tài liệu này không xác nhận release production mới và không thay đổi production
> baseline.

## 1. Mục tiêu và quyết định chính

Luồng mới phải:

1. Dùng ảnh đã tách nền làm tín hiệu chính.
2. Giữ ảnh gốc làm fallback và bằng chứng phụ.
3. Khi chưa đủ chắc chắn, hỏi khách xác nhận trong tối đa ba candidate.
4. Chỉ dùng Gemini để phân xử case khó; không dùng Gemini thay Qdrant hoặc tạo
   mã sản phẩm.
5. Không handoff ngay vì top-gap nhỏ, cutout lỗi, Gemini timeout hoặc schema AI
   lỗi.
6. Không dùng lại `currentProductId` cũ khi khách vừa gửi ảnh mới.

Page `1198992073286645` là page test riêng, chưa có khách thật. Kế hoạch cho phép
bật live 100% trên chính page này, không cần shadow test, canary theo phần trăm
hoặc sender allowlist. Hard gate theo page, kill switch, Inbox/Outbox idempotency
và app ownership vẫn bắt buộc.

Triển khai theo hai đợt năng lực:

- **Đợt 1 — Cutout-first + clarification.**
- **Đợt 2 — Gemini reranker.**

Không gán số release trong tài liệu này. Tên tag, image và release directory sẽ
theo chuỗi release thực tế tại thời điểm deploy.

## 2. Bằng chứng và nguyên nhân gốc

### 2.1 Case Messenger đã quan sát

- Thời gian: `2026-07-28 11:33:43`.
- Nội dung: khách gửi một ảnh và nhắn “xin giá”.
- Raw Qdrant trả:
  - `SD395`: `0.7888481`.
  - `SD443`: `0.75907767`.
  - `SD013`: `0.7541853`.
- Top-gap khoảng `0.02977`.
- Ngưỡng raw hiện hành:
  - `PRODUCT_SEARCH_IMAGE_MIN_SCORE=0.78`.
  - `PRODUCT_SEARCH_MIN_TOP_GAP=0.04`.
- Quyết định: `TOP_GAP_TOO_SMALL`.
- Tin có một media; media đó bị coi là uncertain nên tỷ lệ uncertain là `1/1`.
  `aggregateMedia()` đặt `requiresHandoff=true`, sau đó runtime handoff bằng
  `PRODUCT_AMBIGUOUS`.

`SD395` đã có ảnh active/approved/verified trong Qdrant. Đây không phải lỗi thiếu
import hoặc thiếu publish ảnh.

### 2.2 Điểm yếu chí mạng

Qdrant không tự “nhìn” ảnh; nó chỉ xếp hạng vector ứng dụng đưa vào. Pipeline ghi
và đọc hiện không đồng bộ:

- P2.3C publish `image_raw`, `image_cutout` và `product_text`.
- Adapter realtime chỉ cho phép `product_text | image_raw`.
- `searchStableImage()`, batch image search và image-bytes search đều query
  `using: "image_raw"`.
- `image_cutout` có trong collection nhưng không tham gia quyết định realtime.
- Raw và cutout có phân bố score khác nhau nhưng hiện chỉ có một bộ threshold.
- Candidate thứ hai chỉ hơi thấp hơn có thể phủ quyết top 1 và làm cả tin nhắn
  chuyển human.

`SD395` và `SD443` cùng có người mẫu đứng chính diện và trang phục dáng dài,
nhưng khác rõ màu, vật liệu, tay áo, cổ, hoa văn và bối cảnh. Raw embedding đã bị
chi phối bởi người mẫu, pose, silhouette và background; điểm gần nhau không có
nghĩa hai sản phẩm giống nhau đến mức dùng thay nhau.

### 2.3 Lỗi state liên quan

Khi ảnh mới không resolve được, `currentProductId` cũ có thể còn trong state và
xuất hiện trong metadata/handoff. Đây không làm Qdrant trả sai top 3 nhưng có thể
khiến nhánh sau hiểu nhầm khách vẫn hỏi sản phẩm cũ.

Kết luận:

- Lỗi chính: realtime không query `image_cutout`.
- Lỗi quyết định: top-gap rule quá thô và handoff quá sớm.
- Lỗi state: ảnh mới chưa vô hiệu hóa product context cũ.

## 3. Kiến trúc mục tiêu

Không dùng cutout-only. Cutout là primary vì luồng n8n cũ đã cho kết quả thực tế
tốt hơn; raw vẫn cần để:

- Fallback khi cutout lỗi hoặc timeout.
- Giữ chi tiết cutout dễ xóa nhầm như voan, ren, viền cùng màu nền và phụ kiện.
- Phát hiện cutout hỏng qua bất đồng raw/cutout.
- Hỗ trợ crop, detail, collage và nhiều vật thể.

App tiếp tục là owner duy nhất:

- App gửi reply qua Meta Send API.
- Pancake chỉ quan sát, gắn tag và hỗ trợ handoff.
- Không bật lại chatbot n8n trên page test.
- Không có hai hệ thống cùng trả lời một event.

Luồng:

```text
Inbox event có ảnh
→ ownership + page hard gate + idempotency
→ download có giới hạn
→ validate MIME/magic bytes/bytes/pixel
→ normalize, strip metadata, tính hash
→ chạy song song:
   ├─ embedding normalized image → Qdrant image_raw
   └─ remove background → embedding cutout → Qdrant image_cutout
→ hợp nhất top 3 theo productId
→ MATCHED | AMBIGUOUS | NONE
→ Đợt 2: Gemini rerank nếu đủ điều kiện
→ exact-revalidate mã được chọn
→ cập nhật state
→ lấy ProductFactsV2/POS fresh
→ tạo Meta Outbox đúng một lần
```

## 4. Phạm vi

Trong phạm vi:

- Ảnh Messenger đơn hoặc nhiều ảnh.
- Ảnh bị Meta nén, screenshot, crop, detail.
- Collage hoặc ảnh có nhiều sản phẩm.
- Cutout-first, raw fallback/support.
- Clarification bằng số thứ tự hoặc mã sản phẩm.
- Gemini reranker top 3.
- Cache, telemetry, timeout, idempotency và rollback.

Ngoài phạm vi:

- Tạo mã sản phẩm mới.
- Cho Gemini quyết định giá, tồn, màu, size hoặc chính sách.
- Cho Gemini tìm ngoài top 3 Qdrant.
- Thay đổi P2.3 ownership hoặc bật lại n8n.
- Mở page có khách thật.
- Thay đổi luồng video trong đợt này.
- Migration không cần thiết.

## 5. Ma trận quyết định

| Tình huống | Quyết định |
|---|---|
| Cutout mạnh, gap đạt, raw không phủ định | Tự nhận diện |
| Cutout mạnh, raw không có kết quả | Tự nhận diện nếu vượt strong gate |
| Cutout trung bình, có tối đa ba candidate cạnh tranh | Hỏi chọn mẫu 1/2/3 |
| Raw và cutout cùng top 1 | Tăng confidence; match nếu đạt gate |
| Raw và cutout bất đồng | Clarification; Đợt 2 có thể gọi Gemini |
| Cutout lỗi, raw mạnh | Raw fallback |
| Cutout lỗi, raw trung bình | Clarification |
| Raw lỗi, cutout mạnh | Cutout primary |
| Cả hai yếu/không có candidate | `NONE`, không ép gán mã |
| Collage/nhiều sản phẩm | `AMBIGUOUS` hoặc `MULTI_PRODUCT` |
| Khách phủ nhận toàn bộ | Đóng clarification cũ, hỏi ảnh/mã khác |
| Ba lượt không tiến triển | Handoff |

Candidate thứ hai chỉ cạnh tranh khi vượt thêm
`REALTIME_MEDIA_COMPETITIVE_SECOND_SCORE`; candidate yếu không được phủ quyết top
1 chỉ vì gap tuyệt đối nhỏ.

## 6. Đợt 1 — Cutout-first + clarification

### 6.1 Preprocessing và cutout

Module dùng chung phải:

- Chỉ nhận HTTPS attachment từ adapter đã xác minh.
- Có timeout tải, giới hạn redirect, bytes, width, height và tổng pixel.
- Kiểm tra MIME và magic bytes; chặn decompression bomb.
- Chuẩn hóa orientation/color space, strip EXIF và metadata không cần thiết.
- Resize theo giới hạn embedding, không upscale vô ích.
- Tính hash bytes gốc và hash normalized.
- Không ghi URL, bytes hoặc nội dung ảnh vào log.

Cutout client:

- Gọi endpoint app-native, không qua n8n.
- Có timeout, bounded retry và cancellation.
- Xác thực response trước khi embedding.
- Trả status `SUCCESS`, `TIMEOUT`, `RATE_LIMITED`, `INVALID_RESPONSE` hoặc
  `UNAVAILABLE`.
- Lỗi cutout không làm mất Inbox và không handoff ngay.

### 6.2 Qdrant dual-channel

Mở rộng adapter để query rõ:

- `image_raw`.
- `image_cutout`.

Mỗi kênh giữ:

- Top 3 dedupe theo `productId`.
- Score, top-gap và channel.
- Point/ảnh đại diện đã tạo candidate.
- Catalog và pipeline version.

Ảnh candidate đưa sang Gemini phải là ảnh của point tạo candidate hoặc ảnh do
quy tắc deterministic chọn từ đúng sản phẩm; không lấy tùy ý primary image khác
có thể lệch màu/variant.

### 6.3 Decision engine

Không dùng trực tiếp `ProductSearchService.decideSemantic()` với threshold chung.
Contract đề xuất:

```ts
type MediaRecognitionDecision =
  | { status: "MATCHED"; productId: string; source: "CUTOUT" | "RAW" | "CONSENSUS" }
  | { status: "AMBIGUOUS"; candidates: readonly Candidate[]; reasonCode: string }
  | { status: "NONE"; candidates: readonly Candidate[]; reasonCode: string }
  | { status: "ERROR"; reasonCode: string };
```

Reason code tối thiểu:

- `CUTOUT_STRONG_MATCH`.
- `RAW_FALLBACK_MATCH`.
- `CHANNEL_CONSENSUS`.
- `CHANNEL_DISAGREEMENT`.
- `CUTOUT_TOP_GAP_SMALL`.
- `SCORE_NEAR_THRESHOLD`.
- `OUT_OF_CATALOG`.
- `MULTI_PRODUCT`.
- `CUTOUT_FAILED`.
- `BOTH_CHANNELS_WEAK`.

Khi clarification flag bật, `aggregateMedia().requiresHandoff` không được trực
tiếp handoff một ảnh ambiguous.

### 6.4 Media clarification state

Không dùng lẫn checkout clarification. Field mới là optional để state cũ vẫn
hợp lệ:

```ts
interface MediaClarificationState {
  readonly schemaVersion: 1;
  readonly sourceEventKeyHash: string;
  readonly normalizedImageHash: string;
  readonly candidateSetFingerprint: string;
  readonly candidates: readonly {
    readonly label: "MAU_1" | "MAU_2" | "MAU_3";
    readonly productId: string;
  }[];
  readonly attemptCount: number;
  readonly maxAttempts: 3;
  readonly createdAt: string;
  readonly expiresAt: string;
}
```

Quy tắc:

- Ảnh mới suspend/xóa `currentProductId` cũ trước khi resolve.
- Không fallback sản phẩm cũ khi ảnh mới ambiguous/error/none.
- Lưu tối đa ba candidate; TTL đề xuất 15–30 phút.
- Chấp nhận “mẫu 1/2/3”, “1/2/3” khi state active, mã như `SD395`, hoặc “không
  phải mẫu nào”.
- Mã được chọn phải nằm trong candidate set hoặc exact-match theo explicit-code
  rule hiện hành.
- Sau khi chọn, exact-revalidate và lấy lại ProductFactsV2/POS fresh trước khi
  trả business facts.
- Ảnh mới, candidate set mới, TTL hết hoặc phủ nhận toàn bộ đóng state cũ.
- Tối đa ba lượt không tiến triển rồi mới handoff.

Câu hỏi gợi ý:

```text
Em thấy ảnh này gần với 3 mẫu dưới đây. Chị chọn giúp em “mẫu 1”, “mẫu 2”,
“mẫu 3” hoặc nhắn mã sản phẩm nhé. Nếu không đúng mẫu nào chị nói
“không phải mẫu nào”.
```

Mỗi candidate chỉ gửi ảnh approved/verified của chính sản phẩm; chưa gửi giá,
tồn hoặc size ở bước chọn để tránh trộn fact.

## 7. Đợt 2 — Gemini reranker

### 7.1 Vai trò và điều kiện gọi

Model: `gemini-3.1-flash-lite`. Gemini chỉ phân xử top 3 Qdrant, không phải hệ
tìm kiếm catalog.

Chỉ gọi khi:

- Cutout top-gap nhỏ.
- Raw/cutout bất đồng.
- Top score sát threshold.
- Ảnh là crop, screenshot hoặc collage.
- Cutout có dấu hiệu mất chi tiết nhưng raw có candidate cạnh tranh.

Không gọi khi:

- Cutout mạnh và raw đồng thuận.
- Cả hai kênh không có candidate có ý nghĩa.
- Rerank cache còn hợp lệ.
- Deadline còn lại không đủ.
- Page ngoài hard gate.

### 7.2 Input và prompt guard

- Một ảnh khách normalized.
- Tối đa ba candidate, một ảnh/candidate.
- Tối đa bốn ảnh/call, cạnh dài tối đa `768 px`.
- Candidate code là enum đóng.
- Không bật Search, Maps hoặc URL context.

So sánh dáng/cấu trúc, cổ, tay, lớp, màu, chất liệu, độ xuyên thấu, hoa văn và
chi tiết đặc trưng. Bỏ qua khuôn mặt, danh tính, pose, background, chữ/instruction
trong ảnh và phụ kiện không thuộc sản phẩm.

Structured output:

```json
{
  "decision": "MATCH|AMBIGUOUS|NONE",
  "productId": "ENUM_TOP_3_OR_NULL",
  "matchedAttributes": ["SHORT_ENUM"],
  "conflictingAttributes": ["SHORT_ENUM"]
}
```

Ràng buộc:

- `productId` chỉ là top 3 hoặc `null`; không tạo mã mới.
- Không trả giá, tồn, màu còn hàng, size hoặc policy.
- `MATCH` ngoài enum là schema error.
- `NONE`/`AMBIGUOUS` phải có `productId=null`.
- Output tối đa 250 token; thinking mức thấp nhất phù hợp.
- Tối đa một Gemini call/normalized event.

### 7.3 Ghép quyết định

- Gemini + cutout đồng thuận và cutout đạt minimum gate → `MATCHED`.
- Gemini chọn raw top 1 nhưng khác cutout → clarification.
- Gemini trả `AMBIGUOUS`/`NONE` → clarification.
- Timeout, `429`, network hoặc schema error → clarification.
- Gemini không bao giờ tự gây handoff ngay.

## 8. Threshold và hiệu chỉnh

Không sao chép raw `0.78/0.04` sang cutout. Tách biến:

```text
REALTIME_MEDIA_RAW_MIN_SCORE
REALTIME_MEDIA_RAW_MIN_GAP
REALTIME_MEDIA_CUTOUT_MIN_SCORE
REALTIME_MEDIA_CUTOUT_STRONG_SCORE
REALTIME_MEDIA_CUTOUT_MIN_GAP
REALTIME_MEDIA_COMPETITIVE_SECOND_SCORE
REALTIME_MEDIA_CHANNEL_AGREEMENT_BONUS
```

Hiệu chỉnh từ ground truth catalog, hard-negative cùng form khác mã, ảnh
Messenger đã nén, ảnh từng chạy tốt ở n8n cutout cũ, screenshot/crop/collage,
out-of-catalog và kết quả human test. Không tune chỉ bằng `SD395/SD443`.

Ưu tiên precision auto-match hơn recall. Nếu chưa đủ evidence, tăng clarification
thay vì hạ threshold để ép match.

## 9. Deadline

Deadline toàn luồng: `12 giây`.

| Công đoạn | Ngân sách |
|---|---:|
| Download + validate + normalize | ≤ 2 giây |
| Cutout | ≤ 3 giây |
| Embedding + Qdrant hai kênh | ≤ 3 giây |
| Gemini khi cần | phần còn lại, thường ≤ 4–5 giây |
| State + exact revalidate + Outbox | luôn có phần dự phòng |

`REALTIME_MEDIA_AI_TIMEOUT_MS=8000` là hard cap của client, không phải thời gian
Gemini mặc định được giữ. Mọi network call nhận deadline/cancellation chung.
Timeout không được làm mất Inbox hoặc phá transaction/idempotency hiện hành.

## 10. Cache

```text
media-resolution:v2:{pipelineVersion}:{catalogGeneration}:{normalizedImageHash}
media-rerank:v1:{modelVersion}:{promptVersion}:{candidateSetFingerprint}:{normalizedImageHash}
```

Lưu hash raw/normalized, cutout status/hash, raw/cutout top 3 + score + gap +
point reference, fingerprint, deterministic decision, Gemini decision và
pipeline/catalog/model/prompt version.

Không lưu base64, bytes raw/cutout, payload Messenger hoặc cache chỉ theo URL
Meta. Negative/ambiguous có TTL ngắn hơn matched. Cache không dùng xuyên catalog
generation. Namespace mới giúp rollback không phải xóa cache.

## 11. Telemetry và bảo mật

Mỗi ảnh ghi:

- Event/message identifier dạng hash, không PII.
- Raw/cutout top 3, score và gap.
- Agreement/disagreement và cutout status.
- Lý do gọi/không gọi Gemini.
- Model/prompt/pipeline/catalog version.
- Gemini decision/schema status.
- Clarification opened/resolved/rejected/exhausted.
- Latency từng stage, cache hit/miss, final decision và Outbox dedupe.

Không log URL ảnh, base64/bytes, nội dung ảnh, raw Messenger payload, raw model
response, PII, secret hoặc API key.

Bảo mật:

- HTTPS; chặn private/link-local/loopback destination và kiểm tra lại redirect.
- MIME allowlist, magic bytes, byte/dimension/pixel limit, decompression-bomb
  guard.
- Strip metadata; file tạm có lifetime giới hạn.
- Không persist ảnh khách ngoài retention mã hóa hiện hành.
- Chữ/instruction trong ảnh luôn là dữ liệu không tin cậy.
- Candidate URL chỉ từ payload approved/active và qua cùng download guard.

Metric: precision auto-match, clarification resolution, handoff/NONE rate,
agreement rate, Gemini invocation/override/error, p50/p95, cost/page/day và
duplicate event/model/Outbox.

## 12. Nhiều ảnh, collage và xung đột

- Nhiều ảnh cùng product → consensus.
- Nhiều product → danh sách theo thứ tự ảnh.
- Một ảnh lỗi không làm cả batch handoff nếu ảnh còn lại rõ.
- Collage nhiều sản phẩm → `MULTI_PRODUCT`; không ép top 1.
- Mã khách gõ rõ được exact-match và ưu tiên hơn suy đoán ảnh, nhưng phải ghi
  telemetry conflict.
- Ads context không âm thầm thay ảnh mới.
- Mã rõ không tồn tại → trả không tìm thấy, không fallback state cũ.

## 13. Feature flags

Đợt 1:

```text
REALTIME_MEDIA_PIPELINE_ENABLED=true
REALTIME_MEDIA_ENABLED_PAGE_IDS=1198992073286645
REALTIME_MEDIA_CUTOUT_MODE=LIVE
REALTIME_MEDIA_CLARIFICATION_ENABLED=true
REALTIME_MEDIA_AI_RERANK_MODE=OFF
```

Đợt 2:

```text
REALTIME_MEDIA_AI_RERANK_MODE=LIVE
REALTIME_MEDIA_AI_RERANK_MODEL=gemini-3.1-flash-lite
REALTIME_MEDIA_AI_MAX_CANDIDATES=3
REALTIME_MEDIA_AI_TIMEOUT_MS=8000
REALTIME_MEDIA_AI_MAX_OUTPUT_TOKENS=250
```

Flag parse fail-closed. Page ngoài allowlist không được chạy cutout/Gemini hoặc
thay đổi quyết định media hiện hành.

## 14. Phạm vi code dự kiến

| Khu vực | Thay đổi |
|---|---|
| `packages/business-tools/src/types.ts` | Contract channel/candidate/decision |
| `packages/business-tools/src/qdrant.ts` | Query raw/cutout, giữ point reference |
| `packages/business-tools/src/search.ts` | Tách retrieval khỏi threshold chung |
| `apps/worker/src/media-resolution.ts` | Hợp nhất kênh và decision reason |
| `apps/worker/src/realtime-runner.ts` | State invalidation, clarification, bỏ handoff sớm |
| `apps/worker/src/realtime-server.ts` | Parse flag/threshold/deadline |
| Module cutout client mới | Normalize/cutout/cancellation |
| Module Gemini mới | Prompt/schema/enum/timeout/cost |
| Redis cache adapter | Namespace/version/TTL |
| `packages/conversation-engine` | Media clarification optional state |
| Canonical history/telemetry | Field additive, không PII |

Không dự kiến migration nếu state dùng field optional và telemetry dùng payload
version hiện có. Nếu code buộc phải có migration, phải dừng, cập nhật kế hoạch,
backup và restore-test trước deploy.

## 15. Test tự động

Unit/integration bắt buộc:

- Qdrant dùng đúng `image_cutout`; raw/cutout không nhầm vector.
- Dedupe top 3 và competitive-second rule.
- Consensus/disagreement matrix.
- Cutout timeout → raw fallback; cả hai yếu → `NONE`.
- Gemini ngoài top 3 → schema error.
- Gemini timeout/429/schema → clarification.
- Ảnh mới suspend/xóa `currentProductId`.
- “mẫu 1/2/3”, exact code, phủ nhận, TTL và ba lượt.
- Cache tách pipeline/catalog/model/prompt version.
- Replay không gọi Gemini hoặc tạo Outbox mới.
- Cutout thật với fixture không PII.
- Embedding hai kênh + Qdrant test collection.
- Candidate download guard, Redis, Inbox → state → Outbox.
- Regression text code, ads, ProductFactsV2, checkout clarification, Media
  Selector, handoff, multi-image/video và worker restart.

## 16. Human test page

Tối thiểu:

1. Ảnh đúng sản phẩm và ảnh Meta nén.
2. Screenshot, crop toàn/nửa thân, cận vải/ren/voan.
3. Nền sáng gần màu sản phẩm và nền phức tạp.
4. Collage/nhiều sản phẩm/nhiều attachment, một ảnh lỗi.
5. `SD395`, `SD443`, `SD013` và các mã cùng kiểu.
6. Ảnh ngoài catalog.
7. Cutout lỗi/timeout/invalid response; raw lỗi nhưng cutout tốt.
8. Gemini timeout, `429`, schema lỗi.
9. Đang giữ `SD396` rồi gửi ảnh mới.
10. Trả “mẫu 1”, “SD395”, “không phải mẫu nào”.
11. Gửi ảnh mới giữa clarification; chờ TTL hết.
12. Replay cùng event.
13. Mã text/ads context xung đột với ảnh.

Báo cáo dùng expected/actual, decision, reason, latency và Outbox count; không lưu
ảnh khách. Fixture nội bộ quản lý theo checksum/version.

## 17. Gate mở page thật

- Hard-negative không auto-match sai.
- Gemini không thể chọn ngoài top 3.
- Out-of-catalog không bị ép gán mã.
- Ảnh mới không dùng product cũ.
- Cutout lỗi fallback raw đúng.
- Clarification đúng số/mã/phủ nhận/TTL.
- Không trộn giá/tồn/size giữa candidate.
- Timeout không làm mất Inbox hoặc handoff ngay.
- Replay không tạo thêm model call/Outbox.
- Không có app/n8n dual reply.
- Cache không xuyên catalog generation.
- p95 dưới 12 giây.
- Rollback từng flag đã thử.
- Precision đạt ngưỡng đăng ký trên tập có hard negative; thiếu mẫu ghi
  `INSUFFICIENT_EVIDENCE`, không tự mở page thật.
- Mở page thật cần kế hoạch canary và phê duyệt riêng.

## 18. Triển khai và rollback

Nguyên tắc:

1. GitHub là source of truth.
2. Branch từ `origin/main` mới nhất.
3. Không sửa source trực tiếp trên VPS.
4. Code → test → PR → merge → tag/release theo sequence hiện hành.
5. Release directory khóa đúng commit/tag; build immutable image + digest.
6. Chỉ recreate `realtime-worker`.
7. Không restart API, delivery, POS, Admin, P2.3 hoặc n8n.
8. Live 100% chỉ page `1198992073286645`; test trực tiếp Messenger.

Preflight mỗi đợt:

- Đọc README, AGENTS, production baseline, manifest mới nhất; fetch GitHub và
  xác nhận status sạch.
- VPS read-only: current symlink/release, realtime image/digest/health/restart,
  page ownership/allowlist, Inbox/Outbox duplicate/active, Qdrant vector/count,
  cutout/Redis health và n8n không sở hữu reply page test.

Thứ tự:

```text
Đợt 1 code/test/PR/deploy
→ cutout + clarification live page test
→ human test + hiệu chỉnh threshold
→ đạt gate Đợt 1
→ Đợt 2 code/test/PR/deploy
→ Gemini live page test
→ human test
→ đánh giá gate mở page thật
```

Chỉ cập nhật baseline/changelog/manifest sau deploy thật có evidence.

Rollback:

1. `REALTIME_MEDIA_AI_RERANK_MODE=OFF`.
2. Tắt clarification nếu state lỗi.
3. `REALTIME_MEDIA_CUTOUT_MODE=OFF` về raw.
4. `REALTIME_MEDIA_PIPELINE_ENABLED=false` nếu cần kill switch tổng.
5. Lỗi code: recreate riêng realtime bằng last-known-good image trong manifest
   ngay trước cutover và đổi symlink tương ứng.

Không xóa Inbox/Outbox, Redis, Qdrant, PostgreSQL/audit; không restart service
khác và không bật n8n làm owner thay thế.

## 19. Chi phí Gemini

Theo bảng giá Gemini Developer API tại ngày lập kế hoạch:

- `gemini-3.1-flash-lite` Standard:
  - Input text/image/video: `0.25 USD / 1M token`.
  - Output gồm thinking token: `1.50 USD / 1M token`.
- Ảnh lớn chia tile `768x768`, mỗi tile `258 token`.

Nguồn chính thức:

- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/gemini-api/docs/tokens>
- <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite>

Một ảnh khách + ba candidate, cạnh dài tối đa 768 px, prompt ngắn và output tối
đa 250 token:

- Image input khoảng `1,032 token`; tổng input dự kiến `1,300–2,000 token`.
- Input khoảng `0.000325–0.0005 USD`; output tối đa khoảng `0.000375 USD`.
- Tổng khoảng `0.0007–0.0009 USD/call`, tương đương `18–24 VND/call` theo tỷ giá
  kế hoạch `26,000 VND/USD`.

Với 1.000 ảnh/ngày và 20% cần Gemini: khoảng 200 call/ngày, tương đương
`3,600–4,800 VND/ngày` hoặc `108,000–144,000 VND/30 ngày`, chưa gồm embedding,
cutout, network, lưu trữ và thuế.

Đây là ước tính, không phải billing guarantee. Trước deploy phải kiểm tra lại giá
và token telemetry. Giới hạn chi phí: chỉ ambiguous, một call/event, tối đa bốn
ảnh, output 250 token, không Search/Maps, cache theo version, daily budget/alert
và không retry model quá một lần.

## 20. Definition of Done

Đợt 1:

- Realtime query thật `image_cutout`, giữ raw fallback.
- Cutout có threshold riêng.
- Ambiguous mở clarification, không handoff ngay.
- State xử lý số/mã/phủ nhận/TTL và không reuse product cũ.
- Cache/telemetry đủ, không PII.
- Test + human test + rollback đạt.

Đợt 2:

- Gemini chỉ nhận/chọn top 3 và chỉ gọi case khó.
- Timeout/429/schema đi clarification.
- p95 dưới 12 giây, cost telemetry/daily limit hoạt động.
- Replay không gọi model hoặc gửi trùng.
- Human test và rollback đạt.

Không coi là hoàn thành nếu chỉ sửa raw threshold, chỉ thêm Gemini nhưng không
query cutout, xóa raw fallback, chỉ test vài positive case, hoặc tự mở page thật.

## 21. Decision log

| ID | Quyết định |
|---|---|
| MR-D001 | Cutout primary; raw fallback/support |
| MR-D002 | Cutout có threshold riêng |
| MR-D003 | Ambiguous clarification trước handoff |
| MR-D004 | Ảnh mới vô hiệu hóa product context cũ |
| MR-D005 | Gemini chỉ rerank top 3 |
| MR-D006 | Gemini không cung cấp business facts |
| MR-D007 | Page test live 100% nhưng vẫn hard-gate |
| MR-D008 | App owner duy nhất; không bật lại n8n |
| MR-D009 | Deadline 12 giây; Gemini dùng phần còn lại |
| MR-D010 | Cache version hóa pipeline/catalog/model/prompt |
| MR-D011 | Không log URL/bytes/base64/payload/PII |
| MR-D012 | Chỉ recreate realtime-worker |
| MR-D013 | Không gán số release; theo sequence lúc deploy |
