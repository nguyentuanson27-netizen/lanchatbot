import { createClient } from "redis";

export interface RealtimeGenerationQuota {
  reserve(pageId: string, now?: Date): Promise<boolean>;
  close(): Promise<void>;
}

export class RedisRealtimeGenerationQuota
  implements RealtimeGenerationQuota
{
  private readonly client: ReturnType<typeof createClient>;

  constructor(
    redisUrl: string,
    private readonly hourlyLimit: number,
    private readonly dailyLimit: number,
  ) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    if (hourlyLimit < 1 || dailyLimit < hourlyLimit) {
      throw new Error("REALTIME_GENERATION_QUOTA_INVALID");
    }
    this.client = createClient({ url: redisUrl });
    this.client.on("error", () => undefined);
  }

  async reserve(pageId: string, now = new Date()): Promise<boolean> {
    if (!this.client.isOpen) await this.client.connect();
    const hour = now.toISOString().slice(0, 13).replace(/[-T]/gu, "");
    const day = now.toISOString().slice(0, 10).replace(/-/gu, "");
    const hourKey = `quota:realtime:${pageId}:hour:${hour}`;
    const dayKey = `quota:realtime:${pageId}:day:${day}`;
    const result = await this.client.eval(
      `local h = tonumber(redis.call('GET', KEYS[1]) or '0')
       local d = tonumber(redis.call('GET', KEYS[2]) or '0')
       if h >= tonumber(ARGV[1]) or d >= tonumber(ARGV[2]) then return 0 end
       h = redis.call('INCR', KEYS[1])
       d = redis.call('INCR', KEYS[2])
       if h == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
       if d == 1 then redis.call('EXPIRE', KEYS[2], 172800) end
       return 1`,
      {
        keys: [hourKey, dayKey],
        arguments: [String(this.hourlyLimit), String(this.dailyLimit)],
      },
    );
    return Number(result) === 1;
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}

