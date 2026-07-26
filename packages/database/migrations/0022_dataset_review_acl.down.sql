DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    REVOKE SELECT ON
      dataset_review_datasets,
      dataset_conversations,
      dataset_messages
    FROM lana_admin_readonly;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    REVOKE ALL PRIVILEGES ON
      dataset_label_schemas,
      dataset_annotation_projects,
      dataset_conversations,
      dataset_messages,
      dataset_project_items,
      dataset_annotations,
      dataset_review_events
    FROM lana_admin_control_api;
  END IF;
END
$$;
