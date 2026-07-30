import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = resolve(
  import.meta.dirname,
  "../migrations/0025_admin_frontend_operations.up.sql",
);

describe("admin frontend operations migration", () => {
  it("adds optimistic SLA handoff state and an append-only transition ledger", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS sla_due_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS revision");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS handoff_case_events");
    expect(sql).toContain("handoff_case_events_actor_idempotency_uk");
    expect(sql).toContain("handoff_case_events is append-only");
    expect(sql).toContain("WITH (security_barrier = true)");
    expect(sql).toContain("GRANT UPDATE (");
  });

  it("keeps raw messages and provider identities outside the projection", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("message.dlp_status = 'PASSED'");
    expect(sql).not.toMatch(/(?:raw_text|customer_id|provider_message_id)\s+/iu);
    expect(sql).not.toMatch(/(?:payload|ciphertext|token)\s+(?:text|jsonb|bytea)/iu);
  });
});
