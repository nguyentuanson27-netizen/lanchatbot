import { randomUUID } from "node:crypto";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import {
  AdminArtifactContentV1Schema,
  AdminArtifactKindV1Schema,
  AdminArtifactLifecycleV1Schema,
  AdminArtifactTransitionActionV1Schema,
  AdminCanaryModeV1Schema,
  AdminSimulationRequestV1Schema,
} from "@lana/contracts";
import {
  AdminAuthError,
  AdminQueryError,
  type AdminAuthenticator,
  type AdminCommandTag,
  type AdminCommandType,
  type AdminCommandReason,
  type AdminIdentity,
  type AdminStore,
} from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    adminIdentity?: AdminIdentity;
  }
}

export interface CreateAdminApiOptions {
  readonly authenticator: AdminAuthenticator;
  readonly store: AdminStore;
  readonly allowedOrigin?: string;
  readonly controlEnabled?: boolean;
  readonly historyEnabled?: boolean;
  readonly controlPageIds?: "ALL" | readonly string[];
  readonly policyControlEnabled?: boolean;
  readonly policyPageIds?: "ALL" | readonly string[];
}

interface ListQuerystring {
  readonly limit?: string;
  readonly cursor?: string;
  readonly page_id?: string;
  readonly status?: string;
}

interface ConversationQuerystring extends ListQuerystring {
  readonly conversation_owner?: string;
  readonly routing_owner?: string;
  readonly blocking_tag?: string;
}

interface TimelineQuerystring extends ListQuerystring {
  readonly conversation_id?: string;
  readonly since?: string;
  readonly until?: string;
}

interface OutreachQuerystring extends ListQuerystring {
  readonly template_id?: string;
  readonly since?: string;
  readonly until?: string;
}

interface OutreachMetricsQuerystring {
  readonly page_id?: string;
  readonly since?: string;
  readonly until?: string;
}

interface AuditQuerystring extends ListQuerystring {
  readonly action?: string;
  readonly resource_type?: string;
}

interface HandoffQuerystring extends ListQuerystring {
  readonly reason_code?: string;
  readonly conversation_id?: string;
  readonly source?: string;
  readonly desired_tag?: string;
}

interface CommandBody {
  readonly command?: unknown;
  readonly tag?: unknown;
  readonly pause_minutes?: unknown;
  readonly expected_state_version?: unknown;
  readonly reason?: unknown;
}

interface ArtifactQuerystring extends ListQuerystring {
  readonly artifact_kind?: string;
  readonly lifecycle?: string;
  readonly artifact_key?: string;
}

interface CreateArtifactBody {
  readonly artifact_key?: unknown;
  readonly content?: unknown;
}

interface UpdateArtifactBody {
  readonly expected_revision?: unknown;
  readonly content?: unknown;
}

interface TransitionArtifactBody {
  readonly expected_revision?: unknown;
  readonly action?: unknown;
  readonly page_id?: unknown;
  readonly canary_mode?: unknown;
}

interface RollbackArtifactBody {
  readonly artifact_key?: unknown;
  readonly artifact_kind?: unknown;
  readonly page_id?: unknown;
  readonly channel?: unknown;
  readonly target_version_id?: unknown;
  readonly expected_pointer_revision?: unknown;
}

