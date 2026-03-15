/**
 * pdfToChordPro.js — Geometry-aware PDF → ChordPro conversion pipeline.
 *
 * Implements the 8-step blueprint from the roadmap:
 *  1. Extract text with coordinates (via PDF.co API)
 *  2. Column detection
 *  3. Line assembly
 *  4. Chord-line classification
 *  5. Chord-to-word alignment
 *  6. Metadata extraction
 *  7. Section detection
 *  8. (User review — handled by the frontend)
 */

import { env } from "../../config/env.js";

// ─── Chord pattern (used for classification) ────────────────────────────────
const CHORD_TOKEN_RE =
  /^[A-G][b#]?(m|min|maj|dim|aug|sus[24]?|add|M|Maj7?|maj7?)?[0-9]*(\/[A-G][b#]?)?$/;

const SECTION_KEYWORDS =
  /^(Verse|Chorus|Bridge|Pre[- ]?Chorus|Intro|Outro|Tag|Interlude|Instrumental|Coda|Ending|Refrain|Hook|Vamp|Turnaround)\s*\d*[.:]*$/i;

// ─── Step 1: Extract text with coordinates via PDF.co ───────────────────────

/**
 * Call PDF.co to extract structured text from a PDF buffer.
 * Returns an array of text elements with coordinates.
 *
 * @param {Buffer} pdfBuffer — the PDF file contents
 * @returns {Promise<Array<{text: string, x: number, y: number, width: number, height: number, fontName: string, fontSize: number, fontIsBold: boolean, fontIsItalic: boolean, pageIndex: number}>>}
 */
export async function extractTextFromPdf(pdfBuffer) {
  const apiKey = env.PDF_CO_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PDF.co API key is not configured. Set PDF_CO_API_KEY in your environment.",
    );
  }

  // Step 1a: Upload the PDF to get a temporary URL
  const uploadRes = await fetch(
    "https://api.pdf.co/v1/file/upload/base64",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: pdfBuffer.toString("base64"),
        name: "upload.pdf",
      }),
    },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text().catch(() => "");
    throw new Error(`PDF.co upload failed (${uploadRes.status}): ${err}`);
  }

  const { url: fileUrl } = await uploadRes.json();

  // Step 1b: Extract text with coordinates
  const extractRes = await fetch(
    "https://api.pdf.co/v1/pdf/convert/to/json2",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fileUrl,
        inline: true,
      }),
    },
  );

  if (!extractRes.ok) {
    const err = await extractRes.text().catch(() => "");
    throw new Error(`PDF.co extraction failed (${extractRes.status}): ${err}`);
  }

  const result = await extractRes.json();

  // PDF.co /json2 returns { body: { document: { page: [...] } } }
  // Each page has: { row: [...] } where each row has: { column: [...] }
  // Each column has: { text, rect: { x, y, width, height }, fontName, fontSize, ... }

  const elements = [];

  const pages = result?.body?.document?.page;
  if (!pages) {
    // Fallback: try alternative response structures
    return fallbackTextExtraction(result);
  }

  const pageArray = Array.isArray(pages) ? pages : [pages];

  for (let pageIndex = 0; pageIndex < pageArray.length; pageIndex++) {
    const page = pageArray[pageIndex];
    const rows = page?.row;
    if (!rows) continue;
    const rowArray = Array.isArray(rows) ? rows : [rows];

    for (const row of rowArray) {
      const columns = row?.column;
      if (!columns) continue;
      const colArray = Array.isArray(columns) ? columns : [columns];

      for (const col of colArray) {
        const text = col?.text ?? col?.value ?? "";
        if (!text || !text.trim()) continue;

        const rect = col?.rect || {};
        elements.push({
          text: text,
          x: parseFloat(rect?.x ?? col?.x ?? 0),
          y: parseFloat(rect?.y ?? col?.y ?? 0),
          width: parseFloat(rect?.width ?? col?.width ?? 0),
          height: parseFloat(rect?.height ?? col?.height ?? 0),
          fontName: col?.fontName || col?.font || "",
          fontSize: parseFloat(col?.fontSize || col?.size || 0),
          fontIsBold: Boolean(
            col?.fontIsBold ??
              col?.bold ??
              (col?.fontName || "").toLowerCase().includes("bold"),
          ),
          fontIsItalic: Boolean(
            col?.fontIsItalic ??
              col?.italic ??
              (col?.fontName || "").toLowerCase().includes("italic"),
          ),
          pageIndex,
        });
      }
    }
  }

  return elements;
}

/**
 * Fallback: if the JSON structure doesn't match expectations, try to extract
 * text in a simpler format (plain text with basic line splitting).
 */
