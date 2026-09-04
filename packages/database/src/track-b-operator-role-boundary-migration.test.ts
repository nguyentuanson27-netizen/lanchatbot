import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const up = new URL("../pending-migrations/0040_track_b_operator_role_boundary.up.sql", import.meta.url);
const down = new URL("../pending-migrations/0040_track_b_operator_role_boundary.down.sql", import.meta.url);
const activeMigrations = new URL("../migrations/", import.meta.url);
const operator = new URL("../../../deploy/track-b-0040-preprod-operator.sh", import.meta.url);

describe("0040 Track B operator role boundary", () => {
  it("remains pending and grants only the reviewed operator surface", async () => {
    const [sql, active] = await Promise.all([readFile(up, "utf8"), readdir(activeMigrations)]);
    expect(active).not.toContain("0040_track_b_operator_role_boundary.up.sql");
    expect(createHash("sha256").update(sql).digest("hex")).toMatch(/^[a-f0-9]{64}$/u);
    expect(sql).toContain("0040 requires exact applied 0039");
    expect(sql).toContain("0040 requires exact NOLOGIN operator role");
    expect(sql).toContain("GRANT CONNECT ON DATABASE");
    expect(sql).toContain("GRANT SELECT (page_id, status) ON webhook_inbox, meta_outbox, pancake_tag_outbox");
    expect(sql).toContain("AS RESTRICTIVE TO lana_track_b_authority_operator");
    expect(sql).toContain("page_id='1198992073286645' AND channel='MESSENGER'");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = pg_catalog");
    expect(sql).toContain("TRACK_B_OPERATOR_CAS_NOT_QUIESCENT");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION track_b_operator_cas_pointer");
    expect(sql).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE|TRUNCATE)\s+ON/iu);
    expect(sql).not.toMatch(/GRANT\s+(?:ALL|CREATE|TRUNCATE|DELETE)/iu);
    expect(sql).not.toMatch(/ALTER ROLE lana_track_b_authority_operator (?:SUPERUSER|CREATEDB|CREATEROLE|BYPASSRLS)/iu);
  });

  it("refuses rollback while a fence or login credential exists", async () => {
    const sql = await readFile(down, "utf8");
    expect(createHash("sha256").update(sql).digest("hex")).toMatch(/^[a-f0-9]{64}$/u);
    expect(sql).toContain("0040 down requires zero unreleased cutover fences");
    expect(sql).toContain("0040 down requires deprovisioned NOLOGIN operator role");
    expect(sql).toContain("REVOKE CONNECT ON DATABASE");
    expect(sql).not.toMatch(/DROP ROLE|DROP OWNED/iu);
  });

  it("probes through the reviewed endpoint resolver and only granted pointer relations", async () => {
    const source = await readFile(operator, "utf8");
    expect(source).toContain("resolveTrackBPreprodDatabaseUrl(value,inspected)");
    expect(source).toContain("pnpm --filter @lana/worker build");
    expect(source).toContain("cd \"$SOURCE_ROOT/packages/database\"");
    expect(source).toContain("pathToFileURL(process.env.TRACK_B_RESOLVER_FILE).href");
    expect(source).not.toContain("pathToFileURL(process.argv[1]).href");
    expect(source).toContain("FROM runtime_behavior_mode_pointers p JOIN runtime_behavior_mode_versions v");
    expect(source).not.toContain("AS pages FROM pages");
    expect(source).not.toMatch(/docker\s+inspect.*password|process\.argv.*password/iu);
  });
});
