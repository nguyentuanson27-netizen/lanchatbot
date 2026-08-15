import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  canonicalCartOfferBindingsV1,
  canonicalCheckoutDraftHashPreimageV1,
  canonicalCartStateHashPreimageV1,
  canonicalCartStateV1,
  cartMutationAuthorityBindingHashPreimageV1,
  cartMutationBatchEvidenceHashPreimageV1,
  cartMutationReceiptHashPreimageV1,
  cartOpenEvidenceHashPreimageV1,
  canonicalClarificationStateHashPreimageV1,
  clarificationTransitionEvidenceHashPreimageV1,
  checkoutDetailsTransitionEvidenceHashPreimageV1,
  deterministicEffectReadinessHashPreimageV1,
  effectBindingHashPreimageV1,
  negotiationTransitionEvidenceHashPreimageV1,
  PolicyBundleV1Schema,
  type CartOfferBindingV1,
  type CartV1,
  type DeterministicEffectReadinessV1,
} from "@lana/contracts";
import {
  applyCanonicalCartDecisionV2,
  applyCheckoutDetailsTransitionV1,
  applySalesClarificationTransitionV1,
  canonicalCartPolicyLinesV2,
  canonicalNegotiationEventFingerprintV1,
  computeCanonicalOrderPreviewHashV1,
  createCanonicalCartV2,
  deriveCanonicalPurchaseConfirmationV1,
  replayCanonicalCartRepriceNegotiationV1,
} from "@lana/commerce-kernel";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import {
  PostgresRealtimeRuntimeStore,
  validateLockedSalesStateEnvelopeV1,
  type RealtimeCommitInput,
} from "./realtime-runtime.js";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function rawSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("DF06 locked sales-state envelope", () => {
  const occurredAt = new Date("2026-08-15T08:00:00.000Z");
  const conversationId = "33333333-3333-4333-8333-333333333333";
  const locked = {
    schemaVersion: 2,
    conversationKey: conversationId,
    routing: { pageId: "page-1", conversationId },
    revision: 2,
    stage: "CART_OPEN",
    processedCommandIds: ["sales:previous"],
    updatedAt: "2026-08-15T07:59:00.000Z",
  };
  const event = {
    commandId: "sales:current",
    commandKind: "CART_MUTATED" as const,
    outcome: "APPLIED" as const,
    stateRevisionBefore: 2,
    stateRevisionAfter: 3,
    stageBefore: "CART_OPEN",
    stageAfter: "CART_OPEN",
    cartId: "10000000-0000-4000-8000-000000000001",
    cartVersion: 2,
    reasonCode: null,
    occurredAt,
  };
  const exact = {
    expectedRevision: 2,
    state: {
      ...locked,
      revision: 3,
      processedCommandIds: ["sales:previous", event.commandId],
      updatedAt: occurredAt.toISOString(),
    },
    events: [event],
  };

  it("accepts only the canonical identity/idempotency envelope derived from the locked state", () => {
    expect(() => validateLockedSalesStateEnvelopeV1(
      exact, locked, "page-1", conversationId,
    )).not.toThrow();
  });

  it.each([
    ["schemaVersion", { schemaVersion: 3 }],
    ["conversationKey", { conversationKey: "forged-conversation" }],
    ["routing", { routing: { pageId: "forged-page", conversationId } }],
    ["revision", { revision: 4 }],
    ["stage", { stage: "PURCHASE_CONFIRMED" }],
    ["processedCommandIds", { processedCommandIds: ["sales:current"] }],
    ["updatedAt", { updatedAt: "2026-08-15T08:00:01.000Z" }],
  ] as const)("rejects a caller-controlled %s", (_field, mutation) => {
    expect(() => validateLockedSalesStateEnvelopeV1({
      ...exact,
      state: { ...exact.state, ...mutation },
    }, locked, "page-1", conversationId)).toThrow("SALES_STATE_ENVELOPE_REPLAY_MISMATCH");
  });

  it("appends applied command IDs in order and preserves the 100-entry cap", () => {
    const processedCommandIds = Array.from(
      { length: 100 },
      (_, index) => `sales:previous:${index}`,
    );
    expect(() => validateLockedSalesStateEnvelopeV1({
      ...exact,
      state: {
        ...exact.state,
        processedCommandIds: [...processedCommandIds.slice(1), event.commandId],
      },
    }, {
      ...locked,
      processedCommandIds,
    }, "page-1", conversationId)).not.toThrow();
  });

  it("replays a legitimate HANDOFF as a state-advancing transition", () => {
    const purchaseConfirmed = { ...locked, stage: "PURCHASE_CONFIRMED" };
    const handoffEvent = {
      ...event,
      commandKind: "PAYMENT_RECEIPT_RECEIVED" as const,
      outcome: "HANDOFF" as const,
      stageBefore: "PURCHASE_CONFIRMED",
      stageAfter: "HANDED_OFF",
      reasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED",
    };
    expect(() => validateLockedSalesStateEnvelopeV1({
      ...exact,
      state: {
        ...purchaseConfirmed,
        revision: 3,
        stage: "HANDED_OFF",
        processedCommandIds: ["sales:previous", handoffEvent.commandId],
        updatedAt: occurredAt.toISOString(),
      },
      events: [handoffEvent],
    }, purchaseConfirmed, "page-1", conversationId)).not.toThrow();
  });

  it("rejects undeclared top-level state fields instead of silently persisting them", () => {
    expect(() => validateLockedSalesStateEnvelopeV1({
      ...exact,
      state: { ...exact.state, unexpectedAuthority: { allow: true } },
    }, locked, "page-1", conversationId)).toThrow("SALES_STATE_KEY_INVALID");
  });
});

function sealReadinessV1(
  input: Omit<
    DeterministicEffectReadinessV1,
    "binding" | "bindingHash" | "readinessHash"
  >,
  options: Readonly<{
    offerBindings?: readonly CartOfferBindingV1[];
    parentReadinessHash?: string | null;
    payloadHash?: string | null;
  }> = {},
): DeterministicEffectReadinessV1 {
  const binding = {
    schemaVersion: 1 as const,
    contractVersion: "EFFECT_BINDING_V1" as const,
    pageId: input.pageId,
    conversationId: input.conversationId,
    sourceMessageIdHash: input.sourceMessageIdHash,
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.salesCycleRevision,
    productIds: input.productIds,
    cart: input.cartId === null || input.cartVersion === null || input.cartStateHash === null
      ? null
      : {
        cartId: input.cartId,
        cartRevision: input.cartVersion,
        cartStateHash: input.cartStateHash,
        offerBindings: [...(options.offerBindings ?? [])],
      },
    preview: input.orderPreviewId === null || input.orderPreviewHash === null
      ? null
      : { previewId: input.orderPreviewId, previewHash: input.orderPreviewHash },
    claimSetHash: input.claimSetHash,
    parentReadinessHash: options.parentReadinessHash ?? null,
    payloadHash: options.payloadHash ?? (
      input.effect === "PROTECTED_OUTBOUND" ? input.deterministicEvidenceHash : null
    ),
  };
  const bindingHash = rawSha256(effectBindingHashPreimageV1(binding));
  const draft = {
    ...input,
    binding,
    bindingHash,
    readinessHash: "0".repeat(64),
  } satisfies DeterministicEffectReadinessV1;
  return {
    ...draft,
    readinessHash: rawSha256(deterministicEffectReadinessHashPreimageV1(draft)),
  };
}

function resealReadinessV1(
  readiness: DeterministicEffectReadinessV1,
  changes: Partial<Omit<
    DeterministicEffectReadinessV1,
    "binding" | "bindingHash" | "readinessHash"
  >>,
  options: Readonly<{
    offerBindings?: readonly CartOfferBindingV1[];
    parentReadinessHash?: string | null;
    payloadHash?: string | null;
  }> = {},
): DeterministicEffectReadinessV1 {
  const { binding: _binding, bindingHash: _bindingHash, readinessHash: _readinessHash,
    ...input } = readiness;
  return sealReadinessV1({ ...input, ...changes }, {
    offerBindings: options.offerBindings ?? readiness.binding.cart?.offerBindings ?? [],
    parentReadinessHash: options.parentReadinessHash ?? readiness.binding.parentReadinessHash,
    payloadHash: options.payloadHash ?? readiness.binding.payloadHash,
  });
}

