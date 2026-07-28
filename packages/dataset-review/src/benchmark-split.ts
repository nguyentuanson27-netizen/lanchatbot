import { createHash } from "node:crypto";

export type BenchmarkPartition = "DEVELOPMENT" | "VALIDATION" | "HOLDOUT";

export interface BenchmarkSplitItem {
  readonly conversationId: string;
  readonly duplicateGroupId: string | null;
  readonly labelCodes: ReadonlySet<string>;
}

export interface BenchmarkSplitTargets {
  readonly DEVELOPMENT: number;
  readonly VALIDATION: number;
  readonly HOLDOUT: number;
}

export interface LabelSupport {
  readonly total: number;
  readonly development: number;
  readonly validation: number;
  readonly holdout: number;
  readonly minimumRequired: number | null;
  readonly status:
    | "ELIGIBLE"
    | "INSUFFICIENT_TOTAL"
    | "INSUFFICIENT_HOLDOUT"
    | "NOT_GATED";
}

export interface BenchmarkSplitPlan {
  readonly schemaVersion: 1;
  readonly seed: string;
  readonly assignments: ReadonlyMap<string, BenchmarkPartition>;
  readonly rareSafetyConversationIds: ReadonlySet<string>;
  readonly counts: Readonly<Record<BenchmarkPartition, number>>;
  readonly labelSupport: Readonly<Record<string, LabelSupport>>;
  readonly leakageGroupCount: 0;
  readonly splitChecksum: string;
}

interface Group {
  readonly key: string;
  readonly items: readonly BenchmarkSplitItem[];
  readonly labelCounts: ReadonlyMap<string, number>;
}

const PARTITION_ORDER: readonly BenchmarkPartition[] = [
  "DEVELOPMENT",
  "VALIDATION",
  "HOLDOUT",
];

function seededRank(seed: string, value: string): string {
  return createHash("sha256")
    .update(seed, "utf8")
    .update("\0")
    .update(value, "utf8")
    .digest("hex");
}

