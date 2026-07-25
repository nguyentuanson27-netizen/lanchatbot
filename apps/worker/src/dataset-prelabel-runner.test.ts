import { describe, expect, it, vi } from "vitest";
import { WAVE1_LABEL_SCHEMA, type ValidationMessage } from "@lana/dataset-review";
import {
  DatasetPrelabelRunner,
  type PrelabelModelPort,
  type PrelabelModelResult,
  type PrelabelStorePort,
} from "./dataset-prelabel-runner.js";

const messages: readonly ValidationMessage[] = [
  { turnIndex: 0, role: "CUSTOMER", messageId: "m0", redactedText: "chị lấy mẫu này size M" },
  { turnIndex: 1, role: "SHOP", messageId: "m1", redactedText: "shop có size S M L XL" },
];

function options() {
  return {
    promptVersion: "prelabel-v1",
    schemaVersion: WAVE1_LABEL_SCHEMA.version,
    model: "gemini-test",
    modelVersion: "gemini-test-001",
    guidelineVersion: WAVE1_LABEL_SCHEMA.guidelineVersion,
    labelSchema: WAVE1_LABEL_SCHEMA,
    maxAttempts: 3,
  };
}

function mockStore(overrides: Partial<PrelabelStorePort> = {}) {
  return {
    loadItemMessages: vi.fn(async () => messages),
    reserveRunItem: vi.fn(async () => "RESERVED" as const),
    persistProposals: vi.fn(async () => undefined),
    recordItemOutcome: vi.fn(async () => undefined),
    ...overrides,
  } satisfies PrelabelStorePort;
}

function modelReturning(annotations: unknown[]): PrelabelModelPort {
  const result: PrelabelModelResult = {
    response: { annotations } as PrelabelModelResult["response"],
    modelVersion: "gemini-test-001",
    latencyMs: 42,
    tokenUsage: { total: 100 },
  };
  return { runPrelabel: vi.fn(async () => result) };
}

describe("DatasetPrelabelRunner", () => {
  it("persists a valid annotation as a PROPOSED proposal with derived offsets", async () => {
    const store = mockStore();
    const model = modelReturning([
      {
        labelCode: "BUYING_COMMITTED",
        scope: "CUSTOMER_MESSAGE",
        turnIndex: 0,
        secondTurnIndex: null,
        evidenceText: "mẫu này",
        confidence: "HIGH",
        reason: "r",
      },
    ]);
    const runner = new DatasetPrelabelRunner(model, store, options());
    const outcome = await runner.runItem("run-1", "pi-1");

    expect(outcome).toEqual({ status: "SUCCEEDED", proposedCount: 1, invalidCount: 0 });
    const call = vi.mocked(store.persistProposals).mock.calls[0]![0];
    expect(call.proposals).toHaveLength(1);
    expect(call.proposals[0]).toMatchObject({
      labelCode: "BUYING_COMMITTED",
      evidenceStart: 8,
      evidenceEnd: 15,
    });
  });

  it("drops an invalid (role/scope) annotation and routes the item to review", async () => {
    const store = mockStore();
    // SIZE_QUESTION (CUSTOMER_MESSAGE) claimed on the SHOP turn -> invalid.
    const model = modelReturning([
      {
        labelCode: "SIZE_QUESTION",
        scope: "CUSTOMER_MESSAGE",
        turnIndex: 1,
        secondTurnIndex: null,
        evidenceText: "size S M L XL",
        confidence: "HIGH",
        reason: "",
      },
    ]);
    const runner = new DatasetPrelabelRunner(model, store, options());
    const outcome = await runner.runItem("run-1", "pi-1");

    expect(outcome).toEqual({ status: "VALIDATION_FAILED", proposedCount: 0, invalidCount: 1 });
    const call = vi.mocked(store.persistProposals).mock.calls[0]![0];
    expect(call.proposals).toHaveLength(0);
    expect(call.validationErrors[0]).toMatchObject({ error: "ROLE_SCOPE_MISMATCH" });
  });

  it("skips an already-done item without calling the model (idempotency)", async () => {
    const store = mockStore({ reserveRunItem: vi.fn(async () => "ALREADY_DONE" as const) });
    const model = modelReturning([]);
    const runner = new DatasetPrelabelRunner(model, store, options());
    const outcome = await runner.runItem("run-1", "pi-1");

    expect(outcome).toEqual({ status: "SKIPPED" });
    expect(model.runPrelabel).not.toHaveBeenCalled();
    expect(store.persistProposals).not.toHaveBeenCalled();
  });

  it("retries a retryable provider error then succeeds", async () => {
    const store = mockStore();
    const good: PrelabelModelResult = {
      response: { annotations: [] } as PrelabelModelResult["response"],
      modelVersion: "gemini-test-001",
      latencyMs: 10,
      tokenUsage: {},
    };
    const runPrelabel = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("VERTEX_PRELABEL_RETRYABLE"), { retryable: true }))
      .mockResolvedValueOnce(good);
    const runner = new DatasetPrelabelRunner({ runPrelabel }, store, options());
    const outcome = await runner.runItem("run-1", "pi-1");

    expect(outcome.status).toBe("SUCCEEDED");
    expect(runPrelabel).toHaveBeenCalledTimes(2);
    expect(vi.mocked(store.recordItemOutcome).mock.calls[0]![0].attempts).toBe(2);
  });

  it("fails immediately on a non-retryable error and records FAILED", async () => {
    const store = mockStore();
    const runPrelabel = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("VERTEX_PRELABEL_FAILED"), { retryable: false }));
    const runner = new DatasetPrelabelRunner({ runPrelabel }, store, options());
    const outcome = await runner.runItem("run-1", "pi-1");

    expect(outcome).toMatchObject({ status: "FAILED" });
    expect(runPrelabel).toHaveBeenCalledTimes(1);
    expect(store.persistProposals).not.toHaveBeenCalled();
    expect(vi.mocked(store.recordItemOutcome).mock.calls[0]![0].status).toBe("FAILED");
  });

  it("isolates a single item failure across a batch", async () => {
    let call = 0;
    const store = mockStore({
      loadItemMessages: vi.fn(async () => {
        call += 1;
        if (call === 1) throw new Error("db blip");
        return messages;
      }),
    });
    const model = modelReturning([]);
    const runner = new DatasetPrelabelRunner(model, store, options());
    const summary = await runner.runBatch("run-1", ["pi-1", "pi-2"]);

    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(1);
  });
});
