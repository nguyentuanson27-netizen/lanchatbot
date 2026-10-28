# Phase B — advice focus comparison — 2026-10-20

**12/12 outcomes đã chạy; STOP trước 16 lượt tích hợp.** Bản mới vẫn có một fallback, lời khen dài và cách nói như báo cáo dữ liệu. Chưa chứng minh cải thiện về chọn ý/giọng tư vấn. A vẫn OWNER_BYPASS; đây là Phase B diagnostic, không phải A2/A3 mới hoặc A PASS/B live GO.

## Thay đổi và nguồn chạy

Preparation base `fdb2a63e1b8522042274b812b25ac0cffa53c2a6`. Implementation commit `ef3a1cfb`. Runtime source **`be9ec1c1f53976460b0c644afef4e100d0be0b7f`** sau commit/freeze và clean worktree; HEAD không đổi trong generation. Primary được lưu tại **`3a18227d`** trước khi đọc rejected drafts/verdict diagnosis; hash primary `5999a5f747db2cc92c04f8f72327506ca14c25cf01fa27676d1909b7be092de1`.

Owner prompt thay/gộp hai phần chọn nội dung và giọng: dùng dữ kiện để cân nhắc, chỉ diễn đạt chi tiết phục vụ lời khuyên/việc mua; giữ trả đủ nhiều câu hỏi và chủ động đề xuất. Nhắc dùng từ thông dụng, không kéo dài một ý bằng nhiều lời khen gần nghĩa. Không thêm đáp án, ví dụ theo case, từ cấm, quota câu hoặc CTA bắt buộc.

Prompt 9.710 → 10.044 bytes, tăng334; không coi độ dài là kết quả chất lượng. Phần nguồn/tool, quyền tư vấn có căn cứ, policy, size/state/tiền/receipt/privacy giữ nguyên. Verifier, model/config, canonical source, source-config và fallback không đổi. Không promote các description candidate của run trước.

Harness eval thêm4dòng chọn owner instructions đã freeze cho từng row và lưu12prompt hashes trong registration. Test mở rộng actual request/inference assertion và reject override rỗng/quá bound trước dispatch. Không đổi runtime TypeScript, provider API, production entrypoint, role/gate/state/layer hoặc parser/rewrite/repair loop. Code vẫn sở hữu deterministic authority; model chọn ý và lời nói.

## Phân bổ và kết quả

| Arm | Lượt | USABLE | NEEDS_EDIT | UNUSABLE / actual fallback | Send eligible |
| --- | ---: | ---: | ---: | ---: | ---: |
| Control — prompt trước sửa | 6 | 3 | 1 | 2 | 4 |
| Candidate — prompt mới | 6 | 4 | 1 | 1 | 5 |
| Tổng | 12 | 7 | 2 | 3 | 9 |

Hai ca trọng tâm ×2 lần/arm =8; hai coverage controls ×1 lần/arm =4. Không12case độc lập, không live journeys; không majority vote/best-of/mẫu bù. Số fallback ít hơn ở candidate là mô tả tập nhỏ, không chứng minh cải thiện ổn định hoặc nhân quả. Nhãn primary là agent self-review toàn đoạn, không blind human review; nhận xét giọng có tính định tính, raw/historical labels giữ nguyên.

- **Đổi hoàn cảnh, nhờ chọn mẫu đỡ nhăn:** control2fallback; candidate1USABLE/1fallback. Câu candidate được gửi có chọn Thanh Vũ và lý do liên quan đến nhăn nhưng vẫn kéo dài sang ren cotton/thanh lịch/sang trọng/thoải mái. Chưa có bằng chứng chọn ý/giọng đạt mục tiêu.
- **Băn khoăn ren nhiều:** cả4câu send eligible. Candidate vẫn chuỗi mềm/nhẹ/rũ/thanh thoát/nhã nhặn/sang trọng. Theo mốc cũ, dùng được chức năng không tự thành tư vấn hay. Controlslot8 NEEDS_EDIT còn vì mời mua theo hướng “để em chuẩn bị gửi hàng”, vượt bước đang có của bot; không gọi đây là receipt hoặc việc giao đã xong.
- **Nhiều câu hỏi, nguồn cố ý thiếu:** controlslot9 USABLE; candidateslot10 NEEDS_EDIT về cách trình bày cả phần chưa có: “Hiện tại dữ liệu shop chưa có thông tin… nên em chưa tra được”. Hai câu đều giữ chất liệu/dáng và không tự tạo giá/tồn/bán lẻ. Chưa quan sát bỏ sót câu hỏi; không quy thiếu dữ kiện fixture thành lỗi model. Nhận xét cần viết lại giọng không phải verdict protected safety.
- **Chủ động khi đổi sang sân khấu:** cả2USABLE theo boundary tư vấn thiết kế/thẩm mỹ đã được owner chấp nhận. Candidate chọn một món Diệp An rõ hơn control đưa hai món; chỉ1sample/arm nên chưa chứng minh ổn định. Vẫn lời khen cuối đoạn; không yêu cầu test riêng cho mọi nhận xét về thiết kế hai lớp.

