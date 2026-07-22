import { createHash, randomUUID } from "node:crypto";
import { LocalEnvelopeCipher } from "@lana/database";
import { Pool, type PoolClient } from "pg";
import { upsertEncryptedCustomerIdentity } from "./identity-projection.js";
import type {
  ClaimedAdminCommand,
  ControlCommandStore,
  ControlTag,
  ControlTagObservation,
  StateMutationResult,
  TagOperationStatus,
} from "./types.js";

interface CommandRow {
  prior_status: "PENDING" | "PROCESSING";
  command_id: string;
  lease_token: string;
  page_id: string;
  conversation_id: string;
  command_type: ClaimedAdminCommand["commandType"];
  tag: ControlTag | null;
  pause_minutes: 15 | 60 | null;
  expected_state_version: string;
  enqueued_state_version: string | null;
  requested_by_subject: string;
  attempt_count: number;
  external_id_ciphertext: Buffer | null;
  external_id_nonce: Buffer | null;
  external_id_auth_tag: Buffer | null;
}

export class PostgresControlCommandStore implements ControlCommandStore {
  private readonly pool: Pool;

  constructor(
    connectionString: string,
    private readonly cipher: LocalEnvelopeCipher,
    maxPoolSize = 3,
  ) {
    if (!connectionString.trim()) throw new Error("ADMIN_CONTROL_DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async claim(workerId: string, leaseMs: number, allowedPageIds: readonly string[]) {
    if (allowedPageIds.length === 0) return null;
    const result = await this.pool.query<CommandRow>(
      `WITH candidate AS (
         SELECT command_id, status AS prior_status
         FROM admin_commands
         WHERE page_id = ANY($3::text[])
           AND (next_attempt_at IS NULL OR next_attempt_at <= now())
           AND (
             status = 'PENDING'
             OR (status = 'PROCESSING' AND lease_until <= now())
           )
         ORDER BY created_at, command_id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE admin_commands AS command
       SET status = 'PROCESSING', attempt_count = attempt_count + 1,
           lease_owner = $1, lease_token = gen_random_uuid(),
           lease_until = now() + ($2::integer * interval '1 millisecond'),
           next_attempt_at = NULL, started_at = COALESCE(started_at, now()),
           updated_at = now()
       FROM candidate
       WHERE command.command_id = candidate.command_id
       RETURNING candidate.prior_status, command.command_id, command.lease_token, command.page_id,
         command.conversation_id, command.command_type, command.tag,
         command.pause_minutes, command.expected_state_version,
         command.enqueued_state_version, command.requested_by_subject,
         command.attempt_count,
         (SELECT external_id_ciphertext FROM provider_conversation_links
          WHERE page_id = command.page_id AND conversation_id = command.conversation_id
            AND provider = 'PANCAKE' AND expires_at > now()) AS external_id_ciphertext,
         (SELECT external_id_nonce FROM provider_conversation_links
          WHERE page_id = command.page_id AND conversation_id = command.conversation_id
            AND provider = 'PANCAKE' AND expires_at > now()) AS external_id_nonce,
         (SELECT external_id_auth_tag FROM provider_conversation_links
          WHERE page_id = command.page_id AND conversation_id = command.conversation_id
            AND provider = 'PANCAKE' AND expires_at > now()) AS external_id_auth_tag`,
      [workerId.slice(0, 128), boundedLease(leaseMs), allowedPageIds],
    );
    const row = result.rows[0];
    if (!row) return null;
    const command = {
      commandId: row.command_id,
      leaseToken: row.lease_token,
      pageId: row.page_id,
      conversationId: row.conversation_id,
      pancakeConversationId: this.decryptProviderLink(row),
      commandType: row.command_type,
      tag: row.tag,
      pauseMinutes: row.pause_minutes,
      expectedStateVersion: safeNumber(row.expected_state_version),
      enqueuedStateVersion:
        row.enqueued_state_version === null ? null : safeNumber(row.enqueued_state_version),
      requestedBySubject: row.requested_by_subject,
      attemptCount: row.attempt_count,
    } satisfies ClaimedAdminCommand;
    await this.event(command, row.prior_status, "PROCESSING", "COMMAND_CLAIMED");
    return command;
  }

  async enqueueTagOperation(
    command: ClaimedAdminCommand,
    operation: "ADD" | "REMOVE",
    tag: ControlTag,
    tagId: string,
    _now: Date,
    stateVersionOverride?: number,
  ): Promise<StateMutationResult> {
    const version = stateVersionOverride ??
      command.enqueuedStateVersion ??
      command.expectedStateVersion;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (!(await this.lockCommand(client, command))) return conflict(client, "COMMAND_LEASE_LOST");
      if (!(await this.stateMatches(client, command, version))) return conflict(client, "STATE_VERSION_CONFLICT");
      const link = await client.query<{
        external_id_ciphertext: Buffer;
        external_id_nonce: Buffer;
        external_id_auth_tag: Buffer;
      }>(
        `SELECT external_id_ciphertext, external_id_nonce, external_id_auth_tag
         FROM provider_conversation_links
         WHERE page_id = $1 AND conversation_id = $2 AND provider = 'PANCAKE'
           AND expires_at > now()`,
        [command.pageId, command.conversationId],
      );
      const external = link.rows[0];
      if (!external) return conflict(client, "PANCAKE_CONVERSATION_LINK_MISSING");
      await client.query(
        `INSERT INTO pancake_tag_outbox (
           idempotency_key, page_id, conversation_id, desired_tag, operation,
           pancake_tag_id, handoff_generation, pancake_conversation_ciphertext,
           pancake_conversation_nonce, pancake_conversation_auth_tag,
           source_admin_command_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (source_admin_command_id, desired_tag, operation)
           WHERE source_admin_command_id IS NOT NULL DO NOTHING`,
        [
          `admin-control:${command.commandId}:${operation}:${tag}`,
          command.pageId,
          command.conversationId,
          tag,
          operation,
          tagId,
          version,
          external.external_id_ciphertext,
          external.external_id_nonce,
          external.external_id_auth_tag,
          command.commandId,
        ],
      );
      await client.query("COMMIT");
      return { status: "APPLIED", stateVersion: version };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async tagOperationStatuses(command: ClaimedAdminCommand, operation: "ADD" | "REMOVE") {
    const result = await this.pool.query<{ desired_tag: ControlTag; status: TagOperationStatus }>(
      `SELECT desired_tag, status FROM pancake_tag_outbox
       WHERE source_admin_command_id = $1 AND operation = $2`,
      [command.commandId, operation],
    );
    return new Map(result.rows.map((row) => [row.desired_tag, row.status]));
  }

  async beginFailSafeHuman(command: ClaimedAdminCommand, now: Date): Promise<StateMutationResult> {
    if (command.enqueuedStateVersion !== null) {
      return { status: "APPLIED", stateVersion: command.enqueuedStateVersion };
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (!(await this.lockCommand(client, command))) return conflict(client, "COMMAND_LEASE_LOST");
      const next = command.expectedStateVersion + 1;
      const leaseUntil = new Date(now.getTime() + 15 * 60_000);
      const updated = await client.query(
        `UPDATE conversations SET conversation_owner = 'HUMAN', owner_lease_until = $4::timestamptz,
           state_version = $3::bigint,
           state_snapshot = state_snapshot || jsonb_build_object(
             'conversationOwner','HUMAN','ownerReason','MANUAL',
             'ownerLeaseUntil',$5::text,'revision',$3::bigint,'updatedAt',$6::text
           ), updated_at = $7::timestamptz,
           expires_at = $7::timestamptz + interval '20 days'
         WHERE conversation_id = $1::uuid AND page_id = $2::text
           AND state_version = $8::bigint`,
        [
          command.conversationId,
          command.pageId,
          next,
          leaseUntil,
          leaseUntil.toISOString(),
          now.toISOString(),
          now,
          command.expectedStateVersion,
        ],
      );
      if (updated.rowCount !== 1) return conflict(client, "STATE_VERSION_CONFLICT");
      await client.query(
        `UPDATE admin_commands SET enqueued_state_version = $3, updated_at = now()
         WHERE command_id = $1 AND lease_token = $2`,
        [command.commandId, command.leaseToken, next],
      );
      await client.query("COMMIT");
      return { status: "APPLIED", stateVersion: next };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async reconcileVerifiedTags(
    command: ClaimedAdminCommand,
    expectedStateVersion: number,
    observation: ControlTagObservation,
    allowBotWhenClear: boolean,
    now: Date,
  ): Promise<StateMutationResult> {
    if (!observation.verified) return { status: "CONFLICT", errorCode: "PANCAKE_TAG_READ_UNVERIFIED" };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (!(await this.lockCommand(client, command))) return conflict(client, "COMMAND_LEASE_LOST");
      const current = await client.query<{
        state_version: string;
        conversation_owner: "BOT" | "HUMAN";
        owner_lease_until: Date | null;
        state_snapshot: Record<string, unknown>;
      }>(
        `SELECT state_version, conversation_owner, owner_lease_until, state_snapshot
         FROM conversations WHERE conversation_id = $1 AND page_id = $2 FOR UPDATE`,
        [command.conversationId, command.pageId],
      );
      const row = current.rows[0];
      if (!row || safeNumber(row.state_version) !== expectedStateVersion) {
        return conflict(client, "STATE_VERSION_CONFLICT");
      }
      const next = expectedStateVersion + 1;
      const oldReason = typeof row.state_snapshot.ownerReason === "string"
        ? row.state_snapshot.ownerReason
        : "UNVERIFIED";
      const blocked = observation.blockingTag !== null;
      const pauseActive =
        row.owner_lease_until !== null && row.owner_lease_until.getTime() > now.getTime();
      const releaseForSync =
        !blocked && !pauseActive && ["PANCAKE_TAG", "UNVERIFIED"].includes(oldReason);
      const toBot = !blocked && (allowBotWhenClear || releaseForSync);
      const owner = blocked ? "HUMAN" : toBot ? "BOT" : row.conversation_owner;
      const preserveHumanReason = [
        "MANUAL",
        "HUMAN_ECHO",
        "AGENT_HANDOFF",
        "POST_SALE",
      ].includes(oldReason);
      const reason = blocked
        ? preserveHumanReason
          ? oldReason
          : "PANCAKE_TAG"
        : toBot
          ? "DEFAULT"
          : oldReason;
      const lease = owner === "BOT" ? null : row.owner_lease_until;
      const updated = await client.query(
        `UPDATE conversations SET conversation_owner = $3::text,
           owner_lease_until = $4::timestamptz,
           blocking_tag = $5::text,
           blocking_tag_verified_at = $6::timestamptz,
           state_version = $7::bigint,
           state_snapshot = state_snapshot || jsonb_build_object(
             'conversationOwner',$3::text,'ownerReason',$8::text,
             'ownerLeaseUntil',$9::text,'tagGateStatus',$10::text,
             'blockingTag',$5::text,'blockingTagVerifiedAt',$11::text,
             'revision',$7::bigint,'updatedAt',$12::text
           ), updated_at = $13::timestamptz,
           expires_at = $13::timestamptz + interval '20 days'
         WHERE conversation_id = $1::uuid AND page_id = $2::text
           AND state_version = $14::bigint`,
        [
          command.conversationId,
          command.pageId,
          owner,
          lease,
          observation.blockingTag,
          new Date(observation.observedAt),
          next,
          reason,
          lease?.toISOString() ?? null,
          blocked ? "BLOCKING" : "VERIFIED_ABSENT",
          observation.observedAt,
          now.toISOString(),
          now,
          expectedStateVersion,
        ],
      );
      if (updated.rowCount !== 1) return conflict(client, "STATE_VERSION_CONFLICT");
      if (
        command.commandType === "RESUME_BOT" &&
        row.conversation_owner === "HUMAN" &&
        owner === "BOT"
      ) {
        await this.recordVerifiedResume(client, command, next, now);
      }
      await upsertEncryptedCustomerIdentity(client, this.cipher, {
        pageId: command.pageId,
        conversationId: command.conversationId,
        customerName: observation.customerName,
        observedAt: observation.observedAt,
      });
      await client.query("COMMIT");
      return { status: "APPLIED", stateVersion: next };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  markApplied(command: ClaimedAdminCommand, resultCode: string, metadata = {}) {
    return this.finish(command, "APPLIED", resultCode, null, metadata);
  }
  markFailed(command: ClaimedAdminCommand, errorCode: string) {
    return this.finish(command, "FAILED", "COMMAND_FAILED", errorCode, {});
  }
  markConflict(command: ClaimedAdminCommand, errorCode: string) {
    return this.finish(command, "CONFLICT", "COMMAND_CONFLICT", errorCode, {});
  }

  async markWaiting(command: ClaimedAdminCommand, reasonCode: string, delaySeconds: number) {
    const delay = Math.max(2, Math.min(60, Math.trunc(delaySeconds)));
    const result = await this.pool.query(
      `UPDATE admin_commands SET next_attempt_at = now() + ($3::integer * interval '1 second'),
         lease_until = now() + ($3::integer * interval '1 second'), updated_at = now()
       WHERE command_id = $1 AND status = 'PROCESSING' AND lease_token = $2`,
      [command.commandId, command.leaseToken, delay],
    );
    if (result.rowCount === 1) {
      await this.event(command, "PROCESSING", "PROCESSING", reasonCode);
      return true;
    }
    return false;
  }

  async close() { await this.pool.end(); }

  private async finish(
    command: ClaimedAdminCommand,
    status: "APPLIED" | "FAILED" | "CONFLICT",
    resultCode: string,
    errorCode: string | null,
    metadata: Readonly<Record<string, string | number | boolean | null>>,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ correlation_id: string; command_type: string }>(
        `UPDATE admin_commands SET status = $3, error_code = $4,
           applied_state_version = CASE WHEN $3 = 'APPLIED' THEN
             (SELECT state_version FROM conversations WHERE conversation_id = admin_commands.conversation_id)
             ELSE NULL END,
           lease_owner = NULL, lease_token = NULL, lease_until = NULL,
           next_attempt_at = NULL, completed_at = now(), updated_at = now()
         WHERE command_id = $1 AND status = 'PROCESSING' AND lease_token = $2
         RETURNING correlation_id, command_type`,
        [command.commandId, command.leaseToken, status, errorCode?.slice(0, 128) ?? null],
      );
      const terminal = result.rows[0];
      if (!terminal) {
        await client.query("ROLLBACK");
        return false;
      }
      const safeMetadata = {
        result_code: resultCode.slice(0, 128),
        ...metadata,
      };
      await client.query(
        `INSERT INTO admin_command_events (
           event_id, command_id, page_id, conversation_id, event_type,
           from_status, to_status, actor_type, actor_ref, metadata_safe
         ) VALUES ($1,$2,$3,$4,'STATUS_CHANGED','PROCESSING',$5,
           'SERVICE','admin-control-worker',$6::jsonb)`,
        [randomUUID(), command.commandId, command.pageId, command.conversationId,
          status, JSON.stringify(safeMetadata)],
      );
      await client.query(
        `INSERT INTO audit_log (
           actor_type, actor_id, action, resource_type, resource_id_hash,
           metadata_safe, correlation_id, entry_hash
         ) VALUES (
           'SERVICE','admin-control-worker','ADMIN_COMMAND_TERMINAL',
           'ADMIN_COMMAND',encode(digest($1,'sha256'),'hex'),$2::jsonb,$3,digest('','sha256')
         )`,
        [
          command.commandId,
          JSON.stringify({
            page_id: command.pageId,
            command: terminal.command_type,
            status,
            error_code: errorCode,
            result_code: resultCode,
          }),
          terminal.correlation_id,
        ],
      );
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async event(
    command: Pick<ClaimedAdminCommand, "commandId" | "pageId" | "conversationId">,
    from: "PENDING" | "PROCESSING",
    to: "PROCESSING" | "APPLIED" | "FAILED" | "CONFLICT",
    code: string,
    metadata: Readonly<Record<string, string | number | boolean | null>> = {},
  ) {
    await this.pool.query(
      `INSERT INTO admin_command_events (
         event_id, command_id, page_id, conversation_id, event_type,
         from_status, to_status, actor_type, actor_ref, metadata_safe
       ) VALUES ($1,$2,$3,$4,'STATUS_CHANGED',$5,$6,'SERVICE','admin-control-worker',$7::jsonb)`,
      [randomUUID(), command.commandId, command.pageId, command.conversationId, from, to,
        JSON.stringify({ result_code: code.slice(0, 128), ...metadata })],
    );
  }

  private async recordVerifiedResume(
    client: PoolClient,
    command: ClaimedAdminCommand,
    generation: number,
    now: Date,
  ): Promise<void> {
    const active = await client.query<{ opening_handoff_id: string }>(
      `SELECT opening_handoff_id
       FROM handoff_cases
       WHERE conversation_id = $1
         AND status IN ('NEW', 'IN_PROGRESS')
       ORDER BY created_at DESC, opening_handoff_id DESC
       FOR UPDATE
       LIMIT 1`,
      [command.conversationId],
    );
    const relatedHandoffId = active.rows[0]?.opening_handoff_id ?? null;
    const triggerHash = createHash("sha256")
      .update("handoff-trigger:v1")
      .update("\0")
      .update(`admin-command:${command.commandId}`)
      .digest("hex");
    await client.query(
      `INSERT INTO handoff_events (
         page_id, conversation_id, direction, source, reason_code,
         reason_detail_safe, owner_before, owner_after, handoff_generation,
         trigger_event_key_hash, source_admin_command_id, related_handoff_id,
         occurred_at
       ) VALUES (
         $1,$2,'HUMAN_TO_BOT','ADMIN','RESUME_AFTER_REVIEW',
         jsonb_build_object('verified_blocking_tags_absent',true),
         'HUMAN','BOT',$3,$4,$5,$6,$7
       )
       ON CONFLICT (source_admin_command_id, direction)
         WHERE source_admin_command_id IS NOT NULL DO NOTHING`,
      [
        command.pageId,
        command.conversationId,
        generation,
        triggerHash,
        command.commandId,
        relatedHandoffId,
        now,
      ],
    );
    if (relatedHandoffId) {
      await client.query(
        `UPDATE handoff_cases
         SET status = 'RESOLVED', resolved_at = $2,
             resolved_by_ref = encode(digest($3,'sha256'),'hex'),
             updated_at = $2
         WHERE opening_handoff_id = $1
           AND status IN ('NEW', 'IN_PROGRESS')`,
        [relatedHandoffId, now, command.requestedBySubject],
      );
    }
  }

  private async lockCommand(client: PoolClient, command: ClaimedAdminCommand) {
    const result = await client.query(
      `SELECT 1 FROM admin_commands WHERE command_id = $1 AND status = 'PROCESSING'
       AND lease_token = $2 FOR UPDATE`,
      [command.commandId, command.leaseToken],
    );
    return result.rowCount === 1;
  }
  private async stateMatches(client: PoolClient, command: ClaimedAdminCommand, version: number) {
    const result = await client.query(
      `SELECT 1 FROM conversations WHERE conversation_id = $1 AND page_id = $2
       AND state_version = $3 FOR UPDATE`,
      [command.conversationId, command.pageId, version],
    );
    return result.rowCount === 1;
  }
  private decryptProviderLink(row: CommandRow) {
    if (!row.external_id_ciphertext || !row.external_id_nonce || !row.external_id_auth_tag) return "";
    return this.cipher.decryptValue(
      { ciphertext: row.external_id_ciphertext, nonce: row.external_id_nonce, authTag: row.external_id_auth_tag },
      `lana:provider-link:v1:${row.page_id}:${row.conversation_id}:PANCAKE`,
    );
  }
}

async function conflict(client: PoolClient, errorCode: string): Promise<StateMutationResult> {
  await client.query("ROLLBACK");
  return { status: "CONFLICT", errorCode };
}
function boundedLease(value: number) { return Math.max(10_000, Math.min(300_000, Math.trunc(value))); }
function safeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("ADMIN_STATE_VERSION_INVALID");
  return parsed;
}
