import { Pool } from "pg";

export type RuntimePolicyDatabaseChannel =
  | "CANARY_SHADOW"
  | "CANARY_LIVE"
  | "PUBLISHED";
export type RuntimePolicyDatabasePinScope = "SALES_EPISODE" | "CART";

export interface RuntimePolicyDatabasePointerRecord {
  readonly pointer: unknown;
  readonly version: unknown;
}

export interface RuntimePolicyDatabasePin {
  readonly scopeType: RuntimePolicyDatabasePinScope;
  readonly scopeId: string;
  readonly pageId: string;
  readonly channel: RuntimePolicyDatabaseChannel;
  readonly bundleHash: string;
  readonly bundle: Record<string, unknown>;
  readonly pinnedAt: string;
}

export interface RuntimePolicyDatabaseAuditEvent {
  readonly resolutionId: string;
  readonly pageId: string;
  readonly channel: RuntimePolicyDatabaseChannel;
  readonly status: string;
  readonly source: string;
  readonly sideEffects: string;
  readonly bundleId: string | null;
  readonly bundleHash: string | null;
  readonly versionIds: readonly string[];
  readonly reasonCodes: readonly string[];
  readonly pinScopeType: RuntimePolicyDatabasePinScope | null;
  readonly pinScopeId: string | null;
  readonly occurredAt: string;
}

function dateTime(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function pinFromRow(row: Record<string, unknown>): RuntimePolicyDatabasePin {
  return {
    scopeType: String(row.pin_scope_type) as RuntimePolicyDatabasePinScope,
    scopeId: String(row.pin_scope_id),
    pageId: String(row.page_id),
    channel: String(row.channel) as RuntimePolicyDatabaseChannel,
    bundleHash: String(row.bundle_hash),
    bundle: row.bundle as Record<string, unknown>,
    pinnedAt: dateTime(row.pinned_at),
  };
}

/** PostgreSQL adapter only; all trust/schema/hash decisions remain in the resolver. */
export class PostgresRuntimePolicyStore {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 3) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: maxPoolSize });
  }

  async loadActivePointers(input: {
    readonly pageId: string;
    readonly channel: RuntimePolicyDatabaseChannel;
  }): Promise<readonly RuntimePolicyDatabasePointerRecord[]> {
    const result = await this.pool.query(
      `SELECT
         p.pointer_id, p.artifact_key, p.artifact_kind, p.page_id,
         p.channel, p.version_id, p.revision AS pointer_revision,
         p.updated_by_subject AS pointer_updated_by, p.updated_at AS pointer_updated_at,
         v.version_number, v.lifecycle, v.revision AS version_revision,
         v.content_hash, v.content, v.created_by_subject,
         v.created_at, v.updated_at
       FROM admin_active_pointers p
       JOIN admin_artifact_versions v ON v.version_id = p.version_id
       WHERE p.active
         AND p.page_id = $1
         AND p.channel = $2
       ORDER BY p.artifact_kind, p.artifact_key, p.pointer_id`,
      [input.pageId, input.channel],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      pointer: {
        schemaVersion: 1,
        pointerId: String(row.pointer_id),
        artifactKey: String(row.artifact_key),
        artifactKind: String(row.artifact_kind),
        pageId: row.page_id === null ? null : String(row.page_id),
        channel: String(row.channel),
        versionId: String(row.version_id),
        revision: Number(row.pointer_revision),
        updatedBy: String(row.pointer_updated_by),
        updatedAt: dateTime(row.pointer_updated_at),
      },
      version: {
        schemaVersion: 1,
        versionId: String(row.version_id),
        artifactKey: String(row.artifact_key),
        artifactKind: String(row.artifact_kind),
        versionNumber: Number(row.version_number),
        lifecycle: String(row.lifecycle),
        revision: Number(row.version_revision),
        contentHash: String(row.content_hash),
        content: row.content,
        createdBy: String(row.created_by_subject),
        createdAt: dateTime(row.created_at),
        updatedAt: dateTime(row.updated_at),
      },
    }));
  }

  async loadPin(
    scopeType: RuntimePolicyDatabasePinScope,
    scopeId: string,
  ): Promise<RuntimePolicyDatabasePin | null> {
    const result = await this.pool.query(
      `SELECT pin_scope_type, pin_scope_id, page_id, channel,
              bundle_hash, bundle, pinned_at
       FROM runtime_policy_pins
       WHERE pin_scope_type = $1 AND pin_scope_id = $2`,
      [scopeType, scopeId],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? pinFromRow(row) : null;
  }

  async savePinIfAbsent(pin: RuntimePolicyDatabasePin): Promise<RuntimePolicyDatabasePin> {
    const bundle = pin.bundle as {
      readonly bundleId?: unknown;
      readonly versionReferences?: readonly { readonly versionId?: unknown }[];
    };
    const versionIds = bundle.versionReferences?.map((item) => String(item.versionId)) ?? [];
    const result = await this.pool.query(
      `INSERT INTO runtime_policy_pins (
         pin_scope_type, pin_scope_id, page_id, channel, bundle_id,
         bundle_hash, version_ids, bundle, pinned_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::uuid[],$8::jsonb,$9)
       ON CONFLICT (pin_scope_type, pin_scope_id) DO NOTHING
       RETURNING pin_scope_type, pin_scope_id, page_id, channel,
                 bundle_hash, bundle, pinned_at`,
      [pin.scopeType, pin.scopeId, pin.pageId, pin.channel,
        String(bundle.bundleId ?? ""), pin.bundleHash, versionIds,
        JSON.stringify(pin.bundle), pin.pinnedAt],
    );
    const inserted = result.rows[0] as Record<string, unknown> | undefined;
    if (inserted) return pinFromRow(inserted);
    const winner = await this.loadPin(pin.scopeType, pin.scopeId);
    if (!winner) throw new Error("RUNTIME_POLICY_PIN_RACE_LOST_WITHOUT_WINNER");
    return winner;
  }

  async recordResolution(event: RuntimePolicyDatabaseAuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO runtime_policy_resolution_audit (
         resolution_id, page_id, channel, status, source, side_effects,
         bundle_id, bundle_hash, version_ids, reason_codes,
         pin_scope_type, pin_scope_id, occurred_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid[],$10::text[],$11,$12,$13)`,
      [event.resolutionId, event.pageId, event.channel, event.status,
        event.source, event.sideEffects, event.bundleId, event.bundleHash,
        [...event.versionIds], [...event.reasonCodes], event.pinScopeType,
        event.pinScopeId, event.occurredAt],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
