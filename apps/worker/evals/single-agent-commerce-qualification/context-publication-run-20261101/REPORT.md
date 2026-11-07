# Context publication — full model development run, 01/11/2026

**Chạy đủ 21 ca / 28 lượt; chưa đạt Phase C.** Đây là batch development N=1, không phải qualification holdout hoặc đối chứng C3. Giữ đầy đủ denominator, không retry, không chạy lại ca lỗi để thay kết quả.

[Toàn bộ hội thoại](CONVERSATIONS.md) · [accounting](ACCOUNTING.json) · [grade đã khóa](INDEPENDENT_GRADES.json) · [tổng hợp grade](JUDGE_SUMMARY.json) · [mapping sau khóa](UNMASKED_GRADES.json) · [verification implementation](IMPLEMENTATION_VERIFICATION.json) · [offline continuation](OFFLINE_CONTINUATION.json) · [policy replay](OFFLINE_POLICY.json) · [operational](OPERATIONAL.json) · [frozen population](FROZEN_POPULATION.json) · [artifact hashes](ARTIFACTS.json) · [review status](REVIEW_STATUS.json).

## Identity và giới hạn

| Mục | Giá trị |
|---|---|
| Repair base / plan commit | `a549f8cf7a1330d55b2d479a9202e99559195a1d` / `c968c122c105e253c4dcf47e4ac70b70c1e2437d` |
| Executable run source, đã commit/sạch | `1427d2f17028e007df442c73a8d555990a3dc6ee` |
| Pinned main/C3 reference | `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; C3 provider NOT_RUN |
| Registration | `70d87d6626c4fd6cf989db672e763b9118b0c05c40dd9bdd1def33fb4c4de93c` |
| Corpus / config | `c3790a299d97fe4773a96a378e1314f82690493ae2611dadee542cdac05ff2e9` / `5c3b0fedbccac1a97f0d0bc6029ce0ea9a1aa00bafd5110c2b5b6e2d47d36c62` |
| Fresh world / native initial state | `0b77222d5fe039e6892d5ca75d6525beef8f42ee02b94950f86f6fbc27e18692` / `764490863c8c95a83f3bb304710428f6919a8ef10013aad7505a4c781d8b5f47` |
| Owner | Vertex AI `gemini-3.5-flash-lite`, version cùng tên, HIGH/global; candidateCount=1, maxOutputTokens=8192, timeout=90s, retry=0; temperature/topP omitted |
| Verifier | OpenAI `gpt-6.1-sol`, version alias cùng tên, HIGH, Codex CLI 0.159.2; binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`; một upstream/attempt, timeout=90s, retry=0, không tools |
| Owner / verifier prompt hashes | `2a17c6b9fcc36a1dcea771631f0c8f3e7ff77d2f47f857550e9b906f801346ce` / `d9d999d0b6f08dd111081cfbf1324e26aaf29904d3c03c8519eb7614b0216c73` |
| Verdict schema hash | `19a67ac07104c3417d6c07602334da22fb67a11df87fec4f53a9f4b2b1b46115` |
| Execution | 14:56:39–15:08:34 ngày 01/11 giờ Việt Nam; khoảng 715s |
| Bounds | 21 ca / 28 lượt / max112 generations; 2 rounds, 6 call units, tối đa 3 owner + 1 verifier/lượt; owner/verifier wire cap 65536 byte giữ nguyên |

Capture mới 107 sản phẩm bằng route read-only. Handoff matrix vẫn là bản isolated đã được owner duyệt; upstream thiếu matrix, không publish policy shop. Không gia hạn TTL, giả ảnh/màu/chart hoặc sửa dữ liệu nguồn. Initial PostgreSQL thực cùng source đã drop, generation=0. Cùng reviewer độc lập APPROVE implementation, inputs và dispatch sau preflight. Giữ frozen **15 SALES_READY / 6 SOURCE_UNAVAILABLE**; tất cả manifests vẫn recompute ở thời điểm kết thúc. Không sửa cohort sau khi thấy outcome.

