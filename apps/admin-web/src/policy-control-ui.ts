import "./policy-control.css";
import {
  rollbackPolicyPointer,
  startPolicySimulation,
  transitionPolicyArtifact,
  updatePolicyArtifactDraft,
} from "./api.js";
import {
  getPolicyReviewContext,
  listPolicyArtifacts,
  listPolicyPageIds,
  type PolicyActiveFilter,
  type PolicyArtifactRow,
  type PolicyListQuery,
  type PolicyListSort,
  type PolicyReviewContext,
} from "./policy-control-review-api.js";
import {
  createLatestPolicyListLoader,
  createLatestPolicyReviewLoader,
  policyPageChoices,
  resolvePolicyPageContext,
} from "./policy-control-runtime.js";
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

export type PolicyQuickView = "review" | "draft" | "running" | "all";

export function policyQuickViewQuery(view: PolicyQuickView): Pick<PolicyListQuery, "lifecycle" | "active" | "sort"> {
  switch (view) {
    case "review": return { lifecycle: "VALIDATED", active: "any", sort: "validated_oldest" };
    case "draft": return { lifecycle: "DRAFT", active: "any", sort: "updated_desc" };
    case "running": return { lifecycle: undefined, active: "active", sort: "updated_desc" };
    case "all": return { lifecycle: undefined, active: "any", sort: "updated_desc" };
  }
}

export function nextReviewArtifactId(artifacts: readonly PolicyArtifact[], currentId: string): string | null {
  if (!artifacts.length) return null;
  const currentIndex = artifacts.findIndex((item) => item.id === currentId);
  if (currentIndex < 0) return artifacts.find((item) => item.lifecycle === "VALIDATED")?.id ?? null;
  const after = artifacts.slice(currentIndex + 1).find((item) => item.lifecycle === "VALIDATED");
  if (after) return after.id;
  return artifacts.slice(0, currentIndex).find((item) => item.lifecycle === "VALIDATED")?.id ?? null;
}

function needsPolicyPageDirectory(identity: Identity): boolean {
  return identity.policyPageIds.includes("ALL") && identity.pageScope.includes("ALL");
}

