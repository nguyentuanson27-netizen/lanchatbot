# WAVE 1 & WAVE 2 IMPLEMENTATION PLAN v1.2

## 1. Mục tiêu và phạm vi

Tài liệu này thay thế bản `WAVE1_WAVE2_IMPLEMENTATION_PLAN_v1.1` cho các hạng mục
triển khai mới. Mục tiêu:

- **Wave 1 — Conversion Recovery:** không đánh rơi khách đã có nhu cầu mua do lỗi
  semantic, state, policy, handoff, ownership hoặc outbound.
- **Wave 2 — Sales Strategy & Conversion Optimization:** tối ưu tư vấn,
  recommendation, objection handling, CTA, offer, follow-up và AOV sau khi Wave 1
  đạt gate.

Đây là kế hoạch triển khai theo delta, không phải kế hoạch xây lại hệ thống.
Trước mỗi batch, coding agent phải:

1. Đọc `AGENTS.md`, `README.md`, production baseline, realtime upgrade plan và
   release manifest mới nhất.
2. Kiểm tra GitHub `main`, trạng thái VPS và implementation hiện có.
3. Phân loại capability thành `DONE`, `PARTIAL`, `MISSING` hoặc `DEFERRED`.
4. Tái sử dụng state, worker, database, Dataset Review, policy, outbox, ownership
   và shadow pipeline hiện hành.
5. Không tạo runtime, state machine, auth, database hoặc evaluation pipeline song
   song nếu module hiện có có thể mở rộng.

Mọi thay đổi source đi theo quy trình:

```text
GitHub branch/PR
→ test/review
→ merge main
→ tag/manifest
→ VPS fetch bằng deploy key read-only
→ release directory mới
→ smoke/shadow/canary
→ cutover có rollback
```

Không sửa trực tiếp `/opt/lana-chatbot/current` hoặc `releases/*`.

---

## 2. Trạng thái xuất phát

Tại thời điểm lập v1.2:

- GitHub `main`: commit `63d8e60`, tag
  `20260728-dataset-gold-v2-r18.9.6`.
- Release production mới nhất có manifest trong repo:
  `20260727-admin-web-assets-r18.8.1`.
- Dataset Review, Wave 1 schema, redaction, evidence validation, duplicate
  grouping, split, AI pre-label, Admin review và gold-v2 adapter đã tồn tại.
- Buying-signal guard, `NO_REPLY` override, Sales Cycle, verified facts,
  business guard, ownership/fence, Inbox/Outbox, decision telemetry và shadow
  evaluation đã tồn tại ở các mức độ khác nhau.

Vì vậy:

- Task có capability hiện hữu phải bắt đầu bằng audit và benchmark.
- Không đánh dấu hoàn thành chỉ vì code tồn tại; cần test evidence và runtime
  evidence tương ứng.
- Không viết lại natural checkout, Sales Cycle hoặc ownership mechanism đang ổn
  định.

---

## 3. Nguyên tắc kiến trúc

### 3.1 Ranh giới quyền hạn

```text
AI/model
→ hiểu ngôn ngữ
→ semantic label
→ evidence
→ confidence
→ đề xuất strategy và cách diễn đạt

Deterministic code/policy
→ xác minh product/variant
→ giá, tồn, ETA, promotion và size chart
→ stage transition
→ PII, checkout, preview và order intent
→ ownership, handoff và terminal state
→ duplicate prevention
→ outbound authorization
```

Model không được tự tạo business fact hoặc tự cấp quyền side effect.

### 3.2 Hai nguồn bằng chứng độc lập

#### Historical benchmark

Dùng để đánh giá:

- Semantic understanding.
- Buying signal, negation và retraction.
- Continuation và product context.
- Size, số đo và variant selection.
- Tracking, exchange, return và complaint language.
- Pre-sale/post-sale language.
- Reply quality khi có đủ context kiểm thử.

Không dùng historical transcript để kết luận trực tiếp:

- Handoff production thật.
- Stage/reason code production thật.
- Tool failure production.
- Order hoặc conversion ngoài transcript.
- Fact hallucination nếu không có verified business envelope tương ứng.

#### Live telemetry

Dùng để đánh giá:

- Stage transition.
- `NO_REPLY`.
- Handoff và ownership.
- Tool/fact resolution.
- Preview/order funnel.
- Duplicate outbound/order.
- Conversion, AOV và downstream outcome.

Historical benchmark và live telemetry phải được báo cáo riêng. Không trộn hai
nguồn thành một tỷ lệ duy nhất.

### 3.3 Quy tắc rollout

Mỗi hành vi mới cần:

- Feature flag mặc định an toàn.
- Structured event và version.
- Test table/golden/replay phù hợp.
- Shadow trước outbound khi khả thi.
- Sticky assignment nếu có nhiều variant.
- Rollback tương thích state cũ.
- Không PII/secret trong log, metric, fixture hoặc artifact commit vào Git.

