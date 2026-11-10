# B1 — native sales-owner comparison: STOP

Đã sửa → self-review → chạy một lượt như owner yêu cầu. Both owners dùng được read tools thật, nhưng chất lượng bán hàng chưa cải thiện rõ và có một câu sai quyền đổi được verifier cho qua. Đây là diagnostic B1 send-disabled, không phải A2/A3 hoặc Phase B acceptance. A lịch sử vẫn OWNER_BYPASS.

## Identity và phạm vi

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Start: `6897d0a81b3202b65a26229b00bcc6563c736819`; implementation commit `3d5544e3a680a43a07b7e688880d913588738f45`.
- Clean runtime runSourceSha: `5cbcde984c9594272b5ea905c3afd0f60dccef00`, sau commit frozen manifest/scope/readiness. Không ghi SHA ngược vào frozen input. Completion xác nhận source không đổi.
- Raw commit `9403e2e671c7ed32b54b8f8f243c0019e27069f1` trước primary `91a12ffa44e56d3d85d7087348bc1904c8dc6798`, rồi mới đọc rejected draft/diagnostics. Primary labels giữ nguyên.
- [Spec/plan blob SHAs và verification](PREPARATION.json); [frozen scope](SCOPE.md), [self-review](SELF_REVIEW.md). Parent architecture, semantic boundary amendment và Phase B plan vẫn là nguồn chuẩn.
- Same5LIVE cases,1lần/model,10/10outcomes. Giữ corpus/source config và actual question/history; source đọc hiện tại. Không holdout hay nhiều mẫu chứng minh variance/stability.

Owner prompt thay hai bullet giao việc chọn/phối/tìm món thay:6335bytes/hash `82964a2a1874652b6c872372bce043f960734aa4c1a42cc910f59b7e2ef47e0f`. Tăng596bytes so với bản trước; không thêm examples/word bans/case-specific instructions. Verifier hash `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`; corpus `a5c2f5e6f1af91acb84ea5ebe865536dfa5a5148360e004a25d22551b7582059`; source config `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`.

## Models/config và accounting

Exact config/tool hashes/bounds/terminal map trong [manifest](manifest.json). Owner Gemini `VERTEX_AI/gemini-3.5-flash-lite/global/HIGH`, candidate1,text/plain,max8192,includeThoughts=false; owner Sol `OPENAI/gpt-6.1-sol/low/CODEX_CHATGPT_LOGIN`, native read functions/auto,parallel=false,store=false,stream=true,include reasoning.encrypted_content. Verifier `OPENAI/gpt-6.1-sol/high`, strict verdict JSON,tools0. Temperature/topP provider default omitted; Sol max output omitted per existing Codex route. Model versions returned đúng aliases, chưa có immutable dated model snapshots.

Tối đa3owner generations/2tool rounds/6calls +1verifier/turn, max40requests cho10outcomes, không phải40cases. Thực tế **13owner+10verifier=23generation requests**, tất cảHTTP200;0upstream retry/error/timeout. Gemini7owner+5verifier, Sol6owner+5verifier. Codex16client requests/0rejected continuation; Gemini1OAuth exposed, Codex auth nội bộ không expose count. **Không phát sinh generation sau primary.** [Complete accounting](REQUEST_ACCOUNTING.json).

Runtime3tool rounds/4calls: Gemini đọc AO ở stage và AO/CV ở concern; Sol search ở stage, nhận3món thật và native continuation trả final text. Sol live output là function_call, không có reasoning encrypted_content ở lượt Low này; preservation của opaque reasoning được test bằng fake transport, không claim đã quan sát live field chưa trả. Existing index/embedding được reuse: run1embedding call + preflight1, accounting nguồn riêng. Source counters run catalog27/POS18/policy8; preflight9/6/4 và0generative requests. Không source/cart/customer/policy write hoặc live send.

## Whole-terminal result

| Owner | Outcomes | Send-eligible | Fallback | USABLE | NEEDS_EDIT |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gemini High | 5 | 4 | 1 | 1 | 3 |
| Sol Low | 5 | 5 | 0 | 2 | 3 |
| Tổng | 10 | 9 | 1 | 3 | 6 |

Handoff/no-send0, fallback10%overall (Gemini20%,Sol0%). Primary là coding-agent whole-turn review, chưa có human/independent acceptance. Không chấm keywords hoặc bắt câu mẫu; USABLE không đồng nghĩa giọng hoàn hảo. [Tất cả10hội thoại](CONVERSATIONS.md), [primary từng ca](PRIMARY_REVIEW.json), [context/source/tool results](PRIMARY_CONTEXT.json).

**Observed unsafe send-eligible false PASS:1**, slot3 Gemini current-policy. Khách còn trong15ngày và đã cho nhiều tình trạng hàng, nhưng chưa biết hư hỏng/lần đổi trước. Reply xác nhận hoàn toàn đổi được/đã đạt điều kiện, trong khi nguồn chỉ là quy định chung và chưa xét đơn. VerifierPASS. Không phải bắt thiếu danh sách điều kiện trong lời giới thiệu chung. Gemini stage bị chặn đúng vì suy độ xuyên và hứa giải pháp nội y làm yên tâm trên sân khấu; actual fallback không giúp mua.

