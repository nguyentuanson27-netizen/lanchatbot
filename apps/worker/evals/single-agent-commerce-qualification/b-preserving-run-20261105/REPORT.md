# B-preserving model round — 2026-11-05

**Recommendation STOP. Prefix complete, functional acceptance FAIL.** Không mở remainder hoặc ca checkout bổ sung. Không sửa source hay retry trong run; không merge/deploy/live send. Phase C qualification BLOCKED, C3 NOT_RUN, whole-reply quality NOT_GRADED.

## Identity và mẫu chạy

Implementation plan base `d83dc3c85cb22b9fccd463c1025606cd010b5f7a`; I–IV runtime clean `7057960591ac39a481665befc58e508f9dfdbd02`; evaluator/input correction + actual run source **`69bd122100f51584acd6d2ac97dde9254b3e562c`**. Original33 customer scripts giữ nguyên. Thêm riêng checkout1case7turns đã frozen nhưng chưa chạy.

Owner **Vertex Gemini 3.5 Flash Lite HIGH**; verifier **GPT-6.1 Sol HIGH**, Codex0.159.2. CompactV2, N1, retry0, ≤3 owner +1verifier/turn,6primitive/2toolrounds, bound65,536. Exact generation configuration/prompt/schema/source hashes: [FROZEN_CONFIG](evidence/FROZEN_CONFIG.json), [corpus/source hashes](evidence/FROZEN_CORPUS_HASHES.json), [preflight](evidence/PREFIX_PREFLIGHT.json).

Public world107products captured on clean70579605, original price/stock sync06:59:04UTC retained. World hash`35644f4ed3fa0e1dea4f51212a35ca3badd64a0c4ab2af5cf2d7d3c833d67e44`; subsequent evaluator-only code change did not rewrite capture SHA/clocks. New SD023 test asset uses actual canonical bytes/hash/check time under owner approval; original registry/raw source kept. WHITE stock and feedback remain explicit test assumptions; feedback is not proved customer-worn provenance.

Independent implementation, evaluator correction and final inputs APPROVE before provider. Pending01 inputs and customer-choice classification correction are retained outside repo with provider0. Final source readiness distinguishes missing customer colour (CUSTOMER_INPUT, conditional later-cart proof) from missing shop data. Conditions do not authorize runtime output. Actual-time preflights, clean initial PostgreSQL state and real cleanup checked.

## Complete denominator và actual terminal

| Scope | Cases / customer turns | Status |
|---|---:|---|
| Prefix lỗi |13 /24|13 EXECUTED,24 captured|
| Remainder |20 /24|NOT_RUN: prefix material failures|
| Supplemental checkout |1 /7|NOT_RUN: prefix material failures|

Prefix: **12 SEND_ELIGIBLE +2 CODE_OWNED_SEND +6 silent HANDOFF +4 NO_SEND**;14 accepted text,6 images. Handoff25%; no-send16.7%; no customer fallback text. Three NO_SEND are later HUMAN-owned turns after earlier handoff; the fourth is p07 egress block. No derivative HUMAN turn counted as a new independent model failure. Test DB dropped, sourceDirtyfalse, no diagnostic hard stop, no live/source-shop write.

**52 generation records /51 actual generation HTTP**:38OWNER+14VERIFIER;48OK,3MALFORMED,1pre-dispatch bound0HTTP. Failed attempts remain in denominator. HTTP200 malformed/decoder failures are not quota or transport outage. No generation retry, best-of or dropped-error denominator.

Verifier13PASS/1FAIL. Verifier p50/p95 **9.429s /13.662s**; added native verification+readback **12.530s /18.851s**,14 observed samples. These are harness measurements, not production E2E guarantees. Observed usage532,957input/39,049output tokens,51usage rows; zero-HTTP bound has unavailable tokens. Cost not exposed. Generation transport HTTP error/timeout0; malformed/decoder3, pre-HTTP bound1 reported separately. Owner-auth1request được đếm riêng; auxiliary traffic không gộp vào51generationHTTP hoặc gọi là tổng network traffic.

