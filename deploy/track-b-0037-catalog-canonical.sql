WITH function_identity AS (
  SELECT
    'FUNCTION'::text AS object_kind,
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS object_name,
    jsonb_build_object(
      'definition', pg_get_functiondef(p.oid),
      'kind', p.prokind,
      'parallel', p.proparallel,
      'securityDefiner', p.prosecdef,
      'volatility', p.provolatile,
      'owner', owner_role.rolname,
      'comment', obj_description(p.oid, 'pg_proc')
    )::text AS identity
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_roles owner_role ON owner_role.oid = p.proowner
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'guard_df13_commerce_cutover_fence_insert_identity',
      'guard_df13_commerce_cutover_fence_identity'
    )
), trigger_identity AS (
  SELECT
    'TRIGGER'::text AS object_kind,
    table_ns.nspname || '.' || table_class.relname || '.' || trigger.tgname AS object_name,
    jsonb_build_object(
      'definition', pg_get_triggerdef(trigger.oid, false),
      'enabled', trigger.tgenabled,
      'function', function_ns.nspname || '.' || function_proc.proname || '(' || pg_get_function_identity_arguments(function_proc.oid) || ')',
      'internal', trigger.tgisinternal
    )::text AS identity
  FROM pg_trigger trigger
  JOIN pg_class table_class ON table_class.oid = trigger.tgrelid
  JOIN pg_namespace table_ns ON table_ns.oid = table_class.relnamespace
  JOIN pg_proc function_proc ON function_proc.oid = trigger.tgfoid
  JOIN pg_namespace function_ns ON function_ns.oid = function_proc.pronamespace
  WHERE table_ns.nspname = 'public'
    AND trigger.tgname IN (
      'df13_commerce_cutover_fence_insert_identity_guard',
      'df13_commerce_cutover_fence_identity_guard'
    )
), index_identity AS (
  SELECT
    'INDEX'::text AS object_kind,
    index_ns.nspname || '.' || index_class.relname AS object_name,
    jsonb_build_object(
      'definition', pg_get_indexdef(index_class.oid, 0, false),
      'ready', index.indisready,
      'unique', index.indisunique,
      'valid', index.indisvalid
    )::text AS identity
  FROM pg_index index
  JOIN pg_class index_class ON index_class.oid = index.indexrelid
  JOIN pg_namespace index_ns ON index_ns.oid = index_class.relnamespace
  WHERE index_ns.nspname = 'public'
    AND index_class.relname IN (
      'df13_commerce_authority_fences_scope_unique',
      'df13_commerce_authority_fence_claims_live_inbox_uq',
      'df13_commerce_cutover_fences_operation_id_key',
      'df13_commerce_cutover_fences_live_scope_uk'
    )
), constraint_identity AS (
  SELECT
    'CONSTRAINT'::text AS object_kind,
    table_ns.nspname || '.' || table_class.relname || '.' || constraint_row.conname AS object_name,
    jsonb_build_object(
      'definition', pg_get_constraintdef(constraint_row.oid, false),
      'deferred', constraint_row.condeferred,
      'deferrable', constraint_row.condeferrable,
      'type', constraint_row.contype,
      'validated', constraint_row.convalidated
    )::text AS identity
  FROM pg_constraint constraint_row
  JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid
  JOIN pg_namespace table_ns ON table_ns.oid = table_class.relnamespace
  WHERE table_ns.nspname = 'public'
    AND table_class.relname IN (
      'df13_commerce_authority_fences',
      'df13_commerce_authority_fence_claims',
      'df13_commerce_cutover_fences'
    )
    AND constraint_row.conname LIKE 'df13_commerce_%'
), catalog_identity AS (
  SELECT * FROM function_identity
  UNION ALL SELECT * FROM trigger_identity
  UNION ALL SELECT * FROM index_identity
  UNION ALL SELECT * FROM constraint_identity
)
SELECT object_kind, object_name, identity
FROM catalog_identity
ORDER BY object_kind, object_name;