function groups(items: readonly BenchmarkSplitItem[]): readonly Group[] {
  const conversationIds = new Set<string>();
  const buckets = new Map<string, BenchmarkSplitItem[]>();
  for (const item of items) {
    if (conversationIds.has(item.conversationId)) {
      throw new Error(`BENCHMARK_CONVERSATION_DUPLICATED:${item.conversationId}`);
    }
    conversationIds.add(item.conversationId);
    const key = item.duplicateGroupId ?? `conversation:${item.conversationId}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].map(([key, groupedItems]) => {
    const labelCounts = new Map<string, number>();
    for (const item of groupedItems) {
      for (const labelCode of item.labelCodes) {
        labelCounts.set(labelCode, (labelCounts.get(labelCode) ?? 0) + 1);
      }
    }
    return { key, items: groupedItems, labelCounts };
  });
}

function supportInGroups(
  selected: ReadonlySet<string>,
  allGroups: readonly Group[],
  labelCode: string,
): number {
  let support = 0;
  for (const group of allGroups) {
    if (selected.has(group.key)) {
      support += group.labelCounts.get(labelCode) ?? 0;
    }
  }
  return support;
}

function totalSupport(items: readonly BenchmarkSplitItem[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    for (const labelCode of item.labelCodes) {
      totals.set(labelCode, (totals.get(labelCode) ?? 0) + 1);
    }
  }
  return totals;
}

function assignmentChecksum(
  assignments: ReadonlyMap<string, BenchmarkPartition>,
  rareSafetyConversationIds: ReadonlySet<string>,
): string {
  const canonical = [...assignments.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([conversationId, partition]) =>
      `${conversationId}\0${partition}\0${rareSafetyConversationIds.has(conversationId) ? "1" : "0"}`
    )
    .join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export interface AssignBenchmarkSplitsInput {
  readonly items: readonly BenchmarkSplitItem[];
  readonly targets: BenchmarkSplitTargets;
  readonly seed: string;
  readonly minimumHoldoutSupport?: Readonly<Record<string, number>>;
  readonly rareSafetyLabels?: ReadonlySet<string>;
}

export function assignBenchmarkSplits(
  input: AssignBenchmarkSplitsInput,
): BenchmarkSplitPlan {
  const expectedCount =
    input.targets.DEVELOPMENT + input.targets.VALIDATION + input.targets.HOLDOUT;
  if (expectedCount !== input.items.length) {
    throw new Error("BENCHMARK_SPLIT_TARGET_COUNT_MISMATCH");
  }
  if (!input.seed.trim() || input.seed.length > 128) {
    throw new Error("BENCHMARK_SPLIT_SEED_INVALID");
  }
  for (const target of Object.values(input.targets)) {
    if (!Number.isSafeInteger(target) || target < 0) {
      throw new Error("BENCHMARK_SPLIT_TARGET_INVALID");
    }
  }

  const allGroups = groups(input.items);
  const totals = totalSupport(input.items);
  const minimums = input.minimumHoldoutSupport ?? {};
  const selectedHoldoutGroups = new Set<string>();
  let selectedHoldoutItems = 0;

  const gatedLabels = Object.entries(minimums)
    .filter(([, minimum]) => Number.isSafeInteger(minimum) && minimum > 0)
    .sort(([left], [right]) => {
      const supportDelta = (totals.get(left) ?? 0) - (totals.get(right) ?? 0);
      return supportDelta !== 0 ? supportDelta : left.localeCompare(right);
    });

  for (const [labelCode, minimum] of gatedLabels) {
    if ((totals.get(labelCode) ?? 0) < minimum) continue;
    let support = supportInGroups(selectedHoldoutGroups, allGroups, labelCode);
    const candidates = allGroups
      .filter(
        (group) =>
          !selectedHoldoutGroups.has(group.key) &&
          (group.labelCounts.get(labelCode) ?? 0) > 0,
      )
      .sort((left, right) =>
        seededRank(input.seed, `${labelCode}\0${left.key}`).localeCompare(
          seededRank(input.seed, `${labelCode}\0${right.key}`),
        )
      );
    for (const group of candidates) {
      if (support >= minimum) break;
      selectedHoldoutGroups.add(group.key);
      selectedHoldoutItems += group.items.length;
      support += group.labelCounts.get(labelCode) ?? 0;
    }
  }

  if (selectedHoldoutItems > input.targets.HOLDOUT) {
    throw new Error("BENCHMARK_HOLDOUT_SUPPORT_CAPACITY_EXCEEDED");
  }

  const remaining: Record<BenchmarkPartition, number> = {
    DEVELOPMENT: input.targets.DEVELOPMENT,
    VALIDATION: input.targets.VALIDATION,
    HOLDOUT: input.targets.HOLDOUT - selectedHoldoutItems,
  };
  const assignments = new Map<string, BenchmarkPartition>();
  for (const group of allGroups) {
    if (!selectedHoldoutGroups.has(group.key)) continue;
    for (const item of group.items) assignments.set(item.conversationId, "HOLDOUT");
  }

  const unassignedGroups = allGroups
    .filter((group) => !selectedHoldoutGroups.has(group.key))
    .sort((left, right) =>
      seededRank(input.seed, left.key).localeCompare(seededRank(input.seed, right.key))
    );
  for (const group of unassignedGroups) {
    let chosen: BenchmarkPartition = "DEVELOPMENT";
    let best = Number.NEGATIVE_INFINITY;
    for (const partition of PARTITION_ORDER) {
      if (remaining[partition] > best) {
        best = remaining[partition];
        chosen = partition;
      }
    }
    remaining[chosen] -= group.items.length;
    for (const item of group.items) assignments.set(item.conversationId, chosen);
  }

  if (assignments.size !== input.items.length) {
    throw new Error("BENCHMARK_SPLIT_ASSIGNMENT_INCOMPLETE");
  }

  const counts: Record<BenchmarkPartition, number> = {
    DEVELOPMENT: 0,
    VALIDATION: 0,
    HOLDOUT: 0,
  };
  for (const partition of assignments.values()) counts[partition] += 1;

  const rareSafetyConversationIds = new Set<string>();
  const rareSafetyLabels = input.rareSafetyLabels ?? new Set<string>();
  for (const item of input.items) {
    if ([...item.labelCodes].some((labelCode) => rareSafetyLabels.has(labelCode))) {
      rareSafetyConversationIds.add(item.conversationId);
    }
  }

  const supportLabels = new Set([...totals.keys(), ...Object.keys(minimums)]);
  const labelSupport: Record<string, LabelSupport> = {};
  for (const labelCode of [...supportLabels].sort()) {
    const partitionCounts: Record<BenchmarkPartition, number> = {
      DEVELOPMENT: 0,
      VALIDATION: 0,
      HOLDOUT: 0,
    };
    for (const item of input.items) {
      if (!item.labelCodes.has(labelCode)) continue;
      const partition = assignments.get(item.conversationId);
      if (!partition) throw new Error("BENCHMARK_SPLIT_ITEM_MISSING");
      partitionCounts[partition] += 1;
    }
    const minimum = minimums[labelCode] ?? null;
    const total = totals.get(labelCode) ?? 0;
    const status = minimum === null
      ? "NOT_GATED"
      : total < minimum
        ? "INSUFFICIENT_TOTAL"
        : partitionCounts.HOLDOUT < minimum
          ? "INSUFFICIENT_HOLDOUT"
          : "ELIGIBLE";
    labelSupport[labelCode] = {
      total,
      development: partitionCounts.DEVELOPMENT,
      validation: partitionCounts.VALIDATION,
      holdout: partitionCounts.HOLDOUT,
      minimumRequired: minimum,
      status,
    };
  }

  const groupPartitions = new Map<string, Set<BenchmarkPartition>>();
  for (const group of allGroups) {
    const partitions = new Set(
      group.items.map((item) => assignments.get(item.conversationId)).filter(
        (partition): partition is BenchmarkPartition => partition !== undefined,
      ),
    );
    groupPartitions.set(group.key, partitions);
  }
  if ([...groupPartitions.values()].some((partitions) => partitions.size !== 1)) {
    throw new Error("BENCHMARK_SPLIT_LEAKAGE_DETECTED");
  }

  return {
    schemaVersion: 1,
    seed: input.seed,
    assignments,
    rareSafetyConversationIds,
    counts,
    labelSupport,
    leakageGroupCount: 0,
    splitChecksum: assignmentChecksum(assignments, rareSafetyConversationIds),
  };
}