function fallbackTextExtraction(result) {
  // Try body.text or result.text
  const plainText =
    result?.body?.text || result?.text || result?.body || "";
  if (typeof plainText === "string" && plainText.trim()) {
    const lines = plainText.split("\n");
    return lines.map((line, i) => ({
      text: line,
      x: 0,
      y: i * 14, // approximate 14pt line spacing
      width: line.length * 7,
      height: 14,
      fontName: "",
      fontSize: 12,
      fontIsBold: false,
      fontIsItalic: false,
      pageIndex: 0,
    }));
  }
  return [];
}

// ─── Step 2: Column detection ───────────────────────────────────────────────

/**
 * Detect if the PDF has two columns and split elements accordingly.
 * Returns elements ordered: left column first (top-to-bottom), then right.
 *
 * @param {Array} elements
 * @returns {Array} ordered elements
 */
export function detectColumns(elements) {
  if (elements.length === 0) return elements;

  // Find x-coordinate distribution
  const xValues = elements.map((e) => e.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const pageWidth = maxX - minX;

  if (pageWidth < 100) {
    // All text roughly in same area → single column
    return elements;
  }

  // Look for a gap (gutter) in the middle of the page
  const midX = minX + pageWidth / 2;
  const gutterLeftBound = midX - pageWidth * 0.1;
  const gutterRightBound = midX + pageWidth * 0.1;

  // Count elements in left, gutter, and right zones
  let leftCount = 0;
  let rightCount = 0;
  let gutterCount = 0;

  for (const el of elements) {
    if (el.x < gutterLeftBound) leftCount++;
    else if (el.x > gutterRightBound) rightCount++;
    else gutterCount++;
  }

  // Two-column layout: both sides have significant content, gutter is sparse
  const isMultiColumn =
    leftCount > elements.length * 0.2 &&
    rightCount > elements.length * 0.2 &&
    gutterCount < elements.length * 0.15;

  if (!isMultiColumn) {
    return elements;
  }

  // Split into left and right columns
  const gutterX = midX;
  const leftElements = elements.filter((e) => e.x < gutterX);
  const rightElements = elements.filter((e) => e.x >= gutterX);

  // Sort each column top-to-bottom
  leftElements.sort((a, b) => a.y - b.y || a.x - b.x);
  rightElements.sort((a, b) => a.y - b.y || a.x - b.x);

  return [...leftElements, ...rightElements];
}

// ─── Step 3: Line assembly ──────────────────────────────────────────────────

/**
 * Group text elements by baseline proximity (same y ≈ same line).
 * Returns an array of "assembled lines", each an array of elements sorted by x.
 *
 * @param {Array} elements
 * @returns {Array<{elements: Array, y: number, pageIndex: number}>}
 */
export function assembleLines(elements) {
  if (elements.length === 0) return [];

  // Sort by page, then y, then x
  const sorted = [...elements].sort(
    (a, b) => a.pageIndex - b.pageIndex || a.y - b.y || a.x - b.x,
  );

  const lines = [];
  let currentLine = [sorted[0]];
  let currentY = sorted[0].y;
  let currentPage = sorted[0].pageIndex;

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    // Same line if within ~60% of the element's height
    const tolerance = Math.max(el.height * 0.6, 3);

    if (el.pageIndex === currentPage && Math.abs(el.y - currentY) <= tolerance) {
      currentLine.push(el);
    } else {
      // Finalize current line (sort by x)
      currentLine.sort((a, b) => a.x - b.x);
      lines.push({
        elements: currentLine,
        y: currentY,
        pageIndex: currentPage,
      });
      currentLine = [el];
      currentY = el.y;
      currentPage = el.pageIndex;
    }
  }

  // Push last line
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push({
      elements: currentLine,
      y: currentY,
      pageIndex: currentPage,
    });
  }

  return lines;
}

// ─── Step 4: Chord-line classification ──────────────────────────────────────

/**
 * Classify each assembled line as "chord", "lyric", "section", or "metadata".
 *
 * @param {Array<{elements: Array, y: number}>} lines
 * @returns {Array<{type: string, text: string, elements: Array, y: number}>}
 */