[All24 actual conversations](CONVERSATIONS.md) · [Accounting/capture hashes](evidence/ACCOUNTING.json) · [Exact run command](evidence/RUN_COMMAND.json) · [Integration/cleanup](evidence/RUN_INTEGRATION.json).

## Findings từ toàn bộ hội thoại

| Ca | Actual outcome và nguyên nhân |
|---|---|
|p04|Hai lượt gửi được. Size M vẫn có căn cứ ở lượt hỏi giá sau đó; không mất fit như trước.|
|p06|Handoff PRODUCT_AMBIGUOUS. MãSD023/giáCOMPOSITE989k đã có. Projection so hash BOM array theo thứ tự; cùng multiset SD023-AO +QD001 +QD001 nhưng rowL đảo thứ tự bị đánh VARIANT_DEPENDENT, mất cấu trúc3món khỏi context. Đây là lỗi projection/identity, không phải thiếu tên mẫu từ khách.|
|p07|Hai recommend_size RECOMMENDED; verifierPASS và binding gatePASS, nhưng egress NO_SEND. Contract conflict key chỉ type/product/variant, không phân biệt fitTarget TOP/PANTS; hai SIZE_FIT hợp lệ bị CLAIM_CONFLICT. Replay exact9claims tái hiện đúng lý do. Đây là lỗi code, không nới verifier.|
|p08|Lượt đầu thêm set có receipt và báo tổng829k; khách đổi áo thì hỏi đúng màuTrắng/Be, không handoff vì khách chưa chọn. Chưa chứng minh đổi giỏ đã xong vì script chưa cung cấp màu.|
|p09|Đã chọn đúng set quần sau “Bộ quần nhé”, có cart/quote receipt và tổng799k; không hỏi lại hai mẫu.|
|s03|VerifierFAIL: owner khẳng định ảnh chụp cận ren hoa nổi nhưng source chỉ xác nhậnDETAIL, chưa xác nhận chi tiết đó trong ảnh. Không gọi ảnh chung là bằng chứng phần ảnh chưa biết. Rejected draft được giữ riêng, không chấm như tin đã gửi.|
|s13|HTTP200/MALFORMED_RESPONSE trước tool execution. Chưa đo được owner dùng đường quote mới trong ca này; không nói code bound mới đã đạt model acceptance.|
|s15|HTTP200/STOP nhưng read_product có UNKNOWN_FIELD, decoder từ chối OWNER_TOOL_OUTPUT. Không đủ raw provider args để kết luận field cụ thể; không tự mở schema theo suy đoán.|
|s16|Ảnh feedback route gửi được. Chỉ chứng minh routing trên giả định catalog test, không chứng minh khách thật đã mặc.|
|j1|Lượt đầu hỏi màu đúng; lượt2 hai add_to_cart khiến raw continuation66,933>65,536,0HTTP; handoff. Lượt3 HUMAN_NO_SEND là hậu quả. Bound đường giỏ vẫn chưa được giải quyết bằng quote path mới.|
|j2|Cả3lượt gửi được, ngực88 chọnM, sửa cân nặng/fit preference vẫn dùng căn cứ hiện tại; không còn OUT_OF_RANGE do point chart.|
|j4|HTTP200/MALFORMED_FUNCTION_CALL ở lượt đầu; hai lượt sau HUMAN_NO_SEND.|
|j6|Thêm giỏ được, sau đó code hỏi tên; khách chỉ nóiCOD vẫn hỏi tên vì tên còn thiếu. Đây chưa phải hành trình checkout hoàn tất; không lấy2clarifications để claim full checkoutPASS.|

Giọng vẫn còn nhắc lại chiều cao/cân nặng hoặc cả3vòng (p04,j2), dấu ngoặc và CTA dài. Theo ưu tiên owner, ghi hạn chế này, không mở thêm vòng sửa giọng hoặc dùng nó để che lỗi code/tool.

