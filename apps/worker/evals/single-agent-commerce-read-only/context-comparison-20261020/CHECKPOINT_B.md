# Phase B — context comparison, completed and stopped before integrated stage

Ngày2026-10-20. Owner yêu cầu thực hiện revised plan. **Hoàn tất12/12 slots; không chứng minh cải thiện từ biên tập context. Dừng trước conditional16.** A vẫn OWNER_BYPASS; không tuyên bố Checkpoint A PASS hoặc Phase B/live GO.

## Phạm vi đã thực hiện

Implementation base `f9c9c4a9`; implementation savepoint `df75ae3e`; runtime source **`13dea00c0ba7498edfe66a5b5067aa01d939d2e4`**. Clean worktree trước provider; HEAD không đổi trong generation. Primary toàn actual/source review commit **`0dbb6fb5`** trước rejected-draft/verifier diagnosis; primary hash `62f494afc0ca10b7e4e4fb517924d7ab15696b405e8af01c746dcf9875ac951a`.

T1: mốc review toàn đoạn được freeze trước run, gồm cách hiểu thống nhất về lời khuyên giữ form theo vật liệu và về khoảng cách giữa usable chức năng với tư vấn hay. Lời “giữ form…suốt chuyến đi” không tự là protected failure từ riêng thời lượng; xét cả đoạn và lời hứa thực tế. Nguồn không có phép phục hồi nếp tức thời. Đây là supplemental review áp cùng hai arm, không human adjudication mới và không sửa nhãn lịch sử.

T2: giữ SV2447 nguyên vẹn; biên tập SV1561/SV165/SV244. Mỗi bản còn vật liệu, lớp, phom, trang trí, cạp, cảm giác và phong cách riêng. Bỏ/gộp đoạn quảng cáo trùng, không thêm chống nhăn/phục hồi độ phẳng. DESCRIPTION_SOURCE_REVIEW.json giữ nguồn nguyên văn/hashes và giải thích lược/gộp. Upstream chưa read lại vì T5 không chạy; không gọi nguồn candidate là shop registry đã cập nhật.

T3: chỉ eval advice harness có clone context riêng cho owner; canonical precheck/binding/verifier/final gate giữ nguyên. Default không có override tiếp tục dùng nội dung cũ. Không sửa runtime TypeScript, adapter/API, production entrypoint, prompt, verifier, models, schema, fallback, source-config hay shared data. Hai function nhỏ phục vụ một rủi ro presentation, khoảng23dòng code thêm và3test cases; runtime roles/layers/gates/durable state thêm0. Test kiểm đúng boundary, không đo tự nhiên bằng keyword.

## Kết quả thực nhận

| Arm | Slots | USABLE | NEEDS_EDIT | Actual fallback | Provider generation requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| Control — context cũ | 6 | 6 | 0 | 0 | 12 |
| Candidate — context biên tập | 6 | 4 | 0 | 2 | 12 |
| Tổng | 12 | 10 | 0 | 2 | 24 |

Changed-occasion: control3/3USABLE, candidate1/3USABLE +2fallback. Concern: cả hai3/3USABLE. Đây là2fixedcapturedcontexts×3samples×2arms, không12livejourneys. Không dùng tỷ lệ trên làm ước lượng thành công toàn hệ thống hoặc majority vote xóa lỗi. Mọi attempt nằm trong denominator, không retry/mẫu bù/best-of-N.

Verifier12verdicts:10PASS/2FAIL;10exactsend-eligibletexts/2frozenfallback `C3_A_NONPROTECTED_V2` — “Phần này em chưa trả lời được, chị nhé.”; handoff0/no-send0 trong tập diagnostic này. Fallback2/12=16,67%; candidate2/6=33,33%, chỉ là mô tả tập này. Không có generation/provider/auth/transport errors hoặc timeout; không thiếu capture/usage;24/24generations mỗi generation1upstreamrequest.

Candidate không đáp ứng điều kiện tiếp tục do2actualfallback. **16conditional slots không dispatch**, không tính thành failures hoặc outcomes đã chạy; không có T5runSourceSha, không có integrated tool/search/stateflow evidence mới. Tổng thực chạy12slots/24requests trong trần28/76; không tiêu phần conditional để cứu kết quả.

## Findings — phân chia nơi sở hữu

