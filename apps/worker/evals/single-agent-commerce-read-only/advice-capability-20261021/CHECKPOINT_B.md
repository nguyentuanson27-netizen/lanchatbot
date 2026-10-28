# Native B1 capability-instruction comparison — STOP

Ngày 2026-10-21. Đã thực hiện kế hoạch sửa sau review độc lập; đủ 8/8 lượt đã đăng ký, không sửa giữa lượt. **Không chạy full24+8** vì chưa có cải thiện theo tiêu chí đã chốt. A vẫn OWNER_BYPASS; chưa B/live GO.

## Thay đổi đã thực hiện

Base `a07552cbf5dcafc78f32964721dcb713cf632996`; executable/frozen run source `eae41b53941fe6b0cc8a83a3df0ad785e48b8e9c`; primary locked tại `9f7e0cba` trước rejected-draft diagnosis.

Audit xác nhận 7 findings trước đều final AUTO, nên bỏ nhánh chỉ sửa final-only. Candidate B1 giảm 12.135 xuống 11.217 bytes bằng 5 replacement đã ghi trong PROMPT_CHANGES.json: bỏ chỉ dẫn gọi tool state/size/cart/handoff không được expose trong B1. Vai, phần tư vấn, nguồn/search/read, ranh giới inference và giọng giữ nguyên từng section; policy eligibility/receipt/privacy/conflict constraints giữ lại. Không thay dữ liệu sản phẩm, examples, model hoặc verifier. Prompt chung `owner.vi.txt` không đổi; `owner-b1.vi.txt` chỉ là eval candidate và chưa promote.

Runner B1 nhận tùy chọn `--owner-registration`, đọc file prompt kèm hash được freeze và ghi effective hash riêng với manifest mặc định. Không chọn theo case/intent/final-only. B2/B3 không dùng override. Native tool history/declarations/budget giữ nguyên, không thêm model turn. Complexity delta:16 lines helper chọn file/hash, các field/option trong runner hiện hữu, 3 focused tests, một prompt candidate và wrapper 8 lượt dùng entrypoint/credential route sẵn có. Không production wiring, role/parser/router/state/repair loop hoặc credential route mới.

## Kết quả whole-turn

| Case | Control | Candidate | Kết luận cặp |
| --- | --- | --- | --- |
| B1–7: lo ren rườm rà | NEEDS_EDIT | NEEDS_EDIT | Cả hai giải thích bằng mềm/rũ/bay, chưa xử lý rõ mức độ trang trí. Candidate còn mời giữ hàng khi B1 chỉ có read tools. |
| B1–15: quen đồ trơn, ngại điệu | NEEDS_EDIT | NEEDS_EDIT | Control trả hai hướng cho khách; candidate chọn set nhưng lời khen dài và điều kiện chung. Không hơn rõ. |
| B1–23: áo hay set, mặc lại nhiều | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Cả hai upsell set phù hợp; control nói rõ chênh300k. Không buộc mua rẻ, nhưng candidate không hơn rõ. |
| B1–17: đổi sang gặp khách hàng, muốn gọn | NEEDS_EDIT | FALLBACK_QUALITY_FAIL | Control chưa đổi lập trường rõ; candidate actual fallback. |

Agent review trên toàn actual/history/public evidence, không human owner adjudication hoặc keyword scoring. USABLE_WITH_POLISH không đồng nghĩa giọng đã hay/ổn định. Hai reply upsell không bị chấm hỏng chỉ vì chọn799k thay áo499k. Cả8 attempts giữ trong denominator. [Toàn bộ hội thoại và nhận xét](CONVERSATIONS_AND_REVIEW.md).

Candidate s07 bị chặn đúng: nói set799k “tiết kiệm hơn rất nhiều so với mua riêng áo lẻ499k”. Khác với discount cả bộ so tổng hai món rời; ở đây comparator được nêu rõ là áo lẻ. Verifier FAIL/CONTRADICTION_OR_NEGATION; actual chỉ là fallback “Phần này em chưa trả lời được, chị nhé.” Không cộng draft chưa gửi thành thành công.

## Provider, accounting và provenance

Gemini Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex `gpt-6.1-sol`, high, CLI0.159.2. Exact approved config/model versions/generation settings và prompt/source/corpus hashes nằm ở REGISTRATION.json/control.json/candidate.json; verifier/schema/fallback giữ nguyên manifest. Một upstream request mỗi generation, retry0.