describe("PostgresRealtimeRuntimeStore handoff commit", () => {
  it("persists idempotent PII-free decision events in the state transaction", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-23T05:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (sql.includes("INSERT INTO conversation_events")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const occurredAt = new Date("2026-07-23T05:00:00.000Z");

    const result = await store.commit({
      pageId: "page-1",
      customerHash: "a".repeat(64),
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      decisionEvents: [{
        eventId: "10000000-0000-4000-8000-000000000003",
        eventKeyHash: "b".repeat(64),
        eventType: "BUYING_SIGNAL_DETECTED",
        origin: "EXACT_CODE",
        reasonCodes: ["DIRECT_PURCHASE_VERB"],
        releaseId: "wave0-local",
        promptVersion: "prompt-v1",
        modelVersion: "gemini-test",
        policyVersion: null,
        catalogVersion: "catalog-v2",
        mode: "LIVE",
        productId: "CB182",
        intent: "buy",
        stage: "consulting",
        action: "REPLY",
        occurredAt,
        details: {
          productResolutionOrigin: "EXACT_CODE",
          buyingSignalReasons: ["DIRECT_PURCHASE_VERB"],
          guardReasonCodes: [],
          factsStatus: "OK",
          factsReasonCode: null,
          salesCycleStageBefore: "DISCOVERY",
          salesCycleStageAfter: "CART_OPEN",
          outboundMessageCount: 1,
          modelCalled: false,
          modelLatencyMs: null,
          modelTokenUsage: { prompt: null, output: null, total: null },
          buyingSignalOverride: false,
          decisionObservability: {
            schemaVersion: 1,
            dialogueEvidence: {
              source: "DETERMINISTIC_RUNTIME",
              codes: ["DIRECT_PURCHASE_VERB"],
              evidenceHash: "c".repeat(64),
            },
            buyingIntent: {
              authorityVersion: "HYBRID_BUYING_INTENT_V1",
              decision: "COMMITTED",
              source: "DETERMINISTIC",
              requestedAction: "NONE",
              quantity: null,
              confidenceBand: "UNKNOWN",
              evidenceReasonCodes: ["DIRECT_PURCHASE_VERB"],
              evidenceHash: "d".repeat(64),
            },
            protectedClaimValidation: {
              verifierVersion: "LEGACY_GUARD_V1",
              outcome: "NO_PROTECTED_CLAIMS",
              claimTypes: [],
              validatedCount: 0,
              rejectedCount: 0,
              reasonCodes: [],
            },
            readiness: {
              rulesetVersion: "LEGACY_READINESS_OBSERVATION_V1",
              outcome: "LEGACY_READY",
              productScope: "RESOLVED",
              reasonCodes: [],
            },
            phaseBarrier: {
              contractVersion: "LEGACY_PHASE_BARRIER_OBSERVATION_V1",
              phase: "CART_OPEN",
              phaseSource: "SALES_CYCLE_STAGE_V1",
              barrier: "NOT_EVALUATED",
              barrierSource: "NONE",
            },
            context: { schemaVersion: 1, contextVersion: "LEGACY_CONTEXT_V1" },
            strategyCta: {
              rulesetVersion: "NONE",
              strategy: "NONE",
              cta: "NONE",
              source: "NONE",
            },
            reconciliation: {
              contractVersion: "BF01_RECONCILIATION_V1",
              outcome: "NOT_APPLIED",
              reasonCodes: [],
            },
            guard: {
              contractVersion: "AGENT_PROPOSAL_GUARD_V1",
              outcome: "ALLOWED",
              reasonCodes: [],
              planHash: "e".repeat(64),
            },
            sideEffectPlan: {
              contractVersion: "REALTIME_COMMIT_PLAN_V1",
              disposition: "PLANNED",
              effectTypes: ["META_OUTBOX"],
              reasonCodes: [],
            },
          },
        },
      }],
    }, occurredAt);

    expect(result.decisionEventsCreated).toBe(1);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(insert?.sql).toContain("ON CONFLICT (event_id, occurred_at) DO NOTHING");
    const serialized = JSON.stringify(insert?.values ?? []);
    expect(serialized).not.toContain("0900000000");
    expect(serialized).not.toContain("rawText");
    expect(serialized).toContain("decisionObservability");
    expect(serialized).toContain("HYBRID_BUYING_INTENT_V1");
    expect(calls.at(-1)?.sql).toContain("COMMIT");
  });

  it("schedules text immediately and delays image rows in the same ordered plan", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return {
            rowCount: 1,
            rows: [{
              routing_owner: "APP",
              app_send_enabled: true,
              kill_switch: false,
              transaction_now: new Date("2026-07-23T05:00:00.000Z"),
            }],
          };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations")) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.includes("INSERT INTO meta_outbox")) {
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const now = new Date("2026-07-23T05:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000001",
        responseGroupId: "10000000-0000-4000-8000-000000000002",
        recipientId: "customer-1",
        imageDelayMs: 500,
        sendAfterOwnerHandoff: true,
        messages: [
          { kind: "TEXT", text: "Nội dung báo giá" },
          { kind: "IMAGE", imageUrl: "https://cdn.example/product.jpg" },
        ],
      },
    }, now);

    expect(result.metaOutboxCreated).toBe(2);
    const inserts = calls.filter((call) => call.sql.includes("INSERT INTO meta_outbox"));
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.values[17]).toBe(0);
    expect(inserts[0]?.values[18]).toEqual(now);
    expect(inserts[1]?.values[17]).toBe(1);
    expect(inserts[1]?.values[18]).toEqual(
      new Date("2026-07-23T05:00:00.500Z"),
    );
    expect(inserts.every((insert) => insert.values[19] === true)).toBe(true);

  });

  it("commits a price-only protected reply when its typed claim set matches exactly", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    let transactionNow = new Date("2026-08-13T05:00:00.000Z");
    const sourceMessageId = "mid-price-protected";
    const sourceMessageIdHash = rawSha256(sourceMessageId);
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: transactionNow,
          }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("FROM conversation_ingress_heads")) {
          return { rowCount: 1, rows: [{ generation: "1" }] };
        }
        if (sql.includes("FROM webhook_inbox")) {
          return { rowCount: 1, rows: [{ source_message_id: sourceMessageId }] };
        }
        if (sql.includes("UPDATE conversations") || sql.includes("INSERT INTO meta_outbox")) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.includes("UPDATE webhook_inbox") || sql.includes("UPDATE conversation_ingress_heads")) {
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const now = new Date("2026-08-13T05:00:00.000Z");
    const claim = {
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000003",
      type: "PRICE" as const,
      scope: { kind: "PRODUCT" as const, productId: "SP-001", variantId: null },
      provenance: {
        authority: "POS_SNAPSHOT" as const,
        sourceVersion: "POS_SNAPSHOT:2026-08-13T04:59:00.000Z",
        evidenceRef: `business-fact:price:${"b".repeat(64)}`,
        contentHash: "c".repeat(64),
        observedAt: "2026-08-13T04:59:00.000Z",
        expiresAt: "2026-08-13T05:05:00.000Z",
      },
      value: { amountVnd: 1_250_000, currency: "VND" as const },
      authorization: "NONE" as const,
    };
    const messages = [{ kind: "TEXT" as const, text: "Giá hiện tại là 1.250.000đ." }];
    const commitInput: RealtimeCommitInput<{
      revision: number;
      routingOwner: "APP";
      conversationOwner: "BOT";
    }> = {
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 1,
        leaseToken: "lease-price-protected",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000001",
        responseGroupId: "10000000-0000-4000-8000-000000000002",
        recipientId: "customer-1",
        messages,
        protectedClaimTypes: ["PRICE"],
        sourceMessageIdHash,
        protectedClaims: [claim],
        effectReadiness: sealReadinessV1({
          schemaVersion: 1,
          rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "PROTECTED_OUTBOUND",
          outcome: "READY",
          pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash,
          conversationRevision: 0,
          salesCycleRevision: null,
          productIds: ["SP-001"],
          cartId: null,
          cartVersion: null,
          cartStateHash: null,
          orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: null,
          deterministicEvidenceHash: sha256(messages),
          claimSetHash: sha256([claim]),
          protectedClaimTypes: ["PRICE"],
          checkedAt: now.toISOString(),
          expiresAt: "2026-08-13T05:01:00.000Z",
          reasonCodes: [],
          authorization: "NONE",
        }),
      },
    };
    const result = await store.commit(commitInput, now);

    expect(result.metaOutboxCreated).toBe(1);
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000010",
        responseGroupId: "10000000-0000-4000-8000-000000000011",
        effectReadiness: resealReadinessV1(commitInput.metaPlan!.effectReadiness!, {
          expiresAt: new Date(now.getTime() + 60_001).toISOString(),
        }),
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_READINESS_MISMATCH");

    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000020",
        responseGroupId: "10000000-0000-4000-8000-000000000021",
        effectReadiness: resealReadinessV1(commitInput.metaPlan!.effectReadiness!, {
          productIds: ["SP-001", "SP-002"],
        }),
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_CLAIM_MISSING");

    const conflictingClaim = {
      ...claim,
      claimId: "10000000-0000-4000-8000-000000000022",
      provenance: { ...claim.provenance, contentHash: "d".repeat(64) },
      value: { amountVnd: 1_300_000, currency: "VND" as const },
    };
    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000023",
        responseGroupId: "10000000-0000-4000-8000-000000000024",
        protectedClaims: [claim, conflictingClaim],
        effectReadiness: resealReadinessV1(commitInput.metaPlan!.effectReadiness!, {
          claimSetHash: sha256([claim, conflictingClaim]),
        }),
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_CLAIM_CONFLICT");

    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000004",
        responseGroupId: "10000000-0000-4000-8000-000000000005",
        messages: [{ kind: "TEXT", text: "Giá bị thay đổi sau khi readiness đã được chốt." }],
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_PAYLOAD_MISMATCH");

    transactionNow = new Date("2026-08-13T05:02:00.000Z");
    await expect(store.commit({
      ...commitInput,
      metaPlan: {
        ...commitInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-000000000006",
        responseGroupId: "10000000-0000-4000-8000-000000000007",
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_READINESS_MISMATCH");

    transactionNow = now;
    const payloadOnlyMessages = [{ kind: "TEXT" as const, text: "Em đã ghi nhận xác nhận mua hàng." }];
    const payloadOnlyInput: RealtimeCommitInput<{
      revision: number;
      routingOwner: "APP";
      conversationOwner: "BOT";
    }> = {
      ...commitInput,
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000008",
        responseGroupId: "10000000-0000-4000-8000-000000000009",
        recipientId: "customer-1",
        messages: payloadOnlyMessages,
        protectedClaimTypes: [],
        sourceMessageIdHash,
        protectedClaims: [],
        effectReadiness: resealReadinessV1(commitInput.metaPlan!.effectReadiness!, {
          deterministicEvidenceHash: sha256(payloadOnlyMessages),
          claimSetHash: null,
          protectedClaimTypes: [],
        }, { payloadHash: sha256(payloadOnlyMessages) }),
      },
    };
    await expect(store.commit(payloadOnlyInput, now)).resolves.toMatchObject({
      metaOutboxCreated: 1,
    });
    await expect(store.commit({
      ...payloadOnlyInput,
      metaPlan: {
        ...payloadOnlyInput.metaPlan!,
        replyPlanId: "10000000-0000-4000-8000-00000000000a",
        responseGroupId: "10000000-0000-4000-8000-00000000000b",
        messages: [{ kind: "TEXT", text: "Payload confirmation đã bị thay đổi." }],
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_PAYLOAD_MISMATCH");
  });

  it("drops a stale decision before state or outbox commit when a newer inbound advanced the generation", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return {
            rowCount: 1,
            rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
              transaction_now: new Date("2026-08-13T05:00:00.000Z") }],
          };
        }
        if (sql.includes("SELECT generation")) {
          return { rowCount: 1, rows: [{ generation: "101" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };

    const result = await store.commit({
      pageId: "page-1",
      customerHash: "customer-hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 2,
      state: { revision: 3, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 100,
        leaseToken: "44444444-4444-4444-8444-444444444444",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
    });

    expect(result.stateCommitted).toBe(false);
    expect(result.inboxBatchStatus).toBe("SUPERSEDED");
    expect(result.reasonCodes).toContain("INBOX_BATCH_SUPERSEDED");
    expect(calls.findIndex((sql) => sql.includes("SELECT routing_owner")))
      .toBeLessThan(calls.findIndex((sql) => sql.includes("SELECT generation")));
    expect(calls.some((sql) => sql.includes("INSERT INTO meta_outbox"))).toBe(false);
    expect(calls.some((sql) => sql.includes("attempt_count = GREATEST"))).toBe(true);
  });

  it("returns SUPERSEDED when a current-generation inbox row loses its processing lease before commit", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T05:00:00.000Z"),
          }] };
        }
        if (sql.includes("FROM conversation_ingress_heads")) {
          return { rowCount: 1, rows: [{ generation: "100" }] };
        }
        if (sql.includes("FROM webhook_inbox")) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };

    await expect(store.commit({
      pageId: "page-1",
      customerHash: "customer-hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 2,
      state: { revision: 3, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 100,
        leaseToken: "44444444-4444-4444-8444-444444444444",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
    })).resolves.toMatchObject({
      stateCommitted: false,
      inboxBatchStatus: "SUPERSEDED",
      reasonCodes: ["INBOX_BATCH_SUPERSEDED"],
    });
    expect(calls.some((sql) => sql.includes("UPDATE conversations"))).toBe(false);
  });

  it("commits the owner CAS, Pancake outbox, immutable event and queue case atomically", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (sql.includes("FROM provider_conversation_links")) {
          return {
            rowCount: 1,
            rows: [{
              external_id_ciphertext: Buffer.from("a"),
              external_id_nonce: Buffer.alloc(12),
              external_id_auth_tag: Buffer.alloc(16),
            }],
          };
        }
        if (sql.includes("INSERT INTO pancake_tag_outbox")) return { rowCount: 1, rows: [] };
        if (sql.includes("INSERT INTO handoff_events")) {
          return { rowCount: 1, rows: [{ handoff_id: "44444444-4444-4444-8444-444444444444" }] };
        }
        if (sql.includes("INSERT INTO handoff_cases")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release: vi.fn(),
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
      async end() {},
    };
    const now = new Date("2026-07-20T10:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1",
      customerHash: "customer-hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: {
        revision: 2,
        routingOwner: "APP",
        conversationOwner: "HUMAN",
        ownerLeaseUntil: "2026-07-20T10:15:00.000Z",
        blockingTag: null,
        blockingTagVerifiedAt: null,
      },
      pancakeTagPlan: {
        desiredTag: "NHAN_VIEN",
        tagId: "tag-employee",
        handoffGeneration: 2,
        afterResponseGroupId: "10000000-0000-4000-8000-000000000099",
      },
      handoffEventPlan: {
        source: "BOT_POLICY",
        reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        reasonDetailSafe: { directive_reason: "AGENT_REQUEST" },
        productId: "CB182",
        factsStatus: "NOT_FOUND",
        factsReasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        desiredTag: "NHAN_VIEN",
        handoffGeneration: 2,
        triggerEventKey: "meta:page-1:message:m-1",
        triggerMessagePk: "55555555-5555-4555-8555-555555555555",
        occurredAt: now,
      },
    }, now);

    expect(result.handoffEventCreated).toBe(true);
    expect(result.pancakeTagOutboxCreated).toBe(true);
    const tagInsert = calls.find((call) =>
      call.sql.includes("INSERT INTO pancake_tag_outbox"));
    expect(tagInsert?.values[10]).toBe(
      "10000000-0000-4000-8000-000000000099",
    );
    const handoffCaseInsert = calls.find((call) => call.sql.includes("INSERT INTO handoff_cases"));
    expect(handoffCaseInsert?.sql).toContain("sla_due_at");
    expect(handoffCaseInsert?.sql).toContain("$4::timestamptz");
    expect(handoffCaseInsert?.sql).toContain("interval '30 minutes'");
    const statements = calls.map((call) => call.sql.trim().split(/\s+/u).slice(0, 4).join(" "));
    expect(statements[0]).toBe("BEGIN");
    expect(calls.findIndex((call) => call.sql.includes("UPDATE conversations")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO pancake_tag_outbox")));
    expect(calls.findIndex((call) => call.sql.includes("INSERT INTO pancake_tag_outbox")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_events")));
    expect(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_events")))
      .toBeLessThan(calls.findIndex((call) => call.sql.includes("INSERT INTO handoff_cases")));
    expect(statements.at(-1)).toBe("COMMIT");
  });

  it("uses a deterministic conflict target and does not create a second queue case", async () => {
    const sql: string[] = [];
    const client = {
      async query(statement: string) {
        sql.push(statement);
        if (statement.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:00:00.000Z") }] };
        }
        if (statement.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (statement.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (statement.includes("INSERT INTO handoff_events")) return { rowCount: 0, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-07-20T10:00:00.000Z");
    const result = await store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 0,
      state: { revision: 1, routingOwner: "APP", conversationOwner: "HUMAN" },
      handoffEventPlan: {
        source: "CUSTOMER_REQUEST", reasonCode: "CUSTOMER_REQUESTED_HUMAN",
        productId: null, factsStatus: null, factsReasonCode: null,
        desiredTag: "NHAN_VIEN", handoffGeneration: 1,
        triggerEventKey: "meta:event:1", triggerMessagePk: null, occurredAt: now,
      },
    }, now);
    expect(result.handoffEventCreated).toBe(false);
    expect(sql.some((statement) => statement.includes("conversation_id, direction, trigger_event_key_hash"))).toBe(true);
    expect(sql.some((statement) => statement.includes("INSERT INTO handoff_cases"))).toBe(false);
  });

  it("acknowledges an active queue case for a real HUMAN echo without creating another transfer", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-20T10:05:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "HUMAN" }] };
        }
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE handoff_cases")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const occurredAt = new Date("2026-07-20T10:05:00.000Z");
    await store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 3,
      state: { revision: 4, routingOwner: "APP", conversationOwner: "HUMAN" },
      handoffAcknowledgementPlan: { actorRef: "page-agent", occurredAt },
    }, occurredAt);
    const acknowledgement = calls.find((call) => call.sql.includes("UPDATE handoff_cases"));
    expect(acknowledgement?.sql).toContain("status = 'IN_PROGRESS'");
    expect(acknowledgement?.values[2]).toMatch(/^[0-9a-f]{64}$/u);
    expect(calls.some((call) => call.sql.includes("INSERT INTO handoff_events"))).toBe(false);
  });

  it("rejects protected sales-cycle events that omit the DF06 readiness contract", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-23T03:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "0" }] };
        }
        if (sql.includes("UPDATE sales_cycle_states")) return { rowCount: 1, rows: [] };
        if (sql.includes("INSERT INTO sales_cycle_events")) return { rowCount: 1, rows: [] };
        if (sql.includes("UPDATE conversations")) return { rowCount: 1, rows: [] };
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-07-23T03:00:00.000Z");
    const expiresAt = new Date("2026-07-25T03:00:00.000Z");

    await expect(store.commit({
      pageId: "page-1",
      customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 0,
        state: {
          revision: 2,
          stage: "CART_OPEN",
          checkoutDraft: {
            fullName: "Nguyen Van A",
            phone: "0984997797",
            address: "Tan Chau, Tay Ninh",
          },
        },
        cartExpiresAt: expiresAt,
        expiresAt,
        events: [{
          commandId: "sales:event-1:cart-open",
          commandKind: "CART_OPENED",
          outcome: "APPLIED",
          stateRevisionBefore: 0,
          stateRevisionAfter: 2,
          stageBefore: "DISCOVERY",
          stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001",
          cartVersion: 1,
          reasonCode: null,
          occurredAt: now,
        }],
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_CONTRACT_REQUIRED");
    expect(calls.at(-1)?.sql.trim()).toBe("ROLLBACK");
  });

  it("keeps unversioned non-protected sales-cycle events backward compatible", async () => {
    const calls: string[] = [];
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-07-23T03:00:00.000Z"),
          }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "0" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-07-23T03:00:00.000Z");
    await expect(store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      salesCyclePlan: {
        expectedRevision: 0,
        state: { revision: 1, stage: "PRODUCT_FIT" },
        cartExpiresAt: null,
        expiresAt: new Date("2026-07-25T03:00:00.000Z"),
        events: [{
          commandId: "sales:event-1:facts", commandKind: "FACTS_PRESENTED",
          outcome: "APPLIED", stateRevisionBefore: 0, stateRevisionAfter: 1,
          stageBefore: "DISCOVERY", stageAfter: "PRODUCT_FIT",
          cartId: null, cartVersion: null, reasonCode: null, occurredAt: now,
        }],
      },
    }, now)).resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");
  });

  it("rejects a stale readiness binding inside the sales commit transaction", async () => {
    const calls: string[] = [];
    const sourceMessageId = "mid-stale-readiness";
    const sourceMessageIdHash = rawSha256(sourceMessageId);
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T03:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("FROM conversation_ingress_heads")) {
          return { rowCount: 1, rows: [{ generation: "1" }] };
        }
        if (sql.includes("FROM webhook_inbox")) {
          return { rowCount: 1, rows: [{ source_message_id: sourceMessageId }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");
    const staleSalesCommitInput = {
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 1,
        leaseToken: "lease-stale-readiness",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash,
        canonicalBuyingIntent: {
          schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
          decision: "COMMITTED", requestedAction: "OPEN_CART", quantity: 1,
          productId: "SP-001", contributors: ["DETERMINISTIC_RUNTIME"],
          sourceMessageIdHash, evidenceHash: "d".repeat(64),
          reasonCodes: ["DIRECT_PURCHASE_VERB"],
          evaluatedAt: "2026-08-13T02:58:00.000Z", authorization: "NONE",
        },
        state: { revision: 3 },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: "sales:event-2:cart-open", commandKind: "CART_OPENED",
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "SIZE_RECOMMENDED", stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001", cartVersion: 1,
          reasonCode: null, occurredAt: now,
        }],
        effectReadiness: [sealReadinessV1({
          schemaVersion: 1, rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_OPEN", outcome: "READY", pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash, conversationRevision: 4,
          salesCycleRevision: 2, productIds: ["SP-001"],
          cartId: "10000000-0000-4000-8000-000000000001",
          cartVersion: 1, cartStateHash: "e".repeat(64), orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: "b".repeat(64), claimSetHash: "c".repeat(64),
          deterministicEvidenceHash: null, protectedClaimTypes: [],
          checkedAt: "2026-08-13T02:58:00.000Z",
          expiresAt: "2026-08-13T02:59:00.000Z",
          reasonCodes: [], authorization: "NONE",
        }, { offerBindings: [{
          lineId: "10000000-0000-4000-8000-000000000002",
          productId: "SP-001", offerId: "OFFER-001", quantity: 1,
          unitPriceVnd: 100_000, priceFactRef: "price:1",
        }] })],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(staleSalesCommitInput, now)).rejects.toThrow("EFFECT_READINESS_STALE");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const overlongReadiness = {
      ...staleSalesCommitInput,
      salesCyclePlan: {
        ...staleSalesCommitInput.salesCyclePlan,
        effectReadiness: staleSalesCommitInput.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, {
            checkedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 60_001).toISOString(),
          })
        ),
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(overlongReadiness, now))
      .rejects.toThrow("EFFECT_READINESS_LIFETIME_INVALID");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const wrongSourceMessageIdHash = rawSha256("a-different-current-message");
    const wrongSourceCommitInput = {
      ...staleSalesCommitInput,
      salesCyclePlan: {
        ...staleSalesCommitInput.salesCyclePlan,
        sourceMessageIdHash: wrongSourceMessageIdHash,
        canonicalBuyingIntent: {
          ...staleSalesCommitInput.salesCyclePlan.canonicalBuyingIntent,
          sourceMessageIdHash: wrongSourceMessageIdHash,
        },
        effectReadiness: staleSalesCommitInput.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, { sourceMessageIdHash: wrongSourceMessageIdHash })
        ),
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(wrongSourceCommitInput, now))
      .rejects.toThrow("CURRENT_MESSAGE_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
  });

  it.each(["NEGOTIATION_EVENT", "CART_READY"] as const)(
    "requires effect readiness for a versioned %s event",
    async (commandKind) => {
    const calls: string[] = [];
    const sourceMessageId = `mid-required-${commandKind}`;
    const sourceMessageIdHash = rawSha256(sourceMessageId);
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{ routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: new Date("2026-08-13T03:00:00.000Z") }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("FROM conversation_ingress_heads")) {
          return { rowCount: 1, rows: [{ generation: "1" }] };
        }
        if (sql.includes("FROM webhook_inbox")) {
          return { rowCount: 1, rows: [{ source_message_id: sourceMessageId }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [{ state_revision: "2" }] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");

    await expect(store.commit({
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 1,
        leaseToken: `lease-required-${commandKind}`,
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash,
        canonicalBuyingIntent: {
          schemaVersion: 1, authorityVersion: "CANONICAL_BUYING_INTENT_V1",
          decision: "NONE", requestedAction: "NONE", quantity: null,
          productId: null, contributors: [],
          sourceMessageIdHash, evidenceHash: null,
          reasonCodes: [],
          evaluatedAt: "2026-08-13T02:58:00.000Z", authorization: "NONE",
        },
        state: { revision: 3 },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: `sales:event-2:${commandKind.toLowerCase()}`, commandKind,
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "CART_OPEN", stageAfter: "CART_OPEN",
          cartId: "10000000-0000-4000-8000-000000000001", cartVersion: 2,
          reasonCode: null, occurredAt: now,
        }],
        effectReadiness: [],
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_REQUIRED");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    },
  );

  it("enforces exact cart-mutation authority, claims, payload and locked-state binding", async () => {
    const calls: string[] = [];
    let lockedSalesRow: Record<string, unknown> | null = null;
    let transactionClock = new Date("2026-08-13T03:00:00.000Z");
    let runtimePolicyPinRow: Readonly<{
      bundle_hash: string;
      bundle: Record<string, unknown>;
    }> | null = null;
    const sourceMessageId = "mid-cart-mutation";
    const sourceMessageIdHash = rawSha256(sourceMessageId);
    const policyMetadata = {
      authority: "ADMIN_POLICY" as const,
      sourceVersion: "policy-live-1",
      observedAt: "2026-08-13T02:00:00.000Z",
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH" as const,
    };
    const policy = PolicyBundleV1Schema.parse({
      schemaVersion: 1,
      policyBundleId: "admin-policy:page-1",
      policyVersion: "df06-test-1",
      shopId: "LANA",
      status: "ACTIVE",
      effectiveAt: "2026-08-13T02:00:00.000Z",
      effectiveUntil: null,
      supersedesPolicyVersion: null,
      scope: "SHOP_WIDE",
      commerceAuthority: {
        bomAuthority: "PANCAKE_POS", priceAuthority: "PANCAKE_POS",
        inventoryAuthority: "PANCAKE_POS", allowGoogleSheetsPriceOverride: false,
        allowAdminPriceOverride: false, missingPriceBehavior: "DO_NOT_QUOTE",
        metadata: policyMetadata,
      },
      shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata: policyMetadata },
      multiItemOffer: {
        minimumProductCount: 3, discountBps: 500,
        countingUnit: "PARENT_PRODUCT_UNIT", setAndComboCountAsOne: true,
        scope: "SHOP_WIDE", metadata: policyMetadata,
      },
      negotiation: {
        secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
        finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
        stacking: {
          multiItemDiscountWithSecondConcession: true,
          multiItemDiscountWithFinalConcession: true,
          deduplicateFreeShipping: true,
        },
        scope: "SHOP_WIDE", metadata: policyMetadata,
      },
      closing: {
        customerStates: ["READY", "HESITANT", "CAUTIOUS"],
        decisionMode: "DETERMINISTIC_POLICY_ONLY", allowUnlistedOffers: false,
        metadata: policyMetadata,
      },
    });
    const client = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes("SELECT routing_owner")) {
          return { rowCount: 1, rows: [{
            routing_owner: "APP", app_send_enabled: true, kill_switch: false,
            transaction_now: transactionClock,
          }] };
        }
        if (sql.includes("SELECT conversation_owner")) {
          return { rowCount: 1, rows: [{ conversation_owner: "BOT" }] };
        }
        if (sql.includes("FROM conversation_ingress_heads")) {
          return { rowCount: 1, rows: [{ generation: "1" }] };
        }
        if (sql.includes("FROM webhook_inbox")) {
          return { rowCount: 1, rows: [{ source_message_id: sourceMessageId }] };
        }
        if (sql.includes("SELECT state_revision")) {
          return { rowCount: 1, rows: [lockedSalesRow ?? { state_revision: "2" }] };
        }
        if (sql.includes("FROM runtime_policy_pins")) {
          return runtimePolicyPinRow === null
            ? { rowCount: 0, rows: [] }
            : { rowCount: 1, rows: [runtimePolicyPinRow] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const cipher = new LocalEnvelopeCipher("00".repeat(32), "test-key-v1");
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      cipher,
    );
    (store as unknown as { pool: unknown }).pool = { async connect() { return client; } };
    const now = new Date("2026-08-13T03:00:00.000Z");
    const productScope = { kind: "PRODUCT" as const, productId: "SP-001", variantId: "SET" };
    const provenance = (sourceVersion: string, contentHash: string) => ({
      authority: "POS_SNAPSHOT" as const,
      sourceVersion,
      evidenceRef: `cart-selection:${sourceVersion}`,
      contentHash,
      observedAt: "2026-08-13T02:59:00.000Z",
      expiresAt: "2026-08-13T03:05:00.000Z",
    });
    const claims = [{
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000011",
      type: "PRICE" as const,
      scope: productScope,
      provenance: provenance("price:1", "1".repeat(64)),
      value: { amountVnd: 699_000, currency: "VND" as const },
      authorization: "NONE" as const,
    }, {
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000012",
      type: "STOCK" as const,
      scope: productScope,
      provenance: provenance("inventory:1", "2".repeat(64)),
      value: { status: "IN_STOCK" as const, availableQuantity: 3 },
      authorization: "NONE" as const,
    }];
    const cartId = "10000000-0000-4000-8000-000000000013";
    const mutationCommandId = "sales:event-2:cart-mutation";
    const mutationLineId = "10000000-0000-4000-8000-000000000014";
    const canonicalIntent = {
      schemaVersion: 1 as const,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1" as const,
      decision: "COMMITTED" as const,
      requestedAction: "SET_QUANTITY" as const,
      quantity: 2,
      productId: "SP-001",
      contributors: ["DETERMINISTIC_RUNTIME" as const],
      sourceMessageIdHash,
      evidenceHash: "b".repeat(64),
      reasonCodes: ["DIRECT_PURCHASE_VERB" as const],
      evaluatedAt: "2026-08-13T02:59:00.000Z",
      authorization: "NONE" as const,
    };
    const mutationPayloadHash = sha256({
      mutation: { kind: "SET_QUANTITY", lineId: mutationLineId, quantity: 2 },
    });

    const commitInput = {
      pageId: "page-1", customerHash: "hash",
      conversationId: "33333333-3333-4333-8333-333333333333",
      expectedStateVersion: 4,
      state: { revision: 5, routingOwner: "APP", conversationOwner: "BOT" },
      inboxBatchGuard: {
        generation: 1,
        leaseToken: "lease-cart-mutation",
        inboxIds: ["55555555-5555-4555-8555-555555555555"],
      },
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1",
        sourceMessageIdHash,
        canonicalBuyingIntent: canonicalIntent,
        state: {
          revision: 3,
          cart: { value: { cartId, revision: 2, lines: [
            { parentProductId: "SP-001" },
            { parentProductId: "SP-UNVERIFIED" },
          ] } },
        },
        cartExpiresAt: new Date("2026-08-14T03:00:00.000Z"),
        expiresAt: new Date("2026-08-14T03:00:00.000Z"),
        events: [{
          commandId: "sales:event-2:cart-mutation", commandKind: "CART_MUTATED",
          outcome: "APPLIED", stateRevisionBefore: 2, stateRevisionAfter: 3,
          stageBefore: "CART_OPEN", stageAfter: "CART_OPEN", cartId, cartVersion: 2,
          mutationAction: "SET_QUANTITY" as const, mutationPayloadHash,
          reasonCode: null, occurredAt: now,
        }],
        effectClaimSets: [{ effect: "CART_MUTATION", claims }],
        effectReadiness: [sealReadinessV1({
          schemaVersion: 1, rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_MUTATION", outcome: "READY", pageId: "page-1",
          conversationId: "33333333-3333-4333-8333-333333333333",
          sourceMessageIdHash, conversationRevision: 4,
          salesCycleRevision: 2, productIds: ["SP-001"], cartId, cartVersion: 1,
          cartStateHash: "e".repeat(64),
          orderPreviewId: null, orderPreviewHash: null, buyingIntentHash: sha256(canonicalIntent),
          deterministicEvidenceHash: "d".repeat(64), claimSetHash: sha256(claims),
          protectedClaimTypes: [], checkedAt: now.toISOString(),
          expiresAt: "2026-08-13T03:01:00.000Z", reasonCodes: [], authorization: "NONE",
        }, { offerBindings: [{
          lineId: mutationLineId, productId: "SP-001", offerId: "SET", quantity: 2,
          unitPriceVnd: 699_000, priceFactRef: "price:1",
        }] })],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;

    const exactLine = {
      lineId: mutationLineId,
      parentProductId: "SP-001",
      offerId: "SET",
      offerKind: "SET" as const,
      quantity: 2,
      components: [{
        componentProductId: "SP-001-TOP",
        componentSku: "SP-001-TOP-M",
        componentRole: "TOP" as const,
        color: "BE",
        size: "M",
        quantity: 1,
      }, {
        componentProductId: "SP-001-SKIRT",
        componentSku: "SP-001-SKIRT-M",
        componentRole: "SKIRT" as const,
        color: "BE",
        size: "M",
        quantity: 1,
      }],
      allowMixedSizes: false,
      allowComponentSale: false,
      posUnitPriceVnd: 699_000,
      priceAuthority: {
        priceFactRef: "price:1",
        shopId: "LANA",
        parentProductId: "SP-001",
        offerId: "SET",
        offerPriceKind: "SET" as const,
        componentProductId: null,
        metadata: {
          authority: "PANCAKE_POS" as const,
          sourceVersion: "snapshot:1",
          observedAt: "2026-08-13T02:59:00.000Z",
          expiresAt: "2026-08-15T02:59:00.000Z",
          freshForSeconds: 172_800 as const,
          freshnessState: "FRESH" as const,
        },
      },
      lineTotalVnd: 1_398_000,
    };
    const exactCart = {
      schemaVersion: 1 as const,
      cartId,
      salesEpisodeId: "10000000-0000-4000-8000-000000000015",
      customerProfileId: "10000000-0000-4000-8000-000000000016",
      revision: 2,
      currency: "VND" as const,
      status: "OPEN" as const,
      checkoutEligibility: "ELIGIBLE" as const,
      lines: [exactLine],
      adjustments: [],
      shippingFeeVnd: 30_000,
      subtotalVnd: 1_398_000,
      discountTotalVnd: 0,
      grandTotalVnd: 1_428_000,
      createdAt: "2026-08-13T02:55:00.000Z",
      updatedAt: "2026-08-13T03:00:00.000Z",
    };
    const beforeCart = {
      ...exactCart,
      revision: 1,
      lines: [{ ...exactLine, quantity: 1, lineTotalVnd: 699_000 }],
      subtotalVnd: 699_000,
      grandTotalVnd: 729_000,
      updatedAt: "2026-08-13T02:59:00.000Z",
    };
    const cartHash = (cart: CartV1): string => rawSha256(
      canonicalCartStateHashPreimageV1(canonicalCartStateV1(cart)),
    );
    const beforeCartStateHash = cartHash(beforeCart);
    const afterCartStateHash = cartHash(exactCart);
    const evaluatedAt = now.toISOString();
    const priorProcessedCommandIds = ["sales:event-1:facts"];
    const salesEnvelope = (
      revision: number,
      stage: string,
      processedCommandIds: readonly string[],
      updatedAt = evaluatedAt,
    ) => ({
      schemaVersion: 2 as const,
      conversationKey: commitInput.conversationId,
      routing: { pageId: "page-1", conversationId: commitInput.conversationId },
      revision,
      stage,
      processedCommandIds,
      updatedAt,
    });
    const beforeNegotiation = {
      schemaVersion: 2 as const,
      negotiationId: `negotiation:${cartId}`,
      cartId,
      cartVersion: beforeCart.revision,
      stateVersion: 1,
      customerState: "READY" as const,
      consumedObjectionEvidenceIds: [],
      processedEvents: [],
      quote: {
        policyBundleId: policy.policyBundleId,
        policyVersion: policy.policyVersion,
        customerState: "READY" as const,
        parentProductUnitCount: 1,
        subtotalVnd: beforeCart.subtotalVnd,
        shippingFeeVnd: beforeCart.shippingFeeVnd,
        adjustments: [],
        discountTotalVnd: 0,
        grandTotalVnd: beforeCart.grandTotalVnd,
      },
      updatedAt: beforeCart.updatedAt,
    };
    const mutation = {
      kind: "SET_QUANTITY" as const,
      lineId: mutationLineId,
      quantity: 2,
    };
    const replayed = applyCanonicalCartDecisionV2({
      cart: beforeCart,
      expectedCartVersion: beforeCart.revision,
      mutation,
      shopId: "LANA",
      policy,
      customerState: "READY",
      readyForConfirmation: false,
      now,
    });
    expect(replayed).toMatchObject({ status: "APPLIED", cart: exactCart });
    const negotiationLines = canonicalCartPolicyLinesV2(exactCart.lines, "LANA");
    if (negotiationLines === null) throw new Error("TEST_NEGOTIATION_LINES_INVALID");
    const repricedNegotiation = replayCanonicalCartRepriceNegotiationV1({
      state: beforeNegotiation,
      commandId: mutationCommandId,
      mutationReasonCode: "QUANTITY_CHANGED",
      cart: { cartId, cartVersion: exactCart.revision, lines: negotiationLines },
      policy,
      occurredAt: now,
    });
    if (repricedNegotiation.status !== "APPLIED") {
      throw new Error("TEST_NEGOTIATION_REPRICE_FAILED");
    }
    const authorityPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_MUTATION_AUTHORITY_BINDING_V1" as const,
      sourceMessageIdHash,
      action: "SET_QUANTITY" as const,
      authorityKind: "CANONICAL_BUYING_INTENT" as const,
      authorityEvidenceHash: sha256(canonicalIntent),
      productId: "SP-001",
      offerId: "SET",
      bindingHash: "0".repeat(64),
    };
    const authority = {
      ...authorityPlaceholder,
      bindingHash: rawSha256(
        cartMutationAuthorityBindingHashPreimageV1(authorityPlaceholder),
      ),
    };
    const receiptPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_MUTATION_RECEIPT_V1" as const,
      sequence: 0,
      commandIdHash: rawSha256(mutationCommandId),
      mutation,
      mutationPayloadHash,
      authority,
      beforeCartStateHash,
      afterCartStateHash,
      customerState: "READY" as const,
      mutationReasonCode: "QUANTITY_CHANGED" as const,
      appliedAt: evaluatedAt,
      evaluatedAt,
      evidenceHash: "0".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const mutationEvidence = {
      ...receiptPlaceholder,
      evidenceHash: rawSha256(cartMutationReceiptHashPreimageV1(receiptPlaceholder)),
    };
    const replayContext = {
      schemaVersion: 1 as const,
      contractVersion: "CANONICAL_CART_REPLAY_CONTEXT_V1" as const,
      shopId: "LANA",
      policyRef: {
        id: policy.policyBundleId,
        version: policy.policyVersion,
        contentHash: `sha256:${sha256(policy)}`,
      },
      policyBundle: policy,
      customerState: null,
    };
    const batchPlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_MUTATION_BATCH_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      initialCartStateHash: beforeCartStateHash,
      finalCartStateHash: afterCartStateHash,
      receipts: [mutationEvidence],
      replayContext,
      evidenceHash: "0".repeat(64),
    };
    const mutationBatchEvidence = {
      ...batchPlaceholder,
      evidenceHash: rawSha256(
        cartMutationBatchEvidenceHashPreimageV1(batchPlaceholder),
      ),
    };
    const exactMutation = {
      ...commitInput,
      salesCyclePlan: {
        ...commitInput.salesCyclePlan,
        state: {
          ...salesEnvelope(3, "CART_OPEN", [
            ...priorProcessedCommandIds,
            mutationCommandId,
          ]),
          cart: { value: exactCart, expiresAt: "2026-08-14T03:00:00.000Z" },
          commerceContext: {
            shopId: "LANA",
            policyRef: {
              id: policy.policyBundleId,
              version: policy.policyVersion,
              contentHash: `sha256:${sha256(policy)}`,
            },
          },
          negotiation: repricedNegotiation.state,
        },
        cartMutationBatchEvidence: mutationBatchEvidence,
        effectReadiness: [sealReadinessV1({
          schemaVersion: 1,
          rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_MUTATION",
          outcome: "READY",
          pageId: "page-1",
          conversationId: commitInput.conversationId,
          sourceMessageIdHash,
          conversationRevision: 4,
          salesCycleRevision: 2,
          productIds: ["SP-001"],
          cartId,
          cartVersion: 2,
          cartStateHash: afterCartStateHash,
          orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: sha256(canonicalIntent),
          deterministicEvidenceHash: mutationEvidence.evidenceHash,
          claimSetHash: sha256(claims),
          protectedClaimTypes: [],
          checkedAt: evaluatedAt,
          expiresAt: "2026-08-13T03:01:00.000Z",
          reasonCodes: [],
          authorization: "NONE",
        }, { offerBindings: canonicalCartOfferBindingsV1(exactCart.lines) })],
      },
    };
    const salesExpiresAt = new Date("2026-08-14T03:00:00.000Z");
    const lockedBundle = cipher.encryptJson({
      ...salesEnvelope(2, "CART_OPEN", priorProcessedCommandIds, beforeCart.updatedAt),
      cart: { value: beforeCart, expiresAt: salesExpiresAt.toISOString() },
      commerceContext: { shopId: "LANA", policyRef: replayContext.policyRef },
      negotiation: beforeNegotiation,
    }, `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`, salesExpiresAt);
    lockedSalesRow = {
      conversation_id: commitInput.conversationId,
      page_id: "page-1",
      state_revision: "2",
      state_ciphertext: lockedBundle.ciphertext,
      state_nonce: lockedBundle.nonce,
      state_auth_tag: lockedBundle.authTag,
      state_encrypted_dek: lockedBundle.encryptedDek,
      state_key_ref: lockedBundle.keyRef,
      cart_expires_at: salesExpiresAt,
      expires_at: salesExpiresAt,
    };

    await expect(store.commit(exactMutation, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    const forgedMutationStage = {
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          ...exactMutation.salesCyclePlan.state,
          stage: "HANDED_OFF",
        },
        events: exactMutation.salesCyclePlan.events.map((event) => ({
          ...event,
          stageAfter: "HANDED_OFF",
        })),
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(forgedMutationStage, now))
      .rejects.toThrow("SALES_STAGE_EVENT_CHAIN_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const exactLockedSalesRow = lockedSalesRow;
    lockedSalesRow = {
      ...exactLockedSalesRow!,
      cart_expires_at: new Date(salesExpiresAt.getTime() - 1),
    };
    await expect(store.commit(exactMutation, now))
      .rejects.toThrow("CART_EXPIRY_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    lockedSalesRow = exactLockedSalesRow;

    const forgedPreservedExpiry = new Date(salesExpiresAt.getTime() - 1_000);
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          ...exactMutation.salesCyclePlan.state,
          cart: {
            ...exactMutation.salesCyclePlan.state.cart,
            expiresAt: forgedPreservedExpiry.toISOString(),
          },
        },
        cartExpiresAt: forgedPreservedExpiry,
      },
    }, now)).rejects.toThrow("CART_EXPIRY_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    for (const forgedEnvelope of [{
      conversationKey: "forged-conversation",
    }, {
      routing: { pageId: "forged-page", conversationId: commitInput.conversationId },
    }, {
      processedCommandIds: [mutationCommandId],
    }]) {
      await expect(store.commit({
        ...exactMutation,
        salesCyclePlan: {
          ...exactMutation.salesCyclePlan,
          state: { ...exactMutation.salesCyclePlan.state, ...forgedEnvelope },
        },
      }, now)).rejects.toThrow("SALES_STATE_ENVELOPE_REPLAY_MISMATCH");
      expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    }

    transactionClock = new Date("2026-08-13T02:58:00.000Z");
    await expect(store.commit(exactMutation, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");
    transactionClock = new Date("2026-08-13T02:54:59.999Z");
    await expect(store.commit(exactMutation, now))
      .rejects.toThrow();
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    transactionClock = now;

    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          ...exactMutation.salesCyclePlan.state,
          negotiation: {
            ...repricedNegotiation.state,
            quote: {
              ...repricedNegotiation.state.quote,
              grandTotalVnd: repricedNegotiation.state.quote.grandTotalVnd + 1,
            },
          },
        },
      },
    }, now)).rejects.toThrow("CART_MUTATION_TRANSITION_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: { ...exactMutation.salesCyclePlan.state, stage: "PURCHASE_CONFIRMED" },
      },
    }, now)).rejects.toThrow("SALES_STATE_ENVELOPE_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const checkoutCommandId = "sales:event-2:checkout-details";
    const checkoutDetails = {
      fullName: "Khach Hang",
      phone: "0900000000",
      address: "Ha Noi city",
      paymentMethod: "COD" as const,
    };
    const checkoutTransition = applyCheckoutDetailsTransitionV1({
      current: null,
      details: checkoutDetails,
      appliedAt: now,
    });
    if (checkoutTransition.status !== "APPLIED") {
      throw new Error("TEST_CHECKOUT_TRANSITION_FAILED");
    }
    const checkoutEvidenceDraft = {
      schemaVersion: 1 as const,
      contractVersion: "CHECKOUT_DETAILS_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      commandIdHash: rawSha256(checkoutCommandId),
      details: checkoutDetails,
      beforeCheckoutDraftHash: rawSha256(canonicalCheckoutDraftHashPreimageV1(null)),
      afterCheckoutDraftHash: rawSha256(
        canonicalCheckoutDraftHashPreimageV1(checkoutTransition.draft),
      ),
      appliedAt: now.toISOString(),
      evidenceHash: "0".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const checkoutEvidence = {
      ...checkoutEvidenceDraft,
      evidenceHash: rawSha256(
        checkoutDetailsTransitionEvidenceHashPreimageV1(checkoutEvidenceDraft),
      ),
    };
    const checkoutPlan = {
      ...exactMutation,
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1" as const,
        sourceMessageIdHash,
        canonicalBuyingIntent: canonicalIntent,
        state: {
          ...salesEnvelope(3, "CART_OPEN", [
            ...priorProcessedCommandIds,
            checkoutCommandId,
          ]),
          cart: { value: beforeCart, expiresAt: salesExpiresAt.toISOString() },
          commerceContext: { shopId: "LANA", policyRef: replayContext.policyRef },
          negotiation: beforeNegotiation,
          checkoutDraft: checkoutTransition.draft,
          preview: null,
          confirmation: null,
        },
        cartExpiresAt: salesExpiresAt,
        expiresAt: salesExpiresAt,
        events: [{
          commandId: checkoutCommandId,
          commandKind: "CHECKOUT_DETAILS_CAPTURED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 2,
          stateRevisionAfter: 3,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
          cartId,
          cartVersion: beforeCart.revision,
          reasonCode: null,
          checkoutDetailsTransitionEvidence: checkoutEvidence,
          occurredAt: now,
        }],
        effectClaimSets: [],
        effectReadiness: [],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(checkoutPlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...checkoutPlan,
      salesCyclePlan: {
        ...checkoutPlan.salesCyclePlan,
        state: {
          ...checkoutPlan.salesCyclePlan.state,
          checkoutDraft: { ...checkoutTransition.draft, phone: "0911111111" },
        },
      },
    }, now)).rejects.toThrow("PROTECTED_SALES_ARTIFACT_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const mutationLockedSalesRow = lockedSalesRow;
    for (const [commandKind, stageBefore, stageAfter] of [
      ["FACTS_PRESENTED", "DISCOVERY", "FACTS_PRESENTED"],
      ["MEASUREMENTS_REQUIRED", "FACTS_PRESENTED", "MEASUREMENTS_REQUIRED"],
      ["SIZE_RECOMMENDED", "MEASUREMENTS_REQUIRED", "SIZE_RECOMMENDED"],
    ] as const) {
      const commandId = `sales:event-unprotected:${commandKind.toLowerCase()}`;
      const lockedUnprotectedState = {
        ...salesEnvelope(2, stageBefore, priorProcessedCommandIds, beforeCart.updatedAt),
        cart: null,
        commerceContext: null,
        negotiation: null,
        checkoutDraft: null,
        preview: null,
        confirmation: null,
      };
      const lockedUnprotectedBundle = cipher.encryptJson(
        lockedUnprotectedState,
        `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`,
        salesExpiresAt,
      );
      lockedSalesRow = {
        ...mutationLockedSalesRow,
        state_revision: "2",
        state_ciphertext: lockedUnprotectedBundle.ciphertext,
        state_nonce: lockedUnprotectedBundle.nonce,
        state_auth_tag: lockedUnprotectedBundle.authTag,
        state_encrypted_dek: lockedUnprotectedBundle.encryptedDek,
        state_key_ref: lockedUnprotectedBundle.keyRef,
        cart_expires_at: null,
      };
      await expect(store.commit({
        ...commitInput,
        salesCyclePlan: {
          expectedRevision: 2,
          readinessContractVersion: "DF06_EFFECT_READINESS_V1",
          sourceMessageIdHash,
          canonicalBuyingIntent: canonicalIntent,
          state: {
            ...lockedUnprotectedState,
            ...salesEnvelope(3, stageAfter, [...priorProcessedCommandIds, commandId]),
          },
          cartExpiresAt: null,
          expiresAt: salesExpiresAt,
          events: [{
            commandId,
            commandKind,
            outcome: "APPLIED",
            stateRevisionBefore: 2,
            stateRevisionAfter: 3,
            stageBefore,
            stageAfter,
            cartId: null,
            cartVersion: null,
            reasonCode: null,
            occurredAt: now,
          }],
          effectClaimSets: [],
          effectReadiness: [],
        },
      }, now)).resolves.toMatchObject({ stateCommitted: true });
      expect(calls.at(-1)?.trim()).toBe("COMMIT");
    }
    lockedSalesRow = mutationLockedSalesRow;
    const openCommandId = "sales:event-2:cart-open";
    const openPolicyRef = replayContext.policyRef;
    const openDraft = {
      identity: {
        cartId: "10000000-0000-4000-8000-000000000041",
        salesEpisodeId: "10000000-0000-4000-8000-000000000042",
        customerProfileId: "10000000-0000-4000-8000-000000000043",
      },
      lines: [{ ...exactLine, quantity: 1, lineTotalVnd: 699_000 }],
      shopId: "LANA",
      policyRef: openPolicyRef,
    };
    const openReplay = createCanonicalCartV2({
      identity: openDraft.identity,
      lines: openDraft.lines,
      shopId: openDraft.shopId,
      policy,
      now,
      authorizationNow: transactionClock,
    });
    expect(openReplay.status).toBe("CREATED");
    if (openReplay.status !== "CREATED") throw new Error("TEST_CART_OPEN_REPLAY_FAILED");
    const openCart = openReplay.cart;
    const openPolicyLines = canonicalCartPolicyLinesV2(openCart.lines, "LANA");
    expect(openPolicyLines).not.toBeNull();
    if (openPolicyLines === null) throw new Error("TEST_CART_OPEN_POLICY_LINES_FAILED");
    const openEventId = `${openCommandId}:ready`;
    const openNegotiation = {
      schemaVersion: 2 as const,
      negotiationId: `negotiation:${openCart.cartId}`,
      cartId: openCart.cartId,
      cartVersion: openCart.revision,
      stateVersion: 1,
      customerState: "READY" as const,
      consumedObjectionEvidenceIds: [],
      processedEvents: [{
        eventId: openEventId,
        fingerprint: canonicalNegotiationEventFingerprintV1({
          negotiationId: `negotiation:${openCart.cartId}`,
          expectedStateVersion: 0,
          expectedCartVersion: openCart.revision,
          eventId: openEventId,
          evidence: {
            source: "MODEL_INTERPRETATION",
            intent: "PURCHASE_READY",
            evidenceId: openEventId,
            observedAt: now.toISOString(),
          },
          cart: { cartId: openCart.cartId, cartVersion: openCart.revision, lines: openPolicyLines },
        }),
        resultingStateVersion: 1,
      }],
      quote: {
        policyBundleId: policy.policyBundleId,
        policyVersion: policy.policyVersion,
        customerState: "READY" as const,
        parentProductUnitCount: 1,
        subtotalVnd: openCart.subtotalVnd,
        shippingFeeVnd: openCart.shippingFeeVnd,
        adjustments: openCart.adjustments.map((adjustment) => ({
          ruleId: adjustment.policyAuthorization.ruleId,
          kind: adjustment.kind,
          amountVnd: adjustment.amountVnd,
          percentageBps: adjustment.percentageBps,
        })),
        discountTotalVnd: openCart.discountTotalVnd,
        grandTotalVnd: openCart.grandTotalVnd,
      },
      updatedAt: now.toISOString(),
    };
    const openIntent = {
      ...canonicalIntent,
      requestedAction: "OPEN_CART" as const,
      quantity: 1,
    };
    const openDraftRef = {
      id: "cart-draft:mid-cart-mutation",
      version: "draft-v1",
      contentHash: `sha256:${sha256(openDraft)}` as const,
    };
    const openEvidencePlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CART_OPEN_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      commandIdHash: rawSha256(openCommandId),
      cartDraftRef: openDraftRef,
      draft: openDraft,
      replayContext: { ...replayContext, customerState: null },
      policyPin: {
        scopeType: "SALES_EPISODE" as const,
        scopeId: "sales-episode:df06-test",
        channel: "PUBLISHED" as const,
        bundleHash: `sha256:${"7".repeat(64)}` as const,
      },
      createdAt: now.toISOString(),
      cartExpiresAt: salesExpiresAt.toISOString(),
      evidenceHash: "0".repeat(64),
    };
    const openEvidence = {
      ...openEvidencePlaceholder,
      evidenceHash: rawSha256(cartOpenEvidenceHashPreimageV1(openEvidencePlaceholder)),
    };
    const openCartHash = cartHash(openCart);
    const openReadiness = sealReadinessV1({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "CART_OPEN",
      outcome: "READY",
      pageId: "page-1",
      conversationId: commitInput.conversationId,
      sourceMessageIdHash,
      conversationRevision: 4,
      salesCycleRevision: 2,
      productIds: ["SP-001"],
      cartId: openCart.cartId,
      cartVersion: openCart.revision,
      cartStateHash: openCartHash,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: sha256(openIntent),
      deterministicEvidenceHash: null,
      claimSetHash: sha256(claims),
      protectedClaimTypes: [],
      checkedAt: now.toISOString(),
      expiresAt: "2026-08-13T03:01:00.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }, { offerBindings: canonicalCartOfferBindingsV1(openCart.lines) });
    const openState = {
      ...salesEnvelope(3, "CART_OPEN", [
        ...priorProcessedCommandIds,
        openCommandId,
      ]),
      cart: { value: openCart, expiresAt: salesExpiresAt.toISOString() },
      commerceContext: { shopId: "LANA", policyRef: openPolicyRef },
      negotiation: openNegotiation,
    };
    const openPlan = {
      ...commitInput,
      salesCyclePlan: {
        expectedRevision: 2,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1" as const,
        sourceMessageIdHash,
        canonicalBuyingIntent: openIntent,
        state: openState,
        cartExpiresAt: salesExpiresAt,
        expiresAt: salesExpiresAt,
        events: [{
          commandId: openCommandId,
          commandKind: "CART_OPENED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 2,
          stateRevisionAfter: 3,
          stageBefore: "SIZE_RECOMMENDED",
          stageAfter: "CART_OPEN",
          cartId: openCart.cartId,
          cartVersion: openCart.revision,
          reasonCode: null,
          occurredAt: now,
        }],
        effectClaimSets: [{ effect: "CART_OPEN" as const, claims }],
        effectReadiness: [openReadiness],
        cartOpenEvidence: openEvidence,
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    const emptyCartLockedBundle = cipher.encryptJson({
      ...salesEnvelope(2, "SIZE_RECOMMENDED", priorProcessedCommandIds, beforeCart.updatedAt),
      cart: null,
      commerceContext: null,
      negotiation: null,
      checkoutDraft: checkoutTransition.draft,
      preview: null,
      confirmation: null,
    }, `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`, salesExpiresAt);
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_ciphertext: emptyCartLockedBundle.ciphertext,
      state_nonce: emptyCartLockedBundle.nonce,
      state_auth_tag: emptyCartLockedBundle.authTag,
      state_encrypted_dek: emptyCartLockedBundle.encryptedDek,
      state_key_ref: emptyCartLockedBundle.keyRef,
      cart_expires_at: null,
    };
    runtimePolicyPinRow = {
      bundle_hash: openEvidence.policyPin.bundleHash,
      bundle: { policy },
    };
    await expect(store.commit(openPlan, now)).resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    const forgedOpenExpiry = new Date(salesExpiresAt.getTime() - 1_000);
    await expect(store.commit({
      ...openPlan,
      salesCyclePlan: {
        ...openPlan.salesCyclePlan,
        state: {
          ...openPlan.salesCyclePlan.state,
          cart: {
            ...openPlan.salesCyclePlan.state.cart,
            expiresAt: forgedOpenExpiry.toISOString(),
          },
        },
        cartExpiresAt: forgedOpenExpiry,
      },
    }, now)).rejects.toThrow("CART_EXPIRY_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit({
      ...openPlan,
      salesCyclePlan: {
        ...openPlan.salesCyclePlan,
        events: openPlan.salesCyclePlan.events.map((event) => ({
          ...event,
          cartId: "10000000-0000-4000-8000-000000000099",
        })),
      },
    }, now)).rejects.toThrow("CART_OPEN_EVENT_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const forgedOpenCart = {
      ...openCart,
      createdAt: "2026-08-13T03:00:01.000Z",
      updatedAt: "2026-08-13T03:00:01.000Z",
    };
    await expect(store.commit({
      ...openPlan,
      salesCyclePlan: {
        ...openPlan.salesCyclePlan,
        state: {
          ...openState,
          cart: { value: forgedOpenCart, expiresAt: salesExpiresAt.toISOString() },
        },
        effectReadiness: [resealReadinessV1(openReadiness, {
          cartStateHash: cartHash(forgedOpenCart),
        })],
      },
    }, now)).rejects.toThrow("CART_OPEN_FULL_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const expiringPolicy = PolicyBundleV1Schema.parse({
      ...policy,
      policyVersion: "df06-test-expiring",
      effectiveUntil: "2026-08-13T03:00:30.000Z",
    });
    const expiringPolicyRef = {
      id: expiringPolicy.policyBundleId,
      version: expiringPolicy.policyVersion,
      contentHash: `sha256:${sha256(expiringPolicy)}` as const,
    };
    const expiringDraft = {
      ...openDraft,
      policyRef: expiringPolicyRef,
    };
    const expiringDraftRef = {
      ...openDraftRef,
      version: "draft-expiring-v1",
      contentHash: `sha256:${sha256(expiringDraft)}` as const,
    };
    const expiringEvidencePlaceholder = {
      ...openEvidencePlaceholder,
      cartDraftRef: expiringDraftRef,
      draft: expiringDraft,
      replayContext: {
        ...openEvidencePlaceholder.replayContext,
        policyRef: expiringPolicyRef,
        policyBundle: expiringPolicy,
      },
      policyPin: {
        ...openEvidencePlaceholder.policyPin,
        bundleHash: `sha256:${"8".repeat(64)}` as const,
      },
      evidenceHash: "0".repeat(64),
    };
    const expiringEvidence = {
      ...expiringEvidencePlaceholder,
      evidenceHash: rawSha256(cartOpenEvidenceHashPreimageV1(expiringEvidencePlaceholder)),
    };
    transactionClock = new Date("2026-08-13T03:00:45.000Z");
    runtimePolicyPinRow = {
      bundle_hash: expiringEvidence.policyPin.bundleHash,
      bundle: { policy: expiringPolicy },
    };
    await expect(store.commit({
      ...openPlan,
      salesCyclePlan: {
        ...openPlan.salesCyclePlan,
        state: {
          ...openState,
          commerceContext: { shopId: "LANA", policyRef: expiringPolicyRef },
        },
        cartOpenEvidence: expiringEvidence,
      },
    }, now)).rejects.toThrow("CART_OPEN_FULL_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    transactionClock = now;

    const clarificationCommandId = "sales:event-2:clarification-requested";
    const clarificationTransition = {
      kind: "REQUESTED" as const,
      reasonCode: "CHECKOUT_DETAILS_MISSING" as const,
      missingFields: ["FULL_NAME", "ADDRESS"],
      productId: "SP-001",
      questionFingerprint: "a".repeat(64),
      maxAttempts: 3,
    };
    const clarificationResult = applySalesClarificationTransitionV1({
      current: null,
      transition: clarificationTransition,
      appliedAt: now,
    });
    expect(clarificationResult.status).toBe("APPLIED");
    if (clarificationResult.status !== "APPLIED") throw new Error("TEST_CLARIFICATION_FAILED");
    const clarificationEvidencePlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      commandIdHash: rawSha256(clarificationCommandId),
      transition: clarificationTransition,
      beforeClarificationHash: rawSha256(canonicalClarificationStateHashPreimageV1(null)),
      afterClarificationHash: rawSha256(
        canonicalClarificationStateHashPreimageV1(clarificationResult.clarification),
      ),
      appliedAt: now.toISOString(),
      evidenceHash: "0".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const clarificationEvidence = {
      ...clarificationEvidencePlaceholder,
      evidenceHash: rawSha256(
        clarificationTransitionEvidenceHashPreimageV1(clarificationEvidencePlaceholder),
      ),
    };
    const { cartOpenEvidence: _clarificationOpenEvidence, ...clarificationBasePlan } =
      openPlan.salesCyclePlan;
    const clarificationState = {
      ...openState,
      ...salesEnvelope(4, "CART_OPEN", [
        ...openState.processedCommandIds,
        clarificationCommandId,
      ]),
      clarification: clarificationResult.clarification,
    };
    const clarificationPlan = {
      ...openPlan,
      salesCyclePlan: {
        ...clarificationBasePlan,
        expectedRevision: 3,
        state: clarificationState,
        events: [{
          commandId: clarificationCommandId,
          commandKind: "CLARIFICATION_REQUESTED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 3,
          stateRevisionAfter: 4,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
          cartId: openCart.cartId,
          cartVersion: openCart.revision,
          reasonCode: null,
          clarificationTransitionEvidence: clarificationEvidence,
          occurredAt: now,
        }],
        effectClaimSets: [],
        effectReadiness: [],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    const clarificationOpenLockedBundle = cipher.encryptJson(
      openState,
      `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`,
      salesExpiresAt,
    );
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_revision: "3",
      state_ciphertext: clarificationOpenLockedBundle.ciphertext,
      state_nonce: clarificationOpenLockedBundle.nonce,
      state_auth_tag: clarificationOpenLockedBundle.authTag,
      state_encrypted_dek: clarificationOpenLockedBundle.encryptedDek,
      state_key_ref: clarificationOpenLockedBundle.keyRef,
    };
    await expect(store.commit(clarificationPlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...clarificationPlan,
      salesCyclePlan: {
        ...clarificationPlan.salesCyclePlan,
        state: {
          ...clarificationState,
          clarification: {
            ...clarificationResult.clarification,
            productId: "SP-002",
          },
        },
      },
    }, now)).rejects.toThrow("PROTECTED_SALES_ARTIFACT_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const resolveCommandId = "sales:event-3:clarification-resolved";
    const resolveTransition = { kind: "RESOLVED" as const };
    const resolveResult = applySalesClarificationTransitionV1({
      current: clarificationResult.clarification,
      transition: resolveTransition,
      appliedAt: now,
    });
    expect(resolveResult.status).toBe("APPLIED");
    if (resolveResult.status !== "APPLIED") throw new Error("TEST_CLARIFICATION_RESOLVE_FAILED");
    const resolveEvidencePlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "CLARIFICATION_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      commandIdHash: rawSha256(resolveCommandId),
      transition: resolveTransition,
      beforeClarificationHash: rawSha256(
        canonicalClarificationStateHashPreimageV1(clarificationResult.clarification),
      ),
      afterClarificationHash: rawSha256(canonicalClarificationStateHashPreimageV1(null)),
      appliedAt: now.toISOString(),
      evidenceHash: "0".repeat(64),
      contributor: "DETERMINISTIC_RUNTIME" as const,
      authorization: "NONE" as const,
    };
    const resolveEvidence = {
      ...resolveEvidencePlaceholder,
      evidenceHash: rawSha256(
        clarificationTransitionEvidenceHashPreimageV1(resolveEvidencePlaceholder),
      ),
    };
    const clarificationLockedBundle = cipher.encryptJson(
      clarificationState,
      `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`,
      salesExpiresAt,
    );
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_revision: "4",
      state_ciphertext: clarificationLockedBundle.ciphertext,
      state_nonce: clarificationLockedBundle.nonce,
      state_auth_tag: clarificationLockedBundle.authTag,
      state_encrypted_dek: clarificationLockedBundle.encryptedDek,
      state_key_ref: clarificationLockedBundle.keyRef,
    };
    const resolvePlan = {
      ...clarificationPlan,
      salesCyclePlan: {
        ...clarificationPlan.salesCyclePlan,
        expectedRevision: 4,
        state: {
          ...clarificationState,
          ...salesEnvelope(5, "CART_OPEN", [
            ...clarificationState.processedCommandIds,
            resolveCommandId,
          ]),
          clarification: null,
        },
        events: [{
          commandId: resolveCommandId,
          commandKind: "CLARIFICATION_RESOLVED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 4,
          stateRevisionAfter: 5,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
          cartId: openCart.cartId,
          cartVersion: openCart.revision,
          reasonCode: null,
          clarificationTransitionEvidence: resolveEvidence,
          occurredAt: now,
        }],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(resolvePlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");
    await expect(store.commit({
      ...resolvePlan,
      salesCyclePlan: {
        ...resolvePlan.salesCyclePlan,
        events: resolvePlan.salesCyclePlan.events.map(({
          clarificationTransitionEvidence: _omittedClarificationEvidence,
          ...event
        }) => event),
      },
    }, now)).rejects.toThrow();
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const negotiationQuote = (
      cart: CartV1,
      customerState: "HESITANT" | "CAUTIOUS",
    ) => ({
      policyBundleId: policy.policyBundleId,
      policyVersion: policy.policyVersion,
      customerState,
      parentProductUnitCount: cart.lines.reduce((total, line) => total + line.quantity, 0),
      subtotalVnd: cart.subtotalVnd,
      shippingFeeVnd: cart.shippingFeeVnd,
      adjustments: cart.adjustments.map((adjustment) => ({
        ruleId: adjustment.policyAuthorization.ruleId,
        kind: adjustment.kind,
        amountVnd: adjustment.amountVnd,
        percentageBps: adjustment.percentageBps,
      })),
      discountTotalVnd: cart.discountTotalVnd,
      grandTotalVnd: cart.grandTotalVnd,
    });
    const hesitantReplay = applyCanonicalCartDecisionV2({
      cart: openCart,
      expectedCartVersion: openCart.revision,
      mutation: null,
      shopId: "LANA",
      policy,
      customerState: "HESITANT",
      now,
      authorizationNow: transactionClock,
    });
    const cautiousReplay = applyCanonicalCartDecisionV2({
      cart: openCart,
      expectedCartVersion: openCart.revision,
      mutation: null,
      shopId: "LANA",
      policy,
      customerState: "CAUTIOUS",
      now,
      authorizationNow: transactionClock,
    });
    expect(hesitantReplay.status).toBe("APPLIED");
    expect(cautiousReplay.status).toBe("APPLIED");
    if (hesitantReplay.status !== "APPLIED" || cautiousReplay.status !== "APPLIED") {
      throw new Error("TEST_NEGOTIATION_REPLAY_FAILED");
    }
    const negotiationCommandId = "sales:event-2:price-objection";
    const negotiationEvidenceId = `inbound:${sourceMessageId}`;
    const negotiationFingerprint = canonicalNegotiationEventFingerprintV1({
      negotiationId: openNegotiation.negotiationId,
      expectedStateVersion: openNegotiation.stateVersion,
      expectedCartVersion: openCart.revision,
      eventId: negotiationEvidenceId,
      evidence: {
        source: "MODEL_INTERPRETATION",
        intent: "PRICE_OBJECTION",
        evidenceId: negotiationEvidenceId,
        objectionEvidenceId: negotiationEvidenceId,
        reasonCode: "PRICE_TOO_HIGH",
        observedAt: now.toISOString(),
      },
      cart: { cartId: openCart.cartId, cartVersion: openCart.revision, lines: openPolicyLines },
    });
    const negotiationEvidencePlaceholder = {
      schemaVersion: 1 as const,
      contractVersion: "NEGOTIATION_TRANSITION_EVIDENCE_V1" as const,
      sourceMessageIdHash,
      commandIdHash: rawSha256(negotiationCommandId),
      eventIdHash: rawSha256(negotiationEvidenceId),
      evidenceIdHash: rawSha256(negotiationEvidenceId),
      objectionEvidenceIdHash: rawSha256(negotiationEvidenceId),
      intent: "PRICE_OBJECTION" as const,
      reasonCode: "PRICE_TOO_HIGH",
      observedAt: now.toISOString(),
      evidenceHash: "0".repeat(64),
    };
    const negotiationEvidence = {
      ...negotiationEvidencePlaceholder,
      evidenceHash: rawSha256(
        negotiationTransitionEvidenceHashPreimageV1(negotiationEvidencePlaceholder),
      ),
    };
    const negotiationEvent = {
      commandId: negotiationCommandId,
      commandKind: "NEGOTIATION_EVENT" as const,
      outcome: "APPLIED" as const,
      stateRevisionBefore: 3,
      stateRevisionAfter: 4,
      stageBefore: "CART_OPEN",
      stageAfter: "CART_OPEN",
      cartId: openCart.cartId,
      cartVersion: hesitantReplay.cart.revision,
      reasonCode: null,
      negotiationTransitionEvidence: negotiationEvidence,
      occurredAt: now,
    };
    const nextNegotiation = {
      ...openNegotiation,
      cartVersion: hesitantReplay.cart.revision,
      stateVersion: openNegotiation.stateVersion + 1,
      customerState: "HESITANT" as const,
      consumedObjectionEvidenceIds: [negotiationEvidenceId],
      processedEvents: [...openNegotiation.processedEvents, {
        eventId: negotiationEvidenceId,
        fingerprint: negotiationFingerprint,
        resultingStateVersion: openNegotiation.stateVersion + 1,
      }],
      quote: negotiationQuote(hesitantReplay.cart, "HESITANT"),
      updatedAt: now.toISOString(),
    };
    const negotiationReadiness = sealReadinessV1({
      ...openReadiness,
      effect: "CART_READY",
      cartVersion: hesitantReplay.cart.revision,
      cartStateHash: cartHash(hesitantReplay.cart),
      buyingIntentHash: null,
    }, { offerBindings: canonicalCartOfferBindingsV1(hesitantReplay.cart.lines) });
    const { cartOpenEvidence: _cartOpenEvidence, ...openPlanWithoutCartOpenEvidence } =
      openPlan.salesCyclePlan;
    const negotiationPlan = {
      ...openPlan,
      salesCyclePlan: {
        ...openPlanWithoutCartOpenEvidence,
        expectedRevision: 3,
        state: {
          ...openState,
          ...salesEnvelope(4, "CART_OPEN", [
            ...openState.processedCommandIds,
            negotiationEvent.commandId,
          ]),
          cart: { value: hesitantReplay.cart, expiresAt: salesExpiresAt.toISOString() },
          negotiation: nextNegotiation,
        },
        events: [negotiationEvent],
        effectClaimSets: [{ effect: "CART_READY" as const, claims }],
        effectReadiness: [resealReadinessV1(negotiationReadiness, {
          salesCycleRevision: 3,
        })],
        cartReplayContext: { ...replayContext, customerState: "HESITANT" as const },
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    const openLockedBundle = cipher.encryptJson(openState,
      `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`, salesExpiresAt);
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_revision: "3",
      state_ciphertext: openLockedBundle.ciphertext,
      state_nonce: openLockedBundle.nonce,
      state_auth_tag: openLockedBundle.authTag,
      state_encrypted_dek: openLockedBundle.encryptedDek,
      state_key_ref: openLockedBundle.keyRef,
    };
    await expect(store.commit(negotiationPlan, now)).resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...negotiationPlan,
      salesCyclePlan: {
        ...negotiationPlan.salesCyclePlan,
        events: negotiationPlan.salesCyclePlan.events.map((event) => ({
          ...event,
          cartVersion: event.cartVersion + 1,
        })),
      },
    }, now)).rejects.toThrow("NEGOTIATION_EVENT_BINDING_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const forgedCautiousNegotiation = {
      ...nextNegotiation,
      cartVersion: cautiousReplay.cart.revision,
      customerState: "CAUTIOUS" as const,
      quote: negotiationQuote(cautiousReplay.cart, "CAUTIOUS"),
    };
    await expect(store.commit({
      ...negotiationPlan,
      salesCyclePlan: {
        ...negotiationPlan.salesCyclePlan,
        state: {
          ...negotiationPlan.salesCyclePlan.state,
          cart: { value: cautiousReplay.cart, expiresAt: salesExpiresAt.toISOString() },
          negotiation: forgedCautiousNegotiation,
        },
        effectReadiness: [resealReadinessV1(
          negotiationPlan.salesCyclePlan.effectReadiness[0]!,
          {
            cartStateHash: cartHash(cautiousReplay.cart),
          },
          { offerBindings: canonicalCartOfferBindingsV1(cautiousReplay.cart.lines) },
        )],
        cartReplayContext: { ...replayContext, customerState: "CAUTIOUS" as const },
      },
    }, now)).rejects.toThrow("NEGOTIATION_TRANSITION_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    lockedSalesRow = mutationLockedSalesRow;
    runtimePolicyPinRow = null;

    const cartReadyReplay = applyCanonicalCartDecisionV2({
      cart: beforeCart,
      expectedCartVersion: beforeCart.revision,
      mutation: null,
      shopId: "LANA",
      policy,
      customerState: "READY",
      readyForConfirmation: true,
      now,
    });
    expect(cartReadyReplay.status).toBe("APPLIED");
    if (cartReadyReplay.status !== "APPLIED") throw new Error("TEST_CART_READY_REPLAY_FAILED");
    const readyCart = cartReadyReplay.cart;
    const priceOnlyClaims = [claims[0]!];
    const cartReadyWithMissingStock = {
      ...commitInput,
      salesCyclePlan: {
        ...commitInput.salesCyclePlan,
        state: { revision: 3, cart: { value: readyCart } },
        events: [{
          commandId: "sales:event-2:cart-ready",
          commandKind: "CART_READY" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 2,
          stateRevisionAfter: 3,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
          cartId,
          cartVersion: readyCart.revision,
          reasonCode: null,
          occurredAt: now,
        }],
        effectClaimSets: [{ effect: "CART_READY" as const, claims: priceOnlyClaims }],
        effectReadiness: [sealReadinessV1({
          schemaVersion: 1,
          rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
          effect: "CART_READY",
          outcome: "READY",
          pageId: "page-1",
          conversationId: commitInput.conversationId,
          sourceMessageIdHash,
          conversationRevision: 4,
          salesCycleRevision: 2,
          productIds: ["SP-001"],
          cartId,
          cartVersion: readyCart.revision,
          cartStateHash: cartHash(readyCart),
          orderPreviewId: null,
          orderPreviewHash: null,
          buyingIntentHash: null,
          deterministicEvidenceHash: null,
          claimSetHash: sha256(priceOnlyClaims),
          protectedClaimTypes: [],
          checkedAt: evaluatedAt,
          expiresAt: "2026-08-13T03:01:00.000Z",
          reasonCodes: [],
          authorization: "NONE",
        }, { offerBindings: canonicalCartOfferBindingsV1(readyCart.lines) })],
        cartReplayContext: { ...replayContext, customerState: "READY" as const },
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(cartReadyWithMissingStock, now))
      .rejects.toThrow("EFFECT_READINESS_CLAIM_MISSING");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const etaClaim = {
      schemaVersion: 1 as const,
      claimId: "10000000-0000-4000-8000-000000000019",
      type: "ETA" as const,
      scope: productScope,
      provenance: provenance("eta:1", "3".repeat(64)),
      value: { minDays: 1, maxDays: 2 },
      authorization: "NONE" as const,
    };
    const cartReadyClaims = [...claims, etaClaim];
    const readyPolicyLines = canonicalCartPolicyLinesV2(readyCart.lines, "LANA");
    if (readyPolicyLines === null) throw new Error("TEST_CART_READY_LINES_INVALID");
    const readyNegotiation = replayCanonicalCartRepriceNegotiationV1({
      state: beforeNegotiation,
      commandId: cartReadyWithMissingStock.salesCyclePlan.events[0]!.commandId,
      mutationReasonCode: "OTHER",
      cart: { cartId, cartVersion: readyCart.revision, lines: readyPolicyLines },
      policy,
      occurredAt: now,
    });
    if (readyNegotiation.status !== "APPLIED") {
      throw new Error("TEST_CART_READY_NEGOTIATION_FAILED");
    }
    const exactCartReady = {
      ...cartReadyWithMissingStock,
      salesCyclePlan: {
        ...cartReadyWithMissingStock.salesCyclePlan,
        state: {
          ...salesEnvelope(3, "CART_OPEN", [
            ...priorProcessedCommandIds,
            cartReadyWithMissingStock.salesCyclePlan.events[0]!.commandId,
          ]),
          cart: { value: readyCart, expiresAt: salesExpiresAt.toISOString() },
          commerceContext: { shopId: "LANA", policyRef: replayContext.policyRef },
          negotiation: readyNegotiation.state,
          checkoutDraft: null,
          preview: null,
          confirmation: null,
        },
        effectClaimSets: [{ effect: "CART_READY" as const, claims: cartReadyClaims }],
        effectReadiness: cartReadyWithMissingStock.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, { claimSetHash: sha256(cartReadyClaims) })
        ),
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(exactCartReady, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...exactCartReady,
      salesCyclePlan: {
        ...exactCartReady.salesCyclePlan,
        state: {
          ...exactCartReady.salesCyclePlan.state,
          negotiation: {
            ...readyNegotiation.state,
            quote: {
              ...readyNegotiation.state.quote,
              grandTotalVnd: readyNegotiation.state.quote.grandTotalVnd + 1,
            },
          },
        },
      },
    }, now)).rejects.toThrow("CART_READY_NEGOTIATION_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const matchedPreviewFact = {
      status: "MATCHED" as const,
      sourceVersionBefore: "fact-v1",
      sourceVersionAfter: "fact-v1",
      checkedAt: evaluatedAt,
    };
    const previewArtifact = {
      schemaVersion: 1 as const,
      previewId: "10000000-0000-4000-8000-000000000030",
      cartId,
      cartVersion: readyCart.revision,
      stage: "ORDER_PREVIEW" as const,
      recipient: {
        fullName: checkoutTransition.draft.fullName!,
        phone: checkoutTransition.draft.phone!,
        address: checkoutTransition.draft.address!,
        retentionClass: "CART_48H_OPERATIONAL" as const,
      },
      payment: { method: "COD" as const, bankTransferPolicyRef: null },
      revalidation: {
        cartId,
        cartVersion: readyCart.revision,
        price: matchedPreviewFact,
        inventory: matchedPreviewFact,
        size: matchedPreviewFact,
        eta: matchedPreviewFact,
        eligible: true,
        checkedAt: evaluatedAt,
      },
      createdAt: evaluatedAt,
      expiresAt: "2026-08-13T03:01:00.000Z",
    };
    const exactPreview = {
      ...previewArtifact,
      previewHash: computeCanonicalOrderPreviewHashV1(previewArtifact),
    };
    const cartReadyReadiness = exactCartReady.salesCyclePlan.effectReadiness[0]!;
    const previewReadiness = resealReadinessV1(cartReadyReadiness, {
      effect: "PREVIEW_READY",
      orderPreviewId: exactPreview.previewId,
      orderPreviewHash: exactPreview.previewHash.replace(/^sha256:/u, ""),
      buyingIntentHash: null,
      deterministicEvidenceHash: null,
    }, { parentReadinessHash: cartReadyReadiness.readinessHash });
    const exactPreviewPlan = {
      ...exactCartReady,
      salesCyclePlan: {
        ...exactCartReady.salesCyclePlan,
        state: {
          ...exactCartReady.salesCyclePlan.state,
          ...salesEnvelope(5, "ORDER_PREVIEW", [
            ...priorProcessedCommandIds,
            checkoutPlan.salesCyclePlan.events[0]!.commandId,
            exactCartReady.salesCyclePlan.events[0]!.commandId,
            "sales:event-2:preview",
          ]),
          checkoutDraft: checkoutTransition.draft,
          preview: exactPreview,
        },
        events: [
          checkoutPlan.salesCyclePlan.events[0]!,
          {
            ...exactCartReady.salesCyclePlan.events[0]!,
            stateRevisionBefore: 3,
            stateRevisionAfter: 4,
          },
          {
            commandId: "sales:event-2:preview",
            commandKind: "PREVIEW_CREATED" as const,
            outcome: "APPLIED" as const,
            stateRevisionBefore: 4,
            stateRevisionAfter: 5,
            stageBefore: "CART_OPEN",
            stageAfter: "ORDER_PREVIEW",
            cartId,
            cartVersion: readyCart.revision,
            reasonCode: null,
            occurredAt: now,
          },
        ],
        effectClaimSets: [
          { effect: "CART_READY" as const, claims: cartReadyClaims },
          { effect: "PREVIEW_READY" as const, claims: cartReadyClaims },
        ],
        effectReadiness: [cartReadyReadiness, previewReadiness],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(exactPreviewPlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    const forgedPreviewArtifact = {
      ...previewArtifact,
      recipient: { ...previewArtifact.recipient, phone: "0911111111" },
    };
    const forgedPreview = {
      ...forgedPreviewArtifact,
      previewHash: computeCanonicalOrderPreviewHashV1(forgedPreviewArtifact),
    };
    const forgedPreviewReadiness = resealReadinessV1(previewReadiness, {
      orderPreviewHash: forgedPreview.previewHash.replace(/^sha256:/u, ""),
    }, { parentReadinessHash: cartReadyReadiness.readinessHash });
    await expect(store.commit({
      ...exactPreviewPlan,
      salesCyclePlan: {
        ...exactPreviewPlan.salesCyclePlan,
        state: { ...exactPreviewPlan.salesCyclePlan.state, preview: forgedPreview },
        effectReadiness: [cartReadyReadiness, forgedPreviewReadiness],
      },
    }, now)).rejects.toThrow("ORDER_PREVIEW_TRANSITION_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const previewLockedBundle = cipher.encryptJson(
      exactPreviewPlan.salesCyclePlan.state,
      `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`,
      salesExpiresAt,
    );
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_revision: "5",
      state_ciphertext: previewLockedBundle.ciphertext,
      state_nonce: previewLockedBundle.nonce,
      state_auth_tag: previewLockedBundle.authTag,
      state_encrypted_dek: previewLockedBundle.encryptedDek,
      state_key_ref: previewLockedBundle.keyRef,
    };
    const confirmHandoffCommandId = "sales:event-2:confirm-handoff";
    const exactConfirmationHandoffPlan = {
      ...exactPreviewPlan,
      salesCyclePlan: {
        expectedRevision: 5,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1" as const,
        sourceMessageIdHash,
        canonicalBuyingIntent: canonicalIntent,
        state: {
          ...exactPreviewPlan.salesCyclePlan.state,
          ...salesEnvelope(6, "HANDED_OFF", [
            ...exactPreviewPlan.salesCyclePlan.state.processedCommandIds,
            confirmHandoffCommandId,
          ]),
          preview: null,
        },
        cartExpiresAt: salesExpiresAt,
        expiresAt: salesExpiresAt,
        events: [{
          commandId: confirmHandoffCommandId,
          commandKind: "CONFIRM_PURCHASE" as const,
          outcome: "HANDOFF" as const,
          stateRevisionBefore: 5,
          stateRevisionAfter: 6,
          stageBefore: "ORDER_PREVIEW",
          stageAfter: "HANDED_OFF",
          cartId,
          cartVersion: readyCart.revision,
          reasonCode: "STOCK_CHANGED_BEFORE_CONFIRMATION",
          occurredAt: now,
        }],
        effectClaimSets: [],
        effectReadiness: [],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(exactConfirmationHandoffPlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    const exactConfirmation = deriveCanonicalPurchaseConfirmationV1({
      conversationKey: exactPreviewPlan.salesCyclePlan.state.conversationKey,
      cart: readyCart,
      preview: {
        previewId: exactPreview.previewId,
        previewHash: exactPreview.previewHash,
      },
      sourceMessageId,
      confirmedAt: now,
    });
    const confirmationEvidence = {
      schemaVersion: 1 as const,
      authorityVersion: "DETERMINISTIC_CONFIRMATION_EVIDENCE_V1" as const,
      classifierVersion: "LEGACY_CONFIRMATION_V1" as const,
      decision: "CONFIRM" as const,
      reasonCode: "CONFIRMATION_DETERMINISTIC_MATCH" as const,
      sourceMessageIdHash,
      evidenceHash: sha256([
        sourceMessageIdHash,
        "LEGACY_CONFIRMATION_V1",
        "CONFIRM",
        "CONFIRMATION_DETERMINISTIC_MATCH",
      ]),
      evaluatedAt,
      authorization: "NONE" as const,
    };
    const confirmationCartReadiness = resealReadinessV1(cartReadyReadiness, {
      salesCycleRevision: 5,
    }, { parentReadinessHash: null });
    const confirmationPreviewReadiness = resealReadinessV1(previewReadiness, {
      salesCycleRevision: 5,
    }, { parentReadinessHash: confirmationCartReadiness.readinessHash });
    const confirmationReadiness = resealReadinessV1(confirmationPreviewReadiness, {
      effect: "PURCHASE_CONFIRMATION_READY",
      deterministicEvidenceHash: sha256(confirmationEvidence),
    }, { parentReadinessHash: confirmationPreviewReadiness.readinessHash });
    const exactConfirmationPlan = {
      ...exactPreviewPlan,
      salesCyclePlan: {
        expectedRevision: 5,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1" as const,
        sourceMessageIdHash,
        canonicalBuyingIntent: canonicalIntent,
        deterministicConfirmationEvidence: confirmationEvidence,
        state: {
          ...exactPreviewPlan.salesCyclePlan.state,
          ...salesEnvelope(6, "PURCHASE_CONFIRMED", [
            ...exactPreviewPlan.salesCyclePlan.state.processedCommandIds,
            "sales:event-2:confirm",
          ]),
          confirmation: exactConfirmation,
        },
        cartExpiresAt: salesExpiresAt,
        expiresAt: salesExpiresAt,
        events: [{
          commandId: "sales:event-2:confirm",
          commandKind: "CONFIRM_PURCHASE" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 5,
          stateRevisionAfter: 6,
          stageBefore: "ORDER_PREVIEW",
          stageAfter: "PURCHASE_CONFIRMED",
          cartId,
          cartVersion: readyCart.revision,
          reasonCode: null,
          occurredAt: now,
        }],
        effectClaimSets: [
          { effect: "CART_READY" as const, claims: cartReadyClaims },
          { effect: "PREVIEW_READY" as const, claims: cartReadyClaims },
          { effect: "PURCHASE_CONFIRMATION_READY" as const, claims: cartReadyClaims },
        ],
        effectReadiness: [
          confirmationCartReadiness,
          confirmationPreviewReadiness,
          confirmationReadiness,
        ],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(exactConfirmationPlan, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...exactConfirmationPlan,
      salesCyclePlan: {
        ...exactConfirmationPlan.salesCyclePlan,
        state: {
          ...exactConfirmationPlan.salesCyclePlan.state,
          confirmation: {
            ...exactConfirmation,
            confirmationId: "10000000-0000-4000-8000-000000000099",
          },
        },
      },
    }, now)).rejects.toThrow("PURCHASE_CONFIRMATION_TRANSITION_REPLAY_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const confirmedLockedBundle = cipher.encryptJson(
      exactConfirmationPlan.salesCyclePlan.state,
      `lana:sales-cycle:v1:page-1:${commitInput.conversationId}`,
      salesExpiresAt,
    );
    lockedSalesRow = {
      ...mutationLockedSalesRow,
      state_revision: "6",
      state_ciphertext: confirmedLockedBundle.ciphertext,
      state_nonce: confirmedLockedBundle.nonce,
      state_auth_tag: confirmedLockedBundle.authTag,
      state_encrypted_dek: confirmedLockedBundle.encryptedDek,
      state_key_ref: confirmedLockedBundle.keyRef,
    };
    const receiptCommandId = "sales:event-3:payment-receipt";
    const paymentReceiptHandoff = {
      ...exactConfirmationPlan,
      salesCyclePlan: {
        expectedRevision: 6,
        readinessContractVersion: "DF06_EFFECT_READINESS_V1" as const,
        sourceMessageIdHash,
        canonicalBuyingIntent: canonicalIntent,
        state: {
          ...exactConfirmationPlan.salesCyclePlan.state,
          ...salesEnvelope(7, "HANDED_OFF", [
            ...exactConfirmationPlan.salesCyclePlan.state.processedCommandIds,
            receiptCommandId,
          ]),
        },
        cartExpiresAt: salesExpiresAt,
        expiresAt: salesExpiresAt,
        events: [{
          commandId: receiptCommandId,
          commandKind: "PAYMENT_RECEIPT_RECEIVED" as const,
          outcome: "HANDOFF" as const,
          stateRevisionBefore: 6,
          stateRevisionAfter: 7,
          stageBefore: "PURCHASE_CONFIRMED",
          stageAfter: "HANDED_OFF",
          cartId,
          cartVersion: readyCart.revision,
          reasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED",
          occurredAt: now,
        }],
        effectClaimSets: [],
        effectReadiness: [],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(paymentReceiptHandoff, now))
      .resolves.toMatchObject({ stateCommitted: true });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");

    await expect(store.commit({
      ...paymentReceiptHandoff,
      salesCyclePlan: {
        ...paymentReceiptHandoff.salesCyclePlan,
        state: {
          ...paymentReceiptHandoff.salesCyclePlan.state,
          confirmation: null,
        },
      },
    }, now)).rejects.toThrow("PROTECTED_SALES_STATE_EVENT_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");
    lockedSalesRow = mutationLockedSalesRow;

    const changedCartWithoutNewReadiness = {
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          revision: 3,
          cart: { value: {
            ...exactCart,
            updatedAt: "2026-08-13T03:00:01.000Z",
          } },
        },
      },
    };
    await expect(store.commit(changedCartWithoutNewReadiness, now))
      .rejects.toThrow("EFFECT_READINESS_CART_STATE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const mislabeledProtectedState = {
      ...exactMutation,
      salesCyclePlan: {
        expectedRevision: exactMutation.salesCyclePlan.expectedRevision,
        state: exactMutation.salesCyclePlan.state,
        cartExpiresAt: exactMutation.salesCyclePlan.cartExpiresAt,
        expiresAt: exactMutation.salesCyclePlan.expiresAt,
        events: [{
          commandId: "sales:event-2:facts",
          commandKind: "FACTS_PRESENTED" as const,
          outcome: "APPLIED" as const,
          stateRevisionBefore: 2,
          stateRevisionAfter: 3,
          stageBefore: "CART_OPEN",
          stageAfter: "CART_OPEN",
          cartId,
          cartVersion: exactCart.revision,
          reasonCode: null,
          occurredAt: now,
        }],
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    await expect(store.commit(mislabeledProtectedState, now))
      .rejects.toThrow("PROTECTED_SALES_STATE_EVENT_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const matchedFact = {
      status: "MATCHED" as const,
      sourceVersionBefore: "fact-v1",
      sourceVersionAfter: "fact-v1",
      checkedAt: evaluatedAt,
    };
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        state: {
          ...exactMutation.salesCyclePlan.state,
          preview: {
            schemaVersion: 1 as const,
            previewId: "10000000-0000-4000-8000-000000000030",
            previewHash: `sha256:${"f".repeat(64)}` as const,
            cartId,
            cartVersion: exactCart.revision,
            stage: "ORDER_PREVIEW" as const,
            recipient: {
              fullName: "Khach Hang",
              phone: "0900000000",
              address: "Ha Noi city",
              retentionClass: "CART_48H_OPERATIONAL" as const,
            },
            payment: { method: "COD" as const, bankTransferPolicyRef: null },
            revalidation: {
              cartId,
              cartVersion: exactCart.revision,
              price: matchedFact,
              inventory: matchedFact,
              size: matchedFact,
              eta: matchedFact,
              eligible: true,
              checkedAt: evaluatedAt,
            },
            createdAt: evaluatedAt,
            expiresAt: "2026-08-13T03:01:00.000Z",
          },
        },
      },
    }, now)).rejects.toThrow("ORDER_PREVIEW_HASH_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const { cartMutationBatchEvidence: _omittedEvidence, ...planWithoutMutationEvidence } =
      exactMutation.salesCyclePlan;
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: planWithoutMutationEvidence,
    }, now)).rejects.toThrow("CART_MUTATION_BATCH_REQUIRED");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const claimsForWrongOffer = claims.map((claim) => ({
      ...claim,
      scope: { ...claim.scope, variantId: "WRONG-OFFER" },
    }));
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        effectClaimSets: [{ effect: "CART_MUTATION", claims: claimsForWrongOffer }],
        effectReadiness: exactMutation.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, {
          claimSetHash: sha256(claimsForWrongOffer),
          })
        ),
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_CLAIM_VALUE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const claimsForWrongPrice = claims.map((claim) => claim.type === "PRICE"
      ? { ...claim, value: { amountVnd: 1, currency: "VND" as const } }
      : claim);
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        effectClaimSets: [{ effect: "CART_MUTATION", claims: claimsForWrongPrice }],
        effectReadiness: exactMutation.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, {
          claimSetHash: sha256(claimsForWrongPrice),
          })
        ),
      },
    }, now)).rejects.toThrow("EFFECT_READINESS_CLAIM_VALUE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        events: exactMutation.salesCyclePlan.events.map((event) => ({
          ...event,
          mutationAction: "REMOVE_LINE" as const,
        })),
      },
    }, now)).rejects.toThrow("CART_MUTATION_RECEIPT_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        events: exactMutation.salesCyclePlan.events.map((event) => ({
          ...event,
          mutationPayloadHash: "f".repeat(64),
        })),
      },
    }, now)).rejects.toThrow("CART_MUTATION_RECEIPT_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const wrongOfferAuthorityDraft = {
      ...authority,
      offerId: "WRONG-OFFER",
      bindingHash: "0".repeat(64),
    };
    const wrongOfferAuthority = {
      ...wrongOfferAuthorityDraft,
      bindingHash: rawSha256(
        cartMutationAuthorityBindingHashPreimageV1(wrongOfferAuthorityDraft),
      ),
    };
    const wrongOfferReceiptDraft = {
      ...mutationEvidence,
      authority: wrongOfferAuthority,
      evidenceHash: "0".repeat(64),
    };
    const wrongOfferReceipt = {
      ...wrongOfferReceiptDraft,
      evidenceHash: rawSha256(cartMutationReceiptHashPreimageV1(wrongOfferReceiptDraft)),
    };
    const wrongOfferBatchDraft = {
      ...mutationBatchEvidence,
      receipts: [wrongOfferReceipt],
      evidenceHash: "0".repeat(64),
    };
    const wrongOfferBatch = {
      ...wrongOfferBatchDraft,
      evidenceHash: rawSha256(cartMutationBatchEvidenceHashPreimageV1(wrongOfferBatchDraft)),
    };
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        cartMutationBatchEvidence: wrongOfferBatch,
        effectReadiness: exactMutation.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, {
            deterministicEvidenceHash: wrongOfferReceipt.evidenceHash,
          })
        ),
      },
    }, now)).rejects.toThrow("CART_MUTATION_AUTHORITY_SCOPE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const wrongBeforeEvidence = {
      ...mutationEvidence,
      beforeCartStateHash: "9".repeat(64),
      evidenceHash: "0".repeat(64),
    };
    const wrongBeforeEvidenceWithHash = {
      ...wrongBeforeEvidence,
      evidenceHash: rawSha256(cartMutationReceiptHashPreimageV1(wrongBeforeEvidence)),
    };
    const wrongBeforeBatch = {
      ...mutationBatchEvidence,
      initialCartStateHash: wrongBeforeEvidenceWithHash.beforeCartStateHash,
      receipts: [wrongBeforeEvidenceWithHash],
      evidenceHash: "0".repeat(64),
    };
    const wrongBeforeBatchWithHash = {
      ...wrongBeforeBatch,
      evidenceHash: rawSha256(cartMutationBatchEvidenceHashPreimageV1(wrongBeforeBatch)),
    };
    await expect(store.commit({
      ...exactMutation,
      salesCyclePlan: {
        ...exactMutation.salesCyclePlan,
        cartMutationBatchEvidence: wrongBeforeBatchWithHash,
        effectReadiness: exactMutation.salesCyclePlan.effectReadiness.map((readiness) =>
          resealReadinessV1(readiness, {
          deterministicEvidenceHash: wrongBeforeEvidenceWithHash.evidenceHash,
          })
        ),
      },
    }, now)).rejects.toThrow("CART_MUTATION_TRANSITION_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const messages = [{ kind: "TEXT" as const, text: "Xác nhận giỏ hàng." }];
    const parentReadiness = exactMutation.salesCyclePlan.effectReadiness[0]!;
    const metaReadiness = sealReadinessV1({
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "PROTECTED_OUTBOUND",
      outcome: "READY",
      pageId: "page-1",
      conversationId: commitInput.conversationId,
      sourceMessageIdHash,
      conversationRevision: 4,
      salesCycleRevision: 2,
      productIds: ["SP-001"],
      cartId,
      cartVersion: exactCart.revision,
      cartStateHash: afterCartStateHash,
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: null,
      deterministicEvidenceHash: sha256(messages),
      claimSetHash: sha256(claims),
      protectedClaimTypes: ["PRICE", "STOCK"],
      checkedAt: evaluatedAt,
      expiresAt: "2026-08-13T03:01:00.000Z",
      reasonCodes: [],
      authorization: "NONE",
    }, {
      offerBindings: canonicalCartOfferBindingsV1(exactCart.lines),
      parentReadinessHash: parentReadiness.readinessHash,
      payloadHash: sha256(messages),
    });
    const commerceCommit = {
      ...exactMutation,
      metaPlan: {
        replyPlanId: "10000000-0000-4000-8000-000000000031",
        responseGroupId: "10000000-0000-4000-8000-000000000032",
        recipientId: "customer-1",
        messages,
        sourceMessageIdHash,
        protectedClaims: claims,
        protectedClaimTypes: ["PRICE" as const, "STOCK" as const],
        effectReadiness: metaReadiness,
      },
    } satisfies RealtimeCommitInput<unknown, unknown>;
    const {
      effectReadiness: _metaReadiness,
      protectedClaims: _metaClaims,
      protectedClaimTypes: _metaClaimTypes,
      sourceMessageIdHash: _metaSource,
      ...unmarkedMetaPlan
    } = commerceCommit.metaPlan;
    await expect(store.commit({
      ...commerceCommit,
      metaPlan: unmarkedMetaPlan,
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_READINESS_REQUIRED");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const wrongMetaOfferClaims = claims.map((claim) => ({
      ...claim,
      scope: { ...claim.scope, variantId: "WRONG-OFFER" },
    }));
    await expect(store.commit({
      ...commerceCommit,
      metaPlan: {
        ...commerceCommit.metaPlan,
        protectedClaims: wrongMetaOfferClaims,
        effectReadiness: resealReadinessV1(metaReadiness, {
          claimSetHash: sha256(wrongMetaOfferClaims),
        }),
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_CLAIM_VALUE_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    const independentMetaClaims = priceOnlyClaims;
    await expect(store.commit({
      ...commerceCommit,
      metaPlan: {
        ...commerceCommit.metaPlan,
        protectedClaims: independentMetaClaims,
        protectedClaimTypes: ["PRICE" as const],
        effectReadiness: resealReadinessV1(metaReadiness, {
          claimSetHash: sha256(independentMetaClaims),
          protectedClaimTypes: ["PRICE"],
        }, {
          parentReadinessHash: "f".repeat(64),
        }),
      },
    }, now)).rejects.toThrow("PROTECTED_OUTBOUND_SALES_READINESS_MISMATCH");
    expect(calls.at(-1)?.trim()).toBe("ROLLBACK");

    await expect(store.commit(commerceCommit, now)).resolves.toMatchObject({
      stateCommitted: true,
      metaOutboxCreated: 1,
    });
    expect(calls.at(-1)?.trim()).toBe("COMMIT");
  });

  it("records a terminal initial-reply failure in the same transaction", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("UPDATE meta_outbox")) {
          return {
            rowCount: 1,
            rows: [{
              reply_plan_id: "10000000-0000-4000-8000-000000000001",
              sequence_no: 0,
              updated_at: new Date("2026-07-29T10:00:10.000Z"),
            }],
          };
        }
        if (sql.includes("UPDATE acquisition_sessions") && sql.includes("initial_reply_terminal_status")) {
          return {
            rowCount: 1,
            rows: [{
              acquisition_session_id: "10000000-0000-4000-8000-000000000002",
              page_id: "page-1",
              conversation_id: "10000000-0000-4000-8000-000000000003",
              customer_hash: "a".repeat(64),
              entry_message_pk: "10000000-0000-4000-8000-000000000004",
              entry_message_occurred_at: new Date("2026-07-29T10:00:00.000Z"),
              initial_reply_plan_id: "10000000-0000-4000-8000-000000000001",
              initial_reply_accepted_at: null,
              max_stage_reached: "UNQUALIFIED_ENTRY",
              current_disposition: "ACTIVE",
              derivation_version: "ad-acquisition-v1",
            }],
          };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
    };

    const changed = await store.markMetaTerminal(
      "10000000-0000-4000-8000-000000000005",
      "10000000-0000-4000-8000-000000000006",
      "FAILED_PERMANENT",
      "META_REJECTED",
    );

    expect(changed).toBe(true);
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    const held = calls.find((call) => call.values.includes("META_PREDECESSOR_FAILED_PERMANENT"));
    expect(held?.sql).toContain("sequence_no > $2");
    expect(calls.some((call) => call.sql.includes("BOT_INITIAL_AD_REPLY_SEND_FAILED"))).toBe(false);
    const event = calls.find((call) => call.sql.includes("INSERT INTO conversation_events"));
    expect(event?.values).toContain("BOT_INITIAL_AD_REPLY_SEND_FAILED");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });
});

