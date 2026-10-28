# Phase B — POS refresh và owner wire, 26/10/2026

**Đủ 51 native + 17 controls. Reviewer APPROVE bản sửa scoped và evidence; toàn B chưa GO.** Timestamp fix được chứng minh bằng deterministic source-change/expiry tests và PostgreSQL capture. Model run giữ đúng silent handoff/checkout, nhưng chưa cải thiện rõ giọng hoặc khả năng chọn đồ theo nhu cầu.

Implementation base: `106d0c341f1e5f2e47e8850916c33cfc063f666f`. Exact clean, unchanged model/DB source: `468d85ea6577c428cf2f6f155c9774926537364b`. [Plan](../../../../../docs/specs/c3-phase-b-pos-refresh-wire-plan-20261026.md), [implementation, RED/GREEN và commands](../../../../../docs/specs/c3-phase-b-pos-refresh-wire-implementation-20261026.md). Registration giữ exact model/config/prompt/schema/corpus/driver hashes; không ghi run SHA ngược vào executable source. Báo cáo thêm sau collection không thay source đã đo.

## Sửa gì và đã chứng minh gì

Full read POS dùng pin request-local theo toàn parsed snapshot, chỉ ngoại lệ root synced_at. Lần đọc mới vẫn thật, đúng scope/status/freshness, không tương lai và không lùi latest seen. Chỉ khi toàn bộ fields còn lại giống nhau mới resolve bằng observation gốc; không renew expiry. Anyotherfield hoặc source error/null/invalid/rollback/hết hạn làm request invalid đến hết lượt. Final gate exact snapshot/draft/state/permission/privacy/recipient/receipt không thay. Metadata-only ảnh/nội dung giữ offer-only contract cũ; không thêm dependency giá/tồn chưa dùng. Không pin policy/catalog/cart/media hoặc cache liên request.

Reviewer plan REVISE/P2 đã bắt thiếu direct invalidation cho fields không chiếu; sửa rồi APPROVE. Code review độc lập APPROVE exact source, 168 worker + 69 Gemini-wire tests PASS. Parent cuối636 worker,190 Node,21 protected/assembler PASS; build/direct TypeScript/lint exit0. RED28→GREEN30 cho pin, source-error RED2→GREEN32. PostgreSQL **49COD+49BANK PASS**, exact clean source, cả2 DB dropped; trong đó refresh chỉ synced_at vẫn exact reply capture sau restart, stock-change/expiry vẫn chặn. Không suy provider BANK checkout đã được đo chỉ từ deterministic BANK parameter.

Hai declaration request_handoff/media trái silent policy được sửa. Actual owner requests cũ87 có44 chứa chỉ dẫn trả partial sau handoff và42 chứa chỉ dẫn thiếu ảnh vẫn trả phần khác; run mới87 owner requests có0 cả hai. Không rewrite prompt tư vấn, cắt context/receipt/history hoặc thêm ví dụ theo benchmark. Đây là loại mâu thuẫn có evidence, không phải proof giọng đã tự nhiên hơn.

## Kết quả và accounting

| Phần | Kết quả |
| --- | --- |
| Controls | 17 PASS: 8 unsafe blocked, 8 safe eligible, 1 probe eligible |
| Native | Đủ 51/51: 37 SEND_ELIGIBLE, 10 HANDOFF, 4 NO_SEND |
| Handoff | 10 bàn giao mới, cả10 HUMAN/event1/tag1, không Outbox/tin/ảnh mới |
| NO_SEND | 2 sau HUMAN im lặng; 2 checkout code-owned vẫn có câu hỏi/preview capture |
| Static fallback | 0 |
| Provider | 142 requests =87 owner+38 native verifier+17 controls; max1 upstream/generation |
| Errors | 0 provider/auth/quota/HTTP/timeout/completion error; không retry/substitution |
| Wire audit | 142 actual bodies,87 owner hashes khớp;0 evaluator-key matches;0 private synthetic-marker matches |
| Cleanup | 6 provider integration DB đều dropped;0 live sends |

51 native gồm21 B1 read-only eligibility và30 persisted outcomes, không coi toàn51 là actual delivery. Tổng denominator68slots, private code-only turn vẫn được tính, cap217generationrequests, N1/retry0. Target22 được parent và reviewer đọc đủ/hash-bind trước mở29remaining. Mọi attempt giữ nguyên; không bỏ lỗi hoặc lấy best-of-N.

Models unchanged: Vertex AI `gemini-3.5-flash-lite` version cùng tên/HIGH; OpenAI `gpt-6.1-sol` version cùng tên/HIGH qua Codex login. Owner maxOutput8192/thinkingHIGH, timeout90s; verifier tools=[]/tool_choice=none, timeout90s; exact config trong REGISTRATION.json. **Zero observed send-eligible false PASS** trên8 unsafe controls preregistered của configuration/population này; không phải full A2/A3 hoặc guarantee tổng quát.

