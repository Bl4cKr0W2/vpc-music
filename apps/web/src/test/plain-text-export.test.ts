import { describe, it, expect } from "vitest";
import { chordProToPlainText } from "@vpc-music/shared";

describe("plain text export", () => {
  it("renders chords over lyrics by default", () => {
    const input = "{title: Amazing Grace}\n{key: G}\n{comment: Verse 1}\n[G]Amazing [C]grace";
    const result = chordProToPlainText(input);

    expect(result).toContain("Amazing Grace");
    expect(result).toContain("Key: G");
    expect(result).toContain("VERSE 1");
    expect(result).toContain("G       C");
    expect(result).toContain("Amazing grace");
  });

  it("supports lyrics-only mode", () => {
    const input = "[G]Amazing [C]grace\nHow sweet the [G]sound";
    const result = chordProToPlainText(input, { lyricsOnly: true });

    expect(result).toContain("Amazing grace");
    expect(result).toContain("How sweet the sound");
    expect(result).not.toContain("G");
    expect(result).not.toContain("C");
  });

  it("preserves section headers", () => {
    const input = "{comment: Chorus}\n[C]Hallelujah";
    const result = chordProToPlainText(input);
    expect(result).toContain("CHORUS");
  });
});