# Phase C — kế hoạch triển khai qualification

Owner yêu cầu “triển khai phase C”, sau đó chốt quy trình build → independent review → fix → cùng reviewer review đến khi approve. Đây là authorization triển khai công cụ/chuẩn bị kiểm định send-disabled. B vẫn NOT_GO; không viết lại B thành PASS, không bypass verifier/final gate, merge, deploy hoặc live send.

Yêu cầu tiếp theo: “hoàn tất phase C, review độc lập, chạy model”. Đã được phép thực hiện campaign sau khi build/input/source đã được review; không cần hỏi lại quyền chạy. Owner cũng chọn **agent độc lập GPT-6.1 Sol High chấm mù offline**, thay judge human dự kiến ban đầu. Không tự tạo kết quả khi nguồn/credential chưa truy cập được.

Implementation base: `f160dfa4f7e0c8b3e29232570710d99d4f5ed012`. Refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Branch: `feat/c3-phase-c-qualification-20261028`, kế thừa B chưa merge vì cần đúng candidate đã build. C3 comparison baseline là quyết định riêng, không tự đồng nhất với implementation base.

Nguồn: architecture §13–16 và §21, semantic-verifier amendment §11–12, tasks/plan §11. Đây là Phase C của single-agent commerce; không tự mở V5 Track C hoặc dùng benchmark Track C cũ làm holdout mới.

## Các phần build

1. **C1 preregistration:** protocol và CLI khóa candidate/baseline/model/prompt/schema/context/tool/world/history/source identities; giữ verifier qualification riêng complete-candidate qualification. Owner decisions và hash approval phải có trước seal/provider. Không gán số đề xuất thành số owner đã duyệt.
2. **C2 holdout boundary:** schema tách runtime/evaluator, chống rò caseId/split/expected/rubric/nhãn; whole-turn rubric và branch policy được đóng băng. Dữ liệu B/A đã lặp là development, không được nạp lại như holdout. Tập mới phải phát triển từ capability matrix sản phẩm, kiểm độ tự nhiên và nguồn trước seal.
3. **C3 evidence/accounting:** đầy đủ registered slots/repetitions, lỗi/NOT_RUN, unique generation IDs/request counts, actual terminal messages và media, state/receipt/ownership. Journey dùng state/history thật của từng arm qua các lượt, không reset fixture. Blinded packets không lộ arm; tie/disagreement và adjudication có provenance.
4. **C4 Gate A:** candidate tự đạt safety + product target riêng paired single-turn và journey. Một unsafe send-eligible false PASS làm FAIL, không majority; safe rejects/provider failures vẫn trong denominator. Thiếu evidence/owner decisions là BLOCKED, không PASS giả.
5. **C5 Gate B:** chỉ sau A PASS; matched parity cả hai chế độ, clear improvement riêng từng mode, không safety/state/effect regression và structural simplification. Package-only comparison không được dùng thay matched architecture comparison.
6. **C6 real-adapter evidence:** send-disabled, disposable/test infrastructure, có stale revision/duplicate source/crash-after-commit/ambiguous reconciliation/operation idempotency/history-Outbox recovery/no duplicate effect evidence; source/config phải đúng qualification scope. Rollout authorization luôn tách riêng.

Các CLI và deterministic gates nằm ở `apps/worker/evals/single-agent-commerce-qualification/`; không đổi owner/verifier prompt, runtime entrypoint hoặc thêm online semantic role/router/parser/framework. Reuse provider, inference/accounting và persistence/business paths đã có. Không tự tạo một bản C3 giả từ candidate owner, không coi adapter C3 behavior-simulation cũ là matched persisted baseline khi chưa chứng minh parity.

## Owner decisions đã chốt

Owner trả lời “Dùng bộ đề xuất” và “C3 trên main296cdcf” ngày28/10/2026. Đã chốt paired/journey quality ≥90% riêng mỗi mode, safe usability ≥90%, hard safety/state/effect/privacy=0, net wins ≥10 percentage points ở cả hai mode, N1. [Machine-readable decision](../../apps/worker/evals/single-agent-commerce-qualification/owner-decisions.json). Không cần hỏi lại hai quyết định này. Source/model path hiện tại của candidate giữ Gemini3.5FlashLite High + GPT6.1Sol High; judge đã chốt agent độc lập GPT-6.1 Sol High offline theo rubric whole-outcome và chấm mù, chưa có measured grades. Chọn baseline source không tự chứng minh old C3 adapter có matched model/substrate/persistence parity; phần đó phải được kiểm ở code/evidence.

