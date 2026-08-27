# DF13 / Gate F PREPROD Acceptance — 2026-08-28

**Status:** `GATE_F_PREPROD_ACCEPTED / DF_C_COMPLETE`
**Environment:** `ENGINEERING_PREPROD`
**Scope:** page `1198992073286645`, channel `MESSENGER`
**Terminal authority:** `salesAuthorityMode=COMMERCE`, `stateReadMode=LEGACY`

## Decision

The owner-authorized stopped-process DF13 Release Train completed and the
controlled Messenger journey passed. DF-C / DF13 is operationally accepted in
PREPROD. This record is not public-production promotion, page expansion,
State V2/UR approval, or destructive LEGACY retirement authority.

## Immutable release identity

- tag: `20260828-df13-preprod-commerce-abea1fb`
- source commit: `abea1fb0c524e9de405c80fda59691a371b85ab8`
- source tree: `c5f8e040240f1ef3ebabdaf5e82bc1da9c2983c4`
- candidate content fingerprint:
  `86ff34479283895ac97274b9cace946e2926b17bc1ac381d540f2f03a17d977a`
- authority bundle:
  `e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c`
- realtime image:
  `sha256:ea0b076cfded1b8e10d817c43ba984066c97b2b18bcdff878fa91ed809c42c16`
- release-source SHA-256:
  `67b891c8d4de8d2beecb6a08b0718cf3a8510f92d3332c64acbea7b91aa37936`
- immutable startup-package SHA-256:
  `e945b62c0f0eea265fd7401cd7e6a0ebc19211a42ed4e4566d40fa0662d60830`

The activated projection re-derived the Gate E v15 candidate fields and all
eight consumers. It did not copy the old manifest hash as authority.

## Database and authority evidence

- migration ledger ends at
  `0035_df13_commerce_behavior_mode`, checksum
  `51f94dce65d31f53829f96d1166bd131b726ee00557bc952a5489a9fc98762fc`;
  pending `0036` was not applied, as required by the stopped-process contract.
- active pointer revision: `6`
- active version: `c88f3d7a-3c14-49ff-ab07-bcfbf664c643`
- active content hash:
  `sha256:4900e2469b3f82cf66377a421e006cb11a2ce15eaf997b399ca327577a54be7b`
- source: exact `DATABASE` readback; confirmation remains `V2_ACTIVE`.
- rollback/reactivation audit:
  - revision `4`: exact COMMERCE target;
  - revision `5`: exact prior LEGACY version
    `b5611310-9ade-4bb1-9e89-0778bd6779de`, content
    `sha256:72912576e4f64b311280c0455cf3c8ead22dc3723d90fdef4ab593a7f1a2c40e`;
  - revision `6`: exact COMMERCE target restored.

This sequence proves the required exact `COMMERCE -> LEGACY -> COMMERCE`
lifecycle without applying `0036` or running both sales authorities together.

## Runtime and Messenger evidence

- the previous worker was stopped after eligible Inbox/Outbox work reached
  zero; one fresh realtime worker started from the exact image above.
- startup and an explicit restart both returned healthy with restart count `0`,
  `OOMKilled=false`, and a fresh exact `DATABASE` resolution at pointer
  revision `6`.
- approved existing-conversation input failed closed with
  `DF13_COMMERCE_CONTEXT_BOOTSTRAP_NOT_NEW_CONVERSATION`; it produced no
  Outbox side effect. This is the registered new-conversation-only bootstrap
  boundary, not a LEGACY fallback.
- the owner-controlled new-conversation journey produced, without retaining
  message content or customer identifiers in this record:
  - exact COMMERCE `DATABASE` resolution at revision `6`;
  - one valid `CONTEXT_V2_DERIVED` capture;
  - one strategy selection;
  - durable Inbox completion;
  - one Outbox row, ultimately `SENT_ACCEPTED` by Meta;
  - zero active Inbox and zero active Outbox work at terminal readback.

Runtime-state reconciliation completed through the reviewed helper:

- current release: `20260828-df13-preprod-commerce-abea1fb`
- runtime-state/history SHA-256:
  `189b99aa17838b54a48f689e909e1b2c8377205004acfd79846ee88a435d5e72`
- migration-ledger projection SHA-256:
  `231d6a5cfa95df88dc0e7c67b2ebe0d0a95f7505819749d041630baf6d92e49f`
- all 18 recorded services were running; 17 were healthy and the size-chart
  extractor has no configured healthcheck. The two pre-existing restart-count
  observations (`retention-worker=1`, `admin-simulation-worker=1`) remained
  healthy and `OOMKilled=false`.

## Gate disposition and residuals

Gate F PREPROD is accepted and DF-C is complete. PREPROD intentionally remains
on COMMERCE for further owner-controlled testing. No rollback was performed
after the passing terminal journey.

The following remain open and are not relabelled as fixed:

- BF-03: foundation-only and non-activatable;
- BF-04: `PARTIAL / KNOWN_GAP` with the recorded owner waiver;
- BF-10: natural terminal-evidence residual;
- separate `DATABASE_URL` remediation;
- existing conversations without a valid Context V2 snapshot remain
  fail-closed under the first-exercise bootstrap contract.

The next canonical program point is V5 Track B model-authority work. UR/State
V2, multi-page expansion, production hardening, and LEGACY deletion still
require their own explicit owner decisions.
