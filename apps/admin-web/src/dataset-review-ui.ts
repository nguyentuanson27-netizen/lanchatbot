import { escapeHtml } from "./format.js";
import type {
  Identity,
} from "./types.js";
import type {
  ReviewAction,
  LabelOption,
  ReviewAnnotation,
  ReviewLease,
  ReviewMessage,
  ReviewMode,
  ReviewQueueData,
} from "./dataset-review-types.js";

// Dataset Review Queue UI. Pure render + interaction logic (no DOM dependency),
// matching the repo's render*(data, identity) => HTML string convention. Raw PII
// never reaches this layer; it renders redacted text only.

const roleLabels: Record<ReviewMessage["role"], string> = {
  CUSTOMER: "Khách",
  SHOP: "Shop",
  UNKNOWN: "Không rõ",
};

// --- Evidence highlighting ---------------------------------------------------

interface Span {
  readonly start: number;
  readonly end: number;
}

// Escape `text` and wrap each evidence span in <mark>. Spans are clamped to the
// text length, sorted and merged so overlapping/adjacent spans never produce
// broken markup. Offsets are UTF-16 indices into the redacted text.
export function highlightEvidence(text: string, spans: readonly Span[]): string {
  const valid = spans
    .filter((span) => Number.isInteger(span.start) && Number.isInteger(span.end))
    .map((span) => ({ start: Math.max(0, span.start), end: Math.min(text.length, span.end) }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);

  const merged: Span[] = [];
  for (const span of valid) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, span.end) };
    } else {
      merged.push(span);
    }
  }

  if (merged.length === 0) return escapeHtml(text);

  let cursor = 0;
  let html = "";
  for (const span of merged) {
    html += escapeHtml(text.slice(cursor, span.start));
    html += `<mark class="evidence" data-evidence>${escapeHtml(text.slice(span.start, span.end))}</mark>`;
    cursor = span.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

// --- Keyboard shortcuts ------------------------------------------------------

export interface ShortcutContext {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly targetTag?: string;
  readonly isContentEditable?: boolean;
}

// Map a keypress to a review action, or null. Shortcuts never fire while a text
// input, textarea, select or contentEditable element has focus, and never with a
// ctrl/meta/alt modifier (those belong to the browser).
export function resolveShortcut(context: ShortcutContext): ReviewAction | null {
  if (context.ctrlKey || context.metaKey || context.altKey) return null;
  const tag = (context.targetTag ?? "").toUpperCase();
  if (context.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return null;
  }
  const key = context.key.toLowerCase();
  if (key === "a") return context.shiftKey ? "ACCEPT_ALL" : "ACCEPT";
  if (context.shiftKey) return null;
  switch (key) {
    case "r":
      return "REJECT";
    case "e":
      return "EDIT";
    case "n":
      return "SAVE_NEXT";
    case "p":
      return "PREVIOUS";
    case "s":
      return "SKIP";
    default:
      return null;
  }
}

// --- Blind review gating -----------------------------------------------------

// In blind / double-blind mode the reviewer must not see AI or heuristic
// proposals until their own pass is submitted (revealed). Human/adjudicator
// annotations (the reviewer's own work) always show.
export function visibleAnnotations(
  annotations: readonly ReviewAnnotation[],
  reviewMode: ReviewMode,
  revealed: boolean,
): readonly ReviewAnnotation[] {
  if (reviewMode === "AI_ASSISTED" || revealed) return annotations;
  return annotations.filter((a) => a.source === "HUMAN" || a.source === "ADJUDICATOR");
}

// --- Concurrency -------------------------------------------------------------

export function isLeaseHeldByOther(
  lease: ReviewLease,
  currentReviewer: string,
  nowMs: number = Date.now(),
): boolean {
  if (lease.ownedByCurrent || !lease.ownerSubject || lease.ownerSubject === currentReviewer) return false;
  if (!lease.until) return true;
  const until = new Date(lease.until).getTime();
  return Number.isFinite(until) && until > nowMs;
}

// --- Rendering ---------------------------------------------------------------

function renderTranscript(messages: readonly ReviewMessage[], spansByTurn: Map<number, Span[]>): string {
  if (messages.length === 0) return `<p class="empty-state">Không có tin nhắn.</p>`;
  return messages
    .map((message) => {
      const spans = spansByTurn.get(message.turnIndex) ?? [];
      const body = highlightEvidence(message.redactedText, spans);
      return `<div class="review-msg review-msg--${message.role.toLowerCase()}" id="review-turn-${message.turnIndex}" data-turn-index="${message.turnIndex}">
        <span class="review-msg__meta">#${message.turnIndex} · ${escapeHtml(roleLabels[message.role])}</span>
        <p class="review-msg__text">${body}</p>
      </div>`;
    })
    .join("");
}

function confidenceBadge(confidence: ReviewAnnotation["confidence"]): string {
  return `<span class="review-conf review-conf--${confidence.toLowerCase()}">${confidence}</span>`;
}

function renderLabelSelect(labels: readonly LabelOption[], disabled: boolean): string {
  const options = labels
    .map((label) =>
      `<option value="${escapeHtml(label.code)}">${escapeHtml(label.name)} (${escapeHtml(label.code)})</option>`,
    )
    .join("");
  const disabledAttribute = disabled || labels.length === 0 ? " disabled" : "";
  const placeholder = labels.length === 0 ? "Kh\u00f4ng c\u00f3 nh\u00e3n kh\u1ea3 d\u1ee5ng" : "Ch\u1ecdn nh\u00e3n \u0111\u1ec3 th\u00eam\u2026";
  return `<select class="review-label-select" data-annotation-add aria-label="Th\u00eam nh\u00e3n"${disabledAttribute}>
    <option value="">${placeholder}</option>
    ${options}
  </select>`;
}

function renderAnnotationCard(
  annotation: ReviewAnnotation,
  locked: boolean,
  canRemove: boolean,
): string {
  const disabled = locked ? " disabled" : "";
  const evidence = annotation.evidenceText
    ? `<blockquote class="review-ann__evidence" data-jump-turn="${annotation.turnIndex ?? ""}">${escapeHtml(annotation.evidenceText)}</blockquote>`
    : `<p class="review-ann__evidence review-ann__evidence--none">Không có bằng chứng</p>`;
  return `<article class="review-ann review-ann--${annotation.status.toLowerCase()}" data-annotation-id="${escapeHtml(annotation.id)}" data-annotation-source="${annotation.source}">
    <header><strong>${escapeHtml(annotation.labelCode)}</strong> ${confidenceBadge(annotation.confidence)}
      <span class="review-ann__source">${annotation.source}</span></header>
    ${evidence}
    <div class="review-ann__actions">
      <button type="button" data-annotation-action="ACCEPT" data-annotation-id="${escapeHtml(annotation.id)}"${disabled}>Chấp nhận</button>
      <button type="button" data-annotation-action="REJECT" data-annotation-id="${escapeHtml(annotation.id)}"${disabled}>Từ chối</button>
      <button type="button" data-annotation-action="EDIT" data-annotation-id="${escapeHtml(annotation.id)}"${disabled}>Sửa</button>
      ${canRemove ? `<button type="button" data-annotation-action="DELETE" data-annotation-id="${escapeHtml(annotation.id)}"${disabled}>Xóa</button>` : ""}
    </div>
  </article>`;
}

export function renderReviewQueue(data: ReviewQueueData, identity: Identity | null): string {
  const currentReviewer = identity?.email ?? "";
  const item = data.item;
  if (!item) {
    return `<section class="empty-state"><h3>Hết mục để review</h3><p>Không còn hội thoại nào trong hàng đợi ${escapeHtml(data.split)}.</p></section>`;
  }

  const canAnnotate = identity?.datasetReview?.canAnnotate === true;
  const canRemove = identity?.datasetReview?.canAdjudicate === true;
  const locked = !canAnnotate || isLeaseHeldByOther(item.lease, currentReviewer);
  const revealed = data.revealed ?? false;
  const annotations = visibleAnnotations(item.annotations, data.reviewMode, revealed);

  const spansByTurn = new Map<number, Span[]>();
  for (const annotation of annotations) {
    if (annotation.turnIndex === null || annotation.evidenceStart === null || annotation.evidenceEnd === null) continue;
    const list = spansByTurn.get(annotation.turnIndex) ?? [];
    list.push({ start: annotation.evidenceStart, end: annotation.evidenceEnd });
    spansByTurn.set(annotation.turnIndex, list);
  }

  const flags = item.qualityFlags.length > 0
    ? `<div class="review-flags">${item.qualityFlags.map((flag) => `<span class="review-flag">${escapeHtml(flag)}</span>`).join("")}</div>`
    : "";

  const lockBanner = locked
    ? `<div class="review-lock" role="status" data-review-locked>Đang được ${escapeHtml(item.lease.ownerSubject ?? "người khác")} review. Chỉ đọc.</div>`
    : "";

  const blindNote = data.reviewMode !== "AI_ASSISTED" && !revealed
    ? `<div class="review-blind" role="note" data-review-blind>Chế độ ẩn: đề xuất của AI được ẩn tới khi bạn gửi bản review.</div>`
    : "";

  const proposals = data.reviewMode !== "AI_ASSISTED" && !revealed && annotations.length === 0
    ? `<p class="empty-state">Chưa có nhãn nào. Thêm nhãn của bạn.</p>`
    : annotations.map((annotation) => renderAnnotationCard(annotation, locked, canRemove)).join("")
      || `<p class="empty-state">Chưa có nhãn đề xuất.</p>`;

  const disabled = locked ? " disabled" : "";
  const progressPct = data.progress.total > 0
    ? Math.round((data.progress.reviewed / data.progress.total) * 100)
    : 0;

  return `<section class="review-queue" data-project-id="${escapeHtml(data.projectId)}" data-project-item-id="${escapeHtml(item.projectItemId)}" data-revision="${item.revision}" data-review-mode="${data.reviewMode}">
    <header class="review-header">
      <div><small>${escapeHtml(data.projectName)}</small><h2>${escapeHtml(data.split)} · #${escapeHtml(item.projectItemId.slice(0, 8))}</h2></div>
      <div class="review-progress" data-progress="${data.progress.reviewed}/${data.progress.total}">
        <span>${data.progress.reviewed}/${data.progress.total}</span>
        <div class="review-progress__bar"><span style="width:${progressPct}%"></span></div>
      </div>
      <div class="review-reviewer">${escapeHtml(currentReviewer)}</div>
    </header>
    ${lockBanner}${blindNote}
    <div class="review-body">
      <div class="review-transcript" aria-label="Hội thoại">${flags}${renderTranscript(item.messages, spansByTurn)}</div>
      <div class="review-labels" aria-label="Nhãn">${proposals}
        ${renderLabelSelect(data.labels, locked)}
      </div>
    </div>
    <footer class="review-footer">
      <button type="button" data-review-action="PREVIOUS"${disabled}>Trước (P)</button>
      <button type="button" data-review-action="ACCEPT_ALL"${disabled}>Chấp nhận tất cả (Shift+A)</button>
      <button type="button" data-review-action="SKIP"${disabled}>Bỏ qua (S)</button>
      <button type="button" data-review-action="NEEDS_ADJUDICATION"${disabled}>Cần phân xử</button>
      <button type="button" class="primary-button" data-review-action="SAVE_NEXT"${disabled}>Lưu &amp; tiếp (N)</button>
    </footer>
  </section>`;
}

// --- Optional event binding (used when mounted into main.ts, Batch 6) --------

export interface ReviewQueueHandlers {
  onAction(action: ReviewAction | "NEEDS_ADJUDICATION"): void;
  onAddLabel(labelCode: string): void;
  onAnnotationAction(action: "ACCEPT" | "REJECT" | "EDIT" | "DELETE", annotationId: string): void;
  onJumpToTurn(turnIndex: number): void;
}

export function bindReviewQueue(root: ParentNode, handlers: ReviewQueueHandlers): void {
  root.querySelectorAll<HTMLElement>("[data-annotation-action]").forEach((element) => {
    element.addEventListener("click", () => {
      const action = element.dataset.annotationAction as "ACCEPT" | "REJECT" | "EDIT" | "DELETE";
      const id = element.dataset.annotationId ?? "";
      if (action && id) handlers.onAnnotationAction(action, id);
    });
  });
  root.querySelectorAll<HTMLElement>("[data-review-action]").forEach((element) => {
    element.addEventListener("click", () => {
      const action = element.dataset.reviewAction as ReviewAction | "NEEDS_ADJUDICATION";
      if (action) handlers.onAction(action);
    });
  });
  root.querySelector<HTMLSelectElement>("[data-annotation-add]")?.addEventListener("change", (event) => {
    const select = event.currentTarget as HTMLSelectElement;
    if (select.value) handlers.onAddLabel(select.value);
  });
  root.querySelectorAll<HTMLElement>("[data-jump-turn]").forEach((element) => {
    element.addEventListener("click", () => {
      const turn = Number(element.dataset.jumpTurn);
      if (Number.isInteger(turn)) handlers.onJumpToTurn(turn);
    });
  });
}
