# Hội thoại mẫu đã duyệt — đã thử, chưa nên thay prompt hiện hành

Ngày 2026-10-21. **COMPLETE_12_STOP_NO_DEFAULT_PROMOTION**. Đã triển khai hướng owner vừa duyệt, self-review, kiểm tra local và chạy đủ12/12 lượt. A vẫn OWNER_BYPASS; không A PASS/B live GO.

## Đã thay đổi gì

- Dùng5 hội thoại owner duyệt, giữ nguyên lời khách/shop. Thay phần hướng dẫn tư vấn/giọng đang lặp bằng hướng dẫn ngắn và các ví dụ. Không đưa đáp án Thạch Thảo hoặc giá trong benchmark vào prompt.
- Nêu rõ dữ kiện minh họa không phải nguồn hàng/state của shop; ví dụ xem ảnh có tiền đề shop xem được ảnh, câu báo đổi màu có receipt thành công. Các ví dụ không cấp quyền/tool mới.
- Khối nguồn/tool, ranh giới suy luận, size/state/giao dịch và policy giữ nguyên. Model, verifier, nguồn hàng/policy, corpus và runtime không đổi.
- Candidate13.386bytes so baseline12.135bytes (+1.251bytes, khoảng10,3%). Đây là thay đổi kết hợp ví dụ và rút chỉ dẫn lặp, không tách riêng được tác dụng từng phần. Không lấy độ ngắn prompt làm mục tiêu.
- Chọn candidate qua frozen registration sẵn có; không đổi prompt mặc định `owner.vi.txt`, không đưa candidate vào B2/B3. Không thêm role, parser, semantic router, repair loop, state, gate hay provider framework.

Base `0a88766d857b77f048cce93ea528c309892992bb`; run source `1a6ca78fba2c665811e81556f0846b0e5639900c`; primary review khóa tại `05fb5b8b` trước diagnosis. Candidate SHA256 `8ed038312c9bb28d6410818a34646148e4b3ac1ded061f071f13f06e29eb7b70`. Exact model/config/corpus/prompt hashes: REGISTRATION.json và hai arm registrations. Prompt source: [owner-examples.vi.txt](../prompts/owner-examples.vi.txt).

## Kết quả khách thực nhận

6 tình huống hiện có ×2 bản ×1 lần =12 outcomes. Native B1 AUTO/tool history, không replay tools-OFF. Bốn ca tư vấn đã review cộng một ca nhiều yêu cầu khi POS không khả dụng và một ca chỉ hỏi giá. Không dùng5 ví dụ làm câu hỏi test.

| Ca | Đối chứng | Có ví dụ | Nhận xét |
| --- | --- | --- | --- |
| B1–7: lo ren nhiều | NEEDS_EDIT | NEEDS_EDIT | Candidate bỏ CTA kiểm tra size và ngắn hơn, nhưng vẫn giải thích bằng mềm/rũ/thanh thoát thay vì giải quyết rõ lo trang trí. |
| B1–15: quen đồ trơn | NEEDS_EDIT | NEEDS_EDIT | Vẫn khen dài rồi đưa hai hướng chưa rõ ưu tiên; không hơn rõ. |
| B1–23: áo hay cả bộ | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Hai lựa chọn đều hợp lý. Candidate dùng đúng chênh300k để upsell, control chọn áo dùng cùng váy có sẵn. Không tự chấm mua nhiều hơn là tốt hơn. |
| B1–17: đổi sang gặp khách hàng | USABLE_WITH_POLISH | NEEDS_EDIT | Candidate chọn áo trước rồi lại quảng bá set và hỏi khách chọn; control giữ lựa chọn áo. |
| B1–3: vải/giá/tồn khi POS thiếu | USABLE_WITH_POLISH | USABLE_WITH_POLISH | Cả hai giữ phần có nguồn, không bịa giá/tồn hoặc hứa theo dõi. |
| B1–12: hỏi giá cả bộ | USABLE_WITH_POLISH | NEEDS_EDIT | Control một câu799k; candidate thêm giá lẻ, lời khen chất liệu và mời tư vấn size ngoài capability B1. |

**Đối chứng4/6 dùng được, candidate2/6 dùng được** theo agent review; cả12 verifierPASS/send-eligible,0fallback/handoff/no-send. USABLE_WITH_POLISH không có nghĩa đã hoàn hảo về giọng. Không có human owner adjudication hay blind review. [Toàn bộ12 hội thoại](CONVERSATIONS_AND_REVIEW.md), nhãn và lý do khóa trong PRIMARY_REVIEW.json.

Không đánh lỗi bằng số từ, ngoặc, tính từ hay việc chọn món đắt hơn. Câu s06 có lợi ích bán hàng thực: thêm300k có chân váy, vẫn phối áo với chân váy đen của khách. Tuy nhiên, học được cách so giá chưa đồng nghĩa đã học được cách dừng, ưu tiên nội dung hoặc giọng tự nhiên.

## Finding và giới hạn suy nguyên nhân

