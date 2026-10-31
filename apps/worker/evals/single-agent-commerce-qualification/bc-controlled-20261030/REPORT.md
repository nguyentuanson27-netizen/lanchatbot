# Đối chứng B–C giữ nguyên đầu vào

Đã dựng và chạy đối chứng offline hai bản code, cùng sáu request B cũ được chạy lại ba lần/request. Kết quả tách được một hồi quy đọc dữ liệu, hai nhóm ảnh hết hạn và một phần biến động quyết định của owner. Chưa đủ bằng chứng quy lỗi search cho thuật toán hay index.

Đây là chẩn đoán theo thành phần và một điểm quyết định owner, **không phải chạy lại toàn bộ hành trình B/C**, không chấm qualification mới. Sáu ca B trước đây SEND_ELIGIBLE; trạng thái đó không tự chứng minh chất lượng tư vấn đã PASS. Không sửa prompt/runtime/source shop, không tool write hoặc gửi khách trong đợt này.

## Khóa đối chứng

| Thành phần | Identity |
|---|---|
| B lịch sử, detached worktree/build riêng | `4efbea67356f1e3e4f7fa886dec48d58c4ab1474` |
| C runtime | `ec46829325378e4a2d5fc126a0cd4224e6febbcf`, runtime giống executable97c6ce86/run89070980 |
| Diagnostic executable đã commit và seal trước inference | `3731e05ba6775d162eae241d4e82522d4847ce38` |
| Frozen input digest | `5702bcdd3bcea7563eb020869b33437485e37d6c5dc250f66160950abf7ca924` |
| Provider/model/effort | Vertex AI, `gemini-3.5-flash-lite`, HIGH; observed modelVersion khớp cả18 |
| Config | candidateCount1, text/plain, maxOutputTokens8192, includeThoughts=false; temperature/topP giữ omitted/provider default; timeout90000ms; retry0 |
| Mẫu owner | 6 request gốc ×3, thứ tự xen kẽ theo repetition; 18 đăng ký/18 hoàn tất/18 generation HTTP/0 lỗi/0 retry |
| Usage | input112926 tokens; output gồm thinking16939; không thiếu usage; cost không được expose, ghi unknown |

Raw giữ tại `C:/Users/nguye/Documents/Sản phẩm AI/c3-bc-controlled-20261030-01/`, ngoài checkout: INPUTS/SEAL, B_CODE_2/C_CODE_2, 18 claim/result/accounting, OWNER_REQUESTS/RESULTS và ANALYSIS. [EVIDENCE.json](EVIDENCE.json) giữ hash, kết quả thành phần và các quyết định đã bỏ opaque signatures. Không đưa raw request/credential vào repo.

Owner được gửi nguyên captured JSON body B; ba request trong mỗi ca có cùng byte hash khi serialize. Giữ prompt, history, giờ trong context, tools và generation config; không chèn tên ca/nhãn chấm vào model input. Firewall đã kiểm **18/18 captured bodies**. Mọi sample tối đa một generation HTTP, không retry, không chạy tool do model đề xuất. Seal kiểm1287 artifact hashes, source sạch và HEAD trước mỗi attempt; analysis kiểm lại sau run. Script analysis thêm sau run chỉ đọc evidence, không nằm trong executable inference.

## 1. Hồi quy do code: tái hiện được tại read_product

Hai code arm dùng cùng frozen world107products, cùng query và clock, đã assert source-input hashes bằng nhau:

| Query | B | C |
|---|---|---|
| SV2447, không chọn offer | OK | REJECTED / SOURCE_EVIDENCE_CONFLICT |
| SV2447, AO | OK | OK |
| SV2447, SET_VAY | OK | OK |
| SV1561, không chọn offer | OK | OK |
| SV1561, SET_VAY | OK | OK |

Đây là khác biệt code xác định được trên cùng đầu vào, không cần model hay freshness thay đổi. C xây thêm tuple evidence; all-offer projection từng được đo9961bytes so với bound8192. Catch ở `single-agent-commerce-read-only-tools.ts` quanh merge trả SOURCE_EVIDENCE_CONFLICT cho cả lỗi bound, khiến nguyên nhân bị ghi như conflict nguồn. Không suy rằng mọi handoff C đều do lỗi này; năm query trên là component probes, không phải replay toàn bộ chuỗi tool lịch sử.

Hai control không phát hiện hồi quy:

- Sáu captured trusted snapshot/draft B đều qua hardPrecheck B và C ở cùng mốc ngay sau mọi observedAt. Đây chỉ là hard precheck, không thay semantic verifier/final send gate.
- Size engine nhận đúng cùng chart/profile/input hash cho khách158cm/52kg, thích rộng: **cả B và C chọn M**. Không có profile write hay xác nhận SIZE_FIT/send mới.

