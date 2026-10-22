# Phase B — implementation opening và tư vấn, self-review

Cập nhật23/10: đã chạy [full39 và diagnostic4](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-run-20261023/CHECKPOINT_B.md) trên source540b8129. B chưa GO. Nội dung dưới lưu trạng thái implementation trước provider run.


Ngày theo phiên làm việc 22/10/2026. Implementation base `ef98d821`; theo [kế hoạch](c3-phase-b-opening-and-advice-fix-plan-20261022.md) đã [review độc lập APPROVE](c3-phase-b-opening-and-advice-independent-review-20261022.md). **IMPLEMENTATION + SELF_REVIEW; MODEL_RUN_PENDING.** Không dùng kết quả deterministic làm chứng cứ giọng tư vấn đã tốt hơn hoặc B GO.

## Phạm vi và kết quả audit

T0 đọc nguồn thật qua source-session hiện có, PostgreSQL read-only, Qdrant exact-code và Redis; 0 embedding/generation, 0 source writes. [Source audit](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-preparation-20261022/SOURCE_AUDIT.json) giữ readAt/version references và scope, không sửa timestamps cho fresh.

| Hạng mục | Bằng chứng / xử lý |
| --- | --- |
| T1 size | Có 7 chart đang publish; các chart ràng buộc SD276/365/375/396/398, SQ2447, SQ520. Không chart nào có parent scope SV2447, SQ748, SQ675, SQ634. Cả bốn bị SIZE_CHART_SCOPE_MISMATCH. Không alias SQ2447 thành SV2447 hoặc mở scope toàn cục; không sửa target/parser để ép match. NO_VERIFIED_CHART còn là source gap, xin thêm số đo không chữa được. |
| T2 ảnh | Registry image hiện không có field binding màu theo asset; product.colors cũng không chứng minh màu từng ảnh. Giữ media authority/group gate; làm rõ tool description rằng có thể chọn ảnh chung khi nói đúng scope, không nhận đó là ảnh đúng màu. Existing generic/color-bound tests giữ nguyên. Chưa bổ sung được dữ liệu ảnh đúng màu. |
| T3 handoff | Audit chưa có upstream HANDOFF_MATRIX. Candidate đổi hai message policies CUSTOMER_REQUESTED_HUMAN/SIZE_RULE_UNAVAILABLE, giữ tag và các rule ứng viên trước đó. Candidate được tạo record/version/hash/pointer trong DB cô lập rồi resolve bằng RuntimePolicyResolver, không overlay runtime hoặc viết published source. Nếu có upstream custom matrix, giữ nguyên rule/tag khác và chỉ sửa hai message policies; unit tests kiểm nhánh này. |
| T4 deadline | Owner và verifier nhận cùng processingAt + Asia/Ho_Chi_Minh cố định một turn, đặt ngoài trusted world/state và snapshot hash. Diagnostic dùng capturedAt. Không đồng nhất giờ xử lý với ngày bắt đầu giao. Snapshot nguồn có prep/transit range nhưng chưa có anchor/day-convention được xác nhận; không tự đổi sang calendar/business days hoặc khẳng định kịp. Source gap này vẫn mở. |
| T5 quote | Một phép chiếu quote dùng chung trong snapshot và effect response hiện tại/duplicate; native adapter bỏ full cart nhưng giữ đúng từng quote/version lịch sử. Không tính lại tiền hoặc thêm narrative state. |
| T5 recovery | Dùng exact component title nếu context có, không đoán bằng cách cắt tên set. Không có component title thì dùng formatter identity cũ. Recovery thương lượng đặt ưu đãi/tổng trước phần giỏ; giữ mọi guard receipt/current policy/authority/freshness và PRE_ORDER. |
| T6 product/context | Cả bốn product audit không có verified structured attributes. staticEvidence đã verify/pass-through đúng nên không dựng adapter mới hoặc parse description thành fact. Giữ nguyên description và ranh giới inference đã chốt. |
| T6 owner | Thay phần hiểu khách/giọng đang trùng bằng việc chọn hướng mua, nêu khác biệt có ích, không mở lại mọi lựa chọn. Sửa đúng một đoạn vận hành quote/turnTime để khớp contract mới. Chính sách, state/size/effect/permission và material-claim boundaries giữ nguyên. Không few-shot, keyword blacklist, parser hoặc model role mới. |

