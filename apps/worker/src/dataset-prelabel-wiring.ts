import type { PostgresDatasetPrelabelStore } from "@lana/dataset-store";
import type { VertexShadowModel } from "./vertex.js";
import type { PrelabelModelPort, PrelabelStorePort } from "./dataset-prelabel-runner.js";

// Production wiring. Reuses the existing Vertex gateway (no parallel AI client)
// and the durable prelabel store. Kept as thin adapters so the runner itself
// stays provider- and storage-agnostic and unit-testable with mocks.

export function createVertexPrelabelPort(model: VertexShadowModel): PrelabelModelPort {
  return {
    // VertexShadowError carries a `retryable` boolean the runner honours.
    runPrelabel: (systemInstruction, userPrompt) => model.prelabel(systemInstruction, userPrompt),
  };
}

export function createPrelabelStorePort(store: PostgresDatasetPrelabelStore): PrelabelStorePort {
  return {
    loadItemMessages: (projectItemId) => store.loadItemMessages(projectItemId),
    reserveRunItem: (input) => store.reserveRunItem(input),
    persistProposals: (input) =>
      store.persistProposals({
        runId: input.runId,
        projectItemId: input.projectItemId,
        modelVersion: input.modelVersion,
        proposals: input.proposals,
        validationErrors: input.validationErrors,
      }),
    recordItemOutcome: (input) => store.recordItemOutcome(input),
  };
}
