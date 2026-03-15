import { Router } from "express";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";
import { db } from "../../db.js";
import { songs, songVariations, songUsages, songEdits } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext, requireOrg } from "../../middlewares/orgContext.js";
import { chordProToOnSong, parseChordPro } from "@vpc-music/shared";
import { env } from "../../config/env.js";
import multer from "multer";
import { convertPdfToChordPro } from "./pdfToChordPro.js";

export const songRoutes = Router();

// ── Multer config for PDF uploads (10 MB limit, PDF only) ────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// ── GET /api/songs — list all songs (with optional search) ───
songRoutes.get(
  "/",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    const { q, tag, key: songKey, limit = "50", offset = "0" } = req.query;

    let query = db
      .select({
        id: songs.id,
        title: songs.title,
        key: songs.key,
        tempo: songs.tempo,
        artist: songs.artist,
        tags: songs.tags,
        isDraft: songs.isDraft,
        createdAt: songs.createdAt,
        updatedAt: songs.updatedAt,
      })
      .from(songs);

    const conditions = [];

    // Scope to organization if context available
    if (req.org) {
      conditions.push(eq(songs.organizationId, req.org.id));
    }

    if (q) {
      conditions.push(
        or(
          ilike(songs.title, `%${q}%`),
          ilike(songs.artist, `%${q}%`),
          ilike(songs.tags, `%${q}%`)
        )
      );
    }
    if (tag) {
      conditions.push(ilike(songs.tags, `%${tag}%`));
    }
    if (songKey) {
      conditions.push(eq(songs.key, songKey));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query
      .orderBy(desc(songs.updatedAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    // Get total count (scoped to org if available)
    const countConditions = req.org ? [eq(songs.organizationId, req.org.id)] : [];
    const [{ count }] = countConditions.length > 0
      ? await db.select({ count: sql`count(*)::int` }).from(songs).where(and(...countConditions))
      : await db.select({ count: sql`count(*)::int` }).from(songs);

    res.json({ songs: result, total: count });
  })
);

// ── GET /api/songs/:id — get single song ─────────────────────
songRoutes.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [song] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) {
      throw createError(404, "Song not found");
    }

    // Get variations
    const variations = await db
      .select()
      .from(songVariations)
      .where(eq(songVariations.songId, song.id));

    res.json({ song, variations });
  })
);

// ── POST /api/songs — create song ────────────────────────────
songRoutes.post(
  "/",
  auth,
  orgContext,
  requireOrg,
  asyncHandler(async (req, res) => {
    const { title, key, tempo, artist, year, tags, content, isDraft } = req.body;

    if (!title || !content) {
      throw createError(400, "Title and content are required");
    }

    const [song] = await db
      .insert(songs)
      .values({
        title,
        key: key || null,
        tempo: tempo ? parseInt(tempo, 10) : null,
        artist: artist || null,
        year: year || null,
        tags: tags || null,
        content,
        isDraft: isDraft ?? false,
        organizationId: req.org.id,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ song });
  })
);

// ── PUT /api/songs/:id — update song ─────────────────────────
songRoutes.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { title, key, tempo, artist, year, tags, content, isDraft } = req.body;

    const [existing] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!existing) {
      throw createError(404, "Song not found");
    }

    // Track field-level changes for edit history
    const trackedFields = { title, key, tempo, artist, year, tags, content, isDraft };
    const edits = [];
    for (const [field, newVal] of Object.entries(trackedFields)) {
      if (newVal === undefined) continue;
      const oldVal = existing[field];
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);
      if (oldStr !== newStr) {
        edits.push({
          songId: req.params.id,
          editedBy: req.user.id,
          field,
          oldValue: oldStr,
          newValue: newStr,
        });
      }
    }

    const [song] = await db
      .update(songs)
      .set({
        ...(title !== undefined && { title }),
        ...(key !== undefined && { key }),
        ...(tempo !== undefined && { tempo: tempo ? parseInt(tempo, 10) : null }),
        ...(artist !== undefined && { artist }),
        ...(year !== undefined && { year }),
        ...(tags !== undefined && { tags }),
        ...(content !== undefined && { content }),
        ...(isDraft !== undefined && { isDraft }),
        updatedAt: new Date(),
      })
      .where(eq(songs.id, req.params.id))
      .returning();

    // Record edit history
    if (edits.length > 0) {
      await db.insert(songEdits).values(edits);
    }

    res.json({ song });
  })
);

