# Phase B integration audit and completion

## Current delivered result — final candidate source5b70fe87

[Current implementation/evidence report](../../apps/worker/evals/single-agent-commerce-read-only/stateful-completion-20261015/CHECKPOINT_B.md) supersedes the deferred feature status below. Native cart variants/multiple mutations, candidate persisted executor/Inbox/history/private checkout/handoff/Outbox composition, real source alias binding and profile CAS receipts are implemented. Final composed real-PostgreSQL COD/bank11/11groups eachPASS/dropped; full worker1752PASS. Compatibility0035 only fixes two existing event command values, applied in disposable databases only.

Two bounded stateful provider batches remain separate: latest source0ad4b29d creates/changes the real-source cart, returns the current quote and persists corrected measurements; actual terminals3eligible/1fallback/2handoff/1no-send. Final receipt/error-logging closure is later code and has not been rerun with either model. Sales quality/current-source private checkout/live delivery are not qualified; recommendationSTOP, no Phase C or activation. Earlier observations below retain their original scope and source, not current unsupported-feature claims.

## Follow-through authorized by owner — 2026-10-15

The owner asks to finish the remaining B work, rather than leave it tracked. Continue from clean `c5f053a0920f3144835953fa69c7cb889af683f2` on PR391. Finish persisted variant replacement, serialized mutations within one bounded owner turn, stateful provider journeys, and candidate ingress/history/delivery composition. Keep the candidate send-disabled and exercise delivery only with a capture transport and disposable test database. No production activation, live customer writes, deploy, or Phase C follows.

Reuse the existing typed cart evidence/replay, current Inbox lease, conversation/profile CAS and Outbox. Intermediate effects retain the source lease; final terminal commit completes it. Every write still checks the current source and revision, and partial effects remain receipt-backed. Extend the current typed contract for variants and native permission; do not add text matching, a new store, or a parallel readiness system. Observe focused RED before implementation, run affected package checks, and self-review before sealing source for a bounded provider batch. Preserve all provider attempts and distinguish engineering completion from observed sales quality.

The current real-database tests also exposed a missing schema connection: migration0017 rejects the runtime's already-existing clarification commands. Compatibility migration0035 only adds those two values to the existing event CHECK. Its down path restores the exact prior constraint before new events exist and refuses destructive rollback afterward. This justified correction supersedes the earlier no-migration assumption; apply/test only in disposable databases. No serving-schema or role/table/data change is performed.

Owner asks to inspect disconnected rules/capabilities, track them under B, connect them and review the result. Audit source: `814ef9872ec511cd8060c831c73d2bcae66d8a94`; refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Continue on the existing B implementation branch/PR391. This supersedes earlier source-only pauses for the work below, not historical results or deployment restrictions.

## Coverage and work

| Boundary | Observed at audit source | Action in this change |
| --- | --- | --- |
| Shop rules, public offer, policy identity/current pointer | Connected through source resolver and public projection | Retain existing contract; regression tests |
| Public payment methods | SHOP_POLICY contains allowed methods, but read_policy omits them | Connected from the same source; account/QR/private checkout stay code-only |
| Product search, approved attributes/content, offer/variant price and stock | Connected to Qdrant/Redis with independent freshness | Retain existing contract |
| Delivery ETA | Catalog resolver exists; native product read always passes null region and drops ETA | Connect bounded region input to existing resolver/claim builder |
| Accepted customer measurements/preferences and size | Separate B2 decorator with CAS and dependency ordering | Compose with read/effect tools; test the entire turn across instances |
| Quotes, shipping and offers | Existing policy arithmetic connected through B2 port | Retain current code-owned inputs and current readback |
| Handoff policy | Resolver can load optional HANDOFF_MATRIX; candidate never consumes it | Select validated matrix rule or existing code default; never accept model-authored tag/message/identity |
| Handoff effect | Terminal HANDOFF is only a disposition | Connect reason request and terminal recovery to existing ownership/CAS/inbox transaction, tag intent and event; receipt/current readback before acknowledgement |
| Cart mutation/confirmation and recovery | B3 adapter exists independently of B2; persisted executor is caller-supplied | Provide one explicit candidate composition; retain atomic executor/receipt and private-checkout requirements |
| Committed checkout handoff | Domain executor can commit HANDED_OFF, but native adapter treats it as an ordinary rejection | Propagate the actual committed handoff and stop subsequent model/effect work |
| Private checkout/payment | Existing core owns PII, preview, revalidation, payment policy and message group | Keep code ports; no PII/payment instruction copied to owner/verifier |
| Persisted component-variant replacement | Existing readiness contract does not authorize this operation; candidate declarations omit it | Remains unavailable and explicitly tracked; do not bypass readiness using raw CAS |
| Negotiation/concessions, arbitrary media, live history/ingress/send | Outside the selected B1–B3 tool contract or deliberately not activated | Track separately; do not advertise absent tools or activate production |

