-- Reverses 0017_dataset_review. Destructive: drops all dataset-review tables and
-- their encrypted raw payloads. Only run under change approval after confirming
-- no locked holdout or in-flight annotation work must be preserved.

DROP VIEW IF EXISTS dataset_disagreements_v;
DROP TABLE IF EXISTS dataset_exports;
DROP TABLE IF EXISTS dataset_prelabel_run_items;
DROP TABLE IF EXISTS dataset_prelabel_runs;
DROP TABLE IF EXISTS dataset_review_events;
DROP TABLE IF EXISTS dataset_annotations;
DROP TABLE IF EXISTS dataset_project_items;
DROP TABLE IF EXISTS dataset_annotation_projects;
DROP TABLE IF EXISTS dataset_label_schemas;
DROP TABLE IF EXISTS dataset_messages;
DROP TABLE IF EXISTS dataset_conversations;
DROP TABLE IF EXISTS dataset_raw_items;
DROP TABLE IF EXISTS dataset_review_datasets;
