import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../pending-migrations/0036_df13_commerce_authority_fence.up.sql",
  import.meta.url,
);

const rollback = new URL(
  "../pending-migrations/0036_df13_commerce_authority_fence.down.sql",
  import.meta.url,
);

describe("0036 DF13 Commerce cutover fence", () => {
  it("adds a page-scoped durable cutover fence without making a generic COMMERCE writer", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS df13_commerce_cutover_fences");
    expect(sql).toContain("df13_commerce_cutover_fences_live_scope_uk");
    expect(sql).toContain("operation_id uuid NOT NULL UNIQUE");
    expect(sql).toContain("pre_cutover_version_id uuid NOT NULL");
    expect(sql).toContain("pre_cutover_content_hash text NOT NULL");
    expect(sql).toContain("target_version_id uuid NOT NULL");
    expect(sql).toContain("target_content_hash text NOT NULL");
    expect(sql).toContain("target_authority_bundle_hash char(64) NOT NULL");
    expect(sql).toContain("token_hash char(64)");
    expect(sql).toContain("lease_until timestamptz");
    expect(sql).toContain("released_at timestamptz");
    expect(sql).toContain("df13_commerce_cutover_fence_identity_guard");
    expect(sql).toContain("df13_commerce_cutover_fence_insert_identity_guard");
    expect(sql).toContain("runtime_behavior_mode_pointers");
    expect(sql).toContain("runtime_behavior_mode_versions");
    expect(sql).toContain("df13 commerce cutover fence identity is immutable");
    expect(sql).not.toContain("UPDATE runtime_behavior_mode_pointers");
    expect(sql).not.toMatch(/customer_(?:name|phone|address)|payload_ciphertext/iu);
  });

  it("removes only the pending fence artifacts in reverse dependency order", async () => {
    const sql = await readFile(rollback, "utf8");
    const cutover = sql.indexOf("DROP TABLE IF EXISTS df13_commerce_cutover_fences");
    const claims = sql.indexOf("DROP TABLE IF EXISTS df13_commerce_authority_fence_claims");
    const workFences = sql.indexOf("DROP TABLE IF EXISTS df13_commerce_authority_fences");

    expect(cutover).toBeGreaterThanOrEqual(0);
    expect(cutover).toBeLessThan(claims);
    expect(claims).toBeLessThan(workFences);
    expect(sql).toContain("DROP TRIGGER IF EXISTS df13_commerce_cutover_fence_insert_identity_guard");
    expect(sql).toContain("DROP FUNCTION IF EXISTS guard_df13_commerce_cutover_fence_insert_identity()");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });
});