export function classifyLines(lines) {
  return lines.map((line) => {
    const fullText = line.elements.map((e) => e.text).join(" ").trim();

    // Section headers
    if (SECTION_KEYWORDS.test(fullText)) {
      return { ...line, type: "section", text: fullText };
    }

    // Chord line: most tokens are chord-like, typically short words with wider spacing
    const tokens = fullText.split(/\s+/).filter(Boolean);
    const chordTokens = tokens.filter((t) => CHORD_TOKEN_RE.test(t));
    const chordRatio = tokens.length > 0 ? chordTokens.length / tokens.length : 0;

    // A line is "chord" if ≥60% of tokens are chords and there are some
    if (chordRatio >= 0.6 && chordTokens.length > 0) {
      return { ...line, type: "chord", text: fullText };
    }

    // Empty line
    if (!fullText) {
      return { ...line, type: "empty", text: "" };
    }

    // Default: lyric
    return { ...line, type: "lyric", text: fullText };
  });
}

// ─── Step 5: Chord-to-word alignment ────────────────────────────────────────

/**
 * Merge consecutive chord + lyric lines by aligning chord x-positions to
 * the lyric text. Produces ChordPro-formatted lines.
 *
 * @param {Array} classifiedLines
 * @returns {string[]} — ChordPro-formatted lyric lines
 */
export function alignChordsToLyrics(classifiedLines) {
  const result = [];
  let i = 0;

  while (i < classifiedLines.length) {
    const line = classifiedLines[i];

    if (line.type === "chord") {
      // Check if next line is a lyric line (chord-over-lyric pair)
      if (
        i + 1 < classifiedLines.length &&
        classifiedLines[i + 1].type === "lyric"
      ) {
        const chordLine = line;
        const lyricLine = classifiedLines[i + 1];

        const merged = mergeChordAndLyricLines(chordLine, lyricLine);
        result.push(merged);
        i += 2;
      } else {
        // Chord-only line (instrumental)
        const chords = line.elements
          .map((e) => e.text.trim())
          .filter((t) => CHORD_TOKEN_RE.test(t))
          .map((t) => `[${t}]`);
        result.push(chords.join(" ") || line.text);
        i++;
      }
    } else if (line.type === "section") {
      result.push(`{comment: ${line.text}}`);
      i++;
    } else if (line.type === "empty") {
      result.push("");
      i++;
    } else {
      // Lyric line without preceding chords
      result.push(line.text);
      i++;
    }
  }

  return result;
}

/**
 * Merge a chord line with the lyric line below it, inserting [Chord] at
 * the appropriate positions based on x-coordinate alignment.
 */
function mergeChordAndLyricLines(chordLine, lyricLine) {
  // Build the lyric string from individual elements
  const lyricText = rebuildTextFromElements(lyricLine.elements);
  const chordElements = chordLine.elements.filter((e) =>
    CHORD_TOKEN_RE.test(e.text.trim()),
  );

  if (chordElements.length === 0) return lyricText;

  // Map lyric character positions from element x-coordinates
  const charPositions = buildCharPositionMap(lyricLine.elements);

  // Sort chords by x position (left to right)
  chordElements.sort((a, b) => a.x - b.x);

  // Insert chords into the lyric text at mapped character positions
  let output = lyricText;
  let offset = 0;

  for (const chord of chordElements) {
    const chordX = chord.x;
    // Find the closest character position in the lyric text
    const charIdx = findClosestCharIndex(charPositions, chordX);
    const insertAt = Math.min(charIdx + offset, output.length);
    const bracket = `[${chord.text.trim()}]`;
    output = output.slice(0, insertAt) + bracket + output.slice(insertAt);
    offset += bracket.length;
  }

  return output;
}

/**
 * Rebuild a text string from elements, respecting gaps between elements.
 */
function rebuildTextFromElements(elements) {
  if (elements.length === 0) return "";
  if (elements.length === 1) return elements[0].text;

  let text = elements[0].text;
  for (let i = 1; i < elements.length; i++) {
    const gap = elements[i].x - (elements[i - 1].x + elements[i - 1].width);
    // If there's a gap, add a space
    if (gap > 2) {
      text += " ";
    }
    text += elements[i].text;
  }
  return text;
}

/**
 * Build a mapping of character index → x position for a lyric line.
 */
function buildCharPositionMap(elements) {
  const positions = [];
  let charIdx = 0;

  for (let eIdx = 0; eIdx < elements.length; eIdx++) {
    const el = elements[eIdx];
    const charWidth = el.width / Math.max(el.text.length, 1);

    for (let c = 0; c < el.text.length; c++) {
      positions.push({
        charIdx,
        x: el.x + c * charWidth,
      });
      charIdx++;
    }

    // Add space between elements if gap exists
    if (eIdx < elements.length - 1) {
      const gap = elements[eIdx + 1].x - (el.x + el.width);
      if (gap > 2) {
        positions.push({
          charIdx,
          x: el.x + el.width,
        });
        charIdx++;
      }
    }
  }

  return positions;
}

/**
 * Find the closest character index for a given x position.
 */
