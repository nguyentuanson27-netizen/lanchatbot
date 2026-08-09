import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  AdminArtifactKindV1Schema,
  AdminArtifactLifecycleV1Schema,
} from "@lana/contracts";
import type { AdminIdentity, AdminStore } from "./types.js";
import { AdminQueryError } from "./types.js";
import type {
  PolicyArtifactActiveFilter,
  PolicyArtifactSort,
  PolicyReviewArtifactQuery,
  PolicyReviewStoreExtension,
} from "./policy-review-store.js";

interface PolicyReviewQuerystring {
  readonly limit?: string;
  readonly cursor?: string;
  readonly page_id?: string;
  readonly artifact_kind?: string;
  readonly lifecycle?: string;
  readonly version?: string;
  readonly revision?: string;
  readonly artifact_key?: string;
  readonly search?: string;
  readonly active?: string;
  readonly sort?: string;
}

interface PolicyBatchBody {
  readonly action?: unknown;
  readonly items?: unknown;
}

interface RevisionGuardBody {
  readonly expected_revision?: unknown;
}

interface PolicyBatchItem {
  readonly versionId: string;
  readonly expectedRevision: number;
}

type PolicyBatchAction = "VALIDATE" | "APPROVE";

export function registerPolicyReviewRoutes(
  app: FastifyInstance,
  store: AdminStore & PolicyReviewStoreExtension,
  policyControlEnabled: boolean,
): void {
  app.get<{ Querystring: PolicyReviewQuerystring }>(
    "/admin/v1/policy/review-artifacts",
    async (request) => {
      requirePolicyControl(policyControlEnabled);
      const result = await store.listArtifactVersions(
        requireIdentity(request),
        parsePolicyReviewQuery(request.query),
      );
      return { items: result.items, next_cursor: result.nextCursor };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/policy/review-artifacts/:id/context",
    async (request, reply) => {
      requirePolicyControl(policyControlEnabled);
      const context = await store.getArtifactReviewContext(
        requireIdentity(request),
        requiredUuid(request.params.id),
      );
      if (!context) {
        return reply.code(404).send({ code: "ADMIN_NOT_FOUND", request_id: request.id });
      }
      return { review_context: context };
    },
  );

  app.delete<{ Params: { id: string }; Body: RevisionGuardBody }>(
    "/admin/v1/policy/pointers/:id",
    async (request, reply) => {
      requirePolicyControl(policyControlEnabled);
      const identity = requireIdentity(request);
      requireOwner(identity);
      const pointer = await store.deactivateArtifactPointer(identity, requiredUuid(request.params.id), {
        expectedRevision: safeRevision(request.body?.expected_revision),
        correlationId: randomUUID(),
      });
      if (!pointer) return reply.code(404).send({ code: "ADMIN_NOT_FOUND", request_id: request.id });
      return { pointer };
    },
  );

  app.delete<{ Params: { id: string }; Body: RevisionGuardBody }>(
    "/admin/v1/policy/review-artifacts/:id",
    async (request, reply) => {
      requirePolicyControl(policyControlEnabled);
      const identity = requireIdentity(request);
      requireOwner(identity);
      const deletion = await store.deleteArtifactVersion(identity, requiredUuid(request.params.id), {
        expectedRevision: safeRevision(request.body?.expected_revision),
        correlationId: randomUUID(),
      });
      if (!deletion) return reply.code(404).send({ code: "ADMIN_NOT_FOUND", request_id: request.id });
      return { deletion };
    },
  );

  app.post<{ Body: PolicyBatchBody }>(
    "/admin/v1/policy/review-artifacts/batch-transitions",
    async (request) => {
      requirePolicyControl(policyControlEnabled);
      const identity = requireIdentity(request);
      const { action, items } = parsePolicyBatchBody(request.body);
      requireBatchRole(identity, action);
      const correlationId = randomUUID();
      const results: Array<Record<string, unknown>> = [];

      for (const item of items) {
        try {
          const artifact = await store.transitionArtifactVersion(identity, item.versionId, {
            expectedRevision: item.expectedRevision,
            action,
            pageId: null,
            canaryMode: null,
            correlationId,
          });
          if (!artifact) {
            results.push({
              version_id: item.versionId,
              ok: false,
              error_code: "ADMIN_NOT_FOUND",
            });
          } else {
            results.push({ version_id: item.versionId, ok: true, artifact });
          }
        } catch (error) {
          if (error instanceof AdminQueryError) {
            const currentRevision = error.code === "ADMIN_ARTIFACT_VERSION_CONFLICT"
              ? await readCurrentRevision(store, identity, item.versionId)
              : null;
            results.push({
              version_id: item.versionId,
              ok: false,
              error_code: error.code,
              ...(currentRevision === null ? {} : { current_revision: currentRevision }),
            });
          } else {
            process.stderr.write(`${JSON.stringify({
              level: "error",
              service: "admin-api",
              event: "policy_batch_item_failed",
              request_id: request.id,
              batch_correlation_id: correlationId,
              action,
              version_id: item.versionId,
              error_name: error instanceof Error ? error.name : "UnknownError",
            })}\n`);
            results.push({
              version_id: item.versionId,
              ok: false,
              error_code: "ADMIN_INTERNAL_ERROR",
            });
          }
        }
      }

      const succeeded = results.filter((result) => result.ok === true).length;
      return {
        request_id: request.id,
        action,
        results,
        summary: {
          total: results.length,
          succeeded,
          failed: results.length - succeeded,
        },
      };
    },
  );
}

function parsePolicyReviewQuery(query: PolicyReviewQuerystring): PolicyReviewArtifactQuery {
  const limit = optionalLimit(query.limit);
  const kind = query.artifact_kind
    ? AdminArtifactKindV1Schema.safeParse(query.artifact_kind)
    : null;
  const lifecycle = query.lifecycle
    ? AdminArtifactLifecycleV1Schema.safeParse(query.lifecycle)
    : null;
  if (kind && !kind.success) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  if (lifecycle && !lifecycle.success) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return {
    limit,
    cursor: optionalToken(query.cursor, 4096),
    pageId: optionalToken(query.page_id, 128),
    artifactKind: kind?.data,
    lifecycle: lifecycle?.data,
    version: optionalPositiveInteger(query.version),
    revision: optionalNonnegativeInteger(query.revision),
    artifactKey: optionalToken(query.artifact_key, 128),
    search: optionalToken(query.search, 120),
    active: optionalEnum<PolicyArtifactActiveFilter>(query.active, ["any", "active", "inactive"]) ?? "any",
    sort: optionalEnum<PolicyArtifactSort>(query.sort, ["updated_desc", "validated_oldest", "artifact_key_asc"]) ?? "updated_desc",
  };
}

function parsePolicyBatchBody(body: PolicyBatchBody | undefined): {
  action: PolicyBatchAction;
  items: PolicyBatchItem[];
} {
  const action = body?.action;
  if (action !== "VALIDATE" && action !== "APPROVE") {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 100) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  const items = body.items.map((value): PolicyBatchItem => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new AdminQueryError("ADMIN_QUERY_INVALID");
    }
    const item = value as Record<string, unknown>;
    const versionId = requiredUuid(String(item.version_id ?? ""));
    const expectedRevision = safeRevision(item.expected_revision);
    return { versionId, expectedRevision };
  });
  if (new Set(items.map((item) => item.versionId)).size !== items.length) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return { action, items };
}

