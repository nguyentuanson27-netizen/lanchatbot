# Phase B integration audit and completion

Owner asks to inspect disconnected rules/capabilities, track them under B, connect them and review the result. Audit source: `814ef9872ec511cd8060c831c73d2bcae66d8a94`; refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Continue on the existing B implementation branch/PR391. This supersedes earlier source-only pauses for the work below, not historical results or deployment restrictions.

## Coverage and work

| Boundary | Observed at audit source | Action in this change |
| --- | --- | --- |
| Shop rules, public offer, policy identity/current pointer | Connected through source resolver and public projection | Retain existing contract; regression tests |
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
