import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type {
  AcquisitionEntrySourceV1,
  AcquisitionEventTypeV1,
  LeadDispositionV1,
  LeadQualificationStageV1,
} from "@lana/contracts";

export type AdAcquisitionAnalyticsMode = "OFF" | "SHADOW" | "LIVE";

export interface AdAcquisitionAnalyticsOptions {
  readonly mode?: AdAcquisitionAnalyticsMode;
  readonly pageAllowlist?: readonly string[];
  readonly derivationVersion?: string;
  readonly windowHours?: number;
}

export interface AdAcquisitionConfig {
  readonly mode: AdAcquisitionAnalyticsMode;
  readonly pageAllowlist: ReadonlySet<string>;
  readonly derivationVersion: string;
  readonly windowHours: number;
}

export interface AcquisitionCommitPlan {
  readonly triggerMessagePk: string;
  readonly triggerOccurredAt: Date;
  readonly replyPlanId: string | null;
  readonly meaningfulLabels: readonly string[];
  readonly ambiguousAcknowledgement: boolean;
  readonly buyingNegated: boolean;
  readonly buyingCommitted: boolean;
  readonly purchaseConfirmed: boolean;
  readonly firstBarrier: string | null;
  readonly firstPlaybook?: string | null;
}

interface SessionRow {
  acquisition_session_id: string;
  entry_message_pk: string;
  entry_message_occurred_at: Date;
  initial_reply_plan_id: string | null;
  initial_reply_accepted_at: Date | null;
  max_stage_reached: LeadQualificationStageV1;
  current_disposition: LeadDispositionV1;
  derivation_version: string;
  previous_disposition?: LeadDispositionV1;
}

interface AcquisitionEventInput {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly customerHash: string;
  readonly eventType: AcquisitionEventTypeV1;
  readonly entryMessagePk: string;
  readonly triggerMessagePk: string | null;
  readonly replyPlanId: string | null;
  readonly outboxId: string | null;
  readonly previousStage: LeadQualificationStageV1 | null;
  readonly nextStage: LeadQualificationStageV1 | null;
  readonly previousDisposition: LeadDispositionV1 | null;
  readonly nextDisposition: LeadDispositionV1 | null;
  readonly qualifyingLabels: readonly string[];
  readonly derivationVersion: string;
  readonly occurredAt: Date;
}

export function adAcquisitionConfig(
  options: AdAcquisitionAnalyticsOptions = {},
): AdAcquisitionConfig {
  const mode = options.mode ?? "OFF";
  if (!["OFF", "SHADOW", "LIVE"].includes(mode)) {
    throw new Error("AD_ACQUISITION_ANALYTICS_MODE_INVALID");
  }
  const derivationVersion = options.derivationVersion?.trim() || "ad-acquisition-v1";
  const windowHours = Math.trunc(options.windowHours ?? 168);
  if (windowHours < 1 || windowHours > 24 * 30) {
    throw new Error("AD_ACQUISITION_WINDOW_HOURS_INVALID");
  }
  return {
    mode,
    pageAllowlist: new Set(options.pageAllowlist ?? []),
    derivationVersion: derivationVersion.slice(0, 64),
    windowHours,
  };
}

export function acquisitionEnabled(config: AdAcquisitionConfig, pageId: string): boolean {
  return config.mode !== "OFF" && config.pageAllowlist.has(pageId);
}

export function acquisitionEntrySource(source: string | null | undefined): AcquisitionEntrySourceV1 {
  const normalized = source?.trim().toUpperCase() ?? "";
  if (normalized === "ADS") return "META_ADS_CONFIRMED";
  if (normalized) return "OTHER_REFERRAL";
  return "UNKNOWN";
}

