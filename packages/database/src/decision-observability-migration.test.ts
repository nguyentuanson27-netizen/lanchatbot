import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../migrations/0032_df_p1_decision_observability.up.sql",
  import.meta.url,
);
const rollback = new URL(
  "../migrations/0032_df_p1_decision_observability.down.sql",
  import.meta.url,
);

describe("0032 DF-P1 decision observability migration", () => {
  it("adds only bounded PII-safe projections without rewriting partitioned history", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("CREATE OR REPLACE VIEW admin_conversation_events_v");
    for (const column of [
      "decision_observability_schema_version",
      "dialogue_evidence_codes",
      "buying_intent_decision",
      "protected_claim_validation_outcome",
      "readiness_outcome",
      "phase_observed",
      "barrier_observed",
      "context_version_observed",
      "strategy_observed",
      "cta_observed",
      "reconciliation_outcome",
      "guard_outcome_observed",
      "side_effect_plan_disposition",
    ]) expect(sql).toContain(column);
    expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|INSERT|ALTER)\s+(?:TABLE\s+)?conversation_events\b/iu);
    expect(sql).not.toContain("customer_hash");
    expect(sql).not.toContain("event_metadata AS");
    expect(sql).not.toMatch(/raw_(?:text|payload)|provider_payload/iu);
    expect(sql).not.toMatch(/GRANT\s+.*\s+TO\s+PUBLIC/iu);
  });

  it("restores the previous view while preserving owner and grants", async () => {
    const sql = await readFile(rollback, "utf8");
    expect(sql).toContain("migration_0032_admin_events_acl");
    expect(sql).toContain("migration_0032_admin_events_owner");
    expect(sql).toContain("DROP VIEW admin_conversation_events_v");
    expect(sql).toContain("GRANT %s ON TABLE admin_conversation_events_v");
    expect(sql).toContain("ALTER VIEW admin_conversation_events_v OWNER TO");
    expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|INSERT|ALTER)\s+(?:TABLE\s+)?conversation_events\b/iu);
  });
});
