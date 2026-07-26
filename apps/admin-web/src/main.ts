import "./styles.css";
import {
  ApiError,
  createConversationCommand,
  getAdminCommand,
  getAuditLogs,
  getConversation,
  getConversationCommands,
  getConversationMessages,
  getConversations,
  getHandoff,
  getHandoffs,
  getHandoffSummary,
  getIdentity,
  getOperations,
  getOverview,
  getOutreach,
  getPolicyControl,
  getProductData,
  getProductMediaCatalog,
  uploadProductMedia,
  getQuality,
  getDatasetIndex,
  getReviewQueue,
  getPreviousReviewQueue,
  reviewDatasetAnnotation,
  addDatasetAnnotation,
  completeDatasetReviewItem,
  lockDatasetHoldout,
  type DatasetReviewVerb,
} from "./api.js";
import { bindPolicyControl, renderPolicyControl } from "./policy-control-ui.js";
import { renderDatasetIndex } from "./dataset-review-screen.js";
import { bindReviewQueue, renderReviewQueue } from "./dataset-review-ui.js";
import type { ReviewQueueData } from "./dataset-review-types.js";
import {
  escapeHtml,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  truncate,
} from "./format.js";
import type {
  AdminCommand,
  AdminCommandName,
  AuditLog,
  Conversation,
  ConversationDetail,
  HandoffQueue,
  Identity,
  Metric,
  OperationsSummary,
  Overview,
  OutreachSummary,
  PolicyControlData,
  ProductDataSummary,
  QualitySummary,
  ServiceHealth,
  Tone,
  PancakeTag,
  ProductMediaCatalog,
  ProductMediaUpload,
} from "./types.js";

type RouteName = "overview" | "conversations" | "handoffs" | "outreach" | "quality" | "products" | "media" | "policy" | "datasets" | "operations" | "audit";

interface NavigationItem {
  id: RouteName;
  label: string;
  description: string;
  icon: string;
}

const navigation: NavigationItem[] = [
  { id: "overview", label: "Tổng quan", description: "Tình trạng hôm nay", icon: "grid" },
  { id: "conversations", label: "Hội thoại", description: "Bot và bàn giao", icon: "chat" },
  { id: "handoffs", label: "Cần nhân viên xử lý", description: "Bot tự chuyển quyền", icon: "user" },
  { id: "outreach", label: "Hiệu quả upsale", description: "Phản hồi và chuyển đổi", icon: "spark" },
  { id: "quality", label: "Chất lượng AI", description: "Đánh giá câu trả lời", icon: "spark" },
  { id: "products", label: "Dữ liệu sản phẩm", description: "Giá, tồn, size, ETA", icon: "bag" },
  { id: "media", label: "Ảnh sản phẩm", description: "Tải ảnh bổ sung", icon: "image" },
  { id: "policy", label: "Chính sách bán hàng", description: "Phiên bản, duyệt và rollback", icon: "shield" },
  { id: "datasets", label: "Đánh giá dữ liệu", description: "Review nhãn và benchmark", icon: "clipboard" },
  { id: "operations", label: "Vận hành", description: "Worker và hàng đợi", icon: "pulse" },
  { id: "audit", label: "Nhật ký", description: "Hoạt động hệ thống", icon: "clock" },
];

const routeTitles: Record<RouteName, { title: string; subtitle: string }> = {
  overview: {
    title: "Tổng quan",
    subtitle: "Một cái nhìn nhanh về chatbot La.na Design.",
  },
  conversations: {
    title: "Hội thoại",
    subtitle: "Theo dõi bot, nhân viên và nguyên nhân bàn giao.",
  },
  handoffs: {
    title: "Cần nhân viên xử lý",
    subtitle: "Danh sách hội thoại bot tự chuyển để nhân viên tiếp quản.",
  },
  outreach: {
    title: "Hiệu quả upsale",
    subtitle: "Theo dõi riêng tin chăm sóc lại, phản hồi và chuyển đổi.",
  },
  quality: {
    title: "Chất lượng AI",
    subtitle: "Kiểm tra câu trả lời và những điểm cần cải thiện.",
  },
  products: {
    title: "Dữ liệu sản phẩm",
    subtitle: "Độ sẵn sàng của giá, tồn kho, size và thời gian giao.",
  },
  media: {
    title: "Ảnh sản phẩm",
    subtitle: "Tải ảnh ngoài XML vào hàng chờ phân loại và duyệt.",
  },
  policy: {
    title: "Chính sách bán hàng",
    subtitle: "Quản lý phiên bản, chạy thử trên page test và rollback an toàn.",
  },
  datasets: {
    title: "Đánh giá dữ liệu",
    subtitle: "Review nhãn AI, khóa holdout và xuất benchmark. Chỉ hiển thị dữ liệu đã ẩn danh.",
  },
  operations: {
    title: "Vận hành",
    subtitle: "Tình trạng xử lý tin nhắn và các dịch vụ nền.",
  },
  audit: {
    title: "Nhật ký",
    subtitle: "Lịch sử truy cập và hoạt động quan trọng.",
  },
};

const rootCandidate = document.querySelector<HTMLDivElement>("#app");
if (!rootCandidate) throw new Error("Missing #app");
const root: HTMLDivElement = rootCandidate;

let currentRoute = routeFromHash();
let identity: Identity | null = null;
let productMediaCatalog: ProductMediaCatalog | null = null;
let refreshTimer: number | undefined;
let activeController: AbortController | null = null;
let lastUpdatedAt: string | null = null;
let conversationSearch = "";
let conversationOwner = "";
let commandPollTimer: number | undefined;
let outreachData: OutreachSummary | null = null;
let handoffData: HandoffQueue | null = null;
let handoffOpenCount = 0;
let handoffStatus = "OPEN";
let handoffReason = "";
let handoffSource = "";
let policyControlData: PolicyControlData | null = null;
let datasetQueue: ReviewQueueData | null = null;
let datasetActionBusy = false;

interface ControlAction {
  command: AdminCommandName;
  label: string;
  detail: string;
  tag?: PancakeTag;
  pauseMinutes?: 15 | 60;
  danger?: boolean;
}

const reasonLabels: Record<string, string> = {
  ADMIN_HANDOFF: "Quản trị viên chủ động bàn giao",
  CUSTOMER_REQUESTED_HUMAN: "Khách yêu cầu gặp nhân viên",
  POST_SALE_SUPPORT: "Hỗ trợ sau mua / vận đơn",
  TEMPORARY_PAUSE: "Tạm dừng bot để kiểm tra",
  RESUME_AFTER_REVIEW: "Tiếp tục bot sau khi đã kiểm tra",
  TAG_CORRECTION: "Điều chỉnh tag sai hoặc thiếu",
  MANUAL_TAG_SYNC: "Đồng bộ tag thủ công",
  ADMIN_TEST: "Kiểm thử quản trị trên page test",
  BUSINESS_FACT_NOT_FOUND: "Thiếu dữ liệu giá, tồn, size hoặc ETA",
  BUSINESS_FACT_ERROR: "Nguồn dữ liệu sản phẩm đang lỗi",
  BUSINESS_FACT_STALE: "Dữ liệu sản phẩm đã quá hạn",
  POLICY_GUARD_BLOCKED: "Chính sách an toàn chặn câu trả lời",
  PRODUCT_NOT_FOUND: "Không xác định được sản phẩm",
};

function handoffReasonLabel(code: string): string {
  return reasonLabels[code] ?? code.replaceAll("_", " ");
}

const managedTags: Array<{ tag: PancakeTag; label: string }> = [
  { tag: "NHAN_VIEN", label: "Nhân viên" },
  { tag: "VAN_DON", label: "Vận Đơn" },
  { tag: "DA_CHOT_DON", label: "Đã chốt đơn" },
  { tag: "KHONG_UP_SALE", label: "KHÔNG UP SALE" },
];