Prompt: 13.990 → 14.248 bytes (+258; +1,84%), 33 → 32 bullet. Owner SHA256 `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`; verifier giữ `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`. Models/config/bounds không đổi: Gemini3.5FlashLite HIGH / GPT6.1Sol HIGH; retry0, 3 owner / 2 tool rounds / 6 calls / 1 verifier. Không thay provider API.

## Savepoints và observed RED → GREEN

- `45a95aa4`: test quote response thiếu cartQuote và turn metadata undefined đều RED; sửa projection/closure nhỏ nhất → 97 tests GREEN.
- `ac9a04cc`: owner/verifier wire thiếu turnTime RED; projection bounded, diagnostic replay capturedAt → adapter/protocol71 + diagnostic7 GREEN. Test history quote giữ mỗi version và không đổi request gốc cũng PASS; ban đầu assertion clone AbortSignal sai, sửa test so serialized input, không sửa behavior để chiều test.
- `faa417b3`: recovery ưu đãi nằm sau giỏ và title `(mẫu …)` RED2 → effects73 GREEN. Giữ fallback identity khi thiếu component title.
- `a0cb63b4`: candidate helper chưa có → module-not-found RED → unit2 GREEN. Real PostgreSQL composed first handoff RED: đã HUMAN nhưng enqueued0. Sau nối candidate records qua clone/resolver, cùng hai reasons có đúng một capture và turn HUMAN tiếp theo không gọi model/queue thêm. Synthetic domain inputs, không phải model quality evidence.
- `30fd1749`: một owner delta + audit + bốn diagnostic inputs. Không generation.
- `2f9d9aa2`: self-review sửa test lịch sử vẫn đòi SILENT cho hai reason vừa được duyệt thay đổi; giữ test mọi reason/tag khác và thêm hai reason vào commit-failure/duplicate checks. Tool description phân biệt ảnh chung với ảnh đúng màu.

## Self-review và những phần chưa đóng

1. **Không chữa source gap bằng prompt/code đoán:** không sửa size-chart-target, chart scope, color map, attributes hoặc nguồn ETA. Các case tương ứng chưa được coi đã đóng.
2. **Không invalid snapshot chỉ vì đồng hồ chạy:** turn-time nằm trong request closure, không thuộc factSnapshotVersion/state; final gate vẫn lấy current clock. Existing boundary test fact-expiry-after-PASS tiếp tục PASS. Metadata cũ vắng mặt không bị suy từ timestamp của một fact.
3. **Không sửa history quote thành số mới:** effect response chứa quote tại lúc tạo; adapter giữ lịch sử từng version. Chỉ current snapshot là quote hiện tại. Test hai response và current-state khác nhau PASS.
4. **Handoff thật đi qua owning boundary:** resolve candidate contentHash/versionReferences từ DB cô lập, không chỉ đổi JSON/test fixture. Queuing gắn transaction; CAS/unknown commit/permission/replay tests giữ fail-closed. Capture/tag intent không phải receipt nhân viên đã nhận hoặc đã xử lý.
5. **Không lặp prompt-only:** quote và time được sửa ở code; product source thiếu giữ unknown. Prompt cũ đã có mục tiêu bán hàng, lần này không gọi root cause là thiếu mục tiêu. Chưa có evidence provider cho biết delta giọng có hiệu quả.
6. **Diagnostic không bị treatment cũ:** bốn input chỉ có caseId ngoài runtime, runtime hội thoại và captured requests nguyên nguồn. Không ownerInstructions/ownerDescriptions hoặc evaluator rubric. Offline request capture xác nhận cùng candidate prompt, canonical context không đổi, thời gian replay và nhãn không leak. Runner override cũ vẫn giữ cho lịch sử, không dùng trong bốn input này.
7. **Hash thực tế:** self-review phát hiện external Python text-write sinh CRLF trong working tree dù hash dùng LF. Đã đổi preparation sang bytes LF và đối chiếu hash bytes thật với PREPARATION; chưa có provider run nào dùng input lệch hash.
8. **Complexity delta:** thêm một helper eval26 dòng cho candidate records để tái sử dụng resolver/transaction, một metadata type/closure và một bounded projection; không thêm gate, durable state, router, semantic parser, repair loop hoặc provider framework. Không đổi production entrypoint/shared packages/live source.

