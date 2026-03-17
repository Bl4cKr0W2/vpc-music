import { describe, it, expect } from "vitest";
import { formatChordPro } from "@/utils/chordpro-format";

describe("formatChordPro", () => {
  // ── Trailing whitespace ──

  describe("trailing whitespace", () => {
    it("removes trailing whitespace from lines", () => {
      const input = "{title: Test}   \n{key: G}  \n\n[G]Amazing grace   \n";
      const result = formatChordPro(input);
      const lines = result.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          expect(line).toBe(line.trimEnd());
        }
      }
    });

    it("handles empty input", () => {
      const result = formatChordPro("");
      expect(result).toBe("\n");
    });

    it("handles whitespace-only input", () => {
      const result = formatChordPro("   \n  \n  ");
      expect(result).toBe("\n");
    });
  });

  // ── Directive normalization ──

  describe("directive normalization", () => {
    it("normalizes spacing inside directives", () => {
      const input = "{ title :  My Song  }\n{  key:G }\n";
      const result = formatChordPro(input);
      expect(result).toContain("{title: My Song}");
      expect(result).toContain("{key: G}");
    });

    it("normalizes standalone directives", () => {
      const input = "{ start_of_chorus }\n";
      const result = formatChordPro(input);
      expect(result).toContain("{start_of_chorus}");
    });
  });

  // ── Metadata ordering ──

  describe("metadata ordering", () => {
    it("moves metadata directives to the top", () => {
      const input = "{comment: Verse 1}\n{title: Test}\n{key: G}\n";
      const result = formatChordPro(input);
      const lines = result.split("\n");
      const titleIdx = lines.findIndex((l) => l.includes("{title:"));
      const keyIdx = lines.findIndex((l) => l.includes("{key:"));
      const commentIdx = lines.findIndex((l) => l.includes("{comment:"));
      expect(titleIdx).toBeLessThan(commentIdx);
      expect(keyIdx).toBeLessThan(commentIdx);
    });

    it("sorts metadata in canonical order (title, artist, key, tempo)", () => {
      const input = "{tempo: 120}\n{key: G}\n{artist: John}\n{title: Test}\n";
      const result = formatChordPro(input);
      const lines = result.split("\n");
      const titleIdx = lines.findIndex((l) => l.includes("{title:"));
      const artistIdx = lines.findIndex((l) => l.includes("{artist:"));
      const keyIdx = lines.findIndex((l) => l.includes("{key:"));
      const tempoIdx = lines.findIndex((l) => l.includes("{tempo:"));
      expect(titleIdx).toBeLessThan(artistIdx);
      expect(artistIdx).toBeLessThan(keyIdx);
      expect(keyIdx).toBeLessThan(tempoIdx);
    });

    it("keeps non-metadata directives in body", () => {
      const input = "{title: Test}\n{comment: Verse 1}\n[G]lyrics\n";
      const result = formatChordPro(input);
      expect(result).toContain("{comment: Verse 1}");
    });
  });

  // ── Blank line normalization ──

  describe("blank lines", () => {
    it("removes excessive consecutive blank lines", () => {
      const input = "{title: Test}\n\n\n\n\n{comment: Verse 1}\n";
      const result = formatChordPro(input);
      // Should not have more than one consecutive blank line
      expect(result).not.toMatch(/\n\n\n/);
    });

    it("ensures blank line before section headers", () => {
      const input = "{title: Test}\n[G]lyrics\n{comment: Chorus}\n";
      const result = formatChordPro(input);
      const lines = result.split("\n");
      const commentIdx = lines.findIndex((l) => l.includes("{comment: Chorus}"));
      expect(commentIdx).toBeGreaterThan(0);
      expect(lines[commentIdx - 1]?.trim()).toBe("");
    });

    it("inserts blank line between metadata and body", () => {
      const input = "{title: Test}\n{key: G}\n{comment: Verse 1}\n";
      const result = formatChordPro(input);
      const lines = result.split("\n");
      const keyIdx = lines.findIndex((l) => l.includes("{key:"));
      expect(lines[keyIdx + 1]?.trim()).toBe("");
    });

    it("removes trailing blank lines (but ends with newline)", () => {
      const input = "{title: Test}\n\n\n\n";
      const result = formatChordPro(input);
      expect(result).toBe("{title: Test}\n");
    });
  });

  // ── Full document formatting ──

  describe("full document", () => {
    it("formats a complete song", () => {
      const input = [
        "{comment: Verse 1}",
        "{ tempo : 120 }",
        "[G]Amazing [C]grace   ",
        "",
        "",
        "",
        "{title:  My Song }",
        "{ key : G}",
        "{comment: Chorus}",
        "[C]How sweet the sound  ",
        "",
      ].join("\n");

      const result = formatChordPro(input);
      const lines = result.split("\n");

      // Metadata should be at top
      expect(lines[0]).toBe("{title: My Song}");
      expect(lines[1]).toBe("{key: G}");
      expect(lines[2]).toBe("{tempo: 120}");

      // Blank line after metadata
      expect(lines[3]).toBe("");

      // Body content follows
      expect(result).toContain("{comment: Verse 1}");
      expect(result).toContain("[G]Amazing [C]grace");
      expect(result).toContain("{comment: Chorus}");
      expect(result).toContain("[C]How sweet the sound");

      // No trailing whitespace
      for (const line of lines) {
        if (line.trim()) {
          expect(line).toBe(line.trimEnd());
        }
      }
    });

    it("is idempotent — formatting twice gives same result", () => {
      const input = "{tempo: 120}\n{title: Test}\n\n\n{comment: Verse}\n[G]lyrics  \n\n";
      const first = formatChordPro(input);
      const second = formatChordPro(first);
      expect(second).toBe(first);
    });

    it("preserves lyrics and chords", () => {
      const input = "{title: Test}\n\n{comment: Verse 1}\n[G]Amazing [C]grace\n[D]How sweet\n";
      const result = formatChordPro(input);
      expect(result).toContain("[G]Amazing [C]grace");
      expect(result).toContain("[D]How sweet");
    });
  });
});