export function deterministicAcquisitionUuid(seed: string): string {
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function insertEvent(client: PoolClient, input: AcquisitionEventInput): Promise<void> {
  const eventId = deterministicAcquisitionUuid([
    "ad-acquisition-event-v1",
    input.sessionId,
    input.eventType,
    input.triggerMessagePk ?? "none",
    input.replyPlanId ?? "none",
    input.outboxId ?? "none",
    input.nextStage ?? "none",
    input.nextDisposition ?? "none",
  ].join(":"));
  await client.query(
    `INSERT INTO conversation_events (
       event_id, conversation_id, page_id, customer_hash, event_type,
       stage, action, owner, event_metadata, occurred_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,'BOT',$8::jsonb,$9)
     ON CONFLICT (event_id, occurred_at) DO NOTHING`,
    [
      eventId,
      input.conversationId,
      input.pageId,
      input.customerHash,
      input.eventType,
      input.nextStage,
      input.eventType,
      JSON.stringify({
        schemaVersion: 1,
        acquisitionSessionId: input.sessionId,
        entryMessagePk: input.entryMessagePk,
        triggerMessagePk: input.triggerMessagePk,
        replyPlanId: input.replyPlanId,
        outboxId: input.outboxId,
        salesCycleId: null,
        previousStage: input.previousStage,
        nextStage: input.nextStage,
        previousDisposition: input.previousDisposition,
        nextDisposition: input.nextDisposition,
        qualifyingLabels: [...input.qualifyingLabels].slice(0, 20),
        derivationVersion: input.derivationVersion,
      }),
      input.occurredAt,
    ],
  );
}

export async function tryOpenAdAcquisitionSession(
  client: PoolClient,
  config: AdAcquisitionConfig,
  input: {
    readonly identityKey: string;
    readonly pageId: string;
    readonly conversationId: string;
    readonly customerHash: string;
    readonly messagePk: string;
    readonly occurredAt: Date;
    readonly source: string | null;
    readonly referralType: string | null;
    readonly adId: string | null;
    readonly postId: string | null;
    readonly adTitle: string | null;
  },
): Promise<void> {
  if (!acquisitionEnabled(config, input.pageId)) return;
  const entrySource = acquisitionEntrySource(input.source);
  if (entrySource !== "META_ADS_CONFIRMED") return;
  const savepoint = "chat_history_ad_acquisition";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      input.conversationId,
    ]);
    const sessionId = deterministicAcquisitionUuid(`ad-acquisition-session-v1:${input.identityKey}`);
    const superseded = await client.query<SessionRow>(
      `WITH candidates AS (
         SELECT acquisition_session_id, current_disposition AS previous_disposition
         FROM acquisition_sessions
         WHERE conversation_id = $1 AND page_id = $2
           AND closed_at IS NULL AND acquisition_session_id <> $4
         FOR UPDATE
       )
       UPDATE acquisition_sessions AS session
       SET current_disposition = 'STALE', closed_at = $3,
           superseded_by_session_id = $4, updated_at = now()
       FROM candidates
       WHERE session.acquisition_session_id = candidates.acquisition_session_id
       RETURNING session.acquisition_session_id, session.entry_message_pk,
         session.entry_message_occurred_at, session.initial_reply_plan_id,
         session.initial_reply_accepted_at, session.max_stage_reached,
         session.current_disposition, session.derivation_version,
         candidates.previous_disposition`,
      [input.conversationId, input.pageId, input.occurredAt, sessionId],
    );
    const inserted = await client.query(
      `INSERT INTO acquisition_sessions (
         acquisition_session_id, page_id, conversation_id, customer_hash,
         entry_message_pk, entry_message_occurred_at, entry_source,
         referral_type, ad_id, post_id, ad_title, attribution_expires_at,
         derivation_version
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
         $6 + ($12::int * interval '1 hour'),$13)
       ON CONFLICT (entry_message_pk, entry_message_occurred_at) DO NOTHING`,
      [
        sessionId,
        input.pageId,
        input.conversationId,
        input.customerHash,
        input.messagePk,
        input.occurredAt,
        entrySource,
        input.referralType?.slice(0, 64) ?? null,
        input.adId?.slice(0, 128) ?? null,
        input.postId?.slice(0, 128) ?? null,
        input.adTitle?.slice(0, 500) ?? null,
        config.windowHours,
        config.derivationVersion,
      ],
    );
    if (inserted.rowCount === 1) {
      await insertEvent(client, {
        sessionId,
        conversationId: input.conversationId,
        pageId: input.pageId,
        customerHash: input.customerHash,
        eventType: "AD_ENTRY_RECEIVED",
        entryMessagePk: input.messagePk,
        triggerMessagePk: input.messagePk,
        replyPlanId: null,
        outboxId: null,
        previousStage: null,
        nextStage: "UNQUALIFIED_ENTRY",
        previousDisposition: null,
        nextDisposition: "ACTIVE",
        qualifyingLabels: [],
        derivationVersion: config.derivationVersion,
        occurredAt: input.occurredAt,
      });
      for (const stale of superseded.rows) {
        await insertEvent(client, {
          sessionId: stale.acquisition_session_id,
          conversationId: input.conversationId,
          pageId: input.pageId,
          customerHash: input.customerHash,
          eventType: "LEAD_DISPOSITION_CHANGED",
          entryMessagePk: stale.entry_message_pk,
          triggerMessagePk: input.messagePk,
          replyPlanId: stale.initial_reply_plan_id,
          outboxId: null,
          previousStage: stale.max_stage_reached,
          nextStage: stale.max_stage_reached,
          previousDisposition: "ACTIVE",
          nextDisposition: "STALE",
          qualifyingLabels: [],
          derivationVersion: stale.derivation_version,
          occurredAt: input.occurredAt,
        });
      }
    }
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}