## Denominator và vận hành thực tế

- **21/21 ca, 28/28 lượt đã chạy**: 16 SINGLE và 5 JOURNEY. Không diagnostic hard stop. Sáu NOT_RUN của batch cũ vẫn nguyên trong [báo cáo cũ](../purchase-options-run-20261101/REPORT.md).
- **52 generation records = 38 OWNER + 14 VERIFIER; 51 generation HTTP = 37 OWNER + 14 VERIFIER.** 49 OK, 2 PROVIDER_ERROR, 1 MALFORMED. Không bỏ request-bound hoặc provider failure khỏi denominator.
- **13 SEND_ELIGIBLE / 11 silent HANDOFF / 4 HUMAN-owned NO_SEND**. Capture/Outbox khớp 13 text + 2 ảnh; không fallback text hoặc live send. Handoff/no-send: 15/28 = **53,6%**. Đây là rate trên lượt, không phải số case FAIL.
- 13 verifier PASS và 1 verifier transport error; 13 PASS khớp exact final draft/current snapshot ở gate. Không có một PASS cũ cấp quyền cho changed world.
- Verifier latency p50 **6,878s**, p95 **21,917s**, n=14; verification path gồm final readback/recovery p50 **9,136s**, p95 **26,686s**. Nearest-rank; gồm error attempt, không suy thành production SLO.
- Input/output observed **483431 / 40103 tokens**, usage có ở 50/52 generation records. Cost không được expose. Hai embedding predict + một embedding OAuth đều HTTP200, ghi riêng; generation OAuth một lần. Không cộng auxiliary vào 52 generations.
- Ba lỗi: s08 owner request **67258 byte** bị chặn trước auth/HTTP; s09 owner HTTP200 nhưng `read_product.selection` sai schema; j6 verifier `UPSTREAM_TRANSPORT` sau một HTTP, chưa có HTTP status/modelVersion quan sát được. Verifier timeout quan sát: 0/14; verifier transport error: 1/14. Không gán lỗi đó thành quota/429/5xx khi chưa có evidence.
- DB disposable đã drop; source sạch trong execution; send disabled. Không deploy, merge hoặc mutation nguồn shop.

Independent accounting đã kiểm 28 native hashes, 51 actual wire/model/firewall identities, 35 source inventories và 13 eligible bindings. 15 accepted Outbox rows khớp capture. Các toolResponses lặp cùng call ID ở raw continuation không phải model retry hoặc effects mới.

## Bản sửa tạo khác biệt gì

1. **Policy/chart publication:** cùng phép chiếu charts ở prepare/search/full read, đồng bộ policy literal và charts trước verifier, có thu hồi và fail-closed khi projection lỗi. Generation guard chặn policy cũ hoàn tất muộn ghi đè policy mới. RED→GREEN và offline replay đúng world/clock gây hard stop cũ xác nhận chart có trước verifier và snapshot unchanged khi readback; batch mới không dừng vì snapshot. Tuy nhiên s09 lần này lỗi tool schema trước verifier, nên **không dùng s09 như provider proof cho đường policy đã sửa**.
2. **Hai sản phẩm chưa có focus:** prepare metadata/read references, không hydrate numeric offers của thiết kế chưa chọn; giữ facts đã admit. P09 lần này đọc được cả hai set, báo đúng tồn/giá và dùng câu khách chọn bộ quần ở lượt sau. Offline replay giữ chữ ký native 9900 ký tự và actual tool result: current prompt 64399 byte, verifier 32247; optional media hints bị bỏ theo WIRE_BOUND hiện có. **Chưa giải quyết toàn bộ wire-bound:** s08 vẫn vượt cap với schema 19174 + system 22000 + trusted 10815 + dialogue 15009 byte.
3. **Size từng phần:** args PRODUCT/COMPONENT đóng, component query không chạy product engine hoặc ghi inline state rồi suy fit. P07 thực sự gọi COMPONENT/TOP và handoff im lặng; không còn nhận size thường mặc là lựa chọn mua. j2 cũng dùng COMPONENT/TOP. Không tạo chart mới hoặc tự suy product fit sang từng phần.

