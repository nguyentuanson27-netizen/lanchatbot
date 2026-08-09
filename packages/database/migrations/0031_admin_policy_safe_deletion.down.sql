DROP TRIGGER IF EXISTS admin_active_pointers_deleted_version_guard ON admin_active_pointers;
DROP FUNCTION IF EXISTS prevent_deleted_artifact_activation();
DROP TRIGGER IF EXISTS admin_artifact_deletions_no_mutation ON admin_artifact_deletions;
DROP FUNCTION IF EXISTS prevent_admin_artifact_deletion_mutation();
DROP TABLE IF EXISTS admin_artifact_deletions;
