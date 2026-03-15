/**
 * Convert ChordPro source to OnSong format.
 *
 * OnSong format:
 *   - Metadata at top as "Key: Value" lines
 *   - Section labels as "Section Name:" on their own line
 *   - Chords inline in square brackets (same as ChordPro)
 *   - Blank lines separate sections
 */

import { parseChordPro, toChordProString } from "./chordpro.js";

/**
 * Map of ChordPro directive keys → OnSong metadata labels.
 */
const DIRECTIVE_MAP = {
  title: "Title",
  t: "Title",
  artist: "Artist",
  a: "Artist",
  key: "Key",
  k: "Key",
  tempo: "Tempo",
  time: "Time",
  capo: "Capo",
  year: "Year",
  copyright: "Copyright",
  ccli: "CCLI",
};

/**
 * Convert a parsed ChordPro document to OnSong format string.
 * @param {{ directives: Record<string, string>, sections: Array<{ name: string, lines: Array<{ chords: Array<{chord: string, position: number}>, lyrics: string }> }> }} doc
 * @returns {string}
 */
export function docToOnSong(doc) {
  const parts = [];

  // Metadata header
  for (const [key, value] of Object.entries(doc.directives)) {
    const label = DIRECTIVE_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1);
    parts.push(`${label}: ${value}`);
  }

  if (parts.length > 0) {
    parts.push(""); // blank line after metadata
  }

  // Sections
  for (const section of doc.sections) {
    if (section.name) {
      parts.push(`${section.name}:`);
    }

    for (const line of section.lines) {
      let result = "";
      let lyricPos = 0;
      const sortedChords = [...line.chords].sort((a, b) => a.position - b.position);

      for (const { chord, position } of sortedChords) {
        result += line.lyrics.slice(lyricPos, position);
        result += `[${chord}]`;
        lyricPos = position;
      }
      result += line.lyrics.slice(lyricPos);
      parts.push(result);
    }

    parts.push(""); // blank line between sections
  }

  return parts.join("\n").trim() + "\n";
}

/**
 * Convert raw ChordPro source text to OnSong format.
 * @param {string} chordProSource
 * @returns {string}
 */
export function chordProToOnSong(chordProSource) {
  const doc = parseChordPro(chordProSource);
  return docToOnSong(doc);
}
