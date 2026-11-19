import { InboundMessageV1Schema } from "@lana/contracts";
import { createConversationState } from "@lana/conversation-engine";
import type { ClaimedInboundBatch } from "@lana/database";
import type { InboundEnvelopeV1 } from "@lana/meta-webhook";
import { pancakeConversationId, type RealtimeTagObservationProvider } from "./realtime-runner.js";
import { runPersistedCommerceIngress } from "./single-agent-commerce-ingress.js";
import { COMMERCE_PREPROD_PAGE_ID } from "./single-agent-commerce-preprod-delivery.js";
import { OPENING_PRODUCT_MEDIA_RULE } from "./single-agent-commerce-opening-media.js";
import { EXPLICIT_QUOTE_TASK } from "./single-agent-commerce-quote.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";

type Batch = ClaimedInboundBatch<InboundEnvelopeV1>;
type Candidate = Parameters<typeof runPersistedCommerceIngress>[0];
type Runtime = Candidate["store"];
type Inbox = Candidate["inbox"] & { failBatchPermanent(batch: Batch, reason: string): Promise<boolean> };
export interface CommercePreprodIngress {
  process(batch: Batch, claimStartedMs: number): Promise<boolean>;
}

export function createCommercePreprodIngress(input: {
  pageId: string;
  shopId: string;
  shopAlias: string;
  leaseMs: number;
  store: Runtime;
  inbox: Inbox;
  history: Candidate["history"];
  sources: () => { read: Candidate["read"]; policy: Candidate["policy"] };
  facts: Candidate["facts"];
  media: NonNullable<Candidate["media"]>;
  tags: RealtimeTagObservationProvider;
  quota: Pick<RealtimeGenerationQuota, "reserve">;
  resolveTagId: Candidate["resolveTagId"];
  models: Pick<Candidate, "owner" | "verifier" | "ownerPrompt" | "verifierPrompt">;
  clock?: () => Date;
  monotonic?: () => number;
}): CommercePreprodIngress {
  if (input.pageId !== COMMERCE_PREPROD_PAGE_ID) throw new Error("C3_COMMERCE_INGRESS_PAGE_FORBIDDEN");
  const clock = input.clock ?? (() => new Date());
  const monotonic = input.monotonic ?? (() => performance.now());
  const { inbox, store } = input;
  return {
    async process(batch, claimStartedMs) {
      if (batch.pageId !== input.pageId || batch.eventKind !== "CUSTOMER") return false;
      if (batch.generation === null) throw new Error("C3_COMMERCE_NATIVE_INBOX_REQUIRED");
      const deadline = claimStartedMs + input.leaseMs - 15_000;
      const complete = async () => { await inbox.completeBatch(batch, true); };
      const reconcile = async () => {
        if (await inbox.isBatchCurrent(batch)) await inbox.failBatchPermanent(batch, "C3_COMMERCE_RECONCILE_REQUIRED");
      };
      if (!await inbox.isBatchCurrent(batch)) { await complete(); return true; }
      // A reclaimed candidate batch may already have durable effects from a previous attempt.
      if (batch.attemptCount > 1) { await reconcile(); return true; }
      try {
        const items = batch.items;
        if (!items.length || items.some(item => item.pageId !== batch.pageId || item.conversationHash !== batch.conversationHash ||
          item.envelope.schemaVersion !== 1 || item.envelope.routing.routingOwner !== "APP" ||
          item.envelope.routing.evaluationOnly !== false)) { await complete(); return true; }
        const messages = items.map(item => InboundMessageV1Schema.parse(item.envelope.message));
        const senderId = messages.at(-1)!.senderId;
        if (messages.some(message => message.pageId !== batch.pageId || message.senderId !== senderId || message.isEcho)) {
          await complete(); return true;
        }
        const record = await store.loadOrCreate(batch.pageId, batch.conversationHash, "APP", conversationId =>
          createConversationState({ conversationId, routingOwner: "APP", now: clock() }), clock());
        if (record.routingOwner !== "APP" || record.state.routingOwner !== "APP" || !record.appSendEnabled ||
          record.killSwitch || record.state.conversationOwner !== "BOT") { await complete(); return true; }
        const remaining = () => Math.floor(deadline - monotonic());
        const tagClear = async () => {
          if (remaining() <= 0 || !await inbox.isBatchCurrent(batch)) return false;
          const tags = await input.tags.observe({ pageId: batch.pageId, customerHash: batch.conversationHash,
            conversationId: record.conversationId, senderId, now: clock() });
          const ageMs = clock().getTime() - Date.parse(tags.observedAt);
          return remaining() > 0 && tags.verified && tags.blockingTag === null && ageMs >= -5_000 && ageMs <= 30_000;
        };
        if (!await tagClear()) { await complete(); return true; }
        await store.linkProviderConversation(batch.pageId, record.conversationId, "PANCAKE",
          pancakeConversationId(batch.pageId, senderId), clock(), new Date(clock().getTime() + 30 * 86_400_000));
        const generationSignal = async (signal: AbortSignal) => {
          signal.throwIfAborted();
          if (remaining() <= 0 || !await inbox.isBatchCurrent(batch)) throw new Error("C3_COMMERCE_INBOX_BUDGET");
          if (!await input.quota.reserve(batch.pageId, clock())) throw new Error("C3_COMMERCE_QUOTA");
          const timeLeft = remaining();
          if (timeLeft <= 0) throw new Error("C3_COMMERCE_INBOX_BUDGET");
          return AbortSignal.any([signal, AbortSignal.timeout(timeLeft)]);
        };
        const { read, policy } = input.sources();
        const result = await runPersistedCommerceIngress({
          batch, fence: Math.max(record.state.lastFence + 1, batch.lastReceiveSequence),
          scope: { pageId: batch.pageId, shopId: input.shopId, shopAlias: input.shopAlias,
            conversationId: record.conversationId, customerHash: batch.conversationHash },
          store, inbox, history: input.history, clock, read, policy, facts: input.facts,
          resolveTagId: input.resolveTagId, requireLiveAuthority: true, media: input.media,
          openingMediaRule: OPENING_PRODUCT_MEDIA_RULE, quoteTask: EXPLICIT_QUOTE_TASK,
          transaction: async operation => {
            if (!await tagClear()) throw new Error("C3_COMMERCE_AUTHORITY_CHANGED");
            return store.runInTransaction(batch.pageId, operation);
          },
          ownerPrompt: input.models.ownerPrompt, verifierPrompt: input.models.verifierPrompt,
          owner: async request => input.models.owner({ ...request, signal: await generationSignal(request.signal) }),
          verifier: async request => input.models.verifier({ ...request, signal: await generationSignal(request.signal) }),
        });
        if ("inboxCompletion" in result &&
          (result.inboxCompletion === "RECONCILE_REQUIRED" || result.inboxCompletion === "UNCONFIRMED")) await reconcile();
        else if (await inbox.isBatchCurrent(batch)) await complete();
      } catch {
        // Preserve the original Inbox payload for operator reconciliation. Neither model nor
        // an alternate route automatically retries a selected batch after an unknown write.
        await reconcile();
      }
      return true;
    },
  };
}
