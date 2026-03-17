import { describe, it, expect } from "vitest";
import { getKeyDistance, keyTransitionLabel, analyzeKeyTransitions } from "@/utils/key-compat";

describe("key-compat utilities", () => {
  // ===================== getKeyDistance =====================

  describe("getKeyDistance", () => {
    it("returns 0 for the same key", () => {
      expect(getKeyDistance("C", "C")).toBe(0);
      expect(getKeyDistance("G", "G")).toBe(0);
      expect(getKeyDistance("Bb", "Bb")).toBe(0);
    });

    it("returns distance for adjacent keys", () => {
      // C → Db = 1 semitone
      expect(getKeyDistance("C", "Db")).toBe(1);
      // C → D = 2 semitones
      expect(getKeyDistance("C", "D")).toBe(2);
    });

    it("returns minimum of clockwise and counter-clockwise", () => {
      // C → G = 7 clockwise, 5 counter-clockwise → 5
      expect(getKeyDistance("C", "G")).toBe(5);
      // C → F = 5 clockwise, 7 counter-clockwise → 5
      expect(getKeyDistance("C", "F")).toBe(5);
      // C → Gb = 6 either way → 6
      expect(getKeyDistance("C", "Gb")).toBe(6);
    });

    it("handles distances in the 3-4 range (moderate)", () => {
      // C → Eb = 3
      expect(getKeyDistance("C", "Eb")).toBe(3);
      // C → E = 4
      expect(getKeyDistance("C", "E")).toBe(4);
    });

    it("is symmetric (distance from A to B equals B to A)", () => {
      expect(getKeyDistance("C", "E")).toBe(getKeyDistance("E", "C"));
      expect(getKeyDistance("G", "Bb")).toBe(getKeyDistance("Bb", "G"));
      expect(getKeyDistance("D", "Ab")).toBe(getKeyDistance("Ab", "D"));
    });

    it("normalizes enharmonic equivalents (C# → Db)", () => {
      expect(getKeyDistance("C#", "Db")).toBe(0);
      expect(getKeyDistance("D#", "Eb")).toBe(0);
      expect(getKeyDistance("F#", "Gb")).toBe(0);
      expect(getKeyDistance("G#", "Ab")).toBe(0);
      expect(getKeyDistance("A#", "Bb")).toBe(0);
    });

    it("handles rare enharmonic equivalents (Cb → B, Fb → E, E# → F, B# → C)", () => {
      expect(getKeyDistance("Cb", "B")).toBe(0);
      expect(getKeyDistance("Fb", "E")).toBe(0);
      expect(getKeyDistance("E#", "F")).toBe(0);
      expect(getKeyDistance("B#", "C")).toBe(0);
    });

    it("returns null for unknown keys", () => {
      expect(getKeyDistance("X", "C")).toBeNull();
      expect(getKeyDistance("C", "Z")).toBeNull();
      expect(getKeyDistance("H", "J")).toBeNull();
    });

    it("returns null for empty strings", () => {
      expect(getKeyDistance("", "C")).toBeNull();
      expect(getKeyDistance("C", "")).toBeNull();
    });

    it("maximum distance is 6", () => {
      // Tritone = furthest possible
      expect(getKeyDistance("C", "Gb")).toBe(6);
      expect(getKeyDistance("D", "Ab")).toBe(6);
    });
  });

  // ===================== keyTransitionLabel =====================

  describe("keyTransitionLabel", () => {
    it('returns "Same key" / good for distance 0', () => {
      const result = keyTransitionLabel(0);
      expect(result.label).toBe("Same key");
      expect(result.level).toBe("good");
    });

    it('returns "Close" / good for distance 1-2', () => {
      expect(keyTransitionLabel(1)).toEqual({ label: "Close", level: "good" });
      expect(keyTransitionLabel(2)).toEqual({ label: "Close", level: "good" });
    });

    it('returns "Moderate" / ok for distance 3-4', () => {
      expect(keyTransitionLabel(3)).toEqual({ label: "Moderate", level: "ok" });
      expect(keyTransitionLabel(4)).toEqual({ label: "Moderate", level: "ok" });
    });

    it('returns "Distant" / warn for distance 5-6', () => {
      expect(keyTransitionLabel(5)).toEqual({ label: "Distant", level: "warn" });
      expect(keyTransitionLabel(6)).toEqual({ label: "Distant", level: "warn" });
    });

    it('returns "Unknown" / ok for null distance', () => {
      expect(keyTransitionLabel(null)).toEqual({ label: "Unknown", level: "ok" });
    });
  });

  // ===================== analyzeKeyTransitions =====================

  describe("analyzeKeyTransitions", () => {
    it("returns empty array for single-song list", () => {
      expect(analyzeKeyTransitions([{ songKey: "C" }])).toEqual([]);
    });

    it("returns empty array for empty list", () => {
      expect(analyzeKeyTransitions([])).toEqual([]);
    });

    it("analyzes adjacent keys in a setlist", () => {
      const songs = [
        { songKey: "C" },
        { songKey: "D" },
        { songKey: "G" },
      ];
      const result = analyzeKeyTransitions(songs);
      expect(result).toHaveLength(2);

      // C → D = 2 semitones = good
      expect(result[0]).toEqual({
        fromIndex: 0,
        toIndex: 1,
        fromKey: "C",
        toKey: "D",
        distance: 2,
        level: "good",
      });

      // D → G = 5 semitones = warn
      expect(result[1]).toEqual({
        fromIndex: 1,
        toIndex: 2,
        fromKey: "D",
        toKey: "G",
        distance: 5,
        level: "warn",
      });
    });

    it("prefers override key over songKey", () => {
      const songs = [
        { key: "E", songKey: "C" },
        { key: null, songKey: "G" },
      ];
      const result = analyzeKeyTransitions(songs);
      // E → G = 3 semitones
      expect(result[0].fromKey).toBe("E");
      expect(result[0].toKey).toBe("G");
      expect(result[0].distance).toBe(3);
    });

    it("skips songs with missing keys", () => {
      const songs = [
        { songKey: "C" },
        { songKey: null },
        { songKey: "G" },
      ];
      const result = analyzeKeyTransitions(songs);
      // First transition: C → null → skipped
      // Second transition: null → G → skipped
      // C→null skipped, null→G skipped
      expect(result).toHaveLength(0);
    });

    it("identifies warn-level transitions", () => {
      const songs = [
        { songKey: "C" },
        { songKey: "Gb" },  // 6 semitones
      ];
      const result = analyzeKeyTransitions(songs);
      expect(result[0].level).toBe("warn");
      expect(result[0].distance).toBe(6);
    });

    it("handles all good transitions", () => {
      const songs = [
        { songKey: "C" },
        { songKey: "D" },  // 2
        { songKey: "E" },  // 2
      ];
      const result = analyzeKeyTransitions(songs);
      expect(result.every((t) => t.level === "good")).toBe(true);
    });
  });
});
