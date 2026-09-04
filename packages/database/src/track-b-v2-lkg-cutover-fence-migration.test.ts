import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const up = new URL(
  "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.up.sql",
  import.meta.url,
);
const down = new URL(
  "../pending-migrations/0039_track_b_v2_lkg_cutover_fence.down.sql",
  import.meta.url,
);
const activeMigrations = new URL("../migrations/", import.meta.url);

const v1 = "e423f3f647dce25cd74501555b73fc69cf66e4138fbfdda6b7e9c471fe89a05c";
const v2 = "56b94f7a2e07e80fe8b2983a75b46caa78c2d48f3bd4081d4a88d8f40d2325b8";
const upHash = "f9bb37c95ba77b6947958442cc223f5f4583d43cba4591de5abfaed002e068ca";
const downHash = "191e1846a549d99d4c6d4a804fc0148b0458f0fda6944a04e20d48286f7e7301";
const guardSourceHash = "28ec7165520b614e7a40ac2e80fc781ec6fdeef2ae08b3fd82ff995e20c73ddc";

describe("0039 Track B V2 LKG cutover fence", () => {
  it("remains pending and admits only page-scoped same-identity V2 service cutovers", async () => {
    const [sql, active] = await Promise.all([readFile(up, "utf8"), readdir(activeMigrations)]);

    expect(active).not.toContain("0039_track_b_v2_lkg_cutover_fence.up.sql");
    expect(createHash("sha256").update(sql, "utf8").digest("hex")).toBe(upHash);
    expect(sql).toContain("requires separate owner authorization");
    expect(sql).toContain("0036_df13_commerce_authority_fence");
    expect(sql).toContain("0037_track_b_commerce_authority_replacement");
    expect(sql).toContain("0038_track_b_commerce_admission_gate");
    expect(sql).toContain("0039 up requires zero unreleased cutover fences");
    expect(sql).toContain(v1);
    expect(sql).toContain(v2);
    expect(sql).toContain("NEW.pre_cutover_version_id = NEW.target_version_id");
    expect(sql).toContain("NEW.pre_cutover_content_hash = NEW.target_content_hash");
    expect(sql).toContain("pre_version.confirmation_mode = 'V2_ACTIVE'");
    expect(sql).toContain("page-scoped V2-to-same-identity-V2 LKG service cutover guard");
    expect(sql).toContain("never moves a pointer or permits V1 rollback");
    expect(sql).not.toMatch(/UPDATE\s+runtime_behavior_mode_pointers|DELETE\s+FROM|TRUNCATE/iu);
  });

  it("refuses down with any unreleased fence or a non-canonical current guard", async () => {
    const sql = await readFile(down, "utf8");

    expect(createHash("sha256").update(sql, "utf8").digest("hex")).toBe(downHash);
    expect(sql).toContain("df13-cutover-v2-lkg-migration");
    expect(sql).toContain("WHERE released_at IS NULL");
    expect(sql).toContain("0039 down requires zero unreleased cutover fences");
    expect(sql).toContain(guardSourceHash);
    expect(sql).toContain("0039 down requires exact 0039 V2 LKG guard identity");
    expect(sql).toContain("target_version.authority_bundle_hash = v1_bundle");
    expect(sql).not.toMatch(/UPDATE\s+runtime_behavior_mode_pointers|DELETE\s+FROM|TRUNCATE/iu);
  });
});
