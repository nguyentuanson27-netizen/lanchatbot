-- Roll back only the 0037 guard semantics. Durable fence evidence and all
-- behavior versions/pointers remain untouched.

DO $$
DECLARE
  active record;
BEGIN
  SELECT version.*, pointer.pointer_revision AS active_revision
    INTO active
    FROM runtime_behavior_mode_pointers AS pointer
    JOIN runtime_behavior_mode_versions AS version
      ON version.mode_version_id = pointer.active_version_id
   WHERE pointer.page_id = '1198992073286645'
     AND pointer.channel = 'MESSENGER'
   FOR UPDATE OF pointer;
  IF active.mode_version_id IS NULL
     OR active.mode_version_id <> 'c88f3d7a-3c14-49ff-ab07-bcfbf664c643'::uuid
     OR active.active_revision < 6
     OR active.page_id <> '1198992073286645'
     OR active.channel <> 'MESSENGER'
     OR active.sales_authority_mode <> 'COMMERCE'
     OR active.state_read_mode <> 'LEGACY'
     OR active.authority_bundle_hash <>
       'e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c' THEN
    RAISE EXCEPTION '0037 down requires the exact Track B V1 authority to be restored';
  END IF;
  IF EXISTS (
    SELECT 1 FROM df13_commerce_cutover_fences
     WHERE page_id = '1198992073286645'
       AND channel = 'MESSENGER'
       AND released_at IS NULL
  ) THEN
    RAISE EXCEPTION '0037 down requires no live Track B cutover fence';
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
     OR pre_version.sales_authority_mode <> 'LEGACY'
     OR pre_version.state_read_mode <> 'LEGACY'
     OR pre_version.authority_bundle_hash IS NOT NULL
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
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION guard_df13_commerce_cutover_fence_insert_identity() IS
  '0036 first LEGACY-to-COMMERCE cutover guard; never moves a pointer.';
