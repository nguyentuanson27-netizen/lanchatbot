CREATE TEMP TABLE migration_0023_admin_events_acl
ON COMMIT DROP AS
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = current_schema()
  AND table_name = 'admin_conversation_events_v';

CREATE TEMP TABLE migration_0023_admin_events_owner
ON COMMIT DROP AS
SELECT pg_get_userbyid(relowner) AS owner_name
FROM pg_class
WHERE oid = 'admin_conversation_events_v'::regclass;

DROP VIEW admin_conversation_events_v;

CREATE VIEW admin_conversation_events_v
WITH (security_barrier = true) AS
SELECT
  event_id,
  conversation_id,
  page_id,
  event_type,
  intent,
  stage,
  action,
  handoff_reason,
  owner,
  readiness_score,
  product_id,
  order_outcome,
  prompt_version,
  model_version,
  policy_version,
  catalog_version,
  occurred_at
FROM conversation_events;

COMMENT ON VIEW admin_conversation_events_v IS
  'PII-free Admin read model; raw event metadata remains hidden.';

DO $$
DECLARE
  acl_row record;
  owner_name text;
  grantee_sql text;
BEGIN
  FOR acl_row IN
    SELECT grantee, privilege_type, is_grantable
    FROM migration_0023_admin_events_acl
  LOOP
    grantee_sql := CASE
      WHEN acl_row.grantee = 'PUBLIC' THEN 'PUBLIC'
      ELSE format('%I', acl_row.grantee)
    END;
    EXECUTE format(
      'GRANT %s ON TABLE admin_conversation_events_v TO %s%s',
      acl_row.privilege_type,
      grantee_sql,
      CASE
        WHEN acl_row.is_grantable = 'YES' THEN ' WITH GRANT OPTION'
        ELSE ''
      END
    );
  END LOOP;

  SELECT migration_0023_admin_events_owner.owner_name
  INTO owner_name
  FROM migration_0023_admin_events_owner;
  IF owner_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER VIEW admin_conversation_events_v OWNER TO %I',
      owner_name
    );
  END IF;
END
$$;
