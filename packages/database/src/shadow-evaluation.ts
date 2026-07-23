import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { withTransaction } from "./repositories.js";

export interface ShadowContextMessage {
  readonly direction: "INBOUND" | "OUTBOUND";
  readonly senderType: "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM";
  readonly messageType: "TEXT" | "IMAGE" | "MIXED" | "EVENT" | "POSTBACK";
  readonly text: string;
  readonly attachmentCount: number;
  readonly occurredAt: string;
}

export interface ShadowEvaluationJob {
  readonly evaluationId: string;
  readonly claimToken: string;
  readonly sourceIdentityKey: string;
  readonly sourceMessagePk: string;
  readonly sourceOccurredAt: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly attemptCount: number;
  readonly promptVersion: string;
  readonly context: readonly ShadowContextMessage[];
  readonly contextHash: string;
  readonly actualOutboundText: string | null;
  readonly actualOutboundCount: number;
}

export interface ShadowComparisonJob {
  readonly evaluationId: string;
  readonly claimToken: string;
  readonly proposalReply: string;
  readonly actualOutboundText: string;
  readonly actualOutboundCount: number;
  readonly context: readonly ShadowContextMessage[];
  readonly proposalSummary: unknown;
  readonly guardOutcome: unknown;
  readonly businessFactEnvelope: unknown;
}

export interface ShadowEvaluationCompletion {
  readonly proposal: unknown;
  readonly guardedPlan: unknown;
  readonly blockedReasonCodes: readonly string[];
  readonly modelProvider: string;
  readonly modelName: string;
  readonly modelVersion: string;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<Record<string, number>>;
  readonly textSimilarity: number | null;
  readonly inputContextHash: string;
  readonly actualOutboundText: string | null;
  readonly actualOutboundCount: number;
  readonly businessFactAudit: {
    readonly status: string;
    readonly source: string;
    readonly observedAt: string;
    readonly expiresAt: string | null;
    readonly productId: string;
    readonly reasonCode: string | null;
  } | null;
  readonly businessFactEnvelope: unknown;
}

export interface ShadowEvaluationSummary {
  readonly total: number;
  readonly pending: number;
  readonly processing: number;
  readonly awaitingActual: number;
  readonly completed: number;
  readonly failedRetryable: number;
  readonly failedPermanent: number;
  readonly policyBlocked: number;
  readonly withActualReply: number;
  readonly averageLatencyMs: number | null;
  readonly averageTextSimilarity: number | null;
  readonly averageActualQualityScore: number | null;
  readonly withBusinessFacts: number;
  readonly businessFactsOk: number;
  readonly metaOutboxCount: number;
  readonly workerHealthy: boolean;
}

export interface ShadowEvaluationRecentItem {
  readonly evaluationId: string;
  readonly conversationRef: string;
  readonly status: string;
  readonly sourceOccurredAt: string;
  readonly intent: string | null;
  readonly action: string | null;
  readonly proposalReply: string | null;
  readonly guardedAction: string | null;
  readonly blockedReasonCodes: readonly string[];
  readonly actualOutboundText: string | null;
  readonly actualOutboundCount: number;
  readonly textSimilarity: number | null;
  readonly latencyMs: number | null;
  readonly errorCode: string | null;
  readonly qualityAssessment: unknown;
  readonly businessFactStatus: string | null;
  readonly businessFactReasonCode: string | null;
}

export interface ShadowEvaluationStore {
  ready(): Promise<boolean>;
  claimNext(): Promise<ShadowEvaluationJob | null>;
  claimComparisonNext(): Promise<ShadowComparisonJob | null>;
  complete(evaluationId: string, claimToken: string, completion: ShadowEvaluationCompletion): Promise<void>;
  completeComparison(job: ShadowComparisonJob, textSimilarity: number, qualityAssessment: unknown): Promise<void>;
  fail(evaluationId: string, claimToken: string, errorCode: string, retryable: boolean, maxAttempts: number): Promise<void>;
  heartbeat(workerId: string, modelName: string, status: "STARTING" | "IDLE" | "PROCESSING" | "ERROR" | "STOPPING", errorCode?: string): Promise<void>;
  workerHealthy(maxAgeSeconds?: number): Promise<boolean>;
  summary(pageId?: string): Promise<ShadowEvaluationSummary>;
  recent(limit: number, pageId?: string): Promise<readonly ShadowEvaluationRecentItem[]>;
}

