# Phase B — source contract fix implementation

**IMPLEMENTED_AND_SELF_REVIEWED; zero-generation readiness checked; MODEL_NOT_RUN; B chưa GO.**

Plan savepoint `ffc412d5`; executable source `78d0a3cf7052ddf607a9f196fc6c67623e61e052`, clean trước capture/preflight/DB checks. [Phương án được review](c3-phase-b-source-contract-fix-independent-review-20261023.md), [plan bổ sung](c3-phase-b-next-step-plan-20261023.md). Không áp APPROVE của phương án làm approval của implementation.

## Đã sửa

- Export `validateStableProductDocument` từ schema đang dùng trong ProductSearchService; không duplicate schema, thêm defaults mới hoặc thay semantics search. Reduced SOURCE_AUDIT thiếu intents bị reject. Không sửa selector để nuốt dữ liệu thiếu.
- `feedback-source-capture.mjs` đọc canonical product qua Qdrant adapter, policy/POS qua read sources hiện hữu, tạo trusted context và readback cùng clock; kiểm product/context không đổi giữa hai lần đọc. Capture mới là world mới; không dùng trusted/clock lịch sử. Chỉ historical probe draft và hash nguồn của draft được giữ từ run cũ. Không model/embedding client, live writes hoặc source publication.
- `feedback-control-inputs.mjs` chuẩn bị đầy đủ 17 inputs trước dispatch: đúng operation/reason/scope/type, feedback assumption đúng MODEL, component scope, canonical source clock, readback, exact binding/wire và recursive evaluator-label firewall. Dispatch kiểm hash/identity, dựng lại preparation từ canonical capture để đối chiếu, rồi dùng exact frozen request. Invalid fixture cuối, kể cả được tính lại bundle hash, vẫn reject trước request đầu tiên. Không generation retry.
- Controls CLI bắt buộc `--capture`; dispatch bắt buộc thêm `--prepared` từ preflight đã đạt. Không còn đường lấy SOURCE_AUDIT làm catalog. Request/error accounting và đủ denominator giữ nguyên; unsafe eligible dừng ngay. Baseline prompt active được giữ nguyên.
- `feedback-native-gates.mjs` kiểm actual 17 verdicts/terminals/provider count và actual request wires trước native. Identity gồm HEAD, manifest/config, owner/verifier prompt, models, schema và cả bốn corpora native. Baseline sau restore không được dùng kết quả candidate cũ.
- `feedback-native-run.py` thay đường runner chuẩn bị trước đây cho lần chạy mới; giữ đúng 46 = 21 + 25, N1/cap180/no retry. Trước rest phải đủ 21 unique artifacts, đúng nguồn/config/corpus, cleanup DB và whole-turn review trỏ hash từng artifact/terminal; không nhận flag allowRest hoặc exit 0 đơn lẻ. Expected handoff/no-send có thể được review chấp nhận; không ép mọi ca SEND_ELIGIBLE.
- Visual preflight dùng cùng canonical world mới của controls và giữ nguyên hai customer inputs đã đăng ký; không ghép pixel mới với facts/clock lịch sử. Khác biệt trong mỗi cặp vẫn chỉ là bound images. Provider dispatch yêu cầu passing controls đúng candidate/world cùng visual preflight. Đây là **new captured-world visual replay**, không native qualification hoặc phép so số điểm trực tiếp với world cũ.

Giữ output namespace guard, exact text/hash, media projection, response-group authority, receipt exceptions và static fallback hiện hữu. Không thay owner/verifier prompt, model/config hoặc production entrypoint.

## Evidence đã chạy

[Raw hashes](../../apps/worker/evals/single-agent-commerce-read-only/source-contract-fix-20261023/RAW_HASHES.json), [command/check record](../../apps/worker/evals/single-agent-commerce-read-only/source-contract-fix-20261023/VERIFICATION.json).

| Verification | Observed result |
|---|---|
| Worker focused protocol/boundary/media/state/handoff/ingress/chart | 209 PASS |
| Shared protected-claims/reply-assembler/image-selection/Qdrant/size-engine | 64 PASS |
| Node protocol/Gemini/advice/visual/controls/native-gates | 94 PASS |
| Shared build/typecheck | PASS |
| Worker build/typecheck/lint | PASS |
| Isolated PostgreSQL candidate-handoff composed-only | 21 PASS; testDatabaseDropped=true |
| Python AST, Node CLI syntax, git diff --check | PASS |

Test-first modules ban đầu fail import khi seam chưa tồn tại; không dùng điều đó thay behavioral evidence. Behavioral RED thật đã quan sát: test product observed sau capture clock báo `Missing expected exception`; sau thêm source-clock check, test GREEN. Các tests giữ thêm malformed projection, rehashed invalid slot cuối → calls0, wire/binding/config/source/label tamper → calls0, actual wire equality, unsafe eligible stop không retry và incomplete/duplicate/error prefix không mở rest.

