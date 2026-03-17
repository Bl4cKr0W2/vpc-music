import { describe, expect, it } from "vitest";
import { buildCollapsedChordProView, duplicateChordProSection, getOrganizedSections, reorderChordProSections } from "@/utils/chordpro-section-organizer";

const SOURCE = `{title: Test}
{artist: Someone}
{key: G}

{comment: Verse 1}
[G]Amazing grace
How sweet the sound

{comment: Chorus}
[C]I once was lost
But now am found`;

describe("chordpro-section-organizer", () => {
  it("lists named sections with previews", () => {
    const sections = getOrganizedSections(SOURCE);
    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe("Verse 1");
    expect(sections[0].preview).toBe("Amazing grace");
    expect(sections[1].name).toBe("Chorus");
  });

  it("reorders sections while preserving the metadata prefix", () => {
    const updated = reorderChordProSections(SOURCE, "Verse 1-5", "Chorus-9");
    expect(updated.startsWith("{title: Test}\n{artist: Someone}\n{key: G}" )).toBe(true);
    expect(updated.indexOf("{comment: Chorus}")).toBeLessThan(updated.indexOf("{comment: Verse 1}"));
  });

  it("duplicates a section and auto-numbers the new label", () => {
    const updated = duplicateChordProSection(SOURCE, "Chorus-9");
    expect(updated).toContain("{comment: Chorus 2}");
    expect(updated.match(/\{comment: Chorus/g)?.length).toBe(2);
  });

  it("builds a collapsed editor view for folded sections", () => {
    const collapsed = buildCollapsedChordProView(SOURCE, ["Verse 1-5"]);
    expect(collapsed).toContain("{comment: Verse 1}\n… 3 lines hidden …");
    expect(collapsed).toContain("{comment: Chorus}");
  });
});
