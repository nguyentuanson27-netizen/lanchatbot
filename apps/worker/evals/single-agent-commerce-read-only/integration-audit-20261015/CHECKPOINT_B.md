# Phase B integration audit — source completion and review

Owner request: inspect disconnected rules/capabilities, track them under B, connect them and review. [Coverage and implementation contract](../../../../../docs/specs/c3-phase-b-integration-audit-20261015.md). This is C3 Phase B, distinct from the older V5 Track B.

Audit base `814ef9872ec511cd8060c831c73d2bcae66d8a94`; refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Implementation remains on `feat/c3-phase-b-commerce-20261014`, draft PR391 stacked on the Checkpoint A branch. Final source savepoint before this report: `868b5b2b0bd4f4735172b4e4eed43e44da7df49c`. No provider generation, model substitution, prompt/corpus rewrite, live customer write, delivery, deployment or qualification in this change.

## Connections delivered

| Area | Current result |
| --- | --- |
| Handoff policy | Optional current `HANDOFF_MATRIX` rule selects message/tag through the existing schema; absent matrix uses the existing code defaults. An invalid or missing rule in a present matrix fails closed. Model supplies only a bounded reason. |
| Handoff transaction | Existing current-inbox/revision transaction persists HUMAN ownership, event/case and tag intent together. Missing provider link/event/tag intent rolls back; superseded ingress does not commit. Readback must match the committed state, original scope/fence and current policy. |
| Owner/effect lifecycle | Actual committed checkout handoff stops the turn. No subsequent owner/verifier generation or mutation is used to repair it. Recovery preserves privacy/permission NO_SEND; another page/customer scope cannot reuse an old PASS. |
| B1/B2/B3 composition | One explicit constructor connects read tools, accepted customer state, size/quote, cart effects and optional handoff ports. Only configured tools are declared to the model. B1 without write ports remains read-only. The correction→accepted state→size/cart path is exercised across recreated instances. |
| ETA | `read_product.deliveryRegion` uses the existing catalog resolver and protected-claim builder. Trusted context preserves verified region/claim identity and policy expiry, so changed source/destination cannot silently inherit the old answer. |
| Payment methods | `read_policy` exposes allowed public methods from SHOP_POLICY. Bank account, QR, private checkout and payment-message execution stay outside model context. |

Existing source-backed search/price/stock/product content, profile CAS, policy arithmetic, cart/confirmation readiness, private preview and committed receipt recovery remain the owning implementations. No new package/table/state store, parser/router, repair loop or semantic role is added. Owner and verifier remain the same two roles; the candidate returns `sendEnabled=false`.

## Real PostgreSQL evidence

All runs use the existing access helper, read-only current public policy capture and fresh disposable databases with synthetic customer/product input. No delivery worker runs. HANDOFF_MATRIX in the handoff tests is explicitly synthetic in memory; no matrix was published or changed on the live source. Provider generations are zero in every report.

| Evidence | Source | Result | Database cleanup |
| --- | --- | --- | --- |
| [Initial COD failure](integration-cod-initial-fail.json) | `1f2d5acd` | 8 groups PASS; confirmation terminal assertion FAIL because the test bridge dropped transferToHuman | Dropped |
| [COD after bridge correction](integration-cod-intermediate.json) | `84bbf401` | 12/12 PASS | Dropped |
| [Bank after caller-fence correction](integration-bank-intermediate.json) | `3d6505bb` | 12/12 PASS | Dropped |
| [COD with payment/ETA fixes](integration-cod.json) | `2d1a6a8e594351e7fb474e0460160da453ce4aa8` | 12/12 PASS; clean executable/config source | Dropped |
| [Bank with payment/ETA fixes](integration-bank.json) | `2d1a6a8e594351e7fb474e0460160da453ce4aa8` | 12/12 PASS; clean executable/config source | Dropped |

