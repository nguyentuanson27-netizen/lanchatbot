# Model–code division and separate advice diagnostic — 2026-10-19

**Recommendation: STOP readiness.** Hoàn tất fix → một review độc lập → fix → 51/51 lượt,12/12 jobs. Phần mở giỏ/checkout có tiến bộ trong mẫu này; chất lượng tư vấn chưa cải thiện ổn định. Không chạy thêm vòng/full suite provider. A vẫn OWNER_BYPASS; không live send, deploy hoặc Phase C.

## Identity và phạm vi

- Round implementation base: c2c535b09da619815e79f6495a6bd92372825dba; implementationBaseSha lịch sử/main vừa fetch lại:296cdcfbf5759f5bf9cbb24acf3dc63005589361.
- Candidate run source: **d699bb4a387ca3cc191e729218dbe9262724ef9b**, clean executable/config trước dispatch. SHA giữ trong runtime record, không ghi ngược vào frozen source.
- Baseline runtime c2c535b0 + evaluation-only opening harness tại f60c87b241956c20f52646d84862920dd81fd5f1. Baseline dùng source live riêng, so sánh mô tả; không paired causal.
- Gemini3.5 Flash Lite HIGH / Vertex và GPT-6.1 Sol high / Codex login relay. Exact version/config/credential routes/prompt/schema/corpus hashes trong [registration](REGISTRATION.json), [runtime source](raw/RUN_SOURCE.json) và từng raw registration.
- [Plan](../../../../../docs/specs/c3-phase-b-model-code-division-plan-20261019.md), architecture/amendment dẫn chiếu tại đó. [Implementation, RED/GREEN và independent REVISE](IMPLEMENTATION.md).
- 51 lượt gồm3 baseline openings,24 stateful (ba nhóm có sales journey và human-request journey riêng),12 B1 tích hợp,12 advice replay. Không phải51 hội thoại độc lập; không gộp chúng thành candidate PASS.

## Khách thực nhận

Primary review khóa tại **dc0f4401** trước khi đọc verifier/rejected-draft detail. Đọc toàn bộ lời khách, lịch sử, public context và committed state; không chấm theo keyword. Minor polish riêng không thành FAIL. [51 lượt và lý do](CONVERSATIONS_AND_REVIEW.md), [exact primary JSON](PRIMARY_REVIEW.json).

| Nhóm | USABLE | NEEDS_EDIT | UNUSABLE | Ownership control |
| --- | ---: | ---: | ---: | ---: |
| Baseline opening | 2 | 0 | 1 | 0 |
| Candidate stateful | 19 | 2 | 0 | 3 |
| B1 integrated | 8 | 1 | 3 | 0 |
| Advice-only replay | 8 | 1 | 3 | 0 |

OwnerAcceptance=null. Những câu còn dài/giống catalog, đọc lại ngân sách hoặc có mã AO/COMPOSITE được ghi voice finding; câu vẫn giải quyết được việc khách hỏi không bị tự động đánh FAIL chỉ vì một cụm từ.

### Thực hiện mua hàng

- Mở giỏ đúng áo Thạch Thảo/be/M **3/3**, baseline2/3. Baseline một lần giỏ trống/late tool và một lần code cứu câu sau late tool; candidate openings không cần recovery.
- Đổi L/hai áo và sửa eo74/mông96 đúng **3/3**, giữ be và size khách chọn; không tự tư vấn fit mới. Tổng978.100đ đúng cả3, không làm tròn hoặc đảo nghĩa trước/sau giảm.
- Native confirm_purchase dẫn tới actual code invitation trước private input **3/3**; private form dùng0 model calls; preview mới có áo/BE/L/×2/tổng/ETA. Xác nhận preview đi tới PURCHASE_CONFIRMED và canonical handoff, không tạo đơn POS.
- Sáu disposable DB (ba baseline, ba candidate) đều đã drop. Human-request controls3/3 giữ ownership và không gửi thêm tư vấn.
- Hai NEEDS_EDIT cùng repetition2: “Chị đã thêm…”/“Chị đã đổi…” kể chính khách thực hiện thao tác khi khách nhờ shop. Hành động đúng, vai giao tiếp sai; opening còn lời xem giỏ/hỗ trợ chung.
- Exact invitation text bị redactor trong harness rút thành “Chị gửi thêm [NAME]”. Đây là bản lưu đã rút gọn, không phải literal đã gửi. Run chứng minh invitation/outbox/transition và bước tiếp, không đủ để chấm chi tiết giọng của riêng câu invitation.

