#!/bin/sh
set -eu

ROOT=${ROOT:-/opt/lana-chatbot}
ENV_FILE=${ENV_FILE:-$ROOT/shared/.env.infrastructure}
SECRETS_DIR=${SECRETS_DIR:-$ROOT/shared/secrets}
COMPOSE_FILE=${COMPOSE_FILE:-$ROOT/current/deploy/docker-compose.vps.yml}

test -f "$ENV_FILE"
test -f "$COMPOSE_FILE"

ADMIN_DB_USER=${ADMIN_DB_USER:-lana_admin_readonly}
ADMIN_CONTROL_API_DB_USER=${ADMIN_CONTROL_API_DB_USER:-lana_admin_control_api}
ADMIN_CONTROL_WORKER_DB_USER=${ADMIN_CONTROL_WORKER_DB_USER:-lana_admin_control_worker}
ADMIN_SIMULATION_WORKER_DB_USER=${ADMIN_SIMULATION_WORKER_DB_USER:-lana_admin_simulation_worker}
ADMIN_DB_PASSWORD_FILE="$SECRETS_DIR/admin_database_password"
ADMIN_DB_URL_FILE="$SECRETS_DIR/admin_database_url"
ADMIN_CONTROL_DB_PASSWORD_FILE="$SECRETS_DIR/admin_control_database_password"
ADMIN_CONTROL_DB_URL_FILE="$SECRETS_DIR/admin_control_database_url"
ADMIN_CONTROL_WORKER_DB_PASSWORD_FILE="$SECRETS_DIR/admin_control_worker_database_password"
ADMIN_CONTROL_WORKER_DB_URL_FILE="$SECRETS_DIR/admin_control_worker_database_url"
ADMIN_SIMULATION_WORKER_DB_PASSWORD_FILE="$SECRETS_DIR/admin_simulation_worker_database_password"
ADMIN_SIMULATION_WORKER_DB_URL_FILE="$SECRETS_DIR/admin_simulation_worker_database_url"
ADMIN_INTERNAL_AUTH_SECRET_FILE="$SECRETS_DIR/admin_internal_auth_secret"

install -d -m 0750 "$SECRETS_DIR"
if [ ! -s "$ADMIN_DB_PASSWORD_FILE" ]; then
  umask 077
  openssl rand -hex 32 > "$ADMIN_DB_PASSWORD_FILE"
fi
chmod 640 "$ADMIN_DB_PASSWORD_FILE"
if [ ! -s "$ADMIN_INTERNAL_AUTH_SECRET_FILE" ]; then
  umask 077
  openssl rand -hex 32 > "$ADMIN_INTERNAL_AUTH_SECRET_FILE"
fi
chmod 640 "$ADMIN_INTERNAL_AUTH_SECRET_FILE"
for password_file in \
  "$ADMIN_CONTROL_DB_PASSWORD_FILE" \
  "$ADMIN_CONTROL_WORKER_DB_PASSWORD_FILE" \
  "$ADMIN_SIMULATION_WORKER_DB_PASSWORD_FILE"
do
  if [ ! -s "$password_file" ]; then
    umask 077
    openssl rand -hex 32 > "$password_file"
  fi
  chmod 640 "$password_file"
done

set -a
. "$ENV_FILE"
set +a

ADMIN_DB_PASSWORD=$(cat "$ADMIN_DB_PASSWORD_FILE")
ADMIN_CONTROL_DB_PASSWORD=$(cat "$ADMIN_CONTROL_DB_PASSWORD_FILE")
ADMIN_CONTROL_WORKER_DB_PASSWORD=$(cat "$ADMIN_CONTROL_WORKER_DB_PASSWORD_FILE")
ADMIN_SIMULATION_WORKER_DB_PASSWORD=$(cat "$ADMIN_SIMULATION_WORKER_DB_PASSWORD_FILE")

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=admin_user="$ADMIN_DB_USER" \
  --set=admin_password="$ADMIN_DB_PASSWORD" \
  --set=control_api_user="$ADMIN_CONTROL_API_DB_USER" \
  --set=control_api_password="$ADMIN_CONTROL_DB_PASSWORD" \
  --set=control_worker_user="$ADMIN_CONTROL_WORKER_DB_USER" \
  --set=control_worker_password="$ADMIN_CONTROL_WORKER_DB_PASSWORD" \
  --set=simulation_worker_user="$ADMIN_SIMULATION_WORKER_DB_USER" \
  --set=simulation_worker_password="$ADMIN_SIMULATION_WORKER_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'admin_user', :'admin_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'admin_user')\gexec

SELECT format('ALTER ROLE %I PASSWORD %L', :'admin_user', :'admin_password')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'admin_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'admin_user')\gexec

SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'admin_user')\gexec
SELECT format('GRANT SELECT ON %I TO %I', viewname, :'admin_user')
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'admin\_%\_v' ESCAPE '\'
ORDER BY viewname
\gexec
SELECT format('GRANT SELECT ON sales_cycle_events TO %I', :'admin_user')\gexec
SELECT format(
  'GRANT SELECT ON dataset_review_datasets, dataset_conversations, dataset_messages TO %I',
  :'admin_user'
)\gexec
SELECT format('GRANT SELECT ON admin_artifact_deletions TO %I', :'admin_user')\gexec

