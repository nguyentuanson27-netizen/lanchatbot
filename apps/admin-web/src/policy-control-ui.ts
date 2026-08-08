import {
  rollbackPolicyPointer,
  startPolicySimulation,
  transitionPolicyArtifact,
  updatePolicyArtifactDraft,
} from "./api.js";
import { escapeHtml, formatDateTime } from "./format.js";
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

export function renderPolicyControl(data: PolicyControlData, identity: Identity | null): string {
  if (!identity?.policyControl) {
    return `<section class="empty-state"><h3>Chức năng quản lý chính sách đang tắt</h3><p>Cần migration và bật riêng Policy Control Plane trước khi sử dụng.</p></section>`;
  }
  const counts = Object.fromEntries(
    (["DRAFT", "VALIDATED", "APPROVED", "CANARY", "PUBLISHED", "RETIRED"] as const)
      .map((state) => [state, data.artifacts.filter((item) => item.lifecycle === state).length]),
  );
  const cards = data.artifacts.map((artifact) => {
    const pointer = data.pointers.find((item) => item.versionId === artifact.id);
    const rollbackLifecycle = pointer?.channel === "PUBLISHED" ? "PUBLISHED" : "CANARY";
    const rollbackTarget = data.artifacts
      .filter((item) => item.key === artifact.key && item.kind === artifact.kind && item.lifecycle === rollbackLifecycle && item.id !== artifact.id)
      .sort((a, b) => b.version - a.version)[0];
    const previousVersion = data.artifacts
      .filter((item) => item.key === artifact.key && item.kind === artifact.kind && item.version < artifact.version)
      .sort((a, b) => b.version - a.version)[0];
    return `<article class="policy-card" data-policy-id="${escapeHtml(artifact.id)}">
      <header><div><small>${escapeHtml(kindLabels[artifact.kind])}</small><h3>${escapeHtml(artifact.key)}</h3></div>
        <span class="policy-state policy-state--${artifact.lifecycle.toLowerCase()}">${escapeHtml(lifecycleLabels[artifact.lifecycle])}</span></header>
      <dl><div><dt>Phiên bản</dt><dd>v${artifact.version}</dd></div><div><dt>Lần sửa</dt><dd>${artifact.revision}</dd></div>
        <div><dt>Cập nhật</dt><dd>${escapeHtml(formatDateTime(artifact.updatedAt))}</dd></div>
        <div><dt>Đang dùng</dt><dd>${pointer ? escapeHtml(pointer.channel.replaceAll("_", " ")) : "Không"}</dd></div></dl>
      <div class="policy-actions">${renderActions(artifact, pointer, rollbackTarget, identity)}</div>
      <details><summary>Xem cấu hình đã khóa</summary>${renderContent(artifact.content)}</details>
      ${previousVersion ? `<details><summary>So sánh với v${previousVersion.version}</summary>${renderDiff(previousVersion.content, artifact.content)}</details>` : ""}
    </article>`;
  }).join("");
  const pointers = data.pointers.map((pointer) => `<tr><td>${escapeHtml(kindLabels[pointer.kind])}</td><td>${escapeHtml(pointer.key)}</td><td>${escapeHtml(pointer.channel)}</td><td>v${pointer.version}</td><td>${escapeHtml(pointer.pageId ?? "Toàn shop")}</td></tr>`).join("");
  const simulations = data.simulations.map((run) => `<tr><td>${escapeHtml(formatDateTime(run.createdAt))}</td><td>${escapeHtml(run.status)}</td><td>${run.versionIds.length}</td><td>${run.maxConversations}</td></tr>`).join("");
  return `<section class="policy-safety" role="status"><strong>Chế độ an toàn tạm thời</strong><span>Shadow canary: bật · Canary gửi thật: ${identity.policyCanaryLiveEnabled ? "bật" : "khóa"} · Phát hành: ${identity.policyPublishEnabled ? "bật" : "khóa"}</span></section>
    <section class="policy-summary">
      <article><small>Bản nháp</small><strong>${counts.DRAFT}</strong></article>
      <article><small>Chờ duyệt</small><strong>${counts.VALIDATED}</strong></article>
      <article><small>Canary</small><strong>${counts.CANARY}</strong></article>
      <article><small>Đã phát hành</small><strong>${counts.PUBLISHED}</strong></article>
    </section>
    <section class="policy-toolbar"><div><h2>Phiên bản cấu hình</h2><p>PostgreSQL là nguồn chuẩn; giá và tồn POS không xuất hiện tại đây.</p></div>
      <button class="secondary-button" data-policy-simulate ${data.artifacts.some((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle)) ? "" : "disabled"}>Mô phỏng trên chat cũ</button></section>
    <section class="policy-grid">${cards || "<p>Chưa có bản cấu hình. Dữ liệu import sẽ vào trạng thái Bản nháp.</p>"}</section>
    <section class="panel policy-table"><header><h2>Con trỏ đang hoạt động</h2></header><table><thead><tr><th>Loại</th><th>Mã</th><th>Kênh</th><th>Phiên bản</th><th>Page</th></tr></thead><tbody>${pointers || "<tr><td colspan=5>Chưa phát hành cấu hình.</td></tr>"}</tbody></table></section>
    <section class="panel policy-table"><header><h2>Lịch sử mô phỏng</h2><small>Luôn tắt gửi tin và gắn tag</small></header><table><thead><tr><th>Thời gian</th><th>Trạng thái</th><th>Số cấu hình</th><th>Hội thoại tối đa</th></tr></thead><tbody>${simulations || "<tr><td colspan=4>Chưa chạy mô phỏng.</td></tr>"}</tbody></table></section>`;
}

