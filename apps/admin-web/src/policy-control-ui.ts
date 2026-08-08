import "./policy-control.css";
import {
  ApiError,
  rollbackPolicyPointer,
  startPolicySimulation,
  transitionPolicyArtifact,
  updatePolicyArtifactDraft,
} from "./api.js";
import {
  batchTransitionPolicyArtifacts,
  getPolicyArtifact,
  getPolicyReviewContext,
  listPolicyArtifacts,
  type PolicyActiveFilter,
  type PolicyArtifactRow,
  type PolicyBatchItem,
  type PolicyListQuery,
  type PolicyListSort,
  type PolicyReviewContext,
} from "./policy-control-review-api.js";
import { escapeHtml, formatDateTime } from "./format.js";
import {
  activateDialog,
  isEditingContext,
  readRouteParams,
  writeRouteParams,
} from "./ui-runtime.js";
import type {
  Identity,
  PolicyArtifact,
  PolicyControlData,
  PolicyLifecycle,
} from "./types.js";

const kindLabels: Record<PolicyArtifact["kind"], string> = {
  SHOP_POLICY: "Chính sách cửa hàng",
  OFFER_POLICY: "Ưu đãi",
  CLOSING_STRATEGY: "Kịch bản chốt",
  SIZE_CHART: "Bảng size",
  HANDOFF_MATRIX: "Bàn giao / fallback",
  PAYMENT_POLICY: "Thanh toán",
};

const lifecycleLabels: Record<PolicyLifecycle, string> = {
  DRAFT: "Bản nháp",
  VALIDATED: "Đã kiểm tra",
  APPROVED: "Đã duyệt",
  CANARY: "Đang thử nghiệm",
  PUBLISHED: "Đã phát hành",
  RETIRED: "Đã ngừng",
};

const measurementLabels: Record<string, string> = {
  HEIGHT_CM: "Chiều cao",
  WEIGHT_KG: "Cân nặng",
  BUST_CM: "Vòng ngực",
  WAIST_CM: "Vòng eo",
  HIPS_CM: "Vòng mông",
};

export type PolicyQuickView = "review" | "draft" | "running" | "all";

export function policyQuickViewQuery(view: PolicyQuickView): Pick<PolicyListQuery, "lifecycle" | "active" | "sort"> {
  switch (view) {
    case "review":
      return { lifecycle: "VALIDATED", active: "any", sort: "validated_oldest" };
    case "draft":
      return { lifecycle: "DRAFT", active: "any", sort: "updated_desc" };
    case "running":
      return { lifecycle: undefined, active: "active", sort: "updated_desc" };
    case "all":
      return { lifecycle: undefined, active: "any", sort: "updated_desc" };
  }
}

export function bulkActionForSelection(
  artifacts: readonly PolicyArtifact[],
): "VALIDATE" | "APPROVE" | null {
  if (!artifacts.length) return null;
  if (artifacts.every((item) => item.lifecycle === "DRAFT")) return "VALIDATE";
  if (artifacts.every((item) => item.lifecycle === "VALIDATED")) return "APPROVE";
  return null;
}

