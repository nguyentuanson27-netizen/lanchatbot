import type { ShadowContextMessage } from "@lana/database";
import { createClient } from "redis";

export interface ChatHistoryAppendInput extends ShadowContextMessage {
  readonly identityKey: string;
}

export interface ChatHistoryPort {
  ready(): Promise<boolean>;
  load(conversationId: string, limit?: number): Promise<readonly ShadowContextMessage[]>;
  append(conversationId: string, input: ChatHistoryAppendInput): Promise<boolean>;
  close(): Promise<void>;
}

export function chatHistoryKey(conversationId: string): string {
  const id = conversationId.trim();
  if (!/^[0-9a-f-]{36}$/iu.test(id)) throw new Error("CHAT_HISTORY_CONVERSATION_ID_INVALID");
  return `history:v1:${id}`;
}

export class RedisChatHistoryStore implements ChatHistoryPort {
  private readonly client: ReturnType<typeof createClient>;

  constructor(
    redisUrl: string,
    private readonly ttlSeconds = 20 * 24 * 60 * 60,
    private readonly maxMessages = 150,
  ) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    if (ttlSeconds < 60 || maxMessages < 1 || maxMessages > 500) {
      throw new Error("CHAT_HISTORY_CONFIG_INVALID");
    }
    this.client = createClient({ url: redisUrl });
    this.client.on("error", () => undefined);
  }

  private async connected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  async ready(): Promise<boolean> {
    try {
      await this.connected();
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async load(
    conversationId: string,
    limit = 30,
  ): Promise<readonly ShadowContextMessage[]> {
    await this.connected();
    const safeLimit = Math.max(1, Math.min(this.maxMessages, Math.trunc(limit)));
    const rows = await this.client.lRange(chatHistoryKey(conversationId), -safeLimit, -1);
    const output: ShadowContextMessage[] = [];
    for (const row of rows) {
      try {
        const value = JSON.parse(row) as Partial<ShadowContextMessage>;
        if (
          (value.direction === "INBOUND" || value.direction === "OUTBOUND") &&
          (value.senderType === "CUSTOMER" || value.senderType === "BOT" ||
            value.senderType === "HUMAN" || value.senderType === "SYSTEM") &&
          typeof value.text === "string" &&
          typeof value.occurredAt === "string" &&
          typeof value.attachmentCount === "number" &&
          (value.messageType === "TEXT" || value.messageType === "IMAGE" ||
            value.messageType === "MIXED" || value.messageType === "EVENT" ||
            value.messageType === "POSTBACK")
        ) {
          output.push(value as ShadowContextMessage);
        }
      } catch {
        // A malformed projection entry is skipped; PostgreSQL remains canonical.
      }
    }
    return output;
  }

  async append(
    conversationId: string,
    input: ChatHistoryAppendInput,
  ): Promise<boolean> {
    await this.connected();
    const listKey = chatHistoryKey(conversationId);
    const dedupKey = `${listKey}:ids`;
    const payload = JSON.stringify({
      direction: input.direction,
      senderType: input.senderType,
      messageType: input.messageType,
      text: input.text.slice(0, 8_000),
      attachmentCount: Math.max(0, Math.min(10, Math.trunc(input.attachmentCount))),
      occurredAt: input.occurredAt,
    } satisfies ShadowContextMessage);
    const inserted = await this.client.eval(
      `if redis.call('SADD', KEYS[2], ARGV[1]) == 0 then return 0 end
       redis.call('RPUSH', KEYS[1], ARGV[2])
       redis.call('LTRIM', KEYS[1], -tonumber(ARGV[3]), -1)
       redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
       redis.call('EXPIRE', KEYS[2], tonumber(ARGV[4]))
       return 1`,
      {
        keys: [listKey, dedupKey],
        arguments: [input.identityKey.slice(0, 256), payload, String(this.maxMessages), String(this.ttlSeconds)],
      },
    );
    return Number(inserted) === 1;
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}
