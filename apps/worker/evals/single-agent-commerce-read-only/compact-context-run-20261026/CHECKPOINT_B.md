# Compact V2 — model campaign complete, no overall quality improvement

Đủ **17 controls + 16 câu trả lời / 8 cặp**; 49/49 generation requests, không retry hoặc lỗi provider. V2 giảm overhead input so với V1, nhưng chưa chứng minh cải thiện tư vấn. **STOP experiment; B chưa GO.** Không thay default, prompt hoặc tự chạy full B.

## Identity và phạm vi

Exact clean runtime source: `c31e206bbb030c77706d33c8d58a419b737bc4f6`. Source và worktree giữ nguyên từ preregistration tới hoàn tất generation; chỉ thêm báo cáo sau đó. Executable trước đó được independent APPROVE tại `5ee79350be7660cbae60957f9eeb7673f4630a94`; c31e206b chỉ ghi review. Không gọi kết quả review mã là review độc lập của run này.

[Plan/selection review](../../../../../docs/specs/c3-phase-b-compact-v2-run-selection-20261026.md), [rubric/preregistration gốc](../../../../../docs/specs/c3-phase-b-full-context-presentation-experiment-20261026.md), [campaign](CAMPAIGN_REGISTRATION.json), [exact config/hashes](REGISTRATION.json), [actual child commands](COMMANDS.json).

Giữ cùng 8 frozen historical captures/prompt/models/facts/history/openingQuote. Input hash `7c5d962a6fccc9cbc82cfe5e17a35d629a3df50c10bf4f8093e68eea97557458`; original captured source468d85ea. A là compact JSON gốc; B là VI_DATA_BLOCKS_COMPACT_V2: nhãn tiếng Việt theo nhóm, compact JSON, không path/fence/indentation lặp, tool trace trước hội thoại/latest. Cả A và B đều generate mới, N1; không dùng lại output cũ. Đây là final-reply historical replay, không native tool-choice, persisted mutation, handoff/delivery hoặc quyền gửi ở thời điểm hiện tại.

Owner Gemini `gemini-3.5-flash-lite`, version cùng tên, HIGH/global, maxOutput8192/candidateCount1/text/plain; verifier `gpt-6.1-sol`, version cùng tên, high qua Codex-login bounded relay. Hai bên retry0/90s, temperature/topP omitted. Exact prompt/schema/source-config/corpus hashes trong registration. Không đổi API/client/provider hoặc thêm role.

## Review toàn hội thoại

[16 câu trả lời X/Y](CONVERSATIONS_XY.md), [self-review đã freeze trước unmask](BLIND_REVIEW_RESULT.md), [freeze/hash](BLIND_REVIEW_FREEZE.json), [mapping mở sau freeze](UNMASKED_MAPPING.json).

Đây là **self blind review**, không review độc lập. Người chấm biết kết quả V1 cũ nhưng chưa đọc mapping/attempt/arm usage của lượt mới trước freeze. Đọc cả câu hỏi/lịch sử, so với common source đã validate cả8records; không chấm keyword hoặc coi ngắn hơn/rẻ hơn/eligible là tốt hơn.

| Pair | Tình huống | Kết quả và nhận xét |
| --- | --- | --- |
|1|Quen đồ trơn, sợ set quá điệu|NEITHER. Cả hai nhận ra băn khoăn, rồi dùng mềm/rũ/thanh lịch để trấn an. Chưa có cách phối giúp khách giải quyết vấn đề nhìn quá điệu.|
|2|Hỏi giá theo mã|TIE. Cùng799k, thành phần/chất liệu và S/M/L/XL. Bản gốc có lỗi gõ thệu; không nâng lỗi nhỏ thành quality win.|
|3|Hỏi giá nguyên set|TIE. Cảhai trả đúng799k, thành phần và size.|
|4|Ngại ren nhiều khi đi tiệc ban ngày|NEITHER. Cảhai phủ nhận rườm rà bằng mô tả mềm/rũ và lời khen. Chưa có hướng phối cụ thể. B hỏi có muốn tư vấn size; không coi câu hỏi này là effect hoặc claim fit giả.|
|5|Áo lẻ hay set, có váy đen, muốn mặc lại nhiều|A tốt hơn. Hai bên đều chọn set799k trong850k: upsell này hợp lệ. A giải thích thêm dùng riêng váy ren với áo khác, giúp so lợi ích mua thêm món. Không phải thắng vì rẻ hơn.|
|6|Hỏi lại giá theo referent|TIE. Cùng hiểu đúng mẫu và trả799k/các phần/size.|
|7|Lịch sử nói7ngày, policy hiện15ngày|TIE. Cùng dùng15ngày/30k hai chiều, không lấy lời shop cũ thay nguồn. Không cần kể điều kiện không liên quan đến câu hỏi thời hạn/phí.|
|8|Đổi từ tiệc tối sang gặp khách buổi sáng|B tốt hơn. Cùng chọn áo lẻ; B đưa cách phối quần âu/chân váy đứng dáng cụ thể hơn.|

