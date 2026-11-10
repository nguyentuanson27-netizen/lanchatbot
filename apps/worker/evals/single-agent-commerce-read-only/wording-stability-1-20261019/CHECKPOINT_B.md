# Wording stability round 1 — Phase B

Hoàn tất 16/16 slots N1. Đây là một trong hai vòng đo bổ sung được owner yêu cầu; không sửa prompt/runtime/model/config/corpus/scoring giữa vòng, không retry hoặc bỏ mẫu lỗi. **STOP sales/live readiness**; không phải full24 B1 hay A2/A3, A vẫn OWNER_BYPASS.

Run source: `35c9007b6e979e9708f3474d34307b8f66fa6d55` (cả hai vòng cùng clean HEAD, giữ nguyên suốt generation). Implementation base: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Primary lock trước rejected-draft diagnosis trong [PRIMARY_LOCK.json](PRIMARY_LOCK.json), sau khi đọc toàn bộ câu khách thực nhận và state; Codex review, chưa phải owner/independent human scoring.

Owner Vertex global `gemini-3.5-flash-lite` HIGH, candidate1/text/plain/max8192/includeThoughts:false, provider-default temperature/topP, timeout90s/retry0. Verifier Codex login `gpt-6.1-sol` high, bounded relay0.159.2/Responses/tools[]/tool_choice:none/no continuation/one upstream request, timeout90s/retry0. Exact config/corpora/bounds/source paths trong [REGISTRATION.json](REGISTRATION.json).

Owner prompt SHA256 `81e187d379f017397897c513eeae0cad214f20cb7b05ad449ee69b7d84c9289f` (9.435bytes); verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Mọi hash giữ nguyên so baseline ack-source-rerun; live source có snapshot thời điểm mới nên so sánh mô tả, không thí nghiệm cùng world tuyệt đối.

| Population | Slots | USABLE | NEEDS_EDIT | UNUSABLE actual | Control | Generation requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| stateful | 8 | 6 | 1 | 0 | 1 | 14 |
| b1 | 4 | 3 | 0 | 1 | 0 | 13 |
| advice | 4 | 4 | 0 | 0 | 0 | 8 |

Tổng 35 requests: 23 owner / 12 verifier; max52, mỗi generation record đúng1 upstream request. Verifier {"PASS": 11, "FAIL": 1}. Actual fallback 1/16 (6.25%); handoff/no-send checkout và human control theo nghiệp vụ được báo riêng, không tính là fallback chất lượng.

Verifier latency: n=12, p50 6.529s / p95 11.473s. Added verification/readback/final-gate latency n=12, p50 8.313s / p95 13.202s. Không suy thành owner hay toàn bộ turn latency; generation records không cung cấp owner latency. Cost NOT_EXPOSED.

Usage owner input/output 83777/20189; verifier 56014/1048. Usage missing owner/verifier 0/0. Provider/source errors và timeout được đối chiếu supplemental generation-status/error scan trong VALIDATION.json, không chỉ dựa HTTP status.

DB test đã drop; private checkout0model requests; không live send/deploy/tạo POS order. [Đủ16hội thoại và review](CONVERSATIONS_AND_REVIEW.md), [actual fallback/rejected draft](FALLBACKS.md), [đối chiếu cả ba lần quan sát](../wording-stability-2-20261019/WORDING_STABILITY.md). Advice4slots là replay context từ integrated cùng vòng, không phải4session live độc lập.

Evidence: SOURCE_AND_WIRE_AUDIT.json kiểm exact prompt/model/binding/final text, evaluator-label firewall, capture hashes và published artifact bytes. Raw26exact-byte copies +8provider-attempt copies bỏ riêng synthetic private ingress batch. Không sửa draft/verdict/terminal/state/usage, không normalize raw EOL; ARTIFACT_INDEX giữ original/published hashes.

Commands thực chạy:

1. `python apps/worker/evals/single-agent-commerce-read-only/wording-stability-1-20261019/run.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-wording-stability-1-20261019` — exit0. Năm child commands preflight/source-check/stateful provider/B1 range1:4/advice đều exit0; exact argv và exitcodes ở raw/commands.json, source-check/B1 có build hiện hữu.
2. `python <TEMP>/c3-gemini-prompt-once-primary.py <TEMP>/c3-wording-stability-1-20261019` và `python <TEMP>/c3-stability-publish-primary.py 1` — exit0; whole actual dialogue review lock trước diagnosis.
3. `python <TEMP>/c3-gemini-prompt-once-publish.py <TEMP>/c3-wording-stability-1-20261019 apps/worker/evals/single-agent-commerce-read-only/wording-stability-1-20261019` — exit0,34artifacts.
4. `python <TEMP>/c3-gemini-prompt-once-metrics.py <TEMP>/c3-wording-stability-1-20261019 apps/worker/evals/single-agent-commerce-read-only/wording-stability-1-20261019` — exit0; full accounting giữ mọi generation.
5. `node <TEMP>/c3-current-prompt-rerun-audit.mjs <TEMP>/c3-wording-stability-1-20261019 apps/worker/evals/single-agent-commerce-read-only/wording-stability-1-20261019 <primary-commit>` — exit0; exact lock commit ghi trong SOURCE_AND_WIRE_AUDIT.json.
6. `python <TEMP>/c3-stability-validate-compare.py`, public Git blob hash check, JSON parse và `git diff --check` — PASS. Supplemental validation ban đầu sai assumption vì coi mọi recovery metadata là lỗi; đã sửa để nhận ba terminal nghiệp vụ đã đăng ký và chạy lại PASS, không sửa runtime/raw/run. Không sửa executable nên không chạy lại full unit/typecheck/lint; không dùng build/test để nhận định giọng tự nhiên.

Complexity delta: chỉ registrations, exact runner/corpus copies và evidence/report. Runtime/roles/layers/gates/state/framework/parser/templates thêm:0. Không sửa production wiring. Hai vòng kết thúc tại báo cáo; không tự fix hoặc chạy vòng ba.
