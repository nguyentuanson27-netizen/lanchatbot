# Pending checkout — owner-authorized boundary relaxation

Owner decision: **“nới phần này đi”**, after the explanation that pending checkout hides ordinary cart/negotiation requests from the conversational owner. Implementation base `4e07c9af3e5d8f2a9f77d4aa110ceabc28db427d`. This narrowly supersedes the positive-public-proof-only prerequisite in S5-A of the [sales completion plan](c3-phase-c-sales-completion-fix-plan-20261103.md). Other source/permission/effect/privacy limits and model caps remain in force.

## New behaviour

- Pending checkout alone no longer forces every inbound into the private field collector. Public questions, cart changes and negotiation use the same existing owner, tools and verifier.
- Existing DLP/redaction and checkout field syntax detect names, phone/address and explicit payment choices. Both each inbound message and the joined batch are checked. A detected private fragment or attachment keeps the **whole batch** in the existing private path; no text splitting, extra model role, private commit followed by a new owner budget, or business intent classifier is introduced.
- Resolved/ambiguous payment choices stay in code. A broad unsupported-payment signal alone is not private data; a delivery question containing “nhận hàng” can reach the owner. Actual phone/address/account-like contents still use existing privacy checks.
- Persisted names/phones/addresses remain excluded from public state/history. Existing authority/current-generation checks, cart source/CAS, receipts, preview invalidation and explicit purchase confirmation remain unchanged.

This is **detector-based admission**, not proof that arbitrary undetected text is free of PII. Unknown name/address formats may evade existing detectors; ambiguous recognised names can also hold a public phrase in the private path. These limitations must be reported honestly. No generic Vietnamese parser, new regex phrase bank, semantic router, repair loop or third online role is added. Do not claim universal privacy or task success from this relaxation.

## Verification contract

Observed RED: four public questions during pending FULL_NAME/PHONE/ADDRESS/PAYMENT_METHOD never reached the owner. Minimum change lets these reach owner/verifier. Initial synthetic source fixtures then exposed missing selector/current price provenance; fixtures were corrected without weakening egress gates.

Independent review found that checking only the joined batch could leak a separately recognised one-word name such as `Lan` when followed by a public question. New per-message and whole-batch checks close that gap; the negative test was observed failing before the fix. Payment detection also previously held a delivery deadline question solely because its broad signal contained “nhận hàng”; only resolved/ambiguous choices now mandate the private route.

Required controls: private name/phone/address/payment, mixed input, separate private fragments, attachments, HUMAN takeover, superseded inbound, preserved pending private fields and one owner budget. Re-run the existing **15 synthetic real-PostgreSQL journeys** under a new clean source/output identity, retaining the old 12-blocked/3-pass report unchanged. That matrix must inspect exact cart/negotiation state, receipts and preview invalidation. No new provider generation, source publication or live send is authorized by this boundary change itself.

Status at initial implementation: focused tests/build running; independent re-review and real PostgreSQL verification pending. This amendment does not activate blanket early intake, S6 bridge or a new model campaign, nor resolve the separate chart/media/colour source gaps.
