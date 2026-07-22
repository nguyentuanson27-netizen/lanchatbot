import type { AdminArtifactContentV1 } from "@lana/contracts";
import type {
  HistoricalConversation,
  PolicyComparison,
  PolicyVersion,
  ReplaySnapshot,
  SimulationAggregate,
  SimulationResult,
} from "./types.js";

const HASH = /^sha256:[a-f0-9]{64}$/u;

export function parseReplaySnapshot(value: unknown): ReplaySnapshot | null {
  if (!record(value) || value.schemaVersion !== 1) return null;
  const closingState = oneOf(value.closingState, ["READY", "HESITANT", "CAUTIOUS"] as const);
  const concessionStage = oneOf(value.concessionStage, ["NONE", "SECOND", "FINAL"] as const);
  const paymentMethod = oneOf(value.paymentMethod, ["COD", "BANK_TRANSFER"] as const);
  const units = integer(value.parentProductUnits, 0, 100);
  const toolSnapshotIds = Array.isArray(value.toolSnapshotIds)
    ? value.toolSnapshotIds.filter((item): item is string => typeof item === "string" && HASH.test(item))
    : [];
  const measurements: Record<string, number> = {};
  if (record(value.measurements)) {
    for (const [kind, measurement] of Object.entries(value.measurements)) {
      if (["HEIGHT_CM", "WEIGHT_KG", "BUST_CM", "WAIST_CM", "HIPS_CM"].includes(kind) &&
          typeof measurement === "number" && Number.isFinite(measurement) && measurement > 0 && measurement <= 300) {
        measurements[kind] = measurement;
      }
    }
  }
  return {
    schemaVersion: 1,
    closingState,
    parentProductUnits: units,
    concessionStage,
    paymentMethod,
    recipientNamePresent: nullableBoolean(value.recipientNamePresent),
    phoneNumberPresent: nullableBoolean(value.phoneNumberPresent),
    deliveryAddressPresent: nullableBoolean(value.deliveryAddressPresent),
    handoffReason: boundedString(value.handoffReason, 128),
    measurements,
    businessFactsSnapshotId:
      typeof value.businessFactsSnapshotId === "string" && HASH.test(value.businessFactsSnapshotId)
        ? value.businessFactsSnapshotId
        : null,
    toolSnapshotIds: [...new Set(toolSnapshotIds)].sort(),
    actualOutcome: boundedString(value.actualOutcome, 128),
    funnelStage: boundedString(value.funnelStage, 64),
  };
}

export function evaluateConversation(
  conversation: HistoricalConversation,
  policies: PolicyComparison,
): SimulationResult {
  const snapshot = conversation.snapshot;
  const missing: string[] = [];
  if (snapshot === null) missing.push("HISTORICAL_REPLAY_SNAPSHOT_MISSING");
  if (snapshot?.businessFactsSnapshotId === null) missing.push("HISTORICAL_FACT_SNAPSHOT_MISSING");
  if (snapshot?.toolSnapshotIds.length === 0) missing.push("HISTORICAL_TOOL_SNAPSHOT_MISSING");
  if (policies.baselineSource === "HISTORICAL_ACTUAL" && snapshot?.actualOutcome === null) {
    missing.push("HISTORICAL_ACTUAL_OUTCOME_MISSING");
  }
  if (missing.length > 0 || snapshot === null) {
    return {
      conversationHash: conversation.conversationHash,
      evaluationStatus: "INSUFFICIENT_EVIDENCE",
      baselineOutcome: null,
      candidateOutcome: null,
      funnelMetrics: {
        schemaVersion: 1,
        messageCount: conversation.messageCount,
        comparisonPerformed: false,
      },
      failureCodes: missing,
    };
  }

  const baseline = policies.baselineSource === "PUBLISHED_POLICY"
    ? canonicalOutcome(policies.baseline, snapshot)
    : JSON.stringify({
        schemaVersion: 1,
        source: "HISTORICAL_ACTUAL",
        actualOutcome: snapshot.actualOutcome,
        funnelStage: snapshot.funnelStage,
      });
  const candidate = canonicalOutcome(policies.candidate, snapshot);
  return {
    conversationHash: conversation.conversationHash,
    evaluationStatus: "EVALUATED",
    baselineOutcome: baseline,
    candidateOutcome: candidate,
    funnelMetrics: {
      schemaVersion: 1,
      messageCount: conversation.messageCount,
      comparisonPerformed: true,
      changed: baseline !== candidate,
      funnelStage: snapshot.funnelStage,
      actualOutcome: snapshot.actualOutcome,
    },
    failureCodes: [],
  };
}

