import { Router } from "express";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { db } from "../../db.js";
import { songs, songVariations } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";

export const songRoutes = Router();

// ── GET /api/songs — list all songs (with optional search) ───
songRoutes.get(
  "/",
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
      query = query.where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions.slice(1).reduce((a, c) => sql`${a} AND ${c}`)}`);
    }

    const result = await query
      .orderBy(desc(songs.updatedAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(songs);

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
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, req.params.id))
      .limit(1);

    if (!existing) {
      throw createError(404, "Song not found");
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

// ── POST /api/songs/import/chrd — import from .chrd format ──
songRoutes.post(
  "/import/chrd",
  auth,
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
  asyncHandler(async (_req, res) => {
    // TODO: PDF → ChordPro conversion pipeline (Phase 6)
    throw createError(501, "PDF import not yet implemented");
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
  asyncHandler(async (_req, _res) => {
    throw createError(501, "OnSong export not yet implemented");
  })
);

// ── GET /api/songs/:id/export/pdf ────────────────────────────
songRoutes.get(
  "/:id/export/pdf",
  asyncHandler(async (_req, _res) => {
    throw createError(501, "PDF export not yet implemented");
  })
);
