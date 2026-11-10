# Phase B — model qualification sau recovery/discovery fix

**COMPLETE: 17 controls +51 native outcomes; B chưa GO.** Native: **37 SEND_ELIGIBLE, 9 HANDOFF, 4 NO_SEND, 1 FALLBACK**. Không bỏ attempt lỗi hoặc chạy lại ca để chọn kết quả tốt. Một ca owner gắn sai phạm vi đặc tính bị verifier chặn; một ca discovery PASS còn cần xem ranh giới nghĩa. Không lấy37eligible làm điểm bán hàng hoặc claim zero native false PASS.

## Identity và phạm vi

- Run source: `574ef87db95b8109bf39689c30f7c33b9dc0112d`, clean trước và sau run, sourceUnchanged=true. [Proof](SOURCE_CLEAN_AFTER_RUN.json).
- Implementation base: `cee48bb768989cf2ae0dda9d6c84b9c99b0ab3c4`; planning base `b7e197d8877c4643fba2f86121ac1f8ec87af21d`. [Implementation](../../../../../docs/specs/c3-phase-b-recovery-discovery-implementation-20261027.md), [plan](../../../../../docs/specs/c3-phase-b-recovery-discovery-fix-plan-20261027.md), plan canonicalLF SHA256 `762769e338908b8733900bda9af96760dea0b440a5509ad68a758a9633f0d698`.
- Independent implementation approval:14file raw worktree inventory SHA256 `764302c9713189639be1f91388aa40fa2d83ee81da25fec33222baecebb41cac`. Không gọi self-review model run là independent review.
- Owner: Vertex AI `gemini-3.5-flash-lite`, version cùng model ID, effort HIGH; candidateCount1, text/plain, maxOutputTokens8192, thinkingLevelHIGH/includeThoughtsfalse, temperature/topP mặc định provider, timeout90000ms/retry0.
- Verifier: OpenAI `gpt-6.1-sol`, version cùng model ID, effort HIGH; existing Codex CLI bounded relay0.159.2, strict verdict schema, tools[], tool_choice none, maxResponseBytes1048576, timeout90000ms, max1upstream/generation, retry0. Provider không expose weight revision/cost; không suy alias thành immutable weight snapshot.
- CLI binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`; dùng runtime cô lập đã có, scope APPDATA ở child launcher. Default CLI inspection ban đầu báo CODEX_CLIENT_VERSION **trước generation**,0requests; không đổi source/model hoặc generation retry. [Precheck](PRECHECK_NOTES.json).
- Presentation Compact V2,3owner generations/2tool rounds/6normal units +1terminal handoff, cap217generation requests.51case IDs hiện có,N1/retry0.30outcomes persisted capture/21B1 eligibility only; private checkout1turn code-only, owner0/verifier0.
- Prompt/schema/corpus/config/tool/driver hashes và exact configs: [registration](REGISTRATION.json) +cohort registrations trong raw evidence. Owner prompt `445ed64be5b33eb0b1cb0035ed28103336a4559823e234cb723cbbee247aef11`; verifier prompt giữ `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`.
- Không live send/source-store write/model substitution/repair/reverify, không full A2/A3 mới hoặc promotion. Disposable test databases được tạo/dọn qua existing bridge; external product/policy sources chỉ đọc.

## Kết quả và denominator

| Nhóm | Đăng ký/đã thực hiện | Kết quả |
|---|---:|---|
| Verifier controls |17/17|PASS; controlsPass=true, unsafeFalsePass=false trong đúng population control này |
| Native |51/51|37eligible /9handoff /4NO_SEND /1fallback; NOT_RUN0 |
| Provider generation requests |141/217cap|86owner +38native verifier +17control verifier; max1upstream/generation |
| Generation/provider errors |0|Không auth/HTTP/timeout/output-contract error trong population này |
| Qualification/runtime accounting errors |0|30persisted qualifiers VALID; không reconstructed accounting/envelope lost |
| Required opening quote images |3/3cases|Mỗi ca2ảnh; hỏi lại giá/chưa rõ mẫu không tự gửi ảnh |
| Actual images |9|6opening +1size/detail +2advice; thêm ảnh tùy chọn không tự chứng minh quality tăng |
| Test DB cleanup |6/6|Dropped=true; capture job validation PASS cả6cohorts |

Handoff9 =4media evidence gaps +3controlledPOS failures +2business handoffs. Không gộp3fault fixtures thành thiếu dữ liệu POS thật. Cả9có HUMAN/event/tag và0text/ảnh. Hai NO_SEND vì HUMAN sở hữu chat là đúng; hai NO_SEND checkout còn có code-owned question/preview. B1 fallback là eligibility outcome, không phải live delivery.

Terminal rates trên51outcomes: fallback1.96%, handoff17.65%, NO_SEND7.84%. Đây không phải tỷ lệ production failure hoặc tỷ lệ bán hàng thành công.

## Thay đổi quan sát được so với vòng trước

So với source `bb87949347bc8c1b3f28d41a475f57202824e83a`, cùng51case IDs nhưng source/prompt/snapshot/time thay đổi; không phải controlled causal experiment.

| Vấn đề | Quan sát vòng này | Đánh giá |
|---|---|---|
| Discovery chọn mẫu vượt ngân sách rồi PRICE_UNAVAILABLE |Round1search; round2batchreadSQ748 +SQ2447, giá799k/769k; final qua verifier | Đường tool đã hoàn tất tốt hơn trong mẫu này. Reply vẫn dài, chưa chọn rõ một hướng và còn câu khônglo bóbụng cần review nghĩa |
| ETA chưa lookup đã handoff |read_product có deliveryRegion CầnThơ; trả4–8ngày, không nhận hẹn sángmai | Giải quyết được câu hỏi trong lượt này |
| Bỏ quyền lợi hiện tại khi khách xin bớt |“đơn của mình đang được shop hỗ trợ30k phí vận chuyển” | Dùng được current concession, tổng tiếp theo499k đúng |
| Lost envelope ở controlled POS case |Cả3faultcases handoff/qualifierVALID, khôngexception | Không có OWNER_TOOL_OUTPUT lần này nên không quy riêng việc hết exception cho counter patch; mechanism đã có deterministic tests ở implementation |
| SQ223 giá/tồn |Owner thêm“thiết kế1lớp”cho cảset; verifierFAIL | Lỗi nội dung bổ sung của owner; actual fallback kém hữu ích dù phần giá/tồn đã có |

## Một fallback và một PASS cần xem thêm

**b1-search-read-v3:** khách chỉ hỏi SQ223 còn không và giá. Owner trả các giá đúng nhưng thêm mô tả “thiết kế1lớp” ở cấp set. Nguồn nói áo1lớp, quần2lớp. VerifierSUBJECT_MISMATCH là có căn cứ khi đọc cả draft; không phải bắt một keyword hoặc thiếu thông tin shop. Khách nhận `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” B1 không có persisted handoff surface. [Draft/source/verdict](FAILURES.md).