Judge chỉ đánh giá; judge không được điều khiển outbound hoặc publish.

---

## 4. Dataset benchmark được khóa

### 4.1 Nguồn dữ liệu

Ba artifact ngoài Git tạo thành một bộ binding:

| Artifact | SHA-256 |
|---|---|
| `gold_v2_history_0001_2000_audited_derived_merged.json` | `97f0812554e2eab1bfc9551bc8968c9f480f584a67f8acae7ddaa635aa349a49` |
| `history_export_2000_curated.json` | `e9eed98b7bd50e9bb0cfe50e236044d7bcf1de309a3c3adf9258afa312472851` |
| `gold_v2_history_0001_2000_transcript_manifest.json` | `83c8d187c6e71e93d9d06b14ca0328d6d63423dc905b7daa34b3a6102bebd91d` |

Manifest:

- Schema `gold-v2-transcript-manifest-v1`.
- Có 2.000 binding duy nhất.
- Gold và history có cùng key set và cùng thứ tự.
- Toàn bộ entry checksum và binding checksum đã được xác minh, mismatch bằng 0.
- Loader resolve bằng checksum và key; filename chỉ mang tính mô tả.

Không commit raw transcript, gold payload hoặc evidence chứa PII vào repository.
Repository chỉ được chứa schema, checksum, loader, fixture tổng hợp và tài liệu.

### 4.2 Universe đánh giá

Parser hiện hành:

```text
Tổng binding:       2.000
Đưa vào benchmark:  1.955
Loại bỏ:               45
```

Quyết định:

- Benchmark chính thức có 1.955 hội thoại.
- 45 hội thoại parser không chấp nhận bị loại khỏi mọi split, metric, confusion
  matrix và đánh giá.
- Không tạo báo cáo lỗi hoặc dự án review riêng cho 45 hội thoại.
- Metadata benchmark chỉ cần ghi `included_count=1955` và
  `excluded_count=45`.

### 4.3 Ground truth và provenance

- Gold hiện tại là dữ liệu đã audited; không chạy AI pre-label lại.
- Message labels có `turnIndex`, role, evidence và source version.
- Conversation labels derived phải có `derivation_version`; không giả lập
  evidence span.
- Evidence exact-match được kiểm tra trên reviewer projection đã canonicalize,
  không phải raw source.
- Confidence không có trong gold phải là `NOT_RECORDED` hoặc `null`; không tự
  gán `HIGH`.
- Annotation source là `ADJUDICATED`, source version `gold-v2`.

### 4.4 Canonicalization contract

Contract tối thiểu:

- CRLF/CR chuyển thành LF.
- Giữ nguyên Unicode, emoji và teencode; không sửa chính tả.
- Dùng redacted reviewer projection để định vị evidence.
- Placeholder PII dạng đơn hoặc compound phải được nhận diện.
- `startTruncated` dùng mapping turn đã version hóa.
- Conversation label derived không bắt buộc evidence exact-match.
- Mọi normalization/redaction/parser version phải nằm trong run manifest.

### 4.5 Split

Target ban đầu:

```text
Development:    khoảng 1.173
Validation:     khoảng   391
Locked holdout: khoảng   391
Tổng:                   1.955
```

Quy tắc:

- Split deterministic bằng seed đã khóa.
- Cùng duplicate group không được đi qua nhiều split.
- Nhóm gần trùng, cùng template hoặc cùng customer sequence fingerprint phải ở
  cùng split.
- Cho phép sai lệch nhẹ so với target để giữ group nguyên vẹn.
- Rare/safety slice là lát cắt phủ lên split, không phải split thứ tư.
- Holdout không được dùng để sửa prompt, matcher, lexicon, rule, scorer hoặc
  rubric.
- Run trên holdout chỉ qua evaluator được khóa; lưu run ID, checksum, commit,
  model, prompt và schema version.

Representative control set chưa phải điều kiện để bắt đầu offline development,
nhưng là điều kiện trước controlled live promotion.

### 4.6 Sample support

Một label chỉ được dùng làm statistical promotion gate khi:

- Positive support trên tập đánh giá độc lập tối thiểu 50.
- Negative support và denominator được công bố.
- Không có split leakage.
- Báo point estimate cùng confidence interval.

Nếu không đủ mẫu, trạng thái là `INSUFFICIENT_SUPPORT`.

Synthetic fixture, recorded envelope và integration replay được dùng cho
hard-safety conformance, nhưng không trộn vào precision/recall đại diện traffic
thật.

Các nhãn hiếm đã biết như `RETURN_REQUEST`, `CHOICE_OVERLOAD`,
`POST_EXCHANGE_CONFIRMATION`, `SIZE_RECOMMENDATION_CONFLICT` và
`MATERIAL_OBJECTION` không được promotion theo point estimate nếu chưa đủ support.