## Chuẩn bị model run — chưa dispatch

[PREPARATION](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-preparation-20261022/PREPARATION.json), [bốn input](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-preparation-20261022/diagnostic-inputs.json), [offline request check](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-preparation-20261022/REQUEST_CHECK.json).

B1 slots7/9/15/23 lấy public captures từ source campaign `6e38c541`; không sửa lời khách hoặc thêm fact theo ca. Diagnostic4 N1 tối đa8 generation requests, riêng khỏi native39 (18+21, N1, 38 public + 1 private, max152 requests). Combined cap160 không đổi. Native candidate handoff phải truyền `--candidate-handoff`; mặc định runner vẫn giữ published policy. Khi owner yêu cầu chạy: clean source/config → capture runtime HEAD bên ngoài frozen source → preflight. Không có runSourceSha/provider quality result cho lượt implementation này.

Offline projection4 PASS, owner wire16.156–17.321 bytes; verifier với placeholder draft4.096 ASCII bytes21.069–24.992 bytes, dưới bounds hiện hữu. Đây là kiểm serialization/labels/bounds, không kiểm nội dung model hoặc native eligibility.

## Commands và kết quả

Các command chạy từ repo root. Logs/evidence được giữ ngoài repo rồi copy phần không chứa secrets vào preparation folder khi hoàn tất. Source-session chỉ đọc nguồn; DB runner chỉ tạo/drop tên `c3_b_test_*` và capture synthetic transport.

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs
pnpm --filter @lana/worker exec vitest run src/size-chart-eligibility.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker exec vitest run src
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-semantic-verifier/*.test.mjs" "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node ../c3-b-opening-advice-audit-20261022.mjs
python ../c3-opening-advice-prepare.py
node ../c3-opening-advice-request-check.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-opening-advice-red-handoff-20261022 COD --composed-only --candidate-handoff
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-opening-advice-green-handoff-20261022 COD --composed-only --candidate-handoff
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-opening-advice-final-cod-20261022 COD --candidate-handoff
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-opening-advice-final-bank-20261022 BANK_TRANSFER --candidate-handoff
git diff --check
```

Focused worker262 PASS; full worker1.956 PASS; protected-claims/reply-assembler21 PASS. Final Node560 registered:558 PASS/0 FAIL/2 SKIP (installed Codex optional local-stub tests); initial Node run had1FAIL do expectation SILENT cũ, đã sửa như trên. Typecheck/build/lint PASS. Composed COD20 PASS; full COD34/BANK34 PASS. Cả4DB (RED, composed GREEN, final COD, final BANK) đều dropped; mọi run0provider generation và capture transport. Các DB checks thực hiện trên working tree được ghi sourceDirty:true; không gọi đó là sealed provider run hoặc remote exact-head CI. Không shared source changes nên không mở shared-package full suites khác. [Evidence index/hashes](../../apps/worker/evals/single-agent-commerce-read-only/opening-advice-preparation-20261022/VERIFICATION.json).

Recommendation hiện tại: **giữ B chưa GO; model diagnostic/native chưa chạy**. Những khoảng trống chart/asset-color/attributes/ETA anchor và các mục ngoài gói (N3b/N6b/staff-image/T5imagecomparison) vẫn mở. Không deploy/live send hoặc tự chạy thêm vòng model.
