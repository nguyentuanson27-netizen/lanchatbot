import { AdminArtifactContentV1Schema, AdminArtifactKindV1Schema } from "@lana/contracts";
import { Pool, type PoolClient } from "pg";
import { parseReplaySnapshot } from "./evaluator.js";
import type {
  ClaimedSimulationRun,
  HistoricalConversation,
  PolicyComparison,
  PolicyVersion,
  SimulationAggregate,
  SimulationResult,
  SimulationStore,
} from "./types.js";

interface RunRow {
  simulation_id: string;
  lease_token: string;
  page_id: string;
  version_ids: string[];
  baseline_version_ids: string[];
  baseline_source: ClaimedSimulationRun["baselineSource"];
  lookback_days: number;
  max_conversations: number;
  attempt_count: number;
  side_effects: string;
}

interface VersionRow {
  version_id: string;
  artifact_key: string;
  artifact_kind: string;
  lifecycle: string;
  content_hash: string;
  content: unknown;
}

interface HistoryRow {
  conversation_hash: string;
  message_count: string;
  schema_version: string | null;
  closing_state: string | null;
  parent_product_units: string | null;
  concession_stage: string | null;
  payment_method: string | null;
  recipient_name_present: string | null;
  phone_number_present: string | null;
  delivery_address_present: string | null;
  handoff_reason: string | null;
  measurements: unknown;
  business_facts_snapshot_id: string | null;
  tool_snapshot_ids: unknown;
  actual_outcome: string | null;
  funnel_stage: string | null;
}

