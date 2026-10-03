import { ProductBindingV2Schema, canonicalJsonV1,
  type ProductBindingV2, type RealtimeCustomerInput } from "@lana/contracts";
import type { SessionDecisionContext } from "@lana/conversation-engine";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { applyCustomerDecisionInput, bindRealtimeCustomerInput,
  customerInputRequestedObligations, extractRealtimeCustomerInput } from "./realtime-customer-input.js";
import { runTrackCStrategyLive, type TrackCStrategyLiveInput,
  type TrackCStrategyContractCaseResult } from "./track-c-c3-strategy-contract-runner.js";

export interface TrackCProducerBenchmarkSnapshotInput {
  readonly latestCustomerText: string;
  /** Full source dialogue, including the latest customer message last. */
  readonly dialogue: readonly ShadowContextMessage[];
  /** Exact state supplied to Producer, including customer preferences. */
  readonly producerState: unknown;
  /** Canonical subject before the current Producer delta/alternative lookup. */
  readonly priorProductId: string | null;
  readonly productBinding: ProductBindingV2;
  readonly priorCustomerState?: SessionDecisionContext;
  readonly customerInput: unknown;
}

export interface TrackCProducerBenchmarkSnapshot {
  readonly contractVersion: "TRACK_C_TYPED_PRODUCER_BENCHMARK_SNAPSHOT_V1";
  readonly latestCustomerText: string;
  readonly dialogue: readonly ShadowContextMessage[];
  readonly producerState: unknown;
  readonly priorProductId: string | null;
  readonly productBinding: ProductBindingV2;
  readonly priorCustomerState: SessionDecisionContext;
  readonly customerState: SessionDecisionContext;
  readonly customerInput: RealtimeCustomerInput;
}

/** Lookup supplies verified facts and canonical permissions, never semantics. */
export type TrackCProducerBenchmarkBusinessInput = Omit<TrackCStrategyLiveInput,
  "modelResource" | "transport" | "dialogue" | "requestedObligations" | "customerVariant" | "knownBudgetVnd" | "signal">;

type BenchmarkRunInput = Readonly<{
  modelResource: string;
  transport: CandidateVertexTransport;
  /** Deterministic, read-only lookup from the full typed snapshot. */
  lookup(snapshot: TrackCProducerBenchmarkSnapshot): TrackCProducerBenchmarkBusinessInput | Promise<TrackCProducerBenchmarkBusinessInput>;
  signal?: AbortSignal;
}>;

export interface TrackCProducerBenchmarkResult {
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly parity: "SOURCE_BOUND_PRODUCER" | "FROZEN_TYPED_PRODUCER";
  readonly snapshot: TrackCProducerBenchmarkSnapshot;
  readonly candidate: TrackCStrategyContractCaseResult;
}

function frozenCopy<T>(value: T): T {
  const copy = JSON.parse(canonicalJsonV1(value)) as T;
  const freeze = (entry: unknown): void => {
    if (entry === null || typeof entry !== "object") return;
    for (const nested of Object.values(entry)) freeze(nested);
    Object.freeze(entry);
  };
  freeze(copy);
  return copy;
}

function assertCurrentSource(input: Pick<TrackCProducerBenchmarkSnapshotInput, "latestCustomerText" | "dialogue">): void {
  const last = input.dialogue.at(-1);
  if (last?.direction !== "INBOUND" || last.senderType !== "CUSTOMER" ||
      last.text !== input.latestCustomerText) {
    throw new Error("TRACK_C_BENCHMARK_CURRENT_SOURCE_MISMATCH");
  }
}

/**
 * Freeze the complete validated Producer delta, never a fact-only projection.
 * Old DEV70 fact snapshots must run Producer or supply a typed snapshot first.
 */
export function freezeTrackCProducerBenchmarkSnapshot(
  input: TrackCProducerBenchmarkSnapshotInput,
): TrackCProducerBenchmarkSnapshot {
  assertCurrentSource(input);
  if (input.priorProductId !== null && (typeof input.priorProductId !== "string" || input.priorProductId.length === 0)) {
    throw new Error("TRACK_C_BENCHMARK_PRIOR_SUBJECT_REQUIRED");
  }
  const customerInput = bindRealtimeCustomerInput(input.customerInput, input.latestCustomerText);
  if (customerInput.obligations === undefined) {
    throw new Error("TRACK_C_BENCHMARK_TYPED_OBLIGATIONS_REQUIRED");
  }
  const productBinding = ProductBindingV2Schema.parse(input.productBinding);
  const priorCustomerState = input.priorCustomerState ?? {
    budgetVnd: null, occasion: null, rejectedProductIds: [],
  };
  return frozenCopy({
    contractVersion: "TRACK_C_TYPED_PRODUCER_BENCHMARK_SNAPSHOT_V1" as const,
    latestCustomerText: input.latestCustomerText, dialogue: input.dialogue,
    producerState: input.producerState, priorProductId: input.priorProductId, productBinding, priorCustomerState,
    customerState: applyCustomerDecisionInput(priorCustomerState, customerInput, input.priorProductId),
    customerInput,
  });
}

