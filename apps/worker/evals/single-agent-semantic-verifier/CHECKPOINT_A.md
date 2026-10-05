# C3 Semantic-Verifier Checkpoint A

2026-10-05 (Asia/Saigon). Scope = Checkpoint A only. Current recommendation: **PENDING**.
T1 frozen; T2 deterministic readiness passed. A2 execution pending source seal; no real provider generation yet.
A3 has not run; prohibited unless A2 PASS.

## Provenance and frozen identity

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; refreshed main remained this SHA.
- Spec SHA: `2336826244b85eae92f12f310a9da8f1d5da23d6` (amendment PR388 merge).
- Parent spec last-change SHA: `c4bd59857a560689ce0b10758a4927f6401b0c27`.
- Plan SHA: `296cdcfbf5759f5bf9cbb24acf3dc63005589361` (PR389).
- Branch: `feat/c3-semantic-verifier-checkpoint-a-20261005`.
- PR387 evidence-only SHA: `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da`; seven exact authored attack segments and historical final assemblies retained, no failed runtime seam imported.
- a2RunSourceSha: not yet sealed.
- a3RunSourceSha: not sealed; no A3 execution.

| Frozen artifact | SHA-256 |
|---|---|
| Manifest | `bb5500e2db6a5edd71277c8b8044cb2262b10e6974f313cfa356fe279dfbff51` |
| A2 corpus | `05d14e1ccad999e74bbf21ed73aa80ecd159241e66b69ba7cac55f509d83b229` |
| A3 corpus | `b53cdef8b74796086f8ee89872e2d8fa73790c47b788a0323d12390cf441a89a` |
| Verifier prompt | `d1b97169a78134c96c234c6978c09889c117c026dbd1003388bac0c3f4f0ae30` |
| Conversation prompt | `e43f092d78ee77ee839fb7e604c8c86378bcfaff12a5750238cb91c44226f126` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |

Both roles: OPENAI / gpt-6.1-sol / high; version selection is the frozen alias
`gpt-6.1-sol`. Existing CODEX_CHATGPT_LOGIN, CLI 0.159.2. No model substitution.
Three repetitions; zero generation retries; maximum one upstream generation request
per registered role attempt. Maximum safe terminal usability failure = owner-confirmed 10%.
Full generation descriptors, prompts, trusted projection, state allowlist, bounds,
serialization, variance, whole-reply thresholds and human scoring protocol are in manifest.json.

Configuration: Responses streaming, store=false, tools=[], tool_choice=none,
parallel_tool_calls=false, reasoning effort high; temperature/topP/output-token limit
omitted as frozen provider defaults. Timeout 90,000 ms; response bound 1,048,576 bytes;
final reply/verdict bound 4,096 bytes. Input/token upper bounds include complete
model request, prompt and schema. No truncation. Provider-reported model/version,
usage and cost are retained where exposed; no immutable model snapshot is invented.

## Codex route and current authority boundary

The initial CLI-only BLOCKED interpretation was corrected after owner clarified
using Codex as one model. Prior PR387 documents an ACCESS_OK diagnostic, not A2/A3 evidence.
The installed CLI login was read back without reading/copying auth.json or tokens.
A narrow loopback relay uses that login, replaces the CLI agent body with the exact
frozen inference request, and forwards at most one request to the official Codex
service endpoint. CLI retries/continuations are rejected locally; the first upstream
401/429/5xx/timeout remains that attempt's fail-closed outcome. No hidden provider retry.
Credentials are transient transport headers; never retained in request/evidence files.
This is candidate-only infrastructure; no production entrypoint imports the seam.

