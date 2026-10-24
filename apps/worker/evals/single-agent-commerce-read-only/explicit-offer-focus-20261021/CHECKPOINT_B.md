# Phase B — explicit offer/advice observation

**FOCUS18_COMPLETE_STOP_BEFORE_FULL**. Đã sửa, self-review, kiểm tra deterministic và chạy đủ18mẫu đã đăng ký. **13USABLE /5NEEDS_EDIT**,18SEND_ELIGIBLE,0fallback/handoff/no-send. Những lỗi chọn nội dung và lập luận tư vấn chưa được sửa ổn định. Không tự chạy vòng sửa thứ hai hoặc full B1/B2/B3. A vẫn OWNER_BYPASS; chưa B/live GO.

## Source và thay đổi

- Implementation base `fcde3bcbab30711686354671d83a4e08d56f9845`; implementation `b0ff06c4`. Runtime runSourceSha `219d77371936511419c3978afe424316bed91be1`, clean trước dispatch. Raw commit `b8104e80`; primary actual-outcome review khóa tại `2a1756d` trước offer/verifier diagnosis. Không ghi runtime SHA ngược vào frozen source.
- Native read_product yêu cầu offerType mã nguồn hoặc null để so sánh/discovery. Adapter kiểm tham số và chuyển null sang domain optional hiện hữu, giữ nguyên signed native content. Không đoán nghĩa câu khách, không regex/chọn offer thay model. Enum gợi ý dùng nguồn đã xác nhận; unknown offers vẫn đọc được. AUTO mode/config giữ nguyên, không hứa schema sẽ buộc model hiểu đúng.
- Thay phần tư vấn/giọng tại chỗ: ưu tiên băn khoăn quyết định mua, lý do liên quan và một đề xuất có ích; khả năng bước tiếp theo gắn availableTools. Prompt14170→13762bytes. Không thêm ví dụ, data policy/sản phẩm hardcode, case labels hoặc câu mẫu.
- Verifier, schema, fallback, corpora, model/config, domain/state/effect/receipt/privacy và final gate giữ nguyên. Không thêm role/router/parser/repair loop/gate/state layer; không production wiring.
- Đã kiểm tra [official function-calling documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling) trước đổi schema. Provider hỗ trợ required/nullable/enum; đây chỉ là hợp đồng tham số, không bảo đảm lựa chọn ngữ nghĩa đúng.