export function renderPolicyControl(data: PolicyControlData, identity: Identity | null): string {
  if (!identity?.policyControl) return `<section class="empty-state"><h3>Chức năng quản lý chính sách đang tắt</h3><p>Cần migration và bật riêng Policy Control Plane trước khi sử dụng.</p></section>`;
  const initialRows: PolicyArtifactRow[] = data.artifacts.map((artifact) => ({ ...artifact, active: data.pointers.some((pointer) => pointer.versionId === artifact.id) }));
  const pageDirectoryRequired = needsPolicyPageDirectory(identity);
  const pageChoices = pageDirectoryRequired ? [] : policyPageChoices(identity, data);
  const initialPageId = resolvePolicyPageContext(pageChoices, readRouteParams().get("policy_page"));
  const hasSimulationVersions = data.artifacts.some((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle));
  const pageOptions = pageChoices.map((pageId) => `<option value="${escapeHtml(pageId)}" ${pageId === initialPageId ? "selected" : ""}>${escapeHtml(pageId)}</option>`).join("");
  const pagePlaceholder = pageDirectoryRequired ? "Đang tải page…" : pageChoices.length ? "Chọn page…" : "Chưa có page cụ thể";
  const pointers = data.pointers.map((pointer) => `<tr><td>${escapeHtml(kindLabels[pointer.kind])}</td><td>${escapeHtml(pointer.key)}</td><td>${escapeHtml(pointer.channel)}</td><td>v${pointer.version}</td><td>${escapeHtml(pointer.pageId ?? "Toàn shop")}</td></tr>`).join("");
  const simulations = data.simulations.map((run) => `<tr><td>${escapeHtml(formatDateTime(run.createdAt))}</td><td>${escapeHtml(run.status)}</td><td>${run.versionIds.length}</td><td>${run.maxConversations}</td></tr>`).join("");
  return `<section class="policy-review" data-policy-root tabindex="-1">
    <section class="policy-safety" role="status"><strong>Chế độ an toàn tạm thời</strong><span>Shadow canary: bật · Canary gửi thật: ${identity.policyCanaryLiveEnabled ? "bật" : "khóa"} · Phát hành: ${identity.policyPublishEnabled ? "bật" : "khóa"}</span></section>
    <section class="policy-review__header"><div><h2>Phiên bản cấu hình</h2><p>Lọc và rà soát theo trang. PostgreSQL vẫn là nguồn chuẩn policy artifact.</p></div><div class="policy-review__page-actions"><label class="policy-page-context"><span>Page thao tác</span><select data-policy-page-select aria-label="Page cho Canary, Publish và mô phỏng" ${pageChoices.length && !pageDirectoryRequired ? "" : "disabled"}><option value="">${pagePlaceholder}</option>${pageOptions}</select><small>Canary, Publish và mô phỏng chỉ chạy trên page đã chọn.</small></label><button class="secondary-button" data-policy-simulate ${hasSimulationVersions && initialPageId ? "" : "disabled"}>Mô phỏng trên chat cũ</button></div></section>
    <nav class="policy-quick-views" aria-label="Bộ lọc nhanh"><button type="button" class="secondary-button" data-policy-view="review">Cần duyệt</button><button type="button" class="secondary-button" data-policy-view="draft">Bản nháp</button><button type="button" class="secondary-button" data-policy-view="running">Đang chạy</button><button type="button" class="secondary-button" data-policy-view="all">Tất cả</button></nav>
    <form class="policy-filters" data-policy-filters><label class="policy-filters__search"><span>Tìm mã</span><input name="search" type="search" maxlength="120" autocomplete="off" placeholder="SQ603"></label><label><span>Loại</span><select name="artifact_kind"><option value="">Tất cả loại</option>${Object.entries(kindLabels).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}</select></label><label><span>Trạng thái</span><select name="lifecycle"><option value="">Tất cả trạng thái</option>${Object.entries(lifecycleLabels).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}</select></label><label><span>Đang dùng</span><select name="active"><option value="any">Tất cả</option><option value="active">Đang dùng</option><option value="inactive">Chưa dùng</option></select></label><label><span>Sắp xếp</span><select name="sort"><option value="updated_desc">Mới cập nhật</option><option value="validated_oldest">Chờ duyệt lâu nhất</option><option value="artifact_key_asc">Mã A → Z</option></select></label><button type="submit">Áp dụng</button></form>
    <section class="panel policy-review-table" aria-busy="false"><div class="policy-review-table__scroll" data-policy-table>${renderPolicyListTable(initialRows)}</div><footer class="policy-pagination" data-policy-pagination></footer></section>
    <section class="panel policy-table"><header><h2>Con trỏ đang hoạt động</h2><small>Giữ ngữ cảnh Canary/Publish/Rollback hiện tại.</small></header><div class="policy-review-table__scroll"><table><thead><tr><th>Loại</th><th>Mã</th><th>Kênh</th><th>Phiên bản</th><th>Page</th></tr></thead><tbody>${pointers || "<tr><td colspan=5>Chưa phát hành cấu hình.</td></tr>"}</tbody></table></div></section>
    <section class="panel policy-table"><header><h2>Lịch sử mô phỏng</h2><small>Luôn tắt gửi tin và gắn tag</small></header><div class="policy-review-table__scroll"><table><thead><tr><th>Thời gian</th><th>Trạng thái</th><th>Số cấu hình</th><th>Hội thoại tối đa</th></tr></thead><tbody>${simulations || "<tr><td colspan=4>Chưa chạy mô phỏng.</td></tr>"}</tbody></table></div></section>
  </section>`;
}

export function renderPolicyListTable(items: readonly PolicyArtifactRow[]): string {
  const body = items.map((artifact) => `<tr data-policy-row="${escapeHtml(artifact.id)}" tabindex="0"><td><strong>${escapeHtml(artifact.key)}</strong><small>${escapeHtml(artifact.updatedBy || "—")}</small></td><td>${escapeHtml(kindLabels[artifact.kind])}</td><td><span class="policy-state policy-state--${artifact.lifecycle.toLowerCase()}">${escapeHtml(lifecycleLabels[artifact.lifecycle])}</span></td><td>v${artifact.version}</td><td>${artifact.revision}</td><td>${escapeHtml(formatDateTime(artifact.updatedAt))}</td><td><span class="policy-active ${artifact.active ? "policy-active--yes" : ""}">${artifact.active ? "Đang dùng" : "Chưa dùng"}</span></td><td><button type="button" class="secondary-button policy-row-action" data-policy-open="${escapeHtml(artifact.id)}">Xem</button></td></tr>`).join("");
  return `<table class="policy-list-table"><thead><tr><th>Mã</th><th>Loại</th><th>Trạng thái</th><th>Version</th><th>Revision</th><th>Cập nhật</th><th>Đang dùng</th><th>Hành động</th></tr></thead><tbody>${body || "<tr><td colspan=8 class=\"policy-empty\">Không có cấu hình phù hợp bộ lọc.</td></tr>"}</tbody></table>`;
}

