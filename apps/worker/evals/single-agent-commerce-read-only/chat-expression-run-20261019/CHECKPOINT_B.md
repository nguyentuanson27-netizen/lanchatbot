# Chat-expression prompt — model evaluation

**Đã chạy6/6targeted slots:4USABLE/1NEEDS_EDIT/1actualfallback. STOP trước16conditional theo rule đã freeze.** Verifier5PASS/1FAIL không đồng nghĩa5câu đạt chất lượng. Không provider errors/timeout/retry hoặc mẫu bù. Giọng chưa cải thiện rõ; sửa prompt chưa chứng minh ổn định. A vẫn OWNER_BYPASS, không full Phase B/live GO.

## Source và phạm vi

- Implementation base: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; preparation/prompt fix `ae461e0d`.
- Runtime source **`849585aad1ac89f865396946cd6c9201208bfefc`**: clean worktree trước dispatch, HEAD không đổi suốt generation, SHA capture runtime không ghi ngược frozen source. Registration/executable/input đều committed trước provider.
- Owner prompt9.710bytes SHA256 **`057fcb7a47d69ffce4731a8ee58bb7ecafe36204bd6726128325e7838a813d70`**; verifier giữ `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`, schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Models/config/source facts/corpora/fallback/runtime giữ nguyên so sales-decision-run. Chỉ owner prompt thay. Hai captured contexts×3, exact input bytes giữ nguyên, tools disabled/replay clock/no full tool history; không6independent live journeys hoặc kiểm khả năng tìm nguồn.
- [TARGETED_REGISTRATION.json](TARGETED_REGISTRATION.json) giữ exact provider/version/effort/generation config/hashes/order/limits/rubric. [REGISTRATION.json](REGISTRATION.json) cho16conditional stage: **NOT_DISPATCHED_CONDITION_NOT_MET**, không tính16lượt chưa chạy làfailed hoặcPASS. Ceiling22slots/64requests không bị dùng hết và không tăng corpus.

Owner Vertex global `gemini-3.5-flash-lite` HIGH, candidate1/textplain/max8192out/includeThoughtsfalse/provider-default sampling/timeout90s/retry0; existing Vertex credential file. Verifier Codex login `gpt-6.1-sol` high, CLI0.159.2 bounded Responses relay/tools[]/tool_choice:none/parallelfalse/storefalse/streamtrue/one upstream request per generation/timeout90s/retry0/maxResponseBytes1048576/default sampling/outputcap. Không thay provider hoặc chạy additional judge role.

## Whole actual customer outcomes

| Population | Slots | USABLE | NEEDS_EDIT | Actual fallback | Generation requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| Changed occasion replay | 3 | 1 | 1 | 1 | 6 |
| Buying concern replay | 3 | 3 | 0 | 0 | 6 |
| Tổng targeted | 6 | 4 | 1 | 1 | 12 |

Complete denominator6slots/12requests (6owner/6verifier), mỗi record1upstream request;0providererror/timeout/retry/missing capture/BLOCKED. Terminal5SEND_ELIGIBLE/1FALLBACK, handoff/no-send0. Actual fallback1/6=16,67%, `C3_A_NONPROTECTED_V2`. Không majority vote/best-of-N hoặc bỏ attempt lỗi.

Whole actual/source primary review trước rejected-draft diagnosis, SHA256 `5e2c4b357f7d0f3911e9d66e688616cb1e5880d738148ca4d6f01f74c6cea309`, savepoint **`ebdde89470f5d1e9fa4a54209fa7baa354490cf9`**. Reviewer Codex, chưa có independent human/owner scoring. Rubric giữ nguyên: minor polish không chặn, không đếm từ/ngoặc/facts hoặc ép một tên món/CTA. [Đủ6hội thoại](CONVERSATIONS_AND_REVIEW.md).

## Findings

1. **Vẫn còn kiểu diễn đạt vừa sửa.** Draftslot2 bị chặn tiếp tục dùng “Nếu chị muốn… em gợi ý”, ngoặc mô tả chất liệu sau từng tên món và chuỗi khen trước khi hỏi khách chọn. Đây là rejected draft, không gọi là actual sent text. Các actual replies cũng còn câu dài và chuỗi mô tả. Có reply ngắn hơn nhưng chưa là cải thiện ổn định trên3samples/context.
2. **Concern vẫn cùng nhịp:** mềm/nhẹ/rũ→thanh thoát→vừa ngân sách900k. Ba câu dùng được theo rubric đã freeze, không tự trừ vì vài tính từ; nhưng sức thuyết phục chưa xử lý rõ phần ren nhiều về thị giác. Một reply đưa áo lẻ499k làm lựa chọn giảm ren, còn mơ hồ cách phối. Không ép tách bộ hoặc chốt đơn để nâng điểm.
3. **Slot1changedoccasion:** đưa hai hướng phong cách khác nhau rồi hỏi preference phân biệt, được phép theo review độc lập; không kết luận lỗi chỉ vì có hai mẫu. Vẫn dài/catalog và chưa chọn ưu tiên; ghi góp ý, không biến polish thànhfail hoặc cấm “em gợi ý”.
4. **Slot2fallback:** hứa tơ crep/tơ mềm giữ nếp rất tốt, ngồi lâu đứng lên vẫn mượt, nguồn chỉ có mô tả. VerifierFAIL đúng product:SV165/SV244. Khách chỉ nhận “Phần này em chưa trả lời được, chị nhé.”. Tư vấn định tính được phép, lời hứa hiệu quả sử dụng cụ thể chưa có căn cứ vẫn bị chặn đúng.
5. **Slot3sendeligible:** chọn Thanh Vũ trực tiếp, ngắn hơn, nhưng “giữ form gọn gàng suốt chuyến đi” gắn hiệu quả với toàn chuyến đi3giờ trong ngữ cảnh lo nhăn. Primary source review yêu cầu sửa phạm vi này trước gửi theo boundary của run trước; verifierPASS. Đây là1sendeligible protected-language concern do Codex phát hiện, chưa có owner/independent human adjudication. Không gọi riêng từ “gọn gàng” là lỗi, không cấm inference chất liệu thông thường, và không khẳng định zero observed unsafe sendeligible outcomes. Hai verdicts khác trên hai draft khác; chưa có bằng chứng đủ kết luận verifier chỉ chấm keyword.
6. **Không có source/provider fault:** cùng frozen sources có mô tả/alternatives nhưng không kết quả giữ form toàn chuyến. Chưa thể quy cause nội bộ model; owner còn mở rộng lời tư vấn, verifier có assessment khác tại slot3. Sửa câu gọn không tự sửa factual/effect boundary, và reply đượcPASS vẫn cần đánh giá cả ý lẫn giọng.