---

## 5. Kiến trúc benchmark ba lớp

Ba lớp có dataset adapter, scorer, metric và report riêng. Không gom semantic,
policy, reply quality, latency và cost vào một điểm tổng hợp.

### 5.1 Lớp A — Semantic benchmark

#### Mục tiêu

Chấm model/matcher có hiểu đúng nội dung hay không.

#### Đầu vào

- Message hoặc conversation projection đã redacted.
- Lịch sử/context theo contract của candidate.
- Không cấp runtime action kỳ vọng cho model.

#### Đầu ra

- Label.
- Scope.
- Evidence span.
- Confidence hoặc `NOT_RECORDED`.
- Model/prompt/schema version.

#### Nhóm nhãn chính

```text
BUYING_CANDIDATE
BUYING_COMMITTED
BUYING_NEGATED
BUYING_RETRACTED
CONTINUATION
SIZE_QUESTION
MEASUREMENTS_PROVIDED
VARIANT_SELECTION
PRE_SALE_RETURN_POLICY_QUESTION
ORDER_TRACKING_QUESTION
EXCHANGE_REQUEST
RETURN_REQUEST
PRODUCT_COMPLAINT
DELIVERY_DELAY_COMPLAINT
MULTI_PRODUCT_COMPARISON
```

Giữ các label hiện hành khác của Wave 1, bao gồm
`NO_EXPLICIT_CHECKOUT_OBSERVED`, `PRODUCT_CONTEXT_LOST`,
`REPEATED_SHOP_MESSAGE`, `REPEATED_SHOP_QUESTION`,
`IRRELEVANT_SHOP_REPLY`, `PREMATURE_PII_REQUEST`, `FOLLOW_UP_SPAM`,
`SIZE_RECOMMENDATION_CONFLICT` và `POSSIBLE_HANDOFF_LANGUAGE`.

Không thêm label tổng hợp mơ hồ `POST_SALE_REQUEST`. Post-sale được biểu diễn bằng
các label chi tiết và runtime policy derive có version.

#### Metrics

- Per-label precision, recall và F1.
- Macro-F1 và micro-F1.
- Confusion matrix.
- Evidence validity.
- Confidence calibration khi confidence có dữ liệu.
- Sample support và confidence interval.
- Error taxonomy riêng cho semantic.

Latency và cost được báo cáo bên cạnh, không đưa vào semantic accuracy score.

### 5.2 Lớp B — Runtime policy benchmark

#### Mục tiêu

Chấm state machine, policy, guard và side-effect authorization.

#### Hai chế độ bắt buộc

##### Oracle semantics → runtime

Dùng gold semantic input để cô lập lỗi của state machine/policy.

##### Model semantics → runtime

Dùng output semantic thật để đo end-to-end và lỗi cộng dồn.

Kết quả hai chế độ phải hiển thị cạnh nhau.

#### Runtime test contract

Mỗi case có:

- State trước.
- Gold/model semantic events theo thứ tự thời gian.
- Product/variant resolution.
- Verified business envelope hoặc trạng thái không có envelope.
- Ownership, page allowlist và terminal state.
- Expected transition.
- Allowed/forbidden action.
- Allowed side effects.
- Expected reason code.

#### Policy tối thiểu

| Tín hiệu | Kỳ vọng |
|---|---|
| `BUYING_COMMITTED` | Không `NO_REPLY`; không handoff nếu chưa có approved handoff reason |
| `BUYING_COMMITTED` + product/variant và prerequisite hợp lệ | Có thể vào `READY_TO_BUY` hoặc checkout flow hiện có |
| `BUYING_COMMITTED` nhưng thiếu prerequisite | Clarify đúng missing field; không đoán và không xin lại dữ liệu đã có |
| `BUYING_NEGATED` là tín hiệu mới nhất | Không xin PII; không tạo order intent; không xác nhận mua |
| `BUYING_RETRACTED` | Thu hồi commitment stale và chặn checkout/order mới |
| Tracking/exchange/return/complaint | Không mở checkout mới |
| `PRE_SALE_RETURN_POLICY_QUESTION` | Không vào terminal `POST_SALE`; trả lời policy pre-sale hiện có |
| Low confidence/mixed signal | Giữ state an toàn hoặc clarify trong retry budget |

Negation/retraction được chấm theo chronology. Một nhãn cũ không được phủ quyết
buying signal mới hơn và ngược lại.

“Handoff không cần thiết” phải được định nghĩa bằng allowlist reason code.
Handoff có approved safety/operational reason không bị coi là regression.

#### Metrics

