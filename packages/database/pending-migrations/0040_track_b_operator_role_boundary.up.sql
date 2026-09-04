DO $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('track-b-operator-role-boundary', 0));
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE migration_name='0039_track_b_v2_lkg_cutover_fence' AND checksum_sha256='f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca') THEN
    RAISE EXCEPTION '0040 requires exact applied 0039';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lana_track_b_authority_operator' AND NOT rolsuper AND NOT rolinherit AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolcanlogin AND NOT rolreplication AND NOT rolbypassrls) THEN
    RAISE EXCEPTION '0040 requires exact NOLOGIN operator role';
  END IF;
  IF EXISTS (SELECT 1 FROM df13_commerce_cutover_fences WHERE released_at IS NULL) THEN
    RAISE EXCEPTION '0040 requires zero unreleased cutover fences';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN (
      'runtime_behavior_mode_versions','runtime_behavior_mode_pointers',
      'runtime_behavior_mode_activation_audit','runtime_behavior_mode_resolution_audit',
      'df13_commerce_cutover_fences','webhook_inbox','meta_outbox','pancake_tag_outbox'
    ) AND c.relrowsecurity
  ) OR EXISTS (SELECT 1 FROM pg_policies WHERE policyname IN ('track_b_existing_access','track_b_operator_scope')) THEN
    RAISE EXCEPTION '0040 requires canonical pre-RLS state';
  END IF;
END $$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO lana_track_b_authority_operator', current_database());
END $$;

