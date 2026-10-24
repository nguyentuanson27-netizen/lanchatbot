# Một run Phase B sau sửa contract theo action

Owner yêu cầu fix và chạy lại theo independent review. Intake `938086a7b1c52eae32a1756067237336872cbfef`, implementationBaseSha/refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Plan](PLAN.md). A OWNER_BYPASS và toàn bộ evidence lịch sử giữ nguyên.

## Treatment được phép

Code allowlist argument riêng cho ba cart actions, trước authorize/select/commit. Hai action hợp lệ vẫn commit từng command, không atomic cả batch. Recovery CART_MUTATED chỉ báo quantity của giỏ đã commit; size/màu chỉ nêu khi mọi component cùng giá trị. Không suy ý định còn thiếu từ câu khách, không gọi ACK là bằng chứng đã hoàn tất mọi yêu cầu. Sau effect thất bại vẫn handoff theo boundary hiện có.

Native declaration chỉ đổi description của change_cart_item để thể hiện contract ấy. Tất cả declaration khác/schema/tool count/names, owner/verifier prompts, manifest, projection, model/effort/config, budgets, corpus, source/policy và static fallback giữ restored baseline. Không reintroduce cart-dedup, rút prompt, chuyển prose, thay B1 capability hoặc combined atomic mutation. Không parser/regex/router, third model, repair/reverify, retry, gate/store/framework hoặc production entrypoint wiring.

## Population và thứ tự

Một run mới **31 outcomes**, N1: 7 ordered stateful từ stateful-cases.json trước, rồi đủ 24 B1 slots1:24 từ context-fix-20261016/cases.priority.json. Ba stateful đầu là hành trình mở→đổi→báo tiền cần quan sát riêng; dùng ngay ba outcomes đó, không chạy thêm canary hoặc reseed. Stateful còn lại và B1 vẫn được thu dù quality fail, trừ source/auth/isolation/integrity failure phải ghi đúng coverage. Không sửa giữa collection, replacement hoặc lấy kết quả lịch sử bù.

Giữ Gemini 3.5 Flash Lite High/Vertex global owner và GPT-6.1 Sol High/Codex login verifier. Mỗi turn tối đa 3 owner generations, 2 tool rounds, 6 calls, 1 verifier; toàn population max120 invocations. Mỗi invocation tối đa một upstream generation request, retry0. Ordinary tool rounds không phải repair sau verdict. Mọi model final sống sót hard precheck bắt buộc verifier và current readback/final gate. Code-owned recovery giữ receipt/authority/privacy checks, không dùng nó để sửa nháp model.

## Freeze, review và giới hạn

Hoàn tất tests/self-review, commit/freeze/clean source trước provider, capture current HEAD làm runtime bRunSourceSha, không ghi ngược vào frozen inputs làm đổi source. Config/stateful/source preflight 0 owner-verifier generations trước dispatch. No executable/prompt/config change trong collection.

Raw trước primary trước diagnosis. Review nguyên actual terminal, public state/source và hội thoại; không dùng rejected draft cứu điểm. Bar giữ baseline: USABLE / NEEDS_EDIT / UNUSABLE / FALLBACK_OR_NO_SEND; mười dimensions chỉ hỗ trợ lý do cả lượt, không cộng điểm/keyword/đáp án mẫu. Partial-source controls chỉ chứng minh phần trả lời độc lập; human handoff chỉ chứng minh ownership. B1 giữ read-only capabilities và nhãn lịch sử; không thêm size tool để lật điểm. Primary chủ quan/non-independent, human acceptance null.

Audit complete invocation/request/error/token/cost accounting, exact draft/context bindings, raw/Git hashes, runtime/evaluator firewall và private-checkout exclusion. Case IDs/purpose/rubric/sourceMode không vào model request. Cost nếu không expose thì ghi unknown, không ước lượng. Report latency p50/p95, static fallback/handoff/no-send riêng.

Payload/native-signature variance vẫn có thể vượt bound32KB; không cắt signature, tăng bound hoặc retry. Mapping địa chỉ → vùng ETA có thẩm quyền vẫn thiếu; không đoán/default hoặc publish source. Giữ source đọc-only, chỉ disposable harness DB được ghi/drop và delivery capture-only. Không POS order/payment/hold, employee notification, customer send, migration live, merge/deploy, Phase C hoặc A qualification. Sau một run/report/tasks/PR391 update thì dừng.
