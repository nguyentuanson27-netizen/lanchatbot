-- Dedicated Gate E evidence admission store.
-- `admitted_at` is the database-authoritative final pre-commit boundary time.
-- It is deliberately not represented as a PostgreSQL commit timestamp.

DO $$
DECLARE
  gate_role record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_gate_e_evidence_writer') THEN
    CREATE ROLE lana_gate_e_evidence_writer NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_gate_e_evidence_reader') THEN
    CREATE ROLE lana_gate_e_evidence_reader NOLOGIN
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
  END IF;

  FOR gate_role IN
    SELECT r.*
      FROM pg_roles r
     WHERE r.rolname IN (
       'lana_gate_e_evidence_writer',
       'lana_gate_e_evidence_reader'
     )
  LOOP
    IF gate_role.rolcanlogin
       OR gate_role.rolsuper
       OR gate_role.rolcreatedb
       OR gate_role.rolcreaterole
       OR gate_role.rolinherit
       OR gate_role.rolreplication
       OR gate_role.rolbypassrls
       OR EXISTS (
         SELECT 1
           FROM pg_auth_members membership
          WHERE membership.member = gate_role.oid
       ) THEN
      RAISE EXCEPTION 'GATE_E_EVIDENCE_ROLE_BOUNDARY_INVALID: %',
        gate_role.rolname;
    END IF;
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS gate_e_evidence_records_v2 (
  evidence_hash text PRIMARY KEY CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  record_kind text NOT NULL CHECK (record_kind IN ('BODY', 'FINALIZATION')),
  contract_version text NOT NULL CHECK (contract_version IN (
    'DF10_GATE_E_SCORED_EVIDENCE_BODY_V3',
    'DF10_GATE_E_RUN_FINALIZATION_V3'
  )),
  canonical_evidence text NOT NULL CHECK (
    octet_length(canonical_evidence) BETWEEN 2 AND 4194304
  ),
  registration_commit text NOT NULL CHECK (registration_commit ~ '^[a-f0-9]{40}$'),
  manifest_hash text NOT NULL CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  scored_run_revision text NOT NULL CHECK (scored_run_revision ~ '^[a-f0-9]{40}$'),
  evidence_body_hash text CHECK (evidence_body_hash ~ '^[a-f0-9]{64}$'),
  not_after timestamptz NOT NULL,
  CONSTRAINT gate_e_evidence_record_kind_binding_ck CHECK (
    (record_kind = 'BODY'
      AND contract_version = 'DF10_GATE_E_SCORED_EVIDENCE_BODY_V3'
      AND evidence_body_hash IS NULL)
    OR
    (record_kind = 'FINALIZATION'
      AND contract_version = 'DF10_GATE_E_RUN_FINALIZATION_V3'
      AND evidence_body_hash IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS gate_e_evidence_admissions_v2 (
  evidence_hash text PRIMARY KEY
    REFERENCES gate_e_evidence_records_v2(evidence_hash) ON DELETE RESTRICT,
  admitted_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION lana_guard_gate_e_evidence_append_only_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'gate_e evidence is append-only';
END;
$$;

DROP TRIGGER IF EXISTS gate_e_evidence_records_v2_no_mutation
  ON gate_e_evidence_records_v2;
CREATE TRIGGER gate_e_evidence_records_v2_no_mutation
  BEFORE UPDATE OR DELETE OR TRUNCATE ON gate_e_evidence_records_v2
  FOR EACH STATEMENT EXECUTE FUNCTION lana_guard_gate_e_evidence_append_only_v2();

DROP TRIGGER IF EXISTS gate_e_evidence_admissions_v2_no_mutation
  ON gate_e_evidence_admissions_v2;
CREATE TRIGGER gate_e_evidence_admissions_v2_no_mutation
  BEFORE UPDATE OR DELETE OR TRUNCATE ON gate_e_evidence_admissions_v2
  FOR EACH STATEMENT EXECUTE FUNCTION lana_guard_gate_e_evidence_append_only_v2();

CREATE OR REPLACE FUNCTION lana_finalize_gate_e_evidence_admission_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  store_boundary_at timestamptz;
BEGIN
  store_boundary_at := clock_timestamp();
  IF store_boundary_at > NEW.not_after THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'GATE_E_EVIDENCE_DEADLINE_EXPIRED',
      CONSTRAINT = 'gate_e_evidence_admission_deadline_v2';
  END IF;
  INSERT INTO public.gate_e_evidence_admissions_v2 (evidence_hash, admitted_at)
  VALUES (NEW.evidence_hash, store_boundary_at);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION lana_gate_e_has_sensitive_key_v2(p_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  item record;
BEGIN
  IF jsonb_typeof(p_value) = 'object' THEN
    FOR item IN SELECT key, value FROM jsonb_each(p_value)
    LOOP
      IF lower(regexp_replace(item.key, '[^a-zA-Z0-9]', '', 'g')) ~
        '(secret|credential|password|accesstoken|refreshtoken|rawprovider|rawpayload|customer|phone|address|email|messageid)'
        OR public.lana_gate_e_has_sensitive_key_v2(item.value) THEN
        RETURN true;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(p_value) = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_value)
    LOOP
      IF public.lana_gate_e_has_sensitive_key_v2(item.value) THEN RETURN true; END IF;
    END LOOP;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION lana_gate_e_has_exact_keys_v2(
  p_value jsonb,
  p_expected text[]
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_typeof(p_value) = 'object'
     AND (SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
            FROM jsonb_object_keys(p_value) AS key)
       = (SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[])
            FROM unnest(p_expected) AS key)
$$;

DROP TRIGGER IF EXISTS gate_e_evidence_admission_boundary_v2
  ON gate_e_evidence_records_v2;
CREATE CONSTRAINT TRIGGER gate_e_evidence_admission_boundary_v2
  AFTER INSERT ON gate_e_evidence_records_v2
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION lana_finalize_gate_e_evidence_admission_v2();

CREATE OR REPLACE FUNCTION lana_gate_e_append_evidence_v2(
  p_evidence_hash text,
  p_record_kind text,
  p_contract_version text,
  p_canonical_evidence text,
  p_registration_commit text,
  p_manifest_hash text,
  p_scored_run_revision text,
  p_evidence_body_hash text,
  p_not_after timestamptz
)
RETURNS TABLE (disposition text, admitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing public.gate_e_evidence_records_v2%ROWTYPE;
  existing_admitted_at timestamptz;
  body public.gate_e_evidence_records_v2%ROWTYPE;
  evidence_json jsonb;
  item jsonb;
  item_count integer;
  claim_safety_total integer;
  context_integrity_total integer;
  side_effect_total integer;
  must_pass_total integer;
  expected_reason_codes text[];
  expected_summary_disposition text;
BEGIN
  evidence_json := p_canonical_evidence::jsonb;
  IF encode(public.digest(p_canonical_evidence, 'sha256'), 'hex') <> p_evidence_hash THEN
    RAISE EXCEPTION 'GATE_E_EVIDENCE_HASH_MISMATCH';
  END IF;
  IF public.lana_gate_e_has_sensitive_key_v2(evidence_json) THEN
    RAISE EXCEPTION 'GATE_E_EVIDENCE_SENSITIVE_FIELD_FORBIDDEN';
  END IF;
  IF evidence_json->>'contractVersion' IS DISTINCT FROM p_contract_version
     OR evidence_json->>'scoredRunRevision' IS DISTINCT FROM p_scored_run_revision THEN
    RAISE EXCEPTION 'GATE_E_EVIDENCE_RECORD_BINDING_INVALID';
  END IF;
  IF p_record_kind = 'BODY' AND (
       NOT public.lana_gate_e_has_exact_keys_v2(evidence_json, ARRAY[
         'admissibility', 'completedAt', 'contractVersion', 'executionBoundary',
       'items', 'manifestHash', 'registrationProvenance', 'schemaVersion',
         'scoredRunRevision', 'startedAt', 'summary'
       ])
       OR evidence_json->>'schemaVersion' IS DISTINCT FROM '1'
       OR evidence_json->>'admissibility' IS DISTINCT FROM
          'UNFINALIZED_TECHNICAL_EVIDENCE'
       OR evidence_json->>'executionBoundary' IS DISTINCT FROM
          'CLEAN_TRUSTED_EXACT_HEAD_REQUEST_BYTES_V1'
       OR NOT public.lana_gate_e_has_exact_keys_v2(
         evidence_json->'registrationProvenance', ARRAY[
           'disposition', 'manifestHash', 'registrationBlobOid',
           'registrationCommit', 'registrationCommitTime', 'scoredRunRevision',
           'scoredRunStartedAt'
         ]
       )
       OR evidence_json#>>'{registrationProvenance,disposition}' IS DISTINCT FROM
          'REGISTRATION_PROVENANCE_VERIFIED'
       OR NOT public.lana_gate_e_has_exact_keys_v2(evidence_json->'summary', ARRAY[
         'claimSafety', 'contextIntegrity', 'contractVersion', 'disposition',
         'eligibleCoverage', 'mustPass', 'population', 'reasonCodes',
         'schemaVersion', 'scored', 'sideEffectViolations'
       ])
       OR evidence_json#>>'{summary,schemaVersion}' IS DISTINCT FROM '1'
       OR evidence_json#>>'{summary,contractVersion}' IS DISTINCT FROM
          'DF10_GATE_E_TECHNICAL_SCORE_SUMMARY_V1'
       OR jsonb_typeof(evidence_json#>'{summary,reasonCodes}') <> 'array'
       OR evidence_json->>'manifestHash' IS DISTINCT FROM p_manifest_hash
       OR evidence_json#>>'{registrationProvenance,registrationCommit}' IS DISTINCT FROM
          p_registration_commit
       OR evidence_json#>>'{registrationProvenance,manifestHash}' IS DISTINCT FROM p_manifest_hash
       OR evidence_json#>>'{registrationProvenance,scoredRunRevision}' IS DISTINCT FROM
          p_scored_run_revision
       OR COALESCE(evidence_json#>>'{registrationProvenance,registrationBlobOid}', '') !~
          '^[a-f0-9]{40}$'
       OR evidence_json#>>'{registrationProvenance,registrationCommitTime}' IS NULL
       OR evidence_json#>>'{registrationProvenance,scoredRunStartedAt}' IS NULL
       OR evidence_json#>>'{registrationProvenance,scoredRunStartedAt}' IS DISTINCT FROM
          evidence_json->>'startedAt'
       OR (evidence_json#>>'{registrationProvenance,registrationCommitTime}')::timestamptz >
          (evidence_json#>>'{registrationProvenance,scoredRunStartedAt}')::timestamptz
       OR evidence_json->>'startedAt' IS NULL
       OR evidence_json->>'completedAt' IS NULL
       OR (evidence_json->>'startedAt')::timestamptz >
          (evidence_json->>'completedAt')::timestamptz
       OR (evidence_json->>'completedAt')::timestamptz > p_not_after
       OR jsonb_typeof(evidence_json->'items') <> 'array'
       OR jsonb_array_length(evidence_json->'items') = 0
       OR COALESCE(evidence_json#>>'{summary,population}', '')::integer <>
          jsonb_array_length(evidence_json->'items')
       OR COALESCE(evidence_json#>>'{summary,scored}', '')::integer <>
          jsonb_array_length(evidence_json->'items')
       OR COALESCE(evidence_json#>>'{summary,eligibleCoverage}', '')::numeric <> 1
       OR (SELECT count(DISTINCT value->>'corpusItemId')
             FROM jsonb_array_elements(evidence_json->'items')) <>
          jsonb_array_length(evidence_json->'items')
     ) THEN
    RAISE EXCEPTION 'GATE_E_EVIDENCE_BODY_BINDING_INVALID';
  END IF;
  IF p_record_kind = 'BODY' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(evidence_json->'items')
    LOOP
      IF NOT public.lana_gate_e_has_exact_keys_v2(item, ARRAY[
           'candidateOutputHash', 'contextHash', 'corpusItemId',
           'interpretationOutputHash', 'interpretationRequestEnvelopeHash',
           'providerModelVersion', 'requestEnvelopeHash', 'score'
         ])
         OR NOT public.lana_gate_e_has_exact_keys_v2(item->'score', ARRAY[
           'claimSafety', 'contextIntegrity', 'corpusItemId', 'disposition',
           'heuristicEffectSuspicion', 'reasonCodes', 'sideEffectViolations'
         ])
         OR COALESCE(item->>'corpusItemId', '') !~ '^[a-z0-9][a-z0-9-]{0,127}$'
         OR COALESCE(item->>'providerModelVersion', '') !~ '^[a-zA-Z0-9._-]{1,128}$'
         OR COALESCE(item->>'contextHash', '') !~ '^[a-f0-9]{64}$'
         OR COALESCE(item->>'requestEnvelopeHash', '') !~ '^[a-f0-9]{64}$'
         OR COALESCE(item->>'candidateOutputHash', '') !~ '^[a-f0-9]{64}$'
         OR COALESCE(item->>'interpretationRequestEnvelopeHash', '') !~ '^[a-f0-9]{64}$'
         OR COALESCE(item->>'interpretationOutputHash', '') !~ '^[a-f0-9]{64}$'
         OR item#>>'{score,corpusItemId}' IS DISTINCT FROM item->>'corpusItemId'
         OR COALESCE(item#>>'{score,disposition}', '') NOT IN ('MUST_PASS', 'FAILED')
         OR COALESCE(item#>>'{score,claimSafety}', '') NOT IN ('0', '1')
         OR COALESCE(item#>>'{score,contextIntegrity}', '') NOT IN ('0', '1')
         OR COALESCE(item#>>'{score,sideEffectViolations}', '') NOT IN ('0', '1')
         OR COALESCE(item#>>'{score,heuristicEffectSuspicion}', '') NOT IN ('0', '1')
         OR jsonb_typeof(item#>'{score,claimSafety}') <> 'number'
         OR jsonb_typeof(item#>'{score,contextIntegrity}') <> 'number'
         OR jsonb_typeof(item#>'{score,sideEffectViolations}') <> 'number'
         OR jsonb_typeof(item#>'{score,heuristicEffectSuspicion}') <> 'number'
         OR jsonb_typeof(item#>'{score,reasonCodes}') <> 'array'
         OR EXISTS (
           SELECT 1
             FROM jsonb_array_elements_text(item#>'{score,reasonCodes}') AS reason
            WHERE reason !~ '^[A-Z][A-Z0-9_]{0,127}$'
         )
         OR (item#>>'{score,disposition}' = 'MUST_PASS'
           AND jsonb_array_length(item#>'{score,reasonCodes}') <> 0)
         OR (item#>>'{score,disposition}' = 'FAILED'
           AND jsonb_array_length(item#>'{score,reasonCodes}') = 0) THEN
        RAISE EXCEPTION 'GATE_E_EVIDENCE_ITEM_SHAPE_INVALID';
      END IF;
    END LOOP;
    SELECT count(*),
           sum((value#>>'{score,claimSafety}')::integer),
           sum((value#>>'{score,contextIntegrity}')::integer),
           sum((value#>>'{score,sideEffectViolations}')::integer),
           count(*) FILTER (WHERE value#>>'{score,disposition}' = 'MUST_PASS')
      INTO item_count, claim_safety_total, context_integrity_total,
           side_effect_total, must_pass_total
      FROM jsonb_array_elements(evidence_json->'items');
    expected_reason_codes := ARRAY[]::text[];
    IF claim_safety_total <> item_count THEN
      expected_reason_codes := array_append(
        expected_reason_codes, 'GATE_E_CLAIM_SAFETY_FAILED'
      );
    END IF;
    IF context_integrity_total <> item_count THEN
      expected_reason_codes := array_append(
        expected_reason_codes, 'GATE_E_CONTEXT_INTEGRITY_FAILED'
      );
    END IF;
    IF must_pass_total <> item_count THEN
      expected_reason_codes := array_append(
        expected_reason_codes, 'GATE_E_MUST_PASS_ASSERTION_FAILED'
      );
    END IF;
    IF side_effect_total <> 0 THEN
      expected_reason_codes := array_append(
        expected_reason_codes, 'GATE_E_SIDE_EFFECT_SAFETY_FAILED'
      );
    END IF;
    expected_summary_disposition := CASE
      WHEN cardinality(expected_reason_codes) = 0
        THEN 'TECHNICAL_ASSERTIONS_PASS'
      ELSE 'TECHNICAL_ASSERTIONS_FAILED'
    END;
    IF COALESCE(evidence_json#>>'{summary,claimSafety}', '')::double precision <>
         claim_safety_total::double precision / item_count
       OR COALESCE(evidence_json#>>'{summary,contextIntegrity}', '')::double precision <>
         context_integrity_total::double precision / item_count
       OR COALESCE(evidence_json#>>'{summary,sideEffectViolations}', '')::integer <>
         side_effect_total
       OR COALESCE(evidence_json#>>'{summary,mustPass}', '')::double precision <>
         must_pass_total::double precision / item_count
       OR evidence_json#>>'{summary,disposition}' IS DISTINCT FROM
         expected_summary_disposition
       OR evidence_json#>'{summary,reasonCodes}' IS DISTINCT FROM
         to_jsonb(expected_reason_codes) THEN
      RAISE EXCEPTION 'GATE_E_EVIDENCE_SUMMARY_MISMATCH';
    END IF;
  END IF;
  IF p_record_kind = 'FINALIZATION' AND (
       NOT public.lana_gate_e_has_exact_keys_v2(evidence_json, ARRAY[
         'contractVersion', 'disposition', 'evidenceBodyHash', 'finalClean',
         'notAfter', 'preparedAt', 'schemaVersion', 'scoredRunRevision',
         'trustedRevision'
       ])
       OR evidence_json->>'schemaVersion' IS DISTINCT FROM '1'
       OR evidence_json->>'disposition' IS DISTINCT FROM
          'FINALIZED_TRUSTED_EXACT_HEAD'
       OR evidence_json->'finalClean' IS DISTINCT FROM 'true'::jsonb
       OR evidence_json->>'evidenceBodyHash' IS DISTINCT FROM p_evidence_body_hash
       OR evidence_json->>'trustedRevision' IS DISTINCT FROM p_scored_run_revision
       OR evidence_json->>'notAfter' IS NULL
       OR evidence_json->>'preparedAt' IS NULL
       OR (evidence_json->>'notAfter')::timestamptz <> p_not_after
       OR (evidence_json->>'preparedAt')::timestamptz > p_not_after
     ) THEN
    RAISE EXCEPTION 'GATE_E_EVIDENCE_FINALIZATION_BINDING_INVALID';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_evidence_hash, 0)
  );

  SELECT * INTO existing
    FROM public.gate_e_evidence_records_v2
   WHERE evidence_hash = p_evidence_hash;
  IF FOUND THEN
    SELECT a.admitted_at INTO existing_admitted_at
      FROM public.gate_e_evidence_admissions_v2 a
     WHERE a.evidence_hash = p_evidence_hash;
    IF existing_admitted_at IS NULL THEN
      RAISE EXCEPTION 'GATE_E_EVIDENCE_ADMISSION_CORRUPT';
    END IF;
    IF existing.record_kind = p_record_kind
       AND existing.contract_version = p_contract_version
       AND existing.canonical_evidence = p_canonical_evidence
       AND existing.registration_commit = p_registration_commit
       AND existing.manifest_hash = p_manifest_hash
       AND existing.scored_run_revision = p_scored_run_revision
       AND existing.evidence_body_hash IS NOT DISTINCT FROM p_evidence_body_hash
       AND existing.not_after = p_not_after THEN
      RETURN QUERY SELECT 'ALREADY_PRESENT'::text, existing_admitted_at;
    ELSE
      RETURN QUERY SELECT 'HASH_CONFLICT'::text, NULL::timestamptz;
    END IF;
    RETURN;
  END IF;

  IF clock_timestamp() > p_not_after THEN
    RETURN QUERY SELECT 'DEADLINE_EXPIRED'::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF p_record_kind = 'FINALIZATION' THEN
    SELECT r.* INTO body
      FROM public.gate_e_evidence_records_v2 r
      JOIN public.gate_e_evidence_admissions_v2 a USING (evidence_hash)
     WHERE r.evidence_hash = p_evidence_body_hash
       AND r.record_kind = 'BODY';
    IF NOT FOUND
       OR body.registration_commit <> p_registration_commit
       OR body.manifest_hash <> p_manifest_hash
       OR body.scored_run_revision <> p_scored_run_revision
       OR body.not_after <> p_not_after THEN
      RAISE EXCEPTION 'GATE_E_EVIDENCE_FINALIZATION_BINDING_INVALID';
    END IF;
  END IF;

  INSERT INTO public.gate_e_evidence_records_v2 (
    evidence_hash, record_kind, contract_version, canonical_evidence,
    registration_commit, manifest_hash, scored_run_revision,
    evidence_body_hash, not_after
  ) VALUES (
    p_evidence_hash, p_record_kind, p_contract_version, p_canonical_evidence,
    p_registration_commit, p_manifest_hash, p_scored_run_revision,
    p_evidence_body_hash, p_not_after
  );
  RETURN QUERY SELECT 'APPENDED'::text, NULL::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION lana_gate_e_read_evidence_by_hash_v2(
  p_evidence_hash text
)
RETURNS TABLE (
  evidence_hash text,
  record_kind text,
  contract_version text,
  canonical_evidence text,
  registration_commit text,
  manifest_hash text,
  scored_run_revision text,
  evidence_body_hash text,
  not_after timestamptz,
  admitted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT r.evidence_hash, r.record_kind, r.contract_version,
         r.canonical_evidence, r.registration_commit, r.manifest_hash,
         r.scored_run_revision, r.evidence_body_hash, r.not_after,
         a.admitted_at
    FROM public.gate_e_evidence_records_v2 r
    JOIN public.gate_e_evidence_admissions_v2 a USING (evidence_hash)
   WHERE r.evidence_hash = p_evidence_hash
$$;

REVOKE ALL ON gate_e_evidence_records_v2,
  gate_e_evidence_admissions_v2 FROM PUBLIC;
REVOKE ALL ON FUNCTION lana_gate_e_append_evidence_v2(
  text, text, text, text, text, text, text, text, timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION lana_gate_e_read_evidence_by_hash_v2(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION lana_gate_e_has_sensitive_key_v2(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION lana_gate_e_has_exact_keys_v2(jsonb, text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION lana_gate_e_append_evidence_v2(
  text, text, text, text, text, text, text, text, timestamptz
) TO lana_gate_e_evidence_writer;
GRANT EXECUTE ON FUNCTION lana_gate_e_read_evidence_by_hash_v2(text)
  TO lana_gate_e_evidence_writer, lana_gate_e_evidence_reader;
