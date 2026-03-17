import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent } from "react";
import { Search } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

export interface CommandItem {
  id: string;
  label: string;
  category: "Section" | "Directive" | "Template";
  description?: string;
  value: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: CommandItem) => void;
  /** Initial filter query (e.g. text after "/" on slash trigger) */
  initialQuery?: string;
}

// ── Command registry ─────────────────────────────────────────────

const SECTION_COMMANDS: CommandItem[] = [
  { id: "sec-verse-1", label: "Verse 1", category: "Section", value: "{comment: Verse 1}", description: "Insert Verse 1 header" },
  { id: "sec-verse-2", label: "Verse 2", category: "Section", value: "{comment: Verse 2}", description: "Insert Verse 2 header" },
  { id: "sec-verse-3", label: "Verse 3", category: "Section", value: "{comment: Verse 3}", description: "Insert Verse 3 header" },
  { id: "sec-verse-4", label: "Verse 4", category: "Section", value: "{comment: Verse 4}", description: "Insert Verse 4 header" },
  { id: "sec-chorus", label: "Chorus", category: "Section", value: "{comment: Chorus}", description: "Insert Chorus header" },
  { id: "sec-pre-chorus", label: "Pre-Chorus", category: "Section", value: "{comment: Pre-Chorus}", description: "Insert Pre-Chorus header" },
  { id: "sec-bridge", label: "Bridge", category: "Section", value: "{comment: Bridge}", description: "Insert Bridge header" },
  { id: "sec-intro", label: "Intro", category: "Section", value: "{comment: Intro}", description: "Insert Intro header" },
  { id: "sec-outro", label: "Outro", category: "Section", value: "{comment: Outro}", description: "Insert Outro header" },
  { id: "sec-interlude", label: "Interlude", category: "Section", value: "{comment: Interlude}", description: "Insert Interlude header" },
  { id: "sec-instrumental", label: "Instrumental", category: "Section", value: "{comment: Instrumental}", description: "Insert Instrumental header" },
  { id: "sec-tag", label: "Tag", category: "Section", value: "{comment: Tag}", description: "Insert Tag header" },
  { id: "sec-ending", label: "Ending", category: "Section", value: "{comment: Ending}", description: "Insert Ending header" },
  { id: "sec-solo", label: "Solo", category: "Section", value: "{comment: Solo}", description: "Insert Solo header" },
  { id: "sec-turnaround", label: "Turnaround", category: "Section", value: "{comment: Turnaround}", description: "Insert Turnaround header" },
  { id: "sec-vamp", label: "Vamp", category: "Section", value: "{comment: Vamp}", description: "Insert Vamp header" },
  { id: "sec-coda", label: "Coda", category: "Section", value: "{comment: Coda}", description: "Insert Coda header" },
];

const DIRECTIVE_COMMANDS: CommandItem[] = [
  { id: "dir-title", label: "Title", category: "Directive", value: "{title: }", description: "Song title directive" },
  { id: "dir-artist", label: "Artist", category: "Directive", value: "{artist: }", description: "Song artist directive" },
  { id: "dir-key", label: "Key", category: "Directive", value: "{key: }", description: "Song key directive" },
  { id: "dir-tempo", label: "Tempo", category: "Directive", value: "{tempo: }", description: "BPM tempo directive" },
  { id: "dir-capo", label: "Capo", category: "Directive", value: "{capo: }", description: "Capo position directive" },
  { id: "dir-time", label: "Time Signature", category: "Directive", value: "{time: 4/4}", description: "Time signature directive" },
  { id: "dir-comment", label: "Comment", category: "Directive", value: "{comment: }", description: "Section header / comment" },
  { id: "dir-soc", label: "Start of Chorus", category: "Directive", value: "{start_of_chorus}", description: "Begin chorus block" },
  { id: "dir-eoc", label: "End of Chorus", category: "Directive", value: "{end_of_chorus}", description: "End chorus block" },
  { id: "dir-sov", label: "Start of Verse", category: "Directive", value: "{start_of_verse}", description: "Begin verse block" },
  { id: "dir-eov", label: "End of Verse", category: "Directive", value: "{end_of_verse}", description: "End verse block" },
  { id: "dir-sob", label: "Start of Bridge", category: "Directive", value: "{start_of_bridge}", description: "Begin bridge block" },
  { id: "dir-eob", label: "End of Bridge", category: "Directive", value: "{end_of_bridge}", description: "End bridge block" },
];

const TEMPLATE_COMMANDS: CommandItem[] = [
  {
    id: "tpl-metadata",
    label: "Metadata Block",
    category: "Template",
    value: "{title: Song Title}\n{artist: Artist Name}\n{key: G}\n{tempo: 120}",
    description: "Title, artist, key, and tempo",
  },
  {
    id: "tpl-skeleton",
    label: "Song Skeleton",
    category: "Template",
    value: "{title: Song Title}\n{artist: Artist Name}\n{key: G}\n{tempo: 120}\n\n{comment: Verse 1}\n\n\n{comment: Chorus}\n\n\n{comment: Verse 2}\n\n\n{comment: Bridge}\n",
    description: "Full song structure template",
  },
  {
    id: "tpl-verse",
    label: "Verse Template",
    category: "Template",
    value: "{comment: Verse 1}\n\n",
    description: "Insert a verse section",
  },
  {
    id: "tpl-chorus",
    label: "Chorus Template",
    category: "Template",
    value: "{comment: Chorus}\n\n",
    description: "Insert a chorus section",
  },
  {
    id: "tpl-bridge",
    label: "Bridge Template",
    category: "Template",
    value: "{comment: Bridge}\n\n",
    description: "Insert a bridge section",
  },
];

