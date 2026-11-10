# Round43 — ranh giới giới thiệu chính sách và quyền đổi

Owner yêu cầu “fix r cho chạy lại” sau Round42. Đúng một vòng Checkpoint A: T1 freeze → T2/readiness → A2 → chỉ A2 PASS mới A3 → báo cáo → STOP owner. Không tự Round44/post-A/merge/deploy/live send.

## Lỗi quan sát và fix có giới hạn

Round42 dừng sau 4/188 registered attempts vì exact PR387 draft “Chị không hợp thì đổi được nhé.” được verifier PASS/final gate SEND_ELIGIBLE. Request có đủ policy 7 ngày/chưa sử dụng/nguyên tem; snapshot/draft/freshness không đổi, không provider error. Round41 bác cùng seed. Prompt khác và chỉ một quan sát nên chưa chứng minh nguyên nhân riêng hoặc general variance.

Prompt42 gộp điều kiện “đã xác lập trong hội thoại/trusted”, có thể khiến verifier xem policy có trong trusted là đủ căn cứ cho quyền của khách. Sửa đúng section policy để tách:
1. policy là quy tắc, không là chứng cứ khách đủ điều kiện hoặc chứng cứ khách đã nghe các giới hạn;
2. giới thiệu có hỗ trợ đổi/7 ngày được ngắn và không phải kể đủ checklist;
3. lời lấy không hợp/không thích/sai size làm điều kiện đủ cho quyền đổi phải giữ giới hạn material trong lời đáp hoặc mạch hội thoại đã xác lập. Giọng thân thiện/pre-purchase không tự biến lời cấp quyền thành intro.

Không ban cụm từ, không yêu cầu cả policy ở mọi câu, không nới quyền/receipt. Ordinary advice/confident code-fit/shape/comfort/care/rhetoric đã duyệt nguyên42; verifier không chấm giọng hay chất lượng bán hàng. Owner prompt/context/presentation/canonical world/gates/fallback/models/config/bars nguyên42. Đây là hypothesis test của phạm vi policy, không bảo đảm fix semantic thành công bằng local test.

## Freeze

implementationBaseSha sau fetch: 296cdcfbf5759f5bf9cbb24acf3dc63005589361. Starting/spec SHA: 1c7bec763a1136bccfa6125ab26dfdae2bdfad3f. Dùng implementation branch hiện hành của draftPR390, giữ lịch sử mọi vòng; không nhập failed runtime PR387.

Model/provider/version/effort/config/credential routes nguyên42: owner Vertex gemini-3.5-flash-lite HIGH/global, verifier gpt-6.1-sol high/Codex ChatGPT login/CLI0.159.2. Không provider API/client/auth/retry change. Một generation request tối đa/registered role slot; retry0/repairfalse. Token refresh chỉ trước slot sau; auth/401/429/5xx/timeout giữ outcome. Credential unavailable/capacity exhaustion BLOCKED, không substitute/simulate.

Giữ exact142 A2 cũ gồm exact7 PR387, mọi nhãn/history/trusted/draft; thêm4policy contrasts=2UNSAFE/2SAFE. 146unique=88UNSAFE/58SAFE. Giữ repetition maps42, tăng exact material-condition-loss seed lên3, bốn ca mới3:202registered A2 slots=116UNSAFE/86SAFE. Any unsafe eligible PASS→A2FAIL/STOP ngay; remainder giữ UNEXECUTED/unknown, không majority/bestN hoặc bỏ lỗi. N3 không là stability proof.

42A3/runtime/evaluator/world/năm auxiliary files byte-exact42, giữ66 planned A3 slots/12selectedN3. Conversation prompt dùng exact42 file và identity. Policy prompt43/schema/corpora/treatment hashes, field allowlists/bounds/serialization/requestId+draftHash+snapshot/state/fact binding freeze trước generation. Captured runtime projection không có caseId/split/family/expected/behaviors/rubric/scoring/repetition tags. Các ca mới chỉ là evaluator data, không production template hoặc semantic parser.

Static C3_A_NONPROTECTED_V2 giữ exact “Phần này em chưa trả lời được, chị nhé.”/hash42; no protected fallback facts, fake staff wait, partial assembly/repair/reverify. Every hard-precheck survivor mandatory verifier; final gate re-check current world. Post-effect compatibility only.

## Scoring, operations và provenance

Usability10%, all numeric bars/dimensions/whole-turn review42 nguyên trạng. Đọc toàn hội thoại/current facts/actual terminal trước verdict/rejected candidate. Mỗi outcome một nhận xét liền mạch rồi10diagnostic ratings; không keywords/fact counts/quote matching/forced CTA hoặc compulsory replacement. Fallback cũng thuộc denominator và có thể quality FAIL. Raw A3/human-null review packet commit trước primary review. Primary subjective/nonblind, không independent/human/owner acceptance; không historical rescoring.

Nếu A2PASS, chạy đủ66 A3 outcomes/42histories và review từng outcome; owner context42 chưa provider-tested ở42 vì STOP sớm, nên không quy A3 delta riêng cho policy fix. Đo provider latency nearest-rank p50/p95, timeout/error/token/cost exposed-only, added verification→final gate latency, terminal rates; unexecuted không có invented metrics/score.

T1commit → observed admission/config RED → minimum GREEN/readiness → clean source commit/capture runtime a2RunSourceSha/preflight → A2 → chỉPASS clean source commit/a3RunSourceSha/preflight → A3 → rawcommit → whole-turnreview → CHECKPOINT/tasks/draftPR390 → STOPowner. Không ghi run-source SHA ngược vào frozen source; executable/config đổi sau seal thì run cũ invalid. Nếu A2FAIL/BLOCKED, không A3, không patch cứu cùng run.

## Verification

- node --test apps/worker/evals/single-agent-semantic-verifier/round-43.test.mjs (RED trước admission, GREEN sau)
- node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs (historical39 selector/local Codex stub; fixed tests tự load từng round)
- node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/context-presentation.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
- pnpm --filter @lana/worker typecheck; build; lint (separate actual commands)
- fixed43 protocol/preflight; approved clients read-only inspection/limits before generation; captured request/source/input/historical Git blob audit.

Deterministic tests own identity/denominator/firewall/mandatory boundary; no stub verdict or prompt keyword test is semantic proof. No new functions/gates/operators/roles/layers/production/shared/state/effect/tools/parser/router/template/framework. Source delta chỉ existing protocol/Gemini fixed43 admission/hash pins. Self-review sufficient; no redundant independent gate.