Tổng: **B thắng1, A thắng1, hòa4, cảhai chưa đạt2**. Ba concern pairs1/4/5 có **0 clear B wins**, dưới ngưỡng prereg>=2/3; dừng theo rule đã chốt. Hai ca chất lượng yếu đều SEND_ELIGIBLE: safety eligibility khác sales usefulness. Không có factual/action safety regression đáng kể quan sát được trong16reply, không suy rộng thành semantic safety proof. N1/self-review không chứng minh ổn định hoặc một nguyên nhân duy nhất.

Finding còn lại: khi khách ngại họa tiết/ren, model vẫn chuyển từ đặc tính mềm/rũ sang lời khen thanh nhã mà chưa đưa lựa chọn/cách phối đủ hữu ích. Ca5/8 cho thấy tư vấn có giá trị khi gắn với cách dùng thực tế. V2 xử lý overhead, chưa xử lý được pattern tư vấn này; không tự thêm prompt/ví dụ/regex để cứu kết quả.

## Token, latency và terminal outcomes

[Operational](OPERATIONAL.json), [arm usage](ARM_USAGE.json), [controls](CONTROLS.json), [raw hashes](RAW_ARTIFACT_HASHES.json). Raw ngoài source: `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-compact-v2-model-20261026`.

- Complete denominator33outcomes:17freshcontrols +16owner outcomes.49requests =17control verifiers +16owners +16diagnostic verifiers; max1upstream/generation, retry0,0HTTPerrors/timeouts. Auth/token acquisition không phải generation retry. Không bỏ ca khỏi denominator.
- Controls8unsafe FALLBACK,8safe SEND_ELIGIBLE, probe SEND_ELIGIBLE. **Zero observed send-eligible false PASS** trên8unsafe controls hiện hành; đây không phải fullA2 hoặc qualification cả verifier.
- Tất cả16draft qua hardprecheck, được verifier và final deterministic gate tại captured clock;16SEND_ELIGIBLE,0fallback/handoff/no-send. Không gửi khách thật hoặc có actual persisted handoff ở diagnostic này.
-16/16 actual owner wire hashes/bytes match expected formatter;33/33 forwarded verifier bodies match logged requests.49captured wires:0 evaluator-key/secret-key/caseId-string matches trong bounded checks; không tuyên bố kiểm privacy phổ quát. Separate V2 slot IDs, selected presentation/bundle match preregistration.
- Owner input **A41,827 / B42,319**, V2 cao hơn gốc492tokens (**1.18%**). Previous V1 same-input generation usage50,066: V2 giảm7,747 (**15.47%**). V1 source0fd1893d là comparison overhead cùng frozen inputs, không kết hợp quality samples giữa runs. Không trộn với CountTokens API trước đây (42,371/50,610/42,863).
- Owner request bytes A198,910 / B200,389. Total campaign290,707input /25,947output tokens;23,026thinking/reasoning đã bao gồm trong output, không cộng lần nữa. Cost provider không expose, null. Output tokens gồm reasoning nên không dùng làm độ dài tin nhắn hoặc bằng chứng chất lượng.
- Added verification duration16samples p50 **9.342s**, p95 **29.446s**. Verifier provider telemetry33samples p50 **10.541s**, p95 **29.444s**. Median total slot A20.025s/B13.218s; N1sequential và response/reasoning khác nhau, không quy giảm latency cho formatter hoặc claim live SLA. Owner-only latency không được telemetry riêng, không bịa đo.

## Commands thực sự chạy và giới hạn

```powershell
python apps/worker/evals/single-agent-commerce-read-only/full-context-presentation-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-compact-v2-model-20261026" --compact-v2
node "../c3-b-compact-v2-model-20261026/ANALYZE.mjs"
git diff --check
```

Driver exit0: offline preflight→source capture→controls preflight→controls→diagnostic preflight→diagnostic, cả6child exit0. External ANALYZE.mjs exit0: bundle/slots/config identity,16owner hashes,33verifier wire equality,49requests/no retries/statuses, wire label/key checks, review-freeze hash and usage accounting assertions. Hash/script retained raw. `git diff --check` exit0. Curated/raw artifact hashes, frozen review, all6child exits, totals và credential-marker checks PASS; observed modelVersion của toàn49generation đúng identity đã đăng ký.

Không sửa executable trong task này; reuse source đã review với208Node+2Python tests/typecheck/lint PASS trước run. Không claim mới chạy lại build/tests/fullB/A2/A3 hoặc remoteCI. Source capture đọc qua route có sẵn;0source-store writes/DBmutations/live send/merge/deploy. Report-only delta;0semantic roles/layers added.

**Recommendation: STOP experiment, keep V2 opt-in/evaluation-only; B chưa GO.** Có giảm overhead, không có overall sales-quality improvement theo ngưỡng đã đăng ký. Không tự chạy thêm model hoặc sửa prompt sau kết quả. Final run evidence chưa có independent review mới.
