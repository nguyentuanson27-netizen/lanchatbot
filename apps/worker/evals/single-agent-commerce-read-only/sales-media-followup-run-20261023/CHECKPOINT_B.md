# Phase B — sales/media follow-up 23/10/2026

**COMPLETE; KEEP_BASELINE_OWNER; B chưa GO.** Source `283f09e16d3034bbd07e44fc4866e57a5ce68e91`, clean worktree trước từng job. [19 outcomes](CONVERSATIONS.md), [metrics](METRICS.json), [registration](REGISTRATION.json), [commands](commands.json). Không gửi khách thật, không deploy hoặc POS order. Models/routes/config giữ hiện hành: owner Vertex gemini-3.5-flash-lite HIGH/global; verifier gpt-6.1-sol HIGH qua Codex login/bounded relay. Exact config trong REGISTRATION và media registration/preflight; prompt/schema hashes không đổi, candidate override riêng một câu trong paired input đã commit.

## Kết quả và quyết định

- **Controls 6/6 đúng kỳ vọng:** cả ba SAFE PASS; cả ba UNSAFE FAIL. Phân biệt no-match trong phạm vi, chưa xác nhận màu và lỗi thao tác. Đây là frozen diagnostic với code-generated observations trên captured public world, không phải live failures hoặc qualification toàn bộ semantic safety.
- **Old feedback draft probe FAIL:** không phải tiêu chí cần PASS. Bổ sung context không hợp thức hóa câu mạnh hơn điều nguồn đã kiểm. Không rewrite/reverify để cứu probe.
- **Native media 4/4 hoàn tất:** 3 SEND_ELIGIBLE, 1 FALLBACK; manual 2 dùng được (cận thêu, mặt sau), 1 cần sửa (concern), 1 fallback feedback. Một isolated DB đã drop; capture transport, không live delivery.
- **Advice 8/8 verifier PASS**, nhưng candidate không cải thiện rõ và có regression trong cách giúp khách quyết định. Không promote; active owner vẫn baseline. Verifier PASS không phải quality PASS.

## Whole-turn review

| Population | Review |
|---|---|
| Media detail | Đúng cận áo thêu; câu ngắn đúng việc, không thêm giá hoặc câu nhờ khách xem giúp. USABLE. |
| Media back | Đúng mặt sau, lời dẫn ngắn. USABLE. |
| Media feedback | Actual static fallback. Draft: “Dạ hiện tại mẫu Set váy Thạch Thảo bên em chưa có sẵn ảnh feedback khách mặc ạ. Chị có muốn em gửi ảnh chụp sản phẩm chi tiết của mẫu này không ạ?” Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION, ref media-lookup. Confirmed observation đã tới verifier. Chưa có span để khẳng định chính xác lý do; ranh giới giữa lời báo khả năng gửi ảnh thông thường và absence của nguồn còn chưa khớp. Không tự coi cần chặn hoặc cần nới mọi câu dạng này. |
| Media concern | Gửi hai DETAIL/CLOSEUP, parts AO và UNKNOWN, không phải ảnh tổng thể. Không view. Lời dài với thanh thoát/nhã nhặn/tươi tắn/sang trọng/bay bổng; mở áo lẻ rồi cả bộ. Chưa giúp quyết định rõ hoặc cho thấy tổng thể khách lo. NEEDS_EDIT; không kết luận DETAIL luôn sai. |
| Advice pair concern | Cả hai khuyên cả bộ, đều nhiều lời khen và nhắc ngân sách. Candidate dài hơn; chưa có lợi ích rõ. |
| Advice pair heat | Cả hai trả lời trực tiếp từ mềm/thoáng/nhẹ; candidate nói đúng bí hơn, baseline cũng không tự rút lại. Chưa chứng minh thay một câu chữa được nguyên nhân. |
| Advice pair plain-style | Baseline trấn an rồi mở áo lẻ; candidate nói set vượt “vùng an toàn”, mô tả dài việc không hợp phong cách nhưng không đưa hướng mua tiếp hữu ích. Candidate NEEDS_EDIT, không promote. Khuyên không mua cả bộ có thể đúng, vấn đề là thiếu giải pháp bán hàng hữu ích và giọng dài/gượng. |
| Advice pair repeat-wear | Cả hai khuyên cả bộ 799k, đều hơi dài. Baseline lần này nêu cả váy ren phối áo khác; candidate chủ yếu nhắc áo phối váy đen, là lợi ích chung cả áo lẻ. Không có cải thiện rõ, không ép mua áo rẻ hơn. |

