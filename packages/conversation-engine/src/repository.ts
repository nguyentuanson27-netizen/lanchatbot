import type { ConversationState } from "./types.js";

export interface ConversationStateRepository {
  load(conversationId: string): Promise<ConversationState | null>;
  create(state: ConversationState): Promise<void>;
  save(
    state: ConversationState,
    expectedRevision: number,
    expectedFence: number,
  ): Promise<void>;
}

const clone = (state: ConversationState): ConversationState =>
  JSON.parse(JSON.stringify(state)) as ConversationState;

/**
 * Deterministic fake of PostgreSQL revision + fencing guards. Redis locking is
 * not sufficient: every durable write must still pass this compare-and-swap.
 */
export class InMemoryConversationStateRepository implements ConversationStateRepository {
  private readonly records = new Map<string, ConversationState>();

  async load(conversationId: string): Promise<ConversationState | null> {
    const state = this.records.get(conversationId);
    return state === undefined ? null : clone(state);
  }

  async create(state: ConversationState): Promise<void> {
    if (this.records.has(state.conversationId)) throw new Error("CONVERSATION_ALREADY_EXISTS");
    this.records.set(state.conversationId, clone(state));
  }

  async save(
    state: ConversationState,
    expectedRevision: number,
    expectedFence: number,
  ): Promise<void> {
    const current = this.records.get(state.conversationId);
    if (current === undefined) throw new Error("CONVERSATION_NOT_FOUND");
    if (current.revision !== expectedRevision) throw new Error("STATE_REVISION_CONFLICT");
    if (expectedFence < current.lastFence) throw new Error("STALE_FENCE");
    if (state.revision !== expectedRevision + 1) throw new Error("STATE_REVISION_INCREMENT_REQUIRED");
    if (state.lastFence !== expectedFence) throw new Error("STATE_FENCE_MISMATCH");
    this.records.set(state.conversationId, clone(state));
  }
}
