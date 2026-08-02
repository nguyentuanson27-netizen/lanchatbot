DROP TRIGGER IF EXISTS runtime_behavior_mode_resolution_audit_no_mutation
  ON runtime_behavior_mode_resolution_audit;
DROP TRIGGER IF EXISTS runtime_behavior_mode_activation_audit_no_mutation
  ON runtime_behavior_mode_activation_audit;
DROP FUNCTION IF EXISTS prevent_runtime_behavior_mode_audit_mutation();
DROP TABLE IF EXISTS runtime_behavior_mode_resolution_audit;
DROP TRIGGER IF EXISTS runtime_behavior_mode_pointer_activation_audit
  ON runtime_behavior_mode_pointers;
DROP FUNCTION IF EXISTS audit_runtime_behavior_mode_pointer_activation();
DROP TABLE IF EXISTS runtime_behavior_mode_activation_audit;
DROP TRIGGER IF EXISTS runtime_behavior_mode_pointer_guard
  ON runtime_behavior_mode_pointers;
DROP FUNCTION IF EXISTS guard_runtime_behavior_mode_pointer();
DROP TABLE IF EXISTS runtime_behavior_mode_pointers;
DROP TRIGGER IF EXISTS runtime_behavior_mode_versions_no_mutation
  ON runtime_behavior_mode_versions;
DROP FUNCTION IF EXISTS prevent_runtime_behavior_mode_version_mutation();
DROP TABLE IF EXISTS runtime_behavior_mode_versions;