export async function tryUpdateAcquisitionProduct(
  client: PoolClient,
  messagePk: string,
  occurredAt: Date,
  productId: string | null,
): Promise<void> {
  const savepoint = "chat_history_ad_product";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await client.query(
      `UPDATE acquisition_sessions SET extracted_product_id = $3, updated_at = now()
       WHERE entry_message_pk = $1 AND entry_message_occurred_at = $2`,
      [messagePk, occurredAt, productId?.slice(0, 128) ?? null],
    );
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}

function rank(stage: LeadQualificationStageV1): number {
  return [
    "UNQUALIFIED_ENTRY",
    "REENGAGED",
    "QUALIFIED_INTEREST",
    "BUYING_CANDIDATE",
    "BUYING_COMMITTED",
    "PURCHASE_CONFIRMED",
    "CONVERTED",
  ].indexOf(stage);
}

export async function commitAcquisitionPlan(
  client: PoolClient,
  input: {
    readonly pageId: string;
    readonly conversationId: string;
    readonly customerHash: string;
    readonly plan: AcquisitionCommitPlan;
  },
): Promise<void> {
  const savepoint = "runtime_ad_acquisition";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await commitAcquisitionPlanUnsafe(client, input);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}

async function commitAcquisitionPlanUnsafe(
  client: PoolClient,
  input: {
    readonly pageId: string;
    readonly conversationId: string;
    readonly customerHash: string;
    readonly plan: AcquisitionCommitPlan;
  },
): Promise<void> {
  const sessions = await client.query<SessionRow>(
    `SELECT acquisition_session_id, entry_message_pk, entry_message_occurred_at,
       initial_reply_plan_id, initial_reply_accepted_at, max_stage_reached,
       current_disposition, derivation_version
     FROM acquisition_sessions
     WHERE page_id = $1 AND conversation_id = $2 AND closed_at IS NULL
       AND entry_message_occurred_at <= $3 AND attribution_expires_at >= $3
     ORDER BY entry_message_occurred_at DESC
     LIMIT 2 FOR UPDATE`,
    [input.pageId, input.conversationId, input.plan.triggerOccurredAt],
  );
  if (sessions.rows.length > 1) {
    for (const ambiguous of sessions.rows) {
      await insertEvent(client, {
        sessionId: ambiguous.acquisition_session_id,
        conversationId: input.conversationId,
        pageId: input.pageId,
        customerHash: input.customerHash,
        eventType: "ACQUISITION_ATTRIBUTION_AMBIGUOUS",
        entryMessagePk: ambiguous.entry_message_pk,
        triggerMessagePk: input.plan.triggerMessagePk,
        replyPlanId: input.plan.replyPlanId,
        outboxId: null,
        previousStage: ambiguous.max_stage_reached,
        nextStage: ambiguous.max_stage_reached,
        previousDisposition: ambiguous.current_disposition,
        nextDisposition: ambiguous.current_disposition,
        qualifyingLabels: [],
        derivationVersion: ambiguous.derivation_version,
        occurredAt: input.plan.triggerOccurredAt,
      });
    }
    return;
  }
  if (sessions.rows.length === 0) return;
  const session = sessions.rows[0]!;
  const isEntryMessage = session.entry_message_pk === input.plan.triggerMessagePk;
  let replyPlanId = session.initial_reply_plan_id;
  if (!replyPlanId && input.plan.replyPlanId) {
    replyPlanId = input.plan.replyPlanId;
    await client.query(
      `UPDATE acquisition_sessions SET initial_reply_plan_id = $2, updated_at = now()
       WHERE acquisition_session_id = $1 AND initial_reply_plan_id IS NULL`,
      [session.acquisition_session_id, replyPlanId],
    );
    await insertEvent(client, {
      sessionId: session.acquisition_session_id,
      conversationId: input.conversationId,
      pageId: input.pageId,
      customerHash: input.customerHash,
      eventType: "BOT_INITIAL_AD_REPLY_LINKED",
      entryMessagePk: session.entry_message_pk,
      triggerMessagePk: input.plan.triggerMessagePk,
      replyPlanId,
      outboxId: null,
      previousStage: session.max_stage_reached,
      nextStage: session.max_stage_reached,
      previousDisposition: session.current_disposition,
      nextDisposition: session.current_disposition,
      qualifyingLabels: [],
      derivationVersion: session.derivation_version,
      occurredAt: input.plan.triggerOccurredAt,
    });
  }
  if (isEntryMessage || !session.initial_reply_accepted_at) return;

  const labels = [...new Set(input.plan.meaningfulLabels.map((value) => value.slice(0, 64)))];
  const qualifyingLabels = labels.filter((label) =>
    !["BUYING_NEGATED", "BUYING_RETRACTED", "AMBIGUOUS_ACK"].includes(label)
  );
  const purchaseConfirmed = input.plan.purchaseConfirmed && !input.plan.buyingNegated;
  const buyingCommitted = input.plan.buyingCommitted && !input.plan.buyingNegated;
  let nextStage = session.max_stage_reached;
  if (purchaseConfirmed && rank(nextStage) < rank("PURCHASE_CONFIRMED")) {
    nextStage = "PURCHASE_CONFIRMED";
  } else if (buyingCommitted && rank(nextStage) < rank("BUYING_COMMITTED")) {
    nextStage = "BUYING_COMMITTED";
  } else if (qualifyingLabels.length > 0 && rank(nextStage) < rank("QUALIFIED_INTEREST")) {
    nextStage = "QUALIFIED_INTEREST";
  } else if (rank(nextStage) < rank("REENGAGED")) {
    nextStage = "REENGAGED";
  }
  let nextDisposition: LeadDispositionV1 = session.current_disposition;
  if (purchaseConfirmed) nextDisposition = "PURCHASE_CONFIRMED";
  else if (input.plan.buyingNegated) {
    nextDisposition = rank(session.max_stage_reached) >= rank("BUYING_COMMITTED")
      ? "RETRACTED"
      : "NEGATED";
  } else if (session.current_disposition === "NEGATED" || session.current_disposition === "RETRACTED") {
    nextDisposition = "ACTIVE";
  }

  await client.query(
    `UPDATE acquisition_sessions SET
       reengaged_at = COALESCE(reengaged_at, $2),
       meaningful_at = CASE WHEN cardinality($3::text[]) > 0 THEN COALESCE(meaningful_at, $2) ELSE meaningful_at END,
       qualified_at = CASE WHEN $4 THEN COALESCE(qualified_at, $2) ELSE qualified_at END,
       committed_at = CASE WHEN $5 THEN COALESCE(committed_at, $2) ELSE committed_at END,
       purchase_confirmed_at = CASE WHEN $6 THEN COALESCE(purchase_confirmed_at, $2) ELSE purchase_confirmed_at END,
       max_stage_reached = $7,
       current_disposition = $8,
       first_meaningful_label = CASE WHEN cardinality($3::text[]) > 0 THEN COALESCE(first_meaningful_label, ($3::text[])[1]) ELSE first_meaningful_label END,
       first_barrier = COALESCE(first_barrier, $9),
       first_playbook = COALESCE(first_playbook, $10),
       closed_at = CASE WHEN $6 THEN COALESCE(closed_at, $2) ELSE closed_at END,
       updated_at = now()
     WHERE acquisition_session_id = $1`,
    [
      session.acquisition_session_id,
      input.plan.triggerOccurredAt,
      labels,
      qualifyingLabels.length > 0,
      buyingCommitted,
      purchaseConfirmed,
      nextStage,
      nextDisposition,
      input.plan.firstBarrier?.slice(0, 64) ?? null,
      input.plan.firstPlaybook?.slice(0, 64) ?? null,
    ],
  );
  await insertEvent(client, {
    sessionId: session.acquisition_session_id,
    conversationId: input.conversationId,
    pageId: input.pageId,
    customerHash: input.customerHash,
    eventType: "CUSTOMER_REENGAGED",
    entryMessagePk: session.entry_message_pk,
    triggerMessagePk: input.plan.triggerMessagePk,
    replyPlanId,
    outboxId: null,
    previousStage: session.max_stage_reached,
    nextStage,
    previousDisposition: session.current_disposition,
    nextDisposition,
    qualifyingLabels: [],
    derivationVersion: session.derivation_version,
    occurredAt: input.plan.triggerOccurredAt,
  });
  if (labels.length > 0) {
    await insertEvent(client, {
      sessionId: session.acquisition_session_id,
      conversationId: input.conversationId,
      pageId: input.pageId,
      customerHash: input.customerHash,
      eventType: "CUSTOMER_MEANINGFUL_REPLY",
      entryMessagePk: session.entry_message_pk,
      triggerMessagePk: input.plan.triggerMessagePk,
      replyPlanId,
      outboxId: null,
      previousStage: session.max_stage_reached,
      nextStage,
      previousDisposition: session.current_disposition,
      nextDisposition,
      qualifyingLabels: labels,
      derivationVersion: session.derivation_version,
      occurredAt: input.plan.triggerOccurredAt,
    });
  } else if (input.plan.ambiguousAcknowledgement) {
    await insertEvent(client, {
      sessionId: session.acquisition_session_id,
      conversationId: input.conversationId,
      pageId: input.pageId,
      customerHash: input.customerHash,
      eventType: "CUSTOMER_AMBIGUOUS_ACK",
      entryMessagePk: session.entry_message_pk,
      triggerMessagePk: input.plan.triggerMessagePk,
      replyPlanId,
      outboxId: null,
      previousStage: session.max_stage_reached,
      nextStage,
      previousDisposition: session.current_disposition,
      nextDisposition,
      qualifyingLabels: [],
      derivationVersion: session.derivation_version,
      occurredAt: input.plan.triggerOccurredAt,
    });
  }
  if (nextStage !== session.max_stage_reached) {
    await insertEvent(client, {
      sessionId: session.acquisition_session_id,
      conversationId: input.conversationId,
      pageId: input.pageId,
      customerHash: input.customerHash,
      eventType: "LEAD_QUALIFICATION_STAGE_CHANGED",
      entryMessagePk: session.entry_message_pk,
      triggerMessagePk: input.plan.triggerMessagePk,
      replyPlanId,
      outboxId: null,
      previousStage: session.max_stage_reached,
      nextStage,
      previousDisposition: session.current_disposition,
      nextDisposition,
      qualifyingLabels,
      derivationVersion: session.derivation_version,
      occurredAt: input.plan.triggerOccurredAt,
    });
  }
  if (nextDisposition !== session.current_disposition) {
    await insertEvent(client, {
      sessionId: session.acquisition_session_id,
      conversationId: input.conversationId,
      pageId: input.pageId,
      customerHash: input.customerHash,
      eventType: "LEAD_DISPOSITION_CHANGED",
      entryMessagePk: session.entry_message_pk,
      triggerMessagePk: input.plan.triggerMessagePk,
      replyPlanId,
      outboxId: null,
      previousStage: session.max_stage_reached,
      nextStage,
      previousDisposition: session.current_disposition,
      nextDisposition,
      qualifyingLabels,
      derivationVersion: session.derivation_version,
      occurredAt: input.plan.triggerOccurredAt,
    });
  }
}

