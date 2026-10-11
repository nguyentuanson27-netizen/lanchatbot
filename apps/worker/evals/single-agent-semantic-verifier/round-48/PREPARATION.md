# R48 — bản sửa đã kiểm tra, chưa chạy provider

Ngày: 2026-10-11 (Asia/Saigon). Phạm vi owner yêu cầu: “thực hiện fix đi”, “tiếp tục fix”. A2/A3 R48 **NOT_RUN**; chưa có a2RunSourceSha/a3RunSourceSha hay kết quả ngữ nghĩa mới. R47 giữ nguyên **A2 FAIL / STOP**, A3 NOT_RUN.

implementationBaseSha sau `git fetch origin main`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Starting/spec SHA: `db2219a6ed779ac8f9677cfae4b12ee225478d2f`. T1 savepoint: `be45150d`.

## Đã sửa

- Thống nhất cách đọc quyền đổi trong toàn hội thoại. Không đổi SAFE/UNSAFE chỉ vì đảo thứ tự lời từ chối và phần cho phép thử-đổi. Giới thiệu dịch vụ được ngắn; điều kiện của quyền đang xác nhận vẫn cần giữ.
- Chuyển hai nhãn cũ `r4-safe-policy` và `r47-policy-necessary-restriction-safe` sang UNSAFE **chỉ trong corpus mới**. Giữ nguyên draft/context/codeScenario của mọi ca cũ, không nới bất kỳ UNSAFE nào. [Lý do và hash bản gốc](label-review.json).
- Thêm sáu ca đối chứng N3: từ chối ngắn, quyền thử-đổi đủ điều kiện, điều kiện đã nêu trong history, đảo thứ tự nhưng vẫn thiếu điều kiện, khách sửa thông tin thành đã giặt, đổi màu ngầm hứa giải quyết độ kín. Tổng 163 ca /253 lượt dự kiến:147 UNSAFE/106 SAFE. Exact7 PR387 đứng đầu; các ranh giới đang sửa được đưa lên trước các ca còn lại. Bất kỳ unsafe eligible PASS vẫn dừng ngay.
- Chỉ thay phần policy của verifier: toàn prompt từ6118 xuống5974 ký tự. Owner47, các phần verifier khác, models/config, toàn42A3/66lượt, facts, ngưỡng, fallback và final gate giữ nguyên.
- Dùng predicate availability stop hiện có: R48 dừng sau lỗi AUTH_HEADER hoặc HTTP401/429, giữ attempt lỗi và remainder null. Historical manifests giữ semantics cũ. Không thêm generation retry, role, runtime gate, parser/template hoặc production wiring.

## Self-review và giới hạn

Đã đối chiếu scope policy từng fixture: v1 không bị ép mang điều kiện trial của r5; `r20-policy-scope-safe` đã có thời hạn trong history; các intro trước mua không bị đổi nhãn chỉ vì khách hỏi về thử. Hai ca bị sửa không còn là đối chứng SAFE, nên không so tỷ lệ R48 trực tiếp với R47. Sáu ca mới là development probes đã được người sửa thấy, không phải holdout độc lập. Không chấm lại lịch sử để cứu R47.

Các tests dưới đây chứng minh đăng ký, label accounting, byte retention, evaluator firewall, authority/envelope và stop behavior. **Chúng không chứng minh verifier hiểu đúng prompt.** Quy tắc vẫn cần provider A2 mới; A3 chỉ sau A2 PASS. Không thể đánh giá chất lượng Gemini từ lượt chuẩn bị này.

Availability stop hạn chế gọi lỗi tiếp, chưa sửa hoặc chứng minh nguyên nhân AUTH_HEADER. Không đọc credential, đổi tài khoản hay gọi health generation. Provider availability, immutable weights identity và hiệu quả ngữ nghĩa R48 còn chưa xác minh. Original47 thiếu dispatch record trước interruption vẫn là unknown; bản sửa này không bù được evidence đó.

## Commands thực sự đã chạy

Commands chạy từ repo root. Biến môi trường cho Node suite: `C3_CHECKPOINT_A_ROUND=39`, `C3_TEST_CODEX_TRANSPORT=1` để kiểm tra installed CLI qua local stub; đây không phải provider run R39/R48. Test admission48 tự chọn selector48 trong child process.

| Command | Kết quả |
| --- | --- |
| `git fetch origin main` và `git rev-parse origin/main` | Exit0; exact SHA ở trên. |
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-48.test.mjs` trước implementation | RED 0/4: stop predicate trả false cho lỗi auth; R48 chưa tồn tại. Exit1. |
| Cùng focused command sau implementation | GREEN 4/4,0skip. Exit0. |
| `node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | 253/253,0skip. Exit0. |
| `node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/round-48.test.mjs apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/run-a2.test.mjs apps/worker/evals/single-agent-semantic-verifier/context-presentation.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs` | 38/38,0skip. Exit0. |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | 79/79. Exit0. |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts` | 41/41. Exit0. |
| `pnpm --filter @lana/worker typecheck` | Exit0, bao gồm dependency prebuild. |
| `pnpm --filter @lana/worker build` | Exit0, bao gồm dependency prebuild. |
| `pnpm --filter @lana/worker lint` | Exit0. |
| `git diff --check` | Exit0. |

Không chạy provider preflight/generation, không có provider latency/token/cost/safety/usability result mới. Request bắt trong test dùng stub; evaluator labels không đi vào request. Historical folders không đổi. Không shared package source change. Không claim remote CI PASS từ kết quả local.

Complexity: giữ1owner+1verifier;0role/layer/gate/runtime function mới. Thêm fixed48 admission/pins, thay predicate availability hiện có bằng optional fields của manifest, một file test và bộ input/prompt version mới. Không sửa production entrypoint hoặc post-effect recovery.

Nguồn: [scope](../../../../../docs/specs/c3-round48-policy-contract-preparation-20261011.md), [verifier prompt](../prompts/semantic-verifier-round48.vi.txt), [R47 completion](../round-47/A2_COMPLETION.md). Checkpoint A chưa đạt; không GO hoặc tiếp post-A từ kết quả local.
