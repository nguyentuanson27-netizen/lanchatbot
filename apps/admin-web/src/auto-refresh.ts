const AUTO_REFRESH_STORAGE_KEY = "lana.admin.auto-refresh.v1";

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AutoRefreshConditions {
  readonly enabled: boolean;
  readonly visible: boolean;
  readonly routeSupportsPolling: boolean;
  readonly hasBlockingOverlay: boolean;
  readonly isEditing: boolean;
}

export function readAutoRefreshEnabled(storage: PreferenceStorage | null | undefined): boolean {
  try {
    const value = storage?.getItem(AUTO_REFRESH_STORAGE_KEY);
    if (value === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function writeAutoRefreshEnabled(
  storage: PreferenceStorage | null | undefined,
  enabled: boolean,
): void {
  try {
    storage?.setItem(AUTO_REFRESH_STORAGE_KEY, String(enabled));
  } catch {
    // Preference persistence must never prevent manual refresh or page use.
  }
}

export function shouldAutoRefresh(conditions: AutoRefreshConditions): boolean {
  return conditions.enabled &&
    conditions.visible &&
    conditions.routeSupportsPolling &&
    !conditions.hasBlockingOverlay &&
    !conditions.isEditing;
}

export function autoRefreshLabel(enabled: boolean): string {
  return `Tự cập nhật an toàn mỗi 5 giây: ${enabled ? "Bật" : "Tắt"}`;
}

export function renderAutoRefreshToggle(enabled: boolean): string {
  const label = autoRefreshLabel(enabled);
  return `<button type="button" class="auto-refresh-toggle" id="auto-refresh-toggle" role="switch" aria-checked="${enabled}" aria-label="${label}"><span class="auto-refresh-toggle__track" aria-hidden="true"><span></span></span><span class="auto-refresh-toggle__label">${label}</span></button>`;
}
