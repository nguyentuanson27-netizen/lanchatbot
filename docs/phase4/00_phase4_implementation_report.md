# Phase 4 implementation report

## Outcome

Phase 4 adds a bounded, send-disabled Vertex/Gemini shadow evaluator for page
`1198992073286645`. The active n8n workflow remains the sole sender. The app only receives the
existing authenticated mirror, evaluates redacted conversation data, and compares its proposal
with the actual outbound response.

## Processing contract

1. An inbound mirror message is deduplicated and synchronously redacted.
2. Messages with residual PII risk are quarantined and never queued for model evaluation.
3. A worker with a least-privilege PostgreSQL role claims at most 10 new generations per hour and
   50 per day.
4. Vertex returns `AgentProposalV1`; the deterministic policy guard sets `sendAuthorized=false`
   and blocks unsupported business facts.
5. The evaluation waits up to 15 minutes for the real n8n outbound response.
6. A second model call scores the real response on relevance, question resolution, next-step
   quality, naturalness, concision and overall quality. Suggested rewrites may only reuse facts
   already present in the real response.
7. Only redacted output, model/prompt versions, latency, token counts and quality scores are kept.

## Safety controls

- `APP_SEND_ENABLED=false` and `CHATBOT_SEND_ENABLED=false` are fixed in deployment config.
- The worker has no Meta token, Meta secret, Pancake token or n8n network access.
- Its PostgreSQL role has no privilege on `meta_outbox`.
- Model transcript and actual replies are explicitly treated as untrusted input.
- Jobs use row locks, claim tokens, bounded retries and stale-claim recovery.
- Evaluation read access uses a key separate from the mirror write key.
- API readiness requires the database schema and a recent worker heartbeat.
- PostgreSQL retention functions remove chat/evaluation analytics after six months.

## Deployment gates

- Full workspace build, typecheck and tests must pass.
- Create a checksummed production PostgreSQL backup.
- Restore the backup into a disposable database and apply migration `0003` successfully.
- Do not modify, import, publish or restart n8n.
- Verify API and worker health, worker heartbeat, active n8n workflow and `meta_outbox=0`.
- Roll back the app release if health checks fail; the additive migration may remain.

## Not included

Phase 4 does not send replies, take ownership from n8n, change Pancake tags, make order decisions,
or automatically promote a prompt. A later cutover requires reviewed shadow metrics, explicit
approval and separate canary send controls.

## Production verification — 2026-07-15

- Deployed release: `20260715-phase4-shadow-canary-r4`.
- PostgreSQL backup was checksummed and migration `0003` passed against a disposable restored
  database before production migration.
- API, shadow worker, PostgreSQL and Redis passed health checks.
- The worker role was verified unable to insert into `meta_outbox`; the outbox remained empty.
- Active n8n workflow `C4Qn7aNuUNCHJJ9c` retained the same pre/post-deployment SHA-256 fingerprint.
- Synthetic Vertex OAuth, basic generation and structured proposal generation returned HTTP 200
  using `gemini-3.1-flash-lite` in the credential's global region.
- One real redacted evaluation completed proposal generation. That historical conversation had no
  qualifying outbound reply in the 15-minute join window, so no sales-quality score was fabricated.
- Nine pre-hotfix technical failures were reset to clean pending state. The backlog was delayed 15
  minutes after a temporary Vertex HTTP 429 response, allowing normal bounded retry instead of a
  request burst.