export function aggregateResults(
  run: {
    readonly baselineVersionIds: readonly string[];
    readonly candidateVersionIds: readonly string[];
    readonly baselineSource: "PUBLISHED_POLICY" | "HISTORICAL_ACTUAL";
  },
  results: readonly SimulationResult[],
): SimulationAggregate {
  let evaluated = 0;
  let insufficient = 0;
  let changed = 0;
  const failureCodeCounts: Record<string, number> = {};
  for (const result of results) {
    if (result.evaluationStatus === "EVALUATED") {
      evaluated += 1;
      if (result.baselineOutcome !== result.candidateOutcome) changed += 1;
    } else {
      insufficient += 1;
      for (const code of result.failureCodes) {
        failureCodeCounts[code] = (failureCodeCounts[code] ?? 0) + 1;
      }
    }
  }
  return {
    schemaVersion: 1,
    sideEffects: "DISABLED",
    totalConversations: results.length,
    evaluatedConversations: evaluated,
    insufficientEvidenceConversations: insufficient,
    changedOutcomes: changed,
    unchangedOutcomes: evaluated - changed,
    outcomeChangeRate: evaluated === 0 ? null : changed / evaluated,
    failureCodeCounts,
    baselineSource: run.baselineSource,
    baselineVersionIds: [...run.baselineVersionIds],
    candidateVersionIds: [...run.candidateVersionIds],
  };
}

function canonicalOutcome(versions: readonly PolicyVersion[], snapshot: ReplaySnapshot): string {
  const decisions = versions
    .map((version) => ({
      artifactKey: version.artifactKey,
      artifactKind: version.artifactKind,
      decision: decision(version.content, snapshot),
    }))
    .sort((left, right) => `${left.artifactKind}:${left.artifactKey}`.localeCompare(`${right.artifactKind}:${right.artifactKey}`));
  return JSON.stringify({ schemaVersion: 1, decisions });
}

function decision(content: AdminArtifactContentV1, snapshot: ReplaySnapshot): unknown {
  switch (content.kind) {
    case "SHOP_POLICY": {
      const missing = [
        content.requireRecipientName && snapshot.recipientNamePresent !== true ? "RECIPIENT_NAME" : null,
        content.requirePhoneNumber && snapshot.phoneNumberPresent !== true ? "PHONE_NUMBER" : null,
        content.requireDeliveryAddress && snapshot.deliveryAddressPresent !== true ? "DELIVERY_ADDRESS" : null,
      ].filter((item): item is string => item !== null);
      return {
        defaultShippingFeeVnd: content.defaultShippingFeeVnd,
        paymentAllowed: snapshot.paymentMethod === null
          ? null
          : content.allowedPaymentMethods.includes(snapshot.paymentMethod),
        missingFields: missing,
        readyForPreview: missing.length === 0,
      };
    }
    case "OFFER_POLICY": {
      const qualifies = snapshot.parentProductUnits !== null &&
        snapshot.parentProductUnits >= content.multiItem.minimumParentProductUnits;
      const concession = snapshot.concessionStage === "SECOND"
        ? content.concessions.second
        : snapshot.concessionStage === "FINAL"
          ? content.concessions.final
          : { freeShipping: false, fixedDiscountVnd: 0 };
      return {
        discountBps: qualifies ? content.multiItem.discountBps : 0,
        freeShipping: concession.freeShipping,
        fixedDiscountVnd: concession.fixedDiscountVnd,
      };
    }
    case "CLOSING_STRATEGY":
      return {
        nextAction: content.steps.find(({ state }) => state === snapshot.closingState)?.nextAction ?? "INSUFFICIENT_STATE",
      };
    case "HANDOFF_MATRIX": {
      const rule = content.rules.find(({ reason }) => reason === snapshot.handoffReason);
      return rule
        ? { action: rule.customerMessagePolicy, tag: rule.tag }
        : { action: "NO_MATCHING_RULE", tag: null };
    }
    case "PAYMENT_POLICY":
      return {
        selectedMethod: snapshot.paymentMethod,
        allowed: snapshot.paymentMethod === null ? null : content.methods.includes(snapshot.paymentMethod),
        receiptRequiresHumanReview:
          snapshot.paymentMethod === "BANK_TRANSFER" ? content.bankTransfer?.receiptRequiresHumanReview ?? null : null,
      };
    case "SIZE_CHART": {
      const matches = content.chart.bands.filter((band) => band.ranges.every((range) => {
        const value = snapshot.measurements[range.kind];
        if (value === undefined) return false;
        return (range.minInclusive === null || value >= range.minInclusive) &&
          (range.maxInclusive === null || value <= range.maxInclusive);
      })).map(({ size }) => size);
      return {
        chartId: content.chart.reference.chartId,
        chartVersion: content.chart.reference.version,
        matchingSizes: matches,
        boundaryPolicy: content.chart.boundaryPolicy,
      };
    }
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}
function integer(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : null;
}
function oneOf<const T extends readonly string[]>(value: unknown, values: T): T[number] | null {
  return typeof value === "string" && (values as readonly string[]).includes(value)
    ? value as T[number]
    : null;
}
