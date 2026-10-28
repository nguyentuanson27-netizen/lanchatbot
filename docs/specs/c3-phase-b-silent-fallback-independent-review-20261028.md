# Independent review — silent fallback, 2026-10-28

**Verdict: REVISE — 1 P1, 2 P2.**

Exact reviewed HEAD: `e836de67e0be0b59bbd046f9b5d2cc1002bd2035`.
Reviewer: separate agent `/root/silent_fallback_independent_review`, read-only source review and synthetic offline verification. No model generation, network, PostgreSQL or code changes during review.

## P1 — private fallback bypasses silent recovery

Location: [single-agent-commerce-ingress.ts:154](../../apps/worker/src/single-agent-commerce-ingress.ts#L154).

Customer attachments outside the supported receipt step, or an incomplete private checkout path, call ordinary `invoke(request_handoff)` instead of the new silent recovery method. With a valid DEPENDENCY_FAILURE holding rule, the independent synthetic repro observed HANDOFF, text “Shop kiểm tra rồi báo chị nhé.”, enqueued=1, one TEXT intent.

The latest frozen campaign uses a silent matrix and does not expose this case. The candidate API still accepts the older holding policy, so the owner requirement is not enforced across all fallback entrypoints.

Required fix: route private failure through silent recovery, retaining reason, source-message linkage and transaction/tag authority. Assert no text, image or metaPlan with a valid holding policy.

## P2 — definite no-commit NO_SEND leaves Inbox unfinished

Location: [single-agent-commerce-ingress.ts:221](../../apps/worker/src/single-agent-commerce-ingress.ts#L221).

Published matrix containing only EXCHANGE, owner HTTP429: dependency recovery is blocked before transaction. Repro observes NO_SEND/FALLBACK_HANDOFF_UNPROVED, handoff BLOCKED, commitCalls=0, completeBatchCalls=0. Repeating the same batch yields ownerCalls=2.

A PROCESSING Inbox lease can be reclaimed after expiry: [realtime-inbox.ts:468](../../packages/database/src/realtime-inbox.ts#L468). This permits a new generation on the same input after a supposedly terminal no-send.

Required fix: distinguish committed, definitely uncommitted and unknown outcomes. Complete a definite no-commit terminal with a current-generation guard or equivalent. Do not blindly complete unknown-commit batches; preserve reconciliation requirements.

## P2 — current integration acceptance expects obsolete holding output

Location: [isolated-integration.mjs:460](../../apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs#L460).

Current “B composed recovery accounting” expects capture=[holding] for committed and commit-response-lost. New policy deliberately produces []. The current default COD/BANK_TRANSFER acceptance commands still exercise this consumer; it imports current dist and is not historical frozen evidence.

Required fix: update affected current integration assertions to silent output while retaining ownership/event/tag, Inbox completion and uncertainty checks. Leave historical raw evidence unchanged.

## Independent verification actually performed

`pnpm exec vitest run apps/worker/src/single-agent-commerce-silent-fallback.test.ts apps/worker/src/single-agent-commerce-ingress.test.ts apps/worker/src/single-agent-commerce-read-only.test.ts apps/worker/src/single-agent-commerce-handoff.test.ts --reporter=dot`

**189/189 PASS.**

Two synthetic repros executed via `node --input-type=module -`, with in-memory transpiled fixture and current dist; no repository mutation, provider, network or PostgreSQL. Reviewer also inspected full diff, recovery/persistence paths, Inbox lease contract and current full acceptance consumer.

Passing focused tests do not cover the two reproduced gaps above. Absence of a fresh model/PostgreSQL run is not itself a finding in this scoped code review.

This record does not mark B GO or implementation APPROVE. It records findings only; no fixes or fresh model campaign have been performed in this review task.