Coverage limits: hai ca chính và partial lấy từ capture `wording-stability-2-20261019`; proactive lấy lịch sử `model-code-division-run-20261019`. Exact source files/hashes/capture IDs/clocks được freeze trong TARGETED_REGISTRATION. Không sửa lời khách/history/nguồn hoặc viết câu mới để fit test. Partial capture vốn tool-enabled, được replay tools-off; không đo khả năng tìm/đọc bổ sung hoặc mutation. Proactive là historical stage scenario với alternatives đã capture, không có live search mới. Không gộp thành kết luận toàn catalog.

## Ba fallback — diagnosis sau primary

Mọi fallback dùng **`C3_A_NONPROTECTED_V2`**: “Phần này em chưa trả lời được, chị nhé.” Actual fallback3/12=25%; candidate1/6=16,67%, control2/6=33,33%; handoff0/no-send0. Verifier9PASS/3FAIL, không timeout/malformed/provider error.

- Slot1/control hứa ngồi xe ba tiếng đứng lên vẫn phẳng phiu và có mẫu ít nhăn tuyệt đối. FAIL refsSV2447/SV244; reviewer đồng ý chặn các bảo đảm này.
- Slot5/candidate dùng “hoàn toàn yên tâm không lo nếp gấp” để thuyết phục chọn Thanh Vũ. FAIL refSV165. Reviewer đồng ý chặn kỳ vọng loại bỏ băn khoăn nếp gấp mà toàn đoạn tạo ra; không coi riêng từ “giữ form”, thời lượng hoặc so sánh ít nhăn là lỗi.
- Slot6/control đề xuất chất liệu “hạn chế nhăn tuyệt đối” cho chuyến đi. FAIL refSV165; reviewer đồng ý chặn bảo đảm đó.

Nguồn có mô tả vật liệu/thiết kế, không bảo đảm các kết quả trên. Khác run trước có một scope disagreement, tập này không tìm thấy false rejection rõ trong ba fallback theo ranh giới đã freeze. Verdict chỉ expose kind/ref, không lời giải thích suy luận: không chứng minh model chặn bằng keyword. Xem nguyên draft và actual trong [FALLBACKS_AND_REVIEW.md](FALLBACKS_AND_REVIEW.md).

## Findings và nơi sở hữu

1. **Owner chưa đổi cách chọn ý:** cả prompt cũ/mới vẫn chuyển mô tả thành nhiều lời khen gần nghĩa. Can thiệp làm rõ nguyên tắc chưa cho thấy hiệu quả trong các câu đã đo; không thể kết luận đơn thuần model không biết viết tự nhiên hoặc dữ liệu shop không đủ cho mọi lời tư vấn.
2. **Owner vẫn nâng tư vấn thành bảo đảm:** cùng source về Thạch Thảo, các samples nói lúc có thể hằn nếp, lúc ít nhăn/đứng lên vẫn phẳng. Không phải nguồn thật thay đổi. Verifier chặn ba lời bảo đảm thiếu căn cứ, nhưng việc chặn không tự tạo tư vấn tốt cho khách.
3. **Owner diễn đạt thiếu dữ liệu thành báo cáo nội bộ:** candidateslot10 giữ honesty/completeness nhưng giọng chưa dùng được; đòi tách câu/ít từ nối không xử lý được toàn bộ phần chọn nội dung này.
4. **Có một tín hiệu chủ động bán hàng hữu ích:** candidateslot11 chọn Diệp An thay vì liệt kê hai món; một sample chưa đủ để nhận định tiến bộ ổn định và không xóa failure khác.
5. **Không có bằng chứng lỗi source/code binding trong run:** context chính xác và không thay giữa hai arm của cùng case; partial deliberately unavailable được báo riêng. Không có source read/tool/stateful runtime mới để đánh giá. Không suy rằng code/source toàn hệ thống đã đủ từ captured replay.

Kết luận can thiệp: **chưa đủ**. Điều kiện mở T4 không đạt vì candidate còn fallback và giọng chưa cải thiện rõ. **16conditional slots không dispatch**, không phải16attempt lỗi; `integratedRunSourceSha=null`. Không chạy vòng thứ hai hoặc sửa verifier để cứu tỷ lệ. Bản prompt mới được giữ trong branch như candidate đã thử, chưa được promote hoặc deploy.

