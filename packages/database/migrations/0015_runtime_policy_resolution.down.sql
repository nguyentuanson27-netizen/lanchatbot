DROP TRIGGER IF EXISTS runtime_policy_resolution_audit_no_mutation
  ON runtime_policy_resolution_audit;
DROP FUNCTION IF EXISTS prevent_runtime_policy_resolution_audit_mutation();
DROP TABLE IF EXISTS runtime_policy_resolution_audit;
DROP TRIGGER IF EXISTS runtime_policy_pins_no_mutation ON runtime_policy_pins;
DROP FUNCTION IF EXISTS prevent_runtime_policy_pin_mutation();
DROP TABLE IF EXISTS runtime_policy_pins;
