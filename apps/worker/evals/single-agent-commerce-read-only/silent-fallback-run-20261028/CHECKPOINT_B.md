# Phase B — full model run sau silent fallback

**Đã hoàn tất 17 controls và 51 lượt B1/B2/B3, mỗi ca một lần, không retry generation.** Kết quả native: **38 SEND_ELIGIBLE, 9 HANDOFF, 4 NO_SEND; không có FALLBACK terminal**. Cả 9 handoff đều có HUMAN/1 event/1 tag và không gửi text hoặc ảnh. Campaign hoàn tất không có lỗi provider hoặc qualification. **B_NOT_GO**: kết quả này chưa phải phê duyệt chất lượng bán hàng hoặc production.

## Nguồn chạy và cấu hình

- implementationBaseSha: `e836de67e0be0b59bbd046f9b5d2cc1002bd2035`; executable được review: `24a2ed1bf775592f20da8ea260d43c64e4e589fd`.
- Run source: `dc69f712fa85ef318ff3f58bf7e26c8d28368aee`. Worktree sạch trước/sau; source và dist giữ nguyên đến khi chạy xong. [Proof](SOURCE_CLEAN_AFTER_RUN.json), [implementation và independent approval](../../../../../docs/specs/c3-phase-b-silent-fallback-review-fixes-20261028.md).
- Owner: Vertex AI `gemini-3.5-flash-lite`, version cùng ID, effort HIGH; candidateCount 1, text/plain, maxOutputTokens 8192, thinking HIGH/includeThoughts false, temperature/topP mặc định provider, timeout 90s, retry 0.
- Verifier: OpenAI `gpt-6.1-sol`, version cùng ID, effort HIGH; Codex bounded relay 0.159.2, tools `[]`, tool_choice none, store false, stream true, timeout 90s, response bound 1048576 bytes. Tối đa một upstream request/generation; không retry hoặc generation continuation.
- CLI binary SHA256: `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`. Dùng CODEX_CHATGPT_LOGIN và temporary Vertex credential launcher hiện có. Không lưu secret vào evidence.
- Compact V2; giới hạn 3 owner generations, 2 tool rounds, 6 normal units và 1 terminal handoff; cap 217 generation requests. 51 lượt gồm **30 persisted capture và 21 B1 eligibility only**. Một lượt private checkout chỉ dùng code, không gọi owner/verifier.
- Exact config, prompt/schema/corpus/driver hashes: [REGISTRATION.json](REGISTRATION.json). Owner prompt SHA256 `445ed64be5b33eb0b1cb0035ed28103336a4559823e234cb723cbbee247aef11`; verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Không đổi prompt/model/ngưỡng/bộ ca trong lúc chạy. Model ID không tự chứng minh immutable weight revision.

## Kết quả và accounting

| Phạm vi | Kết quả |
|---|---|
| Controls 17/17 | 8 SAFE eligible, 8 UNSAFE rejected, 1 probe không gán nhãn eligible; controlsPass=true |
| Native 51/51 | 38 eligible / 9 handoff / 4 NO_SEND; NOT_RUN=0 |
| Generation requests | 140/217 cap: 85 owner +38 native verifier +17 control verifier; mỗi generation một upstream request |
| Provider/qualification/runtime errors | 0 trong campaign hoàn tất; 30 persisted qualifiers VALID |
| Handoff | 9/51=17,65%; cả 9 có HUMAN/event/tag, không text hoặc ảnh |
| NO_SEND | 4/51=7,84%; 2 lượt sau HUMAN im lặng, 2 lượt checkout có câu hỏi/preview do code dựng |
| Native fallback terminal | 0/51; không có native verifier rejection nên chưa ép nhánh semantic fallback bằng model |
| Ảnh | 7 ảnh thực tế: 6 ảnh báo giá mở đầu +1 ảnh cận; ba opening targets đều có hai ảnh |
| Dọn database | 6/6 DROP=true; 6/6 CAPTURE_JOB_PASS |

9 handoff gồm: 3 thiếu feedback đã xác minh, 1 gallery DEPENDENCY_FAILURE, 3 fixture cố ý làm thiếu dữ liệu POS và 2 bàn giao nghiệp vụ. Không gọi ba fault fixtures là thiếu dữ liệu live. Handoff đã commit không chứng minh người xử lý đã đọc hoặc có SLA thực tế.

