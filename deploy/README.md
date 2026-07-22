# Local PostgreSQL and Redis

This compose file is development-only. It does not publish the chatbot, connect to n8n, or contain production credentials.

## Start

1. Copy `.env.local.example` to `.env.local` and replace the placeholder password.
2. Start from this directory:

   ```text
   docker compose --env-file .env.local -f docker-compose.local.yml up -d
   ```

3. Build `@lana/database`, set `DATABASE_URL` in the shell without printing it, then run:

   ```text
   pnpm --filter @lana/database migrate
   ```

Both ports bind to `127.0.0.1`. Redis uses AOF `everysec` and `maxmemory-policy=noeviction`; write failures are surfaced instead of silently evicting queue/state data.

## Stop and preserve data

```text
docker compose --env-file .env.local -f docker-compose.local.yml down
```

Do not add `-v` unless local data deletion is intentional. Never use this compose definition as the production backup/HA design.

## VPS PostgreSQL, Redis and Phase 4 shadow evaluator

`docker-compose.vps.yml` provisions dedicated PostgreSQL 17 and Redis 7.4 containers with
persistent volumes, the internal mirror API, and a send-disabled Phase 4 shadow worker. It
does not modify, activate, publish or restart n8n. Both data services
are exposed only to the Docker network `lana-chatbot-backend`; ports 5432 and 6379 are not
published on the VPS. Redis uses AOF `everysec`, `noeviction`, authentication and a 1 GiB
memory ceiling for app queue/state durability.

The real `deploy/.env.infrastructure` exists only on the VPS with mode `600` and must contain
a generated password. Start or inspect it from `/opt/lana-chatbot`:

```text
docker compose --env-file deploy/.env.infrastructure -f deploy/docker-compose.vps.yml up -d postgres redis
docker compose --env-file deploy/.env.infrastructure -f deploy/docker-compose.vps.yml ps
```

Application containers added later must join `lana-chatbot-backend` and use host `postgres`.
Do not publish the database port merely to make application configuration easier.

The `api` service is internal-only and joins the existing n8n Docker network solely
to receive authenticated mirror events. It does not publish a host port, its legacy send
route remains disabled, and `APP_SEND_ENABLED=false` is fixed in Compose. Secrets are mounted
as read-only files from `/opt/lana-chatbot/shared/secrets`; they are owned by `root`, readable
only by the container's `node` group, and are not copied into the image.

The `shadow-worker` is isolated from the n8n network and has no Meta or Pancake secret. Its
database role can read redacted messages and update shadow evaluation tables, but cannot insert
into `meta_outbox`. Vertex generation is capped at 10 jobs/hour and 50 jobs/day. The worker only
creates a structured proposal, applies deterministic policy guards, waits for the actual n8n
reply, then stores a redacted sales-quality assessment. It never sends a customer message.

Before a Phase 4 release, create a PostgreSQL custom-format backup and validate migration
`0003_shadow_evaluation` against a disposable restored database. The install order is deliberate:
start data services, apply the additive migration, prepare the least-privilege role and runtime
credential, validate Compose, then replace the internal API and start the shadow worker. The old
API remains available while migration and secret preparation run.

After installation, run `deploy/verify-vps.sh`. It requires healthy data/API/worker containers,
the Phase 4 migration, a recent worker heartbeat, active n8n workflow `C4Qn7aNuUNCHJJ9c`, an empty
app Meta outbox, and proof that the worker role lacks `INSERT` on `meta_outbox`.
