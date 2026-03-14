import { describe, it, expect } from "vitest";
import {
  CHROMATIC_SHARP,
  CHROMATIC_FLAT,
  ALL_KEYS,
  NASHVILLE_NUMBERS,
  CHORD_REGEX,
  SECTION_KEYWORDS,
} from "@vpc-music/shared";

describe("music constants", () => {
  it("chromatic sharp scale has 12 notes", () => {
    expect(CHROMATIC_SHARP).toHaveLength(12);
    expect(CHROMATIC_SHARP[0]).toBe("C");
    expect(CHROMATIC_SHARP[11]).toBe("B");
  });

  it("chromatic flat scale has 12 notes", () => {
    expect(CHROMATIC_FLAT).toHaveLength(12);
    expect(CHROMATIC_FLAT[0]).toBe("C");
    expect(CHROMATIC_FLAT[11]).toBe("B");
  });

  it("ALL_KEYS contains 12 keys", () => {
    expect(ALL_KEYS).toHaveLength(12);
  });

  it("NASHVILLE_NUMBERS has 12 entries", () => {
    expect(NASHVILLE_NUMBERS).toHaveLength(12);
    expect(NASHVILLE_NUMBERS[0]).toBe("1");
  });

  it("CHORD_REGEX matches common chords", () => {
    const valid = ["C", "Am", "F#m7", "Bb", "Gsus4", "Dm", "G7", "C/E"];
    for (const chord of valid) {
      expect(CHORD_REGEX.test(chord), `${chord} should match`).toBe(true);
    }
  });

  it("CHORD_REGEX rejects non-chords", () => {
    const invalid = ["X", "123", "hello"];
    for (const s of invalid) {
      expect(CHORD_REGEX.test(s), `${s} should not match`).toBe(false);
    }
  });

  it("SECTION_KEYWORDS includes common section names", () => {
    expect(SECTION_KEYWORDS).toContain("Verse");
    expect(SECTION_KEYWORDS).toContain("Chorus");
    expect(SECTION_KEYWORDS).toContain("Bridge");
    expect(SECTION_KEYWORDS).toContain("Intro");
    expect(SECTION_KEYWORDS).toContain("Outro");
  });
});