Capture/preflight commands thực sự chạy, output ngoài frozen worktree:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/feedback-source-capture.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/source'
node apps/worker/evals/single-agent-commerce-read-only/feedback-controls-20261023.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/preflight' --capture 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/source/capture.json' --preflight
$env:C3_FEEDBACK_CAPTURE = 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/source/capture.json'
node apps/worker/evals/single-agent-commerce-read-only/advice-visual-diagnostic.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/visual-preflight' --preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-source-contract-fix-20261023/integration' COD --candidate-handoff --composed-only
```

Tất cả exit0. Capture mới hash `a3ae8dda3e20d1919dda65654a3c9becad24560a803e2242fd6f00bcc67e4ec4`; prepared bundle `a70fc9486a697c2856c0f0410346d2ee2934bde0e7ee2795b2d27d41c6dff417`.

- [Capture mới](../../apps/worker/evals/single-agent-commerce-read-only/source-contract-fix-20261023/source/capture.json): canonical fields/intents/qualityScore đầy đủ, readback khớp, providerRequests0/embeddingRequests0/sourceWrites0.
- [17 prepared controls](../../apps/worker/evals/single-agent-commerce-read-only/source-contract-fix-20261023/preflight/prepared.json): năm NO_MATCH slots 1/2/7/8/9 đều đúng NO_VERIFIED_MATCHING_MEDIA; không còn MEDIA_SOURCE_UNAVAILABLE ngoài fault fixture. Đây là operation validation, **chưa phải verifier PASS**.
- [Visual preflight](../../apps/worker/evals/single-agent-commerce-read-only/source-contract-fix-20261023/visual-preflight/preflight.json): 4 outcomes, inline images 0/2/2/0, common fields/pixel bindings/hash/firewall PASS, providerRequests0.
- Legacy controls directory không có frozen prepared bundle bị readiness gate từ chối trước provider (ENOENT); test config/source mismatch riêng có deterministic coverage. Không gọi rejection này là proof đã chạy native prefix thật.

Không owner/verifier generation, không A2/A3/full-native mới. Không tính mocked test verdicts vào provider result. Latency/token/cost/voice/sales improvement của model **chưa đo**. Các preflight này thuộc source78d0a3cf và baseline active, không cấp quyền chạy ở HEAD/config/candidate khác; lần provider sau cần clean seal và fresh preflight đúng identity.

## Chart authority: giữ gap có chủ đích

`StableProductDocument` và Qdrant adapter hiện không có brand hoặc offer/BOM target identity. `realtime-product-facts-v2.ts:226` giữ brand của POS snapshot; `size-chart-extractor.ts:224` có fallback LANA; `size-chart-target.ts:39` hardcode LANA. Không tìm thấy mapping có authority LANA ↔ La.na Design trong producer/consumer được rà. Không suy mapping từ tên brand hiển thị.

[Audit/counterfactual trước đó](../../apps/worker/evals/single-agent-commerce-read-only/output-feedback-run-20261023/POST_RUN_REVIEW.md) đã tách mismatch brand + category/component ở SQ2447; SV2447 vẫn khác parent scope. Lượt này không publish/clone chart, alias SQ→SV, lấy brand từ chart, ép SET/OTHER hoặc thêm title rule. **No-chart/handoff giữ nguyên; source authority gap chưa đóng**, không block controls feedback độc lập. Đây không phải xác nhận live chart hôm nay đã thay đổi hoặc đã nối đúng.

## Self-review và giới hạn

Diff executable savepoint: 10 files, +479/−84 lines, phần lớn eval preparation/gates/tests; shared change chỉ export/reuse validator. Semantic roles/layers added: 0; kiến trúc giữ 1 owner và tối đa1 verifier, không framework/router/parser hoặc loop mới. Không thay lịch sử raw của campaign đã đóng.

Native gates đã kiểm deterministic nhưng chưa được chạy với một prefix provider mới; whole-turn human review vẫn cần thực hiện thật. Chart authority, feedback thật chưa publish, ảnh+handoff/protected partial recovery và chất lượng tư vấn/giọng vẫn là residual. Không dùng preflight thành công hoặc ít fallback làm proxy bán hàng tốt.

**B chưa GO.** Bước model tiếp theo: freeze archived candidate riêng trên clean source hoàn chỉnh → preflight mới → 17 controls; chỉ PASS mới visual4, sau đó native21+25 nếu candidate đáng giữ. Không tự mở campaign trong lượt implementation này.
