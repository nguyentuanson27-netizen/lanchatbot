# Giữ nguyên prompt, chỉ thêm ví dụ — kết quả chưa đủ để thay baseline

2026-10-21. **COMPLETE_12_MIXED_KEEP_BASELINE**. Đã làm đúng hướng owner duyệt: giữ toàn bộ baseline từng byte, nối đúng5 ví dụ đã duyệt, không cắt/chỉnh chỉ dẫn. Đủ12/12 lượt, không retry/mẫu bù. A vẫn OWNER_BYPASS; chưa B/live GO.

## Thay đổi và provenance

Base `93a1265d13bdd2e168b84de1df1c77240e1740a8`; run source `7258a79d1faa83c85e5c1a2a92cce630fe0a7611`; primary lock `405782b8` trước đọc verdict/diagnosis. Candidate [owner-examples-additive.vi.txt](../prompts/owner-examples-additive.vi.txt), SHA256 `a7fc3efe8ca821c16bbba4692ac04cb2d4f8748e26a36d5091bcd79ad51e38e6`.

Prompt12.135→14.870bytes (+2.735, khoảng22,5%). Prefix bằng exact baseline; suffix bằng exact khối minh họa ở candidate trước. Không lấy token reduction làm mục tiêu. Khối minh họa giữ phân biệt dữ kiện giả định với nguồn thật và tiền đề ảnh/receipt. Không đổi model, verifier, source, corpus, runtime hoặc tool declaration. Default `owner.vi.txt` và B2/B3 vẫn baseline; explicit candidate registration chỉ áp vào eval arm.

Một owner Vertex global `gemini-3.5-flash-lite`, HIGH; tối đa một verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2/toolsnone. Exact config, generation settings, prompt/schema/corpus/source hashes trong REGISTRATION.json/manifest và arm files. API/client/credential route giữ nguyên.

## Review toàn12 hội thoại

6 tình huống ×2 bản ×1 lần. Chạy native AUTO tool loop, không replay tools-OFF. [Exact hội thoại và lý do từng câu](CONVERSATIONS_AND_REVIEW.md), [primary review](PRIMARY_REVIEW.json).

| Tình huống | Baseline | Thêm ví dụ | Nhận xét |
| --- | --- | --- | --- |
| Lo ren rườm rà | NEEDS_EDIT | USABLE_WITH_POLISH | Candidate bỏ lời mời lên đơn ngoài B1; giọng/lý do vẫn tương tự. Suy luận thẩm mỹ từ form/rũ được phép. |
| Quen đồ trơn, đi cưới | NEEDS_EDIT | NEEDS_EDIT | Candidate có lý do đi tiệc diện hơn thường ngày và ưu tiên rõ hơn, nhưng ba đoạn vẫn nhiều lời khen. Control còn mở nhiều lựa chọn. |
| Mua áo hay bộ để mặc lại | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Cả hai chọn bộ hợp lý; candidate gọn hơn, giữ cách mặc nguyên bộ và phối áo với váy đen khách có. |
| Đổi sang gặp khách, muốn gọn | USABLE_WITH_POLISH | NEEDS_EDIT | Candidate giữ bộ với lợi ích đồng bộ/giá trị chung, chưa so sánh tốt theo ưu tiên mới; control giải thích lựa chọn áo lẻ sát hơn. |
| Chất liệu/giá/tồn khi POS thiếu | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Cả hai giữ unknown và trả phần có nguồn. Chỉ chứng minh xử lý thiếu nguồn, chưa hoàn tất bán hàng. |
| Hỏi giá cả bộ | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Cả hai trả một câu799k; candidate không lặp đoạn quảng cáo của run trước. |

**Mỗi arm4/6 dùng được,2/6 cần sửa.** Candidate có tiến bộ cục bộ về CTA khả thi, giọng ở ca mua bộ và ưu tiên ở ca đi cưới, nhưng vẫn kém hơn ở ca đổi hoàn cảnh. Không lấy nhãn bằng nhau để phủ nhận khác biệt từng cặp. Giọng chưa đạt ổn định như hội thoại mẫu.

Review là agent, không blind/human adjudication. SCOPE ghi trước provider: tách lỗi logic tư vấn/giọng/capability/source; nhận xét thẩm mỹ và upsell hợp lý được phép. Vì đã làm rõ cách review so với run trước, **không dùng2/6 trước→4/6 hiện tại như bằng chứng nhân quả**. Giữ nguyên primary cũ; chỉ so hai arm trong run này dưới cùng tiêu chí.