[Actual fallback, rejected draft và câu được gửi cần sửa](FALLBACKS_AND_REVIEW.md); [đối chiếu từng sample với lượt trước](COMPARISON.json). Previous targeted5USABLE/1fallback→current4USABLE/1edit/1fallback, exact6captures/config/models được giữ và owner prompt đổi. N3/context nhỏ, không coi chênh1nhãn là bằng chứng chất lượng tổng quát tệ hơn; historical scores/raw giữ nguyên. Không dùng5verdictPASS để nhận đạt giọng hoặc semantics.

## Operational evidence và commands

Verifier6records p50 **8.231s**, p95 **12.841s**; added verification6records p50 **8.236s**, p95 **12.846s** trong captured replay, không live-source readback. Owner latency không expose ở generation record shape; không dùng runner walltime thay model latency. Usage owner input/output **16905/10716**, verifier **29357/1206**, missingusage0/costNOT_EXPOSED.

Audit6bindings/6exactownerpromptcaptures/18wirebodies/5exactPASStexts/6capturehashes/12exactrawartifacts PASS,0evaluatorlabels leak. Accounting24wireevents không phải24generations, vì cùngrequestghi nhiềuphase; generationcount12. Frozen Git owner/verifier/input hashes3/3 và12rawGitblobhashesPASS; source executable/prompt/config không đổi trong run. NoDBcreated/no live send/order/deploy for captured advice.

Commands thực chạy:

1. Offline copy/register new run with exact6input bytes/corpus/run.py/run-targeted.py, currentownerhash; Python runner compile và stagedinput/corpus/runnerhashesPASS. Registration commit849585aa. Không sửa prompts/runtime trong run.
2. `python apps/worker/evals/single-agent-commerce-read-only/chat-expression-run-20261019/run-targeted.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-chat-expression-targeted-20261019` — exit0, clean-source/inputhash/launcherhash checks; preflight và targeted child đềuexit0. Exactargv/exit tại [raw/commands.json](raw/commands.json).
3. Whole6actual/source review→tempprimarylock→publish/savepointebdde894 trước diagnosis. `python <TEMP>/c3-gemini-prompt-once-publish.py <TEMP>/c3-chat-expression-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/chat-expression-run-20261019` — exit0,12exact-byteartifacts.
4. `python <TEMP>/c3-sales-targeted-metrics.py <TEMP>/c3-chat-expression-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/chat-expression-run-20261019` — exit0, completeaccounting và generationstatus/HTTP/error scan. `node <TEMP>/c3-sales-targeted-audit.mjs <TEMP>/c3-chat-expression-targeted-20261019 apps/worker/evals/single-agent-commerce-read-only/chat-expression-run-20261019 ebdde89470f5d1e9fa4a54209fa7baa354490cf9` — exit0; wire/source/binding/firewall/capture/artifactchecksPASS.
5. Offline frozenGit/rawhash/denominator/one-request checks và JSONparse/linkchecks/`git diff --check` PASS trước reportcommit. Không chạy full16runner vì điều kiện không đạt, không claim command đóPASS. Không rerun build/typecheck/lint hoặc unit suites từ lượt chỉ thêm registrations/evidence/report;58adapter/protocolPASS đã chạy trên prompt fixae461e0d ở lượt trước, không nhận là test mới của run này.

Complexity delta của lần chạy: reuse runners/input; chỉ registration/evidence/report. Runtime/role/layer/gate/parser/framework thêm0. Không đổi safety/size/state/privacy/receipt/CAS/policy hoặc production wiring.

**Recommendation STOP sales/live readiness.** Đã hoàn tất6targetedslots, giữ fallback vàsendeligibleconcern,16conditionalNOT_DISPATCHED. Giọng vẫn thiếu ổn định, chưa chứng minh fix đã đạt mục tiêu. Không tự sửa tiếp, chạy mẫu bù/16 hoặc mở vòng mới.
