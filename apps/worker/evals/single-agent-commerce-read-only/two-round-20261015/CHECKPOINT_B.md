# Checkpoint B1 — hai vòng sửa, STOP

Owner yêu cầu fix và chạy 2 vòng. implementationBaseSha: 296cdcfbf5759f5bf9cbb24acf3dc63005589361, refreshed origin/main cùng SHA; intakebf586d5669f0c5d9459123b02ae14c40d35ab95b trên branch feat/c3-phase-b-commerce-20261014 / draftPR391. Spec/plan hiện hành: B1integration plan, B1–B3execution và [scope hai vòng](SCOPE.md); exact spec file/hash/commit ghi trong SUMMARY.json. A OWNER_BYPASS và toàn bộ bằng chứng A/B cũ được giữ nguyên.

## Kết quả thực tế

| Vòng | Source | Đã chạy/đăng ký | Whole-terminal đạt | Fallback | Ca còn lại |
|---|---|---:|---:|---:|---|
|1|9564b4a5|3/8|1/3|2/3|5NOT_RUN|
|2|22457e0a|3/8|1/3|2/3|5NOT_RUN|

Tổng 6 lượt case thực thi trên 3 câu hỏi ở 2 cấu hình owner prompt,18 generation requests (12 owner/6 verifier), retry0. Hai lần kiểm source có 2 embedding probes riêng, không phải conversation/verifier generation. Tổng 16 slot đăng ký, 6 thực thi, 10 NOT_RUN; không được gọi là hai full batch8ca. Subjective coding-agent primary,60 human dimension ratings vẫn null, chưa có independent human acceptance. Không có observed unsafe eligible trong 2 terminal eligible đã đối chiếu, nhưng không có A2 UNSAFE population mới hoặc bằng chứng safety tổng quát.

## Code và context đã sửa

Search trả verified static attributes/source content từ document đã tìm được, cùng evidence trong verifier snapshot; không tự sinh giá/tồn/fit/độ kín hoặc tăng model/tool budget. Current readback kiểm lại đúng source đã dùng, search-only không phụ thuộc POS. read_policy nêu SHOP_RULES/orderEligibility=null; không có engine xét đơn mới. Ca POS_UNAVAILABLE là fault injection đã đăng ký, không phải sự cố POS thật. sourceDomainCounters là domain-port calls, không phải số network requests. Raw source reason được giữ trong TOOL_RESULTS accounting, owner nhận availability.status; không suy chưa đồng bộ từ unavailable. Native signatures/call IDs giữ nguyên.

Vòng1 thay các đoạn owner để khớp tool/context. Vòng2 chỉ thay lời hướng dẫn về quyết định khi thiếu căn cứ sử dụng và đọc policy so với duyệt đơn; code/verifier/config/cases giữ nguyên. Không thêm few-shot hoặc mã mẫu/giá/thời hạn trong prompt. Ca thiếu POS được trả phần thông tin có nguồn ở cả hai vòng; giọng còn dài và quảng cáo. Hai ca khó vẫn tái diễn kết luận vượt nguồn. Search không được owner gọi trong cả hai prefix, vì vậy phần search mới chưa có provider-path evidence; năm control khác cũng chưa được chạy lại.

## Models và protocol cố định

- Owner: VERTEX_AI / gemini-3.5-flash-lite / version reported gemini-3.5-flash-lite / high / global. candidateCount1, text/plain, maxOutputTokens8192, thinkingLevelHIGH, includeThoughtsfalse, temperature/topP omitted, timeout90000ms, retry0; credential route C3_VERTEX_CREDENTIAL_FILE đã có.
- Verifier: OPENAI / gpt-6.1-sol / version reported gpt-6.1-sol / high. Existing CODEX_CHATGPT_LOGIN bounded inference relay, codex-cli0.159.2, Responses SSE, tools[], tool_choice none, parallel_tool_callsfalse, storefalse, reasoningEfforthigh, timeout90000ms, maxResponseBytes1048576, max1upstream/retry0. Không expose backend build identity khác modelVersion.
- Max 3 owner generations/2 tool rounds/6 calls/1 verifier mỗi case; N1 mỗi vòng; cap 32 generation requests/vòng. Bounds/latest2048bytes, history8/4096, final4096, provider32768, tool results8192/round; cùng context allowlist/binding/authority/privacy/freshness/receipts gate.
- Mọi final draft trong 6 attempts đã đi verifier đúng 1 lần rồi current readback/final gate. Không classifier skip, repair, reverify, rewrite hoặc live send. sendEnabled=false.
- Verifier FAIL/UNCERTAIN/malformed/timeout/provider error giữ frozen fallback C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.” Hash cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Stale/current-readback failure có handoff/no-send theo existing terminal map; permission/privacy/recipient invalid no-send. Không đổi map để cứu kết quả.
## Vòng 1