function icon(name: string, size = 20): string {
  const paths: Record<string, string> = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    spark: '<path d="m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6z"/><path d="m5 15-.9 2.1L2 18l2.1.9L5 21l.9-2.1L8 18l-2.1-.9zM19 2l.7 1.3L21 4l-1.3.7L19 6l-.7-1.3L17 4l1.3-.7z"/>',
    bag: '<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    pulse: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    inbox: '<path d="M4 4h16v16H4z"/><path d="M4 13h5l2 3h2l2-3h5"/>',
    alert: '<path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5M12 18h.01"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20"/>',
    clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h4"/>',
  };
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.grid}</svg>`;
}

function routeFromHash(): RouteName {
  const candidate = window.location.hash.replace(/^#\/?/, "").split("/")[0];
  return navigation.some((item) => item.id === candidate) ? (candidate as RouteName) : "overview";
}

// The datasets route carries an optional project id sub-segment: #/datasets/<id>.
function datasetProjectFromHash(): string | null {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  return parts[0] === "datasets" && parts[1] ? decodeURIComponent(parts[1]) : null;
}

function toneForStatus(status?: string | null): Tone {
  const normalized = (status ?? "").toLowerCase();
  if (
    normalized.includes("healthy") ||
    normalized.includes("ok") ||
    normalized.includes("clear") ||
    normalized.includes("đạt") ||
    normalized.includes("success")
  )
    return "good";
  if (
    normalized.includes("failed") ||
    normalized.includes("down") ||
    normalized.includes("critical") ||
    normalized.includes("conflict") ||
    normalized.includes("blocking") ||
    normalized.includes("lỗi")
  )
    return "danger";
  if (
    normalized.includes("warning") ||
    normalized.includes("degraded") ||
    normalized.includes("pending") ||
    normalized.includes("unverified") ||
    normalized.includes("chưa")
  )
    return "warning";
  return "neutral";
}

function statusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    BOT: "Bot đang phụ trách",
    HUMAN: "Nhân viên đang phụ trách",
    NHAN_VIEN: "Nhân viên",
    VAN_DON: "Vận đơn",
    healthy: "Hoạt động tốt",
    degraded: "Cần chú ý",
    down: "Mất kết nối",
    unknown: "Chưa xác định",
    READ_ONLY: "Chỉ theo dõi",
    CONTROLLED: "Điều khiển có kiểm soát",
    PENDING: "Đang chờ",
    PROCESSING: "Đang xử lý",
    IN_PROGRESS: "Đang xử lý",
    APPLIED: "Đã áp dụng",
    FAILED: "Thất bại",
    CANCELLED: "Đã hủy",
    CONFLICT: "Xung đột trạng thái",
    DA_CHOT_DON: "Đã chốt đơn",
    KHONG_UP_SALE: "KHÔNG UP SALE",
    VERIFIED_PRESENT: "Đã xác minh có tag",
    VERIFIED_ABSENT: "Đã xác minh không có tag",
    UNVERIFIED: "Chưa xác minh",
    BLOCKING: "Đã xác minh tag chặn",
    BOT_POLICY: "Bot tự chuyển",
    CUSTOMER_REQUEST: "Khách yêu cầu",
    POST_SALE: "Sau mua / vận đơn",
    ADMIN: "Quản trị viên",
  };
  return labels[status ?? ""] ?? (status || "Chưa xác định").replaceAll("_", " ");
}

function badge(label: string, tone: Tone = "neutral"): string {
  return `<span class="badge badge--${tone}"><span class="badge__dot"></span>${escapeHtml(label)}</span>`;
}

function renderShell(): void {
  const nav = navigation
    .filter((item) => item.id !== "outreach" || identity?.historyEnabled === true)
    .filter((item) => item.id !== "datasets" || identity?.datasetReview?.enabled === true)
    .map(
      (item) => `
        <a class="nav-item ${item.id === currentRoute ? "is-active" : ""}" href="#/${item.id}" data-route="${item.id}">
          <span class="nav-item__icon">${icon(item.icon)}</span>
          <span class="nav-item__copy"><strong>${item.label}${item.id === "handoffs" && handoffOpenCount > 0 ? `<em class="nav-count">${formatNumber(handoffOpenCount)}</em>` : ""}</strong><small>${item.description}</small></span>
        </a>`,
    )
    .join("");
  const person = identity;
  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <span class="brand__mark">la.na</span>
          <span><strong>Chatbot</strong><small>Trung tâm quản trị</small></span>
        </div>
        <div class="readonly-notice">${icon("shield", 18)}<span><strong>${identity?.canControl ? "Điều khiển có kiểm soát" : "Chế độ an toàn"}</strong><small>${identity?.canControl ? "Không gửi tin · mọi thay đổi có nhật ký" : "Chỉ xem, không thay đổi trạng thái"}</small></span></div>
        <nav class="navigation" aria-label="Điều hướng chính">${nav}</nav>
        <div class="sidebar__footer">
          <div class="identity identity--sidebar">
            <span class="avatar">${escapeHtml((person?.email ?? "A").slice(0, 1).toUpperCase())}</span>
            <span><strong>${escapeHtml(person?.email ?? "Đang xác thực…")}</strong><small>${escapeHtml(statusLabel(person?.role ?? "OWNER"))}</small></span>
          </div>
        </div>
      </aside>
      <button class="sidebar-scrim" id="sidebar-scrim" aria-label="Đóng trình đơn"></button>
      <main class="main">
        <header class="topbar">
          <button class="icon-button mobile-menu" id="mobile-menu" aria-label="Mở trình đơn">${icon("menu")}</button>
          <div class="topbar__context">
            <span class="eyebrow">LA.NA DESIGN</span>
            <span class="topbar__separator"></span>
            <span class="page-context">Page thử nghiệm · 1198992073286645</span>
          </div>
          <div class="topbar__actions">
            <span class="live-indicator"><span></span>Tự cập nhật 5 giây</span>
            <button class="icon-button" id="manual-refresh" aria-label="Làm mới dữ liệu">${icon("refresh")}</button>
            <div class="identity identity--top">
              <span class="avatar">${escapeHtml((person?.email ?? "A").slice(0, 1).toUpperCase())}</span>
              <span><strong>${escapeHtml(person?.name ?? "Quản trị viên")}</strong><small>${escapeHtml(person?.role ?? "OWNER")}</small></span>
            </div>
          </div>
        </header>
        <section class="content">
          <div class="page-heading">
            <div><h1>${routeTitles[currentRoute].title}</h1><p>${routeTitles[currentRoute].subtitle}</p></div>
            <span class="updated-at" id="updated-at">Đang tải dữ liệu…</span>
          </div>
          <div id="page-content">${renderLoading()}</div>
        </section>
      </main>
    </div>
    <div id="detail-layer"></div>
    <div id="command-modal-layer"></div>
    <div class="toast-region" id="toast-region" aria-live="polite"></div>
  `;
  bindShellEvents();
}

function bindShellEvents(): void {
  document.querySelector("#manual-refresh")?.addEventListener("click", () => void loadCurrentPage(false));
  document.querySelector("#mobile-menu")?.addEventListener("click", () => toggleSidebar(true));
  document.querySelector("#sidebar-scrim")?.addEventListener("click", () => toggleSidebar(false));
}

function toggleSidebar(open: boolean): void {
  document.querySelector("#sidebar")?.classList.toggle("is-open", open);
  document.querySelector("#sidebar-scrim")?.classList.toggle("is-visible", open);
}

function renderLoading(): string {
  return `
    <div class="skeleton-grid" aria-label="Đang tải">
      ${Array.from({ length: 4 }, () => '<div class="skeleton skeleton--metric"></div>').join("")}
    </div>
    <div class="skeleton skeleton--panel"></div>
  `;
}

function renderError(error: unknown): string {
  const isApiError = error instanceof ApiError;
  const title =
    isApiError && error.status === 403
      ? "Tài khoản chưa có quyền xem mục này"
      : "Chưa thể tải dữ liệu";
  const detail =
    error instanceof Error
      ? error.message
      : "Dịch vụ quản trị đang tạm thời không phản hồi.";
  return `
    <div class="state-panel state-panel--error">
      <span class="state-panel__icon">${icon("alert", 28)}</span>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(detail)}</p>
      ${isApiError && error.requestId ? `<small>Mã tra cứu: ${escapeHtml(error.requestId)}</small>` : ""}
      <button class="button button--secondary" id="retry-load">${icon("refresh", 17)} Thử lại</button>
    </div>
  `;
}

