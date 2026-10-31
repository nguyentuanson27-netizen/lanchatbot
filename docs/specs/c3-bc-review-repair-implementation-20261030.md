# Review toàn bộ B–C và bản sửa admission

Ngày30/10/2026. Base5c88adf29f22e24a6a46c4c8f6622327164ee5b3; approved plan revision2 f57518e83d78b870d6830625dfd78df6178c733e; executable e6880a70cbbb2eb0745c2b008b0a4617005a71d5.

**Quyết định: giữ các sửa C cần thiết, không rollback toàn bộ về B.** Đã sửa root cause admission xác định được; chưa nhận đã sửa mọi lỗi hội thoại hoặc nâng chất lượng bán hàng. [Plan và mapping22ca/34turns](c3-bc-review-repair-plan-20261030.md), [review độc lập](c3-bc-review-repair-independent-20261030.md), [verification/hashes](c3-bc-review-repair-verification-20261030.json).

## Review và phân công xử lý

Audit gồm diff38runtime/test files từ đúng cuốiB f160dfa4, các22ca/34turn C, report toàn51B cuối media-approved và six-body×3 diagnostic. B4efbea67 là mốc cũ hơn cuốiB; không dùng hai mốc thay nhau. Media-eligibility ở cuốiB và current có cùng Git blob de9e51725ac639e226dd3c5dc5a41a047e0bcf68; explicit revalidation đã có ở cuốiB, không phải cải tiến riêng C. Lý do giữ C là tuple parity/replay và COD/private checkout, không phải nhận công của sửa media trước C. Review độc lập không thấy lý do rollback toàn bộ.

- KEEP: checkout/COD/private provenance/clarification budget, transaction-policy pin/replay, tuple parity owner/verifier/finalgate, bounded current preparation, diagnostics. Bỏ các phần này sẽ đưa lại lỗi state/effect hoặc mất bằng chứng.
- REPAIR: representation lặp identity/source/time/quantity trên từng option gây overflow internal product; catch gộp bound thành source conflict.
- SOURCE: ảnh expired/thiếu color/feedback metadata, exact variant absent, chart OUT_OF_RANGE. Giữ silent handoff khi thiếu shop data; không sửa nguồn trong code hoặc nhận phép thử/thông tin màu chưa có.
- MODEL/CONTEXT residual: s04/j1/j4 diễn giải NO_COLOR, s07 chọn đường search, s09 chưa đọc policy, s13 hỏi ETA không cần. Không gọi các ca này đã sửa chỉ vì code envelope GREEN.
- UNRESOLVED: historical HNSW parity và whole-turn instability. Six-body diagnostic chỉ đo first-decision; không so B51 với C34turn như matched quality.
- Giọng nhẹ đã owner chấp nhận: không thêm prompt rules/templates hoặc benchmark-specific wording trong bản này.

s01 Khánh Trang đã gọi đúng quote_product; ảnh mất freshness làm task không đủ dependency. Correction này supersedes quy kết owner tự đòi ảnh trong CASE_REVIEW cũ; grades/raw cũ bất biến. Quote form bắt buộc ảnh vẫn giữ, không bỏ ảnh để nâng eligible. NO_SEND sau HUMAN là ownership đúng, không đếm thành nhiều lỗi hiểu hội thoại mới.

## Bản sửa

CANDIDATE_SELECTION_V2 chỉ lưu một lần sáu trường dùng chung ở envelope; mỗi option giữ size,color,status,reasonCode,identityHash. Full tuple input được kiểm identity/source/quantity/observedAt và exact keys trước bỏ phần lặp; không thể compact tuple sai subject/source thành hợp lệ. Shared expander giữ full CandidateCartOption result contract tại catalog/read/effects và exact duplicate projection.

V2 có strict version/shape/hash/selector/expiry validation. Không đọc V1 như V2. Existing authoritative envelope TTL do source/config/policy callers giữ nguyên; test normalization với derived option expiry ở cả hai phía. Đây không phải bằng chứng mới về toàn freshness policy. Source-bound readback/quantity/policy/binding checks và first8-not-complete-inventory semantics không đổi.

Known bound trả PRODUCT_EVIDENCE_BOUND; known source conflict giữ reason riêng; unknown merge exception ra outer boundary UNAVAILABLE/SOURCE_ERROR, không leak raw message hoặc giả định conflict. Không tạo được proof thì failclosed, không âm thầm bỏ proof rồi trả OK. Snapshot cũ atomic khi reject. Bound thật vẫn chặn.

Giữ trần4096bytes/envelope,8192bytes/product và tool-result batch,65536bytes/textwire; không đổi prompt/models, role count, tool/work caps, entrypoint, persisted schema, source shop hay tăng retries. Production patch chỉ5worker files, không shared runtime package. Những scripts/tests bổ sung dùng đo và regression.

## Đối chứng đúng cuối B

B f160dfa4 được checkout/build riêng; cùng frozen107product world/clock/query với C trước/sau. C BEFORE chạy old worker dist đã đối chiếu312 hashes với seal ec468293, dù working tree lúc đo đang chứa patch và HEADf575; không gọi đó là clean source run của ec. C AFTER chạy clean exact e688.

| Query | Cuối B | C trước sửa | C sau sửa | Internal product sau sửa |
|---|---|---|---|---:|
| SV2447 unfiltered | OK | REJECTED | OK | 6965B |
| SV2447 compare AO/CV/SET_VAY | OK | REJECTED | OK | 6965B |
| SV2447 AO | OK | OK | OK | 4105B |
| SV2447 SET_VAY | OK | OK | OK | 3224B |
| SV1561 unfiltered | OK | OK | OK | 5935B |
| SV1561 SET_VAY | OK | OK | OK | 3666B |

