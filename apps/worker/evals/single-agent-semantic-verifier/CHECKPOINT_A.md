# C3 Semantic-Verifier Checkpoint A — BLOCKED at partial T1

Date: 2026-10-05 (Asia/Saigon). Scope: Checkpoint A only.
Recommendation: **BLOCKED**; owner checkpoint decision pending.

Owner selected **GPT-6.1 Sol / high for both roles** and **3 repetitions**.
This supersedes the initial model-selection blocker. Provider transport/credential
route, generation configuration and numeric terminal usability threshold remain
unresolved. T1 is a draft; T2–T4 have not started. No provider generation occurred.

## Provenance

- `implementationBaseSha`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
  Refreshed main again after owner model selection; it remains this SHA.
- Branch: `feat/c3-semantic-verifier-checkpoint-a-20261005`.
- Spec SHA: amendment PR388 merge `2336826244b85eae92f12f310a9da8f1d5da23d6`.
- Parent spec last-change SHA: `c4bd59857a560689ce0b10758a4927f6401b0c27`.
- Plan SHA: `296cdcfbf5759f5bf9cbb24acf3dc63005589361` (PR389).
- Historical PR387 evidence: `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da`.
  Its seven exact authored segment objects, source IDs and original final assembly
  results are retained as evaluator-only seed provenance. No runtime source imported.
- `a2RunSourceSha`: not sealed; no executable A2 runner.
- `a3RunSourceSha`: not sealed; A3 has not run.

Source Git blobs: parent spec `419cad5eb5b5596d57c34753b3d91cb13f0d8d24`,
amendment `ca5bc8e3eec8ae5b1764d58a49010db1e474a7c3`,
plan `ac3b992757fe42b73878d1b837e081d06fa2d6b7`.

Current draft SHA-256 identities (not a completed protocol freeze):

| Artifact | SHA-256 |
|---|---|
| Manifest | `3e7f33cd8d2ba3416006c2e719f06a5cff0f26718ba7164b154a013f98644aa1` |
| A2 corpus | `035a19d9eb9d48256587d0122840f5199f92004c5654ed96d651051aa073df4a` |
| A3 corpus | `50032c95052504b8508bd8f7172667ad24b3eb9562bd68451e29e1046c035fa5` |

Draft prompt/schema hashes are in `manifest.json`; no provider result has been
observed against them. No hash is claimed as a completed qualification identity.

## Exact model/config and remaining access boundary

Both descriptors: provider `OPENAI`, model/version selection `gpt-6.1-sol`, effort
`high`. Credential route and generation config are explicitly null, so full
protocol validation and preflight reject. No different model may be substituted.
Both roles use the same model family; no independent-defense claim is made.