export async function recordInitialReplySendFailed(
  client: PoolClient,
  input: {
    readonly replyPlanId: string;
    readonly outboxId: string;
    readonly sequenceNo: number;
    readonly failedAt: Date;
    readonly terminalStatus: "FAILED_PERMANENT" | "AMBIGUOUS";
  },
): Promise<void> {
  if (input.sequenceNo !== 0) return;
  const savepoint = "ad_acquisition_send_failed";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const sessions = await client.query<SessionRow & {
      page_id: string;
      conversation_id: string;
      customer_hash: string;
    }>(
      `UPDATE acquisition_sessions
       SET initial_outbox_id = COALESCE(initial_outbox_id, $2),
           initial_reply_terminal_status = $3,
           initial_reply_failed_at = COALESCE(initial_reply_failed_at, $4),
           updated_at = now()
       WHERE initial_reply_plan_id = $1 AND initial_reply_accepted_at IS NULL
         AND initial_reply_terminal_status IS NULL
       RETURNING acquisition_session_id, page_id, conversation_id, customer_hash,
         entry_message_pk, entry_message_occurred_at, initial_reply_plan_id,
         initial_reply_accepted_at, max_stage_reached, current_disposition,
         derivation_version`,
      [input.replyPlanId, input.outboxId, input.terminalStatus, input.failedAt],
    );
    if (sessions.rows.length === 1) {
      const session = sessions.rows[0]!;
      await insertEvent(client, {
        sessionId: session.acquisition_session_id,
        conversationId: session.conversation_id,
        pageId: session.page_id,
        customerHash: session.customer_hash,
        eventType: "BOT_INITIAL_AD_REPLY_SEND_FAILED",
        entryMessagePk: session.entry_message_pk,
        triggerMessagePk: session.entry_message_pk,
        replyPlanId: input.replyPlanId,
        outboxId: input.outboxId,
        previousStage: session.max_stage_reached,
        nextStage: session.max_stage_reached,
        previousDisposition: session.current_disposition,
        nextDisposition: session.current_disposition,
        qualifyingLabels: [],
        derivationVersion: session.derivation_version,
        occurredAt: input.failedAt,
      });
    }
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}