describe("PostgresRealtimeRuntimeStore response-group gate", () => {
  it("persists a durable decision and prevents terminal snapshots from being overwritten", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const row = {
      response_group_id: "50000000-0000-4000-8000-000000000003",
      source: "PANCAKE" as const,
      status: "ALLOWED",
      reason_code: null,
      blocking_tag: null,
      observed_at: new Date("2026-07-31T16:40:59.000Z"),
      attempt_count: 2,
      expires_at: new Date("2026-07-31T16:45:59.000Z"),
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        return { rowCount: 1, rows: [row] };
      },
      async end() {},
    };

    const existing = await store.readMetaResponseGroupGate(row.response_group_id);
    const recorded = await store.recordMetaResponseGroupGate({
      responseGroupId: row.response_group_id,
      replyPlanId: "50000000-0000-4000-8000-000000000002",
      conversationId: "50000000-0000-4000-8000-000000000001",
      pageId: "1198992073286645",
      observation: {
        status: "BLOCKED",
        reasonCode: "PANCAKE_BLOCKING_TAG_NHAN_VIEN",
        blockingTag: "NHAN_VIEN",
        observedAt: new Date("2026-07-31T16:41:00.008Z"),
      },
    });

    expect(existing).toEqual(recorded);
    expect(existing).toMatchObject({
      source: "PANCAKE",
      status: "ALLOWED",
      attemptCount: 2,
      expiresAt: new Date("2026-07-31T16:45:59.000Z"),
    });
    expect(calls[0]?.sql).toContain("WHERE response_group_id = $1");
    expect(calls[1]?.sql).toContain("ON CONFLICT (response_group_id) DO UPDATE");
    expect(calls[1]?.sql).toContain("meta_response_group_gates.status = 'UNVERIFIED'");
    expect(calls[1]?.values[4]).toBe("BLOCKED");
    expect(calls[1]?.values[6]).toBe("NHAN_VIEN");
  });
});