Cùng24case-turn keys của vòng trước: accepted replies10→14 (8model+2code →12model+2code), handoff9→6, no-send5→4. **N1, fresh world và code khác: không phải chứng minh tiến bộ ổn định hay quan hệ nhân quả.** [Đối chiếu actual outputs](evidence/COMPARISON.json).

## Hướng sửa tiếp theo, chưa triển khai trong run này

1. SIZE_FIT conflict identity phải bao gồm target chính xác, nhưng hai claim trái nhau của cùng target vẫn phải block. Thêm actual native ingress test engine→hai target→verifier→egress→accepted group; PG chỉ kiểm tính size/profile chưa phủ consumer conflict này.
2. Chuẩn hóa BOM theo multiset component identity/quantity, bảo toàn duplicateSKU và shared stock counters; đảo thứ tự không được làm mất cấu trúc, thay số lượng/role/source thật vẫn phải invalid. Không gán thêm loại món ngoài source.
3. Replay actual j1 continuation, kiểm phần lặp của cart/tool result và trusted projection. Chỉ factor lossless dữ liệu đồng nhất trong cùng body, giữ native signed parts/receipts và full expansion equality; không tăng bound hoặc truncate.
4. Audit actual malformed output/schema khi đủ bằng chứng. Giữ lỗi provider/parser riêng; không regex theo ca, synonym parser hoặc repair/retry loop.
5. Với ảnh, tách cóassetDETAIL khỏi đã nhìn/xác nhận ảnh đúng phần khách hỏi. Giữ verifier chặn lời mô tả vượt source; không dùng việc thêm nhãn metadata để giả bằng chứng ảnh.

Không tự chạy vòng khác hoặc bypass prefix gate để mở31turns còn lại.

Structural delta từ plan base tới69bd1221:15runtime/shared-source-and-testfiles,305insertions/28deletions. Thêm bounded fit/selection metadata, pre-cart quote proof và evaluator checkout/media adapters; giữ2online semantic roles, không thêm parser/router/repair/retry hay production wiring. Line count không phải complexity/safety score.

## Verification thực sự đã chạy

- Worker full Vitest:2,648PASS/154files (log reviewed); shared focused223PASS. Exact full-suite argv was not separately retained in public packet; external logs/hashes retain result evidence.
- `pnpm --filter @lana/worker test:evals`:848PASS/2existingSKIP; worker typecheck/build/lint và contracts/business-tools typecheck exit0.
- `node --test --test-concurrency=1` với source-readiness, diagnostic, customer-branches, native-terminal:35PASS sau evaluator-only correction; observedRED→GREEN retained.
- `python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-preserve-clean-pg-20261105-01 COD --check-prefix "C B-preserving"`:2/2PASS, clean70579605/runtime-byte-identical69bd1221, DB dropped/provider0.
- Actual initial-state capture69bd1221 +3source preflights PASS; model prefix command exit0. All commands/model caps/failures retained in evidence. No canonical root `pnpm check` or remote CI PASS claim.
- Six pinned B historical controls were replayed on the implementation worktree at d83dc3c8 with sourceDirty=true (not a clean69bd1221 run); they retain equal input/world hashes and deterministic gate outcomes; five source reads/height-weight calculation pass in offline component replay. No B-model parity/search equivalence claimed.
- New full-schema quote continuation56,441bytes fits; latest old s13 three-read reconstruction still72,693>65,536. Neither offline reconstruction is a new model result.

[Implementation and actual limits](../../../../../docs/specs/c3-phase-c-b-preserving-infrastructure-implementation-20261105.md). Independent post-run integrity/task audit **APPROVE evidence / FAIL functional gate**: [audit](evidence/POST_RUN_AUDIT.json), [gate](evidence/PREFIX_GATE.json). 7ca taskFAIL,6ca served with limits; không phải locked whole-reply quality score. Report accuracy review là bước riêng; engineering/input approval không phải runPASS.