export function renderPolicyControl(data: PolicyControlData, identity: Identity | null): string {
  if (!identity?.policyControl) {
    return `<section class="empty-state"><h3>Chức năng quản lý chính sách đang tắt</h3><p>Cần migration và bật riêng Policy Control Plane trước khi sử dụng.</p></section>`;
  }
  const initialRows: PolicyArtifactRow[] = data.artifacts.map((artifact) => ({
    ...artifact,
    active: data.pointers.some((pointer) => pointer.versionId === artifact.id),
  }));
  const pointers = data.pointers.map((pointer) => `<tr><td>${escapeHtml(kindLabels[pointer.kind])}</td><td>${escapeHtml(pointer.key)}</td><td>${escapeHtml(pointer.channel)}</td><td>v${pointer.version}</td><td>${escapeHtml(pointer.pageId ?? "Toàn shop")}</td></tr>`).join("");
  const simulations = data.simulations.map((run) => `<tr><td>${escapeHtml(formatDateTime(run.createdAt))}</td><td>${escapeHtml(run.status)}</td><td>${run.versionIds.length}</td><td>${run.maxConversations}</td></tr>`).join("");

  return `<section class="policy-review" data-policy-root tabindex="-1">
    <section class="policy-safety" role="status"><strong>Chế độ an toàn tạm thời</strong><span>Shadow canary: bật · Canary gửi thật: ${identity.policyCanaryLiveEnabled ? "bật" : "khóa"} · Phát hành: ${identity.policyPublishEnabled ? "bật" : "khóa"}</span></section>
    <section class="policy-review__header">
      <div><h2>Phiên bản cấu hình</h2><p>Lọc, rà soát và duyệt theo trang. PostgreSQL vẫn là nguồn chuẩn policy artifact.</p></div>
      <button class="secondary-button" data-policy-simulate ${data.artifacts.some((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle)) ? "" : "disabled"}>Mô phỏng trên chat cũ</button>
    </section>
    <nav class="policy-quick-views" aria-label="Bộ lọc nhanh">
      <button type="button" class="secondary-button" data-policy-view="review">Cần duyệt</button>
      <button type="button" class="secondary-button" data-policy-view="draft">Bản nháp</button>
      <button type="button" class="secondary-button" data-policy-view="running">Đang chạy</button>
      <button type="button" class="secondary-button" data-policy-view="all">Tất cả</button>
    </nav>
    <form class="policy-filters" data-policy-filters>
      <label class="policy-filters__search"><span>Tìm mã</span><input id="policy-search" name="search" type="search" maxlength="120" autocomplete="off" placeholder="SQ603"></label>
      <label><span>Loại</span><select name="artifact_kind"><option value="">Tất cả loại</option>${Object.entries(kindLabels).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}</select></label>
      <label><span>Trạng thái</span><select name="lifecycle"><option value="">Tất cả trạng thái</option>${Object.entries(lifecycleLabels).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}</select></label>
      <label><span>Đang dùng</span><select name="active"><option value="any">Tất cả</option><option value="active">Đang dùng</option><option value="inactive">Chưa dùng</option></select></label>
      <label><span>Sắp xếp</span><select name="sort"><option value="updated_desc">Mới cập nhật</option><option value="validated_oldest">Chờ duyệt lâu nhất</option><option value="artifact_key_asc">Mã A → Z</option></select></label>
      <button type="submit">Áp dụng</button>
    </form>
    <section class="policy-bulk-bar" data-policy-bulk hidden aria-live="polite">
      <strong data-policy-bulk-count>0 mục đã chọn</strong>
      <span data-policy-bulk-hint></span>
      <div><button type="button" data-policy-bulk-action="VALIDATE">Kiểm tra hàng loạt</button><button type="button" data-policy-bulk-action="APPROVE">Duyệt hàng loạt</button><button type="button" class="secondary-button" data-policy-clear-selection>Bỏ chọn</button></div>
    </section>
    <div class="policy-batch-result" data-policy-batch-result role="status" aria-live="polite"></div>
    <section class="panel policy-review-table" aria-busy="false">
      <div class="policy-review-table__scroll" data-policy-table>${renderPolicyListTable(initialRows)}</div>
      <footer class="policy-pagination" data-policy-pagination></footer>
    </section>
    <section class="panel policy-table"><header><h2>Con trỏ đang hoạt động</h2><small>Danh sách này giữ cho thao tác mô phỏng/khôi phục hiện tại.</small></header><div class="policy-review-table__scroll"><table><thead><tr><th>Loại</th><th>Mã</th><th>Kênh</th><th>Phiên bản</th><th>Page</th></tr></thead><tbody>${pointers || "<tr><td colspan=5>Chưa phát hành cấu hình.</td></tr>"}</tbody></table></div></section>
    <section class="panel policy-table"><header><h2>Lịch sử mô phỏng</h2><small>Luôn tắt gửi tin và gắn tag</small></header><div class="policy-review-table__scroll"><table><thead><tr><th>Thời gian</th><th>Trạng thái</th><th>Số cấu hình</th><th>Hội thoại tối đa</th></tr></thead><tbody>${simulations || "<tr><td colspan=4>Chưa chạy mô phỏng.</td></tr>"}</tbody></table></div></section>
  </section>`;
}

export function renderPolicyListTable(items: readonly PolicyArtifactRow[]): string {
  const body = items.map((artifact) => `<tr data-policy-row="${escapeHtml(artifact.id)}" tabindex="0">
    <td class="policy-select-cell"><input type="checkbox" aria-label="Chọn ${escapeHtml(artifact.key)}" data-policy-select="${escapeHtml(artifact.id)}"></td>
    <td><strong>${escapeHtml(artifact.key)}</strong><small>${escapeHtml(artifact.updatedBy || "—")}</small></td>
    <td>${escapeHtml(kindLabels[artifact.kind])}</td>
    <td><span class="policy-state policy-state--${artifact.lifecycle.toLowerCase()}">${escapeHtml(lifecycleLabels[artifact.lifecycle])}</span></td>
    <td>v${artifact.version}</td>
    <td>${artifact.revision}</td>
    <td>${escapeHtml(formatDateTime(artifact.updatedAt))}</td>
    <td><span class="policy-active ${artifact.active ? "policy-active--yes" : ""}">${artifact.active ? "Đang dùng" : "Chưa dùng"}</span></td>
    <td>${artifact.lifecycle === "DRAFT" ? "Chưa xác nhận" : "Đã qua kiểm tra"}</td>
    <td><button type="button" class="secondary-button policy-row-action" data-policy-open="${escapeHtml(artifact.id)}">Xem</button></td>
  </tr>`).join("");
  return `<table class="policy-list-table"><thead><tr>
    <th class="policy-select-cell"><input type="checkbox" aria-label="Chọn tất cả trên trang này" data-policy-select-all></th>
    <th>Mã</th><th>Loại</th><th>Trạng thái</th><th>Version</th><th>Revision</th><th>Cập nhật</th><th>Đang dùng</th><th>Kiểm tra</th><th>Hành động</th>
  </tr></thead><tbody>${body || "<tr><td colspan=10 class=\"policy-empty\">Không có cấu hình phù hợp bộ lọc.</td></tr>"}</tbody></table>`;
}