// ── DELETE /api/songs/:id — delete song ──────────────────────
songRoutes.delete(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!existing) {
      throw createError(404, "Song not found");
    }

    // Delete variations first
    await db
      .delete(songVariations)
      .where(eq(songVariations.songId, req.params.id));

    await db.delete(songs).where(eq(songs.id, req.params.id));

    res.json({ message: "Song deleted" });
  })
);

// ── GET /api/songs/:id/history — get edit history ────────────
songRoutes.get(
  "/:id/history",
  auth,
  asyncHandler(async (req, res) => {
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) {
      throw createError(404, "Song not found");
    }

    const history = await db
      .select()
      .from(songEdits)
      .where(eq(songEdits.songId, req.params.id))
      .orderBy(desc(songEdits.createdAt))
      .limit(100);

    res.json({ history });
  })
);

// ── POST /api/songs/import/chrd — import from .chrd format ──
songRoutes.post(
  "/import/chrd",
  auth,
  orgContext,
  requireOrg,
  asyncHandler(async (req, res) => {
    const { filename, content: rawContent } = req.body;

    if (!rawContent) {
      throw createError(400, "Content is required");
    }

    // .chrd format: first line = title, rest = chord chart
    // Convert to ChordPro: wrap likely chord lines in brackets
    const lines = rawContent.split("\n");
    const title = filename
      ? filename.replace(/\.chrd$/i, "")
      : lines[0]?.trim() || "Untitled";

    // Simple heuristic: a line that's mostly chord-like tokens gets bracket-wrapped
    const chordPattern = /^[A-G][b#]?(m|min|maj|dim|aug|sus[24]?|add)?[0-9]*(\/[A-G][b#]?)?$/;
    const convertedLines = [];
    let i = 0;

    // Skip first line if it matches the title
    if (lines[0]?.trim() === title) i = 1;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this is a chord-only line
      const tokens = trimmed.split(/\s+/);
      const isChordLine = tokens.length > 0 && tokens.every((t) => chordPattern.test(t) || t === "" || t === "|");

      if (isChordLine && i + 1 < lines.length && lines[i + 1].trim()) {
        // Chord line followed by lyric line — merge them
        const chords = tokens;
        const lyricLine = lines[i + 1];
        let result = "";
        let chordIdx = 0;
        let col = 0;

        // Match chord positions to the original spacing
        const positions = [];
        let pos = 0;
        for (const match of line.matchAll(/\S+/g)) {
          positions.push({ chord: match[0], col: match.index });
        }

        // Insert chords into lyric line at approximate positions
        let lyric = lyricLine;
        let offset = 0;
        for (const { chord, col: chordCol } of positions) {
          const insertAt = Math.min(chordCol + offset, lyric.length);
          lyric = lyric.slice(0, insertAt) + `[${chord}]` + lyric.slice(insertAt);
          offset += chord.length + 2; // brackets
        }
        convertedLines.push(lyric);
        i += 2;
      } else if (isChordLine) {
        // Chord-only line — wrap each chord
        convertedLines.push(tokens.map((t) => (chordPattern.test(t) ? `[${t}]` : t)).join(" "));
        i++;
      } else {
        convertedLines.push(trimmed);
        i++;
      }
    }

    const chordProContent = `{title: ${title}}\n\n${convertedLines.join("\n")}`;

    const [song] = await db
      .insert(songs)
      .values({
        title,
        content: chordProContent,
        organizationId: req.org.id,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ song });
  })
);

