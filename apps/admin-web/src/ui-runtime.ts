export type ToastTone = "good" | "warning" | "danger";

const interactiveSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusStack: Array<HTMLElement | null> = [];
let dialogDepth = 0;

export function showAccessibleToast(
  region: Element | null,
  message: string,
  tone: ToastTone = "good",
): void {
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.setAttribute("role", tone === "danger" ? "alert" : "status");
  toast.setAttribute("aria-live", tone === "danger" ? "assertive" : "polite");
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), tone === "danger" ? 6_000 : 4_000);
}

export function isEditingContext(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement ||
    (active instanceof HTMLElement && active.isContentEditable);
}

export function hasBlockingOverlay(): boolean {
  return Boolean(
    document.querySelector(
      '.detail-drawer, [role="dialog"], .policy-modal, .command-modal, [data-polling-pause]',
    ),
  );
}

export function preserveViewport<T>(render: () => T): T {
  const active = document.activeElement;
  const activeId = active instanceof HTMLElement ? active.id : "";
  const selection = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
    ? { start: active.selectionStart, end: active.selectionEnd }
    : null;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const result = render();
  window.scrollTo(scrollX, scrollY);
  if (activeId) {
    const next = document.getElementById(activeId);
    next?.focus({ preventScroll: true });
    if (
      selection &&
      (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement)
    ) {
      next.setSelectionRange(selection.start, selection.end);
    }
  }
  return result;
}

export function activateDialog(dialog: HTMLElement): () => void {
  const restoreFocusTo = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  focusStack.push(restoreFocusTo);
  dialogDepth += 1;
  const app = document.querySelector<HTMLElement>("#app");
  if (app) app.inert = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const focusable = [...dialog.querySelectorAll<HTMLElement>(interactiveSelector)];
  (focusable[0] ?? dialog).focus({ preventScroll: true });

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      dialog.querySelector<HTMLElement>("[data-close-detail], [data-close-modal]")?.click();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...dialog.querySelectorAll<HTMLElement>(interactiveSelector)]
      .filter((item) => !item.hidden && item.offsetParent !== null);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  dialog.addEventListener("keydown", onKeydown);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    dialog.removeEventListener("keydown", onKeydown);
    dialogDepth = Math.max(0, dialogDepth - 1);
    if (app && dialogDepth === 0) app.inert = false;
    const target = focusStack.pop();
    target?.focus({ preventScroll: true });
  };
}

export function readRouteParams(): URLSearchParams {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  return new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
}

export function writeRouteParams(params: URLSearchParams, replace = true): void {
  const hash = window.location.hash;
  const route = (hash.indexOf("?") >= 0 ? hash.slice(0, hash.indexOf("?")) : hash) || "#/overview";
  const query = params.toString();
  const next = `${route}${query ? `?${query}` : ""}`;
  if (replace) history.replaceState(null, "", next);
  else window.location.hash = next;
}
