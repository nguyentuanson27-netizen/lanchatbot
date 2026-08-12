# BF-10 delivery-worker r5.6 deployment

Reviewed production automation for `20260812-bf10-delivery-r5.6`. The release
is built only from the final annotated GitHub tag and recreates exactly
`delivery-worker`. Realtime, Admin, data workers, and every other service are
non-targets whose container IDs must remain unchanged.

The only permitted host selector change is `DELIVERY_IMAGE`. Delivery Docker
`Config.Env` must remain byte-equivalent; no `DELIVERY_RELEASE_ID` or other new
environment field exists. The release performs no migration, backfill, requeue,
data deletion, policy mutation, routing/allowlist change, Messenger test/send,
or n8n action.

Fresh rollback identity is hard-bound to the current production delivery image:
`lana-chatbot-app:realtime-compatibility-first-r32.2`, image ID
`sha256:44ecb2fd9f7d6a5aa769938f738a3c6ba42b470db5a9bce3d30fdc364de2a0b7`,
OCI revision `1c004eacca7cce309a0a05643d1aa751b897d41c`, with the previous
release `/opt/lana-chatbot/releases/20260811-admin-policy-review-r6.11`.

Preflight verifies immutable tag provenance, current runtime-state parity,
prospective secret-safe delivery environment parity, migration/routing/policy
readback, queues, readiness, UID, and the global deployment lock. Build records
the image ID, labels, rootfs IDs, and immutable archive digest. Cutover arms
automatic rollback before changing `DELIVERY_IMAGE` and runs only
`docker compose up -d --no-deps delivery-worker`.

Postcheck and three bounded soak samples require delivery ready/queue HTTP 200,
health, restart count zero, PID1 UID 1000, unchanged non-target IDs, unchanged
policy/routing/migration/config boundaries, zero active queues/duplicates, and
no new structured delivery error logs. Runtime-state promotion happens only
after all guards pass.

BF-10 live behavior is evaluated only from aggregate/redacted natural traffic.
Historical dirty `SENT_ACCEPTED` rows are not rewritten. If no natural accepted
transition occurs after cutover, deployment may pass for artifact and health but
the behavioral evidence remains `PENDING_NATURAL_TRANSITION_EVIDENCE`.