1. **Owner vẫn tự tạo kết quả phục hồi nếp.** Candidate slot10 viết “tới nơi chị treo lên một lúc là tơ tự rủ phẳng lại”. Canonical nguồn SV2447 không có cơ chế/kết quả đó. VerifierFAIL `UNSUPPORTED_PROTECTED_ASSERTION`, ref`product:SV2447`, phù hợp với phần lỗi này. Việc bỏ văn quảng cáo của món thay chưa ngăn owner tự thêm hiệu quả cho món cũ vốn không đổi context. Đây vẫn là lỗi cũ, không phải thiếu thêm một câu nói ngắn.
2. **Verifier có bất đồng phạm vi với mốc review đã freeze.** Candidate slot5 chọn Thanh Vũ: tơ crep ít nhăn hơn/giữ form gọn gàng suốt chuyến đi; verifierFAIL ref`product:SV165`. Theo T1 đây là lời tư vấn định tính được phép, không phải kết quả phẳng hay phục hồi nếp. Controlslot1 cũng chọn Thanh Vũ bằng chất liệu và lời giữ form tương tự, cùng canonical nguồn, nhậnPASS. Reviewer coi slot5 là false rejection theo cách hiểu đã freeze; không khẳng định đã có owner/human adjudication mới. Hai draft gần nghĩa, không byte-identical. Schema chỉ cho verdict/kind/ref, không giải thích, nên không xác định được bước suy luận nội bộ hoặc chứng minh keyword matching. Không sửa verifier hoặc reverify để xóa kết quả trong run.
3. **Giọng và sức thuyết phục chưa cải thiện rõ.** Candidate usable slot2 chọn Diễm Hoa trực tiếp và dùng đúng chi tiết hai lớp; control cũng đã chọn cụ thể. Draft slot5 vẫn “chị chuyển…giúp em”; slot10 vẫn “nếu…em gợi ý”, diễn giải dài và hỏi giữ hay đổi dù khách nhờ chọn. Không đánh lỗi tự động vì những chữ ấy; cả đoạn vẫn cho thấy nhịp tư vấn cũ. Actual fallback được chấm fallback, không cộng credit từ draft chưa gửi.
4. **Concern không có treatment và không suy giảm thực chất.** Cả6request owner cho ca này giống nhau, kể cả giữa hai arm; giá799k đều đúng. Tất cả vẫn dùng chuỗi mềm/nhẹ/rũ→thanh thoát→ngân sách để trấn an ren nhiều. Theo anchors, chúng dùng được nhưng lý do mỏng; không tự nâng thành lỗi safety hoặc bắt buộc mua lẻ. Không quy khác biệt câu chữ/CTA ở ca này cho context edit.
5. **Context biên tập không làm mất cấu tạo hoặc thay authority trong phép thử.** Owner request changed-occasion15.100→13.522bytes; concern12.592→12.592bytes. Giảm request size là quan sát kỹ thuật, không bằng chứng chất lượng. Audit xác nhận12canonicalverifiercontexts nguyên vẹn và12owner projected/sent body+telemetry hashes đúng. Không đủ bằng chứng văn quảng cáo trong nguồn là nguyên nhân chính hoặc việc rút bớt nguồn tự làm model kém hơn: mẫu nhỏ,3mỗiarm, owner và verifier cùng tạo biến thiên.

Kết luận phép thử: **chưa đủ**, không promote descriptions vào source-config hay nguồn dùng chung. Hướng cần xử lý riêng khi owner quyết định tiếp là bất đồng phạm vi verifier so với lời khuyên đã được chấp nhận và owner tự tạo kết quả sử dụng cụ thể. Không tiếp tục thêm yêu cầu giọng chung hoặc tự nới verifier chỉ để hạ fallback. Không kết luận model không có khả năng tư vấn từ tập hai tình huống này.

## Models/config và provenance

Owner Vertex global `gemini-3.5-flash-lite` HIGH; verifier `gpt-6.1-sol` high qua existing Codex login/CLI0.159.2 bounded relay. Exact identity/config/credential-route names trong TARGETED_REGISTRATION.json; không lưu secret, không substitute model. Model telemetry khớp12owner/12verifier generations. Tools tắt cho owner replay, verifier không tool. Owner final text+telemetry, không proposal/intent/plan ownership object.

