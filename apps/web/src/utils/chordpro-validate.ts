/**
 * ChordPro inline validation.
 *
 * Analyzes ChordPro source and returns an array of validation issues
 * with line numbers, severity, and human-readable messages.
 */

import { CHORD_REGEX } from "@vpc-music/shared";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  line: number;       // 1-based line number
  severity: IssueSeverity;
  message: string;
}

/** Known directive names (same set as highlighter) */
const KNOWN_DIRECTIVES = new Set([
  "title", "t", "subtitle", "st", "artist", "composer", "lyricist",
  "album", "year", "key", "tempo", "time", "capo", "duration",
  "comment", "c", "comment_italic", "ci", "comment_box", "cb",
  "start_of_chorus", "soc", "end_of_chorus", "eoc",
  "start_of_verse", "sov", "end_of_verse", "eov",
  "start_of_bridge", "sob", "end_of_bridge", "eob",
  "start_of_tab", "sot", "end_of_tab", "eot",
  "start_of_grid", "sog", "end_of_grid", "eog",
  "define", "chord",
  "columns", "col", "column_break", "colb",
  "new_page", "np", "new_physical_page", "npp",
  "textfont", "textsize", "textcolour",
  "chordfont", "chordsize", "chordcolour",
  "tabfont", "tabsize", "tabcolour",
  "meta",
]);

/** Directives that should only appear once */
const UNIQUE_DIRECTIVES = new Set(["title", "t", "key", "tempo", "artist", "capo", "time"]);

/**
 * Validate a ChordPro source string and return all issues found.
 */
export function validateChordPro(source: string): ValidationIssue[] {
  const lines = source.split("\n");
  const issues: ValidationIssue[] = [];
  const seenDirectives = new Map<string, number>(); // directive → first line number

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // ── Check for directive lines ──
    if (trimmed.startsWith("{")) {
      // Check for unclosed brace
      if (!trimmed.includes("}")) {
        issues.push({
          line: lineNum,
          severity: "error",
          message: "Unclosed brace — missing `}`",
        });
        continue;
      }

      const match = trimmed.match(/^\{(\w+)(?::(.*))?}$/);
      if (match) {
        const name = match[1];

        // Unknown directive
        if (!KNOWN_DIRECTIVES.has(name)) {
          issues.push({
            line: lineNum,
            severity: "warning",
            message: `Unknown directive: {${name}}`,
          });
        }

        // Duplicate unique directives
        const canonical = name === "t" ? "title" : name;
        if (UNIQUE_DIRECTIVES.has(canonical)) {
          if (seenDirectives.has(canonical)) {
            issues.push({
              line: lineNum,
              severity: "warning",
              message: `Duplicate {${name}} — first seen on line ${seenDirectives.get(canonical)}`,
            });
          } else {
            seenDirectives.set(canonical, lineNum);
          }
        }
      }
      continue;
    }

    // ── Check for bracket issues in lyrics/chord lines ──
    let openBrackets = 0;
    let openBraces = 0;

    for (let j = 0; j < trimmed.length; j++) {
      const ch = trimmed[j];
      if (ch === "[") {
        openBrackets++;
      } else if (ch === "]") {
        if (openBrackets > 0) {
          openBrackets--;
        } else {
          issues.push({
            line: lineNum,
            severity: "error",
            message: "Unexpected `]` without matching `[`",
          });
        }
      } else if (ch === "{") {
        openBraces++;
      } else if (ch === "}") {
        if (openBraces > 0) {
          openBraces--;
        } else {
          issues.push({
            line: lineNum,
            severity: "error",
            message: "Unexpected `}` without matching `{`",
          });
        }
      }
    }

    if (openBrackets > 0) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: "Missing closing `]` — unclosed chord bracket",
      });
    }
    if (openBraces > 0) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: "Missing closing `}` — unclosed brace",
      });
    }
  }

  return issues;
}