The final two reports prove profile persistence/correction/CLEAR/REPLACE/CAS/expiry; cart duplicate/new-instance receipts/quantity/lost-response reconciliation; old ingress rejection; private preview; atomic COD/bank confirmation and handoff/tag/payment intents; configured handoff acceptance; rollback on absent provider link; and superseded handoff source denial. COD creates zero payment messages; bank creates one logical payment intent/three outbox messages. No message or Pancake tag was delivered by these tests.

The later `868b5b2b` change adds reject-only wrong-scope/no-send/post-handoff-batch guards, observed RED→GREEN in focused tests. The database reports above retain their exact earlier source identity; they are not relabelled as a run on the later commit.

## Review findings and corrections

1. The existing policy resolver includes fetch time in bundleHash. Using that field for handoff identity wrongly rejected unchanged policy; use the existing stable public projection/version references and matrix content. A test uses actual resolver calls at different times.
2. A handoff-only decorator initially failed to project current authority into the final gate. Current revision, owner, scope and caller-owned fence now invalidate old eligibility; existing HUMAN ownership prevents generation.
3. The test bridge returned APPLIED/state but omitted transferToHuman. Its result now preserves the executor's actual outcome; the initial failing database report is retained.
4. The candidate initially synthesized a fence from old state. It now requires the existing caller-owned fence. This is still an isolated candidate lease test, not qualification of the live COMMERCE actor-fence path.
5. ETA claims contain day counts without destination. Reuse the existing trusted literal structure to bind the verified region and claim, and cap freshness at fulfillment policy expiry. Blank optional expiry is handled as the existing resolver specifies; it does not erase independent product facts.
6. Recovery could replace a privacy NO_SEND with a holding reply, and a wrong-page readback with unchanged visible revision could retain eligibility. Both were reproduced after the main integration and fixed. No-send has priority; invalid scope clears permission through the existing final gate. Later tool batches after handoff are rejected.

Review was performed by the implementing agent; no independent review or human/model-quality acceptance is inferred. The review owns current scope/authority/CAS/privacy/receipt risks; no extra semantic gate was added.

## Verification

See [actual commands and results](COMMANDS.md), including initial failures and source-savepoint distinctions. Final full worker source suite:128files/1733tests PASS,0skip, with sequential file execution. Full eval regression:478PASS/0skip; later B-only native/protocol checks34PASS. Existing protected/product/size tests52PASS. Worker typecheck/build/lint passed; final changed-boundary50tests and final lint/direct TypeScript emit validate the last reject-only change. All former A source/prompts/corpora/results and production entrypoints/shared package source remain byte-unchanged relative to the audit base. The Windows v4 symlink placeholder was temporarily materialized only to run existing tests and restored byte-for-byte afterwards.

## Remaining B work

| Item | Status / why |
| --- | --- |
| Component-variant replacement in persisted cart | Unavailable. Existing runtime readiness does not authorize this mutation; the native schema does not advertise it. A direct raw-CAS bypass is prohibited. |
| Multiple persisted mutations in one turn; recovery handoff after an earlier mutation consumes the inbox lease | Not proven/supported as a live atomic batch. The existing transaction completes that lease. Single transitions and controlled reconciliation are proved; use the existing ingress/transaction composition before advertising broader workflows. |
| Full provider B2/B3 stateful shopping/checkout/handoff journeys with real source ports | NOT_RUN in this change. Deterministic/composition and database evidence do not establish sales usefulness, handoff appropriateness or language quality. |
| Negotiation/concession tooling and broader media behavior | Not in the current B1–B3 native tool set; tracked capability work, no implicit activation. |
| Live history/ingress/fence, Meta/Pancake delivery and external POS order | Not wired/activated by this candidate. Test tag/outbox intents do not prove external delivery. |
| Sales quality, semantic qualification and replacement | Open. Historical B1 STOP and A OWNER_BYPASS are unchanged; Phase C needs separate qualification. |

Recommendation: source integration increment delivered; continue the explicit remaining B items before claiming Phase B is complete. No GO, promotion, merge or deploy is inferred.
