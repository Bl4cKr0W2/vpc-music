import { ChevronDown, ChevronRight, Copy, GripVertical, ListMusic } from "lucide-react";
import type { SectionEntry } from "@/utils/chordpro-section-organizer";

interface SectionOrganizerProps {
  sections: SectionEntry[];
  draggedSectionId?: string | null;
  collapsedSectionIds?: string[];
  onDragStart: (sectionId: string) => void;
  onDrop: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onToggleCollapse: (sectionId: string) => void;
  onJumpToLine: (line: number) => void;
}

export function SectionOrganizer({
  sections,
  draggedSectionId,
  collapsedSectionIds = [],
  onDragStart,
  onDrop,
  onDuplicate,
  onToggleCollapse,
  onJumpToLine,
}: SectionOrganizerProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
      data-testid="section-organizer"
      role="region"
      aria-label="Section organizer"
    >
      <div className="flex items-center gap-2">
        <ListMusic className="h-4 w-4 text-[hsl(var(--secondary))]" />
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Section organizer</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Drag sections to reorder the source, or duplicate a section with an auto-numbered label.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {sections.map((section) => {
          const isCollapsed = collapsedSectionIds.includes(section.id);

          return (
            <div
              key={section.id}
              className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${
                draggedSectionId === section.id
                  ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/10"
                  : "border-[hsl(var(--border))]"
              }`}
              draggable
              onDragStart={() => onDragStart(section.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(section.id)}
              data-testid="section-organizer-item"
            >
              <button
                type="button"
                onClick={() => onToggleCollapse(section.id)}
                className="btn-ghost btn-icon"
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${section.name}`}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="btn-ghost btn-icon"
                aria-label={`Drag ${section.name}`}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onJumpToLine(section.startLine - 1)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{section.name}</p>
                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">
                  {isCollapsed ? "Collapsed in editor" : section.preview || "Section content"} · lines {section.startLine}-{section.endLine}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(section.id)}
                className="btn-outline btn-sm"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