CREATE FUNCTION track_b_operator_release_fence(
  requested_fence_id uuid, requested_epoch bigint, requested_token_hash text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE changed integer;
BEGIN
  IF session_user <> 'lana_track_b_authority_operator' OR requested_epoch < 1 OR
     requested_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_RELEASE_INPUT_INVALID';
  END IF;
  UPDATE public.df13_commerce_cutover_fences
     SET token_hash=NULL, lease_until=NULL, released_at=clock_timestamp(), updated_at=clock_timestamp()
   WHERE fence_id=requested_fence_id AND page_id='1198992073286645' AND channel='MESSENGER'
     AND epoch=requested_epoch AND token_hash=requested_token_hash AND released_at IS NULL
     AND lease_until > clock_timestamp();
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed=1;
END $$;

CREATE FUNCTION track_b_operator_acquire_fence(
  requested_fence_id uuid, requested_operation_id uuid, requested_version_id uuid,
  requested_content_hash text, requested_revision bigint, requested_bundle text,
  requested_fingerprint text, requested_token_hash text, requested_lease_ms integer
) RETURNS TABLE(result_status text, result_fence_id uuid, result_epoch bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE existing public.df13_commerce_cutover_fences%ROWTYPE;
DECLARE new_epoch bigint;
DECLARE derived_fingerprint text;
DECLARE v2_bundle constant text := '56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8';
BEGIN
  IF session_user <> 'lana_track_b_authority_operator' OR requested_revision < 1 OR
     requested_lease_ms < 10000 OR requested_lease_ms > 300000 OR requested_bundle <> v2_bundle OR
     requested_fingerprint !~ '^[a-f0-9]{64}$' OR requested_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_ACQUIRE_INPUT_INVALID';
  END IF;
  derived_fingerprint := encode(public.digest(
    '{"channel":"MESSENGER","operationId":"'||requested_operation_id::text||'","pageId":"1198992073286645","preCutover":{"contentHash":"'||requested_content_hash||'","modeVersionId":"'||requested_version_id::text||'","pointerRevision":'||requested_revision::text||'},"schemaVersion":1,"target":{"authorityBundleHash":"'||requested_bundle||'","contentHash":"'||requested_content_hash||'","modeVersionId":"'||requested_version_id::text||'"}}',
    'sha256'), 'hex');
  IF requested_fingerprint <> derived_fingerprint THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_ACQUIRE_FINGERPRINT_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('df13-cutover-admission-migration',0));
  PERFORM pg_advisory_xact_lock(hashtextextended('df13-cutover:1198992073286645:MESSENGER',0));
  SELECT * INTO existing FROM public.df13_commerce_cutover_fences
   WHERE operation_id=requested_operation_id FOR UPDATE;
  IF FOUND THEN
    IF existing.page_id <> '1198992073286645' OR existing.channel <> 'MESSENGER' OR
       existing.pre_cutover_version_id <> requested_version_id OR existing.target_version_id <> requested_version_id OR
       existing.pre_cutover_content_hash <> requested_content_hash OR existing.target_content_hash <> requested_content_hash OR
       existing.pre_cutover_pointer_revision <> requested_revision OR existing.target_authority_bundle_hash <> requested_bundle OR
       existing.request_fingerprint <> requested_fingerprint THEN
      RETURN QUERY SELECT 'PARKED'::text, NULL::uuid, NULL::bigint; RETURN;
    END IF;
    IF existing.released_at IS NOT NULL THEN
      RETURN QUERY SELECT 'ALREADY_RELEASED'::text, existing.fence_id, existing.epoch; RETURN;
    END IF;
    IF existing.lease_until > clock_timestamp() THEN
      RETURN QUERY SELECT 'HELD_RECONCILE_REQUIRED'::text, existing.fence_id, existing.epoch; RETURN;
    END IF;
    IF existing.token_hash=requested_token_hash THEN
      RAISE EXCEPTION 'TRACK_B_OPERATOR_ACQUIRE_TOKEN_REUSE';
    END IF;
    new_epoch := existing.epoch + 1;
    UPDATE public.df13_commerce_cutover_fences SET epoch=new_epoch, token_hash=requested_token_hash,
      lease_until=clock_timestamp()+(requested_lease_ms*interval '1 millisecond'), updated_at=clock_timestamp()
      WHERE fence_id=existing.fence_id AND epoch=existing.epoch AND released_at IS NULL;
    RETURN QUERY SELECT 'HELD'::text, existing.fence_id, new_epoch; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.df13_commerce_cutover_fences WHERE page_id='1198992073286645' AND channel='MESSENGER' AND released_at IS NULL) THEN
    RETURN QUERY SELECT 'PARKED'::text, NULL::uuid, NULL::bigint; RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.runtime_behavior_mode_pointers p
    JOIN public.runtime_behavior_mode_versions v ON v.mode_version_id=p.active_version_id
    WHERE p.page_id='1198992073286645' AND p.channel='MESSENGER' AND p.pointer_revision=requested_revision
      AND v.mode_version_id=requested_version_id AND v.content_hash=requested_content_hash
      AND v.confirmation_mode='V2_ACTIVE' AND v.sales_authority_mode='COMMERCE'
      AND v.state_read_mode='LEGACY' AND v.authority_bundle_hash=v2_bundle
  ) THEN RETURN QUERY SELECT 'PARKED'::text, NULL::uuid, NULL::bigint; RETURN; END IF;
  INSERT INTO public.df13_commerce_cutover_fences(
    fence_id,operation_id,page_id,channel,pre_cutover_version_id,pre_cutover_content_hash,
    pre_cutover_pointer_revision,target_version_id,target_content_hash,target_authority_bundle_hash,
    request_fingerprint,epoch,token_hash,lease_until,released_at,created_at,updated_at
  ) VALUES(requested_fence_id,requested_operation_id,'1198992073286645','MESSENGER',requested_version_id,
    requested_content_hash,requested_revision,requested_version_id,requested_content_hash,requested_bundle,
    requested_fingerprint,1,requested_token_hash,clock_timestamp()+(requested_lease_ms*interval '1 millisecond'),
    NULL,clock_timestamp(),clock_timestamp());
  RETURN QUERY SELECT 'HELD'::text, requested_fence_id, 1::bigint;
END $$;

