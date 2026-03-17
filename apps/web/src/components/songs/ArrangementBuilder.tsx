import { Minus, Plus, Save, Trash2 } from "lucide-react";
import type { ArrangementItem, ArrangementSectionChoice } from "@/utils/chordpro-arrangement";

interface ArrangementBuilderProps {
  sections: ArrangementSectionChoice[];
  items: ArrangementItem[];
  summary: string;
  variationName: string;
  onVariationNameChange: (value: string) => void;
  onAddSection: (sectionId: string) => void;
  onMoveItem: (itemId: string, direction: -1 | 1) => void;
  onChangeRepeat: (itemId: string, delta: -1 | 1) => void;
  onRemoveItem: (itemId: string) => void;
  onSaveVariation: () => void;
  saving?: boolean;
}

export function ArrangementBuilder({
  sections,
  items,
  summary,
  variationName,
  onVariationNameChange,
  onAddSection,
  onMoveItem,
  onChangeRepeat,
  onRemoveItem,
  onSaveVariation,
  saving = false,
}: ArrangementBuilderProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
      data-testid="arrangement-builder"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Arrangement builder</h3>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Build a performance-ready section order without overwriting the current song source, then save it as a variation.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Available sections</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onAddSection(section.id)}
                className="btn-outline btn-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                {section.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Arrangement order</p>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Add sections above to build an arrangement sequence.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {items.map((item, index) => {
                const section = sections.find((choice) => choice.id === item.sectionId);
                if (!section) {
                  return null;
                }

                return (
                  <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-3 py-2" data-testid="arrangement-item">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{section.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.repeatCount > 1 ? `${section.name} ×${item.repeatCount}` : section.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="btn-ghost btn-icon" onClick={() => onChangeRepeat(item.id, -1)} aria-label={`Decrease repeats for ${section.name}`}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-xs font-medium text-[hsl(var(--foreground))]">×{item.repeatCount}</span>
                      <button type="button" className="btn-ghost btn-icon" onClick={() => onChangeRepeat(item.id, 1)} aria-label={`Increase repeats for ${section.name}`}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button type="button" className="btn-outline btn-sm" onClick={() => onMoveItem(item.id, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => onMoveItem(item.id, 1)} disabled={index === items.length - 1}>
                      Down
                    </button>
                    <button type="button" className="btn-outline btn-sm" onClick={() => onRemoveItem(item.id)} aria-label={`Remove ${section.name} from arrangement`}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Arrangement summary</p>
          <p className="mt-1 text-sm text-[hsl(var(--foreground))]" data-testid="arrangement-summary">{summary || "No sections added yet"}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="space-y-1 text-sm text-[hsl(var(--foreground))]">
            <span className="font-medium">Variation name</span>
            <input
              type="text"
              value={variationName}
              onChange={(event) => onVariationNameChange(event.target.value)}
              className="input"
              placeholder="Sunday arrangement"
            />
          </label>
          <button
            type="button"
            onClick={onSaveVariation}
            disabled={saving || items.length === 0 || !variationName.trim()}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving arrangement..." : "Save arrangement as variation"}
          </button>
        </div>
      </div>
    </div>
  );
}