- Transition correctness.
- Action correctness.
- Incorrect handoff rate.
- Missed required handoff rate.
- False-positive post-sale rate.
- Pre-sale incorrectly routed to post-sale rate.
- Clarification success/repeat/budget exhaustion.
- Unauthorized side effects.
- Duplicate order/outbound.
- Ownership violation.
- Error taxonomy riêng cho runtime.

### 5.3 Lớp C — Reply-quality benchmark

#### Mục tiêu

Chấm renderer/response strategy sau khi semantic, state và verified facts đã được
cố định.

#### Test contract

Mỗi case cố định:

- Semantic result.
- Runtime state và allowed action.
- Verified business envelope.
- Approved policy/playbook.
- Expected communication goal.

#### Tiêu chí

- Trả lời đúng câu hỏi.
- Không lặp vô ích.
- CTA phù hợp stage.
- Không xin thông tin quá sớm hoặc hỏi lại dữ liệu đã có.
- Không nói fact ngoài verified envelope.
- Giải quyết objection phù hợp.
- Không vượt allowed action.

#### Cách chấm

Deterministic checks:

- Fact provenance.
- PII request timing.
- Repetition.
- Forbidden CTA/action.
- Missing/unauthorized media.

Rubric/human hoặc calibrated judge:

- Đúng trọng tâm.
- Hữu ích.
- Objection resolution.
- Tự nhiên và phù hợp giọng thương hiệu.

Hard safety không được phụ thuộc riêng vào judge score. Judge disagreement phải
được sample review và version hóa rubric.

#### Verified fact fixtures

Fact hallucination chỉ chấm khi có một trong:

- Recorded business envelope đã redacted.
- Synthetic fixture có source rõ ràng.
- Integration replay với POS/catalog/policy snapshot cố định.

Không có envelope thì hành vi đúng là abstain, clarify hoặc dùng safe response;
không được tự tạo giá, tồn, ETA, size, phí ship, freeship hay promotion.

---

## 6. WAVE 1 — CONVERSION RECOVERY

### 6.1 Mục tiêu

Ngăn khách có nhu cầu mua bị đánh rơi do:

- Semantic miss hoặc negation false positive.
- Mất continuation/product context.
- Buying signal thành `NO_REPLY`.
- Stage transition sai.
- Pre-sale thành post-sale terminal.
- Clarification lặp.
- Handoff không cần thiết.
- Ownership hoặc duplicate outbound/order.

Wave 1 không mở recommendation, cross-sell, offer hoặc follow-up optimization mới.

### 6.2 Lô 0 — Discovery và benchmark foundation

#### Task 1.0 — Capability/delta audit

Lập bảng `DONE/PARTIAL/MISSING/DEFERRED` cho:

- Dataset Review và gold import.
- Semantic schema/matcher/model.
- Stage/Sales Cycle.
- `NO_REPLY` guard.
- Post-sale gate.
- Clarification.
- Verified facts/business guard.
- Ownership, handoff và duplicate prevention.
- Shadow, replay, telemetry và dashboard.

Không code trước khi có delta map và file/migration dự kiến.

#### Task 1.1 — Locked benchmark manifest

- Validate ba checksum ở mục 4.
- Import read-only vào benchmark environment riêng.
- Không xóa hoặc thay dataset production.
- Loại 45 record parser-failed.
- Persist run manifest, không persist raw content vào log.
- Thêm support cho confidence `NOT_RECORDED`.
- Giữ audited/derived provenance đúng loại.

#### Task 1.2 — Deterministic split và leakage guard

- Tạo split 60/20/20 theo duplicate group.
- Khóa seed và split checksum.
- Thêm rare/safety overlays.
- CI fail nếu một duplicate group xuất hiện ở nhiều split.
- Holdout evaluator không trả raw case cho tuning workflow.

#### Task 1.3 — Ba benchmark runner

Tạo/reuse ba runner:

1. Semantic.
2. Runtime policy, gồm oracle và model mode.
3. Reply quality.

Mỗi runner xuất report schema độc lập và một run manifest chung.

#### Task 1.4 — Baseline

Chạy trên development/validation:

```text
Current deterministic matcher
Current production agent/schema
Candidate agent/schema
```

Kết quả phải tách theo ba benchmark layer. Không dùng locked holdout để sửa
candidate.

### 6.3 Lô 1 — Live telemetry và attribution

#### Task 1.5 — Stage transition tests

Table tests bao phủ:

- Current state.
- Ordered semantic events.
- Buying commitment/negation/retraction.
- Pre-sale/post-sale.
- Missing prerequisite.
- Expected transition/reject reason.
- Mixed-signal chronology.

#### Task 1.6 — Funnel/decision events

Chuẩn hóa hoặc audit các event:

