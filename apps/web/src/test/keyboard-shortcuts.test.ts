import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/**
 * Tests for the useKeyboardShortcuts hook — covers foot pedal keys
 * (PageDown/PageUp), arrow key navigation, transpose callbacks,
 * and the enabled/disabled toggle.
 */

function createMockScrollElement() {
  return {
    clientHeight: 800,
    scrollBy: vi.fn(),
  } as unknown as HTMLDivElement;
}

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  let mockEl: ReturnType<typeof createMockScrollElement>;
  let scrollRef: { current: HTMLDivElement };

  beforeEach(() => {
    mockEl = createMockScrollElement();
    scrollRef = { current: mockEl as HTMLDivElement };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================== POSITIVE =====================

  describe("positive — foot pedal & page scroll", () => {
    it("PageDown scrolls down ~90% of viewport", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("PageDown");
      expect(mockEl.scrollBy).toHaveBeenCalledWith({
        top: 800 * 0.9,
        behavior: "smooth",
      });
    });

    it("Space scrolls down ~90% of viewport (foot pedal primary)", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey(" ");
      expect(mockEl.scrollBy).toHaveBeenCalledWith({
        top: 800 * 0.9,
        behavior: "smooth",
      });
    });

    it("PageUp scrolls up ~90% of viewport", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("PageUp");
      expect(mockEl.scrollBy).toHaveBeenCalledWith({
        top: -800 * 0.9,
        behavior: "smooth",
      });
    });

    it("ArrowDown scrolls down 25% of viewport", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("ArrowDown");
      expect(mockEl.scrollBy).toHaveBeenCalledWith({
        top: 800 * 0.25,
        behavior: "smooth",
      });
    });

    it("ArrowUp scrolls up 25% of viewport", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("ArrowUp");
      expect(mockEl.scrollBy).toHaveBeenCalledWith({
        top: -800 * 0.25,
        behavior: "smooth",
      });
    });
  });

  describe("positive — transpose callbacks", () => {
    it("ArrowRight calls onTransposeUp", () => {
      const onTransposeUp = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onTransposeUp }));
      fireKey("ArrowRight");
      expect(onTransposeUp).toHaveBeenCalledTimes(1);
    });

    it("ArrowLeft calls onTransposeDown", () => {
      const onTransposeDown = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onTransposeDown }));
      fireKey("ArrowLeft");
      expect(onTransposeDown).toHaveBeenCalledTimes(1);
    });

    it("Escape calls onEscape", () => {
      const onEscape = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onEscape }));
      fireKey("Escape");
      expect(onEscape).toHaveBeenCalledTimes(1);
    });
  });

  // ===================== NEGATIVE =====================

  describe("negative — disabled & ignored cases", () => {
    it("does nothing when enabled=false", () => {
      const onTransposeUp = vi.fn();
      renderHook(() =>
        useKeyboardShortcuts({ scrollRef, onTransposeUp, enabled: false })
      );
      fireKey("ArrowRight");
      fireKey("PageDown");
      expect(onTransposeUp).not.toHaveBeenCalled();
      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("ignores Space with modifier keys (Ctrl+Space)", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey(" ", { ctrlKey: true });
      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("ignores ArrowDown with modifier keys", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("ArrowDown", { ctrlKey: true });
      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("ignores ArrowUp with Shift held", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      fireKey("ArrowUp", { shiftKey: true });
      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("ignores ArrowRight with Alt held", () => {
      const onTransposeUp = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onTransposeUp }));
      fireKey("ArrowRight", { altKey: true });
      expect(onTransposeUp).not.toHaveBeenCalled();
    });

    it("ignores ArrowLeft with Meta held", () => {
      const onTransposeDown = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onTransposeDown }));
      fireKey("ArrowLeft", { metaKey: true });
      expect(onTransposeDown).not.toHaveBeenCalled();
    });

    it("ignores keydown events from input elements", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));

      const input = document.createElement("input");
      document.body.appendChild(input);
      const event = new KeyboardEvent("keydown", {
        key: "PageDown",
        bubbles: true,
      });
      input.dispatchEvent(event);
      document.body.removeChild(input);

      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("ignores keydown events from textarea elements", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      const event = new KeyboardEvent("keydown", {
        key: "PageDown",
        bubbles: true,
      });
      textarea.dispatchEvent(event);
      document.body.removeChild(textarea);

      expect(mockEl.scrollBy).not.toHaveBeenCalled();
    });

    it("does not crash when scrollRef.current is null", () => {
      const nullRef = { current: null };
      renderHook(() =>
        useKeyboardShortcuts({
          scrollRef: nullRef as any,
        })
      );
      // Should not throw
      expect(() => fireKey("PageDown")).not.toThrow();
    });

    it("does not call missing callbacks gracefully", () => {
      renderHook(() => useKeyboardShortcuts({ scrollRef }));
      // No onTransposeUp given — should not throw
      expect(() => fireKey("ArrowRight")).not.toThrow();
      expect(() => fireKey("Escape")).not.toThrow();
    });

    it("ignores unrecognized keys", () => {
      const onTransposeUp = vi.fn();
      renderHook(() => useKeyboardShortcuts({ scrollRef, onTransposeUp }));
      fireKey("a");
      fireKey("Enter");
      fireKey("Tab");
      expect(mockEl.scrollBy).not.toHaveBeenCalled();
      expect(onTransposeUp).not.toHaveBeenCalled();
    });
  });
});
