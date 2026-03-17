/**
 * Auto-format utility for ChordPro source text.
 *
 * Normalizes:
 * - Directive order (metadata directives grouped at top)
 * - Blank lines between sections (exactly one)
 * - Trailing whitespace on every line
 * - Consistent spacing inside directives
 * - Removes excessive consecutive blank lines (max 2)
 */

// ── Metadata directives that should appear at the top ────────────
const METADATA_DIRECTIVES = ["title", "t", "subtitle", "st", "artist", "key", "tempo", "capo", "time", "duration"];

const METADATA_ORDER: Record<string, number> = {};
METADATA_DIRECTIVES.forEach((d, i) => { METADATA_ORDER[d] = i; });

/**
 * Format a ChordPro source string.
 */
export function formatChordPro(source: string): string {
  let lines = source.split("\n");

  // 1) Trim trailing whitespace on every line
  lines = lines.map((line) => line.trimEnd());

  // 2) Normalize directive spacing: { key : value } → {key: value}
  lines = lines.map((line) => {
    return line.replace(
      /^\{\s*([a-z_]+)\s*:\s*(.*?)\s*\}$/,
      (_match, tag, val) => `{${tag}: ${val.trim()}}`,
    );
  });

  // 3) Normalize standalone directives: { start_of_chorus } → {start_of_chorus}
  lines = lines.map((line) => {
    return line.replace(
      /^\{\s*([a-z_]+)\s*\}$/,
      (_match, tag) => `{${tag}}`,
    );
  });

  // 4) Separate metadata directives to the top in canonical order
  const metaLines: { tag: string; line: string }[] = [];
  const bodyLines: string[] = [];

  for (const line of lines) {
    const m = line.match(/^\{([a-z_]+):\s*(.*?)\}$/);
    if (m && METADATA_ORDER[m[1]] !== undefined) {
      metaLines.push({ tag: m[1], line });
    } else {
      bodyLines.push(line);
    }
  }

  // Sort metadata by canonical order
  metaLines.sort((a, b) => (METADATA_ORDER[a.tag] ?? 99) - (METADATA_ORDER[b.tag] ?? 99));

  // 5) Remove excessive consecutive blank lines in body (max 1 between sections)
  const cleanedBody: string[] = [];
  let prevBlank = false;
  // Strip leading blank lines in body
  let startedBody = false;
  for (const line of bodyLines) {
    if (!startedBody && line.trim() === "") continue;
    startedBody = true;

    const isBlank = line.trim() === "";
    if (isBlank && prevBlank) continue; // skip extra blank
    cleanedBody.push(line);
    prevBlank = isBlank;
  }

  // 6) Ensure blank line before section headers ({comment: ...})
  const finalBody: string[] = [];
  for (let i = 0; i < cleanedBody.length; i++) {
    const line = cleanedBody[i];
    const isSection = /^\{comment:\s*.*\}$/.test(line.trim());
    if (isSection && i > 0 && finalBody.length > 0 && finalBody[finalBody.length - 1].trim() !== "") {
      finalBody.push(""); // insert blank line before section
    }
    finalBody.push(line);
  }

  // 7) Combine: metadata block + blank line + body
  const result: string[] = [];
  if (metaLines.length > 0) {
    result.push(...metaLines.map((m) => m.line));
    if (finalBody.length > 0) {
      result.push(""); // blank line after metadata
    }
  }
  result.push(...finalBody);

  // 8) Trim trailing blank lines
  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }

  // Always end with a newline
  return result.join("\n") + "\n";
}
