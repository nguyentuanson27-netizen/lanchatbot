# Policy model run with real handoff — 2026-10-20

Implementation base `513072fe73846d38468d422b734696a7abfbf2f4`. Owner requests a model run after accepting the after-sales process and requesting concise policy replies plus real transfer to staff.

Five existing questions, once each: worn item, held up only with a size-exchange request, ambiguous try, exchange window/fee, reported seam defect. Frozen inputs in inputs.json, source public policy/matrix in SOURCE.json, models/hashes/config/bounds in REGISTRATION.json. Maximum20 generation requests (owner<=3 and verifier<=1 per turn), retry0, no replacement samples. Keep every outcome/error. No new long-term corpus or production code.

Reuse createCommerceTools, createPersistedCommerceHandoffPort, runCommerceTurn, real PostgreSQL Inbox/runtime/Outbox stores and MetaOutboxDispatcher. Create a disposable c3_b_test_* database; validate exact DB name before migration/drop. Live policy store is read-only. Source hash must match freeze on every policy read; fresh runtime HEAD is captured after a clean executable/config worktree. No upstream policy/matrix changes. Case product identity is intentionally unspecified and no catalog/POS facts are needed or fabricated for these policy turns. This is not a product-selection or size-fit run.

Only synthetic conversations/provider links/recipient/tag IDs in the disposable DB. Fence uses the existing isolated-test inbox generation convention, not a live COMMERCE actor-fence qualification. The delivery adapter has no Meta/Pancake socket: it captures only the current synthetic recipient. Handoff state/event/tag/message intents persist in PostgreSQL; code holding text is drained through the real dispatcher to that capture. Pancake tag delivery and human staff response are not exercised. Normal SEND_ELIGIBLE replies are recorded as eligible text, not claimed as Meta delivery. New ingress parsing or exchange-order mutation is not exercised.

Available tools are the existing read tools plus request_handoff. No forced model tool sequence or regex. The model chooses whether/how to call. Native tool continuations retain normal budgets; all surviving final model drafts receive the verifier/final gate. A committed handoff terminates with the existing code-owned message, not a model final draft. That message is not re-verified or rewritten. These are distinct outcomes, not a verifier skip for a free final reply.

Policy preparation found no current handoff matrix. Therefore current default handoff behavior/message applies; do not inject a nicer synthetic rule to improve results. This known configuration is part of what the run measures.

Primary review examines actual terminal outcome first, before draft/verdict diagnosis:

- Worn: answer the ineligible situation directly; no agreement followed by contradictory conditions.
- Hold-up/exchange request: receive the request and transfer actual processing when needed, without inventing eligibility violations or stock/size-fit facts.
- Ambiguous try: ask the action that changes the conclusion rather than approving/denying blindly.
- Fee/window: answer current numbers and receipt anchor concisely; no mandatory checklist/handoff for a general policy question.
- Reported defect: receive the report and route inspection/procedure to staff; do not blanket-deny because worn. An offer to follow the approved procedure is allowed, but claiming the transfer/effect completed requires the actual state/receipt. Do not demand repeated already-satisfied conditions or treat every service statement as final approval.

Evaluate understanding, useful next step, concise/natural Vietnamese, factual/action safety over the whole reply. Count HANDOFF as a successful process only if state HUMAN/event/tag intent and correct terminal/capture agree. Separately report whether its holding message supplies a useful next step; no keyword scoring. Lock primary before secondary analysis, keep owner feedback separate from historical primary scores. No human adjudication claimed.

After source seal: zero-generation preflight, then exactly five slots. No automatic fix/retry/expansion/full B run. Preserve raw, usage/errors/request count/latency, source/wire hashes and DB-drop evidence. A remains OWNER_BYPASS; no live GO/deploy/send.

## Setup correction before any model dispatch

Initial source8bee957f passed zero-generation preflight, then setup stopped because source-session.py intentionally supplied test-admin credentials only to isolated-integration.mjs. SETUP_FAILURE.json preserves that setup failure:0generations/0completed/0DBcreated. It is not a discarded model outcome or a generation retry.

The same existing source-session bridge now additionally allows the exact versioned policy-handoff runner path. Other scripts/interpreters stay denied; live policy DATABASE_URL remains read-only, admin URL remains in child memory only. No new identity/role or credential source. Predicate test observed RED1FAIL/4PASS then GREEN5PASS, including the original route and negative paths/inline commands. New clean HEAD must be sealed/preflighted before the five unchanged slots run. No provider result was observed before this correction.
