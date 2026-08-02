# Confirmation behavior modes (B1/B2)

This control plane changes confirmation behavior without rebuilding or restarting the realtime worker. It is page/channel scoped, DB-backed, hash-verified and audited per activation and per inbound command.

## Safety contract

- `LEGACY`: current production behavior.
- `V2_SHADOW`: computes the B0 classifier comparison, then returns the exact LEGACY messages, state plan, tags and handoff. Candidate side effects are always `DISABLED`.
- `V2_ACTIVE`: customer-visible V2 behavior, only for pages in `REALTIME_CONFIRMATION_CANARY_PAGE_IDS`. An empty or mismatched allowlist fails closed to `CLARIFY_ONLY`.
- `CLARIFY_ONLY`: clear rejection remains rejection; every positive or ambiguous confirmation at `ORDER_PREVIEW` receives clarification. Model fallback is disabled and no confirmation plan, tag or handoff is emitted.

Sales-authority and state-read modes are schema fields for future work and are constrained to `LEGACY` in migration 0030 and in the runtime resolver.

The worker cache is at most 5 seconds. A verified last-known-good pointer is usable for at most 5 minutes; after expiry, missing pointers, hash/scope failure, or resolution-audit failure, the effective mode is `CLARIFY_ONLY`. `REALTIME_CONFIRMATION_MODE` is only a startup fallback and accepts `LEGACY` or emergency `CLARIFY_ONLY`; shadow and active modes require the DB control plane.

## Staged rollout (operator-run only)

No stage is activated by the release itself.

1. Provision the isolated reader/audit credential with `deploy/prepare-runtime-behavior-mode-vps.sh`, then deploy code with `REALTIME_CONFIRMATION_MODE=LEGACY` and `REALTIME_BEHAVIOR_MODE_ENABLED=false` and apply migration 0030. No behavior changes at this stage.
2. Create and CAS-activate an immutable `LEGACY` pointer, read back its version/hash/revision, then enable the resolver and verify health plus per-command audit writes.
3. Create and CAS-activate `V2_SHADOW`. Soak and gate shadow comparisons; verify no outbound/state/tag/handoff delta.
4. Add exactly the approved Messenger page to the canary allowlist, create `V2_ACTIVE`, and CAS-activate it. Verify pointer version/hash/revision and propagation under 5 seconds.
5. Promote only after canary gates pass. Every expansion is a distinct scoped activation.

The operator runs in the application image with the control-role secret, for example through the `admin-api` service. Values below are placeholders; never put credentials or customer data in arguments or reasons.

```sh
node apps/worker/dist/runtime-behavior-mode-operator.js read --page-id PAGE_ID --channel MESSENGER

node apps/worker/dist/runtime-behavior-mode-operator.js create --page-id PAGE_ID --channel MESSENGER --confirmation-mode V2_SHADOW --actor OPERATOR_ID --reason CHANGE_TICKET

node apps/worker/dist/runtime-behavior-mode-operator.js activate --page-id PAGE_ID --channel MESSENGER --version-id VERSION_UUID --expected-revision CURRENT_REVISION --actor OPERATOR_ID --reason CHANGE_TICKET
```

## Emergency rollback

CAS-activate a previously verified `CLARIFY_ONLY` version using the current pointer revision, then read back the version ID, content hash and incremented revision. This is a runtime DB switch and requires no image deploy. If DB read/audit is unavailable, the worker independently enters `CLARIFY_ONLY` after the bounded cache/LKG rules. Returning to `LEGACY` is also a CAS activation of an immutable prior version; never edit a version or pointer directly.

Rollback of migration 0030 is allowed only after all workers are returned to a binary that does not query these additive tables. The down migration removes only the four behavior-mode tables and their triggers/functions in dependency order.
