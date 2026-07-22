# `@lana/chat-runtime`

Phase-2 composition root for replay/shadow evaluation.

Pipeline:

```text
Pancake tag observation
-> conversation ownership/state transition
-> deterministic business policy guard
-> silent handoff/tag intent when required
```

Safety invariants:

- `sendEnabled` is the literal `false`.
- `metaOutboxIntent` is always `null`.
- Blocking or unverified Pancake tag state prevents proposal evaluation.
- Business guard failures become silent HUMAN handoff.
- Pancake tag intent is emitted only when `routingOwner=APP`; shadow/N8N evaluation has no provider side effect.
- This package has no HTTP/provider/model client.
