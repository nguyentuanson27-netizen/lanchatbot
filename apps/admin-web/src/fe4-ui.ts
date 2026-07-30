import { escapeHtml, formatDateTime, formatNumber } from "./format.js";
import type { AcquisitionReport, ProductMediaPipeline } from "./types.js";

const percent = (value: number | null): string => value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const delta = (current: number | null, previous: number | null): string => {
  if (current === null || previous === null) return "Chưa đủ mẫu so sánh";
  const value = current - previous;
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} điểm % so với kỳ trước`;
};

export function renderAdsFunnel(report: AcquisitionReport): string {
  const stageCards = report.stages.map((stage, index) => `
    <article class="fe4-funnel__stage">
      <span>${index + 1}</span>
      <div><small>${escapeHtml(stage.label)}</small><strong>${formatNumber(stage.count)}</strong></div>
      <dl><div><dt>Tỷ lệ</dt><dd>${percent(stage.rate)}</dd></div><div><dt>Mẫu số</dt><dd>${formatNumber(stage.denominator)}</dd></div></dl>
      <em class="${(stage.rate ?? 0) >= (stage.previousRate ?? 0) ? "is-up" : "is-down"}">${escapeHtml(delta(stage.rate, stage.previousRate))}</em>
    </article>`).join("");
  const groups = report.breakdowns.map((group) => `
    <section class="panel fe4-breakdown" data-fe4-breakdown="${escapeHtml(group.key)}">
      <div class="panel__header"><div><h3>${escapeHtml(group.title)}</h3><p>Mỗi tỷ lệ luôn hiển thị cả tử số và mẫu số.</p></div></div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Nhóm</th><th>Ads entry</th><th>Đủ điều kiện</th><th>Xác nhận mua</th></tr></thead><tbody>
        ${group.items.map((item) => `<tr data-fe4-label="${escapeHtml(item.label.toLowerCase())}"><td><strong>${escapeHtml(item.label)}</strong></td><td>${formatNumber(item.adEntries)}</td><td>${formatNumber(item.qualified)} / ${formatNumber(item.adEntries)}</td><td>${formatNumber(item.purchaseConfirmed)} / ${formatNumber(item.adEntries)}</td></tr>`).join("")}
      </tbody></table></div>
    </section>`).join("");
  return `
    <section class="panel fe4-toolbar">
      <div><h2>Phễu Meta Ads</h2><p>Dữ liệu analytics chỉ đọc; NO_RESPONSE không kích hoạt gửi tin.</p></div>
      <label>Khoảng thời gian<select id="ads-lookback"><option value="24"${report.lookbackHours === 24 ? " selected" : ""}>24 giờ</option><option value="168"${report.lookbackHours === 168 ? " selected" : ""}>7 ngày</option><option value="720"${report.lookbackHours === 720 ? " selected" : ""}>30 ngày</option><option value="2160"${report.lookbackHours === 2160 ? " selected" : ""}>90 ngày</option></select></label>
      <label>Chiều phân tích<select id="ads-dimension"><option value="all">Tất cả</option>${report.breakdowns.map((group) => `<option value="${escapeHtml(group.key)}">${escapeHtml(group.title)}</option>`).join("")}</select></label>
      <label>Tìm trong breakdown<input id="ads-breakdown-search" type="search" placeholder="Ad, post, sản phẩm…"></label>
    </section>
    <section class="fe4-funnel" aria-label="Các bước phễu Meta Ads">${stageCards}</section>
    <div class="metrics-grid fe4-no-response"><article class="metric-card"><span>Không phản hồi sau 1 giờ</span><strong>${formatNumber(report.noResponse1h)}</strong><small>Chỉ số analytics, không outbound</small></article><article class="metric-card"><span>Không phản hồi sau 24 giờ</span><strong>${formatNumber(report.noResponse24h)}</strong><small>Chỉ số analytics, không outbound</small></article></div>
    <div class="dashboard-grid fe4-breakdowns">${groups || '<section class="panel"><p>Chưa có dữ liệu breakdown trong kỳ.</p></section>'}</div>`;
}

const stageLabel: Record<string, string> = {
  PENDING_AI: "Chờ AI", PENDING_REVIEW: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối",
  ACTIVE: "Đang hoạt động", QDRANT: "Đã lên Qdrant", ERROR: "Lỗi",
};

export function renderMediaPipeline(pipeline: ProductMediaPipeline): string {
  const stages = ["PENDING_AI", "PENDING_REVIEW", "APPROVED", "REJECTED", "ACTIVE", "QDRANT", "ERROR"];
  const summary = stages.map((stage) => `<button type="button" data-media-stage="${stage}"><strong>${formatNumber(pipeline.counts[stage] ?? 0)}</strong><small>${stageLabel[stage]}</small></button>`).join("");
  const rows = pipeline.items.map((item) => `
    <tr data-media-row data-media-stage-value="${escapeHtml(item.stage)}" data-media-label="${escapeHtml(`${item.maSp} ${item.brand}`.toLowerCase())}">
      <td><span class="fe4-media-thumb">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">` : "—"}</span></td>
      <td><strong>${escapeHtml(item.maSp)}</strong><small>${escapeHtml(item.brand)}</small></td>
      <td><span class="badge">${escapeHtml(stageLabel[item.stage] ?? item.stage)}</span>${item.reviewStatus ? `<small>Duyệt: ${escapeHtml(item.reviewStatus)}</small>` : ""}</td>
      <td><code>${escapeHtml(item.imageHash.slice(0, 12))}</code>${item.duplicateChecksum ? '<small class="text-danger">Trùng checksum</small>' : ""}</td>
      <td>${item.lastAttemptAt ? escapeHtml(formatDateTime(item.lastAttemptAt)) : "—"}${item.error ? `<small class="text-danger">${escapeHtml(item.error)}</small>` : ""}</td>
      <td>${item.retryable ? `<button type="button" class="secondary-button" data-media-retry="${escapeHtml(item.intakeId)}">Thử lại an toàn</button>` : "—"}</td>
    </tr>`).join("");
  return `
    <section class="panel product-media-pipeline">
      <div class="panel__header"><div><h2>Pipeline ảnh</h2><p>manual_image_intake → AI → duyệt → ACTIVE → Qdrant. Upload không ghi thẳng Qdrant.</p></div></div>
      <div class="fe4-stage-summary">${summary}</div>
      <div class="fe4-media-filters"><label>Trạng thái<select id="media-stage-filter"><option value="all">Tất cả</option>${stages.map((stage) => `<option value="${stage}">${stageLabel[stage]}</option>`).join("")}</select></label><label>Tìm mã sản phẩm<input id="media-pipeline-search" type="search" placeholder="Ví dụ CB182"></label></div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Ảnh</th><th>Sản phẩm</th><th>Chặng</th><th>Checksum</th><th>Lần xử lý gần nhất</th><th>Thao tác</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Chưa có intake ảnh thủ công.</td></tr>'}</tbody></table></div>
    </section>`;
}
