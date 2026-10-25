# Phase B — full input/context diagnostic, 25/10/2026

**COMPLETE 51/51 native slots + 17/17 scoped controls; B NOT GO.** mỗi ca một lần, không generation retry. Không tiếp tục sửa/rerun trong identity này. Checkpoint A vẫn OWNER_BYPASS; đây không phải qualification A2/A3 hoặc chứng minh an toàn tổng quát.

## Identity và dữ liệu đóng băng

- Run source: `9ecbbe5cd12e6a910c2b81f8271921846d55640a`; clean executable/config worktree khi dispatch, HEAD không đổi suốt run.
- Run implementationBaseSha: `0eeb5dce2d40f99250ec16efd2f5ee51a9d6ea62`. Implementation revision 2 bắt đầu ở `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`; report commit không đổi run source.
- [Plan revision 2](../../../../../docs/specs/c3-phase-b-input-context-improvement-plan-20261025.md), [implementation và RED→GREEN](../../../../../docs/specs/c3-phase-b-input-context-implementation-20261025.md). Driver được commit trước khi chạy; source/config/prompt/corpus SHA256 trong [REGISTRATION](REGISTRATION.json), verdict schema hash trong [CONTROLS_SUMMARY](CONTROLS_SUMMARY.json).
- Owner Vertex `gemini-3.5-flash-lite`, version cùng tên, HIGH; verifier OpenAI `gpt-6.1-sol`, version cùng tên, HIGH qua Codex login relay 0.159.2. Request config đầy đủ trong [FROZEN_RUNTIME](FROZEN_RUNTIME.json). Ba verifier transport failures không có response modelVersion; không substitute model.
- Owner candidateCount 1, text/plain, maxOutput 8192, HIGH/no thoughts, timeout 90s, temperature/topP omitted. Verifier tools [], no tool choice, stream, no store, effort high, timeout 90s; maxOutput omitted theo backend. Mỗi generation tối đa 1 upstream request, không tự retry.
- Fresh source capture 2026-10-25T11:37:52.704Z, không publish nguồn; snapshot và raw chỉ giữ ngoài repo. [RAW_SHA256](RAW_SHA256.json) cho phép đối chiếu nguyên byte. Không copy credential/private checkout/raw provider payload vào Git.

## Đủ denominator, chưa đạt chất lượng toàn B

| Nhóm | Slots | SEND_ELIGIBLE | FALLBACK | HANDOFF | NO_SEND |
|---|---:|---:|---:|---:|---:|
| B1 |24|20|4|0|0|
| Journey openings |4|2|2|0|0|
| Media followup |7|7|0|0|0|
| Negotiation |3|3|0|0|0|
| Opening quotes |5|5|0|0|0|
| Stateful |8|3|0|2|3|
| Tổng |51|40|6|2|3|

40 câu đủ điều kiện gửi đều có verifier PASS; đây là send eligibility, không phải 40 hội thoại bán hàng đạt. 48 slots thực sự gọi owner. Ba slot không gọi owner vẫn giữ denominator: request-checkout/private-checkout/confirm bị stateful dependency chặn. Registration `publicModelNativeTurns:50` là thiết kế 50 public slots + 1 private-code slot, không phải 50 lượt model đã chạy thành công.

Fallback 6/51=11.76% gồm 5 fallback chung và 1 media recovery gửi 2 ảnh. Handoff 2/51=3.92% gồm 1 do lỗi correction và 1 khách chủ động yêu cầu. No-send 3/51=5.88% đều là hậu quả chuỗi correction; không coi là 3 root causes riêng. Không slot NOT_RUN; một slot được thực thi nhưng bị guard chặn không có nghĩa tác vụ của nó đã hoàn thành.

Scoped controls 17/17 PASS: zero observed send-eligible false PASS trên frozen tested population/configuration của 17 controls. Không thay kết quả này cho full A2 hoặc mọi native reply. Hai native draft bị verifier FAIL và không gửi nguyên draft; giữ nguyên failures trong evidence.

## Finding và nguyên nhân

1. **Discovery chưa hoàn thành do code/tool bound.** `sales-discovery-advice:need` trả TOOL_RESULT_BOUND trước continuation: tool result vượt 8192B. Explicit read scope đã có, nhưng không đủ để đảm bảo kết quả discovery nằm trong bound. Exact oversized payload chưa nằm trong next-owner capture; không bịa size cụ thể hoặc claim đã tái hiện payload. Khách nhận fallback chung.
2. **Correction suy fit từ ý khách giữ size.** Profile mới eo 74 / mông 96 không có SIZE_FIT mới. Owner vẫn nói L “vừa vặn và thoải mái”, verifier chặn đúng. Shop holding được capture nhưng nhu cầu chưa xong; ownership HUMAN làm ba bước checkout sau không gửi gì. Đây là lỗi owner sử dụng state/fit và recovery của chuỗi, không phải verifier chặn giọng văn.
3. **Media phân biệt unknown với absent còn sai.** Gallery owner nói không có ảnh riêng màu be trong khi nguồn chỉ chưa xác minh màu. Verifier chặn đúng. Code recovery độc lập gửi caption + 2 ảnh chung; vẫn chưa chứng minh màu be. Không sửa draft hoặc reverify.
4. **Bốn lỗi provider, giữ nguyên denominator.** B1 partial-source-v2/price-v2/component-stock-v2: verifier UPSTREAM_TRANSPORT, GENERATION_TRANSPORT, HTTP status null; không có bằng chứng quota/auth/429. B1 changed-occasion-v3: owner generation 2 HTTP 200 nhưng MALFORMED_RESPONSE. Không automatic generation retry. Cả bốn thành fallback chung, còn kém hữu ích.
5. **Tư vấn còn thiếu quyết định theo nhu cầu.** Concern dùng mềm/rũ thay giải quyết “ren nhiều”; concern-v3 chọn cả set vì dưới 850k dù khách có váy đen, không giải thích giá trị mua thêm; changed-occasion-v2 để khách tự cân nhắc. Media-decision có 2 ảnh nhưng dài, liệt kê lựa chọn. Chi tiết từng lượt trong [51 hội thoại và review](CONVERSATIONS.md). Không thêm thang chấm keyword hoặc dùng verifier PASS thay chất lượng.
6. **New public numeric history chưa có canary thực tế.** Negotiation ra tổng 499k đúng và không mutation; nhưng không kích hoạt receipt recovery. Cả owner/verifier có 0 wire chứa acceptedCommunicationHistory. Run này không chứng minh marker mới qua live provider history; chỉ có deterministic actual-writer tests trước run. Không claim P0 live acceptance đã đóng.
7. **Model chưa nhìn ảnh.** ownerImageWires = 0. Model dùng metadata và gửi asset, không có inlineData; không suy claim đã tư vấn dựa trên nhìn ảnh/feedback thực tế.

