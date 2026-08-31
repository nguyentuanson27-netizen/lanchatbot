WITH relation_objects AS (
  SELECT c.oid,
         c.relkind,
         c.relname,
         c.relowner,
         owner_role.rolname AS owner_name,
         c.relacl,
         CASE WHEN c.relkind = 'S'
           THEN 's'::"char"
           ELSE 'r'::"char"
         END AS acl_object_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles owner_role ON owner_role.oid = c.relowner
   WHERE n.nspname = current_schema()
), acl_entries AS MATERIALIZED (
  SELECT object.relkind,
         object.relname,
         object.relowner,
         acl.grantee,
         acl.grantor,
         acl.privilege_type,
         acl.is_grantable,
         grantee_role.rolname AS grantee_name,
         grantor_role.rolname AS grantor_name
    FROM relation_objects object
    CROSS JOIN LATERAL aclexplode(
      coalesce(object.relacl, acldefault(object.acl_object_kind, object.relowner))
    ) acl
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    LEFT JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
   WHERE object.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
), validated_acl AS MATERIALIZED (
  SELECT 1 / CASE WHEN count(*) FILTER (
           WHERE (grantee <> 0 AND grantee_name IS NULL)
              OR grantor_name IS NULL
         ) > 0 THEN 0 ELSE 1 END AS identity_valid
    FROM acl_entries
), canonical_rows AS (
  SELECT relkind::text AS object_kind,
         relname AS object_name,
         0 AS row_kind,
         owner_name AS grantee_name,
         owner_name AS grantor_name,
         ''::text AS privilege_type,
         false AS is_grantable,
         jsonb_build_array('OWNER', relkind::text, relname, owner_name)::text
           AS canonical_acl_row
    FROM relation_objects
  UNION ALL
  SELECT entry.relkind::text,
         entry.relname,
         1,
         CASE WHEN entry.grantee = 0 THEN '' ELSE entry.grantee_name END,
         entry.grantor_name,
         entry.privilege_type,
         entry.is_grantable,
         jsonb_build_array(
           'PRIVILEGE', entry.relkind::text, entry.relname,
           CASE WHEN entry.grantee = 0 THEN 'PUBLIC' ELSE 'ROLE' END,
           CASE WHEN entry.grantee = 0 THEN '' ELSE entry.grantee_name END,
           entry.grantor_name, entry.privilege_type, entry.is_grantable
         )::text
    FROM acl_entries entry
    CROSS JOIN validated_acl validation
   WHERE validation.identity_valid = 1
)
SELECT canonical_acl_row
  FROM canonical_rows
 ORDER BY object_kind, object_name, row_kind, grantee_name, grantor_name,
          privilege_type, is_grantable;
