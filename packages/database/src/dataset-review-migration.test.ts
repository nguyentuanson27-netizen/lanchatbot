import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directory = resolve(import.meta.dirname, "../migrations");

describe("0021_dataset_review migration", () => {
  it("creates every dataset-review table", async () => {
    const sql = await readFile(resolve(directory, "0021_dataset_review.up.sql"), "utf8");
    for (const table of [
      "dataset_review_datasets",
      "dataset_raw_items",
      "dataset_conversations",
      "dataset_messages",
      "dataset_label_schemas",
      "dataset_annotation_projects",
      "dataset_project_items",
      "dataset_annotations",
      "dataset_review_events",
      "dataset_prelabel_runs",
      "dataset_prelabel_run_items",
      "dataset_exports",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("stores immutable raw payloads as an encrypted envelope, never plaintext", async () => {
    const sql = await readFile(resolve(directory, "0021_dataset_review.up.sql"), "utf8");
    expect(sql).toContain("raw_payload_ciphertext bytea");
    expect(sql).toContain("raw_text_ciphertext bytea");
    // Reviewer-facing projection is a separate redacted column.
    expect(sql).toContain("redacted_text text NOT NULL");
  });

  it("enforces idempotent import via checksum uniqueness", async () => {
    const sql = await readFile(resolve(directory, "0021_dataset_review.up.sql"), "utf8");
    expect(sql).toContain("dataset_review_datasets_checksum_uk UNIQUE (source_checksum)");
    expect(sql).toContain("dataset_raw_items_key_uk UNIQUE (dataset_id, source_key_hash)");
    expect(sql).toContain(
      "dataset_prelabel_run_items_uk UNIQUE (prelabel_run_id, project_item_id, input_checksum)",
    );
  });

  it("keeps splits, optimistic locking and a disagreement projection schema-ready", async () => {
    const sql = await readFile(resolve(directory, "0021_dataset_review.up.sql"), "utf8");
    expect(sql).toContain("split text NOT NULL DEFAULT 'DEVELOPMENT'");
    expect(sql).toContain("lease_owner text");
    expect(sql).toContain("revision integer NOT NULL DEFAULT 0");
    expect(sql).toContain("CREATE OR REPLACE VIEW dataset_disagreements_v");
  });

  it("has a matching down migration that drops the view and tables", async () => {
    const sql = await readFile(resolve(directory, "0021_dataset_review.down.sql"), "utf8");
    expect(sql).toContain("DROP VIEW IF EXISTS dataset_disagreements_v");
    expect(sql).toContain("DROP TABLE IF EXISTS dataset_review_datasets");
  });
});
