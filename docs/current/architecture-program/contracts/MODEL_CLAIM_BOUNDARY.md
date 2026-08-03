# Durable Contract — Model Decision and Claim Boundary

Target principle:

> The model decides conversational semantics and drafts the reply. Code verifies every protected claim, authorizes side effects, and enforces prohibitions.

## Model may

- interpret dialogue act and conversational intent;
- propose strategy and clarification;
- draft normal customer-facing wording;
- emit structured claims and requested actions;
- use only the sanitized context and verified evidence envelope it receives.

## Code must

- resolve fresh, product/variant-scoped verified evidence;
- validate every protected claim and reject undeclared protected claims;
- keep publication distinct from verification and runtime eligibility;
- reconcile contradictory strategy, CTA, ownership, safety, and action signals;
- authorize or block cart, order, state, Outbox, handoff, tag, routing, and network effects;
- preserve independently verified context when a model proposal is invalid;
- reason-code every rejection, override, repair, and safe fallback.

Protected claims include price, stock, size/fit recommendation, ETA, shipping fee, freeship, promotion/offer, and product media. A model-proposed fact cannot be its own evidence.

## Draft rejection

Code accepts or rejects the proposal; it does not silently remove arbitrary phrases and send the damaged remainder. A rejected proposal may receive one bounded repair request containing safe reason codes and allowed evidence. After bounded failure, use an approved safe clarification or handoff response with no unsupported business claim.

## Side effects

No model output alone creates a side effect. Deterministic evidence and policy decide usability and readiness immediately before mutation. Ambiguity or deterministic/model conflict resolves to the less aggressive action and emits evidence; it never selects the more aggressive action.

## Authority migration

Temporary incident regex may contain a known defect but must be versioned, observable, narrowly tested, and linked to removal. Context V2, final reconciliation, derived phase, deterministic V2 consumers, and legacy-regex demotion activate atomically under the sales-authority control plane.
