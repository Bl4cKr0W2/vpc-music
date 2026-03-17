interface CursorContextHelpProps {
  title: string;
  body: string;
  tips: string[];
}

export function CursorContextHelp({ title, body, tips }: CursorContextHelpProps) {
  return (
    <div
      className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
      data-testid="cursor-context-help"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{title}</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{body}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[hsl(var(--muted-foreground))]">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