export function bindPolicyControl(data: PolicyControlData, identity: Identity | null, reload: () => Promise<void>, notify: (message: string) => void): void {
  const root = document.querySelector<HTMLElement>("[data-policy-root]");
  if (!root || !identity?.policyControl) return;
  const pageDirectoryRequired = needsPolicyPageDirectory(identity);
  let pageDirectoryLoading = pageDirectoryRequired;
  let pageChoices = pageDirectoryRequired ? [] : policyPageChoices(identity, data);
  const requestedPageId = readRouteParams().get("policy_page");
  let selectedPageId = resolvePolicyPageContext(pageChoices, requestedPageId);
  let pageItems: PolicyArtifactRow[] = [];
  let nextCursor: string | null = null;
  let focusedRowId: string | null = null;
  let loadGeneration = 0;
  let reviewCleanup: (() => void) | null = null;
  const latestListLoader = createLatestPolicyListLoader(listPolicyArtifacts);
  const latestReviewLoader = createLatestPolicyReviewLoader(getPolicyReviewContext);
  const hasSimulationVersions = data.artifacts.some((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle));
  const currentQuery = (): PolicyListQuery => policyQueryFromRoute(readRouteParams());

  const syncPageScopedActions = () => {
    const select = root.querySelector<HTMLSelectElement>("[data-policy-page-select]");
    if (select) {
      const placeholder = pageDirectoryLoading ? "Đang tải page…" : pageChoices.length ? "Chọn page…" : "Chưa có page cụ thể";
      select.innerHTML = `<option value="">${placeholder}</option>${pageChoices.map((pageId) => `<option value="${escapeHtml(pageId)}">${escapeHtml(pageId)}</option>`).join("")}`;
      select.disabled = pageDirectoryLoading || pageChoices.length === 0;
      select.value = selectedPageId ?? "";
    }
    const simulate = root.querySelector<HTMLButtonElement>("[data-policy-simulate]");
    if (simulate) simulate.disabled = !selectedPageId || !hasSimulationVersions;
  };

  const renderPage = () => {
    const table = root.querySelector<HTMLElement>("[data-policy-table]");
    if (table) table.innerHTML = renderPolicyListTable(pageItems);
    const pagination = root.querySelector<HTMLElement>("[data-policy-pagination]");
    if (pagination) pagination.innerHTML = `${readRouteParams().get("cursor") ? '<button type="button" class="secondary-button" data-policy-prev-page>Trang trước</button>' : ""}${nextCursor ? '<button type="button" class="secondary-button" data-policy-next-page>Trang tiếp</button>' : ""}`;
    bindPageRows();
  };

  const loadPage = async () => {
    const generation = ++loadGeneration;
    root.querySelector<HTMLElement>(".policy-review-table")?.setAttribute("aria-busy", "true");
    const query = currentQuery();
    try {
      const page = await latestListLoader(query);
      if (!page || generation !== loadGeneration) return;
      pageItems = page.items;
      nextCursor = page.nextCursor;
      renderPage();
      syncFilterControls(root, query);
    } catch (error) {
      if (generation === loadGeneration) notify(error instanceof Error ? error.message : "Không thể tải danh sách chính sách.");
    } finally {
      if (generation === loadGeneration) root.querySelector<HTMLElement>(".policy-review-table")?.setAttribute("aria-busy", "false");
    }
  };

  const closeReview = () => {
    latestReviewLoader.cancel();
    reviewCleanup?.();
    reviewCleanup = null;
    const layer = document.querySelector<HTMLElement>("#command-modal-layer");
    if (layer) layer.innerHTML = "";
  };

  const openReview = async (versionId: string) => {
    const layer = document.querySelector<HTMLElement>("#command-modal-layer");
    if (!layer) return;
    latestReviewLoader.cancel();
    reviewCleanup?.();
    reviewCleanup = null;
    layer.innerHTML = `<div class="modal-scrim" data-close-detail></div><aside class="policy-review-drawer" role="dialog" aria-modal="true" aria-label="Đang tải chi tiết chính sách" tabindex="-1"><p>Đang tải chi tiết…</p></aside>`;
    const loading = layer.querySelector<HTMLElement>(".policy-review-drawer");
    if (!loading) return;
    reviewCleanup = activateDialog(loading);
    layer.querySelector<HTMLElement>("[data-close-detail]")?.addEventListener("click", closeReview);
    try {
      const context = await latestReviewLoader.load(versionId);
      if (!context) return;
      reviewCleanup?.();
      reviewCleanup = null;
      layer.innerHTML = `<div class="modal-scrim" data-close-detail></div>${renderReviewDrawer(context, identity, selectedPageId)}`;
      const drawer = layer.querySelector<HTMLElement>(".policy-review-drawer");
      if (!drawer) return;
      reviewCleanup = activateDialog(drawer);
      layer.querySelectorAll<HTMLElement>("[data-close-detail]").forEach((element) => element.addEventListener("click", closeReview));
      bindDrawerActions(layer, context);
    } catch (error) {
      closeReview();
      notify(error instanceof Error ? error.message : "Không thể tải chi tiết chính sách.");
    }
  };

  const approveArtifact = async (artifact: PolicyArtifact, advance: boolean): Promise<boolean> => {
    if (!window.confirm(`Duyệt ${artifact.key} · v${artifact.version}?`)) return false;
    const nextBefore = advance ? nextReviewArtifactId(pageItems, artifact.id) : null;
    try {
      await transitionPolicyArtifact(artifact, "APPROVE", null, null);
      closeReview();
      notify("Đã duyệt phiên bản cấu hình.");
      await loadPage();
      if (advance) {
        const nextId = nextBefore && pageItems.some((item) => item.id === nextBefore) ? nextBefore : pageItems.find((item) => item.lifecycle === "VALIDATED")?.id ?? null;
        if (nextId) await openReview(nextId);
      }
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể duyệt cấu hình.");
      return false;
    }
  };

  const bindDrawerActions = (layer: HTMLElement, context: PolicyReviewContext) => {
    layer.querySelector<HTMLButtonElement>("[data-policy-edit]")?.addEventListener("click", () => { closeReview(); openDraftEditor(context.artifact, reload, notify); });
    layer.querySelector<HTMLButtonElement>("[data-policy-approve-next]")?.addEventListener("click", async (event) => { const button = event.currentTarget as HTMLButtonElement; button.disabled = true; const completed = await approveArtifact(context.artifact, true); if (!completed && button.isConnected) button.disabled = false; });
    layer.querySelectorAll<HTMLButtonElement>("[data-policy-drawer-action]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.policyDrawerAction as "VALIDATE" | "APPROVE" | "START_CANARY" | "PUBLISH" | "RETIRE";
      const pageScoped = action === "START_CANARY" || action === "PUBLISH";
      const actionPageId = pageScoped ? selectedPageId : null;
      if (pageScoped && !actionPageId) return notify("Hãy chọn page thao tác trước khi chạy Canary hoặc Publish.");
      const live = button.dataset.canaryMode === "LIVE_OUTBOUND";
      if (!window.confirm(live ? "Canary gửi thật có thể trả lời khách trên page test. Tiếp tục?" : `${button.textContent?.trim() ?? "Thực hiện"}?`)) return;
      button.disabled = true;
      try { await transitionPolicyArtifact(context.artifact, action, actionPageId, action === "START_CANARY" ? (live ? "LIVE_OUTBOUND" : "SHADOW") : null); closeReview(); notify("Đã cập nhật phiên bản cấu hình."); await reload(); }
      catch (error) { notify(error instanceof Error ? error.message : "Không thể cập nhật cấu hình."); button.disabled = false; }
    }));
    layer.querySelectorAll<HTMLButtonElement>("[data-policy-drawer-rollback]").forEach((button) => button.addEventListener("click", async () => {
      const candidate = context.rollbackCandidates[Number(button.dataset.policyDrawerRollback)];
      if (!candidate || !window.confirm(`Quay lại v${candidate.targetVersion.version}?`)) return;
      button.disabled = true;
      try { await rollbackPolicyPointer(candidate.pointer, candidate.targetVersion.id); closeReview(); notify("Đã rollback bằng cách đổi con trỏ đang dùng."); await reload(); }
      catch (error) { notify(error instanceof Error ? error.message : "Không thể rollback cấu hình."); button.disabled = false; }
    }));
  };

  const bindPageRows = () => {
    root.querySelectorAll<HTMLElement>("[data-policy-row]").forEach((row) => { row.addEventListener("focus", () => { focusedRowId = row.dataset.policyRow ?? null; }); row.addEventListener("click", (event) => { if ((event.target as HTMLElement).closest("button,input,a,select,label")) return; const id = row.dataset.policyRow; if (id) void openReview(id); }); });
    root.querySelectorAll<HTMLButtonElement>("[data-policy-open]").forEach((button) => button.addEventListener("click", () => { const id = button.dataset.policyOpen; if (id) void openReview(id); }));
    root.querySelector<HTMLButtonElement>("[data-policy-next-page]")?.addEventListener("click", () => { if (!nextCursor) return; const params = readRouteParams(); params.set("cursor", nextCursor); writeRouteParams(params, false); });
    root.querySelector<HTMLButtonElement>("[data-policy-prev-page]")?.addEventListener("click", () => history.back());
  };

  root.querySelector<HTMLSelectElement>("[data-policy-page-select]")?.addEventListener("change", (event) => { const select = event.currentTarget as HTMLSelectElement; selectedPageId = pageChoices.includes(select.value) ? select.value : null; const params = readRouteParams(); setRouteParam(params, "policy_page", selectedPageId ?? ""); writeRouteParams(params, true); syncPageScopedActions(); });
  root.querySelector<HTMLFormElement>("[data-policy-filters]")?.addEventListener("submit", (event) => { event.preventDefault(); const formData = new FormData(event.currentTarget as HTMLFormElement); const params = readRouteParams(); params.delete("cursor"); setRouteParam(params, "search", String(formData.get("search") ?? "").trim()); setRouteParam(params, "artifact_kind", String(formData.get("artifact_kind") ?? "")); setRouteParam(params, "lifecycle", String(formData.get("lifecycle") ?? "")); const active = String(formData.get("active") ?? "any"); setRouteParam(params, "active", active === "any" ? "" : active); let sort = String(formData.get("sort") ?? "updated_desc"); if (sort === "validated_oldest" && formData.get("lifecycle") !== "VALIDATED") sort = "updated_desc"; setRouteParam(params, "sort", sort === "updated_desc" ? "" : sort); writeRouteParams(params, true); void loadPage(); });
  root.querySelectorAll<HTMLButtonElement>("[data-policy-view]").forEach((button) => button.addEventListener("click", () => { const preset = policyQuickViewQuery(button.dataset.policyView as PolicyQuickView); const params = new URLSearchParams(); if (selectedPageId) params.set("policy_page", selectedPageId); if (preset.lifecycle) params.set("lifecycle", preset.lifecycle); if (preset.active && preset.active !== "any") params.set("active", preset.active); if (preset.sort && preset.sort !== "updated_desc") params.set("sort", preset.sort); writeRouteParams(params, true); void loadPage(); }));
  root.querySelector<HTMLButtonElement>("[data-policy-simulate]")?.addEventListener("click", async () => { if (!selectedPageId) return notify("Hãy chọn page thao tác trước khi mô phỏng."); const versions = data.artifacts.filter((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle)).map(({ id }) => id).slice(0, 20); if (!versions.length || !window.confirm("Mô phỏng trên dữ liệu chat đã ẩn danh? Thao tác này không gửi tin hay gắn tag.")) return; try { await startPolicySimulation(versions, selectedPageId); notify("Đã đưa lượt mô phỏng vào hàng chờ."); await reload(); } catch (error) { notify(error instanceof Error ? error.message : "Không thể chạy mô phỏng."); } });
  root.addEventListener("keydown", (event) => { if (isEditingContext() || event.altKey || event.ctrlKey || event.metaKey) return; const rows = [...root.querySelectorAll<HTMLElement>("[data-policy-row]")]; if (!rows.length) return; const currentIndex = Math.max(0, rows.findIndex((row) => row.dataset.policyRow === focusedRowId)); if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") { event.preventDefault(); rows[Math.min(rows.length - 1, Math.max(0, currentIndex + (event.key.toLowerCase() === "j" ? 1 : -1))]?.focus(); return; } const current = pageItems.find((item) => item.id === focusedRowId); if (event.key === "Enter" && current) { event.preventDefault(); void openReview(current.id); } else if (event.key.toLowerCase() === "a" && current?.lifecycle === "VALIDATED") { event.preventDefault(); void approveArtifact(current, false); } });

  syncPageScopedActions();
  if (pageDirectoryRequired) void listPolicyPageIds().then((directoryPageIds) => { pageChoices = policyPageChoices(identity, data, directoryPageIds); selectedPageId = resolvePolicyPageContext(pageChoices, requestedPageId); pageDirectoryLoading = false; syncPageScopedActions(); }).catch((error) => { pageChoices = []; selectedPageId = null; pageDirectoryLoading = false; syncPageScopedActions(); notify(error instanceof Error ? error.message : "Không thể tải danh sách page thao tác."); });
  syncFilterControls(root, currentQuery());
  void loadPage();
}

export function renderReviewDrawer(context: PolicyReviewContext, identity: Identity, selectedPageId: string | null = null): string {
  const artifact = context.artifact;
  const diff = context.previousVersion ? `<section><h3>Thay đổi so với v${context.previousVersion.version}</h3>${renderDiff(context.previousVersion.content, artifact.content)}</section>` : `<section><h3>Thay đổi</h3><p>Không có phiên bản trước để so sánh.</p></section>`;
  const pointers = context.activePointers.length ? `<ul class="policy-pointer-list">${context.activePointers.map((pointer) => `<li><strong>${escapeHtml(pointer.channel)}</strong><span>${escapeHtml(pointer.pageId ?? "Toàn shop")} · revision ${pointer.revision}</span></li>`).join("")}</ul>` : "<p>Phiên bản này không có con trỏ đang hoạt động trong phạm vi bạn được phép xem.</p>";
  return `<aside class="policy-review-drawer" role="dialog" aria-modal="true" aria-labelledby="policy-review-title" tabindex="-1"><header><div><small>${escapeHtml(kindLabels[artifact.kind])}</small><h2 id="policy-review-title">${escapeHtml(artifact.key)} · v${artifact.version}</h2></div><button type="button" class="icon-button" data-close-detail aria-label="Đóng">×</button></header><section class="policy-review-drawer__meta"><span><strong>Trạng thái</strong>${escapeHtml(lifecycleLabels[artifact.lifecycle])}</span><span><strong>Revision</strong>${artifact.revision}</span><span><strong>Cập nhật</strong>${escapeHtml(formatDateTime(artifact.updatedAt))}</span><span><strong>Người sửa</strong>${escapeHtml(artifact.updatedBy || "—")}</span><span><strong>Page thao tác</strong>${escapeHtml(selectedPageId ?? "Chưa chọn")}</span></section><section><h3>Đang dùng</h3>${pointers}</section><section><h3>Nội dung</h3>${renderContent(artifact.content)}</section>${diff}<footer class="policy-review-drawer__actions">${renderDrawerActions(context, identity, selectedPageId)}</footer></aside>`;
}

function renderDrawerActions(context: PolicyReviewContext, identity: Identity, selectedPageId: string | null): string {
  const artifact = context.artifact;
  const rollback = context.rollbackCandidates.map((candidate, index) => `<button type="button" class="secondary-button" data-policy-drawer-rollback="${index}">Quay lại v${candidate.targetVersion.version}</button>`).join("");
  const pageDisabled = selectedPageId ? "" : ' disabled aria-disabled="true" title="Chọn page thao tác trước"';
  switch (artifact.lifecycle) {
    case "DRAFT": return `<button type="button" class="secondary-button" data-policy-edit>Chỉnh sửa</button><button type="button" data-policy-drawer-action="VALIDATE">Kiểm tra cấu hình</button>`;
    case "VALIDATED": return `<button type="button" class="secondary-button" data-policy-approve-next>Duyệt & sang mục tiếp theo</button><button type="button" data-policy-drawer-action="APPROVE">Duyệt phiên bản</button>`;
    case "APPROVED": return `<button type="button" data-policy-drawer-action="START_CANARY" data-canary-mode="SHADOW"${pageDisabled}>Thử nghiệm shadow</button>${identity.policyCanaryLiveEnabled ? `<button type="button" class="secondary-button" data-policy-drawer-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND"${pageDisabled}>Thử nghiệm gửi thật</button>` : '<button type="button" class="secondary-button" disabled>Thử nghiệm gửi thật · đang khóa</button>'}`;
    case "CANARY": return `${identity.policyCanaryLiveEnabled && context.activePointers.some((pointer) => pointer.channel === "CANARY_SHADOW") ? `<button type="button" class="secondary-button" data-policy-drawer-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND"${pageDisabled}>Chuyển sang canary gửi thật</button>` : ""}${identity.policyPublishEnabled ? `<button type="button" data-policy-drawer-action="PUBLISH"${pageDisabled}>Phát hành cho page test</button>` : '<button type="button" disabled>Phát hành · đang khóa</button>'}${rollback}`;
    case "PUBLISHED": return `${rollback}${context.activePointers.length === 0 ? '<button type="button" class="secondary-button" data-policy-drawer-action="RETIRE">Ngừng phiên bản</button>' : ""}` || "<span>Đang được sử dụng</span>";
    case "RETIRED": return "<span>Chỉ đọc</span>";
  }
}

function policyQueryFromRoute(params: URLSearchParams): PolicyListQuery {
  const lifecycle = params.get("lifecycle") as PolicyLifecycle | null;
  const artifactKind = params.get("artifact_kind") as PolicyArtifact["kind"] | null;
  return { limit: 50, ...(params.get("cursor") ? { cursor: params.get("cursor")! } : {}), ...(params.get("search") ? { search: params.get("search")! } : {}), ...(artifactKind ? { artifactKind } : {}), ...(lifecycle ? { lifecycle } : {}), active: (params.get("active") ?? "any") as PolicyActiveFilter, sort: (params.get("sort") ?? "updated_desc") as PolicyListSort };
}

function syncFilterControls(root: HTMLElement, query: PolicyListQuery): void {
  const form = root.querySelector<HTMLFormElement>("[data-policy-filters]");
  if (form) { const set = (name: string, value: string) => { const control = form.elements.namedItem(name); if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) control.value = value; }; set("search", query.search ?? ""); set("artifact_kind", query.artifactKind ?? ""); set("lifecycle", query.lifecycle ?? ""); set("active", query.active ?? "any"); set("sort", query.sort ?? "updated_desc"); }
  const activeView = matchingQuickView(query);
  root.querySelectorAll<HTMLButtonElement>("[data-policy-view]").forEach((button) => { const active = button.dataset.policyView === activeView; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
}

function matchingQuickView(query: PolicyListQuery): PolicyQuickView | null {
  if (query.search || query.artifactKind) return null;
  for (const view of ["review", "draft", "running", "all"] as const) { const preset = policyQuickViewQuery(view); if (query.lifecycle === preset.lifecycle && (query.active ?? "any") === (preset.active ?? "any") && (query.sort ?? "updated_desc") === (preset.sort ?? "updated_desc")) return view; }
  return null;
}

function setRouteParam(params: URLSearchParams, key: string, value: string): void { if (value) params.set(key, value); else params.delete(key); }
function renderContent(content: Record<string, unknown>): string { const rows = flatten(content).filter(([key]) => !key.endsWith("sourceMetadata.observedAt")); return `<dl class="policy-content">${rows.map(([key, value]) => `<div><dt>${escapeHtml(readableKey(key))}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("")}</dl>`; }
function renderDiff(before: Record<string, unknown>, after: Record<string, unknown>): string { const left = new Map(flatten(before).map(([key, value]) => [key, String(value)])); const right = new Map(flatten(after).map(([key, value]) => [key, String(value)])); const keys = [...new Set([...left.keys(), ...right.keys()])].sort(); const changes = keys.filter((key) => left.get(key) !== right.get(key)); if (!changes.length) return "<p>Không có thay đổi nội dung.</p>"; return `<div class="policy-review-table__scroll"><table class="policy-diff"><thead><tr><th>Trường</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${changes.map((key) => `<tr><td>${escapeHtml(readableKey(key))}</td><td>${escapeHtml(left.get(key) ?? "—")}</td><td>${escapeHtml(right.get(key) ?? "—")}</td></tr>`).join("")}</tbody></table></div>`; }
function flatten(value: unknown, prefix = ""): Array<[string, string | number | boolean]> { if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`)); if (value !== null && typeof value === "object") return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key)); return [[prefix, value === null ? "—" : value as string | number | boolean]]; }
function readableKey(key: string): string { return key.replaceAll(".", " › ").replace(/([a-z])([A-Z])/g, "$1 $2"); }

