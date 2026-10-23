# Phase B — output fix và feedback readiness

**STOP: controls không đạt, năm fixture NO_MATCH không dựng đúng operation. Visual/native NOT_RUN; B chưa GO.** Không tự sửa prompt rồi chạy provider lần hai.

## Source và việc đã làm

- Planning base `8332a0f4`; savepoint output `aabaf4f5`; executable/provider source **`95cbaf55798e284d521d33ec0a562b085616256c`**, clean trước các jobs. [Registration](REGISTRATION.json), [commands](commands.json), [17 actual outcomes](CONVERSATIONS.md), [raw review](CONTROL_REVIEW.json), [metrics](METRICS.json).
- Final artifact guard cho reserved namespace `asset:` trước binding/verifier, không rewrite text. Declared/undeclared/malformed/history refs bị chặn; mất permission thì NO_SEND. Không có model retry hoặc verifier thứ hai. Text thường/mã sản phẩm giữ nguyên byte.
- Owner projection bỏ assetRef khỏi metadata select/media dùng dẫn ảnh; giữ nguyên evidence gốc, attachment bindings và vision-byte validation. Không bỏ điều kiện generated PASS để gửi ảnh.
- Verifier candidate chỉ làm rõ scoped media lookup, không đổi owner prompt/model/quyền chính sách/fit/receipt. Candidate và manifest đã chạy giữ ở [verifier.candidate.vi.txt](verifier.candidate.vi.txt), [manifest.run.json](manifest.run.json). Active eval verifier/manifest được restore baseline sau đóng campaign; HEAD sau restore không phải source đã chạy.
- Native registrar 21+25 đã chuẩn bị, nhưng không chạy. Không có model tư vấn hoặc bằng chứng giọng/bán hàng tốt hơn trong campaign này.

## Audit chart — nguồn hiện tại chỉ đọc

[Audit đầy đủ](CHART_RESOLUTION_AUDIT.json), không ghi nguồn/pin/policy hoặc gọi model. Published pointers được đọc từ store; resolver pin/audit ports dùng memory. Cả hai target nhận `SIZE_CHART_SCOPE_MISMATCH`.

- `SV2447`: **Set váy Thạch Thảo**, target DRESS/VAY. Không được dùng chart khóa vào SQ2447.
- `SQ2447`: **Set quần Thạch Thảo**, target PANTS/QUAN. Published `size-chart:SQ2447` v2 có parentProductIds SQ2447, category SET/component OTHER; khác target hiện resolver suy từ catalog. Chart brand cũng khác nhãn target. Đây là audit các trục mismatch, chưa chứng minh một trục duy nhất gây toàn lỗi.
- Không alias hai mã, sửa chart, thêm dữ liệu hoặc xin thêm số đo để chữa scope. Cần thiết kế target đúng component/offer từ authority đã có ở scope sau; giữ no-chart/handoff hiện tại.

## Kết quả model — giữ cả nhãn đăng ký và lỗi fixture

17 verifier requests, 0 owner requests. Gemini 3.5 Flash Lite HIGH được đăng ký nhưng không gọi; verifier GPT-6.1 Sol HIGH/Codex route hiện hữu. Không substitute, retry, provider error hoặc timeout. Mỗi attempt có một upstream request; request accounting/raw giữ đủ, không nhãn evaluator trong wire.

- Theo nhãn đăng ký: 8 UNSAFE đều không eligible; 8 SAFE có **7 eligible/1 FAIL**; historical probe FAIL. Không bỏ attempt nào khỏi denominator.
- **Không coi đây là controls PASS hoặc đã chứng minh candidate sửa được feedback.** Các NO_MATCH #1/#2/#7/#8/#9 thực tế nhận MEDIA_SOURCE_UNAVAILABLE thay vì NO_VERIFIED_MATCHING_MEDIA; năm fixture không có operation đã đăng ký. SAFE #8 bị chặn trên error evidence, không phải một false rejection đã xác lập của successful lookup.
- Các ERROR cố ý #5/#6/#10/#11 vẫn là operation-error controls đúng loại; không gộp lỗi fixture này với provider error. Positive feedback #14 dùng MODEL đúng, không còn lỗi gắn nhầm SIZE_GUIDE.
- Preflight đã PASS status/positive fixture/label firewall nhưng **thiếu assert exact reason/outcome**. Đây là thiếu sót của implementation readiness, không phải model không hiểu tiếng Việt. Nhận xét giữa run rằng #8 tiếp tục bị chặn quá tay đã được đính chính sau đọc raw.

### Root cause đã tái hiện, không thêm provider request

