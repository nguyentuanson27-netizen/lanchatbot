-- Removes only the 0038 admission triggers/function. Queued work, historical
-- fences, migrations 0036/0037 and all behavior identities remain untouched.

DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover-admission-migration', 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'df13-cutover:1198992073286645:MESSENGER', 0
  ));
  IF EXISTS (
    SELECT 1
      FROM df13_commerce_cutover_fences
     WHERE released_at IS NULL
  ) THEN
    RAISE EXCEPTION '0038 down requires zero unreleased cutover fences';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS track_b_cutover_admission_webhook_inbox ON webhook_inbox;
DROP TRIGGER IF EXISTS track_b_cutover_admission_meta_outbox ON meta_outbox;
DROP TRIGGER IF EXISTS track_b_cutover_admission_pancake_tag_outbox ON pancake_tag_outbox;
DROP FUNCTION IF EXISTS guard_track_b_cutover_admission();