Official [model docs](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[configuration](https://learn.chatgpt.com/docs/config-file/config-reference) and
[authentication](https://learn.chatgpt.com/docs/auth) were checked before API implementation.
Official [Codex provider source](https://github.com/openai/codex/blob/823ea830c0fd418b09ff02d36cad9a1fff66465b/codex-rs/model-provider-info/src/lib.rs)
identifies the ChatGPT-authenticated endpoint and custom-provider auth/retry fields.
Installed CLI behavior was independently exercised against a local upstream stub.
Built-in openai retry overrides reject; this does not block the bounded relay.

## Safety, denominator and contamination firewall

A2 frozen corpus: 34 cases = 28 unsafe + 6 safe. Registered population = 102 attempts
(84 unsafe + 18 safe). Seven seeds; two paraphrases per each of five semantic
families; injections, fake refs, context crowding/oversize, replay and mixed clauses.
The undeclared seed carries the old mechanical declaration input as code-only
scenario data; the existing authority helper rejects it. The stale seed retains
its authored text and expired context. No phrase-specific production rule was added.
Every hard-precheck survivor, including nonprotected controls, invokes the verifier.

Executed denominator: 0; observed unsafe send-eligible false PASS count: not evaluated. No empty-population safety claim.

Provider generation count = 0 before source seal; latency/error/token/cost/outcome rates not measured yet.

Mock transport tests capture the actual forwarded body, proving it equals the
runtime projection and excludes evaluator labels, CLI tools and CLI context. The
installed CLI-to-relay test forwards to a local stub only; it is not a model result.
Real-run per-attempt requestBody retains the exact upstream body for validation
against frozen runtime inputs. Evaluator-only caseId/split/family/expected/required/
forbidden/rubric data stay outside requests. Request/hash/snapshot/state/fact binding
is code-owned; verdict cannot grant business authority.

Terminal map: PASS -> final deterministic gate; FAIL/UNCERTAIN/malformed/timeout/
provider error -> C3_A_NONPROTECTED_V1; stale -> HANDOFF; privacy/permission/recipient
-> NO_SEND. Handoff/no-send have no customer-visible text in this experiment.
Static fallback: “Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.”
SHA-256: `9addecd5d2d9b2b33c215810a4221bd592fc120c388461c5a33ff438deec03c8`.
Only this exact code-owned fallback identity can be used unverified; protected
model fallback text is rejected. Post-effect recovery is a compatibility type only.

A3 corpus: concern 3, partial evidence 3, correction/referent/defer 4, conditional
policy 3, simple controls 3; planned 48 conversation generations. Candidate ownership
surface is exact final customer-visible text + telemetry only. Whole-reply results,
human scores and conversation operational evidence: not evaluated.
Safe handoff is not automatically a quality pass. Human protocol scores all actual
terminal outcomes on all ten frozen dimensions, blind to verifier result; no third online role.

## Commands actually run

- git fetch origin main / git rev-parse origin/main: PASS, base above; isolated implementation worktree created.
- pnpm install --frozen-lockfile: PASS; lockfile unchanged.
- node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs: initial missing-module RED; owner/config and whole-request-bound RED observed; final 8/8 GREEN.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs: FROZEN_PROTOCOL_VALID, exit 0.
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts: missing-module RED then 29/30 (recipient change); final 30/30 GREEN.
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts: 21/21 PASS.
- node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs: missing-module RED; 9 deterministic adapter tests GREEN; installed CLI test also GREEN with C3_TEST_CODEX_TRANSPORT=1 (10/10, no skip).
- node --test apps/worker/evals/single-agent-semantic-verifier/run-a2.test.mjs: missing-module RED; 5/5 GREEN.
- With C3_TEST_CODEX_TRANSPORT=1, combined protocol/adapter/A2-runner Node tests: 23/23 PASS.
- pnpm --filter @lana/worker exec vitest run src/vertex.test.ts: prior 34/34 PASS; not selected adapter evidence.
- pnpm --filter @lana/worker typecheck: PASS; pnpm --filter @lana/worker build: PASS; pnpm --filter @lana/worker lint: PASS.
- codex version/login/features/help, app-server schema generation and configuration-only probes: inspected without provider generation; built-in override probe exit 1 as documented.
- Source import search: boundary imported only by its focused test (evaluation runner uses built dist).
- A2 source seal/preflight/run/validation: pending; no claim of execution.

## Complexity, failures and disposition

No shared package source changes, dependency drift, production wiring, semantic
router/parser, third online role, repair/reverify loop, template growth, tool/state/
mutation/promotion work, deployment or customer send. Added isolated verdict/final
gate mechanics and one narrow transport relay to own the concrete one-request/no-tool
boundary; corpus/runner/evidence validation stay offline. Semantic roles at execution:
one sole conversational owner (A3 only) and at most one verdict-only verifier.

Actual RED failures and the initial CLI-only assumption are retained above. Provider
immutable snapshot identity/cost may be unavailable; record unknown rather than simulate.
Continue only through Checkpoint A; A3 requires A2 PASS. Final owner GO/STOP/BLOCKED remains pending.
Post-A implementation always requires a new plan and owner approval.
