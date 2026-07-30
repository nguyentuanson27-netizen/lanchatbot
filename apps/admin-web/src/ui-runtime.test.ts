import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateDialog } from "./ui-runtime.js";

class FakeElement {
  inert = false;
  hidden = false;
  offsetParent: FakeElement | null = this;
  clicked = 0;
  focused = 0;
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, (event: KeyboardEvent) => void>();
  closeTarget: FakeElement | null = null;

  focus(): void {
    this.focused += 1;
  }

  click(): void {
    this.clicked += 1;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(name: string, listener: (event: KeyboardEvent) => void): void {
    this.listeners.set(name, listener);
  }

  removeEventListener(name: string): void {
    this.listeners.delete(name);
  }

  querySelectorAll(): FakeElement[] {
    return this.closeTarget ? [this.closeTarget] : [];
  }

  querySelector(): FakeElement | null {
    return this.closeTarget;
  }
}

describe("dialog lifecycle", () => {
  let background: FakeElement;
  let restoreTarget: FakeElement;
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    background = new FakeElement();
    restoreTarget = new FakeElement();
    vi.stubGlobal("HTMLElement", FakeElement);
    vi.stubGlobal("document", {
      activeElement: restoreTarget,
      querySelector: (selector: string) => selector === ".app-shell" ? background : null,
    });
  });

  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
    vi.unstubAllGlobals();
  });

  it("inerts only the background shell and keeps the drawer interactive", () => {
    const drawer = new FakeElement();
    drawer.closeTarget = new FakeElement();
    const cleanup = activateDialog(drawer as unknown as HTMLElement);
    cleanups.push(cleanup);

    expect(background.inert).toBe(true);
    expect(drawer.inert).toBe(false);
    expect(drawer.attributes.get("aria-modal")).toBe("true");

    cleanup();
    expect(background.inert).toBe(false);
  });

  it("keeps the background inert until nested dialogs are both cleaned up", () => {
    const drawerCleanup = activateDialog(new FakeElement() as unknown as HTMLElement);
    const modalCleanup = activateDialog(new FakeElement() as unknown as HTMLElement);
    cleanups.push(drawerCleanup, modalCleanup);

    modalCleanup();
    expect(background.inert).toBe(true);
    drawerCleanup();
    expect(background.inert).toBe(false);
  });

  it("supports out-of-order cleanup without stealing focus from the top dialog", () => {
    const drawerCleanup = activateDialog(new FakeElement() as unknown as HTMLElement);
    const modalCleanup = activateDialog(new FakeElement() as unknown as HTMLElement);
    cleanups.push(drawerCleanup, modalCleanup);

    drawerCleanup();
    expect(background.inert).toBe(true);
    expect(restoreTarget.focused).toBe(0);

    modalCleanup();
    expect(background.inert).toBe(false);
    expect(restoreTarget.focused).toBe(1);
  });

  it("routes Escape through the dialog close control", () => {
    const dialog = new FakeElement();
    const close = new FakeElement();
    dialog.closeTarget = close;
    cleanups.push(activateDialog(dialog as unknown as HTMLElement));
    const event = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() };

    dialog.listeners.get("keydown")?.(event as unknown as KeyboardEvent);

    expect(close.clicked).toBe(1);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });
});
