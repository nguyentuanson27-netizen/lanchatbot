import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../migrations/0033_df_readiness_observability.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../migrations/0033_df_readiness_observability.down.sql",
  import.meta.url,
);

describe("0033 canonical DF readiness observability migration", () => {
  it("projects canonical READY and BLOCKED outcomes without exposing raw metadata", async () => {
    const sql = await readFile(migration, "utf8");

    expect(sql).toContain("CREATE OR REPLACE VIEW admin_conversation_events_v");
    expect(sql).toMatch(
      /readiness,outcome[\s\S]*?'NOT_EVALUATED'[\s\S]*?'LEGACY_READY'[\s\S]*?'LEGACY_NOT_READY'[\s\S]*?'READY'[\s\S]*?'BLOCKED'[\s\S]*?END AS readiness_outcome/iu,
    );
    expect(sql).not.toContain("event_metadata AS");
    expect(sql).not.toMatch(/raw_(?:text|payload)|provider_payload/iu);
    expect(sql).not.toMatch(
      /\b(?:UPDATE|DELETE|INSERT|ALTER)\s+(?:TABLE\s+)?conversation_events\b/iu,
    );
  });

  it("restores the DF-P1 readiness projection on rollback", async () => {
    const sql = await readFile(rollback, "utf8");

    expect(sql).toContain("CREATE OR REPLACE VIEW admin_conversation_events_v");
    expect(sql).toMatch(
      /readiness,outcome[\s\S]*?'NOT_EVALUATED'[\s\S]*?'LEGACY_READY'[\s\S]*?'LEGACY_NOT_READY'[\s\S]*?END AS readiness_outcome/iu,
    );
    expect(sql).not.toMatch(
      /readiness,outcome[\s\S]*?'LEGACY_NOT_READY'[\s\S]*?'READY'[\s\S]*?END AS readiness_outcome/iu,
    );
  });
});