CREATE FUNCTION track_b_operator_cas_pointer(
  requested_fence_id uuid, requested_epoch bigint, requested_token_hash text,
  p_expected_version_id uuid, p_expected_content_hash text, p_expected_revision bigint,
  p_target_version_id uuid, p_target_content_hash text, p_actor text, p_mutation_reason text
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE changed_at timestamptz;
DECLARE v2_bundle constant text := '56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8';
DECLARE forward_orientation boolean;
BEGIN
  IF session_user <> 'lana_track_b_authority_operator' OR p_actor <> 'TRACK_B_B3_2_WRITER' OR
     p_mutation_reason !~ '^TRACK_B_B3_2_(ACTIVATE_V2_CANDIDATE|ROLLBACK_TO_LKG_V2):[0-9a-f-]{36}$' THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_INPUT_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM public.webhook_inbox WHERE page_id='1198992073286645' AND status='PROCESSING') OR
     EXISTS (SELECT 1 FROM public.meta_outbox WHERE page_id='1198992073286645' AND status='SENDING') OR
     EXISTS (SELECT 1 FROM public.pancake_tag_outbox WHERE page_id='1198992073286645' AND status='APPLYING') THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_NOT_QUIESCENT';
  END IF;
  SELECT f.pre_cutover_pointer_revision=p_expected_revision INTO forward_orientation
  FROM public.df13_commerce_cutover_fences f
   WHERE f.fence_id=requested_fence_id AND f.page_id='1198992073286645' AND f.channel='MESSENGER'
     AND f.epoch=requested_epoch AND f.token_hash=requested_token_hash AND f.released_at IS NULL
     AND f.lease_until > clock_timestamp()
     AND f.operation_id=split_part(p_mutation_reason,':',2)::uuid
     AND ((f.pre_cutover_version_id=p_expected_version_id AND f.pre_cutover_content_hash=p_expected_content_hash
           AND f.pre_cutover_pointer_revision=p_expected_revision AND f.target_version_id=p_target_version_id
           AND f.target_content_hash=p_target_content_hash AND f.target_authority_bundle_hash=v2_bundle)
       OR (f.target_version_id=p_expected_version_id AND f.target_content_hash=p_expected_content_hash
           AND f.pre_cutover_version_id=p_target_version_id AND f.pre_cutover_content_hash=p_target_content_hash
           AND f.pre_cutover_pointer_revision=p_expected_revision-1 AND f.target_authority_bundle_hash=v2_bundle))
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_FENCE_INVALID'; END IF;
  IF forward_orientation <> (p_mutation_reason LIKE 'TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:%') THEN
    RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_DIRECTION_INVALID';
  END IF;
  IF NOT forward_orientation AND ((
    SELECT count(*) FROM public.runtime_behavior_mode_activation_audit a
    WHERE a.page_id='1198992073286645' AND a.channel='MESSENGER'
      AND a.previous_version_id=p_target_version_id AND a.new_version_id=p_expected_version_id
      AND a.new_pointer_revision=p_expected_revision AND a.actor='TRACK_B_B3_2_WRITER'
      AND a.reason='TRACK_B_B3_2_ACTIVATE_V2_CANDIDATE:'||split_part(p_mutation_reason,':',2)
  ) <> 1 OR (
    SELECT count(*) FROM public.runtime_behavior_mode_activation_audit a
    WHERE a.page_id='1198992073286645' AND a.channel='MESSENGER'
      AND a.new_pointer_revision=p_expected_revision
  ) <> 1) THEN RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_PRIOR_AUDIT_INVALID'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.runtime_behavior_mode_versions
     WHERE mode_version_id=p_target_version_id AND page_id='1198992073286645' AND channel='MESSENGER'
       AND confirmation_mode='V2_ACTIVE' AND sales_authority_mode='COMMERCE' AND state_read_mode='LEGACY'
       AND authority_bundle_hash=v2_bundle AND content_hash=p_target_content_hash
  ) THEN RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_TARGET_INVALID'; END IF;
  UPDATE public.runtime_behavior_mode_pointers p
     SET active_version_id=p_target_version_id, pointer_revision=p_expected_revision+1,
         updated_by=p_actor, reason=p_mutation_reason, updated_at=clock_timestamp()
   WHERE p.page_id='1198992073286645' AND p.channel='MESSENGER'
     AND p.pointer_revision=p_expected_revision AND p.active_version_id=p_expected_version_id
     AND EXISTS (SELECT 1 FROM public.runtime_behavior_mode_versions v
       WHERE v.mode_version_id=p.active_version_id AND v.content_hash=p_expected_content_hash
         AND v.authority_bundle_hash=v2_bundle)
  RETURNING p.updated_at INTO changed_at;
  IF changed_at IS NULL THEN RAISE EXCEPTION 'TRACK_B_OPERATOR_CAS_MISMATCH'; END IF;
  RETURN changed_at;