```text
PRODUCT_MATCHED
BUYING_SIGNAL_CANDIDATE
BUYING_SIGNAL_COMMITTED
BUYING_SIGNAL_NEGATED
BUYING_SIGNAL_RETRACTED
CLARIFICATION_REQUESTED
READY_TO_BUY
ORDER_PREVIEW_CREATED
PURCHASE_CONFIRMED
ORDER_CREATED
STAGE_TRANSITION_REJECTED
HANDOFF_REQUESTED
NO_REPLY_SELECTED
```

Event có cycle/conversation hash, state trước/sau, reason, product ID đã verify,
decision source/version và không PII.

#### Task 1.7 — Sticky assignment

Chỉ cần khi rollout theo phần trăm hoặc nhiều variant. Assignment sticky theo
sales cycle và được ghi vào experiment attribution.

#### Task 1.8 — Shadow decision diff

Ghi:

- Production decision.
- Candidate semantic decision.
- Candidate runtime decision.
- Evidence/confidence.
- Difference reason.
- Không candidate side effect.

#### Task 1.9 — Runtime/CI guards

- Feature flag mặc định an toàn.
- Missing dependency/config fail rõ.
- Migration additive/backward-compatible.
- Runtime cũ đọc được state mới hoặc bỏ qua field mới an toàn.
- Replay cùng event không tạo side effect thứ hai.

### 6.4 Lô 2 — Direct recovery

Chỉ sửa phần delta còn thiếu sau baseline.

#### Task 1.10 — Matcher safety

- Rule chỉ đến từ reviewed development failures.
- Có hard-positive và hard-negative.
- Không dùng lời shop suy ra intent khách.
- Không dùng holdout để sửa matcher.
- Matcher là safety/fallback, không thành intent engine thứ hai.

#### Task 1.11 — Reason code → behavior

Mỗi reason code map rõ sang:

```text
retry | clarification | safe response | handoff | no outbound
```

Reason kỹ thuật không được tự động thành `NO_REPLY` nếu còn safe recovery.

#### Task 1.12 — Clarification state

- Lưu reason, missing field và product context.
- Có retry budget.
- Không hỏi lặp cùng một câu.
- Trả lời bổ sung phải tiếp tục đúng flow.
- Định nghĩa `clarification case` dùng cho canary slice.

#### Task 1.13 — Post-sale gate

- Pre-sale return-policy question không thành post-sale.
- Tracking, exchange, return và complaint không mở checkout mới.
- Low confidence giữ pre-sale state an toàn hoặc clarify.
- Post-sale terminal/routing phải có semantic evidence và approved rule.

#### Task 1.14 — Commitment lifecycle và fast close

Phân biệt:

```text
BUYING_CANDIDATE
BUYING_COMMITTED
BUYING_NEGATED
BUYING_RETRACTED
```

- Commitment gắn với product/variant đã verify.
- `READY_TO_BUY` chỉ khi đủ prerequisite.
- Thiếu prerequisite thì hỏi đúng missing field.
- Product switch hoặc retraction phải thu hồi commitment stale.
- Không recommendation không cần thiết sau commitment.
- Tái sử dụng checkout flow hiện có.

#### Task 1.15 — Ownership/fence

Trước outbound:

- Re-check human ownership.
- Re-check page allowlist.
- Re-check terminal state.
- Re-check message/event dedupe.
- Re-check cycle/cart/state revision.
- Re-check outbound authorization.

#### Task 1.16 — Rollback compatibility

Khi tắt flag:

- Runtime cũ không crash.
- Không mất ownership.
- Không gửi lại outbound.
- Không tạo duplicate order/confirmation.
- Không xóa state/audit additive đã ghi.

### 6.5 Lô 3 — Conditional

Chỉ mở theo confusion matrix và live telemetry:

| Lỗi còn lại | Task |
|---|---|
| Semantic miss cao | Semantic model candidate |
| Negation/veto sai | Negation safety |
| Continuation/multi-intent sai | Expanded semantic analysis |
| Commitment stale/switch/retract sai | Commitment lifecycle extension |
| Objection rồi vẫn mua bị reject | Objection re-entry |
| Product/variant switch sai | Verified alternatives |
| Unicode/teencode làm matcher lỗi | Minimal normalization |

Không triển khai toàn bộ conditional backlog mặc định.

### 6.6 Wave 1 promotion gates

#### Hard safety — bắt buộc bằng 0

- Unauthorized side effect.
- `BUYING_COMMITTED` hợp lệ thành `NO_REPLY`.
- Fact hallucination ngoài verified envelope.
- Duplicate order intent, confirmation hoặc outbound.
- Ownership/page-allowlist violation.
- Cross-product/variant fact leakage.

Bất kỳ hard-safety violation nào trong canary phải rollback hoặc disable candidate
ngay.

#### Semantic gate