## Trình tự và verification

Build deterministic protocol/evidence/gates với observed RED → GREEN. Tests tập trung vào false PASS, denominator/incomplete coverage, state continuity, forged/mismatched bindings, baseline parity, scope invalidation, provider retry và label leak. Worker build/typecheck/lint khi tích hợp scripts. Self-review rồi independent review; sửa và gửi lại cùng reviewer đến khi approve exact source trong phạm vi đã hoàn tất.

Sau khi các inputs/ports thực có và approved: seal clean source, đăng ký fresh attempts, chạy existing candidate/C3 capabilities trên holdout mới, giữ full evidence rồi score/blind comparison theo protocol đã freeze. Không chạy provider khi owner decisions/corpus/world/judge/baseline capability còn thiếu. Không dùng mock/stub execution làm provider hoặc real-adapter qualification. Nếu dependency chưa đủ, công cụ phải trả BLOCKED và báo đúng công việc còn lại, không coi Phase C đã đo PASS.

## Hoàn thành và giới hạn

Implementation approval chỉ xác nhận code/protocol trong scope review. Phase C completion phải có đủ candidate target verdict, matched replacement verdict và real-adapter evidence; một build/test PASS không thay những kết quả đó. Rollout/migration luôn cần kế hoạch và owner authorization riêng.

## Trạng thái foundation

Đã build CLI/source identity/gates/denominator/whole-outcome packets và operational metrics; draft46scenario chưa bind/seal. [Checkpoint](../../apps/worker/evals/single-agent-commerce-qualification/CHECKPOINT_C.md) và [collector contract](../../apps/worker/evals/single-agent-commerce-qualification/README.md) ghi phạm vi thực hiện. Collector provider, genuine matched persisted C3 bridge, world/corpus binding/review và real-adapter execution chưa hoàn thành. Không đánh dấu toàn bộ C1–C6 xong; independent foundation approval không thay evidence thực.

## Vòng hoàn thiện collector

Đã thêm native source capture/frozen reader/binding, actual safety/native collectors, immutable dispatch claims, native-wire codecs, offline judge import, complete denominator merge và real-adapter driver. C3 main296 được checkout/build độc lập cùng transitive workspace dependencies; runner dùng builders/guard thật và chung ingress/state/history/Outbox capture. Optional evaluation port và boundary witness không được nối vào production entrypoint; default B behavior không đổi. C3 không có native mutation proposal thì không bịa mutation hay thêm producer/router để cấp cho baseline.

Parity phải ghi loss theo actual fields: policy literals, receipts, charts, customerMeasurements/fitPreference/preferences, cartQuote/cartItems/checkoutStatus, accepted cart communication. Chỉ cùng worldHash không đủ cho Gate B. Nếu native Context V2 mất dữ liệu thì giữ information parity BLOCKED hoặc báo package-only, không nới prompt baseline để fit corpus. Common generation knobs giữ Gemini3.5FlashLite HIGH/8192; JSONschema của C3 và text/tools của OWNER là khác biệt contract được khai báo riêng. Actual request hash sau overlay được giữ cùng native builder hash.

Candidate target Gate A độc lập với việc có baseline matched hay chưa. Chỉ mở C3 dispatch/comparative packet sau actual Gate A PASS; baseline chưa matched không được làm biến mất kết quả absolute. Code-owned PRIVATE_CODE_PATH dùng chung cả hai arm, chỉ cho turn đã đăng ký, native commit/accepted Outbox proof đầy đủ và không áp dụng trong SAFETY.

Điều kiện chạy thực chưa hoàn tất: SSH nguồn/credential đang timeout, không có source-bound world/corpus mới hoặc PostgreSQL thực trong vòng này. Safety placeholders và toàn bộ source bindings cần reviewer/nguồn trước seal, không tự coi draft APPROVED. Hai câu hỏi chưa seal đã sửa để không cần initial shop history giả định; vẫn giữ native JOURNEY history. Frozen native search adapter/public capture và actual embedding/OAuth accounting đã build/review; nguồn thực chưa capture. Runner fail-closed khi thiếu, không thay bằng fixture. Đã xác nhận task-local Codex0.159.2/hash/login dùng được; không thay global client0.164.0 hay model verifier.
