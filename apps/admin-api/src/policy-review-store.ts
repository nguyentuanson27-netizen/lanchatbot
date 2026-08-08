import pg from "pg";
import type {
  AdminIdentity,
  AdminStore,
  ArtifactVersionQuery,
} from "./types.js";
import { AdminQueryError } from "./types.js";

const { Pool } = pg;

export type PolicyArtifactSort =
  | "updated_desc"
  | "validated_oldest"
  | "artifact_key_asc";
export type PolicyArtifactActiveFilter = "any" | "active" | "inactive";

export interface PolicyReviewArtifactQuery extends ArtifactVersionQuery {
  readonly search?: string | undefined;
  readonly active?: PolicyArtifactActiveFilter | undefined;
  readonly sort?: PolicyArtifactSort | undefined;
}

export interface PolicyCursor {
  readonly sort: PolicyArtifactSort;
  readonly value: string | null;
  readonly id: string;
}

export interface PolicyReviewStoreExtension {
  getArtifactReviewContext(
    identity: AdminIdentity,
    versionId: string,
  ): Promise<Record<string, unknown> | null>;
}

interface BuiltPolicyQuery {
  readonly sql: string;
  readonly values: readonly unknown[];
  readonly sort: PolicyArtifactSort;
}

const ARTIFACT_COLUMNS = `version_id, artifact_key, artifact_kind, version_number,
  schema_version, lifecycle, revision, content, content_hash,
  created_by_subject, updated_by_subject, validated_by_subject,
  approved_by_subject, canary_by_subject, published_by_subject,
  retired_by_subject, validated_at, approved_at, canary_at,
  published_at, retired_at, created_at, updated_at`;

