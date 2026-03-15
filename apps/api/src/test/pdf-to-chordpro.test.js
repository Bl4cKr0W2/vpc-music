import { describe, it, expect, vi } from "vitest";
import {
  detectColumns,
  assembleLines,
  classifyLines,
  alignChordsToLyrics,
  extractMetadata,
  enhanceSectionDetection,
  convertPlainTextToChordPro,
} from "../../src/features/songs/pdfToChordPro.js";

// ── Test data helpers ───────────────────────────────────────────

function makeElement(text, x, y, opts = {}) {
  return {
    text,
    x,
    y,
    width: opts.width ?? text.length * 7,
    height: opts.height ?? 14,
    fontName: opts.fontName ?? "Helvetica",
    fontSize: opts.fontSize ?? 12,
    fontIsBold: opts.fontIsBold ?? false,
    fontIsItalic: opts.fontIsItalic ?? false,
    pageIndex: opts.pageIndex ?? 0,
  };
}

// ── Column Detection ────────────────────────────────────────────

describe("detectColumns", () => {
  it("returns elements unchanged for single-column layout", () => {
    const elements = [
      makeElement("Line 1", 50, 10),
      makeElement("Line 2", 50, 24),
      makeElement("Line 3", 55, 38),
    ];
    const result = detectColumns(elements);
    expect(result).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(detectColumns([])).toEqual([]);
  });

  it("splits two-column layout into left-first then right", () => {
    // Left column elements
    const left1 = makeElement("Left 1", 50, 10);
    const left2 = makeElement("Left 2", 50, 24);
    // Right column elements
    const right1 = makeElement("Right 1", 350, 10);
    const right2 = makeElement("Right 2", 350, 24);
    // Interleave them (as they might appear unsorted from extraction)
    const elements = [left1, right1, left2, right2];

    const result = detectColumns(elements);
    // Left column should come first
    expect(result[0].text).toBe("Left 1");
    expect(result[1].text).toBe("Left 2");
    expect(result[2].text).toBe("Right 1");
    expect(result[3].text).toBe("Right 2");
  });
});

// ── Line Assembly ───────────────────────────────────────────────

describe("assembleLines", () => {
  it("groups elements on the same baseline into one line", () => {
    const elements = [
      makeElement("Hello", 50, 10),
      makeElement("World", 100, 10),
    ];
    const lines = assembleLines(elements);
    expect(lines).toHaveLength(1);
    expect(lines[0].elements).toHaveLength(2);
  });

  it("separates elements on different baselines", () => {
    const elements = [
      makeElement("Line 1", 50, 10),
      makeElement("Line 2", 50, 30),
    ];
    const lines = assembleLines(elements);
    expect(lines).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(assembleLines([])).toEqual([]);
  });

  it("sorts elements within a line by x position", () => {
    const elements = [
      makeElement("World", 100, 10),
      makeElement("Hello", 50, 10),
    ];
    const lines = assembleLines(elements);
    expect(lines[0].elements[0].text).toBe("Hello");
    expect(lines[0].elements[1].text).toBe("World");
  });

  it("handles multi-page elements", () => {
    const elements = [
      makeElement("Page 1", 50, 10, { pageIndex: 0 }),
      makeElement("Page 2", 50, 10, { pageIndex: 1 }),
    ];
    const lines = assembleLines(elements);
    expect(lines).toHaveLength(2);
    expect(lines[0].pageIndex).toBe(0);
    expect(lines[1].pageIndex).toBe(1);
  });
});

// ── Chord-Line Classification ───────────────────────────────────

describe("classifyLines", () => {
  it("classifies a chord-only line as 'chord'", () => {
    const lines = [{
      elements: [
        makeElement("G", 50, 10),
        makeElement("C", 120, 10),
        makeElement("D", 200, 10),
      ],
      y: 10,
      pageIndex: 0,
    }];
    const result = classifyLines(lines);
    expect(result[0].type).toBe("chord");
  });

  it("classifies lyric text as 'lyric'", () => {
    const lines = [{
      elements: [makeElement("Amazing grace how sweet the sound", 50, 10)],
      y: 10,
      pageIndex: 0,
    }];
    const result = classifyLines(lines);
    expect(result[0].type).toBe("lyric");
  });

  it("classifies section headers as 'section'", () => {
    const texts = ["Verse 1", "Chorus", "Bridge", "Pre-Chorus", "Intro", "Outro", "Tag"];
    for (const text of texts) {
      const lines = [{
        elements: [makeElement(text, 50, 10)],
        y: 10,
        pageIndex: 0,
      }];
      const result = classifyLines(lines);
      expect(result[0].type).toBe("section");
    }
  });

  it("classifies empty text as 'empty'", () => {
    const lines = [{
      elements: [],
      y: 10,
      pageIndex: 0,
    }];
    const result = classifyLines([{
      elements: [makeElement("", 50, 10)],
      y: 10,
      pageIndex: 0,
    }]);
    // Empty text after trim
    expect(result[0].type).toBe("empty");
  });

  it("classifies mixed chord+lyric tokens as 'lyric' when chord ratio < 60%", () => {
    const lines = [{
      elements: [makeElement("G is a great chord to play", 50, 10)],
      y: 10,
      pageIndex: 0,
    }];
    const result = classifyLines(lines);
    expect(result[0].type).toBe("lyric");
  });
});

