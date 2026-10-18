# Implementation and actual verification

Status: S1/S3/S4 implemented; S2/S5 intentionally deferred until first eight diagnostic outcomes. No provider outcome claimed yet.

Observed RED:
- pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts:7PASS/2FAIL (normal southern destinations unresolved).
- node --test .../gemini-inference.test.mjs:32PASS/2FAIL (POS reason not hidden, unknown finish enum lost).
- candidate-description.test initially failed missing module (setup, not behavior RED); identity passthrough then observed assertion FAIL on unchanged description.
- Intermediate run caught local normalized-token underscore/hyphen mismatch and old assertions retaining POS reason; fixed without changing behavioral goal.

GREEN so far:
- catalog9PASS.
- node adapter/protocol/candidate-description45PASS.
- protected/reply/presentation/facts/size52PASS.
- Full worker:131Vitest files/1844PASS; Node499PASS/0FAIL/2optionalSKIP. Log c3-review93-worker-test.log. Final counts observed; original command exit output was lost during context truncation.
- Repeated final adapter/protocol/candidate checks after source/provenance edit:45PASS, exit0.
- Worker typecheck/build/lint:each exit0 observed. Repeated once because earlier completion outputs were lost; no failures seen in either set of logs.
- Current public source readback:exit0/SOURCE_ADAPTERS_READ_BACK; candidate original-description hash matches current SV2447;0generations. Exact prompt and tool declaration hashes match baseline.

Changes: southern administrative component lookup and existing resolver integration; bounded rawFinishReason telemetry without response free text; only POS source reason hidden from owner; eval-only description candidate through existing read/search ports, source-content hash and explicit candidate provenance. Both prompts/tool definitions still baseline for first8.

Limits: enum telemetry cannot reconstruct old UNKNOWN. Mapping only recognizes bounded administrative components, not arbitrary text. Source neutralization is an experiment, not a proven cause of naturalness. No new persisted state/DB schema/gate/model role.

Self-review: existing explicit/default shipping keys remain compatible; no hardcoded transit time; preorder prep remains independent. Candidate description applied to initial, exact lookup, MATCHED and AMBIGUOUS search documents. Bound source hash prevents silently replacing changed content; candidate source version explicitly distinguishes registry experiment from a published shop write. Only POS_SNAPSHOT_UNAVAILABLE hidden; other typed reasons/status retained. Owner/verifier prompts and tool definitions unchanged for diagnostic. No provider/API/config change, production wiring, schema migration, new gate or automatic retry.

