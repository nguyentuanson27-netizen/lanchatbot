WITH relation_objects AS (
  SELECT c.oid,
         c.relkind,
         c.relname,
         c.relowner,
         owner_role.rolname AS owner_name,
         c.relacl,
         CASE WHEN c.relkind = 'S'
           THEN 'S'::"char"
           ELSE 'r'::"char"
         END AS acl_object_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles owner_role ON owner_role.oid = c.relowner
   WHERE n.nspname = current_schema()
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
  SELECT object.relkind::text,
         object.relname,
         1,
         CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
           ELSE coalesce(grantee_role.rolname, 'UNKNOWN_OID:' || acl.grantee::text)
         END,
         coalesce(grantor_role.rolname, 'UNKNOWN_OID:' || acl.grantor::text),
         acl.privilege_type,
         acl.is_grantable,
         jsonb_build_array(
           'PRIVILEGE', object.relkind::text, object.relname,
           CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
             ELSE coalesce(grantee_role.rolname, 'UNKNOWN_OID:' || acl.grantee::text)
           END,
           coalesce(grantor_role.rolname, 'UNKNOWN_OID:' || acl.grantor::text),
           acl.privilege_type, acl.is_grantable
         )::text
    FROM relation_objects object
    CROSS JOIN LATERAL (
      SELECT owner_acl.*
        FROM aclexplode(
          acldefault(object.acl_object_kind, object.relowner)
        ) owner_acl
       WHERE owner_acl.grantee = object.relowner
      UNION ALL
      SELECT granted_acl.*
        FROM aclexplode(
          coalesce(object.relacl,
                   acldefault(object.acl_object_kind, object.relowner))
        ) granted_acl
       WHERE granted_acl.grantee <> object.relowner
    ) acl
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    LEFT JOIN pg_roles grantor_role ON grantor_role.oid = acl.grantor
   WHERE object.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
)
SELECT canonical_acl_row
  FROM canonical_rows
 ORDER BY object_kind, object_name, row_kind, grantee_name, grantor_name,
          privilege_type, is_grantable;