describe("PostgresRealtimeRuntimeStore outbox compatibility ordering and health", () => {
  const createStore = () => new PostgresRealtimeRuntimeStore(
    "postgresql://unused:unused@localhost:5432/unused",
    new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
  );

  it("claims preserved handoff output after owner transition and delays its tag dependency", async () => {
    const calls: string[] = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string) {
        calls.push(sql);
        return { rowCount: 0, rows: [] };
      },
    };

    expect(await store.claimMetaOutbox("worker-1", 30_000)).toBeNull();
    expect(await store.claimPancakeTagOutbox("tag-worker-1", 30_000)).toBeNull();

    expect(calls[0]).toContain("OR outbox.send_after_owner_handoff = true");
    expect(calls[0]).toContain("prior.status NOT IN");
    expect(calls[1]).toContain("after_response_group_id IS NULL");
    expect(calls[1]).toContain("dependency.status IN ('PENDING', 'RETRYABLE', 'SENDING')");
  });

  it("holds every descendant when a predecessor enters manual review", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("WHERE outbox_id = $1") && sql.includes("RETURNING reply_plan_id")) {
          return {
            rowCount: 1,
            rows: [{
              reply_plan_id: "10000000-0000-4000-8000-000000000001",
              sequence_no: 0,
            }],
          };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    };
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
    };

    expect(await store.markMetaManualReview(
      "10000000-0000-4000-8000-000000000005",
      "10000000-0000-4000-8000-000000000006",
      "META_AMBIGUOUS_PROVIDER_RESULT",
    )).toBe(true);

    const held = calls.find((call) =>
      call.sql.includes("META_PREDECESSOR_MANUAL_REVIEW"));
    expect(held?.sql).toContain("sequence_no > $2");
    expect(held?.sql).toContain("status IN ('PENDING', 'RETRYABLE')");
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });

  it("quarantines expired sending leases once and holds descendants", async () => {
    const calls: string[] = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string) {
        calls.push(sql);
        return { rowCount: 1, rows: [{ quarantined_count: "1" }] };
      },
    };

    expect(await store.quarantineExpiredMetaSending()).toBe(1);
    expect(calls[0]).toContain("META_SENDING_LEASE_EXPIRED");
    expect(calls[0]).toContain("META_PREDECESSOR_AMBIGUOUS");
    expect(calls[0]).toContain("FROM expired");
  });

  it("returns a PII-free aggregate queue snapshot", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const store = createStore();
    (store as unknown as { pool: unknown }).pool = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        return { rows: [{
          actionable_count: "2",
          sending_count: "1",
          expired_sending_count: "1",
          manual_review_count: "3",
          stuck_descendant_count: "0",
          oldest_actionable_age_seconds: "45.5",
          oldest_manual_review_age_seconds: "90",
        }] };
      },
    };

    expect(await store.readMetaOutboxHealth("page-1")).toEqual({
      pageId: "page-1",
      actionableCount: 2,
      sendingCount: 1,
      expiredSendingCount: 1,
      manualReviewCount: 3,
      stuckDescendantCount: 0,
      oldestActionableAgeSeconds: 45.5,
      oldestManualReviewAgeSeconds: 90,
    });
    expect(calls[0]?.values).toEqual(["page-1"]);
    expect(calls[0]?.sql).not.toMatch(/ciphertext|recipient|customer_hash/iu);
  });
});

