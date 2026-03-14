import { Router } from "express";
import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "../../db.js";
import { setlists, setlistSongs, songs } from "../../schema/index.js";
import { createError, asyncHandler } from "../../middlewares/errorHandler.js";
import { auth } from "../../middlewares/auth.js";

export const setlistRoutes = Router();

// ── GET /api/setlists — list all setlists ────────────────────
setlistRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await db
      .select({
        id: setlists.id,
        name: setlists.name,
        category: setlists.category,
        notes: setlists.notes,
        createdAt: setlists.createdAt,
        updatedAt: setlists.updatedAt,
        songCount: sql`(SELECT count(*) FROM setlist_songs WHERE setlist_songs.setlist_id = ${setlists.id})::int`,
      })
      .from(setlists)
      .orderBy(desc(setlists.updatedAt));

    res.json({ setlists: result });
  })
);

// ── GET /api/setlists/:id — get setlist with songs ───────────
setlistRoutes.get(
  "/:id",
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
      .where(eq(setlistSongs.setlistId, req.params.id))
      .orderBy(asc(setlistSongs.position));

    res.json({ setlist, songs: items });
  })
);

// ── POST /api/setlists — create setlist ──────────────────────
setlistRoutes.post(
  "/",
  auth,
  asyncHandler(async (req, res) => {
    const { name, category, notes } = req.body;

    if (!name) throw createError(400, "Name is required");

    const [setlist] = await db
      .insert(setlists)
      .values({
        name,
        category: category || null,
        notes: notes || null,
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ setlist });
  })
);

// ── PUT /api/setlists/:id — update setlist ───────────────────
setlistRoutes.put(
  "/:id",
  auth,
  asyncHandler(async (req, res) => {
    const { name, category, notes } = req.body;

    const [existing] = await db
      .select({ id: setlists.id })
      .from(setlists)
      .where(eq(setlists.id, req.params.id))
      .limit(1);

    if (!existing) throw createError(404, "Setlist not found");

    const [setlist] = await db
      .update(setlists)
      .set({
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes }),
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
  auth,
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    const { songId, key, notes } = req.body;

    if (!songId) throw createError(400, "songId is required");

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
        position: maxPos + 1,
        key: key || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({ item });
  })
);

// ── PUT /api/setlists/:id/songs — reorder songs ─────────────
setlistRoutes.put(
  "/:id/songs",
  auth,
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
    await db
      .delete(setlistSongs)
      .where(eq(setlistSongs.id, req.params.songItemId));

    res.json({ message: "Song removed from setlist" });
  })
);
