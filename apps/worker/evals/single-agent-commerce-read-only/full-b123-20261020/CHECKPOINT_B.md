# Full B1/B2/B3 — 2026-10-20

**Đã chạy đủ24/24B1 +8/8stateful, mỗi ca1lần.** COD26/26 và BANK_TRANSFER26/26 deterministic PostgreSQL checks đềuPASS. B1 còn1actual fallback/4câu cần sửa theo whole-turn primary; stateful7USABLE/1ownership control, có1lỗi owner protocol đã được recovery bằng receipt. Không A PASS/B live GO; recommendation **STOP sales readiness**, không tự fix/chạy vòng mới.

## Phạm vi và identity

Owner yêu cầu full B1/B2/B3 sau advice diagnostic STOP. Đây là đăng ký mới32outcomes/max124generation requests; không tiếp tục conditional16, không thêm captured advice replay. Preparation base `d8743ff05cbb7b6555ccd110b269a3bacb14d451`; clean runtime source **`68694ce209baf953a338e16f37853ce3e63af110`**. Source HEAD không đổi trong các jobs. Primary toàn actual/history/public state được lưu tại **`9b5070c4`** trước rejected-draft/verdict diagnosis, hash `c66c0bf05a2438860f78c1fe07a0bea6ad30c34e8f768cad382c0661bcbe0609`.

Không sửa prompt/runtime/source/model/corpus. Chỉ thêm registration/scope và wrapper gọi các entrypoints hiện hữu. Owner vẫn Gemini `gemini-3.5-flash-lite` HIGH, verifier `gpt-6.1-sol` high; exact configs/routes/hash ở REGISTRATION.json. Current owner prompt10.044bytes từ advice-focus; verifier/authority/final gates giữ nguyên. A vẫn OWNER_BYPASS; không bypass runtime gates.

B1:8mục đích×3biến thể=24ca hiện hữu, không24repetitions của một ca. Stateful:8lượt thuộc journey mua hàng và yêu cầu nhân viên;7public turns +1private code-only intake. Deterministic isolated SQL tests có fixture/domain inputs, không tính là hội thoại provider. Tất cả số đếm báo riêng, không gộp52checks+32outcomes thành tỷ lệ hội thoại thành công.

## Kết quả actual và whole-turn primary

| Population | Recorded | USABLE | NEEDS_EDIT | UNUSABLE / static fallback | OWNERSHIP_CONTROL |
| --- | ---: | ---: | ---: | ---: | ---: |
| B1 full corpus | 24 | 19 | 4 | 1 | 0 |
| Stateful B2/B3 | 8 | 7 | 0 | 0 | 1 |

Primary là agent self-review toàn hội thoại/state/nguồn trước diagnosis, không blind human review; các judgement về giọng cần được đọc cùng nguyên văn. USABLE chức năng không tự đồng nghĩa giọng hay hoặc đủ ổn định. Không keyword/fact-count scoring, không tự ép mua lẻ/giá thấp/CTA. Historical labels và raw giữ nguyên.

Terminal B1:23SEND_ELIGIBLE/1FALLBACK, verifier23PASS/1FAIL. Stateful:4SEND_ELIGIBLE (3verifierPASS +1code receipt recovery),2NO_SEND model terminal,2HANDOFF. Hai NO_SEND ở intake/preview vẫn có actual code-owned holding/preview được capture; không gọi là khách không nhận gì. Human-request HANDOFF không có ACK text trong capture:1ownership control, giới hạn trải nghiệm cần ghi nhận, không tự quy thành lỗi ngôn ngữ model.

### B1 —1fallback và4câu cần sửa

- **Lượt16 — b1-policy-used-v2:** khách đã mặc thử trong phòng5phút. Actual chỉ nhận “Phần này em chưa trả lời được, chị nhé.” Draft mở đầu đồng ý đổi size rồi đọc điều kiện chung. Policy có `inspection.tryOnMode=HOLD_UP_ONLY`: chỉ ướm, không mặc thử. Reviewer đồng ý verifierFAIL `POLICY_OR_BENEFIT_STRENGTHENING`; đây là lỗi áp dụng policy vào hành động đã nêu, không phải thiếu keyword điều kiện. Draft thực tế đã có nguyên tem/chưa dùng/chưa giặt/sạch/nguyên vẹn/15ngày. Đầy đủ checklist vẫn không sửa được câu đồng ý sai ở đầu.
- **Lượt3 — b1-partial-source:** không bịa phần giá/tồn cố ý thiếu, nhưng nói “chưa tra được dữ liệu…” cùng phần mô tả dài; cần viết lại cách trao đổi với khách. Source fault fixture được báo riêng, không quy thành model đánh mất fact.
- **Lượt7 — b1-buying-concern:** trả kiểu dáng/giá nhưng vẫn chuỗi lời khen; hỏi khách muốn size nào “để kiểm tra độ vừa” chưa lấy đúng dữ kiện phục vụ fit. Bước tiếp theo cần gắn với hồ sơ/recommend_size, không suy fit từ size mong muốn.
- **Lượt15 — b1-buying-concern-v2:** khách quen đồ trơn, hỏi có nên mua; mở đầu khuyên cả set rồi đưa áo/váy lẻ và trả việc chọn lại. Cần lý do và ưu tiên rõ theo băn khoăn, không thêm nhiều lựa chọn chỉ để đủ ý.
- **Lượt17 — b1-changed-occasion-v3:** khách đổi sang gặp khách hàng và nhờ chọn cả bộ hay áo. Đoạn vẫn khen hai phương án/đưa giá, thiếu giải thích giúp shop ưu tiên theo mục tiêu gọn. Không bắt đáp án phải là áo lẻ hoặc cả bộ cố định.

