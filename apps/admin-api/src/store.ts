import { createHash } from "node:crypto";
import type { LocalEnvelopeCipher } from "@lana/database";
import pg from "pg";
import {
  AdminQueryError,
  type AdminIdentity,
  type AdminStore,
  type AuditQuery,
  type ArtifactVersionQuery,
  type CreateArtifactVersionInput,
  type CreateAdminCommandInput,
  type ConversationQuery,
  type EvaluationQuery,
  type HandoffQuery,
  type OperationQuery,
  type OutreachMetricsQuery,
  type OutreachQuery,
  type TimelineQuery,
  type RollbackArtifactInput,
  type TransitionArtifactInput,
  type UpdateArtifactDraftInput,
} from "./types.js";

const { Pool } = pg;

interface Cursor {
  readonly time: string;
  readonly id: string;
}

interface EncryptedConversationIdentityRow {
  readonly page_id: string;
  readonly conversation_id: string;
  readonly external_id_ciphertext: Buffer;
  readonly external_id_nonce: Buffer;
  readonly external_id_auth_tag: Buffer;
  readonly customer_name_ciphertext: Buffer | null;
  readonly customer_name_nonce: Buffer | null;
  readonly customer_name_auth_tag: Buffer | null;
  readonly encryption_key_ref: string | null;
}

interface ListSpec {
  readonly view: string;
  readonly idColumn: string;
  readonly timeColumn: string;
  readonly columns: string;
}

const CONVERSATIONS: ListSpec = {
  view: "admin_conversations_v",
  idColumn: "conversation_id",
  timeColumn: "updated_at",
  columns: `conversation_id, page_id, customer_ref, routing_owner,
    conversation_owner, owner_lease_until, blocking_tag,
    blocking_tag_verified_at, state_version, tag_gate_status, product_id,
    sales_stage, considered_size, unresolved_question,
    last_provider_occurred_at, last_received_at,
    first_seen_at, updated_at, expires_at`,
};
const MESSAGES: ListSpec = {
  view: "admin_messages_v",
  idColumn: "message_pk",
  timeColumn: "occurred_at",
  columns: `message_pk, conversation_id, page_id, direction, sender_type,
    message_type, text_redacted_safe, dlp_status, attachment_count,
    product_id, sales_stage, intent, outcome, prompt_version, model_version,
    policy_version, catalog_version, occurred_at`,
};
const EVENTS: ListSpec = {
  view: "admin_conversation_events_v",
  idColumn: "event_id",
  timeColumn: "occurred_at",
  columns: `event_id, conversation_id, page_id, event_type, intent, stage,
    action, handoff_reason, owner, readiness_score, product_id, order_outcome,
    prompt_version, model_version, policy_version, catalog_version, occurred_at`,
};
const OUTREACH_MESSAGES: ListSpec = {
  view: "admin_outreach_messages_v",
  idColumn: "outreach_id",
  timeColumn: "created_at",
  columns: `outreach_id, conversation_id, page_id, template_id,
    template_version, status, response_status, response_intent,
    sent_at, delivered_at, read_at, responded_at, order_confirmed_at,
    order_value, created_at`,
};
const EVALUATIONS: ListSpec = {
  view: "admin_evaluations_v",
  idColumn: "evaluation_id",
  timeColumn: "source_occurred_at",
  columns: `evaluation_id, conversation_id, page_id, status,
    source_occurred_at, completed_at, prompt_version, model_provider,
    model_name, model_version, intent, proposed_action, guarded_action,
    blocked_reason_codes, actual_outbound_count, text_similarity,
    quality_overall_score, latency_ms, error_code, business_fact_status,
    business_fact_source, business_fact_observed_at, business_fact_expires_at,
    business_fact_product_id, business_fact_reason_code, created_at, updated_at`,
};
const INBOX: ListSpec = {
  view: "admin_inbox_v",
  idColumn: "inbox_id",
  timeColumn: "received_at",
  columns: `inbox_id, page_id, provider, status, provider_occurred_at,
    received_at, attempt_count, next_attempt_at, lease_until, last_error_code,
    processed_at, created_at, updated_at`,
};
const META_OUTBOX: ListSpec = {
  view: "admin_meta_outbox_v",
  idColumn: "outbox_id",
  timeColumn: "created_at",
  columns: `outbox_id, conversation_id, page_id, sequence_no, status,
    attempt_count, lease_until, request_started_at, accepted_at, delivered_at,
    read_at, ambiguity_reason, last_error_code, next_attempt_at, created_at,
    updated_at`,
};
const PANCAKE_OUTBOX: ListSpec = {
  view: "admin_pancake_outbox_v",
  idColumn: "operation_id",
  timeColumn: "created_at",
  columns: `operation_id, page_id, conversation_id, desired_tag, operation,
    status, attempt_count, lease_until, last_error_code, next_attempt_at,
    applied_at, created_at, updated_at`,
};
const AUDIT: ListSpec = {
  view: "admin_audit_v",
  idColumn: "audit_id",
  timeColumn: "occurred_at",
  columns: `audit_id, actor_type, actor_id_safe, action, resource_type,
    resource_id_hash, metadata_safe, correlation_id, occurred_at`,
};
const COMMANDS: ListSpec = {
  view: "admin_commands_v",
  idColumn: "command_id",
  timeColumn: "created_at",
  columns: `command_id, page_id, conversation_id, command_type, tag,
    pause_minutes, expected_state_version, enqueued_state_version, status,
    reason, requested_by_ref, correlation_id, attempt_count, next_attempt_at, lease_until,
    error_code, applied_state_version, created_at, updated_at, started_at,
    completed_at`,
};

const ARTIFACT_VERSIONS: ListSpec = {
  view: "admin_artifact_versions_v",
  idColumn: "version_id",
  timeColumn: "updated_at",
  columns: `version_id, artifact_key, artifact_kind, version_number,
    schema_version, lifecycle, revision, content, content_hash,
    created_by_subject, updated_by_subject, validated_by_subject,
    approved_by_subject, canary_by_subject, published_by_subject,
    retired_by_subject, validated_at, approved_at, canary_at,
    published_at, retired_at, created_at, updated_at`,
};

const HANDOFF_COLUMNS = `h.handoff_id, h.conversation_id, h.page_id,
  h.handoff_generation, h.source, h.reason_code,
  h.reason_detail_safe, h.product_id, h.facts_status, h.facts_reason_code,
  h.desired_tag, h.owner_before, h.owner_after, h.status, h.occurred_at,
  h.created_at, h.updated_at, h.acknowledged_at, h.resolved_at,
  h.pancake_sync_status, h.pancake_sync_error_code,
  h.trigger_message_pk, h.trigger_text_redacted_safe AS trigger_message_text_redacted_safe,
  h.trigger_message_type, h.trigger_attachment_count,
  c.customer_ref, c.conversation_owner, c.state_version,
  c.updated_at AS conversation_updated_at`;

export class PostgresAdminStore implements AdminStore {
  private readonly pool: pg.Pool;
  private readonly commandPool: pg.Pool | null;

