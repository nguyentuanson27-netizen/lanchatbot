import { describe, expect, it } from "vitest";
import { PostgresSimulationStore } from "./postgres-store.js";

describe("PostgresSimulationStore safety", () => {
  it("claims with skip-locked leases and recovers expired max-attempt claims", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("RETURNING run.simulation_id")) {
          return { rowCount: 1, rows: [{
            simulation_id: "11111111-1111-4111-8111-111111111111",
            lease_token: "22222222-2222-4222-8222-222222222222",
            page_id: "1198992073286645",
            version_ids: ["33333333-3333-4333-8333-333333333333"],
            baseline_version_ids: [],
            baseline_source: "UNRESOLVED",
            lookback_days: 30,
            max_conversations: 100,
            attempt_count: 1,
            side_effects: "DISABLED",
          }] };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresSimulationStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const claimed = await store.claim("worker-1", 60_000, 3);
    expect(claimed?.sideEffects).toBe("DISABLED");
    expect(calls.join("\n")).toContain("FOR UPDATE SKIP LOCKED");
    expect(calls.join("\n")).toContain("SIMULATION_LEASE_EXPIRED_MAX_ATTEMPTS");
    expect(calls.join("\n")).toContain("lease_token = gen_random_uuid()");
  });

  it("freezes a historical-actual baseline when no published pointer exists", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT 1 FROM admin_simulation_runs")) {
          return { rowCount: 1, rows: [{ "?column?": 1 }] };
        }
        if (sql.includes("FROM admin_artifact_versions") && sql.includes("ANY($1::uuid[])")) {
          return { rowCount: 1, rows: [{
            version_id: "33333333-3333-4333-8333-333333333333",
            artifact_key: "lana.shopwide.offers",
            artifact_kind: "OFFER_POLICY",
            lifecycle: "APPROVED",
            content_hash: `sha256:${"a".repeat(64)}`,
            content: {
              schemaVersion: 1,
              kind: "OFFER_POLICY",
              scope: "SHOP_WIDE",
              multiItem: { minimumParentProductUnits: 2, discountBps: 500, setAndComboCountAsOne: true },
              concessions: {
                second: { freeShipping: true, fixedDiscountVnd: 0 },
                final: { freeShipping: true, fixedDiscountVnd: 20_000 },
                stackMultiItemWithSecond: true,
                stackMultiItemWithFinal: true,
                deduplicateFreeShipping: true,
              },
              sourceMetadata: {
                source: "ADMIN",
                sourceReference: null,
                sourceVersion: "test-v1",
                observedAt: "2026-07-22T08:00:00.000Z",
              },
            },
          }] };
        }
        if (sql.includes("FROM admin_active_pointers")) return { rowCount: 0, rows: [] };
        if (sql.includes("SET baseline_version_ids")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresSimulationStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const policies = await store.loadPolicies({
      simulationId: "11111111-1111-4111-8111-111111111111",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      pageId: "1198992073286645",
      candidateVersionIds: ["33333333-3333-4333-8333-333333333333"],
      baselineVersionIds: [],
      baselineSource: "UNRESOLVED",
      lookbackDays: 30,
      maxConversations: 100,
      attemptCount: 1,
      sideEffects: "DISABLED",
    });
    expect(policies.baseline).toEqual([]);
    expect(policies.baselineSource).toBe("HISTORICAL_ACTUAL");
    expect(calls.join("\n")).toContain("baseline_source = $4");
  });

  it("samples only DLP-passed history and returns no raw messages", async () => {
    const calls: string[] = [];
    const store = new PostgresSimulationStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string) {
        calls.push(sql);
        return { rows: [{
          conversation_hash: `sha256:${"a".repeat(64)}`,
          message_count: "2",
          schema_version: null,
          closing_state: null,
          parent_product_units: null,
          concession_stage: null,
          payment_method: null,
          recipient_name_present: null,
          phone_number_present: null,
          delivery_address_present: null,
          handoff_reason: null,
          measurements: null,
          business_facts_snapshot_id: null,
          tool_snapshot_ids: null,
          actual_outcome: null,
          funnel_stage: null,
        }] };
      },
      async end() {},
    };
    const history = await store.loadHistory({
      simulationId: "11111111-1111-4111-8111-111111111111",
      leaseToken: "22222222-2222-4222-8222-222222222222",
      pageId: "1198992073286645",
      candidateVersionIds: [],
      baselineVersionIds: [],
      baselineSource: "UNRESOLVED",
      lookbackDays: 30,
      maxConversations: 100,
      attemptCount: 1,
      sideEffects: "DISABLED",
    });
    expect(history[0]).toMatchObject({ messageCount: 2, snapshot: null });
    expect(calls[0]).toContain("message.dlp_status = 'PASSED'");
    expect(calls[0]).not.toContain("text_redacted");
    expect(calls[0]).not.toContain("meta_outbox");
    expect(calls[0]).not.toContain("pancake_tag_outbox");
    expect(calls[0]).toContain("FROM shadow_evaluations AS evaluation");
    expect(calls[0]).toContain("evaluation.status = 'COMPLETED'");
    expect(calls[0]).toContain("evaluation.actual_outbound_count > 0");
    expect(calls[0]).toContain("digest(evaluation.business_fact_payload::text");
    expect(calls[0]).toContain("digest(evaluation.proposal::text");
    expect(calls[0]).toContain("digest(evaluation.guarded_plan::text");
    expect(calls[0]).toContain(
      "COALESCE(event_snapshot.data, shadow_snapshot.data)",
    );
    expect(calls[0]).not.toContain("actual_outbound_text_redacted");
  });
});