Những ca khác có góp ý giọng nhưng không tự nâng thành failure vì nhiều tính từ/ngoặc/số đo. Ví dụ lượt23 chọn cả bộ799k trong850k, dùng váy đen khách đã có để tăng cách phối và so với mua lẻ cả2phần948k: upsell có lý do, được giữUSABLE. Không đổi thành lỗi mua thừa hoặc nhầm so799k với chỉ áo499k. Lượt1 thực sự tìm/đọc váy Diệu Thanh có ren Hàn/lót habutai, giá799k; nhận xét định tính về giữ form được đọc theo boundary tư vấn đã được owner chấp nhận, không đòi test riêng cho mọi lời khuyên.

### B2/B3 — state và effect flow

- Mở giỏ đúng1áo beM, số đo76/98, tổng529k và báo đặt trước.
- Đổi đúng2áo beL, giữ màu; quote998k−49,9k+30k=978,1k do code tính.
- Sửa đúng số đo74/96, giữ sizeL khách tự chọn; không tự xác nhận mặc vừa. Nhắc số vừa sửa để xác nhận không tự là liệt kê facts.
- Actual checkout invitation hoàn thành trước private fixture; private intake0modelrequests tạo ORDER_PREVIEW, giữ tiền978,1k, đặt trước/ETA8–14ngày. Public preview redacted phone/address.
- Confirm sangPURCHASE_CONFIRMED rồi actual handoff nhân viên kiểm tra/lên đơn; không tạo đơn POS thật hoặc báo effect chưa có receipt.
- Journey yêu cầu gặp nhân viên đạtHANDOFF; không có ACK gửi khách được capture. Không gán thêm tin nhắn chưa từng gửi.

**Opening protocol error:** generation owner cuối nhậnHTTP200 nhưng emit function call khi `functionCallingMode=NONE`, declarations0. Adapter ghiPROVIDER_ERROR/`unexpectedToolCall=true`, runtime original fallback reason `OWNER_TOOL_MODE`. Existing code recovery đọc receipt đã commit, gửi exact summary đúng tiền/đặt trước một lần. Actual dùng được, nhưng lỗi owner vẫn giữ trong accounting; không tính recovery thành verifier PASS, không có generation retry hoặc role sửa reply mới.

## Findings và kết luận

1. **Không chỉ còn tranh luận chất liệu.** Full run có lỗi dùng policy sai tình huống, câu báo dữ liệu, bước hỏi fit chưa đúng, quyết định mua chưa rõ và owner tiếp tục gọi tool khi hết quyền. Thêm nguồn mô tả sản phẩm không tự xử lý các lỗi này.
2. **Nguồn policy đã đủ cho fallback này.** CóHOLD_UP_ONLY,15ngày,30k, điều kiện sản phẩm; owner vẫn trả mẫu điều kiện chung thay vì áp hành động đã mặc thử. Không cứu bằng thêm các keyword đã có trong draft.
3. **Code state/tiền/receipt/ownership hoạt động trong tập đo.**52deterministic checksPASS và journey provider giữ kết quả đúng, recovery bảo toàn việc đã commit. Điều này chưa chứng minh mọi nhánh ngoài corpus hoặc chất lượng tư vấn đã đạt.
4. **Nguồn read/search có giá trị khi model dùng đúng:** B1 tra đúng giá/mua lẻ/tồn/SD375/Khánh Trang/SQ223; ca thay mẫu dùng được sản phẩm thực đọc thêm. Không suy kết quả đó thành bằng chứng nhân quả so với tools-off captures của run trước.
5. **Giọng/chọn ý vẫn là lỗi cũ:** lời khen gần nghĩa, trả lại lựa chọn, diễn đạt tra dữ liệu. B1 partial-v2/giá/stock có nhiều câu gọn dùng được; không kết luận toàn bộ model luôn máy móc từ những câu yếu.

Kết luận: **full run đã hoàn tất, B/live sales readiness chưa đạt**. Một sample/case không chứng minh ổn định. Không sửa runtime/prompt hoặc thêm vòng sau kết quả trong lượt này; A không được đổi thànhPASS.