Semantic promotion set tối thiểu gồm: BUYING_COMMITTED, BUYING_NEGATED,
BUYING_RETRACTED, PRE_SALE_RETURN_POLICY_QUESTION, RETURN_REQUEST,
SIZE_RECOMMENDATION_CONFLICT, PREMATURE_PII_REQUEST và
POSSIBLE_HANDOFF_LANGUAGE. Nhãn trong set nhưng thiếu support vẫn phải qua hard
conformance; không dùng statistical point estimate để promotion.

- Safety-critical label: precision ≥95%, recall ≥95%.
- `BUYING_NEGATED`: precision ≥98%, recall ≥95%.
- Positive support tối thiểu 50/label trên evaluation set độc lập.
- Overall macro-F1 không giảm.
- Targeted-label F1 tăng ít nhất 3 điểm phần trăm.
- Không safety-critical label nào giảm quá 1 điểm phần trăm.
- Không hard-safety regression.
- Label thiếu support mang trạng thái `INSUFFICIENT_SUPPORT`, không được dùng làm
  statistical promotion gate.

#### Runtime/reply gate

- Oracle-semantics runtime cases đạt 100% hard-safety policy.
- Clarification không vượt retry budget và không hỏi lặp.
- Pre-sale false-positive post-sale đạt ngưỡng đã pre-register.
- Incorrect handoff rate không regression quá ngưỡng đã pre-register.
- Reply hard-safety deterministic checks đạt 100%.
- Fact-sensitive reply chỉ dùng verified fixture/envelope.

Không gate trên tổng handoff rate hoặc tổng post-sale volume. Hai metric này chỉ
để quan sát traffic mix.

#### Canary gate

Canary kéo dài ít nhất:

```text
7 ngày
VÀ
500 hội thoại đủ điều kiện
```

Đồng thời đạt minimum slice:

```text
≥100 buying-signal cases
≥ 50 negation cases
≥ 50 post-sale cases
≥ 50 clarification cases
```

Nếu chưa đủ một slice, trạng thái là `INSUFFICIENT_EVIDENCE` và kéo dài canary;
không suy rộng từ tổng volume.

#### Wave 1 hoàn thành khi

1. Tất cả hard-safety gate bằng 0.
2. Ba benchmark layer đạt gate tương ứng.
3. Locked holdout không bị dùng để tuning và không split leakage.
4. Representative control set đã có trước controlled promotion.
5. Funnel đo được đến `ORDER_CREATED`.
6. Canary đủ thời gian, tổng mẫu và minimum slices.
7. Incorrect handoff và false-positive post-sale không regression.
8. Rollback đã smoke thành công.

Không cần hoàn thành toàn bộ Lô 3 nếu các gate đã đạt.

---

## 7. WAVE 2 — SALES STRATEGY & CONVERSION OPTIMIZATION

### 7.1 Điều kiện bắt đầu

Được chuẩn bị offline/shadow trong khi Wave 1 chạy, nhưng không thay đổi Wave 2
outbound trước khi Wave 1 direct recovery và hard-safety gate đạt.

Wave 2 không sửa lại:

- Basic stage leak.
- `NO_REPLY` buying-signal recovery.
- Basic post-sale classification.
- Basic ownership/handoff safety.

Nếu các lỗi này xuất hiện, quay lại Wave 1 thay vì che bằng strategy.

### 7.2 Lô 0 — Measurement và shadow

#### Task 2.0 — Live business baseline

Đo theo stage, segment và eligible denominator:

- `product_matched → buying_signal_committed`.
- `buying_signal_committed → purchase_confirmed`.
- `purchase_confirmed → order_created`.
- AOV.
- Return/exchange/complaint.
- Discount cost/order.
- Incorrect/required handoff.
- Response latency.
- Số sản phẩm được giới thiệu.
- Số câu hỏi trước commitment.

Không dùng curated challenge dataset để tính business baseline.

#### Task 2.1 — Opportunity analysis shadow

Output:

```text
need
barrier
decision_factor
recommended_strategy
confidence
evidence
```

Chỉ ghi shadow; không điều khiển reply, offer hoặc side effect.

#### Task 2.2 — Wave 2 annotation project

Tái sử dụng Dataset Review và provenance contract.

Nhãn tối thiểu:

```text
NEED_OCCASION
NEED_STYLE
NEED_BUDGET

BARRIER_PRICE
BARRIER_FIT
BARRIER_MATERIAL
BARRIER_TRUST
BARRIER_DELIVERY
CHOICE_OVERLOAD

STRATEGY_RECOMMEND_PRODUCT
STRATEGY_SHOW_PROOF
STRATEGY_ANSWER_OBJECTION
STRATEGY_ASK_CLARIFY
STRATEGY_CLOSE

BARRIER_RESOLVED
BARRIER_NOT_RESOLVED
READY_TO_CLOSE
NOT_ENOUGH_CONTEXT
```

