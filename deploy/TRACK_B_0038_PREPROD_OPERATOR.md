# Track B migration 0038 PREPROD operator

This operator is restricted to `ENGINEERING_PREPROD`, database `lana_chatbot`,
and Messenger page `1198992073286645`. It owns only backup, isolated rehearsal,
apply, recovery, and exact readback for pending migration
`0038_track_b_commerce_admission_gate`. It does not deploy an application,
stage/start/stop a service, create or release a cutover fence, move a behavior
pointer, send Messenger traffic, or change routing.

The operator pins the reviewed migration hashes:

- up: `9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140`
- down: `5dd292a169a5ecce5f21896bf8e11f1d7727a34a55758c92b8abc98f3de64d9a`

It also pins the exact applied `0037` dependency, host/cluster/database/page,
PostgreSQL volume and image, realtime image and health, migration ledger,
roles/memberships/ACLs, V1 pointer, empty fence state, and zero in-flight claim
state. Unknown or changed identity fails before backup or DDL.

`backup-rehearse` creates a new custom-format backup and checksum, restores it
to one narrowly named disposable database, verifies restore catalog/ACL/role
parity, applies `0038 up -> down -> up`, and runs the reviewed real-PostgreSQL
0038 acceptance suite against the disposable database. That suite covers all
three authority-dependent claim transitions, queued hold, in-flight drain,
expired-but-unreleased behavior, page isolation, concurrency/races and exact
release unblock. The operator separately proves that down refuses an
unreleased fence, then verifies exact repeated-up catalog and cleanup.

Run only from the clean exact fetched `origin/main` checkout on the approved
host:

```text
SOURCE_REVISION=<exact-final-main> deploy/track-b-0038-preprod-operator.sh preflight
SOURCE_REVISION=<same-exact-main> deploy/track-b-0038-preprod-operator.sh backup-rehearse
SOURCE_REVISION=<same-exact-main> MIGRATION_AUTHORIZED=YES_I_AM_AUTHORIZED deploy/track-b-0038-preprod-operator.sh apply
SOURCE_REVISION=<same-exact-main> deploy/track-b-0038-preprod-operator.sh verify
```

The apply boundary repeats exact preflight and verifies the immutable backup
and rehearsal marker before the atomic migration+ledger transaction. If
post-apply verification fails and the exact prior pointer plus zero unreleased
fences are proven, it attempts the reviewed down path and records
`VERIFIED_PRE_0038`; otherwise it records
`BLOCKED_MANUAL_RESTORE_REQUIRED` and stops. Credentials remain in the existing
container secret environment or a scoped process environment and are never
printed or persisted in evidence.

Passing this operator authorizes no B3.2 fence, service deploy, authority CAS,
canary, Messenger E2E, governance acceptance, public production, page
expansion, State V2/UR, LEGACY deletion, or unrelated control-plane mutation.