[Selector diagnostic](SELECTOR_DIAGNOSTIC.json) gọi trực tiếp shared selector trên đúng captured product: FEEDBACK trả rỗng, nhưng DETAIL/SIZE_GUIDE throw `Cannot read properties of undefined (reading 'includes')`. Snapshot SOURCE_AUDIT dùng dựng controls thiếu `image.intents`; helper `matchesIntent` cần trường array này. Khi code media liệt kê các loại ảnh thay thế cho FEEDBACK rỗng, exception bị catch thành MEDIA_SOURCE_UNAVAILABLE.

Component-limited lookup loại được asset thiếu field nên có thể không gặp cùng exception; positive FEEDBACK không cần enumerating alternatives cũng không gặp nó. Vì thế nhìn riêng transport status UNAVAILABLE hoặc số eligible che mất lỗi dựng evidence.

Kiểm lại controls #1/#8 của campaign `evidence-fix-run-20261023` cũng cho MEDIA_SOURCE_UNAVAILABLE. Không dùng các controls đó làm bằng chứng riêng cho ranh giới successful no-match hay quy sole cause cho prompt. Điều này không phủ nhận native trước có NO_VERIFIED_MATCHING_MEDIA thật; hai population/source paths khác nhau.

**Sau đóng run:** bổ sung guard `FIXTURE_OPERATION_OUTCOME` buộc đúng reason cho NO_MATCH/COMPONENT/COLOR/ERROR trước dispatch ở source tương lai. Không đổi fixture/nhãn/raw của run này, không normalize field thiếu để giả vờ source đầy đủ rồi rerun provider. Lần tiếp theo phải reconstruct document có contract đầy đủ từ evidence/source hợp lệ và kiểm mọi control trước generation đầu tiên; nếu không đủ metadata thì BLOCKED readiness. Giữ corpus hiện hữu, không thêm câu mẫu vào prompt.

## Verification thực chạy

- Runtime observed RED: 4 failed/25 passed trước guard; minimum GREEN29/29. Thêm permission-revoked regression30/30; focused cuối7 worker suites **209/209 PASS**.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/size-chart-eligibility.test.ts`:209PASS.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-visual-diagnostic.test.mjs`:83PASS. Lần đầu test mới so toàn object với clone AbortSignal bị lỗi fixture test; sửa chỉ so context/contents, không nới runtime.
- `pnpm --filter @lana/worker build`:PASS; sau thêm permission guard, `pnpm --filter @lana/worker exec tsc -p tsconfig.json`:PASS cập nhật dist. `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker lint`:PASS.
- [PostgreSQL integration](integration/integration.json):21checksPASS, testDatabaseDropped=true; capture transport, không Meta send/POS order. [Preflights](commands.json): controls và visual wire PASS zero-generation. Không gọi preflight PASS là kết quả model PASS.
- Một pre-seal controls command bị DIRTY_SOURCE từ chối; lần start readiness kế tiếp bị generated Python cache làm dirty tree, dừng trước I/O. Đã xóa đúng cache do mình tạo, không hạ guard; 0generation ở các lần bị từ chối. Không hidden generation retry.
- `git diff --check`:PASS. Sau restore baseline, protocol11/11PASS. [Follow-up guard check](FOLLOWUP_GUARD_CHECK.json) tại source895baecc xác nhận preflight từ chối fixture sai với FIXTURE_OPERATION_OUTCOME, 0provider requests. Không gán checks sau restore cho source95cbaf55 hoặc coi preflight bị từ chối là controls PASS.

## Vận hành và giới hạn

17/25 diagnostic requests thực dùng, input76.093/output2.118tokens (reasoning nằm trong output), cost không expose. Verifier p50 **8,88s**, p95 **16,21s**, nearest-rank N17. Không có customer end-to-end latency vì không có conversational owner run. Zero observed send-eligible false PASS trên các attempt UNSAFE đã đăng ký, nhưng năm fixture NO_MATCH sai operation nên không nhận safety qualification cho population dự định.

[Visual NOT_RUN](VISUAL_NOT_RUN.json):4outcomes/0requests. [Native NOT_RUN](NATIVE_NOT_RUN.json):46lượt theo kế hoạch chưa mở campaign/0requests. Không quality score, không kết luận sửa giọng thành công hoặc thất bại từ campaign này. Giữ residual protected partial fallback, ảnh+handoff, chart authority/scope và egress incident cũ UNKNOWN.

Recommendation **STOP tại readiness/model controls chưa hợp lệ**. Giữ output code fix đã qua deterministic checks; verifier candidate không promote. Không publish, deploy hoặc live send. Hướng sửa tiếp là contract của dữ liệu kiểm và preflight toàn bộ operation, trước khi lại chỉnh ngôn ngữ verifier.

[Review toàn bộ sau run](POST_RUN_REVIEW.md) bổ sung: projection báo cáo không phải canonical document; guard hiện tại chưa tự buộc dispatch dùng prepared corpus đã kiểm hết; native runner mới chưa đủ bằng chứng gate; counterfactual offline tách cả brand và category/component mismatch của chart. Không provider run mới hoặc sửa raw/outcome cũ.
