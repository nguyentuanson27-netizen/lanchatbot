import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const directory = resolve(import.meta.dirname, "../migrations");

describe("database migrations", () => {
  it("has an up/down pair for every migration", async () => {
    const files = await readdir(directory);
    const ups = files.filter((name) => name.endsWith(".up.sql")).map((name) => name.replace(".up.sql", ""));
    const downs = files.filter((name) => name.endsWith(".down.sql")).map((name) => name.replace(".down.sql", ""));
    expect(ups.sort()).toEqual(downs.sort());
  });

  it("assigns every migration a unique ordered numeric prefix", async () => {
    const migrations = (await readdir(directory))
      .filter((name) => name.endsWith(".up.sql"));
    const prefixes = migrations.map((name) => name.split("_", 1)[0]);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("contains all durable phase-zero tables", async () => {
    const sql = await readFile(resolve(directory, "0001_core.up.sql"), "utf8");
    for (const table of [
      "pages",
      "webhook_inbox",
      "conversations",
      "messages",
      "conversation_events",
      "meta_outbox",
      "pancake_tag_outbox",
      "secret_versions",
      "audit_log",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql).toContain("PARTITION BY RANGE (occurred_at)");
    expect(sql).toContain("UNIQUE (page_id, event_key)");
  });

  it("creates the durable Phase 4 shadow evaluation queue", async () => {
    const sql = await readFile(resolve(directory, "0003_shadow_evaluation.up.sql"), "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS shadow_evaluations");
    expect(sql).toContain("shadow_evaluations_claim_idx");
    expect(sql).toContain("ON CONFLICT (source_identity_key) DO NOTHING");
    expect(sql).toContain("status IN ('PENDING', 'PROCESSING', 'AWAITING_ACTUAL', 'COMPLETED'");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS shadow_worker_status");
    expect(sql).toContain("lana_apply_shadow_retention");
  });

  it("audits the source and freshness of business facts used by shadow replies", async () => {
    const sql = await readFile(resolve(directory, "0004_business_fact_audit.up.sql"), "utf8");
    for (const column of [
      "business_fact_status",
      "business_fact_source",
      "business_fact_observed_at",
      "business_fact_expires_at",
      "business_fact_product_id",
      "business_fact_reason_code",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("shadow_evaluations_fact_status_idx");
  });

  it("persists the verified fact envelope for Judge v2", async () => {
    const sql = await readFile(
      resolve(directory, "0018_shadow_verified_fact_payload.up.sql"),
      "utf8",
    );
    expect(sql).toContain("business_fact_payload jsonb");
    expect(sql).toContain("Verified business-fact envelope");
  });

  it("creates PII-safe read models for the read-only admin MVP", async () => {
    const sql = await readFile(
      resolve(directory, "0006_admin_read_models.up.sql"),
      "utf8",
    );
    for (const view of [
      "admin_pages_v",
      "admin_conversations_v",
      "admin_messages_v",
      "admin_conversation_events_v",
      "admin_evaluations_v",
      "admin_worker_status_v",
      "admin_inbox_v",
      "admin_meta_outbox_v",
      "admin_pancake_outbox_v",
      "admin_audit_v",
    ]) {
      expect(sql).toContain(`VIEW ${view}`);
    }
    expect(sql).toContain("WHERE dlp_status = 'PASSED'");
    expect(sql).not.toContain("recipient_ciphertext");
    expect(sql).not.toContain("payload_ciphertext");
  });

  it("creates a constrained, auditable admin command control plane", async () => {
    const sql = await readFile(
      resolve(directory, "0007_admin_control_plane.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS admin_commands");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS admin_command_events");
    expect(sql).toContain("admin_commands_actor_idempotency_uk");
    expect(sql).toContain("admin_commands_one_active_version_idx");
    expect(sql).toContain("admin_command_events is append-only");
    expect(sql).toContain("VIEW admin_commands_v");
    expect(sql).toContain("'DA_CHOT_DON', 'KHONG_UP_SALE'");
    expect(sql).not.toContain("payload_ciphertext");
  });

  it("stores the OWNER-only customer identity projection encrypted at rest", async () => {
    const sql = await readFile(
      resolve(directory, "0008_admin_conversation_identity.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS admin_conversation_identities");
    expect(sql).toContain("customer_name_ciphertext bytea NOT NULL");
    expect(sql).toContain("customer_name_nonce bytea NOT NULL");
    expect(sql).toContain("customer_name_auth_tag bytea NOT NULL");
    expect(sql).not.toMatch(/customer_name\s+text/i);
    expect(sql).not.toContain("VIEW admin_conversation_identities");
  });

  it("stores canonical history outreach analytics without raw campaign text", async () => {
    const sql = await readFile(
      resolve(directory, "0009_chat_history_outreach.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS outreach_messages");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS outreach_responses");
    expect(sql).toContain("source_event_key_hash text NOT NULL");
    expect(sql).toContain("provider_message_id_hash text");
    expect(sql).toContain("content_hash text NOT NULL");
    expect(sql).not.toMatch(/(?:raw_text|message_text|content_text|full_text)\s+text/iu);
    expect(sql).toContain("VIEW admin_outreach_messages_v");
    expect(sql).toContain("VIEW admin_outreach_metrics_v");
    expect(sql).toContain("sent_at < p_now - interval '6 months'");
    expect(sql).toContain("response_status = 'RESPONDED_24H'");
  });

  it("stores immutable PII-free handoff history with a mutable queue projection", async () => {
    const sql = await readFile(
      resolve(directory, "0010_handoff_history.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS handoff_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS handoff_cases");
    expect(sql).toContain("admin_handoff_queue_v");
    expect(sql).toContain("admin_handoff_history_v");
    expect(sql).toContain("handoff_events is append-only");
    expect(sql).toContain("'BOT_POLICY', 'CUSTOMER_REQUEST', 'POST_SALE', 'ADMIN'");
    expect(sql).toContain("trigger_message_pk uuid");
    expect(sql).not.toContain("trigger_message_pk uuid REFERENCES");
    expect(sql).toContain("message.dlp_status = 'PASSED'");
    expect(sql).not.toMatch(/(?:raw_text|customer_id|provider_message_id)\s+/iu);
  });

  it("stores Ads attribution and media outcomes without persisting media URLs", async () => {
    const sql = await readFile(
      resolve(directory, "0011_ads_media_analytics.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS message_ad_contexts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS message_media_analysis");
    expect(sql).toContain("ad_title text");
    expect(sql).toContain("post_id text");
    expect(sql).toContain("ad_id text");
    expect(sql).toContain("extracted_product_id text");
    expect(sql).not.toMatch(/(?:media_url|image_url|video_url)\s+text/iu);
  });

  it("creates a durable per-conversation sliding debounce without merging inbox audit rows", async () => {
    const sql = await readFile(
      resolve(directory, "0013_inbound_debounce.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS conversation_ingress_heads");
    expect(sql).toContain("generation bigint NOT NULL");
    expect(sql).toContain("last_customer_receive_sequence bigint");
    expect(sql).toContain("quiet_until timestamptz");
    expect(sql).toContain("'CUSTOMER', 'APP_ECHO', 'PAGE_ECHO'");
    expect(sql).toContain("evaluation_group_id uuid");
    expect(sql).not.toContain("max_wait");
  });

  it("creates an immutable, versioned Admin Policy Control Plane", async () => {
    const sql = await readFile(
      resolve(directory, "0014_admin_policy_control.up.sql"),
      "utf8",
    );
    for (const table of [
      "admin_artifact_versions",
      "admin_artifact_events",
      "admin_active_pointers",
      "admin_simulation_runs",
      "admin_simulation_results",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql).toContain("DRAFT', 'VALIDATED', 'APPROVED', 'CANARY', 'PUBLISHED', 'RETIRED");
    expect(sql).toContain("non-draft admin artifact content is immutable");
    expect(sql).toContain("admin_artifact_events is append-only");
    expect(sql).toContain("side_effects = 'DISABLED'");
    expect(sql).toContain("UNIQUE NULLS NOT DISTINCT");
    expect(sql).not.toMatch(/(?:secret|token|password)_value/iu);
  });

  it("pins runtime policy bundles and appends PII-free resolution audit", async () => {
    const sql = await readFile(
      resolve(directory, "0015_runtime_policy_resolution.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS runtime_policy_pins");
    expect(sql).toContain("runtime_policy_pins are immutable");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS runtime_policy_resolution_audit");
    expect(sql).toContain("runtime_policy_resolution_audit is append-only");
    expect(sql).toContain("'CANARY_SHADOW', 'CANARY_LIVE', 'PUBLISHED'");
    expect(sql).not.toMatch(/(?:customer_name|phone|address|message_text)\s+/iu);
  });

  it("adds crash-safe leases and explicit evidence status to policy simulations", async () => {
    const sql = await readFile(
      resolve(directory, "0016_admin_simulation_worker.up.sql"),
      "utf8",
    );
    expect(sql).toContain("baseline_version_ids uuid[]");
    expect(sql).toContain("baseline_source text");
    expect(sql).toContain("lease_token uuid");
    expect(sql).toContain("lease_until timestamptz");
    expect(sql).toContain("attempt_count integer");
    expect(sql).toContain("INSUFFICIENT_EVIDENCE");
    expect(sql).toContain("evaluation_status");
    expect(sql).toContain("side_effects");
    expect(sql).toContain("MIGRATION_RECOVERED_UNLEASED_PROCESSING");
    expect(sql.indexOf("DROP VIEW IF EXISTS admin_simulation_runs_v")).toBeLessThan(
      sql.indexOf("CREATE VIEW admin_simulation_runs_v"),
    );
    const down = await readFile(
      resolve(directory, "0016_admin_simulation_worker.down.sql"),
      "utf8",
    );
    expect(down).toContain("WHERE status = 'INSUFFICIENT_EVIDENCE'");
    expect(down).toContain("SET status = 'FAILED'");
  });

  it("stores encrypted 48-hour sales state with an append-only PII-free command ledger", async () => {
    const sql = await readFile(
      resolve(directory, "0017_sales_cycle_runtime.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS sales_cycle_states");
    expect(sql).toContain("state_ciphertext bytea NOT NULL");
    expect(sql).toContain("state_encrypted_dek bytea NOT NULL");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS sales_cycle_events");
    expect(sql).toContain("sales_cycle_events is append-only");
    expect(sql).toContain("UNIQUE (conversation_id, command_id_hash)");
    expect(sql).not.toMatch(/(?:full_name|phone|address|recipient)\s+(?:text|jsonb)/iu);
  });

  it("stores only pseudonymous short-lived customer profile data for Wave 2", async () => {
    const sql = await readFile(
      resolve(directory, "0019_customer_profile_wave2.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS realtime_customer_profiles");
    expect(sql).toContain("profile_snapshot jsonb NOT NULL");
    expect(sql).toContain("field_evidence jsonb NOT NULL");
    expect(sql).toContain("expires_at timestamptz NOT NULL");
    expect(sql).not.toMatch(
      /(?:full_name|phone_number|delivery_address|recipient_name)\s+(?:text|jsonb)/iu,
    );
  });
  it("creates a PII-free ad acquisition projection with POS conversion disabled", async () => {
    const sql = await readFile(
      resolve(directory, "0024_ad_acquisition_analytics.up.sql"),
      "utf8",
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS referral_type text");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS acquisition_sessions");
    expect(sql).toContain("VIEW admin_acquisition_sessions_v");
    expect(sql).toContain("WITH (security_barrier = true)");
    expect(sql).toContain("NO_RESPONSE_1H");
    expect(sql).toContain("initial_reply_terminal_status");
    expect(sql).toContain("acquisition_reply_terminal_ck");
    expect(sql).toContain("first_playbook");
    expect(sql).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(sql).toContain("NO_RESPONSE_24H");
    expect(sql).toContain("order_created_at IS NULL OR max_stage_reached = 'CONVERTED'");
    const viewSql = sql.slice(sql.indexOf("CREATE VIEW admin_acquisition_sessions_v"));
    expect(viewSql).not.toContain("customer_hash,");
    expect(viewSql).not.toContain("event_metadata");
    expect(sql).not.toMatch(/(?:photo_url|image_url|video_url)\s+text/iu);
  });

  it("gives every new handoff case a fail-safe 30-minute SLA", async () => {
    const sql = await readFile(resolve(directory, "0027_handoff_case_sla_default.up.sql"), "utf8");
    expect(sql).toContain("ALTER COLUMN sla_due_at SET DEFAULT");
    expect(sql).toContain("interval '30 minutes'");
  });

  it("persists one fail-closed ownership snapshot per response group", async () => {
    const sql = await readFile(
      resolve(directory, "0028_meta_response_group_gate.up.sql"),
      "utf8",
    );
    const down = await readFile(
      resolve(directory, "0028_meta_response_group_gate.down.sql"),
      "utf8",
    );

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS meta_response_group_gates");
    expect(sql).toContain("response_group_id uuid PRIMARY KEY");
    expect(sql).toContain("'UNVERIFIED', 'ALLOWED', 'BLOCKED'");
    expect(sql).toContain("meta_response_group_gate_state_ck");
    expect(sql).toContain("source text NOT NULL DEFAULT 'PANCAKE'");
    expect(sql).toContain("meta_response_group_gate_ttl_ck");
    expect(sql).toContain("interval '5 minutes'");
    expect(sql).toContain("status = 'UNVERIFIED'");
    expect(sql).toContain("'NHAN_VIEN', 'VAN_DON', 'DA_CHOT_DON', 'KHONG_UP_SALE'");
    expect(sql).not.toMatch(/(?:recipient|message|customer)_ciphertext/iu);
    expect(down).toContain("DROP TABLE IF EXISTS meta_response_group_gates");
  });

  it("adds append-only policy tombstones without deleting artifact audit history", async () => {
    const sql = await readFile(
      resolve(directory, "0031_admin_policy_safe_deletion.up.sql"),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS admin_artifact_deletions");
    expect(sql).toContain("admin_artifact_deletions is append-only");
    expect(sql).toContain("deleted admin artifact version cannot be activated");
    expect(sql).toContain("TO lana_admin_readonly");
    expect(sql).toContain("TO lana_admin_control_api");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+admin_artifact_versions/iu);
  });

  it("creates the dedicated append-only Gate E V2 admission boundary", async () => {
    const sql = await readFile(
      resolve(directory, "0034_gate_e_evidence_store_v2.up.sql"),
      "utf8",
    );
    const down = await readFile(
      resolve(directory, "0034_gate_e_evidence_store_v2.down.sql"),
      "utf8",
    );

    expect(sql).toContain("CREATE TABLE public.gate_e_evidence_records_v2");
    expect(sql).toContain("CREATE TABLE public.gate_e_evidence_admissions_v2");
    expect(sql).toContain("CREATE TABLE public.gate_e_registered_population_anchors_v1");
    expect(sql).toContain("public.lana_gate_e_register_population_anchor_v1");
    expect(sql).toContain("lana_gate_e_registration_writer");
    expect(sql).toContain("REFERENCES public.gate_e_registered_population_anchors_v1");
    expect(sql).toContain("GATE_E_EVIDENCE_ROLE_NAMESPACE_OCCUPIED");
    expect(sql).not.toContain("IF NOT EXISTS (SELECT 1 FROM pg_roles");
    expect(sql).not.toContain("CREATE OR REPLACE FUNCTION public.lana_gate_e");
    expect(sql).toContain("DEFERRABLE INITIALLY DEFERRED");
    expect(sql).toContain("clock_timestamp()");
    expect(sql).toContain("admitted_at");
    expect(sql).not.toMatch(/original_committed_at|commit_timestamp/iu);
    expect(sql).toContain("gate_e evidence is append-only");
    expect(sql).toContain("BEFORE UPDATE OR DELETE OR TRUNCATE");
    expect(sql).toContain("lana_gate_e_append_evidence_v2");
    expect(sql).toContain("lana_gate_e_read_evidence_by_hash_v2");
    expect(sql).toContain("REVOKE ALL");
    expect(sql).toContain("lana_gate_e_evidence_writer");
    expect(sql).toContain("lana_gate_e_evidence_reader");
    expect(sql).not.toMatch(/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|TRUNCATE)[\s\S]*gate_e_evidence_/iu);
    expect(sql).not.toMatch(/(?:secret|token|password|raw_provider|customer|message)_/iu);
    expect(down).toContain("DROP TABLE IF EXISTS public.gate_e_evidence_admissions_v2");
    expect(down).toContain("DROP TABLE IF EXISTS public.gate_e_evidence_records_v2");
    expect(down).toContain(
      "DROP TABLE IF EXISTS public.gate_e_registered_population_anchors_v1",
    );
    expect(down).toContain("DROP ROLE IF EXISTS lana_gate_e_registration_writer");
    expect(down).toContain("DROP ROLE IF EXISTS lana_gate_e_evidence_writer");
    expect(down).toContain("DROP ROLE IF EXISTS lana_gate_e_evidence_reader");

    const adapter = await readFile(
      resolve(import.meta.dirname, "gate-e-evidence-store.ts"),
      "utf8",
    );
    expect(adapter).toContain("lana_gate_e_append_evidence_v2");
    expect(adapter).toContain("lana_gate_e_read_evidence_by_hash_v2");
    expect(adapter).not.toContain("gate_e_evidence_records_v2");
    expect(adapter).not.toContain("gate_e_evidence_admissions_v2");
  });
});
describe("r32.2 outbox handoff ordering migration", () => {
  it("adds reversible response-group dependency columns", async () => {
    const sql = await readFile(
      resolve(directory, "0029_meta_outbox_handoff_ordering.up.sql"),
      "utf8",
    );
    const down = await readFile(
      resolve(directory, "0029_meta_outbox_handoff_ordering.down.sql"),
      "utf8",
    );
    expect(sql).toContain("send_after_owner_handoff boolean NOT NULL DEFAULT false");
    expect(sql).toContain("after_response_group_id uuid");
    expect(sql).toContain("pancake_tag_outbox_response_group_idx");
    expect(down).toContain("DROP COLUMN IF EXISTS after_response_group_id");
    expect(down).toContain("DROP COLUMN IF EXISTS send_after_owner_handoff");
  });
});
