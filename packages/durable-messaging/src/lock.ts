import { randomUUID } from "node:crypto";

export interface ConversationLease {
  readonly key: string;
  readonly ownerId: string;
  readonly token: string;
  readonly fence: number;
  readonly expiresAt: Date;
}

export interface ConversationLock {
  acquire(
    conversationId: string,
    ownerId: string,
    now: Date,
    ttlMs: number,
  ): Promise<ConversationLease | null>;
  renew(lease: ConversationLease, now: Date, ttlMs: number): Promise<ConversationLease | null>;
  release(lease: ConversationLease): Promise<boolean>;
  isCurrent(lease: ConversationLease, now: Date): Promise<boolean>;
}

type MutableLease = {
  key: string;
  ownerId: string;
  token: string;
  fence: number;
  expiresAt: Date;
};

const cloneLease = (lease: ConversationLease): ConversationLease => ({
  ...lease,
  expiresAt: new Date(lease.expiresAt.getTime()),
});

/** Deterministic fake of Redis SET NX PX + monotonic fencing counter. */
export class InMemoryConversationLock implements ConversationLock {
  private readonly leases = new Map<string, MutableLease>();
  private readonly fences = new Map<string, number>();

  async acquire(
    conversationId: string,
    ownerId: string,
    now: Date,
    ttlMs: number,
  ): Promise<ConversationLease | null> {
    const key = `lock:conversation:${conversationId}`;
    const current = this.leases.get(key);
    if (current !== undefined && current.expiresAt.getTime() > now.getTime()) return null;
    const fence = (this.fences.get(key) ?? 0) + 1;
    this.fences.set(key, fence);
    const lease: MutableLease = {
      key,
      ownerId,
      token: randomUUID(),
      fence,
      expiresAt: new Date(now.getTime() + ttlMs),
    };
    this.leases.set(key, lease);
    return cloneLease(lease);
  }

  async renew(
    lease: ConversationLease,
    now: Date,
    ttlMs: number,
  ): Promise<ConversationLease | null> {
    const current = this.leases.get(lease.key);
    if (
      current === undefined ||
      current.token !== lease.token ||
      current.fence !== lease.fence ||
      current.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    current.expiresAt = new Date(now.getTime() + ttlMs);
    return cloneLease(current);
  }

  async release(lease: ConversationLease): Promise<boolean> {
    const current = this.leases.get(lease.key);
    if (
      current === undefined ||
      current.token !== lease.token ||
      current.fence !== lease.fence
    ) {
      return false;
    }
    return this.leases.delete(lease.key);
  }

  async isCurrent(lease: ConversationLease, now: Date): Promise<boolean> {
    const current = this.leases.get(lease.key);
    return (
      current !== undefined &&
      current.token === lease.token &&
      current.fence === lease.fence &&
      current.expiresAt.getTime() > now.getTime()
    );
  }
}

export const RENEW_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`;

export const RELEASE_LOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export interface RedisLockClientPort {
  incr(key: string): Promise<number>;
  setNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  eval(script: string, keys: readonly string[], args: readonly string[]): Promise<number>;
}

/** Production Redis lock adapter port with compare-and-renew/release Lua. */
export class RedisConversationLock implements ConversationLock {
  constructor(private readonly redis: RedisLockClientPort) {}

  async acquire(
    conversationId: string,
    ownerId: string,
    now: Date,
    ttlMs: number,
  ): Promise<ConversationLease | null> {
    const key = `lock:conversation:${conversationId}`;
    const fence = await this.redis.incr(`${key}:fence`);
    const token = `${fence}.${randomUUID()}`;
    const acquired = await this.redis.setNxPx(key, token, ttlMs);
    if (!acquired) return null;
    return { key, ownerId, token, fence, expiresAt: new Date(now.getTime() + ttlMs) };
  }

  async renew(
    lease: ConversationLease,
    now: Date,
    ttlMs: number,
  ): Promise<ConversationLease | null> {
    const renewed = await this.redis.eval(RENEW_LOCK_LUA, [lease.key], [lease.token, String(ttlMs)]);
    return renewed === 1
      ? { ...lease, expiresAt: new Date(now.getTime() + ttlMs) }
      : null;
  }

  async release(lease: ConversationLease): Promise<boolean> {
    return (await this.redis.eval(RELEASE_LOCK_LUA, [lease.key], [lease.token])) === 1;
  }

  async isCurrent(lease: ConversationLease, now: Date): Promise<boolean> {
    return lease.expiresAt.getTime() > now.getTime() && (await this.redis.get(lease.key)) === lease.token;
  }
}
