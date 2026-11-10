# Full B1/B2/B3 — đủ32lượt, còn finding tư vấn và2fallback

2026-10-21. **FULL32_COMPLETE_REPLY_QUALITY_NOT_COMPLETE**. Owner yêu cầu chạy full sau diagnostic; đã chạy hết24B1 và8stateful, mỗi ca1lần, không quality early stop/retry/mẫu bù. A vẫn OWNER_BYPASS; không B/live GO.

## Phạm vi và nguồn chạy

-Preparation base `d94d2cf5f7ca25a6e8ebd19278c967eebdb1788a`; run source `a3c0411781bd9ee11d424b7ec019d2bccb02c279`; primary locked `7882b47fe5216f55636032a072de3682cbf505ca` trước diagnosis. Primary SHA256 `faee6941a35f4e09d2392bfac9cc34b11b9563dd3dfdf3abb8ba9214a242f624`.
-Cả B1/B2/B3 dùng exact additive candidate: prompt baseline nguyên byte cộng5ví dụ đã duyệt, SHA256 `a7fc3efe8ca821c16bbba4692ac04cb2d4f8748e26a36d5091bcd79ad51e38e6`,14.870bytes. Tạm pin eval owner.vi.txt và manifest vì stateful reader đọc chúng trực tiếp; không thêm selector/runtime code.
-Owner Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2/toolsnone. Exact model/config/schema/fallback/corpus/source hashes trong REGISTRATION.json và raw child registrations. API/client/credential route không đổi.
-Sau audit đã khôi phục exact2blobs owner.vi.txt/manifest.json từ preparation base, ghi BASELINE_RESTORATION.json. Source của kết quả vẫn là commit candidate đã seal; restoration là thay đổi sau run, không viết lại identity của evidence.

## Kết quả actual

| Population | Đủ lượt | Dùng được | Cần sửa | Fallback /control |
| --- | --- | --- | --- | --- |
| B1 | 24/24 | 18 | 4 | 2fallback |
| B2/B3 stateful | 8/8 | 6 | 1 | 1HUMAN silence control |

Agent review whole history/actual outcome/state trước verdict diagnosis, không blind/human adjudication. USABLE chấp nhận polish nhẹ, không có nghĩa giọng đã hay hay bán hàng ổn định. Historical primary giữ nguyên; không dùng thay đổi cách chấm giữa các run để tuyên bố tiến bộ. [Toàn32hội thoại](CONVERSATIONS_AND_REVIEW.md), [7ca fallback/cần sửa](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json).

**B1 cần sửa:** ca4 hỏi giá set nhưng mở lại mua bộ/lẻ; ca9 trấn an ngoài trời không bị bí quá mạnh với khách dễ nóng; ca15 khen dài nhưng lý do theo gu đồ trơn còn mỏng; ca21 báo giá/tồn đúng rồi đề nghị lên đơn ngoài capability B1. Không đánh lỗi bằng keyword, ngoặc, số fact hay buộc mua rẻ. Ca7 được chấp nhận tư vấn thẩm mỹ từ form/rũ; ca23 upsell có cách dùng lại hợp lý, vẫn còn lời quảng cáo cần polish.

**Stateful cần sửa giọng:** ca4 state sửa đúng eo74/mông96, giữbeL×2, nhưng reply còn báo cáo cập nhật số đo kèm ngoặc. Việc trích số đo không tự là lỗi; finding nằm ở cách xác nhận giống phần mềm theo phản hồi owner. Ca2 cũng dùng từ cập nhật nhưng xác nhận đổi số lượng rõ/gọn nên chỉ polish, không chấm hỏng mọi câu có từ đó.

**Các ca thiếu nguồn3/11/19:** cố ý POS_UNAVAILABLE, trả được phần mô tả và giữ unknown giá/tồn. Đây là xử lý fault đúng, không chứng minh đã hoàn tất bán hàng; không quy missing source cho model. Ca11 nói chưa tra việc bán riêng vẫn là unknown, không tự nói shop không bán lẻ.

**B1–1 cần owner xem mức trấn an:** model tìm váy Diệp An để thay cho chuyến xe3giờ, nguồn có2lớp/đứngform/suông nhẹ. Lời hạn chế nhăn nhiều/ngồi xe thoải mái hơn mạnh hơn mô tả. Owner đã cho inference chất liệu/giữform và ít nhăn, nên chưa tự adjudicate thành unsafe falsePASS; lưu ranh giới cần review, không thêm phép thử bắt buộc hoặc regex.

## Hai fallback cụ thể

1. **B1–5 — hỏi áo sizeM còn và giá:** hai owner generations thành công, verifier nhận HTTP200 nhưng stream kết thúc bằng `PROVIDER_STREAM_ERROR` tại GENERATION_STREAM. Một upstream request, không semantic verdict và thiếu usage verifier của attempt này. Fail-closed fallback đúng; chưa có bằng chứng quota/401/429 hoặc owner trả sai. Không retry.
2. **B1–17 — đổi sang gặp khách, muốn gọn:** draft giữ cả bộ rồi nói “mua cả bộ (799k) sẽ tiết kiệm hơn nhiều so với mua lẻ áo (499k)”. VerifierFAIL/CONTRADICTION_OR_NEGATION chặn đúng comparator. Không phải chặn giọng tư vấn hay cấm upsell. Đây là lỗi owner so giá/tìm lý do giữ món, đã quan sát ở run cũ; thêm ví dụ chưa ngăn ổn định. Không nới verifier để cứu.

Actual của cả2là fallback “Phần này em chưa trả lời được, chị nhé.”, ID C3_A_NONPROTECTED_V2. Draft chưa gửi không tính như trả lời thành công. Chi tiết FAILURE_DIAGNOSIS.json.

## B2/B3 mechanism và giới hạn