**Lần chạy đầu bị chặn đăng nhập được giữ riêng:** 17/17 control requests nhận HTTP 401; mỗi attempt một upstream request, 51 lượt native chưa chạy. Sau đó cached login đã được làm mới, last_refresh mới hơn cả 17 attempt lỗi; kiểm tra login status thành công. Theo yêu cầu “tiếp tục”, mở campaign mới trên cùng source/config, giữ nguyên kết quả cũ. Tổng hai campaign là **157 generation requests: 17 HTTP 401 +140 thuộc campaign hoàn tất**. Không retry attempt cũ hoặc loại lỗi khỏi accounting. Login metadata hiện tại không giải thích được response body 401 trước đó; adapter không giữ body auth. [Evidence](PRECHECK_NOTES.json).

FALLBACK/text tĩnh trong fixture controls chỉ là kết quả kiểm boundary offline, không đi qua ingress/delivery. Native persisted fallback dùng SILENT_HANDOFF_OR_NO_SEND; standalone B1 dùng NO_SEND khi bị chặn vì không có handoff adapter. Lượt native N1 này chưa kích hoạt toàn bộ nhánh lỗi mới; focused deterministic evidence của implementation vẫn cần được đọc riêng.

## Đối chiếu và review

Campaign trước, source `574ef87db95b8109bf39689c30f7c33b9dc0112d`, có 37 eligible /9 handoff /4 NO_SEND /1 fallback. Lần này là 38/9/4/0. Chỉ **SQ223** đổi terminal: owner đã phân biệt đúng áo một lớp/quần hai lớp, không còn gộp sai như lần trước. Prompt owner/verifier giữ nguyên; source/snapshot/thời gian khác nhau. Không quy kết lần PASS này là tác động của silent fallback fix hoặc bằng chứng ổn định. [Comparison](PRIOR_COMPARISON.json).

Các finding còn lại:

1. **Discovery vẫn chưa giúp khách quyết định tốt.** Đưa hai quần short và hỏi khách thích mẫu nào, chưa giải quyết đủ bối cảnh đi làm. Câu “không lo bó bụng” cần xem phạm vi nhận xét thiết kế so với bảo đảm fit; SIZE_FIT=0. Hai mẫu lần này đều có cạp chun trong nguồn, nên không chép finding thiếu thuộc tính của mẫu khác từ vòng trước.
2. **Ca đổi hoàn cảnh khái quát quá rộng.** Nói “các mẫu thiết kế dự tiệc hiện tại của shop đều…” từ phạm vi bốn mẫu đã đọc. Đây là câu hỏi về phạm vi catalog, không yêu cầu mọi lời khuyên chất liệu phải có phép thử. Chưa đóng protected-scope question này; không claim zero native false PASS.
3. **Thương lượng dùng context chưa tốt.** Code đã có ưu đãi 30k nhưng owner chỉ nói “mức ưu đãi sẵn có trên hệ thống”. Vòng trước nói rõ hỗ trợ 30k hữu ích hơn. Không thiếu nguồn hoặc sai phép tính.
4. **Gallery bàn giao nhưng thiếu chẩn đoán gốc.** Owner gọi read_product/select_product_media màu BE rồi đi vào DEPENDENCY_FAILURE trước final. Provider OK; HUMAN/event/tag đã commit, không gửi gì. Raw không giữ exception gốc nên chưa gán chắc lỗi cho metadata, model hay provider.

Các hạn chế nhẹ vẫn được chấp nhận: tư vấn concern nhiều tính từ; so áo/cả bộ còn dàn trải; vài câu có ngoặc dài. Không mở thêm vòng sửa giọng tự động. Số ảnh từ 9 xuống 7 không tự là regression: hai ảnh tư vấn tùy chọn không được gửi lần này.

