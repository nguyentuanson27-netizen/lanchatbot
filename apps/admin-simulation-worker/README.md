# Admin simulation worker

This worker executes queued `admin_simulation_runs` against retained,
anonymized history. It is deliberately isolated from Meta, Pancake, POS,
Redis, Qdrant, and every delivery/tag outbox.

Safety properties:

- `side_effects` must be `DISABLED` at claim and completion time.
- Only `messages.dlp_status = 'PASSED'` conversations are sampled.
- Event metadata is projected into a small allowlisted replay snapshot; raw
  event metadata is not returned to the worker.
- A replay is `INSUFFICIENT_EVIDENCE` unless it has immutable business-fact and
  tool-snapshot hashes. The worker never substitutes current facts for missing
  historical evidence.
- Candidate policy versions must be non-draft and therefore immutable. The
  corresponding published baseline IDs are frozen on the run before replay.
  Before the first publish, the run instead freezes `HISTORICAL_ACTUAL` as its
  baseline source and compares against the recorded outcome/funnel snapshot.
- Claims use `FOR UPDATE SKIP LOCKED`, lease tokens, bounded retries, and
  idempotent result upserts.

Configuration:

- `ADMIN_SIMULATION_ENABLED` (default `false`)
- `ADMIN_SIMULATION_DATABASE_URL` or `ADMIN_SIMULATION_DATABASE_URL_FILE`
- `ADMIN_SIMULATION_WORKER_ID` (default `admin-simulation-worker-1`)
- `ADMIN_SIMULATION_POLL_MS` (default `1000`)
- `ADMIN_SIMULATION_LEASE_MS` (default `120000`)
- `ADMIN_SIMULATION_MAX_ATTEMPTS` (default `3`)