  constructor(
    databaseUrl: string,
    commandDatabaseUrl = "",
    private readonly identityCipher?: LocalEnvelopeCipher,
  ) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      application_name: "lana-admin-api",
      max: 8,
      idleTimeoutMillis: 30_000,
      statement_timeout: 8_000,
      query_timeout: 10_000,
    });
    this.commandPool = commandDatabaseUrl
      ? new Pool({
          connectionString: commandDatabaseUrl,
          application_name: "lana-admin-command-api",
          max: 4,
          idleTimeoutMillis: 30_000,
          statement_timeout: 8_000,
          query_timeout: 10_000,
        })
      : null;
  }

  async controlReady(): Promise<boolean> {
    if (!this.commandPool) return false;
    try {
      const result = await this.commandPool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = 'admin_commands'`,
      );
      return result.rowCount === 1;
    } catch {
      return false;
    }
  }

  async policyControlReady(): Promise<boolean> {
    if (!this.commandPool) return false;
    try {
      const result = await this.commandPool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name = 'admin_artifact_versions'`,
      );
      return result.rowCount === 1;
    } catch {
      return false;
    }
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ ready: number }>(
        `SELECT 1 AS ready
         FROM information_schema.views
         WHERE table_schema = current_schema()
           AND table_name = 'admin_pages_v'`,
      );
      return result.rowCount === 1;
    } catch {
      return false;
    }
  }

  async dashboard(identity: AdminIdentity): Promise<Record<string, unknown>> {
    const scope = scopeClause(identity, "page_id", 1);
    const values = scope.values;
    const [pages, conversations, inbox, metaOutbox, pancakeOutbox, evaluations, funnel, workers, facts] =
      await Promise.all([
        this.pool.query(
          `SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
                  count(*) FILTER (WHERE kill_switch)::int AS kill_switch_on,
                  count(*) FILTER (WHERE routing_owner = 'APP')::int AS app_routed
           FROM admin_pages_v ${scope.sql}`,
          values,
        ),
        this.pool.query(
          `SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE conversation_owner = 'HUMAN')::int AS human,
                  count(*) FILTER (WHERE blocking_tag IS NOT NULL)::int AS blocked,
                  count(*) FILTER (WHERE updated_at >= now() - interval '24 hours')::int AS active_24h
           FROM admin_conversations_v ${scope.sql}`,
          values,
        ),
        this.statusCounts("admin_inbox_v", identity),
        this.statusCounts("admin_meta_outbox_v", identity),
        this.statusCounts("admin_pancake_outbox_v", identity),
        this.evaluationSummary(identity),
        this.salesFunnelSummary(identity),
        this.listWorkers(identity),
        this.businessFactSummary(identity),
      ]);
    return sanitize({
      pages: pages.rows[0] ?? {},
      conversations: conversations.rows[0] ?? {},
      queues: {
        inbox,
        meta_outbox: metaOutbox,
        pancake_outbox: pancakeOutbox,
      },
      evaluations,
      sales_funnel: funnel,
      workers,
      business_facts: facts,
      generated_at: new Date().toISOString(),
    }) as Record<string, unknown>;
  }

  async listPages(identity: AdminIdentity): Promise<readonly Record<string, unknown>[]> {
    const scope = scopeClause(identity, "page_id", 1);
    const result = await this.pool.query(
      `SELECT page_id, page_alias, status, routing_owner, app_send_enabled,
              kill_switch, updated_at, has_meta_verify_secret,
              has_meta_send_secret, has_pancake_secret, has_employee_tag,
              has_post_sale_tag
       FROM admin_pages_v ${scope.sql}
       ORDER BY page_alias ASC, page_id ASC`,
      scope.values,
    );
    return sanitizeRows(result.rows);
  }

  async pageHealth(
    identity: AdminIdentity,
    pageId: string,
  ): Promise<Record<string, unknown> | null> {
    assertPageAllowed(identity, pageId);
    const [page, workers, inbox, metaOutbox, pancakeOutbox, facts] = await Promise.all([
      this.pool.query(
        `SELECT page_id, page_alias, status, routing_owner, app_send_enabled,
                kill_switch, updated_at, has_meta_verify_secret,
                has_meta_send_secret, has_pancake_secret, has_employee_tag,
                has_post_sale_tag
         FROM admin_pages_v WHERE page_id = $1`,
        [pageId],
      ),
      this.pool.query(
        `SELECT worker_type, worker_id, status, mode, send_enabled, model_name,
                last_seen_at, last_success_at, last_error_code, updated_at
         FROM admin_worker_status_v
         ORDER BY worker_type, worker_id`,
      ),
      this.statusCountsForPage("admin_inbox_v", pageId),
      this.statusCountsForPage("admin_meta_outbox_v", pageId),
      this.statusCountsForPage("admin_pancake_outbox_v", pageId),
      this.businessFactSummary(identity, pageId),
    ]);
    if (!page.rows[0]) return null;
    return sanitize({
      page: page.rows[0],
      workers: workers.rows,
      queues: {
        inbox,
        meta_outbox: metaOutbox,
        pancake_outbox: pancakeOutbox,
      },
      business_facts: facts,
      generated_at: new Date().toISOString(),
    }) as Record<string, unknown>;
  }

  async listConversations(identity: AdminIdentity, query: ConversationQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.conversationOwner) {
      addFilter(filters, values, "conversation_owner", query.conversationOwner);
    }
    if (query.routingOwner) {
      addFilter(filters, values, "routing_owner", query.routingOwner);
    }
    if (query.blockingTag === "NONE") {
      filters.push("blocking_tag IS NULL");
    } else if (query.blockingTag) {
      addFilter(filters, values, "blocking_tag", query.blockingTag);
    }
    const page = await this.list(CONVERSATIONS, filters, values, query.limit, query.cursor);
    return {
      ...page,
      items: await this.enrichConversationIdentities(page.items),
    };
  }

  async getConversation(identity: AdminIdentity, conversationId: string) {
    const filters = ["conversation_id = $1"];
    const values: unknown[] = [conversationId];
    addScope(filters, values, identity, "page_id");
    const result = await this.pool.query(
      `SELECT ${CONVERSATIONS.columns}
       FROM ${CONVERSATIONS.view}
       WHERE ${filters.join(" AND ")}
       LIMIT 1`,
      values,
    );
    if (!result.rows[0]) return null;
    const [enriched] = await this.enrichConversationIdentities([
      sanitize(result.rows[0]) as Record<string, unknown>,
    ]);
    return enriched ?? null;
  }

  /**
   * Decrypts identity data only inside the authenticated admin API. The
   * generic read-only views intentionally remain pseudonymous and the UI
   * never receives a Pancake token or encryption material.
   */
  private async enrichConversationIdentities(
    items: readonly Record<string, unknown>[],
  ): Promise<readonly Record<string, unknown>[]> {
    if (!this.identityCipher || !this.commandPool || items.length === 0) return items;
    const requested = items
      .map((item) => ({
        pageId: typeof item.page_id === "string" ? item.page_id : "",
        conversationId: typeof item.conversation_id === "string"
          ? item.conversation_id
          : "",
      }))
      .filter((item) => item.pageId && item.conversationId);
    if (requested.length === 0) return items;
    try {
      const identity = await this.commandPool.query<EncryptedConversationIdentityRow>(
        `WITH requested(page_id, conversation_id) AS (
           SELECT * FROM unnest($1::text[], $2::uuid[])
         )
         SELECT link.page_id, link.conversation_id::text,
                link.external_id_ciphertext, link.external_id_nonce,
                link.external_id_auth_tag,
                profile.customer_name_ciphertext, profile.customer_name_nonce,
                profile.customer_name_auth_tag, profile.encryption_key_ref
         FROM requested
         JOIN provider_conversation_links AS link
           ON link.page_id = requested.page_id
          AND link.conversation_id = requested.conversation_id
          AND link.provider = 'PANCAKE'
          AND link.expires_at > now()
         LEFT JOIN admin_conversation_identities AS profile
           ON profile.page_id = link.page_id
          AND profile.conversation_id = link.conversation_id
          AND profile.provider = 'PANCAKE'
          AND profile.expires_at > now()`,
        [
          requested.map((item) => item.pageId),
          requested.map((item) => item.conversationId),
        ],
      );
      const byConversation = new Map<string, Record<string, unknown>>();
      for (const row of identity.rows) {
        const extra: Record<string, unknown> = {};
        const aad = `lana:provider-link:v1:${row.page_id}:${row.conversation_id}:PANCAKE`;
        extra.pancake_conversation_id = this.identityCipher.decryptValue(
          {
            ciphertext: row.external_id_ciphertext,
            nonce: row.external_id_nonce,
            authTag: row.external_id_auth_tag,
          },
          aad,
        );
        if (
          row.customer_name_ciphertext &&
          row.customer_name_nonce &&
          row.customer_name_auth_tag &&
          row.encryption_key_ref === this.identityCipher.keyRef
        ) {
          const name = this.identityCipher.decryptValue(
            {
              ciphertext: row.customer_name_ciphertext,
              nonce: row.customer_name_nonce,
              authTag: row.customer_name_auth_tag,
            },
            `lana:admin-identity:v1:${row.page_id}:${row.conversation_id}:PANCAKE`,
          ).trim();
          if (name) extra.customer_label = name.slice(0, 160);
        }
        byConversation.set(row.conversation_id, extra);
      }
      return items.map((item) => {
        const id = typeof item.conversation_id === "string" ? item.conversation_id : "";
        return { ...item, ...(byConversation.get(id) ?? {}) };
      });
    } catch {
      // Identity is optional enrichment. A corrupt/expired projection must not
      // make the operational conversation dashboard unavailable.
      return items;
    }
  }

  async listMessages(identity: AdminIdentity, query: TimelineQuery) {
    return this.timeline(MESSAGES, identity, query);
  }

  async listEvents(identity: AdminIdentity, query: TimelineQuery) {
    return this.timeline(EVENTS, identity, query);
  }

  async listOutreachMessages(identity: AdminIdentity, query: OutreachQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.templateId) addFilter(filters, values, "template_id", query.templateId);
    if (query.status) addFilter(filters, values, "status", query.status);
    if (query.since) {
      values.push(query.since);
      filters.push(`created_at >= $${values.length}`);
    }
    if (query.until) {
      values.push(query.until);
      filters.push(`created_at <= $${values.length}`);
    }
    return this.list(
      OUTREACH_MESSAGES,
      filters,
      values,
      query.limit,
      query.cursor,
    );
  }

  async outreachMetrics(
    identity: AdminIdentity,
    query: OutreachMetricsQuery,
  ) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.since) {
      values.push(query.since);
      filters.push(`period_end >= $${values.length}`);
    }
    if (query.until) {
      values.push(query.until);
      filters.push(`period_start <= $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.pool.query(
      `SELECT coalesce(sum(total), 0)::int AS total,
              coalesce(sum(sent), 0)::int AS sent,
              coalesce(sum(delivered), 0)::int AS delivered,
              coalesce(sum(read), 0)::int AS read,
              coalesce(sum(responded_24h), 0)::int AS responded_24h,
              coalesce(sum(positive_responses), 0)::int AS positive_responses,
              coalesce(sum(opt_outs), 0)::int AS opt_outs,
              coalesce(sum(converted_7d), 0)::int AS converted_7d,
              coalesce(sum(revenue), 0)::numeric AS revenue,
              CASE WHEN sum(responded_24h) > 0
                THEN round(
                  sum(avg_response_seconds * responded_24h)::numeric /
                    sum(responded_24h),
                  0
                )
                ELSE NULL
              END AS avg_response_seconds,
              min(period_start) AS period_start,
              max(period_end) AS period_end,
              max(updated_at) AS updated_at
       FROM admin_outreach_metrics_v ${where}`,
      values,
    );
    return sanitize(result.rows[0] ?? {}) as Record<string, unknown>;
  }

  async evaluationSummary(identity: AdminIdentity, pageId?: string) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (pageId) {
      assertPageAllowed(identity, pageId);
      addFilter(filters, values, "page_id", pageId);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
              count(*) FILTER (WHERE status = 'PROCESSING')::int AS processing,
              count(*) FILTER (WHERE status = 'AWAITING_ACTUAL')::int AS awaiting_actual,
              count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
              count(*) FILTER (WHERE status = 'FAILED_RETRYABLE')::int AS failed_retryable,
              count(*) FILTER (WHERE status = 'FAILED_PERMANENT')::int AS failed_permanent,
              round(avg(text_similarity)::numeric, 4) AS average_text_similarity,
              round(avg(quality_overall_score)::numeric, 2) AS average_quality_score,
              round(avg(latency_ms)::numeric, 0) AS average_latency_ms,
              max(source_occurred_at) AS latest_source_at,
              max(updated_at) AS latest_updated_at
       FROM admin_evaluations_v ${where}`,
      values,
    );
    return sanitize(result.rows[0] ?? {}) as Record<string, unknown>;
  }

  async salesFunnelSummary(
    identity: AdminIdentity,
    pageId?: string,
    lookbackHours = 48,
  ) {
    const filters = ["occurred_at >= now() - ($1::int * interval '1 hour')"];
    const values: unknown[] = [
      Math.max(1, Math.min(24 * 30, Math.trunc(lookbackHours))),
    ];
    addScope(filters, values, identity, "page_id");
    if (pageId) {
      assertPageAllowed(identity, pageId);
      addFilter(filters, values, "page_id", pageId);
    }
    const result = await this.pool.query(
      `WITH milestones AS (
         SELECT conversation_id,
           bool_or(command_kind = 'FACTS_PRESENTED' AND outcome = 'APPLIED') AS price_asked,
           bool_or(command_kind = 'SIZE_RECOMMENDED' AND outcome = 'APPLIED') AS size_consulted,
           bool_or(command_kind = 'CART_OPENED' AND outcome = 'APPLIED') AS cart_opened,
           bool_or(command_kind = 'PREVIEW_CREATED' AND outcome = 'APPLIED') AS order_preview,
           bool_or(command_kind = 'CONFIRM_PURCHASE' AND outcome = 'APPLIED') AS purchase_confirmed
         FROM sales_cycle_events
         WHERE ${filters.join(" AND ")}
         GROUP BY conversation_id
       ), totals AS (
         SELECT
           count(*) FILTER (WHERE price_asked)::int AS price_asked,
           count(*) FILTER (WHERE size_consulted)::int AS size_consulted,
           count(*) FILTER (WHERE cart_opened)::int AS cart_opened,
           count(*) FILTER (WHERE order_preview)::int AS order_preview,
           count(*) FILTER (WHERE purchase_confirmed)::int AS purchase_confirmed
         FROM milestones
       )
       SELECT *,
         round(100.0 * size_consulted / NULLIF(price_asked, 0), 2) AS price_to_size_pct,
         round(100.0 * cart_opened / NULLIF(size_consulted, 0), 2) AS size_to_cart_pct,
         round(100.0 * order_preview / NULLIF(cart_opened, 0), 2) AS cart_to_preview_pct,
         round(100.0 * purchase_confirmed / NULLIF(order_preview, 0), 2) AS preview_to_confirmed_pct,
         round(100.0 * purchase_confirmed / NULLIF(price_asked, 0), 2) AS end_to_end_pct,
         $1::int AS lookback_hours
       FROM totals`,
      values,
    );
    return sanitize(result.rows[0] ?? {}) as Record<string, unknown>;
  }

  async listEvaluations(identity: AdminIdentity, query: EvaluationQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.status) addFilter(filters, values, "status", query.status);
    return this.list(EVALUATIONS, filters, values, query.limit, query.cursor);
  }

  async businessFactSummary(identity: AdminIdentity, pageId?: string) {
    const filters = ["business_fact_status IS NOT NULL"];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (pageId) {
      assertPageAllowed(identity, pageId);
      addFilter(filters, values, "page_id", pageId);
    }
    const result = await this.pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE business_fact_status = 'OK')::int AS ok,
              count(*) FILTER (WHERE business_fact_status = 'STALE')::int AS stale,
              count(*) FILTER (WHERE business_fact_status = 'NOT_FOUND')::int AS not_found,
              count(*) FILTER (WHERE business_fact_status = 'AMBIGUOUS')::int AS ambiguous,
              count(*) FILTER (WHERE business_fact_status = 'ERROR')::int AS error,
              count(*) FILTER (
                WHERE business_fact_expires_at IS NOT NULL
                  AND business_fact_expires_at < now()
              )::int AS expired,
              max(business_fact_observed_at) AS latest_observed_at
       FROM admin_evaluations_v
       WHERE ${filters.join(" AND ")}`,
      values,
    );
    return sanitize({
      ...(result.rows[0] ?? {}),
      source: "POSTGRES_EVALUATION_AUDIT",
    }) as Record<string, unknown>;
  }

  async listWorkers(identity: AdminIdentity) {
    void identity;
    const result = await this.pool.query(
      `SELECT worker_type, worker_id, status, mode, send_enabled,
              model_name, last_seen_at, last_success_at, last_error_code,
              updated_at
       FROM admin_worker_status_v
       ORDER BY worker_type ASC, worker_id ASC`,
    );
    return sanitizeRows(result.rows);
  }

  /** Ảnh chụp dữ liệu nghiệp vụ do các worker batch ghi lại. Không phụ thuộc
   *  lưu lượng chat, nên vẫn có số liệu khi runtime chưa cutover. */
  async catalogSummary(identity: AdminIdentity) {
    void identity;
    const [sources, issues, workers] = await Promise.all([
      this.pool.query(
        `SELECT snapshot_key, source, status, record_count, detail, metrics,
                observed_at, updated_at
         FROM admin_catalog_status_v
         ORDER BY snapshot_key ASC`,
      ),
      this.pool.query(
        `SELECT snapshot_key, product_id, issue_code, severity, source, detected_at
         FROM admin_catalog_issues_v
         ORDER BY (severity = 'critical') DESC, detected_at DESC, product_id ASC
         LIMIT 200`,
      ),
      this.pool.query(
        `SELECT worker_type, worker_id, status, mode, last_seen_at, last_success_at,
                last_error_code, last_run_ms, stats, updated_at
         FROM admin_batch_worker_status_v
         ORDER BY worker_type ASC, worker_id ASC`,
      ),
    ]);
    const rows = sources.rows as { status?: unknown; record_count?: unknown }[];
    const totals = {
      sources: rows.length,
      records: rows.reduce((sum, row) => sum + Number(row.record_count ?? 0), 0),
      degraded: rows.filter((row) => row.status !== "OK").length,
      issues: issues.rowCount ?? 0,
    };
    return sanitize({
      sources: sources.rows,
      problems: issues.rows,
      workers: workers.rows,
      totals,
    }) as Record<string, unknown>;
  }

  async listInbox(identity: AdminIdentity, query: OperationQuery) {
    return this.operation(INBOX, identity, query);
  }

  async listMetaOutbox(identity: AdminIdentity, query: OperationQuery) {
    return this.operation(META_OUTBOX, identity, query);
  }

  async listPancakeOutbox(identity: AdminIdentity, query: OperationQuery) {
    return this.operation(PANCAKE_OUTBOX, identity, query);
  }

  async handoffSummary(identity: AdminIdentity, pageId?: string) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (pageId) {
      assertPageAllowed(identity, pageId);
      addFilter(filters, values, "page_id", pageId);
    }
    filters.push("desired_tag = 'NHAN_VIEN'");
    filters.push("source IN ('BOT_POLICY', 'CUSTOMER_REQUEST')");
    const where = `WHERE ${filters.join(" AND ")}`;
    const [counts, reasons] = await Promise.all([
      this.pool.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE status = 'NEW')::int AS new,
                count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
                count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
                count(*) FILTER (
                  WHERE status = 'RESOLVED' AND resolved_at >= now() - interval '24 hours'
                )::int AS resolved_24h,
                min(occurred_at) FILTER (
                  WHERE status IN ('NEW', 'IN_PROGRESS')
                ) AS oldest_open_at
         FROM admin_handoff_queue_v ${where}`,
        values,
      ),
      this.pool.query(
        `SELECT reason_code, count(*)::int AS count
         FROM admin_handoff_queue_v ${where}
         GROUP BY reason_code ORDER BY count(*) DESC, reason_code ASC
         LIMIT 50`,
        values,
      ),
    ]);
    return sanitize({
      ...(counts.rows[0] ?? {}),
      reasons: reasons.rows,
      generated_at: new Date().toISOString(),
    }) as Record<string, unknown>;
  }

  async listHandoffs(identity: AdminIdentity, query: HandoffQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "h.page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "h.page_id", query.pageId);
    }
    if (query.status === "OPEN") {
      filters.push("h.status IN ('NEW', 'IN_PROGRESS')");
    } else if (query.status) {
      addFilter(filters, values, "h.status", query.status);
    }
    if (query.reasonCode) addFilter(filters, values, "h.reason_code", query.reasonCode);
    if (!query.source) {
      filters.push("h.source IN ('BOT_POLICY', 'CUSTOMER_REQUEST')");
    } else if (query.source !== "ALL") {
      addFilter(filters, values, "h.source", query.source);
    }
    if (!query.desiredTag) {
      filters.push("h.desired_tag = 'NHAN_VIEN'");
    } else if (query.desiredTag !== "ALL") {
      addFilter(filters, values, "h.desired_tag", query.desiredTag);
    }
    if (query.conversationId) {
      addFilter(filters, values, "h.conversation_id", query.conversationId);
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      values.push(cursor.time, cursor.id);
      filters.push(
        `(h.occurred_at, h.handoff_id::text) > ($${values.length - 1}::timestamptz, $${values.length})`,
      );
    }
    values.push(query.limit + 1);
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.pool.query(
      `SELECT ${HANDOFF_COLUMNS}
       FROM admin_handoff_queue_v AS h
       LEFT JOIN admin_conversations_v AS c
         ON c.conversation_id = h.conversation_id AND c.page_id = h.page_id
       ${where}
       ORDER BY h.occurred_at ASC, h.handoff_id ASC
       LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const enriched = await this.enrichConversationIdentities(sanitizeRows(rows));
    const last = rows.at(-1);
    return {
      items: enriched,
      nextCursor: hasMore && last
        ? encodeCursor({ time: toIso(last.occurred_at), id: String(last.handoff_id) })
        : null,
    };
  }

  async getHandoff(identity: AdminIdentity, handoffId: string) {
    const filters = ["h.handoff_id = $1"];
    const values: unknown[] = [handoffId];
    addScope(filters, values, identity, "h.page_id");
    const result = await this.pool.query(
      `SELECT ${HANDOFF_COLUMNS}
       FROM admin_handoff_queue_v AS h
       LEFT JOIN admin_conversations_v AS c
         ON c.conversation_id = h.conversation_id AND c.page_id = h.page_id
       WHERE ${filters.join(" AND ")}
       LIMIT 1`,
      values,
    );
    if (!result.rows[0]) return null;
    const [enriched] = await this.enrichConversationIdentities(
      sanitizeRows([result.rows[0]]),
    );
    if (!enriched) return null;
    const history = await this.pool.query(
      `SELECT h.handoff_id, h.page_id, h.conversation_id, h.direction,
              h.source, h.reason_code, h.reason_detail_safe, h.product_id,
              h.facts_status, h.facts_reason_code, h.desired_tag,
              h.owner_before, h.owner_after, h.handoff_generation,
              h.trigger_message_pk,
              h.trigger_text_redacted_safe AS trigger_message_text_redacted_safe,
              h.trigger_message_type, h.trigger_attachment_count,
              h.source_admin_command_id, h.related_handoff_id,
              h.occurred_at, h.created_at
       FROM admin_handoff_history_v AS h
       WHERE h.conversation_id = $1 AND h.page_id = $2
       ORDER BY h.occurred_at DESC, h.handoff_id DESC
       LIMIT 100`,
      [enriched.conversation_id, enriched.page_id],
    );
    return {
      ...enriched,
      history: sanitizeRows(history.rows),
    };
  }

  async listAudit(identity: AdminIdentity, query: AuditQuery) {
    if (identity.pageScope !== "ALL") {
      return { items: [], nextCursor: null };
    }
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.action) addFilter(filters, values, "action", query.action);
    if (query.resourceType) {
      addFilter(filters, values, "resource_type", query.resourceType);
    }
    return this.list(AUDIT, filters, values, query.limit, query.cursor);
  }

  async createConversationCommand(
    identity: AdminIdentity,
    conversationId: string,
    input: CreateAdminCommandInput,
  ) {
    if (identity.role !== "OWNER") {
      throw new AdminQueryError("ADMIN_PAGE_NOT_ALLOWED");
    }
    const fingerprint = commandFingerprint(conversationId, input);
    if (!this.commandPool) {
      throw new AdminQueryError("ADMIN_CONTROL_UNAVAILABLE");
    }
    const client = await this.commandPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`${identity.subject}:${input.idempotencyKey}`],
      );
      const replay = await client.query(
        `SELECT command_id, page_id, status, request_fingerprint
         FROM admin_commands
         WHERE requested_by_subject = $1 AND idempotency_key = $2`,
        [identity.subject, input.idempotencyKey],
      );
      if (replay.rows[0]) {
        if (replay.rows[0].request_fingerprint !== fingerprint) {
          throw new AdminQueryError("ADMIN_IDEMPOTENCY_CONFLICT");
        }
        assertPageAllowed(identity, String(replay.rows[0].page_id));
        const replayView = await client.query(
          `SELECT ${COMMANDS.columns}
           FROM admin_commands_v WHERE command_id = $1`,
          [replay.rows[0].command_id],
        );
        const row = replayView.rows[0];
        await client.query("COMMIT");
        return {
          command: sanitize(row) as Record<string, unknown>,
          created: false,
          conflicted: replay.rows[0].status === "CONFLICT",
        };
      }

      const conversation = await client.query<{
        page_id: string;
        state_version: string;
        conversation_owner: string;
        product_id: string | null;
      }>(
        `SELECT c.page_id, c.state_version, c.conversation_owner,
                nullif(c.state_snapshot->>'currentProductId', '') AS product_id
         FROM conversations AS c
         WHERE conversation_id = $1
         FOR UPDATE`,
        [conversationId],
      );
      const current = conversation.rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return null;
      }
      assertPageAllowed(identity, current.page_id);
      const currentVersion = Number(current.state_version);
      const active = await client.query(
        `SELECT 1 FROM admin_commands
         WHERE conversation_id = $1
           AND expected_state_version = $2
           AND status IN ('PENDING', 'PROCESSING')
         LIMIT 1`,
        [conversationId, input.expectedStateVersion],
      );
      const conflictCode = currentVersion !== input.expectedStateVersion
        ? "STATE_VERSION_CONFLICT"
        : active.rowCount
          ? "COMMAND_ALREADY_ACTIVE_FOR_VERSION"
          : null;

      let enqueuedStateVersion: number | null = null;
      let status: "PENDING" | "CONFLICT" = "PENDING";
      if (conflictCode) {
        status = "CONFLICT";
      } else if (blocksBotImmediately(input.command)) {
        const leaseMinutes = input.command === "PAUSE_BOT"
          ? input.pauseMinutes!
          : 15;
        enqueuedStateVersion = currentVersion + 1;
        const held = await client.query(
          `UPDATE conversations
           SET conversation_owner = 'HUMAN',
               owner_lease_until = now() + ($2::integer * interval '1 minute'),
               state_version = $3,
               state_snapshot = state_snapshot || jsonb_build_object(
                 'conversationOwner', 'HUMAN',
                 'ownerReason', 'MANUAL',
                 'ownerLeaseUntil', to_char(
                   (now() + ($2::integer * interval '1 minute')) AT TIME ZONE 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                 ),
                 'revision', $3::bigint,
                 'updatedAt', to_char(
                   now() AT TIME ZONE 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                 )
               ),
               updated_at = now(),
               expires_at = now() + interval '20 days'
           WHERE conversation_id = $1 AND state_version = $4`,
          [conversationId, leaseMinutes, enqueuedStateVersion, currentVersion],
        );
        if (held.rowCount !== 1) {
          throw new AdminQueryError("ADMIN_IDEMPOTENCY_CONFLICT");
        }
      }

      const inserted = await client.query(
        `INSERT INTO admin_commands (
           idempotency_key, request_fingerprint, page_id, conversation_id,
           command_type, tag, pause_minutes, expected_state_version,
           enqueued_state_version, status, reason, requested_by_subject,
           requested_by_role, correlation_id, error_code, completed_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'OWNER',$13,$14,
           CASE WHEN $10 = 'CONFLICT' THEN now() ELSE NULL END
         )
         RETURNING command_id`,
        [
          input.idempotencyKey,
          fingerprint,
          current.page_id,
          conversationId,
          input.command,
          input.tag,
          input.pauseMinutes,
          input.expectedStateVersion,
          enqueuedStateVersion,
          status,
          input.reason,
          identity.subject,
          input.correlationId,
          conflictCode,
        ],
      );
      const commandId = String(inserted.rows[0].command_id);
      if (
        status === "PENDING" &&
        enqueuedStateVersion !== null &&
        current.conversation_owner === "BOT" &&
        (input.command === "HANDOFF_NHAN_VIEN" ||
          input.command === "HANDOFF_VAN_DON")
      ) {
        const handoff = await client.query<{ handoff_id: string }>(
          `INSERT INTO public.handoff_events (
             page_id, conversation_id, direction, source, reason_code,
             reason_detail_safe, product_id, facts_status, facts_reason_code,
             desired_tag, owner_before, owner_after, handoff_generation,
             trigger_event_key_hash, source_admin_command_id, occurred_at
           ) VALUES (
             $1,$2,'BOT_TO_HUMAN','ADMIN',$3,$4::jsonb,$5,NULL,NULL,$6,
             $7,'HUMAN',$8,encode(digest($9, 'sha256'), 'hex'),$9,now()
           )
           ON CONFLICT DO NOTHING
           RETURNING handoff_id`,
          [
            current.page_id,
            conversationId,
            input.reason,
            JSON.stringify({ command: input.command, actor_role: identity.role }),
            current.product_id,
            input.command === "HANDOFF_VAN_DON" ? "VAN_DON" : "NHAN_VIEN",
            current.conversation_owner,
            enqueuedStateVersion,
            commandId,
          ],
        );
        const handoffId = handoff.rows[0]?.handoff_id;
        if (handoffId) {
          await client.query(
            `INSERT INTO public.handoff_cases (
               opening_handoff_id, page_id, conversation_id, status,
               created_at, updated_at
             ) VALUES ($1,$2,$3,'NEW',now(),now())
             ON CONFLICT DO NOTHING`,
            [handoffId, current.page_id, conversationId],
          );
        }
      }
      await client.query(
        `INSERT INTO admin_command_events (
           command_id, page_id, conversation_id, event_type, to_status,
           actor_type, actor_ref, metadata_safe
         ) VALUES ($1,$2,$3,'CREATED',$4,'USER',$5,$6::jsonb)`,
        [
          commandId,
          current.page_id,
          conversationId,
          status,
          identity.subject,
          JSON.stringify({ command: input.command, conflict_code: conflictCode }),
        ],
      );
      await client.query(
        `INSERT INTO audit_log (
           actor_type, actor_id, action, resource_type, resource_id_hash,
           metadata_safe, correlation_id, entry_hash
         ) VALUES (
           'USER',$1,'ADMIN_COMMAND_CREATED','ADMIN_COMMAND',
           encode(digest($2, 'sha256'), 'hex'),$3::jsonb,$4,digest('', 'sha256')
         )`,
        [
          identity.subject,
          commandId,
          JSON.stringify({
            page_id: current.page_id,
            command: input.command,
            status,
            expected_state_version: input.expectedStateVersion,
            enqueued_state_version: enqueuedStateVersion,
          }),
          input.correlationId,
        ],
      );
      const result = await client.query(
        `SELECT ${COMMANDS.columns}
         FROM admin_commands_v WHERE command_id = $1`,
        [commandId],
      );
      await client.query("COMMIT");
      return {
        command: sanitize(result.rows[0]) as Record<string, unknown>,
        created: true,
        conflicted: status === "CONFLICT",
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCommand(identity: AdminIdentity, commandId: string) {
    const filters = ["command_id = $1"];
    const values: unknown[] = [commandId];
    addScope(filters, values, identity, "page_id");
    const result = await this.pool.query(
      `SELECT ${COMMANDS.columns} FROM admin_commands_v
       WHERE ${filters.join(" AND ")} LIMIT 1`,
      values,
    );
    return result.rows[0]
      ? sanitize(result.rows[0]) as Record<string, unknown>
      : null;
  }

  async listConversationCommands(
    identity: AdminIdentity,
    conversationId: string,
    query: { limit: number; cursor?: string; pageId?: string },
  ) {
    const conversation = await this.getConversation(identity, conversationId);
    if (!conversation) return null;
    const filters = ["conversation_id = $1"];
    const values: unknown[] = [conversationId];
    addScope(filters, values, identity, "page_id");
    return this.list(COMMANDS, filters, values, query.limit, query.cursor);
  }

  async listArtifactVersions(_identity: AdminIdentity, query: ArtifactVersionQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];
    if (query.artifactKind) addFilter(filters, values, "artifact_kind", query.artifactKind);
    if (query.lifecycle) addFilter(filters, values, "lifecycle", query.lifecycle);
    if (query.artifactKey) addFilter(filters, values, "artifact_key", query.artifactKey);
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      values.push(cursor.time, cursor.id);
      filters.push(`(updated_at, version_id::text) < ($${values.length - 1}::timestamptz, $${values.length})`);
    }
    values.push(query.limit + 1);
    const result = await this.pool.query(
      `SELECT ${ARTIFACT_VERSIONS.columns}
       FROM admin_artifact_versions_v
       ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
       ORDER BY updated_at DESC, version_id DESC
       LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      items: rows.map(policySafeRow),
      nextCursor: hasMore && last
        ? encodeCursor({ time: toIso(last.updated_at), id: String(last.version_id) })
        : null,
    };
  }

  async getArtifactVersion(_identity: AdminIdentity, versionId: string) {
    const result = await this.pool.query(
      `SELECT ${ARTIFACT_VERSIONS.columns}
       FROM admin_artifact_versions_v WHERE version_id = $1 LIMIT 1`,
      [versionId],
    );
    return result.rows[0] ? policySafeRow(result.rows[0]) : null;
  }

  async listArtifactEvents(_identity: AdminIdentity, versionId: string) {
    const result = await this.pool.query(
      `SELECT event_id, version_id, artifact_key, action, from_lifecycle,
              to_lifecycle, actor_subject, actor_role, page_id, channel,
              correlation_id, metadata_safe, occurred_at
       FROM admin_artifact_events
       WHERE version_id = $1
       ORDER BY occurred_at DESC, event_id DESC
       LIMIT 500`,
      [versionId],
    );
    return result.rows.map(policySafeRow);
  }

  async createArtifactVersion(identity: AdminIdentity, input: CreateArtifactVersionInput) {
    assertPolicyRole(identity, ["OWNER", "EDITOR"]);
    const pool = this.requirePolicyPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`lana.admin-artifact:${input.artifactKey}`]);
      const next = await client.query<{ version_number: number }>(
        `SELECT coalesce(max(version_number), 0)::int + 1 AS version_number
         FROM admin_artifact_versions WHERE artifact_key = $1`,
        [input.artifactKey],
      );
      const versionNumber = next.rows[0]?.version_number ?? 1;
      const contentHash = hashStructuredContent(input.content);
      const inserted = await client.query(
        `INSERT INTO admin_artifact_versions (
           artifact_key, artifact_kind, version_number, content, content_hash,
           created_by_subject, updated_by_subject
         ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$6)
         RETURNING ${ARTIFACT_VERSIONS.columns}`,
        [input.artifactKey, input.content.kind, versionNumber, JSON.stringify(input.content), contentHash, identity.subject],
      );
      const row = inserted.rows[0];
      await insertArtifactEvent(client, {
        versionId: String(row.version_id), artifactKey: input.artifactKey,
        action: "CREATED", fromLifecycle: null, toLifecycle: "DRAFT",
        identity, correlationId: input.correlationId,
      });
      await client.query("COMMIT");
      return policySafeRow(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateArtifactDraft(
    identity: AdminIdentity,
    versionId: string,
    input: UpdateArtifactDraftInput,
  ) {
    assertPolicyRole(identity, ["OWNER", "EDITOR"]);
    const pool = this.requirePolicyPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const currentResult = await client.query(
        `SELECT version_id, artifact_key, artifact_kind, lifecycle, revision
         FROM admin_artifact_versions WHERE version_id = $1 FOR UPDATE`,
        [versionId],
      );
      const current = currentResult.rows[0];
      if (!current) { await client.query("ROLLBACK"); return null; }
      if (current.lifecycle !== "DRAFT" || Number(current.revision) !== input.expectedRevision) {
        throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
      }
      if (current.artifact_kind !== input.content.kind) {
        throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      }
      const updated = await client.query(
        `UPDATE admin_artifact_versions
         SET content = $2::jsonb, content_hash = $3, revision = revision + 1,
             updated_by_subject = $4
         WHERE version_id = $1
         RETURNING ${ARTIFACT_VERSIONS.columns}`,
        [versionId, JSON.stringify(input.content), hashStructuredContent(input.content), identity.subject],
      );
      await insertArtifactEvent(client, {
        versionId, artifactKey: String(current.artifact_key), action: "UPDATED",
        fromLifecycle: "DRAFT", toLifecycle: "DRAFT", identity,
        correlationId: input.correlationId,
      });
      await client.query("COMMIT");
      return policySafeRow(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async transitionArtifactVersion(
    identity: AdminIdentity,
    versionId: string,
    input: TransitionArtifactInput,
  ) {
    assertTransitionRole(identity, input.action);
    if (input.pageId) assertPageAllowed(identity, input.pageId);
    const pool = this.requirePolicyPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query(
        `SELECT version_id, artifact_key, artifact_kind, lifecycle, revision, content
         FROM admin_artifact_versions WHERE version_id = $1 FOR UPDATE`,
        [versionId],
      );
      const current = selected.rows[0];
      if (!current) { await client.query("ROLLBACK"); return null; }
      if (Number(current.revision) !== input.expectedRevision) {
        throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
      }
      const target = transitionTarget(String(current.lifecycle), input.action, input.canaryMode);
      if (!target) throw new AdminQueryError("ADMIN_ARTIFACT_TRANSITION_INVALID");
      if ((input.action === "START_CANARY" || input.action === "PUBLISH") && !input.pageId) {
        throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      }
      if (input.action === "START_CANARY" && !input.canaryMode) {
        throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      }
      if (isShadowToLivePromotion(String(current.lifecycle), input.action, input.canaryMode)) {
        const shadowPointer = await client.query(
          `SELECT pointer_id
           FROM admin_active_pointers
           WHERE artifact_key = $1 AND artifact_kind = $2 AND page_id = $3
             AND channel = 'CANARY_SHADOW' AND version_id = $4 AND active
           FOR UPDATE`,
          [current.artifact_key, current.artifact_kind, input.pageId, versionId],
        );
        if (!shadowPointer.rowCount) {
          throw new AdminQueryError("ADMIN_ARTIFACT_TRANSITION_INVALID");
        }
      }
      if (input.action === "RETIRE") {
        const pointer = await client.query(
          "SELECT 1 FROM admin_active_pointers WHERE version_id = $1 AND active LIMIT 1",
          [versionId],
        );
        if (pointer.rowCount) throw new AdminQueryError("ADMIN_ARTIFACT_TRANSITION_INVALID");
      }
      const actorColumn = transitionActorColumn(input.action);
      const timeColumn = transitionTimeColumn(input.action);
      const transitionAt = new Date().toISOString();
      const approvedContent =
        input.action === "APPROVE" && String(current.artifact_kind) === "SIZE_CHART"
          ? verifySizeChartContent(current.content, identity.subject, transitionAt)
          : current.content;
      const updated = await client.query(
        `UPDATE admin_artifact_versions
         SET lifecycle = $2, revision = revision + 1, updated_by_subject = $3,
             ${actorColumn} = $3, ${timeColumn} = now(),
             content = $4::jsonb, content_hash = $5
         WHERE version_id = $1
         RETURNING ${ARTIFACT_VERSIONS.columns}`,
        [
          versionId,
          target,
          identity.subject,
          JSON.stringify(approvedContent),
          hashStructuredContent(approvedContent),
        ],
      );
      let channel: string | null = null;
      if (input.action === "START_CANARY") {
        channel = input.canaryMode === "LIVE_OUTBOUND" ? "CANARY_LIVE" : "CANARY_SHADOW";
        await upsertArtifactPointer(client, current, input.pageId!, channel, versionId, identity.subject);
      } else if (input.action === "PUBLISH") {
        channel = "PUBLISHED";
        await upsertArtifactPointer(client, current, input.pageId!, channel, versionId, identity.subject);
      }
      await insertArtifactEvent(client, {
        versionId, artifactKey: String(current.artifact_key),
        action: transitionEventAction(input.action),
        fromLifecycle: String(current.lifecycle), toLifecycle: target,
        identity, correlationId: input.correlationId, pageId: input.pageId,
        channel,
      });
      await client.query("COMMIT");
      return policySafeRow(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listActivePointers(_identity: AdminIdentity) {
    const result = await this.pool.query(
      `SELECT pointer_id, artifact_key, artifact_kind, page_id, channel,
              version_id, revision, updated_by_subject, updated_at,
              version_number, lifecycle, content_hash
       FROM admin_active_pointers_v
       ORDER BY artifact_kind, artifact_key, page_id NULLS FIRST, channel`,
    );
    return result.rows.map(policySafeRow);
  }

  async rollbackArtifactPointer(identity: AdminIdentity, input: RollbackArtifactInput) {
    assertPolicyRole(identity, ["OWNER"]);
    assertPageAllowed(identity, input.pageId);
    const pool = this.requirePolicyPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const target = await client.query(
        `SELECT version_id, artifact_key, artifact_kind, lifecycle
         FROM admin_artifact_versions WHERE version_id = $1 FOR UPDATE`,
        [input.targetVersionId],
      );
      const row = target.rows[0];
      if (!row || row.artifact_key !== input.artifactKey ||
          row.artifact_kind !== input.artifactKind ||
          !isRollbackTargetLifecycleCompatible(input.channel, String(row.lifecycle))) {
        throw new AdminQueryError("ADMIN_ARTIFACT_ROLLBACK_TARGET_INVALID");
      }
      const pointer = await client.query(
        `UPDATE admin_active_pointers
         SET version_id = $6, revision = revision + 1,
             updated_by_subject = $7, updated_at = now()
         WHERE artifact_key = $1 AND artifact_kind = $2 AND page_id = $3
           AND channel = $4 AND revision = $5 AND active
         RETURNING *`,
        [input.artifactKey, input.artifactKind, input.pageId, input.channel,
          input.expectedPointerRevision, input.targetVersionId, identity.subject],
      );
      if (!pointer.rowCount) throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
      await insertArtifactEvent(client, {
        versionId: input.targetVersionId, artifactKey: input.artifactKey,
        action: "ROLLBACK",
        fromLifecycle: input.channel === "PUBLISHED" ? "PUBLISHED" : "CANARY",
        toLifecycle: input.channel === "PUBLISHED" ? "PUBLISHED" : "CANARY",
        identity, correlationId: input.correlationId, pageId: input.pageId,
        channel: input.channel,
      });
      await client.query("COMMIT");
      return policySafeRow(pointer.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createSimulation(
    identity: AdminIdentity,
    input: import("@lana/contracts").AdminSimulationRequestV1 & { readonly correlationId: string },
  ) {
    assertPolicyRole(identity, ["OWNER", "EDITOR", "APPROVER"]);
    assertPageAllowed(identity, input.pageId);
    const pool = this.requirePolicyPool();
    const inserted = await pool.query(
      `INSERT INTO admin_simulation_runs (
         page_id, version_ids, lookback_days, max_conversations,
         side_effects, created_by_subject
       ) VALUES ($1,$2::uuid[],$3,$4,'DISABLED',$5)
       RETURNING *`,
      [input.pageId, input.versionIds, input.lookbackDays, input.maxConversations, identity.subject],
    );
    return policySafeRow(inserted.rows[0]);
  }

  async listSimulations(_identity: AdminIdentity, query: { limit: number; cursor?: string }) {
    const spec: ListSpec = {
      view: "admin_simulation_runs_v", idColumn: "simulation_id", timeColumn: "created_at",
      columns: "simulation_id, page_id, version_ids, lookback_days, max_conversations, side_effects, status, created_by_subject, claimed_at, completed_at, error_code, aggregate_metrics, created_at, updated_at",
    };
    return this.list(spec, [], [], query.limit, query.cursor);
  }

  async close(): Promise<void> {
    await Promise.all([
      this.pool.end(),
      this.commandPool?.end() ?? Promise.resolve(),
    ]);
  }

  private requirePolicyPool(): pg.Pool {
    if (!this.commandPool) throw new AdminQueryError("ADMIN_POLICY_CONTROL_UNAVAILABLE");
    return this.commandPool;
  }

  private async timeline(
    spec: ListSpec,
    identity: AdminIdentity,
    query: TimelineQuery,
  ) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.conversationId) {
      addFilter(filters, values, "conversation_id", query.conversationId);
    }
    if (query.since) {
      values.push(query.since);
      filters.push(`${spec.timeColumn} >= $${values.length}`);
    }
    if (query.until) {
      values.push(query.until);
      filters.push(`${spec.timeColumn} <= $${values.length}`);
    }
    return this.list(spec, filters, values, query.limit, query.cursor);
  }

  private async operation(
    spec: ListSpec,
    identity: AdminIdentity,
    query: OperationQuery,
  ) {
    const filters: string[] = [];
    const values: unknown[] = [];
    addScope(filters, values, identity, "page_id");
    if (query.pageId) {
      assertPageAllowed(identity, query.pageId);
      addFilter(filters, values, "page_id", query.pageId);
    }
    if (query.status) addFilter(filters, values, "status", query.status);
    return this.list(spec, filters, values, query.limit, query.cursor);
  }

  private async list(
    spec: ListSpec,
    filters: string[],
    values: unknown[],
    limit: number,
    encodedCursor?: string,
  ) {
    if (encodedCursor) {
      const cursor = decodeCursor(encodedCursor);
      values.push(cursor.time, cursor.id);
      filters.push(
        `(${spec.timeColumn}, ${spec.idColumn}::text) < ($${values.length - 1}::timestamptz, $${values.length})`,
      );
    }
    values.push(limit + 1);
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await this.pool.query(
      `SELECT ${spec.columns}
       FROM ${spec.view}
       ${where}
       ORDER BY ${spec.timeColumn} DESC, ${spec.idColumn} DESC
       LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > limit;
    const items = result.rows.slice(0, limit);
    const last = items.at(-1);
    const nextCursor = hasMore && last
      ? encodeCursor({
          time: toIso(last[spec.timeColumn]),
          id: String(last[spec.idColumn]),
        })
      : null;
    return { items: sanitizeRows(items), nextCursor };
  }

  private async statusCounts(view: string, identity: AdminIdentity) {
    const scope = scopeClause(identity, "page_id", 1);
    const result = await this.pool.query(
      `SELECT status, count(*)::int AS count
       FROM ${view} ${scope.sql}
       GROUP BY status ORDER BY status`,
      scope.values,
    );
    return Object.fromEntries(
      result.rows.map((row) => [String(row.status), Number(row.count)]),
    );
  }

  private async statusCountsForPage(view: string, pageId: string) {
    const result = await this.pool.query(
      `SELECT status, count(*)::int AS count
       FROM ${view} WHERE page_id = $1
       GROUP BY status ORDER BY status`,
      [pageId],
    );
    return Object.fromEntries(
      result.rows.map((row) => [String(row.status), Number(row.count)]),
    );
  }
}

function blocksBotImmediately(command: CreateAdminCommandInput["command"]): boolean {
  return command === "HANDOFF_NHAN_VIEN" ||
    command === "HANDOFF_VAN_DON" ||
    command === "PAUSE_BOT" ||
    command === "ADD_TAG";
}

function assertPolicyRole(identity: AdminIdentity, allowed: readonly AdminIdentity["role"][]): void {
  if (!allowed.includes(identity.role)) {
    throw new AdminQueryError("ADMIN_POLICY_FORBIDDEN");
  }
}

function assertTransitionRole(
  identity: AdminIdentity,
  action: TransitionArtifactInput["action"],
): void {
  const allowed: Record<TransitionArtifactInput["action"], readonly AdminIdentity["role"][]> = {
    VALIDATE: ["OWNER", "EDITOR"],
    APPROVE: ["OWNER", "APPROVER"],
    START_CANARY: ["OWNER"],
    PUBLISH: ["OWNER"],
    RETIRE: ["OWNER"],
  };
  assertPolicyRole(identity, allowed[action]);
}

export function transitionTarget(
  current: string,
  action: TransitionArtifactInput["action"],
  canaryMode: TransitionArtifactInput["canaryMode"] = null,
): string | null {
  if (action === "RETIRE") {
    return ["APPROVED", "CANARY", "PUBLISHED"].includes(current) ? "RETIRED" : null;
  }
  if (isShadowToLivePromotion(current, action, canaryMode)) return "CANARY";
  const transitions: Record<TransitionArtifactInput["action"], readonly [string, string]> = {
    VALIDATE: ["DRAFT", "VALIDATED"],
    APPROVE: ["VALIDATED", "APPROVED"],
    START_CANARY: ["APPROVED", "CANARY"],
    PUBLISH: ["CANARY", "PUBLISHED"],
    RETIRE: ["PUBLISHED", "RETIRED"],
  };
  const [from, to] = transitions[action];
  return current === from ? to : null;
}

export function isShadowToLivePromotion(
  current: string,
  action: TransitionArtifactInput["action"],
  canaryMode: TransitionArtifactInput["canaryMode"],
): boolean {
  return current === "CANARY" &&
    action === "START_CANARY" &&
    canaryMode === "LIVE_OUTBOUND";
}

export function isRollbackTargetLifecycleCompatible(
  channel: RollbackArtifactInput["channel"],
  lifecycle: string,
): boolean {
  return channel === "PUBLISHED"
    ? lifecycle === "PUBLISHED"
    : lifecycle === "CANARY";
}

function transitionActorColumn(action: TransitionArtifactInput["action"]): string {
  return ({
    VALIDATE: "validated_by_subject",
    APPROVE: "approved_by_subject",
    START_CANARY: "canary_by_subject",
    PUBLISH: "published_by_subject",
    RETIRE: "retired_by_subject",
  } satisfies Record<TransitionArtifactInput["action"], string>)[action];
}

function transitionTimeColumn(action: TransitionArtifactInput["action"]): string {
  return ({
    VALIDATE: "validated_at",
    APPROVE: "approved_at",
    START_CANARY: "canary_at",
    PUBLISH: "published_at",
    RETIRE: "retired_at",
  } satisfies Record<TransitionArtifactInput["action"], string>)[action];
}

function transitionEventAction(action: TransitionArtifactInput["action"]): string {
  return ({
    VALIDATE: "VALIDATED",
    APPROVE: "APPROVED",
    START_CANARY: "CANARY_STARTED",
    PUBLISH: "PUBLISHED",
    RETIRE: "RETIRED",
  } satisfies Record<TransitionArtifactInput["action"], string>)[action];
}

interface ArtifactEventInput {
  readonly versionId: string;
  readonly artifactKey: string;
  readonly action: string;
  readonly fromLifecycle: string | null;
  readonly toLifecycle: string | null;
  readonly identity: AdminIdentity;
  readonly correlationId: string;
  readonly pageId?: string | null;
  readonly channel?: string | null;
}

async function insertArtifactEvent(client: pg.PoolClient, input: ArtifactEventInput): Promise<void> {
  await client.query(
    `INSERT INTO admin_artifact_events (
       version_id, artifact_key, action, from_lifecycle, to_lifecycle,
       actor_subject, actor_role, page_id, channel, correlation_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [input.versionId, input.artifactKey, input.action, input.fromLifecycle,
      input.toLifecycle, input.identity.subject, input.identity.role,
      input.pageId ?? null, input.channel ?? null, input.correlationId],
  );
}

async function upsertArtifactPointer(
  client: pg.PoolClient,
  version: Record<string, unknown>,
  pageId: string,
  channel: string,
  versionId: string,
  actorSubject: string,
): Promise<void> {
  if (channel === "PUBLISHED") {
    await client.query(
      `UPDATE admin_active_pointers
       SET active = false, revision = revision + 1,
           updated_by_subject = $4, updated_at = now()
       WHERE artifact_key = $1 AND artifact_kind = $2 AND page_id = $3
         AND channel IN ('CANARY_SHADOW', 'CANARY_LIVE') AND active`,
      [version.artifact_key, version.artifact_kind, pageId, actorSubject],
    );
  } else {
    await client.query(
      `UPDATE admin_active_pointers
       SET active = false, revision = revision + 1,
           updated_by_subject = $4, updated_at = now()
       WHERE artifact_key = $1 AND artifact_kind = $2 AND page_id = $3
         AND channel IN ('CANARY_SHADOW', 'CANARY_LIVE')
         AND channel <> $5 AND active`,
      [version.artifact_key, version.artifact_kind, pageId, actorSubject, channel],
    );
  }
  await client.query(
    `INSERT INTO admin_active_pointers (
       artifact_key, artifact_kind, page_id, channel, version_id,
       updated_by_subject
     ) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (artifact_key, artifact_kind, page_id, channel)
     DO UPDATE SET version_id = EXCLUDED.version_id,
                   active = true,
                   revision = admin_active_pointers.revision + 1,
                   updated_by_subject = EXCLUDED.updated_by_subject,
                   updated_at = now()`,
    [version.artifact_key, version.artifact_kind, pageId, channel, versionId, actorSubject],
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function hashStructuredContent(content: unknown): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(canonicalize(content)))
    .digest("hex");
  return `sha256:${digest}`;
}

function verifySizeChartContent(
  content: unknown,
  subject: string,
  verifiedAt: string,
): unknown {
  if (!content || typeof content !== "object") {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  const value = structuredClone(content as Record<string, unknown>);
  if (value.kind !== "SIZE_CHART" || !value.chart || typeof value.chart !== "object") {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  const chart = value.chart as Record<string, unknown>;
  if (!chart.reference || typeof chart.reference !== "object") {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  chart.reference = {
    ...(chart.reference as Record<string, unknown>),
    verificationStatus: "VERIFIED",
    verifiedByRef: subject,
    verifiedAt,
  };
  return value;
}

function policySafeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value instanceof Date ? value.toISOString() : value,
  ]));
}

function commandFingerprint(
  conversationId: string,
  input: CreateAdminCommandInput,
): string {
  return createHash("sha256").update(JSON.stringify({
    conversationId,
    command: input.command,
    tag: input.tag,
    pauseMinutes: input.pauseMinutes,
    expectedStateVersion: input.expectedStateVersion,
    reason: input.reason,
  })).digest("hex");
}

function addScope(
  filters: string[],
  values: unknown[],
  identity: AdminIdentity,
  column: string,
): void {
  if (identity.pageScope === "ALL") return;
  values.push(identity.pageScope);
  filters.push(`${column} = ANY($${values.length}::text[])`);
}

function scopeClause(
  identity: AdminIdentity,
  column: string,
  start: number,
): { sql: string; values: unknown[] } {
  if (identity.pageScope === "ALL") return { sql: "", values: [] };
  const condition = `${column} = ANY($${start}::text[])`;
  return {
    sql: `WHERE ${condition}`,
    values: [identity.pageScope],
  };
}

function addFilter(
  filters: string[],
  values: unknown[],
  column: string,
  value: unknown,
): void {
  values.push(value);
  filters.push(`${column} = $${values.length}`);
}

function assertPageAllowed(identity: AdminIdentity, pageId: string): void {
  if (
    identity.pageScope !== "ALL" &&
    !identity.pageScope.includes(pageId)
  ) {
    throw new AdminQueryError("ADMIN_PAGE_NOT_ALLOWED");
  }
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string): Cursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof parsed.time !== "string" ||
      !Number.isFinite(Date.parse(parsed.time)) ||
      typeof parsed.id !== "string" ||
      parsed.id.length < 1 ||
      parsed.id.length > 256
    ) {
      throw new Error("invalid");
    }
    return { time: new Date(parsed.time).toISOString(), id: parsed.id };
  } catch {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new AdminQueryError("ADMIN_QUERY_INVALID");
}

const FORBIDDEN_KEY = /(ciphertext|(?:^|_)payload(?:_|$)|recipient|(?:^|_)token(?:_|$)|password|phone|address|email|(?:^|_)sender_id(?:_|$)|psid|(?:^|_)raw(?:_|$)|authorization|api.?key)/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?84|0)[\s.-]?\d(?:[\s.-]?\d){7,10}(?!\d)/g;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value
      .replace(EMAIL, "[EMAIL]")
      .replace(PHONE, "[PHONE]")
      .slice(0, 4_000);
  }
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => sanitize(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (!FORBIDDEN_KEY.test(key)) safe[key] = sanitize(item, depth + 1);
    }
    return safe;
  }
  return value;
}

function sanitizeRows(rows: readonly Record<string, unknown>[]) {
  return rows.map((row) => sanitize(row) as Record<string, unknown>);
}
