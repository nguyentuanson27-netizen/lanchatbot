import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { loadContextV2Snapshot } from "./shadow-evaluation.js";

describe("DF09 async Context V2 audit lookup", () => {
  it("uses one read-only audit query and fails closed when no valid snapshot exists", async () => {
    const query = vi.fn(async (_sql: string, _parameters: readonly unknown[]) => ({
      rows: [],
    }));
    const client = { query } as unknown as PoolClient;
    const occurredAt = new Date("2026-08-16T10:00:00.000Z");

    await expect(loadContextV2Snapshot(
      client,
      "conversation-1",
      "00000000-0000-4000-8000-000000000001",
      occurredAt,
    )).resolves.toBeNull();

    expect(query).toHaveBeenCalledOnce();
    const [sql, parameters] = query.mock.calls[0]!;
    expect(sql).toContain("SELECT event_metadata->'contextV2Shadow'");
    expect(sql).toContain("FROM conversation_events");
    expect(sql).toContain("contextV2SourceMessagePk");
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/iu);
    expect(sql).not.toContain("meta_outbox");
    expect(parameters).toEqual([
      "conversation-1",
      occurredAt,
      "00000000-0000-4000-8000-000000000001",
    ]);
  });
});