-Giỏ đầu áo beM×1, báo đặt trước; đổi thànhbeL×2 đúng yêu cầu. Quote998.000−49.900+30.000=978.100. Sửa số đo không đổi lựa chọn sizeL hoặc số lượng2; không tự coi khách tự chọn size là shop đã chứng minh mặc vừa.
-Lượt xin lên đơn tạo code invitation; model terminalNO_SEND/CHECKOUT_DETAILS_MISSING nhưng khách có actual code message. Lượt private tạo ORDER_PREVIEW/COD/preorder/ETA8–14 đúng; không đưa private input qua model. HaiNO_SEND ở đây không có nghĩa mất2câu khách cần.
-Xác nhận mua: PURCHASE_CONFIRMED/HANDOFF, capture tin chuyển nhân viên kiểm tra/lên đơn. Không tự tạoPOSorder. Yêu cầu người thật: HUMAN ownership và không thêmACK theo control.
-CODE holding/default policy dùng current source; isolated EXCHANGE/DEFECT candidate chỉ được kiểm trong deterministic branches, không publish hoặc ngầm wire vào provider. Tám stateful slots không có exchange/defect request; không claim cover phần này bằng provider.
-COD28/28 và BANK_TRANSFER28/28PASS; tất cả3database tạm (hai deterministic, một stateful) đã drop. Actual delivery capture-only, không Meta/Pancake send hoặc staff response. STATE_READBACK.json và DETERMINISTIC_AND_CLEANUP.json.

## Accounting và audit

-88upstream generation requests:60owner+28verifier; tất cả mỗi generation1request, retry0.1provider stream error,0timeout; request error rate1/88≈1,14%. Verifier26PASS+1FAIL+1error, không bỏ error khỏi denominator.
-B1:22eligible/2fallback; stateful4eligible/2codeNO_SEND/2HANDOFF. Fallback2/24B1=8,33%,2/32overall=6,25%; không gộp code terminal vào fallback.
-Embedding báo riêng: sourcecheck1+B1one+stateful0=2. B1counter là cumulative trong mỗi attempt, dùng completion counter1lần, không cộng24snapshot thành24calls.
-60owner captures exact candidate hash;28bindings recomputed;26exact eligible replies matched verified draft;92wire bodies checked/0evaluatorlabel leaks/private phone leaks. Metrics có120wirephasecaptures, không phải120requests.
-15frozen executable/config/input files khớp hash, không đổi từ source seal đến primary.49public rawfiles:41exactbytecopies+8attemptcopies chỉ bỏ private ingress batch.49Git blobs khớp published hashes. Secret/private-phone pattern scanPASS; primary hash khớp lock.
-Không phát hiện giá/sản phẩm/receipt giả định của ví dụ được dùng như dữ kiện thật trong32actual outcomes. Không gọi verifierPASS là bằng chứng chất lượng hoặc safety proof.

## Measurements

| Chỉ số | Quan sát |
| --- | --- |
| Owner per-generation p50/p95, n60 | 2,336s /6,120s |
| Verifier p50/p95, n28 (gồm error) | 6,093s /12,279s |
| Added verification/readback p50/p95, n28 | 6,918s /13,472s |
| Owner input/output tokens | 265.945 /39.325 |
| Verifier input/output tokens có báo | 120.927 /1.991 |
| Missing usage | 1verifier errored attempt |
| Cost | NOT_EXPOSED |

Latency không gồm setup credential/source của mỗi child; output tokens có thể gồm reasoning. Hai role khác workload, không phải model speed comparison. METRICS.json giữ số liệu theo family và đủ accounting của error.

## Commands đã chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#62/62PASS
pnpm --filter @lana/worker build
#exit0
python C:/Users/nguye/AppData/Local/Temp/c3-prepare-full-additive.py
#prepare exact eval pin, registration and wrapper
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-additive/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-additive
#exit0;6children exit0; includesCOD28/28+BANK28/28+8stateful+24B1
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-primary.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-additive
python C:/Users/nguye/AppData/Local/Temp/c3-full-additive-lock.py
python C:/Users/nguye/AppData/Local/Temp/c3-gemini-prompt-once-publish.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-additive apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-additive
python C:/Users/nguye/AppData/Local/Temp/c3-full-b123-metrics.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-additive apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-additive
node C:/Users/nguye/AppData/Local/Temp/c3-full-b123-audit.mjs C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-additive apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-additive 7882b47fe5216f55636032a072de3682cbf505ca
python C:/Users/nguye/AppData/Local/Temp/c3-full-additive-finish.py
#postprocess/audit/restore only, no generation
git diff --cached --check
#PASS
```

Also AST check wrapperPASS; inline Python verified49rawhashes/secret+phone scan, corrected postprocess embedding aggregation to completion counter1, and exact restoration hashes. Exact6childargv/status in raw/commands.json. No separate workerlint/typecheck/fullunit rerun claimed. No new runtime logic or RED→GREEN claim for eval prompt pin.

## Quyết định

**STOP sau full; giữ baseline.** Full đã chạy đủ theo owner, không tiếp tục sửa/chạy lại. Cơ chế giỏ/state/checkout/handoff hoạt động trong population này; chất lượng tư vấn và capability awareness còn finding, cùng lỗi so giá bị chặn đúng. Không chứng minh giọng đã cải thiện ổn định so với run trước vì mỗi ca1mẫu và có live source versions thay đổi theo thời gian; historical labels không sửa. Không autođổi model, thêm ví dụ/regex hoặc nới verifier.

Complexity delta:0runtime logic/roles/layers; evalpin+manifest, registration/wrapper tái dùng và evidence; đã hoàn nguyên pin exact. Không sourcepublish/deploy/livesend/defaultpromotion hoặc B/live GO.