function renderEmpty(title: string, detail: string): string {
  return `
    <div class="state-panel">
      <span class="state-panel__icon">${icon("inbox", 28)}</span>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function renderMetrics(metrics: Metric[]): string {
  if (metrics.length === 0) return "";
  return `<div class="metrics-grid">${metrics
    .slice(0, 4)
    .map(
      (metric) => `
        <article class="metric-card">
          <div class="metric-card__top"><span>${escapeHtml(metric.label)}</span>${metric.change ? badge(metric.change, metric.tone ?? "neutral") : ""}</div>
          <strong>${escapeHtml(metric.value)}</strong>
          ${metric.hint ? `<small>${escapeHtml(metric.hint)}</small>` : '<small>Trong phạm vi page đang xem</small>'}
        </article>`,
    )
    .join("")}</div>`;
}

function serviceRows(services: ServiceHealth[]): string {
  if (services.length === 0) return renderEmpty("Chưa có dữ liệu dịch vụ", "Khi worker bắt đầu báo trạng thái, dữ liệu sẽ xuất hiện tại đây.");
  return `<div class="service-list">${services
    .map(
      (service) => `
        <div class="service-row">
          <span class="service-row__icon">${icon(service.status === "healthy" ? "check" : "pulse")}</span>
          <span class="service-row__name"><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.detail ?? "Kiểm tra tự động")}</small></span>
          ${badge(statusLabel(service.status), toneForStatus(service.status))}
          <time>${escapeHtml(formatRelativeTime(service.checkedAt))}</time>
        </div>`,
    )
    .join("")}</div>`;
}

function renderOverview(data: Overview): string {
  const alerts =
    data.alerts.length > 0
      ? data.alerts
          .map(
            (alert) => `
              <div class="alert-row alert-row--${alert.severity}">
                <span>${icon("alert")}</span>
                <div><strong>${escapeHtml(alert.title)}</strong><small>${escapeHtml(alert.detail ?? "")}</small></div>
                <time>${escapeHtml(formatRelativeTime(alert.createdAt))}</time>
              </div>`,
          )
          .join("")
      : `<div class="success-state">${icon("check", 24)}<span><strong>Không có cảnh báo mới</strong><small>Hệ thống chưa ghi nhận vấn đề cần xử lý.</small></span></div>`;
  return `
    <section class="page-banner">
      <div><span class="eyebrow">PAGE ĐANG THEO DÕI</span><h2>${escapeHtml(data.pageName ?? "La.na Design")}</h2><p>ID ${escapeHtml(data.pageId)}</p></div>
      ${badge(statusLabel(data.mode), "info")}
    </section>
    ${renderMetrics(data.metrics)}
    <div class="dashboard-grid">
      <section class="panel panel--wide">
        <div class="panel__header"><div><h2>Tình trạng hệ thống</h2><p>Dữ liệu mới nhất từ các dịch vụ nền.</p></div></div>
        ${serviceRows(data.services)}
      </section>
      <section class="panel">
        <div class="panel__header"><div><h2>Cần chú ý</h2><p>Cảnh báo và sự cố gần nhất.</p></div></div>
        <div class="alert-list">${alerts}</div>
      </section>
    </div>`;
}

function renderConversations(data: { items: Conversation[]; total: number }): string {
  const rows =
    data.items.length === 0
      ? renderEmpty("Không tìm thấy hội thoại", "Thử thay đổi từ khóa hoặc bộ lọc người phụ trách.")
      : `<div class="conversation-list">${data.items
          .map(
            (conversation) => `
              <button class="conversation-row" data-conversation-id="${escapeHtml(conversation.id)}">
                <span class="customer-avatar">${escapeHtml(conversation.customerLabel.slice(0, 2).toUpperCase())}</span>
                <span class="conversation-row__body">
                  <span class="conversation-row__title"><strong>${escapeHtml(conversation.customerLabel)}</strong><time>${escapeHtml(formatRelativeTime(conversation.lastMessageAt))}</time></span>
                  <span class="conversation-row__message">${escapeHtml(truncate(conversation.lastMessage))}</span>
                  <span class="conversation-row__meta">
                    ${badge(statusLabel(conversation.owner), conversation.owner === "HUMAN" ? "warning" : "good")}
                    ${badge(conversation.stage, "neutral")}
                    ${conversation.blockingTag ? badge(statusLabel(conversation.blockingTag), "danger") : ""}
                    ${conversation.currentProductId ? `<span class="meta-text">Mã ${escapeHtml(conversation.currentProductId)}</span>` : ""}
                  </span>
                </span>
                <span class="row-chevron">${icon("chevron")}</span>
              </button>`,
          )
          .join("")}</div>`;
  return `
    <section class="panel">
      <div class="panel__header panel__header--filters">
        <div><h2>${formatNumber(data.total)} hội thoại</h2><p>Thông tin khách hàng đã được ẩn danh.</p></div>
        <div class="filters">
          <label class="search-field">${icon("search", 18)}<input id="conversation-search" type="search" value="${escapeHtml(conversationSearch)}" placeholder="Tìm mã sản phẩm hoặc nội dung…" /></label>
          <select id="conversation-owner" aria-label="Lọc người phụ trách">
            <option value="">Tất cả người phụ trách</option>
            <option value="BOT" ${conversationOwner === "BOT" ? "selected" : ""}>Bot</option>
            <option value="HUMAN" ${conversationOwner === "HUMAN" ? "selected" : ""}>Nhân viên</option>
          </select>
        </div>
      </div>
      ${rows}
    </section>`;
}

function renderHandoffs(data: HandoffQueue): string {
  const reasonOptions = data.summary.reasons
    .map((reason) => `<option value="${escapeHtml(reason.reasonCode)}" ${handoffReason === reason.reasonCode ? "selected" : ""}>${escapeHtml(handoffReasonLabel(reason.reasonCode))} (${formatNumber(reason.count)})</option>`)
    .join("");
  const rows = data.items.length === 0
    ? renderEmpty("Không có hội thoại cần xử lý", "Không còn trường hợp bot tự chuyển quyền trong bộ lọc này.")
    : `<div class="handoff-list">${data.items.map((handoff) => `
        <button class="handoff-row" data-handoff-id="${escapeHtml(handoff.id)}">
          <span class="handoff-row__priority">${icon("user", 19)}</span>
          <span class="handoff-row__body">
            <span class="handoff-row__top">
              <strong>${escapeHtml(handoff.customerLabel)}</strong>
              <time>Chờ ${escapeHtml(formatRelativeTime(handoff.createdAt).replace(" trước", ""))}</time>
            </span>
            <span class="handoff-row__reason">${escapeHtml(handoffReasonLabel(handoff.reasonCode))}</span>
            <span class="handoff-row__message">${escapeHtml(truncate(handoff.triggerMessage, 150))}</span>
            <span class="conversation-row__meta">
              ${badge(statusLabel(handoff.status), handoff.status === "NEW" ? "warning" : toneForStatus(handoff.status))}
              ${badge(handoff.source === "CUSTOMER_REQUEST" ? "Khách yêu cầu" : "Bot tự chuyển", "info")}
              ${handoff.productId ? `<span class="meta-text">Mã ${escapeHtml(handoff.productId)}</span>` : ""}
              ${handoff.factsStatus ? badge(handoff.factsStatus, toneForStatus(handoff.factsStatus)) : ""}
            </span>
          </span>
          <span class="row-chevron">${icon("chevron")}</span>
        </button>`).join("")}</div>`;
  return `
    ${renderMetrics([
      { label: "Đang chờ xử lý", value: data.summary.open, tone: data.summary.open ? "warning" : "good" },
      { label: "Mới", value: data.summary.newCount },
      { label: "Đang xử lý", value: data.summary.acknowledged },
      { label: "Đã xong 24 giờ", value: data.summary.resolved24h },
    ])}
    <section class="panel">
      <div class="panel__header panel__header--filters">
        <div><h2>Ưu tiên chờ lâu nhất</h2><p>Chỉ gồm trường hợp bot tự chuyển sang tag Nhân viên.</p></div>
        <div class="filters">
          <select id="handoff-status" aria-label="Lọc trạng thái">
            <option value="OPEN" ${handoffStatus === "OPEN" ? "selected" : ""}>Đang mở</option>
            <option value="NEW" ${handoffStatus === "NEW" ? "selected" : ""}>Mới</option>
            <option value="IN_PROGRESS" ${handoffStatus === "IN_PROGRESS" ? "selected" : ""}>Đang xử lý</option>
            <option value="RESOLVED" ${handoffStatus === "RESOLVED" ? "selected" : ""}>Đã xong</option>
          </select>
          <select id="handoff-source" aria-label="Lọc nguồn chuyển quyền">
            <option value="" ${handoffSource === "" ? "selected" : ""}>Bot + khách yêu cầu</option>
            <option value="BOT_POLICY" ${handoffSource === "BOT_POLICY" ? "selected" : ""}>Bot tự chuyển</option>
            <option value="CUSTOMER_REQUEST" ${handoffSource === "CUSTOMER_REQUEST" ? "selected" : ""}>Khách yêu cầu</option>
            <option value="ALL" ${handoffSource === "ALL" ? "selected" : ""}>Toàn bộ lịch sử</option>
          </select>
          <select id="handoff-reason" aria-label="Lọc nguyên nhân">
            <option value="">Tất cả nguyên nhân</option>${reasonOptions}
          </select>
        </div>
      </div>
      ${rows}
      ${data.nextCursor ? `<div class="pagination-bar"><button class="button button--secondary" id="load-more-handoffs" data-cursor="${escapeHtml(data.nextCursor)}">Tải thêm</button></div>` : ""}
    </section>`;
}

function renderQuality(data: QualitySummary): string {
  const samples =
    data.samples.length === 0
      ? renderEmpty("Chưa có mẫu đánh giá", "Các câu trả lời AI mới sẽ xuất hiện khi hệ thống bắt đầu ghi nhận đánh giá.")
      : `<div class="quality-list">${data.samples
          .map(
            (sample) => `
              <article class="quality-row">
                <div class="quality-row__top">
                  <span>${badge(sample.intent, "info")} ${sample.productId ? badge(sample.productId) : ""}</span>
                  <time>${escapeHtml(formatDateTime(sample.createdAt))}</time>
                </div>
                <p>${escapeHtml(truncate(sample.proposedReply, 180))}</p>
                <div class="quality-row__footer">
                  ${badge(sample.outcome, toneForStatus(sample.outcome))}
                  <span>${escapeHtml(sample.modelVersion ?? "Chưa ghi model")} · ${escapeHtml(sample.promptVersion ?? "Chưa ghi prompt")}</span>
                </div>
              </article>`,
          )
          .join("")}</div>`;
  return `
    ${renderMetrics(data.metrics)}
    <div class="dashboard-grid">
      <section class="panel panel--wide">
        <div class="panel__header"><div><h2>Câu trả lời gần đây</h2><p>Nội dung đề xuất của AI, chỉ để kiểm tra chất lượng.</p></div></div>
        ${samples}
      </section>
      <section class="panel">
        <div class="panel__header"><div><h2>Nhóm vấn đề</h2><p>Các lỗi thường gặp cần ưu tiên.</p></div></div>
        ${
          data.issues.length
            ? `<div class="breakdown-list">${data.issues
                .map((item) => {
                  const percent = item.total ? Math.round((item.value / item.total) * 100) : Math.min(100, item.value);
                  return `<div class="breakdown"><span><strong>${escapeHtml(item.label)}</strong><em>${formatNumber(item.value)}</em></span><div><i style="width:${percent}%"></i></div></div>`;
                })
                .join("")}</div>`
            : renderEmpty("Chưa có lỗi nổi bật", "Chưa đủ dữ liệu để phân nhóm vấn đề.")
        }
      </section>
    </div>`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function renderOutreach(data: OutreachSummary): string {
  const metrics = data.metrics.map((metric) => metric.label === "Doanh thu ghi nhận"
    ? { ...metric, value: formatCurrency(Number(metric.value)) }
    : metric);
  const rows = data.items.length
    ? `<div class="data-table-wrap"><table class="data-table outreach-table">
        <thead><tr><th>Mẫu tin</th><th>Gửi</th><th>Phản hồi</th><th>Chuyển đổi</th><th>Thời gian</th></tr></thead>
        <tbody>${data.items.map((item) => `<tr>
          <td><strong>${escapeHtml(item.templateId)}</strong><small>${escapeHtml(item.templateVersion)}</small></td>
          <td>${badge(statusLabel(item.status), toneForStatus(item.status))}</td>
          <td>${item.responseStatus || item.responseIntent
            ? `${badge(statusLabel(item.responseStatus ?? "RESPONDED"), "info")}<small>${escapeHtml(statusLabel(item.responseIntent))}</small>`
            : `<span class="meta-text">Chưa phản hồi</span>`}</td>
          <td>${item.orderConfirmedAt
            ? `${badge("Đã chốt", "good")}<small>${escapeHtml(formatCurrency(item.orderValue))}</small>`
            : `<span class="meta-text">Chưa ghi nhận</span>`}</td>
          <td><time>${escapeHtml(formatDateTime(item.sentAt ?? item.createdAt))}</time>${item.conversationId
            ? `<button class="table-link" type="button" data-conversation-id="${escapeHtml(item.conversationId)}">Xem hội thoại</button>`
            : ""}</td>
        </tr>`).join("")}</tbody>
      </table></div>`
    : renderEmpty(
        "Chưa có tin upsale",
        "Tin chăm sóc lại được thống kê riêng và không xuất hiện trong lịch sử tư vấn của AI.",
      );
  return `
    <div class="outreach-notice">${icon("shield", 18)}<span><strong>Dữ liệu upsale được tách riêng</strong><small>Không đưa nội dung này vào ngữ cảnh tư vấn hoặc thay đổi BOT/HUMAN.</small></span></div>
    ${renderMetrics(metrics)}
    <section class="panel">
      <div class="panel__header"><div><h2>Tin upsale gần đây</h2><p>Chỉ lưu mẫu, trạng thái và kết quả; không hiển thị nội dung hoặc secret.</p></div></div>
      ${rows}
      ${data.nextCursor ? `<div class="pagination-bar"><button class="button button--secondary" id="load-more-outreach" data-cursor="${escapeHtml(data.nextCursor)}">Tải thêm</button></div>` : ""}
    </section>`;
}

function renderProducts(data: ProductDataSummary): string {
  return `
    ${renderMetrics(data.metrics)}
    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel__header"><div><h2>Nguồn dữ liệu</h2><p>Thời điểm và trạng thái đồng bộ gần nhất.</p></div></div>
        ${
          data.sources.length
            ? `<div class="source-list">${data.sources
                .map(
                  (source) => `
                    <div class="source-card">
                      <div><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.detail ?? "Nguồn dữ liệu nghiệp vụ")}</small></div>
                      ${badge(statusLabel(source.status), toneForStatus(source.status))}
                      <p>${source.recordCount !== undefined ? `${formatNumber(source.recordCount)} bản ghi` : "Chưa có số lượng"} · ${escapeHtml(formatRelativeTime(source.lastSyncedAt))}</p>
                    </div>`,
                )
                .join("")}</div>`
            : renderEmpty("Chưa ghi nhận nguồn dữ liệu", "Dữ liệu sẽ xuất hiện sau lần đồng bộ tiếp theo.")
        }
      </section>
      <section class="panel panel--wide">
        <div class="panel__header"><div><h2>Sản phẩm cần bổ sung</h2><p>Các mã thiếu giá, tồn, size hoặc ETA.</p></div></div>
        ${
          data.problems.length
            ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Mã sản phẩm</th><th>Vấn đề</th><th>Nguồn</th><th>Phát hiện</th></tr></thead><tbody>${data.problems
                .map(
                  (problem) => `<tr><td><strong>${escapeHtml(problem.productId)}</strong></td><td>${badge(problem.issue, problem.severity === "critical" ? "danger" : "warning")}</td><td>${escapeHtml(problem.source)}</td><td>${escapeHtml(formatRelativeTime(problem.detectedAt))}</td></tr>`,
                )
                .join("")}</tbody></table></div>`
            : `<div class="success-state success-state--roomy">${icon("check", 24)}<span><strong>Chưa phát hiện dữ liệu thiếu</strong><small>Giá, tồn, size và ETA đang sẵn sàng.</small></span></div>`
        }
      </section>
    </div>`;
}