- bRunSourceSha: 9564b4a59871f1e096c72f8d50f60b41ee06577d.
- Raw commit: 5c3a313d85f7b7530a08f1c68306ee976ac10a27; primary commit: a33c28218e3613285e78590e9f2bf1769a8d2bfc; rejected-draft diagnosis thực hiện sau primary.
- Đăng ký 8, chạy 3/8 ca N1; whole-terminal primary 1 PASS/2 FAIL. SEND_ELIGIBLE 1/FALLBACK 2/HANDOFF 0/NO_SEND 0. Năm ca còn lại NOT_RUN vì prefix chưa đạt; không dùng lại PASS cũ.
- 6 owner + 3 verifier = 9 upstream generation requests; max1/requested generation, retry0, error0/timeout0. Captured bodies 9, binding 3, evaluator label leaks 0, max request17894bytes.
- Owner input/output tokens: 17526/3298; verifier: 9908/682. Output usage giữ cả thinking theo provider. Monetary cost=null, provider không expose.
- Verifier p50/p95: 7.177/9.974s; added verification+readback: 7.958/10.695s; end-to-end: 13.846/19.843s. n=3, linear interpolation; không suy percentile cho traffic thật.
- Prompt hashes: owner 722e5958260b1abbc3a12282c55df7b4d792805ade8ee7b812b535f7b22fcbb2; verifier fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957.
- Schema hash: 76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97; corpus exact-byte hash: a5c2f5e6f1af91acb84ea5ebe865536dfa5a5148360e004a25d22551b7582059; source config hash: 5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e; tool schema hash: 462a24dc257abfd1931876e2568bbef60e2982f89d92a45692b1b9ff8876d3bd.
- [Toàn bộ terminal conversations](round-1/B1_CONVERSATIONS.md), [primary](round-1/PRIMARY_REVIEW.json), [finding và rejected drafts](round-1/FINDINGS.md), [metrics](round-1/METRICS.json), [audit](round-1/AUDIT.json), [registration](round-1/raw-prefix/registration.json), [source readback](round-1/source-readback.json).

## Vòng 2

- bRunSourceSha: 22457e0a9e7722187e9bedf9bae0ff0551f4aeb6.
- Raw commit: 111c78bd12dc652c85e06793d660e54d3897ad01; primary commit: b3b26c19a3f10145378c8be4abe9b7aed8c9719f; rejected-draft diagnosis sau primary.
- Đăng ký 8, chạy 3/8 ca N1; whole-terminal primary 1 PASS/2 FAIL. SEND_ELIGIBLE 1/FALLBACK 2/HANDOFF 0/NO_SEND 0. Năm ca còn lại NOT_RUN.
- 6 owner + 3 verifier = 9 upstream generation requests; max1/requested generation, retry0, error0/timeout0. Captured bodies 9, binding 3, evaluator label leaks 0, max request17961bytes.
- Owner input/output tokens: 17569/2942; verifier: 9840/592. Output usage giữ thinking theo provider. Cost=null.
- Verifier p50/p95: 6.081/8.859s; added verification+readback: 6.828/9.674s; end-to-end: 14.239/15.250s. n=3, linear interpolation.
- Prompt hashes: owner d6ba7b6c3a4705fcab140a0d74b527ce9b36ebb9639c1b7cf470eb48a3c02a67; verifier fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957.
- Schema hash: 76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97; corpus exact-byte hash: a5c2f5e6f1af91acb84ea5ebe865536dfa5a5148360e004a25d22551b7582059; source config hash: 5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e; tool schema hash: 462a24dc257abfd1931876e2568bbef60e2982f89d92a45692b1b9ff8876d3bd.
- [Toàn bộ terminal conversations](round-2/B1_CONVERSATIONS.md), [primary](round-2/PRIMARY_REVIEW.json), [finding và rejected drafts](round-2/FINDINGS.md), [metrics](round-2/METRICS.json), [audit](round-2/AUDIT.json), [registration](round-2/raw-prefix/registration.json), [source readback](round-2/source-readback.json).

## Verification và complexity

[Commands thực chạy](COMMANDS.md), [readiness/log hashes](PREPARATION.json). RED được quan sát trước code; sau minimum GREEN/self-review: current 126 Vitest files/1713 PASS, Node full 460 PASS/2 optional SKIP, focused adapter/protocol 20 PASS sau prompt vòng2, protected/reply 52 PASS; typecheck/build/lint exit0. Full worker command thực chạy trước source independence fix cuối; full Vitest src và current compile/lint chạy lại sau fix đó, không giả ghi một full command mới. R2 chỉ đổi static prompt/manifest, có protocol/adapter checks lại, không chạy lại test không bị tác động.

Năm executable files đổi 69 insert/26 delete so với intake (tools/source adapter, owner adapter, protocol range parser, runner); tests/docs/evidence/prompt tách riêng. Semantic roles added 0, runtime layers 0, tool names 0, durable stores 0, production entrypoint/shared package/schema 0. Internal static-evidence helper/read-set dùng existing authority boundary; CLIrange chỉ phân phối slot đã đăng ký để tiết kiệm quota theo prefix yêu cầu, không thêm semantic judge/gate hoặc progress framework. Không mutation/deploy/send/source publication/B2B3DBjourney mới.

## Recommendation

STOP sau đúng hai vòng. Ca thiếu POS có cải thiện quan sát được; hai lỗi owner còn lại chưa giải quyết, không do thiếu credential/API hoặc policy không được cấp. Độ kín dưới đèn chưa có dữ kiện nguồn; owner vẫn tự biến thiếu bằng chứng thành đặc tính xấu. Policy đủ nhưng B1 không đọc đơn; owner vẫn cấp kết luận đủ quyền. Không tiếp tục nhồi ví dụ/regex hoặc nới verifier để cho hai draft ấy qua. Một hướng tiếp theo cần phân biệt bổ sung dữ liệu sản phẩm/khả năng đọc đơn với thử thay đổi owner; báo cáo này không authorize vòng 3 hoặc luồng mới. Không sales-readiness/qualification/GO từ 6 case outcomes; provider regression của 5 case còn lại và stateful conversation journeys vẫn chưa verified.
