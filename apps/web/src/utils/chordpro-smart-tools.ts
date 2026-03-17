import { CHORD_REGEX } from "@vpc-music/shared";

export type SmartSuggestionType =
  | "missing-metadata"
  | "section-name"
  | "likely-chorus"
  | "chord-correction";

export interface SmartSuggestion {
  id: string;
  type: SmartSuggestionType;
  line: number;
  title: string;
  description: string;
  actionLabel?: string;
  directiveName?: "title" | "artist" | "key";
  sectionLabel?: string;
  originalChord?: string;
  suggestedChord?: string;
}

interface SectionBlock {
  name: string | null;
  headerLine: number | null;
  bodyStartLine: number;
  bodyEndLine: number;
  lines: string[];
  normalizedBody: string;
  isChordOnly: boolean;
}

const SECTION_HEADER_REGEX = /^\{comment:\s*(.*?)\}\s*$/i;
const TOP_DIRECTIVE_ORDER = ["title", "artist", "key", "tempo"] as const;

function stripChordMarkup(line: string) {
  return line.replace(/\[[^\]]+\]/g, "");
}

function normalizeBlockText(lines: string[]) {
  return lines
    .map((line) => stripChordMarkup(line).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function isChordOnlyLine(line: string) {
  const lyricText = stripChordMarkup(line).replace(/[|/\\.\-~_*\s]/g, "").trim();
  return lyricText.length === 0 && /\[[^\]]+\]/.test(line);
}

function extractSectionBlocks(source: string): SectionBlock[] {
  const lines = source.split("\n");
  const blocks: SectionBlock[] = [];

  let pendingHeader: { name: string | null; line: number | null } | null = null;
  let body: string[] = [];
  let bodyStartLine: number | null = null;

  const flush = () => {
    if (body.length === 0 || bodyStartLine == null) {
      pendingHeader = null;
      body = [];
      bodyStartLine = null;
      return;
    }

    blocks.push({
      name: pendingHeader?.name ?? null,
      headerLine: pendingHeader?.line ?? null,
      bodyStartLine,
      bodyEndLine: bodyStartLine + body.length - 1,
      lines: [...body],
      normalizedBody: normalizeBlockText(body),
      isChordOnly: body.every((line) => !line.trim() || isChordOnlyLine(line)),
    });

    pendingHeader = null;
    body = [];
    bodyStartLine = null;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(SECTION_HEADER_REGEX);

    if (sectionMatch) {
      flush();
      pendingHeader = { name: sectionMatch[1]?.trim() || null, line: lineNumber };
      return;
    }

    if (trimmed === "") {
      flush();
      return;
    }

    if (/^\{\w+(?::.*)?\}$/.test(trimmed)) {
      return;
    }

    if (bodyStartLine == null) {
      bodyStartLine = lineNumber;
    }
    body.push(line);
  });

  flush();

  return blocks;
}