function renderProductMedia(catalog: ProductMediaCatalog): string {
  if (!identity?.productMediaUpload) {
    return renderEmpty("Tính năng đang khóa", "Chỉ OWNER hoặc EDITOR được tải ảnh sản phẩm bổ sung.");
  }
  const brandOptions = catalog.brands
    .map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
    .join("");
  return `
    <section class="panel product-media-panel">
      <div class="panel__header"><div><h2>Tải ảnh bổ sung</h2><p>Chọn nhiều ảnh cho cùng một sản phẩm. AI sẽ tự phân loại từng ảnh.</p></div></div>
      <div class="product-media-safety">${icon("shield", 18)}<span>Ảnh được ghi vào manual_image_intake ở trạng thái chờ AI. Sau khi AI gắn metadata, vẫn phải duyệt APPROVED trước khi P2.3C xuất bản lên Qdrant.</span></div>
      <form id="product-media-form" class="product-media-form">
        <p class="product-media-form__wide">Mỗi lần tối đa 20 ảnh, mỗi ảnh tối đa 8 MB. Ảnh được resize đúng tỉ lệ, cạnh dài tối đa 1.600 px; ảnh gốc tự xóa sau 24 giờ.</p>
        <label><span>Brand</span><select name="brand" required><option value="">Chọn brand</option>${brandOptions}</select></label>
        <label><span>Mã sản phẩm</span><input name="ma_sp" autocomplete="off" maxlength="40" placeholder="Ví dụ: CB182" required></label>
        <label class="product-media-form__wide"><span>Chọn ảnh</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required><small>JPG, PNG hoặc WebP · tối đa 20 ảnh, 8 MB/ảnh.</small></label>
        <div class="product-media-preview product-media-form__wide" id="product-media-preview" hidden></div>
        <p class="form-error product-media-form__wide" id="product-media-error" role="alert"></p>
        <div class="product-media-form__actions product-media-form__wide"><button class="button button--primary" type="submit">Tải ảnh lên</button></div>
      </form>
      <div id="product-media-result"></div>
    </section>`;
}

function renderOperations(data: OperationsSummary): string {
  return `
    ${renderMetrics(data.metrics)}
    <div class="dashboard-grid">
      <section class="panel panel--wide">
        <div class="panel__header"><div><h2>Hàng đợi xử lý</h2><p>Chỉ số theo dõi, không thể thao tác từ trang này.</p></div></div>
        <div class="queue-grid">${data.queues
          .map(
            (queue) => `
              <article class="queue-card">
                <div><span class="queue-card__icon">${icon("inbox")}</span><strong>${escapeHtml(queue.name)}</strong></div>
                <dl><div><dt>Đang chờ</dt><dd>${formatNumber(queue.pending)}</dd></div><div><dt>Thử lại</dt><dd>${formatNumber(queue.retrying)}</dd></div><div><dt>Thất bại</dt><dd class="${queue.failed > 0 ? "text-danger" : ""}">${formatNumber(queue.failed)}</dd></div></dl>
                <small>Tin cũ nhất: ${escapeHtml(formatDuration(queue.oldestAgeSeconds))}</small>
              </article>`,
          )
          .join("")}</div>
      </section>
      <section class="panel">
        <div class="panel__header"><div><h2>Dịch vụ nền</h2><p>Nhịp hoạt động mới nhất.</p></div></div>
        ${serviceRows(data.services)}
      </section>
    </div>`;
}

function renderAudit(data: { items: AuditLog[]; total: number }): string {
  if (data.items.length === 0) return renderEmpty("Chưa có hoạt động", "Nhật ký sẽ xuất hiện khi có người truy cập hoặc hệ thống thay đổi trạng thái.");
  return `
    <section class="panel">
      <div class="panel__header"><div><h2>${formatNumber(data.total)} hoạt động</h2><p>Nhật ký chỉ đọc và không thể chỉnh sửa.</p></div></div>
      <div class="timeline">${data.items
        .map(
          (log) => `
            <article class="timeline-item">
              <span class="timeline-item__dot"></span>
              <div><strong>${escapeHtml(log.action)}</strong><p>${escapeHtml(log.detail ?? log.resource)}</p><small>${escapeHtml(log.actor)} · ${escapeHtml(log.resource)}</small></div>
              <div>${log.result ? badge(log.result, toneForStatus(log.result)) : ""}<time>${escapeHtml(formatDateTime(log.createdAt))}</time></div>
            </article>`,
        )
        .join("")}</div>
    </section>`;
}

function commandLabel(command: AdminCommand): string {
  const labels: Record<string, string> = {
    HANDOFF_NHAN_VIEN: "Bàn giao Nhân viên",
    HANDOFF_VAN_DON: "Bàn giao Vận Đơn",
    PAUSE_BOT: command.pauseMinutes === 60 ? "Tạm dừng bot 1 giờ" : "Tạm dừng bot 15 phút",
    RESUME_BOT: "Cho bot tiếp quản",
    SYNC_PANCAKE_TAGS: "Đồng bộ tag Pancake",
    ADD_TAG: `Thêm tag ${statusLabel(command.tag)}`,
    REMOVE_TAG: `Xóa tag ${statusLabel(command.tag)}`,
  };
  return labels[command.command] ?? statusLabel(command.command);
}

function renderCommandHistory(commands: AdminCommand[]): string {
  if (commands.length === 0) {
    return `<div class="command-empty">Chưa có thao tác quản trị trên hội thoại này.</div>`;
  }
  return `<div class="command-list">${commands
    .slice(0, 8)
    .map(
      (command) => `
        <article class="command-row command-row--${command.status.toLowerCase()}">
          <div>
            <strong>${escapeHtml(commandLabel(command))}</strong>
            <small>${escapeHtml(reasonLabels[command.reason] ?? statusLabel(command.reason || "Không có lý do"))}${command.actor ? ` · ${escapeHtml(command.actor)}` : ""}</small>
            ${command.error ? `<p>${escapeHtml(command.error)}</p>` : ""}
          </div>
          <span>${badge(statusLabel(command.status), toneForStatus(command.status))}<time>${escapeHtml(formatRelativeTime(command.updatedAt ?? command.createdAt))}</time></span>
        </article>`,
    )
    .join("")}</div>`;
}

function controlButton(
  action: ControlAction,
  disabled: boolean,
  style: "primary" | "secondary" | "danger" = "secondary",
): string {
  return `<button class="button button--${style}" type="button" data-admin-command="${escapeHtml(action.command)}"
    ${action.tag ? `data-admin-tag="${escapeHtml(action.tag)}"` : ""}
    ${action.pauseMinutes ? `data-pause-minutes="${action.pauseMinutes}"` : ""}
    ${disabled ? "disabled" : ""}>${escapeHtml(action.label)}</button>`;
}

