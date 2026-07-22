import type { PancakeTagObservationV1 } from "@lana/contracts";
import { PancakeAllowListedClient, type PancakePageConfig } from "./client.js";
import { PancakeTransportFailure, type PancakeHttpResponse } from "./transport.js";

export type HandoffTag = "NHAN_VIEN" | "VAN_DON";
export type ManagedPancakeTag =
  | HandoffTag
  | "DA_CHOT_DON"
  | "KHONG_UP_SALE";

export interface PancakePageRegistry {
  get(pageId: string): PancakePageConfig | null;
}

export class InMemoryPancakePageRegistry implements PancakePageRegistry {
  private readonly pages = new Map<string, PancakePageConfig>();

  constructor(configs: readonly PancakePageConfig[]) {
    for (const config of configs) this.pages.set(config.pageId, config);
  }

  get(pageId: string): PancakePageConfig | null {
    return this.pages.get(pageId) ?? null;
  }
}

export type PancakeTagApplyResult =
  | {
      readonly result: "APPLIED";
      readonly providerTagId: string;
      readonly alreadyPresent: boolean;
    }
  | { readonly result: "RETRYABLE"; readonly reasonCode: string }
  | { readonly result: "FAILED_PERMANENT"; readonly reasonCode: string };

export type PancakeTagRemoveResult =
  | {
      readonly result: "APPLIED";
      readonly providerTagId: string;
      readonly alreadyAbsent: true;
    }
  | { readonly result: "RETRYABLE"; readonly reasonCode: string }
  | { readonly result: "FAILED_PERMANENT"; readonly reasonCode: string };

export function desiredHandoffTag(isPostSale: boolean): HandoffTag {
  return isPostSale ? "VAN_DON" : "NHAN_VIEN";
}

export function mustBlockBot(observation: PancakeTagObservationV1): boolean {
  return observation.blockingTag !== null;
}