// ── Chord-to-Lyric Alignment ───────────────────────────────────

describe("alignChordsToLyrics", () => {
  it("merges chord + lyric pair into ChordPro format", () => {
    const classified = [
      {
        type: "chord",
        text: "G C",
        elements: [
          makeElement("G", 50, 10, { width: 10 }),
          makeElement("C", 150, 10, { width: 10 }),
        ],
        y: 10,
      },
      {
        type: "lyric",
        text: "Amazing grace how sweet",
        elements: [
          makeElement("Amazing grace how sweet", 50, 24, { width: 170 }),
        ],
        y: 24,
      },
    ];
    const result = alignChordsToLyrics(classified);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("[G]");
    expect(result[0]).toContain("[C]");
  });

  it("handles chord-only line (instrumental)", () => {
    const classified = [
      {
        type: "chord",
        text: "Em Am",
        elements: [
          makeElement("Em", 50, 10, { width: 14 }),
          makeElement("Am", 100, 10, { width: 14 }),
        ],
        y: 10,
      },
    ];
    const result = alignChordsToLyrics(classified);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("[Em]");
    expect(result[0]).toContain("[Am]");
  });

  it("converts section headers to {comment: ...} directives", () => {
    const classified = [
      { type: "section", text: "Verse 1", elements: [], y: 10 },
    ];
    const result = alignChordsToLyrics(classified);
    expect(result[0]).toBe("{comment: Verse 1}");
  });

  it("passes through standalone lyric lines unchanged", () => {
    const classified = [
      {
        type: "lyric",
        text: "A lovely melody",
        elements: [makeElement("A lovely melody", 50, 10)],
        y: 10,
      },
    ];
    const result = alignChordsToLyrics(classified);
    expect(result[0]).toBe("A lovely melody");
  });

  it("preserves empty lines", () => {
    const classified = [
      { type: "empty", text: "", elements: [], y: 10 },
    ];
    const result = alignChordsToLyrics(classified);
    expect(result[0]).toBe("");
  });
});

// ── Metadata Extraction ─────────────────────────────────────────

