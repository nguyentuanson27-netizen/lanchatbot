# Preparation before model results

Intake `4fde4dab`; code savepoint `10276d541024e54d4ca927ed205d5d93975c08f0`. Main refreshed to `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Independent review accepted the narrow rollback, requiring precise source-selection verification and acknowledgement that NONE request/native integrity was already audited. No new runtime gate, role, parser, regex, case answer, state or framework.

## Observed RED to GREEN

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` observed **26 PASS / 2 FAIL** before code changes: the actual captured HTTP request and native offer response omitted current price/stock when the trusted header already contained them. The minimum correction removes four lines of dedup helper and its uses. Existing regression checks now require price/stock to remain beside their offer, with scoped facts, source status, original inputs and native identities preserved. Focused provider/protocol/comparison: **49 PASS**.

## Checks actually completed

- Full worker source: **130 files / 1,806 PASS**, using the existing bounded Windows fixture-junction wrapper; original tracked placeholder restored.
- Full worker Node eval: **491 PASS / 0 FAIL / 2 existing optional SKIP**, 493 registered tests.
- Existing protected-claims/reply-assembler: **21 PASS**.
- Worker build, `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`, worker lint: **exit0**.
- `git diff --check`: exit0 before the code savepoint.

Exact commands:

```text
git fetch origin main
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker build
pnpm --filter @lana/worker test:evals
& C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-worker-wrapper-20261017.ps1
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker lint
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-selection-20261017.mjs C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-selection-final-20261017.json
```

## Current source selection

Both complete selections returned **READY** on one source snapshot: AO/be/M×1 and AO/be/L×2, unit price499,000VND, selected stock0, **PRE_ORDER** under current source policy. Source observed `2026-10-17T03:34:03.456Z`, hash `171293d10507828c6c592b1f37843595de1e2e6e60c8ae1bcf49f886284a0ede`. Read-only, no provider generation/write. This does not establish why an older snapshot returned ambiguous or guarantee later live snapshots stay identical. The first temporary probe passed a non-UUID lineId and failed local schema validation after reading the snapshot; corrected to valid synthetic UUIDs before the successful probe. It was not a source outage or a provider retry.

Domain checkout controls are not rerun for an eval-serializer-only change; prior controlled COD24/24 evidence remains bound to its historical source, not this run. Bank, B1 advice generation, A2/A3, remote CI and full-repo pnpm check are not run or claimed PASS.

Offline compatibility (`node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-offline-20261017.mjs`): **60 prior captured inputs** reconstituted under the old action-contract serializer and the corrected serializer; serialized fields, current trusted views and native model parts remain equal. No fact arrays are removed. Max31,352/32,768bytes; the controlled long-signature variation still measures35,905bytes and rejects before dispatch, not an exact reproduction of the uncaptured failed wire. Zero provider generations.

Freeze/preflight evidence will be recorded before collection. Long signatures can still exceed32,768bytes; do not cut them or enlarge the bound. Missing authoritative destination-region mapping remains a checkout limit. Provider results: **NOT_RUN** at this preparation savepoint.

Credential/source access reuses the owner-approved [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md), existing source session and temporary serving-credential launcher. No secrets/private checkout data enter model requests or committed evidence. No new provider API feature is implemented; current official Google function-calling/NONE and thought-signature documentation was checked in the preceding reviewed change on2026-10-17.