## Implementation order and evidence

1. Observe failing tests for current-source ETA and disconnected handoff behavior. Implement the smallest adapters using existing contracts, tables and transaction owner.
2. Compose the existing B1/B2/B3 adapters with explicit capabilities; code decides which tool declarations are available. Handoff stops the turn after committed readback. No new semantic router, regex, role, reply rewrite or retry loop.
3. Run focused contract/consumer tests, full worker tests and worker typecheck/build/lint. Run shared-package checks only if shared source changes. Self-review the full diff for authority/privacy/CAS/receipt/regressions, fix findings and record commands/results here.

Provider reruns and live effect delivery are not part of this request. Existing source-backed/provider results remain immutable. Real-database tests use only the existing isolated disposable-database harness and synthetic customer input; report new coverage separately from historical runs.

## Remaining qualification

Full stateful provider journeys, sales quality, real delivery, production wiring and Phase C qualification stay open. A connection proved by deterministic or database tests is not model-quality acceptance. No merge/deploy/live send follows from this change.

## Implemented paths and review

- `single-agent-commerce.ts` composes the current read/state/effect/handoff ports. It advertises only actual capabilities; B1 remains read-only without those write ports. The native declaration set follows that bounded capability list.
- `single-agent-commerce-handoff.ts` accepts only a reason proposal, chooses a validated matrix rule or the existing defaults, and binds acceptance to committed ownership/current policy/readback. A matrix with no matching rule or incompatible message/tag is unavailable, not silently replaced. The caller supplies the existing lease fence; the candidate does not issue one.
- `createPersistedCommerceHandoffPort` reuses the inbox/revision transaction for ownership, event/case and tag intent. Missing tag/link/event rolls the transaction back. A queued tag intent is not evidence of delivered Pancake notification.
- The existing final gate receives current handoff authority. A previous HUMAN owner prevents model work; a changed revision/fence/recipient/privacy invalidates old send eligibility. Committed checkout handoff ends the turn, without another generation or effect replay.
- `read_product.deliveryRegion` uses the existing ETA resolver/claim builder. A bounded source literal binds the day counts to the verified source region/claim, and ETA expiry respects the fulfillment-policy expiry. This reuses the existing trusted-context structure.
- `read_policy` now includes the source's allowed payment methods. Private bank details and checkout fields remain outside both model projections.

Self-review reproduced and corrected: volatile resolver fetch time being mistaken for changed policy; a new revision/scope missing from handoff-only final readback; recovery replacing privacy NO_SEND; a bridge dropping transferToHuman from an actual executor result; and a synthesized handoff fence. Each change has observed RED followed by focused GREEN. ETA region metadata was added because a shared ETA claim contains only day counts and otherwise loses destination context.

The existing persistence transaction completes its inbox lease with one atomic transition. Multiple persisted mutations in one model turn, or another ownership write after that lease is consumed, are not advertised as an atomic batch/reliable live recovery workflow. Keep that compatibility limit in B until an existing ingress composition can supply the appropriate atomic plan; do not bypass the source lease or introduce a new operation store. Current tests prove individual transitions, duplicate/reconciliation handling and controlled handoff transactions.

This change adds two candidate adapter modules, no shared package/schema/table, no online semantic role and no new semantic gate. Existing verifier/final-gate, profile CAS, cart engine and transaction owners are reused. No owner/verifier prompt or historical corpus/result is changed. Full provider stateful journeys, naturalness and the appropriateness of a model-proposed handoff remain unmeasured in this change.

Actual commands, source identities, failures, database cleanup and remaining B items are recorded in the [integration-audit evidence report](../../apps/worker/evals/single-agent-commerce-read-only/integration-audit-20261015/CHECKPOINT_B.md). Earlier B1 STOP and OWNER_BYPASS remain unchanged.
