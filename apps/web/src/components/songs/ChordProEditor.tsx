import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ChevronDown, Music, Eye, Pencil } from "lucide-react";
import { CHORD_REGEX } from "@vpc-music/shared";

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
}

/**
 * Rich ChordPro editor with:
 * 1) Metadata → directive sync (pre-fill)
 * 2) Section insert dropdown
 * 3) Chord insertion via text selection popup
 */
export function ChordProEditor({ value, onChange, metadata }: ChordProEditorProps) {
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sectionDropdownOpen, chordPopup.open]);

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

  // ── 2) Section insert ─────────────────────────
  const insertSection = useCallback(
    (sectionDirective: string) => {
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
      const inserted = `${prefix}${sectionDirective}\n`;
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

  // Quick chord validation for the visual indicator
  const isValidChord = chordInput.trim()
    ? CHORD_REGEX.test(chordInput.trim()) || /^[A-G]/.test(chordInput.trim())
    : null;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[hsl(var(--foreground))]">
          Content (ChordPro format)
        </label>

        <div className="ml-auto flex items-center gap-2">
          {/* Section insert dropdown */}
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
                    onClick={() => insertSection(v)}
                    className="w-full px-3 py-1.5 text-left text-sm text-[hsl(var(--popover-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Select any word and type a chord to insert it • Use the dropdown to add section markers
      </p>

      {/* Editor wrapper */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          onMouseUp={handleMouseUp}
          rows={20}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
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
  );
}