export function renderSizeChartReview(content: Record<string, unknown>): string {
  const chart = record(content.chart);
  const bands = Array.isArray(chart.bands) ? chart.bands.map(record) : null;
  if (!bands || bands.length === 0 || bands.some((band) => typeof band.size !== "string" || !Array.isArray(band.ranges))) {
    return `<section class="policy-size-chart policy-size-chart--fallback"><p>Không thể hiển thị bảng size chuyên dụng. Dữ liệu gốc vẫn được giữ ở phần cấu hình chỉ đọc.</p></section>`;
  }
  const columns = ["HEIGHT_CM", "WEIGHT_KG", "BUST_CM", "WAIST_CM", "HIPS_CM"];
  const rows = bands.map((band) => {
    const ranges = new Map<string, Record<string, unknown>>(
      (band.ranges as unknown[])
        .map(record)
        .filter((range) => typeof range.kind === "string")
        .map((range): [string, Record<string, unknown>] => [String(range.kind), range]),
    );
    return `<tr><th scope="row">${escapeHtml(String(band.size))}</th>${columns.map((kind) => `<td>${escapeHtml(formatMeasurementRange(ranges.get(kind)))}</td>`).join("")}<td>${escapeHtml(typeof band.note === "string" ? band.note : "—")}</td></tr>`;
  }).join("");
  return `<section class="policy-size-chart"><div class="policy-size-chart__meta"><span><strong>Thương hiệu</strong>${escapeHtml(stringValue(chart.brand, "—"))}</span><span><strong>Nhóm</strong>${escapeHtml(stringValue(chart.category, "—"))}</span><span><strong>Vai trò</strong>${escapeHtml(stringValue(chart.componentRole, "—"))}</span></div><div class="policy-review-table__scroll"><table><thead><tr><th>Size</th>${columns.map((kind) => `<th>${escapeHtml(measurementLabels[kind] ?? kind)}</th>`).join("")}<th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function formatMeasurementRange(range: Record<string, unknown> | undefined): string {
  if (!range) return "—";
  const min = typeof range.minInclusive === "number" ? range.minInclusive : null;
  const max = typeof range.maxInclusive === "number" ? range.maxInclusive : null;
  if (min !== null && max !== null) return `${min}–${max}`;
  if (min !== null) return `≥ ${min}`;
  if (max !== null) return `≤ ${max}`;
  return "—";
}

export function bindPolicyControl(
  data: PolicyControlData,
  identity: Identity | null,
  reload: () => Promise<void>,
  notify: (message: string) => void,
): void {
  const root = document.querySelector<HTMLElement>("[data-policy-root]");
  if (!root || !identity?.policyControl) return;
  const pageId = identity.policyPageIds[0] ?? "1198992073286645";
  let pageItems: PolicyArtifactRow[] = [];
  let nextCursor: string | null = null;
  let selected = new Set<string>();
  let loading = false;
  let reconciling = false;
  let focusedRowId: string | null = null;

  const currentQuery = (): PolicyListQuery => policyQueryFromRoute(readRouteParams());

  const renderPage = () => {
    const table = root.querySelector<HTMLElement>("[data-policy-table]");
    if (table) table.innerHTML = renderPolicyListTable(pageItems);
    const pagination = root.querySelector<HTMLElement>("[data-policy-pagination]");
    if (pagination) {
      const hasCursor = Boolean(readRouteParams().get("cursor"));
      pagination.innerHTML = `${hasCursor ? '<button type="button" class="secondary-button" data-policy-prev-page>Trang trước</button>' : ""}${nextCursor ? '<button type="button" class="secondary-button" data-policy-next-page>Trang tiếp</button>' : ""}`;
    }
    bindPageRows();
    updateBulkBar();
  };

  const loadPage = async (resetSelection = true) => {
    if (loading) return;
    loading = true;
    root.querySelector<HTMLElement>(".policy-review-table")?.setAttribute("aria-busy", "true");
    if (resetSelection) selected = new Set();
    try {
      const page = await listPolicyArtifacts(currentQuery());
      pageItems = page.items;
      nextCursor = page.nextCursor;
      renderPage();
      syncFilterControls(root, currentQuery());
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể tải danh sách chính sách.");
    } finally {
      loading = false;
      root.querySelector<HTMLElement>(".policy-review-table")?.setAttribute("aria-busy", "false");
    }
  };

  const updateBulkBar = () => {
    const bar = root.querySelector<HTMLElement>("[data-policy-bulk]");
    if (!bar) return;
    const items = pageItems.filter((item) => selected.has(item.id));
    bar.hidden = items.length === 0;
    const count = bar.querySelector<HTMLElement>("[data-policy-bulk-count]");
    if (count) count.textContent = `${items.length} mục đã chọn`;
    const action = bulkActionForSelection(items);
    const hint = bar.querySelector<HTMLElement>("[data-policy-bulk-hint]");
    if (hint) hint.textContent = action ? "" : "Chỉ thao tác hàng loạt khi tất cả mục có cùng trạng thái hợp lệ.";
    bar.querySelectorAll<HTMLButtonElement>("[data-policy-bulk-action]").forEach((button) => {
      button.hidden = button.dataset.policyBulkAction !== action;
      button.disabled = reconciling;
    });
    const all = root.querySelector<HTMLInputElement>("[data-policy-select-all]");
    if (all) {
      all.checked = pageItems.length > 0 && pageItems.every((item) => selected.has(item.id));
      all.indeterminate = selected.size > 0 && !all.checked;
    }
  };

  const bindPageRows = () => {
    root.querySelectorAll<HTMLInputElement>("[data-policy-select]").forEach((checkbox) => {
      checkbox.checked = selected.has(checkbox.dataset.policySelect ?? "");
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.policySelect;
        if (!id) return;
        if (checkbox.checked) selected.add(id); else selected.delete(id);
        updateBulkBar();
      });
    });
    root.querySelector<HTMLInputElement>("[data-policy-select-all]")?.addEventListener("change", (event) => {
      const checkbox = event.currentTarget as HTMLInputElement;
      selected = checkbox.checked ? new Set(pageItems.map((item) => item.id)) : new Set();
      root.querySelectorAll<HTMLInputElement>("[data-policy-select]").forEach((item) => { item.checked = checkbox.checked; });
      updateBulkBar();
    });
    root.querySelectorAll<HTMLElement>("[data-policy-row]").forEach((row) => {
      row.addEventListener("focus", () => { focusedRowId = row.dataset.policyRow ?? null; });
      row.addEventListener("click", (event) => {
        if ((event.target as HTMLElement).closest("button,input,a,select,label")) return;
        const id = row.dataset.policyRow;
        if (id) void openReview(id);
      });
    });
    root.querySelectorAll<HTMLButtonElement>("[data-policy-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.policyOpen;
        if (id) void openReview(id);
      });
    });
    root.querySelector<HTMLButtonElement>("[data-policy-next-page]")?.addEventListener("click", () => {
      if (!nextCursor) return;
      const params = readRouteParams();
      params.set("cursor", nextCursor);
      writeRouteParams(params, false);
    });
    root.querySelector<HTMLButtonElement>("[data-policy-prev-page]")?.addEventListener("click", () => history.back());
  };

  const closeLayer = (cleanup?: () => void) => {
    cleanup?.();
    const layer = document.querySelector<HTMLElement>("#command-modal-layer");
    if (layer) layer.innerHTML = "";
  };

  const openReview = async (versionId: string) => {
    const layer = document.querySelector<HTMLElement>("#command-modal-layer");
    if (!layer) return;
    layer.innerHTML = `<div class="modal-scrim" data-close-detail></div><aside class="policy-review-drawer" role="dialog" aria-modal="true" aria-label="Đang tải chi tiết chính sách" tabindex="-1"><p>Đang tải chi tiết…</p></aside>`;
    let cleanup = activateDialog(layer.querySelector<HTMLElement>(".policy-review-drawer")!);
    try {
      const context = await getPolicyReviewContext(versionId);
      cleanup();
      layer.innerHTML = `<div class="modal-scrim" data-close-detail></div>${renderReviewDrawer(context, identity)}`;
      const drawer = layer.querySelector<HTMLElement>(".policy-review-drawer");
      if (!drawer) return;
      cleanup = activateDialog(drawer);
      layer.querySelectorAll<HTMLElement>("[data-close-detail]").forEach((element) => element.addEventListener("click", () => closeLayer(cleanup)));
      bindDrawerActions(layer, context, cleanup);
    } catch (error) {
      closeLayer(cleanup);
      notify(error instanceof Error ? error.message : "Không thể tải chi tiết chính sách.");
    }
  };

  const bindDrawerActions = (
    layer: HTMLElement,
    context: PolicyReviewContext,
    cleanup: () => void,
  ) => {
    layer.querySelector<HTMLButtonElement>("[data-policy-edit]")?.addEventListener("click", () => {
      closeLayer(cleanup);
      openDraftEditor(context.artifact, reload, notify);
    });
    layer.querySelectorAll<HTMLButtonElement>("[data-policy-drawer-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.policyDrawerAction as "VALIDATE" | "APPROVE" | "START_CANARY" | "PUBLISH" | "RETIRE";
        const live = button.dataset.canaryMode === "LIVE_OUTBOUND";
        const warning = live ? "Canary gửi thật có thể trả lời khách trên page test. Tiếp tục?" : `${button.textContent?.trim() ?? "Thực hiện"}?`;
        if (!window.confirm(warning)) return;
        button.disabled = true;
        try {
          await transitionPolicyArtifact(
            context.artifact,
            action,
            action === "START_CANARY" || action === "PUBLISH" ? pageId : null,
            action === "START_CANARY" ? (live ? "LIVE_OUTBOUND" : "SHADOW") : null,
          );
          closeLayer(cleanup);
          notify("Đã cập nhật phiên bản cấu hình.");
          await reload();
        } catch (error) {
          notify(error instanceof Error ? error.message : "Không thể cập nhật cấu hình.");
          button.disabled = false;
        }
      });
    });
    layer.querySelectorAll<HTMLButtonElement>("[data-policy-drawer-rollback]").forEach((button) => {
      button.addEventListener("click", async () => {
        const index = Number(button.dataset.policyDrawerRollback);
        const candidate = context.rollbackCandidates[index];
        if (!candidate || !window.confirm(`Quay lại v${candidate.targetVersion.version}?`)) return;
        button.disabled = true;
        try {
          await rollbackPolicyPointer(candidate.pointer, candidate.targetVersion.id);
          closeLayer(cleanup);
          notify("Đã rollback bằng cách đổi con trỏ đang dùng.");
          await reload();
        } catch (error) {
          notify(error instanceof Error ? error.message : "Không thể rollback cấu hình.");
          button.disabled = false;
        }
      });
    });
  };

  root.querySelector<HTMLFormElement>("[data-policy-filters]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const params = readRouteParams();
    params.delete("cursor");
    setRouteParam(params, "search", String(formData.get("search") ?? "").trim());
    setRouteParam(params, "artifact_kind", String(formData.get("artifact_kind") ?? ""));
    setRouteParam(params, "lifecycle", String(formData.get("lifecycle") ?? ""));
    const active = String(formData.get("active") ?? "any");
    setRouteParam(params, "active", active === "any" ? "" : active);
    let sort = String(formData.get("sort") ?? "updated_desc");
    if (sort === "validated_oldest" && formData.get("lifecycle") !== "VALIDATED") sort = "updated_desc";
    setRouteParam(params, "sort", sort === "updated_desc" ? "" : sort);
    writeRouteParams(params, true);
    void loadPage(true);
  });

  root.querySelectorAll<HTMLButtonElement>("[data-policy-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.policyView as PolicyQuickView;
      const preset = policyQuickViewQuery(view);
      const params = new URLSearchParams();
      if (preset.lifecycle) params.set("lifecycle", preset.lifecycle);
      if (preset.active && preset.active !== "any") params.set("active", preset.active);
      if (preset.sort && preset.sort !== "updated_desc") params.set("sort", preset.sort);
      writeRouteParams(params, true);
      void loadPage(true);
    });
  });

  root.querySelector<HTMLButtonElement>("[data-policy-clear-selection]")?.addEventListener("click", () => {
    selected = new Set();
    renderPage();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-policy-bulk-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.policyBulkAction as "VALIDATE" | "APPROVE";
      const items = pageItems.filter((item) => selected.has(item.id));
      if (bulkActionForSelection(items) !== action || reconciling) return;
      if (!window.confirm(`${action === "VALIDATE" ? "Kiểm tra" : "Duyệt"} ${items.length} mục đã chọn?`)) return;
      const snapshot = items.map((item) => ({
        versionId: item.id,
        expectedRevision: item.revision,
        lifecycle: item.lifecycle,
      }));
      root.querySelectorAll<HTMLButtonElement>("[data-policy-bulk-action]").forEach((item) => { item.disabled = true; });
      try {
        const result = await batchTransitionPolicyArtifacts(action, snapshot);
        const byId = new Map(result.results.map((item) => [item.versionId, item]));
        pageItems = pageItems.map((item) => {
          const outcome = byId.get(item.id);
          return outcome?.ok && outcome.artifact ? { ...outcome.artifact, active: item.active } : item;
        });
        selected = new Set(result.results.filter((item) => !item.ok).map((item) => item.versionId));
        renderBatchResult(result.results.map((item) => item.ok ? `${item.versionId}: thành công` : `${item.versionId}: ${item.errorCode ?? "lỗi"}`), result.summary.succeeded, result.summary.failed);
        renderPage();
        if (result.summary.failed === 0) {
          notify(`Đã ${action === "VALIDATE" ? "kiểm tra" : "duyệt"} ${result.summary.succeeded} mục.`);
          await loadPage(true);
        }
      } catch (error) {
        if (isAmbiguousTransportFailure(error)) {
          await reconcileAfterAmbiguousFailure(action, snapshot);
        } else {
          notify(error instanceof Error ? error.message : "Không thể thực hiện thao tác hàng loạt.");
        }
      } finally {
        root.querySelectorAll<HTMLButtonElement>("[data-policy-bulk-action]").forEach((item) => { item.disabled = false; });
        updateBulkBar();
      }
    });
  });

  const renderBatchResult = (lines: readonly string[], succeeded: number, failed: number) => {
    const target = root.querySelector<HTMLElement>("[data-policy-batch-result]");
    if (!target) return;
    target.innerHTML = `<strong>${succeeded} thành công · ${failed} cần xem lại</strong>${lines.length ? `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}`;
  };

  const reconcileAfterAmbiguousFailure = async (
    action: "VALIDATE" | "APPROVE",
    snapshot: readonly (PolicyBatchItem & { lifecycle: PolicyLifecycle })[],
  ) => {
    reconciling = true;
    updateBulkBar();
    const targetLifecycle: PolicyLifecycle = action === "VALIDATE" ? "VALIDATED" : "APPROVED";
    const retryable = new Set<string>();
    let recovered = 0;
    let manual = 0;
    const details: string[] = [];
    const reconciled = await Promise.all(snapshot.map(async (item) => {
      try {
        return { item, current: await getPolicyArtifact(item.versionId) };
      } catch {
        return { item, current: null };
      }
    }));
    for (const entry of reconciled) {
      if (entry.current?.lifecycle === targetLifecycle && entry.current.revision > entry.item.expectedRevision) {
        recovered += 1;
        details.push(`${entry.item.versionId}: đã hoàn tất trước khi mất phản hồi`);
      } else if (
        entry.current?.lifecycle === entry.item.lifecycle &&
        entry.current.revision === entry.item.expectedRevision
      ) {
        retryable.add(entry.item.versionId);
        details.push(`${entry.item.versionId}: chưa thay đổi, có thể chọn gửi lại`);
      } else {
        manual += 1;
        details.push(`${entry.item.versionId}: trạng thái đã đổi hoặc không đọc được, cần xem lại thủ công`);
      }
      if (entry.current) {
        pageItems = pageItems.map((row) => row.id === entry.current!.id ? { ...entry.current!, active: row.active } : row);
      }
    }
    selected = retryable;
    renderBatchResult(details, recovered, manual + retryable.size);
    notify("Đã đối chiếu trạng thái sau lỗi kết nối; hệ thống không tự gửi lại batch.");
    reconciling = false;
    renderPage();
  };

  root.querySelector<HTMLButtonElement>("[data-policy-simulate]")?.addEventListener("click", async () => {
    const versions = data.artifacts.filter((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle)).map(({ id }) => id).slice(0, 20);
    if (!versions.length || !window.confirm("Mô phỏng trên dữ liệu chat đã ẩn danh? Thao tác này không gửi tin hay gắn tag.")) return;
    try {
      await startPolicySimulation(versions, pageId);
      notify("Đã đưa lượt mô phỏng vào hàng chờ.");
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể chạy mô phỏng.");
    }
  });

  root.addEventListener("keydown", (event) => {
    if (isEditingContext() || event.altKey || event.ctrlKey || event.metaKey) return;
    const rows = [...root.querySelectorAll<HTMLElement>("[data-policy-row]")];
    if (!rows.length) return;
    const currentIndex = Math.max(0, rows.findIndex((row) => row.dataset.policyRow === focusedRowId));
    if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
      event.preventDefault();
      const delta = event.key.toLowerCase() === "j" ? 1 : -1;
      const next = rows[Math.min(rows.length - 1, Math.max(0, currentIndex + delta))];
      next?.focus();
      return;
    }
    const current = pageItems.find((item) => item.id === focusedRowId);
    if (event.key === "Enter" && current) {
      event.preventDefault();
      void openReview(current.id);
    } else if (event.key.toLowerCase() === "a" && current?.lifecycle === "VALIDATED") {
      event.preventDefault();
      void openReview(current.id);
    }
  });

  syncFilterControls(root, currentQuery());
  void loadPage(true);
}