END $$;

REVOKE ALL ON FUNCTION track_b_operator_release_fence(uuid,bigint,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION track_b_operator_acquire_fence(uuid,uuid,uuid,text,bigint,text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION track_b_operator_cas_pointer(uuid,bigint,text,uuid,text,bigint,uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION track_b_operator_release_fence(uuid,bigint,text) TO lana_track_b_authority_operator;
GRANT EXECUTE ON FUNCTION track_b_operator_acquire_fence(uuid,uuid,uuid,text,bigint,text,text,text,integer) TO lana_track_b_authority_operator;
GRANT EXECUTE ON FUNCTION track_b_operator_cas_pointer(uuid,bigint,text,uuid,text,bigint,uuid,text,text,text) TO lana_track_b_authority_operator;

GRANT USAGE ON SCHEMA public TO lana_track_b_authority_operator;
GRANT SELECT ON schema_migrations, runtime_behavior_mode_versions, runtime_behavior_mode_pointers, runtime_behavior_mode_activation_audit, runtime_behavior_mode_resolution_audit, df13_commerce_cutover_fences TO lana_track_b_authority_operator;
GRANT SELECT (page_id, status) ON webhook_inbox, meta_outbox, pancake_tag_outbox TO lana_track_b_authority_operator;

ALTER TABLE runtime_behavior_mode_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_pointers ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_activation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_behavior_mode_resolution_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE df13_commerce_cutover_fences ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE pancake_tag_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY track_b_existing_access ON runtime_behavior_mode_versions TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON runtime_behavior_mode_versions AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645' AND channel='MESSENGER') WITH CHECK (page_id='1198992073286645' AND channel='MESSENGER');
CREATE POLICY track_b_existing_access ON runtime_behavior_mode_pointers TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON runtime_behavior_mode_pointers AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645' AND channel='MESSENGER') WITH CHECK (page_id='1198992073286645' AND channel='MESSENGER');
CREATE POLICY track_b_existing_access ON runtime_behavior_mode_activation_audit TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON runtime_behavior_mode_activation_audit AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645' AND channel='MESSENGER') WITH CHECK (page_id='1198992073286645' AND channel='MESSENGER');
CREATE POLICY track_b_existing_access ON runtime_behavior_mode_resolution_audit TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON runtime_behavior_mode_resolution_audit AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645' AND channel='MESSENGER') WITH CHECK (page_id='1198992073286645' AND channel='MESSENGER');
CREATE POLICY track_b_existing_access ON df13_commerce_cutover_fences TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON df13_commerce_cutover_fences AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645' AND channel='MESSENGER') WITH CHECK (page_id='1198992073286645' AND channel='MESSENGER');
CREATE POLICY track_b_existing_access ON webhook_inbox TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON webhook_inbox AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645') WITH CHECK (page_id='1198992073286645');
CREATE POLICY track_b_existing_access ON meta_outbox TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON meta_outbox AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645') WITH CHECK (page_id='1198992073286645');
CREATE POLICY track_b_existing_access ON pancake_tag_outbox TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY track_b_operator_scope ON pancake_tag_outbox AS RESTRICTIVE TO lana_track_b_authority_operator USING (page_id='1198992073286645') WITH CHECK (page_id='1198992073286645');

ALTER ROLE lana_track_b_authority_operator SET statement_timeout='30s';
ALTER ROLE lana_track_b_authority_operator SET lock_timeout='5s';
ALTER ROLE lana_track_b_authority_operator SET idle_in_transaction_session_timeout='30s';
