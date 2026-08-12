# Durable Contract — Runtime Behavior Control Plane

Behavior modes are versioned, database-backed, page-scoped, immutable, auditable, and dynamically resolved. Environment variables are startup fail-safe defaults only.

Required properties:

- immutable behavior-mode versions with canonical content hash;
- CAS-protected current pointer/revision;
- append-only activation audit with actor, prior/new revision, reason, and timestamp;
- worker readback of version, hash, resolved value, and source;
- bounded cache propagation of at most five seconds;
- bounded last-known-good use of at most five minutes;
- explicit safe fallback after last-known-good expiry;
- least-privilege database access;
- no secret or PII in payload, audit, or readback;
- audited emergency override that requires no redeploy.

Current durable mode dimensions:

```text
confirmation: V2_ACTIVE; emergency CLARIFY_ONLY
sales authority: LEGACY; future COMMERCE
state read: LEGACY; future V2
```

## Authority transition contract

In `ENGINEERING_PREPROD`, `SHADOW` is not a required runtime authority state. Replacement authority may move directly:

```text
sales authority: LEGACY -> COMMERCE
state read:       LEGACY -> V2
```

A direct authority switch is allowed only after the owning future Gate has deterministic/replay/comparator evidence for the replacement path and an explicit rollback path.

Because control-plane propagation is bounded rather than instantaneous, a direct switch must occur inside a verified page-scoped **quiescent cutover boundary**. The cutover protocol must:

1. hold admission of new eligible protected work for the target page;
2. verify no protected command, cart/order transition, or other authority-sensitive operation is in flight;
3. drain or hold eligible queued events that could cross the authority boundary;
4. CAS-activate the new authority revision;
5. keep eligible protected work held through the propagation interval until every relevant authority consumer reads back the exact new revision/hash/source;
6. release held work only after that exact readback succeeds.

If quiescence cannot be proven, a relevant consumer does not converge to the exact revision within the reviewed bound, or readback is ambiguous, activation must abort/fail closed and remain or return to complete `LEGACY` authority.

This quiescent boundary is an atomicity/correctness requirement for direct cutover. It is not a traffic canary, SHADOW stage, or percentage rollout. Episode/cart pinning is not a default PREPROD invariant; it may be introduced later only if the implementation cannot prove a safe quiescent boundary for a specific authority-sensitive lifecycle.

Every activation remains page-scoped, CAS-audited, read back from the worker, bounded by the existing propagation contract, and reversible to complete `LEGACY` authority.

Offline or controlled legacy/new comparison is verification tooling, not a live authority mode. It must not create protected side effects.

Traffic shadowing, traffic-percentage canaries, long soak, or statistical promotion gates are not durable PREPROD invariants. They may be introduced later by an explicit `PRODUCTION_HARDENING` decision if measured traffic/risk makes them useful.

Incident policies may extend the versioned payload, but they must not become env-only flags or independent untracked authorities. Security fallback must remain fail-closed. Claim verification must never have a mode that restores an unverified business claim.