Source-input hashes giống nhau B/BEFORE/AFTER cả6query; protected claim type/scope/value sau sửa bằng cuốiB cả6query. All6readback unchanged. Expanded V2 tuples khớp source candidateCartOptions với existing envelope normalization, không mất tuple/selector/source/status. Không claim B cũ có cùng envelope TTL/selection proof representation.

Đây là read component controls, không full paired B/C conversation, DBhistorical capture hay search parity. Frozen world lấy từ C; không giả thành full DB B lịch sử.

## Verification và giới hạn

TDD quan sát RED5 trước code: compare24tuple bị chặn, version cũ, malformed full input được normalize, unknown/bound bị quy conflict. Sau code GREEN9, rồi bổ sung factory negative control thành10unit tests (nằm trong focused340). Có một canonical build đầu fail3 TypeScript test assertions cũ; đã sửa và chạy build/typecheck/lint lại exit0. Nativewire test trước buildfail chỉ provisional, không dùng thay successful-build verification.

Final commands/source/log hashes ở verification JSON. Worker focused340PASS; protected claim/reply21PASS; fullNode768PASS/2SKIP/0FAIL; current worker build/typecheck/lint exit0. Hai SKIP là opt-in Codex transport checks, không tính PASS. Reviewer tự chạy10unit+1wirePASS là repeated verification, không cộng vào distinct totals. Native serializers giữ cả24tuple ở snapshot, owner và verifier, tool-result bounds; changed source sau verifier không authorize và expired PASS bị gate chặn.

Actual PostgreSQL exact clean e688 đã hoàn tất **73/73PASS +7/7invariantsPASS**, DBdropped=true/provider0/sendfalse; cả main và reviewer kiểm bằng existing validateRealAdapterReport. Test-only3ace47b3c9858ffd44212b705a006998daf44de9 sau đó thêm deepEqual đầy đủ24tuple trong actual owner/verifier frames, rerun1/1PASS; reviewer approve delta và xác nhận runtime/packages byte-identical e688. Không nhận PG đã chạy trên test-only head mới. Domain inputs synthetic, persistence/capture thật, disposable DB và send-disabled. Không dùng local mock PASS trong wire negative control như provider/semantic evidence.

Một residual diagnostic nhẹ: tool reason SELECTION_EVIDENCE_STALE chưa nằm trong allowlist observer nên có thể được ghi UNKNOWN_INTERNAL; failclosed không đổi. Reviewer ghi nonblocking, không mở thêm source sửa telemetry trong scope này.

Legacy pending evidence V1 không migrate thành V2; replay/source-result hash khác phải failclosed. Nếu rollout tương lai cần xử lý pending groups theo release plan riêng; task này không deploy. Old run identities/evidence không tái sử dụng sau schema đổi.

## Hướng tiếp theo

Ưu tiên đã hoàn thành: sửa admission có deterministic evidence, giữ safety/state fixes. Phần sau cần một run model đăng ký mới nếu owner yêu cầu; không tự chạy campaign để chứng minh giọng hoặc tư vấn tốt hơn.

Nguồn ảnh/size/màu cần xử lý tại nguồn hiện có với quyền duyệt phù hợp, không sửa bằng prompt. Với s07/s09/s13 cần kiểm full observation/context và source/tool availability ở đúng điểm owner quyết định; thay đổi cấp context/declarations phải được cô lập trước khi kết luận hữu ích. Không mở semantic router, parse câu khách bằng regex hoặc tự chọn subject để cứu kết quả. Giữ silent handoff khi shop thật thiếu dữ liệu và hỏi khách khi thiếu thông tin khách.

Phase C qualification vẫn BLOCKED, C3 comparison NOT_RUN, B_NOT_GO. Implementation approval chỉ xác nhận phạm vi code/verification này; không GO, không bằng chứng mới về sales quality, không merge/deploy/live send.

## Lệnh đã chạy

Commands dưới đây đều đã chạy; logs/status/hashes và các failed preparation/build đầu nằm trong verification JSON. B worktree có một lượt install được gọi trước khi checkout hoàn tất và fail trước build; đã chờ checkout xong rồi install/build thành công, không tính lỗi đó thành runtime regression.

```powershell
# Trong worktree B f160dfa4
pnpm install --offline --frozen-lockfile --ignore-scripts
pnpm --filter @lana/worker build

# Trong candidate repo, RED rồi GREEN/final (logs riêng)
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-selection-compact.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-selection-compact.test.ts src/single-agent-commerce-selection-evidence.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-selection-compact.test.ts src/single-agent-commerce-selection-evidence.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-preparation.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
pnpm --filter @lana/worker test:evals
node apps/worker/evals/single-agent-commerce-qualification/bc-final-b-read-probe.mjs ../lanchatbot-bc-end-b-f160dfa4 ../c3-c-readfix-world-resolved-20261030-01.json ../c3-final-b-read-20261030.json
node apps/worker/evals/single-agent-commerce-qualification/bc-final-b-read-probe.mjs . ../c3-c-readfix-world-resolved-20261030-01.json ../c3-current-before-read-20261030.json ../c3-bc-controlled-20261030-01/SEAL.json
node apps/worker/evals/single-agent-commerce-qualification/bc-final-b-read-probe.mjs . ../c3-c-readfix-world-resolved-20261030-01.json ../c3-current-after-read-20261030.json
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-bc-fix-pg-e6880a70-20261030 COD
node --test apps/worker/evals/single-agent-commerce-read-only/selection-compact-wire.test.mjs
git diff --check
```