function findClosestCharIndex(charPositions, targetX) {
  if (charPositions.length === 0) return 0;

  let closest = 0;
  let minDist = Infinity;

  for (const { charIdx, x } of charPositions) {
    const dist = Math.abs(x - targetX);
    if (dist < minDist) {
      minDist = dist;
      closest = charIdx;
    }
  }

  return closest;
}

// ─── Step 6: Metadata extraction ────────────────────────────────────────────

/**
 * Extract title, key, tempo, artist, and copyright from the text elements.
 * The title is typically the largest/boldest text near the top of page 1.
 *
 * @param {Array} elements — raw text elements with coordinates
 * @returns {{ title: string, key: string, tempo: number|null, artist: string, copyright: string }}
 */
export function extractMetadata(elements) {
  const result = {
    title: "",
    key: "",
    tempo: null,
    artist: "",
    copyright: "",
  };

  if (elements.length === 0) return result;

  // Page 1 elements only, sorted by y then x
  const page1 = elements
    .filter((e) => e.pageIndex === 0)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  if (page1.length === 0) return result;

  // Title: largest font size in the top 20% of the page
  const maxY = Math.max(...page1.map((e) => e.y));
  const topZone = page1.filter((e) => e.y < maxY * 0.2);
  if (topZone.length > 0) {
    // Find element(s) with largest font
    const maxFontSize = Math.max(...topZone.map((e) => e.fontSize));
    const titleElements = topZone.filter(
      (e) => e.fontSize >= maxFontSize * 0.9 || e.fontIsBold,
    );
    result.title = titleElements.map((e) => e.text).join(" ").trim();
  }

  // If no title found from font analysis, use first non-empty line
  if (!result.title) {
    result.title = page1[0]?.text?.trim() || "Untitled";
  }

  // Scan all page1 elements for key, tempo, artist patterns
  for (const el of page1) {
    const text = el.text.trim();

    // Key: "Key: G", "Key of G", "Key = Bb"
    const keyMatch = text.match(
      /Key[\s:=of]+([A-G][b#]?(?:\s*(?:m|min|maj))?)/i,
    );
    if (keyMatch && !result.key) {
      result.key = keyMatch[1].trim();
    }

    // Tempo: "Tempo: 120", "BPM: 120", "♩ = 120", "120 BPM"
    const tempoMatch = text.match(
      /(?:Tempo|BPM|♩)\s*[:=]?\s*(\d{2,3})|(\d{2,3})\s*BPM/i,
    );
    if (tempoMatch && !result.tempo) {
      result.tempo = parseInt(tempoMatch[1] || tempoMatch[2], 10);
    }

    // Artist / Author: "By ...", "Artist: ...", "Words & Music by ..."
    const artistMatch = text.match(
      /(?:By|Artist|Author|Words\s*(?:&|and)\s*Music\s*by)[:\s]+(.+)/i,
    );
    if (artistMatch && !result.artist) {
      result.artist = artistMatch[1].trim();
    }

    // Copyright: "©" or "Copyright"
    if (/(?:©|Copyright)/i.test(text) && !result.copyright) {
      result.copyright = text;
    }
  }

  return result;
}

// ─── Step 7: Section detection (enhance line classification) ────────────────

/**
 * Enhance classified lines by detecting section markers from bold/italic
 * text that may not match the keyword regex exactly.
 *
 * @param {Array} classifiedLines
 * @returns {Array} — same lines with improved section detection
 */
export function enhanceSectionDetection(classifiedLines) {
  return classifiedLines.map((line) => {
    if (line.type !== "lyric") return line;

    // Re-check: if the line is a short bold/italic text, might be a section header
    const isMostlyBold = line.elements.every((e) => e.fontIsBold);
    const text = line.text.trim();

    if (
      isMostlyBold &&
      text.length < 40 &&
      !CHORD_TOKEN_RE.test(text.split(/\s+/)[0] || "")
    ) {
      // Likely a section header even if it doesn't match exact keywords
      // e.g. "V1", "Ch", "Br", etc.
      if (
        SECTION_KEYWORDS.test(text) ||
        /^(V|Ch|Br|Pre|Int|Out)\s*\d*[.:]*$/i.test(text)
      ) {
        return { ...line, type: "section", text };
      }
    }

    return line;
  });
}

// ─── Main pipeline: full conversion ─────────────────────────────────────────

/**
 * Convert a PDF buffer to ChordPro format using the full 8-step pipeline.
 *
 * @param {Buffer} pdfBuffer — the PDF file contents
 * @returns {Promise<{ chordPro: string, metadata: { title: string, key: string, tempo: number|null, artist: string, copyright: string } }>}
 */
export async function convertPdfToChordPro(pdfBuffer) {
  // Step 1: Extract text with coordinates
  const elements = await extractTextFromPdf(pdfBuffer);

  if (elements.length === 0) {
    throw new Error(
      "No text could be extracted from the PDF. The file may be scanned/image-based.",
    );
  }

  // Step 2: Column detection
  const orderedElements = detectColumns(elements);

  // Step 3: Line assembly
  const assembledLines = assembleLines(orderedElements);

  // Step 4: Chord-line classification
  let classifiedLines = classifyLines(assembledLines);

  // Step 7 (early): Enhance section detection with font info
  classifiedLines = enhanceSectionDetection(classifiedLines);

  // Step 5: Chord-to-word alignment → ChordPro lines
  const chordProLines = alignChordsToLyrics(classifiedLines);

  // Step 6: Metadata extraction
  const metadata = extractMetadata(elements);

  // Build ChordPro document
  const directives = [];
  directives.push(`{title: ${metadata.title || "Untitled"}}`);
  if (metadata.artist) directives.push(`{artist: ${metadata.artist}}`);
  if (metadata.key) directives.push(`{key: ${metadata.key}}`);
  if (metadata.tempo) directives.push(`{tempo: ${metadata.tempo}}`);
  if (metadata.copyright) directives.push(`{copyright: ${metadata.copyright}}`);

  // Remove title line from body if it matches the extracted title
  let bodyLines = chordProLines;
  if (
    metadata.title &&
    bodyLines.length > 0 &&
    bodyLines[0].trim().toLowerCase() === metadata.title.toLowerCase()
  ) {
    bodyLines = bodyLines.slice(1);
  }

  // Also remove metadata-like lines from the body (key, tempo, artist info)
  bodyLines = bodyLines.filter((line) => {
    const trimmed = line.trim();
    if (/^Key[\s:=]/i.test(trimmed)) return false;
    if (/^(?:Tempo|BPM)/i.test(trimmed)) return false;
    if (/^(?:By|Artist|Author|Words\s*(?:&|and)\s*Music)/i.test(trimmed))
      return false;
    if (/^(?:©|Copyright)/i.test(trimmed)) return false;
    return true;
  });

  const chordPro = [
    ...directives,
    "",
    ...bodyLines,
  ].join("\n");

  return { chordPro, metadata };
}

// ─── Fallback pipeline: text-only (no coordinates) ──────────────────────────

/**
 * Convert plain text extracted from a PDF into ChordPro format.
 * Used when coordinate-based extraction fails or returns flat text.
 *
 * @param {string} text — the plain text from the PDF
 * @returns {{ chordPro: string, metadata: { title: string, key: string, tempo: number|null, artist: string } }}
 */
export function convertPlainTextToChordPro(text) {
  const lines = text.split("\n");
  const title = lines[0]?.trim() || "Untitled";

  const convertedLines = [];
  let i = 0;

  // Skip title line
  if (lines[0]?.trim() === title) i = 1;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Section header?
    if (SECTION_KEYWORDS.test(trimmed)) {
      convertedLines.push(`{comment: ${trimmed}}`);
      i++;
      continue;
    }

    // Chord line?
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const chordTokens = tokens.filter((t) => CHORD_TOKEN_RE.test(t));
    const isChordLine =
      tokens.length > 0 && chordTokens.length / tokens.length >= 0.6;

    if (isChordLine && i + 1 < lines.length && lines[i + 1]?.trim()) {
      // Merge chord + lyric
      const positions = [];
      for (const match of line.matchAll(/\S+/g)) {
        positions.push({ chord: match[0], col: match.index });
      }

      let lyric = lines[i + 1];
      let offset = 0;
      for (const { chord, col } of positions) {
        if (!CHORD_TOKEN_RE.test(chord)) continue;
        const insertAt = Math.min(col + offset, lyric.length);
        const bracket = `[${chord}]`;
        lyric = lyric.slice(0, insertAt) + bracket + lyric.slice(insertAt);
        offset += bracket.length;
      }
      convertedLines.push(lyric);
      i += 2;
    } else if (isChordLine) {
      // Chord-only
      convertedLines.push(
        tokens
          .map((t) => (CHORD_TOKEN_RE.test(t) ? `[${t}]` : t))
          .join(" "),
      );
      i++;
    } else {
      convertedLines.push(trimmed);
      i++;
    }
  }

  const chordPro = `{title: ${title}}\n\n${convertedLines.join("\n")}`;
  return {
    chordPro,
    metadata: { title, key: "", tempo: null, artist: "" },
  };
}