function openDraftEditor(artifact: PolicyArtifact, reload: () => Promise<void>, notify: (message: string) => void): void {
  const layer = document.querySelector<HTMLElement>("#command-modal-layer"); if (!layer) return; const fields = editableFields(artifact.content); layer.innerHTML = `<div class="modal-scrim" data-policy-close></div><section class="command-modal policy-editor" role="dialog" aria-modal="true" tabindex="-1"><button class="icon-button command-modal__close" data-policy-close aria-label="Đóng">×</button><small>CHỈNH SỬA BẢN NHÁP</small><h2>${escapeHtml(kindLabels[artifact.kind])} · v${artifact.version}</h2><form data-policy-editor-form><div class="policy-editor__fields">${fields.map(renderEditorField).join("")}</div><p class="form-error" data-policy-form-error></p><footer><button type="button" class="secondary-button" data-policy-close>Hủy</button><button type="submit">Lưu bản nháp</button></footer></form></section>`; const dialog = layer.querySelector<HTMLElement>(".policy-editor"); const cleanup = dialog ? activateDialog(dialog) : () => {}; const close = () => { cleanup(); layer.innerHTML = ""; }; layer.querySelectorAll<HTMLElement>("[data-policy-close]").forEach((element) => element.addEventListener("click", close)); layer.querySelector<HTMLFormElement>("[data-policy-editor-form]")?.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const updated = structuredClone(artifact.content); for (const input of form.querySelectorAll<HTMLInputElement>("[data-policy-path]")) { const path = JSON.parse(input.dataset.policyPath ?? "[]") as Array<string | number>; const value = input.type === "checkbox" ? input.checked : input.dataset.valueType === "number" ? Number(input.value) : input.dataset.valueType === "nullable" && input.value.trim() === "" ? null : input.value; setAtPath(updated, path, value); } const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]'); if (submit) submit.disabled = true; try { await updatePolicyArtifactDraft(artifact, updated); close(); notify("Đã lưu bản nháp."); await reload(); } catch (error) { const target = form.querySelector<HTMLElement>("[data-policy-form-error]"); if (target) target.textContent = error instanceof Error ? error.message : "Không thể lưu bản nháp."; if (submit) submit.disabled = false; } });
}