Không thêm online semantic role, router, parser tiếng Việt, regex/template theo ca, repair/reverify loop hoặc tăng caps. Prompt chỉ bổ sung ranh giới chung về tư vấn size và xác nhận lựa chọn; model/provider không đổi.

## Chấm mù và giới hạn của evaluator

Judge độc lập GPT-6.1 Sol High, fork không có lịch sử implementation, chỉ đọc public prompt/rubric/21 items. Grade được khóa trước unmask: packet `36059438fedbcfa89bbf3d7ef515b0dbacbbd95c72dcca1d09f2a12f2251019a`, grade canonical SHA256 `07f81d114ca23b244c1660a51e78d6c0fe989790fec81e32c31559dc18081402`.

| Phạm vi | wholeTurnPass | FAIL | UNRESOLVED | Đủ cả whole + explicit needs + hard safety |
|---|---:|---:|---:|---:|
| Tất cả 21 ca | 13 | 7 | 1 | 8/21 |
| 16 SINGLE | 10 | 5 | 1 | 6/16 |
| 5 JOURNEY | 3 | 2 | 0 | 2/5 |

13 wholeTurnPass gồm 5 ca hỏi phân biệt/handoff hợp lý nhưng chưa giải quyết xong nhu cầu; không gọi đây là 13 đơn hoàn tất. Theo phép conjunction hiện có, chỉ 8 ca đủ cả ba flags. Đây là thống kê development, **không import packet custom thành official absolute/comparison qualification**. Không đủ căn cứ GO hoặc net-win so C3.

Giữ nguyên mọi grade sau unmask. Cần đọc đúng các giới hạn sau:

- **H01/H02:** judge đánh quality FAIL vì khách chưa được mua/báo giá. Nhưng frozen controls có prerequisite màu/ảnh và contract handoff; public capability map chưa nêu rõ nghĩa bắt buộc của các quy tắc này. Không lấy grade FAIL làm lý do bỏ guard hoặc gửi giá khi thiếu ảnh bắt buộc. Đây cần đối chiếu evaluator/business rules, không tự sửa điểm.
- **P06 UNRESOLVED:** lời “cả ba món”, history rỗng và source SD023 không đủ mô tả/ảnh để chắc ba món khách đang chỉ. COMPOSITE có những component/biến thể cùng loại; số refs không tự chứng minh ba loại trang phục. Không tuyên bố đã kiểm thành công flow combo ba món.
- **j2:** frozen SALES_READY chỉ kiểm SIZE_SOURCE cấp sản phẩm, trong khi khách xin size áo thành phần. Prerequisite chưa chứng minh component applicability. Giữ cohort cũ, ghi evaluator/source-scope gap. Sau handoff, hai lượt correction NO_SEND theo HUMAN ownership; **không chứng minh correction flow đã được thực hiện**.
- P02 báo giá không ảnh và P08 gửi reply dù frozen SOURCE_UNAVAILABLE. Không báo 6/6 controls đều handoff thành công. Chưa có A2 provider adversarial mới cho prompt verifier đã sửa; deterministic tests và N=1 population này không thay A2.

## Findings còn cần xử lý