export class PostgresSimulationStore implements SimulationStore {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 3) {
    if (!connectionString.trim()) throw new Error("ADMIN_SIMULATION_DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: Math.max(1, Math.min(10, maxPoolSize)) });
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ table_name: string | null }>(
        "SELECT to_regclass('public.admin_simulation_runs')::text AS table_name",
      );
      return result.rows[0]?.table_name === "admin_simulation_runs";
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async claim(workerId: string, leaseMs: number, maxAttempts: number): Promise<ClaimedSimulationRun | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE admin_simulation_runs
         SET status = 'FAILED', error_code = 'SIMULATION_LEASE_EXPIRED_MAX_ATTEMPTS',
             lease_owner = NULL, lease_token = NULL, lease_until = NULL,
             completed_at = now(), updated_at = now()
         WHERE status = 'PROCESSING' AND lease_until <= now()
           AND attempt_count >= $1`,
        [boundedAttempts(maxAttempts)],
      );
      const claimed = await client.query<RunRow>(
        `WITH candidate AS (
           SELECT simulation_id
           FROM admin_simulation_runs
           WHERE side_effects = 'DISABLED'
             AND attempt_count < $3
             AND (
               (status = 'PENDING' AND next_attempt_at <= now())
               OR (status = 'PROCESSING' AND lease_until <= now())
             )
           ORDER BY created_at, simulation_id
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE admin_simulation_runs AS run
         SET status = 'PROCESSING', attempt_count = attempt_count + 1,
             claimed_at = now(), started_at = COALESCE(started_at, now()),
             lease_owner = $1, lease_token = gen_random_uuid(),
             lease_until = now() + ($2::integer * interval '1 millisecond'),
             next_attempt_at = now(), error_code = NULL, updated_at = now()
         FROM candidate
         WHERE run.simulation_id = candidate.simulation_id
         RETURNING run.simulation_id, run.lease_token, run.page_id,
           run.version_ids, run.baseline_version_ids, run.baseline_source, run.lookback_days,
           run.max_conversations, run.attempt_count, run.side_effects`,
        [workerId.slice(0, 128), boundedLease(leaseMs), boundedAttempts(maxAttempts)],
      );
      await client.query("COMMIT");
      const row = claimed.rows[0];
      if (!row) return null;
      if (row.side_effects !== "DISABLED") throw permanent("SIMULATION_SIDE_EFFECTS_MUST_BE_DISABLED");
      return {
        simulationId: row.simulation_id,
        leaseToken: row.lease_token,
        pageId: row.page_id,
        candidateVersionIds: row.version_ids,
        baselineVersionIds: row.baseline_version_ids,
        baselineSource: row.baseline_source,
        lookbackDays: row.lookback_days,
        maxConversations: row.max_conversations,
        attemptCount: row.attempt_count,
        sideEffects: "DISABLED",
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async loadPolicies(run: ClaimedSimulationRun): Promise<PolicyComparison> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await requireLease(client, run);
      const candidates = await loadVersions(client, run.candidateVersionIds);
      if (candidates.length !== run.candidateVersionIds.length) {
        throw permanent("SIMULATION_CANDIDATE_VERSION_MISSING");
      }
      if (candidates.some(({ lifecycle }) => lifecycle === "DRAFT")) {
        throw permanent("SIMULATION_CANDIDATE_DRAFT_MUTABLE");
      }
      assertUniqueArtifactScopes(candidates);

      let baselineIds = [...run.baselineVersionIds];
      let baselineSource = run.baselineSource;
      if (baselineSource === "UNRESOLVED") {
        baselineIds = [];
        let completePublishedBundle = true;
        for (const candidate of candidates) {
          const pointer = await client.query<{ version_id: string }>(
            `SELECT pointer.version_id
             FROM admin_active_pointers AS pointer
             JOIN admin_artifact_versions AS version
               ON version.version_id = pointer.version_id
             WHERE pointer.active AND pointer.channel = 'PUBLISHED'
               AND pointer.artifact_key = $1 AND pointer.artifact_kind = $2
               AND (pointer.page_id = $3 OR pointer.page_id IS NULL)
               AND version.lifecycle = 'PUBLISHED'
             ORDER BY (pointer.page_id = $3) DESC, pointer.updated_at DESC
             LIMIT 1`,
            [candidate.artifact_key, candidate.artifact_kind, run.pageId],
          );
          const versionId = pointer.rows[0]?.version_id;
          if (!versionId) {
            completePublishedBundle = false;
          } else {
            baselineIds.push(versionId);
          }
        }
        baselineSource = completePublishedBundle
          ? "PUBLISHED_POLICY"
          : "HISTORICAL_ACTUAL";
        if (baselineSource === "HISTORICAL_ACTUAL") baselineIds = [];
        const frozen = await client.query(
          `UPDATE admin_simulation_runs
           SET baseline_version_ids = $3::uuid[], baseline_source = $4, updated_at = now()
           WHERE simulation_id = $1 AND status = 'PROCESSING'
             AND lease_token = $2 AND lease_until > now()
             AND baseline_source = 'UNRESOLVED'`,
          [run.simulationId, run.leaseToken, baselineIds, baselineSource],
        );
        if (frozen.rowCount !== 1) throw new Error("SIMULATION_LEASE_LOST");
      }
      let baselines: VersionRow[] = [];
      if (baselineSource === "PUBLISHED_POLICY") {
        baselines = await loadVersions(client, baselineIds);
        if (baselines.length !== baselineIds.length || baselines.some(({ lifecycle }) => lifecycle !== "PUBLISHED")) {
          throw permanent("SIMULATION_FROZEN_BASELINE_INVALID");
        }
        assertMatchingScopes(candidates, baselines);
      } else if (baselineSource === "HISTORICAL_ACTUAL" && baselineIds.length > 0) {
        throw permanent("SIMULATION_HISTORICAL_BASELINE_IDS_INVALID");
      } else if (baselineSource !== "HISTORICAL_ACTUAL") {
        throw permanent("SIMULATION_BASELINE_SOURCE_INVALID");
      }
      await client.query("COMMIT");
      return {
        candidate: candidates.map(policyVersion),
        baseline: baselines.map(policyVersion),
        baselineSource,
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async loadHistory(run: ClaimedSimulationRun): Promise<readonly HistoricalConversation[]> {
    const result = await this.pool.query<HistoryRow>(
      `WITH eligible AS (
         SELECT message.conversation_id,
                count(*)::text AS message_count,
                max(message.occurred_at) AS last_occurred_at
         FROM messages AS message
         WHERE message.page_id = $1
           AND message.occurred_at >= now() - make_interval(days => $2)
           AND message.dlp_status = 'PASSED'
         GROUP BY message.conversation_id
         ORDER BY last_occurred_at DESC, message.conversation_id
         LIMIT $3
       )
       SELECT
         'sha256:' || encode(digest(
           'admin-simulation:v1:' || $1 || ':' || eligible.conversation_id::text,
           'sha256'
         ), 'hex') AS conversation_hash,
         eligible.message_count,
         snapshot.data->>'schemaVersion' AS schema_version,
         snapshot.data->>'closingState' AS closing_state,
         snapshot.data->>'parentProductUnits' AS parent_product_units,
         snapshot.data->>'concessionStage' AS concession_stage,
         snapshot.data->>'paymentMethod' AS payment_method,
         snapshot.data->>'recipientNamePresent' AS recipient_name_present,
         snapshot.data->>'phoneNumberPresent' AS phone_number_present,
         snapshot.data->>'deliveryAddressPresent' AS delivery_address_present,
         snapshot.data->>'handoffReason' AS handoff_reason,
         snapshot.data->'measurements' AS measurements,
         snapshot.data->>'businessFactsSnapshotId' AS business_facts_snapshot_id,
         snapshot.data->'toolSnapshotIds' AS tool_snapshot_ids,
         snapshot.data->>'actualOutcome' AS actual_outcome,
         snapshot.data->>'funnelStage' AS funnel_stage
       FROM eligible
       LEFT JOIN LATERAL (
         SELECT COALESCE(
           event.event_metadata->'adminSimulation',
           event.event_metadata->'admin_simulation'
         ) AS data
         FROM conversation_events AS event
         WHERE event.conversation_id = eligible.conversation_id
           AND event.page_id = $1
           AND event.occurred_at >= now() - make_interval(days => $2)
           AND jsonb_typeof(COALESCE(
             event.event_metadata->'adminSimulation',
             event.event_metadata->'admin_simulation'
           )) = 'object'
         ORDER BY event.occurred_at DESC, event.created_at DESC
         LIMIT 1
       ) AS event_snapshot ON true
       LEFT JOIN LATERAL (
         SELECT jsonb_build_object(
           'schemaVersion', 1,
           'closingState', NULL,
           'parentProductUnits', NULL,
           'concessionStage', NULL,
           'paymentMethod', NULL,
           'recipientNamePresent', NULL,
           'phoneNumberPresent', NULL,
           'deliveryAddressPresent', NULL,
           'handoffReason', NULL,
           'measurements', '{}'::jsonb,
           'businessFactsSnapshotId',
             'sha256:' || encode(digest(evaluation.business_fact_payload::text, 'sha256'), 'hex'),
           'toolSnapshotIds', jsonb_build_array(
             'sha256:' || encode(digest(evaluation.proposal::text, 'sha256'), 'hex'),
             'sha256:' || encode(digest(evaluation.guarded_plan::text, 'sha256'), 'hex')
           ),
           'actualOutcome', 'REPLY',
           'funnelStage', evaluation.proposal->>'conversationStage'
         ) AS data
         FROM shadow_evaluations AS evaluation
         WHERE evaluation.conversation_id = eligible.conversation_id
           AND evaluation.page_id = $1
           AND evaluation.source_occurred_at >= now() - make_interval(days => $2)
           AND evaluation.status = 'COMPLETED'
           AND evaluation.actual_outbound_count > 0
           AND jsonb_typeof(evaluation.business_fact_payload) = 'object'
           AND jsonb_typeof(evaluation.proposal) = 'object'
           AND jsonb_typeof(evaluation.guarded_plan) = 'object'
         ORDER BY evaluation.source_occurred_at DESC, evaluation.evaluation_id DESC
         LIMIT 1
       ) AS shadow_snapshot ON true
       CROSS JOIN LATERAL (
         SELECT COALESCE(event_snapshot.data, shadow_snapshot.data) AS data
       ) AS snapshot
       ORDER BY eligible.last_occurred_at DESC, eligible.conversation_id`,
      [run.pageId, run.lookbackDays, run.maxConversations],
    );
    return result.rows.map((row) => ({
      conversationHash: row.conversation_hash,
      messageCount: Number(row.message_count),
      snapshot: parseReplaySnapshot(row.schema_version === null ? null : {
        schemaVersion: Number(row.schema_version),
        closingState: row.closing_state,
        parentProductUnits: nullableNumber(row.parent_product_units),
        concessionStage: row.concession_stage,
        paymentMethod: row.payment_method,
        recipientNamePresent: nullableBoolean(row.recipient_name_present),
        phoneNumberPresent: nullableBoolean(row.phone_number_present),
        deliveryAddressPresent: nullableBoolean(row.delivery_address_present),
        handoffReason: row.handoff_reason,
        measurements: row.measurements,
        businessFactsSnapshotId: row.business_facts_snapshot_id,
        toolSnapshotIds: row.tool_snapshot_ids,
        actualOutcome: row.actual_outcome,
        funnelStage: row.funnel_stage,
      }),
    }));
  }

  async renewLease(run: ClaimedSimulationRun, leaseMs: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE admin_simulation_runs
       SET lease_until = now() + ($3::integer * interval '1 millisecond'), updated_at = now()
       WHERE simulation_id = $1 AND status = 'PROCESSING'
         AND lease_token = $2 AND lease_until > now()
         AND side_effects = 'DISABLED'`,
      [run.simulationId, run.leaseToken, boundedLease(leaseMs)],
    );
    return result.rowCount === 1;
  }

  async complete(
    run: ClaimedSimulationRun,
    results: readonly SimulationResult[],
    aggregate: SimulationAggregate,
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await requireLease(client, run);
      for (const result of results) {
        await client.query(
          `INSERT INTO admin_simulation_results (
             simulation_id, conversation_hash, evaluation_status,
             baseline_outcome, candidate_outcome, funnel_metrics, failure_codes
           ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::text[])
           ON CONFLICT (simulation_id, conversation_hash) DO UPDATE SET
             evaluation_status = EXCLUDED.evaluation_status,
             baseline_outcome = EXCLUDED.baseline_outcome,
             candidate_outcome = EXCLUDED.candidate_outcome,
             funnel_metrics = EXCLUDED.funnel_metrics,
             failure_codes = EXCLUDED.failure_codes`,
          [run.simulationId, result.conversationHash, result.evaluationStatus,
            result.baselineOutcome, result.candidateOutcome,
            JSON.stringify(result.funnelMetrics), [...result.failureCodes]],
        );
      }
      const insufficient = aggregate.evaluatedConversations === 0;
      const errorCode = aggregate.totalConversations === 0
        ? "NO_ANONYMIZED_HISTORY"
        : insufficient ? "HISTORICAL_EVIDENCE_INSUFFICIENT" : null;
      const completed = await client.query(
        `UPDATE admin_simulation_runs
         SET status = $3, aggregate_metrics = $4::jsonb, error_code = $5,
             completed_at = now(), lease_owner = NULL, lease_token = NULL,
             lease_until = NULL, updated_at = now()
         WHERE simulation_id = $1 AND status = 'PROCESSING'
           AND lease_token = $2 AND lease_until > now()
           AND side_effects = 'DISABLED'`,
        [run.simulationId, run.leaseToken,
          insufficient ? "INSUFFICIENT_EVIDENCE" : "COMPLETED",
          JSON.stringify(aggregate), errorCode],
      );
      if (completed.rowCount !== 1) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(
    run: ClaimedSimulationRun,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number,
  ): Promise<boolean> {
    const terminal = !retryable || run.attemptCount >= boundedAttempts(maxAttempts);
    const result = await this.pool.query(
      `UPDATE admin_simulation_runs
       SET status = CASE WHEN $3 THEN 'FAILED' ELSE 'PENDING' END,
           error_code = $4,
           next_attempt_at = CASE WHEN $3 THEN next_attempt_at ELSE
             now() + make_interval(secs => LEAST(300, CAST(power(2, attempt_count) AS integer))) END,
           completed_at = CASE WHEN $3 THEN now() ELSE NULL END,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           updated_at = now()
       WHERE simulation_id = $1 AND status = 'PROCESSING' AND lease_token = $2`,
      [run.simulationId, run.leaseToken, terminal, safeCode(errorCode)],
    );
    return result.rowCount === 1;
  }
}