`BARRIER_RESOLVED` cần evidence trước và sau.

#### Task 2.3 — Experiment attribution

- Pre-register hypothesis, primary metric, guardrails, eligible population,
  minimum detectable effect và stopping rule.
- Một experiment chỉ đổi một strategy group chính.
- Sticky theo sales cycle.
- Lưu control/variant và version.
- Không đổi nhiều policy cùng lúc.
- Có kill switch và rollback.

#### Task 2.4 — Dashboard

Nối:

```text
strategy
→ customer response
→ commitment
→ order
→ AOV
→ return/exchange/complaint
```

Dashboard tách:

- Tổng handoff rate và incorrect handoff rate.
- Tổng post-sale volume và false-positive post-sale rate.
- Traffic-mix metric và quality metric.

### 7.3 Lô 1 — Giá trị cao, không cần discount

#### Task 2.5 — Stage Playbook Engine

Mỗi stage có:

- Goal.
- Allowed/forbidden actions.
- Maximum questions.
- CTA policy.
- Exit condition.

Agent đề xuất strategy; code kiểm tra policy.

#### Task 2.6 — Proactive Size UX

- Chỉ dùng approved/verified size chart.
- Giữ provenance.
- Tư vấn theo product cụ thể.
- Clarify khi thiếu measurement.
- Không đoán size.
- Không làm tăng return/exchange rate.

#### Task 2.7 — Verified Recommendation

Candidate có thể đến từ AI/Qdrant nhưng outbound phải xác minh:

- Product active.
- Variant hợp lệ.
- Giá/tồn/ETA đúng source.
- Phù hợp need/decision factor.
- Không lặp sản phẩm đã từ chối.
- Không tạo choice overload.

#### Task 2.8 — Trust/Proof Media

Proof phải đúng barrier, product/component, đã duyệt và có provenance:

- Chất liệu.
- Form.
- Cận vải.
- Size guide.
- Feedback.
- Chính sách.

#### Task 2.9 — Choice-overload reducer

- Shortlist có giới hạn.
- So sánh theo decision factor.
- Không gửi hàng loạt sản phẩm.
- Chỉ hỏi một câu phân loại có giá trị khi cần.

### 7.4 Lô 2 — Thuyết phục và AOV

#### Task 2.10 — Objection playbooks

Bao phủ:

```text
PRICE
FIT
STYLE
MATERIAL
TRUST
DELIVERY
CHOICE_OVERLOAD
```

Mỗi playbook có evidence, response goal, verified proof, CTA và stop condition.

#### Task 2.11 — CTA policy

CTA phụ thuộc stage, commitment, barrier, missing information và customer
preference. Không dùng một CTA chung cho mọi trường hợp.

#### Task 2.12 — Curated cross-sell

- Dựa trên quan hệ sản phẩm đã duyệt.
- Xác minh POS trước outbound.
- Chỉ chạy sau khi sản phẩm chính đủ chắc chắn.
- Không làm giảm conversion sản phẩm chính.

#### Task 2.13 — Offer policy

- Code sở hữu adjustment thật.
- Agent chỉ chọn strategy/cách diễn đạt.
- Không tạo discount giả hoặc vượt policy.
- Ghi discount cost/order.

#### Task 2.14 — Verified alternatives

Khi sản phẩm hết/không phù hợp:

- Giữ need và decision factor.
- Chọn alternative đã xác minh.
- Không khởi động lại toàn bộ flow.
- Không vượt budget hoặc sai occasion.

### 7.5 Lô 3 — Chỉ mở khi đủ dữ liệu

| Task | Điều kiện |
|---|---|
| Checkout UX | Checkout drop-off đủ lớn và attribution rõ |
| Follow-up | Có consent, dedupe và volume |
| Cart recovery | Preview/order drop-off vượt ngưỡng |
| Scarcity | Tồn realtime đủ tin cậy |
| Learning-to-rank/bandit | Traffic, attribution và guardrail đủ mạnh |

Không dùng urgency hoặc scarcity giả.

### 7.6 Wave 2 experiment gates

Mỗi experiment phải có:

- Primary business metric pre-register.
- Guardrails hard safety, incorrect handoff, false-positive post-sale,
  return/exchange/complaint, latency và cost.
- Power/sample calculation hoặc trạng thái `INSUFFICIENT_EVIDENCE`.
- Tối thiểu 200 eligible sales cycle mỗi nhánh nếu power calculation không yêu
  cầu số lớn hơn.
- Không publish chỉ vì mean tăng nếu guardrail xấu hoặc attribution không rõ.

Wave 2 hoàn thành khi:

1. Ít nhất một strategy tăng `order_created / product_matched` với evidence đạt
   stopping rule đã đăng ký.