// ── POST /api/songs/import/onsong — import from OnSong ───────
songRoutes.post(
  "/import/onsong",
  auth,
  asyncHandler(async (_req, res) => {
    // TODO: OnSong → ChordPro conversion
    throw createError(501, "OnSong import not yet implemented");
  })
);

// ── POST /api/songs/import/pdf — import from PDF via PDF.co ──
songRoutes.post(
  "/import/pdf",
  auth,
  orgContext,
  requireOrg,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw createError(400, "A PDF file is required");
    }

    if (!env.PDF_CO_API_KEY) {
      throw createError(
        503,
        "PDF import is not available — PDF.co API key is not configured",
      );
    }

    const pdfBuffer = req.file.buffer;

    // Run the 8-step conversion pipeline
    const { chordPro, metadata } = await convertPdfToChordPro(pdfBuffer);

    if (!chordPro || !chordPro.trim()) {
      throw createError(
        422,
        "Could not extract usable content from the PDF. It may be scanned or image-based.",
      );
    }

    // Save to database
    const [song] = await db
      .insert(songs)
      .values({
        title: metadata.title || "Untitled (PDF Import)",
        content: chordPro,
        key: metadata.key || null,
        tempo: metadata.tempo || null,
        artist: metadata.artist || null,
        organizationId: req.org.id,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ song, chordPro });
  })
);

// ── GET /api/songs/:id/export/chordpro — export as ChordPro ─
songRoutes.get(
  "/:id/export/chordpro",
  asyncHandler(async (req, res) => {
    const [song] = await db
      .select({ title: songs.title, content: songs.content })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${song.title.replace(/[^a-zA-Z0-9 ]/g, "")}.chopro"`
    );
    res.send(song.content);
  })
);

// ── GET /api/songs/:id/export/onsong ─────────────────────────
songRoutes.get(
  "/:id/export/onsong",
  asyncHandler(async (req, res) => {
    const [song] = await db
      .select({ title: songs.title, content: songs.content })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    const onsongText = chordProToOnSong(song.content);
    const safeName = song.title.replace(/[^a-zA-Z0-9 ]/g, "");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.onsong"`);
    res.send(onsongText);
  })
);

// ── GET /api/songs/:id/export/pdf ────────────────────────────
songRoutes.get(
  "/:id/export/pdf",
  asyncHandler(async (req, res) => {
    const [song] = await db
      .select({
        title: songs.title,
        content: songs.content,
        key: songs.key,
        artist: songs.artist,
        tempo: songs.tempo,
      })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    const doc = parseChordPro(song.content);
    const metaHtml = [
      song.key ? `<span>Key: ${song.key}</span>` : "",
      song.artist ? `<span>Artist: ${song.artist}</span>` : "",
      song.tempo ? `<span>Tempo: ${song.tempo} BPM</span>` : "",
    ]
      .filter(Boolean)
      .join(" &middot; ");

    let bodyHtml = "";
    for (const section of doc.sections) {
      if (section.name) {
        bodyHtml += `<h3 style="font-weight:700;margin:16px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(section.name)}</h3>`;
      }
      for (const line of section.lines) {
        if (line.chords.length > 0) {
          // Build chord line and lyric line
          let chordLine = "";
          let lyricLine = "";
          let lyricPos = 0;
          const sorted = [...line.chords].sort((a, b) => a.position - b.position);
          for (const { chord, position } of sorted) {
            const gap = position - lyricPos;
            if (gap > 0) {
              chordLine += "\u00A0".repeat(gap);
              lyricLine += escapeHtml(line.lyrics.slice(lyricPos, position));
            }
            chordLine += `<b>${escapeHtml(chord)}</b>`;
            lyricPos = position;
          }
          lyricLine += escapeHtml(line.lyrics.slice(lyricPos));
          bodyHtml += `<div style="font-family:monospace;line-height:1.2"><div style="color:#ca9762">${chordLine || "&nbsp;"}</div><div>${lyricLine || "&nbsp;"}</div></div>`;
        } else {
          bodyHtml += `<div style="font-family:monospace;line-height:1.6">${escapeHtml(line.lyrics) || "&nbsp;"}</div>`;
        }
      }
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(song.title)}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: 'Inter','Segoe UI',sans-serif; font-size: 12px; color: #1a1a1a; }
  h1 { font-family: 'Vidaloka',Georgia,serif; font-size: 22px; margin:0 0 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<h1>${escapeHtml(song.title)}</h1>
${metaHtml ? `<div class="meta">${metaHtml}</div>` : ""}
${bodyHtml}
<script>window.onload=function(){window.print()}</script>
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  })
);

// ── POST /api/songs/:id/usage — log that a song was used ────
songRoutes.post(
  "/:id/usage",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    const { usedAt, notes } = req.body;

    if (!usedAt) throw createError(400, "usedAt date is required (YYYY-MM-DD)");

    // Verify song exists
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    const [usage] = await db
      .insert(songUsages)
      .values({
        songId: req.params.id,
        usedAt,
        notes: notes || null,
        organizationId: req.org?.id || null,
        recordedBy: req.user.id,
      })
      .returning();

    res.status(201).json({ usage });
  })
);

