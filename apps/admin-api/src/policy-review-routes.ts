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
  readonly artifact_key?: string;
  readonly search?: string;
  readonly active?: string;
  readonly sort?: string;
}

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
    artifactKey: optionalToken(query.artifact_key, 128),
    search: optionalToken(query.search, 120),
    active: optionalEnum<PolicyArtifactActiveFilter>(query.active, ["any", "active", "inactive"]) ?? "any",
    sort: optionalEnum<PolicyArtifactSort>(query.sort, ["updated_desc", "validated_oldest", "artifact_key_asc"]) ?? "updated_desc",
  };
}

function requirePolicyControl(enabled: boolean): void {
  if (!enabled) throw new AdminQueryError("ADMIN_POLICY_CONTROL_UNAVAILABLE");
}

function requireIdentity(request: FastifyRequest): AdminIdentity {
  if (!request.adminIdentity) throw new AdminQueryError("ADMIN_AUTH_REQUIRED");
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
  return allowed.includes(value as T) ? value as T : (() => {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  })();
}

function requiredUuid(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return value;
}