async function requireLease(client: PoolClient, run: ClaimedSimulationRun): Promise<void> {
  const locked = await client.query(
    `SELECT 1 FROM admin_simulation_runs
     WHERE simulation_id = $1 AND status = 'PROCESSING'
       AND lease_token = $2 AND lease_until > now()
       AND side_effects = 'DISABLED'
     FOR UPDATE`,
    [run.simulationId, run.leaseToken],
  );
  if (locked.rowCount !== 1) throw new Error("SIMULATION_LEASE_LOST");
}

async function loadVersions(client: PoolClient, ids: readonly string[]): Promise<VersionRow[]> {
  if (ids.length === 0) return [];
  const result = await client.query<VersionRow>(
    `SELECT version_id, artifact_key, artifact_kind, lifecycle, content_hash, content
     FROM admin_artifact_versions
     WHERE version_id = ANY($1::uuid[])
     ORDER BY array_position($1::uuid[], version_id)`,
    [ids],
  );
  return result.rows;
}

function policyVersion(row: VersionRow): PolicyVersion {
  const kind = AdminArtifactKindV1Schema.safeParse(row.artifact_kind);
  const content = AdminArtifactContentV1Schema.safeParse(row.content);
  if (!kind.success || !content.success || content.data.kind !== kind.data) {
    throw permanent("SIMULATION_POLICY_CONTENT_INVALID");
  }
  return {
    versionId: row.version_id,
    artifactKey: row.artifact_key,
    artifactKind: kind.data,
    contentHash: row.content_hash,
    content: content.data,
  };
}

