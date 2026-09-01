import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const up = new URL(
  "../pending-migrations/0038_track_b_commerce_admission_gate.up.sql",
  import.meta.url,
);
const down = new URL(
  "../pending-migrations/0038_track_b_commerce_admission_gate.down.sql",
  import.meta.url,
);
const activeMigrations = new URL("../migrations/", import.meta.url);

describe("0038 Track B Commerce admission gate", () => {
  it("remains pending and atomically guards every reachable authority-dependent claim", async () => {
    const [sql, active] = await Promise.all([readFile(up, "utf8"), readdir(activeMigrations)]);

    expect(active).not.toContain("0038_track_b_commerce_admission_gate.up.sql");
    expect(sql).toContain("Applying it requires separate owner authorization");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("df13-cutover-admission-migration");
    expect(sql).toContain("0036_df13_commerce_authority_fence");
    expect(sql).toContain("d709617e10554a0186b9233a404ef7faadfdf3576ba3c133efe51a56c2214425");
    expect(sql).toContain("0037_track_b_commerce_authority_replacement");
    expect(sql).toContain("40b1ef14e3f7b2e037063de1f8d8ff7f804d069f8649115be6c29b1b56399c20");
    expect(sql).toContain("c72ab14e75111ce7f216e516a6f2edc86cfd4bf53d50d9c2359d064f20bdd4e3");
    expect(sql).toContain("df13-cutover:");
    expect(sql).toContain("released_at IS NULL");
    expect(sql).not.toContain("lease_until >");
    expect(sql).toContain("WHEN 'webhook_inbox' THEN 'PROCESSING'");
    expect(sql).toContain("WHEN 'meta_outbox' THEN 'SENDING'");
    expect(sql).toContain("WHEN 'pancake_tag_outbox' THEN 'APPLYING'");
    expect(sql).toContain("NEW.lease_token IS DISTINCT FROM OLD.lease_token");
    expect(sql).toContain("SET search_path = pg_catalog");
    expect(sql).toContain("WHERE c.oid = TG_RELID");
    expect(sql).toContain("%I.df13_commerce_cutover_fences");
    expect(sql).toContain("RETURN NULL");
    expect(sql).toContain("ON webhook_inbox");
    expect(sql).toContain("ON meta_outbox");
    expect(sql).toContain("ON pancake_tag_outbox");
    expect(sql.match(/ENABLE ALWAYS TRIGGER/gu)).toHaveLength(3);
    expect(sql).not.toMatch(/DELETE\s+FROM|TRUNCATE|UPDATE\s+runtime_behavior_mode_pointers/iu);
  });

  it("refuses down while any cutover fence remains unreleased", async () => {
    const sql = await readFile(down, "utf8");

    expect(sql).toContain("WHERE released_at IS NULL");
    expect(sql).toContain("df13-cutover-admission-migration");
    expect(sql).toContain("0038 down requires zero unreleased cutover fences");
    expect(sql).not.toMatch(/WHERE\s+page_id\s*=/iu);
    expect(sql).toContain("DROP TRIGGER IF EXISTS track_b_cutover_admission_webhook_inbox");
    expect(sql).toContain("DROP TRIGGER IF EXISTS track_b_cutover_admission_meta_outbox");
    expect(sql).toContain("DROP TRIGGER IF EXISTS track_b_cutover_admission_pancake_tag_outbox");
    expect(sql).toContain("DROP FUNCTION IF EXISTS guard_track_b_cutover_admission()");
    expect(sql).not.toMatch(/DELETE\s+FROM|TRUNCATE|DROP\s+TABLE/iu);
  });
});
