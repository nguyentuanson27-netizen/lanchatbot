import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../migrations/0035_df13_commerce_behavior_mode.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../migrations/0035_df13_commerce_behavior_mode.down.sql",
  import.meta.url,
);

describe("0035 DF13 Commerce behavior-mode source migration", () => {
  it("binds COMMERCE authority identity into immutable version content without enabling UR state reads", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("authority_bundle_hash");
    expect(sql).toContain("sales_authority_mode IN ('LEGACY', 'COMMERCE')");
    expect(sql).toContain("state_read_mode = 'LEGACY'");
    expect(sql).toContain("COMMERCE authority bundle hash is required");
    expect(sql).not.toContain("'SHADOW'");
    expect(sql).not.toContain("state_read_mode IN");
  });

  it("has a data-preserving rollback guard rather than silently discarding COMMERCE versions", async () => {
    const sql = await readFile(rollback, "utf8");
    expect(sql).toContain("DF13_COMMERCE_VERSION_ROLLBACK_BLOCKED");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });
});
