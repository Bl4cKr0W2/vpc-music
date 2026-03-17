import { Router } from "express";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { db } from "../../db.js";
import { setlists, setlistSongs, songs, songUsages, songVariations } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";
import { orgContext, requireOrg, requireOrgRole } from "../../middlewares/orgContext.js";
import { chordProToOnSong, chordProToPlainText } from "@vpc-music/shared";
import JSZip from "jszip";

export const setlistRoutes = Router();

function hasDirective(content, key) {
  return new RegExp(`^\\{(?:${key}):\\s*.*?\\}$`, "im").test(content);
}

function buildExportContent(baseSong, variation) {
  if (!variation) {
    return {
      title: baseSong.title,
      content: baseSong.content,
      key: baseSong.key,
      artist: baseSong.artist,
      tempo: baseSong.tempo,
    };
  }

  const exportTitle = `${baseSong.title} - ${variation.name}`;
  const key = variation.key || baseSong.key || null;
  let content = variation.content || baseSong.content;
  const prelude = [];

  if (!hasDirective(content, "title|t")) prelude.push(`{title: ${exportTitle}}`);
  if (baseSong.artist && !hasDirective(content, "artist|a")) prelude.push(`{artist: ${baseSong.artist}}`);
  if (key && !hasDirective(content, "key|k")) prelude.push(`{key: ${key}}`);
  if (baseSong.tempo && !hasDirective(content, "tempo")) prelude.push(`{tempo: ${baseSong.tempo}}`);

  if (prelude.length > 0) {
    content = `${prelude.join("\n")}\n\n${content}`;
  }

  return {
    title: exportTitle,
    content,
    key,
    artist: baseSong.artist,
    tempo: baseSong.tempo,
  };
}

function sanitizeFilename(value) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, "").trim() || "untitled";
}

function convertExportContent(target, format) {
  if (format === "onsong") {
    return {
      extension: "onsong",
      content: chordProToOnSong(target.content),
    };
  }

  if (format === "text") {
    return {
      extension: "txt",
      content: chordProToPlainText(target.content),
    };
  }

  return {
    extension: "cho",
    content: target.content,
  };
}

// ── GET /api/setlists — list all setlists ────────────────────
setlistRoutes.get(
  "/",
  auth,
  orgContext,
  asyncHandler(async (req, res) => {
    let query = db
      .select({
        id: setlists.id,
        name: setlists.name,
        category: setlists.category,
        notes: setlists.notes,
        status: setlists.status,
        createdAt: setlists.createdAt,
        updatedAt: setlists.updatedAt,
        songCount: sql`(SELECT count(*) FROM setlist_songs WHERE setlist_songs.setlist_id = ${setlists.id})::int`,
      })
      .from(setlists);

    if (req.org) {
      query = query.where(eq(setlists.organizationId, req.org.id));
    }

    const result = await query.orderBy(desc(setlists.updatedAt));

    res.json({ setlists: result });
  })
);

// ── GET /api/setlists/:id — get setlist with songs ───────────
setlistRoutes.get(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const [setlist] = await db
      .select()
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!setlist) throw createError(404, "Setlist not found");

    // Get songs in order
    const items = await db
      .select({
        id: setlistSongs.id,
        songId: setlistSongs.songId,
        variationId: setlistSongs.variationId,
        variationName: songVariations.name,
        position: setlistSongs.position,
        key: setlistSongs.key,
        notes: setlistSongs.notes,
        songTitle: songs.title,
        songKey: songs.key,
        songArtist: songs.artist,
        songTempo: songs.tempo,
      })
      .from(setlistSongs)
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .leftJoin(songVariations, eq(setlistSongs.variationId, songVariations.id))
      .where(eq(setlistSongs.setlistId, req.params.id))
      .orderBy(asc(setlistSongs.position));

    res.json({ setlist, songs: items });
  })
);

