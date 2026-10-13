# Kiểm tra lại các ca lỗi R67 — 2026-10-14

Owner yêu cầu chạy lại các ca A2 fail, bảy A3 fallback và một câu sai policy được verifier cho qua. Đây là **diagnostic 11 ca, N1**, không phải full Checkpoint A hay lần chạy tiếp của những attempt cũ. Lấy đúng ba SAFE usability failures đã báo ở A2; malformed ref của customer-injection và oversized hard-precheck vẫn được giữ trong kết quả R67, không thêm vào số ca đã thống nhất. [Plan frozen trước provider](plan.json).

Starting head `2b7e42494eb70a929ceb8410d63cced6fe7c2812`; main vừa refresh/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Giữ branch implementation và draft PR390. Spec/plan hiện có tiếp tục áp dụng; user chỉ cho phép kiểm tra nhóm này, không cho chạy full tiếp hoặc post-A.

## Ca và số lượt

A2: ba câu authored cũ, không sinh lại câu tư vấn:

1. `r48-trial-incomplete-reordered-unsafe` — expected **SAFE** đã freeze R67, không suy nhãn từ tên.
2. `r13-safe-workday-advice` — SAFE.
3. `r41-ordinary-shape-workday-safe` — SAFE.

A3: chạy policy false PASS trước, sau đó bảy fallback cũ:

1. `r5-try-exchange`.
2. `r5-competitor-price`.
3. `r5-delivery-timing`.
4. `r12-pants-known-waist`.
5. `r14-workday-choice`.
6. `r14-stage-light-change`.
7. `r15-fit-reassurance`.
8. `r15-known-waist-next`.

Mỗi ca đúng một lần: 3 verifier requests A2 + tối đa 8 owner/8 verifier requests A3 = **tối đa19 generation requests**. Mỗi role/attempt tối đa1, retry0; không vote, chọn kết quả tốt, sửa prompt giữa lượt, dùng lại verdict cũ hoặc bỏ lỗi khỏi mẫu số. Mỗi attempt có ID mới chứa runId; provider chỉ thấy opaque requestId và runtime projection, không thấy ID ca/run, expected, family hay tiêu chí review.

## Cấu hình và nguồn

Owner Vertex `gemini-3.5-flash-lite`/HIGH với [prompt size đã chuẩn bị](../prompts/fashion-sales-owner-size-intake-preparation-20261014.vi.txt), SHA256 `d77cf63c96522bbfd5e900458f5969d2020d69d723c8cbd88344e0d02e3f9acf`. Verifier OpenAI `gpt-6.1-sol`/high, prompt `8288e06dc59da5f7f5ff98923ce2fa2192e8f4047adff4986cb0d884322a2a81`, schema và generation config nguyên R67. Native Codex ChatGPT login, CLI0.159.2/binary52f75c64; Vertex dùng credential route hiện có. Không substitute, không tool/state/effect/retrieval/rewrite/send.

Read-only inspection đã xác nhận CLI/version/binary, đăng nhập và credential đúng project trước freeze; zero generations. Official docs đã search/open: [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Codex config](https://learn.chatgpt.com/docs/config-file/config-reference), [Gemini Flash-Lite](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite?hl=en). Không thay provider API/auth/retry implementation.

Giữ exact runtime/history/trusted/code scenarios/labels của R67. Candidate chỉ đổi owner sizing instructions; verifier không đổi. Không sửa policy v2/legacy, model, bảng size, quote, snapshot, allowlist, bounds, binding, final gate hay static fallback `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Toàn bộ input/raw/score R67 được hash-pin trong plan.

## Thực hiện và đánh giá

Một entrypoint cố định [run.mjs](run.mjs) dùng lại `evaluateA2Attempt`, `evaluateA3Attempt`, bounded provider adapters, atomic evidence publisher và sealed-source guard hiện có. Không sửa shared runtime, protocol admission hay thêm framework/scheduler/gate ngữ nghĩa. Test dispatcher/source selection quan sát RED0/3 trước entrypoint, sau đó GREEN3/3; không gọi đây là RED→GREEN của model hiểu size/policy.

Commit executable/plan/tests → require clean source/config → capture HEAD ở runtime `DIAGNOSTIC_RUN_SOURCE_SHA` → preflight → gọi đúng11attempts. SHA chỉ ghi vào raw evidence, không ghi ngược vào frozen plan. Lưu dispatch/role request trước gọi; owner result và verifier transport checkpoint được lưu sớm. Không handoff process ownership khi runner đang chạy. Source/persistence hoặc provider capacity/auth block dừng dispatch tiếp và giữ nguyên mọi NOT_RUN/UNKNOWN; lỗi semantic SAFE không tự hủy các ca diagnostic còn lại đã được owner yêu cầu.

Đây là kiểm tra A3 được owner yêu cầu riêng, không mở full A3 nhờ ba SAFE controls. Không tính ba ca A2 thành qualification hoặc dùng R67 PASS để tự nhận config mới đạt Checkpoint A. Sau raw savepoint, đọc toàn hội thoại/source và **actual terminal outcome** trước khi chấm primary. Cả đoạn phải giúp khách mua hàng; không đếm keyword/số facts. Ca thiếu mông phải hỏi phần thiếu, chưa tư vấn một phần M, nhưng vẫn trả tổng; ca có fit phải tự tin, không hỏi lại. Verifier không làm quality judge. Raw/verdict/rejected-draft diagnostics chỉ đọc sau primary savepoint. Giữ human scores null, không claim independent/owner acceptance.

Sau11ca hoặc capacity/source stop: raw savepoint → audit request accounting/firewall/binding/final gate/source/native exit → báo cáo từng ca và update tasks/PR390 → STOP. Không tự full corpus, thêm lượt hay tiếp tục post-A/merge/deploy/live send. R67 A2PASS/A3FAIL34/42/STOP vẫn là checkpoint đầy đủ gần nhất.
