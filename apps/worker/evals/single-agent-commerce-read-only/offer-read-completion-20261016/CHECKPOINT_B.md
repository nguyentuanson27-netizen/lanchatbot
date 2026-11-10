# Phase B — hoàn tất18B1+7stateful và sửa chung

**Đã thu đủ25lượt được yêu cầu:18B1eligible; stateful4fallback/2handoff/1no-send. STOP sales/live acceptance.** Primary mới16USABLE/3NEEDS_EDIT/6FALLBACK_OR_NO_SEND; gồm mộtUSABLE chỉ cho yêu cầu chuyển ownership trong isolated harness. Đọc [toàn hội thoại](CONVERSATIONS.md), [finding/root cause và việc đã sửa](FINDINGS.md), [review toàn lượt](PRIMARY_REVIEW.md).

## Provenance và phạm vi

- Intake44aab8a7e46ba4413642d213b02b3ac711837971. Refreshed main/implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361.
- [Scope owner override dừng sau sáu ca](SCOPE.md) và[FROZEN_INPUTS](FROZEN_INPUTS.json) commit trước generation. Clean bRunSourceSha099ed3ab44a90602f9a2703cbdebaae25c6f1602, không ghi SHA ngược vào frozen source. Executable/config không đổi so10040a9d của sáu ca trước.
- Raw14a4eb70 trước primary59df9d32 trước diagnosis/fix.33raw/preflight/source files giữ disk/GitSHA256 trong[RAW_HASHES](RAW_HASHES.json).
- New18B1range7:24+7orderedstateful, N1/max96additional generations; giữ registration gốc24/max96 củaB1 nhưng dispatched18/max72, stateful7/max24. Đã ghi đủ25, không retry/replacement hoặc chạy lại sáu ca trước. Coverage31cộng sáu ca lịch sử, không phải một full31run cùngSHA/live inputs.
- Owner Vertex/global gemini-3.5-flash-lite High, alias version giống model; candidate1/plaintext/max8192/thinkingHIGH/includeThoughtsfalse/defaulttemperature/topP/90s/retry0. Verifier CodexChatGPTlogin gpt-6.1-sol High/CLI0.159.2, boundedResponsesrelay/tools[]/none/storefalse/90s/1upstream request per generation/retry0; binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a. Immutable backend build identities không expose.
- Prompt runowner74c8102ef88e970fca18e84f5d186406a4d21ac5d27bafc383c6476b85394b43/verifiere8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d. Schema76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97. B1tools23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8; composed486f4134f7015c3281e335e425d62c62bd5a63dfd376fd277a866c917a3c859b. Corpus/config hashes vàspec/plan Gitblobs nằm trong frozen inputs.
- FallbackC3_A_NONPROTECTED_V2, “Phần này em chưa trả lời được, chị nhé.”, SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Không đổi terminal map hoặc fallback trong fix.

## Kết quả đo

| Cohort | Actual terminal | Primary |
| --- | --- | --- |
|18B1mới |18SEND_ELIGIBLE,0fallback |15USABLE/3NEEDS_EDIT |
|7statefulmới |4fallback/2handoff/1no-send |1USABLE ownership transfer/6FALLBACK_OR_NO_SEND |
|6B1trước, source10040a9d |4eligible/2fallback, giữ nguyên |2USABLE/2NEEDS_EDIT/2fallback, giữ nguyên |

Owner chấp nhận nghĩa hai nháp trước bị chặn; actual customer outcome cũ vẫnfallback. Không chấm lại để nâng số. Review mới chủ quan/non-independent, chưa human acceptance hay độ ổn định. Handoff đúng có thể là kết quả hữu ích; không đồng nghĩa đã có nhân viên thật hoặc một giao dịch hoàn tất.

[Accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), [audit](AUDIT.json):70uniqueinvocations/70HTTP200=51owner+19verifier;0unknownrequestcount/0retry/0timeout/0verifiertransporterror. Một ownercompletion error sauHTTP200, finish reasonUNKNOWN/OWNER_FINISH_REASON; không gọi nó là outage. Hai parsedtoolreturns dướiNONE được chặn bởi budget.19finals đều qua verifier,19exactbindings,18eligibletexts đúng draft;0observed evaluator/private-fixture leaks,51owner body hashes match dispatch. Private checkout0model. Input261,812/output20,048tokens, complete70/70; cost không expose. Ownerauth2đã biết, Codexauth network countUNKNOWN.

NewB1fallback0/18; statefulfallback4/7(57.1%), handoff2/7(28.6%), no-send1/7(14.3%). Giữ riêng cohort và nguồn, không suy tỷ lệ ra traffic thật. Source-check1embedding riêng/0owner-verifier; B1embedding0, catalog34/POS24/policy12 theo instrumentation; statefulembedding0. Không coi đây là complete network inventory.

