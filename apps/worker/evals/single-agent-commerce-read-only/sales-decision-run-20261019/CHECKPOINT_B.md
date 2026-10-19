# Sales decisions and scoped product names — result

**Fix và deterministic checks hoàn tất; targeted6/6 đã chạy,5USABLE/1actualfallback. STOP trước16slots conditional do lỗi thực chất tái diễn.** Không nhận full Phase B GO; A vẫn OWNER_BYPASS. Không deploy/live send/tạo POS order. Lượt này không phải full16/B1full24 hoặc A2/A3.

## Source và thay đổi

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; preparation baseline `df9b6ffe`.
- Implementation savepoint `64aca325`; registration `77850413`, sửa byte-freeze trước provider `7e9ece0a`.
- Runtime source **`7e9ece0a10280ff0aa87e7083ce2bcc145d9bb13`**: clean worktree trước dispatch, HEAD không đổi trong generation. Source SHA ghi runtime, không ghi ngược frozen source. Staged-hash check phát hiện CRLF/LF ở targeted input sau registration commit đầu; đã chuẩn hóa LF/sửa hash trước mọi provider call, kiểm lại input/corpus/runner/review source PASS. Không có run trên source chưa khớp.
- Owner prompt thay các đoạn chọn/đổi hoàn cảnh/căn cứ/giọng hiện hữu,9.435→9.791bytes (+356); không thêm ví dụ sản phẩm/case/rubric. SHA256 **`ce091f2cdd6baeb28dd7eaa5164e33d5ae0f1220b07d8b176967ffbdda7a47fd`**. Bản rewrite vẫn là thử nghiệm ưu tiên tư vấn, không tuyên bố chữa root cause chỉ vì viết lại prompt.
- Verifier giữ `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Models/sourcefacts/config/fallback/policy/cases giữ nguyên.
- Optional transient productNames đi từ ingress initialProducts qua executor source tới code preview/preorder; recovery lấy current runtime product content, cùng formatter. Tên đúng product/role, không lấy variant label làm tên, không cắt prefix bằng regex. Thiếu tên đúng thì giữ mã. Không thêm catalog read/persisted field/cart schema/migration/gate hoặc production wiring. Dòng mua lẻ được hiển thị thành áo thuộc mẫu set, không giả cả bộ.

## Models và frozen protocol

Owner Vertex global `gemini-3.5-flash-lite` HIGH, version cùng tên, candidate1/text/plain/max8192out/includeThoughts:false/provider-default temperature/topP/retry0/timeout90s, existing Vertex credential route. Verifier Codex login `gpt-6.1-sol` high qua bounded relay CLI0.159.2/Responses/tools[]/tool_choice:none/parallelfalse/storefalse/streamtrue/one upstream request/retry0/timeout90s/maxResponseBytes1048576; default output cap/sampling.

Exact config, hashes, counts và stop rule tại [TARGETED_REGISTRATION.json](TARGETED_REGISTRATION.json); input hai contexts lấy từ raw advice-input của wording-stability-2, mỗi context3samples. Cùng capture/replay clock, tools disabled, thiếu integrated tool history; đây không phải6live journeys độc lập hoặc kiểm tra owner tự tìm nguồn. Existing16stage có [REGISTRATION.json](REGISTRATION.json) riêng và **NOT_DISPATCHED_CONDITION_NOT_MET**; không coi16chưa chạy là16model fails hoặc16PASS.

## Actual customer outcomes

| Population | Registered/executed | USABLE | Actual fallback | Generation requests |
| --- | ---: | ---: | ---: | ---: |
| Changed occasion, captured world | 3/3 | 2 | 1 | 6 |
| Buying concern, captured world | 3/3 | 3 | 0 | 6 |
| Targeted total | 6/6 | 5 | 1 | 12 |

Complete denominator6slots/12generation requests (6owner+6verifier), mỗi generation record đúng1upstream request.0provider errors/timeout/retry/missing capture/BLOCKED. Verifier5PASS/1FAIL;5model texts exact send-eligible dưới captured replay world,1fallback `C3_A_NONPROTECTED_V2` (16,67%). Không handoff/no-send trong6slots. Không dùng best-of-N/majority vote hoặc retry; không sửa prompt sau khi xem kết quả.

Primary đọc whole actual customer outcome và source trước diagnosis; lockSHA256 `4f82d10c9a187d7376377dc7d58bf7ef6306d69618b653d01ac00092183b7d83`, commit **`e825f3a95b91ee62ef890fe6e94a0db519557675`**. Reviewer là Codex trong task, chưa có owner/independent human scoring. Không chấm isolated keywords, ép một món/tính từ/CTA; polish nhẹ không làm trượt. [Đủ6actual replies](CONVERSATIONS_AND_REVIEW.md).

## Findings và giới hạn kết luận

1. Hai mẫu đổi hoàn cảnh được gửi chọn Diễm Hoa ưu tiên và dùng mô tả ren lưới/3tầng thực sự có trong context. Lời so sánh định tính về nếp nhăn/đứng dáng được phép theo boundary hiện hành; không chấm sai chỉ vì nguồn không có đúng tính từ. Một câu vẫn “giúp em”, cả đoạn còn dài, là góp ý giọng.
2. Mẫu thứ3actualfallback: draft giới thiệu Diễm Hoa/Thanh Vũ rồi hứa **“giữ form đẹp suốt chuyến đi”**; nguồn không xác nhận hiệu quả cụ thể này. VerifierFAIL/UNSUPPORTED_PROTECTED_ASSERTION tại product:SV244 và product:SV165 đúng. Draft còn đưa hai mẫu rồi hỏi khách chọn lại. Actual chỉ “Phần này em chưa trả lời được, chị nhé.”, nên khách chưa được giúp mua. [Exact draft/verdict/actual](FALLBACKS.md).
3. Lỗi vẫn cùng family suy từ mô tả thành cam kết sử dụng; chuyển từ giữ món cũ sang khẳng định món thay. Vì vậy chỉ dẫn “đừng tạo công năng để bảo vệ lựa chọn” chưa đủ làm owner ổn định trên3samples. Đây là inference/decision failure quan sát được, không chứng minh model cố tình hoặc một nguyên nhân nội bộ đã rõ. Không nới verifier để làm đẹp fallback count; không dùng2PASS xóa1failedattempt.
4. Cả3concern replies dùng được theo rubric đã freeze, không bịa giá/feature; nhưng vẫn chủ yếu mềm/nhẹ/rũ→thanh thoát→vừa ngân sách. Chưa giải thích mạnh việc ren nhiều về thị giác. Có CTA gửi hàng hơi vội/gượng và câu mời tư vấn size dùng được. Giọng/sức thuyết phục chưa có tiến bộ rõ; không tự đổi điểm các run cũ hoặc chấm lỗi vì đếm tính từ.
5. Source có mô tả món/alternatives cần thiết, không có chứng cứ giữ form toàn chuyến đi. Không có source error; không kết luận thiếu source là nguyên nhân của lời hứa. Bản này không thử context mới và không kiểm search/tool routing.
6. Fix code-name đã được kiểm qua private ingress/session actual preview không gọi model/đọc thêm catalog, cùng focused tests giỏ/tổng/offer/privacy. **Chưa có provider-integrated model run của fix này** vì16stage dừng đúng rule. Không suy6advice samples là bằng chứng giỏ/checkout production hoạt động hoặc độ tự nhiên của ACK đã được cải thiện.

## Deterministic verification và self-review

- `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-ingress.test.ts --maxWorkers=2 --minWorkers=1`: RED đầu4fail/86pass gồm2formatterfails và2fixtureerrors. Sửa fixture priceFactRef theo contract rồi private ingressRED1fail/14pass đúng actual preview vẫn mã. Không nới readiness để qua test.
- GREEN ban đầu4files163/163. Self-review thêm recovery-name test: lần đầu fixture thiếu action SET_QUANTITY nên bị từ chối; sửa fixture,64/64effectsPASS. Giữ domain permission/CAS/receipt rules.
- Final focused: `pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts --maxWorkers=2 --minWorkers=1` **217/217PASS**.
- `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs` **58/58PASS**; no evaluator-only labels in wire test remains green.
- `pnpm --filter @lana/worker typecheck` đầu fail optional-property2paths và2fixture types; sửa optional spread/typed readback. `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` PASS trên final source. `pnpm --filter @lana/worker typecheck` chạy lại trên source cuối **PASS/exit0** sau khi provider hoàn tất; không thay executable sau seal.
- `pnpm --filter @lana/worker build` **PASS**; `pnpm --filter @lana/worker lint` **PASS** (tsc noEmit). `git diff --check` PASS. Không sửa shared package hoặc broad-refactor.
- Self-review đối chiếu P4/rollback: không ép tradeoff/mua lẻ/giá thấp hoặc cấm relevant measurement repeats. Giữ size khách chọn khác fit; unknown offers không thành không bán; facts/recipient/permission/privacy/receipt/CAS/state và policy boundaries hiện hữu. Không có third role/semantic router/parser/regex/repair loop.

## Operational evidence

Verifier6records p50 **9.007s**, p95 **21.078s**. Added verification6records p50 **9.010s**, p95 **21.080s** trong replay, không có live source readback. Owner latency không expose trong generation record shape; không suy từ wrapper walltime. Usage owner input/output **16911/11371**, verifier **29384/1960**; missing usage0, costNOT_EXPOSED.

Audit6bindings/exact owner prompt captures6/wire bodies18/exactPASStexts5/capture hashes6/publicartifact hashes12 PASS,0evaluator-label leaks. Accounting có24wire events do cùng request ghi nhiều phases, không nhầm với12generation requests.12rawfiles exact bytes, Gitblob hashes12/12khớp; không có synthetic private ingress input trong targetedworld. Source/prompt/input Git hashes3/3PASS, commands preflight+targetedexit0; không tạo DB/live send/orders cho captured advice. [Accounting/audit](VALIDATION.json), [metrics](METRICS.json), raw giữ original facts/draft/terminal/verdict/usage.

## Provider/evidence commands thực chạy

1. `python apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019/run-targeted.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-sales-decision-targeted-20261019` — exit0, clean-source+frozeninput+launcherhash checks;2child commands exit0 ở [raw/commands.json](raw/commands.json). Preflight reuse runner cũ, advice reuse advice-diagnostic.mjs; không sửa transport/provider API.
2. Whole6actual replies/source review→tempprimarySHAlock→publish/savepoint e825f3a9 trước verdict diagnosis; không thêm judge generation. `python <TEMP>/c3-gemini-prompt-once-publish.py <TEMP>/c3-sales-decision-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019` — exit0/12exactartifacts.
3. `python <TEMP>/c3-sales-targeted-metrics.py <TEMP>/c3-sales-decision-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019` — exit0; helper reuse theo6slotshape, generation-status scan tính cả transporterror không có HTTPstatus.
4. `node <TEMP>/c3-sales-targeted-audit.mjs <TEMP>/c3-sales-decision-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-decision-run-20261019 e825f3a95b91ee62ef890fe6e94a0db519557675` — exit0, source/model/prompt/binding/firewall/capture/artifact checksPASS.
5. Frozen Git source hashes/12published raw Gitblob hashes/6denominator/12one-requestaccounting/JSONparse/link checks/`git diff --check` — PASS trước report savepoint.16slotrunner chưa chạy vì condition không đạt; không claim command đóPASS.

Complexity delta: một optional transient name projection qua ingress/session/formatter/recovery, thêm focused tests và registration/runner reuse/evidence. Runtime model roles/layers/gates/persisted fields/frameworks thêm0. Owner+verifier giữ nguyên.

**Recommendation STOP sales/live readiness.** Code-label fix có deterministic evidence, rewrite owner chưa loại lỗi suy thành cam kết công năng và chưa chứng minh cải thiện giọng. Dừng tại báo cáo theo ngân sách; không tự fix/chạy tiếp16 hoặc vòng mới.