async function runSnapshot(snapshot: TrackCProducerBenchmarkSnapshot, input: BenchmarkRunInput,
  parity: TrackCProducerBenchmarkResult["parity"]): Promise<TrackCProducerBenchmarkResult> {
  const business = await input.lookup(snapshot);
  if (canonicalJsonV1(business.context.productBinding) !== canonicalJsonV1(snapshot.productBinding)) {
    throw new Error("TRACK_C_BENCHMARK_PRODUCT_BINDING_MISMATCH");
  }
  const boundProductIds = snapshot.productBinding.status === "RESOLVED" ? snapshot.productBinding.productIds : [];
  const liveResult = await runTrackCStrategyLive({
    context: business.context, decisionAt: business.decisionAt,
    checkoutRequestedFields: business.checkoutRequestedFields,
    checkoutClarificationActive: business.checkoutClarificationActive,
    currentCart: business.currentCart, paymentOptions: business.paymentOptions,
    ...(business.trustedAcquisition === undefined ? {} : { trustedAcquisition: business.trustedAcquisition }),
    ...(business.firstContactInputs === undefined ? {} : { firstContactInputs: business.firstContactInputs }),
    ...(business.measurementRequestedFields === undefined ? {} : { measurementRequestedFields: business.measurementRequestedFields }),
    ...(business.comparisonFacts === undefined ? {} : { comparisonFacts: business.comparisonFacts }),
    dialogue: snapshot.dialogue,
    customerVariant: snapshot.customerInput.variant,
    knownBudgetVnd: snapshot.customerState.budgetVnd,
    requestedObligations: customerInputRequestedObligations(snapshot.customerInput, boundProductIds,
      snapshot.priorProductId),
    modelResource: input.modelResource, transport: input.transport,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  // The existing V5 evaluator can score this result without a second adapter.
  const candidate: TrackCStrategyContractCaseResult = Object.freeze({
    ...liveResult, contractVersion: "TRACK_C_C3_STRATEGY_CONTRACT_RESULT_V1",
    executionLane: "PRODUCTION_CONTRACT", evaluationOnly: true, sideEffects: "DISABLED",
  });
  return Object.freeze({ evaluationOnly: true, sideEffects: "DISABLED", parity, snapshot, candidate });
}

/** Acceptable fallback: reuse full typed Producer output without another model call. */
export async function runTrackCFrozenProducerBenchmarkCase(
  input: BenchmarkRunInput & Readonly<{ snapshot: TrackCProducerBenchmarkSnapshot }>,
): Promise<TrackCProducerBenchmarkResult> {
  if (input.snapshot?.contractVersion !== "TRACK_C_TYPED_PRODUCER_BENCHMARK_SNAPSHOT_V1") {
    throw new Error("TRACK_C_BENCHMARK_TYPED_SNAPSHOT_REQUIRED");
  }
  const snapshot = freezeTrackCProducerBenchmarkSnapshot(input.snapshot);
  if (canonicalJsonV1(snapshot.customerState) !== canonicalJsonV1(input.snapshot.customerState)) {
    throw new Error("TRACK_C_BENCHMARK_CUSTOMER_STATE_MISMATCH");
  }
  return runSnapshot(snapshot, input, "FROZEN_TYPED_PRODUCER");
}

/** Preferred benchmark path: Producer -> full typed snapshot -> lookup -> live strategy. */
export async function runTrackCProducerBenchmarkCase(
  input: Omit<TrackCProducerBenchmarkSnapshotInput, "customerInput"> & BenchmarkRunInput &
    Readonly<{ producerTransport: CandidateVertexTransport }>,
): Promise<TrackCProducerBenchmarkResult> {
  assertCurrentSource(input);
  const source = frozenCopy({
    latestCustomerText: input.latestCustomerText, dialogue: input.dialogue,
    producerState: input.producerState, priorProductId: input.priorProductId,
    productBinding: ProductBindingV2Schema.parse(input.productBinding),
    ...(input.priorCustomerState === undefined ? {} : { priorCustomerState: input.priorCustomerState }),
  });
  const customerInput = await extractRealtimeCustomerInput({
    text: source.latestCustomerText, history: source.dialogue.slice(0, -1), state: source.producerState,
    modelResource: input.modelResource, transport: input.producerTransport,
  });
  const snapshot = freezeTrackCProducerBenchmarkSnapshot({ ...source, customerInput });
  return runSnapshot(snapshot, input, "SOURCE_BOUND_PRODUCER");
}