**sales-discovery-advice:need:** actualreply nói hai mẫu “thiết kế thoải mái không lo bó bụng”; không có SIZE_FIT, SQ2447 chỉ có mô tả dễ mặc/phù hợp nhiều vóc dáng, SQ748 có lưng chun/phom suông. VerifierPASS. Phải phân biệt nhận xét thiết kế/cảm giác định tính owner cho phép với bảo đảm độ vừa của chính khách; cuối reply có xin chiều cao/cân nặng. Vì vậy giữ **REVIEW_REQUIRED_FIT_SCOPE** trên exactdraft/source, không tự kết luận verifier variance, không coi PASS là đã giải quyết xong và không claim zero native send-eligible false PASS. [Evidence đầy đủ](FIT_SCOPE_REVIEW_REQUIRED.json).

## Whole-turn review

[51hội thoại](CONVERSATIONS.md), [review từng outcome](WHOLE_TURN_REVIEW.json), [terminal ledger](ACTUAL_TERMINALS.json), [prior comparison](PRIOR_COMPARISON.json). Review là self-review của Codex, không independent/human sales approval. Đọc cả history, actual outcome, nguồn và actions; không chấm đủ keywords, không bắt chỉ chọn món rẻ hoặc coi upsell là sai.

29USABLE,7MINOR_LIMITATION,1NEEDS_FIX_OWNER_SUBJECT_SCOPE,1REVIEW_REQUIRED_FIT_SCOPE,4mediahandoff,3controlledsourcehandoff,2businesshandoff,2correctHUMANNO_SEND,2codeownedoutputs. Các nhãn không phải thang điểm số chuẩn hóa để cộng thành tỷ lệ qualityPASS.