export class PancakeHandoffAdapter {
  constructor(
    private readonly client: PancakeAllowListedClient,
    private readonly registry: PancakePageRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async observeBlockingTags(
    pageId: string,
    conversationId: string,
  ): Promise<PancakeTagObservationV1> {
    const config = this.validConfig(pageId);
    if (config === null) return unverified(this.now(), "PANCAKE_PAGE_CONFIG_MISSING");
    if (!hasAllBlockingTagMappings(config)) {
      return unverified(this.now(), "PANCAKE_BLOCKING_TAG_MAP_INCOMPLETE");
    }
    try {
      const read = await this.readConversationTags(config, conversationId);
      if (read.kind === "FAILED") {
        return unverified(this.now(), read.reasonCode);
      }
      const parsed = read.tags;
      if (parsed.kind === "NOT_FOUND") {
        return unverified(this.now(), "PANCAKE_CONVERSATION_NOT_FOUND");
      }
      if (parsed.kind === "INVALID") {
        return unverified(this.now(), "PANCAKE_TAG_RESPONSE_INVALID");
      }
      const ids = parsed.ids;
      const blockingTag = ids.includes(config.tagIds.VAN_DON)
        ? "VAN_DON"
        : ids.includes(config.tagIds.DA_CHOT_DON)
          ? "DA_CHOT_DON"
          : ids.includes(config.tagIds.KHONG_UP_SALE)
            ? "KHONG_UP_SALE"
            : ids.includes(config.tagIds.NHAN_VIEN)
              ? "NHAN_VIEN"
              : null;
      return {
        schemaVersion: 1,
        verified: true,
        blockingTag,
        observedTagIds: ids.slice(0, 100),
        observedAt: this.now().toISOString(),
        reasonCode: null,
        customerName: parsed.customerName,
      };
    } catch (error: unknown) {
      const code =
        error instanceof PancakeTransportFailure
          ? "PANCAKE_TAG_TRANSPORT_UNVERIFIED"
          : "PANCAKE_TAG_READ_UNVERIFIED";
      return unverified(this.now(), code);
    }
  }

  async ensureDesiredTag(
    pageId: string,
    conversationId: string,
    desiredTag: ManagedPancakeTag,
  ): Promise<PancakeTagApplyResult> {
    const config = this.validConfig(pageId);
    if (config === null) {
      return { result: "FAILED_PERMANENT", reasonCode: "PANCAKE_PAGE_CONFIG_MISSING" };
    }
    const tagId = config.tagIds[desiredTag]?.trim();
    if (tagId === undefined || tagId === "") {
      return { result: "FAILED_PERMANENT", reasonCode: "PANCAKE_DESIRED_TAG_MISSING" };
    }

    try {
      const read = await this.readConversationTags(config, conversationId);
      if (read.kind === "FAILED") {
        return { result: "RETRYABLE", reasonCode: read.reasonCode };
      }
      if (read.tags.kind === "NOT_FOUND") {
        return { result: "RETRYABLE", reasonCode: "PANCAKE_CONVERSATION_NOT_FOUND" };
      }
      if (read.tags.kind === "INVALID") {
        return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_RESPONSE_INVALID" };
      }
      const currentIds = read.tags.ids;
      if (currentIds.includes(tagId)) {
        return { result: "APPLIED", providerTagId: tagId, alreadyPresent: true };
      }
    } catch (_error: unknown) {
      return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_READ_FAILED" };
    }

    let applied: PancakeHttpResponse;
    try {
      applied = await this.client.addConversationTag(config, conversationId, tagId);
    } catch (_error: unknown) {
      // ADD is desired-state idempotent: the next attempt must re-read tags.
      return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_ADD_RECONCILE_REQUIRED" };
    }
    const addFailure = classifyOperationResponse(applied.status, "ADD");
    if (addFailure !== null) return addFailure;
    return { result: "APPLIED", providerTagId: tagId, alreadyPresent: false };
  }

  /**
   * REMOVE is only considered complete after an exact Pancake read observes
   * that the tag is absent. A successful POST therefore remains retryable and
   * is reconciled on the next attempt. This prevents the admin control plane
   * from returning ownership to the bot on provider acknowledgement alone.
   */
  async ensureTagAbsent(
    pageId: string,
    conversationId: string,
    tag: ManagedPancakeTag,
  ): Promise<PancakeTagRemoveResult> {
    const config = this.validConfig(pageId);
    if (config === null) {
      return { result: "FAILED_PERMANENT", reasonCode: "PANCAKE_PAGE_CONFIG_MISSING" };
    }
    const tagId = config.tagIds[tag]?.trim();
    if (tagId === undefined || tagId === "") {
      return { result: "FAILED_PERMANENT", reasonCode: "PANCAKE_DESIRED_TAG_MISSING" };
    }

    try {
      const read = await this.readConversationTags(config, conversationId);
      if (read.kind === "FAILED") {
        return { result: "RETRYABLE", reasonCode: read.reasonCode };
      }
      if (read.tags.kind === "NOT_FOUND") {
        return { result: "RETRYABLE", reasonCode: "PANCAKE_CONVERSATION_NOT_FOUND" };
      }
      if (read.tags.kind === "INVALID") {
        return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_RESPONSE_INVALID" };
      }
      if (!read.tags.ids.includes(tagId)) {
        return {
          result: "APPLIED",
          providerTagId: tagId,
          alreadyAbsent: true,
        };
      }
    } catch (_error: unknown) {
      return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_READ_FAILED" };
    }

    let removed: PancakeHttpResponse;
    try {
      removed = await this.client.removeConversationTag(config, conversationId, tagId);
    } catch (_error: unknown) {
      return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_REMOVE_RECONCILE_REQUIRED" };
    }
    const removeFailure = classifyOperationResponse(removed.status, "REMOVE");
    if (removeFailure !== null) return removeFailure;
    return { result: "RETRYABLE", reasonCode: "PANCAKE_TAG_REMOVE_RECONCILE_REQUIRED" };
  }

  private validConfig(pageId: string): PancakePageConfig | null {
    const config = this.registry.get(pageId);
    if (config === null || config.accessToken.trim() === "") return null;
    return config;
  }

  /**
   * Production-proven Pancake lookup sequence:
   * messages v1 -> latest Pancake message time -> conversations v2 in +/-10m
   * -> exact deterministic conversation id -> tags.
   */
  private async readConversationTags(
    config: PancakePageConfig,
    conversationId: string,
  ): Promise<
    | { readonly kind: "OK"; readonly tags: ParsedConversationTags }
    | { readonly kind: "FAILED"; readonly reasonCode: string }
  > {
    const messages = await this.client.getConversationMessages(config, conversationId);
    if (messages.status < 200 || messages.status >= 300) {
      return {
        kind: "FAILED",
        reasonCode: classifyReadFailure(messages.status, "MESSAGE"),
      };
    }
    const latestMessageAt = parseLatestMessageEpochSeconds(messages.body);
    if (latestMessageAt === null) {
      return {
        kind: "FAILED",
        reasonCode: "PANCAKE_MESSAGE_TIMESTAMP_UNAVAILABLE",
      };
    }
    const conversations = await this.client.listConversations(config, {
      since: latestMessageAt - 600,
      until: latestMessageAt + 600,
      pageNumber: 1,
    });
    if (conversations.status < 200 || conversations.status >= 300) {
      return {
        kind: "FAILED",
        reasonCode: classifyReadFailure(conversations.status, "CONVERSATION"),
      };
    }
    return {
      kind: "OK",
      tags: parseConversationTagIds(conversations.body, conversationId),
    };
  }
}

function hasAllBlockingTagMappings(config: PancakePageConfig): config is PancakePageConfig & {
  readonly tagIds: Readonly<{
    NHAN_VIEN: string;
    VAN_DON: string;
    DA_CHOT_DON: string;
    KHONG_UP_SALE: string;
  }>;
} {
  return (
    typeof config.tagIds.NHAN_VIEN === "string" &&
    config.tagIds.NHAN_VIEN.trim() !== "" &&
    typeof config.tagIds.VAN_DON === "string" &&
    config.tagIds.VAN_DON.trim() !== "" &&
    typeof config.tagIds.DA_CHOT_DON === "string" &&
    config.tagIds.DA_CHOT_DON.trim() !== "" &&
    typeof config.tagIds.KHONG_UP_SALE === "string" &&
    config.tagIds.KHONG_UP_SALE.trim() !== ""
  );
}

type ParsedConversationTags =
  | { readonly kind: "OK"; readonly ids: string[]; readonly customerName: string | null }
  | { readonly kind: "NOT_FOUND" }
  | { readonly kind: "INVALID" };

function parseConversationTagIds(
  body: unknown,
  conversationId: string,
): ParsedConversationTags {
  const conversations = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.conversations)
      ? body.conversations
      : isRecord(body) && Array.isArray(body.data)
        ? body.data
        : null;
  if (conversations === null) return { kind: "INVALID" };
  const matching = conversations.filter(
    (item) => isRecord(item) && String(item.id ?? "") === conversationId,
  );
  const conversation = matching.reduce<Record<string, unknown> | null>(
    (latest, item) => {
      if (!isRecord(item)) return latest;
      if (latest === null) return item;
      return providerDateMilliseconds(item.updated_at) >
        providerDateMilliseconds(latest.updated_at)
        ? item
        : latest;
    },
    null,
  );
  if (!isRecord(conversation)) return { kind: "NOT_FOUND" };
  if (!Array.isArray(conversation.tags)) return { kind: "INVALID" };
  const ids: string[] = [];
  for (const item of conversation.tags) {
    const raw = typeof item === "string" ? item : isRecord(item) ? item.id : undefined;
    if ((typeof raw !== "string" && typeof raw !== "number") || String(raw).trim() === "") {
      return { kind: "INVALID" };
    }
    const id = String(raw);
    if (!ids.includes(id)) ids.push(id);
  }
  return { kind: "OK", ids, customerName: parseCustomerName(conversation) };
}

