WITH function_objects AS (
  SELECT p.oid,
         p.proname,
         pg_get_function_identity_arguments(p.oid) AS identity_arguments,
         p.proowner,
         owner_role.rolname AS owner_name,
         p.proacl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles owner_role ON owner_role.oid = p.proowner
   WHERE n.nspname = current_schema()
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
  UNION ALL
  SELECT object.proname,
         object.identity_arguments,
         1,
         CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
           ELSE coalesce(grantee_role.rolname, 'UNKNOWN_OID:' || acl.grantee::text)
         END,
         coalesce(grantor_role.rolname, 'UNKNOWN_OID:' || acl.grantor::text),
         acl.privilege_type,
         acl.is_grantable,
         jsonb_build_array(
           'PRIVILEGE', object.proname, object.identity_arguments,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
             ELSE coalesce(grantee_role.rolname, 'UNKNOWN_OID:' || acl.grantee::text)
           END,
           coalesce(grantor_role.rolname, 'UNKNOWN_OID:' || acl.grantor::text),
           acl.privilege_type, acl.is_grantable
         )::text
    FROM function_objects object
    CROSS JOIN LATERAL (
      SELECT owner_acl.*
        FROM aclexplode(acldefault('f'::"char", object.proowner)) owner_acl
       WHERE owner_acl.grantee = object.proowner
      UNION ALL
      SELECT granted_acl.*
        FROM aclexplode(
          coalesce(object.proacl, acldefault('f'::"char", object.proowner))
        ) granted_acl
       WHERE granted_acl.grantee <> object.proowner
    ) acl
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    LEFT JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
)
SELECT canonical_acl_row
  FROM canonical_rows
 ORDER BY object_name, identity_arguments, row_kind, grantee_name, grantor_name,
          privilege_type, is_grantable;
