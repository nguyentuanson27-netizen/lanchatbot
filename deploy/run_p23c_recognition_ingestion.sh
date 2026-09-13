#!/usr/bin/env bash
set -euo pipefail

# One-shot Media Recognition V2 catalog publisher.
#
# apps/worker/dist/p23c-recognition-server.js publishes a single cycle and
# exits, so it is deliberately not its own Compose service: `restart:
# unless-stopped` would turn it into a restart loop, and
# deploy/runtime-state/service-inventory.json is the exhaustive list of
# services that must stay running.
#
# It borrows the p23c-publisher service definition for image, secrets, network
# and Qdrant/Vertex/Sheets settings only. The p23c-publisher daemon itself is
# untouched and keeps feeding the legacy multimodal collection that realtime
# text search still reads.
#
# Concurrency is owned by the publisher: it takes a Redis lock namespaced by
# recognition collection and embedding pipeline version.
#
# Writes are opt-in: the publisher defaults to dry run and only upserts into
# MEDIA_RECOGNITION_V2_QDRANT_COLLECTION when this script is invoked with
# MEDIA_RECOGNITION_V2_DRY_RUN=false.

APP_ROOT="${APP_ROOT:-/opt/lana-chatbot}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_ROOT/current/deploy/docker-compose.vps.yml}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/shared/.env.infrastructure}"
DRY_RUN="${MEDIA_RECOGNITION_V2_DRY_RUN:-true}"
SHARD_COUNT="${INGEST_SHARD_COUNT:-1}"
SHARD_INDEX="${INGEST_SHARD_INDEX:-0}"
RUN_ID="${MEDIA_RECOGNITION_V2_RUN_ID:-p23c-recognition-shard${SHARD_INDEX}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ "$DRY_RUN" != "true" ] && [ "$DRY_RUN" != "false" ]; then
  echo 'MEDIA_RECOGNITION_V2_DRY_RUN_INVALID' >&2
  exit 2
fi
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "COMPOSE_FILE_MISSING=$COMPOSE_FILE" >&2
  exit 2
fi
# The Compose file resolves REDIS_PASSWORD, P23C_IMAGE and other deployment
# values from the shared infrastructure env file. Without it Compose would
# substitute empty strings and the run would fail against a wrong image or an
# unauthenticated Redis URL.
if [ ! -f "$ENV_FILE" ]; then
  echo "ENV_FILE_MISSING=$ENV_FILE" >&2
  exit 2
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

echo "RECOGNITION_INGEST_STARTED run_id=${RUN_ID} shard=${SHARD_INDEX}/${SHARD_COUNT} dry_run=${DRY_RUN}"

# --no-deps keeps this from recreating redis or any other running service.
# --name avoids depending on how Compose treats the service's fixed
# container_name for one-off containers.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps \
  --name "lana-chatbot-p23c-recognition-${STAMP}" \
  -e MEDIA_RECOGNITION_V2_DRY_RUN="$DRY_RUN" \
  -e MEDIA_RECOGNITION_V2_RUN_ID="$RUN_ID" \
  -e INGEST_SHARD_COUNT="$SHARD_COUNT" \
  -e INGEST_SHARD_INDEX="$SHARD_INDEX" \
  p23c-publisher \
  node apps/worker/dist/p23c-recognition-server.js

echo "RECOGNITION_INGEST_FINISHED run_id=${RUN_ID} dry_run=${DRY_RUN}"