export interface PostgresShadowEvaluationOptions {
  readonly minimumSourceAgeSeconds?: number;
  readonly dailyGenerationLimit?: number;
  readonly hourlyGenerationLimit?: number;
}

interface ClaimedRow {
  evaluation_id: string;
  source_identity_key: string;
  source_message_pk: string;
  source_occurred_at: Date;
  conversation_id: string;
  page_id: string;
  attempt_count: number;
  prompt_version: string;
  claim_token: string;
}

interface ContextRow {
  direction: ShadowContextMessage["direction"];
  sender_type: ShadowContextMessage["senderType"];
  message_type: ShadowContextMessage["messageType"];
  text_redacted: string;
  attachment_count: number;
  occurred_at: Date;
}

interface ActualReplyRow {
  actual_text: string | null;
  actual_count: string;
}

function finiteNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function actualReply(
  client: PoolClient,
  conversationId: string,
  sourceOccurredAt: Date,
): Promise<{ text: string | null; count: number }> {
  const result = await client.query<ActualReplyRow>(
    `WITH next_inbound AS (
       SELECT min(occurred_at) AS at
       FROM messages
       WHERE conversation_id = $1 AND direction = 'INBOUND' AND occurred_at > $2::timestamptz
     )
     SELECT nullif(string_agg(nullif(text_redacted, ''), E'\n' ORDER BY occurred_at, created_at), '') AS actual_text,
            count(*)::text AS actual_count
     FROM messages, next_inbound
     WHERE conversation_id = $1
       AND direction = 'OUTBOUND'
       AND dlp_status = 'PASSED'
       AND occurred_at > $2::timestamptz
       AND occurred_at < LEAST(COALESCE(next_inbound.at, $2::timestamptz + interval '15 minutes'), $2::timestamptz + interval '15 minutes')`,
    [conversationId, sourceOccurredAt],
  );
  return { text: result.rows[0]?.actual_text ?? null, count: Number(result.rows[0]?.actual_count ?? 0) };
}

async function claimRow(
  client: PoolClient,
  minimumSourceAgeSeconds: number,
  dailyGenerationLimit: number,
  hourlyGenerationLimit: number,
): Promise<ClaimedRow | null> {
  await client.query(
    `UPDATE shadow_evaluations
     SET status = CASE WHEN attempt_count >= 3 THEN 'FAILED_PERMANENT' ELSE 'FAILED_RETRYABLE' END,
         next_attempt_at = now(), claimed_at = NULL, claim_token = NULL,
         error_code = 'STALE_PROCESSING_CLAIM', updated_at = now()
     WHERE status = 'PROCESSING' AND claimed_at < now() - interval '10 minutes'`,
  );
  const result = await client.query<ClaimedRow>(
    `WITH candidate AS (
       SELECT evaluation_id
       FROM shadow_evaluations
       WHERE status IN ('PENDING', 'FAILED_RETRYABLE')
          AND next_attempt_at <= now()
          AND attempt_count < 3
          AND source_occurred_at <= now() - make_interval(secs => $1)
          AND EXISTS (
            SELECT 1 FROM messages source_message
            WHERE source_message.message_pk = shadow_evaluations.source_message_pk
              AND source_message.occurred_at = shadow_evaluations.source_occurred_at
              AND source_message.dlp_status = 'PASSED'
          )
          AND (
            SELECT count(*) FROM shadow_evaluations generated_today
            WHERE generated_today.attempt_count > 0
              AND generated_today.claimed_at >= date_trunc('day', now())
          ) < $2
          AND (
            SELECT count(*) FROM shadow_evaluations generated_hour
            WHERE generated_hour.attempt_count > 0
              AND generated_hour.claimed_at >= date_trunc('hour', now())
          ) < $3
       ORDER BY source_occurred_at, evaluation_id
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE shadow_evaluations evaluation
     SET status = 'PROCESSING', attempt_count = attempt_count + 1,
         claimed_at = now(), claim_token = gen_random_uuid(), error_code = NULL, updated_at = now()
     FROM candidate
     WHERE evaluation.evaluation_id = candidate.evaluation_id
     RETURNING evaluation.evaluation_id, evaluation.source_identity_key,
       evaluation.source_message_pk, evaluation.source_occurred_at,
       evaluation.conversation_id, evaluation.page_id,
       evaluation.attempt_count, evaluation.prompt_version, evaluation.claim_token`,
    [minimumSourceAgeSeconds, dailyGenerationLimit, hourlyGenerationLimit],
  );
  return result.rows[0] ?? null;
}

