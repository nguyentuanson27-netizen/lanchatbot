-- Dataset Review uses two existing least-privilege Admin roles:
--   lana_admin_readonly     reads redacted dataset projections.
--   lana_admin_control_api  manages projects, leases, labels and audit events.
-- Raw encrypted intake is intentionally not granted to either role.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    GRANT SELECT ON
      dataset_review_datasets,
      dataset_conversations,
      dataset_messages
    TO lana_admin_readonly;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT ON
      dataset_label_schemas,
      dataset_annotation_projects,
      dataset_conversations,
      dataset_messages,
      dataset_project_items,
      dataset_annotations,
      dataset_review_events
    TO lana_admin_control_api;

    GRANT INSERT, UPDATE ON
      dataset_label_schemas,
      dataset_annotation_projects,
      dataset_project_items,
      dataset_annotations
    TO lana_admin_control_api;

    GRANT INSERT ON dataset_review_events TO lana_admin_control_api;
  END IF;
END
$$;
