import { useState, useCallback, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export type ContextType = "chord" | "section" | "lyrics" | "line";

export interface ContextMenuAction {
  label: string;
  action: () => void;
  /** Optional keyboard shortcut hint */
  shortcut?: string;
}

interface ContextMenuGroup {
  label: string;
  actions: ContextMenuAction[];
}

interface EditorContextMenuProps {
  open: boolean;
  position: ContextMenuPosition;
  groups: ContextMenuGroup[];
  onClose: () => void;
}

// ── Context menu component ───────────────────────────────────────

export function EditorContextMenu({ open, position, groups, onClose }: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || groups.every((g) => g.actions.length === 0)) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] py-1 shadow-xl"
      style={{ left: position.x, top: position.y }}
      data-testid="editor-context-menu"
    >
      {groups.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && (
            <div className="my-1 border-t border-[hsl(var(--border))]" />
          )}
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {group.label}
          </div>
          {group.actions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.action();
                onClose();
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-[hsl(var(--popover-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors"
              data-testid={`context-action-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <kbd className="ml-4 text-[10px] text-[hsl(var(--muted-foreground))]">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Context detection utility ────────────────────────────────────

/**
 * Detect what context the cursor is in at the given position.
 * Returns the context type, the full line text, and any selected chord.
 */
export function detectContext(
  value: string,
  cursorPos: number,
): { type: ContextType; lineIndex: number; lineText: string; chord?: string; chordStart?: number; chordEnd?: number } {
  const lines = value.split("\n");
  let charIdx = 0;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineEnd = charIdx + lines[i].length;
    if (cursorPos <= lineEnd + 1) {
      lineIndex = i;
      break;
    }
    charIdx = lineEnd + 1;
  }

  const lineText = lines[lineIndex] ?? "";
  const posInLine = cursorPos - charIdx;

  // Check if cursor is on a chord: find [chord] brackets around cursor
  const chordRegex = /\[([^\]]+)\]/g;
  let chordMatch;
  while ((chordMatch = chordRegex.exec(lineText)) !== null) {
    const start = chordMatch.index;
    const end = start + chordMatch[0].length;
    if (posInLine >= start && posInLine <= end) {
      return {
        type: "chord",
        lineIndex,
        lineText,
        chord: chordMatch[1],
        chordStart: charIdx + start,
        chordEnd: charIdx + end,
      };
    }
  }

  // Check if line is a section header: {comment: ...}
  if (/^\{comment:\s*.*\}\s*$/.test(lineText.trim())) {
    return { type: "section", lineIndex, lineText };
  }

  // Check if there's lyrics text (non-empty, non-directive)
  if (lineText.trim() && !/^\{[a-z_]+:/.test(lineText.trim()) && !/^\{[a-z_]+\}/.test(lineText.trim())) {
    return { type: "lyrics", lineIndex, lineText };
  }

  return { type: "line", lineIndex, lineText };
}
