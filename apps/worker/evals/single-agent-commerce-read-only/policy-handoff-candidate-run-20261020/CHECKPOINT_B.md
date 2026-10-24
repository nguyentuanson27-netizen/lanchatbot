# Phase B — candidate handoff five-slot model run — 2026-10-20

**COMPLETE_5_REPLY_QUALITY_NOT_COMPLETE**. Đủ5/5,14generation requests (10owner+4verifier), mỗi generation đúng1request. Error/timeout/retry0. Bốn free final drafts được verifierPASS/final gate và SEND_ELIGIBLE; một code-owned HANDOFF DEFECT. Không fallback/no-send. DB tạm đã drop. A OWNER_BYPASS; không B/live GO.

[Đủ5hội thoại và review](CONVERSATIONS_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json), [diagnosis](FAILURE_DIAGNOSIS.json), [metrics](METRICS.json), [source/wire audit](SOURCE_AND_WIRE_AUDIT.json). Primary khóa ở commit `9fe9a504` trước native tool/verifier diagnosis; review toàn actual customer outcome, không keyword checklist; humanAdjudication=false.

## Kết quả và so với lượt trước

| Ca | Terminal mới | Review | Finding |
|---|---|---|---|
| Đã mặc thử | SEND_ELIGIBLE | USABLE | Từ chối đúng; giọng vẫn hơi hành chính, không mở rộng quyền đổi. |
| Chỉ ướm, muốn đổi L | SEND_ELIGIBLE | NEEDS_EDIT | Mở như đồng ý rồi hỏi ngày nhận và nhiều tình trạng hàng. Thông tin còn thiếu có liên quan; chưa có handoff call, không phải giao dịch chuyển thất bại. |
| “Thử rồi”, chưa rõ cách thử | SEND_ELIGIBLE | NEEDS_EDIT | Vẫn đọc thời hạn/điều kiện trước câu hỏi phân biệt ướm và mặc. Finding cũ còn tồn tại. |
| Hỏi thời hạn/phí | SEND_ELIGIBLE | USABLE | Đúng15ngày/30k, trả hai ý được hỏi. |
| Lỗi đường may | HANDOFF/HUMAN | USABLE | Tin từ candidate DEFECT khớp chính xác, thông báo chuyển và bước kiểm tra/hướng dẫn đổi/trả. |

Primary:3USABLE/2NEEDS_EDIT; trước2USABLE/3NEEDS_EDIT. Khác biệt hữu ích rõ ở tin handoff báo lỗi do cấu hình, chưa chứng minh owner hiểu/diễn đạt tốt hơn ổn định. Ca chỉ ướm từ HANDOFF cũ thành hỏi thêm thông tin: không gọi request_handoff nên cấu hình EXCHANGE không được thực thi trong lượt model này. Hai tin EXCHANGE/DEFECT đã có28checkDB trước đó, nhưng model run hiện tại chỉ thực thi DEFECT. Không gộp thành hai handoff mới.

Còn cần quyết định cách owner tiếp nhận yêu cầu đổi khi một phần thông tin chưa có, để không mở lời như đã duyệt và không dồn câu hỏi. Ca chưa rõ cách thử cho thấy nguyên tắc hỏi trước đã được viết nhưng owner vẫn không áp dụng đầy đủ. Verifier kiểm protected meaning, không chấm câu văn/ngắn gọn/thứ tự hỏi;4PASS không đồng nghĩa4reply đạt chất lượng. Không kết luận slot2 là unsafe falsePASS chỉ từ câu mở khi toàn câu vẫn đang hỏi điều kiện.

## Source và giới hạn

Implementation fix `30e6aa654b2b37ac8edf204dcba817b93a7d4649`; implementation/report base `bfcaefb140d4af28a78417e8cbd1d064ebf95936`. Run source `05be90e8ef73cb09aa82c8f6e3a6e627b0933e81`; clean executable/config before preflight/provider. Frozen inputs khớp chính xác5ca cũ; one repetition, max20generations/retry0. Owner Vertex global gemini-3.5-flash-lite HIGH/candidate1/plaintext/max8192/includeThoughts=false/provider-default sampling/90s. Verifier OpenAI/Codex login gpt-6.1-sol high, CLI0.159.2, toolsnone/stream/storefalse/90s/một upstream request mỗi generation. Exact config trong REGISTRATION.json và runtime RUN_SOURCE.json.

