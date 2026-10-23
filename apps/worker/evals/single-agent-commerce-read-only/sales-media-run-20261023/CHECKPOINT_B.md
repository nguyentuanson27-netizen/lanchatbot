# Phase B — sửa hai P2 và chạy tư vấn/media, 23/10/2026

**COMPLETE_12_OUTCOMES — KEEP_BASELINE_ADVICE; B chưa GO.** Implementation/run source `6cd998c0c0003a0e6f30068cb2941bb8d2dd7b73`; base review `a402e94b`. [12 hội thoại và actual attachments](CONVERSATIONS.md), [whole-turn review](PRIMARY_REVIEW.json), [metrics](METRICS.json), [request accounting](REQUEST_ACCOUNTING.json), [registration](REGISTRATION.json).

## Bản sửa đã thực hiện

- `selectPriceCardImages` ưu tiên góc đã biết khác ảnh chính trước, sau đó giữ thứ tự/fallback cũ nếu không có góc bổ sung. Thêm regressions main SIDE/main BACK, không suy góc từ pixel. Approval/host/freshness/part filtering của commerce media vẫn chạy trước helper; legacy URL fallback vẫn bị tắt trong seam này.
- Provider media loop lưu attachment thực capture theo attempt: type, exact public URL, sequence. Dùng capturePayloads sẵn có, ghi riêng media cohort; không ghi recipient/token hoặc lẫn ảnh lượt trước. Helper eval11dòng, không delivery/gate/state mới. Tests giữ hai URL khác nhau và ranh giới lượt.
- Hai lỗi đều observed RED trước GREEN. Không sửa thêm prompt/verifier sau khi thấy provider outcome. Source commit sạch trước freeze, HEAD và executable/config giữ nguyên suốt dispatch. Raw bytes giữ bằng evidence-local `* -text`; không thay config chạy model.

## Population và kết quả

Chạy đúng4native media +8paired text diagnostic, N1, không full39 hoặc A2/A3. Diagnostic không phải current native send eligibility; dùng captured public world/clock/history cũ giống nhau giữa hai arm, toolsOFF. Media qua real PostgreSQL cô lập, source công khai hiện hành và capture transport; không gửi khách thật. Một temporary DB đã drop.

| Population | Denominator | SEND_ELIGIBLE theo gate của mode | Fallback | Provider error |
|---|---:|---:|---:|---:|
| Native media |4|3|1 UNCERTAIN|0|
| Text diagnostic baseline/candidate |8|8|0|0|

Native whole-turn review riêng: **2 dùng được /1cần sửa /1fallback**. Không coi3PASS là3ca tư vấn bán hàng tốt.

| Ca media | Actual kết quả | Finding |
|---|---|---|
| Cận thêu |1ảnh CLOSEUP/DETAIL, parts AO; lời dẫn đúng việc | Dùng được; “Chị xem giúp em nha” dư nhẹ |
| Feedback |Static fallback C3_A_NONPROTECTED_V2 | Nguồn hiện không có feedback đã duyệt; draft nói chưa có nhưng verifier UNCERTAIN |
| Mặt sau |1ảnh BACK/FULL_SET, lời dẫn ngắn | Dùng được |
| Phân vân ren |Chủ động chọn/gửi1ảnh DETAIL/AO | Reply dài, mở áo lẻ rồi cảbộ. Ảnh cận áo phù hợp nhánh áo lẻ nhưng chưa giúp nhìn tổng thể set khách đang lo; chưa thuyết phục tốt |

Cả3URL thực giao khớp metadata trong live source audit; exact URLs và thứ tự nằm trong mỗi provider-attempt. Không có view_product_media trong4ca này: chưa có bằng chứng model xem ảnh rồi tư vấn. GENERIC không được gọi trong campaign này: sửa khác góc được chứng minh bằng regression tests, chưa thực chứng provider chọn cặp GENERIC.

## Đối chiếu prompt tư vấn

Baseline hash `27aaf35d22a6209512eeeddbc11b169eede5bd15bc6f8e2c9ed1c867301da6a9`; candidate identity/hash nằm trong advice/registration.json và preparation/ADVICE_CANDIDATE.json. Active owner/verifier và models không đổi. Bốn cặp đã freeze trước kết quả, thứ tự arm xen kẽ, không chọn best-of-N. Chấm thủ công toàn terminal, không blind, không keyword score.

| Tình huống | Candidate so baseline | Giọng và quyết định |
|---|---|---|
| Lo ren/rườm rà, ngân sách900k | Vào nỗi lo trực tiếp hơn | Cảhai còn mềm/rũ/thanhthoát/baybổng, chưa thuyết phục khác rõ |
| Tiệc chuyển ngoài trời, dễ nóng | Bớt vòng vo hơn cặp baseline | Baseline bảo cân nhắc thêm; candidate trả cảm giác mặc trực tiếp hơn, vẫn hơi lệch sang “không nặng nề” |
| Quen đồ trơn, hỏi có nên lấy | Regression về quyết định | Baseline chọn cảbộ rõ; candidate lại mở áo lẻ sau lời khuyên nguyênset |
| Có váyđen, muốn mặc lại | Không khác rõ | Cảhai chọn cảbộ799k và giải thích đồngbộ/tácháo hợp lý |

**Không promote candidate.** Hai cặp rõ hơn một phần, một regression, một tương đương; chưa có cải thiện rõ về giọng/sức thuyết phục. Không claim stability từN1 hoặc dùng8verifierPASS làm qualityPASS. Giữ finding giọng tách khỏi outcome dùngđược.