Official [model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
was fetched; it supports `high` and identifies the model using `gpt-6.1-sol`.
A provider-returned version/request identity has not been observed. Also fetched
[structured-output guidance](https://developers.openai.com/api/docs/guides/structured-outputs),
[Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference),
and [authentication guidance](https://learn.chatgpt.com/docs/auth).

Local `codex-cli 0.159.2` is logged in using ChatGPT. This corrects the initial
assumption that only Vertex might be accessible. The model cache contains
`gpt-6.1-sol`. However, no candidate CLI adapter currently proves actual generation
request count, exact provider-returned version and absence of tool capability.
Default HTTP/SSE retries exist; documented settings alone are not accounting
evidence. No CLI generation was run to bypass the freeze/readiness requirement.

`OPENAI_API_KEY` is absent from this process. No credential file/token was read,
copied or exposed; no undocumented ChatGPT backend was used as an API substitute.
Existing Vertex paths remain available in source but are not the selected model.

Owner clarification requested: numeric usability threshold (10% proposed, not
owner-confirmed) and the authorized route. Three repetitions is not a usability
percentage or credential route. Changes after results require a new frozen run;
the current experiment cannot be adjusted retroactively.

## T1 draft evidence and denominators

- A2: 34 draft cases = 28 unsafe + 6 safe, including seven PR387 seeds, two
  paraphrases per semantic family, injection/fake-ref/context/replay/mixed cases.
- Planned A2 population at 3 repetitions: 102 attempts (84 unsafe + 18 safe).
  **Executed denominator: 0.** Population is not yet registered/frozen.
- A3: 16 draft cases = concern 3, partial evidence 3, correction/referent/defer 4,
  conditional policy 3, simple controls 3. Every case has required/forbidden
  outcomes outside runtime projection. Planned 48 conversation generations;
  **executed denominator: 0**. A3 is prohibited until A2 PASS.
- Unsafe send-eligible false PASS: **not evaluated**. No zero-observed safety
  claim is made from an empty executed population.
- Provider generation requests: 0. Request-count adapter proof is still missing.
- Firewall: two request envelopes captured by a mock provider prove evaluator
  fields/sentinel values and unallowlisted private state are excluded. This is
  deterministic projection evidence, not captured real-provider evidence.
- Request/draft/snapshot projection binding and size bounds have draft tests.
  They do not prove the T2 final deterministic gate.

Draft terminal map: PASS -> final gate; FAIL/UNCERTAIN/malformed/timeout/provider
error -> `C3_A_NONPROTECTED_V1`; stale -> handoff; permission/recipient/privacy ->
no-send. Proposed static fallback:

> Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.

Exact fallback hash is in the draft manifest. Terminal behavior is not implemented
or frozen. Post-effect recovery has not been implemented.

Whole-reply quality, fallback/handoff/no-send rate, verifier p50/p95, added latency,
timeout/error rate, tokens and provider-exposed cost: **not measured**. Human
scoring rubric is a draft; no terminal outcomes or human scores exist.

Before freeze, resolve how the new envelope handles the first/stale PR387 seeds,
whose historical final assembled reply was empty although authored segments were
present. Code scenarios define replay binding overrides; no runner executes them
yet. These are explicit remaining T1 issues, not evidence of completed coverage.

## Commands actually run and outcomes

From this worktree, unless noted:

| Command | Observed result |
|---|---|
| `git fetch origin main` / `git rev-parse origin/main` | PASS; SHA above, including refresh after model choice |
| `git worktree add -b feat/c3-semantic-verifier-checkpoint-a-20261005 '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005' origin/main` (initial repo) | PASS |
| `codex --version` / `codex login status` / `codex exec --help` / `codex features list` | Read-only capability inspection; no generation |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged |
| `node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs` | RED observed first: missing module, exit 1; then 8/8 GREEN, exit 0 |
| `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --draft` | PASS; 28 unsafe / 6 safe / 16 A3 draft cases |
| `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | Expected BLOCKED, exit 1: `NOT_FROZEN_ROUTE_OR_THRESHOLD` |
| `node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2` | Expected BLOCKED, exit 1: `NOT_FROZEN_ROUTE_OR_THRESHOLD` |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | PASS; 21/21 |
| `pnpm --filter @lana/worker exec vitest run src/vertex.test.ts` | PASS; 34/34 existing Vertex tests; not a GPT adapter qualification |
| `pnpm --filter @lana/worker typecheck` | PASS, exit 0 |
| `pnpm --filter @lana/worker build` | PASS, exit 0 |
| `pnpm --filter @lana/worker lint` | PASS, exit 0 |
| `git diff --cached --check` | PASS before draft savepoint |

Source reads/hashes used `git show`, `git log -1`, `git hash-object`, targeted `rg`
and `Get-FileHash -Algorithm SHA256`. Initial incorrect wildcard/source paths and
the first corpus-builder literal-key assumption were corrected. Failed attempts
produced no provider result. Official Responses reference retrieval was too large
and one authentication URL was 404; alternate official pages above were fetched.

Not run: T2 boundary tests (file does not exist), selected-provider adapter tests,
A2/A3 runner/evidence validation, actual provider generation or human scoring.
Deterministic readiness is not achieved merely because the existing worker checks
pass. Shared package source has not changed.

## Complexity and disposition

Added five evaluation files: two data corpora, draft manifest, projection/protocol
module and eight tests; updated this note and TODO. One evaluation request
projection crosses the trusted/untrusted boundary. No semantic interpretation in
code, framework, runtime dependency, durable state or production entrypoint change.
Online semantic roles added: 0 so far; planned maximum remains one conversational
owner and one verdict-only verifier. No parser, phrase-specific production rule,
repair/reverify loop, tool/state/mutation/promotion work, deploy or live send.

**BLOCKED at partial T1.** Resolve credential/transport accounting and numeric
usability threshold, finish and freeze T1, then implement T2 RED->GREEN. Only
deterministic readiness permits A2; only A2 PASS permits A3. Stop at Checkpoint A.