function renderConversationControls(
  conversation: ConversationDetail,
  commands: AdminCommand[],
): string {
  const pageAllowed = identity?.controlPageIds.includes("ALL") ||
    identity?.controlPageIds.includes(conversation.pageId);
  const canManage = ["OWNER", "ADMIN"].includes((identity?.role ?? "").toUpperCase()) &&
    identity?.canControl === true &&
    pageAllowed === true;
  const pending = commands.some((command) =>
    ["PENDING", "PROCESSING"].includes(command.status.toUpperCase()),
  );
  const disabled = !canManage || pending;
  const mainActions: ControlAction[] = [
    {
      command: "HANDOFF_NHAN_VIEN",
      label: "Bàn giao Nhân viên",
      detail: "Chuyển owner của app sang HUMAN và yêu cầu gắn tag Nhân viên. Không gửi tin cho khách.",
    },
    {
      command: "HANDOFF_VAN_DON",
      label: "Bàn giao Vận Đơn",
      detail: "Chuyển owner của app sang HUMAN và yêu cầu gắn tag Vận Đơn. Không gửi tin cho khách.",
    },
    {
      command: "PAUSE_BOT",
      label: "Tạm dừng 15 phút",
      detail: "Tạm chuyển hội thoại cho HUMAN trong 15 phút.",
      pauseMinutes: 15,
    },
    {
      command: "PAUSE_BOT",
      label: "Tạm dừng 1 giờ",
      detail: "Tạm chuyển hội thoại cho HUMAN trong 1 giờ.",
      pauseMinutes: 60,
    },
    {
      command: "RESUME_BOT",
      label: "Cho bot tiếp quản",
      detail: "Yêu cầu bot tiếp quản. Backend vẫn phải kiểm tra và xóa tag chặn an toàn trước khi áp dụng.",
    },
    {
      command: "SYNC_PANCAKE_TAGS",
      label: "Đồng bộ tag Pancake",
      detail: "Đọc lại tag Pancake theo luồng xác minh và cập nhật trạng thái app. Không gửi tin cho khách.",
    },
  ];
  const observed = new Set(conversation.observedTags);
  const tagRows = managedTags
    .map(({ tag, label }) => {
      const exists = observed.has(tag);
      return `<div class="tag-control-row">
        <span>${badge(label, exists ? "info" : "neutral")}<small>${exists ? "Đã quan sát trên Pancake" : "Chưa quan sát"}</small></span>
        <div>
          ${controlButton({ command: "ADD_TAG", tag, label: "Thêm", detail: `Thêm tag ${label} trên Pancake. Lệnh idempotent nếu tag đã có.` }, disabled)}
          ${controlButton({ command: "REMOVE_TAG", tag, label: "Xóa", detail: `Xóa tag ${label} trên Pancake. Lệnh idempotent nếu tag không tồn tại.` }, disabled, "danger")}
        </div>
      </div>`;
    })
    .join("");

  return `<section class="conversation-controls">
    <div class="conversation-controls__heading">
      <div><h3>Điều khiển hội thoại</h3><p>Chỉ tạo lệnh có kiểm soát; không gửi tin cho khách.</p></div>
      <span class="state-version">Phiên bản ${conversation.stateVersion}</span>
    </div>
    ${!canManage ? `<div class="control-notice control-notice--warning">Control plane đang tắt hoặc Page này không thuộc allowlist quản trị.</div>` : ""}
    ${pending ? `<div class="control-notice">Đang có lệnh được xử lý. Các nút tạm khóa để tránh thao tác trùng.</div>` : ""}
    <div class="control-action-grid">${mainActions
      .map((action, index) => controlButton(action, disabled, index === 4 ? "primary" : "secondary"))
      .join("")}</div>
    <details class="tag-controls">
      <summary>Quản lý 4 tag được phép</summary>
      <div>${tagRows}</div>
    </details>
    <div class="command-history" id="conversation-control-status">
      <h4>Lịch sử thao tác</h4>
      ${renderCommandHistory(commands)}
    </div>
  </section>`;
}

function renderConversationDetail(
  conversation: ConversationDetail,
  commands: AdminCommand[],
): string {
  const messageRows = conversation.messages
    .map((message) => {
      const senderClass =
        message.sender === "CUSTOMER"
          ? "customer"
          : message.sender === "HUMAN"
            ? "human"
            : message.sender === "BOT"
              ? "bot"
              : "system";
      const context = [message.productId, message.intent, message.stage]
        .filter((value): value is string => Boolean(value))
        .map((value) => badge(statusLabel(value), "neutral"))
        .join("");
      const versions = [message.promptVersion, message.modelVersion]
        .filter((value): value is string => Boolean(value))
        .join(" · ");
      return `<article class="message message--${senderClass}">
        <header><strong>${escapeHtml(statusLabel(message.sender))}</strong>${message.status ? badge(statusLabel(message.status), toneForStatus(message.status)) : ""}</header>
        <p>${escapeHtml(message.text || "Không có nội dung chữ")}</p>
        ${context ? `<div class="message__context">${context}</div>` : ""}
        <footer><time>${escapeHtml(formatDateTime(message.sentAt))}</time>${versions ? `<small>${escapeHtml(versions)}</small>` : ""}</footer>
      </article>`;
    })
    .join("");
  return `
    <div class="drawer-scrim" data-close-detail></div>
    <aside class="detail-drawer" aria-label="Chi tiết hội thoại" data-open-conversation-id="${escapeHtml(conversation.id)}">
      <header class="detail-drawer__header">
        <div><span class="eyebrow">HỘI THOẠI</span><h2>${escapeHtml(conversation.customerLabel)}</h2><p>Pancake: ${escapeHtml(conversation.pancakeConversationId ?? "Chưa đồng bộ")}</p></div>
        <button class="icon-button" data-close-detail aria-label="Đóng">${icon("close")}</button>
      </header>
      <div class="detail-drawer__summary">
        ${badge(`App: ${statusLabel(conversation.owner)}`, conversation.owner === "HUMAN" ? "warning" : "good")}
        ${badge(conversation.stage)}
        ${badge(`Pancake: ${statusLabel(conversation.tagStatus)}`, toneForStatus(conversation.tagStatus))}
        ${conversation.observedTags.length
          ? conversation.observedTags.map((tag) => badge(statusLabel(tag), "danger")).join("")
          : badge("Không quan sát thấy tag", "good")}
        <dl>
          <div><dt>Sản phẩm đang xem</dt><dd>${escapeHtml(conversation.currentProductId ?? "Chưa xác định")}</dd></div>
          <div><dt>Size cân nhắc</dt><dd>${escapeHtml(conversation.consideredSize ?? "Chưa xác định")}</dd></div>
          <div><dt>Tag Pancake quan sát</dt><dd>${escapeHtml(conversation.observedTags.map(statusLabel).join(", ") || "Không có")}</dd></div>
          <div><dt>Xác minh tag lúc</dt><dd>${escapeHtml(formatDateTime(conversation.tagVerifiedAt))}</dd></div>
          <div><dt>Lý do bàn giao</dt><dd>${escapeHtml(conversation.handoffReason ?? "Không có")}</dd></div>
        </dl>
        ${conversation.pancakeUrl ? `<a class="button button--secondary button--full" href="${escapeHtml(conversation.pancakeUrl)}" target="_blank" rel="noreferrer">${icon("external", 17)} Mở trong Pancake</a>` : ""}
      </div>
      ${renderConversationControls(conversation, commands)}
      <div class="detail-drawer__body">
        <h3>Lịch sử tư vấn</h3>
        <p class="section-note">Không bao gồm tin upsale tự động.</p>
        ${conversation.messagesNextCursor
          ? `<div class="pagination-bar pagination-bar--top"><button class="button button--secondary" id="load-older-messages" data-cursor="${escapeHtml(conversation.messagesNextCursor)}">Tải tin cũ hơn</button></div>`
          : ""}
        <div class="message-list">${messageRows || (identity?.historyEnabled
          ? renderEmpty("Chưa có tin nhắn", "Lịch sử chưa được đồng bộ.")
          : renderEmpty("Lịch sử đang tắt", "Sẽ hiển thị sau khi hoàn tất migration và bật ADMIN_HISTORY_ENABLED."))}</div>
      </div>
    </aside>`;
}

