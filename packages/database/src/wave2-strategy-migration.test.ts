import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../migrations/0023_wave2_strategy_metrics.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../migrations/0023_wave2_strategy_metrics.down.sql",
  import.meta.url,
);

describe("0023 Wave 2 strategy metrics migration", () => {
  it("exposes only bounded strategy dimensions through the Admin view", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("CREATE OR REPLACE VIEW admin_conversation_events_v");
    expect(sql).toContain("wave2_need");
    expect(sql).toContain("wave2_barrier");
    expect(sql).toContain("wave2_strategy");
    expect(sql).not.toContain("customer_hash");
    expect(sql).not.toContain("event_metadata AS");
  });

  it("restores the previous Admin view without deleting event data", async () => {
    const sql = await readFile(rollback, "utf8");
    expect(sql).toContain("CREATE OR REPLACE VIEW admin_conversation_events_v");
    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toContain("DELETE FROM");
  });
});