## Provider accounting và measurements

**90generation requests**, dưới trần124: owner63, verifier27; mỗi generation1upstreamrequest/retry0. Verifier26PASS/1FAIL.0transport/HTTP/auth/quota errors,0timeouts;1owner protocol error nhậnHTTP200 (1/90generation outcomes), đã nêu riêng. Không được báo0mọi lỗi provider chỉ vì các HTTP đều200. Không mất usage hoặc bỏ attempt lỗi khỏi denominator.

Static fallback B1:1/24=4,17%; toàn32outcomes1/32=3,125%. Stateful có1receipt recovery/8,2HANDOFF/8 theo workflow;2NO_SEND model terminals không đồng nghĩa2outcomes không có actual code reply. Không gộp các loại terminal thành tỷ lệ chất lượng duy nhất.

B1 verifier latency p50 **4,902s**, p95 **8,034s**; added verification/final readback p50 **5,494s**, p95 **9,076s**. Stateful verifier3records p50 **4,924s**, p95 **8,939s**; added verification/readback p50 **7,641s**, p95 **12,724s**. METRICS còn giữ observed inference latency theo role. Đây là measurements trong test paths, không latency live customer delivery hoặc benchmark tốc độ model độc lập.

Usage: owner input217.849/output37.795; verifier input121.469/output1.907; missingUsage0, costNOT_EXPOSED. Output usage có thể gồm reasoning; không đo độ dài tin nhắn bằng token usage.

Audit:2childsource/promptregistrations matched;27bindings recomputed;63exactownerpromptcaptures;93wirebodies checked;0evaluator-label leaks và không có synthetic customer phone trong model wire;26exact eligible draftmatches.120wirephasecaptures ở metrics không phải120providerrequests.49published raw files:41exact-byte copies +8provider-attempt copies chỉ bỏ private ingress batch.49Gitblob hashes match,11relevant executable/config/frozen-input blobs không đổi so với runsource.3isolated databases đều dropped; no live send/deploy/shared source or POS order write.

Public transcript có artifact redaction: checkout invitation hiển thị “Chị gửi thêm [NAME]”; đây là redactor gom phần nhãn, không kết luận bot gửi literalplaceholder. Code renderer `realtime-sales-cycle.ts` ghép các nhãn cần thiếu; private preview phone/address cũng redacted. Exact raw/public transformations lưu ở ARTIFACT_INDEX và VALIDATION.

## Commands thực sự chạy

```text
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
#10PASS/0FAIL/0skip
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020/run.py "$env:TEMP/c3-division-session-20261019.py" "$env:TEMP/c3-full-b123-20261020"
#exit0; sixchildjobs each exit0
python "$env:TEMP/c3-gemini-prompt-once-primary.py" "$env:TEMP/c3-full-b123-20261020"
python "$env:TEMP/c3-gemini-prompt-once-publish.py" "$env:TEMP/c3-full-b123-20261020" apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020
python "$env:TEMP/c3-full-b123-metrics.py" "$env:TEMP/c3-full-b123-20261020" apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020
node "$env:TEMP/c3-full-b123-audit.mjs" "$env:TEMP/c3-full-b123-20261020" apps/worker/evals/single-agent-commerce-read-only/full-b123-20261020 9b5070c4
#all exit0; primary/publish/metrics/audit do not generate model replies
git diff --check
git diff --cached --check
```

Exact child argv/exitcodes in raw/commands.json: provider preflight `isolated-integration.mjs unused COD --provider-preflight`; source-check `run.mjs --config source-config.b1.json --cases cases.b1.json --out <new> --source-check`; deterministic `isolated-integration.mjs <new> COD` and `... BANK_TRANSFER`; stateful `... COD --provider-run`; B1 `run.mjs --config ... --cases cases.b1.json --out <new> --run`, no range restriction. Existing source-check/B1 entrypoints each build current worker before source imports; compilation succeeded. No separate full-unit/typecheck/lint rerun because no runtime code changed; do not claim such checks ran.

Primary notes, diagnosis, counts and Git/raw checks assembled by inline Python in this turn, no extra provider calls. No executable fix or source changes after seal. Model/API adapters unchanged, no new API implementation.

## Evidence / STOP

[Toàn32actual hội thoại](CONVERSATIONS_AND_REVIEW.md), [1fallback/4câu cần sửa và lỗi opening](FAILURES_AND_REVIEW.md), RESULTS.json, FAILURE_DIAGNOSIS.json, METRICS.json, REQUEST_ACCOUNTING.json, SOURCE_AND_WIRE_AUDIT.json, DETERMINISTIC_AND_CLEANUP.json, VALIDATION.json and49rawfiles retained. Recommendation **STOP_SALES_READINESS_NO_LIVE_GO**; hoàn tất yêu cầu full rerun, không tự sửa/chạy thêm.
