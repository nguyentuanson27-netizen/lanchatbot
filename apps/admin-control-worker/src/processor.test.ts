import { describe, expect, it } from "vitest";
import { AdminControlCommandProcessor } from "./processor.js";
import type {
  ClaimedAdminCommand,
  ControlCommandStore,
  ControlTag,
  ControlTagObservation,
  PancakeControlPort,
  StateMutationResult,
  TagOperationStatus,
} from "./types.js";

const baseCommand: ClaimedAdminCommand = {
  commandId: "11111111-1111-4111-8111-111111111111",
  leaseToken: "22222222-2222-4222-8222-222222222222",
  pageId: "page-1",
  conversationId: "33333333-3333-4333-8333-333333333333",
  pancakeConversationId: "page-1_sender-1",
  commandType: "HANDOFF_NHAN_VIEN",
  tag: null,
  pauseMinutes: null,
  expectedStateVersion: 7,
  enqueuedStateVersion: 8,
  requestedBySubject: "owner-hash",
  attemptCount: 1,
};

const clear: ControlTagObservation = {
  verified: true,
  observedTagIds: [],
  blockingTag: null,
  observedAt: "2026-07-18T05:00:00.000Z",
  reasonCode: null,
};

class FakeStore implements ControlCommandStore {
  readonly calls: Array<{ name: string; args: unknown[] }> = [];
  command: ClaimedAdminCommand | null = baseCommand;
  mutation: StateMutationResult = { status: "APPLIED", stateVersion: 8 };
  statuses = new Map<ControlTag, TagOperationStatus>([["NHAN_VIEN", "APPLIED"]]);

  async claim(worker: string, lease: number, pages: readonly string[]) {
    this.calls.push({ name: "claim", args: [worker, lease, pages] });
    const value = this.command;
    this.command = null;
    return value;
  }
  async enqueueTagOperation(
    command: ClaimedAdminCommand,
    operation: "ADD" | "REMOVE",
    tag: ControlTag,
    tagId: string,
    now: Date,
    stateVersionOverride?: number,
  ) {
    this.calls.push({ name: "enqueue", args: [command, operation, tag, tagId, now, stateVersionOverride] });
    return this.mutation;
  }
  async tagOperationStatuses(command: ClaimedAdminCommand, operation: "ADD" | "REMOVE") {
    this.calls.push({ name: "statuses", args: [command, operation] });
    return this.statuses;
  }
  async beginFailSafeHuman(command: ClaimedAdminCommand, now: Date) {
    this.calls.push({ name: "hold", args: [command, now] });
    return this.mutation;
  }
  async reconcileVerifiedTags(
    command: ClaimedAdminCommand,
    version: number,
    observation: ControlTagObservation,
    allowBot: boolean,
    now: Date,
  ) {
    this.calls.push({ name: "reconcile", args: [command, version, observation, allowBot, now] });
    return { status: "APPLIED" as const, stateVersion: version + 1 };
  }
  async markApplied(command: ClaimedAdminCommand, code: string, metadata?: Readonly<Record<string, string | number | boolean | null>>) {
    this.calls.push({ name: "applied", args: [command, code, metadata] });
    return true;
  }
  async markFailed(command: ClaimedAdminCommand, code: string) {
    this.calls.push({ name: "failed", args: [command, code] });
    return true;
  }
  async markConflict(command: ClaimedAdminCommand, code: string) {
    this.calls.push({ name: "conflict", args: [command, code] });
    return true;
  }
  async markWaiting(command: ClaimedAdminCommand, code: string, delay: number) {
    this.calls.push({ name: "waiting", args: [command, code, delay] });
    return true;
  }
}

class FakePancake implements PancakeControlPort {
  readonly calls: Array<{ name: string; args: unknown[] }> = [];
  observations: ControlTagObservation[] = [clear];
  readonly ids: Record<ControlTag, string> = {
    NHAN_VIEN: "tag-human",
    VAN_DON: "tag-order",
    DA_CHOT_DON: "tag-closed",
    KHONG_UP_SALE: "tag-no-upsale",
  };
  async observe(page: string, conversation: string) {
    this.calls.push({ name: "observe", args: [page, conversation] });
    const value = this.observations.shift();
    if (!value) throw new Error("OBSERVATION_MISSING");
    return value;
  }
  tagId(_page: string, tag: ControlTag) { return this.ids[tag]; }
}

