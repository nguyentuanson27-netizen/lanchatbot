import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { LocalEnvelopeCipher } from "./envelope-cipher.js";
import { PostgresRealtimeRuntimeStore } from "./realtime-runtime.js";

const now = new Date("2026-10-15T08:00:00Z");
const source = "current-message", sourceMessageIdHash = createHash("sha256").update(source).digest("hex");
const guard = { conversationId: "conversation", expectedStateVersion: 1, sourceMessageIdHash,
  inboxBatchGuard: { generation: 1, leaseToken: "lease", inboxIds: ["inbox"] } };

function fixture(changes: Partial<{ generation: number; leased: boolean; owner: string; revision: number; route: string; kill: boolean; source: string }> = {}) {
  const current = { generation: 1, leased: true, owner: "BOT", revision: 1, route: "APP", kill: false, source, ...changes };
  let profileRevision = 1;
  const statements: string[] = [];
  const query = vi.fn(async (sql: string, values?: unknown[]) => {
    statements.push(sql);
    if (sql.includes("FROM pages")) return { rowCount: 1, rows: [{ routing_owner: current.route, kill_switch: current.kill, transaction_now: now }] };
    if (sql.includes("SELECT generation")) return { rowCount: current.leased ? 1 : 0, rows: current.leased ? [{ generation: String(current.generation) }] : [] };
    if (sql.includes("AS source_message_id")) return { rowCount: 1, rows: [{ source_message_id: current.source }] };
    if (sql.includes("SELECT conversation_owner")) return { rowCount: current.revision === values?.[3] ? 1 : 0,
      rows: current.revision === values?.[3] ? [{ conversation_owner: current.owner }] : [] };
    if (sql.includes("UPDATE realtime_customer_profiles")) { profileRevision = 2; return { rowCount: 1, rows: [] }; }
    return { rowCount: 0, rows: [] };
  });
  const client = { query, release: vi.fn() };
  const store = new PostgresRealtimeRuntimeStore("postgresql://unused:unused@localhost/unused", new LocalEnvelopeCipher("00".repeat(32), "test"));
  (store as unknown as { pool: unknown }).pool = { query, connect: async () => client };
  const write = () => store.compareAndSwapCustomerProfile("page", "customer", 1,
    { revision: 2, profile: { measurements: [{ kind: "WAIST_CM", value: 85 }] }, fieldEvidence: {} }, now, guard);
  return { write, statements, profileRevision: () => profileRevision };
}

describe("profile CAS under current source and authority", () => {
  it.each([
    ["superseded source", { generation: 2 }], ["lost lease", { leased: false }],
    ["human owner", { owner: "HUMAN" }], ["changed revision", { revision: 2 }],
    ["non-APP route", { route: "N8N" }], ["kill switch", { kill: true }],
    ["different source message", { source: "other-message" }],
  ] as const)("does not change the profile for %s", async (_name, changes) => {
    const f = fixture(changes);
    expect(await f.write()).toBe(false);
    expect(f.profileRevision()).toBe(1);
  });
  it("locks current source and authority in the same transaction as the profile CAS, retaining the source", async () => {
    const f = fixture();
    expect(await f.write()).toBe(true);
    expect(f.profileRevision()).toBe(2);
    const sql = f.statements.join("\n");
    expect(sql.indexOf("BEGIN")).toBeLessThan(sql.indexOf("FROM pages"));
    expect(sql.indexOf("FROM pages")).toBeLessThan(sql.indexOf("FROM conversation_ingress_heads"));
    expect(sql.indexOf("FROM conversation_ingress_heads")).toBeLessThan(sql.indexOf("FROM conversations"));
    expect(sql.indexOf("FROM conversations")).toBeLessThan(sql.indexOf("UPDATE realtime_customer_profiles"));
    expect(sql.indexOf("UPDATE realtime_customer_profiles")).toBeLessThan(sql.indexOf("COMMIT"));
    expect(sql).not.toContain("UPDATE webhook_inbox");
    expect(sql).not.toContain("UPDATE conversation_ingress_heads");
  });
});
