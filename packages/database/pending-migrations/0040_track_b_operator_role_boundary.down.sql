DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('track-b-operator-role-boundary', 0));
  IF EXISTS (SELECT 1 FROM df13_commerce_cutover_fences WHERE released_at IS NULL) THEN RAISE EXCEPTION '0040 down requires zero unreleased cutover fences'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lana_track_b_authority_operator' AND rolcanlogin) THEN RAISE EXCEPTION '0040 down requires deprovisioned NOLOGIN operator role'; END IF;
END $$;
REVOKE ALL ON FUNCTION track_b_operator_cas_pointer(uuid,bigint,text,uuid,text,bigint,uuid,text,text,text) FROM lana_track_b_authority_operator;
REVOKE ALL ON FUNCTION track_b_operator_release_fence(uuid,bigint,text) FROM lana_track_b_authority_operator;
REVOKE ALL ON FUNCTION track_b_operator_acquire_fence(uuid,uuid,uuid,text,bigint,text,text,text,integer) FROM lana_track_b_authority_operator;
DROP FUNCTION track_b_operator_cas_pointer(uuid,bigint,text,uuid,text,bigint,uuid,text,text,text);
DROP FUNCTION track_b_operator_release_fence(uuid,bigint,text);
DROP FUNCTION track_b_operator_acquire_fence(uuid,uuid,uuid,text,bigint,text,text,text,integer);
ALTER FUNCTION public.guard_df13_commerce_cutover_fence_insert_identity()
  RESET search_path;
DROP POLICY track_b_operator_scope ON pancake_tag_outbox;
DROP POLICY track_b_existing_access ON pancake_tag_outbox;
DROP POLICY track_b_operator_scope ON meta_outbox;
DROP POLICY track_b_existing_access ON meta_outbox;
DROP POLICY track_b_operator_scope ON webhook_inbox;
DROP POLICY track_b_existing_access ON webhook_inbox;
DROP POLICY track_b_operator_scope ON df13_commerce_cutover_fences;
DROP POLICY track_b_existing_access ON df13_commerce_cutover_fences;
DROP POLICY track_b_operator_scope ON runtime_behavior_mode_resolution_audit;
DROP POLICY track_b_existing_access ON runtime_behavior_mode_resolution_audit;
DROP POLICY track_b_operator_scope ON runtime_behavior_mode_activation_audit;
DROP POLICY track_b_existing_access ON runtime_behavior_mode_activation_audit;
DROP POLICY track_b_operator_scope ON runtime_behavior_mode_pointers;
DROP POLICY track_b_existing_access ON runtime_behavior_mode_pointers;
DROP POLICY track_b_operator_scope ON runtime_behavior_mode_versions;
DROP POLICY track_b_existing_access ON runtime_behavior_mode_versions;
ALTER TABLE pancake_tag_outbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE meta_outbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_inbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE df13_commerce_cutover_fences DISABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_resolution_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_activation_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_pointers DISABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_versions DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON schema_migrations, runtime_behavior_mode_versions, runtime_behavior_mode_pointers, runtime_behavior_mode_activation_audit, runtime_behavior_mode_resolution_audit, df13_commerce_cutover_fences, webhook_inbox, meta_outbox, pancake_tag_outbox FROM lana_track_b_authority_operator;
REVOKE SELECT (page_id, status) ON webhook_inbox, meta_outbox, pancake_tag_outbox FROM lana_track_b_authority_operator;
REVOKE USAGE ON SCHEMA public FROM lana_track_b_authority_operator;
DO $$
BEGIN
  EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM lana_track_b_authority_operator', current_database());
END $$;
ALTER ROLE lana_track_b_authority_operator RESET statement_timeout;
ALTER ROLE lana_track_b_authority_operator RESET lock_timeout;
ALTER ROLE lana_track_b_authority_operator RESET idle_in_transaction_session_timeout;