function parseCustomerName(conversation: Record<string, unknown>): string | null {
  const pageCustomer = isRecord(conversation.page_customer)
    ? conversation.page_customer
    : null;
  const customers = Array.isArray(conversation.customers)
    ? conversation.customers
    : [];
  const firstCustomer = customers.find(isRecord) ?? null;
  const from = isRecord(conversation.from) ? conversation.from : null;
  for (const candidate of [pageCustomer?.name, firstCustomer?.name, from?.name]) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().replace(/\s+/gu, " ").slice(0, 160);
    if (normalized) return normalized;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLatestMessageEpochSeconds(body: unknown): number | null {
  const messages = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.messages)
      ? body.messages
      : isRecord(body) && Array.isArray(body.data)
        ? body.data
        : null;
  if (messages === null) return null;
  let latest: number | null = null;
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const milliseconds = providerDateMilliseconds(message.inserted_at);
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) continue;
    if (latest === null || milliseconds > latest) latest = milliseconds;
  }
  return latest === null ? null : Math.floor(latest / 1_000);
}

function providerDateMilliseconds(value: unknown): number {
  if (typeof value === "number") {
    return value < 10_000_000_000 ? value * 1_000 : value;
  }
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;
  const raw = value.trim();
  const hasTimeZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  return Date.parse(hasTimeZone ? raw : `${raw}Z`);
}

function classifyReadFailure(
  status: number,
  resource: "MESSAGE" | "CONVERSATION",
): string {
  if (status === 401 || status === 403) return "PANCAKE_AUTH_UNVERIFIED";
  if (status === 429) return "PANCAKE_RATE_LIMIT_UNVERIFIED";
  if (status >= 500) return "PANCAKE_PROVIDER_UNVERIFIED";
  return `PANCAKE_${resource}_READ_REJECTED`;
}

function classifyOperationResponse(
  status: number,
  operation: "READ" | "ADD" | "REMOVE",
): Exclude<PancakeTagApplyResult, { result: "APPLIED" }> | null {
  if (status >= 200 && status < 300) return null;
  if (status === 429 || status >= 500) {
    return { result: "RETRYABLE", reasonCode: `PANCAKE_TAG_${operation}_RETRYABLE` };
  }
  if (status === 401 || status === 403) {
    return { result: "FAILED_PERMANENT", reasonCode: "PANCAKE_AUTH_REJECTED" };
  }
  return { result: "FAILED_PERMANENT", reasonCode: `PANCAKE_TAG_${operation}_REJECTED` };
}

function unverified(at: Date, reasonCode: string): PancakeTagObservationV1 {
  return {
    schemaVersion: 1,
    verified: false,
    blockingTag: null,
    observedTagIds: [],
    observedAt: at.toISOString(),
    reasonCode,
  };
}
