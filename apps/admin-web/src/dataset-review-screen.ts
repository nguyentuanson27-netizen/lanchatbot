import { datasetExportPath } from "./api.js";
import { escapeHtml } from "./format.js";
import type { DatasetIndexEntry, DatasetProjectSummary } from "./dataset-review-types.js";
import type { Identity } from "./types.js";

// Pure render of the dataset-review landing page: every imported dataset and its
// annotation projects, each a link into the review queue. Redacted metadata only.

export function renderDatasetIndex(
  entries: readonly DatasetIndexEntry[],
  identity: Identity | null,
): string {
  const capability = identity?.datasetReview;
  const canAdmin = capability?.canAdmin === true;
  const canExport = capability?.export === true;
  if (entries.length === 0) {
    return `
      <section class="panel dataset-index">
        <header class="panel__head"><h2>Bộ dữ liệu đánh giá</h2></header>
        <div class="empty-state">
          <strong>Chưa có bộ dữ liệu nào</strong>
          <p>Nhập transcript qua CLI <code>dataset-import</code> trong môi trường dev được ủy quyền để bắt đầu.</p>
        </div>
      </section>`;
  }
  const cards = entries.map((entry) => renderDatasetCard(entry, canAdmin, canExport, capability?.canAdjudicate === true)).join("");
  return `<section class="dataset-index" data-dataset-index>${cards}</section>`;
}

function renderDatasetCard(entry: DatasetIndexEntry, canAdmin: boolean, canExport: boolean, canAdjudicate: boolean): string {
  const { dataset, projects } = entry;
  const projectRows = projects.length === 0
    ? `<p class="section-note">${canAdmin ? "Chưa có dự án gán nhãn. Tạo dự án qua API để bắt đầu review." : "Chưa có dự án gán nhãn."}</p>`
    : `<ul class="dataset-project-list">${projects.map((project) => renderProjectRow(project, canAdmin, canExport, canAdjudicate)).join("")}</ul>`;
  return `
    <article class="panel dataset-card">
      <header class="panel__head">
        <div>
          <h2>${escapeHtml(dataset.name)}</h2>
          <small class="section-note">${escapeHtml(dataset.sourceType)} · ${escapeHtml(dataset.status)}</small>
        </div>
        <dl class="dataset-card__stats">
          <div><dt>Đã nhập</dt><dd>${dataset.importedItems}/${dataset.totalItems}</dd></div>
          <div><dt>Lỗi</dt><dd>${dataset.failedItems}</dd></div>
        </dl>
      </header>
      ${projectRows}
    </article>`;
}

function renderProjectRow(
  project: DatasetProjectSummary,
  canAdmin: boolean,
  canExport: boolean,
  canAdjudicate: boolean,
): string {
  const exportLink = canExport
    ? `<a class="secondary-button" href="${escapeHtml(datasetExportPath(project.projectId))}" download>Xuất JSONL</a>`
    : "";
  const lockButton = canAdmin
    ? `<button type="button" class="secondary-button" data-dataset-lock="${escapeHtml(project.projectId)}">Khóa holdout</button>`
    : "";
  const adjudicationLink = canAdjudicate
    ? `<a class="secondary-button" href="#/datasets/${encodeURIComponent(project.projectId)}?adjudication=true">Phân xử</a>`
    : "";
  const controls = exportLink || lockButton || adjudicationLink
    ? `<div class="dataset-project-row__controls">${adjudicationLink}${exportLink}${lockButton}</div>`
    : "";
  return `
    <li class="dataset-project-row">
      <a class="dataset-project-row__open" href="#/datasets/${encodeURIComponent(project.projectId)}" data-dataset-project="${escapeHtml(project.projectId)}">
        <strong>${escapeHtml(project.name)}</strong>
        <small>${escapeHtml(project.status)} · ${escapeHtml(project.reviewMode)}</small>
      </a>
      ${controls}
    </li>`;
}