const POLICY_SORTS = new Set<PolicyArtifactSort>([
  "updated_desc",
  "validated_oldest",
  "artifact_key_asc",
]);
const POLICY_ACTIVE_FILTERS = new Set<PolicyArtifactActiveFilter>([
  "any",
  "active",
  "inactive",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createPolicyReviewStore(
  base: AdminStore,
  databaseUrl: string,
): AdminStore & PolicyReviewStoreExtension {
  const pool = new Pool({
    connectionString: databaseUrl,
    application_name: "lana-admin-policy-review",
    max: 4,
    idleTimeoutMillis: 30_000,
    statement_timeout: 8_000,
    query_timeout: 10_000,
  });

  const extension: Pick<AdminStore, "listArtifactVersions" | "listActivePointers" | "close"> &
    PolicyReviewStoreExtension = {
    async listArtifactVersions(identity, query) {
      const reviewQuery = query as PolicyReviewArtifactQuery;
      const built = buildPolicyArtifactListQuery(identity, reviewQuery);
      const result = await pool.query(built.sql, [...built.values]);
      const hasMore = result.rows.length > reviewQuery.limit;
      const rows = result.rows.slice(0, reviewQuery.limit);
      const last = rows.at(-1);
      return {
        items: rows.map(policySafeRow),
        nextCursor: hasMore && last
          ? encodePolicyCursor(cursorFromRow(last, built.sort))
          : null,
      };
    },

    async listActivePointers(identity) {
      const values: unknown[] = [];
      const scope = pointerScopePredicate(identity, values, "p");
      const result = await pool.query(
        `SELECT p.pointer_id, p.artifact_key, p.artifact_kind, p.page_id, p.channel,
                p.version_id, p.revision, p.updated_by_subject, p.updated_at,
                p.version_number, p.lifecycle, p.content_hash
         FROM admin_active_pointers_v p
         WHERE ${scope}
         ORDER BY p.artifact_kind, p.artifact_key, p.page_id NULLS FIRST, p.channel`,
        values,
      );
      return result.rows.map(policySafeRow);
    },

    async getArtifactReviewContext(identity, versionId) {
      const current = await pool.query(
        `SELECT ${ARTIFACT_COLUMNS}
         FROM admin_artifact_versions_v
         WHERE version_id = $1
         LIMIT 1`,
        [versionId],
      );
      const artifact = current.rows[0];
      if (!artifact) return null;

      const previous = await pool.query(
        `SELECT ${ARTIFACT_COLUMNS}
         FROM admin_artifact_versions_v
         WHERE artifact_key = $1
           AND artifact_kind = $2
           AND version_number < $3
         ORDER BY version_number DESC, version_id DESC
         LIMIT 1`,
        [artifact.artifact_key, artifact.artifact_kind, artifact.version_number],
      );

      const values: unknown[] = [artifact.artifact_key, artifact.artifact_kind, artifact.version_id];
      const scope = pointerScopePredicate(identity, values, "p");
      const pointers = await pool.query(
        `SELECT
           p.pointer_id,
           p.artifact_key,
           p.artifact_kind,
           p.page_id,
           p.channel,
           p.version_id,
           p.version_number,
           p.revision,
           p.updated_at,
           target.version_id AS target_version_id,
           target.version_number AS target_version_number,
           target.lifecycle AS target_lifecycle,
           target.revision AS target_revision,
           target.content AS target_content,
           target.content_hash AS target_content_hash,
           target.updated_by_subject AS target_updated_by_subject,
           target.updated_at AS target_updated_at
         FROM admin_active_pointers_v p
         LEFT JOIN LATERAL (
           SELECT v.version_id, v.version_number, v.lifecycle, v.revision,
                  v.content, v.content_hash, v.updated_by_subject, v.updated_at
           FROM admin_artifact_versions_v v
           WHERE v.artifact_key = p.artifact_key
             AND v.artifact_kind = p.artifact_kind
             AND v.version_number < p.version_number
             AND v.lifecycle = CASE
               WHEN p.channel = 'PUBLISHED' THEN 'PUBLISHED'
               ELSE 'CANARY'
             END
           ORDER BY v.version_number DESC, v.version_id DESC
           LIMIT 1
         ) target ON TRUE
         WHERE p.artifact_key = $1
           AND p.artifact_kind = $2
           AND p.version_id = $3
           AND ${scope}
         ORDER BY p.page_id NULLS FIRST, p.channel, p.pointer_id`,
        values,
      );

      const activePointers = pointers.rows.map(pointerSnapshot);
      const rollbackCandidates = pointers.rows
        .filter(isConcreteRollbackCandidateRow)
        .map((row) => ({
          pointer: pointerSnapshot(row),
          target_version: policySafeRow({
            version_id: row.target_version_id,
            artifact_key: row.artifact_key,
            artifact_kind: row.artifact_kind,
            version_number: row.target_version_number,
            lifecycle: row.target_lifecycle,
            revision: row.target_revision,
            content: row.target_content,
            content_hash: row.target_content_hash,
            updated_by_subject: row.target_updated_by_subject,
            updated_at: row.target_updated_at,
          }),
        }));

      return {
        artifact: policySafeRow(artifact),
        previous_version: previous.rows[0] ? policySafeRow(previous.rows[0]) : null,
        active_pointers: activePointers,
        rollback_candidates: rollbackCandidates,
      };
    },

    async close() {
      await Promise.all([pool.end(), base.close()]);
    },
  };

  return new Proxy(base as AdminStore & PolicyReviewStoreExtension, {
    get(target, property) {
      if (Object.prototype.hasOwnProperty.call(extension, property)) {
        const value = Reflect.get(extension, property, extension);
        return typeof value === "function" ? value.bind(extension) : value;
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function buildPolicyArtifactListQuery(
  identity: AdminIdentity,
  query: PolicyReviewArtifactQuery,
): BuiltPolicyQuery {
  const sort = normalizeSort(query.sort);
  const active = normalizeActive(query.active);
  if (sort === "validated_oldest" && query.lifecycle !== "VALIDATED") {
    throw new AdminQueryError("ADMIN_POLICY_SORT_INVALID");
  }

  const filters: string[] = [];
  const values: unknown[] = [];
  if (query.artifactKind) addFilter(filters, values, "v.artifact_kind", query.artifactKind);
  if (query.lifecycle) addFilter(filters, values, "v.lifecycle", query.lifecycle);
  if (query.artifactKey) addFilter(filters, values, "v.artifact_key", query.artifactKey);
  if (query.search) {
    values.push(`%${escapeLike(query.search)}%`);
    filters.push(`v.artifact_key ILIKE $${values.length} ESCAPE '!'`);
  }

  const scope = pointerScopePredicate(identity, values, "p");
  const activeExpression = `EXISTS (
    SELECT 1
    FROM admin_active_pointers_v p
    WHERE p.version_id = v.version_id
      AND ${scope}
  )`;
  if (active === "active") filters.push(activeExpression);
  if (active === "inactive") filters.push(`NOT ${activeExpression}`);

  if (query.cursor) {
    addCursorFilter(filters, values, decodePolicyCursor(query.cursor, sort));
  }

  values.push(query.limit + 1);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return {
    sort,
    values,
    sql: `SELECT ${ARTIFACT_COLUMNS},
                 ${activeExpression} AS is_active
          FROM admin_artifact_versions_v v
          ${where}
          ${orderBy(sort)}
          LIMIT $${values.length}`,
  };
}

export function encodePolicyCursor(cursor: PolicyCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodePolicyCursor(
  encoded: string,
  expectedSort: PolicyArtifactSort,
): PolicyCursor {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<PolicyCursor>;
    if (
      !parsed ||
      !POLICY_SORTS.has(parsed.sort as PolicyArtifactSort) ||
      parsed.sort !== expectedSort ||
      !(typeof parsed.value === "string" || parsed.value === null) ||
      typeof parsed.id !== "string" ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error("invalid");
    }
    if (
      (expectedSort === "updated_desc" || expectedSort === "validated_oldest") &&
      parsed.value !== null &&
      !Number.isFinite(Date.parse(parsed.value))
    ) {
      throw new Error("invalid-date");
    }
    if (
      (expectedSort === "updated_desc" || expectedSort === "artifact_key_asc") &&
      parsed.value === null
    ) {
      throw new Error("missing-primary-value");
    }
    return parsed as PolicyCursor;
  } catch {
    throw new AdminQueryError("ADMIN_POLICY_CURSOR_INVALID");
  }
}

function addCursorFilter(
  filters: string[],
  values: unknown[],
  cursor: PolicyCursor,
): void {
  if (cursor.sort === "updated_desc") {
    values.push(cursor.value, cursor.id);
    const value = `$${values.length - 1}`;
    const id = `$${values.length}`;
    filters.push(`(v.updated_at < ${value}::timestamptz OR (v.updated_at = ${value}::timestamptz AND v.version_id::text < ${id}))`);
    return;
  }
  if (cursor.sort === "artifact_key_asc") {
    values.push(cursor.value, cursor.id);
    const value = `$${values.length - 1}`;
    const id = `$${values.length}`;
    filters.push(`(v.artifact_key > ${value} OR (v.artifact_key = ${value} AND v.version_id::text > ${id}))`);
    return;
  }
  values.push(cursor.id);
  const id = `$${values.length}`;
  if (cursor.value === null) {
    filters.push(`(v.validated_at IS NULL AND v.version_id::text > ${id})`);
    return;
  }
  values.push(cursor.value);
  const value = `$${values.length}`;
  filters.push(`(v.validated_at > ${value}::timestamptz OR v.validated_at IS NULL OR (v.validated_at = ${value}::timestamptz AND v.version_id::text > ${id}))`);
}

function cursorFromRow(row: Record<string, unknown>, sort: PolicyArtifactSort): PolicyCursor {
  const id = String(row.version_id ?? "");
  if (!UUID_PATTERN.test(id)) throw new AdminQueryError("ADMIN_POLICY_CURSOR_INVALID");
  if (sort === "artifact_key_asc") {
    return { sort, value: String(row.artifact_key ?? ""), id };
  }
  if (sort === "validated_oldest") {
    return { sort, value: row.validated_at == null ? null : toIso(row.validated_at), id };
  }
  return { sort, value: toIso(row.updated_at), id };
}

function orderBy(sort: PolicyArtifactSort): string {
  switch (sort) {
    case "updated_desc":
      return "ORDER BY v.updated_at DESC, v.version_id DESC";
    case "validated_oldest":
      return "ORDER BY v.validated_at ASC NULLS LAST, v.version_id ASC";
    case "artifact_key_asc":
      return "ORDER BY v.artifact_key ASC, v.version_id ASC";
  }
}

function normalizeSort(value: PolicyArtifactSort | undefined): PolicyArtifactSort {
  if (value === undefined) return "updated_desc";
  if (!POLICY_SORTS.has(value)) throw new AdminQueryError("ADMIN_POLICY_SORT_INVALID");
  return value;
}

function normalizeActive(value: PolicyArtifactActiveFilter | undefined): PolicyArtifactActiveFilter {
  if (value === undefined) return "any";
  if (!POLICY_ACTIVE_FILTERS.has(value)) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return value;
}

function pointerScopePredicate(
  identity: AdminIdentity,
  values: unknown[],
  alias: string,
): string {
  if (identity.pageScope === "ALL") return "TRUE";
  if (identity.pageScope.length === 0) return `${alias}.page_id IS NULL`;
  values.push([...identity.pageScope]);
  return `(${alias}.page_id IS NULL OR ${alias}.page_id = ANY($${values.length}::text[]))`;
}

export function isConcreteRollbackCandidateRow(row: Record<string, unknown>): boolean {
  return typeof row.target_version_id === "string" &&
    typeof row.page_id === "string" &&
    row.page_id.length > 0;
}

function pointerSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  return policySafeRow({
    pointer_id: row.pointer_id,
    artifact_key: row.artifact_key,
    artifact_kind: row.artifact_kind,
    page_id: row.page_id,
    channel: row.channel,
    version_id: row.version_id,
    version_number: row.version_number,
    revision: row.revision,
    updated_at: row.updated_at,
  });
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

function escapeLike(value: string): string {
  return value.replace(/[!%_]/g, "!$&");
}

function policySafeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    value instanceof Date ? value.toISOString() : value,
  ]));
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const timestamp = Date.parse(String(value ?? ""));
  if (!Number.isFinite(timestamp)) throw new AdminQueryError("ADMIN_POLICY_CURSOR_INVALID");
  return new Date(timestamp).toISOString();
}