Nearest-rank latency, seconds:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation |51 |1.692 |3.830 |
| Verifier generation |19 |5.122 |13.647 |
| Added verification, B1 |18 |5.559 |12.058 |
| Whole B1 turn |18 |10.288 |16.335 |
| Added verification, stateful |1 |18.613 |18.613 |
| Whole stateful outcome |7 |20.234 |45.300 |

Whole-turn includes harness transaction/delivery drain overhead but excludes startup/source tunneling/build. Different cohort denominator and code-only turns matter; no paired model/latency superiority claim.

## Common correction after collection

[Plan](FIX_PLAN.md), [owner-approved advisory boundary](../../../../../docs/specs/c3-phase-b-advisory-and-chat-boundary-20261016.md). Effectcode keeps the existing typed selection failure (four-field allowlist) instead of collapsing it toCOMMERCE_UNAVAILABLE; no commit/receipt/fit from failure and same missing-source readback invalidation. Net+9TypeScriptlines in one executable file;3testcases. No new gate/store/layer/role/parser/regex/provider framework or budget increase.

ActiveBpromptowner32be6de2d2e2f2dea333486b125284375a9a3cafa35156780d98cb902ee49726(11,024bytes,+708)/verifier2e2594eac4ca8f9cb688feda8f9f32cd34acfcfc6bb77d1d4231b272edc81f26(11,260bytes,+385). Replace existing voice/advisory/tool paragraphs; do not add per-case answers or shop policy facts. New prompt accepts grounded sensory/style inference, preserves observable-property/code-fit/money/receipt boundaries and makes direct purchase-tool intent clearer. [Offline70captured body instruction swaps](PROMPT_COMPATIBILITY.json):maxowner29,683/verifier23,502bytes below32KB; not proof of semantic/naturalness improvement or all possible contexts.

**This is a later candidate, not provider-tested by the25baseline outcomes.** No post-fixgeneration. Historical A and B frozen artifacts/verdicts/scores stay byte-identical. AOWNER_BYPASS, real-source checkout destination mappingBLOCKED; no serving/source/index/policy publication, POS order/payment/hold, human notification, deploy, merge or customer send.

## Commands actually run

Read-only source/provider commands use the existing [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md), hashed task-local credential launcher and unchanged source-session route; no secrets logged/committed. Only one uniquely owned disposable PostgreSQL DB was written by the existing stateful harness, then dropped (readbacktrue). Live PostgreSQL sources remained read-only; delivery capture only.

```text
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 7:24 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-rest-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-stateful-20261016 COD --provider-run
node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-audit-20261016.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-selection-readback-20261016.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts --reporter=dot
pwsh -NoProfile -File C:/Users/nguye/AppData/Local/Temp/c3-offer-read-completion-worker-src-20261016.ps1
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Config/stateful/sourcepreflightsPASS with0owner-verifier generation; collectioncommands exit0 with the actual failures above, not salesPASS. Source-check/runner canonical builds actually ran. Raw-preservation/primary/70bodycompatibility were explicit offline Python checks,0generation. AuditPASS. Post-run selection diagnostic initial ESM failure and non-UUID invalid results are described inFINDINGS, not omitted from command history or model denominator.

TDD observed34PASS/3FAIL→37PASS; self-review added evaluator canary to failure payload, observed35PASS/2FAIL→37PASS after projecting only four fields. Full worker source suite130files/1,792PASS through the existing Windows fixture-junction compatibility wrapper; verified tracked placeholder bytes restored. Protected-claims/reply-assembler21PASS. Worker typecheck/build/lint exit0. Full Nodeeval491tests:489PASS/2existingoptionalSKIP/0FAIL, including focused protocol/provider-adapter/firewall and all historical frozen round tests. No shared source/package change, full-repository pnpmcheck, new PostgreSQL bank-transfer run or remote CI PASS claim.

Self-review: failure feedback has no new authority, no source error exception text, no state write on failure and no unknown/evaluator field forwarding. Existing authority/CAS/fencing/receipt/recovery tests pass. Do not broaden transactional semantics when allowing subjective advice. Remaining risks: model may still copy catalog/read unnecessarily; corrected verifier may still misjudge semantics; both need future provider evidence. Original selection rejection status is unrecoverable; fresh public readback cannot prove its exact cause. Source checkout mapping and absent product charts/attributes remain unverified dependencies.

**Recommendation: STOP sales/live acceptance; retain source checkout BLOCKED and AOWNER_BYPASS.** Complete coverage is diagnostic evidence, not CheckpointAqualification or approval to deploy/continuePhaseC.