async function loadCurrentPage(silent = true): Promise<void> {
  activeController?.abort();
  activeController = new AbortController();
  const content = document.querySelector<HTMLDivElement>("#page-content");
  if (!content) return;
  if (!silent) content.innerHTML = renderLoading();
  const refreshButton = document.querySelector("#manual-refresh");
  refreshButton?.classList.add("is-spinning");
  try {
    let html = "";
    switch (currentRoute) {
      case "overview":
        html = renderOverview(await getOverview(activeController.signal));
        break;
      case "conversations": {
        const data = await getConversations(
          { search: conversationSearch, owner: conversationOwner },
          activeController.signal,
        );
        html = renderConversations(data);
        break;
      }
      case "handoffs": {
        handoffData = await getHandoffs({
          status: handoffStatus,
          reasonCode: handoffReason,
          source: handoffSource,
        }, activeController.signal);
        handoffOpenCount = handoffData.summary.open;
        html = renderHandoffs(handoffData);
        break;
      }
      case "outreach": {
        if (identity?.historyEnabled !== true) {
          currentRoute = "overview";
          html = renderOverview(await getOverview(activeController.signal));
          break;
        }
        outreachData = await getOutreach(undefined, activeController.signal);
        html = renderOutreach(outreachData);
        break;
      }
      case "quality":
        html = renderQuality(await getQuality(activeController.signal));
        break;
      case "products":
        html = renderProducts(await getProductData(activeController.signal));
        break;
      case "media":
        productMediaCatalog = await getProductMediaCatalog(activeController.signal);
        html = renderProductMedia(productMediaCatalog);
        break;
      case "policy":
        policyControlData = identity?.policyControl
          ? await getPolicyControl(activeController.signal)
          : { artifacts: [], pointers: [], simulations: [] };
        html = renderPolicyControl(policyControlData, identity);
        break;
      case "datasets": {
        if (identity?.datasetReview?.enabled !== true) {
          currentRoute = "overview";
          html = renderOverview(await getOverview(activeController.signal));
          break;
        }
        const projectId = datasetProjectFromHash();
        if (projectId) {
          datasetQueue = await getReviewQueue(projectId, null, activeController.signal);
          html = renderReviewQueue(datasetQueue, identity);
        } else {
          datasetQueue = null;
          html = renderDatasetIndex(
            await getDatasetIndex(activeController.signal),
            identity,
          );
        }
        break;
      }
      case "operations":
        html = renderOperations(await getOperations(activeController.signal));
        break;
      case "audit":
        html = renderAudit(await getAuditLogs(activeController.signal));
        break;
    }
    content.innerHTML = html;
    lastUpdatedAt = new Date().toISOString();
    updateRefreshTime();
    bindPageEvents();
    if (currentRoute === "policy" && policyControlData) {
      bindPolicyControl(
        policyControlData,
        identity,
        () => loadCurrentPage(false),
        (message) => showToast(message),
      );
    }
    if (currentRoute === "datasets") {
      if (datasetQueue?.item) bindDatasetReviewQueue(content);
      else bindDatasetIndex();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    content.innerHTML = renderError(error);
    document.querySelector("#retry-load")?.addEventListener("click", () => void loadCurrentPage(false));
  } finally {
    refreshButton?.classList.remove("is-spinning");
  }
}

function updateRefreshTime(): void {
  const target = document.querySelector("#updated-at");
  if (target) target.textContent = lastUpdatedAt ? `Cập nhật ${formatRelativeTime(lastUpdatedAt)}` : "Chưa cập nhật";
}

async function runDatasetAction(work: () => Promise<void>): Promise<void> {
  if (datasetActionBusy) return;
  datasetActionBusy = true;
  try {
    await work();
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : "Không thể lưu thao tác review.");
  } finally {
    datasetActionBusy = false;
  }
}