So với full diagnostic source 33d83f68 trước: 42 eligible / 7 handoff / 2 code checkout, nay 40 eligible / 6 fallback / 2 handoff / 3 no-send. Media continuation/decision và negotiation-total hoàn thành trong lượt chạy này, nhưng correction/checkout lùi, gallery cần recovery và 4 provider errors. Hai code checkout cũ có preview thực; ba NO_SEND mới không có message. Không so số handoff đơn lẻ để kết luận tốt hơn; không có paired/stability evidence hoặc attribution riêng cho từng thay đổi.

## Vận hành và firewall

- Native 141 requests = 96 owner + 45 verifier; scoped controls 17; tổng 158 captured request bodies, dưới max 217. Native: 95 owner OK / 1 owner error; 42 verifier OK / 3 verifier errors. Mỗi generation max 1 provider request, không hidden generation retry.
- Native provider error 4/141=2.84%; owner 1/96=1.04%, verifier 3/45=6.67%; timeout 0 được ghi nhận. Không suy upstream transport failures là quota.
- Native observed input 817,875 / output 73,553 tokens; là telemetry quan sát, không billing reconciliation. Cost không expose.
- Verifier request latency p50/p95=14.485/30.575s, bao gồm 3 transport failures. Verification-through-recovery phase 17.475/31.292s; elapsed whole attempt 31.708/60.754s. Các phân phối có mẫu khác nhau; không trừ percentile để suy latency thành phần.
- Firewall scan 158 actual request bodies: 0 matches cho caseId/split/attack-family/quality-tags/expected labels/required-forbidden behaviors/rubric/scoring labels. Pattern và count trong [metrics](REVIEW_METRICS.json). Wrapper audit không phải model request, không đưa vào scan.
- Persisted cohorts: 5 test DB đều dropped. Fake capture transport, sendEnabled false; B1 chỉ eligibility. Không deploy/live send/merge/production entrypoint activation.

## Commands và verification

Command thực chạy từ repo:

```powershell
& 'C:\Users\nguye\AppData\Local\Programs\Python\Python311\python.exe' apps/worker/evals/single-agent-commerce-read-only/input-context-full-20261025/DISPATCH_DRIVER.py 'C:\Users\nguye\Documents\Sản phẩm AI\c3-phase-b-input-context-full-20261025'
```

[COMMANDS.json](COMMANDS.json) giữ 16 subcommands exact argv +exitCode: fresh capture; scoped control preflight/run/readiness; preflight/run của negotiation, media-followup, journey-openings, B1, stateful, opening-quotes. Tất cả exit0. Exit0 của runner không phải GO chất lượng. Dispatch status xác nhận source unchanged. Analysis đọc raw, capture hashes, accounting và toàn bộ 51 terminal outcomes; không generation thêm để cứu failures.

Trước seal, implementation đã có final focused worker 491 / database 74 / contracts 8 / Node 85 PASS, build/typecheck/lint theo commands ở implementation report. Không rerun các suite đó trong báo cáo-only change này. Remote CI / full worker / stability / general A2 A3/live delivery chưa verified. Không dùng test-double writer để claim actual PostgreSQL history qualification; chỉ persisted harness run có test DB và capture.

Sau thu thập: Python assertions đối chiếu 51 outcomes, 17 controls (8 safe / 8 unsafe / 1 probe), 158 wires, 16 commands exit0, 115 raw-file hashes, links và đủ 51 section hội thoại đều PASS; `git diff --check` PASS. Không sửa runtime/prompt/schema/model trong run hoặc lúc tổng hợp. Delta của lượt này chỉ có driver dispatch và báo cáo; thêm 0 semantic role, 0 runtime semantic layer.

## Recommendation

**STOP promotion; B NOT GO.** Run đã hoàn tất, evidence giữ nguyên. Bước sửa kế tiếp cần tách discovery output bound, correction re-fit/terminal recovery và provider failure handling khỏi thử nghiệm tư vấn; không nới verifier để cho qua fit/absence claim sai. Chất lượng bán hàng đánh giá trên whole terminal outcome. Không tự thêm role/parser/regex/repair loop hay một campaign mới; chờ owner chọn bước tiếp theo.
