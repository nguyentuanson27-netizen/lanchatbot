import type {
  AdminArtifactContentV1,
  AdminArtifactKindV1,
} from "@lana/contracts";

export interface ClaimedSimulationRun {
  readonly simulationId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly candidateVersionIds: readonly string[];
  readonly baselineVersionIds: readonly string[];
  readonly baselineSource: "UNRESOLVED" | "PUBLISHED_POLICY" | "HISTORICAL_ACTUAL";
  readonly lookbackDays: number;
  readonly maxConversations: number;
  readonly attemptCount: number;
  readonly sideEffects: "DISABLED";
}

export interface PolicyVersion {
  readonly versionId: string;
  readonly artifactKey: string;
  readonly artifactKind: AdminArtifactKindV1;
  readonly contentHash: string;
  readonly content: AdminArtifactContentV1;
}

export interface PolicyComparison {
  readonly baseline: readonly PolicyVersion[];
  readonly candidate: readonly PolicyVersion[];
  readonly baselineSource: "PUBLISHED_POLICY" | "HISTORICAL_ACTUAL";
}

export interface ReplaySnapshot {
  readonly schemaVersion: 1;
  readonly closingState: "READY" | "HESITANT" | "CAUTIOUS" | null;
  readonly parentProductUnits: number | null;
  readonly concessionStage: "NONE" | "SECOND" | "FINAL" | null;
  readonly paymentMethod: "COD" | "BANK_TRANSFER" | null;
  readonly recipientNamePresent: boolean | null;
  readonly phoneNumberPresent: boolean | null;
  readonly deliveryAddressPresent: boolean | null;
  readonly handoffReason: string | null;
  readonly measurements: Readonly<Record<string, number>>;
  readonly businessFactsSnapshotId: string | null;
  readonly toolSnapshotIds: readonly string[];
  readonly actualOutcome: string | null;
  readonly funnelStage: string | null;
}

export interface HistoricalConversation {
  readonly conversationHash: string;
  readonly messageCount: number;
  readonly snapshot: ReplaySnapshot | null;
}

export type SimulationResult = {
  readonly conversationHash: string;
  readonly evaluationStatus: "EVALUATED" | "INSUFFICIENT_EVIDENCE";
  readonly baselineOutcome: string | null;
  readonly candidateOutcome: string | null;
  readonly funnelMetrics: Readonly<Record<string, unknown>>;
  readonly failureCodes: readonly string[];
};

export interface SimulationAggregate {
  readonly schemaVersion: 1;
  readonly sideEffects: "DISABLED";
  readonly totalConversations: number;
  readonly evaluatedConversations: number;
  readonly insufficientEvidenceConversations: number;
  readonly changedOutcomes: number;
  readonly unchangedOutcomes: number;
  readonly outcomeChangeRate: number | null;
  readonly failureCodeCounts: Readonly<Record<string, number>>;
  readonly baselineSource: "PUBLISHED_POLICY" | "HISTORICAL_ACTUAL";
  readonly baselineVersionIds: readonly string[];
  readonly candidateVersionIds: readonly string[];
}

export interface SimulationStore {
  claim(workerId: string, leaseMs: number, maxAttempts: number): Promise<ClaimedSimulationRun | null>;
  loadPolicies(run: ClaimedSimulationRun): Promise<PolicyComparison>;
  loadHistory(run: ClaimedSimulationRun): Promise<readonly HistoricalConversation[]>;
  renewLease(run: ClaimedSimulationRun, leaseMs: number): Promise<boolean>;
  complete(
    run: ClaimedSimulationRun,
    results: readonly SimulationResult[],
    aggregate: SimulationAggregate,
  ): Promise<boolean>;
  fail(
    run: ClaimedSimulationRun,
    errorCode: string,
    retryable: boolean,
    maxAttempts: number,
  ): Promise<boolean>;
}
