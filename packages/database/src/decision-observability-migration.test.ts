import { readFile } from "node:fs/promises";
import { DECISION_DIALOGUE_EVIDENCE_CODES_V1 } from "@lana/contracts";
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

  it("projects only registered dialogue evidence codes and rejects PII-shaped or unknown values", async () => {
    const sql = await readFile(migration, "utf8");
    const dialogueProjection = sql.match(
      /jsonb_array_elements_text\([\s\S]*?decisionObservability,dialogueEvidence,codes[\s\S]*?WITH ORDINALITY AS dialogue_code\(code, ordinality\)([\s\S]*?)ORDER BY ordinality\s+LIMIT 16/iu,
    )?.[1];
    const projectedAllowlist = [
      ...(dialogueProjection?.matchAll(/'([A-Z][A-Z0-9_.:-]{0,127})'/gu) ?? []),
    ].map((match) => match[1]);

    expect(dialogueProjection).toBeDefined();
    expect(projectedAllowlist).toEqual([
      ...DECISION_DIALOGUE_EVIDENCE_CODES_V1,
    ]);
    expect(dialogueProjection).not.toMatch(/code\s*~/u);

    const storedCodes = [
      "PHONE_0900000000",
      DECISION_DIALOGUE_EVIDENCE_CODES_V1[0],
      "UNKNOWN_CODE",
      ...DECISION_DIALOGUE_EVIDENCE_CODES_V1.slice(1),
    ];
    const adminProjection = storedCodes
      .filter((code) => projectedAllowlist.includes(code))
      .slice(0, 16);

    expect(adminProjection).toEqual(
      DECISION_DIALOGUE_EVIDENCE_CODES_V1.slice(0, 16),
    );
    expect(adminProjection).not.toContain("PHONE_0900000000");
    expect(adminProjection).not.toContain("UNKNOWN_CODE");
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
