# C3 Semantic-Verifier Checkpoint A — BLOCKED before T1 freeze

Date: 2026-10-05 (Asia/Saigon). Scope: Checkpoint A only.

Recommendation: **BLOCKED**. This is an intake/blocker record, not completed
implementation or provider-backed evidence. Owner GO/STOP/BLOCKED decision remains
pending. The owner's implementation request authorizes this experiment; historical
"draft / plan only" document headers are not a separate approval blocker.

## Source provenance

- `implementationBaseSha`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, obtained by
  refreshing `origin/main`, then creating
  `feat/c3-semantic-verifier-checkpoint-a-20261005` from that exact revision.
- Approved source references: `docs/specs/c3-single-agent-commerce-architecture-20261004.md`,
  `docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md`, and `tasks/plan.md`
  as present at `implementationBaseSha`.
- Amendment spec commit: `2336826244b85eae92f12f310a9da8f1d5da23d6` (PR388 merge).
- Parent spec last-change commit: `c4bd59857a560689ce0b10758a4927f6401b0c27`.
- Plan commit: `296cdcfbf5759f5bf9cbb24acf3dc63005589361` (PR389 merge).
- PR387 evidence only: `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da`.
  Read its `apps/worker/evals/single-agent-feasibility/egress-attempts.json`:
  exactly seven authored attacks. No PR387 runtime seam imported or rebased.
- `a2RunSourceSha`: not sealed; no executable A2 runner exists.
- `a3RunSourceSha`: not sealed; A3 has not run.

SHA-256 of the source files actually read (local checkout bytes):

| Source | SHA-256 |
|---|---|
| Parent spec | `19101994b0232f4a0894ebf986f70583e9ddaa5ac53cbcf6d7b7f67f24b05875` |
| Amendment spec | `7d39d55119ae175448d3926b40d1da0e8e7a960e48268f0c890f112085f4e035` |
| Plan | `c6913e1d0a63687bf8e273e8774143945285fb33200aaf31dcc4107585f305f7` |

Git blob identities, which avoid checkout newline differences, respectively:
`419cad5eb5b5596d57c34753b3d91cb13f0d8d24`,
`ca5bc8e3eec8ae5b1764d58a49010db1e474a7c3`,
`ac3b992757fe42b73878d1b837e081d06fa2d6b7`.

## Blocking owner decisions and access

The amendment's section 22 leaves provider/model/effort, repetitions and numeric
usability thresholds open. Neither the current plan nor TODO approves exact
Checkpoint-A provider identities. Prior C3 model choices are historical evidence,
not authorization to reuse them for these roles.

Required before T1 can be completed:

1. Exact provider/model/version/effort for verifier A2/A3 and conversation A3.
2. Registered repetitions and the numeric safe-A2/all-A3 terminal usability
   threshold; any owner-required operational ceiling.
3. Available, authorized evaluation credential/config route for the chosen path.
4. Frozen prompts/schema/config, bounds/binding, complete corpora, terminal
   disposition/fallback identities and whole-reply scoring protocol.

Repository paths inspected:

- `apps/worker/src/vertex.ts`: existing Vertex AI generation, service-account
  OAuth/token acquisition, timeout, structured-output, modelVersion/token/latency
  capture. Existing generation methods can retry on 401; judge methods also
  retry. They cannot be reused unchanged for Checkpoint A's one-request limit.
- `apps/worker/src/vertex-baseline.ts`: baseline capability separation.
- `apps/worker/src/phase4-server.ts`: configured Vertex credential-file path.
- `.env.example`: `gemini-3.5-flash-lite` example; existing offline judge source
  references `gemini-3.6-flash`. Neither is an approved Checkpoint-A choice.
- No tracked GPT-6.1 generation adapter was found by the targeted source search;
  the parent spec's GPT-6.1 Sol/low record does not establish an available adapter.

No `VERTEX_*`, `GOOGLE_APPLICATION_*` or `OPENAI_*` environment variable was
present in this execution session. This is **not** proof that credentials are
unavailable elsewhere. No credential file was read, no token acquired, and no
provider request sent. Current official provider API documentation review is
pending provider selection; no provider API implementation has been written.