Sol có search nhưng context3món trả chưa xác nhận phần áo giải quyết lo độ kín; final vẫn ba đoạn từ chối/tự thử, chưa tạo giá trị bán hàng đủ tốt. Concern replies có phần phối hợp lý nhưng dài và chưa dẫn quyết định rõ. Giá cả set/giá món rời hiện dùng đúng nguồn; used-policy từ chối đúng việc mặc đi làm, Gemini lần này trả rõ bên trả phí nhưng giọng vẫn checklist. [Findings và hướng tiếp](FINDINGS.md), [rejected-draft diagnosis](DIAGNOSTICS.md).

So với batch trước: USABLE vẫn3/10. Fallback2→1 nhưng chính ca policy chuyển từ block sang một falsePASS, không ghi nhận là cải thiện. Đổi cả prompt+capability, N1, không suy quan hệ nhân quả hoặc xếp hạng model ổn định.

## Operational measurements

| Metric, p50/p95 ms | Gemini | Sol | All |
| --- | ---: | ---: | ---: |
| Owner invocation | 4016.88 / 5129.45 | 6172.10 / 8043.35 | 4873.22 / 7924.23 |
| Tổng owner generations mỗi turn | 5239.27 / 7950.71 | 7047.15 / 11204.33 | 6172.10 / 10241.88 |
| Verifier | 6390.27 / 13718.47 | 7845.62 / 8567.65 | 7640.29 / 12165.04 |
| Added verification + current readback | 7801.48 / 14262.99 | 8257.23 / 9387.84 | 8209.39 / 12832.42 |
| End-to-end turn | 17186.94 / 19965.29 | 16259.97 / 23237.82 | 16390.83 / 22723.81 |

| Token input/output | Gemini owner | Sol owner | Gemini-path verifier | Sol-path verifier |
| --- | ---: | ---: | ---: | ---: |
| Tất cả generations | 21709 / 7176 | 17599 / 716 | 18980 / 962 | 18204 / 503 |
| Thinking/reasoning output đã gồm trong output | 6376 | 0 | 823 | 383 |

Provider error/timeout0/23. Cost không expose→null, không ước tính. Quantile nội suy tuyến tính, mẫu nhỏ; full completion, không phải TTFT. Gồm local auth/transport/API/continuations và source preload; compilation/setup ngoài e2e. Không cộng medians hoặc suy model nào luôn nhanh hơn từ bảng này. [Metrics machine-readable](METRICS.json).

## Verification và provenance

- Transport RED11PASS/1FAIL/1optionalSKIP → GREEN12PASS/1optionalSKIP. Native projection/continuation RED8PASS/2FAIL → GREEN10PASS; native budget registration RED10PASS/1FAIL → GREEN. Không dùng string tests để tuyên bố đã sửa giọng.
- Focused protocol/provider44PASS/1optionalSKIP; full eval474PASS/2optionalSKIP; existing B boundary/context/source/tools/state/effects122PASS; protected/reply21PASS; worker typecheck/build/lint exit0. Không chạy lại full worker src suite hoặc A2/A3provider.
- Native tool-schema tamper rejected COMPARISON_FROZEN_INPUT trước source/credential/provider work, output không tạo. Windows test junction được finally phục hồi tracked16byte link-text nguyên vẹn.
- [AuditPASS](AUDIT.json):16rawdisk/Gitblobs,10exact-draft/snapshot/current-readback bindings unchanged,29request/projection envelopes decoded firewallPASS,initial text/source/history/latest giống nhau giữa hai owners. 23generationIDs duy nhất và≤1upstream/generation. Nhiều envelopes không phải nhiều HTTPrequests.
- Sol relay lưu actual outbound body, khớp planned body; Gemini evidence là planned projection + fake HTTP-capture adapter tests, không claim independent live HTTP echo. Frozen executable/config không đổi sau seal, A/B historical runs không sửa. Không phát hiện PII/credential trong captured inputs/evidence; secrets chỉ trong process memory của route cũ.
- Một audit helper ban đầu so byte CRLF của PREPARATION.json trong Windows với Git LF nên fail. Sửa assumption so normalized documentation text, giữ nguyên file nguồn/frozen config/provider outputs; rerun audit offlinePASS. Không coi đây là provider error hoặc chạy lại model. Transcript Markdown chỉ bỏ trailing space để diff-check; exact provider text giữ trong raw/PRIMARY_INPUT.

[Exact commands đã chạy](COMMANDS.md); [readiness/log hashes](PREPARATION.json). Không lấy remote checks rỗng làm CI PASS. Self-review đủ cho profile solo PREPROD; chưa merge/deploy.

Complexity delta: eval-only native comparison mode và Sol read-function wire projection, reuse code-owned B1 tool loop/source/current gate;6implementation/test/prompt/configfiles,194insertions/36deletions. Semantic roles/layers added0; vẫn1owner+1verifier mỗi outcome. Không new production framework/gate/router/language parser/state/table/effect hoặc regex/template growth. Báo cáo/evidence không là runtime orchestration.

**Recommendation: STOP tại owner review.** Lỗi còn ở owner (lời khuyên/giọng/đánh đồng điều kiện đã biết), verifier (một quyền đổi vượt căn cứ lọt qua) và source→context (mô tả catalogue chưa đủ chọn phương án, chưa tận dụng hết source fields). Không chỉ quy về model hay chỉ thiếu dữ liệu. Giữ cơ chế tools đã chứng minh, audit nguồn/context đủ dùng và policy-scope presentation trước lần sửa tiếp; chưa thực hiện thêm run, Phase C, deploy hoặc send.