8 attempts =24 upstream generation requests (16owner +8verifier), tất cả OK;0error/timeout/retry.7SEND_ELIGIBLE/1fallback (12,5% tổng tập; candidate1/4), verifier7PASS/1FAIL. Mọi8draft qua hard precheck đều được verifier;8draft/trusted bindings recomputed,7exact eligible texts matched. Không handoff/no-send hoặc stateful turn trong tập8.

Native history và read tools giữ nguyên trong16owner request captures; effective prompt hashes matched,0evaluator-label leaks. Bốn cặp có initial evidence khớp khi bỏ timestamp quan sát và final source versions khớp; không lấy source drift giải thích khác biệt ở đây. Một mẫu/case/arm không đủ quy quan hệ nhân quả hoặc ổn định; kết luận chỉ là chưa thấy lợi ích cần thiết của candidate này. Không kết luận mọi chỉ dẫn tool đều không ảnh hưởng.

13 executable/config/frozen-input Git blobs giữ nguyên từ run source qua khóa primary. Wrapper kiểm currentHEAD sau mỗi child.45 raw files copied exact bytes, no private ingress/redaction needed cho B1; artifact credential scan PASS. Primary SHA256 matches lock. Đã lưu effective hash riêng để không nhận nhầm manifest baseline là candidate prompt. Source-check có1embedding request riêng,8attempts0embedding; không gộp embedding vào24owner/verifier requests.45raw bao gồm10child logs được track tường minh; local raw attributes giữ byte/EOL.

## Latency, token và giới hạn

- Verifier n8: p50 6,093s; p95 11,268s.
- Added verification/readback: p50 6,850s; p95 12,049s.
- Owner per-generation n16: p50 3,140s; p95 9,998s. Không benchmark hai role vì workload khác nhau.
- Owner tokens:57.604input /13.218output; verifier41.613input /904output. Missing usage0; output có thể gồm reasoning, không phải độ dài reply.
- Cost NOT_EXPOSED. Không đo conversion/live staff response.

Không full B1/B2/B3, COD/BANK deterministic rerun, publish matrix hoặc live send trong measurement này. B1–3/11/source wording, B1–9/material reassurance và stateful correction vẫn tracked theo evidence cũ; không claim đã sửa các ca chưa chạy. B2/B3 giữ baseline vì các tool mutation/handoff thực sự có ở đó. Hai luồng EXCHANGE/DEFECT candidate không có coverage model mới trong lượt này.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs
# RED exit1: missing readB1OwnerPrompt export; then GREEN3/3
node --test apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
# 62/62PASS
pnpm --filter @lana/worker build
# exit0; no runtime TS behavior changes; no separate lint/typecheck rerun claimed
node --check apps/worker/evals/single-agent-commerce-read-only/run.mjs
node --check apps/worker/evals/single-agent-commerce-read-only/protocol.mjs
# both PASS
python apps/worker/evals/single-agent-commerce-read-only/advice-capability-20261021/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-advice-capability-20261021
# exit0; preflight/source-check/eight attempt children all exit0
python C:/Users/nguye/AppData/Local/Temp/c3-advice-capability-audit.py actual
python C:/Users/nguye/AppData/Local/Temp/c3-advice-capability-audit.py audit
# postprocess only; no generations
git diff --check
# PASS
```

Exact child argv/ranges/output dirs/exitcodes: raw/commands.json. Inline Python assembled registration/prompt diff/input audit, primary lock, raw copies, whole transcripts, metrics/source/version/secret scan; inline Node recomputed8bindings and checked13Git blobs. Commands with placeholders in the plan were not claimed as executed. No provider API or SDK change.

## Quyết định và findings còn lại

**STOP trước full run theo kế hoạch.** Candidate không đạt tiến bộ ở hai trong ba ca concern và còn actual fallback ở control occasion. Không promote candidate hoặc sửa verifier để cứu. Dùng prompt shared/baseline hiện hành; candidate/registration/raw lưu để tái lập.

Hướng này đã được thử đúng AUTO/native history và không có tín hiệu đủ tốt. Không tiếp tục đổi chữ rồi chạy lại dưới cùng giả thuyết. Nhánh giọng bằng ít hội thoại thật đã được owner chấp nhận hoặc bổ sung nguồn chỉ được đề xuất khi có evidence cụ thể; chưa triển khai hay cấp thêm generations trong run này. Các lỗi giọng, chọn ý và comparator về giá vẫn là findings; chưa có root cause nội bộ model đã chứng minh.
