# Một lượt kiểm tra đầy đủ sau sửa prompt tư vấn và verifier

Owner yêu cầu “tiến hành fix và chạy lại”. Thực hiện [kế hoạch](PLAN.md) trên intake `995b1d4a59cff4577356e3fa602aaca41ee8d888`. Main đã refresh; implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Chỉ thay các đoạn prompt đang sở hữu vấn đề và active prompt hashes. Không đổi provider API, model, budget, corpus, source facts, code authority hoặc production entrypoint.

## Population và collection

- Chạy một lần đủ 24 B1, đúng slots 1:24 của `context-fix-20261016/cases.priority.json`, và 7 lượt theo thứ tự của `stateful-cases.json`. Sáu lượt stateful công khai có thể dùng provider, một lượt checkout private chỉ dùng code. Không ghép kết quả cũ; không chỉ chạy sáu ca đầu.
- Giữ Gemini 3.5 Flash Lite High qua Vertex AI/global cho owner; GPT-6.1 Sol High qua Codex login cho verifier. Exact config, prompt/schema/native-tool/corpus hashes ghi trong frozen inputs trước generation. Owner tối đa 3 generations, 2 tool rounds, 6 tool calls; verifier tối đa 1 generation cho mỗi final sống qua hard precheck. Tối đa 120 invocations trên 31 outcomes.
- Một generation HTTP request cho mỗi invocation; không retry, repair/reverify, replacement attempt hoặc bỏ lỗi khỏi mẫu số. Chạy đủ dù có lỗi chất lượng/ngữ nghĩa. Chỉ source/auth/integrity/isolation failure mới dừng dispatch phụ thuộc, với coverage ghi rõ.
- Commit executable/config/frozen inputs, require clean source rồi lấy HEAD thành runtime bRunSourceSha. Không ghi SHA ngược làm thay đổi source đã seal, không sửa prompt/config/code giữa B1 và stateful. Hai collection độc lập có thể chạy đồng thời; stateful vẫn tuần tự, không reseed giỏ để cứu bước sau.

## Review và evidence

Giữ cùng tiêu chí whole-turn của baseline: USABLE / NEEDS_EDIT / UNUSABLE / FALLBACK_OR_NO_SEND. Mười dimension hiện có hỗ trợ lý do của cả lượt, không cộng điểm, đếm keyword, buộc một đáp án hoặc bố cục. Tư vấn phải giúp quyết định mua, dùng ngôn ngữ chat, giữ ngữ cảnh và bước tiếp có thể thực hiện. Cho phép nhiều lựa chọn hợp lý, upsell phù hợp và trích dẫn dữ kiện có ích. Partial-source control có thể USABLE khi trả đúng phần độc lập; requested handoff chỉ USABLE cho chuyển ownership, không chứng minh nhân viên thật phục vụ.

Dùng ranh giới owner đã duyệt ở `docs/specs/c3-phase-b-advisory-and-chat-boundary-20261016.md`: cảm giác có căn cứ, gợi phối và cảnh báo hợp lý được phép; tính năng tự tạo, kết quả kiểm nghiệm/bảo đảm vật lý, fit, tiền, policy và receipt vẫn cần đúng nguồn. Không biến đánh giá giọng thành nhiệm vụ verifier. Không chuyển nhãn lịch sử để cứu kết quả mới.

Lưu/commit raw byte-exact trước primary. Đọc actual terminal, toàn hội thoại và public state/source cho đủ 31 lượt trước khi chẩn đoán rejected draft/verdict chi tiết. Review chủ quan, không độc lập, human acceptance null. Sau primary kiểm request/hash/binding/firewall, đầy đủ denominator/error/token/cost coverage và latency p50/p95 theo nhóm. N1 với source live không chứng minh tính ổn định hoặc riêng tác động của prompt.

## Nguồn, kiểm tra và giới hạn

Preflight config/stateful và source readback phải chạy thực tế trước generation. Dùng credential launcher/source-session cũ đã hash; không model substitution hoặc ghi secret. Source PostgreSQL read-only, Redis/Qdrant read-only. Chỉ disposable test DB riêng của harness được ghi/drop, delivery capture-only. Không POS order/payment/hold, thông báo nhân viên thật, customer send, source/index/policy publication, merge hoặc deploy.

Source diagnosis trước sửa xác nhận prep và transit đều có số; địa chỉ TP.HCM không khớp key vùng hiện có và không có default/mapping có thẩm quyền trong resolver. Không tự chọn MIEN-NAM hoặc bịa ETA. Checkout có thể tiếp tục BLOCKED trong lần chạy này; không gọi handoff là mua hàng hoàn tất.

Chạy focused protocol/provider/runtime/protected-claims/reply tests cùng worker typecheck/build/lint. Full Node eval được chạy để giữ frozen registrations cũ. Không thêm executable behavior nên không tạo unit test dò chữ prompt, không claim RED→GREEN ngữ nghĩa hoặc lặp full worker không có owning risk mới. Self-review trước seal và trước delivery. Sau run/report/tasks/PR391 update thì dừng; không tự thêm round, Phase C, acceptance hoặc live action. A vẫn OWNER_BYPASS.
