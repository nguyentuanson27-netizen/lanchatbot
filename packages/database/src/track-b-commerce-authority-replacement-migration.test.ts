import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const up = new URL(
  "../pending-migrations/0037_track_b_commerce_authority_replacement.up.sql",
  import.meta.url,
);
const down = new URL(
  "../pending-migrations/0037_track_b_commerce_authority_replacement.down.sql",
  import.meta.url,
);
const activeMigrations = new URL("../migrations/", import.meta.url);

const v1 = "e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c";
const v2 = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";

describe("0037 Track B Commerce authority replacement guard", () => {
  it("remains pending and admits only first cutover, exact V1-to-V2, or exact V2-to-V1", async () => {
    const [sql, active] = await Promise.all([readFile(up, "utf8"), readdir(activeMigrations)]);

    expect(active).not.toContain("0037_track_b_commerce_authority_replacement.up.sql");
    expect(sql).toContain("Applying it requires separate owner");
    expect(sql).toContain(v1);
    expect(sql).toContain(v2);
    expect(sql).toContain("pre_version.sales_authority_mode = 'LEGACY'");
    expect(sql).toContain("pre_version.sales_authority_mode = 'COMMERCE'");
    expect(sql).toContain("target_version.authority_bundle_hash = v2_bundle");
    expect(sql).toContain("target_version.authority_bundle_hash = v1_bundle");
    expect(sql.match(/NEW\.page_id = '1198992073286645'/gu)).toHaveLength(2);
    expect(sql.match(/NEW\.channel = 'MESSENGER'/gu)).toHaveLength(2);
    expect(sql).toContain("df13 commerce cutover fence authority transition is invalid");
    expect(sql).not.toContain("UPDATE runtime_behavior_mode_pointers");
    expect(sql).not.toMatch(/DELETE\s+FROM|TRUNCATE/iu);
  });

  it("restores the exact legacy-only 0036 guard without deleting durable evidence", async () => {
    const sql = await readFile(down, "utf8");

    expect(sql).toContain("pre_version.sales_authority_mode <> 'LEGACY'");
    expect(sql).toContain("pre_version.authority_bundle_hash IS NOT NULL");
    expect(sql).not.toContain(v2);
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toMatch(/DELETE\s+FROM|TRUNCATE/iu);
  });
});
