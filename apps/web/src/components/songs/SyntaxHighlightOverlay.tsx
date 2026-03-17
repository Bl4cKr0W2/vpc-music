import { useMemo, forwardRef } from "react";
import { tokenizeChordPro, type Token } from "@/utils/chordpro-highlight";

/**
 * Maps token types to Tailwind color classes.
 * The overlay text is positioned exactly over the <textarea> characters
 * so the colored tokens visually replace the transparent textarea text.
 */
const TOKEN_CLASSES: Record<string, string> = {
  chord: "song-primary-chord font-bold",
  directive: "text-sky-400",                               // Blue for directives
  section: "song-secondary-chord font-bold italic",
  lyrics: "text-[hsl(var(--foreground))]",                 // Default text
  invalid: "text-red-400 underline decoration-wavy decoration-red-400", // Red wavy underline
};

interface SyntaxHighlightOverlayProps {
  value: string;
}

/**
 * Renders a syntax-highlighted version of ChordPro source text
 * as a transparent overlay <pre> that must be positioned on top of a textarea.
 *
 * Usage: Position this absolutely inside the same container as the textarea,
 * with matching font, padding, and sizing. The textarea text color is set to
 * transparent so only the overlay (syntax coloring) is visible.
 */
export const SyntaxHighlightOverlay = forwardRef<HTMLPreElement, SyntaxHighlightOverlayProps>(
  function SyntaxHighlightOverlay({ value }, ref) {
    const tokenizedLines = useMemo(() => tokenizeChordPro(value), [value]);

    return (
      <pre
        ref={ref}
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap wrap-break-word px-3 py-2 font-mono text-sm leading-5"
        aria-hidden="true"
        data-testid="syntax-overlay"
      >
        {tokenizedLines.map((tokens, lineIdx) => (
          <div key={lineIdx}>
            {tokens.length === 0 ? (
              // Empty line — render newline equivalent
              "\n"
            ) : (
              tokens.map((token, tokenIdx) => (
                <span
                  key={tokenIdx}
                  className={TOKEN_CLASSES[token.type] || TOKEN_CLASSES.lyrics}
                >
                  {token.text}
                </span>
              ))
            )}
          </div>
        ))}
      </pre>
    );
  },
);