export class PostgresShadowEvaluationStore implements ShadowEvaluationStore {
  private readonly pool: Pool;
  private readonly minimumSourceAgeSeconds: number;
  private readonly dailyGenerationLimit: number;
  private readonly hourlyGenerationLimit: number;

  constructor(connectionString: string, options: PostgresShadowEvaluationOptions = {}) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
    this.minimumSourceAgeSeconds = Math.max(10, Math.min(900, options.minimumSourceAgeSeconds ?? 30));
    this.dailyGenerationLimit = Math.max(1, Math.min(10_000, options.dailyGenerationLimit ?? 50));
    this.hourlyGenerationLimit = Math.max(1, Math.min(1_000, options.hourlyGenerationLimit ?? 10));
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ table_name: string | null }>(
        "SELECT to_regclass('public.shadow_evaluations')::text AS table_name",
      );
      return result.rows[0]?.table_name === "shadow_evaluations";
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async claimNext(): Promise<ShadowEvaluationJob | null> {
    return withTransaction(this.pool, async (client) => {
      const row = await claimRow(
        client,
        this.minimumSourceAgeSeconds,
        this.dailyGenerationLimit,
        this.hourlyGenerationLimit,
      );
      if (!row) return null;
      const contextResult = await client.query<ContextRow>(
        `SELECT direction, sender_type, message_type, text_redacted,
                attachment_count, occurred_at
         FROM messages
         WHERE conversation_id = $1 AND occurred_at <= $2::timestamptz
           AND dlp_status = 'PASSED'
         ORDER BY occurred_at DESC, created_at DESC
         LIMIT 20`,
        [row.conversation_id, row.source_occurred_at],
      );
      const context: ShadowContextMessage[] = contextResult.rows.reverse().map((message) => ({
        direction: message.direction,
        senderType: message.sender_type,
        messageType: message.message_type,
        text: message.text_redacted,
        attachmentCount: message.attachment_count,
        occurredAt: message.occurred_at.toISOString(),
      }));
      const actual = await actualReply(client, row.conversation_id, row.source_occurred_at);
      const contextHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");
      return {
        evaluationId: row.evaluation_id,
        claimToken: row.claim_token,
        sourceIdentityKey: row.source_identity_key,
        sourceMessagePk: row.source_message_pk,
        sourceOccurredAt: row.source_occurred_at.toISOString(),
        conversationId: row.conversation_id,
        pageId: row.page_id,
        attemptCount: row.attempt_count,
        promptVersion: row.prompt_version,
        context,
        contextHash,
        actualOutboundText: actual.text,
        actualOutboundCount: actual.count,
      };
    });
  }

  async claimComparisonNext(): Promise<ShadowComparisonJob | null> {
    return withTransaction(this.pool, async (client) => {
      const picked = await client.query<{
        evaluation_id: string; claim_token: string; conversation_id: string;
        source_occurred_at: Date; proposal_reply: string | null;
        proposal: unknown; guarded_plan: unknown; business_fact_payload: unknown;
      }>(
        `WITH candidate AS (
           SELECT evaluation_id
           FROM shadow_evaluations
           WHERE status = 'AWAITING_ACTUAL' AND next_attempt_at <= now()
           ORDER BY source_occurred_at, evaluation_id
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE shadow_evaluations evaluation
         SET claim_token = gen_random_uuid(), updated_at = now()
         FROM candidate
         WHERE evaluation.evaluation_id = candidate.evaluation_id
         RETURNING evaluation.evaluation_id, evaluation.claim_token,
           evaluation.conversation_id, evaluation.source_occurred_at,
           evaluation.proposal->>'reply' AS proposal_reply,
           evaluation.proposal, evaluation.guarded_plan,
           evaluation.business_fact_payload`,
      );
      const row = picked.rows[0];
      if (!row) return null;
      const actual = await actualReply(client, row.conversation_id, row.source_occurred_at);
      if (actual.text === null || actual.count === 0) {
        const expired = row.source_occurred_at.getTime() < Date.now() - 15 * 60_000;
        await client.query(
          `UPDATE shadow_evaluations
           SET status = CASE WHEN $3 THEN 'COMPLETED' ELSE 'AWAITING_ACTUAL' END,
               completed_at = CASE WHEN $3 THEN now() ELSE completed_at END,
               next_attempt_at = now() + interval '30 seconds', claim_token = NULL,
               updated_at = now()
           WHERE evaluation_id = $1 AND claim_token = $2`,
          [row.evaluation_id, row.claim_token, expired],
        );
        return null;
      }
      const contextResult = await client.query<ContextRow>(
        `SELECT direction, sender_type, message_type, text_redacted,
                attachment_count, occurred_at
         FROM messages
         WHERE conversation_id = $1 AND occurred_at <= $2::timestamptz
           AND dlp_status = 'PASSED'
         ORDER BY occurred_at DESC, created_at DESC
         LIMIT 20`,
        [row.conversation_id, row.source_occurred_at],
      );
      return {
        evaluationId: row.evaluation_id,
        claimToken: row.claim_token,
        proposalReply: row.proposal_reply ?? "",
        actualOutboundText: actual.text,
        actualOutboundCount: actual.count,
        proposalSummary: row.proposal,
        guardOutcome: row.guarded_plan,
        businessFactEnvelope: row.business_fact_payload,
        context: contextResult.rows.reverse().map((message) => ({
          direction: message.direction,
          senderType: message.sender_type,
          messageType: message.message_type,
          text: message.text_redacted,
          attachmentCount: message.attachment_count,
          occurredAt: message.occurred_at.toISOString(),
        })),
      };
    });
  }

  async complete(
    evaluationId: string,
    claimToken: string,
    completion: ShadowEvaluationCompletion,
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE shadow_evaluations
       SET status = 'AWAITING_ACTUAL', completed_at = NULL,
           next_attempt_at = CASE WHEN $13 > 0 THEN now() ELSE now() + interval '30 seconds' END,
           model_provider = $2, model_name = $3, model_version = $4,
           proposal = $5::jsonb, guarded_plan = $6::jsonb,
           blocked_reason_codes = $7::text[], latency_ms = $8,
           token_usage = $9::jsonb, text_similarity = $10,
           input_context_hash = $11, actual_outbound_text_redacted = $12,
           actual_outbound_count = $13,
           business_fact_status = $14, business_fact_source = $15,
           business_fact_observed_at = $16, business_fact_expires_at = $17,
           business_fact_product_id = $18, business_fact_reason_code = $19,
           business_fact_payload = $20::jsonb,
           claim_token = NULL,
           error_code = NULL, updated_at = now()
       WHERE evaluation_id = $1 AND status = 'PROCESSING' AND claim_token = $21`,
      [
        evaluationId,
        completion.modelProvider,
        completion.modelName,
        completion.modelVersion,
        JSON.stringify(completion.proposal),
        JSON.stringify(completion.guardedPlan),
        [...completion.blockedReasonCodes],
        Math.max(0, Math.round(completion.latencyMs)),
        JSON.stringify(completion.tokenUsage),
        completion.textSimilarity,
        completion.inputContextHash,
        completion.actualOutboundText,
        completion.actualOutboundCount,
        completion.businessFactAudit?.status ?? null,
        completion.businessFactAudit?.source ?? null,
        completion.businessFactAudit?.observedAt ?? null,
        completion.businessFactAudit?.expiresAt ?? null,
        completion.businessFactAudit?.productId ?? null,
        completion.businessFactAudit?.reasonCode ?? null,
        completion.businessFactEnvelope === null
          ? null
          : JSON.stringify(completion.businessFactEnvelope),
        claimToken,
      ],
    );
    if (result.rowCount !== 1) throw new Error("SHADOW_EVALUATION_COMPLETION_CONFLICT");
  }

  async completeComparison(
    job: ShadowComparisonJob,
    textSimilarity: number,
    qualityAssessment: unknown,
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE shadow_evaluations
       SET status = 'COMPLETED', completed_at = now(), claim_token = NULL,
           actual_outbound_text_redacted = $3, actual_outbound_count = $4,
           text_similarity = $5, quality_assessment = $6::jsonb, updated_at = now()
       WHERE evaluation_id = $1 AND status = 'AWAITING_ACTUAL' AND claim_token = $2`,
      [
        job.evaluationId,
        job.claimToken,
        job.actualOutboundText,
        job.actualOutboundCount,
        textSimilarity,
        JSON.stringify(qualityAssessment),
      ],
    );
    if (result.rowCount !== 1) throw new Error("SHADOW_COMPARISON_COMPLETION_CONFLICT");
  }

  async fail(
    evaluationId: string,
    claimToken: string,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number,
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE shadow_evaluations
       SET status = CASE WHEN NOT $4 OR attempt_count >= $3 THEN 'FAILED_PERMANENT' ELSE 'FAILED_RETRYABLE' END,
           next_attempt_at = CASE
             WHEN NOT $4 OR attempt_count >= $3 THEN next_attempt_at
             ELSE now() + make_interval(secs => LEAST(300, CAST(power(2, attempt_count) AS integer)))
           END,
           claim_token = NULL, error_code = $2, updated_at = now()
       WHERE evaluation_id = $1 AND status = 'PROCESSING' AND claim_token = $5`,
      [evaluationId, errorCode.slice(0, 128), maxAttempts, retryable, claimToken],
    );
    if (result.rowCount !== 1) throw new Error("SHADOW_EVALUATION_FAILURE_CONFLICT");
  }

  async heartbeat(
    workerId: string,
    modelName: string,
    status: "STARTING" | "IDLE" | "PROCESSING" | "ERROR" | "STOPPING",
    errorCode?: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO shadow_worker_status (
         worker_id, status, model_name, last_seen_at, last_success_at, last_error_code
       ) VALUES ($1,$2,$3,now(),CASE WHEN $2 = 'IDLE' THEN now() ELSE NULL END,$4)
       ON CONFLICT (worker_id) DO UPDATE SET
         status = EXCLUDED.status, model_name = EXCLUDED.model_name,
         last_seen_at = now(),
         last_success_at = CASE WHEN EXCLUDED.status = 'IDLE' THEN now() ELSE shadow_worker_status.last_success_at END,
         last_error_code = EXCLUDED.last_error_code, updated_at = now()`,
      [workerId.slice(0, 128), status, modelName.slice(0, 128), errorCode?.slice(0, 128) ?? null],
    );
  }

  async workerHealthy(maxAgeSeconds = 60): Promise<boolean> {
    const result = await this.pool.query<{ healthy: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM shadow_worker_status
         WHERE last_seen_at >= now() - make_interval(secs => $1)
           AND status IN ('IDLE', 'PROCESSING')
       ) AS healthy`,
      [Math.max(10, Math.min(600, Math.trunc(maxAgeSeconds)))],
    );
    return result.rows[0]?.healthy === true;
  }

  async summary(pageId?: string): Promise<ShadowEvaluationSummary> {
    const pageFilter = pageId ? "WHERE page_id = $1" : "";
    const values = pageId ? [pageId] : [];
    const result = await this.pool.query<{
      total: string; pending: string; processing: string; awaiting_actual: string; completed: string;
      failed_retryable: string; failed_permanent: string; policy_blocked: string;
      with_actual_reply: string; average_latency_ms: string | null;
      average_text_similarity: string | null; average_actual_quality_score: string | null;
      with_business_facts: string; business_facts_ok: string;
    }>(
      `SELECT count(*)::text AS total,
        count(*) FILTER (WHERE status = 'PENDING')::text AS pending,
        count(*) FILTER (WHERE status = 'PROCESSING')::text AS processing,
        count(*) FILTER (WHERE status = 'AWAITING_ACTUAL')::text AS awaiting_actual,
        count(*) FILTER (WHERE status = 'COMPLETED')::text AS completed,
        count(*) FILTER (WHERE status = 'FAILED_RETRYABLE')::text AS failed_retryable,
        count(*) FILTER (WHERE status = 'FAILED_PERMANENT')::text AS failed_permanent,
        count(*) FILTER (WHERE cardinality(blocked_reason_codes) > 0)::text AS policy_blocked,
        count(*) FILTER (WHERE actual_outbound_count > 0)::text AS with_actual_reply,
        count(*) FILTER (WHERE business_fact_status IS NOT NULL)::text AS with_business_facts,
        count(*) FILTER (WHERE business_fact_status = 'OK')::text AS business_facts_ok,
        avg(latency_ms)::text AS average_latency_ms,
        avg(text_similarity)::text AS average_text_similarity,
        avg(CASE
          WHEN jsonb_typeof(quality_assessment->'scores'->'overall') = 'number'
          THEN (quality_assessment->'scores'->>'overall')::numeric
          ELSE NULL
        END)::text AS average_actual_quality_score
       FROM shadow_evaluations ${pageFilter}`,
      values,
    );
    const outbox = await this.pool.query<{ count: string }>("SELECT count(*)::text AS count FROM meta_outbox");
    const workerHealthy = await this.workerHealthy();
    const row = result.rows[0];
    if (!row) throw new Error("SHADOW_EVALUATION_SUMMARY_MISSING");
    return {
      total: Number(row.total),
      pending: Number(row.pending),
      processing: Number(row.processing),
      awaitingActual: Number(row.awaiting_actual),
      completed: Number(row.completed),
      failedRetryable: Number(row.failed_retryable),
      failedPermanent: Number(row.failed_permanent),
      policyBlocked: Number(row.policy_blocked),
      withActualReply: Number(row.with_actual_reply),
      averageLatencyMs: finiteNumber(row.average_latency_ms),
      averageTextSimilarity: finiteNumber(row.average_text_similarity),
      averageActualQualityScore: finiteNumber(row.average_actual_quality_score),
      withBusinessFacts: Number(row.with_business_facts),
      businessFactsOk: Number(row.business_facts_ok),
      metaOutboxCount: Number(outbox.rows[0]?.count ?? 0),
      workerHealthy,
    };
  }

  async recent(limit: number, pageId?: string): Promise<readonly ShadowEvaluationRecentItem[]> {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const values: unknown[] = pageId ? [pageId, boundedLimit] : [boundedLimit];
    const where = pageId ? "WHERE page_id = $1" : "";
    const limitParameter = pageId ? "$2" : "$1";
    const result = await this.pool.query<{
      evaluation_id: string; conversation_ref: string; status: string;
      source_occurred_at: Date; intent: string | null; action: string | null;
      proposal_reply: string | null; guarded_action: string | null;
      blocked_reason_codes: string[]; actual_outbound_text_redacted: string | null;
      actual_outbound_count: number; text_similarity: string | null;
      latency_ms: number | null; error_code: string | null;
      quality_assessment: unknown;
      business_fact_status: string | null; business_fact_reason_code: string | null;
    }>(
      `SELECT evaluation_id, left(customer_hash, 12) AS conversation_ref, status,
        source_occurred_at, proposal->>'intent' AS intent, proposal->>'action' AS action,
        proposal->>'reply' AS proposal_reply, guarded_plan->>'action' AS guarded_action,
        blocked_reason_codes, actual_outbound_text_redacted, actual_outbound_count,
        text_similarity::text, latency_ms, error_code, quality_assessment,
        business_fact_status, business_fact_reason_code
       FROM shadow_evaluations ${where}
       ORDER BY source_occurred_at DESC, evaluation_id DESC
       LIMIT ${limitParameter}`,
      values,
    );
    return result.rows.map((row) => ({
      evaluationId: row.evaluation_id,
      conversationRef: row.conversation_ref,
      status: row.status,
      sourceOccurredAt: row.source_occurred_at.toISOString(),
      intent: row.intent,
      action: row.action,
      proposalReply: row.proposal_reply,
      guardedAction: row.guarded_action,
      blockedReasonCodes: row.blocked_reason_codes,
      actualOutboundText: row.actual_outbound_text_redacted,
      actualOutboundCount: row.actual_outbound_count,
      textSimilarity: finiteNumber(row.text_similarity),
      latencyMs: row.latency_ms,
      errorCode: row.error_code,
      qualityAssessment: row.quality_assessment,
      businessFactStatus: row.business_fact_status,
      businessFactReasonCode: row.business_fact_reason_code,
    }));
  }
}
