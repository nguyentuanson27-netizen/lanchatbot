import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../migrations/0030_runtime_behavior_modes.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../migrations/0030_runtime_behavior_modes.down.sql",
  import.meta.url,
);

describe("0030 runtime behavior mode control plane", () => {
  it("creates immutable versions, a CAS pointer, and mandatory append-only audit", async () => {
    const sql = await readFile(migration, "utf8");
    for (const table of [
      "runtime_behavior_mode_versions",
      "runtime_behavior_mode_pointers",
      "runtime_behavior_mode_activation_audit",
      "runtime_behavior_mode_resolution_audit",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql).toContain("runtime_behavior_mode_versions are immutable");
    expect(sql).toContain("NEW.pointer_revision <> OLD.pointer_revision + 1");
    expect(sql).toContain("runtime_behavior_mode_pointer_activation_audit");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("runtime behavior mode audit is append-only");
  });

  it("keeps non-confirmation tracks LEGACY and applies least privilege", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("CHECK (sales_authority_mode = 'LEGACY')");
    expect(sql).toContain("CHECK (state_read_mode = 'LEGACY')");
    expect(sql).toContain("REVOKE ALL ON runtime_behavior_mode_versions");
    expect(sql).toContain("lana_runtime_behavior_reader");
    expect(sql).toContain("lana_admin_control_api");
    expect(sql).not.toContain("GRANT SELECT, INSERT ON runtime_behavior_mode_activation_audit");
    expect(sql).not.toMatch(/customer_(?:name|phone|address)|payload_ciphertext/iu);
  });

  it("has a restore-compatible reverse-order rollback with no unrelated mutation", async () => {
    const sql = await readFile(rollback, "utf8");
    const resolution = sql.indexOf("DROP TABLE IF EXISTS runtime_behavior_mode_resolution_audit");
    const activation = sql.indexOf("DROP TABLE IF EXISTS runtime_behavior_mode_activation_audit");
    const pointer = sql.indexOf("DROP TABLE IF EXISTS runtime_behavior_mode_pointers");
    const versions = sql.indexOf("DROP TABLE IF EXISTS runtime_behavior_mode_versions");
    expect(resolution).toBeGreaterThanOrEqual(0);
    expect(resolution).toBeLessThan(activation);
    expect(activation).toBeLessThan(pointer);
    expect(pointer).toBeLessThan(versions);
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });
});