Chọn set không tự là lỗi, cũng không bắt chọn áo lẻ. S07 cần sửa vì lý do chính đồng bộ/chuyên nghiệp hơn rất nhiều/lợi hơn chưa giải quyết tốt câu hỏi nhìn gọn hơn so với áo lẻ. “Không bị vướng víu” còn là trấn an mạnh và không đúng băn khoăn đang hỏi; chưa tự adjudicate thành false PASS protected safety hoặc đổi verifier. “Lợi hơn” không đồng nghĩa tuyên bố799k thấp hơn499k.

## Provider và audit

-36 upstream requests =24 owner+12verifier, mỗi generation1request;0error/timeout/retry.12SEND_ELIGIBLE, verifier12PASS,0fallback/handoff/no-send. Mọi draft qua hardprecheck đều verify/final gate; không sửa/verifier bypass.
-14child commands (preflight/sourcecheck/12turns) đều exit0. Sourcecheck1embedding, attempts0embedding; báo riêng, không cộng vào36generations.
-24owner prompt captures khớp exact arm hashes; native read tools/history giữ nguyên;0evaluator-label leaks ở owner/verifier.12binding recomputed và12exact eligible texts khớp verified draft.
-Sáu cặp có initial evidence khớp khi bỏ observation timestamps; final source versions khớp toàn6. Không lấy source drift để giải thích khác biệt ở đây.
-13frozen executable/config/input files không đổi từ source seal;65raw copied exact bytes,65Git blobs khớp ARTIFACT_INDEX; primary hash khớp lock. Credential-pattern scanPASS, không private checkout ingress.
-Không phát hiện dữ kiện giả định của ví dụ được đưa ra như giá/hàng/receipt thật trong12actual replies. VerifierPASS không tự là bằng chứng chất lượng hoặc semantic safety ngoài tập này.

## Operational measurements

| Chỉ số | Quan sát |
| --- | --- |
| Owner per-generation p50/p95 | 2,849s /5,943s |
| Verifier p50/p95 | 5,043s /6,661s |
| Added verification/readback p50/p95 | 5,736s /7,373s |
| Owner input/output tokens | 94.951 /17.689 |
| Verifier input/output tokens | 58.090 /749 |
| Missing usage | 0 |
| Provider error/timeout | 0/36 |
| Fallback/handoff/no-send | 0/12 mỗi loại |
| Cost | NOT_EXPOSED |

Latency không gồm setup credential/source của từng child. Output tokens có thể gồm reasoning. Không so latency hai role như cùng workload. Chi tiết METRICS.json và BINDING_AND_ACCOUNTING.json.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#62/62PASS
pnpm --filter @lana/worker build
#exit0
python C:/Users/nguye/AppData/Local/Temp/c3-prepare-additive.py
#prepared candidate/registration/tasks; exact prefix/suffix and runner AST checksPASS
python apps/worker/evals/single-agent-commerce-read-only/advice-examples-additive-20261021/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-advice-examples-additive-20261021
#exit0; exact child argv/status in raw/commands.json
python C:/Users/nguye/AppData/Local/Temp/c3-additive-audit.py actual
python C:/Users/nguye/AppData/Local/Temp/c3-additive-capture.py
python C:/Users/nguye/AppData/Local/Temp/c3-additive-audit.py audit
node C:/Users/nguye/AppData/Local/Temp/c3-additive-bindings.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-additive-finish.py
#postprocess only; identity/wire/binding/raw checksPASS
git diff --cached --check
#PASS
```

Also native readB1OwnerPrompt candidate load/hash/bound checkPASS, recorded in VALIDATION.json. Existing postprocess copies were prepared by c3-prepare-additive-audit.py; no generation. Display Markdown only trims trailing whitespace; raw unchanged. No separate lint/typecheck/full-unit or B2/B3 provider rerun. Prompt-only change, no new logic or RED→GREEN claim.

## Kết luận và điểm dừng

**Giữ baseline; dừng sau12 theo đăng ký.** Việc giữ lại toàn bộ chỉ dẫn không đủ làm mọi ca tốt hơn. Có tín hiệu tốt cục bộ nhưng hồi quy ở đổi hoàn cảnh; chưa đạt yêu cầu không có regression. Không nối thêm ví dụ, sửa câu theo ca hoặc tự chạy full/đổi model. Một mẫu mỗi arm trên ca đã biết, chủ yếu một sản phẩm không xác định được ổn định hay giới hạn năng lực model; chưa kết luận mọi few-shot đều thất bại. Chưa kiểm B2/B3, stateful correction, ảnh, phản đối giá đối thủ hoặc conversion.

Complexity delta:0runtime logic/roles/layers/gates/state; một candidate prompt, frozen registrations và wrapper34lines tái dùng runner. Không publish source, deploy, live send hoặc đổi default. A OWNER_BYPASS; không B/live GO.