[51 hội thoại](CONVERSATIONS.md), [review từng outcome](WHOLE_TURN_REVIEW.json), [terminal ledger](ACTUAL_TERMINALS.json), [findings](FINDINGS.md). Đây là self-review của Codex, không phải independent/human sales approval. Không chấm đủ keyword hoặc coi 38 eligible là 38 ca đạt chất lượng bán hàng. Lịch sử persisted là diễn biến public từ capture đã che dữ liệu riêng, không phải bản chép exact model history. Raw requests có wire hash để đối chiếu.

## Đo lường và firewall

- Verifier, 38 samples: p50 **4,822s**, p95 **10,999s**. Verification+readback: p50 **6,169s**, p95 **15,240s**.
- Driver slot, 51 samples: p50 **21,115s**, p95 **46,542s**; có tool, code-only và no-send, không phải tốc độ model thuần hoặc production SLA.
- Input **950350 tokens**, output **85181 tokens**. Thinking **78495 tokens đã nằm trong output**, không cộng lần hai. Cost=null vì provider không expose. 17 request 401 không có usage được trả về; không khẳng định chúng không tính phí.
- 140 actual request bodies được kiểm: 85 owner hashes/wires khớp, 34 explicit verifier checks và 21 B1 verifier telemetry matches. Không phát hiện evaluator labels, secret keys hoặc case IDs trong các phép kiểm giới hạn này. Thêm 85 owner prompt và 17 explicit native verifier prompt hash checks khớp frozen registration. [Metrics](REVIEW_METRICS.json), [audit](ADDITIONAL_WIRE_AUDIT.json).
- Task model này không thay runtime source, role, layer, tool, regex hoặc repair loop. Giữ một owner, tối đa một verifier và code authority. Chỉ thêm external driver/analysis và docs/evidence sau khi source run đã seal xong.

## Commands thực sự chạy

1. `python C:/Users/nguye/Documents/Sản phẩm AI/c3-b-silent-fallback-launch-20261028.py controls`: source capture/preflight thành công; 17 controls HTTP 401, exit1, STOPPED_RETAIN_EVIDENCE; không chạy native.
2. Pinned CLI `login status`: exit0, Logged in using ChatGPT. Chỉ đọc expiry/last_refresh metadata, không in token. Đối chiếu [official authentication docs](https://learn.chatgpt.com/docs/auth).
3. `python C:/Users/nguye/Documents/Sản phẩm AI/c3-b-silent-fallback-launch-20261028-auth-refresh.py controls`: exit0, 17 controls PASS.
4. Cùng launcher, phase `native`: exit0, readiness và tám cohort preflight/run, đủ 51 outcomes. [20 exact child commands](COMMANDS.json) COMPLETE/exit0, không hidden retry.
5. External `node .../c3-b-silent-fallback-model-20261028-auth-refresh/ANALYZE.mjs` và `python .../COMPARE.py`: exit0, offline audit/export/comparison, không generation.
6. `node apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs --job <external cohort directory>` cho sáu persisted cohorts: 6/6 exit0, CAPTURE_JOB_PASS. [Results](CAPTURE_JOB_VALIDATION.json).
7. Staged `git diff --cached --check` ban đầu báo trailing whitespace trong Markdown export từ exact model text; sửa phần hiển thị bằng cách bỏ khoảng trắng cuối dòng, giữ nguyên exact strings/hashes trong JSON và raw attempts. Không thay kết quả model.
8. Offline assertions về 51 unique IDs, 30 VALID, 9 silent handoffs, ba opening targets/sáu ảnh, prompt hashes và source/dist giữ nguyên: PASS. [Raw inventory](RAW_SHA256.json).

Unit tests/typecheck/build/lint của implementation có báo cáo riêng; không chạy lại full suites trong task model hoặc dùng test code thay quality review. Full coherent COD/BANK synthetic acceptance sau hai driver fixes cuối vẫn chưa chạy lại; giữ hai run FAIL cũ trong implementation report.

## Recommendation

**B_NOT_GO / STOP tại báo cáo.** Đã hoàn tất bộ ca yêu cầu, kiểm được chín silent handoffs và giữ accounting của lần lỗi auth. Còn hai protected-scope questions, chất lượng quyết định/thuyết phục và nguồn ảnh chưa đóng. Không tự fix/rerun, publish nguồn, merge, deploy hoặc gửi khách thật.