function renderReviewDrawer(context: PolicyReviewContext, identity: Identity): string {
  const artifact = context.artifact;
  const content = artifact.kind === "SIZE_CHART"
    ? `${renderSizeChartReview(artifact.content)}<details><summary>Xem cấu hình gốc chỉ đọc</summary>${renderContent(artifact.content)}</details>`
    : renderContent(artifact.content);
  const diff = context.previousVersion
    ? `<section><h3>Thay đổi so với v${context.previousVersion.version}</h3>${renderDiff(context.previousVersion.content, artifact.content)}</section>`
    : `<section><h3>Thay đổi</h3><p>Không có phiên bản trước để so sánh.</p></section>`;
  const pointers = context.activePointers.length
    ? `<ul class="policy-pointer-list">${context.activePointers.map((pointer) => `<li><strong>${escapeHtml(pointer.channel)}</strong><span>${escapeHtml(pointer.pageId ?? "Toàn shop")} · revision ${pointer.revision}</span></li>`).join("")}</ul>`
    : "<p>Phiên bản này không có con trỏ đang hoạt động trong phạm vi bạn được phép xem.</p>";
  return `<aside class="policy-review-drawer" role="dialog" aria-modal="true" aria-labelledby="policy-review-title" tabindex="-1">
    <header><div><small>${escapeHtml(kindLabels[artifact.kind])}</small><h2 id="policy-review-title">${escapeHtml(artifact.key)} · v${artifact.version}</h2></div><button type="button" class="icon-button" data-close-detail aria-label="Đóng">×</button></header>
    <section class="policy-review-drawer__meta"><span><strong>Trạng thái</strong>${escapeHtml(lifecycleLabels[artifact.lifecycle])}</span><span><strong>Revision</strong>${artifact.revision}</span><span><strong>Cập nhật</strong>${escapeHtml(formatDateTime(artifact.updatedAt))}</span><span><strong>Người sửa</strong>${escapeHtml(artifact.updatedBy || "—")}</span><span><strong>Kiểm tra</strong>${artifact.lifecycle === "DRAFT" ? "Chưa xác nhận" : "Đã qua kiểm tra"}</span></section>
    <section><h3>Đang dùng</h3>${pointers}</section>
    <section><h3>Nội dung</h3>${content}</section>
    ${diff}
    <footer class="policy-review-drawer__actions">${renderDrawerActions(context, identity)}</footer>
  </aside>`;
}