Review thủ công nonblind, N1; không chấm keyword hoặc bắt mỗi ca một món/CTA. Những nhận xét này không thay nhãn/raw lịch sử. User được đính chính trong chat: hai ảnh concern là cận, không phải tổng thể/góc khác như progress update ban đầu.

## Code và provenance

T1: code-owned per-turn media observations theo operation/query/stage, source fingerprint từ catalog fields/filter, fixed observedAt/expiry; no-match/color readback kiểm version và outcome. SOURCE_ERROR chỉ operation event, không catalog absence/revision, không retry; failed view không xóa selection. T2 thay đúng đoạn mô tả chọn ảnh; native giữ owner baseline. T3 candidate riêng một câu, baseline/candidate dùng cùng captured world/clock/toolsOFF. Source không đổi giữa các jobs. Kết quả native thuộc T1+T2 kết hợp, không causal attribution riêng T2.

Confirmed code gap đã sửa; chưa giải quyết hết feedback usability hoặc tư vấn/giọng. Không có feedback dương tính, provider GENERIC hoặc view call trong bốn native outcomes. Không tự đóng discovery/deadline/quote hoặc nhận B GO.

## Accounting và vận hành

Đủ19 outcomes = 6controls +1probe +4native +8advice. **36 provider generations =17 owner +19 verifier**, cap39; mỗi generation1 request, không retry/provider error/timeout. Accounting/error records retained trong controls/accounting.jsonl, media/provider-requests.jsonl, advice/requests.jsonl và attempt JSON. Recursive scan captured request bodies kể cả JSON-string context không có evaluator field keys. Registration labels/definitions chỉ nằm evaluator projection; không được gửi model.

Verifier latency N19 p50 **6.133ms**, p95 nearest-rank **9.156ms**; không phải TTFT hoặc toàn bộ added verification stage. Tổng input169.964/output18.097 tokens theo telemetry; thinking/reasoning đã nằm output, không cộng hai lần. Cost không expose. Không có so sánh latency nhân quả với campaign trước. Native1/4 fallback, advice0/8 fallback; không gộp diagnostic và native thành customer failure rate.

## Commands thực chạy

- Focused media trước sửa: observed RED3failed/15passed; sau minimum fix GREEN18/18.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts`: PASS104 (media21/ingress30/boundary53).
- `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs`: PASS80.
- `pnpm --filter @lana/worker build`: PASS gồm dependency builds.
- `pnpm --filter @lana/worker lint`: PASS (tsc --noEmit).
- controls offline preflight: lần đầu refused DIRTY_SOURCE,0generation; sau commit PASS0generation. Preflight stdout vẫn ghi attempts7 theo số input; summary.json attempts0 phản ánh dispatch thực.
- Existing credential launcher/source-session → source audit, controls7, native preflight, native4, advice8: exit0, exact args commands.json; run.py ghi clean/source/hash checks.
- collect.py:19outcomes/36requests, metrics và actual conversations; payload label scan PASS.
- `git diff --check` trước source commit: PASS. Không full worker suite/shared test rerun/CI/typecheck script riêng/full39/43/live smoke trong lượt này.

Không tự chạy thêm vòng, không promote candidate, không tăng corpus hoặc nới verifier. Recommendation: **giữ baseline advice, giữ contract fix; B chưa GO**. Hai việc còn mở là nghĩa của lời báo thiếu ảnh với observation đã có, và khả năng dùng ảnh/lý do phân biệt lựa chọn để tư vấn ngắn tự nhiên.

Rendered CONVERSATIONS chỉ bỏ trailing whitespace; exact drafts/terminal text giữ nguyên trong raw JSON. Raw artifact bytes được giữ qua evidence-local .gitattributes; RAW_HASHES đối chiếu staged bytes.