export function correctChordSpelling(chord: string) {
  const trimmed = chord.trim();
  if (!trimmed || CHORD_REGEX.test(trimmed)) {
    return null;
  }

  let corrected = trimmed.replace(/\s*\/\s*/g, "/").replace(/\s+/g, "");

  corrected = corrected.replace(/^([a-g])([b#]?)/, (_match, note: string, accidental: string) => `${note.toUpperCase()}${accidental}`);
  corrected = corrected.replace(/\/([a-g])([b#]?)/g, (_match, note: string, accidental: string) => `/${note.toUpperCase()}${accidental}`);
  corrected = corrected.replace(/minor/gi, "m");
  corrected = corrected.replace(/min/gi, "m");
  corrected = corrected.replace(/major/gi, "maj");
  corrected = corrected.replace(/maj/gi, "maj");
  corrected = corrected.replace(/sus/gi, "sus");
  corrected = corrected.replace(/add/gi, "add");
  corrected = corrected.replace(/dim/gi, "dim");
  corrected = corrected.replace(/aug/gi, "aug");

  return CHORD_REGEX.test(corrected) ? corrected : null;
}

function findPresentDirectives(source: string) {
  const directives = new Set<string>();

  for (const line of source.split("\n")) {
    const match = line.trim().match(/^\{(\w+)(?::.*)?\}$/);
    if (!match) {
      if (line.trim()) {
        break;
      }
      continue;
    }

    const name = match[1].toLowerCase();
    directives.add(name === "t" ? "title" : name);
  }

  return directives;
}

export function getSmartSuggestions(source: string): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return suggestions;
  }

  const directives = findPresentDirectives(source);
  (["title", "artist", "key"] as const).forEach((directiveName) => {
    if (!directives.has(directiveName)) {
      suggestions.push({
        id: `missing-${directiveName}`,
        type: "missing-metadata",
        line: 1,
        title: `Add {${directiveName}}`,
        description: `This song is missing a {${directiveName}} directive near the top.`,
        actionLabel: `Insert {${directiveName}}`,
        directiveName,
      });
    }
  });

  const blocks = extractSectionBlocks(source);
  const repeatedBlockMap = new Map<string, SectionBlock[]>();

  blocks.forEach((block) => {
    if (block.normalizedBody.length < 18) {
      return;
    }
    const existing = repeatedBlockMap.get(block.normalizedBody) ?? [];
    existing.push(block);
    repeatedBlockMap.set(block.normalizedBody, existing);
  });

  let verseCounter = 1;
  blocks.forEach((block) => {
    if (block.name) {
      return;
    }

    const repeats = repeatedBlockMap.get(block.normalizedBody) ?? [];
    if (repeats.length > 1) {
      suggestions.push({
        id: `chorus-${block.bodyStartLine}`,
        type: "likely-chorus",
        line: block.bodyStartLine,
        title: "Likely chorus detected",
        description: `This lyric block repeats ${repeats.length} times. Labeling it as a chorus will make navigation and arrangement tools clearer.`,
        actionLabel: "Insert Chorus label",
        sectionLabel: "Chorus",
      });
      return;
    }

    const sectionLabel = block.isChordOnly ? "Instrumental" : `Verse ${verseCounter++}`;
    suggestions.push({
      id: `section-${block.bodyStartLine}`,
      type: "section-name",
      line: block.bodyStartLine,
      title: `Add ${sectionLabel}`,
      description: `This section is currently unlabeled. Adding a section marker helps quick navigation and live performance workflows.`,
      actionLabel: `Insert ${sectionLabel}`,
      sectionLabel,
    });
  });

  source.split("\n").forEach((line, index) => {
    const lineNumber = index + 1;
    for (const match of line.matchAll(/\[([^\]]+)\]/g)) {
      const originalChord = match[1];
      const suggestedChord = correctChordSpelling(originalChord);
      if (!suggestedChord || suggestedChord === originalChord) {
        continue;
      }

      suggestions.push({
        id: `chord-${lineNumber}-${originalChord}`,
        type: "chord-correction",
        line: lineNumber,
        title: `Correct [${originalChord}]`,
        description: `This chord spelling looks off. ${suggestedChord} matches the supported chord format.`,
        actionLabel: `Use [${suggestedChord}]`,
        originalChord,
        suggestedChord,
      });
    }
  });

  return suggestions.sort((a, b) => a.line - b.line || a.title.localeCompare(b.title));
}

function replaceLine(lines: string[], lineNumber: number, updater: (line: string) => string) {
  const index = Math.max(0, lineNumber - 1);
  if (index >= lines.length) {
    return lines;
  }

  const next = [...lines];
  next[index] = updater(next[index]);
  return next;
}

export function insertDirectiveAtTop(source: string, directiveName: string, directiveValue: string) {
  const lines = source.split("\n");
  const directiveLine = `{${directiveName}: ${directiveValue}}`;
  const existingIndex = lines.findIndex((line) => new RegExp(`^\\{${directiveName}:`, "i").test(line.trim()));

  if (existingIndex >= 0) {
    const next = [...lines];
    next[existingIndex] = directiveLine;
    return next.join("\n");
  }

  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\{\w+(?::.*)?\}$/.test(lines[i].trim())) {
      insertIndex = i + 1;
    } else if (lines[i].trim()) {
      break;
    }
  }

  const desiredOrder = TOP_DIRECTIVE_ORDER.indexOf(directiveName as (typeof TOP_DIRECTIVE_ORDER)[number]);
  if (desiredOrder >= 0) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].trim().match(/^\{(\w+)(?::.*)?\}$/);
      if (!match) {
        if (lines[i].trim()) {
          insertIndex = Math.min(insertIndex, i);
          break;
        }
        continue;
      }

      const currentOrder = TOP_DIRECTIVE_ORDER.indexOf(match[1].toLowerCase() as (typeof TOP_DIRECTIVE_ORDER)[number]);
      if (currentOrder > desiredOrder) {
        insertIndex = i;
        break;
      }
    }
  }

  const next = [...lines];
  next.splice(insertIndex, 0, directiveLine);
  return next.join("\n");
}

export function applySmartSuggestion(
  source: string,
  suggestion: SmartSuggestion,
  metadata?: { title?: string; artist?: string; key?: string },
) {
  switch (suggestion.type) {
    case "missing-metadata": {
      const fallbackValues: Record<"title" | "artist" | "key", string> = {
        title: metadata?.title?.trim() || "Song Title",
        artist: metadata?.artist?.trim() || "Artist Name",
        key: metadata?.key?.trim() || "G",
      };
      return insertDirectiveAtTop(source, suggestion.directiveName ?? "title", fallbackValues[suggestion.directiveName ?? "title"]);
    }
    case "section-name":
    case "likely-chorus": {
      const lines = source.split("\n");
      const insertIndex = Math.max(0, suggestion.line - 1);
      const next = [...lines];
      next.splice(insertIndex, 0, `{comment: ${suggestion.sectionLabel ?? "Section"}}`);
      return next.join("\n");
    }
    case "chord-correction": {
      const lines = replaceLine(source.split("\n"), suggestion.line, (line) => {
        if (!suggestion.originalChord || !suggestion.suggestedChord) {
          return line;
        }
        return line.replace(`[${suggestion.originalChord}]`, `[${suggestion.suggestedChord}]`);
      });
      return lines.join("\n");
    }
    default:
      return source;
  }
}
