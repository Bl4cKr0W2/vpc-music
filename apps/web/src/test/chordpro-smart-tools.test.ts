import { describe, expect, it } from "vitest";
import { applySmartSuggestion, correctChordSpelling, getSmartSuggestions } from "@/utils/chordpro-smart-tools";

describe("chordpro-smart-tools", () => {
  it("suggests missing title, artist, and key metadata", () => {
    const suggestions = getSmartSuggestions("{comment: Verse 1}\n[G]Amazing grace");
    expect(suggestions.some((suggestion) => suggestion.type === "missing-metadata" && suggestion.directiveName === "title")).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.type === "missing-metadata" && suggestion.directiveName === "artist")).toBe(true);
    expect(suggestions.some((suggestion) => suggestion.type === "missing-metadata" && suggestion.directiveName === "key")).toBe(true);
  });

  it("detects likely chorus blocks from repeated unlabeled lyrics", () => {
    const source = `[G]Amazing grace\nHow sweet the sound\n\n[G]Amazing grace\nHow sweet the sound`;
    const suggestions = getSmartSuggestions(source);
    expect(suggestions.some((suggestion) => suggestion.type === "likely-chorus" && suggestion.sectionLabel === "Chorus")).toBe(true);
  });

  it("suggests verse labels for unlabeled lyrical sections", () => {
    const source = `{title: Test}\n{artist: Someone}\n{key: G}\n\n[G]Line one\nLine two`;
    const suggestions = getSmartSuggestions(source);
    expect(suggestions.some((suggestion) => suggestion.type === "section-name" && suggestion.sectionLabel === "Verse 1")).toBe(true);
  });

  it("corrects common lowercase and spaced chord spellings", () => {
    expect(correctChordSpelling(" g / b ")).toBe("G/B");
    expect(correctChordSpelling("amin")).toBe("Am");
  });

  it("applies a section suggestion by inserting a comment marker", () => {
    const source = `{title: Test}\n{artist: Someone}\n{key: G}\n\n[G]Line one\nLine two`;
    const suggestion = getSmartSuggestions(source).find((item) => item.type === "section-name");
    expect(suggestion).toBeTruthy();
    const updated = applySmartSuggestion(source, suggestion!);
    expect(updated).toContain("{comment: Verse 1}\n[G]Line one");
  });

  it("applies metadata suggestions using provided metadata values", () => {
    const source = "[G]Amazing grace";
    const suggestion = getSmartSuggestions(source).find((item) => item.type === "missing-metadata" && item.directiveName === "title");
    expect(suggestion).toBeTruthy();
    const updated = applySmartSuggestion(source, suggestion!, { title: "Amazing Grace" });
    expect(updated.startsWith("{title: Amazing Grace}")).toBe(true);
  });
});
