#!/bin/sh
set -eu

ROOT=/opt/lana-chatbot
SECRET_DIR="$ROOT/shared/secrets"
ENV_FILE="$ROOT/shared/.env.infrastructure"
N8N_CONTAINER=n8n-docker-n8n-1
VERTEX_CREDENTIAL_ID=kN9aNmjQQuAZEimD

cleanup_vertex_export() {
  docker exec -u 0 "$N8N_CONTAINER" rm -f \
    /tmp/extract-vertex-credential.cjs \
    /tmp/phase4-vertex-decrypted.json \
    /tmp/phase4-vertex-runtime.json >/dev/null 2>&1 || true
}
trap cleanup_vertex_export EXIT INT TERM

test -f "$ENV_FILE"
set -a
. "$ENV_FILE"
set +a
install -d -m 0710 -o root -g 1000 "$SECRET_DIR"

if [ ! -f "$SECRET_DIR/shadow_evaluation_read_key" ]; then
  umask 077
  openssl rand -hex 32 > "$SECRET_DIR/shadow_evaluation_read_key"
fi

for key_name in catalog_mirror_key business_fact_read_key; do
  if [ ! -f "$SECRET_DIR/$key_name" ]; then
    umask 077
    openssl rand -hex 32 > "$SECRET_DIR/$key_name"
  fi
done

if [ ! -f "$SECRET_DIR/qdrant_api_key" ]; then
  if [ -z "${QDRANT_API_KEY:-}" ]; then
    echo "QDRANT_API_KEY is required once to provision $SECRET_DIR/qdrant_api_key" >&2
    exit 1
  fi
  umask 077
  printf '%s' "$QDRANT_API_KEY" > "$SECRET_DIR/qdrant_api_key"
fi

docker cp "$ROOT/current/deploy/extract-vertex-credential.cjs" "$N8N_CONTAINER:/tmp/extract-vertex-credential.cjs"
docker exec "$N8N_CONTAINER" n8n export:credentials \
  --id="$VERTEX_CREDENTIAL_ID" --decrypted --output=/tmp/phase4-vertex-decrypted.json >/dev/null
docker exec "$N8N_CONTAINER" node /tmp/extract-vertex-credential.cjs \
  /tmp/phase4-vertex-decrypted.json /tmp/phase4-vertex-runtime.json
docker cp "$N8N_CONTAINER:/tmp/phase4-vertex-runtime.json" "$SECRET_DIR/vertex_google_api"
cleanup_vertex_export

SHADOW_DB_PASSWORD=$(openssl rand -hex 32)
docker exec -e SHADOW_DB_PASSWORD="$SHADOW_DB_PASSWORD" lana-chatbot-postgres sh -lc '
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql --set ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '"'"'lana_shadow_worker'"'"') THEN
    CREATE ROLE lana_shadow_worker LOGIN;
  END IF;
END \$\$;
ALTER ROLE lana_shadow_worker PASSWORD '"'"'$SHADOW_DB_PASSWORD'"'"';
GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO lana_shadow_worker;
GRANT USAGE ON SCHEMA public TO lana_shadow_worker;
GRANT SELECT ON messages TO lana_shadow_worker;
GRANT SELECT, UPDATE ON shadow_evaluations TO lana_shadow_worker;
GRANT SELECT, INSERT, UPDATE ON shadow_worker_status TO lana_shadow_worker;
REVOKE ALL ON meta_outbox FROM lana_shadow_worker;
SQL
'
umask 077
printf 'postgresql://lana_shadow_worker:%s@postgres:5432/%s\n' \
  "$SHADOW_DB_PASSWORD" "$POSTGRES_DB" > "$SECRET_DIR/shadow_database_url"

chown root:1000 \
  "$SECRET_DIR/shadow_evaluation_read_key" \
  "$SECRET_DIR/catalog_mirror_key" \
  "$SECRET_DIR/business_fact_read_key" \
  "$SECRET_DIR/qdrant_api_key" \
  "$SECRET_DIR/shadow_database_url" \
  "$SECRET_DIR/vertex_google_api"
chmod 0640 \
  "$SECRET_DIR/shadow_evaluation_read_key" \
  "$SECRET_DIR/catalog_mirror_key" \
  "$SECRET_DIR/business_fact_read_key" \
  "$SECRET_DIR/qdrant_api_key" \
  "$SECRET_DIR/shadow_database_url" \
  "$SECRET_DIR/vertex_google_api"

echo "Phase 4 runtime secrets and least-privilege database role are ready"
