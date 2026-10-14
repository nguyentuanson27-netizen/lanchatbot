# Phase B completion scope — 2026-10-14

Owner requests identifying and implementing everything missing to complete B after the initial mock-only delivery. This extends the B1–B3 execution contract to isolated integration verification. It does not authorize production wiring, activation, live customer state/cart writes, source publication, external POS/Meta/Pancake effects, or Phase C qualification.

Completed engineering readback: [final report](completion-20261014/CHECKPOINT_B.md). Clean97f24609real sources and two isolated PostgreSQL runs PASS,9groups each/cleanup confirmed. One eight-case B1batch,28requests/retry0,5eligible/3fallback, subjective whole-terminal4/8adequate. Sales usability and the explicitly recorded capability limits remain open; no automatic next batch or qualification follows.

## Missing work and acceptance

| Slice | Required evidence |
| --- | --- |
| B1 sources | Candidate reads active policy and exact catalog/POS facts through existing adapters, not merely PING. Preserve independent verified facts; no invented timestamp, registry attributes or shop policy. Selling-offer/variant refs remain explicit. |
| B1 conversations | Freeze eight distinct scenarios N1 with public real shop data and synthetic customer messages. Same approved owner/verifier/config; at most32generation requests; zero retries. Retain every outcome/error, review the whole actual terminal reply and report tool/source/provider/quality causes separately. |
| B2 persistence | Existing PostgreSQL profile CAS across separate tool instances/turns, correction/CLEAR/REPLACE, stale writer conflict, expiry and source-bound size/quote. Use a uniquely named disposable database and existing DDL only there. No live migration or customer-state write. |
| B3 persistence | Bridge native tools into the existing current-inbox/authority transaction. Exercise real database cart open/change, duplicate/conflict, receipt readback, ambiguous commit and recovery. Confirmation/private preview/payment intents remain guarded and atomic. No test worker delivers outbox intents. |
| Delivery | Relevant focused and full worker checks, shared checks when touched; source/run identities; sanitized evidence and exact commands; actual limitations. Update plan/todo and existing draft PR391. |

## Data and run limits

Live PostgreSQL is read-only through its connection option. Redis reads only public catalog snapshots. Qdrant uses its existing index and embedding configuration. SSH credentials and source secrets stay in process memory through the existing project ops route. The database test helper creates only a fresh `c3_b_test_<random>` database; any teardown verifies that exact generated name, closes owned clients, and drops only that database. It excludes Gate E's global-role migration rather than changing cluster roles. No customer data is copied into the test database.

B1's eight purposes remain those in the B plan: price; selling-offer/variant price+stock; search then facts; buying concern; changed use case; policy disqualification after use; current policy overriding old dialogue; partial source failure. Case8 explicitly injects missing POS while retaining actual catalog/policy; it is labelled injected evidence. Cases use current public source values, with no case-specific answer examples in prompts or code. Real state/effect integration may use explicitly labelled synthetic domain inputs to control races and checkout; that is real PostgreSQL evidence, not a live-shop/provider result. No fixture is relabelled as a real source.

Run B1 once after executable changes/checks, commit/clean/seal and preflight. Source changes after the seal invalidate that run identity. No automatic next round, extra repetitions, discarded attempts or hidden generation retry. Any observed unsafe eligible terminal outcome stops further provider work. Real-source incompleteness or quality failures are reported and remain open, not converted into B/C acceptance.
