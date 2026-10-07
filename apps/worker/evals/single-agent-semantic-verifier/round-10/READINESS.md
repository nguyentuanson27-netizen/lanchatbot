# Round10 deterministic readiness

implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361 after git fetch origin main exit0 and exact rev-parse. spec/plan/review source f1e504c34fdbaaf056786c71ac33e9f720643b84; T1freeze savepoint4857a9fe. Reuse authorized branch/draftPR390. Frozen66A2 (48UNSAFE/18SAFE),24A3 (5concern/5partial/5correction/6policy/3simple); all drafts/labels/history/evaluator contracts unchanged from Round9. Only v2 prompts and non-seed authored policy context/source change, exact7PR387 seeds retained. Synthetic data, no real-shop readiness.

Actual commands:
- git fetch origin main; git rev-parse origin/main: exit0/base above.
- node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round10.mjs: exit0, frozen inputs prepared without generation.
- C3_CHECKPOINT_A_ROUND=10; node --test apps/worker/evals/single-agent-semantic-verifier/round-10.test.mjs: observed RED exit1/0PASS1FAIL UNKNOWN_CHECKPOINT_ROUND; minimum explicit selector support GREEN exit0/3PASS.
- C3_TEST_CODEX_TRANSPORT=1; node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs: exit0/85PASS/zero skips. Protocol, adapters, captured label firewall, mandatory verifier/final gate. Codex installed-client test uses local upstream stub, not real provider.
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts: exit0/77PASS (43boundary/34Vertex).
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts: exit0/21PASS.
- pnpm --filter @lana/worker build: exit0.
- pnpm --filter @lana/worker typecheck: exit0.
- pnpm --filter @lana/worker lint: exit0.
- node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs: exit0/FROZEN_PROTOCOL_VALID.
- git diff --check: exit0.

Build/typecheck dependency hooks ran; no shared-source edits. No API implementation change, reuse frozen documented adapters/config with one request/registered role slot, no retry/continuation/repair. Credential inspection with existing local route: Codex0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a; Gemini credential available/global/HIGH/node24.19.0/helperfb2054f3b82da64be777ba6b3accde769000864e7c8fa7a8346db973f79390fe. Initial inspection lacked process-local credential-path variable and failed before any auth/generation; supplied existing path and succeeded, no secrets recorded. Ancillary rg failed on PowerShell brace/glob syntax; corrected targeted searches. A documentation patch first failed matching a nonexistent heading before any mutation. Local checks are not semantic quality evidence.

Complexity delta: protocol +7/-7lines for explicit round10 support; one focused57line test, reused seam/adapters unchanged. No production entrypoint/shared package/code authority change, new role/layer/parser/router/templates/generic framework/recovery/repair. Both role request bodies checked for24histories with4096-byte verifier placeholder,32,768-byte bound; no evaluator labels/references. Existing protection and final-gate tests reused.

Known raw legacy aggregate limitations: unexecuted safe slots may count as safeFailures after early stop; not observed rejects or measured safe usability. terminalFailureRate with unexecuted denominator is not an observed-terminal rate. Gemini usage uses different keys: report raw records separately; no zero-token or missing-cost claim. Whole-terminal offline review by primary agent is not independent/human/owner acceptance.

Commit complete source/config/frozen inputs and clean tree before runtime source capture/preflight. Do not insert runtime SHA into frozen source. Unsafe send-eligible PASS => A2FAIL/STOP; only A2PASS enables sealed A3. No post-A/deploy/live send.