function renderDrawerActions(context: PolicyReviewContext, identity: Identity): string {
  const artifact = context.artifact;
  const rollback = context.rollbackCandidates.map((candidate, index) => `<button type="button" class="secondary-button" data-policy-drawer-rollback="${index}">Quay lại v${candidate.targetVersion.version}</button>`).join("");
  switch (artifact.lifecycle) {
    case "DRAFT":
      return `<button type="button" class="secondary-button" data-policy-edit>Chỉnh sửa</button><button type="button" data-policy-drawer-action="VALIDATE">Kiểm tra cấu hình</button>`;
    case "VALIDATED":
      return `<button type="button" data-policy-drawer-action="APPROVE">Duyệt phiên bản</button>`;
    case "APPROVED":
      return `<button type="button" data-policy-drawer-action="START_CANARY" data-canary-mode="SHADOW">Thử nghiệm shadow</button>${identity.policyCanaryLiveEnabled ? '<button type="button" class="secondary-button" data-policy-drawer-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND">Thử nghiệm gửi thật</button>' : '<button type="button" class="secondary-button" disabled aria-disabled="true">Thử nghiệm gửi thật · đang khóa</button>'}`;
    case "CANARY":
      return `${identity.policyCanaryLiveEnabled && context.activePointers.some((pointer) => pointer.channel === "CANARY_SHADOW") ? '<button type="button" class="secondary-button" data-policy-drawer-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND">Chuyển sang canary gửi thật</button>' : ""}${identity.policyPublishEnabled ? '<button type="button" data-policy-drawer-action="PUBLISH">Phát hành cho page test</button>' : '<button type="button" disabled aria-disabled="true">Phát hành · đang khóa</button>'}${rollback}`;
    case "PUBLISHED":
      return `${rollback}${context.activePointers.length === 0 ? '<button type="button" class="secondary-button" data-policy-drawer-action="RETIRE">Ngừng phiên bản</button>' : ""}` || "<span>Đang được sử dụng</span>";
    case "RETIRED":
      return "<span>Chỉ đọc</span>";
  }
}

