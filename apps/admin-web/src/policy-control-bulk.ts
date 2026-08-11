import "./policy-control-bulk.css";
import { escapeHtml } from "./format.js";
import type { PolicyArtifactRow } from "./policy-control-review-api.js";
import type {
  PolicyBatchExecution,
  PolicyBatchSnapshotItem,
} from "./policy-control-runtime.js";

export interface PolicyBulkActionEligibility {
  readonly selectedCount: number;
  readonly canValidate: boolean;
  readonly canApprove: boolean;
}

export function isPolicyBulkSelectable(_artifact: PolicyArtifactRow): boolean {
  return true;
}

export function reconcilePolicyBulkSelection(
  selectedIds: ReadonlySet<string>,
  items: readonly PolicyArtifactRow[],
): Set<string> {
  const visibleIds = new Set(items.map((item) => item.id));
  return new Set([...selectedIds].filter((id) => visibleIds.has(id)));
}

export function policyBulkActionEligibility(
  items: readonly PolicyArtifactRow[],
  selectedIds: ReadonlySet<string>,
): PolicyBulkActionEligibility {
  const selected = items.filter((item) => selectedIds.has(item.id));
  return {
    selectedCount: selected.length,
    canValidate: selected.length > 0 && selected.every((item) => item.lifecycle === "DRAFT"),
    canApprove: selected.length > 0 && selected.every((item) => item.lifecycle === "VALIDATED"),
  };
}

export function policyBatchSelection(
  items: readonly PolicyArtifactRow[],
  selectedIds: ReadonlySet<string>,
  action: "VALIDATE" | "APPROVE",
): PolicyBatchSnapshotItem[] {
  const selected = items.filter((item) => selectedIds.has(item.id));
  const expectedLifecycle = action === "VALIDATE" ? "DRAFT" : "VALIDATED";
  if (
    selected.length < 1 ||
    selected.length > 100 ||
    selected.some((item) => item.lifecycle !== expectedLifecycle)
  ) {
    throw new Error(`Selection is not eligible for ${action}`);
  }
  return selected.map((item) => ({
    versionId: item.id,
    expectedRevision: item.revision,
    lifecycle: item.lifecycle,
  }));
}

export function renderPolicyBatchExecution(
  action: "VALIDATE" | "APPROVE",
  execution: PolicyBatchExecution,
): string {
  if (execution.kind === "result") {
    const items = execution.result.results.map((item) => {
      const detail = item.ok
        ? "Thành công"
        : item.errorCode === "ADMIN_ARTIFACT_VERSION_CONFLICT"
          ? `Xung đột revision${item.currentRevision === undefined ? "" : ` · hiện tại ${item.currentRevision}`}`
          : item.errorCode ?? "Thất bại";
      return `<li><code>${escapeHtml(item.versionId)}</code><span>${escapeHtml(detail)}</span></li>`;
    }).join("");
    return `<div class="policy-bulk-result policy-bulk-result--complete"><strong>${execution.result.summary.succeeded}/${execution.result.summary.total} mục thành công</strong><ul>${items}</ul></div>`;
  }

  const recovery = execution.recovery;
  const items = recovery.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");
  const retry = recovery.retryableIds.length
    ? `<button type="button" class="secondary-button" data-policy-retry-batch data-policy-retry-action="${action}">Gửi lại ${recovery.retryableIds.length} mục đã đối soát</button>`
    : "";
  return `<div class="policy-bulk-result policy-bulk-result--recovery"><strong>Mất phản hồi chắc chắn; đã đối soát từng mục</strong><ul>${items}</ul>${retry}</div>`;
}
