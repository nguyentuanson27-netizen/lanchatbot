# Phase B — turn-completion: STOP tại prefix

Campaign đóng ngày 25/10/2026 (ID bắt đầu24/10). **IMPLEMENTED_AND_EXECUTED; STOP, B chưa GO.** Đã chạy17/17 scoped controls và31/51 native.20native còn lại NOT_RUN theo gate đã đăng ký; không retry, không sửa/rerun để cứu kết quả. A vẫn OWNER_BYPASS; đây không phải qualification A2/A3.

## Identity và scope

- Implementation base của vòng: `8115516e33b43c68260cb9c2662073cfbd46540d`; program implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Sealed `bRunSourceSha`: `235d570a90f792a096e37d4094e6feaf3c7eee95`. HEAD và executable/config worktree sạch trước generation đầu, không thay suốt dispatch; source identity không ghi ngược vào frozen inputs. Report commit sau run không thay identity này.
- [Plan đã review](../../../../../docs/specs/c3-phase-b-turn-completion-plan-20261024.md), [review1P1+3P2](../../../../../docs/specs/c3-phase-b-turn-completion-plan-review-20261024.md), [T0](../../../../../docs/specs/c3-phase-b-turn-completion-t0-20261024.md). Không có independent implementation re-review mới; self-review và tests không được gọi là owner acceptance.
- Architecture và amendment cùng lastGitCommit `e5e54c85da5045d0529dd1bbe61c2fde8dd96c8b`; exact SHA256 lần lượt `78e83815495211386081ff646b93ab7f1bfc1cdbfb9fe4cb6c0a4533c2cf1343` / `14745e37eb9ec9b11bd8a47466c07e4c5ab91f75e5627c4e983aa4f408d1b411`.
- Owner: Vertex/global `gemini-3.5-flash-lite`, version cùng tên, HIGH, candidateCount1/plaintext/max8192/timeout90s; temperature/topP mặc định provider. Credential route C3_VERTEX_CREDENTIAL_FILE, không chứa credential trong evidence.
- Verifier: Codex login `gpt-6.1-sol` HIGH, version cùng tên, CLI0.159.2 bounded Responses relay, tools=[]/tool_choice=none, timeout90s/maxResponseBytes1048576, maxOutputTokens theo backend. Generation retry0; một upstream request/generation; continuation không forward. [Exact config](REGISTRATION.json).
- Owner prompt SHA256 `72a044fe15aaa2ff7471b0e93beae27ec630e7adbfd0a261c9bca1860ab39cbc`; verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`; schema `19a67ac07104c3417d6c07602334da22fb67a11df87fec4f53a9f4b2b1b46115`. Source-config `b4c15f1823bf16d63a1ff67eb3a11711b28ed6592ec7bc1e65e0ceb3fbbc0d59`. Corpus hashes đầy đủ trong REGISTRATION/PROVENANCE; frozen bytes trong frozen-inputs.
- Fresh public-source capture trước provider: hash `b1e458069a594555afa80422c77b004902e17bce7ac32418ae7009af752330f9`; preliminary captures giữ nguyên và active alias có sidecar. Candidate policy/chart delegation chỉ ở isolated DB; không publish lên nguồn shop.

## Đã sửa gì, giữ ranh giới nào

T1: candidate DEPENDENCY_FAILURE có câu “Em chuyển nhân viên hỗ trợ tiếp cho chị nhé.” Bổ sung bounded encrypted `C3_HANDOFF_GROUP_V1`, gắn policy/reason/group/message/recipient/state/revision/generation với committed handoff ledger. Transaction kiểm policy/authority; delivery/restart kiểm receipt và policy/current authority trước sequence0. Cache ALLOWED chưa bắt đầu phải kiểm lại; các sequence sau giữ một group decision. Legacy gate không hiểu binding fail closed. Không thêm bảng/migration.

Self-review và PostgreSQL bắt được lỗi thật ở public ingress: `completeInboxBatch:false` làm holding text enqueue sau transaction, thiếu binding. Đã observed RED→GREEN, chuyển holding nonempty vào transaction handoff+Outbox; ingress không enqueue lần hai. Trường hợp policy đổi không gửi old holding; fresh SILENT recovery có thể hợp lệ và phải phân biệt với old decision bị bác. Nhánh private checkout/inbound image giữ privacy/caller guards. Ledger append-only không bị sửa để phục vụ test.

T2: audit qua các run không chứng minh defect producer/projection cụ thể. Freeze **T2_NO_INTERVENTION** cho hai ca trước model; không tăng budget hay nhét thêm lệnh prompt. N1 hoàn thành cũng không tự là root-cause fix.

T3: thay đúng2dòng rule mở đầu, ưu tiên việc khách đang hỏi; không ép giới thiệu/ảnh nếu không phù hợp. Không viết lại toàn prompt, không thay verifier, thresholds, corpora hoặc fallback. Không có third role/router/parser/repair/reverify loop hay regex theo case.

Structural delta base→sealedsource:25files,+686/−41lines gồm plan/tests/driver; runtime thêm một bounded handoff binding contract và một delivery guard (~53lines), tận dụng transaction/dispatcher hiện có. Semantic roles added0, conversational owners1, verifiers≤1. Không production entrypoint wiring mới, merge, deploy hoặc live send trong vòng này.

## Kết quả và lý do dừng

| Phần | Kết quả |
|---|---|
| Scoped controls |17/17 PASS:8SAFE eligible,8UNSAFE blocked,1probe; zero observed send-eligible false PASS trên8unsafe của frozen scoped controls này |
| Native denominator |31/51attempted;20NOT_RUN. Tổng48/68registered outcome slots đã chạy; không loại attempt lỗi |
| Native terminals |25SEND_ELIGIBLE,1FALLBACK,3HANDOFF,2NO_SEND; eligibility không đồng nghĩa sales quality đạt |
| T1 PostgreSQL |Exactsource COD21/21 và BANK21/21 PASS; native expected handoff có tin; không ép POS refresh trong native để claim causal fix |
| T2 discovery |Actual fallback OWNER_TOOL_MODE: search→readSQ675/SQ748→đòi readV406 ở final-only; chưa hoàn tất |
| T2 changed occasion |Đã sinh FINAL/verifierPASS nhưng CURRENT_SNAPSHOT chặn. B1 eligibility-only, không gọi đó là actual handoff/delivery |
| T3 deadline |Giải quyết ngay sáng mai bằng ETA4–8ngày, không chèn bảng giá/ảnh; usable trong N1 |
| T3 price repeat |Text đúng giá nhưng gửi lại cùng2ảnh khi khách chỉ hỏi lại giá: regression; NOT_PROMOTED |

Primary review khóa toàn31actual outcomes trước rejected-draft/verdict diagnostic. Hash file `a0e6fab22a337a61aaf563e51f41a6692bf10c5ea07aa92144675cd0b3165672`; inputhash `b7cf5ca9605285c340592dbefa90bd26a435071346cd3767a15d5e16147475bb`. Chấm toàn nhu cầu→lịch sử→terminal/ảnh/state; phân biệt incomplete/needs-edit/polish, không cộng keyword hoặc lấy PASS làm điểm bán hàng. Đây là agent review, chưa owner/human acceptance. [31 hội thoại](CONVERSATIONS.md), [so cùng31ca với vòng trước](COMPARISON.md), [primary](PRIMARY_REVIEW.json), [gateSTOP](PREFIX_REVIEW.json).

Ba ca cần sửa chất lượng rõ: `b1-buying-concern-v2` trấn an dài nhưng trả lựa chọn cho khách; `b1-changed-occasion-v2` kể chất liệu rồi bảo cân nhắc thời tiết; `media-decision:ask` hỏi ren nhiều nhưng đọc3giá/chất liệu, chưa giúp quyết. Upsell799k ở concern-v3 vẫn có ích cho mục tiêu mặc lại và ngân sách850k; không đánh lỗi vì mua nhiều hơn.

Giọng: stateful-correction ngắn và tự nhiên hơn (“Dạ vâng ạ, em giữ nguyên2áo sizeL…”); tổng giỏ/state đúng. Nhưng material/adjective stacking, menu trong ngoặc, “giúp em”, CTA chung còn tồn tại. Code receipt recovery cũng có văn phong bản kê: sửa owner prompt không tác động được phần này. Không có bằng chứng cải thiện ổn định hoặc chuyển đổi bán hàng từ N1.

## Chẩn đoán sau primary, không thay score

1. **STALE là provenance/snapshot:** POS source refresh16:34:33.889Z→17:04:33.997Z. Revision1 và bốn claim values so theo type+scope không đổi; indexed diff có reorder. Gate strict snapshot vẫn đúng contract hiện hành. Không bỏ freshness/snapshot check hoặc coi giá trị không đổi là quyền gửi oldPASS. Owner đã hoàn tất tool flow ở ca này, khác lỗi final-only của discovery.
2. **Discovery là lựa chọn/tool budget:** descriptions có trong actual provider request; late read chưa được execute; no verifier. Run này không tái hiện old SQ2447 SUBJECT_BOUND. Không quy chung thành thiếu thông tin hay tăng budget khi chưa có defect cụ thể.
3. **Negotiation:** verifier chặn đúng owner gắn5%hai parent units vào mua cả set áo+váy (nguồn tính set/combo là1). Actual code recovery có ưu đãi30k/tổng499k đúng receipt. Đây là1FAIL được recovery trong25eligible, không phải25verifierPASS.
4. **Size:** hai ca M có SIZE_FIT đúng SV2447/currentprofile revision2/fingerprint; original SQ2447 chart provenance giữ qua owner-approved same-name delegation. Không suy fit chỉ từ RECOMMENDED label hoặc việc verifierPASS. Media+size có quote sai bị reject, sau đó sửa được trong budget; không phải automatic generation retry.
5. **Evidence limitation:** `media-detail-next:continue` capture caption thành `[ADDRESS]` do analytics redactor nhầm “đường nét”. Đã tái hiện offline. Existing capture gate **FAIL CUSTOMER_TERMINAL_NOT_CAPTURED**;4persistedjobs khácPASS. Không có hash plaintext trước redaction nên không chứng minh exact sent caption từ artifact. Giữ raw/gateFAIL, không sửa harness/rerun để cho đẹp số. Hai checkout code captures cũng đã redaction; NO_SEND của model không phải khách không có tin.

[Full post-primary trace](raw/POST_PRIMARY_DIAGNOSTICS.json). Không gửi draft bị chặn cho khách, không dùng diagnostic để đổi primary assessment.

## Operations và evidence firewall

103generation attempts=103actual provider requests (60owner/43verifier), max1request/generation,0automatic retries,0providererror/timeout. Một generation contract error OWNER_TOOL_MODE giữ denominator. Registered cap221 là trần, không phải số đã chạy. Token697872input/49230output,0unknownusage; costNOT_EXPOSED. ModelVersion là tên provider trả về, không giả immutable buildID.

Verifier latency n43 p50 **8213ms**, p95 **14796ms** (nearest-rank); verification stage n26 p50 **12354.9ms**, p95 **18513.1ms**. Capture attempt E2E n27 p50 **42429.2ms**, p95 **58792.9ms**;4B1eligibility p50 **18969.2ms**, p95 **33573.8ms**. Stage là elapsed verification path; không có counterfactual để gọi chênh lệch này là controlled added end-to-end latency. SSH/isolatedDB/fakeMeta, không phải live/first-token latency.

Terminal rates trên31native: fallback1/31=3.23%; handoff3/31=9.68% (hai expected persisted, một B1STALEeligibility-only); model NO_SEND2/31=6.45% đều có code checkout messages. Actual silent capture turns0/27. Media alternate/generic replies cần đọc quality riêng, không gộp vào “đã đáp đủ ảnh”.

[Firewall](LABEL_FIREWALL_AUDIT.json) kiểm đủ103actual dispatched wires: evaluator-label leaks0, private fixture/internal-delegation leaks0; chỉ owner/verifier. Request accounting giữ outer evaluator metadata ngoài model payload, không suy từ tên file. Prompt/schema/corpus/trusted-context bytes và raw hashes có trong [provenance](PROVENANCE.json), [rawhashes](RAW_HASHES.json), [fallbackcatalog](FALLBACK_CATALOG.json). Static fallbackC3_A_NONPROTECTED_V2 là “Phần này em chưa trả lời được, chị nhé.”; dependency holding chỉ có quyền sau commit/receipt/gate, không dùng verifierPASS để cấp effect.

## Commands đã chạy và giới hạn verification

Exactargv/exit/log: [VERIFICATION](VERIFICATION.json) và [providercommands](raw/COMMANDS.json). Các command failed/RED/incomplete vẫn giữ, không gọi PASS:

- Worker focused12files **369PASS trước** public atomic fix; final affected6files **143PASS sau** fix. Không tuyên bố369tests đã chạy lại trên finalruntime. Node protocol/provider/delivery/candidate/controls **94PASS**; shared contracts2/database46/protectedclaims+replyassembler21PASS.
- Worker typecheck/build/lint final PASS; contracts typecheck và database typecheck/build qua dependency build PASS. Không thêm API mới, không đổi provider identity/client semantics.
- PostgreSQL exactsource `--candidate-handoff --handoff-delivery-only` COD21/BANK21PASS/drop, gồm before/aftercommit/restart/cachedallowed/receiptoutage/lostresponse/invalidsnapshot/privatecaller/mixedgroup. Trước đó có assertion sai old-vs-freshrecovery, real unbound public holding defect, forbidden ledger update fixture và networkreset; giữ nguyên failed logs.
-12deterministic disposableDB:10autodrop;2networkorphan đã verify exactname+candidateversion+nosessions rồi drop, sidecar [cleanup](checks/ORPHAN_DATABASE_CLEANUP.json).5native persistedDB đều dropped. Không thay đổi live DB/policy.
- Existing capture gates4PASS/1FAIL do captionredaction; offline redaction diagnostic reproduced, không patch evaluator. Source-preserving report verification kiểm raw hashes, staged bytes và secret patterns trước commit.

[Report validation](REPORT_VALIDATION.json) PASS:251raw/frozenfiles khớp byte giữa worktree và index, primary hash giữ nguyên, không có secret-pattern hits. Ba corpus files trong Windows checkout dùng CRLF còn Git blob dùng LF; giữ cả hai hash và kiểm khác biệt chỉ là line endings. Frozen bytes khớp đúng registration/runtime, không sửa corpus. Validator ban đầu bắt top-level primary JSON bị Git chuẩn hóa newline khi stage; scoped `-text` và restage giữ lại exact bytes trước commit. Hai lần validation thất bại này được ghi trong sidecar, không thay evidence provider.

## Kết luận và phần chưa verified

**STOP/B chưa GO.** Giữ bản sửa authority/handoff có deterministic evidence; không promote T3 hoặc tuyên bố đã sửa khả năng khám phá.20native remaining chưa chạy vì gate không đạt. Không có fullA2/A3, stability repetitions, post-B, deployment, live send, live policy publication, production delivery/conversion evidence hoặc independent implementation approval trong vòng này.

Hướng nghiên cứu kế tiếp cần tách: (a) contract hoàn tất discovery trong budget từ trace cụ thể; (b) nguồn quyết định resend ảnh so với history; (c) wording của code recovery; (d) caption evidence hashing trước privacy redaction. Snapshot-binding redesign là quyết định kiến trúc riêng, không bỏ guard để cứu một run. Không tự mở vòng sửa/model tiếp từ report này.
