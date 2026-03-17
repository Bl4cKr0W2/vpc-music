import { useMemo, useState } from "react";
import { validateChordPro, type ValidationIssue } from "@/utils/chordpro-validate";
import { AlertTriangle, XCircle, ChevronDown } from "lucide-react";

interface ValidationPanelProps {
  source: string;
}

/**
 * Displays a collapsible panel of validation issues below the editor.
 * Only visible when there are validation issues to show.
 */
export function ValidationPanel({ source }: ValidationPanelProps) {
  const issues = useMemo(() => validateChordPro(source), [source]);
  const [expanded, setExpanded] = useState(true);

  if (issues.length === 0) return null;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div
      className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm"
      data-testid="validation-panel"
      role="region"
      aria-label="ChordPro validation issues"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[hsl(var(--muted))] transition-colors rounded-md"
        data-testid="validation-toggle"
        aria-expanded={expanded}
        aria-controls="validation-issues-panel"
        aria-label="Toggle validation issues"
      >
        <span className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 text-red-500">
              <XCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{errorCount}</span>
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{warnCount}</span>
            </span>
          )}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div
          id="validation-issues-panel"
          className="max-h-40 overflow-y-auto border-t border-[hsl(var(--border))] px-3 py-1.5"
          data-testid="validation-issues"
        >
          {issues.map((issue, idx) => (
            <IssueRow key={idx} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className="flex items-start gap-2 py-1 text-xs" data-testid="validation-issue">
      {issue.severity === "error" ? (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      )}
      <span className="text-[hsl(var(--muted-foreground))]">
        <span className="font-mono font-medium text-[hsl(var(--foreground))]">
          Line {issue.line}:
        </span>{" "}
        {issue.message}
      </span>
    </div>
  );
}