SELECT format('ALTER ROLE %I SET default_transaction_read_only = on', :'admin_user')\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'control_api_user', :'control_api_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_api_user')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'control_api_user', :'control_api_password')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'control_api_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'control_api_user')\gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT ON %I TO %I', viewname, :'control_api_user')
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'admin\_%\_v' ESCAPE '\'
ORDER BY viewname
\gexec
SELECT format('GRANT SELECT, INSERT ON admin_commands TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT ON admin_command_events TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT ON audit_log TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT ON handoff_events TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON handoff_cases TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT ON conversations TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT ON provider_conversation_links TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT ON admin_conversation_identities TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON admin_artifact_versions TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT ON admin_artifact_deletions TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT ON admin_artifact_events TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON admin_active_pointers TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON admin_simulation_runs TO %I', :'control_api_user')\gexec
SELECT format('GRANT SELECT ON admin_simulation_results TO %I', :'control_api_user')\gexec
SELECT format(
  'GRANT SELECT ON dataset_label_schemas, dataset_annotation_projects, dataset_conversations, dataset_messages, dataset_project_items, dataset_annotations, dataset_review_events TO %I',
  :'control_api_user'
)\gexec
SELECT format(
  'GRANT INSERT, UPDATE ON dataset_label_schemas, dataset_annotation_projects, dataset_project_items, dataset_annotations TO %I',
  :'control_api_user'
)\gexec
SELECT format(
  'GRANT INSERT ON dataset_review_events TO %I',
  :'control_api_user'
)\gexec
SELECT format(
  'GRANT UPDATE (conversation_owner, owner_lease_until, state_version, state_snapshot, updated_at, expires_at) ON conversations TO %I',
  :'control_api_user'
)\gexec
SELECT format('ALTER ROLE %I SET default_transaction_read_only = off', :'control_api_user')\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'control_worker_user', :'control_worker_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'control_worker_user')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'control_worker_user', :'control_worker_password')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'control_worker_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'control_worker_user')\gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, UPDATE ON admin_commands TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT ON admin_command_events TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT ON audit_log TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT ON handoff_events TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON handoff_cases TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT ON conversations TO %I', :'control_worker_user')\gexec
SELECT format(
  'GRANT UPDATE (conversation_owner, owner_lease_until, blocking_tag, blocking_tag_verified_at, state_version, state_snapshot, updated_at, expires_at) ON conversations TO %I',
  :'control_worker_user'
)\gexec
SELECT format('GRANT SELECT ON provider_conversation_links TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON admin_conversation_identities TO %I', :'control_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT ON pancake_tag_outbox TO %I', :'control_worker_user')\gexec
SELECT format('ALTER ROLE %I SET default_transaction_read_only = off', :'control_worker_user')\gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'simulation_worker_user', :'simulation_worker_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'simulation_worker_user')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'simulation_worker_user', :'simulation_worker_password')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'simulation_worker_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'simulation_worker_user')\gexec
SELECT format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT, UPDATE ON admin_simulation_runs TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE ON admin_simulation_results TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT ON admin_artifact_versions TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT ON admin_active_pointers TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT ON messages TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT ON conversation_events TO %I', :'simulation_worker_user')\gexec
SELECT format('GRANT SELECT ON shadow_evaluations TO %I', :'simulation_worker_user')\gexec
SELECT format('ALTER ROLE %I SET default_transaction_read_only = off', :'simulation_worker_user')\gexec
SQL

umask 077
printf 'postgresql://%s:%s@postgres:5432/%s\n' \
  "$ADMIN_DB_USER" "$ADMIN_DB_PASSWORD" "$POSTGRES_DB" > "$ADMIN_DB_URL_FILE"
printf 'postgresql://%s:%s@postgres:5432/%s\n' \
  "$ADMIN_CONTROL_API_DB_USER" "$ADMIN_CONTROL_DB_PASSWORD" "$POSTGRES_DB" > "$ADMIN_CONTROL_DB_URL_FILE"
printf 'postgresql://%s:%s@postgres:5432/%s\n' \
  "$ADMIN_CONTROL_WORKER_DB_USER" "$ADMIN_CONTROL_WORKER_DB_PASSWORD" "$POSTGRES_DB" > "$ADMIN_CONTROL_WORKER_DB_URL_FILE"
printf 'postgresql://%s:%s@postgres:5432/%s\n' \
  "$ADMIN_SIMULATION_WORKER_DB_USER" "$ADMIN_SIMULATION_WORKER_DB_PASSWORD" "$POSTGRES_DB" > "$ADMIN_SIMULATION_WORKER_DB_URL_FILE"
chown root:root \
  "$ADMIN_DB_URL_FILE" \
  "$ADMIN_CONTROL_DB_URL_FILE" \
  "$ADMIN_CONTROL_WORKER_DB_URL_FILE" \
  "$ADMIN_SIMULATION_WORKER_DB_URL_FILE" \
  "$ADMIN_INTERNAL_AUTH_SECRET_FILE"
chmod 400 \
  "$ADMIN_DB_URL_FILE" \
  "$ADMIN_CONTROL_DB_URL_FILE" \
  "$ADMIN_CONTROL_WORKER_DB_URL_FILE" \
  "$ADMIN_SIMULATION_WORKER_DB_URL_FILE" \
  "$ADMIN_INTERNAL_AUTH_SECRET_FILE"

echo "Admin read-only, command API and control worker database roles prepared."
