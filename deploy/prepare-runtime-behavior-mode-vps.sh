#!/bin/sh
set -eu

ROOT=${ROOT:-/opt/lana-chatbot}
ENV_FILE=${ENV_FILE:-$ROOT/shared/.env.infrastructure}
SECRETS_DIR=${SECRETS_DIR:-$ROOT/shared/secrets}
COMPOSE_FILE=${COMPOSE_FILE:-$ROOT/current/deploy/docker-compose.vps.yml}
RUNTIME_BEHAVIOR_DB_USER=${RUNTIME_BEHAVIOR_DB_USER:-lana_runtime_behavior_reader}
CONTROL_DB_USER=${ADMIN_CONTROL_API_DB_USER:-lana_admin_control_api}
PASSWORD_FILE="$SECRETS_DIR/runtime_behavior_mode_database_password"
URL_FILE="$SECRETS_DIR/runtime_behavior_mode_database_url"

test -f "$ENV_FILE"
test -f "$COMPOSE_FILE"
install -d -m 0750 "$SECRETS_DIR"
if [ ! -s "$PASSWORD_FILE" ]; then
  umask 077
  openssl rand -hex 32 > "$PASSWORD_FILE"
fi
chmod 400 "$PASSWORD_FILE"

set -a
. "$ENV_FILE"
set +a
RUNTIME_BEHAVIOR_DB_PASSWORD=$(cat "$PASSWORD_FILE")

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=runtime_behavior_user="$RUNTIME_BEHAVIOR_DB_USER" \
  --set=control_user="$CONTROL_DB_USER" \
  --set=runtime_behavior_password="$RUNTIME_BEHAVIOR_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'runtime_behavior_user', :'runtime_behavior_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_behavior_user')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'runtime_behavior_user', :'runtime_behavior_password')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_behavior_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_behavior_user')\gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'runtime_behavior_user')\gexec
SELECT format(
  'GRANT SELECT ON runtime_behavior_mode_versions, runtime_behavior_mode_pointers, runtime_behavior_mode_resolution_audit TO %I',
  :'runtime_behavior_user'
) WHERE to_regclass('public.runtime_behavior_mode_versions') IS NOT NULL\gexec
SELECT format(
  'GRANT INSERT ON runtime_behavior_mode_resolution_audit TO %I',
  :'runtime_behavior_user'
) WHERE to_regclass('public.runtime_behavior_mode_resolution_audit') IS NOT NULL\gexec
SELECT format('ALTER ROLE %I SET default_transaction_read_only = off', :'runtime_behavior_user')\gexec
SELECT format(
  'GRANT SELECT, INSERT ON runtime_behavior_mode_versions TO %I', :'control_user'
) WHERE to_regclass('public.runtime_behavior_mode_versions') IS NOT NULL
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_user')\gexec
SELECT format(
  'GRANT SELECT, INSERT ON runtime_behavior_mode_pointers TO %I', :'control_user'
) WHERE to_regclass('public.runtime_behavior_mode_pointers') IS NOT NULL
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_user')\gexec
SELECT format(
  'GRANT UPDATE (active_version_id, pointer_revision, updated_by, reason, updated_at) ON runtime_behavior_mode_pointers TO %I',
  :'control_user'
) WHERE to_regclass('public.runtime_behavior_mode_pointers') IS NOT NULL
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_user')\gexec
SELECT format(
  'GRANT SELECT ON runtime_behavior_mode_activation_audit, runtime_behavior_mode_resolution_audit TO %I',
  :'control_user'
) WHERE to_regclass('public.runtime_behavior_mode_activation_audit') IS NOT NULL
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_user')\gexec
SQL

umask 077
printf 'postgresql://%s:%s@postgres:5432/%s\n' \
  "$RUNTIME_BEHAVIOR_DB_USER" "$RUNTIME_BEHAVIOR_DB_PASSWORD" "$POSTGRES_DB" > "$URL_FILE"
chown root:root "$URL_FILE"
chmod 400 "$URL_FILE"

echo "Runtime behavior-mode reader/audit role prepared."