function policyQueryFromRoute(params: URLSearchParams): PolicyListQuery {
  const lifecycle = params.get("lifecycle") as PolicyLifecycle | null;
  const artifactKind = params.get("artifact_kind") as PolicyArtifact["kind"] | null;
  const active = (params.get("active") ?? "any") as PolicyActiveFilter;
  const sort = (params.get("sort") ?? "updated_desc") as PolicyListSort;
  return {
    limit: 50,
    ...(params.get("cursor") ? { cursor: params.get("cursor")! } : {}),
    ...(params.get("search") ? { search: params.get("search")! } : {}),
    ...(artifactKind ? { artifactKind } : {}),
    ...(lifecycle ? { lifecycle } : {}),
    active,
    sort,
  };
}

function syncFilterControls(root: HTMLElement, query: PolicyListQuery): void {
  const form = root.querySelector<HTMLFormElement>("[data-policy-filters]");
  if (form) {
    const set = (name: string, value: string) => {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) control.value = value;
    };
    set("search", query.search ?? "");
    set("artifact_kind", query.artifactKind ?? "");
    set("lifecycle", query.lifecycle ?? "");
    set("active", query.active ?? "any");
    set("sort", query.sort ?? "updated_desc");
  }
  const activeView = matchingQuickView(query);
  root.querySelectorAll<HTMLButtonElement>("[data-policy-view]").forEach((button) => {
    const active = button.dataset.policyView === activeView;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function matchingQuickView(query: PolicyListQuery): PolicyQuickView | null {
  if (query.search || query.artifactKind) return null;
  for (const view of ["review", "draft", "running", "all"] as const) {
    const preset = policyQuickViewQuery(view);
    if (
      query.lifecycle === preset.lifecycle &&
      (query.active ?? "any") === (preset.active ?? "any") &&
      (query.sort ?? "updated_desc") === (preset.sort ?? "updated_desc")
    ) return view;
  }
  return null;
}

function setRouteParam(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value); else params.delete(key);
}

function isAmbiguousTransportFailure(error: unknown): boolean {
  return error instanceof TypeError || error instanceof ApiError && error.status >= 500;
}

function renderContent(content: Record<string, unknown>): string {
  const rows = flatten(content).filter(([key]) => !key.endsWith("sourceMetadata.observedAt"));
  return `<dl class="policy-content">${rows.map(([key, value]) => `<div><dt>${escapeHtml(readableKey(key))}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("")}</dl>`;
}

function renderDiff(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const left = new Map(flatten(before).map(([key, value]) => [key, String(value)]));
  const right = new Map(flatten(after).map(([key, value]) => [key, String(value)]));
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  const changes = keys.filter((key) => left.get(key) !== right.get(key));
  if (!changes.length) return "<p>Không có thay đổi nội dung.</p>";
  return `<div class="policy-review-table__scroll"><table class="policy-diff"><thead><tr><th>Trường</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${changes.map((key) => `<tr><td>${escapeHtml(readableKey(key))}</td><td>${escapeHtml(left.get(key) ?? "—")}</td><td>${escapeHtml(right.get(key) ?? "—")}</td></tr>`).join("")}</tbody></table></div>`;
}

function flatten(value: unknown, prefix = ""): Array<[string, string | number | boolean]> {
  if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value === null ? "—" : value as string | number | boolean]];
}

function readableKey(key: string): string {
  return key.replaceAll(".", " › ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function openDraftEditor(
  artifact: PolicyArtifact,
  reload: () => Promise<void>,
  notify: (message: string) => void,
): void {
  const layer = document.querySelector<HTMLElement>("#command-modal-layer");
  if (!layer) return;
  const fields = editableFields(artifact.content);
  layer.innerHTML = `<div class="modal-scrim" data-policy-close data-close-command-modal></div><section class="command-modal policy-editor" role="dialog" aria-modal="true" tabindex="-1">
    <button class="icon-button command-modal__close" data-policy-close data-close-command-modal aria-label="Đóng">×</button>
    <small>CHỈNH SỬA BẢN NHÁP</small><h2>${escapeHtml(kindLabels[artifact.kind])} · v${artifact.version}</h2>
    <p>Biểu mẫu chỉ cho sửa các trường đã có trong schema; không thể thêm JSON, code, giá POS, tồn POS hoặc secret.</p>
    <form data-policy-editor-form><div class="policy-editor__fields">${fields.map(renderEditorField).join("")}</div>
      <p class="form-error" data-policy-form-error></p>
      <footer><button type="button" class="secondary-button" data-policy-close data-close-command-modal>Hủy</button><button type="submit">Lưu bản nháp</button></footer>
    </form></section>`;
  const dialog = layer.querySelector<HTMLElement>(".policy-editor");
  const cleanup = dialog ? activateDialog(dialog) : () => {};
  const close = () => { cleanup(); layer.innerHTML = ""; };
  layer.querySelectorAll<HTMLElement>("[data-policy-close]").forEach((element) => element.addEventListener("click", close));
  layer.querySelector<HTMLFormElement>("[data-policy-editor-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const updated = structuredClone(artifact.content);
    for (const input of form.querySelectorAll<HTMLInputElement>("[data-policy-path]")) {
      const path = JSON.parse(input.dataset.policyPath ?? "[]") as Array<string | number>;
      const value = input.type === "checkbox"
        ? input.checked
        : input.dataset.valueType === "number"
          ? Number(input.value)
          : input.dataset.valueType === "nullable" && input.value.trim() === ""
            ? null
            : input.value;
      setAtPath(updated, path, value);
    }
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      await updatePolicyArtifactDraft(artifact, updated);
      close();
      notify("Đã lưu bản nháp.");
      await reload();
    } catch (error) {
      const target = form.querySelector<HTMLElement>("[data-policy-form-error]");
      if (target) target.textContent = error instanceof Error ? error.message : "Không thể lưu bản nháp.";
      if (submit) submit.disabled = false;
    }
  });
}

interface EditableField {
  readonly path: Array<string | number>;
  readonly label: string;
  readonly value: string | number | boolean | null;
  readonly locked: boolean;
}

function editableFields(value: unknown, path: Array<string | number> = []): EditableField[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => editableFields(item, [...path, index]));
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => editableFields(item, [...path, key]));
  }
  const key = String(path.at(-1) ?? "");
  const locked = key === "schemaVersion" || key === "kind" || path.join(".").endsWith("sourceMetadata.source");
  return [{ path, label: readableKey(path.map(String).join(".")), value: value as string | number | boolean | null, locked }];
}

function renderEditorField(field: EditableField): string {
  const path = escapeHtml(JSON.stringify(field.path));
  const disabled = field.locked ? "disabled" : "";
  if (typeof field.value === "boolean") {
    return `<label class="policy-editor__toggle"><input type="checkbox" data-policy-path="${path}" ${field.value ? "checked" : ""} ${disabled}><span>${escapeHtml(field.label)}</span></label>`;
  }
  const type = typeof field.value === "number" ? "number" : "text";
  const valueType = field.value === null ? "nullable" : type;
  return `<label><span>${escapeHtml(field.label)}</span><input type="${type}" data-policy-path="${path}" data-value-type="${valueType}" value="${escapeHtml(field.value === null ? "" : String(field.value))}" ${disabled}></label>`;
}

function setAtPath(root: Record<string, unknown>, path: Array<string | number>, value: unknown): void {
  let target: unknown = root;
  for (const segment of path.slice(0, -1)) {
    target = (target as Record<string | number, unknown>)[segment];
  }
  (target as Record<string | number, unknown>)[path.at(-1)!] = value;
}