function renderActions(
  artifact: PolicyArtifact,
  pointer: PolicyControlData["pointers"][number] | undefined,
  previous: PolicyArtifact | undefined,
  identity: Identity,
): string {
  switch (artifact.lifecycle) {
    case "DRAFT": return `<button class="secondary-button" data-policy-edit>Chỉnh sửa</button><button data-policy-action="VALIDATE">Kiểm tra cấu hình</button>`;
    case "VALIDATED": return `<button data-policy-action="APPROVE">Duyệt phiên bản</button>`;
    case "APPROVED": return `<button data-policy-action="START_CANARY" data-canary-mode="SHADOW">Thử nghiệm shadow</button>${identity.policyCanaryLiveEnabled
      ? `<button class="secondary-button" data-policy-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND">Thử nghiệm gửi thật</button>`
      : `<button class="secondary-button" data-policy-feature-disabled="CANARY_LIVE" disabled aria-disabled="true" title="Cần bật cổng an toàn Canary Live trên máy chủ">Thử nghiệm gửi thật · đang khóa</button>`}`;
    case "CANARY": return `${pointer?.channel === "CANARY_SHADOW"
      ? identity.policyCanaryLiveEnabled
        ? `<button class="secondary-button" data-policy-action="START_CANARY" data-canary-mode="LIVE_OUTBOUND">Chuyển sang canary gửi thật</button>`
        : `<button class="secondary-button" data-policy-feature-disabled="CANARY_LIVE" disabled aria-disabled="true" title="Cần bật cổng an toàn Canary Live trên máy chủ">Chuyển sang canary gửi thật · đang khóa</button>`
      : ""}${identity.policyPublishEnabled
      ? `<button data-policy-action="PUBLISH">Phát hành cho page test</button>`
      : `<button data-policy-feature-disabled="PUBLISHED" disabled aria-disabled="true" title="Cần bật cổng an toàn Publish trên máy chủ">Phát hành cho page test · đang khóa</button>`}${previous && pointer ? `<button class="secondary-button" data-policy-rollback="${escapeHtml(previous.id)}">Quay lại canary v${previous.version}</button>` : ""}`;
    case "PUBLISHED": return `${previous && pointer ? `<button class="secondary-button" data-policy-rollback="${escapeHtml(previous.id)}">Quay lại v${previous.version}</button>` : ""}${pointer ? "" : `<button class="secondary-button" data-policy-action="RETIRE">Ngừng phiên bản</button>`}`;
    case "RETIRED": return `<span>Chỉ đọc</span>`;
  }
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
  return `<table class="policy-diff"><thead><tr><th>Trường</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${changes.map((key) => `<tr><td>${escapeHtml(readableKey(key))}</td><td>${escapeHtml(left.get(key) ?? "—")}</td><td>${escapeHtml(right.get(key) ?? "—")}</td></tr>`).join("")}</tbody></table>`;
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

export function bindPolicyControl(
  data: PolicyControlData,
  identity: Identity | null,
  reload: () => Promise<void>,
  notify: (message: string) => void,
): void {
  const pageId = identity?.policyPageIds[0] ?? "1198992073286645";
  document.querySelectorAll<HTMLButtonElement>("[data-policy-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest<HTMLElement>("[data-policy-id]");
      const artifact = data.artifacts.find((item) => item.id === card?.dataset.policyId);
      if (artifact) openDraftEditor(artifact, reload, notify);
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-policy-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest<HTMLElement>("[data-policy-id]");
      const artifact = data.artifacts.find((item) => item.id === card?.dataset.policyId);
      const action = button.dataset.policyAction as "VALIDATE" | "APPROVE" | "START_CANARY" | "PUBLISH" | "RETIRE";
      if (!artifact || !action) return;
      const live = button.dataset.canaryMode === "LIVE_OUTBOUND";
      const warning = live
        ? "Canary gửi thật có thể trả lời khách trên page test. Tiếp tục?"
        : `${button.textContent?.trim() ?? "Thực hiện"}?`;
      if (!window.confirm(warning)) return;
      button.disabled = true;
      try {
        await transitionPolicyArtifact(
          artifact,
          action,
          action === "START_CANARY" || action === "PUBLISH" ? pageId : null,
          action === "START_CANARY" ? (live ? "LIVE_OUTBOUND" : "SHADOW") : null,
        );
        notify("Đã cập nhật phiên bản cấu hình.");
        await reload();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Không thể cập nhật cấu hình.");
        button.disabled = false;
      }
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-policy-rollback]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest<HTMLElement>("[data-policy-id]");
      const current = data.artifacts.find((item) => item.id === card?.dataset.policyId);
      const pointer = data.pointers.find((item) => item.versionId === current?.id);
      if (!pointer || !button.dataset.policyRollback || !window.confirm("Quay lại phiên bản tương thích trước?")) return;
      await rollbackPolicyPointer(pointer, button.dataset.policyRollback);
      notify("Đã rollback bằng cách đổi con trỏ đang dùng.");
      await reload();
    });
  });
  document.querySelector<HTMLButtonElement>("[data-policy-simulate]")?.addEventListener("click", async () => {
    const versions = data.artifacts.filter((item) => ["APPROVED", "CANARY", "PUBLISHED"].includes(item.lifecycle)).map(({ id }) => id).slice(0, 20);
    if (!versions.length || !window.confirm("Mô phỏng trên dữ liệu chat đã ẩn danh? Thao tác này không gửi tin hay gắn tag.")) return;
    await startPolicySimulation(versions, pageId);
    notify("Đã đưa lượt mô phỏng vào hàng chờ.");
    await reload();
  });
}

function openDraftEditor(
  artifact: PolicyArtifact,
  reload: () => Promise<void>,
  notify: (message: string) => void,
): void {
  const layer = document.querySelector<HTMLElement>("#command-modal-layer");
  if (!layer) return;
  const fields = editableFields(artifact.content);
  layer.innerHTML = `<div class="modal-scrim" data-policy-close></div><section class="command-modal policy-editor" role="dialog" aria-modal="true">
    <button class="icon-button command-modal__close" data-policy-close aria-label="Đóng">×</button>
    <small>CHỈNH SỬA BẢN NHÁP</small><h2>${escapeHtml(kindLabels[artifact.kind])} · v${artifact.version}</h2>
    <p>Biểu mẫu chỉ cho sửa các trường đã có trong schema; không thể thêm JSON, code, giá POS, tồn POS hoặc secret.</p>
    <form data-policy-editor-form><div class="policy-editor__fields">${fields.map(renderEditorField).join("")}</div>
      <p class="form-error" data-policy-form-error></p>
      <footer><button type="button" class="secondary-button" data-policy-close>Hủy</button><button type="submit">Lưu bản nháp</button></footer>
    </form></section>`;
  layer.querySelectorAll<HTMLElement>("[data-policy-close]").forEach((element) => {
    element.addEventListener("click", () => { layer.innerHTML = ""; });
  });
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
      layer.innerHTML = "";
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
  const locked = key === "schemaVersion" || key === "kind" ||
    path.join(".").endsWith("sourceMetadata.source");
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
