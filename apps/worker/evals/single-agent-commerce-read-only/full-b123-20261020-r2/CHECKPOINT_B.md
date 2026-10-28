# Full B1/B2/B3 — lượt20261020-r2, report2026-10-21

**FULL_RUN_COMPLETE_REPLY_QUALITY_NOT_COMPLETE**. Đã chạy đủ24/24B1 +8/8stateful, mỗi ca1lần, không quality early-stop. Sáu child jobs exit0. COD28/28 và BANK_TRANSFER28/28 deterministic checksPASS.89owner/verifier generation requests, mỗi generation1upstream request,0error/timeout/retry. Không actual fallback. A OWNER_BYPASS; không B/live GO.

[Toàn32actual hội thoại và review](CONVERSATIONS_AND_REVIEW.md), [7câu cần sửa](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json), [diagnosis](FAILURE_DIAGNOSIS.json), [metrics](METRICS.json), [source/wire audit](SOURCE_AND_WIRE_AUDIT.json), [validation/cleanup](VALIDATION.json). Agent review toàn câu/hội thoại/state/source, không human owner adjudication hoặc keyword scoring. Primary khóa tại `fd097e1298887ece75953f9e09b44e60577d9dba` trước rejected-draft/verifier/native-flow diagnosis; hash `f478d233174e8ff054ccfa5e57c4f83e5f0774aa5e6a11e36d3fce9c26fb559b`.

## Population và actual outcomes

| Population | Recorded | USABLE | NEEDS_EDIT | OWNERSHIP_CONTROL | Actual fallback |
|---|---:|---:|---:|---:|---:|
| B1 |24|18|6|0|0|
| Stateful B2/B3 |8|6|1|1|0|

B1:24SEND_ELIGIBLE,24verifierPASS. Stateful:4SEND_ELIGIBLE/4verifierPASS,2NO_SEND model terminals,2HANDOFF. Hai NO_SEND ở invitation và private preview có actual code-owned replies được capture; không phải khách không nhận gì. Yêu cầu gặp nhân viên là silent handoff/control, chưa có ACK được capture. Một private intake không gọi model. Không cộng56deterministic checks vào32hội thoại hoặc gọi32outcomes là32verifierPASS.

Stateful thực hiện đúng áo beM×1 → beL×2; quote998.000−49.900+30.000=978.100đ; sửa số đo74/96, giữ sizeL theo khách; actual invitation trước private intake; preview giữ total978.100/đặt trước/ETA dự kiến8–14ngày; confirmPURCHASE_CONFIRMED và chuyển nhân viên kiểm tra/lên đơn. Không tạo đơn POS thật, gửi khách thật hoặc đo phản hồi nhân viên. Ba isolated DBs đã dropped.

## Những gì còn cần sửa

- **B1–3 và B1–11:** source-fault fixture cố ý thiếu price/stock. Model trả được chất liệu nhưng viện hệ thống hoặc nói chưa có thông tin bán lẻ riêng, nghe như shop không bán riêng. Đây là vấn đề diễn đạt unknown với khách, không bằng chứng phải bổ sung thêm mọi dữ kiện sản phẩm.
- **B1–7, B1–15 và B1–23:** thuyết phục vẫn dựa vào chuỗi tính từ/chất liệu và cả hai phương án; khách nhờ shop chọn nhưng bị hỏi ngược thích phương án nào. B1–7 cũng dùng bước kiểm size chung chung. Không ép đáp án phải mua lẻ/rẻ; upsell cả bộ vẫn hợp lệ khi có lý do phù hợp.
- **B1–9:** từ nguồn mềm/thoáng đi tới câu không sợ bí nóng khi ngoài trời lâu. Cần owner xem độ mạnh của lời trấn an theo tình huống. Giữ riêng với ordinary material/comfort inference đã được chấp nhận; chưa chốt unsafe falsePASS, không tự thêm yêu cầu phép thử cho mọi cảm giác hoặc sửa verifier.
- **B2/B3–4:** state sửa đúng nhưng câu đã cập nhật số đo mới và giữ nguyên nghe như thông báo hệ thống. Không phải lỗi ghi state, nhắc một fact hợp lý hoặc xác nhận sai fit.

B1–1 chọn váy thay cho việc đi xe lâu: giữ inference ít nhăn từ material/giữ form theo boundary owner đã chốt, không tự fail vì thiếu test riêng. B1–17 đã đứng vào áo lẻ và giải thích phù hợp buổi gặp khách hàng; dùng được dù còn nhiều tính từ. B1–21: stockM/color=null được context cung cấp khác scope stateful be/M đặt trước; không kết luận nguồn/model sai từ việc ghép hai scope này.

## So với full run trước

Full trước `68694ce2`: B119USABLE/4NEEDS_EDIT/1fallback; stateful7USABLE/1control và1owner protocol error đã recovery. Lần này B118USABLE/6NEEDS_EDIT/0fallback; stateful6USABLE/1NEEDS_EDIT/1control và0provider/protocol errors. Không có missing/downstream blocked outcomes.

Ca B1–16 đã mặc thử: trước đồng ý sai rồi verifier chặn/static fallback; nay trả lời từ chối đúng việc đã mặc vào, đủ điều kiện gửi. Đây là cải thiện observed về áp policy. Còn giọng và cách quyết định bán hàng chưa cho thấy cải thiện ổn định. Một số nhãn giọng phản ánh ưu tiên owner mới; các prompt/source snapshots giữa hai full runs khác nhau và mỗi ca1sample, nên không quy mọi delta cho một bullet hoặc model variance, cũng không relabel raw/primary cũ.