## Feedback fallback: quan sát và giới hạn nguyên nhân

Audit live đọc Qdrant qua adapter hiện hữu: SV2447 có11ảnh, SQ748 vàSQ634 mỗi mẫu7ảnh; cảba0feedback. Ca feedback gọi đúng FEEDBACK, nhận NO_VERIFIED_MATCHING_MEDIA; không tráo ảnh người mẫu. Owner draft nói shop chưa có ảnh khách mặc rồi thêm mô tả và mời khách hỏi ảnh cận; actual khách nhận chỉ static fallback.

Captured verifier wire không có NO_VERIFIED_MATCHING_MEDIA, MEDIA_ONLY, FEEDBACK hoặc media: literal. Nó có finalDraft và product content nhưng không mang kết quả đọc ảnh không có match. **Gap truyền bằng chứng đã xác nhận**; verdict chỉ UNSUPPORTED_PROTECTED_ASSERTION/product:SV2447, không có span, nên chưa chứng minh gap này là nguyên nhân duy nhất. Không tự gọi đây claim công năng sai hoặc nới verifier để cứu run. Hướng sau: giữ kết quả availability có scope ở đường trusted hiện hữu và nói đúng “chưa lấy được ảnh”; không biến thiếu match thành khẳng định mọi nguồn shop đều không có. Cần kiểm riêng trước khi thay.

## Accounting và vận hành

- **29generationrequests =17owner +12verifier**, dưới cap32.29uniqueIDs/29captured provider bodies; max1upstream generation/request,0automatic retry,0rejected client requests quan sát được. Auth refresh không generation và không retry generation.
- Verifier11PASS/1UNCERTAIN;0providererror/timeout. Mọi outcome giữ trong denominator, không chạy bù hay thay lỗi bằng lượt khác.
-0evaluator-only labels/caseIDs trong captured provider requests, gồm kiểm đệ quy các JSON-string context. Không thêm model judge/role mới.
- Verifier latency N12 p50 **7.192ms**, p95 nearest-rank **35.286ms**. Đây là sample nhỏ; p95 là maximum ởN12.
- Added verification stage: media N4 p50 **12.769ms**, p95 **38.997ms** (gồm readback); text diagnostic N8 p50 **6.868ms**, p95 **12.266ms**. Hai mode không cùng công việc nên không gộp làm so tốc độ trực tiếp.
- Case elapsed media p50 **34.472ms**, p95 **56.003ms**; diagnostic p50 **12.385ms**, p95 **17.821ms**. Gồm xử lý nguồn/case, không phải thời gian first token.
- Owner input82.810/output18.723/thinking17.505 tokens; verifier input58.285/output2.024/reasoning1.715. Theo telemetry adapter; thinking/reasoning không cộng lần nữa vào output. Cost không expose, không ước lượng.
- Exact model/provider/version/effort/config trong REGISTRATION và media/preflight: owner Vertex gemini-3.5-flash-lite HIGH/global/candidate1/max8192/thinkingHIGH/retry0; verifier OpenAI gpt-6.1-sol HIGH/Codex CLI0.159.2/boundedrelay/max1/toolnone/storefalse/retry0. Không substitute model hoặc credential route.

## Commands đã chạy

| Command | Kết quả |
|---|---|
| `pnpm --filter @lana/business-tools exec vitest run src/image-selection.test.ts` trước/sau sửa | RED2failed/20passed → GREEN22/22 |
| `node --test apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs` trước/sau helper | RED thiếu module → GREEN1/1 |
| `pnpm --filter @lana/business-tools exec vitest run src` | PASS359/23files |
| `pnpm --filter @lana/business-tools typecheck` | PASS |
| `pnpm --filter @lana/worker build` | PASS gồm dependency builds/shared build |
| `pnpm --filter @lana/worker exec vitest run src` | PASS1959/133files; worker-tests.txt |
| Node focused gemini-inference/protocol/advice-diagnostic/sales-journeys-registration/delivery-capture tests | PASS85; node-tests.txt |
| `pnpm --filter @lana/worker lint` (tsc --noEmit) | PASS |
| `node --check .../isolated-integration.mjs` | PASS |
| Existing Codex app-server `account/rateLimits/read` | ordinaryUsageAllowed true;0generation, sanitized quota-read.json |
| Existing credential launcher/source-session → source-audit.mjs | Live public read,0generation/0sourcewrite |
| Same launcher → isolated-integration.mjs COD --provider-run --candidate-handoff --media-probe --provider-preflight | PASS0generation |
| Same launcher → isolated-integration.mjs COD --provider-run --candidate-handoff --media-probe | Exit0,4outcomes,DBdropped |
| Same launcher → advice-diagnostic.mjs frozen8inputs/new-out | Exit0,8outcomes |
| collect.py/review.py | Accounting29wire/29generation,12whole-turn reviews; no provider |

Exact invocation arguments/paths in commands.json and run.py. No new remote CI/full eval suite/shared lint/deploy/live smoke claimed. Worker type safety checked by build and lint; no additional worker typecheck script was run in this iteration. JSON/secret-pattern scan PASS. Raw source hash preserved, no executable/config drift during campaign.

## Recommendation và phần còn mở

Giữ hai sửa code theo evidence; không promote advice candidate, chưa B GO. Media functionality cận/mặt sau đã có provider evidence nhưng chưa coverage feedback dương tính, vision advice hoặc provider GENERIC. Root cause của giọng/lựa chọn chưa đóng. Chưa full39/43, deadline controls/quote experiment hoặc live qualification. Dừng sau lượt đã đăng ký; không tự fix/rerun thêm.