| Ca | Root cause / hướng xử lý |
|---|---|
| P08 đổi set → áo | Remove/add đã bị reject; cart/receipts không đổi. Sau đó owner bảo khách tự xóa/thêm giỏ nội bộ, bước không dùng được trong chat. Phân biệt rejection của native mutation và CLAIM_MISSING của add trước read, không quy toàn bộ cho giọng. Cần replay đúng payload để đóng nguyên nhân domain/adapter, kiểm atomic offer replacement hoặc handoff khi không hoàn tất; không đẩy việc sửa giỏ cho khách |
| s08 chọn váy đi lễ | Context có đủ mô tả nhưng request 67258 byte không dispatch. Hướng code tiếp: chỉ khai báo tools thực sự callable theo refs/cart/state hiện tại, vẫn giữ danh sách capability; đo exact wire và không phân loại ý khách bằng router. Không chỉ tiếp tục rút câu prompt hoặc tăng cap |
| s09 cách giặt | Owner sinh tool selection sai dù schema công khai. Lần này không phải freshness hoặc chart gate. Giữ raw schema diagnostic và fail-closed; chưa có evidence một chỉnh prompt khác sẽ ổn định hơn |
| s15 thích màu/cảm ơn | Tạo phụ thuộc ảnh đúng màu khi lượt này có thể chỉ ACK sở thích; MEDIA_COLOR_BINDING_UNVERIFIED dẫn tới handoff. Cần tách intent ACK khỏi hành động tra/gửi ảnh trong phân công task, không bổ sung thêm ảnh để cứu một dependency không cần thiết |
| j6 checkout | Cart đã commit nhưng verifier transport lỗi; handoff thật, các lượt sau HUMAN no-send. Giữ mutation/receipt, không replay cart hoặc báo mua thành công. Checkout provider journey chưa được chứng minh; đây là lỗi provider, không gọi là thiếu context |

Giọng tư vấn vẫn có đoạn dài/nhiều tính từ ở s05/s06; judge chấp nhận là dùng được. Giữ đây là hạn chế đã biết, không mở thêm vòng vá giọng để lấn các lỗi tác vụ nghiêm trọng.

Recommendation: **STOP batch development này; Phase C qualification BLOCKED / C3 NOT_RUN / B_NOT_GO**. Có cải thiện ở đường đọc P09 và scope P07; không đủ căn cứ tuyên bố toàn bộ kết quả tốt hơn batch cũ do batch cũ chỉ chạy 15/21 ca, nguồn khác và chưa có locked grades. Không chạy best-of-N, sửa rubric hoặc mở comparison/promotion/deploy sau kết quả này.

## Commands thực chạy

Implementation verification và RED/failures nằm trong JSON kèm theo; không nhận checks task trước là checks mới.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-selection-compact.test.ts src/single-agent-commerce-selection-evidence.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-capabilities.test.ts src/single-agent-semantic-verifier-boundary.test.ts
# 15 matching files / 512 PASS; selection-evidence.test.ts không có file riêng, không claim đã chạy file đó
pnpm --filter @lana/worker test:evals
# 781 PASS, 2 existing SKIP
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
node --test --test-concurrency=1 apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs
# 85 PASS
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-context-publication-pg-20261101-01 COD
# actual PG 76/76 + existing validator 7/7; DB dropped, generation0
node ../c3-context-continuation-replay-20261101.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py python ../c3-c-variant-qdrant-tunnel-20261030.py node --import ../c3-c-variant-qdrant-tls-forward-20261030.mjs apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs ../c3-context-publication-world-20261101-01 ../c3-purchase-run-codes-20261031.json
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-context-publication-initial-20261101-02 COD --phase-c-initial-world ../c3-context-publication-world-resolved-20261101-01.json
node ../c3-context-publication-prepare-20261101-01.mjs
node ../c3-context-publication-finalize-20261101-01.mjs
python ../c3-context-publication-launch-20261101-01.py
# exit0 / COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW, không tự là quality PASS
node ../c3-context-publication-accounting-20261101-01.mjs
node ../c3-context-publication-packet-20261101-01.mjs
```

Initial typecheck từng FAIL do test sửa readonly fixture; đã sửa fixture, typecheck cuối PASS. Initial-state attempt01 thất bại trước DB/generation vì lỗi chuẩn bị file cục bộ; attempt02 hợp lệ, retained log. Không có model attempt nào bị thay hoặc giấu. No new provider generation after this completed batch.
