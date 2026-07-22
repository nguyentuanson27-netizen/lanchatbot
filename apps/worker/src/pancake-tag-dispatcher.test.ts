import { describe, expect, it, vi } from "vitest";
import type { ClaimedPancakeTagOutbox } from "@lana/database";
import {
  PancakeTagDispatcher,
  type PancakeTagDispatchStore,
} from "./pancake-tag-dispatcher.js";

describe("PancakeTagDispatcher", () => {
  it("marks desired-state tag applied after Pancake reconciliation", async () => {
    const claim: ClaimedPancakeTagOutbox = {
      operationId: "cc92dc97-004f-44c9-95a7-edf1e69889e2",
      leaseToken: "a88d586c-6ffd-4e0d-ab81-5869a054481c",
      pageId: "1198992073286645",
      conversationId: "6a6bc2e7-280e-49f3-8bd6-9ead36c2fdd3",
      pancakeConversationId: "conversation-1",
      desiredTag: "NHAN_VIEN",
      operation: "ADD",
      tagId: "tag-employee",
      attemptCount: 1,
    };
    const store: PancakeTagDispatchStore = {
      claimPancakeTagOutbox: vi.fn(async () => claim),
      markPancakeTagApplied: vi.fn(async () => true),
      markPancakeTagRetryable: vi.fn(async () => true),
      markPancakeTagPermanent: vi.fn(async () => true),
    };
    const dispatcher = new PancakeTagDispatcher(
      store,
      {
        ensureDesiredTag: vi.fn(async () => ({
          result: "APPLIED" as const,
          providerTagId: "tag-employee",
          alreadyPresent: true,
        })),
        ensureTagAbsent: vi.fn(),
      },
      "tag-worker-1",
    );
    expect(await dispatcher.processOne()).toBe(true);
    expect(store.markPancakeTagApplied).toHaveBeenCalledWith(
      claim.operationId,
      claim.leaseToken,
    );
  });

  it("dispatches REMOVE through reconcile-safe tag removal, never ADD", async () => {
    const claim: ClaimedPancakeTagOutbox = {
      operationId: "50cf1370-6437-49b4-b709-f16168c8c24c",
      leaseToken: "eb50f937-e5a3-4f26-9faf-8e6384d17e8d",
      pageId: "1198992073286645",
      conversationId: "6a6bc2e7-280e-49f3-8bd6-9ead36c2fdd3",
      pancakeConversationId: "conversation-1",
      desiredTag: "DA_CHOT_DON",
      operation: "REMOVE",
      tagId: "tag-closed",
      attemptCount: 2,
    };
    const store: PancakeTagDispatchStore = {
      claimPancakeTagOutbox: vi.fn(async () => claim),
      markPancakeTagApplied: vi.fn(async () => true),
      markPancakeTagRetryable: vi.fn(async () => true),
      markPancakeTagPermanent: vi.fn(async () => true),
    };
    const ensureDesiredTag = vi.fn();
    const ensureTagAbsent = vi.fn(async () => ({
      result: "APPLIED" as const,
      providerTagId: "tag-closed",
      alreadyAbsent: true as const,
    }));
    const dispatcher = new PancakeTagDispatcher(
      store,
      { ensureDesiredTag, ensureTagAbsent },
      "tag-worker-1",
    );

    expect(await dispatcher.processOne()).toBe(true);
    expect(ensureDesiredTag).not.toHaveBeenCalled();
    expect(ensureTagAbsent).toHaveBeenCalledWith(
      claim.pageId,
      claim.pancakeConversationId,
      "DA_CHOT_DON",
    );
    expect(store.markPancakeTagApplied).toHaveBeenCalledWith(
      claim.operationId,
      claim.leaseToken,
    );
  });
});