2. Recommendation factuality và hard safety đạt 100%.
3. Size UX không làm xấu return/exchange.
4. Objection và CTA experiment có attribution rõ.
5. Cross-sell chỉ giữ khi AOV tăng mà conversion sản phẩm chính không regression
   quá guardrail.
6. Offer/follow-up có policy, consent khi cần, dedupe và rollback.
7. Dashboard nối strategy với outcome và downstream quality.
8. Không có Wave 1 hard-safety regression.

---

## 8. Trình tự triển khai

```text
Batch 0
→ Repo/VPS discovery
→ Capability status map
→ Delta plan

Batch 1
→ Locked manifest 1.955
→ Read-only benchmark environment
→ Deterministic split/leakage guard

Batch 2
→ Semantic runner
→ Runtime oracle/model runner
→ Reply-quality runner
→ Current baseline

Batch 3
→ Wave 1 telemetry, attribution và table tests

Batch 4
→ Wave 1 direct-recovery delta

Batch 5
→ Holdout evaluation
→ Representative control
→ Shadow/canary
→ Conditional-task decision

Batch 6
→ Wave 2 annotation, measurement và opportunity shadow

Batch 7+
→ Từng Wave 2 experiment độc lập
```

Sau mỗi batch phải cung cấp:

- Capability/delta status.
- File và migration thay đổi.
- Feature flags.
- Tests và kết quả.
- Benchmark run ID/checksum.
- Observability.
- Rollback.
- Phần chưa làm.
- Evidence để mở batch tiếp theo.

Không tự triển khai Wave 2 outbound trước khi Wave 1 đạt gate.

---

## 9. Run manifest và khả năng tái lập

Mỗi benchmark/replay/shadow run lưu:

- Git commit và release ID.
- Dataset, transcript, binding manifest và split checksum.
- Included count 1.955.
- Parser, normalization, redaction và schema version.
- Model, prompt, tool/policy và judge version.
- Runtime flag bundle.
- Random seed/temperature khi áp dụng.
- Retry/timeout policy.
- Business envelope/snapshot version.
- Start/end time.
- Metric schema version.

Không lưu raw transcript, raw model body, secret hoặc PII trong run manifest.

---

## 10. Decision log v1.2

| ID | Quyết định |
|---|---|
| W12-D001 | Benchmark ghép gold/history bằng manifest checksum và key |
| W12-D002 | Universe chính thức là 1.955; loại 45 parser-failed khỏi mọi đánh giá |
| W12-D003 | Không thay dataset production; benchmark dùng môi trường read-only/isolated |
| W12-D004 | Tách semantic, runtime policy và reply quality thành ba benchmark |
| W12-D005 | Runtime benchmark có oracle-semantics và model-semantics mode |
| W12-D006 | Không thêm label tổng hợp `POST_SALE_REQUEST`; dùng taxonomy chi tiết |
| W12-D007 | Confidence thiếu dữ liệu là `NOT_RECORDED`, không tự gán `HIGH` |
| W12-D008 | Hard safety bằng 0 và không được owner override |
| W12-D009 | Statistical gate cần positive support tối thiểu 50; thiếu mẫu là `INSUFFICIENT_SUPPORT` |
| W12-D010 | Synthetic/recorded fixtures dùng cho conformance, không trộn vào traffic precision/recall |
| W12-D011 | Canary tối thiểu 7 ngày và 500 eligible conversations, đồng thời đủ từng slice |
| W12-D012 | Gate handoff/post-sale dùng incorrect/false-positive rate, không dùng raw volume |
| W12-D013 | Judge chỉ đánh giá, không điều khiển outbound hoặc publish |

Mọi thay đổi source-of-truth, retention, ownership, side-effect authorization hoặc
hard-safety gate phải thêm decision trước khi code.

---

## 11. Definition of Done

- Manifest, split và mọi run tái lập được bằng checksum/version.
- 45 record bị loại không xuất hiện trong bất kỳ denominator nào.
- Ba benchmark có input/output/scorer/metric độc lập.
- `BUYING_COMMITTED → NO_REPLY` bằng 0.
- Unauthorized side effect, fact hallucination, duplicate order/outbound và
  ownership violation bằng 0.
- Facts nhạy cảm truy về verified source.
- Semantic gate đạt trên label đủ support; label thiếu support được ghi đúng
  `INSUFFICIENT_SUPPORT`.
- Locked holdout không bị dùng để tuning.
- Representative control set có trước controlled promotion.
- Canary đủ thời gian, tổng mẫu và minimum slices.
- Incorrect handoff và false-positive post-sale không regression.
- Wave 2 experiment có attribution, guardrail và stopping rule.
- Rollback đã được kiểm tra và không xóa Inbox, Outbox, Redis, PostgreSQL,
  Qdrant hoặc audit.
- Production baseline/changelog/manifest chỉ cập nhật sau deploy thật có evidence.