**Giới hạn clock:** captured verifier frame chỉ giữ turn start. Hai ca size có fact sinh sau turn start, nên cả hai arm báo STALE nếu ép kiểm ở turn start. Mốc kiểm tiếp theo được suy ra bằng max(observedAt,turnStart)+1ms, ghi rõ `DERIVED_LOWER_BOUND_NOT_CAPTURED_FINAL_GATE_TIME`; không gọi đây là giờ final gate lịch sử hoặc lỗi stale của runtime cũ.

## 2. Freshness: tách khỏi hồi quy

Giữ nguyên product/image/source timestamps; chỉ đổi clock offline quanh expiry±1ms và thời điểm capture `2026-10-29T19:20:19.998Z`. Đây là media-only time counterfactual, không làm mới quyền gửi hay dời toàn bộ world clock.

| Ảnh GENERIC | B trước/sau expiry/capture | C trước/sau expiry/capture | Diễn giải |
|---|---|---|---|
| SV1561 — Khánh Trang | 2 / 0 / 0 | 2 / 0 / 0 | Nguồn ảnh hết hạn ở cả hai code |
| V406 — Ngọc Trâm | 2 / 0 / 0 | 2 / 0 / 0 | Nguồn ảnh hết hạn ở cả hai code |
| SV2447 — Thạch Thảo | 2 / 0 / 0 | 0 / 0 / 2 | C dùng explicit revalidation mới; B cũ bỏ qua proof này |

SV2447 không phải hồi quy ảnh: ở clock cũ, proof revalidation của C còn ở tương lai nên chưa dùng; đến capture thì proof hợp lệ và C lấy được hai ảnh. Không gộp mọi ảnh theo product observedAt.

V406 còn mismatch riêng: owner chọn DETAIL+TOP nhưng ảnh có part VAY; đổi selector không tự chữa expiry. Khánh Trang ở run C gọi quote_product đúng tác vụ, rồi bị dependency ảnh fail; không đủ căn cứ gọi đó là owner tự yêu cầu ảnh. Quote task đã có từ trước Phase C, không phải mọi dependency này mới xuất hiện khi sang C.

## 3. Context/search: có khác biệt context, chưa xác định nguyên nhân index

Với cùng world và code từng arm:

- Initial chỉ SV2447: prepare có runtime product SV2447 và offers/preparation literals.
- Initial SV2447+SQ2447: prepare không có runtimeProducts và không tự đặt currentProductId. Cả B lẫn C giống nhau.
- Chưa gọi read_policy: không có policy literal đầy đủ; gọi đúng read_policy thì cả hai nhận cùng policy ref.

Control prepare này **không truyền callback admission native request** nên không đo đầy đủ current numeric preparation được bật ở harness C. Không suy từ nó rằng C không có cải tiến preparation. Nó chứng minh đường metadata khi tên rút gọn có hai mã đã tồn tại ở B, không phải tự phát sinh trong C.

Ca C s07 có cả SV2447/SQ2447 nhưng thiếu dữ liệu chi tiết/focus; owner đi search và không gọi sizing. Đối chứng size engine ở trên cho thấy nguồn chart/profile thử nghiệm có thể trả M; không được kết luận ngay “thiếu chart”. Tuy nhiên request s07 không giống request size B một sản phẩm, nên so kết quả hai ca đó không đo riêng owner instability.

**Search algorithm: UNRESOLVED.** Không có đầy đủ snapshot DB/index/vectors HNSW B lịch sử. Frozen world dùng chung cho code arms là capture C, không phải full historical B database. Không dựng kết quả search giả, không gọi exact-cosine là parity HNSW, không phân bổ lỗi search cho model/code chỉ từ raw ranking khác nhau.

## 4. Owner: biến động với request giống hệt

| Ca B đã gửi được | Quyết định đầu B lịch sử | Ba sample mới, cùng body | Kết luận tại điểm này |
|---|---|---|---|
| b1-price | read_product ba offer | 2 lần ba offer; 1 lần chỉ SET_VAY | **Phạm vi đọc thay đổi**, có thể ảnh hưởng completeness/budget; chưa chạy tool để đo terminal |
| b1-search-read-v2 | search “set váy Khánh Trang” | Cùng query3/3 | Không thấy biến động bước đầu; chưa đo ranking hoặc phần sau |
| b1-current-policy | read_policy | read_policy3/3 | Không thấy biến động bước đầu |
| sales-size-advice:height-weight | recommend_size + height/weight/RELAXED | Cùng giá trị và tool3/3 | SourceQuote dài/ngắn khác, không phải đổi size/quyết định |
| media-and-size:ask | select_media → read_product → recommend_size | 1 lần select_media → recommend_size → read_product; 2 lần recommend_size → select_media | **Số và thứ tự tool thay đổi**; phần sourceQuote khác được giữ riêng |
| stateful-quote | FINAL, tổng978100đ | FINAL3/3, cùng tổng978100đ, câu chữ khác | Biến động cách trình bày; chưa có bằng chứng sai tổng hoặc chất lượng tốt hơn |