- Owner prompt SHA256 `057fcb7a47d69ffce4731a8ee58bb7ecafe36204bd6726128325e7838a813d70`.
- Verifier prompt SHA256 `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`.
- Schema SHA256 `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Frozen input SHA256 `e148f1253ec1a73d2b45d6f39a2ea5b3f4a6881ab43f43ee3cebd35326975a44`.
- Description map SHA256 `79213e098f2fef2692303fb152e1ec96e77f1541dd8909e1ae9c042d0ce32312`.
- Review anchors SHA256 `8733a33f8d32320633aad20e1dd7c3fdf0acba2faea8efeafe74be1986252da2`.

Capture/owner-body hashes ở INPUT_PROJECTION_AUDIT.json, canonical capture hash và binding ở raw.12bindings recomputed/12exactownerpromptcaptures/36wirebodyaudit/12capturehashes/18exactrawhashes/Gitblobs PASS,0evaluator-label leaks. Metrics helper đếm48wirephasecaptures vì request được giữ ở nhiều phase, không phải48generationrequests. Current executable/prompt/config/frozen inputs còn đúng12Gitblobidentities từ runsource. Canonical context không chuyển sang bản biên tập của owner; không giả provenance nguồn là hash bản mới.

## Operational measurements

Verifier latency12records: p50 **6,909s**, p95 **12,686s**. Added replay verification/final-gate latency12records: p50 **6,912s**, p95 **12,690s**. Đây không phải latency live readback/search hoặc toàn bộ hành trình có tool. Owner latency không expose riêng trong generation record; không suy từ wrapper thành tốc độ model.

Usage owner input32.961/output21.868; verifier input58.472/output2.240; missingusage0. Output usage có thể bao gồm reasoning, không dùng nó để đo độ dài câu khách nhìn thấy. CostNOT_EXPOSED. Provider timeout/error rate0/24generationrequests. Request-count distribution1×24; raw giữ auth/request/error accounting, không hidden refresh/retry generation.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
# RED:2PASS/3FAIL; sau minimum implementation GREEN:5/5PASS
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#64/64PASS,0skip
pnpm --filter @lana/worker build
#exit0; dependencies built by prebuild, không sửa shared packages
python apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020/run-targeted.py "$env:TEMP/c3-division-session-20261019.py" "$env:TEMP/c3-context-comparison-20261020"
#exit0; preflight0generation; advice runner12slots/max24requests
python "$env:TEMP/c3-context-comparison-primary.py" "$env:TEMP/c3-context-comparison-20261020"
python "$env:TEMP/c3-gemini-prompt-once-publish.py" "$env:TEMP/c3-context-comparison-20261020" apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020
python "$env:TEMP/c3-context-comparison-metrics.py" "$env:TEMP/c3-context-comparison-20261020" apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020
node "$env:TEMP/c3-context-comparison-audit.mjs" "$env:TEMP/c3-context-comparison-20261020" apps/worker/evals/single-agent-commerce-read-only/context-comparison-20261020 0dbb6fb5
#all exit0; audit/report helpers retained in task temp, no provider calls
```

Exact child argv/exitcodes ở raw/commands.json: `isolated-integration.mjs unused COD --provider-preflight` và `advice-diagnostic.mjs <frozen-input> <temp-out>/targeted`, mỗi child exit0. Offline Node projection audit và Python staged/source/prompt/hash checks exit0; VALIDATION.json ghi kết quả. git diff --check và staged check cuối được chạy trước report commit; ghi kết quả final sau check. Không rerun worker typecheck/lint/full suites vì không sửa TypeScript/runtime/sharedsource và changed eval boundary đã focused64 +build. Không claim technical checks chứng minh giọng tự nhiên.

Evidence correction: lần stagedcheck đầu thấy trailing spaces trong Markdown trích nguyên văn; view đã bỏ trailing spaces, exactJSON/raw không đổi. Lần rawGitcheck đầu thấy .log bị ignore nên chưa staged; force-add public raw logs rồi18/18hashPASS. Không giấu failures hoặc thay provider evidence để giải quyết lỗi lưu artifact.

## Delivery / stop

[12hội thoại actual và primary](CONVERSATIONS_AND_REVIEW.md), [hai rejected drafts và diagnosis](FALLBACKS_AND_REVIEW.md), COMPARISON.json, REQUEST_ACCOUNTING.json, SOURCE_AND_WIRE_AUDIT.json và VALIDATION.json giữ đầy đủ kết quả. Working tree sẽ được commit/savepoint sau khi report/tasks cập nhật; không merge/deploy/live send, không shared registry/POS writes hay DB test mới.

Recommendation: **STOP trước integrated16**. Bản thử context được giữ trong harness opt-in/evidence; active prompt/verifier/source-config giữ bản trước. Owner sales acceptance, độ ổn định và toàn B chưa được chứng minh. Không có vòng model thứ hai trong lượt này.
