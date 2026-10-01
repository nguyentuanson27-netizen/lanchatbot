# Track C C3 clean strategy-contract plan

Design source: PR #369 (`docs/specs/track-c-c3-strategy-contract.md`).
Architectural reference: `b755218f69d07afb96330012d9298d81659c832`.

## Keep

- Two explicit lanes: trusted `FIRST_CONTACT_FIXED` and `ADAPTIVE_FOLLOWUP`.
- Minimal Strategist decision: `replyAct`, `goal`, `proposition`,
  `evidenceRefs`, `continuation`, and `canonicalAction`.
- Code-owned acquisition, canonical-action permissions, checkout fields,
  evidence scope/freshness/product binding, PII/effect authority, and final
  Context V2 guard.
- Atomic hardening from #370: lane-specific call cardinality, latest-relevant
  stop/measurement state, exact progression constraints, and simulation
  factual-only authority.

## Remove

- The old free-form five-string plan and its two-pass adapter as the C3 path.
- Model-facing Context V2 candidate segments, role/decision-input metadata,
  strategy/CTA echoes, canonical target/action echoes, and presentation
  placeholder protocol.
- Renderer-driven evidence eligibility and universal deterministic factual
  sentence replacement.

## Model surfaces

- Strategist receives bounded selectable evidence plus non-factual dialogue and
  canonical constraints, and returns only `StrategistDecision`.
- Responder receives a compiled `ResponderTask`, exactly its selected evidence,
  and minimal writing context. It returns text fragments only; code compiles
  Context V2 transport metadata and deterministic checkout wording.

## Incremental slices

1. Add contract/evidence seam and pure compiler tests.
2. Add narrow Vertex request builders and Responder-draft compiler/guard tests.
3. Route the benchmark adapter and journeys through the new two-lane runner;
   update explicit lane-aware cardinality only.
4. Run focused contracts, journeys, benchmark validation, worker checks, then
   live six-journey observation on exact final HEAD using the supplied Vertex
   credential.