export async function recordInitialReplyAccepted(
  client: PoolClient,
  input: {
    readonly replyPlanId: string;
    readonly outboxId: string;
    readonly sequenceNo: number;
    readonly acceptedAt: Date;
    readonly pageId: string;
    readonly conversationId: string;
    readonly customerHash: string;
  },
): Promise<void> {
  if (input.sequenceNo !== 0) return;
  const savepoint = "chat_history_ad_accepted";
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const updated = await client.query<SessionRow>(
      `UPDATE acquisition_sessions SET initial_outbox_id = $2,
         initial_reply_accepted_at = $3, updated_at = now()
       WHERE initial_reply_plan_id = $1 AND initial_reply_accepted_at IS NULL
         AND initial_reply_terminal_status IS NULL
       RETURNING acquisition_session_id, entry_message_pk, entry_message_occurred_at,
         initial_reply_plan_id, initial_reply_accepted_at, max_stage_reached,
         current_disposition, derivation_version`,
      [input.replyPlanId, input.outboxId, input.acceptedAt],
    );
    if (updated.rows.length === 1) {
      const session = updated.rows[0]!;
      await insertEvent(client, {
        sessionId: session.acquisition_session_id,
        conversationId: input.conversationId,
        pageId: input.pageId,
        customerHash: input.customerHash,
        eventType: "BOT_INITIAL_AD_REPLY_ACCEPTED",
        entryMessagePk: session.entry_message_pk,
        triggerMessagePk: session.entry_message_pk,
        replyPlanId: input.replyPlanId,
        outboxId: input.outboxId,
        previousStage: session.max_stage_reached,
        nextStage: session.max_stage_reached,
        previousDisposition: session.current_disposition,
        nextDisposition: session.current_disposition,
        qualifyingLabels: [],
        derivationVersion: session.derivation_version,
        occurredAt: input.acceptedAt,
      });
    }
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}
