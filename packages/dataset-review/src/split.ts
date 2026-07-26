import { createHash } from "node:crypto";
import type { SplitV1 } from "@lana/contracts";

// Deterministic, group-aware dataset splitting (§13). Guarantees:
//  - same duplicateGroupId always lands in the same split (no leakage between
//    development and holdout),
//  - the assignment is a pure function of (seed, group keys, targets),
//  - target counts are approximated by item count while never splitting a group.

export interface SplitItem {
  readonly conversationId: string;
  readonly duplicateGroupId: string | null;
}

export interface SplitTargets {
  readonly DEVELOPMENT: number;
  readonly VALIDATION: number;
  readonly HOLDOUT: number;
  readonly RARE_SAFETY?: number;
}

const SPLIT_ORDER: readonly SplitV1[] = ["DEVELOPMENT", "VALIDATION", "HOLDOUT", "RARE_SAFETY"];

function seededRank(seed: string, groupKey: string): string {
  return createHash("sha256").update(seed, "utf8").update("\0").update(groupKey, "utf8").digest("hex");
}

export function assignSplits(
  items: readonly SplitItem[],
  targets: SplitTargets,
  seed: string,
): Map<string, SplitV1> {
  // Group by duplicate group (falling back to the conversation itself).
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = item.duplicateGroupId ?? `conv:${item.conversationId}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(item.conversationId);
    groups.set(key, bucket);
  }

  // Deterministic order independent of input ordering.
  const orderedGroups = [...groups.entries()].sort((left, right) =>
    seededRank(seed, left[0]).localeCompare(seededRank(seed, right[0])),
  );

  const remaining: Record<SplitV1, number> = {
    DEVELOPMENT: targets.DEVELOPMENT,
    VALIDATION: targets.VALIDATION,
    HOLDOUT: targets.HOLDOUT,
    RARE_SAFETY: targets.RARE_SAFETY ?? 0,
  };

  const assignment = new Map<string, SplitV1>();
  for (const [, conversationIds] of orderedGroups) {
    // Pick the split with the most remaining capacity (ties resolved by
    // SPLIT_ORDER) so a whole group fits without crossing a split boundary.
    let chosen: SplitV1 = "DEVELOPMENT";
    let best = -Infinity;
    for (const split of SPLIT_ORDER) {
      const capacity = remaining[split];
      if (capacity > best) {
        best = capacity;
        chosen = split;
      }
    }
    remaining[chosen] -= conversationIds.length;
    for (const conversationId of conversationIds) {
      assignment.set(conversationId, chosen);
    }
  }
  return assignment;
}