function bindDatasetReviewQueue(content: HTMLElement): void {
  const queue = datasetQueue;
  const item = queue?.item;
  if (!queue || !item) return;

  // Index-level lock button lives on the landing page, but the queue view has no
  // lock control; per-annotation and footer actions are wired here.
  bindReviewQueue(content, {
    onAnnotationAction: (action, annotationId) => {
      void runDatasetAction(async () => {
        if (action === "EDIT") {
          const current = item.annotations.find((entry) => entry.id === annotationId);
          const nextLabel = window.prompt("Mã nhãn mới", current?.labelCode ?? "");
          if (!nextLabel) return;
          await reviewDatasetAnnotation(annotationId, "EDIT", { label_code: nextLabel.trim() });
        } else {
          const mapped: DatasetReviewVerb = action === "DELETE" ? "REMOVE" : action;
          await reviewDatasetAnnotation(annotationId, mapped);
        }
        await loadCurrentPage(false);
      });
    },
    onAddLabel: (labelCode) => {
      const label = queue.labels.find((entry) => entry.code === labelCode);
      if (!label) {
        showToast("Nh\u00e3n kh\u00f4ng h\u1ee3p l\u1ec7.", "danger");
        return;
      }
      void runDatasetAction(async () => {
        await addDatasetAnnotation(item.projectItemId, {
          labelCode: label.code,
          scope: label.scope,
          confidence: "HIGH",
        });
        await loadCurrentPage(false);
      });
    },
    onAction: (action) => {
      if (action === "ACCEPT_ALL") {
        void runDatasetAction(async () => {
          const proposed = item.annotations.filter((entry) => entry.status === "PROPOSED");
          for (const annotation of proposed) {
            await reviewDatasetAnnotation(annotation.id, "ACCEPT");
          }
          await loadCurrentPage(false);
        });
        return;
      }
      if (action === "NEEDS_ADJUDICATION") {
        showToast("Chuyển sang phân xử sẽ được bổ sung trong bản sau.");
        return;
      }
      if (action === "PREVIOUS") {
        void runDatasetAction(async () => {
          const previous = await getPreviousReviewQueue(
            queue.projectId,
            queue.split,
            queue.historical ? item.projectItemId : undefined,
          );
          if (!previous.item) {
            showToast("Đã đến hội thoại đầu tiên bạn từng duyệt.", "warning");
            return;
          }
          datasetQueue = previous;
          content.innerHTML = renderReviewQueue(previous, identity);
          content.querySelectorAll<HTMLButtonElement>("[data-annotation-action], [data-annotation-add], [data-review-action]:not([data-review-action=PREVIOUS])").forEach((control) => {
            control.disabled = true;
          });
          bindDatasetReviewQueue(content);
        });
        return;
      }
      if (action === "SKIP") {
        window.location.hash = "#/datasets";
        return;
      }
      void runDatasetAction(async () => {
        await completeDatasetReviewItem(item.projectItemId, item.revision);
        await loadCurrentPage(false);
      });
    },
    onJumpToTurn: (turnIndex) => {
      content.querySelector(`#review-turn-${turnIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  });
}

function bindDatasetIndex(): void {
  document.querySelectorAll<HTMLElement>("[data-dataset-lock]").forEach((element) => {
    element.addEventListener("click", () => {
      const projectId = element.dataset.datasetLock;
      if (!projectId) return;
      if (!window.confirm("Khóa toàn bộ mục holdout của dự án này? Sau khi khóa, holdout không thể review tiếp.")) return;
      void runDatasetAction(async () => {
        const locked = await lockDatasetHoldout(projectId);
        showToast(`Đã khóa ${locked} mục holdout.`);
        await loadCurrentPage(false);
      });
    });
  });
}

function bindPageEvents(): void {
  bindProductMediaForm();
  document.querySelectorAll<HTMLElement>("[data-handoff-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const handoffId = element.dataset.handoffId;
      if (handoffId) void openHandoff(handoffId);
    });
  });
  document.querySelectorAll<HTMLElement>("[data-conversation-id]").forEach((element) => {
    element.addEventListener("click", () => {
      const conversationId = element.dataset.conversationId;
      if (conversationId) void openConversation(conversationId);
    });
  });
  const search = document.querySelector<HTMLInputElement>("#conversation-search");
  if (search) {
    let searchTimer: number | undefined;
    search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        conversationSearch = search.value.trim();
        void loadCurrentPage(false);
      }, 350);
    });
  }
  document.querySelector<HTMLSelectElement>("#conversation-owner")?.addEventListener("change", (event) => {
    conversationOwner = (event.currentTarget as HTMLSelectElement).value;
    void loadCurrentPage(false);
  });
  document.querySelector<HTMLSelectElement>("#handoff-status")?.addEventListener("change", (event) => {
    handoffStatus = (event.currentTarget as HTMLSelectElement).value;
    void loadCurrentPage(false);
  });
  document.querySelector<HTMLSelectElement>("#handoff-source")?.addEventListener("change", (event) => {
    handoffSource = (event.currentTarget as HTMLSelectElement).value;
    void loadCurrentPage(false);
  });
  document.querySelector<HTMLSelectElement>("#handoff-reason")?.addEventListener("change", (event) => {
    handoffReason = (event.currentTarget as HTMLSelectElement).value;
    void loadCurrentPage(false);
  });
  document.querySelector<HTMLButtonElement>("#load-more-handoffs")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const cursor = button.dataset.cursor;
    if (!cursor || button.disabled) return;
    button.disabled = true;
    button.textContent = "Đang tải…";
    try {
      const next = await getHandoffs({
        status: handoffStatus,
        reasonCode: handoffReason,
        source: handoffSource,
        cursor,
      });
      handoffData = { ...next, items: [...(handoffData?.items ?? []), ...next.items] };
      const content = document.querySelector<HTMLDivElement>("#page-content");
      if (content && currentRoute === "handoffs") {
        content.innerHTML = renderHandoffs(handoffData);
        bindPageEvents();
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = "Tải thêm";
      showToast(error instanceof Error ? error.message : "Không thể tải thêm danh sách bàn giao.", "danger");
    }
  });
  document.querySelector<HTMLButtonElement>("#load-more-outreach")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const cursor = button.dataset.cursor;
    if (!cursor || button.disabled) return;
    button.disabled = true;
    button.textContent = "Đang tải…";
    try {
      const next = await getOutreach(cursor);
      outreachData = {
        ...next,
        items: [...(outreachData?.items ?? []), ...next.items],
      };
      const content = document.querySelector<HTMLDivElement>("#page-content");
      if (content && currentRoute === "outreach") {
        content.innerHTML = renderOutreach(outreachData);
        bindPageEvents();
      }
    } catch (error) {
      button.disabled = false;
      button.textContent = "Tải thêm";
      showToast(error instanceof Error ? error.message : "Không thể tải thêm dữ liệu upsale.", "danger");
    }
  });
}

function bindProductMediaForm(): void {
  const form = document.querySelector<HTMLFormElement>("#product-media-form");
  if (!form) return;
  const fileInput = form.elements.namedItem("images") as HTMLInputElement | null;
  const preview = document.querySelector<HTMLDivElement>("#product-media-preview");
  const renderPreview = (): void => {
    if (!preview) return;
    const files = [...(fileInput?.files ?? [])];
    if (!files.length) {
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }
    preview.hidden = false;
    preview.innerHTML = files.map((file) => {
      const url = URL.createObjectURL(file);
      return `<article><img src="${escapeHtml(url)}" alt="Ảnh chờ tải"><span><strong>${escapeHtml(file.name)}</strong><small>${formatNumber(Math.ceil(file.size / 1024))} KB</small></span></article>`;
    }).join("");
    preview.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
    });
  };
  fileInput?.addEventListener("change", renderPreview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const errorTarget = document.querySelector<HTMLElement>("#product-media-error");
    const resultTarget = document.querySelector<HTMLElement>("#product-media-result");
    const data = new FormData(form);
    const files = [...(fileInput?.files ?? [])];
    const maSp = String(data.get("ma_sp") ?? "").trim().toUpperCase();
    const brand = String(data.get("brand") ?? "").trim();
    const product = productMediaCatalog?.products.find((entry) =>
      entry.maSp.toUpperCase() === maSp && entry.brand === brand
    );

    if (!brand || !maSp) {
      if (errorTarget) errorTarget.textContent = "Vui lòng chọn brand và nhập mã sản phẩm.";
      return;
    }
    if (!product) {
      if (errorTarget) errorTarget.textContent = "Mã sản phẩm chưa có trong product_registry của brand đã chọn.";
      return;
    }
    if (!product.active) {
      if (errorTarget) errorTarget.textContent = "Sản phẩm đang tắt ACTIVE trong product_registry.";
      return;
    }
    if (!files.length || files.length > 20) {
      if (errorTarget) errorTarget.textContent = "Mỗi lần chọn từ 1 đến 20 ảnh.";
      return;
    }
    const invalid = files.find((file) =>
      file.size > 8 * 1024 * 1024
      || !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );
    if (invalid) {
      if (errorTarget) errorTarget.textContent = `${invalid.name}: chỉ nhận JPG, PNG, WebP và tối đa 8 MB/ảnh.`;
      return;
    }

    if (submit) {
      submit.disabled = true;
      submit.textContent = `Đang tải 0/${files.length}…`;
    }
    if (errorTarget) errorTarget.textContent = "";
    if (resultTarget) resultTarget.innerHTML = "";

    const outcomes: Array<{ file: File; upload?: ProductMediaUpload; error?: string }> = new Array(files.length);
    let nextIndex = 0;
    let completed = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < files.length) {
        const index = nextIndex++;
        const file = files[index]!;
        try {
          outcomes[index] = {
            file,
            upload: await uploadProductMedia({
              maSp,
              brand,
              fileName: file.name,
              mimeType: file.type,
              contentBase64: await fileToBase64(file),
            }),
          };
        } catch (error) {
          outcomes[index] = {
            file,
            error: error instanceof Error ? error.message : "Không thể tải ảnh lên.",
          };
        } finally {
          completed += 1;
          if (submit) submit.textContent = `Đang tải ${completed}/${files.length}…`;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, files.length) }, () => worker()));

    const success = outcomes.filter((outcome) => outcome.upload);
    const failed = outcomes.filter((outcome) => outcome.error);
    const duplicates = success.filter((outcome) => outcome.upload?.duplicate).length;
    if (resultTarget) {
      resultTarget.innerHTML = `
        <div class="product-media-batch-summary">
          <strong>Hoàn tất ${success.length}/${files.length} ảnh</strong>
          <small>${duplicates ? `${duplicates} ảnh đã tồn tại · ` : ""}${failed.length ? `${failed.length} ảnh lỗi · ` : ""}Ảnh mới đang chờ AI phân loại và duyệt.</small>
        </div>
        <div class="product-media-upload-results">
          ${outcomes.map((outcome) => `
            <article class="${outcome.upload ? "is-success" : "is-error"}">
              ${outcome.upload ? icon("check", 17) : icon("warning", 17)}
              <span><strong>${escapeHtml(outcome.file.name)}</strong><small>${outcome.upload
                ? `${outcome.upload.duplicate ? "Đã tồn tại" : "Đã lưu"} · chờ AI phân loại`
                : escapeHtml(outcome.error ?? "Không thể tải")}</small></span>
              ${outcome.upload ? `<a href="${escapeHtml(outcome.upload.imageUrl)}" target="_blank" rel="noopener">Mở ảnh</a>` : ""}
            </article>`).join("")}
        </div>`;
    }
    if (!failed.length) {
      form.reset();
      if (preview) {
        preview.hidden = true;
        preview.innerHTML = "";
      }
    }
    showToast(
      failed.length ? `Đã tải ${success.length}/${files.length} ảnh; kiểm tra các ảnh lỗi.` : `Đã ghi ${success.length} ảnh vào manual_image_intake.`,
      failed.length ? "warning" : "good",
    );
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Tải ảnh lên";
    }
  });
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32_768)));
  }
  return btoa(chunks.join(""));
}

async function openHandoff(id: string): Promise<void> {
  const layer = document.querySelector<HTMLDivElement>("#detail-layer");
  if (!layer) return;
  layer.innerHTML = `<div class="drawer-scrim" data-close-detail></div><aside class="detail-drawer"><div class="drawer-loading">${renderLoading()}</div></aside>`;
  bindCloseDetail();
  try {
    const handoff = await getHandoff(id);
    const history = handoff.history ?? [];
    layer.innerHTML = `
      <div class="drawer-scrim" data-close-detail></div>
      <aside class="detail-drawer" aria-label="Chi tiết bàn giao">
        <header class="detail-drawer__header">
          <div><span class="eyebrow">BÀN GIAO</span><h2>${escapeHtml(handoff.customerLabel)}</h2><p>Pancake: ${escapeHtml(handoff.pancakeConversationId ?? "Chưa đồng bộ")}</p></div>
          <button class="icon-button" data-close-detail aria-label="Đóng">${icon("close")}</button>
        </header>
        <div class="detail-drawer__summary">
          ${badge(statusLabel(handoff.status), handoff.status === "NEW" ? "warning" : toneForStatus(handoff.status))}
          ${badge(handoffReasonLabel(handoff.reasonCode), "info")}
          <dl>
            <div><dt>Tin nhắn nguồn</dt><dd>${escapeHtml(handoff.triggerMessage)}</dd></div>
            <div><dt>Sản phẩm</dt><dd>${escapeHtml(handoff.productId ?? "Chưa xác định")}</dd></div>
            <div><dt>Nguồn chuyển</dt><dd>${escapeHtml(statusLabel(handoff.source))}</dd></div>
            <div><dt>Thời điểm</dt><dd>${escapeHtml(formatDateTime(handoff.createdAt))}</dd></div>
          </dl>
          <button class="button button--primary button--full" id="open-handoff-conversation">Mở hội thoại</button>
        </div>
        <div class="detail-drawer__body">
          <h3>Lịch sử chuyển quyền</h3>
          <p class="section-note">Mỗi lần bot, khách hoặc quản trị viên chuyển quyền đều được giữ lại.</p>
          ${history.length ? `<div class="handoff-history">${history.map((event) => `
            <article class="handoff-history__item">
              <div><strong>${escapeHtml(event.ownerBefore)} → ${escapeHtml(event.ownerAfter)}</strong><time>${escapeHtml(formatDateTime(event.occurredAt))}</time></div>
              <p>${escapeHtml(handoffReasonLabel(event.reasonCode))}</p>
              <small>${escapeHtml(statusLabel(event.source))}${event.productId ? ` · Mã ${escapeHtml(event.productId)}` : ""}</small>
              <blockquote>${escapeHtml(event.triggerMessage)}</blockquote>
            </article>`).join("")}</div>` : renderEmpty("Chưa có lịch sử", "Hệ thống chưa ghi nhận lần chuyển quyền nào khác.")}
        </div>
      </aside>`;
    bindCloseDetail();
    document.querySelector("#open-handoff-conversation")?.addEventListener("click", () => {
      void openConversation(handoff.conversationId);
    });
  } catch (error) {
    layer.innerHTML = `<div class="drawer-scrim" data-close-detail></div><aside class="detail-drawer"><button class="icon-button drawer-close" data-close-detail>${icon("close")}</button>${renderError(error)}</aside>`;
    bindCloseDetail();
  }
}

async function openConversation(id: string): Promise<void> {
  window.clearTimeout(commandPollTimer);
  const layer = document.querySelector<HTMLDivElement>("#detail-layer");
  if (!layer) return;
  layer.innerHTML = `<div class="drawer-scrim" data-close-detail></div><aside class="detail-drawer"><div class="drawer-loading">${renderLoading()}</div></aside>`;
  bindCloseDetail();
  try {
    const [conversation, commandResponse] = await Promise.all([
      getConversation(id, undefined, identity?.historyEnabled === true),
      getConversationCommands(id),
    ]);
    layer.innerHTML = renderConversationDetail(conversation, commandResponse.items);
    bindCloseDetail();
    bindConversationControls(conversation);
    bindConversationHistoryPagination(conversation, commandResponse.items);
    const activeCommand = commandResponse.items.find((command) =>
      ["PENDING", "PROCESSING"].includes(command.status.toUpperCase()),
    );
    if (activeCommand) pollAdminCommand(activeCommand.id, conversation.id);
  } catch (error) {
    layer.innerHTML = `<div class="drawer-scrim" data-close-detail></div><aside class="detail-drawer"><button class="icon-button drawer-close" data-close-detail>${icon("close")}</button>${renderError(error)}</aside>`;
    bindCloseDetail();
  }
}

function bindConversationHistoryPagination(
  conversation: ConversationDetail,
  commands: AdminCommand[],
): void {
  document.querySelector<HTMLButtonElement>("#load-older-messages")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const cursor = button.dataset.cursor;
    if (!cursor || button.disabled) return;
    button.disabled = true;
    button.textContent = "Đang tải…";
    try {
      const older = await getConversationMessages(conversation.id, cursor);
      conversation.messages = [...older.items, ...conversation.messages];
      conversation.messagesNextCursor = older.nextCursor ?? null;
      const layer = document.querySelector<HTMLDivElement>("#detail-layer");
      if (!layer) return;
      layer.innerHTML = renderConversationDetail(conversation, commands);
      bindCloseDetail();
      bindConversationControls(conversation);
      bindConversationHistoryPagination(conversation, commands);
    } catch (error) {
      button.disabled = false;
      button.textContent = "Tải tin cũ hơn";
      showToast(error instanceof Error ? error.message : "Không thể tải thêm lịch sử.", "danger");
    }
  });
}

function actionFromButton(button: HTMLButtonElement): ControlAction | null {
  const command = button.dataset.adminCommand as AdminCommandName | undefined;
  if (!command) return null;
  const tag = button.dataset.adminTag as PancakeTag | undefined;
  const pause = Number(button.dataset.pauseMinutes);
  const pauseMinutes = pause === 15 || pause === 60 ? pause : undefined;
  const tagLabel = tag ? statusLabel(tag) : "";
  const definitions: Record<AdminCommandName, { label: string; detail: string }> = {
    HANDOFF_NHAN_VIEN: {
      label: "Bàn giao Nhân viên",
      detail: "App chuyển hội thoại cho HUMAN và yêu cầu gắn tag Nhân viên trên Pancake.",
    },
    HANDOFF_VAN_DON: {
      label: "Bàn giao Vận Đơn",
      detail: "App chuyển hội thoại cho HUMAN và yêu cầu gắn tag Vận Đơn trên Pancake.",
    },
    PAUSE_BOT: {
      label: pauseMinutes === 60 ? "Tạm dừng bot 1 giờ" : "Tạm dừng bot 15 phút",
      detail: `Tạm chuyển hội thoại cho HUMAN trong ${pauseMinutes === 60 ? "1 giờ" : "15 phút"}.`,
    },
    RESUME_BOT: {
      label: "Cho bot tiếp quản",
      detail: "Backend sẽ kiểm tra trạng thái và tag chặn trước khi cho bot tiếp quản.",
    },
    SYNC_PANCAKE_TAGS: {
      label: "Đồng bộ tag Pancake",
      detail: "Đọc và xác minh lại tag Pancake, sau đó cập nhật trạng thái app.",
    },
    ADD_TAG: {
      label: `Thêm tag ${tagLabel}`,
      detail: `Yêu cầu thêm tag ${tagLabel} trên Pancake.`,
    },
    REMOVE_TAG: {
      label: `Xóa tag ${tagLabel}`,
      detail: `Yêu cầu xóa tag ${tagLabel} trên Pancake.`,
    },
  };
  const definition = definitions[command];
  if (!definition) return null;
  return {
    command,
    ...definition,
    ...(tag ? { tag } : {}),
    ...(pauseMinutes ? { pauseMinutes } : {}),
  };
}

function bindConversationControls(conversation: ConversationDetail): void {
  document.querySelectorAll<HTMLButtonElement>("[data-admin-command]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const action = actionFromButton(button);
      if (action) openCommandConfirmation(conversation, action);
    });
  });
}

function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openCommandConfirmation(
  conversation: ConversationDetail,
  action: ControlAction,
): void {
  const modalLayer = document.querySelector<HTMLDivElement>("#command-modal-layer");
  if (!modalLayer) return;
  const defaultReasonByCommand: Record<AdminCommandName, string> = {
    HANDOFF_NHAN_VIEN: "ADMIN_HANDOFF",
    HANDOFF_VAN_DON: "POST_SALE_SUPPORT",
    PAUSE_BOT: "TEMPORARY_PAUSE",
    RESUME_BOT: "RESUME_AFTER_REVIEW",
    SYNC_PANCAKE_TAGS: "MANUAL_TAG_SYNC",
    ADD_TAG: "TAG_CORRECTION",
    REMOVE_TAG: "TAG_CORRECTION",
  };
  const reason = defaultReasonByCommand[action.command];
  modalLayer.innerHTML = `
    <div class="command-modal-scrim" data-close-command-modal></div>
    <section class="command-modal" role="dialog" aria-modal="true" aria-labelledby="command-modal-title">
      <header><div><span class="eyebrow">XÁC NHẬN THAO TÁC</span><h2 id="command-modal-title">${escapeHtml(action.label)}</h2></div><button class="icon-button" type="button" data-close-command-modal aria-label="Đóng">${icon("close")}</button></header>
      <p>${escapeHtml(action.detail)}</p>
      <div class="command-modal__safety">${icon("shield", 18)}<span>Thao tác này không gửi tin cho khách. Kết quả được lưu vào nhật ký audit.</span></div>
      <form id="command-confirmation-form">
        <small id="command-form-error" role="alert"></small>
        <div><button class="button button--secondary" type="button" data-close-command-modal>Hủy</button><button class="button button--primary" type="submit">Xác nhận</button></div>
      </form>
    </section>`;
  const close = () => {
    modalLayer.innerHTML = "";
  };
  modalLayer.querySelectorAll("[data-close-command-modal]").forEach((element) =>
    element.addEventListener("click", close),
  );
  modalLayer.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  const idempotencyKey = newIdempotencyKey();
  modalLayer.querySelector<HTMLFormElement>("#command-confirmation-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const errorTarget = form.querySelector<HTMLElement>("#command-form-error");
    if (submit?.disabled) return;
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Đang tạo lệnh…";
    }
    try {
      const command = await createConversationCommand(
        conversation.id,
        {
          command: action.command,
          ...(action.tag ? { tag: action.tag } : {}),
          ...(action.pauseMinutes ? { pauseMinutes: action.pauseMinutes } : {}),
          reason,
          expectedStateVersion: conversation.stateVersion,
        },
        idempotencyKey,
      );
      close();
      showToast("Đã tiếp nhận lệnh quản trị. Đang chờ xử lý.", "good");
      await openConversation(conversation.id);
      if (["PENDING", "PROCESSING"].includes(command.status.toUpperCase())) {
        pollAdminCommand(command.id, conversation.id);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        close();
        showToast("Hội thoại vừa thay đổi. Đã tải lại trạng thái mới nhất.", "warning");
        await openConversation(conversation.id);
        return;
      }
      if (errorTarget) {
        errorTarget.textContent = error instanceof Error
          ? error.message
          : "Không thể tạo lệnh quản trị.";
      }
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Xác nhận";
      }
    }
  });
}

function pollAdminCommand(commandId: string, conversationId: string, attempt = 0): void {
  window.clearTimeout(commandPollTimer);
  if (attempt >= 40) return;
  commandPollTimer = window.setTimeout(async () => {
    const drawer = document.querySelector<HTMLElement>("[data-open-conversation-id]");
    if (drawer?.dataset.openConversationId !== conversationId) return;
    try {
      const command = await getAdminCommand(commandId);
      if (["APPLIED", "FAILED", "CANCELLED", "CONFLICT"].includes(command.status.toUpperCase())) {
        showToast(
          command.status.toUpperCase() === "APPLIED"
            ? "Thao tác đã được áp dụng."
            : `Thao tác ${statusLabel(command.status).toLowerCase()}.`,
          command.status.toUpperCase() === "APPLIED" ? "good" : "danger",
        );
        await openConversation(conversationId);
        return;
      }
      pollAdminCommand(commandId, conversationId, attempt + 1);
    } catch {
      pollAdminCommand(commandId, conversationId, attempt + 1);
    }
  }, 1_500);
}

function bindCloseDetail(): void {
  document.querySelectorAll("[data-close-detail]").forEach((element) =>
    element.addEventListener("click", () => {
      window.clearTimeout(commandPollTimer);
      const layer = document.querySelector("#detail-layer");
      if (layer) layer.innerHTML = "";
      const modalLayer = document.querySelector("#command-modal-layer");
      if (modalLayer) modalLayer.innerHTML = "";
    }),
  );
}

function showToast(message: string, tone: "good" | "warning" | "danger" = "good"): void {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3_000);
}

function startPolling(): void {
  window.clearInterval(refreshTimer);
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible" && currentRoute !== "media" && !(currentRoute === "datasets" && datasetProjectFromHash()) && !document.querySelector(".detail-drawer")) {
      void loadCurrentPage(true);
    }
    updateRefreshTime();
  }, 5_000);
}

window.addEventListener("hashchange", () => {
  const nextRoute = routeFromHash();
  // Within the datasets route the project sub-segment changes without changing
  // the route name; detect that so the queue view loads/unloads.
  const datasetSubpathChanged =
    nextRoute === "datasets" &&
    currentRoute === "datasets" &&
    datasetProjectFromHash() !== (datasetQueue?.item ? datasetQueue.projectId : null);
  if (nextRoute === currentRoute && !datasetSubpathChanged) return;
  currentRoute = nextRoute;
  activeController?.abort();
  renderShell();
  void loadCurrentPage(false);
  toggleSidebar(false);
});

document.addEventListener("keydown", (event) => {
  if (currentRoute === "datasets" && !event.repeat && event.key.toLowerCase() === "p" && !event.ctrlKey && !event.metaKey && !event.altKey && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLSelectElement)) {
    document.querySelector<HTMLButtonElement>("[data-review-action=PREVIOUS]")?.click();
    return;
  }
  if (event.key === "Escape") {
    const modalLayer = document.querySelector("#command-modal-layer");
    if (modalLayer?.hasChildNodes()) {
      modalLayer.innerHTML = "";
      return;
    }
    window.clearTimeout(commandPollTimer);
    const layer = document.querySelector("#detail-layer");
    if (layer) layer.innerHTML = "";
    toggleSidebar(false);
  }
});

async function initialize(): Promise<void> {
  renderShell();
  try {
    identity = await getIdentity();
    const summary = await getHandoffSummary().catch(() => null);
    handoffOpenCount = summary?.open ?? 0;
    if (currentRoute === "outreach" && !identity.historyEnabled) {
      currentRoute = "overview";
      history.replaceState(null, "", "#/overview");
    }
    renderShell();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      showToast("Phiên đăng nhập chưa hợp lệ. Vui lòng đăng nhập lại qua Authentik.");
    }
  }
  await loadCurrentPage(false);
  startPolling();
}

void initialize();