Ba opening tốt hơn là evidence có ích, chưa chứng minh riêng preload hay enum mapping tạo cải thiện. Hai thứ thay cùng gói; dữ liệu live và stochastic sampling cũng khác. Owner vẫn gọi read_product trước add trong một số lượt; không tuyên bố đã giải quyết toàn bộ tool planning hoặc giảm I/O.

### Tư vấn và fallback

B1 và advice-only đều **8/12 USABLE,1 cần sửa,3 fallback**. So với treatment gần nhất8/12 USABLE, chưa chứng minh tăng chất lượng.

Sáu fallback đều thuộc ca đổi sang sân khấu:

- Integrated R1: từ tơ Hàn suy áo sẽ thấu dưới đèn; giới thiệu V168 “kín đáo hơn rất nhiều khi lên đèn”.
- Integrated R2: suy tơ mỏng→lộ, rồi suy áo hai lớp của mẫu thay→kín khi biểu diễn.
- Integrated R3: tự thêm “không có lớp lót sẵn”, suy thấu sáng; hỏi lại hướng đổi dù khách đã nêu điều kiện đổi.
- Advice R1/R2 vẫn suy tơ→thấu và mẫu hai lớp→kín dưới đèn, dù không phải điều phối tool.
- Advice R3 suy tơ→thấy bên trong, rồi khẳng định phối áo trong đã kín.

Các draft này thực sự vượt nguồn; verifier FAIL cả6. Không phải lỗi timeout hoặc chặn vì thiếu một keyword. Mô tả đã tới owner, nhưng không có bằng chứng độ kín dưới ánh đèn đó. **Nguồn thiếu dữ kiện quyết định và owner vẫn biến kiến thức chất liệu chung thành đặc tính/kết quả riêng của món.** Bỏ tool planning không loại được lỗi. Đây là bằng chứng chống giả thuyết lỗi tư vấn chỉ do chuỗi tool; chưa phải bằng chứng model không thể tư vấn tốt ở mọi tình huống.

Hai câu partial-source cần sửa:

- Integrated R3: “hệ thống chưa cập nhật thông tin giá và tồn kho riêng…”.
- Advice R3: “hệ thống… đang ghi nhận nguyên set… nên… chưa kiểm tra được…”.

Source chỉ xác nhận chưa đọc được giá/tồn/offer, không xác nhận nguyên nhân đó. Cả hai vẫn qua verifier; không bịa số tiền/tồn hoặc nói rõ shop không bán lẻ. Ghi riêng rủi ro giải thích vượt context và giọng hệ thống; chưa đồng nhất hai câu với một false PASS về giá/tồn/quyền bán. Không dùng vòng này tuyên bố verifier đã đủ an toàn hoặc A2 PASS.

Các ca concern còn nhiều lời khen, mô tả chất liệu và đọc lại ngân sách; advice-only cũng vậy. Partial-source R1/R2 trong advice ngắn hơn và trả đúng phần biết, nhưng chưa đủ để gọi cả nhóm ổn định3/3. Giữ câu tốt và câu lỗi trong cùng denominator.

## Terminal và vận hành

| Nhóm | Eligible | Fallback | Handoff | No-send |
| --- | ---: | ---: | ---: | ---: |
| Baseline3 | 2 | 1 | 0 | 0 |
| Stateful24 | 12 | 0 | 6 | 6 |
| B1 integrated12 | 9 | 3 | 0 | 0 |
| Advice replay12 | 9 | 3 | 0 | 0 |

Stateful no-send ở đây dừng tin model bổ sung sau code invitation/private preview; code message thực tế đã được captured. Handoff gồm purchase confirmation và human controls, không phải6 lỗi tư vấn. Advice eligible là gate trong replay snapshot/clock, không chứng minh live eligibility. Static fallback giữ C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.”

- **119 generation requests**:82 owner,37 verifier; từng registered generation báo đúng1 upstream request, retry0; trần180.31 verifier PASS/6 FAIL.
- HTTP/provider timeout/auth error quan sát: **0/119**; hai OWNER_TOOL_MODE conformance errors thuộc baseline, không phải network error. Candidate/advice không gặp lỗi tool-mode trong mẫu này.
- Tokens: owner381.204 input/60.016 output; verifier180.533 input/3.469 output. Không thiếu usage; provider không expose cost nên cost unknown.

| Nhóm | Verifier latency p50/p95 | Added verification p50/p95 |
| --- | --- | --- |
| Stateful | 4,97 /7,51 giây | 8,30 /10,46 giây |
| B1 integrated | 4,95 /11,44 giây | 5,61 /12,48 giây |
| Advice replay | 5,14 /9,59 giây | 5,14 /9,59 giây |

