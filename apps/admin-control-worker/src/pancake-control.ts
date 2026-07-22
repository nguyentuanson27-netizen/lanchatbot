import type { PancakeTagObservationV1 } from "@lana/contracts";
import {
  InMemoryPancakePageRegistry,
  PancakeAllowListedClient,
  PancakeHandoffAdapter,
  type PancakeHttpTransport,
  type PancakePageConfig,
} from "@lana/pancake-handoff";
import type {
  ControlTag,
  ControlTagObservation,
  PancakeControlPort,
} from "./types.js";

/**
 * Read-only admin adapter. Every observation uses the production-proven flow:
 * messages v1 -> latest inserted_at -> conversations v2 +/-600s -> exact ID.
 * Mutations are deliberately excluded and go through pancake_tag_outbox.
 */
export class PancakeExactTagReader implements PancakeControlPort {
  private readonly reader: PancakeHandoffAdapter;
  private readonly pages = new Map<string, PancakePageConfig>();

  constructor(
    readTransport: PancakeHttpTransport,
    configs: readonly PancakePageConfig[],
    timeoutMs = 10_000,
    now: () => Date = () => new Date(),
  ) {
    for (const config of configs) this.pages.set(config.pageId, config);
    this.reader = new PancakeHandoffAdapter(
      new PancakeAllowListedClient(readTransport, { timeoutMs }),
      new InMemoryPancakePageRegistry(configs),
      now,
    );
  }

  async observe(pageId: string, conversationId: string): Promise<ControlTagObservation> {
    return normalize(
      await this.reader.observeBlockingTags(pageId, conversationId),
    );
  }

  tagId(pageId: string, tag: ControlTag): string | null {
    const value = this.pages.get(pageId)?.tagIds[tag]?.trim();
    return value ? value : null;
  }
}

function normalize(observation: PancakeTagObservationV1): ControlTagObservation {
  return {
    verified: observation.verified,
    observedTagIds: observation.observedTagIds,
    blockingTag: observation.blockingTag,
    observedAt: observation.observedAt,
    reasonCode: observation.reasonCode,
    customerName: observation.customerName ?? null,
  };
}
