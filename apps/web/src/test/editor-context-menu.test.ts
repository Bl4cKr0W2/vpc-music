import { describe, it, expect } from "vitest";
import { detectContext } from "@/components/songs/EditorContextMenu";

describe("detectContext", () => {
  // ── Chord detection ──

  describe("chord context", () => {
    it("detects cursor on a chord", () => {
      const input = "[G]Amazing grace";
      // cursor at position 1 = inside [G]
      const ctx = detectContext(input, 1);
      expect(ctx.type).toBe("chord");
      expect(ctx.chord).toBe("G");
      expect(ctx.chordStart).toBe(0);
      expect(ctx.chordEnd).toBe(3);
    });

    it("detects complex chord name", () => {
      const input = "Hello [Am7/G]world";
      // cursor at position 8 = inside [Am7/G]
      const ctx = detectContext(input, 8);
      expect(ctx.type).toBe("chord");
      expect(ctx.chord).toBe("Am7/G");
    });

    it("returns chord boundaries correctly", () => {
      const input = "Hello [C]world";
      const ctx = detectContext(input, 7);
      expect(ctx.type).toBe("chord");
      expect(ctx.chordStart).toBe(6);
      expect(ctx.chordEnd).toBe(9);
    });

    it("detects chord at end of line", () => {
      const input = "Amazing [G]";
      const ctx = detectContext(input, 9);
      expect(ctx.type).toBe("chord");
      expect(ctx.chord).toBe("G");
    });
  });

  // ── Section detection ──

  describe("section context", () => {
    it("detects section header", () => {
      const input = "{comment: Verse 1}\nLyrics";
      const ctx = detectContext(input, 5);
      expect(ctx.type).toBe("section");
      expect(ctx.lineText).toBe("{comment: Verse 1}");
    });

    it("detects section on second line", () => {
      const input = "{title: Test}\n{comment: Chorus}";
      const ctx = detectContext(input, 20);
      expect(ctx.type).toBe("section");
      expect(ctx.lineText).toBe("{comment: Chorus}");
    });
  });

  // ── Lyrics detection ──

  describe("lyrics context", () => {
    it("detects lyrics text", () => {
      const input = "{title: Test}\nAmazing grace how sweet";
      const ctx = detectContext(input, 20);
      expect(ctx.type).toBe("lyrics");
      expect(ctx.lineText).toBe("Amazing grace how sweet");
    });

    it("detects lyrics with chords as lyrics when cursor not on chord", () => {
      const input = "[G]Amazing [C]grace";
      // cursor at position 5 = on "z" in "Amazing"
      const ctx = detectContext(input, 5);
      expect(ctx.type).toBe("lyrics");
    });
  });

  // ── Line detection ──

  describe("line context", () => {
    it("detects empty line as line context", () => {
      const input = "{title: Test}\n\n{comment: Verse}";
      // cursor on the blank line (position 14)
      const ctx = detectContext(input, 14);
      expect(ctx.type).toBe("line");
    });

    it("detects directive (non-comment, non-metadata) as line", () => {
      const input = "{start_of_chorus}\nLyrics";
      const ctx = detectContext(input, 5);
      expect(ctx.type).toBe("line");
    });
  });

  // ── Line index tracking ──

  describe("line index", () => {
    it("returns correct line index for first line", () => {
      const input = "Line one\nLine two\nLine three";
      const ctx = detectContext(input, 3);
      expect(ctx.lineIndex).toBe(0);
    });

    it("returns correct line index for second line", () => {
      const input = "Line one\nLine two\nLine three";
      const ctx = detectContext(input, 12);
      expect(ctx.lineIndex).toBe(1);
    });

    it("returns correct line index for third line", () => {
      const input = "Line one\nLine two\nLine three";
      const ctx = detectContext(input, 22);
      expect(ctx.lineIndex).toBe(2);
    });
  });
});
