import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directory = resolve(import.meta.dirname, "../migrations");

describe("0022_dataset_review_acl migration", () => {
  it("keeps the Admin read role read-only and limited to redacted projections", async () => {
    const sql = await readFile(resolve(directory, "0022_dataset_review_acl.up.sql"), "utf8");
    expect(sql).toContain("GRANT SELECT ON");
    expect(sql).toContain("dataset_review_datasets");
    expect(sql).toContain("dataset_conversations");
    expect(sql).toContain("dataset_messages");
    expect(sql).toContain("TO lana_admin_readonly");
    expect(sql).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE)[\s\S]*TO lana_admin_readonly/);
    expect(sql).not.toMatch(/dataset_raw_items[\s\S]*TO lana_admin_readonly/);
  });

  it("grants review writes only to the scoped control API role", async () => {
    const sql = await readFile(resolve(directory, "0022_dataset_review_acl.up.sql"), "utf8");
    expect(sql).toContain("TO lana_admin_control_api");
    expect(sql).toContain("dataset_annotation_projects");
    expect(sql).toContain("dataset_project_items");
    expect(sql).toContain("dataset_annotations");
    expect(sql).toContain("dataset_review_events");
    expect(sql).not.toMatch(/dataset_raw_items[\s\S]*TO lana_admin_control_api/);
  });

  it("provides a reversible ACL-only down migration", async () => {
    const sql = await readFile(resolve(directory, "0022_dataset_review_acl.down.sql"), "utf8");
    expect(sql).toContain("REVOKE SELECT ON");
    expect(sql).toContain("FROM lana_admin_readonly");
    expect(sql).toContain("REVOKE ALL PRIVILEGES ON");
    expect(sql).toContain("FROM lana_admin_control_api");
  });
});
