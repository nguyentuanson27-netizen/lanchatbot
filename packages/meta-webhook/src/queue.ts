import type { InboundMessageV1 } from "@lana/contracts";
import type { RoutingDecision } from "./routing.js";

export interface InboundEnvelopeV1 {
  schemaVersion: 1;
  message: InboundMessageV1;
  routing: RoutingDecision;
  /** Phase 1 gateway never grants permission to send customer messages. */
  customerSendEnabled: false;
}

export interface InboundQueue {
  enqueue(envelope: InboundEnvelopeV1): Promise<void>;
  ready(): Promise<boolean>;
}

/** Safe development adapter. It deliberately performs no provider or network I/O. */
export class MemoryInboundQueue implements InboundQueue {
  readonly items: InboundEnvelopeV1[] = [];

  async enqueue(envelope: InboundEnvelopeV1): Promise<void> {
    this.items.push(envelope);
  }

  async ready(): Promise<boolean> {
    return true;
  }
}

/** Startup-safe adapter: readiness fails and webhook acceptance is refused. */
export class UnavailableInboundQueue implements InboundQueue {
  async enqueue(_envelope: InboundEnvelopeV1): Promise<void> {
    throw new Error("Durable inbound queue is not configured");
  }

  async ready(): Promise<boolean> {
    return false;
  }
}