## Evidence status and denominators

| Required evidence | Actual status |
|---|---|
| Protocol/prompt/schema/corpus hashes | Not frozen; source-document hashes above are not protocol hashes |
| A2 unsafe/safe population | Not registered; seven historical attacks inspected only |
| A2 complete attempt denominator | 0 attempts executed; not a completed population |
| Unsafe send-eligible false PASS | Not evaluated; no zero-observed safety claim |
| Provider generation requests | 0; no adapter request-count proof yet |
| Evaluator-label firewall | Not implemented/tested; no captured model requests |
| Terminal dispositions / fallback IDs, texts, hashes | Not frozen |
| A3 family counts | Not registered; plan requires concern >=3, partial >=3, correction/referent/defer >=4, policy >=3, simple 2–4 |
| A3 whole-reply results / denominator | Not evaluated / 0 executed |
| Fallback/handoff/no-send rate | Not measured; no terminal attempts |
| Verifier p50/p95 / added latency | Not measured |
| Provider timeout/error rate | Not measured |
| Input/output tokens / exposed cost | Not measured |
| Deterministic readiness | Not reached; T1 has not been frozen |

T2 depends on completed T1; T3 depends on deterministic readiness; T4 requires
A2 PASS. None of those dependencies is satisfied. No results were simulated and
no model was substituted.

## Verification actually performed

Executed from the repository worktree:

- `git fetch origin main` (from the existing repository): exit 0.
- `git rev-parse origin/main`: exact `implementationBaseSha` above.
- `git worktree add -b feat/c3-semantic-verifier-checkpoint-a-20261005 '../lanchatbot-c3-semantic-verifier-checkpoint-a-20261005' origin/main`: exit 0.
- `git status --short`: new implementation worktree initially clean.
- Read required specs, plan, TODO, root instructions/README, operating mode,
  historical baseline, model-evaluation boundary and project ops `SKILL.md`.
- `git log -1 --format='%H %s' -- <source-file>` and `git hash-object <source-files>`:
  provenance recorded above.
- `Get-FileHash -Algorithm SHA256 <source-files>`: hashes recorded above.
- `git show 1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da:apps/worker/evals/single-agent-feasibility/egress-attempts.json`:
  historical evidence read; parsed attack count 7.
- Targeted `rg` source searches and environment-variable **names-only** check:
  provider findings above. Two initial wildcard/path searches returned missing-path
  diagnostics; subsequent searches used existing directories. Those diagnostics
  are not verification failures of implemented code.
- `node --version`: `v24.19.0`; `pnpm --version`: `10.12.4`.
- Documentation readback: parsed PR387 attack count = 7; recomputed the three
  SHA-256 hashes and asserted each appears in this report (PASS).
- `git diff --check`: initially caught trailing whitespace in the edited TODO
  status line; corrected before committing.
- `git diff --cached --check`: exit 0 after correction; only this report and
  `tasks/todo.md` are staged (139 added report lines; 14 added / 4 removed TODO lines).

**Not run:** focused protocol/boundary tests, existing protected-claims/reply-assembler
tests, provider adapter tests, worker typecheck/build/lint, provider preflight,
A2/A3 execution or evidence validation. No implementation test is claimed PASS.
Protocol/boundary/runner files do not yet exist. Full required checks remain
mandatory when implementation resumes.

## Structural delta and recommendation

Two documentation files changed: this blocker record and `tasks/todo.md`.
Runtime code, dependencies, public contracts and executable configuration delta:
zero. Semantic roles/layers added: zero. No production wiring, state/tool/effect
work, repair loop, parser, templates, promotion, deployment or live send.

Recommendation: **BLOCKED pending the owner decisions and evaluation access
above**. Resume at T1 on this branch after they are resolved. Do not treat this PR
as completed Checkpoint A implementation, deterministic readiness, A2 PASS,
A3 feasibility or permission to proceed beyond Checkpoint A.
