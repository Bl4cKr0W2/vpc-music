import { describe, expect, it } from "vitest";
import { buildArrangementContent, buildArrangementSummary, getArrangementSectionChoices } from "@/utils/chordpro-arrangement";

const SOURCE = `{title: Test}
{artist: Someone}
{key: G}

{comment: Verse 1}
[G]Amazing grace
How sweet the sound

{comment: Chorus}
[C]I once was lost
But now am found`;

describe("chordpro-arrangement", () => {
  it("extracts named sections for the arrangement builder", () => {
    const sections = getArrangementSectionChoices(SOURCE);
    expect(sections.map((section) => section.name)).toEqual(["Verse 1", "Chorus"]);
  });

  it("builds arrangement summaries with repeat markers", () => {
    const sections = getArrangementSectionChoices(SOURCE);
    const summary = buildArrangementSummary([
      { id: "a1", sectionId: sections[0].id, repeatCount: 1 },
      { id: "a2", sectionId: sections[1].id, repeatCount: 2 },
    ], sections);
    expect(summary).toBe("Verse 1 → Chorus ×2");
  });

  it("creates arrangement content without changing the metadata prefix", () => {
    const sections = getArrangementSectionChoices(SOURCE);
    const content = buildArrangementContent(SOURCE, [
      { id: "a1", sectionId: sections[1].id, repeatCount: 2 },
      { id: "a2", sectionId: sections[0].id, repeatCount: 1 },
    ]);
    expect(content.startsWith("{title: Test}\n{artist: Someone}\n{key: G}")).toBe(true);
    expect(content).toContain("{comment: Chorus ×2}");
    expect(content.indexOf("{comment: Chorus ×2}")).toBeLessThan(content.indexOf("{comment: Verse 1}"));
  });
});
