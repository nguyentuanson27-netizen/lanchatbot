import { describe, expect, it } from "vitest";
import {
  autoRefreshLabel,
  readAutoRefreshEnabled,
  renderAutoRefreshToggle,
  shouldAutoRefresh,
  writeAutoRefreshEnabled,
} from "./auto-refresh.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("safe auto refresh preference", () => {
  it("preserves the existing enabled default and persists an explicit choice", () => {
    const storage = new MemoryStorage();
    expect(readAutoRefreshEnabled(storage)).toBe(true);
    writeAutoRefreshEnabled(storage, false);
    expect(readAutoRefreshEnabled(storage)).toBe(false);
    writeAutoRefreshEnabled(storage, true);
    expect(readAutoRefreshEnabled(storage)).toBe(true);
  });

  it("fails open when stored preference data is invalid or unavailable", () => {
    const invalid = { getItem: () => "invalid", setItem: () => undefined };
    const unavailable = { getItem: () => { throw new Error("blocked"); }, setItem: () => undefined };
    expect(readAutoRefreshEnabled(invalid)).toBe(true);
    expect(readAutoRefreshEnabled(unavailable)).toBe(true);
  });

  it("only polls when enabled and the existing safety gates are clear", () => {
    const safe = {
      enabled: true,
      visible: true,
      routeSupportsPolling: true,
      hasBlockingOverlay: false,
      isEditing: false,
    };
    expect(shouldAutoRefresh(safe)).toBe(true);
    expect(shouldAutoRefresh({ ...safe, enabled: false })).toBe(false);
    expect(shouldAutoRefresh({ ...safe, hasBlockingOverlay: true })).toBe(false);
  });

  it("provides an explicit Vietnamese state label", () => {
    expect(autoRefreshLabel(true)).toBe("Tự cập nhật an toàn mỗi 5 giây: Bật");
    expect(autoRefreshLabel(false)).toBe("Tự cập nhật an toàn mỗi 5 giây: Tắt");
  });

  it("renders an accessible switch with its current state", () => {
    expect(renderAutoRefreshToggle(false)).toContain('role="switch"');
    expect(renderAutoRefreshToggle(false)).toContain('aria-checked="false"');
    expect(renderAutoRefreshToggle(false)).toContain("Tắt");
  });
});