Percentiles nội suy trên mẫu quan sát, mỗi nhóm riêng. Added latency integrated gồm current-source readback; replay không có network readback. Baseline chỉ có1 verifier sample, không đủ so p95. [Metrics](METRICS.json), [119 generation rows và attempt accounting](REQUEST_ACCOUNTING.json), [verdicts](VERIFIER_DIAGNOSIS.json).

Mỗi candidate stateful group quan sát20 catalog reader calls,18 POS reader calls,30 selector calls. Read-policy tool port0; policy trong domain/private path vẫn được dùng và chưa có số SQL/network roundtrips tổng. Đây là port accounting, không tuyên bố đã đo mọi I/O hoặc preload giảm chi phí.

## Audit, commands và giới hạn

- 12/12 captures có hash khớp; chọn chỉ request dispatched, ghép đúng case/repetition, không lấy rep tốt thay. Capture hashes khóa trước advice.37 verifier bindings recompute khớp;31 model-PASS eligible texts trùng exact draft, một baseline eligible khác là receipt-backed code recovery.
- 181 body captures kiểm không thấy evaluator labels/private fixture leak; gồm capture lặp DISPATCHED/RESULT, không phải181 generations. Adapter tests cũng có canary labels. Không có third runtime role/retrieval riêng/verifier rewrite/repair.
- B1 runner hiện dùng requestId deterministic theo source/case, nên lặp lại giữa repetitions; accounting dùng run+case+generation. Advice có fresh UUID. Mỗi request thực sự gọi provider; không adopt verdict cũ. Đây chưa phải bằng chứng độc lập về cross-repetition replay identity của runner B1.
- Raw provider wire giữ nguyên bytes.27 provider-attempt bản public bỏ synthetic ingress batch; [artifact index](ARTIFACT_INDEX.json) lưu original/published hashes và vị trí originals. Không đưa private fixture phone vào provider/public evidence.
- [Audit bindings/source](SOURCE_AND_WIRE_AUDIT.json), [exact child commands](raw/commands.json), [preflight](raw/preflight.json), [source readback](raw/source-readback.json).

Commands thực sự chạy gồm focused/full worker, adapter/protocol, protected claims, worker build/lint và RED→GREEN nêu ở [implementation](IMPLEMENTATION.md). Sau review fixes:123 focused PASS,69 Node PASS, build/lint exit0; full1881/Node511+2skip là trước các final fixes, không đổi nhãn chúng thành exact final-head full-suite.

Provider command thực sự:

```powershell
python "$env:TEMP/c3-division-session-20261019.py" node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs --provider-preflight
python "$env:TEMP/c3-division-session-20261019.py" node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/cases.prioritized.json --source-check --out "$env:TEMP/c3-division-source-check-20261019"
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/run.py "C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-division-baseline-20261019" "$env:TEMP/c3-division-session-20261019.py" "$env:TEMP/c3-model-code-division-20261019"
```

Preflights PASS/0 generations; parent runner12 jobs exit0. Actual absolute arguments retained in commands.json. No remote CI/deploy/live delivery verification claimed.

Runtime source delta versus c2c535b0:68 added/7 removed lines across four runtime modules, plus regression tests. Native/eval execution changes are separate; corpus formatting/raw evidence dominate overall file count. No shared package source, new DB table/durable state, semantic layer, role or production entrypoint. Preparation hook/status and source-evidence fixes protect current truth/freshness; diagnostic is eval-only.

## Kết luận cho bước sau

Giữ lợi ích giao tiếp enum/giữ evidence và luồng code checkout; đánh giá preload cùng chi phí source reads, chưa coi nó là lời giải toàn bộ execution. Khả năng tư vấn cần xử lý quyết định trên dữ liệu đang có và đường hỗ trợ thực sự làm được khi thiếu dữ kiện, đặc biệt tình huống vật lý như độ kín dưới đèn. Kết quả không ủng hộ việc chỉ thêm cùng một quy tắc vào prompt hoặc cho rằng bỏ tool là đủ.

Không nới verifier để cho các khẳng định độ kín chưa có nguồn qua. Cần giữ nhận xét thẩm mỹ/cảm giác dự kiến, đồng thời có nguồn hoặc luồng xử lý thật cho điều ảnh hưởng quyết định. Câu đoán lý do nguồn lỗi và giọng catalog/vai xưng hô là finding còn mở. **STOP readiness, không tự sửa/chạy vòng tiếp.**