export function createAdminApi(options: CreateAdminApiOptions): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 65_536,
    requestIdHeader: "x-request-id",
    genReqId: () => randomUUID(),
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("cache-control", "no-store");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    return payload;
  });

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/admin/v1")) return;
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (
      options.allowedOrigin &&
      (mutation
        ? request.headers.origin !== options.allowedOrigin
        : Boolean(request.headers.origin) &&
          request.headers.origin !== options.allowedOrigin)
    ) {
      return reply.code(403).send(errorBody("ADMIN_ORIGIN_DENIED", request.id));
    }
    const assertionHeader = request.headers["x-lana-admin-assertion"];
    const assertion = Array.isArray(assertionHeader)
      ? assertionHeader[0]
      : assertionHeader;
    try {
      request.adminIdentity = await options.authenticator.authenticate(assertion);
    } catch (error) {
      if (error instanceof AdminAuthError) {
        const status = error.code === "ADMIN_ACCESS_DENIED"
          ? 403
          : error.code === "ADMIN_AUTH_UNAVAILABLE"
            ? 503
            : 401;
        return reply.code(status).send(errorBody(error.code, request.id));
      }
      return reply.code(503).send(errorBody("ADMIN_AUTH_UNAVAILABLE", request.id));
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AdminQueryError) {
      const status = error.code === "ADMIN_PAGE_NOT_ALLOWED" || error.code === "ADMIN_POLICY_FORBIDDEN"
        ? 403
        : error.code === "ADMIN_IDEMPOTENCY_CONFLICT" || error.code === "ADMIN_ARTIFACT_VERSION_CONFLICT"
          ? 409
          : error.code === "ADMIN_CONTROL_UNAVAILABLE" || error.code === "ADMIN_POLICY_CONTROL_UNAVAILABLE"
            ? 503
          : 400;
      return reply.code(status).send(errorBody(error.code, request.id));
    }
    const databaseError = error as Error & {
      code?: string;
      constraint?: string;
      table?: string;
      routine?: string;
    };
    process.stderr.write(`${JSON.stringify({
      level: "error",
      service: "admin-api",
      request_id: request.id,
      route: request.routeOptions.url,
      method: request.method,
      error_name: databaseError.name,
      database_code: databaseError.code?.slice(0, 16) ?? null,
      database_constraint: databaseError.constraint?.slice(0, 128) ?? null,
      database_table: databaseError.table?.slice(0, 128) ?? null,
      database_routine: databaseError.routine?.slice(0, 128) ?? null,
    })}\n`);
    return reply.code(500).send(errorBody("ADMIN_INTERNAL_ERROR", request.id));
  });

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    const [authReady, storeReady, controlReady, policyControlReady] = await Promise.all([
      options.authenticator.ready().catch(() => false),
      options.store.ready().catch(() => false),
      options.controlEnabled
        ? options.store.controlReady().catch(() => false)
        : Promise.resolve(true),
      options.policyControlEnabled
        ? options.store.policyControlReady().catch(() => false)
        : Promise.resolve(true),
    ]);
    if (!authReady || !storeReady || !controlReady || !policyControlReady) {
      return reply.code(503).send({
        status: "not_ready",
        auth: authReady,
        database: storeReady && controlReady,
        read_only: !options.controlEnabled,
        control_plane: Boolean(options.controlEnabled),
        policy_control: Boolean(options.policyControlEnabled),
      });
    }
    return {
      status: "ready",
      auth: true,
      database: true,
      read_only: !options.controlEnabled,
      control_plane: Boolean(options.controlEnabled),
      policy_control: Boolean(options.policyControlEnabled),
    };
  });

  app.get("/admin/v1/me", async (request) => {
    const identity = requireIdentity(request);
    return {
      user: {
        email: identity.email,
        role: identity.role,
        page_scope: identity.pageScope,
        capabilities: {
          conversation_control: Boolean(options.controlEnabled),
          history: Boolean(options.historyEnabled),
          control_page_ids: options.controlPageIds ?? [],
          policy_control: Boolean(options.policyControlEnabled),
          policy_page_ids: options.policyPageIds ?? [],
        },
      },
    };
  });

  app.get("/admin/v1/dashboard", async (request) => ({
    ...await options.store.dashboard(requireIdentity(request)),
    admin_control: {
      enabled: Boolean(options.controlEnabled),
      page_ids: options.controlPageIds ?? [],
    },
  }));

  app.get("/admin/v1/pages", async (request) => ({
    items: await options.store.listPages(requireIdentity(request)),
    next_cursor: null,
  }));

  app.get<{ Params: { id: string } }>(
    "/admin/v1/pages/:id/health",
    async (request, reply) => {
      const result = await options.store.pageHealth(
        requireIdentity(request),
        request.params.id,
      );
      return result ?? notFound(reply, request.id);
    },
  );

  app.post<{ Params: { id: string }; Body: CommandBody }>(
    "/admin/v1/conversations/:id/commands",
    async (request, reply) => {
      if (!options.controlEnabled) {
        return reply.code(503).send(errorBody("ADMIN_CONTROL_DISABLED", request.id));
      }
      const conversationId = requiredUuid(request.params.id);
      const identity = requireIdentity(request);
      const conversation = await options.store.getConversation(identity, conversationId);
      if (!conversation) return notFound(reply, request.id);
      const pageId = typeof conversation.page_id === "string"
        ? conversation.page_id
        : "";
      if (!controlPageAllowed(options.controlPageIds ?? [], pageId)) {
        return reply.code(403).send(errorBody("ADMIN_PAGE_NOT_ALLOWED", request.id));
      }
      const idempotencyHeader = request.headers["idempotency-key"];
      const idempotencyKey = parseIdempotencyKey(
        Array.isArray(idempotencyHeader) ? idempotencyHeader[0] : idempotencyHeader,
      );
      const input = parseCommandBody(request.body, idempotencyKey);
      const result = await options.store.createConversationCommand(
        identity,
        conversationId,
        { ...input, correlationId: randomUUID() },
      );
      if (!result) return notFound(reply, request.id);
      if (result.conflicted) {
        return reply.code(409).send({ command: result.command });
      }
      return reply.code(result.created ? 202 : 200).send({ command: result.command });
    },
  );

  app.get<{ Params: { id: string }; Querystring: ListQuerystring }>(
    "/admin/v1/conversations/:id/commands",
    async (request, reply) => {
      const conversationId = requiredUuid(request.params.id);
      const result = await options.store.listConversationCommands(
        requireIdentity(request),
        conversationId,
        parseCommonQuery(request.query),
      );
      return result ? envelope(result) : notFound(reply, request.id);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/commands/:id",
    async (request, reply) => {
      const result = await options.store.getCommand(
        requireIdentity(request),
        requiredUuid(request.params.id),
      );
      return result ? { command: result } : notFound(reply, request.id);
    },
  );

  app.get<{ Querystring: ConversationQuerystring }>(
    "/admin/v1/conversations",
    async (request) => {
      const result = await options.store.listConversations(
        requireIdentity(request),
        parseConversationQuery(request.query),
      );
      return envelope(result);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/conversations/:id",
    async (request, reply) => {
      const result = await options.store.getConversation(
        requireIdentity(request),
        request.params.id,
      );
      return result ? { conversation: result } : notFound(reply, request.id);
    },
  );

  app.get<{ Querystring: TimelineQuerystring }>(
    "/admin/v1/messages",
    async (request, reply) => {
      if (!options.historyEnabled) {
        return reply.code(503).send(errorBody("ADMIN_HISTORY_DISABLED", request.id));
      }
      return envelope(await options.store.listMessages(
        requireIdentity(request),
        parseTimelineQuery(request.query),
      ));
    },
  );

  app.get<{ Querystring: OutreachQuerystring }>(
    "/admin/v1/outreach/messages",
    async (request, reply) => {
      if (!options.historyEnabled) {
        return reply.code(503).send(errorBody("ADMIN_HISTORY_DISABLED", request.id));
      }
      return envelope(await options.store.listOutreachMessages(
        requireIdentity(request),
        parseOutreachQuery(request.query),
      ));
    },
  );

  app.get<{ Querystring: OutreachMetricsQuerystring }>(
    "/admin/v1/outreach/metrics",
    async (request, reply) => {
      if (!options.historyEnabled) {
        return reply.code(503).send(errorBody("ADMIN_HISTORY_DISABLED", request.id));
      }
      return {
        metrics: await options.store.outreachMetrics(
        requireIdentity(request),
        parseOutreachMetricsQuery(request.query),
        ),
      };
    },
  );

  app.get<{ Querystring: TimelineQuerystring }>(
    "/admin/v1/events",
    async (request) => envelope(
      await options.store.listEvents(
        requireIdentity(request),
        parseTimelineQuery(request.query),
      ),
    ),
  );

  app.get<{ Querystring: { page_id?: string } }>(
    "/admin/v1/evaluations/summary",
    async (request) => ({
      summary: await options.store.evaluationSummary(
        requireIdentity(request),
        optionalToken(request.query.page_id, 64),
      ),
    }),
  );

  app.get<{ Querystring: ListQuerystring }>(
    "/admin/v1/evaluations",
    async (request) => {
      const common = parseCommonQuery(request.query);
      return envelope(
        await options.store.listEvaluations(requireIdentity(request), {
          ...common,
          status: optionalToken(request.query.status, 64),
        }),
      );
    },
  );

  app.get<{ Querystring: { page_id?: string } }>(
    "/admin/v1/business-facts/summary",
    async (request) => ({
      summary: await options.store.businessFactSummary(
        requireIdentity(request),
        optionalToken(request.query.page_id, 64),
      ),
    }),
  );

  app.get("/admin/v1/operations/workers", async (request) => ({
    items: await options.store.listWorkers(requireIdentity(request)),
  }));

  app.get("/admin/v1/catalog/summary", async (request) => ({
    summary: await options.store.catalogSummary(requireIdentity(request)),
  }));

  app.get<{ Querystring: { page_id?: string } }>(
    "/admin/v1/handoffs/summary",
    async (request) => ({
      summary: await options.store.handoffSummary(
        requireIdentity(request),
        optionalToken(request.query.page_id, 64),
      ),
    }),
  );

  app.get<{ Querystring: HandoffQuerystring }>(
    "/admin/v1/handoffs",
    async (request) => envelope(
      await options.store.listHandoffs(
        requireIdentity(request),
        parseHandoffQuery(request.query),
      ),
    ),
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/handoffs/:id",
    async (request, reply) => {
      const result = await options.store.getHandoff(
        requireIdentity(request),
        requiredUuid(request.params.id),
      );
      return result ? { handoff: result } : notFound(reply, request.id);
    },
  );

  registerOperation(
    app,
    "/admin/v1/operations/inbox",
    (identity, query) => options.store.listInbox(identity, query),
  );
  registerOperation(
    app,
    "/admin/v1/operations/meta-outbox",
    (identity, query) => options.store.listMetaOutbox(identity, query),
  );
  registerOperation(
    app,
    "/admin/v1/operations/pancake-outbox",
    (identity, query) => options.store.listPancakeOutbox(identity, query),
  );

  app.get<{ Querystring: AuditQuerystring }>(
    "/admin/v1/audit",
    async (request) => {
      const common = parseCommonQuery(request.query);
      return envelope(
        await options.store.listAudit(requireIdentity(request), {
          ...common,
          action: optionalToken(request.query.action, 128),
          resourceType: optionalToken(request.query.resource_type, 128),
        }),
      );
    },
  );

  app.get<{ Querystring: ArtifactQuerystring }>(
    "/admin/v1/policy/artifacts",
    async (request) => {
      requirePolicyControl(options);
      return envelope(await options.store.listArtifactVersions(
        requireIdentity(request),
        parseArtifactQuery(request.query),
      ));
    },
  );

  app.post<{ Body: CreateArtifactBody }>(
    "/admin/v1/policy/artifacts",
    async (request, reply) => {
      requirePolicyControl(options);
      const created = await options.store.createArtifactVersion(requireIdentity(request), {
        artifactKey: requiredArtifactKey(request.body?.artifact_key),
        content: parseArtifactContent(request.body?.content),
        correlationId: randomUUID(),
      });
      return reply.code(201).send({ artifact: created });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/policy/artifacts/:id",
    async (request, reply) => {
      requirePolicyControl(options);
      const result = await options.store.getArtifactVersion(
        requireIdentity(request),
        requiredUuid(request.params.id),
      );
      return result ? { artifact: result } : notFound(reply, request.id);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/admin/v1/policy/artifacts/:id/events",
    async (request) => {
      requirePolicyControl(options);
      return {
        items: await options.store.listArtifactEvents(
          requireIdentity(request),
          requiredUuid(request.params.id),
        ),
        next_cursor: null,
      };
    },
  );

  app.put<{ Params: { id: string }; Body: UpdateArtifactBody }>(
    "/admin/v1/policy/artifacts/:id/draft",
    async (request, reply) => {
      requirePolicyControl(options);
      const result = await options.store.updateArtifactDraft(
        requireIdentity(request),
        requiredUuid(request.params.id),
        {
          expectedRevision: requiredRevision(request.body?.expected_revision),
          content: parseArtifactContent(request.body?.content),
          correlationId: randomUUID(),
        },
      );
      return result ? { artifact: result } : notFound(reply, request.id);
    },
  );

  app.post<{ Params: { id: string }; Body: TransitionArtifactBody }>(
    "/admin/v1/policy/artifacts/:id/transitions",
    async (request, reply) => {
      requirePolicyControl(options);
      const action = AdminArtifactTransitionActionV1Schema.safeParse(request.body?.action);
      if (!action.success) throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      const pageId = nullablePageId(request.body?.page_id);
      if (pageId && !controlPageAllowed(options.policyPageIds ?? [], pageId)) {
        return reply.code(403).send(errorBody("ADMIN_PAGE_NOT_ALLOWED", request.id));
      }
      const result = await options.store.transitionArtifactVersion(
        requireIdentity(request),
        requiredUuid(request.params.id),
        {
          expectedRevision: requiredRevision(request.body?.expected_revision),
          action: action.data,
          pageId,
          canaryMode: nullableCanaryMode(request.body?.canary_mode),
          correlationId: randomUUID(),
        },
      );
      return result ? { artifact: result } : notFound(reply, request.id);
    },
  );

  app.get("/admin/v1/policy/pointers", async (request) => {
    requirePolicyControl(options);
    return {
      items: await options.store.listActivePointers(requireIdentity(request)),
      next_cursor: null,
    };
  });

  app.post<{ Body: RollbackArtifactBody }>(
    "/admin/v1/policy/pointers/rollback",
    async (request, reply) => {
      requirePolicyControl(options);
      const parsedKind = AdminArtifactKindV1Schema.safeParse(request.body?.artifact_kind);
      const pageId = requiredPageId(request.body?.page_id);
      if (!parsedKind.success) throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      if (!controlPageAllowed(options.policyPageIds ?? [], pageId)) {
        return reply.code(403).send(errorBody("ADMIN_PAGE_NOT_ALLOWED", request.id));
      }
      return {
        pointer: await options.store.rollbackArtifactPointer(requireIdentity(request), {
          artifactKey: requiredArtifactKey(request.body?.artifact_key),
          artifactKind: parsedKind.data,
          pageId,
          channel: requiredEnum(request.body?.channel, ["CANARY_SHADOW", "CANARY_LIVE", "PUBLISHED"] as const),
          targetVersionId: requiredUuid(String(request.body?.target_version_id ?? "")),
          expectedPointerRevision: requiredRevision(request.body?.expected_pointer_revision),
          correlationId: randomUUID(),
        }),
      };
    },
  );

  app.post<{ Body: unknown }>(
    "/admin/v1/policy/simulations",
    async (request, reply) => {
      requirePolicyControl(options);
      const parsed = AdminSimulationRequestV1Schema.safeParse(request.body);
      if (!parsed.success) throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
      if (!controlPageAllowed(options.policyPageIds ?? [], parsed.data.pageId)) {
        return reply.code(403).send(errorBody("ADMIN_PAGE_NOT_ALLOWED", request.id));
      }
      const simulation = await options.store.createSimulation(requireIdentity(request), {
        ...parsed.data,
        correlationId: randomUUID(),
      });
      return reply.code(202).send({ simulation });
    },
  );

  app.get<{ Querystring: ListQuerystring }>(
    "/admin/v1/policy/simulations",
    async (request) => {
      requirePolicyControl(options);
      return envelope(await options.store.listSimulations(
        requireIdentity(request),
        parseCommonQuery(request.query),
      ));
    },
  );

  return app;
}

const COMMANDS = [
  "HANDOFF_NHAN_VIEN",
  "HANDOFF_VAN_DON",
  "PAUSE_BOT",
  "RESUME_BOT",
  "ADD_TAG",
  "REMOVE_TAG",
  "SYNC_PANCAKE_TAGS",
] as const satisfies readonly AdminCommandType[];
const COMMAND_TAGS = [
  "NHAN_VIEN",
  "VAN_DON",
  "DA_CHOT_DON",
  "KHONG_UP_SALE",
] as const satisfies readonly AdminCommandTag[];
const COMMAND_REASONS = [
  "ADMIN_HANDOFF",
  "CUSTOMER_REQUESTED_HUMAN",
  "POST_SALE_SUPPORT",
  "TEMPORARY_PAUSE",
  "RESUME_AFTER_REVIEW",
  "TAG_CORRECTION",
  "MANUAL_TAG_SYNC",
  "ADMIN_TEST",
] as const satisfies readonly AdminCommandReason[];

function parseCommandBody(body: CommandBody | undefined, idempotencyKey: string) {
  if (!body || typeof body !== "object") {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  const command = requiredEnum(body.command, COMMANDS);
  const expectedStateVersion = body.expected_state_version;
  if (
    typeof expectedStateVersion !== "number" ||
    !Number.isSafeInteger(expectedStateVersion) ||
    expectedStateVersion < 0
  ) {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  const reason = requiredEnum(body.reason, COMMAND_REASONS);
  if (!reasonAllowedForCommand(command, reason)) {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  const tag = body.tag === undefined || body.tag === null
    ? null
    : requiredEnum(body.tag, COMMAND_TAGS);
  const pauseMinutes = body.pause_minutes === undefined || body.pause_minutes === null
    ? null
    : body.pause_minutes;
  if (command === "PAUSE_BOT") {
    if ((pauseMinutes !== 15 && pauseMinutes !== 60) || tag !== null) {
      throw new AdminQueryError("ADMIN_COMMAND_INVALID");
    }
  } else if (command === "ADD_TAG" || command === "REMOVE_TAG") {
    if (tag === null || pauseMinutes !== null) {
      throw new AdminQueryError("ADMIN_COMMAND_INVALID");
    }
  } else if (tag !== null || pauseMinutes !== null) {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  return {
    idempotencyKey,
    command,
    tag,
    pauseMinutes: pauseMinutes as 15 | 60 | null,
    expectedStateVersion,
    reason,
  };
}

function requiredEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  return value as T[number];
}

function reasonAllowedForCommand(
  command: AdminCommandType,
  reason: AdminCommandReason,
): boolean {
  if (reason === "ADMIN_TEST") return true;
  switch (command) {
    case "HANDOFF_NHAN_VIEN":
    case "HANDOFF_VAN_DON":
      return reason === "ADMIN_HANDOFF" ||
        reason === "CUSTOMER_REQUESTED_HUMAN" ||
        reason === "POST_SALE_SUPPORT";
    case "PAUSE_BOT":
      return reason === "TEMPORARY_PAUSE";
    case "RESUME_BOT":
      return reason === "RESUME_AFTER_REVIEW";
    case "ADD_TAG":
    case "REMOVE_TAG":
      return reason === "TAG_CORRECTION";
    case "SYNC_PANCAKE_TAGS":
      return reason === "MANUAL_TAG_SYNC" || reason === "TAG_CORRECTION";
  }
}

function parseIdempotencyKey(value: string | undefined): string {
  if (!value || !/^[A-Za-z0-9_.:-]{8,128}$/.test(value)) {
    throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  }
  return value;
}

function requiredUuid(value: string): string {
  const parsed = optionalUuid(value);
  if (!parsed) throw new AdminQueryError("ADMIN_COMMAND_INVALID");
  return parsed;
}

function controlPageAllowed(
  scope: "ALL" | readonly string[],
  pageId: string,
): boolean {
  return scope === "ALL" || scope.includes(pageId);
}

function registerOperation(
  app: FastifyInstance,
  path: string,
  handler: (
    identity: AdminIdentity,
    query: ReturnType<typeof parseOperationQuery>,
  ) => Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>,
): void {
  app.get<{ Querystring: ListQuerystring }>(path, async (request) =>
    envelope(
      await handler(
        requireIdentity(request),
        parseOperationQuery(request.query),
      ),
    ));
}

function requirePolicyControl(options: CreateAdminApiOptions): void {
  if (!options.policyControlEnabled) {
    throw new AdminQueryError("ADMIN_POLICY_CONTROL_UNAVAILABLE");
  }
}

function parseArtifactQuery(query: ArtifactQuerystring) {
  const kind = query.artifact_kind === undefined
    ? undefined
    : AdminArtifactKindV1Schema.safeParse(query.artifact_kind);
  const lifecycle = query.lifecycle === undefined
    ? undefined
    : AdminArtifactLifecycleV1Schema.safeParse(query.lifecycle);
  if (kind && !kind.success || lifecycle && !lifecycle.success) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return {
    ...parseCommonQuery(query),
    artifactKind: kind?.data,
    lifecycle: lifecycle?.data,
    artifactKey: optionalToken(query.artifact_key, 128),
  };
}

function parseArtifactContent(value: unknown) {
  const parsed = AdminArtifactContentV1Schema.safeParse(value);
  if (!parsed.success) throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  return parsed.data;
}

function requiredArtifactKey(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  return value;
}

function requiredRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  return value;
}

function requiredPageId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,64}$/.test(value)) {
    throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  }
  return value;
}

function nullablePageId(value: unknown): string | null {
  return value === null || value === undefined ? null : requiredPageId(value);
}

function nullableCanaryMode(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = AdminCanaryModeV1Schema.safeParse(value);
  if (!parsed.success) throw new AdminQueryError("ADMIN_ARTIFACT_INVALID");
  return parsed.data;
}

function requireIdentity(request: FastifyRequest): AdminIdentity {
  if (!request.adminIdentity) throw new AdminAuthError("ADMIN_AUTH_REQUIRED");
  return request.adminIdentity;
}

function parseCommonQuery(query: ListQuerystring) {
  return {
    limit: parseLimit(query.limit),
    cursor: optionalCursor(query.cursor),
    pageId: optionalToken(query.page_id, 64),
  };
}

function parseConversationQuery(query: ConversationQuerystring) {
  const conversationOwner = optionalEnum(
    query.conversation_owner,
    ["BOT", "HUMAN"] as const,
  );
  const routingOwner = optionalEnum(
    query.routing_owner,
    ["N8N", "APP"] as const,
  );
  const blockingTag = optionalEnum(
    query.blocking_tag,
    ["NHAN_VIEN", "VAN_DON", "DA_CHOT_DON", "KHONG_UP_SALE", "NONE"] as const,
  );
  return {
    ...parseCommonQuery(query),
    conversationOwner,
    routingOwner,
    blockingTag,
  };
}

function parseHandoffQuery(query: HandoffQuerystring) {
  return {
    ...parseCommonQuery(query),
    status: optionalEnum(
      query.status,
      ["OPEN", "NEW", "IN_PROGRESS", "RESOLVED"] as const,
    ),
    reasonCode: optionalToken(query.reason_code, 128),
    conversationId: optionalUuid(query.conversation_id),
    source: optionalEnum(
      query.source,
      ["BOT_POLICY", "CUSTOMER_REQUEST", "POST_SALE", "ADMIN", "ALL"] as const,
    ),
    desiredTag: optionalEnum(
      query.desired_tag,
      ["NHAN_VIEN", "VAN_DON", "ALL"] as const,
    ),
  };
}

function parseTimelineQuery(query: TimelineQuerystring) {
  const since = optionalDate(query.since);
  const until = optionalDate(query.until);
  if (since && until && since > until) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return {
    ...parseCommonQuery(query),
    conversationId: optionalUuid(query.conversation_id),
    since,
    until,
  };
}

function parseOutreachQuery(query: OutreachQuerystring) {
  const since = optionalDate(query.since);
  const until = optionalDate(query.until);
  assertDateRange(since, until);
  return {
    ...parseCommonQuery(query),
    templateId: optionalToken(query.template_id, 128),
    status: optionalToken(query.status, 64),
    since,
    until,
  };
}

function parseOutreachMetricsQuery(query: OutreachMetricsQuerystring) {
  const since = optionalDate(query.since);
  const until = optionalDate(query.until);
  assertDateRange(since, until);
  return {
    pageId: optionalToken(query.page_id, 64),
    since,
    until,
  };
}

function assertDateRange(since: Date | undefined, until: Date | undefined): void {
  if (since && until && since > until) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
}

function parseOperationQuery(query: ListQuerystring) {
  return {
    ...parseCommonQuery(query),
    status: optionalToken(query.status, 64),
  };
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 50;
  if (!/^\d{1,3}$/.test(value)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > 100) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return parsed;
}

function optionalCursor(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!/^[A-Za-z0-9_-]{1,1024}$/.test(value)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return value;
}

function optionalToken(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > maxLength ||
    !/^[\p{L}\p{N}_.:-]+$/u.test(normalized)
  ) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return normalized;
}

function optionalUuid(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return value;
}

function optionalDate(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new AdminQueryError("ADMIN_QUERY_INVALID");
  }
  return new Date(timestamp);
}

function optionalEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number] | undefined {
  if (value === undefined) return undefined;
  return allowed.includes(value as T[number])
    ? value as T[number]
    : (() => { throw new AdminQueryError("ADMIN_QUERY_INVALID"); })();
}

function envelope(result: {
  items: readonly Record<string, unknown>[];
  nextCursor: string | null;
}) {
  return {
    items: result.items,
    next_cursor: result.nextCursor,
  };
}

function notFound(reply: FastifyReply, requestId: string) {
  return reply.code(404).send(errorBody("ADMIN_NOT_FOUND", requestId));
}

function errorBody(code: string, requestId: string) {
  return { code, request_id: requestId };
}