describe("PostgresRealtimeRuntimeStore manual-review operator action", () => {
  it("supports audited cancel-only resolution and never requeues", async () => {
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    let firstUpdate = true;
    const client = {
      async query(sql: string, values: readonly unknown[] = []) {
        calls.push({ sql, values });
        if (sql.includes("SELECT page_id") && sql.includes("response_group_id")) {
          return {
            rowCount: 1,
            rows: [{
              page_id: "page-1",
              reviewable: firstUpdate,
              already_cancelled: !firstUpdate,
            }],
          };
        }
        if (sql.includes("UPDATE meta_outbox")) {
          const rowCount = firstUpdate ? 2 : 0;
          firstUpdate = false;
          return { rowCount, rows: [] };
        }
        return { rowCount: 1, rows: [] };
      },
      release() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = {
      async connect() { return client; },
    };
    const groupId = "10000000-0000-4000-8000-000000000099";

    expect(await store.cancelMetaResponseGroup(
      groupId,
      "operator-1",
      "PROVIDER_AMBIGUITY_REVIEWED",
    )).toMatchObject({ cancelledCount: 2, changed: true });
    expect(await store.cancelMetaResponseGroup(
      groupId,
      "operator-1",
      "PROVIDER_AMBIGUITY_REVIEWED",
    )).toMatchObject({ cancelledCount: 0, changed: false });

    expect(calls.some((call) => call.sql.includes("bool_or(status IN"))).toBe(true);
    const update = calls.find((call) => call.sql.includes("UPDATE meta_outbox"));
    expect(update?.sql).toContain("SET status = 'FAILED_PERMANENT'");
    expect(update?.sql).not.toContain("'PENDING' AS");
    const audits = calls.filter((call) =>
      call.sql.includes("META_RESPONSE_GROUP_CANCELLED"));
    expect(audits).toHaveLength(1);
    expect(audits[0]?.values).toContain("operator-1");
  });
});

describe("PostgresRealtimeRuntimeStore markMetaAccepted", () => {
  type OutboxStatus = "SENDING" | "RETRYABLE" | "SENT_ACCEPTED" | "AMBIGUOUS" | "FAILED_PERMANENT" | "MANUAL_REVIEW";
  type OutboxState = {
    outboxId: string;
    status: OutboxStatus;
    leaseToken: string;
    lastErrorCode: string | null;
    providerMessageId: string | null;
    nextAttemptAt: string | null;
    attemptCount: number;
  };

  const createStore = (overrides: Partial<OutboxState> = {}) => {
    const state: OutboxState = {
      outboxId: "10000000-0000-4000-8000-000000000005",
      status: "SENDING",
      leaseToken: "10000000-0000-4000-8000-000000000006",
      lastErrorCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      providerMessageId: null,
      nextAttemptAt: "2026-08-05T10:00:00.000Z",
      attemptCount: 2,
      ...overrides,
    };
    const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
    const query = async (sql: string, values: readonly unknown[] = []) => {
        calls.push({ sql, values });
        if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql.trim())) {
          return { rowCount: 0, rows: [] };
        }
        if (sql.includes("INSERT INTO audit_log")) {
          return { rowCount: 1, rows: [] };
        }
        if (sql.includes("SET status = 'SENT_ACCEPTED'")) {
          const [outboxId, leaseToken, providerMessageId] = values as [
            string,
            string,
            string,
          ];
          if (
            state.outboxId !== outboxId
            || state.status !== "SENDING"
            || state.leaseToken !== leaseToken
          ) {
            return { rowCount: 0, rows: [] };
          }
          const priorErrorCode = state.lastErrorCode;
          state.status = "SENT_ACCEPTED";
          state.providerMessageId = providerMessageId;
          state.lastErrorCode = null;
          state.nextAttemptAt = null;
          return {
            rowCount: 1,
            rows: [{ prior_error_code: priorErrorCode, attempt_count: state.attemptCount }],
          };
        }
        if (sql.includes("SET status = 'RETRYABLE'")) {
          const [outboxId, leaseToken, , errorCode] = values as [
            string,
            string,
            number,
            string,
          ];
          if (
            state.outboxId !== outboxId
            || state.status !== "SENDING"
            || state.leaseToken !== leaseToken
          ) {
            return { rowCount: 0, rows: [] };
          }
          state.status = "RETRYABLE";
          state.lastErrorCode = errorCode;
          state.nextAttemptAt = "scheduled";
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
    };
    const client = { query, release() {} };
    const pool = {
      query,
      async connect() { return client; },
      async end() {},
    };
    const store = new PostgresRealtimeRuntimeStore(
      "postgresql://unused:unused@localhost:5432/unused",
      new LocalEnvelopeCipher("00".repeat(32), "test-key-v1"),
    );
    (store as unknown as { pool: unknown }).pool = pool;
    return { store, state, calls };
  };

  it("clears a prior attempt error atomically with accepted status", async () => {
    const { store, state, calls } = createStore();

    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-accepted",
    )).toBe(true);
    expect(state).toMatchObject({
      status: "SENT_ACCEPTED",
      providerMessageId: "mid-accepted",
      lastErrorCode: null,
      nextAttemptAt: null,
      attemptCount: 2,
    });
    const update = calls.find((call) => call.sql.includes("SET status = 'SENT_ACCEPTED'"));
    expect(update?.sql).toContain("last_error_code = NULL");
    expect(update?.sql).toContain("next_attempt_at = NULL");
    const audit = calls.find((call) => call.sql.includes("INSERT INTO audit_log"));
    expect(audit?.values[1]).toContain("PANCAKE_CONVERSATION_NOT_FOUND");
    expect(audit?.values[1]).toContain("attempt_count");
    expect(calls[0]?.sql.trim()).toBe("BEGIN");
    expect(calls.at(-1)?.sql.trim()).toBe("COMMIT");
  });

  it("keeps an already-null error null and rejects an acceptance replay", async () => {
    const { store, state, calls } = createStore({ lastErrorCode: null });

    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-first",
    )).toBe(true);
    expect(await store.markMetaAccepted(
      state.outboxId,
      state.leaseToken,
      "mid-replay",
    )).toBe(false);
    expect(state).toMatchObject({
      status: "SENT_ACCEPTED",
      providerMessageId: "mid-first",
      lastErrorCode: null,
      nextAttemptAt: null,
    });
    expect(calls.filter((call) => call.sql.includes("INSERT INTO audit_log"))).toHaveLength(0);
  });

  it("preserves errors for retryable and rejected acceptance paths", async () => {
    const retry = createStore();
    expect(await retry.store.markMetaRetryable(
      retry.state.outboxId,
      retry.state.leaseToken,
      "META_TRANSPORT_TIMEOUT",
      2,
    )).toBe(true);
    expect(await retry.store.markMetaAccepted(
      retry.state.outboxId,
      retry.state.leaseToken,
      "mid-too-late",
    )).toBe(false);
    expect(retry.state).toMatchObject({
      status: "RETRYABLE",
      lastErrorCode: "META_TRANSPORT_TIMEOUT",
      nextAttemptAt: "scheduled",
    });

    const stale = createStore();
    expect(await stale.store.markMetaAccepted(
      stale.state.outboxId,
      "stale-lease-token",
      "mid-stale",
    )).toBe(false);
    expect(stale.state).toMatchObject({
      status: "SENDING",
      lastErrorCode: "PANCAKE_CONVERSATION_NOT_FOUND",
      providerMessageId: null,
      nextAttemptAt: "2026-08-05T10:00:00.000Z",
    });
  });

  it("does not clear errors when acceptance is attempted for any non-success state", async () => {
    for (const status of [
      "RETRYABLE",
      "AMBIGUOUS",
      "FAILED_PERMANENT",
      "MANUAL_REVIEW",
    ] as const) {
      const { store, state } = createStore({ status });
      expect(await store.markMetaAccepted(
        state.outboxId,
        state.leaseToken,
        "mid-invalid",
      )).toBe(false);
      expect(state.lastErrorCode).toBe("PANCAKE_CONVERSATION_NOT_FOUND");
    }
  });
});