describe("extractMetadata", () => {
  it("extracts title from largest font in top zone", () => {
    const elements = [
      makeElement("Amazing Grace", 50, 10, { fontSize: 24, fontIsBold: true }),
      makeElement("Verse 1", 50, 100, { fontSize: 12 }),
      makeElement("Lyrics here", 50, 200, { fontSize: 12 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.title).toBe("Amazing Grace");
  });

  it("extracts key from 'Key: G' pattern", () => {
    const elements = [
      makeElement("Song Title", 50, 10, { fontSize: 20 }),
      makeElement("Key: G", 200, 10, { fontSize: 10 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.key).toBe("G");
  });

  it("extracts tempo from 'Tempo: 120' pattern", () => {
    const elements = [
      makeElement("Song", 50, 10, { fontSize: 20 }),
      makeElement("Tempo: 120", 200, 10, { fontSize: 10 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.tempo).toBe(120);
  });

  it("extracts BPM from '90 BPM' pattern", () => {
    const elements = [
      makeElement("Song", 50, 10, { fontSize: 20 }),
      makeElement("90 BPM", 200, 10, { fontSize: 10 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.tempo).toBe(90);
  });

  it("extracts artist from 'By ...' pattern", () => {
    const elements = [
      makeElement("Song", 50, 10, { fontSize: 20 }),
      makeElement("By John Newton", 50, 30, { fontSize: 10 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.artist).toBe("John Newton");
  });

  it("extracts copyright", () => {
    const elements = [
      makeElement("Song", 50, 10, { fontSize: 20 }),
      makeElement("© 2024 My Publishing", 50, 30, { fontSize: 8 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.copyright).toBe("© 2024 My Publishing");
  });

  it("returns defaults for empty input", () => {
    const meta = extractMetadata([]);
    expect(meta.title).toBe("");
    expect(meta.key).toBe("");
    expect(meta.tempo).toBeNull();
    expect(meta.artist).toBe("");
  });

  it("falls back to first element text if no large font found", () => {
    const elements = [
      makeElement("Fallback Title", 50, 10, { fontSize: 12 }),
    ];
    const meta = extractMetadata(elements);
    expect(meta.title).toBe("Fallback Title");
  });
});

// ── Section Detection Enhancement ───────────────────────────────

describe("enhanceSectionDetection", () => {
  it("reclassifies bold short text as section if matching pattern", () => {
    const lines = [
      {
        type: "lyric",
        text: "V1",
        elements: [makeElement("V1", 50, 10, { fontIsBold: true })],
        y: 10,
      },
    ];
    const result = enhanceSectionDetection(lines);
    expect(result[0].type).toBe("section");
  });

  it("does not reclassify non-bold lyric lines", () => {
    const lines = [
      {
        type: "lyric",
        text: "V1",
        elements: [makeElement("V1", 50, 10, { fontIsBold: false })],
        y: 10,
      },
    ];
    const result = enhanceSectionDetection(lines);
    expect(result[0].type).toBe("lyric");
  });

  it("leaves chord lines untouched", () => {
    const lines = [
      {
        type: "chord",
        text: "G C D",
        elements: [makeElement("G C D", 50, 10, { fontIsBold: true })],
        y: 10,
      },
    ];
    const result = enhanceSectionDetection(lines);
    expect(result[0].type).toBe("chord");
  });
});

// ── Plain Text Fallback Conversion ──────────────────────────────

describe("convertPlainTextToChordPro", () => {
  it("wraps title in {title:} directive", () => {
    const text = "Amazing Grace\n\nG     C\nAmazing Grace";
    const result = convertPlainTextToChordPro(text);
    expect(result.chordPro).toContain("{title: Amazing Grace}");
    expect(result.metadata.title).toBe("Amazing Grace");
  });

  it("merges chord lines with lyric lines below", () => {
    // "G" at col 0, "C" at col 6 → inserts [G] at start and [C] at col 6 in lyric
    const text = "My Song\n\nG     C\nAmazing Grace";
    const result = convertPlainTextToChordPro(text);
    expect(result.chordPro).toContain("[G]");
    expect(result.chordPro).toContain("[C]");
    expect(result.chordPro).toContain("Grace");
  });

  it("handles chord-only instrumental lines", () => {
    const text = "My Song\n\nG C D Em";
    const result = convertPlainTextToChordPro(text);
    expect(result.chordPro).toContain("[G]");
    expect(result.chordPro).toContain("[D]");
  });

  it("detects section headers", () => {
    const text = "My Song\n\nVerse 1\nG\nLyrics";
    const result = convertPlainTextToChordPro(text);
    expect(result.chordPro).toContain("{comment: Verse 1}");
  });

  it("handles empty text gracefully", () => {
    const result = convertPlainTextToChordPro("");
    expect(result.chordPro).toContain("{title: Untitled}");
  });

  it("handles single-line text", () => {
    const result = convertPlainTextToChordPro("Just a title");
    expect(result.chordPro).toContain("{title: Just a title}");
  });
});

// ── Integration: full pipeline simulation ───────────────────────

describe("pipeline integration", () => {
  it("processes elements through detect → assemble → classify → align", () => {
    // Simulate a simple song page
    const elements = [
      // Title
      makeElement("Amazing Grace", 50, 10, { fontSize: 24, fontIsBold: true }),
      // Section header
      makeElement("Verse 1", 50, 40, { fontSize: 12, fontIsBold: true }),
      // Chord line
      makeElement("G", 50, 60, { width: 10 }),
      makeElement("C", 130, 60, { width: 10 }),
      // Lyric line
      makeElement("Amazing grace how sweet the sound", 50, 74, { width: 220 }),
      // Another chord line
      makeElement("D", 50, 100, { width: 10 }),
      makeElement("G", 130, 100, { width: 10 }),
      // Another lyric line
      makeElement("That saved a wretch like me", 50, 114, { width: 180 }),
    ];

    const ordered = detectColumns(elements);
    const lines = assembleLines(ordered);
    let classified = classifyLines(lines);
    classified = enhanceSectionDetection(classified);
    const chordProLines = alignChordsToLyrics(classified);
    const metadata = extractMetadata(elements);

    expect(metadata.title).toBe("Amazing Grace");
    expect(chordProLines.length).toBeGreaterThan(0);

    // Should have section header as comment
    const sectionLine = chordProLines.find((l) => l.includes("{comment:"));
    expect(sectionLine).toBeDefined();
    expect(sectionLine).toContain("Verse 1");

    // Should have merged chord+lyric lines
    const chordProLine = chordProLines.find(
      (l) => l.includes("[G]") || l.includes("[C]")
    );
    expect(chordProLine).toBeDefined();
  });
});