interface EditableField { readonly path: Array<string | number>; readonly label: string; readonly value: string | number | boolean | null; readonly locked: boolean; }
function editableFields(value: unknown, path: Array<string | number> = []): EditableField[] { if (Array.isArray(value)) return value.flatMap((item, index) => editableFields(item, [...path, index])); if (value !== null && typeof value === "object") return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => editableFields(item, [...path, key])); const key = String(path.at(-1) ?? ""); return [{ path, label: readableKey(path.map(String).join(".")), value: value as string | number | boolean | null, locked: key === "schemaVersion" || key === "kind" || path.join(".").endsWith("sourceMetadata.source") }]; }
function renderEditorField(field: EditableField): string { const path = escapeHtml(JSON.stringify(field.path)); const disabled = field.locked ? "disabled" : ""; if (typeof field.value === "boolean") return `<label class="policy-editor__toggle"><input type="checkbox" data-policy-path="${path}" ${field.value ? "checked" : ""} ${disabled}><span>${escapeHtml(field.label)}</span></label>`; const type = typeof field.value === "number" ? "number" : "text"; const valueType = field.value === null ? "nullable" : type; return `<label><span>${escapeHtml(field.label)}</span><input type="${type}" data-policy-path="${path}" data-value-type="${valueType}" value="${escapeHtml(field.value === null ? "" : String(field.value))}" ${disabled}></label>`; }
function setAtPath(root: Record<string, unknown>, path: Array<string | number>, value: unknown): void { let target: unknown = root; for (const segment of path.slice(0, -1)) target = (target as Record<string | number, unknown>)[segment]; (target as Record<string | number, unknown>)[path.at(-1)!] = value; }
