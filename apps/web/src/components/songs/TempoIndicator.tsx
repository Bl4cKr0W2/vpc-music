import type { CSSProperties } from "react";

interface TempoIndicatorProps {
  tempo: number;
  className?: string;
}

function clampTempoInterval(tempo: number) {
  return Math.min(2000, Math.max(250, 60000 / tempo));
}

export function TempoIndicator({ tempo, className = "" }: TempoIndicatorProps) {
  const pulseStyle = {
    animationDuration: `${clampTempoInterval(tempo)}ms`,
  } satisfies CSSProperties;

  return (
    <span
      className={`tempo-indicator ${className}`.trim()}
      aria-label={`Tempo ${tempo} BPM`}
    >
      <span
        aria-hidden="true"
        className="tempo-indicator__pulse"
        style={pulseStyle}
      />
      <span>{tempo} BPM</span>
    </span>
  );
}
