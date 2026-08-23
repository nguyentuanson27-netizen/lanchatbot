import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../pending-migrations/0036_df13_commerce_authority_fence.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../pending-migrations/0036_df13_commerce_authority_fence.down.sql",
  import.meta.url,
);
const activeMigrations = new URL("../migrations/", import.meta.url);

describe("0036 DF13 Commerce authority fence source migration", () => {
  it("remains an unapplied source artifact rather than an auto-discovered migration", async () => {
    const activeMigrationNames = await readdir(activeMigrations);
    expect(activeMigrationNames).not.toContain("0036_df13_commerce_authority_fence.up.sql");
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("outside the active");
    expect(sql).toContain("does not activate");
  });

  it("defines full-batch live claims bound to the immutable COMMERCE identity", async () => {
    const sql = await readFile(migration, "utf8");
    for (const field of [
      "request_fingerprint",
      "sales_authority_mode",
      "state_read_mode",
      "content_hash",
      "pointer_revision",
      "authority_bundle_hash",
      "authority_source",
      "token_hash",
      "epoch",
    ]) expect(sql).toContain(field);
    expect(sql).toContain("df13_commerce_authority_fence_claims_live_inbox_uq");
    expect(sql).toContain("WHERE released_at IS NULL");
    expect(sql).toContain("sales_authority_mode = 'COMMERCE' AND state_read_mode = 'LEGACY'");
    expect(sql).not.toContain("UPDATE webhook_inbox");
    expect(sql).not.toContain("meta_outbox");
  });

  it("blocks a data-erasing rollback instead of deleting durable fence evidence", async () => {
    const sql = await readFile(rollback, "utf8");
    expect(sql).toContain("DF13_COMMERCE_FENCE_ROLLBACK_BLOCKED");
    expect(sql).not.toContain("DELETE FROM");
    expect(sql).not.toContain("TRUNCATE");
  });
});
