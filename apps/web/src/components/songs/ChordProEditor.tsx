import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ChevronDown, Music, Columns, Eye, Pencil, MapPin, Wand2 } from "lucide-react";
import { CHORD_REGEX, transposeChord } from "@vpc-music/shared";
import { SyntaxHighlightOverlay } from "./SyntaxHighlightOverlay";
import { ValidationPanel } from "./ValidationPanel";
import { EditorHelpSection } from "./EditorHelpSection";
import { CommandPalette, type CommandItem } from "./CommandPalette";
import { ChordProRenderer } from "./ChordProRenderer";
import { EditorContextMenu, detectContext, type ContextMenuPosition } from "./EditorContextMenu";
import { formatChordPro } from "../../utils/chordpro-format";

// ── Section choices for the insert dropdown ──────
const SECTION_INSERTS = [
  { label: "Verse 1", value: "{comment: Verse 1}" },
  { label: "Verse 2", value: "{comment: Verse 2}" },
  { label: "Verse 3", value: "{comment: Verse 3}" },
  { label: "Verse 4", value: "{comment: Verse 4}" },
  { label: "Chorus", value: "{comment: Chorus}" },
  { label: "Pre-Chorus", value: "{comment: Pre-Chorus}" },
  { label: "Bridge", value: "{comment: Bridge}" },
  { label: "Intro", value: "{comment: Intro}" },
  { label: "Outro", value: "{comment: Outro}" },
  { label: "Interlude", value: "{comment: Interlude}" },
  { label: "Instrumental", value: "{comment: Instrumental}" },
  { label: "Tag", value: "{comment: Tag}" },
  { label: "Ending", value: "{comment: Ending}" },
  { label: "Solo", value: "{comment: Solo}" },
  { label: "Turnaround", value: "{comment: Turnaround}" },
  { label: "Vamp", value: "{comment: Vamp}" },
  { label: "Coda", value: "{comment: Coda}" },
  // ── Expanded inserts ──
  { label: "Metadata Block", value: "{title: Song Title}\n{artist: Artist Name}\n{key: G}\n{tempo: 120}" },
  { label: "Song Skeleton", value: "{title: Song Title}\n{artist: Artist Name}\n{key: G}\n{tempo: 120}\n\n{comment: Verse 1}\n\n\n{comment: Chorus}\n\n\n{comment: Verse 2}\n\n\n{comment: Bridge}\n" },
];

interface ChordProEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Song metadata — used to sync directives at the top of content */
  metadata?: {
    title?: string;
    artist?: string;
    key?: string;
    tempo?: string;
  };
  /** Called when Ctrl+S is pressed inside the editor */
  onSave?: () => void;
}

type ViewMode = "edit" | "split" | "preview";

/**
 * Rich ChordPro editor with:
 * 1) Metadata → directive sync (pre-fill)
 * 2) Section insert dropdown (17 sections + metadata block + song skeleton)
 * 3) Chord insertion via text selection popup
 * 4) Syntax highlighting overlay
 * 5) Inline validation panel
 * 6) Keyboard shortcuts (Ctrl+S, Ctrl+/, Ctrl+K, Ctrl+Shift+V/C/B, Alt+Up/Down)
 * 7) Collapsible help section with tips, shortcuts, directives, and templates
 */