Exact config/hashes nằm trong REGISTRATION.json: owner Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex `gpt-6.1-sol`, high, CLI0.159.2/tools none, existing login route. Owner prompt SHA256 `434e5dc01326075c74b63ff705406b531ec5adc3b95214b55731bc52b8ce86f3`; verifier `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Fallback `C3_A_NONPROTECTED_V2`, text/hash giữ nguyên, không dùng lần này.

## Whole-turn results

Prior-needs-edit2/4/15 ×3 trước, rồi9/17/23/3/5/6/8/16/21 ×1. Tổng18/max72generations; mọi registered sample đều hoàn tất, không bỏ lỗi hoặc chọn best-of.

| Nhóm | USABLE | NEEDS_EDIT | Nhận xét |
| --- | ---: | ---: | --- |
|2 thời hạn/phí đổi ×3|3|0|15ngày/30k đúng, không còn hứa lên đơn đổi.|
|4 hỏi giá set ×3|1|2|Một câu799k gọn; hai câu vẫn báo thêm áo/váy, một trong hai hỏi lại cách mua.|
|15 ngại quá điệu ×3|1|2|Một reply khuyên giữ set rõ; hai reply vẫn để lựa chọn dưới điều kiện khách đã nêu.|
|9 sân vườn ×1|1|0|Inference cảm giác thông thường được chấp nhận; sức tư vấn còn mỏng.|
|17 gặp khách, nhìn gọn ×1|0|1|Chọn cả bộ nhưng lý do đồng bộ/chỉn chu chưa xử lý ưu tiên nhìn gọn.|
|23 mua áo hay bộ, mặc lại ×1|1|0|Chọn áo499k tận dụng váy đen đã biết.|
|3/5/6/8/16/21 controls|6|0|Partial source, áo lẻ, search và policy loại trừ được xử lý đúng trong các mẫu này.|

Đủ actual/history và lý do từng mẫu ở CONVERSATIONS_AND_REVIEW.md; năm mẫu cần sửa ở FAILURES_AND_REVIEW.md. Một main-agent reviewer, không human/blind adjudication. USABLE cho phép minor polish, không đồng nghĩa lời tư vấn hay. Không chấm bằng keyword, số tính từ hoặc yêu cầu mọi câu chọn áo lẻ/giá rẻ.

Ca15 mẫu dùng được có đề xuất set cho tiệc ban ngày, nhận xét nhẹ/không bồng là inference thẩm mỹ được phép; lý do với gu đồ trơn vẫn mỏng. Hai mẫu còn lại nhắc nếu vẫn ngại rồi mở áo lẻ, chưa nói shop chọn hướng nào cho hoàn cảnh đã biết. Không fail chỉ vì có hai phương án hoặc có từ nếu.

Ca17 không fail vì mua cả bộ. Bot chưa giải thích vì sao cả bộ giải quyết mong muốn nhìn gọn, chỉ tiếp tục khen đồng bộ/thanh lịch/đẹp nhất. Review cũ cũng từng chấm nhẹ một lời khuyên tương tự và ghi lý do chưa bám nhu cầu; không sửa nhãn lịch sử hoặc dùng khác biệt này để tuyên bố regression nhân quả đã được chứng minh.

Ca6 báo hai giá áo dài là hữu ích khi khách chỉ gọi tên/mã mẫu, chưa nói áo lẻ hay cả bộ. Ca3 cố ý thiếu nguồn POS: bot trả chất liệu và nói chưa có giá/tồn, không bịa hoặc hứa kiểm tra báo lại; cụm hệ thống bên em còn cứng và được ghi voice finding. Không lấy lỗi thiếu nguồn làm lỗi model. Ca8/16 từ chối đúng việc đã mặc đi làm/mặc thử vào người theo policy snapshot, không đồng ý trước rồi đọc điều kiện.

## Diagnosis sau khi khóa primary

**Giá set:** r1/r2-case04 đều gọi read_product với offerType:null; r3 gọi SET_VAY và trả đúng một giá799k. Trước sửa model được phép bỏ tham số; sau sửa model chủ động chọn phạm vi rộng. Hợp đồng mới loại bỏ omission im lặng và làm rõ quyết định, nhưng không sửa được hiểu/phạm vi đọc ổn định. Không tiếp tục sửa bằng regex hoặc ngầm ép null thành set.

13native read calls đều có offerType:6mã cụ thể/7null/0missing. Hai control áo lẻ chọn AO đúng. Ca15 cả ba đọc SET_VAY; r3 đọc thêm null ở tool round sau để có các lựa chọn khác. Vì vậy không thể quy toàn bộ lời tư vấn yếu cho nguồn trả mọi offer: ngay khi scope ban đầu đúng, model vẫn dùng lời khen thay lập luận và để lại điều kiện chọn mua.

**Policy:**3/3 câu thời hạn/phí hiện không mời bot lên đơn đổi, tốt hơn mẫu lỗi trước. Đây là quan sát trong ba mẫu, không chứng minh ranh giới capability đã ổn định mọi luồng. Stateful handoff/mutation không được chạy mới trong observation này.

**Snapshot:** không có STALE lần này. Lỗi cũ là POS sync mới đổi provenance, không phải Redis tự tạo thời điểm mới mỗi lần đọc. Characterization test xác nhận cùng source reread ổn định, source observation mới vẫn đổi binding dù business values giống nhau. Giữ gate; availability limitation còn tồn tại. Không nhận việc không gặp lại STALE là đã sửa xong bằng prompt.

**Giọng:** thiếu trọng tâm vẫn là nguyên nhân chính của dài dòng: nhắc lại gu, giải thích nhiều nét đẹp cùng ý, dùng cụm như vừa vặn thoải mái trong ngân sách. Control giá/tồn đã có câu gọn tự nhiên. Không có bằng chứng model hoàn toàn không viết được gọn; vấn đề chưa được giải quyết ổn định trong việc chọn ý/lập luận khi tư vấn.

Không so13/18 với10/18 cũ như cùng population: trước đây cả sáu ca đều×3, lần này prior failures×3 và controls×1. Chỉ trên9mẫu2/4/15 chung, review cũ2U/7N và mới5U/4N; source theo thời gian thật, sample mới, prompt/tool cùng thay và một reviewer nên không coi chênh lệch là causal/stability proof.

## Requests, latency, tokens và audit

- **55generation requests=37owner+18verifier**, distribution providerRequests=1 cho55/55; retry0, errors0, timeouts0. Tool rounds là các bước mới có accounting, không hidden generation retry. Mọi18draft sống hard precheck đều được verifier;18PASS,0FAIL/UNCERTAIN/malformed. Không dùng PASS để thay review chất lượng tư vấn.
- Owner146351input/26319output tokens; verifier78481/1106. Usage55/55; cost NOT_EXPOSED, không ước lượng. Embedding/source-read traffic không phải owner/verifier generations.
- Verifier latency n18: p50 **6.755s**,p95 **7.616s**. Added verification/readback n18: p50 **7.472s**,p95 **8.331s**. Không coi repeated build/credential/source setup là model latency, không nhận khác biệt latency giữa hai population là benchmark tốc độ.
- 18child registrations,37exact owner prompt captures,18verifier bindings recomputed và18exact actual texts khớp verified draft.55unique dispatched bodies kiểm labels,0evaluator-only label leak. REQUEST_ACCOUNTING có73capture entries vì verifier có accounting capture lặp; không tính thành73generation requests. Wire-hash entries là offline JSON representation, không được mô tả là native HTTP byte hash.
- 14frozen input/config files không đổi;95raw public files exact bytes,95Gitblob hashes khớp. PRIMARY_LOCK hash khớp. Marker scan không thấy private keys/credential URLs/auth headers. Không customer PII/live send/database mutation.

## Commands thực sự chạy

Từ repository root; child argv/exit codes đầy đủ trong raw/commands.json.

```text
node --test --test-name-pattern 'product reads require|read offer null' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-primary.py C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-publish.py C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-lock.py apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021
python C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-metrics.py C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021
node C:/Users/nguye/AppData/Local/Temp/c3-decision-scope-audit.mjs C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-focus-20261021 apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021 2a1756d
python C:/Users/nguye/AppData/Local/Temp/c3-explicit-offer-source-audit.py apps/worker/evals/single-agent-commerce-read-only/explicit-offer-focus-20261021
git diff --check
```

First focused command observed2FAIL before implementation, then adapter54PASS and focused103PASS/1optionalSKIP. Runtime71PASS. Build/lintPASS; lint invokes TypeScript noEmit, no separate typecheck command claimed. Provider/source preflight plus18child commands exit0. No shared-package source changes; worker build compiled dependencies. No broad/full worker suite or new stateful provider run claimed.

Two ancillary python-c offline scan/hash commands failed with PowerShell quoting SyntaxError before running any check. Replaced by file-based helpers shown above, which passed; no provider/source impact or generation retry. Existing generic audit's unused captureHashesMatched field was removed by the final helper rather than claimed as an executed check.

Recommendation: **STOP_BEFORE_FULL**. Partial improvement observed in policy and one price sample, but core selection/reasoning failures persist and a changed-occasion control needs work. Preserve this candidate/evidence for owner review; do not add another prompt patch or automatically start a new model round. No claim of Checkpoint A PASS, complete B, conversion effectiveness or live readiness.
