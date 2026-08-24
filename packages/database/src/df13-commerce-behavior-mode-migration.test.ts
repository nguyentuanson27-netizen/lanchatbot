import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../pending-migrations/0035_df13_commerce_behavior_mode.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../pending-migrations/0035_df13_commerce_behavior_mode.down.sql",
  import.meta.url,
);
const activeMigrations = new URL("../migrations/", import.meta.url);

describe("0035 DF13 Commerce behavior-mode source migration", () => {
  it("remains a pending source artifact rather than an auto-discovered migration", async () => {
    const activeMigrationNames = await readdir(activeMigrations);
    expect(activeMigrationNames).not.toContain("0035_df13_commerce_behavior_mode.up.sql");
    await expect(readFile(migration, "utf8")).resolves.toContain("authority_bundle_hash");
  });

  it("binds COMMERCE authority identity into immutable version content without enabling UR state reads", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("authority_bundle_hash");
    expect(sql).toContain("sales_authority_mode IN ('LEGACY', 'COMMERCE')");
    expect(sql).toContain("state_read_mode = 'LEGACY'");
    expect(sql).toContain("COMMERCE authority bundle hash is required");
    expect(sql).not.toContain("'SHADOW'");
    expect(sql).not.toContain("state_read_mode IN");
  });

  it("rejects a missing COMMERCE authority bundle instead of accepting SQL CHECK unknown", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).toContain("authority_bundle_hash IS NOT NULL");
  });

  it("has a data-preserving rollback guard rather than silently discarding COMMERCE versions", async () => {
    const sql = await readFile(rollback, "utf8");
    expect(sql).toContain("DF13_COMMERCE_VERSION_ROLLBACK_BLOCKED");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });
});