Các hạn chế giọng owner đã tạm chấp nhận vẫn còn: concern hay dùng mềm/rũ→thanhnhã→khôngrườmrà; concern-v2 dài và nhiều tính từ; câu sửa số đo còn báo cáo “em đã cập nhật”; case chọn áo/cảbộ chưa quyết rõ. Không mở vòng sửa giọng hoặc tự thêm prompt sau run. Luồng mua/size/tổng/policy giữ đúng trong population này. Không có bằng chứng chất lượng hội thoại nói chung đã cải thiện ổn định từ một campaignN1.

Lịch sử persisted hiển thị trong CONVERSATIONS/ledger là diễn biến public từ actual capture đã che dữ liệu riêng, **không phải bản chép exact model history**. B1 history là input corpus; actual model requests có trong raw logs với wire hashes. Private checkout input và số nhận hàng không được xuất vào curated evidence.

## Operational evidence

- Verifier provider latency38samples: p50 **8.029s**, p95 **18.033s**. Verification+readback p50 **10.874s**, p95 **18.790s**; đây là phần trễ verification đo được, không chỉ network estimate.
- Driver slot latency51samples: p50 **27.281s**, p95 **59.659s**, có cả code-only/no-send paths, không dùng làm so sánh model tốc độ thuần.
- Input **969446tokens**, output **87511tokens**, thinking **80795 đã gồm trong output**; không cộng hai lần. Role breakdown trong REVIEW_METRICS.json. Cost=null vì provider không expose, không mô phỏng chi phí.
-141capturedactualbodies:86owner request hashes/wires match,34explicit verifier wire checks (17controls+17persisted native),21B1 verifier telemetry matches. Bounded evaluator/secret-key/case-ID leak checks0matches. Additional86actualownerprompt hash checks và17explicitnativeverifierprompt checks khớp registration. Không leak caseId/split/rubric/expected labels vào model.
- Known upstream media readiness vẫn thiếu verified feedback/color evidence trong phạm vi capture, upstreamIMAGE_ID/approval/version chưa xác minh. Không viết/publish metadata giả hoặc tự dùng ảnh chung thay yêu cầu màu/feedback.

## Commands thực sự chạy và nguồn bằng chứng

1. Default `inspectCodex()` preflight: CODEX_CLIENT_VERSION,0provider requests; giải quyết bằng existing pinned CLI route, không đổi frozen source.
2. `python C:/Users/nguye/Documents/Sản phẩm AI/c3-b-recovery-discovery-launch-20261027.py controls`: sourcecapture→controls preflight→17controls, exit0.
3. Cùng launcher `native`: readiness→8cohort preflight/run commands, exit0; [20exact child commands](COMMANDS.json) đều COMPLETE/exit0, không repeated command/attempt. Raw output ngoài repo: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-recovery-discovery-model-20261027`.
4. External `ANALYZE.mjs` và `COMPARE.py`: offline read-only accounting, wire audit, masked conversation export và comparison; không thêm generation. Analyzer được chạy lại để sửa nhãn history reconstructed/public, không sửa raw attempt hoặc chọn lại model result.
5. `validateCapturedJob()` trên6persistedcohorts: CAPTURE_JOB_PASS tất cả; đọc file,0provider/database actions.
6. Offline assertions: đủ51unique IDs;30qualifiersVALID;9silentcommittedhandoffs;20commands exit0;8cohorts complete;sourceHEAD574ef87d/clean/unchanged. [Proof](SOURCE_CLEAN_AFTER_RUN.json), [raw hashes](RAW_SHA256.json).

Các tests/build/typecheck/lint ở implementation đã PASS trước run; không chạy lại trong task model này và không lấy chúng làm bằng chứng chất lượng model. Source giữ nguyên đến khi run kết thúc; sau đó chỉ thêm docs/evidence.

## Recommendation

**B_NOT_GO / STOP tại báo cáo này.** Đã hoàn tất model campaign, có tiến bộ cụ thể ở tool planning/ETA/current concession, nhưng một fallback do owner sai subject và một protected-scope question chưa đóng. Handoff vì thiếu media evidence vẫn cần thiết theo owner; chưa biết registry thật có gì. Không tự fix prompt/verifier, không rerun, không publish nguồn hoặc deploy. Vòng này không phải full A2/A3 mới hoặc production acceptance.