1. Cùng kiểu lời khen mềm/rũ/bay vẫn xuất hiện ở nhiều băn khoăn khác nhau. Ví dụ chưa tạo thay đổi rõ trong cách chọn lý do để thuyết phục khách.
2. Candidate nhận ra hướng áo lẻ ở B1–17 nhưng tự mở lại lựa chọn cả bộ. Đây là vấn đề giữ ưu tiên và kết thúc lời tư vấn, không đơn thuần thiếu hiểu từ khóa của khách.
3. Ở B1–12, candidate gọi `read_product(SV2447)` và nhận mọi offer; control gọi `read_product(SV2447, SET_VAY)` và nhận đúng offer cả bộ. Sau đó candidate kể cả giá lẻ và chất liệu. Đây là dấu vết khác biệt trong chọn phạm vi đọc rồi dùng thông tin; chưa chứng minh tool response hay prompt riêng lẻ là nguyên nhân duy nhất.
4. Verifier đã cho qua cả12; lần này verifier không gây fallback hoặc làm mất câu tư vấn. Vấn đề nằm ở chất lượng lời đáp owner được gửi. Không sửa verifier để chấm giọng.
5. Không thấy dữ kiện giả định của5 ví dụ bị trình bày như hàng/giá/state thật. Ca thiếu POS không điền giá690k/420k từ ví dụ. Không phát hiện lời báo thao tác thành công theo receipt giả trong actual replies.

Chưa kết luận few-shot luôn không hiệu quả hoặc model đã chạm trần. Một lần mỗi arm, tình huống đã biết và chủ yếu một sản phẩm không đo được ổn định/khái quát. Chưa kiểm phản đối giá đối thủ, ảnh, stateful correction, B2/B3 hoặc conversion. Hai hồi quy quan sát được đủ để không promote candidate hiện tại.

## Request, nguồn và boundary evidence

-36 upstream generation requests:24 owner +12 verifier, mỗi generation đúng1 request;0error/timeout/retry. Không bỏ attempt, không mẫu bù.14 child commands (preflight/source-check/12 slots) đều exit0. Source-check dùng1 embedding call riêng; attempts0embedding.
-Owner Vertex global `gemini-3.5-flash-lite`, HIGH. Verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2/toolsnone. Reuse API/credential route, không thay provider/client.
-24 captured owner prompts khớp hash arm; native tools/history giữ nguyên;0evaluator label leaks ở owner và verifier.12binding recomputed bằng `makeBinding`;12exact send-eligible texts khớp final draft được verify.
-Sáu cặp có initial evidence khớp khi bỏ timestamp quan sát; tập source versions cuối khớp cả6. B1–12 khác số/path claims do owner chọn phạm vi offer khác, không phải version drift. Audit giữ nguyên sự khác biệt đó.
-13 frozen files không đổi sau seal; runtime HEAD capture ở raw/RUN_SOURCE.json.65raw files được copy nguyên byte,65Git blobs khớp index; primary hash khớp lock. Secret-pattern scanPASS; B1 không có private checkout ingress.
-Không ghi nguồn shop, deploy hoặc live send. Code final gate/readback hiện có vẫn quyết định eligibility.

## Vận hành

| Chỉ số | Kết quả |
| --- | --- |
| Owner latency mỗi generation p50/p95 | 2,784s /5,608s |
| Verifier latency p50/p95 | 5,332s /9,856s |
| Added verification/readback latency p50/p95 | 6,168s /10,768s |
| Owner input/output tokens | 91.032 /17.273 |
| Verifier input/output tokens | 57.381 /1.011 |
| Missing usage | 0 |
| Fallback/handoff/no-send | 0/0/0 trên12 |
| Provider timeout/error | 0/0 trên36 requests |
| Cost | NOT_EXPOSED |

Output usage có thể gồm reasoning. Latency không gồm setup credential/source của mỗi child; hai role không phải benchmark tốc độ hai model. Chi tiết METRICS.json/BINDING_AND_ACCOUNTING.json.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#62/62PASS
pnpm --filter @lana/worker build
#exit0
python apps/worker/evals/single-agent-commerce-read-only/advice-examples-20261021/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-advice-examples-20261021
#exit0, all12 complete; exact child argv in raw/commands.json
python C:/Users/nguye/AppData/Local/Temp/c3-advice-examples-audit.py actual
python C:/Users/nguye/AppData/Local/Temp/c3-examples-capture.py
python C:/Users/nguye/AppData/Local/Temp/c3-advice-examples-audit.py audit
node C:/Users/nguye/AppData/Local/Temp/c3-examples-bindings.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-examples-finish-audit.py
#postprocess only, no generations; identity/wire/binding/raw checksPASS
git diff --cached --check
#PASS after removing one extra EOF blank line in display Markdown; raw unchanged
```

Also ran native prompt-registration load/hash/bound check and Python AST check, bothPASS; exact checked artifacts in VALIDATION.json. Temporary Python prepared prompt/registration/tasks before seal. One shell-quoting error while preparing the audit helper was corrected before execution; it dispatched no provider request. No separate worker lint/typecheck/full repository rerun; no new production logic or RED→GREEN claim for the prompt edit.

## Quyết định

**STOP sau đủ12, giữ baseline.** Không đạt tín hiệu cải thiện ở ít nhất2/4 cặp tư vấn, còn kém hơn ở ca đổi hoàn cảnh và hỏi giá. Không tiếp tục nhồi ví dụ, sửa từ rồi chạy bù trong cùng lượt; không tự chạy full B hoặc đổi prompt mặc định. Candidate và raw được giữ để review. Complexity delta:0 runtime code,0 semantic roles/layers; một prompt candidate, registrations và34line wrapper dùng runner có sẵn, cùng evidence/report.
