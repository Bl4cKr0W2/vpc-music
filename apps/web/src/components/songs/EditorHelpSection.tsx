import { useState, useEffect, type ReactNode } from "react";
import { ChevronDown, Keyboard, BookOpen, FileText, LayoutTemplate } from "lucide-react";

// ── Tab definitions ──────────────────────────────────────────────

interface HelpTab {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

const STORAGE_KEY = "chordpro-help-open";
const TAB_STORAGE_KEY = "chordpro-help-tab";

function QuickTipsContent() {
  return (
    <div className="space-y-2 text-sm text-[hsl(var(--foreground))]">
      <ul className="list-disc space-y-1.5 pl-5 text-[hsl(var(--muted-foreground))]">
        <li><strong className="text-[hsl(var(--foreground))]">Add chords:</strong> Select a word in the editor and type a chord name in the popup</li>
        <li><strong className="text-[hsl(var(--foreground))]">Section markers:</strong> Use the &quot;Insert Section&quot; dropdown or type <code className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs font-mono">{"{comment: Verse 1}"}</code></li>
        <li><strong className="text-[hsl(var(--foreground))]">Metadata at top:</strong> Keep <code className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs font-mono">{"{title:}"}</code>, <code className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs font-mono">{"{key:}"}</code>, <code className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs font-mono">{"{tempo:}"}</code> at the top of your song</li>
        <li><strong className="text-[hsl(var(--foreground))]">Blank lines:</strong> Use blank lines to separate sections visually</li>
        <li><strong className="text-[hsl(var(--foreground))]">Slash chords:</strong> Write as <code className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs font-mono">[G/B]</code> for bass note variations</li>
      </ul>
    </div>
  );
}

function KeyboardShortcutsContent() {
  const shortcuts = [
    { group: "Editing", items: [
      { keys: "Ctrl+S", desc: "Save song" },
      { keys: "Ctrl+/", desc: "Toggle comment on selected line(s)" },
      { keys: "Ctrl+K", desc: "Insert chord at cursor/selection" },
    ]},
    { group: "Insert Sections", items: [
      { keys: "Ctrl+Shift+V", desc: "Insert Verse header" },
      { keys: "Ctrl+Shift+C", desc: "Insert Chorus header" },
      { keys: "Ctrl+Shift+B", desc: "Insert Bridge header" },
    ]},
    { group: "Transpose", items: [
      { keys: "Alt+Up", desc: "Transpose selection up a semitone" },
      { keys: "Alt+Down", desc: "Transpose selection down a semitone" },
    ]},
  ];

  return (
    <div className="space-y-3 text-sm" data-testid="shortcuts-content">
      {shortcuts.map((group) => (
        <div key={group.group}>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {group.group}
          </h4>
          <div className="space-y-1">
            {group.items.map((item) => (
              <div key={item.keys} className="flex items-center justify-between">
                <span className="text-[hsl(var(--foreground))]">{item.desc}</span>
                <kbd className="ml-4 shrink-0 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommonDirectivesContent() {
  const directives = [
    { name: "title", example: "{title: Amazing Grace}", desc: "Song title" },
    { name: "artist", example: "{artist: John Newton}", desc: "Song artist/author" },
    { name: "key", example: "{key: G}", desc: "Original key" },
    { name: "tempo", example: "{tempo: 72}", desc: "BPM tempo" },
    { name: "capo", example: "{capo: 2}", desc: "Capo position" },
    { name: "comment", example: "{comment: Verse 1}", desc: "Section header / comment" },
    { name: "start_of_chorus", example: "{start_of_chorus}", desc: "Begin chorus block" },
    { name: "end_of_chorus", example: "{end_of_chorus}", desc: "End chorus block" },
  ];

  return (
    <div className="space-y-1 text-sm" data-testid="directives-content">
      {directives.map((d) => (
        <div key={d.name} className="flex items-start gap-3 py-1">
          <code className="shrink-0 rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs font-mono text-[hsl(var(--secondary))]">
            {d.example}
          </code>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{d.desc}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTemplatesContent({ onInsert }: { onInsert?: (text: string) => void }) {
  const templates = [
    {
      label: "Verse",
      template: "{comment: Verse 1}\n\n",
    },
    {
      label: "Chorus",
      template: "{comment: Chorus}\n\n",
    },
    {
      label: "Bridge",
      template: "{comment: Bridge}\n\n",
    },
    {
      label: "Intro / Outro",
      template: "{comment: Intro}\n\n\n{comment: Outro}\n\n",
    },
    {
      label: "Full Song Skeleton",
      template: `{title: Song Title}
{artist: Artist Name}
{key: G}
{tempo: 120}

{comment: Verse 1}


{comment: Chorus}


{comment: Verse 2}


{comment: Bridge}

`,
    },
    {
      label: "Metadata Block",
      template: `{title: Song Title}
{artist: Artist Name}
{key: G}
{tempo: 120}

`,
    },
  ];

  return (
    <div className="space-y-2 text-sm" data-testid="templates-content">
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        Click a template to insert it at the cursor position.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onInsert?.(t.template)}
            className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-left text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            data-testid={`template-${t.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Help Section ────────────────────────────────────────────

interface EditorHelpSectionProps {
  onInsertTemplate?: (text: string) => void;
}

export function EditorHelpSection({ onInsertTemplate }: EditorHelpSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem(TAB_STORAGE_KEY) || "tips";
    } catch {
      return "tips";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch { /* ignore */ }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch { /* ignore */ }
  }, [activeTab]);

  const tabs: HelpTab[] = [
    {
      id: "tips",
      label: "Quick Tips",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      content: <QuickTipsContent />,
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      icon: <Keyboard className="h-3.5 w-3.5" />,
      content: <KeyboardShortcutsContent />,
    },
    {
      id: "directives",
      label: "Directives",
      icon: <FileText className="h-3.5 w-3.5" />,
      content: <CommonDirectivesContent />,
    },
    {
      id: "templates",
      label: "Templates",
      icon: <LayoutTemplate className="h-3.5 w-3.5" />,
      content: <SectionTemplatesContent onInsert={onInsertTemplate} />,
    },
  ];

  const activeContent = tabs.find((t) => t.id === activeTab)?.content ?? tabs[0].content;

  return (
    <div
      className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      data-testid="editor-help-section"
    >
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
        data-testid="help-toggle"
      >
        <span>Editor Help &amp; Reference</span>
        <ChevronDown
          className={`h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-[hsl(var(--border))] px-3 py-3">
          {/* Tab bar */}
          <div className="mb-3 flex gap-1 border-b border-[hsl(var(--border))]" data-testid="help-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
                data-testid={`help-tab-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active content */}
          <div data-testid="help-content">
            {activeContent}
          </div>
        </div>
      )}
    </div>
  );
}