function requireBatchRole(identity: AdminIdentity, action: PolicyBatchAction): void {
  const allowed = action === "VALIDATE"
    ? identity.role === "OWNER" || identity.role === "EDITOR"
    : identity.role === "OWNER" || identity.role === "APPROVER";
  if (!allowed) throw new AdminQueryError("ADMIN_POLICY_FORBIDDEN");
}

function requireOwner(identity: AdminIdentity): void {
  if (identity.role !== "OWNER") throw new AdminQueryError("ADMIN_POLICY_FORBIDDEN");
}

async function readCurrentRevision(
  store: AdminStore,
  identity: AdminIdentity,
  versionId: string,
): Promise<number | null> {
  try {
    const artifact = await store.getArtifactVersion(identity, versionId);
    return artifact ? optionalSafeRevision(artifact.revision) : null;
  } catch {
    return null;
  }
}

function safeRevision(value: unknown): number {
  const revision = optionalSafeRevision(value);
  if (revision === null) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return revision;
}

function optionalSafeRevision(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function requirePolicyControl(enabled: boolean): void {
  if (!enabled) throw new AdminQueryError("ADMIN_POLICY_CONTROL_UNAVAILABLE");
}

function requireIdentity(request: FastifyRequest): AdminIdentity {
  if (!request.adminIdentity) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return request.adminIdentity;
}

function optionalLimit(value: string | undefined): number {
  if (value === undefined || value === "") return 50;
  if (!/^\d+$/u.test(value)) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return parsed;
}

function optionalPositiveInteger(value: string | undefined): number | undefined {
  const parsed = optionalNonnegativeInteger(value);
  if (parsed === 0) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return parsed;
}

function optionalNonnegativeInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return parsed;
}

function optionalToken(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (value.length > maxLength) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return value;
}

function optionalEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === "") return undefined;
  if (!allowed.includes(value as T)) throw new AdminQueryError("ADMIN_QUERY_INVALID");
  return value as T;
}

function requiredUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return value;
}