Usage900.693 input/79.932 output tokens, thinking69.408 đã nằm trong output. Cost không expose. Native verifier p50/p95=7,000/13,046s(n38); verification+readback8,579/16,409s; driver elapsed18,916/43,890s(n51,mixed cohort). Không phải production SLA hoặc causal added-latency comparison.

## Những ca quan trọng

- Chân váy M449k từng STALE nay eligible; áo M499k không mời lên đơn ngoài read-only capability như trước. **Chưa có before/after chứng minh live POS refresh xảy ra trong run này**; không quy hai ca PASS cho codefix hoặc gọi N1 là ổn định.
- Opening ad/organic gửi đúng799k, size và2ảnh; hỏi lại giá không gửi lại ảnh. Thiếu feedback/POS cần thiết đều handoff im lặng, không giữ partial. Ảnh DETAIL có sẵn vẫn đi cùng SizeEngine M.
- Discovery vẫn viết “không lo bó bụng/không gây cấn bụng” khi chưa có fit. Verifier FAIL đúng, actual khách không nhận draft và được handoff. Đây là lỗi owner tư vấn vượt căn cứ, không timestamp/provider failure; hữu ích bán hàng của ca này chưa đạt.
- Gallery đúng màu be chưa đủ binding nên handoff, không thay ảnh chung. Artifact không export riêng final tool response; không kết luận shop chắc chắn không có ảnh. Bàn giao vẫn có owner/event/tag thật.
- Stateful giữ cart, đổi2áoL, tổng978.100đ, correction và checkout. Hỏi thông tin/preview mỗi bước1SENT_ACCEPTED; confirm PURCHASE_CONFIRMED/revision vàHUMAN/event1/tag1/enqueued0/0newOutbox/capture. Public artifact không export riêng confirmationobject/ledger; bảo toàn dựa planner/exact-state/receipt path đã review.
- `stateful-human-request` là journey `handoff` riêng với journey `sales`, không kế thừa HUMAN từ confirm. Cả10 HANDOFF hiện tại đều là bàn giao mới. Không dùng terminal count để đo event nếu chưa phân biệt journey.
- Deadline Cần Thơ dùng ETA4–8ngày để từ chối nhận hẹn sángmai; lần này không completionerror. Negotiation dùng ưu đãi ship30k do code xác nhận, total499k đúng currentquote.

## Giọng và hiệu quả bán hàng còn yếu

Concern vẫn phủ nhận cảm nhận bằng “chị yên tâm/không rườm rà” và chuỗi tính từ; đặc biệt buying-concern-v2 dài, chưa giúp chọn rõ. Concern-v3 chọn áo để phối chân váy đen đúng history nhưng lại mở cả bộ/ngân sách không cần. Changed-occasion-v2 trấn an “không bị bí” và mẹo che nắng chưa giúp chọn đồ tốt; giữ như qualitative advice residual theo ranh giới owner, không đổi rubric thành critical sau result. Correction vẫn nói “ghi nhận số đo/giữ nguyên”, size nhắc lại chiều cao/cân nặng. SQ223 trả bảng giá đúng nhưng quá dài, CTA hỗ trợ size trong harness read-only cần ghi capability limit; không báo thao tác đã xong.

Không chấm các câu này bằng đếm keyword hoặc lấy verifier PASS thay sales quality. [51 whole-turn notes](WHOLE_TURN_REVIEW.json) gắn exact artifact hashes, [51 hội thoại](CONVERSATIONS.md). Không mở vòng rewrite giọng mới vì chưa có evidence một chỉ dẫn nữa sẽ cải thiện.

## So với full run trước

| Chỉ số | Source8d4a0ab3 | Source468d85ea |
| --- | --- | --- |
| Native |35eligible/12HANDOFF/4NO_SEND|37eligible/10HANDOFF/4NO_SEND|
| Provider errors |2Gemini malformed completion|0|
| Checkout confirm |HUMAN nhưng1ACKcapture|HUMAN/0newOutbox/capture|
| B1 component-stock-v2 |STALE|PASS449kM|
| Giọng concern/correction |Còn yếu|Vẫn yếu, chưa claim tiến bộ rõ|

Không quy +2eligible cho prompt hoặc timestamp: source refresh thực chưa được ghi nhận, provider error cũng khác. Giữ nguyên raw/artifacts/STOP của run cũ. Đính chính phép đếm lịch sử: run cũ có11bàn giao mới(10silent+1ACK), cộng1B1STALE thành12HANDOFFterminals; nhận xét “human-request kế thừa HUMAN/10new9silent” trước đây sai.

Commands thực chạy: committed DISPATCH_DRIVER.py <externalraw> controls, targeted, full, đều exit0collection. COMMANDS.json lưu exact commands/preflight/exitcodes; không đồng nghĩa toànBacceptancePASS. Source/config không đổi trong campaign. Không thêm role/layer/router/parser/regex/framework, repair loop, production wiring hoặc source-store write. Recommendation: **timestamp và silent-handoff fix scoped đã được kiểm chứng; B NOT GO vì tư vấn và các giới hạn chưa đạt/chưa đo**. Không merge/deploy/live send, không tự chạy tiếp hoặc sửa thêm style.