function cmd(overrides: Partial<ClaimedAdminCommand>) { return { ...baseCommand, ...overrides }; }
function processor(store: FakeStore, pancake = new FakePancake()) {
  return new AdminControlCommandProcessor(
    store,
    pancake,
    "worker-1",
    60_000,
    () => new Date("2026-07-18T05:00:00.000Z"),
    { enabled: true, allowedPageIds: ["page-1"] },
  );
}

describe("AdminControlCommandProcessor", () => {
  it("durably enqueues the fixed HANDOFF tag and does not call Pancake inline", async () => {
    const store = new FakeStore();
    const pancake = new FakePancake();
    await processor(store, pancake).processOne();
    expect(store.calls.map((call) => call.name)).toEqual([
      "claim", "enqueue", "statuses", "applied",
    ]);
    expect(store.calls[1]?.args.slice(1, 4)).toEqual(["ADD", "NHAN_VIEN", "tag-human"]);
    expect(pancake.calls).toHaveLength(0);
  });

  it("keeps RESUME processing while durable removes are pending", async () => {
    const store = new FakeStore();
    store.command = cmd({ commandType: "RESUME_BOT", enqueuedStateVersion: null });
    store.statuses = new Map([["NHAN_VIEN", "PENDING"]]);
    const pancake = new FakePancake();
    pancake.observations = [{ ...clear, observedTagIds: ["tag-human"], blockingTag: "NHAN_VIEN" }];
    await processor(store, pancake).processOne();
    expect(store.calls.map((call) => call.name)).toEqual([
      "claim", "hold", "enqueue", "statuses", "waiting",
    ]);
    expect(store.calls.find((call) => call.name === "enqueue")?.args[5]).toBe(8);
    expect(store.calls.at(-1)?.args.slice(1)).toEqual(["WAITING_PANCAKE_TAG_REMOVE", 5]);
  });

  it("sets BOT only after durable removes applied and a second exact read is verified clear", async () => {
    const store = new FakeStore();
    store.command = cmd({ commandType: "RESUME_BOT", enqueuedStateVersion: 8 });
    store.statuses = new Map([
      ["NHAN_VIEN", "APPLIED"],
      ["DA_CHOT_DON", "APPLIED"],
    ]);
    const pancake = new FakePancake();
    pancake.observations = [
      { ...clear, observedTagIds: ["tag-human", "tag-closed"], blockingTag: "DA_CHOT_DON" },
      clear,
    ];
    await processor(store, pancake).processOne();
    expect(pancake.calls.map((call) => call.name)).toEqual(["observe", "observe"]);
    expect(store.calls.find((call) => call.name === "reconcile")?.args[3]).toBe(true);
    expect(store.calls.at(-1)?.args[1]).toBe("BOT_RESUMED");
  });

  it("fails safe and keeps the HUMAN fence when exact Pancake read is unverified", async () => {
    const store = new FakeStore();
    store.command = cmd({ commandType: "RESUME_BOT", enqueuedStateVersion: null });
    const pancake = new FakePancake();
    pancake.observations = [{ ...clear, verified: false, reasonCode: "PANCAKE_PROVIDER_UNVERIFIED" }];
    await processor(store, pancake).processOne();
    expect(store.calls.map((call) => call.name)).toEqual(["claim", "hold", "failed"]);
  });

  it("PAUSE is already fenced by API and is only audited APPLIED", async () => {
    const store = new FakeStore();
    store.command = cmd({ commandType: "PAUSE_BOT", pauseMinutes: 60 });
    await processor(store).processOne();
    expect(store.calls.map((call) => call.name)).toEqual(["claim", "applied"]);
    expect(store.calls.at(-1)?.args[2]).toMatchObject({ pauseMinutes: 60, stateVersion: 8 });
  });

  it("defaults disabled and never claims", async () => {
    const store = new FakeStore();
    const worker = new AdminControlCommandProcessor(store, new FakePancake(), "worker-1");
    expect(await worker.processOne()).toBe(false);
    expect(store.calls).toHaveLength(0);
  });

  it("passes the page allowlist into the durable claim", async () => {
    const store = new FakeStore();
    store.command = null;
    expect(await processor(store).processOne()).toBe(false);
    expect(store.calls[0]?.args).toEqual(["worker-1", 60_000, ["page-1"]]);
  });
});