function assertUniqueArtifactScopes(rows: readonly VersionRow[]): void {
  const scopes = rows.map((row) => `${row.artifact_kind}\0${row.artifact_key}`);
  if (new Set(scopes).size !== scopes.length) {
    throw permanent("SIMULATION_CANDIDATE_SCOPE_DUPLICATE");
  }
}

function assertMatchingScopes(candidate: readonly VersionRow[], baseline: readonly VersionRow[]): void {
  const left = candidate.map((row) => `${row.artifact_kind}\0${row.artifact_key}`).sort();
  const right = baseline.map((row) => `${row.artifact_kind}\0${row.artifact_key}`).sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw permanent("SIMULATION_BASELINE_SCOPE_MISMATCH");
  }
}

function boundedLease(value: number): number {
  return Math.max(30_000, Math.min(900_000, Math.trunc(value)));
}
function boundedAttempts(value: number): number {
  return Math.max(1, Math.min(10, Math.trunc(value)));
}
function nullableNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function nullableBoolean(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
function safeCode(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_:-]/gu, "_");
  return (normalized || "SIMULATION_UNEXPECTED_ERROR").slice(0, 128);
}

export function permanent(code: string): Error & { readonly retryable: false } {
  return Object.assign(new Error(code), { retryable: false as const });
}