// ── GET /api/setlists/:id/export/zip — export whole setlist ─
setlistRoutes.get(
  "/:id/export/zip",
  auth,
  asyncHandler(async (req, res) => {
    const format = String(req.query.format || "chordpro").toLowerCase();
    if (!["chordpro", "onsong", "text"].includes(format)) {
      throw createError(400, "format must be chordpro, onsong, or text");
    }

    const [setlist] = await db
      .select({
        id: setlists.id,
        name: setlists.name,
        notes: setlists.notes,
      })
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!setlist) throw createError(404, "Setlist not found");

    const items = await db
      .select({
        position: setlistSongs.position,
        itemKey: setlistSongs.key,
        songId: songs.id,
        songTitle: songs.title,
        songArtist: songs.artist,
        songTempo: songs.tempo,
        songKey: songs.key,
        songContent: songs.content,
        variationId: songVariations.id,
        variationName: songVariations.name,
        variationKey: songVariations.key,
        variationContent: songVariations.content,
      })
      .from(setlistSongs)
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .leftJoin(songVariations, eq(setlistSongs.variationId, songVariations.id))
      .where(eq(setlistSongs.setlistId, req.params.id))
      .orderBy(asc(setlistSongs.position));

    if (items.length === 0) {
      throw createError(400, "Setlist has no songs to export");
    }

    const zip = new JSZip();
    const manifestLines = [
      `Setlist: ${setlist.name}`,
      `Format: ${format}`,
      `Songs: ${items.length}`,
      "",
    ];

    for (const item of items) {
      const target = buildExportContent(
        {
          title: item.songTitle,
          content: item.songContent,
          key: item.itemKey || item.songKey,
          artist: item.songArtist,
          tempo: item.songTempo,
        },
        item.variationId
          ? {
              id: item.variationId,
              name: item.variationName,
              content: item.variationContent,
              key: item.itemKey || item.variationKey,
            }
          : null,
      );

      const converted = convertExportContent(target, format);
      const fileName = `${String(item.position + 1).padStart(2, "0")} - ${sanitizeFilename(target.title)}.${converted.extension}`;
      zip.file(fileName, converted.content);
      manifestLines.push(`${item.position + 1}. ${target.title}`);
    }

    if (setlist.notes) {
      manifestLines.push("", `Notes: ${setlist.notes}`);
    }

    zip.file("00 - Setlist Info.txt", manifestLines.join("\n"));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const safeSetlistName = sanitizeFilename(setlist.name);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${safeSetlistName}-${format}.zip"`);
    res.send(buffer);
  })
);

// ── POST /api/setlists — create setlist ──────────────────────
setlistRoutes.post(
  "/",
  auth,
  orgContext,
  requireOrg,  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const { name, category, notes } = req.body;

    if (!name) throw createError(400, "Name is required");

    const [setlist] = await db
      .insert(setlists)
      .values({
        name,
        category: category || null,
        notes: notes || null,
        organizationId: req.org.id,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ setlist });
  })
);

// ── PUT /api/setlists/:id — update setlist ───────────────────
setlistRoutes.put(
  "/:id",
  auth,  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const { name, category, notes, status } = req.body;

    const [existing] = await db
      .select({ id: setlists.id })
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Setlist not found");

    if (status !== undefined && !['draft', 'complete'].includes(status)) {
      throw createError(400, "Status must be 'draft' or 'complete'");
    }

    const [setlist] = await db
      .update(setlists)
      .set({
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      })
      .where(eq(setlists.id, req.params.id))
      .returning();

    res.json({ setlist });
  })
);

// ── DELETE /api/setlists/:id ─────────────────────────────────
setlistRoutes.delete(
  "/:id",
  auth,  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const [existing] = await db
      .select({ id: setlists.id })
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Setlist not found");

    await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, req.params.id));
    await db.delete(setlists).where(eq(setlists.id, req.params.id));

    res.json({ message: "Setlist deleted" });
  })
);

