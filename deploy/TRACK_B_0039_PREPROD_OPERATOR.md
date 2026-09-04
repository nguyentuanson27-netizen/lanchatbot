# Track B migration 0039 PREPROD operator

This operator is restricted to `ENGINEERING_PREPROD`, database `lana_chatbot`,
and Messenger page `1198992073286645`. It owns only backup, isolated rehearsal,
apply, recovery, and exact readback for pending migration
`0039_track_b_v2_lkg_cutover_fence`. It does not deploy an application,
stage/start/stop a service, create or release a cutover fence, move a behavior
pointer, send Messenger traffic, or change routing.

The operator pins the reviewed migration hashes:

- up: `f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca`
- down: `191e1846a549d99d4c6d4a804fc0148b0458f0fda6944a04e20d48286f7e7301`

It also pins the exact applied `0038` dependency, host/cluster/database/page,
PostgreSQL volume and image, realtime image and health, the exact full
migration ledger, roles/memberships/ACLs, accepted V2 pointer plus exact
service/image/runtime-config/mounted-startup identity, empty fence state, and
zero in-flight claim state. Unknown or changed identity fails before backup or
DDL.

`backup-rehearse` creates a new custom-format backup and checksum, restores it
to one narrowly named disposable database, verifies restore catalog/ACL/role
parity, applies `0039 up -> down -> up`, and runs the reviewed real-PostgreSQL
0039 acceptance suite against the disposable database. That suite covers exact
same-identity V2 LKG admission, stale/missing/ambiguous identity refusal,
page isolation and advisory-lock races. The operator separately proves that down refuses an
unreleased fence, then verifies exact repeated-up catalog and cleanup. A
run-specific marker is created only after the disposable database is created;
cleanup refuses to drop a database unless that marker is read back exactly.

Run only from the clean exact fetched `origin/main` checkout on the approved
host:

```text
SOURCE_REVISION=<exact-final-main> deploy/track-b-0039-preprod-operator.sh preflight
SOURCE_REVISION=<same-exact-main> deploy/track-b-0039-preprod-operator.sh backup-rehearse
SOURCE_REVISION=<same-exact-main> MIGRATION_AUTHORIZED=YES_I_AM_AUTHORIZED deploy/track-b-0039-preprod-operator.sh apply
SOURCE_REVISION=<same-exact-main> deploy/track-b-0039-preprod-operator.sh verify
```

The apply boundary repeats exact preflight and verifies the immutable backup
and rehearsal marker before the atomic migration+ledger transaction. If
post-apply verification fails and the exact prior pointer plus zero unreleased
fences are proven, it attempts the reviewed down path only after proving the
complete rehearsed post-apply target record: host/cluster/database/page,
ledger, function/trigger catalog, ACL, role, extension, authority/in-flight
state, exact zero-total fence state and `0037` dependency identity. Only then
does it record `VERIFIED_PRE_0039`; otherwise it records
`BLOCKED_MANUAL_RESTORE_REQUIRED` and stops. Credentials remain in the existing
container secret environment or a scoped process environment and are never
printed or persisted in evidence.

Passing this operator authorizes no B3.2 fence, service deploy, authority CAS,
canary, Messenger E2E, governance acceptance, public production, page
expansion, State V2/UR, LEGACY deletion, or unrelated control-plane mutation.