// ── GET /api/songs/:id/usage — get usage history for a song ─
songRoutes.get(
  "/:id/usage",
  auth,
  asyncHandler(async (req, res) => {
    const usages = await db
      .select()
      .from(songUsages)
      .where(eq(songUsages.songId, req.params.id))
      .orderBy(desc(songUsages.usedAt));

    res.json({ usages });
  })
);

// ── DELETE /api/songs/:id/usage/:usageId — remove a usage entry
songRoutes.delete(
  "/:id/usage/:usageId",
  auth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select({ id: songUsages.id })
      .from(songUsages)
      .where(
        and(
          eq(songUsages.id, req.params.usageId),
          eq(songUsages.songId, req.params.id)
        )
      )
      .limit(1);

    if (!existing) throw createError(404, "Usage record not found");

    await db.delete(songUsages).where(eq(songUsages.id, req.params.usageId));

    res.json({ message: "Usage record deleted" });
  })
);

// ── Song Variations ──────────────────────────────────────────

// ── POST /api/songs/:id/variations — create a variation ──────
songRoutes.post(
  "/:id/variations",
  auth,
  asyncHandler(async (req, res) => {
    const { name, content, key } = req.body;

    if (!name || !content) {
      throw createError(400, "Name and content are required");
    }

    // Verify parent song exists
    const [song] = await db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!song) throw createError(404, "Song not found");

    const [variation] = await db
      .insert(songVariations)
      .values({
        songId: req.params.id,
        name,
        content,
        key: key || null,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ variation });
  })
);

// ── PUT /api/songs/:id/variations/:varId — update variation ──
songRoutes.put(
  "/:id/variations/:varId",
  auth,
  asyncHandler(async (req, res) => {
    const { name, content, key } = req.body;

    const [existing] = await db
      .select({ id: songVariations.id })
      .from(songVariations)
      .where(
        and(
          eq(songVariations.id, req.params.varId),
          eq(songVariations.songId, req.params.id)
        )
      )
      .limit(1);

    if (!existing) throw createError(404, "Variation not found");

    const [variation] = await db
      .update(songVariations)
      .set({
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(key !== undefined && { key: key || null }),
        updatedAt: new Date(),
      })
      .where(eq(songVariations.id, req.params.varId))
      .returning();

    res.json({ variation });
  })
);

// ── DELETE /api/songs/:id/variations/:varId — delete variation
songRoutes.delete(
  "/:id/variations/:varId",
  auth,
  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select({ id: songVariations.id })
      .from(songVariations)
      .where(
        and(
          eq(songVariations.id, req.params.varId),
          eq(songVariations.songId, req.params.id)
        )
      )
      .limit(1);

    if (!existing) throw createError(404, "Variation not found");

    await db.delete(songVariations).where(eq(songVariations.id, req.params.varId));

    res.json({ message: "Variation deleted" });
  })
);

/** Minimal HTML entity escaper for PDF template. */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
