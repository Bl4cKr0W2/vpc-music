import { useEffect, useCallback, useRef } from "react";

/**
 * Keyboard shortcuts & foot pedal support for performance mode.
 *
 * Bluetooth foot pedals (AirTurn, PageFlip, etc.) send standard keyboard
 * events — typically PageDown / PageUp — so this hook doubles as pedal
 * support with zero extra hardware API work.
 *
 * Shortcuts:
 *   PageDown / Space  → scroll down one viewport height (foot pedal primary)
 *   PageUp            → scroll up one viewport height (foot pedal secondary)
 *   ArrowDown         → scroll down a small step (¼ viewport)
 *   ArrowUp           → scroll up a small step (¼ viewport)
 *   ArrowRight        → transpose up  (optional callback)
 *   ArrowLeft         → transpose down (optional callback)
 *   Escape            → stop auto-scroll (optional callback)
 */

export interface KeyboardShortcutsOptions {
  /** Ref to the scrollable container (the chord-sheet wrapper). */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Called when the user presses ArrowRight (transpose up). */
  onTransposeUp?: () => void;
  /** Called when the user presses ArrowLeft (transpose down). */
  onTransposeDown?: () => void;
  /** Called when the user presses Escape (e.g. stop auto-scroll). */
  onEscape?: () => void;
  /** Set to false to temporarily disable all shortcuts. Default: true. */
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  scrollRef,
  onTransposeUp,
  onTransposeDown,
  onEscape,
  enabled = true,
}: KeyboardShortcutsOptions) {
  // Keep callbacks in refs so the effect doesn't re-register on every render.
  const transposeUpRef = useRef(onTransposeUp);
  const transposeDownRef = useRef(onTransposeDown);
  const escapeRef = useRef(onEscape);

  transposeUpRef.current = onTransposeUp;
  transposeDownRef.current = onTransposeDown;
  escapeRef.current = onEscape;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in an input / textarea / select / contentEditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const el = scrollRef.current;

      switch (e.key) {
        case "PageDown":
        case " ": {
          // Space only when not holding modifier keys
          if (e.key === " " && (e.ctrlKey || e.metaKey || e.altKey)) return;
          e.preventDefault();
          if (el) el.scrollBy({ top: el.clientHeight * 0.9, behavior: "smooth" });
          break;
        }

        case "PageUp": {
          e.preventDefault();
          if (el) el.scrollBy({ top: -el.clientHeight * 0.9, behavior: "smooth" });
          break;
        }

        case "ArrowDown": {
          // Only when no modifier keys (avoid conflicting with browser nav)
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          if (el) el.scrollBy({ top: el.clientHeight * 0.25, behavior: "smooth" });
          break;
        }

        case "ArrowUp": {
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          if (el) el.scrollBy({ top: -el.clientHeight * 0.25, behavior: "smooth" });
          break;
        }

        case "ArrowRight": {
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          transposeUpRef.current?.();
          break;
        }

        case "ArrowLeft": {
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          transposeDownRef.current?.();
          break;
        }

        case "Escape": {
          escapeRef.current?.();
          break;
        }

        default:
          break;
      }
    },
    [scrollRef]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
