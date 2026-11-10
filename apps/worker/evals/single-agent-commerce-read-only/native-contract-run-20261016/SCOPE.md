# Một run Phase B sau sửa contract và continuation

Owner yêu cầu “tiến hành fix và chạy lại”. Intake `40f400e7d3d121fa12da7a2a02ca1cf8fdccb9ee`; implementationBaseSha/refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Kế hoạch](PLAN.md). Giữ toàn bộ historical evidence và A OWNER_BYPASS.

## Candidate và population

Sửa allowlist argument theo action trong effect tool hiện có, loại bản cart trùng đúng public readback trong owner projection, làm rõ/rút phần native descriptions lặp và sửa các đoạn owner về lý do tư vấn/giọng/phạm vi policy. Verifier, policy/source facts, model, effort, generation config, budgets, schema verdict, fallback và corpora không đổi. Không regex/parser, role/router, semantic repair/reverify, store/gate/framework hoặc production wiring. Không cắt native signatures hoặc tăng bound 32.768 bytes.

Chạy đúng một lần **24 B1 slots 1:24** của `context-fix-20261016/cases.priority.json` và **7 ordered stateful** của `stateful-cases.json` (6 public provider turns + 1 private code-only checkout). N1, tối đa 120 invocations, không prefix stop. Gemini 3.5 Flash Lite High/Vertex global owner, GPT-6.1 Sol High/Codex login verifier. Owner tối đa 3 generations/2 tool rounds/6 calls; tối đa một verifier cho mỗi generated final. Mỗi invocation tối đa một generation HTTP request; không generation retry, replacement hoặc loại lỗi khỏi mẫu số. Ordinary bounded native tool rounds được giữ, không thêm loop sửa final sau verdict.

Freeze exact model/config/prompt/schema/native-tool/corpus/source identities trước generation. Commit rồi require clean source, capture HEAD thành runtime bRunSourceSha, không ghi ngược làm thay HEAD. Không sửa executable/prompt/config trong collection. B1 và stateful có thể chạy đồng thời sau canonical build; stateful vẫn tuần tự, không reseed để cứu bước sau. Source/auth/integrity/isolation failure có thể dừng dispatch phụ thuộc, phải ghi coverage thật; semantic/quality failure vẫn thu đủ population đã yêu cầu.

## Review và accounting

Giữ cùng whole-turn bar của [baseline](../advisory-context-run-20261016/SCOPE.md): USABLE / NEEDS_EDIT / UNUSABLE / FALLBACK_OR_NO_SEND, mười dimension hỗ trợ lý do của cả lượt, không tổng điểm/keyword/đáp án mẫu. Tư vấn giúp mua, chọn hợp lý, ngôn ngữ chat, dùng context và bước tiếp trong khả năng. Cho phép upsell/cả set/món lẻ và trích dẫn fact có ích. Partial-source control có thể dùng được cho phần độc lập; requested handoff chỉ chứng minh ownership transfer. Không chấm lượt mutation thành công khi chỉ xong một phần yêu cầu hoặc lấy lượt sau bù lượt trước.

Lưu/commit raw trước primary, đọc toàn hội thoại cùng actual terminal/public state/source trước rejected drafts/verdict details, rồi mới diagnose. Review chủ quan/non-independent, human acceptance null. Không đổi nhãn cũ hoặc tự gắn nhãn SAFE/UNSAFE mới cho policy boundary còn tranh luận. Captured requests chỉ chứa runtime projection; evaluator caseId/family/purpose/rubric/sourceMode và private checkout inputs bị loại. Audit raw/Git hashes, exact bindings/text/captures, complete invocation/request/error/token/cost coverage và p50/p95 latency. Không gọi zero fallback là chứng minh bán hàng hoặc an toàn adversarial; không A2/A3 mới.

## Kiểm tra, nguồn và giới hạn

Observed RED→GREEN cho owning contract/projection; focused/full worker/Node eval, protected claims/reply, worker typecheck/build/lint và self-review trước seal. Chạy controlled COD/bank integration bằng current code/policy trong hai test DB riêng, không model generation; đây là synthetic domain controls, không source purchase. Sau seal chạy config/stateful preflights và source readback với 0 owner-verifier generations trước dispatch. Canonical runner builds thực sự chạy.

Dùng credential/source-session route có sẵn, không substitute model hay in secret. Source PostgreSQL read-only; Redis/Qdrant chỉ đọc. Chỉ harness-owned disposable test DB được tạo/ghi/drop; delivery capture-only. Không POS order/payment/hold, customer send, human notification, source/index/policy publication, merge hoặc deploy.

Mapping địa chỉ → vùng ETA còn là external dependency đã biết; không tự chọn vùng hoặc tạo ETA. Controlled offline continuation mới vừa bound nhưng không chứng minh mọi native-signature variance đều vừa. Giữ fail-closed outcome và cả lỗi trong denominator nếu xảy ra. Sau một run/report/tasks/PR391 update thì dừng, không post-result fix, extra run, Phase C hoặc live acceptance.
