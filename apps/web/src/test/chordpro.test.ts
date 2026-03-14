import { describe, it, expect } from "vitest";
import { parseChordPro, toChordProString } from "@vpc-music/shared";

describe("parseChordPro", () => {
  it("extracts directives from the header", () => {
    const input = `{title: Amazing Grace}
{artist: John Newton}
{key: G}`;
    const doc = parseChordPro(input);
    expect(doc.directives).toEqual({
      title: "Amazing Grace",
      artist: "John Newton",
      key: "G",
    });
    expect(doc.sections).toHaveLength(0);
  });

  it("parses inline chords into structured objects", () => {
    const input = `[G]Amazing [C]grace how [G]sweet the sound`;
    const doc = parseChordPro(input);
    expect(doc.sections).toHaveLength(1);
    const line = doc.sections[0].lines[0];
    expect(line.lyrics).toBe("Amazing grace how sweet the sound");
    expect(line.chords).toEqual([
      { chord: "G", position: 0 },
      { chord: "C", position: 8 },
      { chord: "G", position: 18 },
    ]);
  });

  it("handles comment directives as section names", () => {
    const input = `{comment: Verse 1}
[G]Amazing [C]grace

{comment: Chorus}
[D]Through many [G]dangers`;
    const doc = parseChordPro(input);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].name).toBe("Verse 1");
    expect(doc.sections[1].name).toBe("Chorus");
  });

  it("handles start_of_chorus / end_of_chorus", () => {
    const input = `{soc}
[G]Praise the Lord
{eoc}`;
    const doc = parseChordPro(input);
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].name).toBe("Chorus");
  });

  it("splits on blank lines as section breaks", () => {
    const input = `[G]Line one

[D]Line two`;
    const doc = parseChordPro(input);
    expect(doc.sections).toHaveLength(2);
  });

  it("returns empty sections for empty input", () => {
    const doc = parseChordPro("");
    expect(doc.directives).toEqual({});
    expect(doc.sections).toHaveLength(0);
  });

  it("handles lines with no chords", () => {
    const input = "Just plain lyrics";
    const doc = parseChordPro(input);
    expect(doc.sections[0].lines[0].lyrics).toBe("Just plain lyrics");
    expect(doc.sections[0].lines[0].chords).toEqual([]);
  });
});

describe("toChordProString", () => {
  it("round-trips a simple document", () => {
    const input = `{title: Test Song}
{key: G}

{comment: Verse 1}
[G]Hello [C]world`;
    const doc = parseChordPro(input);
    const output = toChordProString(doc);
    expect(output).toContain("{title: Test Song}");
    expect(output).toContain("{key: G}");
    expect(output).toContain("{comment: Verse 1}");
    expect(output).toContain("[G]Hello [C]world");
  });

  it("preserves directives in output", () => {
    const doc = {
      directives: { title: "My Song", artist: "Me" },
      sections: [],
    };
    const output = toChordProString(doc);
    expect(output).toContain("{title: My Song}");
    expect(output).toContain("{artist: Me}");
  });
});
