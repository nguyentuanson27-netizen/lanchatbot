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

## Actual result

Executable source **`6feeaeb53e865c7e5c92c7e4a33ab2a25bdff37d`**, clean at PostgreSQL execution. Independent source/mechanics review **APPROVE** after the fragment and payment fixes. Reviewer did not run provider/source writes or grant model-quality/GO approval.

Final independent artifact audit also **APPROVE**: integration source/cleanliness, all 15 rows, integration hash, seven log hashes and test counts matched the report. This was a read-only audit, not another execution or broader qualification approval.

- Focused ingress/checkout/effects/public-history/persistence: **315 PASS**.
- Complete worker Vitest: **2,633 PASS / 154 files**, unchanged timeouts, `--maxWorkers=2`.
- Worker build, direct `tsc --noEmit`, and worker lint: exit 0.
- **Real PostgreSQL 15/15 PASS**, all three actions at all five positions. Every tested public interruption ran the same owner and mandatory verifier, produced the expected receipt/state change, preserved saved private fields and made no purchase confirmation. At ORDER_PREVIEW the prior preview was invalidated. Test database dropped; provider generation0/live-sendfalse.
- Historical source `9fa7ea5d` retains its original **3 PASS / 12 BLOCKED** result. All 12 formerly blocked private-intake positions now passed under the relaxed contract. These are deterministic scripted-owner mechanics results, not measured model task quality or universal PII detection.

Commands actually executed:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t 'allows a public product question|keeps detected checkout fields' --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts -t 'separate fragment|does not classify' --maxWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-public-history.test.ts src/single-agent-commerce-persistence.test.ts --maxWorkers=2
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-checkout-relax-pg-20261103 COD --sales-completion-feasibility --check-prefix "C sales completion"
```

The first focused command observed the original four RED failures, then fixture source/provenance failures, then nine selected tests PASS. The second observed two RED failures for a split name and broad payment signal. The complete focused result above is after both fixes; failed output is retained separately. No command failure is reported as PASS.

[Bound results and artifact hashes](c3-phase-c-checkout-relaxation-evidence-20261103.json). This closes the **scoped S5-A interruption mechanics gate under the new owner-approved contract**. It does not activate blanket early intake, implement S6 bridge, run the new model campaign or resolve chart/media/colour source gaps. Full general PostgreSQL matrix/seven-invariant acceptance was not rerun for this narrow change.