Owner SHA `2d138eadfc0de1d7c268f2d2f4bc876d635a85663539fdbcd3d0a8261f7c1bb1`; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`; inputs `bdfb19ff86fb5d07001e8bb84a25defff7334b91b78ea992c9a06219fb703c20`; upstream `b61f8ab518d0cac4e25ecf912ef01a23ea34c2df7e97ea5e278f0ee83c886ec7`; effective candidate `15a60a2d7760c352c642b436435db11066ecbbce309e8fa227545a5707c06fca`. Policy sourceVersion `84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86`. Upstream matrix absent; in-memory isolated candidate only. Không publish upstream/default, đổi schema/model/API/runtime wiring hoặc thêm role/parser/gate/repair. Turn này chỉ freeze/evidence/report; complexity delta executable0.

Mỗi read kiểm actual upstream hash và effective candidate hash. Handoff dùng transaction/CAS/inbox guard, readback HUMAN/event/tag intent/outbox, capture-only dispatcher. Một tag intent không chứng minh Pancake đã nhận; dispatcher capture không phải nhân viên đã trả lời. Bốn SEND_ELIGIBLE chỉ được ghi, không gửi bằng Meta. Fence theo convention test hiện có, không qualification lease live.

## Accounting và measurement

- Registered5/recorded5;14/14generation requests,10owner+4verifier; requests-per-generation1; retry/error/timeout0. Không bỏ attempt hoặc mẫu bù. Hai request tăng so với trước do ca đổi thành draft cần verifier và ca lỗi đọc policy rồi mới handoff; không retry.
- Fallback0/5, no-send0/5, handoff1/5(20%).4verifierPASS, code-owned terminal không phải verifierPASS thứ5.
- Owner generation latency n10 p50 2048.5ms / p95 6564.9ms. Verifier n4 p50 7154.6ms / p95 10120.2ms. Added verification including readback/gate p50 8800.6ms / p95 11815.4ms. Mẫu nhỏ, không so model speed trên cùng công việc hoặc suy latency live.
- Owner input36483/output7722; verifier input14487/output241, usage đủ14generation; output có thể gồm reasoning. Cost NOT_EXPOSED.
- Audit10owner request/telemetryhashes,4verifier exact-draft/trusted bindings,22wire captures/0evaluator-label leaks,1committed handoff với captured text đúng candidate,10rawfiles khớpGit,16source Git identities giữ nguyên. Primary hash `5e2f23546119dfe3ef9e9e396c0ee84d58adb2fd7ba60211851e664a46c2cfa7` giữ nguyên theo UTF8/LF committed blob. Audit ban đầu so hash working-file CRLF với lock UTF8/LF nên fail; sửa giả định EOL trong audit, đối chiếu cả committed blob lẫn normalized working bytes. Không đổi primary/raw để làm kết quả đạt.

## Commands thực sự chạy

- `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/prepare.mjs --registration-dir apps/worker/evals/single-agent-commerce-read-only/policy-handoff-candidate-run-20261020 --handoff-matrix apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.candidate.json` → PREPARED5,0generation,candidateHandoff=true.
- Commit frozen inputs/SCOPE `05be90e8`; `git status --short` clean. Runtime captures this HEAD; no SHA written back into frozen source.
- `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/run.mjs %TEMP%/c3-policy-handoff-candidate-preflight-20261020 --registration-dir apps/worker/evals/single-agent-commerce-read-only/policy-handoff-candidate-run-20261020 --preflight` → PREFLIGHT_PASS,0generation.
- Same runner with output `%TEMP%/c3-policy-handoff-candidate-model-20261020` and without --preflight → exit0,5/5,14requests,DB dropped.
- `python %TEMP%/c3-policy-handoff-candidate-metrics.py` → accountingPASS14/14.
- `node %TEMP%/c3-policy-handoff-candidate-audit.mjs` → PASS after EOL assumption correction; no model re-run.

Prior fix109focused+28DB checks are not rerun or relabeled as this turn's commands. No executable/config behavior changed, so no new worker typecheck/build/lint/full suites or full B1/B2/B3 run. Original raw/primary preserved; no automatic patch or run extension.

## Recommendation

**STOP at this run: reply quality not complete.** Candidate handoff delivery worked in the observed DEFECT case. Ask-first behavior remains unresolved; EXCHANGE model routing not observed this time. Do not infer general readiness/stability from3/5review or4verifierPASS. No deployment/live send or B GO.
