# Phase B recovery priority — implementation

Implementation base: `6398dda29f443ca9277658aba69a638777c61fc5`; frozen-plan savepoint `16cfce05`; P0 savepoint `a0c64eeb`. [Plan revision 2](c3-phase-b-recovery-priority-plan-20261025.md), [independent review](c3-phase-b-recovery-priority-independent-review-20261025.md). Candidate PR391 only; no production wiring, live send or deployment.

## Implemented

- P0: one offer-evidence builder for prepare, read, search and readback pins canonical shop/product/release/status/offer identity inside the turn. Identical source refresh retains the original literal including observedAt/expiry; it never renews a verifier's evidence. An actual offer/release change, invalid source or expiry still changes/invalidates binding. Protected PRICE/STOCK observations are not normalized. Existing regression confirms a new POS observation still invalidates a price reply even when its numeric value matches.
- P1a: audited focus provenance. Existing durable focus/entry binding is reused unchanged; four regression cases prove unbound natural-language mentions do not manufacture durable focus. No new focus write/parser is enabled. The raw follow-up with null focus remains unresolved unless existing request evidence suffices; P2 may transfer its work instead. This is the plan's explicit limited-scope outcome, not full referent resolution.
- P2: persisted ingress first evaluates existing independent media recovery. Only unrecovered FALLBACK with the closed registered reason mapping can request handoff. Provider errors/timeouts use DEPENDENCY_FAILURE; semantic/output/budget failures use the additive RESPONSE_UNAVAILABLE reason, category SYSTEM_FAILURE. The latter means no valid reply, not wrong policy or missing business facts.
- A published rule in the actual candidate matrix is required. Shared schema/engine defaults for older reasons remain unchanged. The isolated importer registers the new holding rule; source-store policy is not written. Silent policies stay silent. B1 read-only has no new effect capability.
- Recovery reuses createPersistedCommerceHandoffPort/createCommerceHandoffTools with Inbox completion enabled. State, event, tag intent and holding Outbox commit atomically. No second reply transaction, no model retry, no effect replay; explicit handoff, checkout and no-chart media exception keep their paths. Readback failure after a recovery commit fails closed rather than throwing out of ingress.
- Retains original failure reason/accounting. The holding sentence reports only that the shop received the request; it does not claim a remote tag was delivered or a person read it.

Owner/verifier prompt hashes remain `f70347894839e863d09a9daf16517768dc88a061cb1f5591a6f1c245bed385d0` / `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. No advice/style/rubric adjustment, generic protected-fact recovery, mixed-intent classifier or generic media+handoff was added.

## Observed verification

RED before source edits: two metadata-refresh cases failed; six new recovery outcomes failed (FALLBACK instead of committed HANDOFF); a subsequent recovery-readback outage test threw. Minimum source corrections made them GREEN. A TypeScript check exposed nullable preparation source; the builder call was guarded and subsequent checks passed.

Commands actually run:

- Focused worker Vitest across read-only tools/runner, semantic boundary, ingress, media/delivery, handoff/delivery, persistence and effects: **414/414 PASS** on final code. Earlier 412 PASS preceded the added timeout/readback cases.
- Protocol/B1 prompt/matrix/importer Node suites: **29/29 PASS**.
- `node --test evals/single-agent-commerce-read-only/gemini-inference.test.mjs`: **67/67 PASS**.
- Contracts focused tests (`v2/handoff-sales-funnel`, `v4/admin-policy-control`, `commerce-handoff-delivery`): **19/19 PASS**; contracts typecheck/build PASS.
- Conversation engine `handoff-fallback-v2.test.ts`: **49/49 PASS**; engine typecheck/build PASS.
- `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker lint`, `git diff --check`: PASS after the nullable-source correction. Build/typecheck logs outside source: `c3-recovery-worker-build-20261025.log`, `c3-recovery-worker-typecheck-20261025.log` under the workspace parent.

Self-review inspected recovery ordering, full current-world readback, atomic handoff proof, silent policy, CAS/ambiguous commit, lost readback and normal/media/checkout regressions. Unit fixture tests do not independently prove real database atomicity; existing persistence integration is exercised by the subsequent isolated model run. No full-worker-suite or CI PASS is claimed.

## Registered next provider run

Owner requested one model run after implementation: existing 17 controls then 51 native outcomes, N=1, no generation retry, unchanged model/prompt/corpus/rubric. Dispatcher source is [DISPATCH_DRIVER.py](../../apps/worker/evals/single-agent-commerce-read-only/recovery-priority-full-20261025/DISPATCH_DRIVER.py). Media-followup cohort is dispatched first in the persisted lane; B1 retains its canonical 24-slot order and runs in the independent lane. No dependency is omitted to run a follow-up alone. Fault-injection tests for the three old B1 errors do not count as additional provider cases.

Seal the complete source and driver, require a clean worktree, capture HEAD at runtime, fresh source preflight, preserve every outcome/error and compare actual captured terminals. B1 provider failures may still receive its bounded fallback because the harness cannot handoff; report that separately. Full Phase B remains not GO pending provider evidence and whole-turn review.
