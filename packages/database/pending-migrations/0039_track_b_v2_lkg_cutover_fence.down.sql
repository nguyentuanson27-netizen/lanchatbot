-- Restore the 0037 fence guard only after every active cutover fence is
-- released and the exact 0039 guard is present. This never changes a pointer.

DO $$
DECLARE
  dependency_schema text := current_schema();
  replacement_guard_hash text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover-v2-lkg-migration', 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover:1198992073286645:MESSENGER', 0
  ));
  IF EXISTS (
    SELECT 1 FROM df13_commerce_cutover_fences
     WHERE released_at IS NULL
  ) THEN
    RAISE EXCEPTION '0039 down requires zero unreleased cutover fences';
  END IF;
  SELECT encode(public.digest(p.prosrc, 'sha256'), 'hex')
    INTO replacement_guard_hash
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
   WHERE n.nspname=dependency_schema
     AND p.proname='guard_df13_commerce_cutover_fence_insert_identity'
     AND p.pronargs=0
     AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
     AND p.proconfig IS NULL
     AND l.lanname='plpgsql';
  IF replacement_guard_hash IS DISTINCT FROM
       '28ec7165520b614e7a40ac2e80fc781ec6fdeef2ae08b3fd82ff995e20c73ddc' THEN
    RAISE EXCEPTION '0039 down requires exact 0039 V2 LKG guard identity';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION guard_df13_commerce_cutover_fence_insert_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pointer_version_id uuid;
  pointer_revision bigint;
  pre_version runtime_behavior_mode_versions%ROWTYPE;
  target_version runtime_behavior_mode_versions%ROWTYPE;
  v1_bundle constant text := 'e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c';
  v2_bundle constant text := '56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8';
  allowed_transition boolean;
BEGIN
  SELECT pointer.active_version_id, pointer.pointer_revision
    INTO pointer_version_id, pointer_revision
    FROM runtime_behavior_mode_pointers AS pointer
   WHERE pointer.page_id = NEW.page_id AND pointer.channel = NEW.channel
   FOR UPDATE;
  IF pointer_version_id IS NULL
     OR pointer_version_id <> NEW.pre_cutover_version_id
     OR pointer_revision <> NEW.pre_cutover_pointer_revision THEN
    RAISE EXCEPTION 'df13 commerce cutover fence pre-cutover pointer is not current';
  END IF;

  SELECT * INTO pre_version
    FROM runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.pre_cutover_version_id
   FOR KEY SHARE;
  SELECT * INTO target_version
    FROM runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.target_version_id
   FOR KEY SHARE;

  IF pre_version.mode_version_id IS NULL
     OR pre_version.page_id <> NEW.page_id
     OR pre_version.channel <> NEW.channel
     OR pre_version.state_read_mode <> 'LEGACY'
     OR pre_version.content_hash <> NEW.pre_cutover_content_hash THEN
    RAISE EXCEPTION 'df13 commerce cutover fence pre-cutover identity is invalid';
  END IF;
  IF target_version.mode_version_id IS NULL
     OR target_version.page_id <> NEW.page_id
     OR target_version.channel <> NEW.channel
     OR target_version.confirmation_mode <> pre_version.confirmation_mode
     OR target_version.sales_authority_mode <> 'COMMERCE'
     OR target_version.state_read_mode <> 'LEGACY'
     OR target_version.content_hash <> NEW.target_content_hash
     OR target_version.authority_bundle_hash <> NEW.target_authority_bundle_hash THEN
    RAISE EXCEPTION 'df13 commerce cutover fence target identity is invalid';
  END IF;

  allowed_transition :=
    (pre_version.sales_authority_mode = 'LEGACY'
      AND pre_version.authority_bundle_hash IS NULL
      AND target_version.authority_bundle_hash = v1_bundle)
    OR
    (NEW.page_id = '1198992073286645'
      AND NEW.channel = 'MESSENGER'
      AND pre_version.sales_authority_mode = 'COMMERCE'
      AND pre_version.authority_bundle_hash = v1_bundle
      AND target_version.authority_bundle_hash = v2_bundle)
    OR
    (NEW.page_id = '1198992073286645'
      AND NEW.channel = 'MESSENGER'
      AND pre_version.sales_authority_mode = 'COMMERCE'
      AND pre_version.authority_bundle_hash = v2_bundle
      AND target_version.authority_bundle_hash = v1_bundle);
  IF allowed_transition IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'df13 commerce cutover fence authority transition is invalid';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION guard_df13_commerce_cutover_fence_insert_identity() IS
  'Exact 0036 first cutover plus Track B V1-to-V2 replacement and V2-to-V1 rollback guard; never moves a pointer.';
