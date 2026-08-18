REVOKE EXECUTE ON FUNCTION lana_gate_e_read_evidence_by_hash_v2(text)
  FROM lana_gate_e_evidence_writer, lana_gate_e_evidence_reader;
REVOKE EXECUTE ON FUNCTION lana_gate_e_append_evidence_v2(
  text, text, text, text, text, text, text, text, timestamptz
) FROM lana_gate_e_evidence_writer;

DROP FUNCTION IF EXISTS lana_gate_e_read_evidence_by_hash_v2(text);
DROP FUNCTION IF EXISTS lana_gate_e_append_evidence_v2(
  text, text, text, text, text, text, text, text, timestamptz
);
DROP FUNCTION IF EXISTS lana_gate_e_has_sensitive_key_v2(jsonb);
DROP FUNCTION IF EXISTS lana_gate_e_has_exact_keys_v2(jsonb, text[]);
DROP TABLE IF EXISTS gate_e_evidence_admissions_v2;
DROP TABLE IF EXISTS gate_e_evidence_records_v2;
DROP FUNCTION IF EXISTS lana_finalize_gate_e_evidence_admission_v2();
DROP FUNCTION IF EXISTS lana_guard_gate_e_evidence_append_only_v2();
DROP ROLE IF EXISTS lana_gate_e_evidence_writer;
DROP ROLE IF EXISTS lana_gate_e_evidence_reader;
