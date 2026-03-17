import { Lightbulb, Sparkles } from "lucide-react";
import type { SmartSuggestion } from "@/utils/chordpro-smart-tools";

interface SmartSuggestionsPanelProps {
  suggestions: SmartSuggestion[];
  onApplySuggestion?: (suggestion: SmartSuggestion) => void;
}

export function SmartSuggestionsPanel({ suggestions, onApplySuggestion }: SmartSuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
      data-testid="smart-suggestions-panel"
      role="region"
      aria-label="Smart editor suggestions"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[hsl(var(--secondary))]" />
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Smart suggestions</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Helpful nudges for section labels, repeated choruses, metadata, and chord spelling.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-[hsl(var(--border))] px-3 py-2"
            data-testid="smart-suggestion"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{suggestion.title}</p>
              </div>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Line {suggestion.line}: {suggestion.description}
              </p>
            </div>
            {suggestion.actionLabel && onApplySuggestion ? (
              <button
                type="button"
                onClick={() => onApplySuggestion(suggestion)}
                className="btn-outline btn-sm shrink-0"
              >
                {suggestion.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