Không dùng số unique normalized output làm số “ca model lỗi”: normalization bỏ call IDs/thought signatures nhưng cố ý giữ args/sourceQuote và text. Có4/6 ca khác raw normalized output giữa ba lần, song hai ca trong số đó chỉ khác dẫn chứng/câu chữ. Đọc quyết định thực tế mới tách được hai ca thay phạm vi/chuỗi tool. Ba mẫu giống nhau cũng không chứng minh ổn định tổng quát.

## Commands và verification thực chạy

Các đường dẫn tương đối dưới đây chạy từ repo hiện tại, trừ install/build B được ghi rõ. Mọi log nằm ngoài checkout.

```powershell
# B detached worktree exact4efbea67
pnpm install --offline --frozen-lockfile --ignore-scripts
pnpm --filter @lana/worker build

# Current diagnostic: focused6/6 và toàn qualification86/86 PASS
node --test apps/worker/evals/single-agent-commerce-qualification/bc-control.test.mjs
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
node --check apps/worker/evals/single-agent-commerce-qualification/bc-seal.mjs
git diff --check

node apps/worker/evals/single-agent-commerce-qualification/bc-control.mjs . ../lanchatbot-bc-control-b-4efbea67 ../c3-b-media-size-context-model-r2-20261027 ../c3-c-readfix-world-resolved-20261030-01.json ../c3-bc-controlled-20261030-01
node apps/worker/evals/single-agent-commerce-qualification/bc-code-replay.mjs ../c3-bc-controlled-20261030-01/INPUTS.json B ../c3-bc-controlled-20261030-01/B_CODE_2.json
node apps/worker/evals/single-agent-commerce-qualification/bc-code-replay.mjs ../c3-bc-controlled-20261030-01/INPUTS.json C ../c3-bc-controlled-20261030-01/C_CODE_2.json
node apps/worker/evals/single-agent-commerce-qualification/bc-seal.mjs ../c3-bc-controlled-20261030-01/INPUTS.json ../c3-bc-controlled-20261030-01/SEAL.json
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-qualification/bc-owner-replay.mjs ../c3-bc-controlled-20261030-01/INPUTS.json ../c3-bc-controlled-20261030-01/SEAL.json ../c3-bc-controlled-20261030-01
node apps/worker/evals/single-agent-commerce-qualification/bc-analysis.mjs ../c3-bc-controlled-20261030-01 ../c3-bc-controlled-20261030-01/ANALYSIS.json
```

Offline harness bản đầu lỗi do gọi API không tồn tại ở B và thiếu provenance profile; đã sửa adapter đo, không sửa runtime hai arm. Log failed giữ nguyên. B_CODE/C_CODE phiên bản đầu kiểm ở turn start cũng giữ nguyên; bản `_2` thêm clock lower-bound và không che kết quả turn-start. Những lỗi dựng phép đo này không tính là provider/runtime failures. C worker build/typecheck/lint không chạy lại trong diagnostic này: production source/packages không đổi so với ec; dùng dist hiện hành và hash seal. Không nhận verification cũ là command mới chạy.

## Hướng tiếp theo từ bằng chứng

1. Sửa đúng contract projection/bound và error attribution của all-offer read; differential test cùng snapshot cho cả đọc một phần và toàn bộ. Không nâng trần/cắt facts ngẫu nhiên để cứu output.
2. Làm rõ chu kỳ cập nhật/revalidation ảnh từ nguồn shop. Không cho ảnh expired qua và không gia hạn bằng heartbeat; tách quyết định báo giá khỏi ảnh theo rule nghiệp vụ đã chốt.
3. Chuẩn hóa giải quyết tên rút gọn/focus và cấp đúng nguồn cho sizing/policy; giữ quyền chọn lời tư vấn của owner. Đo native preparation bằng đúng callback trước khi kết luận hiệu quả.
4. Với search, lưu đủ query/embedding/index identity và filtered candidates cho đối chứng tiếp theo. Với owner, test chuỗi tool sau first-step trên cùng observation tape trước khi quy lỗi cho giọng/prompt.

Chưa thực hiện các sửa runtime trên. Phase C qualification/C3 comparison vẫn BLOCKED/NOT_RUN; không dùng phép đo này để đề nghị GO hoặc phủ nhận những ca B đã làm được.
