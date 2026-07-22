import type { InboundEnvelopeV1, InboundQueue } from "@lana/meta-webhook";

export interface DurableInboundStore {
  ready(): Promise<boolean>;
  isOwnMetaMessage?(
    pageId: string,
    providerMessageId: string,
  ): Promise<boolean>;
  enqueue(input: {
    pageId: string;
    metaAppId: string;
    eventKey: string;
    providerMessageId: string | null;
    conversationHash: string;
    occurredAt: Date;
    receivedAt: Date;
    signatureKeyVersion: string;
    eventKind?: "CUSTOMER" | "APP_ECHO" | "PAGE_ECHO";
    envelope: unknown;
  }): Promise<{ inboxId: string; inserted: boolean; status: string }>;
}

/**
 * Production gateway adapter. It only commits verified events to PostgreSQL;
 * it never evaluates AI or sends customer messages in the HTTP request.
 */
export class DurableInboundQueue implements InboundQueue {
  constructor(
    private readonly store: DurableInboundStore,
    private readonly metaAppId: string,
    private readonly signatureKeyVersion: string,
  ) {
    if (!metaAppId.trim()) throw new Error("META_APP_ID_REQUIRED");
    if (!signatureKeyVersion.trim()) {
      throw new Error("META_SIGNATURE_KEY_VERSION_REQUIRED");
    }
  }

  async enqueue(envelope: InboundEnvelopeV1): Promise<void> {
    const message = envelope.message;
    let eventKind: "CUSTOMER" | "APP_ECHO" | "PAGE_ECHO" = "CUSTOMER";
    if (message.isEcho) {
      let ownAcceptedMessage = false;
      if (
        message.appId !== null &&
        message.appId === this.metaAppId
      ) {
        ownAcceptedMessage = true;
      } else if (message.messageId && this.store.isOwnMetaMessage) {
        // A delayed Meta echo may omit app_id. Reconcile its MID against an
        // accepted outbox; lookup failures remain fail-safe PAGE_ECHO.
        ownAcceptedMessage = await this.store
          .isOwnMetaMessage(message.pageId, message.messageId)
          .catch(() => false);
      }
      eventKind = ownAcceptedMessage ? "APP_ECHO" : "PAGE_ECHO";
    }
    await this.store.enqueue({
      pageId: message.pageId,
      metaAppId: this.metaAppId,
      eventKey: message.eventKey,
      providerMessageId: message.messageId,
      conversationHash: message.conversationId,
      occurredAt: new Date(message.occurredAt),
      receivedAt: new Date(),
      signatureKeyVersion: this.signatureKeyVersion,
      eventKind,
      envelope,
    });
  }

  ready(): Promise<boolean> {
    return this.store.ready();
  }
}