## Identity và phạm vi cấu hình

Preparation base `e14c10d135e17552e4fd07ec72d37e7dcc1de7d2`; run source **`79bda1692667846e0a543a404812ab1daead35c7`**. Commit đăng ký/clean trước provider. Source HEAD giữ nguyên qua6jobs, không ghi runtime SHA ngược frozen source.18relevant executable/config/frozen-input Git blobs giữ nguyên; không sửa runtime/prompt/API trong lượt này.

Owner Vertex global `gemini-3.5-flash-lite` HIGH (candidate1/plaintext/max8192/includeThoughts=false/default sampling/90s/retry0). Verifier OpenAI/Codex login `gpt-6.1-sol` high, CLI0.159.2/toolsnone/storefalse/stream/90s/1upstream request per generation/retry0. Exact config/route/schema/fallback ở REGISTRATION.json. Owner SHA `2d138eadfc0de1d7c268f2d2f4bc876d635a85663539fdbcd3d0a8261f7c1bb1`, verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`, schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. B1 corpus `ee298235bec3e3529b782f0ca243041dad0ff48b2317cf93d363c7ed5bb3040a`, stateful corpus `d8ab24a2ed2c181447d4fa8bf23973bdf61471edea284ae6a96421c8f67082af`, source config `4be0232836fa5f172c2b582802ceee8efa288e7449629fe831d323558a030f3d`.

Provider paths giữ scope hiện hữu: B1read-only; stateful dùng current published policy/default matrix, state/effect/handoff ports. Current isolated EXCHANGE/DEFECT candidate chỉ được kiểm bởi hai deterministic cases trong cả COD/BANK branches, không được publish hoặc ngầm wire vào provider full harness. Tám stateful questions không có EXCHANGE/DEFECT; không claim full provider đã kiểm live candidate publication. Full harness tiếp tục dùng live public reads + isolated registry-description overlay đã đăng ký, không sửa shared PostgreSQL/Redis/Qdrant/POS sources.

Complexity delta: copied existing full wrapper, registration/scope và evidence/report. Chỉ thêm local raw-evidence .gitattributes để Git giữ byte/EOL/whitespace chính xác. Không role, parser, state, gate, repair loop, new credential route hoặc production wiring.

## Request accounting, latency và tokens

89generation requests =61owner+28verifier; all89statusOK, requests-per-generation1.0automatic retries, HTTP/auth/quota/protocol errors hoặc timeouts.28verifierPASS là semantic outcome, không28quality passes. Hai embedding calls riêng cho source search (source-check1/B11/stateful0), không gộp vào89owner/verifier requests hoặc vai trò hội thoại mới. Cost NOT_EXPOSED.

- B1 verifier n24 p505.333s/p956.548s; added verification/readback p505.954s/p958.152s.
- Stateful verifier n4 p506.339s/p957.149s; added verification/readback p509.854s/p9511.462s.
- Owner per-generation n61 p502.258s/p956.235s. Các vai trò có workload khác nhau; không benchmark tốc độ model độc lập hoặc latency live.
- Owner input232.356/output39.326; verifier input126.536/output1.863; missingUsage0. Output có thể gồm reasoning, không đồng nghĩa độ dài câu gửi khách.
- B1fallback0/24, statefulHANDOFF2/8 theo workflow; không trộn handoff, code replies và chất lượng thành một tỷ lệ success.

Audit2childregistrations matched,28exact draft/trusted bindings recomputed,61exact owner prompt captures,93wire bodies with nested-label/private-phone checks,0evaluator-label leaks,28exact eligible text matches. Metrics giữ121wirephasecaptures (không phải121requests).49published rawfiles:41exact-byte copies +8attempt copies chỉ bỏ private ingress batch; original temp hashes và49Git blob hashes matched. Primary/raw/labels giữ nguyên, không bỏ failures khỏi denominator.

## Commands thực sự chạy

```text
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020-r2/run.py %TEMP%/c3-division-session-20261019.py %TEMP%/c3-full-b123-20261020-r2
# exit0; all six jobs exit0; full24B1 +8stateful; COD28/BANK28
python %TEMP%/c3-gemini-prompt-once-primary.py %TEMP%/c3-full-b123-20261020-r2
python %TEMP%/c3-gemini-prompt-once-publish.py %TEMP%/c3-full-b123-20261020-r2 apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020-r2
python %TEMP%/c3-full-b123-metrics.py %TEMP%/c3-full-b123-20261020-r2 apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020-r2
node %TEMP%/c3-full-b123-audit.mjs %TEMP%/c3-full-b123-20261020-r2 apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020-r2 fd097e1298887ece75953f9e09b44e60577d9dba
# all exit0; post-processing does not generate model replies
```

Exact child argv/exitcodes in raw/commands.json: provider-preflight; source-check; deterministic COD; deterministic BANK_TRANSFER; stateful provider-run; full B1run with no range restriction. Existing source-check/B1 entrypoints compiled current worker before source imports. No separate worker typecheck/lint/fullunit/protocol-unit rerun is claimed; prior focused verification reused because executable behavior unchanged. Inline Python assembled primary, diagnosis/transcripts, metrics role latencies, source-embedding counters,49raw/source identities/cleanup checks and credential scan. Force-added only the indexed ignored logs; no output/source substitutions.

## Recommendation

**Complete requested full run and STOP: sales reply quality still needs work.** Keep the7specific edit findings and boundary notes, preserve all evidence. No mid-run fix or further generations, no A PASS/B live GO, deploy or source publication. Do not infer stable overall safety/quality from this one run or28verifierPASS.