export const ALL_COMMANDS: CommandItem[] = [
  ...SECTION_COMMANDS,
  ...DIRECTIVE_COMMANDS,
  ...TEMPLATE_COMMANDS,
];

// ── Recent commands (localStorage) ───────────────────────────────

const RECENT_KEY = "chordpro-recent-commands";
const MAX_RECENT = 5;

export function getRecentCommandIds(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentCommandId(id: string) {
  try {
    const recent = getRecentCommandIds().filter((r) => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

// ── Component ────────────────────────────────────────────────────

export function CommandPalette({ open, onClose, onSelect, initialQuery = "" }: CommandPaletteProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialQuery]);

  // Build filtered list with recents at top
  const filteredItems = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();

    const matched = lowerQuery
      ? ALL_COMMANDS.filter(
          (cmd) =>
            cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.category.toLowerCase().includes(lowerQuery) ||
            (cmd.description?.toLowerCase().includes(lowerQuery) ?? false),
        )
      : ALL_COMMANDS;

    // Partition into recent and non-recent
    const recentIds = getRecentCommandIds();
    const recent: CommandItem[] = [];
    const rest: CommandItem[] = [];
    for (const item of matched) {
      if (recentIds.includes(item.id)) {
        recent.push(item);
      } else {
        rest.push(item);
      }
    }
    // Sort recent by their order in localStorage
    recent.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    return { recent, rest };
  }, [query]);

  const allFiltered = useMemo(
    () => [...filteredItems.recent, ...filteredItems.rest],
    [filteredItems],
  );

  // Clamp selectedIndex
  useEffect(() => {
    if (selectedIndex >= allFiltered.length) {
      setSelectedIndex(Math.max(0, allFiltered.length - 1));
    }
  }, [allFiltered.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const selected = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView?.({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      addRecentCommandId(item.id);
      onSelect(item);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allFiltered[selectedIndex]) {
          handleSelect(allFiltered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [allFiltered, selectedIndex, handleSelect, onClose],
  );

  if (!open) return null;

  // Category badge colors
  const badgeClass = (cat: string) => {
    switch (cat) {
      case "Section":
        return "bg-amber-500/20 text-amber-300";
      case "Directive":
        return "bg-sky-500/20 text-sky-300";
      case "Template":
        return "bg-emerald-500/20 text-emerald-300";
      default:
        return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
    }
  };

  let flatIndex = 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="command-palette-backdrop"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--popover))] shadow-2xl"
        data-testid="command-palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
          <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands… (sections, directives, templates)"
            className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none"
            data-testid="command-palette-input"
          />
          <kbd className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-64 overflow-y-auto py-1" data-testid="command-palette-results">
          {allFiltered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No matching commands
            </div>
          ) : (
            <>
              {/* Recent section */}
              {filteredItems.recent.length > 0 && (
                <>
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Recent
                  </div>
                  {filteredItems.recent.map((item) => {
                    const idx = flatIndex++;
                    return (
                      <CommandRow
                        key={item.id}
                        item={item}
                        index={idx}
                        isSelected={idx === selectedIndex}
                        badgeClass={badgeClass(item.category)}
                        onSelect={handleSelect}
                        onHover={setSelectedIndex}
                      />
                    );
                  })}
                </>
              )}

              {/* Group remaining by category */}
              {["Section", "Directive", "Template"].map((cat) => {
                const catItems = filteredItems.rest.filter((c) => c.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {cat}s
                    </div>
                    {catItems.map((item) => {
                      const idx = flatIndex++;
                      return (
                        <CommandRow
                          key={item.id}
                          item={item}
                          index={idx}
                          isSelected={idx === selectedIndex}
                          badgeClass={badgeClass(item.category)}
                          onSelect={handleSelect}
                          onHover={setSelectedIndex}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[hsl(var(--border))] px-3 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
          <span className="mr-3">↑↓ Navigate</span>
          <span className="mr-3">↵ Insert</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

// ── Row sub-component ────────────────────────────────────────────

function CommandRow({
  item,
  index,
  isSelected,
  badgeClass,
  onSelect,
  onHover,
}: {
  item: CommandItem;
  index: number;
  isSelected: boolean;
  badgeClass: string;
  onSelect: (item: CommandItem) => void;
  onHover: (index: number) => void;
}) {
  return (
    <button
      type="button"
      data-index={index}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onHover(index)}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
        isSelected
          ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
          : "text-[hsl(var(--popover-foreground))] hover:bg-[hsl(var(--accent))]"
      }`}
      data-testid={`command-item-${item.id}`}
    >
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
        {item.category}
      </span>
      <span className="font-medium">{item.label}</span>
      {item.description && (
        <span className="ml-auto truncate text-xs text-[hsl(var(--muted-foreground))]">
          {item.description}
        </span>
      )}
    </button>
  );
}
