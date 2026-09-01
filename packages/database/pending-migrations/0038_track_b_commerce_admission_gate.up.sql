-- Pending Track B B3.2 admission-gate artifact. Applying it requires separate owner authorization,
-- exact ENGINEERING_PREPROD backup/rehearsal and checksum readback. It depends on applied 0036/0037,
-- does not move a behavior pointer, and does not release or create a cutover fence.

DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover-admission-migration', 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover:1198992073286645:MESSENGER', 0
  ));
  IF to_regclass('df13_commerce_cutover_fences') IS NULL
     OR to_regclass('webhook_inbox') IS NULL
     OR to_regclass('meta_outbox') IS NULL
     OR to_regclass('pancake_tag_outbox') IS NULL
     OR to_regprocedure('guard_df13_commerce_cutover_fence_insert_identity()') IS NULL
     OR coalesce(obj_description(
       to_regprocedure('guard_df13_commerce_cutover_fence_insert_identity()'), 'pg_proc'
     ), '') NOT LIKE '%Track B V1-to-V2%' THEN
    RAISE EXCEPTION '0038 requires exact applied migrations 0036 and 0037';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM df13_commerce_cutover_fences
     WHERE released_at IS NULL
  ) THEN
    RAISE EXCEPTION '0038 up requires zero unreleased cutover fences';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION guard_track_b_cutover_admission()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  claim_status text;
  is_new_claim boolean;
  relation_schema text;
  fence_unreleased boolean;
BEGIN
  claim_status := CASE TG_TABLE_NAME
    WHEN 'webhook_inbox' THEN 'PROCESSING'
    WHEN 'meta_outbox' THEN 'SENDING'
    WHEN 'pancake_tag_outbox' THEN 'APPLYING'
    ELSE NULL
  END;
  IF claim_status IS NULL THEN
    RAISE EXCEPTION '0038 admission guard attached to unknown relation %', TG_TABLE_NAME;
  END IF;

  is_new_claim := NEW.status = claim_status AND (
    OLD.status IS DISTINCT FROM claim_status
    OR NEW.lease_token IS DISTINCT FROM OLD.lease_token
    OR NEW.lease_owner IS DISTINCT FROM OLD.lease_owner
  );
  IF is_new_claim IS DISTINCT FROM TRUE THEN
    -- Completion, retry, terminalization and same-lease heartbeats remain available
    -- so work already in flight can drain while admission is held.
    RETURN NEW;
  END IF;

  -- This is the same transaction-scoped lock used by the reviewed cutover-fence
  -- acquisition. Whichever transaction wins is serialized first: a pre-fence
  -- claim becomes visible to quiescence, while a post-fence claim remains queued.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover:' || NEW.page_id || ':MESSENGER', 0
  ));
  SELECT n.nspname INTO STRICT relation_schema
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE c.oid = TG_RELID;
  EXECUTE pg_catalog.format(
    'SELECT EXISTS (SELECT 1 FROM %I.df13_commerce_cutover_fences AS fence'
    ' WHERE fence.page_id = $1 AND fence.channel = ''MESSENGER'''
    ' AND fence.released_at IS NULL)',
    relation_schema
  ) INTO STRICT fence_unreleased USING NEW.page_id;
  IF fence_unreleased THEN
    -- Lease expiry never resumes admission. Only the exact reviewed release/abort
    -- path sets released_at; RETURN NULL suppresses this row's claim atomically.
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION guard_track_b_cutover_admission() IS
  '0038 page-scoped durable admission hold for Track B Inbox, Meta Outbox and Pancake claim transitions; expired unreleased fences remain held.';

DROP TRIGGER IF EXISTS track_b_cutover_admission_webhook_inbox ON webhook_inbox;
CREATE TRIGGER track_b_cutover_admission_webhook_inbox
  BEFORE UPDATE ON webhook_inbox
  FOR EACH ROW EXECUTE FUNCTION guard_track_b_cutover_admission();
ALTER TABLE webhook_inbox ENABLE ALWAYS TRIGGER track_b_cutover_admission_webhook_inbox;

DROP TRIGGER IF EXISTS track_b_cutover_admission_meta_outbox ON meta_outbox;
CREATE TRIGGER track_b_cutover_admission_meta_outbox
  BEFORE UPDATE ON meta_outbox
  FOR EACH ROW EXECUTE FUNCTION guard_track_b_cutover_admission();
ALTER TABLE meta_outbox ENABLE ALWAYS TRIGGER track_b_cutover_admission_meta_outbox;

DROP TRIGGER IF EXISTS track_b_cutover_admission_pancake_tag_outbox ON pancake_tag_outbox;
CREATE TRIGGER track_b_cutover_admission_pancake_tag_outbox
  BEFORE UPDATE ON pancake_tag_outbox
  FOR EACH ROW EXECUTE FUNCTION guard_track_b_cutover_admission();
ALTER TABLE pancake_tag_outbox ENABLE ALWAYS TRIGGER track_b_cutover_admission_pancake_tag_outbox;