## Config và measurement

Owner Vertex global **`gemini-3.5-flash-lite` HIGH**, candidateCount1/textplain/max8192/includeThoughtsfalse/defaultsampling/timeout90s/retry0. Verifier **`gpt-6.1-sol` high**, existing Codex login/CLI0.159.2 bounded Responses relay, tools[]/choiceNone/parallelfalse/storefalse/streamtrue/maxresponse1048576/timeout90s/one upstream request per registered generation/retry0. Exact approved configs/version names và credential-route names ở TARGETED_REGISTRATION; không lưu secret hoặc substitute model.

**24/24generations: mỗi generation1upstreamrequest**, 12owner+12verifier. Provider/auth/transport errors0, timeouts0, missingUsage0. Mọi generation ở denominator;48wire phase captures trong metrics không phải48requests. Audit36wire bodies,12exact per-slot prompts,12projected/sent body+telemetry hashes,12bindings,12unchanged canonical verifier contexts,9exact eligible texts,0evaluator-label leaks.18raw files exact bytes và Gitblob hashes khớp;11relevant executable/config/frozen input Gitblobs không đổi so với runsource.

Verifier latency p50 **5,526s**, p95 **13,612s**; added replay verification/final-gate p50 **5,530s**, p95 **13,614s**. Không phải end-to-end live search/delivery latency. Owner latency không expose riêng; không suy từ wrapper. Tokens: owner input33.778/output21.402; verifier input57.707/output1.907. Output usage có thể gồm reasoning, không phải số từ khách thấy. CostNOT_EXPOSED.

Prompt/schema/input hashes, toàn generation/error accounting trong TARGETED_REGISTRATION, raw registration, REQUEST_ACCOUNTING và METRICS. Không dùng wording safety proof. Không có A2 unsafe-population run mới nên không đưa claim zero unsafe falsePASS cho toàn hệ thống từ tập này.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
# RED4PASS/2FAIL; sau minimum implementation GREEN6/6PASS
node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-description.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#65PASS/0FAIL/0skip
pnpm --filter @lana/worker build
#exit0
python apps/worker/evals/single-agent-commerce-read-only/advice-focus-20261020/run-targeted.py "$env:TEMP/c3-division-session-20261019.py" "$env:TEMP/c3-advice-focus-20261020"
#exit0; preflight0generation; registered12/max24, each once
python "$env:TEMP/c3-context-comparison-primary.py" "$env:TEMP/c3-advice-focus-20261020"
python "$env:TEMP/c3-gemini-prompt-once-publish.py" "$env:TEMP/c3-advice-focus-20261020" apps/worker/evals/single-agent-commerce-read-only/advice-focus-20261020
python "$env:TEMP/c3-context-comparison-metrics.py" "$env:TEMP/c3-advice-focus-20261020" apps/worker/evals/single-agent-commerce-read-only/advice-focus-20261020
node "$env:TEMP/c3-advice-focus-audit.mjs" "$env:TEMP/c3-advice-focus-20261020" apps/worker/evals/single-agent-commerce-read-only/advice-focus-20261020 3a18227d
#all exit0; extractors/publisher/metrics/audit do not dispatch provider
git diff --check
git diff --cached --check
```

Child argv/exitcodes: raw/commands.json; actual preflight `isolated-integration.mjs unused COD --provider-preflight`, actual runner `advice-diagnostic.mjs <frozen-input> <new-temp-out>/targeted`, each exit0. Primary notes/report/diagnosis and offline Git/raw checks were assembled with inline Python commands in this turn; no provider calls. Worker typecheck/lint/full suite not rerun because no TypeScript/runtime/shared package changes; focused eval boundary65+build passed. Tests do not prove conversational quality.

Pre-provider correction: frozen-byte check initially found CRLF differences in PREPARATION.json and .gitattributes; normalized and verified all staged inputs before seal/provider. No outcome from mismatched frozen inputs. Final diff checks and actual validation recorded in VALIDATION.json.

## Delivery

[Toàn bộ12hội thoại và primary review](CONVERSATIONS_AND_REVIEW.md), [ba fallback/drafts](FALLBACKS_AND_REVIEW.md), COMPARISON.json, REQUEST_ACCOUNTING.json, SOURCE_AND_WIRE_AUDIT.json và exact raw retained. No database created, no live send/deploy/shared source/POS write. Recommendation **STOP**, giữ findings để owner quyết bước sau.
