import { describe, it, expect } from "vitest";
import {
  songSchema,
  songVariationSchema,
  ROLES,
  ROLE_LABELS,
  CHROMATIC_SHARP,
  CHROMATIC_FLAT,
  ALL_KEYS,
  NASHVILLE_NUMBERS,
  CHORD_REGEX,
  SECTION_KEYWORDS,
} from "@vpc-music/shared";

// ── songSchema ──────────────────────────────────
describe("songSchema", () => {
  it("accepts a valid song", () => {
    const result = songSchema.safeParse({
      title: "Amazing Grace",
      content: "{title: Amazing Grace}\n[G]Amazing grace",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = songSchema.safeParse({ content: "something" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = songSchema.safeParse({ title: "", content: "something" });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = songSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = songSchema.safeParse({ title: "Test", content: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = songSchema.safeParse({
      title: "Test Song",
      content: "[G]Lyrics here",
      key: "G",
      tempo: 120,
      artist: "John Newton",
      year: "1779",
      tags: "hymn,worship",
      isDraft: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.isDraft).toBe(true);
  });

  it("defaults isDraft to false", () => {
    const result = songSchema.safeParse({
      title: "Test",
      content: "[C]Line",
    });
    expect(result.success).toBe(true);
    expect(result.data.isDraft).toBe(false);
  });

  it("rejects non-positive tempo", () => {
    const result = songSchema.safeParse({
      title: "Test",
      content: "[C]Line",
      tempo: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer tempo", () => {
    const result = songSchema.safeParse({
      title: "Test",
      content: "[C]Line",
      tempo: 72.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid UUID for id", () => {
    const result = songSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test",
      content: "[C]Line",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for id", () => {
    const result = songSchema.safeParse({
      id: "not-a-uuid",
      title: "Test",
      content: "[C]Line",
    });
    expect(result.success).toBe(false);
  });
});

// ── songVariationSchema ─────────────────────────
describe("songVariationSchema", () => {
  it("accepts a valid variation", () => {
    const result = songVariationSchema.safeParse({
      songId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Acoustic Version",
      content: "[G]Content here",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing songId", () => {
    const result = songVariationSchema.safeParse({
      name: "Acoustic",
      content: "[G]Content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = songVariationSchema.safeParse({
      songId: "550e8400-e29b-41d4-a716-446655440000",
      name: "",
      content: "[G]Content",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = songVariationSchema.safeParse({
      songId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional key", () => {
    const result = songVariationSchema.safeParse({
      songId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Capo Version",
      content: "[C]Lyrics",
      key: "C",
    });
    expect(result.success).toBe(true);
    expect(result.data.key).toBe("C");
  });
});

// ── Role constants ──────────────────────────────
describe("ROLES", () => {
  it("exports viewer, editor, admin roles", () => {
    expect(ROLES.VIEWER).toBe("viewer");
    expect(ROLES.EDITOR).toBe("editor");
    expect(ROLES.ADMIN).toBe("admin");
  });
});

describe("ROLE_LABELS", () => {
  it("has labels for all roles", () => {
    expect(ROLE_LABELS.viewer).toBe("Viewer");
    expect(ROLE_LABELS.editor).toBe("Editor");
    expect(ROLE_LABELS.admin).toBe("Admin");
  });
});

// ── Music constants ─────────────────────────────
describe("Music constants", () => {
  it("CHROMATIC_SHARP has 12 notes", () => {
    expect(CHROMATIC_SHARP).toHaveLength(12);
    expect(CHROMATIC_SHARP[0]).toBe("C");
    expect(CHROMATIC_SHARP[11]).toBe("B");
  });

  it("CHROMATIC_FLAT has 12 notes", () => {
    expect(CHROMATIC_FLAT).toHaveLength(12);
    expect(CHROMATIC_FLAT[1]).toBe("Db");
  });

  it("ALL_KEYS has 12 keys", () => {
    expect(ALL_KEYS).toHaveLength(12);
    expect(ALL_KEYS).toContain("C");
    expect(ALL_KEYS).toContain("Gb");
  });

  it("NASHVILLE_NUMBERS has 12 entries", () => {
    expect(NASHVILLE_NUMBERS).toHaveLength(12);
    expect(NASHVILLE_NUMBERS[0]).toBe("1");
    expect(NASHVILLE_NUMBERS[11]).toBe("7");
  });

  it("CHORD_REGEX matches standard chords", () => {
    expect(CHORD_REGEX.test("G")).toBe(true);
    expect(CHORD_REGEX.test("Bm")).toBe(true);
    expect(CHORD_REGEX.test("F#m7")).toBe(true);
    expect(CHORD_REGEX.test("Gsus4")).toBe(true);
    expect(CHORD_REGEX.test("C/E")).toBe(true);
    expect(CHORD_REGEX.test("Cmaj7")).toBe(true);
    expect(CHORD_REGEX.test("Dm7b5")).toBe(true);
  });

  it("CHORD_REGEX rejects non-chord strings", () => {
    expect(CHORD_REGEX.test("hello")).toBe(false);
    expect(CHORD_REGEX.test("123")).toBe(false);
    expect(CHORD_REGEX.test("")).toBe(false);
  });

  it("SECTION_KEYWORDS includes common section names", () => {
    expect(SECTION_KEYWORDS).toContain("Verse");
    expect(SECTION_KEYWORDS).toContain("Chorus");
    expect(SECTION_KEYWORDS).toContain("Bridge");
    expect(SECTION_KEYWORDS).toContain("Intro");
    expect(SECTION_KEYWORDS).toContain("Outro");
    expect(SECTION_KEYWORDS).toContain("Pre-Chorus");
  });
});
