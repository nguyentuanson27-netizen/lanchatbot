import type { ClaimedPancakeTagOutbox } from "@lana/database";
import type {
  ManagedPancakeTag,
  PancakeTagApplyResult,
  PancakeTagRemoveResult,
} from "@lana/pancake-handoff";

export interface PancakeTagDispatchStore {
  claimPancakeTagOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedPancakeTagOutbox | null>;
  markPancakeTagApplied(
    operationId: string,
    leaseToken: string,
  ): Promise<boolean>;
  markPancakeTagRetryable(
    operationId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean>;
  markPancakeTagPermanent(
    operationId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean>;
}

export interface PancakeTagApplyPort {
  ensureDesiredTag(
    pageId: string,
    conversationId: string,
    desiredTag: ManagedPancakeTag,
  ): Promise<PancakeTagApplyResult>;
  ensureTagAbsent(
    pageId: string,
    conversationId: string,
    tag: ManagedPancakeTag,
  ): Promise<PancakeTagRemoveResult>;
}

export class PancakeTagDispatcher {
  constructor(
    private readonly store: PancakeTagDispatchStore,
    private readonly pancake: PancakeTagApplyPort,
    private readonly workerId: string,
    private readonly leaseMs = 30_000,
    private readonly maxAttempts = 10,
  ) {}

  async processOne(): Promise<boolean> {
    const claim = await this.store.claimPancakeTagOutbox(
      this.workerId,
      this.leaseMs,
    );
    if (!claim) return false;
    const result = claim.operation === "REMOVE"
      ? await this.pancake.ensureTagAbsent(
          claim.pageId,
          claim.pancakeConversationId,
          claim.desiredTag,
        )
      : await this.pancake.ensureDesiredTag(
          claim.pageId,
          claim.pancakeConversationId,
          claim.desiredTag,
        );
    if (result.result === "APPLIED") {
      await this.store.markPancakeTagApplied(
        claim.operationId,
        claim.leaseToken,
      );
    } else if (
      result.result === "RETRYABLE" &&
      claim.attemptCount < this.maxAttempts
    ) {
      await this.store.markPancakeTagRetryable(
        claim.operationId,
        claim.leaseToken,
        result.reasonCode,
        Math.min(300, 2 ** claim.attemptCount),
      );
    } else {
      await this.store.markPancakeTagPermanent(
        claim.operationId,
        claim.leaseToken,
        result.reasonCode,
      );
    }
    return true;
  }
}
