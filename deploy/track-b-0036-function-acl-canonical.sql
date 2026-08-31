WITH function_objects AS (
  SELECT p.oid,
         p.proname,
         pg_get_function_identity_arguments(p.oid) AS identity_arguments,
         p.proowner,
         owner_role.rolname AS owner_name,
         p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_roles owner_role ON owner_role.oid = p.proowner
   WHERE n.nspname = current_schema()
), acl_entries AS MATERIALIZED (
  SELECT object.proname,
         object.identity_arguments,
         object.proowner,
         acl.grantee,
         acl.grantor,
         acl.privilege_type,
         acl.is_grantable,
         grantee_role.rolname AS grantee_name,
         grantor_role.rolname AS grantor_name
    FROM function_objects object
    CROSS JOIN LATERAL aclexplode(
      coalesce(object.proacl, acldefault('f'::"char", object.proowner))
    ) acl
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    LEFT JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
), validated_acl AS MATERIALIZED (
  SELECT 1 / CASE WHEN
           EXISTS (SELECT 1 FROM function_objects WHERE owner_name IS NULL)
           OR EXISTS (
             SELECT 1
               FROM acl_entries
              WHERE (grantee <> 0 AND grantee_name IS NULL)
                 OR grantor_name IS NULL
           )
         THEN 0 ELSE 1 END AS identity_valid
), canonical_rows AS (
  SELECT proname AS object_name,
         identity_arguments,
         0 AS row_kind,
         owner_name AS grantee_name,
         owner_name AS grantor_name,
         ''::text AS privilege_type,
         false AS is_grantable,
         jsonb_build_array(
           'OWNER', proname, identity_arguments, owner_name
         )::text AS canonical_acl_row
    FROM function_objects
    CROSS JOIN validated_acl validation
   WHERE validation.identity_valid = 1
  UNION ALL
  SELECT entry.proname,
         entry.identity_arguments,
         1,
         CASE WHEN entry.grantee = 0 THEN '' ELSE entry.grantee_name END,
         entry.grantor_name,
         entry.privilege_type,
         entry.is_grantable,
         jsonb_build_array(
           'PRIVILEGE', entry.proname, entry.identity_arguments,
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
 ORDER BY object_name, identity_arguments, row_kind, grantee_name, grantor_name,
          privilege_type, is_grantable;