// ── POST /api/setlists/:id/songs — add song to setlist ──────
setlistRoutes.post(
  "/:id/songs",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const { songId, variationId, key, notes } = req.body;

    if (!songId) throw createError(400, "songId is required");

    let selectedVariation = null;
    if (variationId) {
      [selectedVariation] = await db
        .select({
          id: songVariations.id,
          songId: songVariations.songId,
          name: songVariations.name,
          key: songVariations.key,
        })
        .from(songVariations)
        .where(eq(songVariations.id, variationId))
        .limit(1);

      if (!selectedVariation || selectedVariation.songId !== songId) {
        throw createError(400, "Variation does not belong to the selected song");
      }
    }

    // Get next position
    const [{ maxPos }] = await db
      .select({ maxPos: sql`coalesce(max(${setlistSongs.position}), 0)::int` })
      .from(setlistSongs)
      .where(eq(setlistSongs.setlistId, req.params.id));

    const [item] = await db
      .insert(setlistSongs)
      .values({
        setlistId: req.params.id,
        songId,
        variationId: selectedVariation?.id || null,
        position: maxPos + 1,
        key: key || selectedVariation?.key || null,
        notes: notes || (selectedVariation ? `Variation: ${selectedVariation.name}` : null),
      })
      .returning();

    res.status(201).json({ item });
  })
);

// ── PUT /api/setlists/:id/songs — reorder songs ─────────────
setlistRoutes.put(
  "/:id/songs",
  auth,  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),  asyncHandler(async (req, res) => {
    const { order } = req.body; // Array of { id, position }

    if (!Array.isArray(order)) {
      throw createError(400, "order must be an array of { id, position }");
    }

    for (const { id, position } of order) {
      await db
        .update(setlistSongs)
        .set({ position })
        .where(eq(setlistSongs.id, id));
    }

    await db
      .update(setlists)
      .set({ updatedAt: new Date() })
      .where(eq(setlists.id, req.params.id));

    res.json({ message: "Order updated" });
  })
);

// ── DELETE /api/setlists/:id/songs/:songItemId — remove song ─
setlistRoutes.delete(
  "/:id/songs/:songItemId",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    await db
      .delete(setlistSongs)
      .where(eq(setlistSongs.id, req.params.songItemId));

    res.json({ message: "Song removed from setlist" });
  })
);

// ── POST /api/setlists/:id/complete — mark setlist complete & log song usages
setlistRoutes.post(
  "/:id/complete",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const { usedAt } = req.body; // optional date string (defaults to today)
    const usedDate = usedAt || new Date().toISOString().split("T")[0];

    const [existing] = await db
      .select()
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Setlist not found");

    // Mark setlist as complete
    const [setlist] = await db
      .update(setlists)
      .set({ status: "complete", updatedAt: new Date() })
      .where(eq(setlists.id, req.params.id))
      .returning();

    // Log usage for every song in the setlist
    const setlistItems = await db
      .select({ songId: setlistSongs.songId })
      .from(setlistSongs)
      .where(eq(setlistSongs.setlistId, req.params.id));

    if (setlistItems.length > 0) {
      await db.insert(songUsages).values(
        setlistItems.map((item) => ({
          songId: item.songId,
          usedAt: usedDate,
          notes: `Setlist: ${existing.name}`,
          organizationId: req.org?.id || existing.organizationId,
          recordedBy: req.user.id,
        }))
      );
    }

    res.json({ setlist, usagesLogged: setlistItems.length });
  })
);

// ── POST /api/setlists/:id/reopen — revert setlist to draft ─
setlistRoutes.post(
  "/:id/reopen",
  auth,
  orgContext,
  requireOrg,
  requireOrgRole("admin", "musician"),
  asyncHandler(async (req, res) => {
    const [setlist] = await db
      .update(setlists)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(setlists.id, req.params.id))
      .returning();

    if (!setlist) throw createError(404, "Setlist not found");

    res.json({ setlist });
  })
);