export function ChordProEditor({ value, onChange, metadata, onSave }: ChordProEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const sectionBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Chord popup state ──────────────────────────
  const [chordPopup, setChordPopup] = useState<{
    open: boolean;
    x: number;
    y: number;
    selStart: number;
    selEnd: number;
  }>({ open: false, x: 0, y: 0, selStart: 0, selEnd: 0 });
  const [chordInput, setChordInput] = useState("");
  const chordInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // ── Command palette state ──────────────────────
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  /** Track slash-command "/" position so we can remove the slash on insert */
  const slashPosRef = useRef<number | null>(null);

  // ── View mode state (edit / split / preview) ──
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const previewRef = useRef<HTMLDivElement>(null);

  // ── Line numbers & current line tracking ──────
  const [currentLine, setCurrentLine] = useState(0);
  const lineCount = value.split("\n").length;
  const gutterRef = useRef<HTMLDivElement>(null);

  // Sections detected from content for the section-nav dropdown
  const sections = useMemo(() => {
    const result: { name: string; line: number }[] = [];
    value.split("\n").forEach((line, i) => {
      const m = line.match(/^\{comment:\s*(.*?)\}\s*$/);
      if (m) result.push({ name: m[1], line: i });
    });
    return result;
  }, [value]);

  const [sectionNavOpen, setSectionNavOpen] = useState(false);
  const sectionNavBtnRef = useRef<HTMLButtonElement>(null);
  const sectionNavDropdownRef = useRef<HTMLDivElement>(null);

  // ── Context menu state ────────────────────────
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    position: ContextMenuPosition;
    groups: { label: string; actions: { label: string; action: () => void; shortcut?: string }[] }[];
  }>({ open: false, position: { x: 0, y: 0 }, groups: [] });

  // ── Format on save toggle ─────────────────────
  const [formatOnSave, setFormatOnSave] = useState(() => {
    try {
      return localStorage.getItem("chordpro-format-on-save") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem("chordpro-format-on-save", String(formatOnSave)); }
    catch { /* ignore */ }
  }, [formatOnSave]);

  const handleFormat = useCallback(() => {
    const formatted = formatChordPro(value);
    if (formatted !== value) {
      onChange(formatted);
    }
  }, [value, onChange]);

  // Update current line on cursor movement
  const updateCurrentLine = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const linesBefore = value.slice(0, pos).split("\n");
    setCurrentLine(linesBefore.length - 1);
  }, [value]);

  // Sync gutter scroll with textarea
  const syncGutterScroll = useCallback(() => {
    const ta = textareaRef.current;
    const gutter = gutterRef.current;
    if (ta && gutter) {
      gutter.scrollTop = ta.scrollTop;
    }
  }, []);

  // ── Close dropdowns when clicking outside ──────
  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (
        sectionDropdownOpen &&
        dropdownRef.current &&
        sectionBtnRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !sectionBtnRef.current.contains(e.target as Node)
      ) {
        setSectionDropdownOpen(false);
      }
      if (
        chordPopup.open &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setChordPopup((p) => ({ ...p, open: false }));
      }
      if (
        sectionNavOpen &&
        sectionNavDropdownRef.current &&
        sectionNavBtnRef.current &&
        !sectionNavDropdownRef.current.contains(e.target as Node) &&
        !sectionNavBtnRef.current.contains(e.target as Node)
      ) {
        setSectionNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sectionDropdownOpen, chordPopup.open, sectionNavOpen]);

  // ── 1) Metadata → directive sync ──────────────
  // When metadata fields change, update/insert matching directives at
  // the top of the content so the user doesn't have to type them twice.
  const prevMetaRef = useRef(metadata);
  useEffect(() => {
    if (!metadata) return;
    const prev = prevMetaRef.current ?? {};
    prevMetaRef.current = metadata;

    // Only act when a metadata field actually changed
    const titleChanged = metadata.title !== prev.title;
    const artistChanged = metadata.artist !== prev.artist;
    const keyChanged = metadata.key !== prev.key;
    const tempoChanged = metadata.tempo !== prev.tempo;
    if (!titleChanged && !artistChanged && !keyChanged && !tempoChanged) return;

    let updated = value;

    const syncDirective = (tag: string, val: string | undefined) => {
      const re = new RegExp(`^\\{${tag}:\\s*.*\\}\\s*$`, "m");
      if (val?.trim()) {
        const directive = `{${tag}: ${val.trim()}}`;
        if (re.test(updated)) {
          updated = updated.replace(re, directive);
        } else {
          // Insert at top — after any existing directives block
          const lines = updated.split("\n");
          // Find last directive line at the top
          let insertIdx = 0;
          for (let i = 0; i < lines.length; i++) {
            if (/^\{[a-z_]+:/.test(lines[i].trim())) {
              insertIdx = i + 1;
            } else {
              break;
            }
          }
          lines.splice(insertIdx, 0, directive);
          updated = lines.join("\n");
        }
      }
    };

    if (titleChanged) syncDirective("title", metadata.title);
    if (artistChanged) syncDirective("artist", metadata.artist);
    if (keyChanged) syncDirective("key", metadata.key);
    if (tempoChanged) syncDirective("tempo", metadata.tempo);

    if (updated !== value) {
      onChange(updated);
    }
    // We intentionally only depend on metadata — value changes are driven
    // by the parent's onChange and we read `value` inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata?.title, metadata?.artist, metadata?.key, metadata?.tempo, onChange]);

  // ── 2) Insert text at cursor ──────────────────
  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const before = value.slice(0, start);
      const after = value.slice(start);

      // Ensure blank line before section header for readability
      const prefix = before.length > 0 && !before.endsWith("\n\n") && !before.endsWith("\n")
        ? "\n\n"
        : before.length > 0 && before.endsWith("\n") && !before.endsWith("\n\n")
          ? "\n"
          : "";
      const inserted = `${prefix}${text}\n`;
      const newValue = before + inserted + after;
      onChange(newValue);
      setSectionDropdownOpen(false);

      // Restore cursor after insert
      requestAnimationFrame(() => {
        const pos = start + inserted.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    },
    [value, onChange],
  );

  // ── Command palette select handler ────────────
  const handleCommandSelect = useCallback(
    (item: CommandItem) => {
      const ta = textareaRef.current;
      if (!ta) return;

      // If triggered via slash command, remove the "/" (and any typed filter text)
      if (slashPosRef.current !== null) {
        const slashStart = slashPosRef.current;
        const cursorPos = ta.selectionStart;
        // Remove everything from the slash to current cursor
        const before = value.slice(0, slashStart);
        const after = value.slice(cursorPos);
        const newValue = before + after;
        onChange(newValue);
        // Set cursor to slash position and insert
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(slashStart, slashStart);
          requestAnimationFrame(() => {
            insertAtCursor(item.value);
          });
        });
        slashPosRef.current = null;
      } else {
        insertAtCursor(item.value);
      }
    },
    [value, onChange, insertAtCursor],
  );

  const handleCommandPaletteClose = useCallback(() => {
    setCommandPaletteOpen(false);
    setCommandPaletteQuery("");
    slashPosRef.current = null;
    textareaRef.current?.focus();
  }, []);

  // ── Jump to a specific line (for section nav) ──
  const jumpToLine = useCallback(
    (lineIndex: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const lines = value.split("\n");
      let charPos = 0;
      for (let i = 0; i < lineIndex && i < lines.length; i++) {
        charPos += lines[i].length + 1; // +1 for \n
      }
      ta.focus();
      ta.setSelectionRange(charPos, charPos);
      // Scroll to the line
      const lineHeight = 20;
      ta.scrollTop = Math.max(0, lineIndex * lineHeight - ta.clientHeight / 3);
      setCurrentLine(lineIndex);
      setSectionNavOpen(false);
    },
    [value],
  );

  // ── Context menu handler ──────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;

      const cursorPos = ta.selectionStart;
      const ctx = detectContext(value, cursorPos);
      const lines = value.split("\n");

      // Helper: get char offset of line start
      const lineOffset = (li: number) => {
        let off = 0;
        for (let i = 0; i < li && i < lines.length; i++) off += lines[i].length + 1;
        return off;
      };

      const groups: typeof contextMenu.groups = [];

      // ── Chord context actions ──
      if (ctx.type === "chord" && ctx.chord != null && ctx.chordStart != null && ctx.chordEnd != null) {
        const { chord, chordStart, chordEnd } = ctx;
        groups.push({
          label: "Chord",
          actions: [
            {
              label: "Transpose Up",
              shortcut: "Alt+↑",
              action: () => {
                const transposed = value.slice(chordStart, chordEnd).replace(
                  /\[([^\]]+)\]/g, (_m: string, c: string) => `[${transposeChord(c, 1)}]`
                );
                onChange(value.slice(0, chordStart) + transposed + value.slice(chordEnd));
              },
            },
            {
              label: "Transpose Down",
              shortcut: "Alt+↓",
              action: () => {
                const transposed = value.slice(chordStart, chordEnd).replace(
                  /\[([^\]]+)\]/g, (_m: string, c: string) => `[${transposeChord(c, -1)}]`
                );
                onChange(value.slice(0, chordStart) + transposed + value.slice(chordEnd));
              },
            },
            {
              label: "Remove Chord",
              action: () => {
                // Remove the [chord] brackets — keep any text after
                onChange(value.slice(0, chordStart) + value.slice(chordEnd));
              },
            },
          ],
        });
      }

      // ── Section header context actions ──
      if (ctx.type === "section") {
        const li = ctx.lineIndex;
        groups.push({
          label: "Section",
          actions: [
            {
              label: "Duplicate Section",
              action: () => {
                // Find the section block: from this line to the next section header (or end)
                let endLine = li + 1;
                while (endLine < lines.length) {
                  if (/^\{comment:\s*.*\}\s*$/.test(lines[endLine].trim()) && endLine > li + 1) break;
                  endLine++;
                }
                const sectionBlock = lines.slice(li, endLine).join("\n");
                const insertPos = lineOffset(endLine);
                onChange(value.slice(0, insertPos) + sectionBlock + "\n" + value.slice(insertPos));
              },
            },
            {
              label: "Move Section Up",
              action: () => {
                if (li === 0) return;
                // Find previous section start
                let prevStart = li - 1;
                while (prevStart > 0 && !/^\{comment:\s*.*\}\s*$/.test(lines[prevStart].trim())) {
                  prevStart--;
                }
                const newLines = [...lines];
                // Find current section block end
                let endLine = li + 1;
                while (endLine < lines.length && !/^\{comment:\s*.*\}\s*$/.test(lines[endLine].trim())) {
                  endLine++;
                }
                const block = newLines.splice(li, endLine - li);
                newLines.splice(prevStart, 0, ...block);
                onChange(newLines.join("\n"));
              },
            },
            {
              label: "Move Section Down",
              action: () => {
                // Find current section block end
                let endLine = li + 1;
                while (endLine < lines.length && !/^\{comment:\s*.*\}\s*$/.test(lines[endLine].trim())) {
                  endLine++;
                }
                if (endLine >= lines.length) return;
                // Find next section block end
                let nextEnd = endLine + 1;
                while (nextEnd < lines.length && !/^\{comment:\s*.*\}\s*$/.test(lines[nextEnd].trim())) {
                  nextEnd++;
                }
                const newLines = [...lines];
                const block = newLines.splice(li, endLine - li);
                const insertAt = Math.min(nextEnd - block.length, newLines.length);
                newLines.splice(insertAt < 0 ? 0 : insertAt, 0, ...block);
                onChange(newLines.join("\n"));
              },
            },
          ],
        });
      }

      // ── Lyrics context actions ──
      if (ctx.type === "lyrics") {
        groups.push({
          label: "Lyrics",
          actions: [
            {
              label: "Insert Chord",
              shortcut: "Ctrl+K",
              action: () => {
                const newValue = value.slice(0, cursorPos) + "[]" + value.slice(cursorPos);
                onChange(newValue);
                requestAnimationFrame(() => {
                  ta.focus();
                  ta.setSelectionRange(cursorPos + 1, cursorPos + 1);
                });
              },
            },
            {
              label: "Convert to Comment",
              shortcut: "Ctrl+/",
              action: () => {
                const li = ctx.lineIndex;
                const trimmed = lines[li].trim();
                if (!/^\{comment:/.test(trimmed)) {
                  const newLines = [...lines];
                  newLines[li] = `{comment: ${trimmed}}`;
                  onChange(newLines.join("\n"));
                }
              },
            },
          ],
        });
      }

      // ── General line actions (always shown) ──
      groups.push({
        label: "Line",
        actions: [
          {
            label: "Insert Line Above",
            action: () => {
              const pos = lineOffset(ctx.lineIndex);
              onChange(value.slice(0, pos) + "\n" + value.slice(pos));
              requestAnimationFrame(() => {
                ta.focus();
                ta.setSelectionRange(pos, pos);
              });
            },
          },
          {
            label: "Insert Line Below",
            action: () => {
              const pos = lineOffset(ctx.lineIndex) + lines[ctx.lineIndex].length;
              onChange(value.slice(0, pos) + "\n" + value.slice(pos));
              requestAnimationFrame(() => {
                const newPos = pos + 1;
                ta.focus();
                ta.setSelectionRange(newPos, newPos);
              });
            },
          },
          {
            label: "Duplicate Line",
            action: () => {
              const pos = lineOffset(ctx.lineIndex) + lines[ctx.lineIndex].length;
              onChange(value.slice(0, pos) + "\n" + lines[ctx.lineIndex] + value.slice(pos));
            },
          },
          {
            label: "Delete Line",
            action: () => {
              const newLines = [...lines];
              newLines.splice(ctx.lineIndex, 1);
              onChange(newLines.join("\n"));
            },
          },
        ],
      });

      setContextMenu({
        open: true,
        position: { x: e.clientX, y: e.clientY },
        groups,
      });
    },
    [value, onChange, contextMenu.groups],
  );

  // ── 3) Chord popup on text selection ──────────
  const handleMouseUp = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) return; // no selection

    // Get position for the popup — approximate from textarea position
    const rect = ta.getBoundingClientRect();
    // Use a rough approximation: character position → pixel offset
    const linesBefore = value.slice(0, selectionStart).split("\n");
    const lineHeight = 20; // approximation for font-mono text-sm
    const charWidth = 8;
    const row = linesBefore.length - 1;
    const col = linesBefore[linesBefore.length - 1].length;

    const x = Math.min(rect.width - 180, Math.max(0, col * charWidth));
    const y = Math.min(rect.height - 40, Math.max(0, (row + 1) * lineHeight - ta.scrollTop));

    setChordPopup({
      open: true,
      x,
      y,
      selStart: selectionStart,
      selEnd: selectionEnd,
    });
    setChordInput("");
    requestAnimationFrame(() => chordInputRef.current?.focus());
  }, [value]);

  const applyChord = useCallback(() => {
    const chord = chordInput.trim();
    if (!chord) {
      setChordPopup((p) => ({ ...p, open: false }));
      return;
    }
    const { selStart, selEnd } = chordPopup;
    const selectedText = value.slice(selStart, selEnd);
    const newValue =
      value.slice(0, selStart) + `[${chord}]${selectedText}` + value.slice(selEnd);
    onChange(newValue);
    setChordPopup((p) => ({ ...p, open: false }));

    // Restore cursor after the inserted chord+text
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = selStart + chord.length + 2 + selectedText.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }, [chordInput, chordPopup, value, onChange]);

  const handleChordKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyChord();
      } else if (e.key === "Escape") {
        setChordPopup((p) => ({ ...p, open: false }));
        textareaRef.current?.focus();
      }
    },
    [applyChord],
  );

  // ── 4) Keyboard shortcuts on the textarea ─────
  const handleEditorKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = textareaRef.current;
      if (!ta) return;

      // Ctrl+S — save (with optional format-on-save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (formatOnSave) {
          const formatted = formatChordPro(value);
          if (formatted !== value) onChange(formatted);
        }
        onSave?.();
        return;
      }

      // Ctrl+Space — open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === " ") {
        e.preventDefault();
        slashPosRef.current = null;
        setCommandPaletteQuery("");
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl+/ — toggle comment on selected line(s)
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        const { selectionStart, selectionEnd } = ta;
        const lines = value.split("\n");
        // Find line range
        let charIdx = 0;
        let startLine = 0;
        let endLine = 0;
        for (let i = 0; i < lines.length; i++) {
          const lineEnd = charIdx + lines[i].length;
          if (charIdx <= selectionStart && selectionStart <= lineEnd + 1) startLine = i;
          if (charIdx <= selectionEnd && selectionEnd <= lineEnd + 1) endLine = i;
          charIdx = lineEnd + 1; // +1 for \n
        }
        // Toggle: if all selected lines are {comment: ...}, unwrap; else wrap
        const allComments = lines.slice(startLine, endLine + 1).every((l) =>
          /^\{comment:\s*.*\}$/.test(l.trim()),
        );
        const newLines = [...lines];
        for (let i = startLine; i <= endLine; i++) {
          const trimmed = newLines[i].trim();
          if (allComments) {
            // Unwrap {comment: ...}
            const m = trimmed.match(/^\{comment:\s*(.*)\}$/);
            newLines[i] = m ? m[1] : trimmed;
          } else if (trimmed && !/^\{comment:/.test(trimmed)) {
            newLines[i] = `{comment: ${trimmed}}`;
          }
        }
        onChange(newLines.join("\n"));
        return;
      }

      // Ctrl+K — insert chord at cursor / on selection
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const { selectionStart, selectionEnd } = ta;
        if (selectionStart !== selectionEnd) {
          // Trigger chord popup at selection
          handleMouseUp();
        } else {
          // Insert empty chord brackets at cursor
          const newValue = value.slice(0, selectionStart) + "[]" + value.slice(selectionStart);
          onChange(newValue);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
          });
        }
        return;
      }

      // Ctrl+Shift+V — insert Verse header
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        insertAtCursor("{comment: Verse}");
        return;
      }

      // Ctrl+Shift+C — insert Chorus header
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        insertAtCursor("{comment: Chorus}");
        return;
      }

      // Ctrl+Shift+B — insert Bridge header
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "B") {
        e.preventDefault();
        insertAtCursor("{comment: Bridge}");
        return;
      }

      // Alt+Up / Alt+Down — transpose selected chord(s) up/down one semitone
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const steps = e.key === "ArrowUp" ? 1 : -1;
        const { selectionStart, selectionEnd } = ta;
        // Get the selected text (or current line if no selection)
        let rangeStart = selectionStart;
        let rangeEnd = selectionEnd;
        if (rangeStart === rangeEnd) {
          // Select the whole current line
          const lineStart = value.lastIndexOf("\n", rangeStart - 1) + 1;
          const lineEnd = value.indexOf("\n", rangeStart);
          rangeStart = lineStart;
          rangeEnd = lineEnd === -1 ? value.length : lineEnd;
        }
        const selectedText = value.slice(rangeStart, rangeEnd);
        const transposed = selectedText.replace(/\[([^\]]+)\]/g, (_m: string, chord: string) => {
          return `[${transposeChord(chord, steps)}]`;
        });
        if (transposed !== selectedText) {
          const newValue = value.slice(0, rangeStart) + transposed + value.slice(rangeEnd);
          onChange(newValue);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(rangeStart, rangeStart + transposed.length);
          });
        }
        return;
      }
    },
    [value, onChange, onSave, insertAtCursor, handleMouseUp],
  );

  // ── Sync overlay scroll with textarea (and optionally preview) ──
  const overlayRef = useRef<HTMLPreElement | null>(null);
  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const overlay = overlayRef.current;
    if (ta && overlay) {
      overlay.scrollTop = ta.scrollTop;
      overlay.scrollLeft = ta.scrollLeft;
    }
    syncGutterScroll();
    // Optionally sync preview in split mode
    if (viewMode === "split" && ta && previewRef.current) {
      const scrollRatio = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1);
      const previewEl = previewRef.current;
      previewEl.scrollTop = scrollRatio * (previewEl.scrollHeight - previewEl.clientHeight);
    }
  }, [viewMode, syncGutterScroll]);

  // Quick chord validation for the visual indicator
  const isValidChord = chordInput.trim()
    ? CHORD_REGEX.test(chordInput.trim()) || /^[A-G]/.test(chordInput.trim())
    : null;

  // ── Slash-command detection on change ─────────
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Detect "/" typed at line start → open command palette
      const cursor = e.target.selectionStart;
      if (cursor > 0 && newValue[cursor - 1] === "/") {
        const lineStart = newValue.lastIndexOf("\n", cursor - 2) + 1;
        const textBefore = newValue.slice(lineStart, cursor - 1).trim();
        if (textBefore === "") {
          slashPosRef.current = cursor - 1; // position of the "/"
          setCommandPaletteQuery("");
          setCommandPaletteOpen(true);
        }
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[hsl(var(--foreground))]">
          Content (ChordPro format)
        </label>

        <div className="ml-auto flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-[hsl(var(--border))]" data-testid="view-mode-toggle">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors rounded-l-md ${
                viewMode === "edit"
                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
              title="Editor only"
              data-testid="view-mode-edit"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`inline-flex items-center gap-1 border-x border-[hsl(var(--border))] px-2 py-1 text-xs font-medium transition-colors ${
                viewMode === "split"
                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
              title="Split view"
              data-testid="view-mode-split"
            >
              <Columns className="h-3 w-3" />
              Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors rounded-r-md ${
                viewMode === "preview"
                  ? "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
              title="Preview only"
              data-testid="view-mode-preview"
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>

          {/* Section insert dropdown (hidden in preview-only mode) */}
          {viewMode !== "preview" && (
            <>
              {/* Format button */}
              <button
                type="button"
                onClick={handleFormat}
                className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                title="Format document (normalize directives, spacing, etc.)"
                data-testid="format-btn"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Format
              </button>

              {/* Format on save toggle */}
              <label
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"
                title="Auto-format when saving"
                data-testid="format-on-save-label"
              >
                <input
                  type="checkbox"
                  checked={formatOnSave}
                  onChange={(e) => setFormatOnSave(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[hsl(var(--secondary))]"
                  data-testid="format-on-save-checkbox"
                />
                Auto
              </label>

              {/* Section navigation dropdown */}
              {sections.length > 0 && (
                <div className="relative">
                  <button
                    ref={sectionNavBtnRef}
                    type="button"
                    onClick={() => setSectionNavOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    data-testid="section-nav-btn"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Go to Section
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {sectionNavOpen && (
                    <div
                      ref={sectionNavDropdownRef}
                      className="absolute right-0 z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] py-1 shadow-lg"
                      data-testid="section-nav-dropdown"
                    >
                      {sections.map((sec) => (
                        <button
                          key={`${sec.name}-${sec.line}`}
                          type="button"
                          onClick={() => jumpToLine(sec.line)}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-[hsl(var(--popover-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors"
                        >
                          <span>{sec.name}</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            Ln {sec.line + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
              <button
                ref={sectionBtnRef}
                type="button"
                onClick={() => setSectionDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                data-testid="section-insert-btn"
              >
                <Music className="h-3.5 w-3.5" />
                Insert Section
                <ChevronDown className="h-3 w-3" />
              </button>
              {sectionDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--popover))] py-1 shadow-lg"
                  data-testid="section-dropdown"
                >
                  {SECTION_INSERTS.map(({ label, value: v }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => insertAtCursor(v)}
                      className="w-full px-3 py-1.5 text-left text-sm text-[hsl(var(--popover-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Hint (hidden in preview-only mode) */}
      {viewMode !== "preview" && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Select any word and type a chord to insert it • Use the dropdown to add section markers • <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 py-0.5 text-[10px] font-mono">Ctrl+Space</kbd> command palette • <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 py-0.5 text-[10px] font-mono">/</kbd> slash commands • <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1 py-0.5 text-[10px] font-mono">Ctrl+S</kbd> to save
        </p>
      )}

      {/* Editor / Preview content area */}
      <div className={viewMode === "split" ? "grid grid-cols-2 gap-4" : ""}>
        {/* ── Editor pane (hidden in preview-only mode) ── */}
        {viewMode !== "preview" && (
          <div>
            <div className="relative flex">
              {/* Line number gutter */}
              <div
                ref={gutterRef}
                className="pointer-events-none select-none overflow-hidden border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))] py-2 pr-2 text-right font-mono text-xs leading-[20px] text-[hsl(var(--muted-foreground))] rounded-l-md"
                style={{ minWidth: `${Math.max(2, String(lineCount).length) * 0.75 + 0.75}rem` }}
                aria-hidden="true"
                data-testid="line-number-gutter"
              >
                {Array.from({ length: lineCount }, (_, i) => (
                  <div
                    key={i}
                    className={`px-1 ${i === currentLine ? "text-[hsl(var(--foreground))] font-medium" : ""}`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Editor area (overlay + textarea) */}
              <div className="relative flex-1">
                {/* Current line highlight */}
                <div
                  className="pointer-events-none absolute left-0 right-0 z-[5] bg-[hsl(var(--accent))]/10"
                  style={{
                    top: `${currentLine * 20 + 8 - (textareaRef.current?.scrollTop ?? 0)}px`,
                    height: "20px",
                  }}
                  data-testid="current-line-highlight"
                />

                {/* Syntax highlight overlay */}
                <SyntaxHighlightOverlay value={value} ref={overlayRef} />

                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  onMouseUp={(e) => { handleMouseUp(); updateCurrentLine(); }}
                  onKeyDown={handleEditorKeyDown}
                  onKeyUp={updateCurrentLine}
                  onClick={updateCurrentLine}
                  onContextMenu={handleContextMenu}
                  onScroll={handleScroll}
                  rows={20}
                  spellCheck={false}
                  className="relative z-10 w-full rounded-r-md border border-l-0 border-[hsl(var(--input))] bg-transparent px-3 py-2 font-mono text-sm text-transparent caret-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] leading-[20px]"
                  placeholder={`{title: Amazing Grace}
{key: G}

{comment: Verse 1}
[G]Amazing [G/B]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me`}
                  data-testid="chordpro-editor"
                />

              {/* ── Chord popup ────────────────────────── */}
              {chordPopup.open && (
                <div
                  ref={popupRef}
                  className="absolute z-50 flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-2 shadow-xl"
                  style={{ left: chordPopup.x, top: chordPopup.y }}
                  data-testid="chord-popup"
                >
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">Chord:</span>
                  <input
                    ref={chordInputRef}
                    type="text"
                    value={chordInput}
                    onChange={(e) => setChordInput(e.target.value)}
                    onKeyDown={handleChordKeyDown}
                    placeholder="e.g. Am7, C/G"
                    className={`w-28 rounded border px-2 py-1 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1 ${
                      isValidChord === null
                        ? "border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                        : isValidChord
                          ? "border-green-500 bg-green-500/10"
                          : "border-amber-500 bg-amber-500/10"
                    }`}
                    data-testid="chord-input"
                  />
                  <button
                    type="button"
                    onClick={applyChord}
                    disabled={!chordInput.trim()}
                    className="rounded-md bg-[hsl(var(--secondary))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--secondary-foreground))] hover:opacity-90 disabled:opacity-40 transition-opacity"
                    data-testid="chord-apply-btn"
                  >
                    Apply
                  </button>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    Enter ↵
                  </span>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* ── Preview pane (visible in split and preview modes) ── */}
        {viewMode !== "edit" && (
          <div
            ref={previewRef}
            className={`overflow-y-auto rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 ${
              viewMode === "split" ? "max-h-[calc(20*20px+1rem)]" : ""
            }`}
            style={viewMode === "split" ? { maxHeight: "calc(20 * 20px + 1rem)" } : undefined}
            data-testid="split-preview-pane"
          >
            {value.trim() ? (
              <ChordProRenderer
                content={value}
                songKey={metadata?.key}
                showChords
                fontSize={14}
              />
            ) : (
              <p className="text-sm italic text-[hsl(var(--muted-foreground))]">
                Start typing in the editor to see a live preview…
              </p>
            )}
          </div>
        )}
      </div>

      {/* Validation panel */}
      <ValidationPanel source={value} />

      {/* Collapsible help section */}
      <EditorHelpSection onInsertTemplate={insertAtCursor} />

      {/* Context menu */}
      <EditorContextMenu
        open={contextMenu.open}
        position={contextMenu.position}
        groups={contextMenu.groups}
        onClose={() => setContextMenu((m) => ({ ...m, open: false }))}
      />

      {/* Command palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={handleCommandPaletteClose}
        onSelect={handleCommandSelect}
        initialQuery={commandPaletteQuery}
      />
    </div>
  );
}
